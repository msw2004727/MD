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
        if (result && result.success) {
            gameState.playerData.adventure_progress = result.updated_progress;
            gameState.currentAdventureEvent = result.event_data;
            
            renderAdventureProgressUI(result.updated_progress);
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

async function handleAdventureChoiceClick(buttonElement) {
    const choiceId = buttonElement.dataset.choiceId;
    if (!choiceId) return;

    const choicesEl = document.getElementById('adventure-event-choices');
    if (choicesEl) {
        choicesEl.querySelectorAll('button').forEach(btn => btn.disabled = true);
    }
    const descriptionEl = document.getElementById('adventure-event-description');
    if (descriptionEl) {
        descriptionEl.innerHTML += `<p class="mt-4 text-center text-[var(--accent-color)]">處理中...</p>`;
    }

    try {
        const currentProgress = gameState.playerData?.adventure_progress;
        const currentEvent = currentProgress?.current_event;

        let captainId = null;
        let opponentBossData = null;

        if (currentEvent?.event_type === "boss_encounter") {
            captainId = currentProgress.expedition_team[0].monster_id;
            opponentBossData = currentEvent.boss_data; 
        }

        const result = await resolveAdventureEvent(choiceId);

        if (!result || !result.success) {
            throw new Error(result?.error || '處理事件時發生未知錯誤。');
        }
        
        const battleResult = result.battle_result;
        const updatedProgress = result.updated_progress;
        
        // --- 核心修改處 START ---
        if (result.event_outcome === 'boss_win' || result.event_outcome === 'boss_loss') {
            // 戰鬥結束，先刷新一次資料
            await refreshPlayerData();
            
            // 從最新的資料中，找到正確的我方與敵方怪獸物件
            const finalCaptainMonster = captainId ? gameState.playerData.farmedMonsters.find(m => m.id === captainId) : null;
            const finalOpponentMonster = opponentBossData;

            // 判斷勝利、平手或失敗
            if (battleResult && battleResult.winner_id === captainId) {
                // 勝利
                gameState.playerData.adventure_progress = updatedProgress;
                renderAdventureProgressUI(updatedProgress);
                showBattleLogModal(battleResult, finalCaptainMonster, finalOpponentMonster);

            } else if (battleResult && battleResult.winner_id === "平手") {
                // 平手
                const drawActions = [
                    {
                        text: '放棄遠征',
                        class: 'secondary',
                        onClick: () => handleAbandonAdventure()
                    },
                    {
                        text: '再次挑戰',
                        class: 'primary',
                        onClick: () => handleAdventureChoiceClick(buttonElement) 
                    }
                ];
                showBattleLogModal(battleResult, finalCaptainMonster, finalOpponentMonster, drawActions);

            } else {
                // 失敗
                const lossActions = [{
                    text: '返回農場',
                    class: 'primary',
                    onClick: () => {
                        hideModal('feedback-modal');
                        initializeAdventureUI();
                    }
                }];
                // 先顯示戰報，關閉後再顯示失敗訊息
                showBattleLogModal(battleResult, finalCaptainMonster, finalOpponentMonster);
                // 這裡可以延遲一點彈出，避免兩個視窗重疊
                setTimeout(() => {
                    showFeedbackModal('遠征失敗', '隊長被打到瀕死，隊員們趕緊將隊長扛回農場進行急救！', false, null, lossActions);
                }, 300);
            }

        } else {
            // 處理一般事件
            gameState.playerData.adventure_progress = result.updated_progress;
            gameState.currentAdventureEvent = null; 

            const progressForRendering = {
                ...result.updated_progress,
                story_override: result.outcome_story 
            };
            renderAdventureProgressUI(progressForRendering);
        }
        // --- 核心修改處 END ---

    } catch (error) {
        console.error("處理事件選擇失敗:", error);
        showFeedbackModal('處理失敗', error.message);
        if (choicesEl) {
            choicesEl.querySelectorAll('button').forEach(btn => btn.disabled = false);
        }
    }
}

async function handleAbandonAdventure() {
    showConfirmationModal(
        '確認放棄',
        '您確定要中途放棄本次遠征嗎？所有進度將會遺失。',
        async () => {
            showFeedbackModal('正在撤退...', '正在從冒險島返回農場...', true);
            try {
                const result = await fetchAPI('/adventure/abandon', { method: 'POST' });
                if (result && result.success) {
                    await refreshPlayerData();
                    initializeAdventureUI();
                    hideModal('feedback-modal');
                    showFeedbackModal('遠征結束', '您已成功返回農場。');
                } else {
                    throw new Error(result?.error || '未知的錯誤');
                }
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('操作失敗', `無法放棄遠征：${error.message}`);
            }
        },
        { confirmButtonClass: 'danger', confirmButtonText: '確定放棄' }
    );
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
            const abandonButton = event.target.closest('#adventure-abandon-btn');

            if (challengeButton) {
                handleFacilityChallengeClick(event);
            } else if (advanceButton) {
                handleAdvanceClick();
            } else if (choiceButton) {
                handleAdventureChoiceClick(choiceButton);
            } 
            else if (abandonButton) {
                handleAbandonAdventure();
            }
        });
        console.log("冒險島事件處理器已成功初始化。");
    } else {
        setTimeout(initializeAdventureHandlers, 100);
    }
}
