let floatingContainer: HTMLDivElement | null = null;
let isPopupVisible = false;

interface DictionaryResult {
    word: string;
    phonetic?: string;
    meaning?: string;
    translated: boolean;
}

async function lookupWord(word: string): Promise<DictionaryResult> {
    const lowercaseWord = word.toLowerCase();
    const response = await fetch(chrome.runtime.getURL('english-vietnamese.txt'));
    const dictionaryText = await response.text();

    const lines = dictionaryText.split('\n');
    const target = `@${lowercaseWord} `;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().startsWith(target)) {
            const phoneticMatch = lines[i].match(/\/(.*?)\//);
            const phonetic = phoneticMatch ? `/${phoneticMatch[1]}/` : undefined;

            let meaningLines: string[] = [];
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].startsWith('@')) break;
                meaningLines.push(lines[j].trim());
            }

            return {
                word,
                phonetic,
                meaning: meaningLines.join('\n'),
                translated: true
            };
        }
    }

    return {
        word,
        translated: false
    };
}

document.addEventListener("mouseup", async (e) => {
    const selection = window.getSelection()?.toString().trim();

    if (floatingContainer && isPopupVisible) {
        floatingContainer.remove();
        floatingContainer = null;
        isPopupVisible = false;
    } else if (selection && /^[a-zA-Z\-]+$/.test(selection) && !(e.target instanceof HTMLButtonElement)) {
        const range = window.getSelection()?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (!rect) return;

        const result = await lookupWord(selection);

        // Tạo container mới
        floatingContainer = document.createElement("div");
        floatingContainer.style.position = "absolute";
        floatingContainer.style.top = `${rect.top + window.scrollY}px`;
        floatingContainer.style.left = `${rect.right + 5 + window.scrollX}px`;
        floatingContainer.style.zIndex = "999999";
        floatingContainer.style.display = "flex";
        floatingContainer.style.flexDirection = "column";
        floatingContainer.style.alignItems = "start";

        // Tạo icon
        const icon = document.createElement("div");
        icon.textContent = "🤓";
        icon.style.cursor = "pointer";
        icon.style.fontSize = "28px";

        icon.onclick = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();

            if (isPopupVisible) return;

            const popup = document.createElement("div");
            popup.style.marginTop = "5px";
            popup.style.minWidth = "200px";
            popup.style.maxWidth = "300px";
            popup.style.backgroundColor = "#f9f9f9";
            popup.style.border = "1px solid #ccc";
            popup.style.borderRadius = "8px";
            popup.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
            popup.style.display = "flex";
            popup.style.flexDirection = "column";
            popup.style.justifyContent = "center";
            popup.style.alignItems = "flex-start";
            popup.style.padding = "10px";
            popup.style.fontFamily = "Arial, sans-serif";

            const wordElement = document.createElement("div");
            wordElement.innerHTML = `<strong>${result.word}</strong> ${result.phonetic || ""}`;
            wordElement.style.marginBottom = "8px";
            popup.appendChild(wordElement);

            const meaningElement = document.createElement("div");
            meaningElement.textContent = result.translated ? result.meaning! : "Không tìm thấy nghĩa.";
            meaningElement.style.fontSize = "14px";
            meaningElement.style.whiteSpace = "pre-line";
            meaningElement.style.marginBottom = "10px";
            popup.appendChild(meaningElement);

            const saveButton = document.createElement("button");
            saveButton.textContent = "Save";
            saveButton.style.padding = "5px 10px";
            saveButton.style.fontSize = "14px";
            saveButton.style.cursor = "pointer";

            saveButton.onclick = (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({ action: "saveWord", word: selection });

                floatingContainer?.remove();
                floatingContainer = null;
                isPopupVisible = false;
            };

            popup.appendChild(saveButton);
            floatingContainer?.appendChild(popup);
            isPopupVisible = true;
        };

        floatingContainer.appendChild(icon);
        document.body.appendChild(floatingContainer);
    }
});
