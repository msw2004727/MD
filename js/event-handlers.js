// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js), gameState (來自 game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

// --- Drag and Drop Handlers for DNA ---
let draggedDnaElement = null; // 用於存儲被拖動的 DNA 元素

function handleDragStart(event) {
    const target = event.target;
    if (target.classList.contains('dna-item') || (target.classList.contains('dna-slot') && target.classList.contains('occupied'))) {
        draggedDnaElement = target;
        // 同時傳輸實例ID (dnaId) 和基礎ID (dnaBaseId)，以便後續使用
        event.dataTransfer.setData('text/plain', target.dataset.dnaId || target.dataset.dnaBaseId || target.textContent);
        event.dataTransfer.effectAllowed = 'move';
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
        draggedDnaElement = null;
    }
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items');
    if (target) {
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
        handleDragEnd(event);
        return;
    }

    targetElement.classList.remove('drag-over');

    const dnaInstanceId = draggedDnaElement.dataset.dnaId; // 實例ID，主要用於從庫存拖曳
    const draggedDnaBaseId = draggedDnaElement.dataset.dnaBaseId; // 模板ID，主要用於合成
    const source = draggedDnaElement.dataset.dnaSource;
    const sourceSlotIndexAttr = draggedDnaElement.dataset.slotIndex;
    const sourceSlotIndex = sourceSlotIndexAttr !== undefined ? parseInt(sourceSlotIndexAttr, 10) : null;

    // 如果是從組合槽拖曳，我們需要傳遞被拖曳的 DNA 物件本身
    let draggedDnaObject = null;
    if (source === 'combination' && sourceSlotIndex !== null && gameState.dnaCombinationSlots[sourceSlotIndex]) {
        draggedDnaObject = gameState.dnaCombinationSlots[sourceSlotIndex];
    }


    if (targetElement.id === 'inventory-delete-slot') {
        if (source === 'inventory' && dnaInstanceId) {
            showConfirmationModal('確認刪除', `您確定要永久刪除 DNA 碎片 "${draggedDnaElement.textContent.trim()}" 嗎？此操作無法復原。`, () => {
                deleteDNAFromInventory(dnaInstanceId);
                renderPlayerDNAInventory();
                showFeedbackModal('操作成功', `DNA 碎片 "${draggedDnaElement.textContent.trim()}" 已被刪除。`);
            });
        } else if (source === 'combination' && sourceSlotIndex !== null) {
            gameState.dnaCombinationSlots[sourceSlotIndex] = null; // 清空來源槽
            renderDNACombinationSlots();
            showFeedbackModal('操作成功', `已從組合槽移除 DNA。`);
        }
    } else if (targetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(targetElement.dataset.slotIndex, 10);
        // 調用 moveDnaToCombinationSlot，傳遞實例ID (如果從庫存) 或拖曳的物件 (如果從組合槽)
        moveDnaToCombinationSlot(dnaInstanceId, draggedDnaObject, source, sourceSlotIndex, targetSlotIndex);
    } else if ((targetElement.id === 'inventory-items' || targetElement.classList.contains('inventory-slot-empty')) && source === 'combination' && sourceSlotIndex !== null) {
        // 從組合槽拖曳回 DNA 庫存 (概念上是清空該組合槽)
        // 注意：如果需要將DNA實例“歸還”到庫存，這裡需要更複雜的邏輯
        // 目前只清空組合槽，不增加庫存（因為庫存DNA有唯一實例ID）
        if (gameState.dnaCombinationSlots[sourceSlotIndex]) {
            gameState.dnaCombinationSlots[sourceSlotIndex] = null;
            renderDNACombinationSlots();
            // renderPlayerDNAInventory(); // 如果需要更新庫存（例如DNA被“歸還”）
            showFeedbackModal('提示', '已從組合槽移除 DNA。物品未返回庫存。');
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
                if (modalId === 'training-results-modal' && gameState.temporaryBackpack.length > 0) {
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
                updateGameState({
                    currentUser: null,
                    playerId: null,
                    playerNickname: "玩家",
                    playerData: { playerOwnedDNA: [], farmedMonsters: [], playerStats: { nickname: "玩家", titles: ["新手"], wins: 0, losses: 0, score: 0, achievements: [], medals: 0 } },
                    selectedMonsterId: null,
                    dnaCombinationSlots: [null, null, null, null, null],
                    temporaryBackpack: []
                });
                updateMonsterSnapshot(null);
                renderPlayerDNAInventory();
                renderDNACombinationSlots();
                renderMonsterFarm();
                renderTemporaryBackpack();
                toggleElementDisplay(DOMElements.authScreen, true, 'flex');
                toggleElementDisplay(DOMElements.gameContainer, false);
                hideAllModals();
                setTimeout(() => {
                    if (!gameState.currentUser) {
                         showFeedbackModal('登出成功', '您已成功登出。期待您的下次異世界冒險！');
                    }
                }, 300);
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
            if (gameState.playerData) {
                updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
                showModal('player-info-modal');
            } else {
                showFeedbackModal('錯誤', '無法載入玩家資訊。');
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
                } else if (gameState.gameConfigs && gameState.gameConfigs.skills) {
                     const skillElements = new Set();
                     Object.keys(gameState.gameConfigs.skills).forEach(el => skillElements.add(el));
                     elementsForTabs = ['all', ...Array.from(skillElements)];
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
                updateLeaderboardTable('player', leaderboardData);
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

// --- Tab Switching Handler ---
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

// --- DNA Combination Handler ---
async function handleCombineDna() {
    // *** 修正：確保獲取的是 DNA 模板的 baseId ***
    const dnaBaseIdsForCombination = gameState.dnaCombinationSlots
        .filter(slot => slot && slot.baseId) // 確保 slot 不為空且有 baseId (模板ID)
        .map(slot => slot.baseId);

    if (dnaBaseIdsForCombination.length < 2) {
        showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        const result = await combineDNA(dnaBaseIdsForCombination); // 將 baseIds 傳遞給後端

        if (result && result.id) {
            const newMonster = result;
            await refreshPlayerData();

            resetDNACombinationSlots();
            renderDNACombinationSlots();

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
                    updateMonsterSnapshot(newMonster);
                }}, { text: '關閉', class: 'secondary'}]
            );

        } else if (result && result.error) {
            showFeedbackModal('合成失敗', result.error);
        } else {
            showFeedbackModal('合成失敗', '發生未知錯誤，未能生成怪獸。');
        }
    } catch (error) {
        // 顯示更詳細的錯誤訊息給用戶，如果 error.message 包含 "未能生成怪獸"
        let errorMessage = `請求錯誤: ${error.message}`;
        if (error.message && error.message.includes("未能生成怪獸")) {
            errorMessage = `合成失敗: DNA 組合未能生成怪獸。請檢查您的 DNA 組合或稍後再試。`;
        }
        showFeedbackModal('合成失敗', errorMessage);
    }
}

// --- Confirmation Modal Action Handler ---
function handleConfirmationActions() {
    if (DOMElements.cancelActionBtn) { // 確保您的HTML中有這個按鈕，如果沒有，則此段不需要
        DOMElements.cancelActionBtn.addEventListener('click', () => {
            hideModal('confirmation-modal');
        });
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
            const MOCK_CULTIVATION_DURATION_SECONDS = 10;

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
                `怪獸 ${monsterInFarm ? monsterInFarm.nickname : ''} 已開始為期 ${MOCK_CULTIVATION_DURATION_SECONDS} 秒的修煉。請稍後查看成果。`,
                false,
                null,
                [{ text: '好的', class: 'primary'}]
            );
        });
    }

    if (DOMElements.closeTrainingResultsBtn) DOMElements.closeTrainingResultsBtn.addEventListener('click', () => {
        if (gameState.temporaryBackpack.length > 0) {
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });
    if (DOMElements.finalCloseTrainingResultsBtn) DOMElements.finalCloseTrainingResultsBtn.addEventListener('click', () => {
         if (gameState.temporaryBackpack.length > 0) {
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });

    if (DOMElements.addAllToTempBackpackBtn) {
        DOMElements.addAllToTempBackpackBtn.addEventListener('click', () => {
            addAllCultivationItemsToTempBackpack();
            DOMElements.addAllToTempBackpackBtn.disabled = true;
            DOMElements.addAllToTempBackpackBtn.textContent = "已加入背包";
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

// --- Newbie Guide Search Handler ---
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

// --- Friends List Search Handler ---
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

// --- Leaderboard Element Filter Handler ---
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

// --- Leaderboard Sorting Handler ---
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
                    let newSortOrder = 'asc';
                    if (currentSortConfig.key === sortKey && currentSortConfig.order === 'asc') {
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

// --- Official Announcement Modal Close Handler ---
function handleAnnouncementModalClose() {
    if (DOMElements.officialAnnouncementCloseX) {
        DOMElements.officialAnnouncementCloseX.addEventListener('click', () => {
            hideModal('official-announcement-modal');
            localStorage.setItem('announcementShown_v1', 'true');
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

    const dragDropContainer = DOMElements.gameContainer || document.body;

    dragDropContainer.addEventListener('dragstart', handleDragStart);
    dragDropContainer.addEventListener('dragend', handleDragEnd);
    dragDropContainer.addEventListener('dragover', handleDragOver);
    dragDropContainer.addEventListener('dragleave', handleDragLeave);
    dragDropContainer.addEventListener('drop', handleDrop);

    if (DOMElements.dnaCombinationSlotsContainer) {
        DOMElements.dnaCombinationSlotsContainer.addEventListener('dragover', handleDragOver);
        DOMElements.dnaCombinationSlotsContainer.addEventListener('dragleave', handleDragLeave);
        DOMElements.dnaCombinationSlotsContainer.addEventListener('drop', handleDrop);
    }


    handleConfirmationActions();
    handleCultivationModals();
    handleNewbieGuideSearch();
    handleFriendsListSearch();
    handleMonsterLeaderboardFilter();
    handleBattleLogModalClose();
    handleDnaDrawModal();
    handleAnnouncementModalClose();

    console.log("All event listeners initialized with drag-drop and DNA combination fixes (v2).");
}
