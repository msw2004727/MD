// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js), gameState (來自 game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

// --- Drag and Drop Handlers for DNA ---
let draggedItemInfo = null; // { data: dnaObject, sourceType: string, sourceIndex: number }

function handleDragStart(event) {
    const target = event.target.closest('.dna-item, .dna-slot.occupied');
    if (!target) {
        event.preventDefault();
        return;
    }

    let dnaObject, sourceType, sourceIndex;

    if (target.classList.contains('dna-slot') && target.classList.contains('occupied')) { // 從組合槽拖曳
        sourceType = 'combination';
        sourceIndex = parseInt(target.dataset.slotIndex, 10);
        dnaObject = gameState.dnaCombinationSlots[sourceIndex];
    } else if (target.dataset.inventorySlotIndex !== undefined) { // 從DNA碎片庫拖曳
        sourceType = 'inventory';
        sourceIndex = parseInt(target.dataset.inventorySlotIndex, 10);
        dnaObject = gameState.playerData.playerOwnedDNA[sourceIndex];
    } else if (target.dataset.tempSlotIndex !== undefined) { // 從臨時背包拖曳
        sourceType = 'temporary';
        sourceIndex = parseInt(target.dataset.tempSlotIndex, 10);
        // 臨時背包結構是 [{type:'dna', data:{...}}]
        dnaObject = gameState.temporaryBackpack[sourceIndex] ? gameState.temporaryBackpack[sourceIndex].data : null;
    } else {
        event.preventDefault();
        return;
    }

    if (!dnaObject) {
        event.preventDefault();
        return;
    }

    draggedItemInfo = { data: dnaObject, sourceType, sourceIndex };
    event.dataTransfer.setData('application/json', JSON.stringify(dnaObject)); // 主要傳輸DNA物件
    event.dataTransfer.effectAllowed = 'move';
    target.classList.add('dragging'); // 添加拖曳時的視覺效果
    // console.log(`DragStart: ${dnaObject.name} from ${sourceType}[${sourceIndex}]`);
}

function handleDragEnd(event) {
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        draggingElement.classList.remove('dragging');
    }
    draggedItemInfo = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(event) {
    event.preventDefault(); // 必須阻止預設行為才能觸發drop
    event.dataTransfer.dropEffect = 'move';
    const target = event.target.closest('.dna-slot, .dna-item, #inventory-delete-slot'); // 包括 .dna-item 以便在物品上懸停
    if (target) {
        // 為有效的放置目標添加視覺提示，但避免重複添加給已經是 .dragging 的元素
        if (!target.classList.contains('dragging')) {
            target.classList.add('drag-over');
        }
    }
}

function handleDragLeave(event) {
    const target = event.target.closest('.dna-slot, .dna-item, #inventory-delete-slot');
    if (target) {
        target.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    if (!draggedItemInfo) {
        handleDragEnd(event);
        return;
    }

    const targetElement = event.target.closest('.dna-slot, .dna-item, #inventory-delete-slot');
    if (targetElement) {
        targetElement.classList.remove('drag-over');
    }

    if (!targetElement) { // 如果拖曳到無效區域
        handleDragEnd(event);
        return;
    }

    const { data: sourceDna, sourceType: sourceCategory, sourceIndex } = draggedItemInfo;

    if (targetElement.id === 'inventory-delete-slot') {
        if (sourceCategory === 'inventory') {
            showConfirmationModal('確認刪除', `您確定要永久刪除 DNA 碎片 "${sourceDna.name}" 嗎？此操作無法復原。`, () => {
                deleteDNAFromInventory(sourceDna.id); // 從 gameState.playerData.playerOwnedDNA 刪除
                renderPlayerDNAInventory();
                showFeedbackModal('操作成功', `DNA 碎片 "${sourceDna.name}" 已被刪除。`);
            });
        } else if (sourceCategory === 'combination') {
            gameState.dnaCombinationSlots[sourceIndex] = null;
            renderDNACombinationSlots();
            showFeedbackModal('操作成功', `已從組合槽移除 DNA "${sourceDna.name}"。`);
        } else if (sourceCategory === 'temporary') {
            // 假設臨時背包中的物品可以直接丟棄
            if (gameState.temporaryBackpack[sourceIndex] && gameState.temporaryBackpack[sourceIndex].data.id === sourceDna.id) {
                gameState.temporaryBackpack.splice(sourceIndex, 1);
                renderTemporaryBackpack();
                showFeedbackModal('操作成功', `已從臨時背包移除 DNA "${sourceDna.name}"。`);
            }
        }
        handleDragEnd(event);
        return;
    }

    let targetCategory, targetIndex, targetDna = null;

    if (targetElement.classList.contains('dna-slot')) { // 拖曳到組合槽
        targetCategory = 'combination';
        targetIndex = parseInt(targetElement.dataset.slotIndex, 10);
        targetDna = gameState.dnaCombinationSlots[targetIndex];
    } else if (targetElement.dataset.inventorySlotIndex !== undefined) { // 拖曳到DNA碎片庫的某個格子 (可能是空的也可能是有物品的)
        targetCategory = 'inventory';
        targetIndex = parseInt(targetElement.dataset.inventorySlotIndex, 10);
        targetDna = gameState.playerData.playerOwnedDNA[targetIndex];
    } else if (targetElement.dataset.tempSlotIndex !== undefined) { // 拖曳到臨時背包的某個格子
        targetCategory = 'temporary';
        targetIndex = parseInt(targetElement.dataset.tempSlotIndex, 10);
        targetDna = gameState.temporaryBackpack[targetIndex] ? gameState.temporaryBackpack[targetIndex].data : null;
    } else {
        console.warn("handleDrop: 未知的目標類型或無法獲取索引。", targetElement);
        handleDragEnd(event);
        return;
    }

    // 防止拖曳到自身
    if (sourceCategory === targetCategory && sourceIndex === targetIndex) {
        handleDragEnd(event);
        return;
    }

    // --- 執行交換或移動 ---
    // 1. 將來源 DNA 放到目標位置
    if (targetCategory === 'combination') {
        gameState.dnaCombinationSlots[targetIndex] = sourceDna;
    } else if (targetCategory === 'inventory') {
        // 確保不會超出 inventoryDisplaySlots 的預期範圍
        if (targetIndex < (DOMElements.inventoryItemsContainer.children.length -1) ) { // -1 for delete slot
             gameState.playerData.playerOwnedDNA[targetIndex] = sourceDna;
        } else {
             console.warn("嘗試放置到無效的庫存索引");
             handleDragEnd(event); return;
        }
    } else if (targetCategory === 'temporary') {
        if (targetIndex < (DOMElements.temporaryBackpackContainer.children.length) ) {
             gameState.temporaryBackpack[targetIndex] = { type: 'dna', data: sourceDna };
        } else {
             console.warn("嘗試放置到無效的臨時背包索引");
             handleDragEnd(event); return;
        }
    }

    // 2. 將目標位置原有的 DNA (如果存在) 放到來源位置
    if (targetDna) { // 如果目標槽原本有物品 (交換)
        if (sourceCategory === 'combination') {
            gameState.dnaCombinationSlots[sourceIndex] = targetDna;
        } else if (sourceCategory === 'inventory') {
            gameState.playerData.playerOwnedDNA[sourceIndex] = targetDna;
        } else if (sourceCategory === 'temporary') {
            gameState.temporaryBackpack[sourceIndex] = { type: 'dna', data: targetDna };
        }
    } else { // 如果目標槽原本是空的 (移動)
        if (sourceCategory === 'combination') {
            gameState.dnaCombinationSlots[sourceIndex] = null;
        } else if (sourceCategory === 'inventory') {
            // 如果 inventory 是固定長度且用 null 表示空位，則設為 null
            // 如果 inventory 是動態長度，則需要 splice
            // 目前 playerOwnedDNA 是動態長度的，所以這裡應該是移除
            if (gameState.playerData.playerOwnedDNA[sourceIndex] && gameState.playerData.playerOwnedDNA[sourceIndex].id === sourceDna.id) {
                gameState.playerData.playerOwnedDNA.splice(sourceIndex, 1);
                // 如果拖曳後導致 inventory 列表長度變化，後續渲染時要確保空槽位被正確填充
            }
        } else if (sourceCategory === 'temporary') {
            gameState.temporaryBackpack.splice(sourceIndex, 1);
        }
    }

    // 重新渲染UI
    if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
    if (typeof renderDNACombinationSlots === 'function') renderDNACombinationSlots();
    if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack();
    if (typeof updateMonsterSnapshot === 'function') updateMonsterSnapshot(getSelectedMonster()); // 更新快照的身體部位顯示

    handleDragEnd(event);
}


// --- Modal Close Button Handler ---
function handleModalCloseButtons() {
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId || button.closest('.modal')?.id;
            if (modalId) {
                if (modalId === 'training-results-modal' && gameState.temporaryBackpack.length > 0 && gameState.lastCultivationResult?.items_obtained?.length > 0) {
                    showModal('reminder-modal'); // 僅當修煉結果中有物品且臨時背包不為空時提醒
                } else {
                    hideModal(modalId);
                }
            }
        });
    });
}


// --- Theme Switcher Handler ---
function handleThemeSwitch() {
    if (DOMElements.themeSwitcherBtn) {
        DOMElements.themeSwitcherBtn.addEventListener('click', () => {
            const newTheme = gameState.currentTheme === 'dark' ? 'light' : 'dark';
            updateTheme(newTheme);
        });
    }
}

// --- Auth Form Handlers & Logout ---
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
                await registerUser(nickname, password); // Auth.js function
                hideModal('register-modal');
                // onAuthStateChangedHandler in main.js will handle UI update
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
                await loginUser(nickname, password); // Auth.js function
                hideModal('login-modal');
                // onAuthStateChangedHandler in main.js will handle UI update
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
                await logoutUser(); // Auth.js function
                // UI reset and state clearing will be handled by onAuthStateChangedHandler in main.js
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('登出失敗', `登出時發生錯誤: ${error.message}`);
            }
        });
    }
}

// --- Top Navigation Button Handlers ---
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
                showFeedbackModal('提示', '請先在農場選擇一隻怪獸。');
            }
        });
    }

    if (DOMElements.playerInfoButton) {
        DOMElements.playerInfoButton.addEventListener('click', () => {
            if (gameState.playerData && gameState.playerId) { // 確保玩家已登入且有資料
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
                const leaderboardData = await getMonsterLeaderboard(20); // API call
                gameState.monsterLeaderboard = leaderboardData || [];

                let elementsForTabs = ['all', 'NPC']; // 基本頁籤
                if (gameState.gameConfigs && gameState.gameConfigs.element_nicknames) {
                    elementsForTabs = ['all', 'NPC', ...Object.keys(gameState.gameConfigs.element_nicknames)];
                } else { // Fallback if element_nicknames is not available
                    const uniqueElements = new Set();
                    (leaderboardData || []).forEach(m => m.elements.forEach(el => uniqueElements.add(el)));
                    elementsForTabs = ['all', 'NPC', ...Array.from(uniqueElements)];
                }
                updateMonsterLeaderboardElementTabs(elementsForTabs);
                gameState.currentMonsterLeaderboardElementFilter = 'all'; // 重設篩選
                filterAndRenderMonsterLeaderboard(); // Game-logic.js function
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
                const leaderboardData = await getPlayerLeaderboard(20); // API call
                gameState.playerLeaderboard = leaderboardData || [];
                sortAndRenderLeaderboard('player'); // 使用 game-logic 中的排序和渲染
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
            updateFriendsListModal([]); // 清空並顯示搜尋提示
            if(DOMElements.friendsListSearchInput) DOMElements.friendsListSearchInput.value = '';
            showModal('friends-list-modal');
        });
    }
}

// --- Tab Switching Handler ---
function handleTabSwitching() {
    if (DOMElements.dnaFarmTabs) {
        DOMElements.dnaFarmTabs.addEventListener('click', (event) => {
            const button = event.target.closest('.tab-button');
            if (button) {
                const targetTabId = button.dataset.tabTarget;
                switchTabContent(targetTabId, button); // ui.js function
            }
        });
    }

    if (DOMElements.monsterInfoTabs) {
        DOMElements.monsterInfoTabs.addEventListener('click', (event) => {
            const button = event.target.closest('.tab-button');
            if (button) {
                const targetTabId = button.dataset.tabTarget;
                switchTabContent(targetTabId, button, 'monster-info-modal'); // ui.js function
            }
        });
    }
}

// --- DNA Combination Handler ---
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
        const result = await combineDNA(dnaBaseIdsForCombination); // API Call

        if (result && result.id) { // 假設成功時後端返回怪獸物件
            const newMonster = result;
            await refreshPlayerData(); // 刷新玩家資料，包含新怪獸

            resetDNACombinationSlots(); // 清空組合槽
            // renderDNACombinationSlots(); // refreshPlayerData 内部的 renderMonsterFarm 会间接触发

            let feedbackMessage = `🎉 成功合成了新的怪獸：<strong>${newMonster.nickname}</strong>！<br>`;
            feedbackMessage += `屬性: ${newMonster.elements.join(', ')}, 稀有度: ${newMonster.rarity}<br>`;
            feedbackMessage += `HP: ${newMonster.hp}, 攻擊: ${newMonster.attack}, 防禦: ${newMonster.defense}, 速度: ${newMonster.speed}, 爆擊: ${newMonster.crit}%`;
            if (result.farm_full_warning) { // 後端可能返回農場已滿的警告
                feedbackMessage += `<br><strong class="text-[var(--warning-color)]">${result.farm_full_warning}</strong> 請至農場管理。`;
            }

            showFeedbackModal(
                '合成成功！',
                feedbackMessage,
                false, // not loading
                null,  // no monster details (could show newMonster here if desired)
                [{ text: '查看新怪獸', class: 'primary', onClick: () => {
                    updateMonsterSnapshot(newMonster); // 顯示新怪獸的快照
                    // 可以考慮切換到農場頁面
                    if (DOMElements.dnaFarmTabs) {
                       const farmTabButton = DOMElements.dnaFarmTabs.querySelector('[data-tab-target="monster-farm-content"]');
                       if (farmTabButton) switchTabContent("monster-farm-content", farmTabButton);
                    }
                }}, { text: '關閉', class: 'secondary'}]
            );

        } else if (result && result.error) {
            showFeedbackModal('合成失敗', result.error);
        } else {
            showFeedbackModal('合成失敗', '發生未知錯誤，未能生成怪獸。');
        }
    } catch (error) {
        let errorMessage = `請求錯誤: ${error.message}`;
        if (error.message && error.message.includes("未能生成怪獸")) {
            errorMessage = `合成失敗: DNA 組合未能生成怪獸。請檢查您的 DNA 組合或稍後再試。`;
        }
        showFeedbackModal('合成失敗', errorMessage);
    }
}

// --- Cultivation Modal Handlers ---
function handleCultivationModals() {
    if (DOMElements.startCultivationBtn) {
        DOMElements.startCultivationBtn.addEventListener('click', async () => {
            if (!gameState.cultivationMonsterId) {
                showFeedbackModal('錯誤', '沒有選定要修煉的怪獸。');
                return;
            }
            // 模擬修煉立即完成，實際應有計時器或後端長時間任務
            const MOCK_CULTIVATION_DURATION_SECONDS = 10; // 模擬10秒修煉

            // 更新怪獸農場狀態為修煉中 (前端即時反饋)
            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === gameState.cultivationMonsterId);
            if (monsterInFarm) {
                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = true;
                monsterInFarm.farmStatus.trainingStartTime = Date.now(); // 記錄開始時間
                monsterInFarm.farmStatus.trainingDuration = MOCK_CULTIVATION_DURATION_SECONDS * 1000; // 記錄總時長
                renderMonsterFarm(); // 更新農場顯示
            }

            hideModal('cultivation-setup-modal');
            showFeedbackModal(
                '修煉開始！',
                `怪獸 ${monsterInFarm ? monsterInFarm.nickname : ''} 已開始為期 ${MOCK_CULTIVATION_DURATION_SECONDS} 秒的修煉。請稍後查看成果。`,
                false,
                null,
                [{ text: '好的', class: 'primary'}]
            );

            // 模擬修煉完成後調用結算
            // 在實際應用中，這部分可能由服務器推送或玩家手動點擊“完成修煉”觸發
            setTimeout(() => {
                handleCompleteCultivation(gameState.cultivationMonsterId, MOCK_CULTIVATION_DURATION_SECONDS);
            }, MOCK_CULTIVATION_DURATION_SECONDS * 1000 + 500); // 加500ms緩衝
        });
    }

    if (DOMElements.closeTrainingResultsBtn) DOMElements.closeTrainingResultsBtn.addEventListener('click', () => {
        if (gameState.lastCultivationResult?.items_obtained?.length > 0) { // 檢查是否有未領取的物品
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });
    if (DOMElements.finalCloseTrainingResultsBtn) DOMElements.finalCloseTrainingResultsBtn.addEventListener('click', () => {
         if (gameState.lastCultivationResult?.items_obtained?.length > 0) {
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });


    if (DOMElements.addAllToTempBackpackBtn) {
        DOMElements.addAllToTempBackpackBtn.addEventListener('click', () => {
            addAllCultivationItemsToTempBackpack(); // Game-logic.js function
        });
    }

    if (DOMElements.reminderConfirmCloseBtn) DOMElements.reminderConfirmCloseBtn.addEventListener('click', () => {
        hideModal('reminder-modal');
        hideModal('training-results-modal');
        // gameState.lastCultivationResult.items_obtained = []; // 標記物品已被放棄
        clearTemporaryBackpack(); // 或者直接清空臨時背包，如果放棄就等於丟棄
    });
    if (DOMElements.reminderCancelBtn) DOMElements.reminderCancelBtn.addEventListener('click', () => {
        hideModal('reminder-modal'); // 只關閉提醒，讓玩家繼續處理修煉結果
    });
}

// --- Newbie Guide Search Handler ---
function handleNewbieGuideSearch() {
    if (DOMElements.newbieGuideSearchInput) {
        DOMElements.newbieGuideSearchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
                updateNewbieGuideModal(gameState.gameConfigs.newbie_guide, searchTerm); // ui.js function
            }
        });
    }
}

// --- Friends List Search Handler ---
function handleFriendsListSearch() {
   if (DOMElements.friendsListSearchInput) {
        DOMElements.friendsListSearchInput.addEventListener('input', async (event) => {
            const query = event.target.value.trim();
            if (query.length > 1) { // 至少輸入2個字符才開始搜尋
                try {
                    const result = await searchPlayers(query); // API call
                    gameState.searchedPlayers = result.players || [];
                    updateFriendsListModal(gameState.searchedPlayers); // ui.js function
                } catch (error) {
                    console.error("搜尋玩家失敗:", error);
                    updateFriendsListModal([]); // 出錯時顯示空列表
                }
            } else if (query.length === 0) {
                updateFriendsListModal([]); // 清空時也清空列表
            }
        });
   }
}

// --- Leaderboard Element Filter Handler ---
function handleMonsterLeaderboardFilter() {
    if (DOMElements.monsterLeaderboardElementTabs) {
        DOMElements.monsterLeaderboardElementTabs.addEventListener('click', (event) => {
            const button = event.target.closest('.tab-button');
            if (button) {
                const filter = button.dataset.elementFilter;
                gameState.currentMonsterLeaderboardElementFilter = filter; // 更新篩選狀態
                // 更新按鈕 active 狀態
                DOMElements.monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                filterAndRenderMonsterLeaderboard(); // Game-logic.js function
            }
        });
    }
}

// --- Leaderboard Sorting Handler ---
function handleLeaderboardSorting() {
    const tables = [DOMElements.monsterLeaderboardTable, DOMElements.playerLeaderboardTable];
    tables.forEach(table => {
        if (table) {
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                headerRow.addEventListener('click', (event) => {
                    const th = event.target.closest('th[data-sort-key]'); // 只處理帶 sort-key 的表頭
                    if (!th) return;

                    const sortKey = th.dataset.sortKey;
                    const tableType = table.id.includes('monster') ? 'monster' : 'player';

                    let currentSortConfig = gameState.leaderboardSortConfig[tableType];
                    let newSortOrder = 'desc'; // 預設降冪
                    if (currentSortConfig && currentSortConfig.key === sortKey) {
                        newSortOrder = currentSortConfig.order === 'desc' ? 'asc' : 'desc'; // 切換順序
                    }

                    gameState.leaderboardSortConfig[tableType] = { key: sortKey, order: newSortOrder };

                    // 根據篩選條件（如果是怪獸排行榜）和新的排序條件來渲染
                    if (tableType === 'monster') {
                        filterAndRenderMonsterLeaderboard();
                    } else {
                        sortAndRenderLeaderboard(tableType);
                    }
                    // updateLeaderboardSortIcons 在 updateLeaderboardTable 內部調用
                });
            }
        }
    });
}


// --- Battle Log Modal Close Handler ---
function handleBattleLogModalClose() {
    if (DOMElements.closeBattleLogBtn) DOMElements.closeBattleLogBtn.addEventListener('click', () => {
        hideModal('battle-log-modal');
    });
}

// --- DNA Draw Modal Handlers ---
function handleDnaDrawModal() {
    if (DOMElements.closeDnaDrawBtn) DOMElements.closeDnaDrawBtn.addEventListener('click', () => {
        hideModal('dna-draw-modal');
    });
    if (DOMElements.dnaDrawButton) DOMElements.dnaDrawButton.addEventListener('click', handleDrawDNAClick); // Game-logic.js

    if (DOMElements.dnaDrawResultsGrid) {
        DOMElements.dnaDrawResultsGrid.addEventListener('click', (event) => {
            const button = event.target.closest('.add-drawn-dna-to-backpack-btn');
            if (button) {
                const dnaIndex = parseInt(button.dataset.dnaIndex, 10);
                if (gameState.lastDnaDrawResult && gameState.lastDnaDrawResult[dnaIndex]) {
                    const dnaTemplate = gameState.lastDnaDrawResult[dnaIndex];
                    addDnaToTemporaryBackpack(dnaTemplate); // Game-logic.js
                    button.disabled = true;
                    button.textContent = '已加入';
                }
            }
        });
    }
}

// --- Official Announcement Modal Close Handler ---
function handleAnnouncementModalClose() {
    if (DOMElements.officialAnnouncementCloseX) {
        DOMElements.officialAnnouncementCloseX.addEventListener('click', () => {
            hideModal('official-announcement-modal');
            localStorage.setItem('announcementShown_v1', 'true'); // 標記已顯示
        });
    }
}


// --- Main Function to Add All Event Listeners ---
function initializeEventListeners() {
    handleModalCloseButtons();
    handleThemeSwitch();
    handleAuthForms();
    handleTopNavButtons();
    handleTabSwitching();
    handleLeaderboardSorting(); // 初始化排行榜排序監聽

    if (DOMElements.combineButton) DOMElements.combineButton.addEventListener('click', handleCombineDna);

    // 統一在 gameContainer 上監聽拖曳事件，以簡化和確保覆蓋所有相關區域
    const gameAreaForDragDrop = DOMElements.gameContainer || document.body;
    gameAreaForDragDrop.addEventListener('dragstart', handleDragStart);
    gameAreaForDragDrop.addEventListener('dragend', handleDragEnd);
    gameAreaForDragDrop.addEventListener('dragover', handleDragOver);
    gameAreaForDragDrop.addEventListener('dragleave', handleDragLeave);
    gameAreaForDragDrop.addEventListener('drop', handleDrop);

    handleCultivationModals();
    handleNewbieGuideSearch();
    handleFriendsListSearch();
    handleMonsterLeaderboardFilter(); // 初始化怪獸排行榜篩選監聽
    handleBattleLogModalClose();
    handleDnaDrawModal();
    handleAnnouncementModalClose();

    console.log("All event listeners initialized (v19 - with drag-drop & leaderboard enhancements).");
}
