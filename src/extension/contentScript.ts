let floatingContainer: HTMLDivElement | null = null;
let isPopupVisible = false;

interface DictionaryResult {
    word: string;
    phonetic?: string;
    meaning?: string;
    translated: boolean;
}

interface MeaningGroup {
    type: string;
    lines: string[];
}

interface DictionaryResult {
    word: string;
    phonetic?: string;
    meanings: MeaningGroup[];  // đổi từ meaning sang meanings
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

            const meanings: MeaningGroup[] = [];
            let currentType = "";
            let currentLines: string[] = [];

            for (let j = i + 1; j < lines.length; j++) {
                const line = lines[j].trim();
                if (line.startsWith('@')) break;

                const typeMatch = line.match(/^\*\s+(.*?)$/); // dòng kiểu "*  danh từ"
                if (typeMatch) {
                    if (currentType || currentLines.length > 0) {
                        meanings.push({ type: currentType, lines: currentLines });
                    }
                    currentType = typeMatch[1].trim();
                    currentLines = [];
                } else {
                    currentLines.push(line);
                }
            }

            if (currentType || currentLines.length > 0) {
                meanings.push({ type: currentType, lines: currentLines });
            }

            return {
                word,
                phonetic,
                meanings,
                translated: true
            };
        }
    }

    return {
        word,
        meanings: [],
        translated: false
    };
}

document.addEventListener("mousedown", (e) => {
    // const selection = window.getSelection()?.toString().trim();
    // if (selection) return; // Đang bôi đen, đừng xoá gì cả

    // Nếu không còn chọn gì mà click ngoài container thì xoá

    if (floatingContainer && !floatingContainer.contains(e.target as Node)) {
        floatingContainer.remove();
        floatingContainer = null;
        isPopupVisible = false;
    }
});

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

            const meaningElement = document.createElement("div");
            if (result.translated) {
                result.meanings.forEach((group) => {
                    const groupDiv = document.createElement("div");
                    groupDiv.style.marginBottom = "10px";
                    groupDiv.style.width = "100%";

                    const title = document.createElement("div");
                    title.textContent = group.type;
                    title.style.fontWeight = "bold";
                    title.style.color = "#336699";
                    title.style.marginBottom = "4px";
                    groupDiv.appendChild(title);

                    const ul = document.createElement("ul");
                    ul.style.margin = "0";
                    ul.style.paddingLeft = "20px";

                    group.lines.forEach(line => {
                        if(line!=""){
                            line = line.replace("-","");
                            line = line.replace("=","");
                            line = line.replace("+","=");
                            const li = document.createElement("li");
                            // li.style.color = "#000000";
                            li.textContent = line;
                            ul.appendChild(li);
                        }
                    });

                    groupDiv.appendChild(ul);
                    meaningElement.appendChild(groupDiv);
                });
            } else {
                meaningElement.textContent = "Không tìm thấy nghĩa.";
            }
            // meaningElement.textContent = result.translated ? result.meaning! : "Không tìm thấy nghĩa.";
            meaningElement.style.fontSize = "14px";
            meaningElement.style.whiteSpace = "pre-line";
            meaningElement.style.marginBottom = "10px";
            meaningElement.style.maxHeight = "150px"; // Giới hạn chiều cao
            meaningElement.style.overflowY = "auto";  // Tạo thanh cuộn nếu vượt quá
            popup.appendChild(meaningElement);

            floatingContainer?.appendChild(popup);
            isPopupVisible = true;
        };

        floatingContainer.appendChild(icon);
        document.body.appendChild(floatingContainer);
    }
});
