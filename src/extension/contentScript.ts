let floatingContainer: HTMLDivElement | null = null;
let isPopupVisible = false;

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

document.addEventListener("mouseup", (e) => {
    const selection = window.getSelection()?.toString().trim();


    if (selection && /^[a-zA-Z]+$/.test(selection) && !(e.target instanceof HTMLButtonElement)) {
        const range = window.getSelection()?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (!rect) return;

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
            popup.style.width = "150px";
            popup.style.height = "100px";
            popup.style.backgroundColor = "#f9f9f9";
            popup.style.border = "1px solid #ccc";
            popup.style.borderRadius = "8px";
            popup.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
            popup.style.display = "flex";
            popup.style.flexDirection = "column";
            popup.style.justifyContent = "center";
            popup.style.alignItems = "center";
            popup.style.padding = "10px";

            const wordElement = document.createElement("div");
            wordElement.textContent = selection;
            wordElement.style.fontSize = "16px";
            wordElement.style.fontWeight = "bold";
            wordElement.style.marginBottom = "8px";

            const saveButton = document.createElement("button");
            saveButton.textContent = "Save";
            saveButton.style.padding = "5px 10px";
            saveButton.style.fontSize = "14px";
            saveButton.style.cursor = "pointer";
            saveButton.onclick = (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({ action: "saveWord", word: selection });

                // Remove everything after save
                floatingContainer?.remove();
                floatingContainer = null;
                isPopupVisible = false;
            };

            popup.appendChild(wordElement);
            popup.appendChild(saveButton);
            floatingContainer?.appendChild(popup);
            isPopupVisible = true;
        };

        floatingContainer.appendChild(icon);
        document.body.appendChild(floatingContainer);
    }
});
