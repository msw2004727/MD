// js/ui-champions.js
// 負責渲染「冠軍殿堂」區塊的 UI

/**
 * 根據傳入的排行榜數據，渲染冠軍殿堂的四個欄位。
 * 在第一階段，此函式會直接使用一般排行榜的前四名。
 * @param {Array<object>} leaderboardData - 已排序的完整怪獸排行榜數據。
 */
function renderChampionSlots(leaderboardData) {
    const container = document.getElementById('champions-grid-container');
    if (!container) {
        console.error("冠軍殿堂的容器 'champions-grid-container' 未找到。");
        return;
    }

    // 取得前四名的怪獸，如果不足四名，則相應位置為 null
    const champions = [
        leaderboardData.length > 0 ? leaderboardData[0] : null,
        leaderboardData.length > 1 ? leaderboardData[1] : null,
        leaderboardData.length > 2 ? leaderboardData[2] : null,
        leaderboardData.length > 3 ? leaderboardData[3] : null,
    ];

    champions.forEach((monster, index) => {
        const rank = index + 1;
        const slot = container.querySelector(`.champion-slot[data-rank="${rank}"]`);
        if (!slot) return;

        const avatarEl = slot.querySelector(`#champion-avatar-${rank}`);
        const nameEl = slot.querySelector(`#champion-name-${rank}`);
        const buttonEl = slot.querySelector(`#champion-challenge-btn-${rank}`);

        if (!avatarEl || !nameEl || !buttonEl) return;

        // 清空舊內容
        avatarEl.innerHTML = '';
        avatarEl.style.backgroundImage = 'none';
        slot.classList.remove('occupied');

        if (monster) {
            // --- 如果有名次，則填入怪獸資料 ---
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


            // 3. 設置按鈕 (第一階段，使用現有挑戰邏輯)
            buttonEl.textContent = "挑戰";
            buttonEl.disabled = false;
            buttonEl.className = 'champion-challenge-btn button primary text-xs';
            
            // 移除舊的監聽器以防重複綁定
            const newButtonEl = buttonEl.cloneNode(true);
            buttonEl.parentNode.replaceChild(newButtonEl, buttonEl);

            // 綁定現有的挑戰函式
            newButtonEl.addEventListener('click', (e) => {
                handleChallengeMonsterClick(e, monster.id, monster.owner_id, null, monster.owner_nickname);
            });

        } else {
            // --- 如果名次是空的，顯示預設文字 ---
            avatarEl.innerHTML = `<span class="champion-placeholder-text">虛位以待</span>`;
            
            const rankNames = { 1: '冠軍', 2: '亞軍', 3: '季軍', 4: '殿軍' };
            nameEl.textContent = rankNames[rank];
            nameEl.className = 'champion-name';

            buttonEl.textContent = "佔領"; // 根據新規則，顯示佔領
            buttonEl.disabled = false; // 暫時先啟用，方便測試
            buttonEl.className = 'champion-challenge-btn button success text-xs';
        }
    });
}