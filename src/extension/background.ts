chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "saveWord" && message.word) {
        chrome.storage.local.get("savedWords", (data) => {
            const words: Array<{ word: string; shown: boolean }> = data.savedWords || [];
            words.push({word: message.word, shown: false});
            chrome.storage.local.set({savedWords: words});
        });
    }
});

function scheduleCardPopup() {
    // const nextTime = Math.floor(Math.random() * (8 - 2 + 1) + 2) * 60 * 1000;

    const nextTime = 10 * 1000;
    setTimeout(() => {
        chrome.storage.local.get("savedWords", ({savedWords}: {
            savedWords?: Array<{ word: string; shown: boolean }>
        }) => {
            const unseen = (savedWords || []).filter((w: { word: string; shown: boolean }) => !w.shown);
            if (unseen.length === 0) return scheduleCardPopup();

            const randomWord = unseen[Math.floor(Math.random() * unseen.length)];
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                for (const tab of tabs) {
                    if (typeof tab.id === "number") {
                        chrome.tabs.sendMessage(tab.id, {action: "showCard", word: randomWord.word});
                    }
                }
            });
        });

        scheduleCardPopup(); // Reset timer
    }, nextTime);
}

scheduleCardPopup(); // Run when background starts


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
