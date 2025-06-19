// js/ui-champions.js
// 負責渲染「冠軍殿堂」區塊的 UI

/**
 * 根據真實的冠軍數據，渲染冠軍殿堂的四個欄位，並實作挑戰按鈕的資格判斷與在位時間顯示。
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
    let playerChampionRank = 0;

    // --- 【診斷日誌 1】 ---
    console.log("--- 開始渲染冠軍殿堂 ---");
    console.log("當前出戰怪獸 (playerMonster):", playerMonster);
    console.log("當前玩家ID (playerId):", playerId);
    
    championsData.forEach((monster, index) => {
        if (monster && monster.owner_id === playerId) {
            playerChampionRank = index + 1;
        }
    });

    // --- 【診斷日誌 2】 ---
    console.log("計算後的玩家冠軍排名 (playerChampionRank):", playerChampionRank);


    championsData.forEach((monster, index) => {
        const rank = index + 1;

        // --- 【診斷日誌 3】 ---
        console.log(`--- 正在渲染 Rank ${rank} ---`);

        const slot = container.querySelector(`.champion-slot[data-rank="${rank}"]`);
        if (!slot) return;

        const avatarEl = slot.querySelector(`#champion-avatar-${rank}`);
        const nameEl = slot.querySelector(`#champion-name-${rank}`);
        const buttonEl = slot.querySelector(`#champion-challenge-btn-${rank}`);
        
        if (!avatarEl || !nameEl || !buttonEl) return;

        avatarEl.innerHTML = '';
        slot.classList.remove('occupied');

        const newButtonEl = buttonEl.cloneNode(true);
        buttonEl.parentNode.replaceChild(newButtonEl, buttonEl);

        if (monster) {
            slot.classList.add('occupied');
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

            const displayName = getMonsterDisplayName(monster, gameState.gameConfigs);
            nameEl.textContent = displayName;
            const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
            const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
            nameEl.className = `champion-name text-rarity-${rarityKey}`;

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
            avatarEl.innerHTML = `<span class="champion-placeholder-text">虛位以待</span>`;
            
            const rankNames = { 1: '冠軍', 2: '亞軍', 3: '季軍', 4: '殿軍' };
            nameEl.textContent = rankNames[rank];
            nameEl.className = 'champion-name';
            
            const canOccupy = playerMonster && playerChampionRank === 0 && rank === 4;
            
            // --- 【診斷日誌 4】 ---
            console.log(`Rank ${rank} 為空位。canOccupy 判斷結果:`, canOccupy);

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
