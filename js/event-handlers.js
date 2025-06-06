// js/event-handlers.js

// 移除: 舊的 handleDrop 函數中，處理從臨時背包拖曳到其他位置時，清除 temporaryBackpack 源槽位的邏輯。
// 新增: handleDrop 函數中，對於從 temporary背包 拖曳出的物品，統一使用 splice(draggedSourceIndex, 1) 來移除。

let draggedElement = null;
let draggedDnaObject = null; // 被拖曳的 DNA 實例數據
let draggedSourceType = null; // 'inventory', 'combination', 'temporaryBackpack'
let draggedSourceIndex = null; // 來源的索引 (庫存索引, 組合槽索引, 臨時背包索引)

/**
 * 新增：處理點擊“出戰”按鈕的邏輯
 * @param {string} monsterId - 被點擊的出戰按鈕對應的怪獸ID
 */
function handleDeployMonsterClick(monsterId) {
    if (!monsterId) return;

    // 將點擊的怪獸設定為當前選中的怪獸
    gameState.selectedMonsterId = monsterId;

    // 從玩家數據中找到完整的怪獸物件
    const selectedMonster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);

    // 更新頂部的怪獸快照
    if (typeof updateMonsterSnapshot === 'function' && selectedMonster) {
        updateMonsterSnapshot(selectedMonster);
    }

    // 重新渲染農場列表，這會更新所有按鈕的“出戰中/備戰”狀態和樣式
    if (typeof renderMonsterFarm === 'function') {
        renderMonsterFarm();
    }
    
    console.log(`怪獸 ${monsterId} 已設定為出戰狀態。`);
}


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

    // --- A. 處理拖曳到刪除區 ---
    if (dropTargetElement.id === 'inventory-delete-slot') {
        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${dnaDataToMove.name || '該DNA'}" 嗎？此操作無法復原。`, async () => {
            if (draggedSourceType === 'inventory') {
                gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null;
            } else if (draggedSourceType === 'combination') {
                gameState.dnaCombinationSlots[draggedSourceIndex] = null;
            } else if (draggedSourceType === 'temporaryBackpack') {
                gameState.temporaryBackpack.splice(draggedSourceIndex, 1); // 移除元素
            }
            renderPlayerDNAInventory();
            renderDNACombinationSlots();
            renderTemporaryBackpack();
            updateMonsterSnapshot(getSelectedMonster() || null);
            await savePlayerData(gameState.playerId, gameState.playerData); // 刪除操作需要立即保存
            showFeedbackModal('操作成功', `DNA "${dnaDataToMove.name || '該DNA'}" 已被刪除並保存。`);
        });
    }
    // --- B. 處理拖曳到組合槽 (從此處開始重構) ---
    else if (dropTargetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        if (isNaN(targetSlotIndex)) { console.warn("Drop on DNA slot: Invalid targetSlotIndex."); handleDragEnd(event); return; }

        const itemOriginallyInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex]; // 目標槽位原有的物品

        // 1. 處理來源槽位 (清空或交換的起點)
        if (draggedSourceType === 'inventory') {
            // 從庫存拖曳到組合槽：庫存源槽位在前端視覺上清空
            // 數據庫中仍存在，等待合成時由後端消耗
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null;
        } else if (draggedSourceType === 'temporaryBackpack') {
            // 從臨時背包拖曳到組合槽：臨時背包源槽位清空
            gameState.temporaryBackpack.splice(draggedSourceIndex, 1); // 移除元素
        } else if (draggedSourceType === 'combination') {
            // 從組合槽拖曳到組合槽：
            // 如果是拖曳到同一槽位，則不執行任何操作
            if (draggedSourceIndex === targetSlotIndex) {
                // 如果是拖曳到自身，則不進行任何狀態改變，因為沒有真正的移動發生
                renderDNACombinationSlots(); // 重新渲染確保 UI 與當前狀態一致
                return; // 直接返回，結束拖曳操作
            }
            // 如果是拖曳到不同槽位，則源槽位先暫時清空 (如果沒有物品與之交換，後面會明確設置為null)
            // 這裡不立即設為 null，因為後面可能會被 itemOriginallyInTargetSlot 填充
        }

        // 2. 將被拖曳的 DNA 放入目標組合槽
        gameState.dnaCombinationSlots[targetSlotIndex] = dnaDataToMove;

        // 3. 處理目標槽位原有的物品 (如果存在)，並將其放回原拖曳來源或找新位置
        if (itemOriginallyInTargetSlot && itemOriginallyInTargetSlot.id) {
            if (draggedSourceType === 'combination') {
                // 這是組合槽內部交換：將目標槽位原有的物品放回拖曳起始的組合槽位
                gameState.dnaCombinationSlots[draggedSourceIndex] = itemOriginallyInTargetSlot;
            } else {
                // 從庫存或臨時背包拖曳，替換了組合槽中的物品。
                // 被替換的物品現在需要回到庫存的空位，或臨時背包。
                let freeSlotFound = false;
                for (let i = 0; i < gameState.MAX_INVENTORY_SLOTS; i++) {
                    if (gameState.playerData.playerOwnedDNA[i] === null) {
                        gameState.playerData.playerOwnedDNA[i] = itemOriginallyInTargetSlot; // 修正變數名
                        freeSlotFound = true;
                        break;
                    }
                }
                if (!freeSlotFound) {
                    // 如果庫存滿了，嘗試放回臨時背包
                    const maxTempSlots = gameState.gameConfigs?.value_settings?.max_temp_backpack_slots || 9;
                    let tempSlotFound = false;
                    // 使用 Push 添加到陣列末尾
                    if (gameState.temporaryBackpack.length < maxTempSlots) {
                        gameState.temporaryBackpack.push({ type: 'dna', data: itemOriginallyInTargetSlot, instanceId: itemOriginallyInTargetSlot.id });
                        tempSlotFound = true;
                        console.log("Returned item to temporary backpack due to full inventory.");
                    }
                    if (!tempSlotFound) {
                        console.warn("Inventory and temporary backpack full when returning item from combination slot. Item may be lost.");
                    }
                }
            }
        } else {
            // 目標組合槽位原本是空的
            // 如果是從組合槽拖曳到空的組合槽 (非自身)
            if (draggedSourceType === 'combination' && draggedSourceIndex !== targetSlotIndex) {
                gameState.dnaCombinationSlots[draggedSourceIndex] = null; // 明確清空原來的組合槽位
            }
        }
        
        // 重新渲染 UI，不在此處立即保存到數據庫
        renderDNACombinationSlots();
        renderPlayerDNAInventory(); 
        renderTemporaryBackpack(); 
        updateMonsterSnapshot(getSelectedMonster() || null);

    }
    // --- C. 處理拖曳到庫存區 (固定槽位) ---
    else if (dropTargetElement.classList.contains('dna-item') && dropTargetElement.closest('#inventory-items')) {
        const targetInventoryIndex = parseInt(dropTargetElement.dataset.inventoryIndex, 10);
        if (isNaN(targetInventoryIndex)) { console.warn("Drop on Inventory: Invalid targetInventoryIndex."); handleDragEnd(event); return; }

        let currentOwnedDna = [...gameState.playerData.playerOwnedDNA]; // 複製一份，以便操作

        const itemAtTargetInventorySlot = currentOwnedDna[targetInventoryIndex];

        // 處理來源：從原始來源移除 DNA
        if (draggedSourceType === 'inventory') {
            // 庫存內部交換，源槽位清空邏輯留給後續 itemAtTargetInventorySlot 處理
            currentOwnedDna[draggedSourceIndex] = null;
        } else if (draggedSourceType === 'combination') {
            gameState.dnaCombinationSlots[draggedSourceIndex] = null;
        } else if (draggedSourceType === 'temporaryBackpack') {
            gameState.temporaryBackpack.splice(draggedSourceIndex, 1); // 移除元素
        }

        // 處理目標庫存槽位原有物品
        if (itemAtTargetInventorySlot) {
            if (draggedSourceType === 'inventory') {
                // 庫存內部交換：將目標槽位的物品放回原始拖曳位置
                currentOwnedDna[draggedSourceIndex] = itemAtTargetInventorySlot;
            } else {
                // 從組合槽或臨時背包來的物品替換了庫存中的物品。
                // 被替換的物品應找一個空槽位（或退回臨時背包）。
                let freeSlotIndex = currentOwnedDna.indexOf(null);
                if (freeSlotIndex === -1) { // 如果沒有空槽位，嘗試放入臨時背包
                    const maxTempSlots = gameState.gameConfigs?.value_settings?.max_temp_backpack_slots || 9;
                    if (gameState.temporaryBackpack.length < maxTempSlots) {
                        gameState.temporaryBackpack.push({ type: 'dna', data: itemAtTargetInventorySlot, instanceId: itemAtTargetInventorySlot.id });
                        console.log("Returned item to temporary backpack due to full inventory.");
                    } else {
                        console.warn("Inventory and temporary backpack full when returning item. Item may be lost.");
                    }
                } else {
                    currentOwnedDna[freeSlotIndex] = itemAtTargetInventorySlot;
                }
            }
        }

        // 將被拖曳的 DNA 放入目標槽位
        currentOwnedDna[targetInventoryIndex] = dnaDataToMove;
        
        gameState.playerData.playerOwnedDNA = currentOwnedDna; // 更新 gameState

        // 重新渲染 UI 並保存
        renderPlayerDNAInventory();
        renderDNACombinationSlots();
        renderTemporaryBackpack();
        updateMonsterSnapshot(getSelectedMonster() || null);
        await savePlayerData(gameState.playerId, gameState.playerData); // 其他庫存操作需要立即保存
    }
    // --- D. 處理拖曳到臨時背包區 ---
    else if (dropTargetElement.classList.contains('temp-backpack-slot') || dropTargetElement.id === 'temporary-backpack-items') {
        let targetTempIndex;
        // 如果拖曳到特定的臨時背包槽位，則使用該槽位索引；否則添加到末尾
        if (dropTargetElement.dataset.tempItemIndex && dropTargetElement.classList.contains('temp-backpack-slot')) {
            targetTempIndex = parseInt(dropTargetElement.dataset.tempItemIndex, 10);
        } else {
            targetTempIndex = gameState.temporaryBackpack.length;
        }
        
        if (isNaN(targetTempIndex)) { console.warn("Drop on Temporary Backpack: Invalid targetTempIndex."); handleDragEnd(event); return; }

        let itemToAddToTemp = { type: 'dna', data: dnaDataToMove, instanceId: dnaDataToMove.id };

        // 處理來源：從原始來源移除 DNA
        if (draggedSourceType === 'inventory') {
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null; // 清空源槽位
        } else if (draggedSourceType === 'combination') {
            gameState.dnaCombinationSlots[draggedSourceIndex] = null;
        } else if (draggedSourceType === 'temporaryBackpack') {
            // 如果是從臨時背包內部拖曳，需要先從原位置移除
            gameState.temporaryBackpack.splice(draggedSourceIndex, 1);
            // 如果目標索引在移除後變小，需要調整
            if (targetTempIndex > draggedSourceIndex) {
                targetTempIndex--;
            }
        }

        let itemCurrentlyInTargetTempSlot = null;
        if (targetTempIndex < gameState.temporaryBackpack.length) {
            itemCurrentlyInTargetTempSlot = gameState.temporaryBackpack[targetTempIndex];
        }

        // 如果目標臨時背包槽位被佔用，且來源不是臨時背包本身，則將被替換的物品移回主庫存
        if (itemCurrentlyInTargetTempSlot && draggedSourceType !== 'temporaryBackpack') {
            // 被替換的物品從臨時背包回到庫存
            let freeSlotIndex = gameState.playerData.playerOwnedDNA.indexOf(null);
            const MAX_INV_SLOTS = gameState.MAX_INVENTORY_SLOTS; // 使用常量

            if (freeSlotIndex === -1 || freeSlotIndex >= MAX_INV_SLOTS) {
                // 如果固定陣列已滿或沒有找到有效的空槽位
                console.warn("Inventory full when returning item from temp backpack. Item may be lost.");
                // 在這裡可以選擇將 itemCurrentlyInTargetTempSlot 丟棄，或者做其他處理
            } else {
                gameState.playerData.playerOwnedDNA[freeSlotIndex] = itemCurrentlyInTargetTempSlot.data;
            }
            // 清空被替換的臨時背包槽位，因為它現在要被新的 itemToAddToTemp 佔用
            gameState.temporaryBackpack[targetTempIndex] = null; // 先設定為null，確保 splice 插入時不會覆蓋
        }


        // 將被拖曳的 DNA 放入目標臨時背包槽位
        const maxTempSlots = gameState.gameConfigs?.value_settings?.max_temp_backpack_slots || 9;
        if (targetTempIndex <= gameState.temporaryBackpack.length && targetTempIndex < maxTempSlots) {
             // 確保在插入前，如果 targetTempIndex 已經超出當前長度，先用 null 填充
            while(gameState.temporaryBackpack.length < targetTempIndex) {
                gameState.temporaryBackpack.push(null);
            }
            gameState.temporaryBackpack.splice(targetTempIndex, itemCurrentlyInTargetTempSlot ? 1 : 0, itemToAddToTemp); // 如果有被替換的物品，替換它
        } else {
            console.warn("Temporary backpack is full or target index is out of bounds. Item may be lost.");
        }
       
        renderPlayerDNAInventory();
        renderTemporaryBackpack();
        renderDNACombinationSlots();
        updateMonsterSnapshot(getSelectedMonster() || null);
        await savePlayerData(gameState.playerId, gameState.playerData); // 臨時背包操作需要立即保存
    } else {
        console.log("Drop: Unhandled drop target or scenario.", dropTargetElement.id, dropTargetElement.className);
    }

    handleDragEnd(event);
}


// --- Modal Close Button Handler ---
function handleModalCloseButtons() {
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId || button.closest('.modal')?.id;
            if (modalId) {
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
    // 修正: 收集 DNA 的實例 ID (slot.id)，而不是 baseId
    const dnaInstanceIdsForCombination = gameState.dnaCombinationSlots
        .filter(slot => slot && slot.id) // 確保有 id (實例 ID)
        .map(slot => slot.id);

    if (dnaInstanceIdsForCombination.length < 2) {
        showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        const result = await combineDNA(dnaInstanceIdsForCombination);

        if (result && result.id) {
            const newMonster = result;
            // 清空組合槽中的 DNA
            gameState.dnaCombinationSlots = [null, null, null, null, null];

            // 從玩家庫存中移除已被消耗的 DNA
            if (result.consumed_dna_indices && result.consumed_dna_indices.length > 0) {
                // 為了避免因 pop 或 splice 導致索引錯亂，從後往前移除
                result.consumed_dna_indices.sort((a, b) => b - a).forEach(index => {
                    if (gameState.playerData.playerOwnedDNA[index]) {
                        gameState.playerData.playerOwnedDNA[index] = null;
                        console.log(`已從庫存移除 DNA 索引: ${index}`);
                    }
                });
            }
            
            await refreshPlayerData(); // 刷新玩家數據，包括新的怪獸和更新的 DNA 庫存

            renderDNACombinationSlots(); // 更新組合槽UI
            renderPlayerDNAInventory();   // 更新玩家DNA庫存UI

            let feedbackMessage = `🎉 成功合成了新的怪獸：<strong>${newMonster.nickname}</strong>！<br>`;
            feedbackMessage += `屬性: ${newMonster.elements.join(', ')}, 稀有度: ${newMonster.rarity}<br>`;
            feedbackMessage += `HP: ${newMonster.hp}, 攻擊: ${newMonster.attack}, 防禦: ${newMonster.defense}, 速度: ${newMonster.speed}, 爆擊: ${newMonster.crit}%`;
            if (result.farm_full_warning) {
                feedbackMessage += `<br><strong class="text-[var(--warning-color)]">${result.farm_full_warning}</strong>`;
            }

            showFeedbackModal(
                '合成成功！',
                feedbackMessage,
                false,
                newMonster, // 將新怪獸數據傳遞給 showFeedbackModal
                [{ text: '查看新怪獸', class: 'primary', onClick: () => {
                    handleDeployMonsterClick(newMonster.id); // 使用新的出戰功能
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
                filterAndRenderMonsterLeaderboard();
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
        }
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

    const dropZones = [
        DOMElements.dnaCombinationSlotsContainer,
        DOMElements.inventoryItemsContainer,
        document.getElementById('inventory-delete-slot'),
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
