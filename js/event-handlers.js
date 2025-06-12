// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 js/ui.js), gameState (來自 js/game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

let draggedElement = null;
let draggedDnaObject = null; // 被拖曳的 DNA 實例數據
let draggedSourceType = null; // 'inventory', 'combination', 'temporaryBackpack'
let draggedSourceIndex = null; // 來源的索引 (庫存索引, 組合槽索引, 臨時背包索引)

async function handleAddFriend(friendUid, friendNickname) {
    if (!friendUid || !friendNickname) return;

    // 確保 gameState 中的 friends 陣列存在
    if (!gameState.playerData.friends) {
        gameState.playerData.friends = [];
    }

    // 檢查是否已是好友
    const isAlreadyFriend = gameState.playerData.friends.some(friend => friend.uid === friendUid);
    if (isAlreadyFriend) {
        showFeedbackModal('提示', `${friendNickname} 已在您的好友列表中。`);
        return;
    }
    
    // 新增好友到 gameState
    gameState.playerData.friends.push({
        uid: friendUid,
        nickname: friendNickname,
        isOnline: false // 預設為離線，未來可擴充
    });

    try {
        // 顯示載入中
        showFeedbackModal('處理中...', `正在新增好友 ${friendNickname}...`, true);
        
        // 儲存更新後的玩家資料到後端
        await savePlayerData(gameState.playerId, gameState.playerData);
        
        // 刷新好友列表顯示
        renderFriendsList();
        
        // 隱藏載入中並顯示成功訊息
        hideModal('feedback-modal');
        showFeedbackModal('成功', `已成功將 ${friendNickname} 加入好友列表！`);

    } catch (error) {
        console.error("新增好友失敗:", error);
        // 如果失敗，從 gameState 中移除剛剛加入的好友以保持同步
        gameState.playerData.friends = gameState.playerData.friends.filter(friend => friend.uid !== friendUid);
        hideModal('feedback-modal');
        showFeedbackModal('錯誤', `新增好友時發生錯誤，請稍後再試。`);
    }
}


/**
 * 新增：處理點擊“出戰”按鈕的邏輯
 * @param {string} monsterId - 被點擊的出戰按鈕對應的怪獸ID
 */
async function handleDeployMonsterClick(monsterId) {
    if (!monsterId) return;

    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);

    // 新增：檢查怪獸是否正在修煉中
    if (monster && monster.farmStatus && monster.farmStatus.isTraining) {
        showFeedbackModal('無法出戰', '怪獸尚未回來，需召回才可出戰');
        return; // 中斷函式執行
    }

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
        // 捕獲當前拖曳的物品資訊，因為全域變數會在確認前回覆
        const sourceTypeToDelete = draggedSourceType;
        const sourceIndexToDelete = draggedSourceIndex;
        const dnaNameToDelete = dnaDataToMove.name || '該DNA';

        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${dnaNameToDelete}" 嗎？此操作無法復原。`, async () => {
            // 使用捕獲的局部變數進行操作
            if (sourceTypeToDelete === 'inventory') {
                gameState.playerData.playerOwnedDNA[sourceIndexToDelete] = null;
            } else if (sourceTypeToDelete === 'combination') {
                gameState.dnaCombinationSlots[sourceIndexToDelete] = null;
            } else if (sourceTypeToDelete === 'temporaryBackpack') {
                gameState.temporaryBackpack[sourceIndexToDelete] = null;
            }
            
            // 更新 UI
            renderPlayerDNAInventory();
            renderDNACombinationSlots();
            renderTemporaryBackpack();
            
            // 調用 savePlayerData 將修改後的 gameState 儲存到後端
            await savePlayerData(gameState.playerId, gameState.playerData); 
            const successMessage = `隨著一陣清脆的碎裂聲，DNA碎片「${dnaNameToDelete}」化為點點光芒消散，其結構已從這個世界中抹除。`;
            showFeedbackModal('刪除成功', successMessage);
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

// --- Leaderboard Helper Function ---
async function fetchAndDisplayMonsterLeaderboard() {
    try {
        showFeedbackModal('載入中...', '正在獲取最新的怪獸排行榜...', true);
        const leaderboardData = await getMonsterLeaderboard(100);
        gameState.monsterLeaderboard = leaderboardData;

        let elementsForTabs = ['all'];
        if (gameState.gameConfigs && gameState.gameConfigs.element_nicknames) {
            elementsForTabs = ['all', ...Object.keys(gameState.gameConfigs.element_nicknames)];
        }
        if (typeof updateMonsterLeaderboardElementTabs === 'function') {
           updateMonsterLeaderboardElementTabs(elementsForTabs);
        }
        
        filterAndRenderMonsterLeaderboard();
        hideModal('feedback-modal');
    } catch (error) {
        showFeedbackModal('載入失敗', `無法獲取怪獸排行榜: ${error.message}`);
    }
}

// --- 怪獸農場表頭排序事件處理 ---
function handleFarmHeaderSorting() {
    if (DOMElements.farmHeaders) {
        DOMElements.farmHeaders.addEventListener('click', (event) => {
            const target = event.target.closest('.sortable');
            if (!target) return;

            const sortKey = target.dataset.sortKey;
            if (!sortKey || ['actions'].includes(sortKey)) return;

            const currentSortKey = gameState.farmSortConfig.key;
            const currentSortOrder = gameState.farmSortConfig.order;

            let newSortOrder = 'desc';
            if (currentSortKey === sortKey && currentSortOrder === 'desc') {
                newSortOrder = 'asc';
            }
            
            gameState.farmSortConfig = {
                key: sortKey,
                order: newSortOrder
            };

            renderMonsterFarm();
        });
    }
}

// --- 新增：處理排行榜中的點擊事件 ---
function handleLeaderboardClicks() {
    if (DOMElements.monsterLeaderboardTable) {
        DOMElements.monsterLeaderboardTable.addEventListener('click', (event) => {
            const link = event.target.closest('.leaderboard-monster-link');
            if (link) {
                event.preventDefault();
                const row = link.closest('tr');
                const monsterId = row.dataset.monsterId;
                if (!monsterId) return;

                const monsterData = gameState.monsterLeaderboard.find(m => m.id === monsterId);
                if (monsterData) {
                    updateMonsterInfoModal(monsterData, gameState.gameConfigs);
                    showModal('monster-info-modal');
                } else {
                    console.warn(`在排行榜中找不到 ID 為 ${monsterId} 的怪獸資料。`);
                }
            }
        });
    }
}

// --- 修改：整合處理玩家資訊彈窗內的所有點擊事件 ---
function handlePlayerInfoModalEvents() {
    if (!DOMElements.playerInfoModalBody) return;

    DOMElements.playerInfoModalBody.addEventListener('click', async (event) => {
        // 1. 處理點擊怪獸連結
        const monsterLink = event.target.closest('.player-info-monster-link');
        if (monsterLink) {
            event.preventDefault();
            const monsterId = monsterLink.dataset.monsterId;
            const ownerUid = monsterLink.dataset.ownerUid;

            if (!monsterId || !ownerUid) return;

            let monsterData = null;
            if (ownerUid === gameState.playerId) {
                monsterData = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            } else if (gameState.viewedPlayerData && gameState.viewedPlayerData.uid === ownerUid) {
                monsterData = gameState.viewedPlayerData.farmedMonsters.find(m => m.id === monsterId);
            }

            if (monsterData) {
                updateMonsterInfoModal(monsterData, gameState.gameConfigs);
                showModal('monster-info-modal');
            } else {
                console.error(`無法在玩家 ${ownerUid} 的資料中找到怪獸 ${monsterId}。`);
                showFeedbackModal('錯誤', '無法載入該怪獸的詳細資訊。');
            }
            return;
        }

        // 2. 處理點擊「裝備」稱號按鈕
        const equipButton = event.target.closest('.equip-title-btn');
        if (equipButton) {
            event.preventDefault();
            const titleId = equipButton.dataset.titleId;
            if (!titleId) return;

            equipButton.disabled = true;
            equipButton.textContent = '處理中...';

            try {
                const result = await equipTitle(titleId);
                if (result && result.success) {
                    await refreshPlayerData();
                    updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
                } else {
                    throw new Error(result.error || '裝備稱號時發生未知錯誤。');
                }
            } catch (error) {
                showFeedbackModal('裝備失敗', `錯誤：${error.message}`);
                updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
            }
            return;
        }
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
            await fetchAndDisplayMonsterLeaderboard();
            showModal('monster-leaderboard-modal');
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
    
    const maxFarmSlots = gameState.gameConfigs?.value_settings?.max_farm_slots || 10;
    const currentMonsterCount = gameState.playerData?.farmedMonsters?.length || 0;

    if (currentMonsterCount >= maxFarmSlots) {
        showFeedbackModal('合成失敗', `您的怪獸農場已滿 (上限 ${maxFarmSlots} 隻)，無法再合成新的怪獸。請先放生部分怪獸再來。`);
        return;
    }

    // 新增：在異步操作前禁用按鈕
    DOMElements.combineButton.disabled = true;

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
    } finally {
        // 新增：無論成功或失敗，都重新啟用按鈕
        // 注意：成功時，resetDNACombinationSlots會因為槽位為空而再次禁用它，這是預期行為。
        if (DOMElements.combineButton) {
            const combinationSlotsFilled = gameState.dnaCombinationSlots.filter(s => s !== null).length >= 2;
            DOMElements.combineButton.disabled = !combinationSlotsFilled;
        }
    }
}


function handleConfirmationActions() {
    // confirmActionBtn is dynamically bound in showConfirmationModal
}

function handleCultivationModals() {
    // 獲取養成計畫彈窗中，包含所有卡片按鈕的容器
    const cultivationLocationsContainer = document.querySelector('.cultivation-locations-container');

    if (cultivationLocationsContainer) {
        cultivationLocationsContainer.addEventListener('click', async (event) => {
            // 確認點擊的是卡片按鈕本身或其子元素
            const clickedButton = event.target.closest('button.cultivation-location-card');
            if (!clickedButton) return;

            const location = clickedButton.dataset.location; // 獲取按鈕的 data-location 屬性
            if (!location) return;

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
                // 將選擇的訓練地點也儲存到怪獸狀態中
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
   if (DOMElements.friendsTabSearchInput) {
        DOMElements.friendsTabSearchInput.addEventListener('input', async (event) => {
            const query = event.target.value.trim();
            if (query.length > 1) {
                try {
                    const result = await searchPlayers(query);
                    updateFriendsSearchResults(result.players || []);
                } catch (error) {
                    console.error("搜尋玩家失敗:", error);
                    updateFriendsSearchResults([]);
                }
            } else if (query.length === 0) {
                updateFriendsSearchResults([]);
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

// 修改：處理挑戰按鈕點擊，並在收到結果後，檢查是否有新稱號
async function handleChallengeMonsterClick(event, monsterIdToChallenge = null, ownerId = null, npcId = null, ownerNickname = null) {
    if(event) event.stopPropagation();

    const playerMonster = getSelectedMonster();
    if (!playerMonster) {
        showFeedbackModal('提示', '請先從您的農場選擇一隻出戰怪獸！');
        return;
    }

    if (playerMonster.hp <= playerMonster.initial_max_hp * 0.25) {
        const hpInfo = `<span style="color: var(--danger-color);">${playerMonster.hp}/${playerMonster.initial_max_hp} HP</span>`;
        showFeedbackModal('無法戰鬥', `您的怪獸 <strong>${playerMonster.nickname}</strong> (${hpInfo}) 目前瀕死需要休息，無法出戰。`);
        return;
    }

    if (playerMonster.farmStatus?.isTraining) {
         showFeedbackModal('提示', `${playerMonster.nickname} 目前正在修煉中，無法出戰。`);
        return;
    }

    let opponentMonster = null;

    try {
        showFeedbackModal('準備戰鬥...', '正在獲取對手資訊...', true);
        
        playerMonster.farmStatus = { ...playerMonster.farmStatus, isBattling: true };
        renderMonsterFarm();
        updateMonsterSnapshot(playerMonster);

        if (monsterIdToChallenge && ownerId && ownerId !== gameState.playerId) {
            const opponentPlayerData = await getPlayerData(ownerId);
            if (!opponentPlayerData || !opponentPlayerData.farmedMonsters) throw new Error('無法獲取對手玩家資料。');
            opponentMonster = opponentPlayerData.farmedMonsters.find(m => m.id === monsterIdToChallenge);
            if (!opponentMonster) throw new Error(`找不到對手玩家的怪獸ID ${monsterIdToChallenge}。`);
            if (!opponentMonster.farmStatus) opponentMonster.farmStatus = { isTraining: false, isBattling: false };
        }
        else if (npcId) {
            const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
            opponentMonster = npcTemplates.find(npc => npc.id === npcId);
            if (!opponentMonster) throw new Error(`找不到ID為 ${npcId} 的NPC對手。`);
            opponentMonster = JSON.parse(JSON.stringify(opponentMonster));
            opponentMonster.isNPC = true;
            if (!opponentMonster.farmStatus) opponentMonster.farmStatus = { isTraining: false, isBattling: false };
        }
        else {
            const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
            if (npcTemplates.length > 0) {
                opponentMonster = JSON.parse(JSON.stringify(npcTemplates[Math.floor(Math.random() * npcTemplates.length)]));
                opponentMonster.isNPC = true;
                if (!opponentMonster.farmStatus) opponentMonster.farmStatus = { isTraining: false, isBattling: false };
            } else {
                throw new Error('沒有可用的NPC對手進行挑戰。');
            }
        }
        
        hideModal('feedback-modal');

        if (!opponentMonster) {
            showFeedbackModal('錯誤', '未能找到合適的挑戰對手。');
            playerMonster.farmStatus.isBattling = false;
            renderMonsterFarm();
            updateMonsterSnapshot(playerMonster);
            return;
        }

        gameState.battleTargetMonster = opponentMonster;

        showConfirmationModal(
            '確認出戰',
            `您確定要讓 ${playerMonster.nickname} (評價: ${playerMonster.score}) 挑戰 ${opponentMonster.nickname} (評價: ${opponentMonster.score}) 嗎？`,
            async () => {
                try {
                    showFeedbackModal('戰鬥中...', '正在激烈交鋒，生成戰報...', true);
                    
                    const response = await simulateBattle({
                        player_monster_data: playerMonster,
                        opponent_monster_data: opponentMonster,
                        opponent_owner_id: ownerId, 
                        opponent_owner_nickname: ownerNickname
                    });

                    const battleResult = response.battle_result;
                    
                    hideModal('feedback-modal');

                    // 檢查是否有新獲得的稱號
                    if (battleResult.newly_awarded_titles && battleResult.newly_awarded_titles.length > 0) {
                        const newTitle = battleResult.newly_awarded_titles[0];
                        const awardDetails = {
                            type: 'title',
                            name: newTitle.name,
                            buffs: newTitle.buffs,
                            bannerUrl: 'https://github.com/msw2004727/MD/blob/main/images/BN001.png?raw=true'
                        };
                        const actionButtons = [{
                            text: '太棒了！查看戰報',
                            class: 'primary',
                            onClick: () => showBattleLogModal(battleResult)
                        }];
                        showFeedbackModal('榮譽加身！', '', false, null, actionButtons, awardDetails);
                    } else {
                        // 如果沒有新稱號，直接顯示戰報
                        showBattleLogModal(battleResult);
                    }

                    await refreshPlayerData();
                    updateMonsterSnapshot(getSelectedMonster());

                } catch (battleError) {
                    showFeedbackModal('戰鬥失敗', `模擬戰鬥時發生錯誤: ${battleError.message}`);
                    console.error("模擬戰鬥錯誤:", battleError);
                    await refreshPlayerData();
                }
            },
            { confirmButtonClass: 'primary', confirmButtonText: '開始戰鬥' }
        );

    } catch (error) {
        showFeedbackModal('錯誤', `準備戰鬥失敗: ${error.message}`);
        console.error("準備戰鬥錯誤:", error);
        playerMonster.farmStatus.isBattling = false;
        renderMonsterFarm();
        updateMonsterSnapshot(playerMonster);
    }
}


function handleBattleLogModalClose() {
    if (DOMElements.closeBattleLogBtn) DOMElements.closeBattleLogBtn.addEventListener('click', () => {
        hideModal('battle-log-modal');
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

// --- 新增：處理怪獸改名事件 ---
function handleMonsterNicknameEvents() {
    // 使用事件代理，因為彈窗內容是動態生成的
    if (DOMElements.monsterInfoModalHeader) {
        DOMElements.monsterInfoModalHeader.addEventListener('click', async (event) => {
            // 從彈窗標題的 data attribute 獲取正確的怪獸ID
            const monsterId = DOMElements.monsterInfoModalHeader.dataset.monsterId;
            if (!monsterId) return;

            const displayContainer = document.getElementById('monster-nickname-display-container');
            const editContainer = document.getElementById('monster-nickname-edit-container');

            // --- 處理點擊「編輯」按鈕 ---
            if (event.target.id === 'edit-monster-nickname-btn') {
                if(displayContainer) displayContainer.style.display = 'none';
                if(editContainer) {
                    editContainer.style.display = 'flex'; // 使用 flex 以匹配 inline style
                    const input = editContainer.querySelector('#monster-nickname-input');
                    if(input) input.focus(); // 自動聚焦到輸入框
                }
            }

            // --- 處理點擊「取消」按鈕 ---
            if (event.target.id === 'cancel-nickname-change-btn') {
                if(displayContainer) displayContainer.style.display = 'flex';
                if(editContainer) editContainer.style.display = 'none';
            }

            // --- 處理點擊「確認」按鈕 ---
            if (event.target.id === 'confirm-nickname-change-btn') {
                const input = document.getElementById('monster-nickname-input');
                const newCustomName = input ? input.value.trim() : '';

                showFeedbackModal('更新中...', '正在為您的怪獸更名...', true);
                try {
                    await updateMonsterCustomNickname(monsterId, newCustomName);
                    await refreshPlayerData(); 
                    
                    // 刷新後，使用 monsterId 重新找到怪獸並渲染當前彈窗
                    const updatedMonster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
                    if(updatedMonster) {
                        updateMonsterInfoModal(updatedMonster, gameState.gameConfigs);
                    }
                    hideModal('feedback-modal');
                    showFeedbackModal('更新成功', '您的怪獸有了新的名字！');

                } catch (error) {
                    hideModal('feedback-modal');
                    showFeedbackModal('更新失敗', `發生錯誤：${error.message}`);
                    // 失敗時也恢復為顯示模式
                    if(displayContainer) displayContainer.style.display = 'flex';
                    if(editContainer) editContainer.style.display = 'none';
                }
            }
        });
    }
}

async function handleSkillLinkClick(event) {
    const target = event.target.closest('.skill-name-link');
    if (!target) return;

    event.preventDefault();

    const skillName = target.dataset.skillName;
    if (!skillName) return;

    let skillDetails = null;
    if (gameState.gameConfigs && gameState.gameConfigs.skills) {
        for (const elementType in gameState.gameConfigs.skills) {
            const skillsInElement = gameState.gameConfigs.skills[elementType];
            if (Array.isArray(skillsInElement)) {
                const foundSkill = skillsInElement.find(s => s.name === skillName);
                if (foundSkill) {
                    skillDetails = foundSkill;
                    break;
                }
            }
        }
    }

    if (skillDetails) {
        const description = skillDetails.description || skillDetails.story || '暫無描述。';
        const mpCost = skillDetails.mp_cost !== undefined ? skillDetails.mp_cost : 'N/A';
        const power = skillDetails.power !== undefined ? skillDetails.power : 'N/A';
        const category = skillDetails.skill_category || '未知';
        
        const message = `
            <div style="text-align: left; background-color: var(--bg-primary); padding: 8px; border-radius: 4px; border: 1px solid var(--border-color);">
                <p><strong>技能: ${skillName}</strong></p>
                <p><strong>類別:</strong> ${category} &nbsp;&nbsp; <strong>威力:</strong> ${power} &nbsp;&nbsp; <strong>消耗MP:</strong> ${mpCost}</p>
                <hr style="margin: 8px 0; border-color: var(--border-color);">
                <p>${description}</p>
            </div>
        `;
        
        const feedbackModalBody = target.closest('#feedback-modal-body-content');
        const injectionPoint = document.getElementById('skill-details-injection-point');

        if (feedbackModalBody && injectionPoint) {
            injectionPoint.innerHTML = message;
        } else {
            showFeedbackModal(`技能: ${skillName}`, message);
        }
    } else {
        showFeedbackModal('錯誤', `找不到名為 "${skillName}" 的技能詳細資料。`);
    }
}

function initializeEventListeners() {
    handleModalCloseButtons();
    handleThemeSwitch();
    handleAuthForms();
    handleTopNavButtons();
    handleTabSwitching();
    handleLeaderboardSorting();
    handleLeaderboardClicks();
    handlePlayerInfoModalEvents(); // 修改：調用新的整合函式
    handleMonsterNicknameEvents();
    handleFarmHeaderSorting(); 
    document.body.addEventListener('click', handleSkillLinkClick);


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

    // 為新的刷新按鈕添加事件監聽
    if (DOMElements.refreshMonsterLeaderboardBtn) {
        DOMElements.refreshMonsterLeaderboardBtn.addEventListener('click', fetchAndDisplayMonsterLeaderboard);
    }

    console.log("All event listeners initialized with enhanced drag-drop logic for temporary backpack.");

}
