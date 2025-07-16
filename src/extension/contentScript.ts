let currentIcon: HTMLDivElement | null = null;

document.addEventListener("mouseup", () => {
    const selection = window.getSelection()?.toString().trim();

    // Xóa icon cũ nếu có
    if (currentIcon) {
        currentIcon.remove();
        currentIcon = null;
    }

    if (selection && /^[a-zA-Z]+$/.test(selection)) {
        const range = window.getSelection()?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        const icon = document.createElement("div");

        icon.textContent = "🤓";
        icon.style.position = "absolute";
        icon.style.top = `${rect!.top + window.scrollY}px`;
        icon.style.left = `${rect!.right + 5 + window.scrollX}px`;
        icon.style.cursor = "pointer";
        icon.style.zIndex = "999999";
        icon.style.fontSize = "28px";

        icon.onclick = () => {
            chrome.runtime.sendMessage({ action: "saveWord", word: selection });
            icon.remove();
            currentIcon = null;
        };

        document.body.appendChild(icon);
        currentIcon = icon;
    }
});

// Nếu người dùng click nơi khác → xóa icon
document.addEventListener("mousedown", (e) => {
    if (currentIcon && !currentIcon.contains(e.target as Node)) {
        currentIcon.remove();
        currentIcon = null;
    }
});

// Nếu người dùng thay đổi vùng bôi đen → kiểm tra nếu bị xóa thì remove icon
document.addEventListener("selectionchange", () => {
    const selection = window.getSelection()?.toString().trim();
    if (!selection && currentIcon) {
        currentIcon.remove();
        currentIcon = null;
    }
});