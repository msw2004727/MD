// js/handlers/drag-drop-handlers.js

// --- 全域變數 (專用於此檔案) ---
let draggedElement = null;
let draggedDnaObject = null;
let draggedSourceType = null;
let draggedSourceIndex = null;
let isJiggleModeActive = false;
let longPressTimer = null;
const LONG_PRESS_DURATION = 500;

// --- 初始化函式 ---
function initializeDragDropEventHandlers() {
    const containers = [
        DOMElements.dnaCombinationSlotsContainer,
        DOMElements.inventoryItemsContainer,
        DOMElements.temporaryBackpackContainer
    ];

    containers.forEach(zone => {
        if (zone) {
            // Drag events (主要用於桌面滑鼠)
            zone.addEventListener('dragstart', handleDragStart);
            zone.addEventListener('dragend', handleDragEnd);
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);

            // 滑鼠事件 (用於長按)
            zone.addEventListener('mousedown', handleItemInteractionStart);
            zone.addEventListener('mouseup', handleItemInteractionEnd);
            zone.addEventListener('mouseleave', handleItemInteractionEnd);
            zone.addEventListener('mousemove', handleItemInteractionEnd); // 滑鼠移動會取消長按計時
            
            // 觸控事件 (用於長按與阻止滾動)
            zone.addEventListener('touchstart', handleItemInteractionStart, { passive: false });
            zone.addEventListener('touchend', handleItemInteractionEnd);
            zone.addEventListener('touchcancel', handleItemInteractionEnd);
            zone.addEventListener('touchmove', handleTouchMove, { passive: false }); // 使用新的專用觸控移動處理器

            // 點擊事件 (用於單擊移動和刪除按鈕)
            zone.addEventListener('click', handleItemClick);
        }
    });

    // 刪除區的放置事件
    const deleteSlot = document.getElementById('inventory-delete-slot');
    if (deleteSlot) {
        deleteSlot.addEventListener('drop', handleDrop);
    }

    // 點擊空白處退出抖動模式
    document.body.addEventListener('click', (event) => {
        if (isJiggleModeActive && !event.target.closest('.jiggle-mode, .modal')) {
            exitJiggleMode();
        }
    });
}

// --- 抖動模式管理 ---
function enterJiggleMode() {
    if (isJiggleModeActive) return;
    isJiggleModeActive = true;
    
    const containers = [
        DOMElements.dnaCombinationSlotsContainer,
        DOMElements.inventoryItemsContainer,
        DOMElements.temporaryBackpackContainer
    ];

    containers.forEach(container => {
        if (!container) return;
        container.querySelectorAll('.occupied').forEach(item => {
            if (item.id === 'inventory-delete-slot') return;
            
            item.classList.add('jiggle-mode');

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-item-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.setAttribute('aria-label', '刪除物品');
            item.appendChild(deleteBtn);
        });
    });
}

function exitJiggleMode() {
    if (!isJiggleModeActive) return;
    isJiggleModeActive = false;
    
    document.querySelectorAll('.jiggle-mode').forEach(item => {
        item.classList.remove('jiggle-mode');
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.remove();
    });
}

// --- 長按偵測 ---
function handleItemInteractionStart(event) {
    if (event.type === 'mousedown' && event.buttons !== 1) return;
    
    const targetItem = event.target.closest('.dna-slot.occupied, .dna-item.occupied, .temp-backpack-slot.occupied');
    if (!targetItem || targetItem.id === 'inventory-delete-slot') return;

    clearTimeout(longPressTimer);
    
    longPressTimer = setTimeout(() => {
        enterJiggleMode();
    }, LONG_PRESS_DURATION);
}

// 修改：將 mouseup/touchend/mouseleave/touchcancel 的邏輯統一
function handleItemInteractionEnd() {
    clearTimeout(longPressTimer);
}

// 新增：專門處理 touchmove 的函數
function handleTouchMove(event) {
    // 只要手指移動，就取消長按計時器
    clearTimeout(longPressTimer);
    
    // 如果觸控的目標是可拖曳的物品，就阻止瀏覽器的預設滾動行為
    // 這是讓拖曳在手機上生效的關鍵
    if (event.target.closest('.dna-item[draggable="true"], .dna-slot[draggable="true"]')) {
       event.preventDefault();
    }
}


// --- 點擊事件處理 ---
async function handleItemClick(event) {
    if (event.target.classList.contains('delete-item-btn')) {
        event.stopPropagation();
        
        const itemElement = event.target.closest('.occupied');
        if (!itemElement) return;

        const sourceType = itemElement.dataset.dnaSource;
        let sourceIndex, dnaObject;
        
        if (sourceType === 'inventory') {
            sourceIndex = parseInt(itemElement.dataset.inventoryIndex, 10);
            dnaObject = gameState.playerData.playerOwnedDNA[sourceIndex];
        } else if (sourceType === 'combination') {
            sourceIndex = parseInt(itemElement.dataset.slotIndex, 10);
            dnaObject = gameState.playerData.dnaCombinationSlots[sourceIndex];
        } else if (sourceType === 'temporaryBackpack') {
            sourceIndex = parseInt(itemElement.dataset.tempItemIndex, 10);
            dnaObject = gameState.temporaryBackpack[sourceIndex]?.data;
        }

        if (!dnaObject) return;

        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${dnaObject.name || '該DNA'}" 嗎？`, async () => {
            exitJiggleMode();
            if (sourceType === 'inventory') {
                gameState.playerData.playerOwnedDNA[sourceIndex] = null;
                renderPlayerDNAInventory();
            } else if (sourceType === 'combination') {
                gameState.playerData.dnaCombinationSlots[sourceIndex] = null;
                renderDNACombinationSlots();
            } else if (sourceType === 'temporaryBackpack') {
                gameState.temporaryBackpack[sourceIndex] = null;
                renderTemporaryBackpack();
            }
            await savePlayerData(gameState.playerId, gameState.playerData);
            showFeedbackModal('刪除成功', `DNA「${dnaObject.name}」已被成功銷毀。`);
        });
        return; 
    }

    if (!isJiggleModeActive) {
        const itemElement = event.target.closest('.dna-item.occupied, .dna-slot.occupied');
        if (!itemElement) return;

        if (itemElement.closest('#inventory-items')) {
            await handleClickInventory(event);
        } else if (itemElement.closest('#dna-combination-slots')) {
            await handleClickCombinationSlot(event);
        }
    }
}

// --- 拖放事件處理 ---
function handleDragStart(event) {
    handleItemInteractionEnd();

    const target = event.target.closest('.dna-item.occupied, .dna-slot.occupied, .temp-backpack-slot.occupied');
    if (!target) {
        event.preventDefault();
        return;
    }

    if (isJiggleModeActive) {
        exitJiggleMode();
    }
    
    draggedElement = target;
    draggedSourceType = target.dataset.dnaSource;

    if (draggedSourceType === 'inventory') {
        draggedSourceIndex = parseInt(target.dataset.inventoryIndex, 10);
        if (isNaN(draggedSourceIndex)) { event.preventDefault(); return; }
        draggedDnaObject = gameState.playerData.playerOwnedDNA[draggedSourceIndex];
    } else if (draggedSourceType === 'combination') {
        draggedSourceIndex = parseInt(target.dataset.slotIndex, 10);
        if (isNaN(draggedSourceIndex)) { event.preventDefault(); return; }
        draggedDnaObject = gameState.playerData.dnaCombinationSlots[draggedSourceIndex];
    } else if (draggedSourceType === 'temporaryBackpack') {
        draggedSourceIndex = parseInt(target.dataset.tempItemIndex, 10);
        if (isNaN(draggedSourceIndex)) { event.preventDefault(); return; }
        const tempItem = gameState.temporaryBackpack[draggedSourceIndex];
        draggedDnaObject = tempItem ? tempItem.data : null;
    }

    if (!draggedDnaObject) {
        event.preventDefault();
        return;
    }

    event.dataTransfer.setData('text/plain', JSON.stringify({
        sourceType: draggedSourceType,
        sourceIndex: draggedSourceIndex,
        dnaId: draggedDnaObject.id || draggedDnaObject.baseId
    }));
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { if (draggedElement) draggedElement.classList.add('dragging'); }, 0);
}

function handleDragEnd(event) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
    }
    draggedElement = null;
    draggedDnaObject = null;
    draggedSourceType = null;
    draggedSourceIndex = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const validTarget = event.target.closest('.dna-slot, .dna-item, #inventory-delete-slot, .temp-backpack-slot');
    if (validTarget) {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        validTarget.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const target = event.target.closest('.dna-slot, .dna-item, #inventory-delete-slot, .temp-backpack-slot');
    if (target && !target.contains(event.relatedTarget) && !target.classList.contains('dragging')) {
        target.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    const dropTargetElement = event.target.closest('.dna-slot, .dna-item, #inventory-delete-slot, .temp-backpack-slot');

    if (!draggedDnaObject || !dropTargetElement) {
        handleDragEnd(event);
        return;
    }
    dropTargetElement.classList.remove('drag-over');
    
    const dnaDataToMove = JSON.parse(JSON.stringify(draggedDnaObject));

    if (dropTargetElement.id === 'inventory-delete-slot') {
        const sourceTypeToDelete = draggedSourceType;
        const sourceIndexToDelete = draggedSourceIndex;
        const dnaNameToDelete = dnaDataToMove.name || '該DNA';

        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${dnaNameToDelete}" 嗎？此操作無法復原。`, async () => {
            exitJiggleMode();
            if (sourceTypeToDelete === 'inventory') {
                gameState.playerData.playerOwnedDNA[sourceIndexToDelete] = null;
                renderPlayerDNAInventory();
            } else if (sourceTypeToDelete === 'combination') {
                gameState.playerData.dnaCombinationSlots[sourceIndexToDelete] = null;
                renderDNACombinationSlots();
            } else if (sourceTypeToDelete === 'temporaryBackpack') {
                gameState.temporaryBackpack[sourceIndexToDelete] = null;
                renderTemporaryBackpack();
            }
            await savePlayerData(gameState.playerId, gameState.playerData);
            showFeedbackModal('刪除成功', `DNA「${dnaNameToDelete}」已被成功銷毀。`);
        });
    } else if (dropTargetElement.classList.contains('dna-slot')) {
        if (draggedSourceType === 'temporaryBackpack') {
            showFeedbackModal('無效操作', '請先將臨時背包中的物品拖曳至下方的「DNA碎片」庫存區，才能進行組合。');
            handleDragEnd(event); 
            return;
        }
        
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        if (isNaN(targetSlotIndex)) { handleDragEnd(event); return; }
        
        const itemOriginallyInTargetSlot = gameState.playerData.dnaCombinationSlots[targetSlotIndex]; 
        
        if (draggedSourceType === 'inventory') {
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = itemOriginallyInTargetSlot;
        } else if (draggedSourceType === 'combination') {
            if (draggedSourceIndex !== targetSlotIndex) {
                gameState.playerData.dnaCombinationSlots[draggedSourceIndex] = itemOriginallyInTargetSlot;
            }
        }
        gameState.playerData.dnaCombinationSlots[targetSlotIndex] = dnaDataToMove;
        
        renderDNACombinationSlots();
        renderPlayerDNAInventory(); 
        await savePlayerData(gameState.playerId, gameState.playerData);
    }
    else if (dropTargetElement.classList.contains('dna-item') && dropTargetElement.closest('#inventory-items')) {
        const targetInventoryIndex = parseInt(dropTargetElement.dataset.inventoryIndex, 10);
        if (isNaN(targetInventoryIndex)) { handleDragEnd(event); return; }
        
        const itemAtTargetInventorySlot = gameState.playerData.playerOwnedDNA[targetInventoryIndex];
        
        if (draggedSourceType === 'inventory') {
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = itemAtTargetInventorySlot; 
        } else if (draggedSourceType === 'combination') {
            gameState.playerData.dnaCombinationSlots[draggedSourceIndex] = itemAtTargetInventorySlot; 
        } else if (draggedSourceType === 'temporaryBackpack') {
            if(itemAtTargetInventorySlot) { 
                showFeedbackModal('操作失敗', '目標庫存格非空格，請先將物品移至空格。');
                handleDragEnd(event);
                return;
            }
            gameState.temporaryBackpack[draggedSourceIndex] = null;
             dnaDataToMove.id = `dna_inst_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
             dnaDataToMove.baseId = dnaDataToMove.baseId || dnaDataToMove.id;
        }
        
        gameState.playerData.playerOwnedDNA[targetInventoryIndex] = dnaDataToMove;

        renderPlayerDNAInventory();
        renderDNACombinationSlots();
        renderTemporaryBackpack();
        await savePlayerData(gameState.playerId, gameState.playerData);
    }
}
