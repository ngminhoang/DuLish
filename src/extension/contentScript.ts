import 'bootstrap/dist/css/bootstrap.min.css';
import nlp from 'compromise';
import { ensureSchema, calculateNextReview, type VocabularyObject } from '../srsEngine';

// Small helper so content script can use async/await with chrome.storage.local
function storageGet<T = any>(keys: string | string[] | Record<string, any> | null): Promise<T> {
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
  .dulish-word.dulish-cooling {
    background-color: rgba(255, 215, 0, 0.18) !important;
    color: inherit !important;
    border-radius: 3px !important;
    cursor: default !important;
    border-bottom: 1px dashed rgba(255, 215, 0, 0.7) !important;
    display: inline !important;
  }
  .dulish-word.dulish-ready {
    background-color: #ffeb3b !important;
    color: #000000 !important;
    border-radius: 3px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15) !important;
    display: inline !important;
  }
  .dulish-word.dulish-ready:hover {
    background-color: #fdd835 !important;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
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

function matchesHeader(line: string, word: string): boolean {
    const lowerLine = line.toLowerCase().trim();
    const lowerWord = word.toLowerCase().trim();
    return lowerLine.startsWith(`@${lowerWord} `) ||
        lowerLine.startsWith(`@${lowerWord}/`) ||
        lowerLine === `@${lowerWord}`;
}

function parseDictionaryEntry(lines: string[], i: number, word: string): DictionaryResult {
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

async function lookupWord(word: string): Promise<DictionaryResult> {
    const lowercaseWord = word.toLowerCase().trim();
    console.log(`[DuLish Dictionary] Looking up word: "${word}"`);

    const response = await fetch(chrome.runtime.getURL('english-vietnamese.txt'));
    const dictionaryText = await response.text();

    const lines = dictionaryText.split('\n');

    // 1. Try exact match first
    for (let i = 0; i < lines.length; i++) {
        if (matchesHeader(lines[i], lowercaseWord)) {
            console.log(`[DuLish Dictionary] Exact match found for "${word}"`);
            return parseDictionaryEntry(lines, i, word);
        }
    }

    // 2. If exact match fails, extract lemma and try matching the lemma
    const doc = nlp(lowercaseWord);
    doc.compute('root');
    const lemma = (doc.json()[0]?.terms[0]?.root || lowercaseWord).toLowerCase().trim();
    console.log(`[DuLish Dictionary] Exact match failed for "${word}". Extracted lemma: "${lemma}"`);

    if (lemma !== lowercaseWord) {
        for (let i = 0; i < lines.length; i++) {
            if (matchesHeader(lines[i], lemma)) {
                console.log(`[DuLish Dictionary] Lemma match found for "${lemma}" (original: "${word}")`);
                return parseDictionaryEntry(lines, i, word);
            }
        }
    }

    // 3. Fallback if both fail
    console.log(`[DuLish Dictionary] Word "${word}" (lemma: "${lemma}") not found in dictionary.`);
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

        const shadowRoot = shadowHost.attachShadow({ mode: "open" });

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
                    { action: "saveWord", word: selection });
                shadowHost.remove();
                isPopupVisible = false;
            };

            const saveFirebaseButton = document.createElement("button");
            saveFirebaseButton.className = 'secondary-btn';
            saveFirebaseButton.textContent = "Lưu trữ";
            saveFirebaseButton.onclick = (e) => {
                e.stopPropagation();

                // 1. Tách lemma (gốc từ) bằng compromise.js
                const wordDoc = nlp(selection);
                wordDoc.compute('root');
                const lemma = wordDoc.json()[0]?.terms[0]?.root || selection.toLowerCase().trim();

                // 2. Định dạng nghĩa tiếng Việt
                const vietnamese_meaning = result.translated
                    ? result.meanings.map(g => {
                        const cleanLines = g.lines.map(l => l.replace(/[-]/g, "").trim()).filter(Boolean);
                        return `${g.type}: ${cleanLines.join(', ')}`;
                    }).join('; ')
                    : "Không tìm thấy nghĩa.";

                // 3. Khởi tạo đối tượng từ vựng mới theo đúng schema SRS mới
                const nowStr = new Date().toISOString();
                const rawVocabObj = {
                    word_id: `${lemma.toLowerCase().trim()}_${Math.floor(Date.now() / 1000)}`,
                    raw_text: selection,
                    lemma: lemma,
                    vietnamese_meaning: vietnamese_meaning,
                    type: selection.trim().includes(' ') ? 'phrase' : 'word',
                    current_streak: 0,
                    next_review_time: nowStr,
                    status: 'ready_to_review',
                    last_updated: nowStr
                };

                // Đảm bảo và mở rộng schema an toàn
                const vocabObj = ensureSchema(rawVocabObj);

                // 4. Gửi message đến background service worker
                chrome.runtime.sendMessage({
                    action: "saveWordIntoFirebase",
                    vocabObj: vocabObj
                });

                // 5. Cập nhật cục bộ tức thì trên UI
                const exists = localActiveWords.some(obj =>
                    (obj.lemma || '').toLowerCase().trim() === lemma.toLowerCase().trim() ||
                    (obj.raw_text || '').toLowerCase().trim() === selection.toLowerCase().trim()
                );

                if (!exists) {
                    localActiveWords.push(vocabObj);
                    highlightWords(document.body);
                }

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
            // Hiding the snake ("Phá phách") button for Phase 1 to focus on Save Word flow
            // buttonRow.appendChild(saveButton);
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
                    chrome.runtime.sendMessage({ action: "markAsShown", word: message.word });
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
        const positions = Array.from({ length: segmentCount }, () => ({ x: 200, y: 200 }));

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
let localActiveWords: VocabularyObject[] = [];

// 1. Hàm thực hiện bôi vàng một node văn bản dựa trên NLP Lemmatization
function highlightWords(node: Node) {
    if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        const parent = node.parentElement;

        // Tránh bôi vàng lặp lại hoặc can thiệp vào các thẻ nhạy cảm
        if (
            parent.tagName === 'SCRIPT' ||
            parent.tagName === 'STYLE' ||
            parent.tagName === 'TEXTAREA' ||
            parent.tagName === 'INPUT' ||
            parent.classList.contains('dulish-word') ||
            parent.closest('.popup') // Do not highlight inside translation popup itself
        ) {
            return;
        }

        const text = node.textContent || "";
        if (!text.trim()) return;

        // Sử dụng compromise.js để phân tích ngữ nghĩa của văn bản
        const doc = nlp(text);
        doc.compute('root');

        let hasMatch = false;
        let newHtml = '';

        const sentences = doc.json();
        if (!sentences || sentences.length === 0) return;

        // Duyệt qua từng từ/token
        sentences.forEach((sentence: any) => {
            if (!sentence.terms) return;
            sentence.terms.forEach((term: any) => {
                const wordText = term.text;
                const root = term.root || term.normal || wordText;

                const wordTextLower = wordText.toLowerCase().trim();
                const rootLower = root.toLowerCase().trim();

                // Tìm kiếm xem từ nguyên bản (raw_text) hoặc từ gốc (lemma) có trong database không
                const matchedObj = localActiveWords.find(obj => {
                    const objLemma = (obj.lemma || '').toLowerCase().trim();
                    const objRaw = (obj.raw_text || '').toLowerCase().trim();
                    return objLemma === rootLower || objRaw === wordTextLower;
                });

                let segment = term.pre || '';
                if (matchedObj) {
                    hasMatch = true;

                    // Tính toán thời gian SRS
                    const now = new Date();
                    const nextReview = new Date(matchedObj.next_review_time);

                    // Condition A: cooling (chưa đến giờ ôn tập hoặc trạng thái cooling)
                    // Condition B: ready (đã đến giờ ôn tập hoặc ready_to_review)
                    const isCooling = now < nextReview || matchedObj.status === 'cooling';

                    // Console log để verify việc khớp từ nguyên bản và từ gốc (đáp ứng DoD)
                    console.log(`[DuLish NLP] Matched: "${wordText}" (Root/Lemma: "${root}") -> Database Word ID: "${matchedObj.word_id}". State: ${isCooling ? 'Cooling' : 'Ready'}`);

                    if (isCooling) {
                        segment += `<span class="dulish-word dulish-cooling" data-id="${matchedObj.word_id}">${wordText}</span>`;
                    } else {
                        segment += `<span class="dulish-word dulish-ready" data-id="${matchedObj.word_id}">${wordText}</span>`;
                    }
                } else {
                    segment += wordText;
                }
                segment += term.post || '';
                newHtml += segment;
            });
        });

        if (hasMatch) {
            const span = document.createElement('span');
            span.innerHTML = newHtml;
            parent.replaceChild(span, node);
        }
    } else {
        // Duyệt qua các node con (chuyển sang array để tránh lỗi dịch vị node khi DOM thay đổi)
        const children = Array.from(node.childNodes);
        children.forEach(highlightWords);
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

// 3. Hàm kích hoạt bôi vàng trang web
async function initHighlight() {
    const result = await chrome.storage.local.get(['activeWords']);
    if (result.activeWords && Array.isArray(result.activeWords)) {
        // Áp dụng ensureSchema cho toàn bộ từ để đảm bảo tương thích dữ liệu mở rộng
        localActiveWords = result.activeWords.map(item => ensureSchema(item));

        // Bôi vàng toàn bộ trang lần đầu
        highlightWords(document.body);

        // Theo dõi thay đổi lazy load, scroll vô tận
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// 4. Multiple Choice Review Modal logic
function generateChoices(correctMeaning: string, currentWordId: string): string[] {
    const distractors: string[] = [];
    
    // Extract unique meanings from other active words
    const otherMeanings = localActiveWords
        .filter(w => w.word_id !== currentWordId && w.vietnamese_meaning)
        .map(w => w.vietnamese_meaning.trim());

    // Fallback distractors in Vietnamese
    const premiumFallbacks = [
        "cung cấp, chuẩn bị",
        "học tập, nghiên cứu",
        "chạy, vận hành, chạy bộ",
        "giải quyết, xử lý khó khăn",
        "suy nghĩ, cân nhắc kỹ lưỡng",
        "khám phá, phát hiện mới",
        "duy trì, bảo tồn trạng thái",
        "phát triển, cải thiện năng lực",
        "tránh xa, từ bỏ thói quen",
        "thực hiện, tiến hành dự án"
    ];

    // Combine other database meanings and fallbacks
    const pool = Array.from(new Set([...otherMeanings, ...premiumFallbacks]))
        .filter(m => m.toLowerCase() !== correctMeaning.toLowerCase());

    // Select 3 random distractors from pool
    while (distractors.length < 3 && pool.length > 0) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        const choice = pool.splice(randomIndex, 1)[0];
        distractors.push(choice);
    }

    // Shuffle the 4 choices (1 correct, 3 distractors)
    const allChoices = [correctMeaning, ...distractors];
    for (let i = allChoices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
    }

    return allChoices;
}

function showReviewCard(vocabObj: VocabularyObject, targetSpan: HTMLElement) {
    // 1. Generate the choices
    const correctMeaning = vocabObj.vietnamese_meaning || "Không tìm thấy nghĩa.";
    const choices = generateChoices(correctMeaning, vocabObj.word_id);

    // 2. Create the Shadow Host container
    const shadowHost = document.createElement("div");
    shadowHost.id = "dulish-review-modal-host";
    shadowHost.style.position = "fixed";
    shadowHost.style.top = "0";
    shadowHost.style.left = "0";
    shadowHost.style.width = "100vw";
    shadowHost.style.height = "100vh";
    shadowHost.style.zIndex = "2147483647"; // Max z-index to overlay everything
    shadowHost.style.pointerEvents = "auto";

    const shadowRoot = shadowHost.attachShadow({ mode: "open" });

    // 3. Shadow DOM Styles
    const style = document.createElement("style");
    style.textContent = `
        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 10, 10, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.25s ease-out;
        }
        .overlay.active {
            opacity: 1;
        }
        .card {
            background: rgba(22, 22, 24, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 32px;
            width: 440px;
            max-width: 90%;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
            color: #ffffff;
            text-align: center;
            transform: scale(0.92);
            transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
        }
        .overlay.active .card {
            transform: scale(1);
        }
        .close-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: transparent;
            border: none;
            font-size: 22px;
            color: rgba(255, 255, 255, 0.35);
            cursor: pointer;
            transition: color 0.2s ease, transform 0.2s ease;
            line-height: 1;
            padding: 0;
            outline: none;
        }
        .close-btn:hover {
            color: #ffffff;
            transform: scale(1.1);
        }
        .badge {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #ffd43b;
            margin-bottom: 12px;
            display: inline-block;
            background: rgba(253, 212, 59, 0.1);
            padding: 4px 12px;
            border-radius: 20px;
            border: 1px solid rgba(253, 212, 59, 0.2);
        }
        .question {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0 0 16px 0;
            font-weight: 400;
        }
        .word {
            font-size: 36px;
            font-weight: 800;
            color: #ffffff;
            margin: 0 0 28px 0;
            letter-spacing: -0.5px;
            text-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
        }
        .options-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
        }
        .option-btn {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 16px 20px;
            width: 100%;
            color: rgba(255, 255, 255, 0.95);
            font-size: 15px;
            font-weight: 500;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            outline: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .option-btn:hover:not(.disabled) {
            background: rgba(255, 255, 255, 0.07);
            border-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.25);
        }
        .option-btn:active:not(.disabled) {
            transform: translateY(0);
        }
        .option-btn.correct {
            background: rgba(46, 204, 113, 0.15) !important;
            border-color: #2ecc71 !important;
            color: #2ecc71 !important;
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.25) !important;
            font-weight: 700;
        }
        .option-btn.incorrect {
            background: rgba(231, 76, 60, 0.15) !important;
            border-color: #e74c3c !important;
            color: #e74c3c !important;
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.25) !important;
            font-weight: 700;
        }
        .option-btn.disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }
        .icon {
            font-size: 16px;
            font-weight: bold;
        }
        .streak-badge {
            margin-top: 20px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .streak-fire {
            color: #ff9f43;
        }
    `;

    // 4. Modal HTML structure
    const overlay = document.createElement("div");
    overlay.className = "overlay";

    const card = document.createElement("div");
    card.className = "card";

    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => {
        dismissModal();
    };

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = `Streak ${vocabObj.current_streak}/10`;

    const question = document.createElement("div");
    question.className = "question";
    question.textContent = "Chọn nghĩa chính xác của từ:";

    const word = document.createElement("div");
    word.className = "word";
    word.textContent = vocabObj.raw_text;

    const optionsList = document.createElement("div");
    optionsList.className = "options-list";

    let hasAnswered = false;

    // Helper to close modal with transition
    const dismissModal = () => {
        overlay.classList.remove("active");
        setTimeout(() => {
            shadowHost.remove();
        }, 250);
    };

    choices.forEach(choice => {
        const optionBtn = document.createElement("button");
        optionBtn.className = "option-btn";
        optionBtn.textContent = choice;

        optionBtn.onclick = async (e) => {
            e.stopPropagation();
            if (hasAnswered) return;
            hasAnswered = true;

            const isCorrect = choice === correctMeaning;
            const optionButtons = optionsList.querySelectorAll(".option-btn");
            
            // Disable all buttons and show styling
            optionButtons.forEach(btn => {
                btn.classList.add("disabled");
                const btnText = btn.textContent;
                if (btnText === correctMeaning) {
                    btn.classList.add("correct");
                    const checkmark = document.createElement("span");
                    checkmark.className = "icon";
                    checkmark.textContent = "✓";
                    btn.appendChild(checkmark);
                } else if (btn === optionBtn && !isCorrect) {
                    btn.classList.add("incorrect");
                    const cross = document.createElement("span");
                    cross.className = "icon";
                    cross.textContent = "✗";
                    btn.appendChild(cross);
                }
            });

            // Trigger SRS next state calculation
            const srsResult = calculateNextReview(vocabObj.current_streak, isCorrect);
            const nowStr = new Date().toISOString();

            const updatedVocab: VocabularyObject = {
                ...vocabObj,
                current_streak: srsResult.current_streak,
                next_review_time: srsResult.next_review_time,
                status: srsResult.status,
                last_updated: nowStr
            };

            // 1. Send update message to background
            chrome.runtime.sendMessage({
                action: "saveWordIntoFirebase",
                vocabObj: updatedVocab
            });

            // 2. Update in local array cache
            const cacheIndex = localActiveWords.findIndex(w => w.word_id === vocabObj.word_id);
            if (cacheIndex !== -1) {
                localActiveWords[cacheIndex] = updatedVocab;
            }

            // 3. Direct DOM highlight class update
            if (isCorrect) {
                console.log(`[DuLish Review] Correct! Upgraded streak to ${srsResult.current_streak}. Next review: ${srsResult.next_review_time}`);
                targetSpan.className = "dulish-word dulish-cooling";
            } else {
                console.log(`[DuLish Review] Incorrect. Decreased streak to ${srsResult.current_streak}. Next review: ${srsResult.next_review_time}`);
            }

            // 4. Auto close card after short delay
            setTimeout(() => {
                dismissModal();
            }, 1200);
        };

        optionsList.appendChild(optionBtn);
    });

    const streakBadge = document.createElement("div");
    streakBadge.className = "streak-badge";
    streakBadge.innerHTML = `<span class="streak-fire">🔥</span> Hộp SRS ôn tập từ vựng`;

    card.appendChild(closeBtn);
    card.appendChild(badge);
    card.appendChild(question);
    card.appendChild(word);
    card.appendChild(optionsList);
    card.appendChild(streakBadge);

    overlay.appendChild(card);
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(overlay);

    document.body.appendChild(shadowHost);

    // Trigger open animations
    setTimeout(() => {
        overlay.classList.add("active");
    }, 10);
}

// 5. Click event delegation for review card triggering
document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("dulish-ready")) {
        e.stopPropagation();
        e.preventDefault();
        const wordId = target.getAttribute("data-id");
        if (wordId) {
            const vocabObj = localActiveWords.find(w => w.word_id === wordId);
            if (vocabObj) {
                showReviewCard(vocabObj, target);
            }
        }
    }
});

// Chạy kích hoạt khi script được load
initHighlight();