// js/ui-champions.js
// 負責渲染「冠軍殿堂」區塊的 UI

/**
 * 根據真實的冠軍數據，渲染冠軍殿堂的四個欄位，並實作挑戰按鈕的資格判斷邏輯。
 * @param {Array<object|null>} championsData - 從後端獲取的、包含四個冠軍槽位怪獸資料的陣列。
 */
function renderChampionSlots(championsData) {
    const container = document.getElementById('champions-grid-container');
    if (!container) {
        console.error("冠軍殿堂的容器 'champions-grid-container' 未找到。");
        return;
    }

    const playerMonster = getSelectedMonster();
    const playerId = gameState.playerId;
    let playerChampionRank = 0; // 0 表示玩家不是冠軍成員

    // 找出玩家自己是否在冠軍殿堂中，以及排名為何
    championsData.forEach((monster, index) => {
        if (monster && monster.owner_id === playerId) {
            playerChampionRank = index + 1;
        }
    });

    championsData.forEach((monster, index) => {
        const rank = index + 1;
        const slot = container.querySelector(`.champion-slot[data-rank="${rank}"]`);
        if (!slot) return;

        const avatarEl = slot.querySelector(`#champion-avatar-${rank}`);
        const nameEl = slot.querySelector(`#champion-name-${rank}`);
        const buttonEl = slot.querySelector(`#champion-challenge-btn-${rank}`);
        const reignDurationEl = slot.querySelector(`#champion-reign-duration-${rank}`);

        if (!avatarEl || !nameEl || !buttonEl || !reignDurationEl) return;

        // 清空舊內容
        avatarEl.innerHTML = '';
        reignDurationEl.style.display = 'none'; // 預設隱藏
        slot.classList.remove('occupied');

        // 移除舊的監聽器以防重複綁定
        const newButtonEl = buttonEl.cloneNode(true);
        buttonEl.parentNode.replaceChild(newButtonEl, buttonEl);

        if (monster) {
            // --- 如果名次已被佔領 ---
            slot.classList.add('occupied');

            // 1. 設置頭像
            const headInfo = monster.head_dna_info || { type: '無', rarity: '普通' };
            const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);
            if (imagePath) {
                const img = document.createElement('img');
                img.src = imagePath;
                img.alt = monster.nickname || '怪獸頭像';
                avatarEl.appendChild(img);
            } else {
                 avatarEl.innerHTML = `<span class="champion-placeholder-text">無頭像</span>`;
            }

            // 2. 設置名稱
            const displayName = getMonsterDisplayName(monster, gameState.gameConfigs);
            nameEl.textContent = displayName;
            const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
            const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
            nameEl.className = `champion-name text-rarity-${rarityKey}`;

            // 3. 設置在位時間
            if (monster.occupiedTimestamp) {
                const nowInSeconds = Math.floor(Date.now() / 1000);
                const occupiedTimestamp = monster.occupiedTimestamp;
                const durationInSeconds = nowInSeconds - occupiedTimestamp;
                
                // 86400 秒 = 1 天
                const daysInReign = Math.floor(durationInSeconds / 86400);

                reignDurationEl.textContent = `在位 ${daysInReign} 天`;
                reignDurationEl.style.display = 'block'; // 顯示旗幟
            }

            // 4. 設置按鈕邏輯
            if (monster.owner_id === playerId) {
                newButtonEl.textContent = "你的席位";
                newButtonEl.disabled = true;
                newButtonEl.className = 'champion-challenge-btn button secondary text-xs';
            } else {
                let canChallenge = false;
                if (playerMonster) {
                    if (playerChampionRank === 0 && rank === 4) {
                        canChallenge = true;
                    } else if (playerChampionRank > 0 && rank === playerChampionRank - 1) {
                        canChallenge = true;
                    }
                }
                
                newButtonEl.textContent = "挑戰";
                newButtonEl.disabled = !canChallenge;
                newButtonEl.className = `champion-challenge-btn button ${canChallenge ? 'primary' : 'secondary'} text-xs`;
                if (canChallenge) {
                    newButtonEl.addEventListener('click', (e) => {
                        handleChampionChallengeClick(e, rank, monster);
                    });
                }
            }

        } else {
            // --- 如果名次是空的 ---
            avatarEl.innerHTML = `<span class="champion-placeholder-text">虛位以待</span>`;
            
            const rankNames = { 1: '冠軍', 2: '亞軍', 3: '季軍', 4: '殿軍' };
            nameEl.textContent = rankNames[rank];
            nameEl.className = 'champion-name';
            
            const canOccupy = playerMonster && playerChampionRank === 0;
            newButtonEl.textContent = "佔領";
            newButtonEl.disabled = !canOccupy;
            newButtonEl.className = `champion-challenge-btn button ${canOccupy ? 'success' : 'secondary'} text-xs`;

            if (canOccupy) {
                 newButtonEl.addEventListener('click', (e) => {
                    handleChampionChallengeClick(e, rank, null);
                });
            }
        }
    });
}