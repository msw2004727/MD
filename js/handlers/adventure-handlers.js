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

        switch (result.event_outcome) {
            case 'boss_win':
            case 'boss_loss':
                // 處理BOSS戰結果
                await refreshPlayerData(); // 刷新以獲取戰鬥後的資料
                if (result.battle_result) {
                    showBattleLogModal(result.battle_result); // 顯示戰報
                }
                // 關閉戰報後，main.js中的監聽器會刷新UI，此處不需額外渲染
                // 如果是戰敗，is_active會是false，自動回到設施選擇畫面
                // 如果是勝利，is_active是true，且樓層+1，會自動渲染下一層的畫面
                break;
            
            case 'choice_resolved':
            default:
                // 處理一般事件選擇結果
                gameState.playerData.adventure_progress = result.updated_progress;
                gameState.currentAdventureEvent = null; 

                // 手動更新UI以顯示結果，而不是完全重繪
                if (descriptionEl) {
                    descriptionEl.innerHTML = `<p>${result.outcome_story || '什麼事都沒發生...'}</p>`;
                }
                if (choicesEl) {
                    choicesEl.innerHTML = ''; // 清空選項
                }

                // 更新左側隊伍狀態面板
                const teamPanel = document.querySelector('.adventure-team-status-panel');
                if (teamPanel) {
                    let teamStatusHtml = '<h4 class="details-section-title" style="margin-bottom: 0.5rem; text-align: center;">遠征隊</h4>';
                    result.updated_progress.expedition_team.forEach((member, index) => {
                         const originalMonster = gameState.playerData.farmedMonsters.find(m => m.id === member.monster_id);
                         if (!originalMonster) return;
                         const headInfo = { type: '無', rarity: '普通' };
                         const constituentIds = originalMonster.constituent_dna_ids || [];
                         if (constituentIds.length > 0) {
                             const headDnaId = constituentIds[0];
                             const headDnaTemplate = gameState.gameConfigs.dna_fragments.find(dna => dna.id === headDnaId);
                             if (headDnaTemplate) {
                                 headInfo.type = headDnaTemplate.type || '無';
                                 headInfo.rarity = headDnaTemplate.rarity || '普通';
                             }
                         }
                         const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);
                         const isCaptain = index === 0;
                         const captainMedal = isCaptain ? '<span class="captain-medal" title="遠征隊隊長">🎖️</span>' : '';
                         teamStatusHtml += `
                             <div class="team-member-card">
                                 <div class="avatar" style="background-image: url('${imagePath}')"></div>
                                 <div class="info">
                                     <div class="name text-rarity-${(originalMonster.rarity || 'common').toLowerCase()}">${member.nickname} ${captainMedal}</div>
                                     <div class="status-bar-container" style="gap: 4px; margin-top: 2px;">
                                         <div class="status-bar-background" style="height: 8px;">
                                             <div class="status-bar-fill" style="width: ${(member.current_hp / originalMonster.initial_max_hp) * 100}%; background-color: var(--success-color);"></div>
                                         </div>
                                         <span class="status-bar-value" style="font-size: 0.7rem;">${member.current_hp}/${originalMonster.initial_max_hp}</span>
                                     </div>
                                 </div>
                             </div>
                         `;
                    });
                    teamPanel.innerHTML = teamStatusHtml;
                }

                // 顯示「繼續前進」按鈕
                const advanceBtn = document.getElementById('adventure-advance-btn');
                if(advanceBtn) {
                    advanceBtn.style.display = 'block';
                    advanceBtn.disabled = false;
                    advanceBtn.textContent = '繼續前進';
                }
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

async function handleAbandonAdventure() {
    showConfirmationModal(
        '確認放棄',
        '您確定要中途放棄本次遠征嗎？所有進度將會遺失。',
        async () => {
            showFeedbackModal('正在撤退...', '正在從冒險島返回農場...', true);
            try {
                // 我們先前已在後端 adventure_routes.py 建立此 API
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
// --- 核心修改處 END ---

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
