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
// 修改 handleAdventureChoiceClick 函式來處理後端回傳的新格式
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

        // 根據後端回傳的事件結果類型來決定下一步動作
        switch (result.event_outcome) {
            case 'boss_win':
                // BOSS戰勝利
                await refreshPlayerData(); // 刷新以獲取戰鬥後的資料
                showBattleLogModal(result.battle_result); // 顯示戰報
                // 戰報關閉後，UI會自動根據最新的 adventure_progress 刷新
                break;

            case 'boss_loss':
                // BOSS戰失敗
                await refreshPlayerData(); // 刷新以獲取戰鬥後的資料
                showBattleLogModal(result.battle_result); // 顯示戰報
                // 戰報關閉後，UI會自動根據最新的 adventure_progress (is_active: false) 刷新回主介面
                break;
            
            case 'choice_resolved':
            default:
                // 一般事件選擇
                if (descriptionEl) {
                    descriptionEl.innerHTML = `<p>${result.outcome_story || '什麼事都沒發生...'}</p>`;
                }
                if (choicesEl) choicesEl.innerHTML = '';
                
                gameState.playerData.adventure_progress = result.updated_progress;
                gameState.currentAdventureEvent = null; 
                
                renderAdventureProgressUI(result.updated_progress);
                break;
        }

    } catch (error) {
        console.error("處理事件選擇失敗:", error);
        showFeedbackModal('處理失敗', error.message);
        if (choicesEl) {
            choicesEl.querySelectorAll('button').forEach(btn => btn.disabled = false);
        }
    }
}

// 新增一個函式來處理放棄遠征
async function handleAbandonAdventure() {
    showConfirmationModal(
        '確認放棄',
        '您確定要中途放棄本次遠征嗎？所有進度將會遺失。',
        async () => {
            showFeedbackModal('正在撤退...', '正在從冒險島返回農場...', true);
            try {
                const result = await fetchAPI('/adventure/abandon', { method: 'POST' });
                if (result && result.success) {
                    await refreshPlayerData(); // 從伺服器獲取最新的狀態
                    initializeAdventureUI(); // 重新渲染冒險島主介面
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
// --- 核心修改處 END ---

/**
 * 初始化冒險島所有功能的事件監聽器。
 */
function initializeAdventureHandlers() {
    const adventureContainer = DOMElements.guildContent;

    if (adventureContainer) {
        // 使用事件委派來處理所有點擊
        adventureContainer.addEventListener('click', (event) => {
            const challengeButton = event.target.closest('.challenge-facility-btn');
            const advanceButton = event.target.closest('#adventure-advance-btn');
            const choiceButton = event.target.closest('.adventure-choice-btn');
            // --- 核心修改處 START ---
            const abandonButton = event.target.closest('#adventure-abandon-btn'); // 監聽放棄按鈕
            // --- 核心修改處 END ---

            if (challengeButton) {
                handleFacilityChallengeClick(event);
            } else if (advanceButton) {
                handleAdvanceClick();
            } else if (choiceButton) {
                handleAdventureChoiceClick(choiceButton);
            } 
            // --- 核心修改處 START ---
            else if (abandonButton) {
                handleAbandonAdventure(); // 呼叫放棄函式
            }
            // --- 核心修改處 END ---
        });
        console.log("冒險島事件處理器已成功初始化。");
    } else {
        setTimeout(initializeAdventureHandlers, 100);
    }
}
