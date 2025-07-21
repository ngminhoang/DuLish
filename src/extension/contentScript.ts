import 'bootstrap/dist/css/bootstrap.min.css';

const emojiSet = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
    "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
    "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
    "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
    "😎", "🤓", "🤒", "🤕", "🤢", "🤮", "🤧", "😇", "🤡", "🤠",
    "🥹", "🥺", "🥸", "🥳", "🫨", "🙂‍↔️", "🙂‍↕️", "👿", "😈", "🧐",
    "🫣", "🫢", "👹", "👺", "💀", "☠️", "👻", "👽", "😹", "😸",
    "😺", "💩", "🤖", "👾", "😻", "😼", "😽", "🙀", "😿", "😾",
    "🐱", "🦁", "🐯", "🐹", "🐷", "🐮", "🐻", "🐻‍❄️", "🐸", "🐲",
    "🐔", "🦄", "🦧", "🐟", "🐋", "🐳", "🦐", "🦑", "🐙", "🦞",
    "🐓", "🦆", "🪼", "🐚", "🐤", "🐣", "🪰", "👁️", "👀", "🍕",
    "🍔", "🍟", "🌭", "🍿", "🧂", "🧈", "🥞", "🧇", "🍳", "🥚",
    "🥓", "🍞", "🥐", "🥨", "🥯", "🥖", "🫓", "🌯", "🌮", "🥪",
    "🥙", "🥗", "🧀", "🍖", "🥩", "🍗", "🍠", "🍙", "🍘", "🍱",
    "🥡", "🥠", "🥟", "🍚", "🍛", "🍜", "🦪", "🍣", "🍤", "🍲",
    "🥘", "🧆", "🍢", "🥮", "🍥", "🫕", "🍝", "🥣", "🥧", "🍦",
    "🍧", "🧁", "🍰", "🎂", "🍪", "🍩", "🍨", "🍫", "🍬", "🍭",
    "🍡", "🍵", "🍼", "☕", "🫖", "🍺", "🧊", "🥤", "🧋", "🥝",
    "🥥", "🍇", "🍈", "🍉", "🥭", "🍍", "🍌", "🍋", "🍊", "🍎",
    "🍏", "🫐", "🍅", "🫑", "🍄", "🥑", "🫒", "🍐", "🍑", "🍆",
    "🥒", "🥬", "🌽", "🍒", "🍓", "🌶️", "🥦", "🫚", "🌰", "🥕",
    "🧅", "🧄", "🥔", "🫛", "🏵️", "🌹", "🌺", "🥜", "🫘", "🌻",
    "🌼", "💐", "🌸", "🌷", "🌲", "🍀", "🌿", "🪴", "🌱", "🌾",
    "🌵", "☘️", "🥀", "🌴", "🪻", "🌳", "🍁", "🍂", "🪹", "🪺",
    "🍃", "😮", "😯", "😲", "😳", "😦", "😧", "😨", "😰", "😥"
];

const style = document.createElement("style");
style.textContent = `
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
  }
`;
document.head.appendChild(style);

let floatingContainer: HTMLDivElement | null = null;
let isPopupVisible = false;

interface MeaningGroup {
    type: string;
    lines: string[];
}

interface DictionaryResult {
    word: string;
    phonetic?: string;
    meanings: MeaningGroup[];
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

                const typeMatch = line.match(/^\*\s+(.*?)$/);
                if (typeMatch) {
                    if (currentType || currentLines.length > 0) {
                        meanings.push({type: currentType, lines: currentLines});
                    }
                    currentType = typeMatch[1].trim();
                    currentLines = [];
                } else {
                    currentLines.push(line);
                }
            }

            if (currentType || currentLines.length > 0) {
                meanings.push({type: currentType, lines: currentLines});
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

        const shadowHost = document.createElement("div");
        // shadowHost.style.position = "absolute";
        shadowHost.style.position = "absolute";
        shadowHost.style.top = `${rect.top + window.scrollY - 15}px`;
        shadowHost.style.left = `${rect.right + window.scrollX}px`;
        shadowHost.style.zIndex = "999999";
        shadowHost.style.display = "flex";
        shadowHost.style.flexDirection = "column";
        shadowHost.style.alignItems = "start";

        const shadowRoot = shadowHost.attachShadow({mode: "open"});

        const style = document.createElement("style");
        style.textContent = `
      .popup {
        font-family: 'Segoe UI', sans-serif;
        background-color: #FCE8E6;
        color: #222;
        border-radius: 16px;
        padding: 16px;
        max-width: 360px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        border: 1px solid #F9C5B9;
        font-size: 14px;
        margin-top: 5px;
      }
      .popup button {
        background-color: #E98E74;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 500;
        margin-bottom: 10px;
      }
      .popup button:hover {
        background-color: #D87563;
      }
      .title {
        font-weight: bold;
        font-size: 18px;
        color: #E85B51;
        margin-bottom: 8px;
      }
      .phonetic {
        font-size: 14px;
        color: #666;
        margin-bottom: 12px;
      }
      .meaning-wrapper {
        max-height: 180px;
        overflow-y: auto;
        margin-bottom: 10px;
      }
      .meaning-wrapper::-webkit-scrollbar {
        width: 6px;
      }
      .meaning-wrapper::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 4px;
      }
      .meaning {
        margin-bottom: 10px;
      }
      .meaning ul {
        padding-left: 20px;
        margin: 0;
      }
      .meaning li {
        margin-bottom: 4px;
      }
    `;

        const icon = document.createElement("div");
        // icon.textContent = "🔍";
        // icon.textContent = String.fromCodePoint(0x1F300 + Math.floor(Math.random() * (0x1F5FF - 0x1F300)));
        icon.textContent = emojiSet[Math.floor(Math.random() * emojiSet.length)];
        icon.style.cursor = "pointer";
        icon.style.fontSize = "28px";

        icon.onclick = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();

            if (isPopupVisible) return;

            const container = document.createElement("div");
            container.className = "popup";

            const title = document.createElement("div");
            title.className = "title";
            title.textContent = result.word;

            const phonetic = document.createElement("div");
            phonetic.className = "phonetic";
            phonetic.textContent = result.phonetic || "";
            const titlePhoneticText = document.createElement("div");

            titlePhoneticText.appendChild(title);
            titlePhoneticText.appendChild(phonetic);

            const saveButton = document.createElement("button");
            saveButton.textContent = "phá 😈 phách";
            saveButton.onclick = (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({action: "saveWord", word: selection});
                shadowHost.remove();
                isPopupVisible = false;
            };

            const meaningWrapper = document.createElement("div");
            meaningWrapper.className = "meaning-wrapper";
            if (result.translated) {
                result.meanings.forEach(group => {
                    const groupDiv = document.createElement("div");
                    groupDiv.className = "meaning";

                    const groupTitle = document.createElement("div");
                    groupTitle.textContent = group.type;
                    groupTitle.style.fontWeight = "bold";
                    groupTitle.style.color = "#D55C4B";
                    groupTitle.style.marginBottom = "4px";

                    const ul = document.createElement("ul");
                    group.lines.forEach(line => {
                        if (line.trim() != "") {
                            const li = document.createElement("li");
                            line = line.replace(/[-]/g, "").trim();
                            li.textContent = line;
                            if (line.includes("+")) {
                                const ex = document.createElement("div");
                                ex.style.color = "#232323";
                                line = line.replace("=", "➡️").trim();
                                line = line.replace(/[+]/g, " = ").trim();
                                ex.textContent = line;
                                ex.style.fontStyle = "italic";
                                ul.appendChild(ex);
                            } else {
                                ul.appendChild(li);
                            }
                        }
                    });

                    groupDiv.appendChild(groupTitle);
                    groupDiv.appendChild(ul);
                    meaningWrapper.appendChild(groupDiv);
                });
            } else {
                meaningWrapper.textContent = "Không tìm thấy nghĩa.";
            }

           // Title + phonetic row
            const titleRow = document.createElement("div");
            titleRow.style.display = "flex";
            titleRow.style.flexDirection = "row";
            titleRow.style.alignItems = "center";
            titleRow.appendChild(titlePhoneticText);

            // Save button row
            const buttonRow = document.createElement("div");
            buttonRow.style.display = "flex";
            buttonRow.style.flexDirection = "row";
            buttonRow.style.alignItems = "center";
            buttonRow.appendChild(saveButton);
            container.appendChild(buttonRow);
            container.appendChild(titleRow);
            container.appendChild(meaningWrapper);
            shadowRoot.appendChild(style);
            shadowRoot.appendChild(container);
            isPopupVisible = true;
            floatingContainer = shadowHost;
        };

        shadowRoot.appendChild(style);
        shadowRoot.appendChild(icon);
        document.body.appendChild(shadowHost);
        floatingContainer = shadowHost;
    }
});










chrome.runtime.onMessage.addListener((message) => {
            if (message.action === "showCard") {
                if (document.getElementById("floatingWordCard")) return;

                const card = document.createElement("div");
                card.id = "floatingWordCard";
                card.style.position = "fixed";
                card.style.top = "50px";
                card.style.left = "50px";
                card.style.padding = "16px";
                card.style.background = "#fff";
                card.style.border = "1px solid #aaa";
                card.style.zIndex = "9999";
                card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                card.style.transition = "transform 3s ease-in-out";
                card.innerHTML = `
              <div style="font-size:18px;">${message.word}</div>
              <button id="closeWordCard" style="margin-top: 10px;">Đã hiểu</button>
            `;

                document.body.appendChild(card);

                // Di chuyển bay lượn
                let x = 50, y = 50;
                const interval = setInterval(() => {
                    x += Math.floor(Math.random() * 40 - 20);
                    y += Math.floor(Math.random() * 40 - 20);
                    card.style.transform = `translate(${x}px, ${y}px)`;
                }, 3000);

                const closeBtn = document.getElementById("closeWordCard");
                if (closeBtn) {
                    closeBtn.addEventListener("click", () => {
                        clearInterval(interval);
                        card.remove();
                        chrome.runtime.sendMessage({ action: "markAsShown", word: message.word });
                    });
                }
            }
        });