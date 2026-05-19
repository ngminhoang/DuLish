import { VocabularyService } from '../vocabularyService';
import { mockVocabularies } from '../mockData';
import { ensureSchema } from '../srsEngine';
console.log("Background loaded")

// Helper wrappers to use chrome.storage.local with async/await.
// Use these so accesses to ['lastSyncTime', 'uid'] are reliable and won't
// cause runtime errors when code assumes a Promise-returning API.
function storageGet<T = any>(keys: string | string[] | Record<string, any> | null) : Promise<T> {
    return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            console.warn('[background] chrome.storage.local not available; returning empty result for', keys);
            // If caller asked for an array of keys, return an object with those keys set to undefined
            if (Array.isArray(keys)) {
                const out: Record<string, any> = {};
                for (const k of keys) out[k] = undefined;
                resolve(out as T);
                return;
            }
            resolve({} as T);
            return;
        }
        chrome.storage.local.get(keys, (result) => {
            // Normalize: if caller provided an array of keys, ensure all keys exist on result
            if (Array.isArray(keys)) {
                for (const k of keys) {
                    if (!(k in result)) result[k] = undefined;
                }
            }
            resolve(result as T);
        });
    });
}

function storageSet(items: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            console.warn('[background] chrome.storage.local.set not available; skipping set for', items);
            resolve();
            return;
        }
        chrome.storage.local.set(items, () => resolve());
    });
}

// Note: lastSyncTime is used to decide when to perform synchronization
// / update data from Firebase. It should be written as a numeric timestamp
// (Date.now()) next to activeWords and uid so periodic sync logic works.

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
        console.log("message received in background script", message);
        if (message.action == "saveWord" && message.word) {
            chrome.storage.local.get("savedWords", (data) => {
                const words: Array<{ word: string; shown: boolean }> = data.savedWords || [];
                words.push({word: message.word, shown: false});
                chrome.storage.local.set({savedWords: words});
            });
        }
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "saveWordIntoFirebase") {
            // 1. Lấy UID của user từ storage
            chrome.storage.local.get(['lastSyncTime', 'uid'], async (result) => {
                const uid = result.uid;

                if (uid && message.vocabObj) {
                    try {
                        // 2. Gọi hàm saveWord mà chúng ta đã viết trong vocabularyService
                        // Merges and extends the record without wiping existing fields
                        await VocabularyService.saveWord(uid, message.vocabObj);
                        console.log(`[DuLish] Đã lưu từ "${message.vocabObj.raw_text}" vào Firestore thành công.`);

                        // 2. Silent Delta Update: Cập nhật thẳng vào storage local
                        const { activeWords } = await storageGet<{ activeWords?: any[] }>('activeWords');
                        // Ensure the new word fits the full schema
                        const extendedWord = ensureSchema(message.vocabObj);
                        
                        let newWords = [];
                        const exists = (activeWords || []).some(w => w.word_id === extendedWord.word_id);
                        if (exists) {
                            newWords = (activeWords || []).map(w => w.word_id === extendedWord.word_id ? extendedWord : w);
                        } else {
                            newWords = [...(activeWords || []), extendedWord];
                        }
                        await storageSet({ activeWords: newWords });

                    } catch (error) {
                        console.error("[DuLish] Lỗi khi lưu vào Firebase:", error);
                    }
                } else {
                    console.error("[DuLish] Không tìm thấy UID. Vui lòng đăng nhập!");
                }
            });
        }
        return true; // Giữ channel mở cho async
    });
}

/*
function scheduleCardPopup() {
    // const nextTime = Math.floor(Math.random() * (8 - 2 + 1) + 2) * 60 * 1000;
    const nextTime = 10 * 1000; // 10 giây

    setTimeout(() => {
        console.log("Popup timer triggered");

        chrome.storage.local.get("savedWords", ({ savedWords }: {
            savedWords?: Array<{ word: string; shown: boolean }>
        }) => {
            const unseen = (savedWords || []).filter((w: { word: string; shown: boolean }) => !w.shown);

            if (unseen.length === 0) {
                console.log("No Word");
                // Nếu không còn từ nào chưa hiện, thử lại sau
                return scheduleCardPopup();
            }

            const randomWord = unseen[Math.floor(Math.random() * unseen.length)];

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                for (const tab of tabs) {
                    if (typeof tab.id === "number") {
                        chrome.tabs.sendMessage(tab.id, {
                            action: "showCard",
                            word: randomWord.word
                        });
                    }
                }

                // Sau khi đã gửi popup, lập lịch cho lần tiếp theo
                scheduleCardPopup();
            });
        });
    }, nextTime);
}

// Gọi lần đầu khi background bắt đầu
// Hiding the snake button and disabling popup scheduling as requested for Phase 1
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('[background] Snake card popup disabled for Phase 1 to focus on save word flow.');
    // scheduleCardPopup();
} else {
    console.warn('[background] chrome.runtime not available - skipping scheduleCardPopup in non-extension context');
}
*/


if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "markAsShown" && message.word) {
            chrome.storage.local.get("savedWords", (data) => {
                const updated = (data.savedWords || []).map((w: { word: string; shown: boolean }) =>
                    w.word === message.word ? {...w, shown: true} : w
                );
                chrome.storage.local.set({savedWords: updated});
            });
        }
    });
}

// Định nghĩa thời gian cấu hình
// Periodic sync interval when user is active
const SYNC_INTERVAL_MINUTES = 20;
// If user has been inactive for longer than this (ms), do not auto-sync periodically.
const ACTIVITY_INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
// Window to consider user "recently active" for periodic sync decisions
const ACTIVITY_WINDOW_MS = SYNC_INTERVAL_MINUTES * 60 * 1000;

// In-memory flag to avoid concurrent syncs
let isSyncInProgress = false;

// 1. Khi Extension vừa khởi động (hoặc Browser vừa mở)
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onStartup) {
    chrome.runtime.onStartup.addListener(async () => {
        // Phải có await ở đây để đợi lấy dữ liệu từ storage
        const data = await storageGet(['lastSyncTime', 'uid']);

        if (data.uid) {
            console.log("[Startup] Khởi động trình duyệt, bắt đầu đồng bộ...");
            // Run an immediate full sync at browser start to populate lastSyncTime
            await performFullSync(data.uid);
        }
    });
}

// 2. Tạo một Alarm chạy mỗi 30 phút (chỉ if alarms API exists)
if (typeof chrome !== 'undefined' && chrome.alarms && chrome.alarms.create) {
    chrome.alarms.create("periodicSync", { periodInMinutes: SYNC_INTERVAL_MINUTES });

    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === "periodicSync") {
            console.log('[Sync] periodicSync alarm fired');
            checkAndSync();
        }
    });
} else {
    console.warn('[background] chrome.alarms API not available in this context; periodic sync disabled');
}

async function checkAndSync() {
    const data = await storageGet(['lastSyncTime', 'uid', 'lastUserActiveAt']);
    const now = Date.now();

    if (!data.uid) {
        console.log('[Sync] no uid -> skipping periodic sync');
        return;
    }

    const lastSync = typeof data.lastSyncTime === 'number' ? data.lastSyncTime : 0;
    const lastActive = typeof data.lastUserActiveAt === 'number' ? data.lastUserActiveAt : 0;

    // Only perform periodic sync if the user has been active recently (within activity window)
    const wasRecentlyActive = (now - lastActive) <= ACTIVITY_WINDOW_MS;
    const needsSync = (now - lastSync) >= (SYNC_INTERVAL_MINUTES * 60 * 1000);

    console.log('[Sync] checkAndSync', { uid: data.uid, lastSync, lastActive, wasRecentlyActive, needsSync });

    if (needsSync && wasRecentlyActive) {
        console.log('[Sync] Conditions met for periodic sync -> performing full sync');
        await performFullSync(data.uid);
    } else {
        console.log('[Sync] Conditions not met for periodic sync -> skipping');
    }
}

async function performFullSync(uid: string) {
    try {
        if (isSyncInProgress) {
            console.log('[Sync] performFullSync called but sync already in progress -> skipping');
            return;
        }
        isSyncInProgress = true;

        const words = await VocabularyService.getActiveWords(uid);
        await storageSet({
            activeWords: words,
            lastSyncTime: Date.now()
        });
        console.log("[Sync] Đồng bộ thành công!");
    } catch (e) {
        console.error("[Sync] Thất bại:", e);
    }
    finally {
        isSyncInProgress = false;
    }
}

/**
 * Update lastUserActiveAt when the user interacts with the browser/extension.
 * If it's been longer than ACTIVITY_INACTIVITY_THRESHOLD_MS since last sync,
 * trigger an immediate sync.
 */
async function handleUserActivity() {
    const now = Date.now();
    console.log('[Activity] user active at', new Date(now).toISOString());
    await storageSet({ lastUserActiveAt: now });

    const data = await storageGet(['lastSyncTime', 'uid']);
    const lastSync = typeof data.lastSyncTime === 'number' ? data.lastSyncTime : 0;
    if (!data.uid) {
        console.log('[Activity] no uid -> skipping activity-triggered sync');
        return;
    }

    if (now - lastSync >= ACTIVITY_INACTIVITY_THRESHOLD_MS) {
        console.log('[Activity] lastSync older than threshold -> triggering immediate sync');
        await performFullSync(data.uid);
    } else {
        console.log('[Activity] recent sync exists -> no immediate sync needed');
    }
}

// Listen for user activity events to update lastUserActiveAt and possibly trigger a sync
if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(() => {
        handleUserActivity();
    });
}
if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.onFocusChanged) {
    chrome.windows.onFocusChanged.addListener((_windowId) => {
        handleUserActivity();
    });
}
// Also treat messages from popup/UI as user activity
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
        if (message && message.action === 'userActivity') {
            handleUserActivity();
        }
    });
}

// Trong background.ts
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.action === "fetchActiveWords") {
            chrome.storage.local.get(['lastSyncTime', 'uid'], async (result) => {
                const uid = result.uid;
                if (uid) {
                    try {
                        const words = await VocabularyService.getActiveWords(uid);
                        // Gửi kết quả trả về cho bên yêu cầu
                        sendResponse({ success: true, data: words });
                    } catch (error) {
                        // @ts-ignore
                        sendResponse({ success: false, error: error.message });
                    }
                } else {
                    sendResponse({ success: false, error: "Chưa đăng nhập" });
                }
            });
            return true; // Bắt buộc phải có để dùng sendResponse bất đồng bộ
        }
    });
}

// Lắng nghe thay đổi UID trong storage (như khi đăng nhập hoặc đăng xuất) để thực hiện đồng bộ ngay lập tức
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
        if (areaName === 'local' && changes.uid) {
            const newUid = changes.uid.newValue;
            const oldUid = changes.uid.oldValue;
            if (newUid && newUid !== oldUid) {
                console.log("[Storage] Phát hiện UID thay đổi (đăng nhập), tiến hành đồng bộ từ Firebase...");
                await performFullSync(newUid);
            } else if (!newUid) {
                console.log("[Storage] Đã đăng xuất, xóa danh sách activeWords...");
                await storageSet({ activeWords: [], lastSyncTime: 0 });
            }
        }
    });
}

// Thực hiện đồng bộ ngay khi background script được load (nếu đã đăng nhập)
(async () => {
    const data = await storageGet(['uid']);
    if (data.uid) {
        console.log("[Background Init] Phát hiện người dùng đã đăng nhập, tự động đồng bộ từ Firebase...");
        await performFullSync(data.uid);
    }
})();

// Auto-seed mock vocabularies on installation if activeWords is empty or missing
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(async () => {
        console.log("[DuLish] Extension installed/updated. Checking activeWords...");
        const data = await storageGet<{ activeWords?: any[] }>('activeWords');
        if (!data.activeWords || data.activeWords.length === 0) {
            console.log("[DuLish] ActiveWords empty. Seeding mock vocabularies for Phase 1...");
            await storageSet({ activeWords: mockVocabularies });
        }
    });
}
