// js/handlers/game-interaction-handlers.js

function initializeGameInteractionEventHandlers() {
    // 綁定核心遊戲玩法的按鈕事件
    if (DOMElements.combineButton) DOMElements.combineButton.addEventListener('click', handleCombineDna);
    if (DOMElements.dnaDrawButton) DOMElements.dnaDrawButton.addEventListener('click', handleDrawDNAClick);
    
    // 綁定其他互動事件
    handleDnaDrawModal();
    handleFriendAndPlayerInteractions();
    
    // 注意：原先在此處的其他函數（如 farm, leaderboard, nickname 等）已被移至更專門的 monster-handlers.js 中，此處不再需要呼叫。
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
