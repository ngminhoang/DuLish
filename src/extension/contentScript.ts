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
        font-family: 'Segoe UI', Roboto, Arial, sans-serif;
        background-color: #ffffff; /* surface */
        color: #0f172a; /* dark text */
        border-radius: 14px;
        padding: 14px;
        max-width: 360px;
        box-shadow: 0 8px 24px rgba(30,58,138,0.12);
        border: 1px solid rgba(30,58,138,0.06);
        font-size: 14px;
        margin-top: 6px;
      }

      /* Button styles - primary (filled) and secondary (outline) */
      .popup .primary-btn {
        background-color: #1e3a8a; /* primary */
        color: #ffffff;
        border: none;
        padding: 8px 12px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        margin-right: 8px;
      }
      .popup .primary-btn:hover {
        background-color: #16306f;
      }
      .popup .secondary-btn {
        background-color: transparent;
        color: #1e3a8a;
        border: 1px solid rgba(30,58,138,0.12);
        padding: 8px 12px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
      }
      .popup .secondary-btn:hover {
        background-color: #f1f5f9; /* light surface */
      }

      .title {
        font-weight: 700;
        font-size: 16px;
        color: #1e3a8a; /* primary */
        margin-bottom: 6px;
      }
      .phonetic {
        font-size: 13px;
        color: #64748b; /* muted */
        margin-bottom: 10px;
      }
      .meaning-wrapper {
        max-height: 180px;
        overflow-y: auto;
        margin-bottom: 10px;
        background: transparent;
        padding-right: 6px;
      }
      .meaning-wrapper::-webkit-scrollbar {
        width: 6px;
      }
      .meaning-wrapper::-webkit-scrollbar-thumb {
        background: rgba(30,58,138,0.16);
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
        margin-bottom: 6px;
      }
      .meaning .group-title {
        font-weight: 700;
        color: #1e3a8a;
        margin-bottom: 6px;
      }
      .meaning .example {
        color: #0f172a;
        font-style: italic;
        margin-top: 4px;
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
            saveButton.className = 'primary-btn';
            saveButton.textContent = "Phá 😈 phách";
            saveButton.onclick = (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage(
                    {action: "saveWord", word: selection});
                shadowHost.remove();
                isPopupVisible = false;
            };

            const saveFirebaseButton = document.createElement("button");
            saveFirebaseButton.className = 'secondary-btn';
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


// Biến lưu trữ danh sách từ để tránh việc đọc storage quá nhiều lần
let localActiveWords: string[] = [];

// 1. Hàm thực hiện bôi vàng một node văn bản
function highlightWords(node: Node) {
    if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        const parent = node.parentElement;

        // Tránh bôi vàng lặp lại hoặc can thiệp vào các thẻ nhạy cảm
        if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.classList.contains('dulish-highlight')) {
            return;
        }

        let text = node.textContent || "";
        let hasMatch = false;

        // Sắp xếp từ dài trước để tránh lỗi highlight đè (ví dụ: "background" vs "back")
        const sortedWords = [...localActiveWords].sort((a, b) => b.length - a.length);

        sortedWords.forEach(word => {
            if (word && text.toLowerCase().includes(word.toLowerCase())) {
                const regex = new RegExp(`(${word})`, 'gi');
                text = text.replace(regex, `<mark class="dulish-highlight" style="background-color: #ffeb3b; color: black; padding: 2px; border-radius: 3px;">$1</mark>`);
                hasMatch = true;
            }
        });

        if (hasMatch) {
            const span = document.createElement('span');
            span.innerHTML = text;
            parent.replaceChild(span, node);
        }
    } else {
        // Nếu là Element node, duyệt qua các con của nó
        node.childNodes.forEach(highlightWords);
    }
}

// 2. Khởi tạo Observer để theo dõi thay đổi DOM
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            highlightWords(node);
        });
    });
});

// 3. Hàm chính để kích hoạt
async function initHighlight() {
    // Lấy dữ liệu từ storage (dựa trên cấu trúc ảnh bạn gửi)
    const result = await chrome.storage.local.get(['activeWords']);
    if (result.activeWords && Array.isArray(result.activeWords)) {
        // Map để lấy riêng mảng các từ (string)
        localActiveWords = result.activeWords
            .map((item: any) => item.word || item.id) // lấy item.word hoặc item.id tùy theo dữ liệu thực tế
            .filter((word: string) => word && word !== "none");

        // Chạy lần đầu cho toàn bộ trang
        highlightWords(document.body);

        // Bắt đầu quan sát sự thay đổi (lazy load, infinite scroll...)
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Chạy khi script được load
initHighlight();