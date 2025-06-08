// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 js/ui.js), gameState (來自 js/game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

let draggedElement = null;
let draggedDnaObject = null; // 被拖曳的 DNA 實例數據
let draggedSourceType = null; // 'inventory', 'combination', 'temporaryBackpack'
let draggedSourceIndex = null; // 來源的索引 (庫存索引, 組合槽索引, 臨時背包索引)

/**
 * 新增：處理點擊“出戰”按鈕的邏輯
 * @param {string} monsterId - 被點擊的出戰按鈕對應的怪獸ID
 */
async function handleDeployMonsterClick(monsterId) {
    if (!monsterId) return;

    // 更新 gameState 中的 selectedMonsterId
    gameState.selectedMonsterId = monsterId;

    // 將 selectedMonsterId 也存入 playerData，以便儲存
    if (gameState.playerData) {
        gameState.playerData.selectedMonsterId = monsterId;
    }

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
    
    // 儲存玩家資料到後端
    try {
        await savePlayerData(gameState.playerId, gameState.playerData);
        console.log(`怪獸 ${monsterId} 已設定為出戰狀態並成功儲存。`);
    } catch (error) {
        console.error("儲存出戰怪獸狀態失敗:", error);
        showFeedbackModal('錯誤', '無法儲存出戰狀態，請稍後再試。');
    }
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

    const dnaDataToMove = JSON.parse(JSON.stringify(draggedDnaObject));

    if (dropTargetElement.id === 'inventory-delete-slot') {
        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${dnaDataToMove.name || '該DNA'}" 嗎？此操作無法復原。`, async () => {
            if (draggedSourceType === 'inventory') {
                gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null;
            } else if (draggedSourceType === 'combination') {
                gameState.dnaCombinationSlots[draggedSourceIndex] = null;
            } else if (draggedSourceType === 'temporaryBackpack') {
                gameState.temporaryBackpack[draggedSourceIndex] = null;
            }
            renderPlayerDNAInventory();
            renderDNACombinationSlots();
            renderTemporaryBackpack();
            updateMonsterSnapshot(getSelectedMonster() || null);
            await savePlayerData(gameState.playerId, gameState.playerData); 
            showFeedbackModal('操作成功', `DNA "${dnaDataToMove.name || '該DNA'}" 已被刪除並保存。`);
        });
    } else if (dropTargetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        if (isNaN(targetSlotIndex)) { console.warn("Drop on DNA slot: Invalid targetSlotIndex."); handleDragEnd(event); return; }

        const itemOriginallyInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex]; 

        if (draggedSourceType === 'inventory') {
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = itemOriginallyInTargetSlot;
        } else if (draggedSourceType === 'temporaryBackpack') {
             gameState.temporaryBackpack[draggedSourceIndex] = itemOriginallyInTargetSlot ? { type: 'dna', data: itemOriginallyInTargetSlot } : null;
        } else if (draggedSourceType === 'combination') {
            if (draggedSourceIndex !== targetSlotIndex) {
                gameState.dnaCombinationSlots[draggedSourceIndex] = itemOriginallyInTargetSlot;
            }
        }
        gameState.dnaCombinationSlots[targetSlotIndex] = dnaDataToMove;
        
        renderDNACombinationSlots();
        renderPlayerDNAInventory(); 
        renderTemporaryBackpack(); 
        updateMonsterSnapshot(getSelectedMonster() || null);
    }
    else if (dropTargetElement.classList.contains('dna-item') && dropTargetElement.closest('#inventory-items')) {
        const targetInventoryIndex = parseInt(dropTargetElement.dataset.inventoryIndex, 10);
        if (isNaN(targetInventoryIndex)) { console.warn("Drop on Inventory: Invalid targetInventoryIndex."); handleDragEnd(event); return; }

        const itemAtTargetInventorySlot = gameState.playerData.playerOwnedDNA[targetInventoryIndex];

        if (draggedSourceType === 'inventory') {
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = itemAtTargetInventorySlot;
        } else if (draggedSourceType === 'combination') {
            gameState.dnaCombinationSlots[draggedSourceIndex] = itemAtTargetInventorySlot;
        } else if (draggedSourceType === 'temporaryBackpack') {
             gameState.temporaryBackpack[draggedSourceIndex] = itemAtTargetInventorySlot ? { type: 'dna', data: itemAtTargetInventorySlot } : null;
        }

        gameState.playerData.playerOwnedDNA[targetInventoryIndex] = dnaDataToMove;
        
        renderPlayerDNAInventory();
        renderDNACombinationSlots();
        renderTemporaryBackpack();
        updateMonsterSnapshot(getSelectedMonster() || null);
        await savePlayerData(gameState.playerId, gameState.playerData);
    }
    else if (dropTargetElement.classList.contains('temp-backpack-slot') || dropTargetElement.closest('#temporary-backpack-items')) {
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
            } else if (draggedSourceType === 'combination') {
                gameState.dnaCombinationSlots[draggedSourceIndex] = null;
            }
            
            const itemToAddToTemp = { type: 'dna', data: dnaDataToMove };
            gameState.temporaryBackpack[freeSlotIndex] = itemToAddToTemp;

            renderPlayerDNAInventory();
            renderTemporaryBackpack();
            renderDNACombinationSlots();
            await savePlayerData(gameState.playerId, gameState.playerData);

        } else {
            showFeedbackModal('背包已滿', '臨時背包已滿，無法放入更多物品。');
        }
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
    // 收集 DNA 的實例 ID (slot.id)
    const dnaInstanceIdsForCombination = gameState.dnaCombinationSlots
        .filter(slot => slot && slot.id)
        .map(slot => slot.id);

    if (dnaInstanceIdsForCombination.length < 2) {
        showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        // 後端現在會處理資料更新與儲存，只返回新怪獸物件
        const newMonster = await combineDNA(dnaInstanceIdsForCombination);

        if (newMonster && newMonster.id) {
            
            // 後端已處理資料，前端只需刷新即可
            // 為了更佳的即時體驗，可以手動更新本地狀態，或直接重新載入玩家資料
            await refreshPlayerData(); // 重新載入以確保狀態完全同步

            // 清空組合槽狀態
            resetDNACombinationSlots();

            // 顯示成功回饋
            let feedbackMessage = `成功合成了新的怪獸`;
            showFeedbackModal(
                '合成成功！',
                feedbackMessage,
                false,
                newMonster,
                null // 傳入 null 來移除所有按鈕
            );

        } else if (newMonster && newMonster.error) {
            showFeedbackModal('合成失敗', newMonster.error);
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
            const CULTIVATION_DURATION_SECONDS = gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 3600;

            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === gameState.cultivationMonsterId);
            if (monsterInFarm) {
                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = true;
                monsterInFarm.farmStatus.trainingStartTime = Date.now();
                monsterInFarm.farmStatus.trainingDuration = CULTIVATION_DURATION_SECONDS * 1000;
                
                try {
                    await savePlayerData(gameState.playerId, gameState.playerData);
                    console.log(`怪獸 ${monsterInFarm.nickname} 的修煉狀態已儲存。`);

                    hideModal('cultivation-setup-modal');
                    renderMonsterFarm();
                    showFeedbackModal(
                        '修煉開始！',
                        `怪獸 ${monsterInFarm.nickname} 已開始為期 ${CULTIVATION_DURATION_SECONDS} 秒的修煉。`,
                        false,
                        null,
                        [{ text: '好的', class: 'primary'}]
                    );
                } catch (error) {
                    console.error("儲存修煉狀態失敗:", error);
                    showFeedbackModal('錯誤', '開始修煉失敗，無法儲存狀態，請稍後再試。');
                    // 還原狀態
                    monsterInFarm.farmStatus.isTraining = false;
                    monsterInFarm.farmStatus.trainingStartTime = null;
                    monsterInFarm.farmStatus.trainingDuration = null;
                }
            }
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
