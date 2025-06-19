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

    // --- DEBUG: 打印收到的原始資料 ---
    console.log("--- 開始渲染冠軍殿堂 ---");
    console.log("收到的冠軍資料 (championsData):", JSON.parse(JSON.stringify(championsData)));
    console.log("當前玩家ID (playerId):", playerId);
    console.log("當前出戰怪獸 (playerMonster):", playerMonster ? playerMonster.nickname : '無');
    // --- END DEBUG ---

    championsData.forEach((monster, index) => {
        if (monster && monster.owner_id === playerId) {
            playerChampionRank = index + 1;
        }
    });

    // --- DEBUG: 打印計算出的玩家排名 ---
    console.log("計算出的玩家冠軍排名 (playerChampionRank):", playerChampionRank, "(0代表不在榜上)");
    // --- END DEBUG ---

    championsData.forEach((monster, index) => {
        const rank = index + 1;
        const slot = container.querySelector(`.champion-slot[data-rank="${rank}"]`);
        if (!slot) return;

        const avatarEl = slot.querySelector(`#champion-avatar-${rank}`);
        const nameEl = slot.querySelector(`#champion-name-${rank}`);
        const buttonEl = slot.querySelector(`#champion-challenge-btn-${rank}`);
        const reignDurationEl = slot.querySelector(`#champion-reign-duration-${rank}`);

        if (!avatarEl || !nameEl || !buttonEl || !reignDurationEl) return;

        avatarEl.innerHTML = '';
        reignDurationEl.style.display = 'none';
        slot.classList.remove('occupied');

        const newButtonEl = buttonEl.cloneNode(true);
        buttonEl.parentNode.replaceChild(newButtonEl, buttonEl);

        if (monster) {
            slot.classList.add('occupied');
            const displayName = getMonsterDisplayName(monster, gameState.gameConfigs);
            nameEl.textContent = displayName;
            const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
            const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
            nameEl.className = `champion-name text-rarity-${rarityKey}`;

            // ... (頭像和在位時間的程式碼省略，保持不變) ...

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
                    newButtonEl.addEventListener('click', (e) => handleChampionChallengeClick(e, rank, monster));
                }
            }

        } else {
            const rankNames = { 1: '冠軍', 2: '亞軍', 3: '季軍', 4: '殿軍' };
            nameEl.textContent = rankNames[rank];
            nameEl.className = 'champion-name';
            
            const canOccupy = playerMonster && playerChampionRank === 0;
            newButtonEl.textContent = "佔領";
            newButtonEl.disabled = !canOccupy;
            newButtonEl.className = `champion-challenge-btn button ${canOccupy ? 'success' : 'secondary'} text-xs`;

            // **關鍵偵錯點**
            console.log(`排名 ${rank} (空位) -> 佔領資格 (canOccupy):`, canOccupy);

            if (canOccupy) {
                 newButtonEl.addEventListener('click', (e) => handleChampionChallengeClick(e, rank, null));
            }
        }
    });
    console.log("--- 冠軍殿堂渲染完畢 ---");
}
