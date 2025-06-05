// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js), gameState (來自 game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

// --- Drag and Drop Handlers for DNA ---
let draggedDnaElement = null; // 用於存儲被拖動的 DNA 元素

function handleDragStart(event) {
    const target = event.target;
    // 確保拖曳的是 .dna-item (庫存中的) 或 .dna-slot.occupied (組合槽中已佔用的)
    if (target.classList.contains('dna-item') || (target.classList.contains('dna-slot') && target.classList.contains('occupied'))) {
        draggedDnaElement = target;
        // dataTransfer 中可以儲存多種資訊，這裡以 dna-id 為主，方便查找
        // 如果是從組合槽拖曳，slot-index 也很重要
        event.dataTransfer.setData('text/plain', target.dataset.dnaId || `slot:${target.dataset.slotIndex}`);
        event.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { // 延遲添加 dragging class 以避免閃爍或拖曳圖像問題
            if (draggedDnaElement) draggedDnaElement.classList.add('dragging');
        }, 0);
    } else {
        event.preventDefault(); // 如果不是可拖曳元素，則阻止拖曳行為
    }
}

function handleDragEnd(event) {
    if (draggedDnaElement) {
        draggedDnaElement.classList.remove('dragging');
        draggedDnaElement = null;
    }
    // 清除所有目標元素上的 drag-over 樣式
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(event) {
    event.preventDefault(); // 必須阻止默認行為才能觸發 drop 事件
    event.dataTransfer.dropEffect = 'move';

    // 為有效的放置目標添加視覺回饋
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items');
    if (target) {
        // 清除之前可能存在的 drag-over
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        target.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items');
    if (target) {
        target.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    if (!draggedDnaElement) {
        handleDragEnd(event);
        return;
    }

    const targetElement = event.target.closest('.dna-slot, #inventory-items, #inventory-delete-slot, .temp-backpack-slot, .inventory-slot-empty');
    if (!targetElement) {
        console.log("無效的放置目標");
        handleDragEnd(event);
        return;
    }

    targetElement.classList.remove('drag-over');

    const sourceDnaInstanceId = draggedDnaElement.dataset.dnaId; // 來源 DNA 的實例 ID (如果從庫存拖曳)
    const sourceIsFromCombinationSlot = draggedDnaElement.classList.contains('dna-slot');
    const sourceSlotIndex = sourceIsFromCombinationSlot ? parseInt(draggedDnaElement.dataset.slotIndex, 10) : null;

    // 情況1: 拖曳到刪除區
    if (targetElement.id === 'inventory-delete-slot') {
        let itemNameToDelete = "該DNA";
        let dnaInstanceToDelete = null; // 這是 DNA 實例的 ID (來自庫存的唯一標識)

        if (sourceIsFromCombinationSlot && sourceSlotIndex !== null) { // 從組合槽拖到刪除區
            const dnaInSlot = gameState.dnaCombinationSlots[sourceSlotIndex];
            if (dnaInSlot) {
                itemNameToDelete = dnaInSlot.name || "組合槽中的DNA";
                dnaInstanceToDelete = dnaInSlot.id; // 獲取組合槽中DNA的實例ID

                showConfirmationModal('確認刪除', `您確定要從組合槽移除並永久刪除 DNA "${itemNameToDelete}" 嗎？此操作無法復原。`, () => {
                    gameState.dnaCombinationSlots[sourceSlotIndex] = null; // 從組合槽移除
                    if (dnaInstanceToDelete) { // 如果這個DNA是來自庫存的實例 (有唯一的id)
                        deleteDNAFromInventory(dnaInstanceToDelete); // 從庫存中也永久刪除
                        renderPlayerDNAInventory(); // 更新庫存UI
                    }
                    renderDNACombinationSlots(); // 更新組合槽UI
                    updateMonsterSnapshot(getSelectedMonster() || null);
                    showFeedbackModal('操作成功', `DNA "${itemNameToDelete}" 已被移除並永久刪除。`);
                });
            }
        } else if (sourceDnaInstanceId) { // 從庫存直接拖到刪除區
            const dnaFromInventory = gameState.playerData.playerOwnedDNA.find(d => d.id === sourceDnaInstanceId);
            if (dnaFromInventory) {
                itemNameToDelete = dnaFromInventory.name || "庫存中的DNA";
                dnaInstanceToDelete = sourceDnaInstanceId;
                showConfirmationModal('確認刪除', `您確定要永久刪除 DNA 碎片 "${itemNameToDelete}" 嗎？此操作無法復原。`, () => {
                    deleteDNAFromInventory(dnaInstanceToDelete);
                    renderPlayerDNAInventory();
                    showFeedbackModal('操作成功', `DNA 碎片 "${itemNameToDelete}" 已被刪除。`);
                });
            }
        }
    }
    // 情況2: 拖曳到一個組合槽
    else if (targetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(targetElement.dataset.slotIndex, 10);
        let draggedDnaObject = null;

        if (sourceIsFromCombinationSlot && sourceSlotIndex !== null) { // 從一個組合槽拖到另一個組合槽
            if (sourceSlotIndex === targetSlotIndex) { // 拖到自身，不處理
                handleDragEnd(event);
                return;
            }
            draggedDnaObject = gameState.dnaCombinationSlots[sourceSlotIndex]; // 獲取實際的DNA物件
            if (draggedDnaObject) {
                moveDnaToCombinationSlot(draggedDnaObject, sourceSlotIndex, targetSlotIndex);
            }
        } else if (sourceDnaInstanceId) { // 從庫存拖到組合槽
            draggedDnaObject = gameState.playerData.playerOwnedDNA.find(d => d.id === sourceDnaInstanceId);
            if (draggedDnaObject) {
                // 當從庫存拖曳到組合槽時，我們傳遞 DNA 物件的副本（或引用，取決於後續操作是否修改）
                // 來源槽索引為 null，表示不是從其他組合槽來的
                moveDnaToCombinationSlot({ ...draggedDnaObject }, null, targetSlotIndex);
            }
        }
    }
    // 情況3: 從組合槽拖曳回 DNA 庫存區 (整個 #inventory-items 或空的 .inventory-slot-empty)
    else if ((targetElement.id === 'inventory-items' || targetElement.classList.contains('inventory-slot-empty')) && sourceIsFromCombinationSlot && sourceSlotIndex !== null) {
        const dnaToReturn = gameState.dnaCombinationSlots[sourceSlotIndex];
        if (dnaToReturn) {
            // 僅從組合槽中移除，物品本身仍在 playerOwnedDNA 中 (如果它原本是從庫存來的)
            // 如果這個 DNA 是合成出來的、尚未保存到後端或沒有唯一實例ID的，那它就消失了
            // 目前的邏輯是，放入組合槽的都是 playerOwnedDNA 的副本/引用
            gameState.dnaCombinationSlots[sourceSlotIndex] = null;
            renderDNACombinationSlots();
            updateMonsterSnapshot(getSelectedMonster() || null); // 更新怪獸快照的身體部位顯示
            showFeedbackModal('提示', `已從組合槽移除 DNA "${dnaToReturn.name}"。它仍保留在您的庫存中 (如果它來自庫存)。`);
            // 庫存UI會自動顯示所有 playerOwnedDNA，所以不需要特別"添加"回去
        }
    }
    // 其他情況 (例如從庫存拖到庫存 - 暫不實現複雜的庫存內排序)
    // 從臨時背包拖曳 (暫不實現，臨時背包物品通過點擊移動)
    else {
        console.log("未處理的拖放目標或來源:", {
            source: sourceIsFromCombinationSlot ? `combination[${sourceSlotIndex}]` : `inventory[${sourceDnaInstanceId}]`,
            targetId: targetElement.id,
            targetClass: targetElement.className
        });
    }

    handleDragEnd(event);
}


// --- Modal Close Button Handler ---
function handleModalCloseButtons() {
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId || button.closest('.modal')?.id;
            if (modalId) {
                // 檢查是否為修煉成果彈窗，並且是否有未領取的物品
                if (modalId === 'training-results-modal' && gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained && gameState.lastCultivationResult.items_obtained.length > 0) {
                     // 這裡的條件是基於 gameState.lastCultivationResult.items_obtained 是否還有物品
                    showModal('reminder-modal');
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
                await registerUser(nickname, password); // auth.js
                // 登入成功後，onAuthStateChanged 會處理後續 UI 更新
                hideModal('register-modal');
                // hideModal('feedback-modal'); // onAuthStateChanged 處理完畢後 feedback modal 會自動關閉
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
                await loginUser(nickname, password); // auth.js
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
                await logoutUser(); // auth.js
                // onAuthStateChanged 會處理登出後的 UI 清理
                // hideAllModals(); // onAuthStateChanged 應該會處理
                // setTimeout(() => { // 確保 feedback-modal 有時間顯示
                //     if (!gameState.currentUser) { // 再次確認已登出
                //          showFeedbackModal('登出成功', '您已成功登出。期待您的下次異世界冒險！');
                //     }
                // }, 300);
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
                const monster = getSelectedMonster(); // game-state.js
                if (monster) {
                    updateMonsterInfoModal(monster, gameState.gameConfigs); // ui.js
                    showModal('monster-info-modal'); // ui.js
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
            if (gameState.playerData && gameState.currentUser) { // 確保玩家已登入且有資料
                updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs); // ui.js
                showModal('player-info-modal'); // ui.js
            } else {
                showFeedbackModal('錯誤', '無法載入玩家資訊，請先登入。');
            }
        });
    }

    if (DOMElements.showMonsterLeaderboardBtn) {
        DOMElements.showMonsterLeaderboardBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('載入中...', '正在獲取怪獸排行榜...', true);
                const leaderboardData = await getMonsterLeaderboard(20); // api-client.js
                gameState.monsterLeaderboard = leaderboardData; // game-state.js

                let elementsForTabs = ['all']; // 預設
                if (gameState.gameConfigs && gameState.gameConfigs.element_nicknames) { // 從設定檔獲取元素列表
                    elementsForTabs = ['all', ...Object.keys(gameState.gameConfigs.element_nicknames)];
                }
                updateMonsterLeaderboardElementTabs(elementsForTabs); // ui.js
                filterAndRenderMonsterLeaderboard(); // game-logic.js (包含排序和渲染)
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
                const leaderboardData = await getPlayerLeaderboard(20); // api-client.js
                gameState.playerLeaderboard = leaderboardData; // game-state.js
                // updateLeaderboardTable('player', leaderboardData); // ui.js - 改由 sortAndRenderLeaderboard 內部調用
                sortAndRenderLeaderboard('player'); // game-logic.js
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
                updateNewbieGuideModal(gameState.gameConfigs.newbie_guide); // ui.js
                if(DOMElements.newbieGuideSearchInput) DOMElements.newbieGuideSearchInput.value = ''; // 清空搜尋框
                showModal('newbie-guide-modal');
            } else {
                showFeedbackModal('錯誤', '新手指南尚未載入。');
            }
        });
    }

    if (DOMElements.friendsListBtn) {
        DOMElements.friendsListBtn.addEventListener('click', () => {
            updateFriendsListModal([]); // 預設顯示空列表 ui.js
            if(DOMElements.friendsListSearchInput) DOMElements.friendsListSearchInput.value = ''; // 清空搜尋框
            showModal('friends-list-modal');
        });
    }
}

// --- Tab Switching Handler ---
function handleTabSwitching() {
    if (DOMElements.dnaFarmTabs) {
        DOMElements.dnaFarmTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                switchTabContent(targetTabId, event.target); // ui.js
            }
        });
    }

    if (DOMElements.monsterInfoTabs) {
        DOMElements.monsterInfoTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                switchTabContent(targetTabId, event.target, 'monster-info-modal'); // ui.js, 傳入父 modal ID
            }
        });
    }
}

// --- DNA Combination Handler ---
async function handleCombineDna() {
    const dnaBaseIdsForCombination = gameState.dnaCombinationSlots
        .filter(slot => slot && slot.baseId) // 確保 slot 不為空且有 baseId (模板ID)
        .map(slot => slot.baseId);

    if (dnaBaseIdsForCombination.length < 2) {
        showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        const result = await combineDNA(dnaBaseIdsForCombination); // api-client.js

        if (result && result.id) { // 成功合成
            const newMonster = result;
            // refreshPlayerData 會更新農場列表和玩家統計
            await refreshPlayerData(); // game-logic.js

            resetDNACombinationSlots(); // game-state.js (包含渲染)
            // renderDNACombinationSlots(); // ui.js (已在 resetDNACombinationSlots 中調用)
            // updateMonsterSnapshot(newMonster); // ui.js, 讓新怪獸成為焦點

            let feedbackMessage = `🎉 成功合成了新的怪獸：<strong>${newMonster.nickname}</strong>！<br>`;
            feedbackMessage += `屬性: ${newMonster.elements.join(', ')}, 稀有度: ${newMonster.rarity}<br>`;
            feedbackMessage += `HP: ${newMonster.hp}, 攻擊: ${newMonster.attack}, 防禦: ${newMonster.defense}, 速度: ${newMonster.speed}, 爆擊: ${newMonster.crit}%`;
            if (result.farm_full_warning) { // 後端可能返回農場已滿的警告
                feedbackMessage += `<br><strong class="text-[var(--warning-color)]">${result.farm_full_warning}</strong> 請至農場管理。`;
            }

            showFeedbackModal(
                '合成成功！',
                feedbackMessage,
                false,
                null, // monsterDetails
                [{ text: '查看新怪獸', class: 'primary', onClick: () => {
                    gameState.selectedMonsterId = newMonster.id; // 選中新怪獸
                    updateMonsterSnapshot(newMonster); // 更新快照
                    // 可以考慮切換到農場頁面
                    if (DOMElements.dnaFarmTabs && typeof switchTabContent === 'function') {
                        const monsterFarmTabButton = DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="monster-farm-content"]');
                        if(monsterFarmTabButton) switchTabContent('monster-farm-content', monsterFarmTabButton);
                    }
                }}, { text: '關閉', class: 'secondary'}]
            );

        } else if (result && result.error) { // 後端明確返回錯誤
            showFeedbackModal('合成失敗', result.error);
        } else { // 未知錯誤或未生成怪獸
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

// --- Confirmation Modal Action Handler ---
function handleConfirmationActions() {
    // DOMElements.confirmActionBtn 的事件監聽器是在 showConfirmationModal 中動態綁定的
    // DOMElements.cancelActionBtn (如果存在) 的處理可以放在這裡或 showConfirmationModal
    // 目前的 DOMElements 沒有 cancelActionBtn，關閉是透過 modal-close
}

// --- Cultivation Modal Handlers ---
function handleCultivationModals() {
    if (DOMElements.startCultivationBtn) {
        DOMElements.startCultivationBtn.addEventListener('click', async () => {
            if (!gameState.cultivationMonsterId) {
                showFeedbackModal('錯誤', '沒有選定要修煉的怪獸。');
                return;
            }
            // 假設修煉時長由後端決定或是一個固定值 (前端僅觸發開始)
            // 這裡可以模擬一個前端設定時長，但實際後端邏輯更重要
            const MOCK_CULTIVATION_DURATION_SECONDS = gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 10; // 從設定讀取或預設

            gameState.cultivationStartTime = Date.now();
            gameState.cultivationDurationSet = MOCK_CULTIVATION_DURATION_SECONDS;

            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === gameState.cultivationMonsterId);
            if (monsterInFarm) {
                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = true;
                monsterInFarm.farmStatus.trainingStartTime = gameState.cultivationStartTime; // 記錄開始時間戳 (毫秒)
                monsterInFarm.farmStatus.trainingDuration = MOCK_CULTIVATION_DURATION_SECONDS * 1000; // 記錄時長 (毫秒)
                renderMonsterFarm(); // 更新農場UI顯示狀態
            }

            hideModal('cultivation-setup-modal');
            showFeedbackModal(
                '修煉開始！',
                `怪獸 ${monsterInFarm ? monsterInFarm.nickname : ''} 已開始為期 ${MOCK_CULTIVATION_DURATION_SECONDS} 秒的修煉。請稍後在農場列表查看成果。`,
                false,
                null,
                [{ text: '好的', class: 'primary'}]
            );

            // 修煉完成的處理將由農場列表中的怪獸狀態變化觸發 (例如點擊"完成修煉"按鈕)
            // 或輪詢檢查 (較不推薦)
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
            addAllCultivationItemsToTempBackpack(); // game-logic.js
            // 按鈕狀態已在 addAllCultivationItemsToTempBackpack 中處理
        });
    }

    if (DOMElements.reminderConfirmCloseBtn) DOMElements.reminderConfirmCloseBtn.addEventListener('click', () => {
        hideModal('reminder-modal');
        hideModal('training-results-modal');
        clearTemporaryBackpack(); // game-logic.js, 清空臨時背包如果用戶選擇放棄物品
    });
    if (DOMElements.reminderCancelBtn) DOMElements.reminderCancelBtn.addEventListener('click', () => {
        hideModal('reminder-modal'); // 僅關閉提醒，允許用戶返回處理物品
    });
}

// --- Newbie Guide Search Handler ---
function handleNewbieGuideSearch() {
    if (DOMElements.newbieGuideSearchInput) {
        DOMElements.newbieGuideSearchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
                updateNewbieGuideModal(gameState.gameConfigs.newbie_guide, searchTerm); // ui.js
            }
        });
    }
}

// --- Friends List Search Handler ---
function handleFriendsListSearch() {
   if (DOMElements.friendsListSearchInput) {
        DOMElements.friendsListSearchInput.addEventListener('input', async (event) => {
            const query = event.target.value.trim();
            if (query.length > 1) { // 至少輸入2個字元才開始搜尋
                try {
                    const result = await searchPlayers(query); // api-client.js
                    gameState.searchedPlayers = result.players || []; // game-state.js
                    updateFriendsListModal(gameState.searchedPlayers); // ui.js
                } catch (error) {
                    console.error("搜尋玩家失敗:", error);
                    updateFriendsListModal([]); // 出錯時顯示空列表
                }
            } else if (query.length === 0) {
                updateFriendsListModal([]); // 清空時也清空結果
            }
        });
   }
}

// --- Leaderboard Element Filter Handler ---
function handleMonsterLeaderboardFilter() {
    if (DOMElements.monsterLeaderboardElementTabs) {
        DOMElements.monsterLeaderboardElementTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const filter = event.target.dataset.elementFilter;
                gameState.currentMonsterLeaderboardElementFilter = filter; // game-state.js
                DOMElements.monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                filterAndRenderMonsterLeaderboard(); // game-logic.js
            }
        });
    }
}

// --- Leaderboard Sorting Handler ---
function handleLeaderboardSorting() {
    const tables = [DOMElements.monsterLeaderboardTable, DOMElements.playerLeaderboardTable];
    tables.forEach(table => {
        if (table) {
            const headerRow = table.querySelector('thead tr'); // 直接獲取 thead 下的 tr
            if (headerRow) {
                headerRow.addEventListener('click', (event) => {
                    const th = event.target.closest('th'); // 確保點擊的是 th 或其子元素
                    if (!th || !th.dataset.sortKey) return; // 如果點擊的不是可排序的表頭，則忽略

                    const sortKey = th.dataset.sortKey;
                    const tableType = table.id.includes('monster') ? 'monster' : 'player';

                    let currentSortConfig = gameState.leaderboardSortConfig?.[tableType] || {};
                    let newSortOrder = 'desc'; // 預設降序，如果當前是降序，則切換為升序
                    if (currentSortConfig.key === sortKey && currentSortConfig.order === 'desc') {
                        newSortOrder = 'asc';
                    } else if (currentSortConfig.key === sortKey && currentSortConfig.order === 'asc') {
                        newSortOrder = 'desc'; // 再次點擊則變回降序
                    }
                    // 如果是新的排序鍵，預設為 desc

                    gameState.leaderboardSortConfig = { // game-state.js
                        ...gameState.leaderboardSortConfig,
                        [tableType]: { key: sortKey, order: newSortOrder }
                    };

                    sortAndRenderLeaderboard(tableType); // game-logic.js
                    updateLeaderboardSortIcons(table, sortKey, newSortOrder); // ui.js
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
    if (DOMElements.dnaDrawButton) DOMElements.dnaDrawButton.addEventListener('click', handleDrawDNAClick); // game-logic.js

    if (DOMElements.dnaDrawResultsGrid) {
        DOMElements.dnaDrawResultsGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('add-drawn-dna-to-backpack-btn')) {
                const dnaIndex = parseInt(event.target.dataset.dnaIndex, 10);
                if (gameState.lastDnaDrawResult && gameState.lastDnaDrawResult[dnaIndex]) {
                    const dnaTemplate = gameState.lastDnaDrawResult[dnaIndex];
                    addDnaToTemporaryBackpack(dnaTemplate); // game-logic.js
                    event.target.disabled = true;
                    event.target.textContent = '已加入';
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
    handleLeaderboardSorting();

    if (DOMElements.combineButton) DOMElements.combineButton.addEventListener('click', handleCombineDna);

    // 為遊戲主容器（或更精確的拖放區域容器）添加拖放事件監聽器
    // 這裡我們假設 DOMElements.gameContainer 是包含所有拖放交互區域的頂層元素
    // 如果不是，需要選擇更合適的父容器，或者為每個拖放區域單獨添加
    const dragDropContext = DOMElements.gameContainer || document.body;

    dragDropContext.addEventListener('dragstart', handleDragStart);
    dragDropContext.addEventListener('dragend', handleDragEnd);

    // 為了更精確地控制 dragover 和 dragleave 的視覺效果，
    // 最好將這些事件監聽器綁定到所有可能的放置目標上。
    // 但為了簡化，如果所有放置目標都在一個共同父級下，也可以綁定到父級並在內部判斷。
    // 此處，我們為特定區域（組合槽、庫存區、刪除區）添加，以確保 classList 操作的準確性。

    // 組合槽區域
    if (DOMElements.dnaCombinationSlotsContainer) {
        DOMElements.dnaCombinationSlotsContainer.addEventListener('dragover', handleDragOver);
        DOMElements.dnaCombinationSlotsContainer.addEventListener('dragleave', handleDragLeave);
        DOMElements.dnaCombinationSlotsContainer.addEventListener('drop', handleDrop);
    }
    // 庫存物品區域 (包括空槽)
    if (DOMElements.inventoryItemsContainer) {
        DOMElements.inventoryItemsContainer.addEventListener('dragover', handleDragOver);
        DOMElements.inventoryItemsContainer.addEventListener('dragleave', handleDragLeave);
        DOMElements.inventoryItemsContainer.addEventListener('drop', handleDrop);
    }
    // 刪除區域
    const deleteSlot = document.getElementById('inventory-delete-slot');
    if (deleteSlot) {
        deleteSlot.addEventListener('dragover', handleDragOver);
        deleteSlot.addEventListener('dragleave', handleDragLeave);
        deleteSlot.addEventListener('drop', handleDrop);
    }
    // 臨時背包區域 (如果也允許拖放)
    if (DOMElements.temporaryBackpackContainer) {
        DOMElements.temporaryBackpackContainer.addEventListener('dragover', handleDragOver);
        DOMElements.temporaryBackpackContainer.addEventListener('dragleave', handleDragLeave);
        DOMElements.temporaryBackpackContainer.addEventListener('drop', handleDrop);
    }


    handleConfirmationActions();
    handleCultivationModals();
    handleNewbieGuideSearch();
    handleFriendsListSearch();
    handleMonsterLeaderboardFilter();
    handleBattleLogModalClose();
    handleDnaDrawModal();
    handleAnnouncementModalClose();

    console.log("All event listeners initialized with updated drag-drop logic.");
}

