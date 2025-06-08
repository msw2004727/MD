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
