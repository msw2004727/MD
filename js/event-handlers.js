// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js -> 應該從 main.js 傳入或全局獲取),
// gameState (來自 game-state.js), api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

// --- 確保 DOMElements 和 gameState 被正確訪問 ---
// 假設 DOMElements 和 gameState 已經在 main.js 中初始化並可全局訪問
// 或者通過某種方式注入到此模塊中。
// 為了簡化，我們這裡假設它們是全局可訪問的，或者依賴 main.js 的正確初始化。

// --- Drag and Drop Handlers for DNA ---
let draggedDnaElement = null; // 用於存儲被拖動的 DNA 元素

function handleDragStart(event) {
    const target = event.target;
    // 確保只允許 .dna-item 或已佔用的 .dna-slot 被拖動
    if (target.classList.contains('dna-item') || (target.classList.contains('dna-slot') && target.classList.contains('occupied'))) {
        draggedDnaElement = target;
        // 優先使用 dataset.dnaId (實例ID)，其次是 dataset.dnaBaseId (模板ID)，最後是文本內容
        const dnaIdentifier = target.dataset.dnaId || target.dataset.dnaBaseId || target.textContent.trim();
        event.dataTransfer.setData('text/plain', dnaIdentifier);
        event.dataTransfer.effectAllowed = 'move';
        target.dataset.sourceType = target.closest('#inventory-items') ? 'inventory' : (target.closest('#dna-combination-slots') ? 'combination' : 'unknown');

        // 為了防止拖曳時元素消失（某些瀏覽器行為），可以延遲添加 dragging class
        setTimeout(() => {
            if (draggedDnaElement) draggedDnaElement.classList.add('dragging');
        }, 0);
    } else {
        event.preventDefault(); // 不是可拖曳元素
    }
}

function handleDragEnd(event) {
    if (draggedDnaElement) {
        draggedDnaElement.classList.remove('dragging');
        delete draggedDnaElement.dataset.sourceType; // 清理自定義屬性
        draggedDnaElement = null;
    }
    // 清理所有可能的 drag-over 狀態
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(event) {
    event.preventDefault(); // 必須阻止默認行為以允許放置
    event.dataTransfer.dropEffect = 'move';
    // 將 drag-over 狀態應用到最接近的有效放置目標
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items');
    if (target) {
        // 避免重複添加，如果已經有就不再操作，除非是不同的目標
        const currentDragOver = document.querySelector('.drag-over');
        if (currentDragOver && currentDragOver !== target) {
            currentDragOver.classList.remove('drag-over');
        }
        target.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    // 當鼠標離開一個元素時，檢查它是否真的是拖曳目標的一部分
    const relatedTarget = event.relatedTarget;
    const currentTarget = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items');

    if (currentTarget && (!relatedTarget || !currentTarget.contains(relatedTarget))) {
        currentTarget.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    if (!draggedDnaElement) {
        handleDragEnd(event); // 清理
        return;
    }

    const targetElement = event.target.closest('.dna-slot, #inventory-items, #inventory-delete-slot, .temp-backpack-slot, .inventory-slot-empty');

    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); // 清理所有 drag-over

    if (!targetElement) {
        handleDragEnd(event); // 清理
        return;
    }

    const dnaInstanceId = draggedDnaElement.dataset.dnaId; // 實例ID，主要用於從庫存拖曳
    const draggedDnaBaseId = draggedDnaElement.dataset.dnaBaseId; // 模板ID，主要用於合成槽中的DNA
    const sourceIsInventory = draggedDnaElement.dataset.sourceType === 'inventory';
    const sourceIsCombinationSlot = draggedDnaElement.dataset.sourceType === 'combination';

    const sourceSlotIndexAttr = draggedDnaElement.closest('.dna-slot')?.dataset.slotIndex; // 如果從組合槽拖出
    const sourceSlotIndex = sourceSlotIndexAttr !== undefined ? parseInt(sourceSlotIndexAttr, 10) : null;

    let draggedDnaObject = null; // 如果從組合槽拖曳，這是該槽中的 DNA 物件
    if (sourceIsCombinationSlot && sourceSlotIndex !== null && window.gameState.dnaCombinationSlots[sourceSlotIndex]) {
        draggedDnaObject = window.gameState.dnaCombinationSlots[sourceSlotIndex];
    }


    if (targetElement.id === 'inventory-delete-slot') {
        // 處理拖曳到刪除區
        if (sourceIsInventory && dnaInstanceId) {
            window.ui.showConfirmationModal('確認刪除', `您確定要永久刪除 DNA 碎片 "${draggedDnaElement.textContent.trim()}" 嗎？此操作無法復原。`, () => {
                window.gameLogic.deleteDNAFromInventory(dnaInstanceId); // 調用 gameLogic 中的函數
                window.ui.renderPlayerDNAInventory(window.gameState.playerData.playerOwnedDNA);
                window.ui.showFeedbackModal('操作成功', `DNA 碎片 "${draggedDnaElement.textContent.trim()}" 已被刪除。`);
            });
        } else if (sourceIsCombinationSlot && sourceSlotIndex !== null) {
            window.gameState.dnaCombinationSlots[sourceSlotIndex] = null; // 清空來源槽
            window.ui.renderDNACombinationSlots(window.gameState.dnaCombinationSlots);
            window.ui.showFeedbackModal('操作成功', `已從組合槽移除 DNA。`);
        }
    } else if (targetElement.classList.contains('dna-slot')) {
        // 拖曳到組合槽
        const targetSlotIndex = parseInt(targetElement.dataset.slotIndex, 10);
        if (sourceIsInventory && dnaInstanceId) {
            // 從庫存拖曳到組合槽
            window.gameLogic.moveDnaToCombinationSlot(dnaInstanceId, null, 'inventory', null, targetSlotIndex);
        } else if (sourceIsCombinationSlot && draggedDnaObject && sourceSlotIndex !== null) {
            // 從一個組合槽拖曳到另一個組合槽
            window.gameLogic.moveDnaToCombinationSlot(null, draggedDnaObject, 'combination', sourceSlotIndex, targetSlotIndex);
        }
    } else if ((targetElement.id === 'inventory-items' || targetElement.classList.contains('inventory-slot-empty')) && sourceIsCombinationSlot && sourceSlotIndex !== null) {
        // 從組合槽拖曳回 DNA 庫存 (概念上是清空該組合槽)
        if (window.gameState.dnaCombinationSlots[sourceSlotIndex]) {
            window.gameState.dnaCombinationSlots[sourceSlotIndex] = null;
            window.ui.renderDNACombinationSlots(window.gameState.dnaCombinationSlots);
            window.ui.showFeedbackModal('提示', '已從組合槽移除 DNA。物品未返回庫存。');
        }
    }

    handleDragEnd(event); // 最後清理
}


// --- Modal Close Button Handler ---
function handleModalCloseButtons() {
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId || button.closest('.modal')?.id;
            if (modalId) {
                if (modalId === 'training-results-modal' && window.gameState.temporaryBackpack.length > 0) {
                    window.ui.showModal('reminder-modal');
                } else {
                    window.ui.hideModal(modalId);
                }
            }
        });
    });
}


// --- Theme Switcher Handler ---
function handleThemeSwitch() {
    if (window.DOMElements.themeSwitcherBtn) {
        window.DOMElements.themeSwitcherBtn.addEventListener('click', () => {
            const newTheme = window.gameState.currentTheme === 'dark' ? 'light' : 'dark';
            window.ui.updateTheme(newTheme); // 假設 updateTheme 在 ui.js 中
        });
    }
}

// --- Auth Form Handlers & Logout ---
function handleAuthForms() {
    if (window.DOMElements.showRegisterFormBtn) window.DOMElements.showRegisterFormBtn.addEventListener('click', () => window.ui.showModal('register-modal'));
    if (window.DOMElements.showLoginFormBtn) window.DOMElements.showLoginFormBtn.addEventListener('click', () => window.ui.showModal('login-modal'));

    if (window.DOMElements.registerSubmitBtn) {
        window.DOMElements.registerSubmitBtn.addEventListener('click', async () => {
            const nickname = window.DOMElements.registerNicknameInput.value.trim();
            const password = window.DOMElements.registerPasswordInput.value;
            window.DOMElements.registerErrorMsg.textContent = '';
            if (!nickname || !password) {
                window.DOMElements.registerErrorMsg.textContent = '暱稱和密碼不能為空。';
                return;
            }
            try {
                window.ui.showFeedbackModal('註冊中...', '正在為您創建帳號，請稍候...', true);
                await window.auth.registerUser(nickname, password); // 使用 auth 模塊的函數
                window.ui.hideModal('register-modal');
                // 註冊成功後，Auth 狀態監聽器會處理後續流程
            } catch (error) {
                window.DOMElements.registerErrorMsg.textContent = error.message; // error 已經是映射後的
                window.ui.hideModal('feedback-modal');
            }
        });
    }

    if (window.DOMElements.loginSubmitBtn) {
        window.DOMElements.loginSubmitBtn.addEventListener('click', async () => {
            const nickname = window.DOMElements.loginNicknameInput.value.trim();
            const password = window.DOMElements.loginPasswordInput.value;
            window.DOMElements.loginErrorMsg.textContent = '';
            if (!nickname || !password) {
                window.DOMElements.loginErrorMsg.textContent = '暱稱和密碼不能為空。';
                return;
            }
            try {
                window.ui.showFeedbackModal('登入中...', '正在驗證您的身份，請稍候...', true);
                await window.auth.loginUser(nickname, password); // 使用 auth 模塊的函數
                window.ui.hideModal('login-modal');
                // 登入成功後，Auth 狀態監聽器會處理後續流程
            } catch (error) {
                window.DOMElements.loginErrorMsg.textContent = error.message; // error 已經是映射後的
                window.ui.hideModal('feedback-modal');
            }
        });
    }

    if (window.DOMElements.mainLogoutBtn) {
        window.DOMElements.mainLogoutBtn.addEventListener('click', async () => {
            try {
                window.ui.showFeedbackModal('登出中...', '正在安全登出...', true);
                await window.auth.logoutUser(); // 使用 auth 模塊的函數
                // Auth 狀態監聽器會處理UI更新和狀態重置
                // 但這裡可以立即給予一個成功的提示
                setTimeout(() => {
                    if (!window.gameState.currentUser) { // 確認已登出
                         window.ui.showFeedbackModal('登出成功', '您已成功登出。期待您的下次異世界冒險！');
                    }
                }, 300); // 給一點時間讓 auth 狀態改變
            } catch (error) {
                window.ui.hideModal('feedback-modal');
                window.ui.showFeedbackModal('登出失敗', `登出時發生錯誤: ${error.message}`);
            }
        });
    }
}

// --- Top Navigation Button Handlers ---
function handleTopNavButtons() {
    if (window.DOMElements.monsterInfoButton) {
        window.DOMElements.monsterInfoButton.addEventListener('click', () => {
            if (window.gameState.selectedMonsterId) {
                const monster = window.gameStateManager.getSelectedMonster();
                if (monster) {
                    window.ui.updateMonsterInfoModal(monster, window.gameState.gameConfigs);
                    window.ui.showModal('monster-info-modal');
                } else {
                    window.ui.showFeedbackModal('錯誤', '找不到選定的怪獸資料。');
                }
            } else {
                window.ui.showFeedbackModal('提示', '請先在農場選擇一隻怪獸。');
            }
        });
    }

    if (window.DOMElements.playerInfoButton) {
        window.DOMElements.playerInfoButton.addEventListener('click', () => {
            if (window.gameState.playerData) {
                window.ui.updatePlayerInfoModal(window.gameState.playerData, window.gameState.gameConfigs);
                window.ui.showModal('player-info-modal');
            } else {
                window.ui.showFeedbackModal('錯誤', '無法載入玩家資訊。');
            }
        });
    }

    if (window.DOMElements.showMonsterLeaderboardBtn) {
        window.DOMElements.showMonsterLeaderboardBtn.addEventListener('click', async () => {
            try {
                window.ui.showFeedbackModal('載入中...', '正在獲取怪獸排行榜...', true);
                const leaderboardData = await window.apiClient.getMonsterLeaderboard(20); // 使用 apiClient 模塊
                window.gameStateManager.updateGameState({ monsterLeaderboard: leaderboardData });


                let elementsForTabs = ['all'];
                 if (window.gameState.gameConfigs && window.gameState.gameConfigs.element_nicknames) {
                    elementsForTabs = ['all', ...Object.keys(window.gameState.gameConfigs.element_nicknames)];
                } else if (window.gameState.gameConfigs && window.gameState.gameConfigs.skills) {
                     const skillElements = new Set();
                     Object.keys(window.gameState.gameConfigs.skills).forEach(el => skillElements.add(el));
                     elementsForTabs = ['all', ...Array.from(skillElements)];
                }
                window.ui.updateMonsterLeaderboardElementTabs(elementsForTabs);
                window.gameLogic.filterAndRenderMonsterLeaderboard(); // 使用 gameLogic 模塊
                window.ui.hideModal('feedback-modal');
                window.ui.showModal('monster-leaderboard-modal');
            } catch (error) {
                window.ui.showFeedbackModal('載入失敗', `無法獲取怪獸排行榜: ${error.message}`);
            }
        });
    }

    if (window.DOMElements.showPlayerLeaderboardBtn) {
        window.DOMElements.showPlayerLeaderboardBtn.addEventListener('click', async () => {
            try {
                window.ui.showFeedbackModal('載入中...', '正在獲取玩家排行榜...', true);
                const leaderboardData = await window.apiClient.getPlayerLeaderboard(20); // 使用 apiClient 模塊
                window.gameStateManager.updateGameState({ playerLeaderboard: leaderboardData });
                window.ui.updateLeaderboardTable('player', leaderboardData);
                window.ui.hideModal('feedback-modal');
                window.ui.showModal('player-leaderboard-modal');
            } catch (error) {
                window.ui.showFeedbackModal('載入失敗', `無法獲取玩家排行榜: ${error.message}`);
            }
        });
    }

    if (window.DOMElements.newbieGuideBtn) {
        window.DOMElements.newbieGuideBtn.addEventListener('click', () => {
            if (window.gameState.gameConfigs && window.gameState.gameConfigs.newbie_guide) {
                window.ui.updateNewbieGuideModal(window.gameState.gameConfigs.newbie_guide);
                if(window.DOMElements.newbieGuideSearchInput) window.DOMElements.newbieGuideSearchInput.value = '';
                window.ui.showModal('newbie-guide-modal');
            } else {
                window.ui.showFeedbackModal('錯誤', '新手指南尚未載入。');
            }
        });
    }

    if (window.DOMElements.friendsListBtn) {
        window.DOMElements.friendsListBtn.addEventListener('click', () => {
            window.ui.updateFriendsListModal([]); // 初始為空
            if(window.DOMElements.friendsListSearchInput) window.DOMElements.friendsListSearchInput.value = '';
            window.ui.showModal('friends-list-modal');
        });
    }
}

// --- Tab Switching Handler ---
function handleTabSwitching() {
    if (window.DOMElements.dnaFarmTabs) {
        window.DOMElements.dnaFarmTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                window.ui.switchTabContent(targetTabId, event.target, 'dna-farm-tabs');
            }
        });
    }

    if (window.DOMElements.monsterInfoTabs) {
        window.DOMElements.monsterInfoTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                // 確保傳遞正確的父容器ID，以便正確切換該 modal 內的頁籤
                window.ui.switchTabContent(targetTabId, event.target, 'monster-info-tabs');
            }
        });
    }
}

// --- DNA Combination Handler ---
async function handleCombineDna() {
    const dnaBaseIdsForCombination = window.gameState.dnaCombinationSlots
        .filter(slot => slot && slot.baseId)
        .map(slot => slot.baseId);

    if (dnaBaseIdsForCombination.length < 2) {
        window.ui.showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        window.ui.showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        const result = await window.apiClient.combineDNA(dnaBaseIdsForCombination);

        if (result && result.id) {
            const newMonster = result;
            await window.gameLogic.refreshPlayerData(); // 刷新玩家數據以包含新怪獸和可能的成就更新

            window.gameStateManager.resetDNACombinationSlots(); // 重置組合槽狀態
            window.ui.renderDNACombinationSlots(window.gameState.dnaCombinationSlots); // 渲染空的組合槽

            let feedbackMessage = `🎉 成功合成了新的怪獸：<strong>${newMonster.nickname}</strong>！<br>`;
            feedbackMessage += `屬性: ${newMonster.elements.join(', ')}, 稀有度: ${newMonster.rarity}<br>`;
            feedbackMessage += `HP: ${newMonster.hp}, 攻擊: ${newMonster.attack}, 防禦: ${newMonster.defense}, 速度: ${newMonster.speed}, 爆擊: ${newMonster.crit}%`;
            if (result.farm_full_warning) {
                feedbackMessage += `<br><strong class="text-[var(--warning-color)]">${result.farm_full_warning}</strong> 請至農場管理。`;
            }

            window.ui.showFeedbackModal(
                '合成成功！',
                feedbackMessage,
                false,
                null,
                [{ text: '查看新怪獸', class: 'primary', onClick: () => {
                    // 選中新怪獸並更新快照
                    window.gameStateManager.updateGameState({ selectedMonsterId: newMonster.id });
                    window.ui.updateMonsterSnapshot(newMonster);
                    window.ui.switchTabContent('monster-farm-content', document.querySelector('.tab-button[data-tab-target="monster-farm-content"]'), 'dna-farm-tabs');
                }}, { text: '關閉', class: 'secondary'}]
            );

        } else if (result && result.error) {
            window.ui.showFeedbackModal('合成失敗', result.error);
        } else {
            window.ui.showFeedbackModal('合成失敗', '發生未知錯誤，未能生成怪獸。');
        }
    } catch (error) {
        let errorMessage = `請求錯誤: ${error.message}`;
        if (error.message && error.message.includes("未能生成怪獸")) {
            errorMessage = `合成失敗: DNA 組合未能生成怪獸。請檢查您的 DNA 組合或稍後再試。`;
        }
        window.ui.showFeedbackModal('合成失敗', errorMessage);
    }
}

// --- Confirmation Modal Action Handler ---
function handleConfirmationActions() {
    // Confirmation modal 的 "確定" 按鈕的事件監聽器是在 showConfirmationModal 函數內部動態添加的
    // 所以這裡不需要為 #confirm-action-btn 單獨添加靜態監聽器
    // 取消按鈕（如果有的話，例如一個通用的取消按鈕）可以在這裡處理
    // 但目前的設計是通過 modal-close 來處理所有彈窗的關閉
}

// --- Cultivation Modal Handlers ---
function handleCultivationModals() {
    if (window.DOMElements.startCultivationBtn) {
        window.DOMElements.startCultivationBtn.addEventListener('click', async () => {
            if (!window.gameState.cultivationMonsterId) {
                window.ui.showFeedbackModal('錯誤', '沒有選定要修煉的怪獸。');
                return;
            }
            // 模擬修煉時長，或者可以從輸入框獲取
            const MOCK_CULTIVATION_DURATION_SECONDS = 10; // 可以根據需要調整

            window.gameStateManager.updateGameState({
                cultivationStartTime: Date.now(),
                cultivationDurationSet: MOCK_CULTIVATION_DURATION_SECONDS
            });

            const monsterInFarm = window.gameState.playerData.farmedMonsters.find(m => m.id === window.gameState.cultivationMonsterId);
            if (monsterInFarm) {
                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {}; // 確保 farmStatus 存在
                monsterInFarm.farmStatus.isTraining = true;
                monsterInFarm.farmStatus.trainingStartTime = window.gameState.cultivationStartTime;
                monsterInFarm.farmStatus.trainingDuration = MOCK_CULTIVATION_DURATION_SECONDS * 1000; // 毫秒
                window.ui.renderMonsterFarm(window.gameState.playerData.farmedMonsters); // 更新農場顯示
            }

            window.ui.hideModal('cultivation-setup-modal');
            window.ui.showFeedbackModal(
                '修煉開始！',
                `怪獸 ${monsterInFarm ? monsterInFarm.nickname : ''} 已開始為期 ${MOCK_CULTIVATION_DURATION_SECONDS} 秒的修煉。請稍後查看成果。`,
                false,
                null,
                [{ text: '好的', class: 'primary'}]
            );

            // 可以在這裡添加一個延遲調用 completeCultivation 的邏輯（僅用於演示或自動完成）
            // setTimeout(async () => {
            //     await window.gameLogic.handleCompleteCultivation(window.gameState.cultivationMonsterId, MOCK_CULTIVATION_DURATION_SECONDS);
            // }, MOCK_CULTIVATION_DURATION_SECONDS * 1000);
        });
    }

    if (window.DOMElements.closeTrainingResultsBtn) window.DOMElements.closeTrainingResultsBtn.addEventListener('click', () => {
        if (window.gameState.temporaryBackpack.length > 0) {
            window.ui.showModal('reminder-modal');
        } else {
            window.ui.hideModal('training-results-modal');
        }
    });
    if (window.DOMElements.finalCloseTrainingResultsBtn) window.DOMElements.finalCloseTrainingResultsBtn.addEventListener('click', () => {
         if (window.gameState.temporaryBackpack.length > 0) {
            window.ui.showModal('reminder-modal');
        } else {
            window.ui.hideModal('training-results-modal');
        }
    });

    if (window.DOMElements.addAllToTempBackpackBtn) {
        window.DOMElements.addAllToTempBackpackBtn.addEventListener('click', () => {
            window.gameLogic.addAllCultivationItemsToTempBackpack(); // 使用 gameLogic 的函數
            window.DOMElements.addAllToTempBackpackBtn.disabled = true;
            window.DOMElements.addAllToTempBackpackBtn.textContent = "已加入背包";
        });
    }

    if (window.DOMElements.reminderConfirmCloseBtn) window.DOMElements.reminderConfirmCloseBtn.addEventListener('click', () => {
        window.ui.hideModal('reminder-modal');
        window.ui.hideModal('training-results-modal');
        window.gameLogic.clearTemporaryBackpack(); // 使用 gameLogic 的函數
    });
    if (window.DOMElements.reminderCancelBtn) window.DOMElements.reminderCancelBtn.addEventListener('click', () => {
        window.ui.hideModal('reminder-modal'); // 只關閉提醒彈窗
    });
}

// --- Newbie Guide Search Handler ---
function handleNewbieGuideSearch() {
    if (window.DOMElements.newbieGuideSearchInput) {
        window.DOMElements.newbieGuideSearchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            if (window.gameState.gameConfigs && window.gameState.gameConfigs.newbie_guide) {
                window.ui.updateNewbieGuideModal(window.gameState.gameConfigs.newbie_guide, searchTerm);
            }
        });
    }
}

// --- Friends List Search Handler ---
function handleFriendsListSearch() {
   if (window.DOMElements.friendsListSearchInput) {
        window.DOMElements.friendsListSearchInput.addEventListener('input', async (event) => {
            const query = event.target.value.trim();
            if (query.length > 1) { // 至少輸入2個字符才開始搜尋
                try {
                    const result = await window.apiClient.searchPlayers(query); // 使用 apiClient
                    window.gameStateManager.updateGameState({ searchedPlayers: result.players || [] });
                    window.ui.updateFriendsListModal(window.gameState.searchedPlayers);
                } catch (error) {
                    console.error("搜尋玩家失敗:", error);
                    window.ui.updateFriendsListModal([]); // 清空結果
                }
            } else if (query.length === 0) {
                window.ui.updateFriendsListModal([]); // 清空結果
            }
        });
   }
}

// --- Leaderboard Element Filter Handler ---
function handleMonsterLeaderboardFilter() {
    if (window.DOMElements.monsterLeaderboardElementTabs) {
        window.DOMElements.monsterLeaderboardElementTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const filter = event.target.dataset.elementFilter;
                window.gameStateManager.updateGameState({ currentMonsterLeaderboardElementFilter: filter });

                window.DOMElements.monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                window.gameLogic.filterAndRenderMonsterLeaderboard(); // 使用 gameLogic
            }
        });
    }
}

// --- Leaderboard Sorting Handler ---
function handleLeaderboardSorting() {
    const tables = [window.DOMElements.monsterLeaderboardTable, window.DOMElements.playerLeaderboardTable];
    tables.forEach(table => {
        if (table) {
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                headerRow.addEventListener('click', (event) => {
                    const th = event.target.closest('th');
                    if (!th || !th.dataset.sortKey) return;

                    const sortKey = th.dataset.sortKey;
                    const tableType = table.id.includes('monster') ? 'monster' : 'player';

                    let currentSortConfig = (window.gameState.leaderboardSortConfig && window.gameState.leaderboardSortConfig[tableType]) || {};
                    let newSortOrder = 'asc';
                    if (currentSortConfig.key === sortKey && currentSortConfig.order === 'asc') {
                        newSortOrder = 'desc';
                    }

                    const newLeaderboardSortConfig = {
                        ...window.gameState.leaderboardSortConfig,
                        [tableType]: { key: sortKey, order: newSortOrder }
                    };
                    window.gameStateManager.updateGameState({ leaderboardSortConfig: newLeaderboardSortConfig });


                    window.gameLogic.sortAndRenderLeaderboard(tableType); // 使用 gameLogic
                    window.ui.updateLeaderboardSortIcons(table, sortKey, newSortOrder);
                });
            }
        }
    });
}


// --- Battle Log Modal Close Handler ---
function handleBattleLogModalClose() {
    if (window.DOMElements.closeBattleLogBtn) window.DOMElements.closeBattleLogBtn.addEventListener('click', () => {
        window.ui.hideModal('battle-log-modal');
    });
}

// --- DNA Draw Modal Handlers ---
function handleDnaDrawModal() {
    if (window.DOMElements.closeDnaDrawBtn) window.DOMElements.closeDnaDrawBtn.addEventListener('click', () => {
        window.ui.hideModal('dna-draw-modal');
    });
    if (window.DOMElements.dnaDrawButton) window.DOMElements.dnaDrawButton.addEventListener('click', window.gameLogic.handleDrawDNAClick); // 使用 gameLogic

    if (window.DOMElements.dnaDrawResultsGrid) {
        window.DOMElements.dnaDrawResultsGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('add-drawn-dna-to-backpack-btn')) {
                const dnaIndex = parseInt(event.target.dataset.dnaIndex, 10);
                if (window.gameState.lastDnaDrawResult && window.gameState.lastDnaDrawResult[dnaIndex]) {
                    const dnaTemplate = window.gameState.lastDnaDrawResult[dnaIndex];
                    window.gameLogic.addDnaToTemporaryBackpack(dnaTemplate); // 使用 gameLogic
                    event.target.disabled = true;
                    event.target.textContent = '已加入';
                }
            }
        });
    }
}

// --- Official Announcement Modal Close Handler ---
function handleAnnouncementModalClose() {
    if (window.DOMElements.officialAnnouncementCloseX) {
        window.DOMElements.officialAnnouncementCloseX.addEventListener('click', () => {
            window.ui.hideModal('official-announcement-modal');
            localStorage.setItem('announcementShown_v1', 'true');
        });
    }
}


// --- Main Function to Add All Event Listeners ---
// 修正：將函數名改為 initializeEventListeners 並導出
export function initializeEventListeners() {
    // 初始化 DOMElements (確保 ui.js 中的 DOMElements 被正確填充)
    // 這一行是關鍵，確保在添加事件監聽器之前，所有 DOM 元素引用都已準備好。
    // DOMElements 的實際填充應該在 main.js 的 initializeLocalDOMElements 中完成。
    // 這裡的調用是假設 main.js 已經執行了它。

    handleModalCloseButtons();
    handleThemeSwitch();
    handleAuthForms();
    handleTopNavButtons();
    handleTabSwitching();
    handleLeaderboardSorting();

    if (window.DOMElements.combineButton) { // 確保按鈕存在
        window.DOMElements.combineButton.addEventListener('click', handleCombineDna);
    } else {
        console.warn("Combine button not found for event listener.");
    }


    // 為拖放設置事件監聽器到一個共同的父容器，以利用事件冒泡
    const gameAreaContainer = window.DOMElements.gameContainer || document.getElementById('game-container') || document.body;

    gameAreaContainer.addEventListener('dragstart', handleDragStart);
    gameAreaContainer.addEventListener('dragend', handleDragEnd);
    gameAreaContainer.addEventListener('dragover', handleDragOver);
    gameAreaContainer.addEventListener('dragleave', handleDragLeave);
    gameAreaContainer.addEventListener('drop', handleDrop);


    handleConfirmationActions();
    handleCultivationModals();
    handleNewbieGuideSearch();
    handleFriendsListSearch();
    handleMonsterLeaderboardFilter();
    handleBattleLogModalClose();
    handleDnaDrawModal();
    handleAnnouncementModalClose();

    console.log("所有事件監聽器已在 event-handlers.js 中正確初始化。");
}
