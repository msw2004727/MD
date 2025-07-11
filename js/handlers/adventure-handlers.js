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
    
    let facilityName = facilityId; 
    const islandsData = gameState.gameConfigs?.adventure_islands || [];
    for (const island of islandsData) {
        const facility = island.facilities?.find(fac => fac.facilityId === facilityId);
        if (facility && facility.name) {
            facilityName = facility.name;
            break;
        }
    }
    
    const bannerUrl = gameState.assetPaths?.images?.modals?.expeditionStart || '';
    const messageHtml = `
        <div class="feedback-banner" style="text-align: center; margin-bottom: 15px;">
            <img src="${bannerUrl}" alt="準備遠征橫幅" style="max-width: 100%; border-radius: 6px;">
        </div>
        <p>正在為「${facilityName}」組建遠征隊...</p>
    `;
    showFeedbackModal('準備出發...', messageHtml, true);

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
        const result = await resolveAdventureEvent(choiceId);

        if (!result || !result.success) {
            throw new Error(result?.error || '處理事件時發生未知錯誤。');
        }
        
        const battleResult = result.battle_result;
        const updatedProgress = result.updated_progress;
        
        if (result.event_outcome === 'captain_defeated') {
            await refreshPlayerData(); 
            
            const progressForRendering = {
                ...result.updated_progress,
                story_override: result.outcome_story 
            };
            renderAdventureProgressUI(progressForRendering);

            const bannerUrl = 'https://github.com/msw2004727/MD/blob/main/images/BN020.png?raw=true';
            
            // --- 核心修改處 START ---
            const eventStory = result.outcome_story || "一場突如其來的災難降臨...";
            const messageHtml = `
                <div class="feedback-banner" style="text-align: center; margin-bottom: 15px;">
                    <img src="${bannerUrl}" alt="遠征失敗橫幅" style="max-width: 100%; border-radius: 6px;">
                </div>
                
                <div class="event-story-on-failure" style="margin-bottom: 1rem; padding: 0.75rem; background-color: var(--bg-primary); border-radius: 6px; border: 1px solid var(--border-color); text-align: center; font-size: 0.9em; color: var(--text-secondary);">
                   ${eventStory.replace(/\n/g, '<br>')}
                </div>

                <p class="text-center">你的隊伍失去了領導者，無法再繼續前進...</p>
            `;
            // --- 核心修改處 END ---

            const nextAction = () => {
                if (result.final_stats && typeof showExpeditionSummaryModal === 'function') {
                    showExpeditionSummaryModal(result.final_stats);
                } else {
                    initializeAdventureUI();
                }
            };

            showFeedbackModal(
                '隊長重傷，遠征失敗',
                messageHtml,
                false,
                null,
                [{ text: '查看遠征結算', class: 'primary', onClick: nextAction }]
            );

        } else if (result.event_outcome === 'boss_win' || result.event_outcome === 'boss_loss') {
            const captainId = gameState.playerData.adventure_progress.expedition_team[0].monster_id;
            const initialCaptainMonster = gameState.playerData.farmedMonsters.find(m => m.id === captainId);
            const initialOpponentMonster = gameState.currentAdventureEvent?.boss_data;

            await refreshPlayerData(); 
            
            if (!initialCaptainMonster || !initialOpponentMonster) {
                console.error("無法從 gameState 中獲取戰鬥前的怪獸初始資料。");
                showFeedbackModal('錯誤', '無法顯示戰報，遺失了戰鬥前的怪獸資料。');
                initializeAdventureUI(); 
                return;
            }

            if (battleResult.winner_id === captainId) { 
                gameState.playerData.adventure_progress = updatedProgress;
                renderAdventureProgressUI(updatedProgress);
                showBattleLogModal(battleResult, initialCaptainMonster, initialOpponentMonster);

            } else if (battleResult.winner_id === "平手") {
                const drawActions = [
                    { text: '放棄遠征', class: 'secondary', onClick: () => handleAbandonAdventure() },
                    { text: '再次挑戰', class: 'primary', onClick: () => handleAdventureChoiceClick(buttonElement) }
                ];
                showBattleLogModal(battleResult, initialCaptainMonster, initialOpponentMonster, drawActions);

            } else {
                showBattleLogModal(battleResult, initialCaptainMonster, initialOpponentMonster);
                
                if (updatedProgress && updatedProgress.expedition_stats) {
                     setTimeout(() => {
                        showExpeditionSummaryModal(updatedProgress.expedition_stats);
                    }, 500); 
                } else {
                    initializeAdventureUI();
                }
            }
        } else {
            if (result.updated_player_stats) {
                gameState.playerData.playerStats = result.updated_player_stats;
                if (typeof updatePlayerCurrencyDisplay === 'function') {
                    updatePlayerCurrencyDisplay(gameState.playerData.playerStats.gold);
                }
            }

            gameState.playerData.adventure_progress = result.updated_progress;
            gameState.currentAdventureEvent = null; 

            const progressForRendering = {
                ...result.updated_progress,
                story_override: result.outcome_story 
            };
            renderAdventureProgressUI(progressForRendering);
        }

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
                const result = await abandonAdventure(); 
                if (result && result.success) {
                    await refreshPlayerData();
                    hideModal('feedback-modal');

                    if (result.expedition_stats && typeof showExpeditionSummaryModal === 'function') {
                        showExpeditionSummaryModal(result.expedition_stats);
                    } else {
                        initializeAdventureUI();
                        showFeedbackModal('遠征結束', '您已安全返回農場。');
                    }
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
        adventureContainer.addEventListener('click', async (event) => {
            const challengeButton = event.target.closest('.challenge-facility-btn');
            const advanceButton = event.target.closest('#adventure-advance-btn');
            const choiceButton = event.target.closest('.adventure-choice-btn');
            const abandonButton = event.target.closest('#adventure-abandon-btn');
            const switchCaptainButton = event.target.closest('.switch-captain-btn');

            if (challengeButton) {
                handleFacilityChallengeClick(event);
            } else if (advanceButton) {
                await handleAdvanceClick();
            } else if (choiceButton) {
                await handleAdventureChoiceClick(choiceButton);
            } else if (abandonButton) {
                await handleAbandonAdventure();
            } else if (switchCaptainButton) {
                const monsterIdToPromote = switchCaptainButton.dataset.monsterId;
                if (!monsterIdToPromote) return;
                
                switchCaptainButton.disabled = true;

                try {
                    const result = await switchAdventureCaptain(monsterIdToPromote);
                    if (result && result.success) {
                        gameState.playerData.adventure_progress = result.updated_progress;
                        renderAdventureProgressUI(result.updated_progress);
                        console.log(`遠征隊隊長已成功更換為 ${monsterIdToPromote}。`);
                    } else {
                        throw new Error(result?.error || "更換隊長失敗。");
                    }
                } catch (error) {
                    console.error("更換隊長失敗:", error);
                    showFeedbackModal('錯誤', '更換隊長失敗，請稍後再試。');
                    switchCaptainButton.disabled = false;
                }
            }
        });
        console.log("冒險島事件處理器已成功初始化。");
    } else {
        setTimeout(initializeAdventureHandlers, 100);
    }
}
