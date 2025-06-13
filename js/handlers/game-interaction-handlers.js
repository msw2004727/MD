// js/handlers/game-interaction-handlers.js

function initializeGameInteractionEventHandlers() {
    // 綁定核心遊戲玩法的按鈕事件
    if (DOMElements.combineButton) DOMElements.combineButton.addEventListener('click', handleCombineDna);
    if (DOMElements.dnaDrawButton) DOMElements.dnaDrawButton.addEventListener('click', handleDrawDNAClick);
    
    // 綁定其他互動事件
    handleDnaDrawModal();
    handleFarmHeaderSorting();
    handleCultivationModals();
    handleMonsterNicknameEvents();
    handleFriendAndPlayerInteractions();
    handleLeaderboardInteractions();
}


// --- 核心遊戲流程事件處理 ---

async function handleCombineDna() {
    const dnaObjectsForCombination = gameState.playerData.dnaCombinationSlots
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
        if (DOMElements.combineButton) {
            const combinationSlotsFilled = gameState.playerData.dnaCombinationSlots.filter(s => s !== null).length >= 2;
            DOMElements.combineButton.disabled = !combinationSlotsFilled;
        }
    }
}

async function handleDrawDNAClick() {
    showFeedbackModal('DNA抽取中...', '正在搜尋稀有的DNA序列...', true);
    try {
        const result = await drawFreeDNA();
        if (result && result.success && result.drawn_dna) {
            gameState.lastDnaDrawResult = result.drawn_dna;
            hideModal('feedback-modal');
            showDnaDrawModal(result.drawn_dna);
        } else {
            throw new Error(result.error || '從伺服器返回的抽卡數據無效。');
        }
    } catch (error) {
        console.error("DNA 抽取失敗:", error);
        hideModal('feedback-modal');
        showFeedbackModal('抽卡失敗', `與伺服器通信時發生錯誤: ${error.message}`);
    }
}

function handleDnaDrawModal() {
    if (DOMElements.closeDnaDrawBtn) DOMElements.closeDnaDrawBtn.addEventListener('click', () => {
        hideModal('dna-draw-modal');
    });

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

async function handleDeployMonsterClick(monsterId) {
    if (!monsterId) return;

    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);

    if (monster && monster.farmStatus && monster.farmStatus.isTraining) {
        showFeedbackModal('無法出戰', '怪獸尚未回來，需召回才可出戰');
        return;
    }

    if (gameState.playerData) {
        gameState.playerData.selectedMonsterId = monsterId;
    }

    try {
        await savePlayerData(gameState.playerId, gameState.playerData);
        console.log(`怪獸 ${monsterId} 已設定為出戰狀態並成功儲存。`);
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

function handleFarmHeaderSorting() {
    if (DOMElements.farmHeaders) {
        DOMElements.farmHeaders.addEventListener('click', (event) => {
            const target = event.target.closest('.sortable');
            if (!target) return;

            const sortKey = target.dataset.sortKey;
            if (!sortKey || ['actions', 'deploy', 'index'].includes(sortKey)) return;

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

function handleCultivationModals() {
    const cultivationLocationsContainer = document.querySelector('.cultivation-locations-container');

    if (cultivationLocationsContainer) {
        cultivationLocationsContainer.addEventListener('click', async (event) => {
            const clickedButton = event.target.closest('button.cultivation-location-card');
            if (!clickedButton) return;

            const location = clickedButton.dataset.location; 
            if (!location) return;

            if (!gameState.cultivationMonsterId) {
                showFeedbackModal('錯誤', '沒有選定要修煉的怪獸。');
                return;
            }
            const CULTIVATION_DURATION_SECONDS = gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 3600;

            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === gameState.cultivationMonsterId);
            if (monsterInFarm) {
                if (monsterInFarm.farmStatus?.isTraining || monsterInFarm.farmStatus?.isBattling) {
                    showFeedbackModal('提示', `怪獸 ${monsterInFarm.nickname} 目前正在忙碌中，無法開始新的修煉。`);
                    return;
                }

                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = true;
                monsterInFarm.farmStatus.trainingStartTime = Date.now();
                monsterInFarm.farmStatus.trainingDuration = CULTIVATION_DURATION_SECONDS * 1000;
                monsterInFarm.farmStatus.trainingLocation = location;

                try {
                    await savePlayerData(gameState.playerId, gameState.playerData);
                    hideModal('cultivation-setup-modal');
                    renderMonsterFarm(); 
                    showFeedbackModal(
                        '修煉開始！',
                        `怪獸 ${monsterInFarm.nickname} 已開始為期 ${CULTIVATION_DURATION_SECONDS} 秒的修煉，地點：${location}。`,
                        false, null, [{ text: '好的', class: 'primary'}]
                    );
                } catch (error) {
                    console.error("儲存修煉狀態失敗:", error);
                    showFeedbackModal('錯誤', '開始修煉失敗，無法儲存狀態，請稍後再試。');
                    monsterInFarm.farmStatus.isTraining = false;
                }
            }
        });
    }

    if (DOMElements.addAllToTempBackpackBtn) {
        DOMElements.addAllToTempBackpackBtn.addEventListener('click', () => {
            addAllCultivationItemsToTempBackpack();
        });
    }
}

function handleMonsterNicknameEvents() {
    if (DOMElements.monsterInfoModalHeader) {
        DOMElements.monsterInfoModalHeader.addEventListener('click', async (event) => {
            const monsterId = DOMElements.monsterInfoModalHeader.dataset.monsterId;
            if (!monsterId) return;

            const displayContainer = document.getElementById('monster-nickname-display-container');
            const editContainer = document.getElementById('monster-nickname-edit-container');

            if (event.target.id === 'edit-monster-nickname-btn') {
                if(displayContainer) displayContainer.style.display = 'none';
                if(editContainer) {
                    editContainer.style.display = 'flex'; 
                    const input = editContainer.querySelector('#monster-nickname-input');
                    if(input) input.focus(); 
                }
            }

            if (event.target.id === 'cancel-nickname-change-btn') {
                if(displayContainer) displayContainer.style.display = 'flex';
                if(editContainer) editContainer.style.display = 'none';
            }

            if (event.target.id === 'confirm-nickname-change-btn') {
                const input = document.getElementById('monster-nickname-input');
                const newCustomName = input ? input.value.trim() : '';

                showFeedbackModal('更新中...', '正在為您的怪獸更名...', true);
                try {
                    await updateMonsterCustomNickname(monsterId, newCustomName);
                    await refreshPlayerData(); 
                    
                    const updatedMonster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
                    if(updatedMonster) {
                        updateMonsterInfoModal(updatedMonster, gameState.gameConfigs);
                    }
                    hideModal('feedback-modal');
                    showFeedbackModal('更新成功', '您的怪獸有了新的名字！');

                } catch (error) {
                    hideModal('feedback-modal');
                    showFeedbackModal('更新失敗', `發生錯誤：${error.message}`);
                    if(displayContainer) displayContainer.style.display = 'flex';
                    if(editContainer) editContainer.style.display = 'none';
                }
            }
        });
    }
}

// --- 社交與排行榜互動 ---

function handleLeaderboardInteractions() {
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
                }
            }
        });
    }

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

    const tables = [DOMElements.monsterLeaderboardTable, DOMElements.playerLeaderboardTable];
    tables.forEach(table => {
        if (table) {
            table.addEventListener('click', (event) => {
                const th = event.target.closest('th');
                if (!th || !th.dataset.sortKey) return; 

                const sortKey = th.dataset.sortKey;
                const tableType = table.id.includes('monster') ? 'monster' : 'player';

                let currentSortConfig = gameState.leaderboardSortConfig?.[tableType] || {};
                let newSortOrder = 'desc';
                if (currentSortConfig.key === sortKey && currentSortConfig.order === 'desc') newSortOrder = 'asc';
                else if (currentSortConfig.key === sortKey && currentSortConfig.order === 'asc') newSortOrder = 'desc';

                gameState.leaderboardSortConfig[tableType] = { key: sortKey, order: newSortOrder };

                if (tableType === 'monster') filterAndRenderMonsterLeaderboard();
                else sortAndRenderLeaderboard(tableType);
            });
        }
    });

    if (DOMElements.refreshMonsterLeaderboardBtn) {
        DOMElements.refreshMonsterLeaderboardBtn.addEventListener('click', fetchAndDisplayMonsterLeaderboard);
    }
}

function handleFriendAndPlayerInteractions() {
    if (DOMElements.friendsTabSearchInput) {
        DOMElements.friendsTabSearchInput.addEventListener('input', async (event) => {
            const query = event.target.value.trim();
            if (query.length > 1) {
                const result = await searchPlayers(query);
                updateFriendsSearchResults(result.players || []);
            } else if (query.length === 0) {
                updateFriendsSearchResults([]);
            }
        });
    }

    if (DOMElements.playerInfoModalBody) {
        DOMElements.playerInfoModalBody.addEventListener('click', async (event) => {
            const monsterLink = event.target.closest('.player-info-monster-link');
            if (monsterLink) {
                event.preventDefault();
                const monsterId = monsterLink.dataset.monsterId;
                const ownerUid = monsterLink.dataset.ownerUid;
                if (!monsterId || !ownerUid) return;
                
                let monsterData;
                if (ownerUid === gameState.playerId) monsterData = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
                else if (gameState.viewedPlayerData?.uid === ownerUid) monsterData = gameState.viewedPlayerData.farmedMonsters.find(m => m.id === monsterId);

                if (monsterData) {
                    updateMonsterInfoModal(monsterData, gameState.gameConfigs);
                    showModal('monster-info-modal');
                }
                return;
            }

            const equipButton = event.target.closest('.equip-title-btn');
            if (equipButton) {
                event.preventDefault();
                const titleId = equipButton.dataset.titleId;
                if (!titleId) return;

                equipButton.disabled = true;
                equipButton.textContent = '處理中...';
                
                try {
                    const result = await equipTitle(titleId);
                    if (result?.success) {
                        await refreshPlayerData();
                        updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
                    } else {
                        throw new Error(result.error || '裝備稱號時發生未知錯誤。');
                    }
                } catch (error) {
                    showFeedbackModal('裝備失敗', `錯誤：${error.message}`);
                    updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
                }
            }
        });
    }
}