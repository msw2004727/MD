// js/handlers/game-interaction-handlers.js

function initializeGameInteractionEventHandlers() {
    // 綁定核心遊戲玩法的按鈕事件
    if (DOMElements.combineButton) DOMElements.combineButton.addEventListener('click', handleCombineDna);
    if (DOMElements.dnaDrawButton) DOMElements.dnaDrawButton.addEventListener('click', handleDrawDNAClick);
    
    // 綁定其他互動事件
    handleDnaDrawModal();
    handleFriendAndPlayerInteractions();
    handleCultivationStart(); // 新增呼叫
    
    const refreshBtn = document.getElementById('refresh-friends-list-btn');
    if (refreshBtn) {
        refreshBtn.onclick = null; 
        refreshBtn.addEventListener('click', handleRefreshFriendsList);
    }
}


/**
 * 新增函式：處理點擊刷新好友列表按鈕的邏輯。
 */
async function handleRefreshFriendsList() {
    showFeedbackModal('刷新中...', '正在獲取最新的好友狀態...', true);
    try {
        await refreshPlayerData(); 
        if(typeof renderFriendsList === 'function') {
            await renderFriendsList(); 
        }
    } catch (error) {
        console.error("刷新好友列表失敗:", error);
        showFeedbackModal('錯誤', '刷新好友列表時發生錯誤。');
    } finally {
        hideModal('feedback-modal');
    }
}


// --- 核心遊戲流程事件處理 ---

async function handleCombineDna() {
    const dnaObjectsForCombination = gameState.playerData.dnaCombinationSlots
        .filter(slot => slot && slot.id);

    if (dnaObjectsForCombination.length < 5) {
        showFeedbackModal('組合失敗', '必須放入 5 個 DNA 碎片才能進行組合。');
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
            if (document.getElementById('my-store-modal').style.display === 'flex') {
                renderMyStoreModal();
            }
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
            const combinationSlotsFilled = gameState.playerData.dnaCombinationSlots.filter(s => s !== null).length >= 5;
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
        DOMElements.dnaDrawResultsGrid.addEventListener('click', async (event) => {
            if (event.target.classList.contains('add-drawn-dna-to-backpack-btn')) {
                const dnaIndex = parseInt(event.target.dataset.dnaIndex, 10);
                if (gameState.lastDnaDrawResult && gameState.lastDnaDrawResult[dnaIndex]) {
                    const dnaTemplate = gameState.lastDnaDrawResult[dnaIndex];
                    addDnaToTemporaryBackpack(dnaTemplate);
                    event.target.disabled = true;
                    event.target.textContent = '已加入';

                    // --- 核心修改 START ---
                    // 在成功加入背包後，立刻儲存玩家資料
                    try {
                        await savePlayerData(gameState.playerId, gameState.playerData);
                    } catch (error) {
                        console.error("加入臨時背包後存檔失敗:", error);
                    }
                    // --- 核心修改 END ---
                }
            }
        });
    }
}


// --- 社交與玩家資訊互動 ---

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

// --- 修煉互動 ---
function handleCultivationStart() {
    const container = DOMElements.cultivationSetupModal;
    if (!container) return;

    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    DOMElements.cultivationSetupModal = newContainer;


    newContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('.cultivation-location-card');
        if (!button) return;

        const monsterId = gameState.cultivationMonsterId;
        const location = button.dataset.location;

        if (!monsterId || !location) {
            showFeedbackModal('錯誤', '無法開始修煉，缺少必要的資訊。');
            return;
        }

        const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
        if (!monster) {
            showFeedbackModal('錯誤', `找不到ID為 ${monsterId} 的怪獸。`);
            return;
        }
        
        const maxDuration = (gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 3600) * 1000;

        if (!monster.farmStatus) {
            monster.farmStatus = {};
        }
        monster.farmStatus.isTraining = true;
        monster.farmStatus.trainingStartTime = Date.now();
        monster.farmStatus.trainingDuration = maxDuration;
        monster.farmStatus.trainingLocation = location;

        hideModal('cultivation-setup-modal');
        showFeedbackModal('修煉開始！', '', false, { type: 'cultivation_start', monster: monster });
        
        if(typeof renderMonsterFarm === 'function') {
            renderMonsterFarm();
        }

        try {
            await savePlayerData(gameState.playerId, gameState.playerData);
            console.log(`Cultivation started for monster ${monsterId} and data saved.`);
        } catch (error) {
            console.error('Failed to save player data after starting cultivation:', error);
            monster.farmStatus.isTraining = false;
            monster.farmStatus.trainingStartTime = null;
            monster.farmStatus.trainingDuration = null;
            monster.farmStatus.trainingLocation = null;
            if(typeof renderMonsterFarm === 'function') {
                renderMonsterFarm();
            }
            showFeedbackModal('錯誤', '開始修煉後存檔失敗，請再試一次。');
        }
    });
}


async function handleChallengeMonsterClick(event, monsterIdToChallenge = null, ownerId = null, npcId = null, ownerNickname = null) {
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
    
    if (playerMonster.hp < playerMonster.initial_max_hp * 0.25) {
        showFeedbackModal('無法出戰', '瀕死狀態無法出戰，請先治療您的怪獸。');
        return;
    }

    let opponentMonster = null;

    try {
        showFeedbackModal('準備戰鬥...', '正在獲取對手資訊...', true);
        
        playerMonster.farmStatus = { ...playerMonster.farmStatus, isBattling: true };
        renderMonsterFarm();
        updateMonsterSnapshot(playerMonster);

        if (npcId) {
            const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
            opponentMonster = npcTemplates.find(npc => npc.id === npcId);
            if (!opponentMonster) throw new Error(`找不到ID為 ${npcId} 的NPC對手。`);
            opponentMonster = JSON.parse(JSON.stringify(opponentMonster));
            opponentMonster.isNPC = true;
        } else if (monsterIdToChallenge && ownerId && ownerId !== gameState.playerId) {
            const opponentPlayerData = await getPlayerData(ownerId);
            if (!opponentPlayerData || !opponentPlayerData.farmedMonsters) throw new Error('無法獲取對手玩家資料。');
            opponentMonster = opponentPlayerData.farmedMonsters.find(m => m.id === monsterIdToChallenge);
            if (!opponentMonster) throw new Error(`找不到對手玩家的怪獸ID ${monsterIdToChallenge}。`);
        } else {
            const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
            if (npcTemplates.length > 0) {
                opponentMonster = JSON.parse(JSON.stringify(npcTemplates[Math.floor(Math.random() * npcTemplates.length)]));
                opponentMonster.isNPC = true;
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
                    showFeedbackModal('戰鬥中...', '正在激烈交鋒...', true);
                    
                    const response = await simulateBattle({
                        player_monster_data: playerMonster,
                        opponent_monster_data: opponentMonster,
                        opponent_owner_id: ownerId,
                        opponent_owner_nickname: ownerNickname
                    });

                    const battleResult = response.battle_result;
                    
                    await refreshPlayerData(); 
                    updateMonsterSnapshot(getSelectedMonster()); 

                    hideModal('feedback-modal');
                    
                    // === 核心修改處 ===
                    // 將 playerMonster 和 opponentMonster 這兩個在外部作用域已定義好的變數傳遞進去
                    showBattleLogModal(battleResult, playerMonster, opponentMonster);

                    if (battleResult.newly_awarded_titles && battleResult.newly_awarded_titles.length > 0) {
                        checkAndShowNewTitleModal(battleResult); 
                    }

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
