// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js), gameState (來自 game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

// --- Drag and Drop Handlers for DNA ---
let draggedDnaElement = null; // 用於存儲被拖動的 DNA 元素

function handleDragStart(event) {
    if (event.target.classList.contains('dna-item') || (event.target.classList.contains('dna-slot') && event.target.classList.contains('occupied'))) {
        draggedDnaElement = event.target;
        event.dataTransfer.setData('text/plain', event.target.dataset.dnaId || event.target.textContent);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { // 延遲添加，使其在拖動副本時隱藏原元素
            event.target.classList.add('dragging');
        }, 0);
    } else {
        event.preventDefault(); // 如果不是可拖動的，則阻止拖動
    }
}

function handleDragEnd(event) {
    if (draggedDnaElement) {
        draggedDnaElement.classList.remove('dragging');
        draggedDnaElement = null;
    }
    // 清除所有 drag-over class
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(event) {
    event.preventDefault(); // 必須阻止默認行為以允許 drop
    event.dataTransfer.dropEffect = 'move';
    // 添加視覺提示
    if (event.target.classList.contains('dna-slot') || 
        event.target.classList.contains('inventory-slot-empty') ||
        event.target.classList.contains('temp-backpack-slot') ||
        event.target.id === 'inventory-delete-slot') {
        event.target.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    // 移除視覺提示
    if (event.target.classList.contains('dna-slot') ||
        event.target.classList.contains('inventory-slot-empty') ||
        event.target.classList.contains('temp-backpack-slot') ||
        event.target.id === 'inventory-delete-slot') {
        event.target.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    if (!draggedDnaElement) return;

    const targetElement = event.target.closest('.dna-slot, #inventory-items, #inventory-delete-slot, .temp-backpack-slot');
    if (!targetElement) {
        handleDragEnd(event); // 確保拖曳結束狀態被清理
        return;
    }
    
    targetElement.classList.remove('drag-over'); // 清除目標的 drag-over class

    const dnaIdToMove = draggedDnaElement.dataset.dnaId;
    const source = draggedDnaElement.dataset.dnaSource; // 'inventory', 'combination'
    const sourceSlotIndex = parseInt(draggedDnaElement.dataset.slotIndex, 10); // 如果來自組合槽

    // 情況1: 拖曳到刪除區
    if (targetElement.id === 'inventory-delete-slot') {
        if (source === 'inventory') {
            showConfirmationModal('確認刪除', `您確定要永久刪除 DNA 碎片 "${draggedDnaElement.textContent}" 嗎？此操作無法復原。`, () => {
                deleteDNAFromInventory(dnaIdToMove); // 實作此函數於 game-logic.js
                renderPlayerDNAInventory(); // 更新UI
                showFeedbackModal('操作成功', `DNA 碎片 "${draggedDnaElement.textContent}" 已被刪除。`);
            });
        } else if (source === 'combination') {
            // 從組合槽移除並放回 (或直接刪除，取決於設計)
            // 這裡假設直接移除
            gameState.dnaCombinationSlots[sourceSlotIndex] = null;
            renderDNACombinationSlots();
            showFeedbackModal('操作成功', `已從組合槽移除 DNA。`);
        }
    }
    // 情況2: 拖曳到 DNA 組合槽
    else if (targetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(targetElement.dataset.slotIndex, 10);
        moveDnaToCombinationSlot(dnaIdToMove, source, sourceSlotIndex, targetSlotIndex); // 實作此函數於 game-logic.js
    }
    // 情況3: 從組合槽拖曳回 DNA 庫存 (假設拖到 #inventory-items 容器)
    else if (targetElement.id === 'inventory-items' && source === 'combination') {
        // 這裡的邏輯是將 DNA 從組合槽移回玩家庫存
        // 但由於我們沒有直接的“放回庫存”操作，通常是清空該組合槽
        // 如果需要“放回”，則需要更複雜的庫存管理
        gameState.dnaCombinationSlots[sourceSlotIndex] = null;
        renderDNACombinationSlots();
        // 注意：如果 DNA 原本是從庫存拖到組合槽的，它並未真正從庫存中移除，直到合成發生。
        // 所以這裡“放回”實際上只是清空組合槽。
    }
    // 其他情況 (例如槽位之間交換) 可以根據需要擴展

    handleDragEnd(event); // 確保拖曳結束狀態被清理
}

// --- Modal Close Button Handler ---
function handleModalCloseButtons() {
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId;
            if (modalId === 'training-results-modal' && gameState.temporaryBackpack.length > 0) {
                // 如果是修煉成果彈窗且臨時背包有物品，顯示提醒
                showModal('reminder-modal');
            } else {
                hideModal(modalId);
            }
        });
    });
    // 點擊 Modal 背景關閉 (可選)
    // document.querySelectorAll('.modal').forEach(modal => {
    //     modal.addEventListener('click', (event) => {
    //         if (event.target === modal) { // 僅當點擊背景時
    //             hideModal(modal.id);
    //         }
    //     });
    // });
}


// --- Theme Switcher Handler ---
function handleThemeSwitch() {
    DOMElements.themeSwitcherBtn.addEventListener('click', () => {
        const newTheme = gameState.currentTheme === 'dark' ? 'light' : 'dark';
        updateTheme(newTheme);
    });
}

// --- Auth Form Handlers ---
function handleAuthForms() {
    DOMElements.showRegisterFormBtn.addEventListener('click', () => showModal('register-modal'));
    DOMElements.showLoginFormBtn.addEventListener('click', () => showModal('login-modal'));

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
            await registerUser(nickname, password); // auth.js
            // 成功註冊後，Firebase onAuthStateChanged 會自動觸發後續操作 (如獲取玩家數據)
            hideModal('register-modal');
            // hideFeedbackModal(); // onAuthStateChanged 會處理後續UI
        } catch (error) {
            DOMElements.registerErrorMsg.textContent = error.message;
            hideModal('feedback-modal'); // 隱藏載入中提示
        }
    });

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
            await loginUser(nickname, password); // auth.js
            // 成功登入後，Firebase onAuthStateChanged 會自動觸發
            hideModal('login-modal');
            // hideFeedbackModal();
        } catch (error) {
            DOMElements.loginErrorMsg.textContent = error.message;
            hideModal('feedback-modal');
        }
    });

    DOMElements.logoutBtn.addEventListener('click', async () => {
        try {
            await logoutUser(); // auth.js
            // onAuthStateChanged 會處理 UI 切換到登入畫面
            // 清理本地遊戲狀態
            updateGameState({ // 重置部分 gameState
                currentUser: null,
                playerId: null,
                playerNickname: "玩家",
                playerData: { playerOwnedDNA: [], farmedMonsters: [], playerStats: { nickname: "玩家", titles: ["新手"] } },
                selectedMonsterId: null,
                dnaCombinationSlots: [null, null, null, null, null],
                temporaryBackpack: []
            });
            updateMonsterSnapshot(null); // 清空快照
            renderPlayerDNAInventory();
            renderDNACombinationSlots();
            renderMonsterFarm();
            toggleElementDisplay(DOMElements.authScreen, true, 'flex');
            toggleElementDisplay(DOMElements.gameContainer, false);
            showFeedbackModal('登出成功', '您已成功登出。');
        } catch (error) {
            showFeedbackModal('登出失敗', `登出時發生錯誤: ${error.message}`);
        }
    });
}

// --- Top Navigation Button Handlers ---
function handleTopNavButtons() {
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

    DOMElements.playerInfoButton.addEventListener('click', () => {
        if (gameState.playerData) {
            updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
            showModal('player-info-modal');
        } else {
            showFeedbackModal('錯誤', '無法載入玩家資訊。');
        }
    });

    DOMElements.showMonsterLeaderboardBtn.addEventListener('click', async () => {
        try {
            showFeedbackModal('載入中...', '正在獲取怪獸排行榜...', true);
            const leaderboardData = await getMonsterLeaderboard(20); // api-client.js
            gameState.monsterLeaderboard = leaderboardData;
            // 初始化元素篩選 Tab (假設 'all' 和主要元素)
            const elementsForTabs = ['all', ...(gameState.gameConfigs?.element_nicknames ? Object.keys(gameState.gameConfigs.element_nicknames) : ['火', '水', '木'])];
            updateMonsterLeaderboardElementTabs(elementsForTabs);
            filterAndRenderMonsterLeaderboard(); // 初始顯示全部
            hideModal('feedback-modal');
            showModal('monster-leaderboard-modal');
        } catch (error) {
            showFeedbackModal('載入失敗', `無法獲取怪獸排行榜: ${error.message}`);
        }
    });
    
    DOMElements.showPlayerLeaderboardBtn.addEventListener('click', async () => {
        try {
            showFeedbackModal('載入中...', '正在獲取玩家排行榜...', true);
            const leaderboardData = await getPlayerLeaderboard(20); // api-client.js
            gameState.playerLeaderboard = leaderboardData;
            updateLeaderboardTable('player', leaderboardData);
            hideModal('feedback-modal');
            showModal('player-leaderboard-modal');
        } catch (error) {
            showFeedbackModal('載入失敗', `無法獲取玩家排行榜: ${error.message}`);
        }
    });

    DOMElements.newbieGuideBtn.addEventListener('click', () => {
        if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
            updateNewbieGuideModal(gameState.gameConfigs.newbie_guide);
            DOMElements.newbieGuideSearchInput.value = ''; // 清空搜尋框
            showModal('newbie-guide-modal');
        } else {
            showFeedbackModal('錯誤', '新手指南尚未載入。');
        }
    });
    
    DOMElements.friendsListBtn.addEventListener('click', () => {
        updateFriendsListModal([]); // 初始為空，讓用戶搜尋
        DOMElements.friendsListSearchInput.value = '';
        showModal('friends-list-modal');
    });
}

// --- Tab Switching Handler ---
function handleTabSwitching() {
    // 主 DNA/農場頁籤
    DOMElements.dnaFarmTabs.addEventListener('click', (event) => {
        if (event.target.classList.contains('tab-button')) {
            const targetTabId = event.target.dataset.tabTarget;
            switchTabContent(targetTabId, event.target);
        }
    });

    // 怪獸資訊 Modal 內的頁籤
    DOMElements.monsterInfoTabs.addEventListener('click', (event) => {
        if (event.target.classList.contains('tab-button')) {
            const targetTabId = event.target.dataset.tabTarget;
            switchTabContent(targetTabId, event.target, 'monster-info-modal');
        }
    });
}

// --- DNA Combination Handler ---
async function handleCombineDna() {
    const dnaIds = getValidDNAIdsFromCombinationSlots(); // game-state.js
    if (dnaIds.length < 2) { // 至少需要2個DNA
        showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        const result = await combineDNA(dnaIds); // api-client.js

        if (result && result.id) { // 後端返回了新怪獸
            const newMonster = result;
            // 如果後端沒有自動將新怪獸加入 farmedMonsters 並保存 playerData，
            // 則需要在前端 gameState 中添加，然後請求後端保存整個 playerData。
            // 根據您的後端 MD_routes.py/combine 邏輯，它會嘗試保存。
            // 我們這裡假設後端已處理，前端只需刷新玩家數據。
            
            await refreshPlayerData(); // 重新獲取玩家數據以包含新怪獸和消耗的DNA
            
            resetDNACombinationSlots(); // 清空組合槽
            renderDNACombinationSlots();
            // renderPlayerDNAInventory(); // refreshPlayerData 應該會觸發這個
            // renderMonsterFarm(); // refreshPlayerData 應該會觸發這個
            
            // 準備一個更豐富的回饋，包含新怪獸的資訊
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
                null, // 可選：傳入 newMonster 對象以在 feedback modal 中顯示更詳細的怪獸卡片
                [{ text: '查看新怪獸', class: 'primary', onClick: () => {
                    updateMonsterSnapshot(newMonster); // 選中新怪獸
                    // 可以選擇打開怪獸資訊 modal
                    // showMonsterInfoModal(newMonster.id);
                }}, { text: '關閉', class: 'secondary'}]
            );

        } else if (result && result.error) {
            showFeedbackModal('合成失敗', result.error);
        } else {
            showFeedbackModal('合成失敗', '發生未知錯誤，未能生成怪獸。');
        }
    } catch (error) {
        showFeedbackModal('合成失敗', `請求錯誤: ${error.message}`);
    }
}

// --- Confirmation Modal Action Handler ---
function handleConfirmationActions() {
    // DOMElements.confirmActionBtn 已在 showConfirmationModal 中動態綁定
    DOMElements.cancelActionBtn.addEventListener('click', () => {
        hideModal('confirmation-modal');
    });
}

// --- Cultivation Modal Handlers ---
function handleCultivationModals() {
    DOMElements.startCultivationBtn.addEventListener('click', async () => {
        if (!gameState.cultivationMonsterId) {
            showFeedbackModal('錯誤', '沒有選定要修煉的怪獸。');
            return;
        }
        // 這裡可以添加一個讓玩家選擇修煉時長的輸入框，或者使用預設時長
        // 為了簡化，我們先用一個固定的模擬時長 (例如 10 秒)
        // 在實際應用中，這個時長應該來自玩家輸入或遊戲設定
        const MOCK_CULTIVATION_DURATION_SECONDS = 10; // 模擬10秒修煉
        
        // 更新 gameState
        gameState.cultivationStartTime = Date.now();
        gameState.cultivationDurationSet = MOCK_CULTIVATION_DURATION_SECONDS;

        // 更新農場中怪獸的狀態
        const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === gameState.cultivationMonsterId);
        if (monsterInFarm) {
            monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
            monsterInFarm.farmStatus.isTraining = true;
            monsterInFarm.farmStatus.trainingStartTime = gameState.cultivationStartTime;
            monsterInFarm.farmStatus.trainingDuration = MOCK_CULTIVATION_DURATION_SECONDS * 1000; // 轉為毫秒
            renderMonsterFarm(); // 更新農場UI顯示修煉中
        }
        
        hideModal('cultivation-setup-modal');
        showFeedbackModal(
            '修煉開始！', 
            `怪獸 ${monsterInFarm ? monsterInFarm.nickname : ''} 已開始為期 ${MOCK_CULTIVATION_DURATION_SECONDS} 秒的修煉。請稍後查看成果。`, 
            false,
            null,
            [{ text: '好的', class: 'primary'}]
        );

        // 模擬修煉計時結束後調用完成接口 (實際應用中可能由伺服器推送或玩家手動完成)
        // 這裡我們用 setTimeout 模擬前端觸發
        // setTimeout(async () => {
        //     await handleCompleteCultivation(gameState.cultivationMonsterId, MOCK_CULTIVATION_DURATION_SECONDS);
        // }, MOCK_CULTIVATION_DURATION_SECONDS * 1000);
        // **注意**: 上面的 setTimeout 方式不佳，因為如果用戶關閉頁面，setTimeout 會丟失。
        // 更好的方式是，當玩家下次點擊該怪獸或進入農場時，檢查 trainingStartTime 和 trainingDuration
        // 如果已過期，則調用 completeCultivation。
        // 或者，提供一個“完成修煉”的按鈕。
        // 為了演示，我們將在農場怪獸項目中添加一個“完成修煉”按鈕（如果正在修煉且時間到）。
    });

    DOMElements.closeTrainingResultsBtn.addEventListener('click', () => {
        if (gameState.temporaryBackpack.length > 0) {
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });
    DOMElements.finalCloseTrainingResultsBtn.addEventListener('click', () => {
         if (gameState.temporaryBackpack.length > 0) {
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });

    DOMElements.addAllToTempBackpackBtn.addEventListener('click', () => {
        // 這個按鈕的邏輯應該在 handleCompleteCultivation 成功後，
        // training-results-modal 顯示時，根據 gameState.lastCultivationResult.items 來處理
        // 這裡只是綁定事件，具體實現在 game-logic.js
        addAllCultivationItemsToTempBackpack(); 
        DOMElements.addAllToTempBackpackBtn.disabled = true; // 添加後禁用
        DOMElements.addAllToTempBackpackBtn.textContent = "已加入背包";
    });

    DOMElements.reminderConfirmCloseBtn.addEventListener('click', () => {
        hideModal('reminder-modal');
        hideModal('training-results-modal');
        clearTemporaryBackpack(); // 清空臨時背包，因為用戶選擇放棄
    });
    DOMElements.reminderCancelBtn.addEventListener('click', () => {
        hideModal('reminder-modal'); // 返回修煉成果彈窗
    });
}

// --- Newbie Guide Search Handler ---
function handleNewbieGuideSearch() {
    DOMElements.newbieGuideSearchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value;
        if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
            updateNewbieGuideModal(gameState.gameConfigs.newbie_guide, searchTerm);
        }
    });
}

// --- Friends List Search Handler ---
function handleFriendsListSearch() {
    DOMElements.friendsListSearchInput.addEventListener('input', async (event) => {
        const query = event.target.value.trim();
        if (query.length > 1) { // 至少輸入2個字符才開始搜尋
            try {
                const result = await searchPlayers(query); // api-client.js
                gameState.searchedPlayers = result.players || [];
                updateFriendsListModal(gameState.searchedPlayers);
            } catch (error) {
                console.error("搜尋玩家失敗:", error);
                updateFriendsListModal([]); // 出錯時顯示空列表
            }
        } else if (query.length === 0) {
            updateFriendsListModal([]); // 清空時也清空列表
        }
    });
}

// --- Leaderboard Element Filter Handler ---
function handleMonsterLeaderboardFilter() {
    DOMElements.monsterLeaderboardElementTabs.addEventListener('click', (event) => {
        if (event.target.classList.contains('tab-button')) {
            const filter = event.target.dataset.elementFilter;
            gameState.currentMonsterLeaderboardElementFilter = filter;
            // 更新按鈕的 active 狀態
            DOMElements.monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            // 重新渲染排行榜
            filterAndRenderMonsterLeaderboard();
        }
    });
}

// --- Battle Log Modal Close Handler ---
function handleBattleLogModalClose() {
    DOMElements.closeBattleLogBtn.addEventListener('click', () => {
        hideModal('battle-log-modal');
    });
}

// --- DNA Draw Modal Close Handler ---
function handleDnaDrawModalClose() {
    DOMElements.closeDnaDrawBtn.addEventListener('click', () => {
        hideModal('dna-draw-modal');
    });
    // "加入背包"按鈕的事件委託 (因為按鈕是動態生成的)
    DOMElements.dnaDrawResultsGrid.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-drawn-dna-to-backpack-btn')) {
            const dnaIndex = parseInt(event.target.dataset.dnaIndex, 10);
            // 假設 gameState.lastDnaDrawResult 存有最近一次抽卡結果
            if (gameState.lastDnaDrawResult && gameState.lastDnaDrawResult[dnaIndex]) {
                const dnaTemplate = gameState.lastDnaDrawResult[dnaIndex];
                addDnaToTemporaryBackpack(dnaTemplate); // game-logic.js
                event.target.disabled = true;
                event.target.textContent = '已加入';
            }
        }
    });
}

// --- Official Announcement Modal Close Handler ---
function handleAnnouncementModalClose() {
    DOMElements.closeAnnouncementBtn.addEventListener('click', () => {
        hideModal('official-announcement-modal');
        localStorage.setItem('announcementShown_v1', 'true'); // 標記已顯示，v1是版本號，方便以後更新公告
    });
}


// --- Main Function to Add All Event Listeners ---
function initializeEventListeners() {
    handleModalCloseButtons();
    handleThemeSwitch();
    handleAuthForms();
    handleTopNavButtons();
    handleTabSwitching();

    // DNA 組合按鈕
    DOMElements.combineButton.addEventListener('click', handleCombineDna);

    // 為 DNA 庫存和組合槽的父容器添加拖放事件監聽器 (事件委託)
    const dnaInventoryPanel = DOMElements.inventoryItemsContainer.closest('.panel') || document.body; // 向上找到 panel 或 body
    
    dnaInventoryPanel.addEventListener('dragstart', handleDragStart);
    dnaInventoryPanel.addEventListener('dragend', handleDragEnd);
    dnaInventoryPanel.addEventListener('dragover', handleDragOver);
    dnaInventoryPanel.addEventListener('dragleave', handleDragLeave);
    dnaInventoryPanel.addEventListener('drop', handleDrop);
    
    // 確保組合槽也能正確處理 drop
    DOMElements.dnaCombinationSlotsContainer.addEventListener('dragover', handleDragOver); // 需要單獨為組合槽容器也加上，因為它可能不是 inventoryPanel 的直接子元素
    DOMElements.dnaCombinationSlotsContainer.addEventListener('dragleave', handleDragLeave);
    DOMElements.dnaCombinationSlotsContainer.addEventListener('drop', handleDrop);


    handleConfirmationActions();
    handleCultivationModals();
    handleNewbieGuideSearch();
    handleFriendsListSearch();
    handleMonsterLeaderboardFilter();
    handleBattleLogModalClose();
    handleDnaDrawModalClose();
    handleAnnouncementModalClose();

    console.log("All event listeners initialized.");
}

// 導出 (如果使用 ES6 模塊)
// export { initializeEventListeners, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop, handleChallengeMonsterClick, handleCultivateMonsterClick, handleReleaseMonsterClick, handleCompleteCultivation, handleMoveFromTempBackpackToInventory, handleDrawDNAClick };
// 注意: 很多 handleXXXClick 函數會在 game-logic.js 中定義，因為它們涉及核心遊戲邏輯。
// event-handlers.js 主要負責綁定和初步的事件攔截。
