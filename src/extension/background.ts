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

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.action == "saveWordInfo") {
        const word = message.word.toLowerCase();
        const defaultRepeats = 15;

        // const filePath = 'dictionary.txt'; // Đường dẫn file từ điển

        // Đọc file từ điển (giả định có permission)
        const response = await fetch(chrome.runtime.getURL('english-vietnamese.txt'));
        const text = await response.text();

        const lines = text.split(/\r?\n/);

        // Tìm dòng chứa từ
        const lineIndex = lines.findIndex(line => line.toLowerCase().startsWith(word + " "));

        const wordData = {
            word,
            position: lineIndex >= 0 ? lineIndex : -1,
            repeatCount: defaultRepeats,
            lastReviewed: new Date().toISOString()
        };

        // Lưu vào local storage (hoặc IndexedDB tùy bạn)
        chrome.storage.local.get({ wordStats: {} }, (data) => {
            const wordStats = data.wordStats;
            wordStats[word] = wordData;

            chrome.storage.local.set({ wordStats }, () => {
                console.log("Saved word info:", wordData);
            });
        });
    }
});


function scheduleCardPopup() {
    const nextTime = 10 * 1000; // 10 giây

    setTimeout(() => {
        console.log("Popup timer triggered");

        chrome.storage.local.get("savedWords", ({ savedWords }: {
            savedWords?: Array<{ word: string; shown: boolean; repeatCount: number }>
        }) => {
            const unseen = (savedWords || []).filter((w) => !w.shown);

            if (unseen.length === 0) {
                console.log("No unseen words left");
                return scheduleCardPopup(); // Thử lại sau
            }

            // Sắp xếp từ theo repeatCount giảm dần
            unseen.sort((a, b) => (b.repeatCount || 0) - (a.repeatCount || 0));

            const topPriority = unseen[0]; // Lấy từ có repeatCount cao nhất

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                for (const tab of tabs) {
                    if (typeof tab.id === "number") {
                        chrome.tabs.sendMessage(tab.id, {
                            action: "showCard",
                            word: topPriority.word
                        });
                    }
                }

                // Tiếp tục lập lịch
                scheduleCardPopup();
            });
        });
    }, nextTime);
}

// Gọi lần đầu khi background bắt đầu
scheduleCardPopup();

// function scheduleCardPopup() {
//     // const nextTime = Math.floor(Math.random() * (8 - 2 + 1) + 2) * 60 * 1000;
//     const nextTime = 10 * 1000; // 10 giây
//
//     setTimeout(() => {
//         console.log("Popup timer triggered");
//
//         chrome.storage.local.get("savedWords", ({ savedWords }: {
//             savedWords?: Array<{ word: string; shown: boolean }>
//         }) => {
//             const unseen = (savedWords || []).filter((w: { word: string; shown: boolean }) => !w.shown);
//
//             if (unseen.length === 0) {
//                 console.log("No Word");
//                 // Nếu không còn từ nào chưa hiện, thử lại sau
//                 return scheduleCardPopup();
//             }
//
//             const randomWord = unseen[Math.floor(Math.random() * unseen.length)];
//
//             chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//                 for (const tab of tabs) {
//                     if (typeof tab.id === "number") {
//                         chrome.tabs.sendMessage(tab.id, {
//                             action: "showCard",
//                             word: randomWord.word
//                         });
//                     }
//                 }
//
//                 // Sau khi đã gửi popup, lập lịch cho lần tiếp theo
//                 scheduleCardPopup();
//             });
//         });
//     }, nextTime);
// }
//
// // Gọi lần đầu khi background bắt đầu
// scheduleCardPopup();


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
