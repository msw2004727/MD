// js/handlers/drag-drop-handlers.js

// --- 全域變數 (專用於此檔案) ---
let draggedElement = null;
let draggedDnaObject = null;
let draggedSourceType = null;
let draggedSourceIndex = null;
let isJiggleModeActive = false;
let longPressTimer = null;
const LONG_PRESS_DURATION = 350; // **核心修改：從 500 毫秒縮短為 350 毫秒**

// --- 初始化函式 ---
function initializeDragDropEventHandlers() {
    const containers = [
        DOMElements.dnaCombinationSlotsContainer,
        DOMElements.inventoryItemsContainer,
        DOMElements.temporaryBackpackContainer
    ];

    containers.forEach(zone => {
        if (zone) {
            // 拖曳事件
            zone.addEventListener('dragstart', handleDragStart);
            zone.addEventListener('dragend', handleDragEnd);
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);

            // 長按與刪除事件 (滑鼠)
            zone.addEventListener('mousedown', handleItemInteractionStart);
            zone.addEventListener('mouseup', handleItemInteractionEnd);
            zone.addEventListener('mouseleave', handleItemInteractionEnd);
            zone.addEventListener('mousemove', handleItemInteractionEnd);
            
            // 長按與刪除事件 (觸控)
            zone.addEventListener('touchstart', handleItemInteractionStart, { passive: false });
            zone.addEventListener('touchend', handleItemInteractionEnd);
            zone.addEventListener('touchcancel', handleItemInteractionEnd);
            zone.addEventListener('touchmove', handleTouchMove, { passive: false });

            // 點擊事件 (用於刪除按鈕和單擊移動)
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
        if (isJiggleModeActive && !event.target.closest('.jiggle-mode, .modal, .occupied')) {
            exitJiggleMode();
        }
    });
}

// --- 抖動模式管理 ---
function enterJiggleMode() {
    isJiggleModeActive = true; 
    renderAllInventories();
}

function exitJiggleMode() {
    if (!isJiggleModeActive) return;
    isJiggleModeActive = false;
    renderAllInventories();
}

function renderAllInventories() {
    renderDNACombinationSlots();
    renderPlayerDNAInventory();
    renderTemporaryBackpack();
}


// --- 長按與觸控處理 ---
function handleItemInteractionStart(event) {
    if (event.type === 'mousedown' && event.buttons !== 1) return;
    
    const targetItem = event.target.closest('.dna-slot.occupied, .dna-item.occupied, .temp-backpack-slot.occupied');
    if (!targetItem || targetItem.id === 'inventory-delete-slot') return;

    clearTimeout(longPressTimer);
    
    longPressTimer = setTimeout(() => {
        enterJiggleMode();
    }, LONG_PRESS_DURATION);
}

function handleItemInteractionEnd() {
    clearTimeout(longPressTimer);
}

function handleTouchMove(event) {
    clearTimeout(longPressTimer);
    
    if (isJiggleModeActive) {
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
            if (sourceType === 'inventory') {
                gameState.playerData.playerOwnedDNA[sourceIndex] = null;
            } else if (sourceType === 'combination') {
                gameState.playerData.dnaCombinationSlots[sourceIndex] = null;
            } else if (sourceType === 'temporaryBackpack') {
                gameState.temporaryBackpack[sourceIndex] = null;
            }
            renderAllInventories();
            await savePlayerData(gameState.playerId, gameState.playerData);
            // ---【修改】---
            // showFeedbackModal('刪除成功', `DNA「${dnaObject.name}」已被成功銷毀。`);
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
            if (sourceTypeToDelete === 'inventory') {
                gameState.playerData.playerOwnedDNA[sourceIndexToDelete] = null;
            } else if (sourceTypeToDelete === 'combination') {
                gameState.playerData.dnaCombinationSlots[sourceIndexToDelete] = null;
            } else if (sourceTypeToDelete === 'temporaryBackpack') {
                gameState.temporaryBackpack[sourceIndexToDelete] = null;
            }
            renderAllInventories();
            await savePlayerData(gameState.playerId, gameState.playerData);
            // ---【修改】---
            // showFeedbackModal('刪除成功', `DNA「${dnaNameToDelete}」已被成功銷毀。`);
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
        
        renderAllInventories();
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

        renderAllInventories();
        await savePlayerData(gameState.playerId, gameState.playerData);
    }
     else if (dropTargetElement.closest('#temporary-backpack-items')) {
        if (draggedSourceType === 'inventory' || draggedSourceType === 'combination') {
            const MAX_TEMP_SLOTS = gameState.gameConfigs?.value_settings?.max_temp_backpack_slots || 9;
            let freeSlotIndex = -1;
            for (let i = 0; i < MAX_TEMP_SLOTS; i++) {
                if (!gameState.temporaryBackpack[i]) {
                    freeSlotIndex = i;
                    break;
                }
            }

            if (freeSlotIndex !== -1) {
                if (draggedSourceType === 'inventory') {
                    gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null;
                } else { 
                    gameState.playerData.dnaCombinationSlots[draggedSourceIndex] = null;
                }
                
                gameState.temporaryBackpack[freeSlotIndex] = { type: 'dna', data: dnaDataToMove };
                
                renderAllInventories();
                await savePlayerData(gameState.playerId, gameState.playerData);
            } else {
                showFeedbackModal('背包已滿', '暫存背包已滿，無法放入更多物品。');
            }
        }
    }
}
