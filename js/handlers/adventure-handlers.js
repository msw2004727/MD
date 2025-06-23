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
        // --- 核心修改處 START ---
        // result 現在會包含 updated_progress 和 event_data
        const result = await advanceAdventure(); 
        if (result && result.success) {
            // 使用後端回傳的最新進度，更新本地 gameState
            gameState.playerData.adventure_progress = result.updated_progress;
            gameState.currentAdventureEvent = result.event_data;
            
            // 使用更新後的 gameState，重新渲染整個冒險介面
            renderAdventureProgressUI(result.updated_progress);
        } else {
            throw new Error(result?.error || '無法獲取下一個事件。');
        }
        // --- 核心修改處 END ---

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

        // --- 核心修改處 START ---
        // 統一處理邏輯，無論結果如何，都先更新本地狀態，然後重繪UI
        gameState.playerData.adventure_progress = result.updated_progress;
        gameState.currentAdventureEvent = null; // 事件已解決，清除當前事件
        
        // 使用新的、包含事件結果描述的進度物件來重新渲染
        // 我們需要一個臨時的 progress 物件來傳遞 story
        const progressForRendering = {
            ...result.updated_progress,
            story_override: result.outcome_story 
        };
        renderAdventureProgressUI(progressForRendering);

        // 如果是戰鬥，在UI渲染後再彈出戰報
        if (result.event_outcome === 'boss_win' || result.event_outcome === 'boss_loss') {
            if (result.battle_result) {
                showBattleLogModal(result.battle_result);
            }
            // 如果戰敗，遠征結束，刷新後會自動回到設施選擇畫面
            if (result.event_outcome === 'boss_loss') {
                await refreshPlayerData();
                initializeAdventureUI();
            }
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
        // 使用事件委派來捕捉所有在冒險島內的點擊
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
        // 如果容器還不存在，稍後再試
        setTimeout(initializeAdventureHandlers, 100);
    }
}
