// js/handlers/adventure-handlers.js
// 專門處理「冒險島」頁籤內的所有使用者互動事件。

/**
 * 處理點擊冒險島設施卡片上的「挑戰」按鈕。
 * @param {Event} event - 點擊事件對象。
 */
function handleFacilityChallengeClick(event) {
    const button = event.target.closest('.challenge-facility-btn');
    if (!button) return;

    const facilityId = button.dataset.facilityId; 
    if (!facilityId) {
        console.error("挑戰按鈕上缺少 'data-facility-id' 屬性。");
        return;
    }

    const islandsData = gameState.gameConfigs.adventure_islands || [];
    let facilityData = null;
    let islandId = null;

    for (const island of islandsData) {
        if (island.facilities && Array.isArray(island.facilities)) {
            facilityData = island.facilities.find(fac => fac.facilityId === facilityId);
            if (facilityData) {
                islandId = island.islandId;
                break;
            }
        }
    }

    if (facilityData) {
        showTeamSelectionModal(facilityData, islandId);
    } else {
        console.error(`在遊戲設定中找不到 ID 為 ${facilityId} 的設施資料。`);
        showFeedbackModal('錯誤', '找不到該設施的詳細資料。');
    }
}

/**
 * 處理開始遠征的邏輯，呼叫後端 API。
 * @param {string} islandId - 島嶼ID
 * @param {string} facilityId - 設施ID
 * @param {Array<string>} teamMonsterIds - 被選中的怪獸ID列表
 */
async function initiateExpedition(islandId, facilityId, teamMonsterIds) {
    hideModal('expedition-team-selection-modal');
    showFeedbackModal('準備出發...', `正在為「${facilityId}」組建遠征隊...`, true);

    try {
        const result = await startExpedition(islandId, facilityId, teamMonsterIds);

        if (result && result.success) {
            if (gameState.playerData) {
                gameState.playerData.adventure_progress = result.adventure_progress;
            }
            await refreshPlayerData();
            hideModal('feedback-modal');
            renderAdventureProgressUI(result.adventure_progress);
        } else {
            throw new Error(result?.error || '未知的錯誤導致遠征無法開始。');
        }

    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('出發失敗', `無法開始遠征：${error.message}`);
    }
}


/**
 * 處理點擊「繼續前進」按鈕的邏輯
 */
async function handleAdvanceClick() {
    const advanceBtn = document.getElementById('adventure-advance-btn');
    if (!advanceBtn || advanceBtn.disabled) return;

    advanceBtn.disabled = true;
    advanceBtn.textContent = '前進中...';

    try {
        const result = await advanceAdventure();
        if (result && result.success && result.event_data) {
            const eventData = result.event_data;
            
            gameState.currentAdventureEvent = eventData;
            
            const descriptionEl = document.getElementById('adventure-event-description');
            if (descriptionEl) {
                descriptionEl.innerHTML = `<p>${eventData.description || '前方一片迷霧...'}</p>`;
            }

            const choicesEl = document.getElementById('adventure-event-choices');
            if (choicesEl) {
                choicesEl.innerHTML = (eventData.choices || []).map(choice => 
                    `<button class="button secondary w-full adventure-choice-btn" data-choice-id="${choice.choice_id}">${choice.text}</button>`
                ).join('');
            }
            
            // 收到事件後，隱藏「繼續前進」按鈕，等待玩家做選擇
            advanceBtn.style.display = 'none';

        } else {
            throw new Error(result?.error || '無法獲取下一個事件。');
        }
    } catch (error) {
        console.error("推進冒險失敗:", error);
        showFeedbackModal('推進失敗', error.message);
        if(advanceBtn) {
            advanceBtn.disabled = false;
            advanceBtn.textContent = '繼續前進';
        }
    }
}


// --- 核心修改處 START ---
/**
 * 處理玩家對冒險事件做出選擇後的邏輯
 * @param {HTMLElement} buttonElement - 被點擊的選項按鈕
 */
async function handleAdventureChoiceClick(buttonElement) {
    const choiceId = buttonElement.dataset.choiceId;
    const eventData = gameState.currentAdventureEvent;

    if (!eventData) {
        console.error("錯誤：找不到當前的冒險事件資料。");
        return;
    }

    // 專門處理 BOSS 戰事件
    if (eventData.event_type === 'boss_encounter') {
        const bossData = eventData.boss_data;
        if (!bossData) {
            showFeedbackModal('錯誤', 'BOSS資料遺失，無法開始戰鬥。');
            return;
        }

        // 注意：這裡假設玩家用主出戰怪獸挑戰，而非遠征隊成員
        const playerMonster = getSelectedMonster();
        if (!playerMonster) {
            showFeedbackModal('錯誤', '請先設定一隻出戰怪獸以挑戰BOSS！');
            return;
        }
        
        showConfirmationModal(
            `挑戰 ${bossData.nickname}`,
            `您確定要讓 ${playerMonster.nickname} 挑戰 ${bossData.nickname} 嗎？`,
            async () => {
                try {
                    showFeedbackModal('戰鬥中...', '正在與樓層BOSS激烈交鋒...', true);
                    
                    const response = await simulateBattle({
                        player_monster_data: playerMonster,
                        opponent_monster_data: bossData,
                        opponent_owner_id: "ADVENTURE_BOSS",
                        opponent_owner_nickname: "冒險島",
                    });
                    
                    const battleResult = response.battle_result;
                    showBattleLogModal(battleResult);
                    
                    // 檢查戰鬥結果
                    if (battleResult.winner_id === playerMonster.id) {
                        // 勝利
                        showFeedbackModal('通關結算中...', '正在前往下一層...', true);
                        const advanceResult = await completeAdventureFloor();
                        if (advanceResult.success) {
                            await refreshPlayerData();
                            gameState.playerData.adventure_progress = advanceResult.new_progress;
                            renderAdventureProgressUI(advanceResult.new_progress);
                        }
                    } else {
                        // 失敗或平手
                        if (gameState.playerData?.adventure_progress) {
                            gameState.playerData.adventure_progress.is_active = false;
                        }
                        await savePlayerData(gameState.playerId, gameState.playerData);
                        await refreshPlayerData();
                        initializeAdventureUI(); // 重新渲染冒險島主介面
                        showFeedbackModal('遠征失敗', '您的隊伍已被擊敗，本次遠征結束。');
                    }
                    
                } catch (battleError) {
                    showFeedbackModal('戰鬥失敗', `模擬BOSS戰鬥時發生錯誤: ${battleError.message}`);
                    console.error("模擬BOSS戰鬥錯誤:", battleError);
                } finally {
                     hideModal('feedback-modal');
                }
            },
            { confirmButtonClass: 'primary', confirmButtonText: '開始戰鬥' }
        );

    } else {
        showFeedbackModal('提示', `您選擇了「${choiceId}」，該功能尚在開發中！`);
    }
}

/**
 * 初始化冒險島所有功能的事件監聽器。
 */
function initializeAdventureHandlers() {
    const adventureContainer = DOMElements.guildContent;

    if (adventureContainer) {
        adventureContainer.addEventListener('click', (event) => {
            const challengeButton = event.target.closest('.challenge-facility-btn');
            const advanceButton = event.target.closest('#adventure-advance-btn');
            const choiceButton = event.target.closest('.adventure-choice-btn');

            if (challengeButton) {
                handleFacilityChallengeClick(event);
            } else if (advanceButton) {
                handleAdvanceClick();
            } else if (choiceButton) {
                handleAdventureChoiceClick(choiceButton);
            }
        });
        console.log("冒險島事件處理器已成功初始化。");
    } else {
        setTimeout(initializeAdventureHandlers, 100);
    }
}
// --- 核心修改處 END ---
