// js/ui/ui-champions.js
// 負責渲染「冠軍殿堂」區塊的 UI

/**
 * 處理挑戰冠軍或佔領席位的點擊事件。
 * @param {Event} event - 點擊事件。
 * @param {number} rankToChallenge - 欲挑戰或佔領的排名 (1-4)。
 * @param {object | null} opponentMonster - 該席位的怪獸物件，如果為空位則為 null。
 */
async function handleChampionChallengeClick(event, rankToChallenge, opponentMonster) {
    if (event) event.stopPropagation();

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

    let finalOpponent;
    let confirmationTitle;
    let confirmationMessage;

    const playerDisplayName = getMonsterDisplayName(playerMonster, gameState.gameConfigs);

    if (opponentMonster) {
        finalOpponent = opponentMonster;
        confirmationTitle = `挑戰第 ${rankToChallenge} 名`;
        const opponentDisplayName = getMonsterDisplayName(finalOpponent, gameState.gameConfigs);
        confirmationMessage = `您確定要讓 ${playerDisplayName} 挑戰 ${opponentDisplayName} 的席位嗎？`;
    } else {
        confirmationTitle = `佔領第 ${rankToChallenge} 名`;
        confirmationMessage = `您確定要讓 ${playerDisplayName} 挑戰殿堂守護者，以佔領第 ${rankToChallenge} 名的席位嗎？`;
        
        const guardians = gameState.gameConfigs?.champion_guardians;
        const guardianData = guardians ? guardians[`rank${rankToChallenge}`] : null;

        if (guardianData) {
            finalOpponent = { ...guardianData }; 
        } else {
             finalOpponent = {
                id: `npc_guardian_${rankToChallenge}`,
                nickname: '殿堂守護者',
                element_nickname_part: '殿堂守護者', 
                isNPC: true,
                rarity: "稀有",
                elements: ["混"],
                initial_max_hp: 888 + (4 - rankToChallenge) * 50,
                hp: 888 + (4 - rankToChallenge) * 50,
                initial_max_mp: 888 + (4 - rankToChallenge) * 20,
                mp: 888 + (4 - rankToChallenge) * 20,
                attack: 333 + (4 - rankToChallenge) * 10,
                defense: 333 + (4 - rankToChallenge) * 10,
                speed: 100 + (4 - rankToChallenge) * 5,
                crit: 10,
                skills: [
                    { name: "揮指", level: 5 },
                    { name: "泰山壓頂", level: 5 }
                ],
                personality: { name: "冷静的" },
                score: 200 + (4 - rankToChallenge) * 50
            };
        }
    }

    showConfirmationModal(
        confirmationTitle,
        confirmationMessage,
        async () => {
            try {
                showFeedbackModal('戰鬥中...', '正在激烈交鋒...', true);
                
                const response = await simulateBattle({
                    player_monster_data: playerMonster,
                    opponent_monster_data: finalOpponent,
                    opponent_owner_id: finalOpponent.owner_id || null, 
                    opponent_owner_nickname: finalOpponent.owner_nickname || "冠軍守護者",
                    is_champion_challenge: true,
                    challenged_rank: rankToChallenge
                });

                await refreshPlayerData(); 
                await handleMonsterLeaderboardClick(); 
                
                hideModal('feedback-modal');
                showBattleLogModal(response.battle_result, playerMonster, finalOpponent);

                if (response.battle_result && typeof checkAndShowNewTitleModal === 'function') {
                    checkAndShowNewTitleModal(response.battle_result); 
                }

            } catch (battleError) {
                hideModal('feedback-modal');
                showFeedbackModal('戰鬥失敗', `模擬冠軍戰鬥時發生錯誤: ${battleError.message}`);
                console.error("模擬冠軍戰鬥錯誤:", battleError);
                await refreshPlayerData(); 
            }
        },
        { confirmButtonClass: 'primary', confirmButtonText: '開始戰鬥' }
    );
}

/**
 * 根據真實的冠軍數據，渲染冠軍殿堂的四個欄位。
 * @param {Array<object|null>} championsData - 從後端獲取的、包含四個冠軍槽位怪獸資料的陣列。
 */
function renderChampionSlots(championsData) {
    const section = document.querySelector('.champions-section');
    const container = document.getElementById('champions-grid-container');
    if (!container || !section) {
        console.error("冠軍殿堂的容器 'champions-grid-container' 或 'champions-section' 未找到。");
        return;
    }

    // 確保獎勵區只會被創建一次
    if (!section.querySelector('.champion-rewards-container')) {
        const rewardsContainer = document.createElement('div');
        rewardsContainer.className = 'champion-rewards-container';
        rewardsContainer.innerHTML = `
            <h5 class="rewards-title">每日在位獎勵</h5>
            <div class="rewards-grid">
                <div class="reward-item">
                    <span class="reward-rank">冠軍</span>
                    <span class="reward-value">100 🪙</span>
                </div>
                <div class="reward-item">
                    <span class="reward-rank">亞軍</span>
                    <span class="reward-value">30 🪙</span>
                </div>
                <div class="reward-item">
                    <span class="reward-rank">季軍</span>
                    <span class="reward-value">20 🪙</span>
                </div>
                <div class="reward-item">
                    <span class="reward-rank">殿軍</span>
                    <span class="reward-value">10 🪙</span>
                </div>
            </div>
        `;
        container.before(rewardsContainer);
    }

    const playerMonster = getSelectedMonster();
    const playerId = gameState.playerId;
    let playerChampionRank = 0; 

    championsData.forEach((monster, index) => {
        if (monster && monster.owner_id === playerId) {
            playerChampionRank = index + 1;
        }
    });

    championsData.forEach((monster, index) => {
        const rank = index + 1;
        const slot = container.querySelector(`.champion-slot[data-rank="${rank}"]`);
        if (!slot) return;

        slot.innerHTML = ''; 

        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'champion-avatar-container';
        if (rank === 1) {
            avatarContainer.innerHTML = '<span class="champion-crown">👑</span>';
        }
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'champion-avatar';
        avatarContainer.appendChild(avatarDiv);
        
        const identityContainer = document.createElement('div');
        identityContainer.className = 'champion-identity-container';

        const buttonEl = document.createElement('button');
        buttonEl.className = 'champion-challenge-btn button secondary text-xs';

        if (monster) {
            slot.classList.add('occupied');
            
            // --- 核心修改處 START ---
            // 判斷是否為 NPC 守衛
            if (monster.isNPC) {
                // 如果是 NPC，不顯示圖片，只顯示文字
                avatarDiv.innerHTML = `<span class="champion-placeholder-text">守護者</span>`;
            } else {
                // 如果是玩家怪獸，正常顯示頭像
                const headInfo = monster.head_dna_info || { type: '無', rarity: '普通' };
                const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);
                if (imagePath) {
                    const img = document.createElement('img');
                    img.src = imagePath;
                    img.alt = monster.nickname || '怪獸頭像';
                    avatarDiv.appendChild(img);
                } else {
                     avatarDiv.innerHTML = `<span class="champion-placeholder-text">無頭像</span>`;
                }
            }
            // --- 核心修改處 END ---
            
            const ownerTag = document.createElement('span');
            ownerTag.className = 'champion-owner-tag';
            ownerTag.textContent = monster.owner_nickname || '未��玩家';

            const monsterNameSpan = document.createElement('span');
            monsterNameSpan.className = 'champion-monster-name';
            monsterNameSpan.innerHTML = getMonsterDisplayName(monster, gameState.gameConfigs);
            
            identityContainer.appendChild(ownerTag);
            identityContainer.appendChild(document.createTextNode(' 的 '));
            identityContainer.appendChild(monsterNameSpan);

            if (monster.occupiedTimestamp) {
                const nowInSeconds = Math.floor(Date.now() / 1000);
                const occupiedTimestamp = monster.occupiedTimestamp;
                const durationInSeconds = nowInSeconds - occupiedTimestamp;
                const daysInReign = Math.floor(durationInSeconds / 86400);
                
                const reignSpan = document.createElement('span');
                reignSpan.className = 'champion-reign-duration';
                reignSpan.textContent = `(在位 ${daysInReign} 天)`;
                identityContainer.appendChild(reignSpan);
            }

            if (monster.owner_id === playerId) {
                buttonEl.textContent = "你的席位";
                buttonEl.disabled = true;
            } else {
                let canChallenge = false;
                if (playerMonster) {
                    if (playerChampionRank === 0 && rank === 4) {
                        canChallenge = true;
                    } else if (playerChampionRank > 0 && rank === playerChampionRank - 1) {
                        canChallenge = true;
                    }
                }
                
                buttonEl.textContent = "挑戰";
                buttonEl.disabled = !canChallenge;
                if(canChallenge) buttonEl.classList.replace('secondary', 'primary');

                if (canChallenge) {
                    buttonEl.addEventListener('click', (e) => handleChampionChallengeClick(e, rank, monster));
                }
            }
        } else {
            // 這個分支現在理論上不會被觸發，因為後端會填入守衛資料，但保留以防萬一
            slot.classList.remove('occupied'); 
            avatarDiv.innerHTML = `<span class="champion-placeholder-text">虛位以待</span>`;
            const rankNames = { 1: '冠軍', 2: '亞軍', 3: '季軍', 4: '殿軍' };
            const placeholderName = document.createElement('span');
            placeholderName.className = 'champion-name';
            placeholderName.textContent = rankNames[rank];
            identityContainer.appendChild(placeholderName);
            
            let canOccupy = false;
            if (playerMonster) {
                if (playerChampionRank === 0 && rank === 4) {
                    canOccupy = true;
                } 
                else if (playerChampionRank > 0 && rank === playerChampionRank - 1) {
                    canOccupy = true;
                }
            }

            buttonEl.textContent = "佔領";
            buttonEl.disabled = !canOccupy;
            if(canOccupy) buttonEl.classList.replace('secondary', 'success');

            if (canOccupy) {
                 buttonEl.addEventListener('click', (e) => handleChampionChallengeClick(e, rank, null));
            }
        }
        
        slot.appendChild(avatarContainer);
        slot.appendChild(identityContainer);
        slot.appendChild(buttonEl);
    });
}
