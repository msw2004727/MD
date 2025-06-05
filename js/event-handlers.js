// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js), gameState (來自 game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

let draggedElement = null;
let draggedDnaObject = null; // 被拖曳的 DNA 實例數據
let draggedSourceType = null; // 'inventory', 'combination', 'temporaryBackpack'
let draggedSourceIndex = null; // 來源的索引 (庫存索引, 組合槽索引, 臨時背包索引)

function handleDragStart(event) {
    // 尋找最近的拖曳元素，可以是 DNA 庫存物品、組合槽中已佔用的 DNA，或臨時背包中已佔用的物品
    const target = event.target.closest('.dna-item.occupied, .dna-slot.occupied, .temp-backpack-slot.occupied');
    if (!target) {
        event.preventDefault(); // 如果不是可拖曳的元素，阻止拖曳
        return;
    }
    draggedElement = target;
    draggedSourceType = target.dataset.dnaSource;

    console.log("Drag Start - Element:", target, "Source Type:", draggedSourceType);

    if (draggedSourceType === 'inventory') {
        draggedSourceIndex = parseInt(target.dataset.inventoryIndex, 10);
        if (isNaN(draggedSourceIndex)) { console.warn("DragStart Inventory: Missing or invalid data-inventory-index."); event.preventDefault(); return; }
        // 從 gameState.playerData.playerOwnedDNA 中找到對應的 DNA 對象
        draggedDnaObject = gameState.playerData.playerOwnedDNA[draggedSourceIndex];
    } else if (draggedSourceType === 'combination') {
        draggedSourceIndex = parseInt(target.dataset.slotIndex, 10);
        if (isNaN(draggedSourceIndex)) { console.warn("DragStart Combination: Invalid data-slot-index."); event.preventDefault(); return; }
        // 從 gameState.dnaCombinationSlots 中找到對應的 DNA 對象
        draggedDnaObject = gameState.dnaCombinationSlots[draggedSourceIndex];
    } else if (draggedSourceType === 'temporaryBackpack') {
        draggedSourceIndex = parseInt(target.dataset.tempItemIndex, 10);
        if (isNaN(draggedSourceIndex)) { console.warn("DragStart TempBackpack: Invalid data-temp-item-index."); event.preventDefault(); return; }
        // 從 gameState.temporaryBackpack 中獲取物品數據
        const tempItem = gameState.temporaryBackpack[draggedSourceIndex];
        draggedDnaObject = tempItem ? { ...tempItem.data, tempBackpackOriginalIndex: draggedSourceIndex } : null; // 複製數據並記錄原始索引
    }

    if (!draggedDnaObject) {
        console.warn(`DragStart: Could not retrieve DNA object for source ${draggedSourceType} with index ${draggedSourceIndex}.`);
        event.preventDefault();
        return;
    }

    // 設置拖曳數據，這裡只傳遞一個識別符，實際數據從 gameState 中獲取
    event.dataTransfer.setData('text/plain', JSON.stringify({
        sourceType: draggedSourceType,
        sourceIndex: draggedSourceIndex,
        dnaId: draggedDnaObject.id || draggedDnaObject.baseId // 使用 DNA 的 ID 或 baseId 作為識別符
    }));
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { if (draggedElement) draggedElement.classList.add('dragging'); }, 0);
    console.log(`Dragging ${draggedSourceType} item from index ${draggedSourceIndex}:`, JSON.parse(JSON.stringify(draggedDnaObject)));
}

function handleDragEnd(event) {
    if (draggedElement) draggedElement.classList.remove('dragging');
    draggedElement = null;
    draggedDnaObject = null;
    draggedSourceType = null;
    draggedSourceIndex = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    // 允許拖曳到所有 DNA 槽位類型，包括組合槽、庫存槽（空或已佔用）、臨時背包槽（空或已佔用）和刪除區
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
        console.warn("Drop: No dragged DNA object or invalid drop target.", { draggedDnaObject, dropTargetElement });
        handleDragEnd(event);
        return;
    }
    dropTargetElement.classList.remove('drag-over');
    console.log("--- Drop Event ---");
    console.log("Target Element:", dropTargetElement.id || dropTargetElement.className, dropTargetElement.dataset);
    console.log("Dragged DNA Data (cloned for processing):", JSON.parse(JSON.stringify(draggedDnaObject)));
    console.log("Original Source Type:", draggedSourceType, "Original Source Index:", draggedSourceIndex);

    // 複製一份被拖曳的 DNA 數據，確保操作的是副本
    const dnaDataToMove = JSON.parse(JSON.stringify(draggedDnaObject));

    // 將刪除區的索引更新為 11 (第12格)
    const DELETE_SLOT_INDEX = 11;

    // --- A. 處理拖曳到刪除區 ---
    if (dropTargetElement.id === 'inventory-delete-slot') {
        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${dnaDataToMove.name || '該DNA'}" 嗎？此操作無法復原。`, async () => {
            // 從原始來源移除 DNA
            if (draggedSourceType === 'inventory') {
                gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null; // 庫存中將該槽位設置為 null
            } else if (draggedSourceType === 'combination') {
                gameState.dnaCombinationSlots[draggedSourceIndex] = null;
            } else if (draggedSourceType === 'temporaryBackpack') {
                // 臨時背包的刪除是將槽位設置為 null
                gameState.temporaryBackpack[draggedSourceIndex] = null;
            }
            
            // 重新渲染相關 UI
            renderPlayerDNAInventory();
            renderDNACombinationSlots();
            renderTemporaryBackpack();
            updateMonsterSnapshot(getSelectedMonster() || null);

            // 儲存玩家資料
            await savePlayerData(gameState.playerId, gameState.playerData);
            showFeedbackModal('操作成功', `DNA "${dnaDataToMove.name || '該DNA'}" 已被刪除並保存。`);
        });
    }
    // --- B. 處理拖曳到組合槽 ---
    else if (dropTargetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        if (isNaN(targetSlotIndex)) { console.warn("Drop on DNA slot: Invalid targetSlotIndex."); handleDragEnd(event); return; }

        const itemCurrentlyInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex];

        // 處理來源：從原始來源移除 DNA
        if (draggedSourceType === 'inventory') {
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null; // 庫存中設為 null
        } else if (draggedSourceType === 'temporaryBackpack') {
            // 臨時背包的移除是將槽位設置為 null
            gameState.temporaryBackpack[draggedSourceIndex] = null;
        }
        // 如果來源是組合槽，則在 moveDnaToCombinationSlot 內部處理交換

        // 將被拖曳的 DNA 放到目標組合槽
        gameState.dnaCombinationSlots[targetSlotIndex] = dnaDataToMove;

        // 如果目標組合槽原本有物品，則將其退回庫存或臨時背包
        if (itemCurrentlyInTargetSlot && itemCurrentlyInTargetSlot.id) {
            // 判斷是否是內部拖曳，如果是，則被替換的物品會回到原拖曳物品的位置
            if (draggedSourceType === 'combination') {
                gameState.dnaCombinationSlots[draggedSourceIndex] = itemCurrentlyInTargetSlot; // 執行交換
            } else {
                // 從庫存或臨時背包來的物品替換了組合槽中的物品，將被替換的物品退回庫存
                // 這裡我們將其添加到庫存的第一個空位，如果沒有空位則添加到末尾
                let targetInventoryIndex = gameState.playerData.playerOwnedDNA.indexOf(null);
                if (targetInventoryIndex === -1) {
                    // 如果沒有空位，則嘗試放入臨時背包
                    let tempBackpackFreeSlot = -1;
                    const MAX_TEMP_SLOTS = 9; // 臨時背包的固定格數
                    for (let i = 0; i < MAX_TEMP_SLOTS; i++) {
                        if (gameState.temporaryBackpack[i] === null || gameState.temporaryBackpack[i] === undefined) {
                            tempBackpackFreeSlot = i;
                            break;
                        }
                    }

                    if (tempBackpackFreeSlot !== -1) {
                        gameState.temporaryBackpack[tempBackpackFreeSlot] = { type: 'dna', data: itemCurrentlyInTargetSlot };
                        showFeedbackModal('提示', `DNA "${itemCurrentlyInTargetSlot.name}" 已放入臨時背包，因為主庫存已滿。`);
                    } else {
                        // 如果主庫存和臨時背包都滿了
                        console.warn("Inventory and temporary backpack full, displaced item might be lost.");
                        showFeedbackModal('警告', `DNA "${itemCurrentlyInTargetSlot.name}" 無法放入庫存或臨時背包，已被丟棄。`);
                    }
                    itemCurrentlyInTargetSlot = null; // Mark as handled or "lost" from this path
                }
                if (itemCurrentlyInTargetSlot) { // Only if not "lost" to temp backpack
                    gameState.playerData.playerOwnedDNA[targetInventoryIndex] = itemCurrentlyInTargetSlot;
                }
            }
        }
        
        // 重新渲染相關 UI
        renderDNACombinationSlots();
        renderPlayerDNAInventory(); // 因為庫存可能被清空或增加了物品
        renderTemporaryBackpack(); // 因為臨時背包可能被清空
        updateMonsterSnapshot(getSelectedMonster() || null);
        await savePlayerData(gameState.playerId, gameState.playerData); // 儲存玩家資料
    }
    // --- C. 處理拖曳到庫存區 (固定槽位) ---
    else if (dropTargetElement.classList.contains('dna-item') && dropTargetElement.closest('#inventory-items')) {
        const targetInventoryIndex = parseInt(dropTargetElement.dataset.inventoryIndex, 10);
        if (isNaN(targetInventoryIndex)) { console.warn("Drop on Inventory: Invalid targetInventoryIndex."); handleDragEnd(event); return; }

        // 檢查目標是否為刪除區
        if (targetInventoryIndex === DELETE_SLOT_INDEX) {
            console.warn("Drop on DELETE_SLOT_INDEX is handled by the first if block for deletion. This case should not be reached for non-deletion.");
            handleDragEnd(event);
            return;
        }

        const currentOwnedDna = [...gameState.playerData.playerOwnedDNA]; // 複製一份，以便操作

        // 檢查目標槽位是否有物品
        const itemAtTargetInventorySlot = currentOwnedDna[targetInventoryIndex];

        // 1. 從原始來源移除 DNA
        if (draggedSourceType === 'inventory') {
            // 如果是庫存內部移動，將原位置清空
            currentOwnedDna[draggedSourceIndex] = null;
        } else if (draggedSourceType === 'combination') {
            gameState.dnaCombinationSlots[draggedSourceIndex] = null;
        } else if (draggedSourceType === 'temporaryBackpack') {
            // 臨時背包的移除是將槽位設置為 null
            gameState.temporaryBackpack[draggedSourceIndex] = null;
        }

        // 2. 將目標槽位原有物品（如果存在）放回原始來源位置（如果是庫存內部拖曳）
        // 或放入第一個空位（如果來源是組合槽/臨時背包）
        if (itemAtTargetInventorySlot) {
            if (draggedSourceType === 'inventory') {
                // 庫存內部交換，將目標槽位的物品放回原始拖曳位置
                currentOwnedDna[draggedSourceIndex] = itemAtTargetInventorySlot;
            } else {
                // 從組合槽或臨時背包拖曳過來，被替換的物品需要找一個新位置
                // Find first null slot that is NOT the delete slot
                let freeSlotIndex = -1;
                for (let i = 0; i < currentOwnedDna.length; i++) {
                    if (i === DELETE_SLOT_INDEX) continue; // Skip delete slot
                    if (currentOwnedDna[i] === null) {
                        freeSlotIndex = i;
                        break;
                    }
                }

                if (freeSlotIndex !== -1) {
                    currentOwnedDna[freeSlotIndex] = itemAtTargetInventorySlot;
                } else {
                    // Fallback: If no free slot in inventory, try putting into temporary backpack
                    let tempBackpackFreeSlot = -1;
                    const MAX_TEMP_SLOTS = 9; // 臨時背包的固定格數
                    for (let i = 0; i < MAX_TEMP_SLOTS; i++) {
                        if (gameState.temporaryBackpack[i] === null || gameState.temporaryBackpack[i] === undefined) {
                            tempBackpackFreeSlot = i;
                            break;
                        }
                    }
                    if (tempBackpackFreeSlot !== -1) {
                        gameState.temporaryBackpack[tempBackpackFreeSlot] = { type: 'dna', data: itemAtTargetInventorySlot };
                        showFeedbackModal('提示', `DNA "${itemAtTargetInventorySlot.name}" 已放入臨時背包，因為主庫存已滿。`);
                    } else {
                        console.warn("Inventory and temporary backpack full, displaced item might be lost.");
                        showFeedbackModal('警告', `DNA "${itemAtTargetInventorySlot.name}" 無法放入庫存或臨時背包，已被丟棄。`);
                    }
                }
            }
        }

        // 3. 將被拖曳的 DNA 放入目標槽位
        currentOwnedDna[targetInventoryIndex] = dnaDataToMove;
        
        // 更新 gameState
        gameState.playerData.playerOwnedDNA = currentOwnedDna;

        // 重新渲染所有相關 UI
        renderPlayerDNAInventory();
        renderDNACombinationSlots(); // 因為組合槽可能被清空
        renderTemporaryBackpack();   // 因為臨時背包可能被清空
        updateMonsterSnapshot(getSelectedMonster() || null);
        await savePlayerData(gameState.playerId, gameState.playerData); // 儲存玩家資料
    }
    // --- D. 處理拖曳到臨時背包區 (固定槽位) ---
    else if (dropTargetElement.classList.contains('temp-backpack-slot') || dropTargetElement.id === 'temporary-backpack-items') {
        let targetTempIndex;
        // 如果直接拖曳到臨時背包的容器，則尋找第一個空位
        if (dropTargetElement.id === 'temporary-backpack-items') {
            const MAX_TEMP_SLOTS = 9;
            targetTempIndex = -1;
            for (let i = 0; i < MAX_TEMP_SLOTS; i++) {
                if (gameState.temporaryBackpack[i] === null || gameState.temporaryBackpack[i] === undefined) {
                    targetTempIndex = i;
                    break;
                }
            }
            if (targetTempIndex === -1) {
                showFeedbackModal('背包已滿', '臨時背包已滿，無法放置物品。');
                handleDragEnd(event);
                return;
            }
        } else { // 拖曳到具體的臨時背包槽位
            targetTempIndex = parseInt(dropTargetElement.dataset.tempItemIndex, 10);
        }

        if (isNaN(targetTempIndex)) { console.warn("Drop on Temporary Backpack: Invalid targetTempIndex."); handleDragEnd(event); return; }

        // Check if the target slot is already occupied
        const itemCurrentlyInTargetTempSlot = gameState.temporaryBackpack[targetTempIndex];

        // 1. 從原始來源移除 DNA
        if (draggedSourceType === 'inventory') {
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null; // 庫存中設為 null
        } else if (draggedSourceType === 'combination') {
            gameState.dnaCombinationSlots[draggedSourceIndex] = null;
        } else if (draggedSourceType === 'temporaryBackpack') {
            // If it's an internal move within temporary backpack, we need to handle swap.
            // Clear original position
            gameState.temporaryBackpack[draggedSourceIndex] = null;
        }

        // Generate a new instance ID for the item if it's from a source that doesn't have a stable instance ID yet
        if (draggedSourceType !== 'temporaryBackpack') { // Only generate new ID if not coming from temp backpack itself
            const baseIdForNewInstance = dnaDataToMove.baseId || dnaDataToMove.id || `temp_template_new_${Date.now()}`;
            dnaDataToMove = { 
                ...dnaDataToMove, 
                id: `dna_inst_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                baseId: baseIdForNewInstance
            };
        }


        // 2. 將目標槽位原有物品（如果存在）放回原始來源位置（如果是內部拖曳）
        // 或放入主庫存的第一個空位（如果來源是組合槽/主庫存）
        if (itemCurrentlyInTargetTempSlot) {
            if (draggedSourceType === 'temporaryBackpack') {
                // Internal swap in temporary backpack
                gameState.temporaryBackpack[draggedSourceIndex] = itemCurrentlyInTargetTempSlot;
            } else {
                // Item from inventory or combination slot displaced an item in temp backpack.
                // Displaced item from temp backpack goes to main inventory.
                const MAX_INVENTORY_SLOTS = gameState.MAX_INVENTORY_SLOTS;
                // 刪除區的索引
                const DELETE_SLOT_INDEX = 11;
                let freeInventorySlot = -1;
                for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
                    if (i === DELETE_SLOT_INDEX) continue;
                    if (gameState.playerData.playerOwnedDNA[i] === null) {
                        freeInventorySlot = i;
                        break;
                    }
                }
                if (freeInventorySlot !== -1) {
                    gameState.playerData.playerOwnedDNA[freeInventorySlot] = itemCurrentlyInTargetTempSlot.data;
                    showFeedbackModal('提示', `DNA "${itemCurrentlyInTargetTempSlot.data.name}" 已放入您的主庫存，因為臨時背包該位置已被替換。`);
                } else {
                    console.warn("Inventory and temporary backpack full, displaced item might be lost.");
                    showFeedbackModal('警告', `DNA "${itemCurrentlyInTargetTempSlot.data.name}" 無法放入主庫存，已被丟棄。`);
                }
            }
        }

        // 3. 將被拖曳的 DNA 放入目標臨時背包槽位
        gameState.temporaryBackpack[targetTempIndex] = { type: 'dna', data: dnaDataToMove };

        // 重新渲染所有相關 UI
        renderPlayerDNAInventory(); // 更新庫存UI
        renderTemporaryBackpack(); // 更新臨時背包UI
        renderDNACombinationSlots(); // 因為組合槽可能被清空
        updateMonsterSnapshot(getSelectedMonster() || null);
        await savePlayerData(gameState.playerId, gameState.playerData); // 儲存玩家資料
    } else { // Handle drop outside of valid slots, or on temp backpack container itself if it's not a slot
        // If dropping onto the container itself, find the first available slot.
        // This is a common UX pattern for "anywhere in this area means put it here"
        // This part needs to ensure it finds a valid slot in the main inventory if dragging from temp backpack,
        // or a valid slot in temp backpack if dragging from main inventory/combination.

        let targetArray;
        let MAX_SLOTS;
        let isTempBackpackTarget = false;
        let isInventoryTarget = false;

        if (dropTargetElement.id === 'temporary-backpack-items') {
            targetArray = gameState.temporaryBackpack;
            MAX_SLOTS = 9;
            isTempBackpackTarget = true;
        } else if (dropTargetElement.id === 'inventory-items') {
            targetArray = gameState.playerData.playerOwnedDNA;
            MAX_SLOTS = gameState.MAX_INVENTORY_SLOTS;
            isInventoryTarget = true;
        } else {
            console.log("Drop: Unhandled drop target or scenario.", dropTargetElement.id, dropTargetElement.className);
            handleDragEnd(event);
            return;
        }

        let freeSlotIndex = -1;
        for (let i = 0; i < MAX_SLOTS; i++) {
            // For main inventory, skip delete slot
            if (isInventoryTarget && i === DELETE_SLOT_INDEX) continue;
            if (targetArray[i] === null || targetArray[i] === undefined) {
                freeSlotIndex = i;
                break;
            }
        }

        if (freeSlotIndex !== -1) {
            // Handle item creation for temporary backpack if coming from non-temporary source
            if (isTempBackpackTarget && draggedSourceType !== 'temporaryBackpack') {
                const baseIdForNewInstance = dnaDataToMove.baseId || dnaDataToMove.id || `temp_template_new_${Date.now()}`;
                dnaDataToMove = { 
                    ...dnaDataToMove, 
                    id: `dna_inst_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                    baseId: baseIdForNewInstance
                };
            }

            // Place the item
            if (isTempBackpackTarget) {
                targetArray[freeSlotIndex] = { type: 'dna', data: dnaDataToMove };
            } else {
                targetArray[freeSlotIndex] = dnaDataToMove;
            }

            // Clear source
            if (draggedSourceType === 'inventory') {
                gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null;
            } else if (draggedSourceType === 'combination') {
                gameState.dnaCombinationSlots[draggedSourceIndex] = null;
            } else if (draggedSourceType === 'temporaryBackpack') {
                gameState.temporaryBackpack[draggedSourceIndex] = null;
            }
            
            renderPlayerDNAInventory();
            renderTemporaryBackpack();
            renderDNACombinationSlots();
            updateMonsterSnapshot(getSelectedMonster() || null);
            await savePlayerData(gameState.playerId, gameState.playerData);
            showFeedbackModal('物品已移動', `DNA 已成功移至 ${isTempBackpackTarget ? '臨時背包' : '主庫存'}。`);

        } else {
            showFeedbackModal('背包已滿', `目標區域已滿，無法放置物品。`);
        }
    }

    handleDragEnd(event);
}


// --- Modal Close Button Handler ---
function handleModalCloseButtons() {
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId || button.closest('.modal')?.id;
            if (modalId) {
                // 修正: 檢查是否存在於 gameState.activeModalId，並在 hideModal 中處理
                if (modalId === 'training-results-modal' && gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained && gameState.lastCultivationResult.items_obtained.length > 0) {
                    showModal('reminder-modal');
                } else {
                    hideModal(modalId);
                }
            }
        });
    });
}

// --- 其他事件處理函數 ---
function handleThemeSwitch() {
    if (DOMElements.themeSwitcherBtn) {
        DOMElements.themeSwitcherBtn.addEventListener('click', () => {
            const newTheme = gameState.currentTheme === 'dark' ? 'light' : 'dark';
            updateTheme(newTheme);
        });
    }
}

function handleAuthForms() {
    if (DOMElements.showRegisterFormBtn) DOMElements.showRegisterFormBtn.addEventListener('click', () => showModal('register-modal'));
    if (DOMElements.showLoginFormBtn) DOMElements.showLoginFormBtn.addEventListener('click', () => showModal('login-modal'));

    if (DOMElements.registerSubmitBtn) {
        DOMElements.registerSubmitBtn.addEventListener('click', async () => {
            const nickname = DOMElements.registerNicknameInput.value.trim();
            const password = DOMElements.registerPasswordInput.value;
            DOMElements.registerErrorMsg.textContent = '';
            if (!nickname || !password) {
                DOMElements.registerErrorMsg.textContent = '暱稱和密碼不能為空。';
                return;
            }
            try {
                showFeedbackModal('註冊中...', '正在為您創建帳號，請稍候...', true);
                await registerUser(nickname, password);
                hideModal('register-modal');
            } catch (error) {
                DOMElements.registerErrorMsg.textContent = error.message;
                hideModal('feedback-modal');
            }
        });
    }

    if (DOMElements.loginSubmitBtn) {
        DOMElements.loginSubmitBtn.addEventListener('click', async () => {
            const nickname = DOMElements.loginNicknameInput.value.trim();
            const password = DOMElements.loginPasswordInput.value;
            DOMElements.loginErrorMsg.textContent = '';
            if (!nickname || !password) {
                DOMElements.loginErrorMsg.textContent = '暱稱和密碼不能為空。';
                return;
            }
            try {
                showFeedbackModal('登入中...', '正在驗證您的身份，請稍候...', true);
                await loginUser(nickname, password);
                hideModal('login-modal');
            } catch (error) {
                DOMElements.loginErrorMsg.textContent = error.message;
                hideModal('feedback-modal');
            }
        });
    }

    if (DOMElements.mainLogoutBtn) {
        DOMElements.mainLogoutBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('登出中...', '正在安全登出...', true);
                await logoutUser();
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('登出失敗', `登出時發生錯誤: ${error.message}`);
            }
        });
    }
}

function handleTopNavButtons() {
    if (DOMElements.monsterInfoButton) {
        DOMElements.monsterInfoButton.addEventListener('click', () => {
            if (gameState.selectedMonsterId) {
                const monster = getSelectedMonster();
                if (monster) {
                    updateMonsterInfoModal(monster, gameState.gameConfigs);
                    showModal('monster-info-modal');
                } else {
                    showFeedbackModal('錯誤', '找不到選定的怪獸資料。');
                }
            } else {
                showFeedbackModal('提示', '請先在農場選擇一隻怪獸，或合成一隻新的怪獸。');
            }
        });
    }

    if (DOMElements.playerInfoButton) {
        DOMElements.playerInfoButton.addEventListener('click', () => {
            if (gameState.playerData && gameState.currentUser) {
                updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
                showModal('player-info-modal');
            } else {
                showFeedbackModal('錯誤', '無法載入玩家資訊，請先登入。');
            }
        });
    }

    if (DOMElements.showMonsterLeaderboardBtn) {
        DOMElements.showMonsterLeaderboardBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('載入中...', '正在獲取怪獸排行榜...', true);
                const leaderboardData = await getMonsterLeaderboard(20);
                gameState.monsterLeaderboard = leaderboardData;

                let elementsForTabs = ['all'];
                if (gameState.gameConfigs && gameState.gameConfigs.element_nicknames) {
                    elementsForTabs = ['all', ...Object.keys(gameState.gameConfigs.element_nicknames)];
                }
                updateMonsterLeaderboardElementTabs(elementsForTabs);
                filterAndRenderMonsterLeaderboard();
                hideModal('feedback-modal');
                showModal('monster-leaderboard-modal');
            } catch (error) {
                showFeedbackModal('載入失敗', `無法獲取怪獸排行榜: ${error.message}`);
            }
        });
    }

    if (DOMElements.showPlayerLeaderboardBtn) {
        DOMElements.showPlayerLeaderboardBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('載入中...', '正在獲取玩家排行榜...', true);
                const leaderboardData = await getPlayerLeaderboard(20);
                gameState.playerLeaderboard = leaderboardData;
                sortAndRenderLeaderboard('player');
                hideModal('feedback-modal');
                showModal('player-leaderboard-modal');
            } catch (error) {
                showFeedbackModal('載入失敗', `無法獲取玩家排行榜: ${error.message}`);
            }
        });
    }

    if (DOMElements.newbieGuideBtn) {
        DOMElements.newbieGuideBtn.addEventListener('click', () => {
            if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
                updateNewbieGuideModal(gameState.gameConfigs.newbie_guide);
                if(DOMElements.newbieGuideSearchInput) DOMElements.newbieGuideSearchInput.value = '';
                showModal('newbie-guide-modal');
            } else {
                showFeedbackModal('錯誤', '新手指南尚未載入。');
            }
        });
    }

    if (DOMElements.friendsListBtn) {
        DOMElements.friendsListBtn.addEventListener('click', () => {
            updateFriendsListModal([]);
            if(DOMElements.friendsListSearchInput) DOMElements.friendsListSearchInput.value = '';
            showModal('friends-list-modal');
        });
    }
}

function handleTabSwitching() {
    if (DOMElements.dnaFarmTabs) {
        DOMElements.dnaFarmTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                switchTabContent(targetTabId, event.target);
            }
        });
    }

    if (DOMElements.monsterInfoTabs) {
        DOMElements.monsterInfoTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                switchTabContent(targetTabId, event.target, 'monster-info-modal');
            }
        });
    }
}

async function handleCombineDna() {
    const dnaBaseIdsForCombination = gameState.dnaCombinationSlots
        .filter(slot => slot && slot.baseId)
        .map(slot => slot.baseId);

    if (dnaBaseIdsForCombination.length < 2) {
        showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        const result = await combineDNA(dnaBaseIdsForCombination);

        if (result && result.id) {
            const newMonster = result;
            // 清空所有組合槽位
            gameState.dnaCombinationSlots = [null, null, null, null, null];
            // 更新 playerOwnedDNA，將被消耗的 DNA 替換為 null
            const consumedDnaIds = dnaBaseIdsForCombination; // 這裡應該是實例ID，不是 baseId
            const currentOwnedDna = [...gameState.playerData.playerOwnedDNA];
            currentOwnedDna.forEach((dna, index) => {
                if (dna && consumedDnaIds.includes(dna.baseId)) { // 用 baseId 檢查，確保是原始拖曳的 DNA
                    currentOwnedDna[index] = null; // 將被消耗的 DNA 槽位設置為 null
                }
            });
            gameState.playerData.playerOwnedDNA = currentOwnedDna;

            await refreshPlayerData(); // 刷新玩家數據，確保 UI 同步並儲存新怪獸
            resetDNACombinationSlots(); // 重新渲染組合槽

            let feedbackMessage = `🎉 成功合成了新的怪獸：<strong>${newMonster.nickname}</strong>！<br>`;
            feedbackMessage += `屬性: ${newMonster.elements.join(', ')}, 稀有度: ${newMonster.rarity}<br>`;
            feedbackMessage += `HP: ${newMonster.hp}, 攻擊: ${newMonster.attack}, 防禦: ${newMonster.defense}, 速度: ${newMonster.speed}, 爆擊: ${newMonster.crit}%`;
            if (result.farm_full_warning) {
                feedbackMessage += `<br><strong class="text-[var(--warning-color)]">${result.farm_full_warning}</strong> 請至農場管理。`;
            }

            showFeedbackModal(
                '合成成功！',
                feedbackMessage,
                false,
                null,
                [{ text: '查看新怪獸', class: 'primary', onClick: () => {
                    gameState.selectedMonsterId = newMonster.id;
                    updateMonsterSnapshot(newMonster);
                    if (DOMElements.dnaFarmTabs && typeof switchTabContent === 'function') {
                        const monsterFarmTabButton = DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="monster-farm-content"]');
                        if(monsterFarmTabButton) switchTabContent('monster-farm-content', monsterFarmTabButton);
                    }
                }}, { text: '關閉', class: 'secondary'}]
            );

        } else if (result && result.error) {
            showFeedbackModal('合成失敗', result.error);
        } else {
            showFeedbackModal('合成失敗', '發生未知錯誤，未能生成怪獸。請檢查DNA組合或稍後再試。');
        }
    } catch (error) {
        let errorMessage = `請求錯誤: ${error.message}`;
        if (error.message && error.message.includes("未能生成怪獸")) {
            errorMessage = `合成失敗: DNA 組合未能生成怪獸。請檢查您的 DNA 組合或稍後再試。`;
        }
        showFeedbackModal('合成失敗', errorMessage);
        console.error("合成DNA錯誤:", error);
    }
}

function handleConfirmationActions() {
    // confirmActionBtn is dynamically bound in showConfirmationModal
}

function handleCultivationModals() {
    if (DOMElements.startCultivationBtn) {
        DOMElements.startCultivationBtn.addEventListener('click', async () => {
            if (!gameState.cultivationMonsterId) {
                showFeedbackModal('錯誤', '沒有選定要修煉的怪獸。');
                return;
            }
            const MOCK_CULTIVATION_DURATION_SECONDS = gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 10;

            gameState.cultivationStartTime = Date.now();
            gameState.cultivationDurationSet = MOCK_CULTIVATION_DURATION_SECONDS;

            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === gameState.cultivationMonsterId);
            if (monsterInFarm) {
                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = true;
                monsterInFarm.farmStatus.trainingStartTime = gameState.cultivationStartTime;
                monsterInFarm.farmStatus.trainingDuration = MOCK_CULTIVATION_DURATION_SECONDS * 1000;
                renderMonsterFarm();
            }

            hideModal('cultivation-setup-modal');
            showFeedbackModal(
                '修煉開始！',
                `怪獸 ${monsterInFarm ? monsterInFarm.nickname : ''} 已開始為期 ${MOCK_CULTIVATION_DURATION_SECONDS} 秒的修煉。請稍後在農場列表查看成果。`,
                false,
                null,
                [{ text: '好的', class: 'primary'}]
            );
        });
    }

    if (DOMElements.closeTrainingResultsBtn) DOMElements.closeTrainingResultsBtn.addEventListener('click', () => {
         if (gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained && gameState.lastCultivationResult.items_obtained.length > 0) {
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });
    if (DOMElements.finalCloseTrainingResultsBtn) DOMElements.finalCloseTrainingResultsBtn.addEventListener('click', () => {
         if (gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained && gameState.lastCultivationResult.items_obtained.length > 0) {
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });

    if (DOMElements.addAllToTempBackpackBtn) {
        DOMElements.addAllToTempBackpackBtn.addEventListener('click', () => {
            addAllCultivationItemsToTempBackpack();
        });
    }

    if (DOMElements.reminderConfirmCloseBtn) DOMElements.reminderConfirmCloseBtn.addEventListener('click', () => {
        hideModal('reminder-modal');
        hideModal('training-results-modal');
        clearTemporaryBackpack();
    });
    if (DOMElements.reminderCancelBtn) DOMElements.reminderCancelBtn.addEventListener('click', () => {
        hideModal('reminder-modal');
    });
}

function handleNewbieGuideSearch() {
    if (DOMElements.newbieGuideSearchInput) {
        DOMElements.newbieGuideSearchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
                updateNewbieGuideModal(gameState.gameConfigs.newbie_guide, searchTerm);
            }
        });
    }
}

function handleFriendsListSearch() {
   if (DOMElements.friendsListSearchInput) {
        DOMElements.friendsListSearchInput.addEventListener('input', async (event) => {
            const query = event.target.value.trim();
            if (query.length > 1) {
                try {
                    const result = await searchPlayers(query);
                    gameState.searchedPlayers = result.players || [];
                    updateFriendsListModal(gameState.searchedPlayers);
                } catch (error) {
                    console.error("搜尋玩家失敗:", error);
                    updateFriendsListModal([]);
                }
            } else if (query.length === 0) {
                updateFriendsListModal([]);
            }
        });
   }
}

function handleMonsterLeaderboardFilter() {
    if (DOMElements.monsterLeaderboardElementTabs) {
        DOMElements.monsterLeaderboardElementTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const filter = event.target.dataset.elementFilter;
                gameState.currentMonsterLeaderboardElementFilter = filter;
                DOMElements.monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                filterAndRenderLeaderboard();
            }
        });
    }
}

function handleLeaderboardSorting() {
    const tables = [DOMElements.monsterLeaderboardTable, DOMElements.playerLeaderboardTable];
    tables.forEach(table => {
        if (table) {
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                headerRow.addEventListener('click', (event) => {
                    const th = event.target.closest('th');
                    if (!th || !th.dataset.sortKey) return;

                    const sortKey = th.dataset.sortKey;
                    const tableType = table.id.includes('monster') ? 'monster' : 'player';

                    let currentSortConfig = gameState.leaderboardSortConfig?.[tableType] || {};
                    let newSortOrder = 'desc';
                    if (currentSortConfig.key === sortKey && currentSortConfig.order === 'desc') {
                        newSortOrder = 'asc';
                    } else if (currentSortConfig.key === sortKey && currentSortConfig.order === 'asc') {
                        newSortOrder = 'desc';
                    }

                    gameState.leaderboardSortConfig = {
                        ...gameState.leaderboardSortConfig,
                        [tableType]: { key: sortKey, order: newSortOrder }
                    };

                    sortAndRenderLeaderboard(tableType);
                    updateLeaderboardSortIcons(table, sortKey, newSortOrder);
                });
            }
        });
    });
}

function handleBattleLogModalClose() {
    if (DOMElements.closeBattleLogBtn) DOMElements.closeBattleLogBtn.addEventListener('click', () => {
        hideModal('battle-log-modal');
    });
}

function handleDnaDrawModal() {
    if (DOMElements.closeDnaDrawBtn) DOMElements.closeDnaDrawBtn.addEventListener('click', () => {
        hideModal('dna-draw-modal');
    });
    if (DOMElements.dnaDrawButton) DOMElements.dnaDrawButton.addEventListener('click', handleDrawDNAClick);

    if (DOMElements.dnaDrawResultsGrid) {
        DOMElements.dnaDrawResultsGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('add-drawn-dna-to-backpack-btn')) {
                const dnaIndex = parseInt(event.target.dataset.dnaIndex, 10);
                if (gameState.lastDnaDrawResult && gameState.lastDnaDrawResult[dnaIndex]) {
                    const dnaTemplate = gameState.lastDnaDrawResult[dnaIndex];
                    addDnaToTemporaryBackpack(dnaTemplate);
                    event.target.disabled = true;
                    event.target.textContent = '已加入';
                }
            }
        });
    }
}

function handleAnnouncementModalClose() {
    if (DOMElements.officialAnnouncementCloseX) {
        DOMElements.officialAnnouncementCloseX.addEventListener('click', () => {
            hideModal('official-announcement-modal');
            localStorage.setItem('announcementShown_v1', 'true');
        });
    }
}

function initializeEventListeners() {
    handleModalCloseButtons();
    handleThemeSwitch();
    handleAuthForms();
    handleTopNavButtons();
    handleTabSwitching();
    handleLeaderboardSorting();

    if (DOMElements.combineButton) DOMElements.combineButton.addEventListener('click', handleCombineDna);

    const dragDropContext = DOMElements.gameContainer || document.body;
    dragDropContext.addEventListener('dragstart', handleDragStart);
    dragDropContext.addEventListener('dragend', handleDragEnd);

    // 拖曳目標區：組合槽容器、庫存項目容器、臨時背包容器
    const dropZones = [
        DOMElements.dnaCombinationSlotsContainer,
        DOMElements.inventoryItemsContainer,
        DOMElements.temporaryBackpackContainer 
    ];

    dropZones.forEach(zone => {
        if (zone) {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        }
    });

    handleConfirmationActions();
    handleCultivationModals();
    handleNewbieGuideSearch();
    handleFriendsListSearch();
    handleMonsterLeaderboardFilter();
    handleBattleLogModalClose();
    handleDnaDrawModal();
    handleAnnouncementModalClose();

    console.log("All event listeners initialized with enhanced drag-drop logic for temporary backpack.");
}
