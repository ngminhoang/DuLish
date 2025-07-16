/// <reference types="chrome" />
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installedee");

    chrome.contextMenus.create({
        id: "save-text",
        title: "Save selected text",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "save-text" && info.selectionText) {
        chrome.storage.local.get(["savedWords"], (result) => {
            const list: string[] = result.savedWords || [];
            list.push(info.selectionText!);
            chrome.storage.local.set({ savedWords: list });
        });
    }
});
