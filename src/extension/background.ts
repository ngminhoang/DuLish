import { VocabularyService } from '../vocabularyService';
console.log("Background loaded")

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

            if (uid && message.word) {
                try {
                    // 2. Gọi hàm saveWord mà chúng ta đã viết trong vocabularyService
                    await VocabularyService.saveWord(uid, message.word);
                    console.log(`[DuLish] Đã lưu từ "${message.word}" vào Firestore thành công.`);

                    // 2. Silent Delta Update: Cập nhật thẳng vào storage local
                    const { activeWords } = await chrome.storage.local.get('activeWords');
                    const newWords = [...(activeWords || []), { word: message.word, status: 1 }];
                    await chrome.storage.local.set({ activeWords: newWords });
                    // KHÔNG cần fetch lại toàn bộ danh sách ở đây.

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
scheduleCardPopup();


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

// Định nghĩa thời gian cấu hình
const SYNC_INTERVAL_MINUTES = 30;

// 1. Khi Extension vừa khởi động (hoặc Browser vừa mở)
chrome.runtime.onStartup.addListener(async () => {
    // Phải có await ở đây để đợi lấy dữ liệu từ storage
    const data = await chrome.storage.local.get(['lastSyncTime', 'uid']);

    if (data.uid) {
        console.log("[Startup] Khởi động trình duyệt, bắt đầu đồng bộ...");
        performFullSync(data.uid);
    }
});

// 2. Tạo một Alarm chạy mỗi 30 phút
chrome.alarms.create("periodicSync", { periodInMinutes: SYNC_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "periodicSync") {
        checkAndSync();
    }
});

async function checkAndSync() {
    const data = await chrome.storage.local.get(['lastSyncTime', 'uid']);
    const now = Date.now();
    const thirtyMinutesInMs = SYNC_INTERVAL_MINUTES * 60 * 1000;

    // Kiểm tra nếu đã quá 30 phút kể từ lần cuối fetch
    if (data.uid && (!data.lastSyncTime || now - data.lastSyncTime >= thirtyMinutesInMs)) {
        console.log("[Sync] Quá 30 phút hoặc khởi động máy mới. Đang Fetch...");
        await performFullSync(data.uid);
    }
}

async function performFullSync(uid: string) {
    try {
        const words = await VocabularyService.getActiveWords(uid);
        await chrome.storage.local.set({
            activeWords: words,
            lastSyncTime: Date.now()
        });
        console.log("[Sync] Đồng bộ thành công!");
    } catch (e) {
        console.error("[Sync] Thất bại:", e);
    }
}

// Trong background.ts
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