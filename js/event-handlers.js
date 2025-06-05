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
        setTimeout(() => { 
            event.target.classList.add('dragging');
        }, 0);
    } else {
        event.preventDefault(); 
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
    if (event.target.classList.contains('dna-slot') || 
        event.target.classList.contains('inventory-slot-empty') || // 確保空庫存槽也可以接收
        event.target.classList.contains('temp-backpack-slot') ||
        event.target.id === 'inventory-delete-slot') {
        event.target.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
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

    const targetElement = event.target.closest('.dna-slot, #inventory-items, #inventory-delete-slot, .temp-backpack-slot, .inventory-slot-empty'); // 允許拖到空的庫存槽
    if (!targetElement) {
        handleDragEnd(event); 
        return;
    }
    
    targetElement.classList.remove('drag-over'); 

    const dnaIdToMove = draggedDnaElement.dataset.dnaId;
    const source = draggedDnaElement.dataset.dnaSource; 
    const sourceSlotIndex = parseInt(draggedDnaElement.dataset.slotIndex, 10); 

    if (targetElement.id === 'inventory-delete-slot') {
        if (source === 'inventory') {
            showConfirmationModal('確認刪除', `您確定要永久刪除 DNA 碎片 "${draggedDnaElement.textContent}" 嗎？此操作無法復原。`, () => {
                deleteDNAFromInventory(dnaIdToMove); 
                renderPlayerDNAInventory(); 
                showFeedbackModal('操作成功', `DNA 碎片 "${draggedDnaElement.textContent}" 已被刪除。`);
            });
        } else if (source === 'combination') {
            gameState.dnaCombinationSlots[sourceSlotIndex] = null;
            renderDNACombinationSlots();
            showFeedbackModal('操作成功', `已從組合槽移除 DNA。`);
        }
    }
    else if (targetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(targetElement.dataset.slotIndex, 10);
        moveDnaToCombinationSlot(dnaIdToMove, source, sourceSlotIndex, targetSlotIndex); 
    }
    else if ((targetElement.id === 'inventory-items' || targetElement.classList.contains('inventory-slot-empty')) && source === 'combination') {
         // 從組合槽拖曳回 DNA 庫存 (概念上是清空該組合槽，DNA未實際從庫存中減少直到合成)
        const dnaInstance = gameState.dnaCombinationSlots[sourceSlotIndex];
        if (dnaInstance) {
            // gameState.playerData.playerOwnedDNA.push(dnaInstance); // 如果要真的移回庫存，需要此步驟，但目前設計是庫存只在合成後減少
            gameState.dnaCombinationSlots[sourceSlotIndex] = null;
            renderDNACombinationSlots();
            // renderPlayerDNAInventory(); // 如果真的移回，需要刷新庫存
            showFeedbackModal('提示', '已從組合槽移除 DNA。');
        }
    }

    handleDragEnd(event); 
}

// --- Modal Close Button Handler ---
function handleModalCloseButtons() {
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId || button.closest('.modal')?.id; // 確保能獲取到 modalId
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

    // 項目14: 新的左上角登出按鈕事件
    if (DOMElements.mainLogoutBtn) {
        DOMElements.mainLogoutBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('登出中...', '正在安全登出...', true);
                await logoutUser(); // auth.js
                // onAuthStateChanged 會處理大部分 UI 切換到登入畫面
                // 清理本地遊戲狀態 (確保與 onAuthStateChanged 中的邏輯一致或互補)
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
                hideAllModals(); // 確保所有彈窗都關閉
                // 延遲一下再顯示登出成功，避免被 onAuthStateChanged 的UI更新覆蓋太快
                setTimeout(() => {
                    if (!gameState.currentUser) { // 再次確認已登出
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
                } else if (gameState.gameConfigs && gameState.gameConfigs.skills) { // 備用方案：從技能定義中獲取元素
                     const skillElements = new Set();
                     Object.keys(gameState.gameConfigs.skills).forEach(el => skillElements.add(el));
                     elementsForTabs = ['all', ...Array.from(skillElements)];
                }
                updateMonsterLeaderboardElementTabs(elementsForTabs); // 更新頁籤
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
                DOMElements.newbieGuideSearchInput.value = ''; 
                showModal('newbie-guide-modal');
            } else {
                showFeedbackModal('錯誤', '新手指南尚未載入。');
            }
        });
    }
    
    if (DOMElements.friendsListBtn) {
        DOMElements.friendsListBtn.addEventListener('click', () => {
            updateFriendsListModal([]); 
            DOMElements.friendsListSearchInput.value = '';
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
    const dnaIds = getValidDNAIdsFromCombinationSlots(); 
    if (dnaIds.length < 2) { 
        showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        const result = await combineDNA(dnaIds); 

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
        showFeedbackModal('合成失敗', `請求錯誤: ${error.message}`);
    }
}

// --- Confirmation Modal Action Handler ---
function handleConfirmationActions() {
    if (DOMElements.cancelActionBtn) {
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

// --- Leaderboard Sorting Handler (項目10) ---
function handleLeaderboardSorting() {
    const tables = [DOMElements.monsterLeaderboardTable, DOMElements.playerLeaderboardTable];
    tables.forEach(table => {
        if (table) {
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                headerRow.addEventListener('click', (event) => {
                    const th = event.target.closest('th');
                    if (!th || !th.dataset.sortKey) return; //確保點擊的是可排序的表頭

                    const sortKey = th.dataset.sortKey;
                    const tableType = table.id.includes('monster') ? 'monster' : 'player';
                    
                    // 更新 gameState 中的排序狀態
                    let currentSortConfig = gameState.leaderboardSortConfig?.[tableType] || {};
                    let newSortOrder = 'asc';
                    if (currentSortConfig.key === sortKey && currentSortConfig.order === 'asc') {
                        newSortOrder = 'desc';
                    }
                    
                    gameState.leaderboardSortConfig = {
                        ...gameState.leaderboardSortConfig,
                        [tableType]: { key: sortKey, order: newSortOrder }
                    };

                    // 執行排序並重新渲染 (實際排序邏輯可能在 game-logic.js)
                    sortAndRenderLeaderboard(tableType); 
                    
                    // 更新表頭排序圖示 (在 ui.js 中實現)
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
    if (DOMElements.dnaDrawButton) DOMElements.dnaDrawButton.addEventListener('click', handleDrawDNAClick); // 綁定主畫面的抽取DNA按鈕

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

// --- Official Announcement Modal Close Handler (項目4: X按鈕) ---
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
    handleLeaderboardSorting(); // 項目10: 初始化排行榜排序事件

    if (DOMElements.combineButton) DOMElements.combineButton.addEventListener('click', handleCombineDna);

    const dnaInventoryPanel = DOMElements.inventoryItemsContainer?.closest('.panel') || document.getElementById('dna-inventory-content') || document.body; 
    
    dnaInventoryPanel.addEventListener('dragstart', handleDragStart);
    dnaInventoryPanel.addEventListener('dragend', handleDragEnd);
    dnaInventoryPanel.addEventListener('dragover', handleDragOver);
    dnaInventoryPanel.addEventListener('dragleave', handleDragLeave);
    dnaInventoryPanel.addEventListener('drop', handleDrop);
    
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
    handleDnaDrawModal(); // 包含主畫面抽取按鈕的綁定
    handleAnnouncementModalClose(); // 項目4: 處理公告X按鈕

    console.log("All event listeners initialized.");
}

