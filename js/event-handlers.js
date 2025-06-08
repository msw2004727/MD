// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 js/ui.js), gameState (來自 js/game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

let draggedElement = null;
let draggedDnaObject = null; // 被拖曳的 DNA 實例數據
let draggedSourceType = null; // 'inventory', 'combination', 'temporaryBackpack'
let draggedSourceIndex = null; // 來源的索引 (庫存索引, 組合槽索引, 臨時背包索引)

// 新增：戰鬥相關的全局變數，用於逐步模擬
let battleIntervalId = null;
let currentBattleTurn = 0;
let battlePlayerMonster = null;
let battleOpponentMonster = null;
let fullBattleLog = []; // 儲存所有回合的完整日誌


/**
 * 新增：處理點擊“出戰”按鈕的邏輯
 * @param {string} monsterId - 被點擊的出戰按鈕對應的怪獸ID
 */
async function handleDeployMonsterClick(monsterId) {
    if (!monsterId) return;

    if (gameState.playerData) {
        gameState.playerData.selectedMonsterId = monsterId;
    }

    try {
        await savePlayerData(gameState.playerId, gameState.playerData);
        console.log(`怪獸 ${monsterId} 已設定為出戰狀態並成功儲存。`);
        // 成功儲存後才更新本地UI狀態
        gameState.selectedMonsterId = monsterId; 
        const selectedMonster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
        if (typeof updateMonsterSnapshot === 'function' && selectedMonster) {
            updateMonsterSnapshot(selectedMonster);
        }
        if (typeof renderMonsterFarm === 'function') {
            renderMonsterFarm();
        }
    } catch (error) {
        console.error("儲存出戰怪獸狀態失敗:", error);
        showFeedbackModal('錯誤', '無法儲存出戰狀態，請稍後再試。');
    }
}


function handleDragStart(event) {
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
        draggedDnaObject = gameState.dnaCombinationSlots[draggedSourceIndex];
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
            await savePlayerData(gameState.playerId, gameState.playerData); 
            showFeedbackModal('操作成功', `DNA "${dnaDataToMove.name || '該DNA'}" 已被刪除並保存。`);
        });
    } else if (dropTargetElement.classList.contains('dna-slot')) {
        if (draggedSourceType === 'temporaryBackpack') {
            showFeedbackModal('無效操作', '請先將臨時背包中的物品拖曳至下方的「DNA碎片」庫存區，才能進行組合。');
            handleDragEnd(event); 
            return;
        }
        
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        if (isNaN(targetSlotIndex)) { handleDragEnd(event); return; }
        const itemOriginallyInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex]; 
        
        if (draggedSourceType === 'inventory') {
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = itemOriginallyInTargetSlot;
        } else if (draggedSourceType === 'combination') {
            if (draggedSourceIndex !== targetSlotIndex) {
                gameState.dnaCombinationSlots[draggedSourceIndex] = itemOriginallyInTargetSlot;
            }
        }
        gameState.dnaCombinationSlots[targetSlotIndex] = dnaDataToMove;
        
        renderDNACombinationSlots();
        renderPlayerDNAInventory(); 
        renderTemporaryBackpack();
        await savePlayerData(gameState.playerId, gameState.playerData);
    }
    else if (dropTargetElement.classList.contains('dna-item') && dropTargetElement.closest('#inventory-items')) {
        const targetInventoryIndex = parseInt(dropTargetElement.dataset.inventoryIndex, 10);
        if (isNaN(targetInventoryIndex)) { handleDragEnd(event); return; }
        
        const itemAtTargetInventorySlot = gameState.playerData.playerOwnedDNA[targetInventoryIndex];
        
        if (draggedSourceType === 'inventory') {
            gameState.playerData.playerOwnedDNA[draggedSourceIndex] = itemAtTargetInventorySlot; 
        } else if (draggedSourceType === 'combination') {
            gameState.dnaCombinationSlots[draggedSourceIndex] = itemAtTargetInventorySlot; 
        } else if (draggedSourceType === 'temporaryBackpack') {
            if(itemAtTargetInventorySlot) { // 如果目標格有東西，則不移動
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
    else if (dropTargetElement.classList.contains('temp-backpack-slot') || dropTargetElement.closest('#temporary-backpack-items')) {
        if (draggedSourceType === 'temporaryBackpack') {
            const targetTempIndex = dropTargetElement.dataset.tempItemIndex ? parseInt(dropTargetElement.dataset.tempItemIndex, 10) : -1;
            if (targetTempIndex !== -1 && draggedSourceIndex !== targetTempIndex) {
                const temp = gameState.temporaryBackpack[draggedSourceIndex];
                gameState.temporaryBackpack[draggedSourceIndex] = gameState.temporaryBackpack[targetTempIndex];
                gameState.temporaryBackpack[targetTempIndex] = temp;
            }
        } else {
            const MAX_TEMP_SLOTS = gameState.gameConfigs?.value_settings?.max_temp_backpack_slots || 9;
            let freeSlotIndex = -1;
            for (let i = 0; i < MAX_TEMP_SLOTS; i++) {
                if (!gameState.temporaryBackpack[i]) {
                    freeSlotIndex = i;
                    break;
                }
            }

            if (freeSlotIndex !== -1) {
                if (draggedSourceType === 'inventory') gameState.playerData.playerOwnedDNA[draggedSourceIndex] = null;
                else if (draggedSourceType === 'combination') gameState.dnaCombinationSlots[draggedSourceIndex] = null;
                
                gameState.temporaryBackpack[freeSlotIndex] = { type: 'dna', data: dnaDataToMove };
            } else {
                showFeedbackModal('背包已滿', '臨時背包已滿，無法放入更多物品。');
            }
        }
        
        renderPlayerDNAInventory();
        renderTemporaryBackpack();
        renderDNACombinationSlots();
        await savePlayerData(gameState.playerId, gameState.playerData);
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
    const dnaObjectsForCombination = gameState.dnaCombinationSlots
        .filter(slot => slot && slot.id);

    if (dnaObjectsForCombination.length < 2) {
        showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        const newMonster = await combineDNA(dnaObjectsForCombination);

        if (newMonster && newMonster.id) {
            await refreshPlayerData(); 
            resetDNACombinationSlots();
            showFeedbackModal('合成成功！', '', false, newMonster, [{ text: '好的', class: 'primary' }]);
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
    // 獲取養成計畫彈窗的按鈕容器
    const cultivationActionButtonsContainer = document.querySelector('.cultivation-action-buttons');

    if (cultivationActionButtonsContainer) {
        cultivationActionButtonsContainer.addEventListener('click', async (event) => {
            const clickedButton = event.target.closest('button');
            if (!clickedButton) return;

            const location = clickedButton.dataset.location; // 獲取按鈕的 data-location 屬性
            if (!location) return; // 如果沒有 location 數據，則不是預期的按鈕

            if (!gameState.cultivationMonsterId) {
                showFeedbackModal('錯誤', '沒有選定要修煉的怪獸。');
                return;
            }
            const CULTIVATION_DURATION_SECONDS = gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 3600;

            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === gameState.cultivationMonsterId);
            if (monsterInFarm) {
                // 檢查怪獸是否已在訓練中或戰鬥中
                if (monsterInFarm.farmStatus?.isTraining || monsterInFarm.farmStatus?.isBattling) {
                    showFeedbackModal('提示', `怪獸 ${monsterInFarm.nickname} 目前正在忙碌中，無法開始新的修煉。`);
                    return;
                }

                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = true;
                monsterInFarm.farmStatus.trainingStartTime = Date.now();
                monsterInFarm.farmStatus.trainingDuration = CULTIVATION_DURATION_SECONDS * 1000;
                // 可以將選擇的訓練地點也儲存到怪獸狀態中，如果後端需要
                monsterInFarm.farmStatus.trainingLocation = location;

                try {
                    await savePlayerData(gameState.playerId, gameState.playerData);
                    console.log(`怪獸 ${monsterInFarm.nickname} 的修煉狀態已儲存，地點: ${location}。`);

                    hideModal('cultivation-setup-modal');
                    renderMonsterFarm(); // 重新渲染農場列表以更新狀態
                    showFeedbackModal(
                        '修煉開始！',
                        `怪獸 ${monsterInFarm.nickname} 已開始為期 ${CULTIVATION_DURATION_SECONDS} 秒的修煉，地點：${location}。`,
                        false,
                        null,
                        [{ text: '好的', class: 'primary'}]
                    );
                } catch (error) {
                    console.error("儲存修煉狀態失敗:", error);
                    showFeedbackModal('錯誤', '開始修煉失敗，無法儲存狀態，請稍後再試。');
                    // 如果儲存失敗，恢復前端的狀態
                    monsterInFarm.farmStatus.isTraining = false;
                    monsterInFarm.farmStatus.trainingStartTime = null;
                    monsterInFarm.farmStatus.trainingDuration = null;
                    monsterInFarm.farmStatus.trainingLocation = null;
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
        gameState.lastCultivationResult.items_obtained = []; // 清空待領取列表
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
                    console.error("搜尋玩家失败:", error);
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
            // 將事件監聽器綁定到 table 元素，使用事件代理
            table.addEventListener('click', (event) => {
                const th = event.target.closest('th');
                if (!th || !th.dataset.sortKey) return; // 確保點擊的是 th 且有 sortKey

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

                if (tableType === 'monster') {
                    filterAndRenderMonsterLeaderboard();
                } else {
                    sortAndRenderLeaderboard(tableType);
                }
            });
        }
    });
} 

// 新增：處理戰鬥模擬的定時器邏輯
async function startBattleSimulation(playerMonster, opponentMonster, initialLogEntry) {
    // 初始化戰鬥狀態
    battlePlayerMonster = { ...playerMonster };
    battleOpponentMonster = { ...opponentMonster };
    currentBattleTurn = 0;
    fullBattleLog = [];

    // 顯示戰鬥日誌模態框
    showBattleLogModal([], battlePlayerMonster.nickname, battleOpponentMonster.nickname); // 清空並初始化日誌顯示

    // 開始每3秒請求一次新的回合日誌
    if (battleIntervalId) clearInterval(battleIntervalId); // 清除舊的定時器以防萬一

    showFeedbackModal('戰鬥開始！', `${battlePlayerMonster.nickname} vs ${battleOpponentMonster.nickname}`, true); // 顯示戰鬥開始提示

    battleIntervalId = setInterval(async () => {
        try {
            // 從後端獲取下一回合的日誌
            const response = await simulateBattle(
                battlePlayerMonster,
                battleOpponentMonster,
                currentBattleTurn,
                fullBattleLog
            );

            if (!response || !response.latest_log_entry) {
                throw new Error("無效的戰鬥日誌響應。");
            }

            const latestLogEntry = response.latest_log_entry;
            const logMessage = latestLogEntry.styled_log_message || latestLogEntry.raw_log_messages.join('\n');
            fullBattleLog.push(latestLogEntry); // 將最新回合日誌加入完整日誌

            // 更新前端顯示
            showBattleLogModal(fullBattleLog.map(entry => entry.styled_log_message || entry.raw_log_messages.join('\n')),
                                response.battle_end ? response.winner_id === battlePlayerMonster.id ? battlePlayerMonster.nickname : battleOpponentMonster.nickname : null,
                                response.battle_end ? response.loser_id === battlePlayerMonster.id ? battlePlayerMonster.nickname : battleOpponentMonster.nickname : null); // 更新日誌顯示

            // 更新怪獸的當前HP和MP（這是後端返回的最新狀態，用於下次回合發送）
            battlePlayerMonster = response.player_monster_data || battlePlayerMonster;
            battleOpponentMonster = response.opponent_monster_data || battleOpponentMonster;

            currentBattleTurn = latestLogEntry.turn;

            if (response.battle_end) {
                clearInterval(battleIntervalId);
                battleIntervalId = null;
                hideModal('feedback-modal'); // 隱藏載入提示
                await refreshPlayerData(); // 戰鬥結束後刷新玩家數據
                updateMonsterSnapshot(getSelectedMonster()); // 更新快照
                if (response.absorption_details && response.absorption_details.success) {
                    showFeedbackModal('吸收成功！', response.absorption_details.message);
                } else if (response.absorption_details && response.absorption_details.error) {
                    showFeedbackModal('吸收失敗！', response.absorption_details.error);
                }
            }

        } catch (error) {
            console.error("戰鬥模擬時發生錯誤:", error);
            clearInterval(battleIntervalId); // 發生錯誤時停止模擬
            battleIntervalId = null;
            hideModal('feedback-modal');
            showFeedbackModal('戰鬥失敗', `模擬戰鬥時發生錯誤: ${error.message}`);
            // 確保怪獸狀態在錯誤後被重置
            await refreshPlayerData();
        }
    }, 3000); // 每 3 秒發送一次請求

}

// 修改：處理挑戰按鈕點擊，開始逐步戰鬥模擬
async function handleChallengeMonsterClick(event, monsterIdToChallenge = null, ownerId = null, npcId = null) {
    if(event) event.stopPropagation();

    const playerMonster = getSelectedMonster();
    if (!playerMonster) {
        showFeedbackModal('提示', '請先從您的農場選擇一隻出戰怪獸！');
        return;
    }
    if (playerMonster.farmStatus?.isTraining) {
         showFeedbackModal('提示', `${playerMonster.nickname} 目前正在修煉中，無法出戰。`);
        return;
    }

    let opponentMonster = null;

    try {
        showFeedbackModal('準備戰鬥...', '正在獲取對手資訊...', true);
        
        // 暫時將玩家怪獸設為戰鬥中狀態，以便UI更新
        // 注意：這是一個前端的臨時狀態，真實狀態由後端確認
        playerMonster.farmStatus = { ...playerMonster.farmStatus, isBattling: true };
        renderMonsterFarm();
        updateMonsterSnapshot(playerMonster);

        // 如果是從排行榜挑戰其他玩家的怪獸
        if (monsterIdToChallenge && ownerId && ownerId !== gameState.playerId) {
            const opponentPlayerData = await getPlayerData(ownerId);
            if (!opponentPlayerData || !opponentPlayerData.farmedMonsters) throw new Error('無法獲取對手玩家資料。');
            opponentMonster = opponentPlayerData.farmedMonsters.find(m => m.id === monsterIdToChallenge);
            if (!opponentMonster) throw new Error(`找不到對手玩家的怪獸ID ${monsterIdToChallenge}。`);
            // 確保對手怪獸也有 farmStatus 屬性
            if (!opponentMonster.farmStatus) {
                opponentMonster.farmStatus = { isTraining: false, isBattling: false };
            }
        }
        // 如果是挑戰 NPC，NPC 數據應該已經包含在 gameConfigs 裡了
        else if (npcId) {
             const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
            opponentMonster = npcTemplates.find(npc => npc.id === npcId);
            if (!opponentMonster) throw new Error(`找不到ID為 ${npcId} 的NPC對手。`);
            opponentMonster = JSON.parse(JSON.stringify(opponentMonster)); // 複製一份，避免修改原始配置
            opponentMonster.isNPC = true;
            if (!opponentMonster.farmStatus) { // 確保 NPC 怪獸也有 farmStatus 屬性
                opponentMonster.farmStatus = { isTraining: false, isBattling: false };
            }
        }
        else {
             // 如果沒有指定對手，則隨機選擇一個 NPC 對手
            const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
            if (npcTemplates.length > 0) {
                opponentMonster = JSON.parse(JSON.stringify(npcTemplates[Math.floor(Math.random() * npcTemplates.length)]));
                opponentMonster.isNPC = true;
                if (!opponentMonster.farmStatus) { // 確保 NPC 怪獸也有 farmStatus 屬性
                    opponentMonster.farmStatus = { isTraining: false, isBattling: false };
                }
                console.log(`為玩家怪獸 ${playerMonster.nickname} 匹配到NPC對手: ${opponentMonster.nickname}`);
            } else {
                throw new Error('沒有可用的NPC對手進行挑戰。');
            }
        }
        
        hideModal('feedback-modal'); // 隱藏獲取對手資訊的提示

        if (!opponentMonster) {
            showFeedbackModal('錯誤', '未能找到合適的挑戰對手。');
            playerMonster.farmStatus.isBattling = false;
            renderMonsterFarm();
            updateMonsterSnapshot(playerMonster);
            return;
        }

        gameState.battleTargetMonster = opponentMonster; // 儲存對手信息

        showConfirmationModal(
            '確認出戰',
            `您確定要讓 ${playerMonster.nickname} (評價: ${playerMonster.score}) 挑戰 ${opponentMonster.nickname} (評價: ${opponentMonster.score}) 嗎？`,
            async () => {
                // 在確認後才真正開始戰鬥模擬的定時器
                showFeedbackModal('戰鬥初始化中...', '正在為戰鬥數據進行最終準備...', true);

                // 將怪獸的當前HP和MP初始化為滿值，並確保它們是數字類型
                playerMonster.current_hp = playerMonster.hp;
                playerMonster.current_mp = playerMonster.mp;
                opponentMonster.current_hp = opponentMonster.hp;
                opponentMonster.current_mp = opponentMonster.mp;

                // 開始戰鬥模擬的定時器
                startBattleSimulation(playerMonster, opponentMonster);

            },
            'primary',
            '開始戰鬥'
        );

    } catch (error) {
        showFeedbackModal('錯誤', `準備戰鬥失敗: ${error.message}`);
        console.error("準備戰鬥錯誤:", error);
        playerMonster.farmStatus.isBattling = false; // 重置戰鬥狀態
        renderMonsterFarm();
        updateMonsterSnapshot(playerMonster);
    }
}


function handleBattleLogModalClose() {
    if (DOMElements.closeBattleLogBtn) DOMElements.closeBattleLogBtn.addEventListener('click', () => {
        clearInterval(battleIntervalId); // 關閉日誌時清除定時器
        battleIntervalId = null;
        hideModal('battle-log-modal');
        // 確保怪獸狀態在日誌關閉時被重置（如果沒有在戰鬥結束時自動刷新）
        refreshPlayerData();
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


// --- 新增：處理點擊事件以移動DNA ---
async function handleClickInventory(event) {
    const itemElement = event.target.closest('.dna-item.occupied');
    if (!itemElement || !itemElement.closest('#inventory-items')) return;

    const inventoryIndex = parseInt(itemElement.dataset.inventoryIndex, 10);
    const dnaObject = gameState.playerData.playerOwnedDNA[inventoryIndex];
    if (!dnaObject) return;
    
    // 尋找組合槽中的第一個空格
    const targetSlotIndex = gameState.dnaCombinationSlots.findIndex(slot => slot === null);

    if (targetSlotIndex !== -1) {
        // 有空格，執行移動
        gameState.playerData.playerOwnedDNA[inventoryIndex] = null;
        gameState.dnaCombinationSlots[targetSlotIndex] = dnaObject;
        renderPlayerDNAInventory();
        renderDNACombinationSlots();
        await savePlayerData(gameState.playerId, gameState.playerData);
    } else {
        showFeedbackModal('提示', 'DNA組合欄位已滿！');
    }
}

async function handleClickCombinationSlot(event) {
    const slotElement = event.target.closest('.dna-slot.occupied');
    if (!slotElement) return;

    const slotIndex = parseInt(slotElement.dataset.slotIndex, 10);
    const dnaObject = gameState.dnaCombinationSlots[slotIndex];
    if (!dnaObject) return;

    // 尋找庫存中的第一個空格，避開刪除區
    let targetInventoryIndex = -1;
    for (let i = 0; i < gameState.MAX_INVENTORY_SLOTS; i++) {
        if (i !== 11 && gameState.playerData.playerOwnedDNA[i] === null) {
            targetInventoryIndex = i;
            break;
        }
    }

    if (targetInventoryIndex !== -1) {
        // 有空格，執行移動
        gameState.dnaCombinationSlots[slotIndex] = null;
        gameState.playerData.playerOwnedDNA[targetInventoryIndex] = dnaObject;
        renderPlayerDNAInventory();
        renderDNACombinationSlots();
        await savePlayerData(gameState.playerId, gameState.playerData);
    } else {
        showFeedbackModal('提示', 'DNA碎片庫存區已滿！');
    }
}
// --- 新增結束 ---


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
        DOMElements.temporaryBackpackContainer
    ];

    dropZones.forEach(zone => {
        if (zone) {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        }
    });

    // 為刪除區單獨添加 drop 事件
    const deleteSlot = document.getElementById('inventory-delete-slot');
    if (deleteSlot) {
        deleteSlot.addEventListener('drop', handleDrop);
    }
    
    // 新增：為庫存區和組合區添加點擊事件監聽
    if (DOMElements.inventoryItemsContainer) {
        DOMElements.inventoryItemsContainer.addEventListener('click', handleClickInventory);
    }
    if (DOMElements.dnaCombinationSlotsContainer) {
        DOMElements.dnaCombinationSlotsContainer.addEventListener('click', handleClickCombinationSlot);
    }


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
