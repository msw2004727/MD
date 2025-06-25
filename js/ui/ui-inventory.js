// js/ui-inventory.js
// 這個檔案專門處理「DNA管理」頁籤中的所有UI渲染，包括組合槽、碎片庫存和暫存背包。

function applyDnaItemStyle(element, dnaData) {
    if (!element) return;

    // 先清除可能存在的舊刪除按鈕，避免重複
    const existingBtn = element.querySelector('.delete-item-btn');
    if (existingBtn) existingBtn.remove();

    if (!dnaData) {
        element.style.backgroundColor = '';
        element.style.color = '';
        element.style.borderColor = '';
        const nameSpan = element.querySelector('.dna-name-text');
        if (nameSpan) {
            nameSpan.textContent = "空位";
        }
        element.classList.add('empty');
        element.classList.remove('occupied');
        element.classList.remove('jiggle-mode'); // 確保空格不抖動
        return;
    }

    element.classList.remove('empty');
    element.classList.add('occupied');

    const elementTypeMap = {
        '火': 'fire', '水': 'water', '木': 'wood', '金': 'gold', '土': 'earth',
        '光': 'light', '暗': 'dark', '毒': 'poison', '風': 'wind', '混': 'mix', '無': '無'
    };
    const typeKey = dnaData.type ? (elementTypeMap[dnaData.type] || dnaData.type.toLowerCase()) : '無';
    const elementBgVarName = `--element-${typeKey}-bg`;
    element.style.backgroundColor = `var(${elementBgVarName}, var(--bg-slot))`;

    const rarityMap = {
        '普通': 'common', '稀有': 'rare', '菁英': 'elite', '傳奇': 'legendary', '神話': 'mythical'
    };
    const rarityKey = dnaData.rarity ? (rarityMap[dnaData.rarity] || dnaData.rarity.toLowerCase()) : 'common';

    let rarityTextColorVar = `var(--rarity-${rarityKey}-text, var(--text-primary))`;

    element.style.color = rarityTextColorVar;
    element.style.borderColor = rarityTextColorVar;

    const nameSpan = element.querySelector('.dna-name-text');
    if (nameSpan) {
        nameSpan.textContent = dnaData.name || '未知DNA';
    } else {
        element.innerHTML = `<span class="dna-name-text">${dnaData.name || '未知DNA'}</span>`;
    }

    // ** 核心修改：將抖動模式的判斷與樣式應用集中到此處 **
    if (isJiggleModeActive) {
        element.classList.add('jiggle-mode');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-item-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.setAttribute('aria-label', '刪除物品');
        element.appendChild(deleteBtn);
    } else {
        element.classList.remove('jiggle-mode');
    }
}


function renderDNACombinationSlots() {
    const container = DOMElements.dnaCombinationSlotsContainer;
    if (!container) return;
    container.innerHTML = '';

    const combinationSlots = gameState.playerData?.dnaCombinationSlots || [null, null, null, null, null];

    combinationSlots.forEach((dna, index) => {
        const slot = document.createElement('div');
        slot.classList.add('dna-slot');
        slot.dataset.slotIndex = index;
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('dna-name-text');
        slot.appendChild(nameSpan);

        const typeSpan = document.createElement('span');
        typeSpan.classList.add('dna-type-text');
        slot.appendChild(typeSpan);

        if (dna && dna.id) {
            slot.draggable = true;
            slot.dataset.dnaId = dna.id;
            slot.dataset.dnaBaseId = dna.baseId;
            slot.dataset.dnaSource = 'combination';
            
            // **核心修改點**
            const elementType = dna.type || '無';
            const elementCssKey = getElementCssClassKey(elementType);
            typeSpan.textContent = `${elementType}屬性`;
            typeSpan.className = `dna-type-text text-element-${elementCssKey}`; // 重新設定 class
            
            applyDnaItemStyle(slot, dna);
        } else {
            nameSpan.textContent = `組合槽 ${index + 1}`;
            slot.classList.add('empty');
            applyDnaItemStyle(slot, null);
            typeSpan.textContent = ''; 
        }
        container.appendChild(slot);
    });
    
    if(DOMElements.combineButton) {
        DOMElements.combineButton.disabled = combinationSlots.filter(s => s !== null).length < 5;
    }
}

function renderPlayerDNAInventory() {
    const container = DOMElements.inventoryItemsContainer;
    if (!container) return;
    container.innerHTML = '';
    const MAX_INVENTORY_SLOTS = gameState.MAX_INVENTORY_SLOTS;
    const ownedDna = gameState.playerData?.playerOwnedDNA || [];

    for (let index = 0; index < MAX_INVENTORY_SLOTS; index++) {
        const item = document.createElement('div');
        item.classList.add('dna-item');

        if (index === 11) {
            item.id = 'inventory-delete-slot';
            item.classList.add('inventory-delete-slot');
            item.innerHTML = `<span class="delete-slot-main-text">刪除區</span><span class="delete-slot-sub-text">拖曳至此</span>`;
            item.draggable = false;
            item.dataset.inventoryIndex = index;
        } else {
            const dna = ownedDna[index];
            item.dataset.inventoryIndex = index;

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('dna-name-text');
            item.appendChild(nameSpan);

            const typeSpan = document.createElement('span');
            typeSpan.classList.add('dna-type-text');
            item.appendChild(typeSpan);

            if (dna) {
                item.draggable = true;
                item.dataset.dnaId = dna.id;
                item.dataset.dnaBaseId = dna.baseId;
                item.dataset.dnaSource = 'inventory';
                
                // **核心修改點**
                const elementType = dna.type || '無';
                const elementCssKey = getElementCssClassKey(elementType);
                typeSpan.textContent = `${elementType}屬性`;
                typeSpan.className = `dna-type-text text-element-${elementCssKey}`; // 重新設定 class

                applyDnaItemStyle(item, dna);
            } else {
                item.draggable = false; // 空格不可拖曳
                item.dataset.dnaSource = 'inventory';
                nameSpan.textContent = '空位';
                typeSpan.textContent = ''; 
                applyDnaItemStyle(item, null);
            }
        }
        container.appendChild(item);
    }
}

function renderTemporaryBackpack() {
    const container = DOMElements.temporaryBackpackContainer;
    if (!container) return;
    container.innerHTML = '';
    const MAX_TEMP_SLOTS = 9;
    const currentTempItems = gameState.temporaryBackpack || [];

    let tempBackpackArray = new Array(MAX_TEMP_SLOTS).fill(null);
    currentTempItems.forEach((item, index) => {
        if (index < MAX_TEMP_SLOTS) {
            tempBackpackArray[index] = item;
        }
    });

    tempBackpackArray.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.classList.add('temp-backpack-slot', 'dna-item');
        slot.dataset.tempItemIndex = index;

        if (item) {
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('dna-name-text');
            slot.appendChild(nameSpan);
            
            const typeSpan = document.createElement('span');
            typeSpan.classList.add('dna-type-text');
            slot.appendChild(typeSpan);
            
            // **核心修改點**
            const elementType = item.data.type || '無';
            const elementCssKey = getElementCssClassKey(elementType);
            typeSpan.textContent = `${elementType}屬性`;
            typeSpan.className = `dna-type-text text-element-${elementCssKey}`; // 重新設定 class

            slot.draggable = true;
            slot.dataset.dnaId = item.data.id;
            slot.dataset.dnaBaseId = item.data.baseId;
            slot.dataset.dnaSource = 'temporaryBackpack';
            slot.onclick = () => handleMoveFromTempBackpackToInventory(index);
            applyDnaItemStyle(slot, item.data);
        } else {
            slot.innerHTML = `<span class="dna-name-text">空位</span>`;
            slot.draggable = false;
            applyDnaItemStyle(slot, null);
        }
        container.appendChild(slot);
    });
}
