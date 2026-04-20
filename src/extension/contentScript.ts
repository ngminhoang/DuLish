import 'bootstrap/dist/css/bootstrap.min.css';

// Small helper so content script can use async/await with chrome.storage.local
function storageGet<T = any>(keys: string | string[] | Record<string, any> | null) : Promise<T> {
    return new Promise((resolve) => chrome.storage.local.get(keys, (result) => resolve(result as T)));
}

const snakeFace = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
    "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
    "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
    "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
    "😎", "🤓", "🤒", "🤕", "🤢", "🤮", "🤧", "😇", "🤡", "🤠",
    "🥹", "🥺", "🥸", "🥳", "🫨", "🙂‍↔️", "🙂‍↕️", "👿", "😈", "🧐",
    "🫣", "🫢", "👹", "👺", "💀", "👽", "🤖", "😮", "😯", "😲",
    "😳", "😦", "😧", "😨", "😰", "😥"
];

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
    const result = await storageGet(['isLoggedIn', 'uid']);
    if (!result.isLoggedIn || !result.uid) {
        return;
    }

    const selection = window.getSelection()?.toString().trim();
    console.log("Current selected word is:", selection);
    if (floatingContainer && isPopupVisible && !floatingContainer.contains(e.target as Node)) {
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
                chrome.runtime.sendMessage(
                    {action: "saveWord", word: selection});
                shadowHost.remove();
                isPopupVisible = false;
            };

            const saveFirebaseButton = document.createElement("button");
            saveFirebaseButton.textContent = "Lưu trữ";
            saveFirebaseButton.onclick = (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage(
                    {action: "saveWordIntoFirebase", word: selection});
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
            buttonRow.appendChild(saveFirebaseButton);
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
                        if (document.getElementById("floatingWordSnake")) return;

                        const word = (typeof message.word === "string" ? message.word : "").split("").reverse().join("");
                        const letters = word.split("");
                        // Insert a gap block (null) between each letter
                        const snakeBlocks = [];
                        snakeBlocks.push("closeBtn");
                        for (let i = 0; i < letters.length; i++) {
                            snakeBlocks.push(letters[i]);
                            // if (i < letters.length - 1) snakeBlocks.push("0"); // gap block
                        }

                        // Add the close button as the tail (smallest block)


                        const snakeContainer = document.createElement("div");
                        snakeContainer.id = "floatingWordSnake";
                        snakeContainer.style.position = "fixed";
                        snakeContainer.style.top = "0";
                        snakeContainer.style.left = "0";
                        snakeContainer.style.zIndex = "999999";
                        snakeContainer.style.pointerEvents = "none";

                        const blocks: (HTMLDivElement | HTMLButtonElement)[] = [];

                        // Color gradient from tail to head
                        function lerpColor(a: string, b: string, t: number) {
                            const ah = a.replace("#", "");
                            const bh = b.replace("#", "");
                            const ar = parseInt(ah.substring(0, 2), 16);
                            const ag = parseInt(ah.substring(2, 4), 16);
                            const ab = parseInt(ah.substring(4, 6), 16);
                            const br = parseInt(bh.substring(0, 2), 16);
                            const bg = parseInt(bh.substring(2, 4), 16);
                            const bb = parseInt(bh.substring(4, 6), 16);
                            const rr = Math.round(ar + (br - ar) * t);
                            const rg = Math.round(ag + (bg - ag) * t);
                            const rb = Math.round(ab + (bb - ab) * t);
                            return `rgb(${rr},${rg},${rb})`;
                        }

                        const colorTail = "#ffa600";
                        const colorHead = "#ddca7c";

                        let closeBtn: HTMLButtonElement | null = null;

                        // Dynamic spacing based on block size
                        const minSize = 18;
                        const maxSize = 38;
                        const getSpacing = (fontSize: number) => fontSize + 6;

                        snakeBlocks.forEach((char, idx) => {
                            const t = idx / (snakeBlocks.length - 1);
                            const fontSize = maxSize - (maxSize - minSize) * Math.pow(t, 1.5);
                            const color = lerpColor(colorTail, colorHead, t);

                            if (char === "closeBtn") {
                                closeBtn = document.createElement("button");
                                    closeBtn.textContent = snakeFace[Math.floor(Math.random() * snakeFace.length)];
                                    Object.assign(closeBtn.style, {
                                        position: "absolute",
                                        background: "transparent",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "0",
                                        cursor: "pointer",
                                        pointerEvents: "auto",
                                        zIndex: "1000000",
                                        fontSize: `${maxSize * 2}px`,
                                        transition: "transform 0.1s linear",
                                        lineHeight: "1",
                                    });
                                closeBtn.onclick = () => {
                                    clearInterval(interval);
                                    snakeContainer.remove();
                                    chrome.runtime.sendMessage({action: "markAsShown", word: message.word});
                                };
                                snakeContainer.appendChild(closeBtn);
                                blocks.push(closeBtn);
                            } else {
                                const block = document.createElement("div");
                                if (char === null) {
                                Object.assign(block.style, {
                                            position: "absolute",
                                            width: "18px",
                                            height: "18px",
                                            background: "transparent",
                                            pointerEvents: "none",
                                            borderRadius: "50%"
                                        });
                                } else {
                                    block.textContent = char;
                                    Object.assign(block.style, {
                                        position: "absolute",
                                        background: color,
                                        color: "#fff",
                                        fontWeight: "bold",
                                        fontSize: `${fontSize}px`,
                                        borderRadius: "25px",
                                        padding: "8px 12px",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                        transition: "transform 0.1s linear, background 0.2s linear, font-size 0.2s linear",
                                        pointerEvents: "auto"
                                    });
                                }
                                snakeContainer.appendChild(block);
                                blocks.push(block);
                            }
                        });

                        document.body.appendChild(snakeContainer);

                        // Movement logic
                        const segmentCount = snakeBlocks.length;
                        const positions = Array.from({length: segmentCount}, () => ({x: 200, y: 200}));

                        let angle = Math.random() * Math.PI * 2;
                        const speed = 8;

                        const interval = setInterval(() => {
                            // Head movement
                            const head = positions[0];
                            angle += (Math.random() - 0.5) * 0.4;
                            const vx = Math.cos(angle) * speed;
                            const vy = Math.sin(angle) * speed;

                            head.x += vx;
                            head.y += vy;

                            // Bounce off edges
                            if (head.x < 0 || head.x > window.innerWidth) angle = Math.PI - angle;
                            if (head.y < 0 || head.y > window.innerHeight) angle = -angle;

                            // Follow head with dynamic spacing
                            for (let i = 1; i < segmentCount; i++) {
                                const prev = positions[i - 1];
                                const curr = positions[i];

                                const dx = prev.x - curr.x;
                                const dy = prev.y - curr.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);

                                // Calculate spacing based on the current and previous block's font size
                                let prevFontSize = maxSize - (maxSize - minSize) * Math.pow((i - 1) / (segmentCount - 1), 1.5);
                                let currFontSize = maxSize - (maxSize - minSize) * Math.pow(i / (segmentCount - 1), 1.5);
                                const dynamicSpacing = getSpacing((prevFontSize + currFontSize) / 2);

                                if (dist > dynamicSpacing) {
                                    const moveX = dx / dist * (dist - dynamicSpacing);
                                    const moveY = dy / dist * (dist - dynamicSpacing);
                                    curr.x += moveX;
                                    curr.y += moveY;
                                }
                            }

                            // Apply positions to blocks
                            blocks.forEach((block, i) => {
                                const pos = positions[i];
                                block.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
                            });
                        }, 30);
                    }
                });