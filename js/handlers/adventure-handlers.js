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
        // 呼叫在 ui-adventure.js 中新增的函式來顯示隊伍選擇彈窗
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
            // 更新本地的 adventure_progress 狀態
            if (gameState.playerData) {
                gameState.playerData.adventure_progress = result.adventure_progress;
            }
            // 重新整理一次玩家資料，確保金幣等狀態同步
            await refreshPlayerData();

            hideModal('feedback-modal');
            
            // 呼叫 UI 函式渲染遠征畫面
            renderAdventureProgressUI(result.adventure_progress);

        } else {
            throw new Error(result?.error || '未知的錯誤導致遠征無法開始。');
        }

    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('出發失敗', `無法開始遠征：${error.message}`);
    }
}


// --- 核心修改處 START ---
/**
 * 新增函式：處理點擊「繼續前進」按鈕的邏輯
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
            
            // 更新事件描述
            const descriptionEl = document.getElementById('adventure-event-description');
            if (descriptionEl) {
                descriptionEl.innerHTML = `<p>${eventData.description || '前方一片迷霧...'}</p>`;
            }

            // 更新選項按鈕
            const choicesEl = document.getElementById('adventure-event-choices');
            if (choicesEl) {
                choicesEl.innerHTML = (eventData.choices || []).map(choice => 
                    `<button class="button secondary w-full adventure-choice-btn" data-choice-id="${choice.choice_id}">${choice.text}</button>`
                ).join('');
            }
            // 更新進度條
            if (gameState.playerData?.adventure_progress) {
                 gameState.playerData.adventure_progress.current_step += 1;
                 renderAdventureProgressUI(gameState.playerData.adventure_progress);
            }
            
        } else {
            throw new Error(result?.error || '無法獲取下一個事件。');
        }
    } catch (error) {
        console.error("推進冒險失敗:", error);
        showFeedbackModal('推進失敗', error.message);
    } finally {
        if(advanceBtn) {
            advanceBtn.disabled = false;
            advanceBtn.textContent = '繼續前進';
        }
    }
}

/**
 * 初始化冒險島所有功能的事件監聽器。
 */
function initializeAdventureHandlers() {
    const adventureContainer = DOMElements.guildContent;

    if (adventureContainer) {
        // 使用事件委派，將監聽器綁定在父容器上
        adventureContainer.addEventListener('click', (event) => {
            const challengeButton = event.target.closest('.challenge-facility-btn');
            const advanceButton = event.target.closest('#adventure-advance-btn');
            
            if (challengeButton) {
                // 如果點擊的是挑戰按鈕
                handleFacilityChallengeClick(event);
            } else if (advanceButton) {
                // 如果點擊的是繼續前進按鈕
                handleAdvanceClick();
            }
        });
        console.log("冒險島事件處理器已成功初始化。");
    } else {
        // 後備機制
        setTimeout(initializeAdventureHandlers, 100);
    }
}
// --- 核心修改處 END ---
