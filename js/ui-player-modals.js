// js/ui-player-modals.js
//這個檔案將負責處理與玩家、好友、新手指南相關的彈窗內容
function updatePlayerInfoModal(playerData, gameConfigs) {
    const body = DOMElements.playerInfoModalBody;
    if (!body || !playerData || !playerData.playerStats) {
        if (body) body.innerHTML = '<p>無法載入玩家資訊。</p>';
        return;
    }
    const stats = playerData.playerStats;
    const nickname = playerData.nickname || stats.nickname || "未知玩家";

    let titlesHtml = '<p>尚無稱號</p>';
    const ownedTitles = stats.titles || [];
    const equippedTitleId = stats.equipped_title_id || (ownedTitles.length > 0 ? ownedTitles[0].id : null);

    if (ownedTitles.length > 0) {
        titlesHtml = ownedTitles.map(title => {
            const isEquipped = title.id === equippedTitleId;
            const buttonHtml = isEquipped
                ? `<span class="button success text-xs py-1 px-2" style="cursor: default; min-width: 80px; text-align: center;">✔️ 已裝備</span>`
                : `<button class="button primary text-xs py-1 px-2 equip-title-btn" data-title-id="${title.id}" style="min-width: 80px;">裝備</button>`;

            let buffsHtml = '';
            if (title.buffs && Object.keys(title.buffs).length > 0) {
                const statDisplayName = { hp: 'HP', mp: 'MP', attack: '攻擊', defense: '防禦', speed: '速度', crit: '爆擊率' };
                buffsHtml = '<div class="title-buffs" style="font-size: 0.85em; color: var(--success-color); margin-top: 5px;">效果：';
                buffsHtml += Object.entries(title.buffs).map(([stat, value]) => `${statDisplayName[stat] || stat} +${value}`).join('，');
                buffsHtml += '</div>';
            }

            return `
                <div class="title-entry" style="background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-weight: bold; font-size: 1.1em; color: ${isEquipped ? 'gold' : 'var(--text-primary)'};">${title.name}</span>
                        ${buttonHtml}
                    </div>
                    <p style="font-size: 0.9em; color: var(--text-secondary); margin: 0;">${title.description || ''}</p>
                    ${buffsHtml}
                </div>
            `;
        }).join('');
    }


    let achievementsHtml = '<p>尚無成就</p>';
    if (stats.achievements && stats.achievements.length > 0) {
        achievementsHtml = `<ul class="list-disc list-inside ml-1 text-sm">${stats.achievements.map(ach => `<li>${ach}</li>`).join('')}</ul>`;
    }

    let ownedMonstersHtml = '<p>尚無怪獸</p>';
    if (playerData.farmedMonsters && playerData.farmedMonsters.length > 0) {
        const monsters = playerData.farmedMonsters;
        const previewLimit = 5;
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

        let previewHtml = monsters.slice(0, previewLimit).map(m => {
            const rarityKey = m.rarity ? (rarityMap[m.rarity] || 'common') : 'common';
            return `<li><a href="#" class="monster-name text-rarity-${rarityKey} player-info-monster-link" data-monster-id="${m.id}" data-owner-uid="${playerData.uid}" style="text-decoration: none;">${m.nickname}</a> <span class="monster-score">評價: ${m.score || 0}</span></li>`;
        }).join('');

        let moreMonstersHtml = '';
        if (monsters.length > previewLimit) {
            moreMonstersHtml = `<div id="more-monsters-list" style="display:none;">${
                monsters.slice(previewLimit).map(m => {
                    const rarityKey = m.rarity ? (rarityMap[m.rarity] || 'common') : 'common';
                    return `<li><a href="#" class="monster-name text-rarity-${rarityKey} player-info-monster-link" data-monster-id="${m.id}" data-owner-uid="${playerData.uid}" style="text-decoration: none;">${m.nickname}</a> <span class="monster-score">評價: ${m.score || 0}</span></li>`;
                }).join('')
            }</div>`;
        }

        ownedMonstersHtml = `<ul class="owned-monsters-list mt-1">${previewHtml}${moreMonstersHtml}</ul>`;

        if (monsters.length > previewLimit) {
            ownedMonstersHtml += `<button id="toggle-monster-list-btn" class="button secondary text-xs w-full mt-2">顯示更多 (${monsters.length - 5}隻)...</button>`;
        }
    }

    const medalsHtml = stats.medals > 0 ? `${'🥇'.repeat(Math.min(stats.medals, 5))} (${stats.medals})` : '無';

    body.innerHTML = `
        <div class="text-center mb-4">
            <h4 class="text-2xl font-bold text-[var(--accent-color)]">${nickname}</h4>
        </div>
        <div class="details-grid">
            <div class="details-section">
                <h5 class="details-section-title">基本統計</h5>
                <div class="details-item"><span class="details-label">等級/排名:</span> <span class="details-value">${stats.rank || 'N/A'}</span></div>
                <div class="details-item"><span class="details-label">總勝場:</span> <span class="details-value text-[var(--success-color)]">${stats.wins || 0}</span></div>
                <div class="details-item"><span class="details-label">總敗場:</span> <span class="details-value text-[var(--danger-color)]">${stats.losses || 0}</span></div>
                <div class="details-item"><span class="details-label">總積分:</span> <span class="details-value">${stats.score || 0}</span></div>
            </div>
            <div class="details-section">
                <h5 class="details-section-title">榮譽與稱號</h5>
                <div class="mb-2">
                    <div id="player-titles-list">${titlesHtml}</div>
                </div>
                <div class="mb-2">
                    <span class="details-label block mb-1">勳章:</span>
                    <span class="details-value medal-emoji">${medalsHtml}</span>
                </div>
                 <div>
                    <span class="details-label block mb-1">已達成成就:</span>
                    ${achievementsHtml}
                </div>
            </div>
        </div>
        <div id="player-monsters-section" class="details-section mt-3">
            <h5 class="details-section-title">持有怪獸 (共 ${playerData.farmedMonsters.length || 0} 隻)</h5>
            ${ownedMonstersHtml}
        </div>
        <p class="creation-time-centered mt-3">上次存檔時間: ${new Date(playerData.lastSave * 1000).toLocaleString()}</p>
    `;

    const toggleBtn = body.querySelector('#toggle-monster-list-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const moreList = body.querySelector('#more-monsters-list');
            const isHidden = moreList.style.display === 'none';
            moreList.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '收合列表' : `顯示更多 (${playerData.farmedMonsters.length - 5}隻)...`;
        });
    }
}

async function viewPlayerInfo(playerId) {
    if (!playerId) return;

    showFeedbackModal('載入中...', `正在獲取玩家資訊...`, true);

    try {
        const playerData = await getPlayerData(playerId);
        if (playerData) {
            playerData.uid = playerId;
            updateGameState({ viewedPlayerData: playerData });
            updatePlayerInfoModal(playerData, gameState.gameConfigs);
            hideModal('feedback-modal');
            showModal('player-info-modal');
        } else {
            throw new Error('找不到該玩家的資料。');
        }
    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('錯誤', `無法載入玩家資訊：${error.message}`);
    }
}

function updateNewbieGuideModal(guideEntries, searchTerm = '') {
    const container = DOMElements.newbieGuideContentArea;
    if (!container) return;
    container.innerHTML = '';

    const filteredEntries = guideEntries.filter(entry =>
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredEntries.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)]">找不到符合 "${searchTerm}" 的指南內容。</p>`;
        return;
    }

    filteredEntries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('mb-4', 'pb-3', 'border-b', 'border-[var(--border-color)]');
        entryDiv.innerHTML = `
            <h5 class="text-lg font-semibold text-[var(--accent-color)] mb-1">${entry.title}</h5>
            <p class="text-sm leading-relaxed">${entry.content.replace(/\n/g, '<br>')}</p>
        `;
        container.appendChild(entryDiv);
    });
}

function updateFriendsSearchResults(players) {
    const container = DOMElements.friendsSearchResultsArea;
    if (!container) return;

    if (!players || players.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-2">找不到符合條件的玩家。</p>`;
        return;
    }

    container.innerHTML = players.map(player => {
        const isFriend = gameState.playerData.friends?.some(f => f.uid === player.uid);
        const isSelf = player.uid === gameState.playerId;
        let buttonHtml;

        if (isSelf) {
            buttonHtml = `<button class="button secondary text-xs" disabled>這是您</button>`;
        } else if (isFriend) {
            buttonHtml = `<button class="button secondary text-xs" disabled>已是好友</button>`;
        } else {
            buttonHtml = `<button class="button primary text-xs" onclick="handleAddFriend('${player.uid}', '${player.nickname}')">加為好友</button>`;
        }

        return `
            <div class="friend-item">
                <span class="friend-name">${player.nickname}</span>
                <div class="friend-actions">
                    <button class="button secondary text-xs" onclick="viewPlayerInfo('${player.uid}')">查看資訊</button>
                    ${buttonHtml}
                </div>
            </div>
        `;
    }).join('');
}

async function renderFriendsList() {
    const container = DOMElements.friendsListDisplayArea;
    if (!container) return;

    const friends = gameState.playerData?.friends || [];

    if (friends.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4">好友列表空空如也，快去搜尋並新增好友吧！</p>`;
        return;
    }

    const friendIds = friends.map(f => f.uid);
    let friendStatuses = {};
    try {
        const response = await getFriendsStatuses(friendIds);
        if (response.success) {
            friendStatuses = response.statuses;
        }
    } catch (error) {
        console.error("無法獲取好友狀態:", error);
    }
    
    container.innerHTML = `
        <div class="friends-list-grid">
            ${friends.map(friend => {
                const title = friend.title || '稱號未定';
                const displayName = `${title} ${friend.nickname}`;
                
                const lastSeen = friendStatuses[friend.uid];
                const nowInSeconds = Date.now() / 1000;
                const isOnline = lastSeen && (nowInSeconds - lastSeen < 300); 

                return `
                <div class="friend-item-card">
                    <div class="friend-info">
                        <span class="online-status ${isOnline ? 'online' : 'offline'}"></span>
                        <a href="#" class="friend-name-link" onclick="viewPlayerInfo('${friend.uid}'); return false;">
                            ${displayName}
                        </a>
                    </div>
                    <div class="friend-actions">
                        <button class="button secondary text-xs" title="送禮" disabled>🎁</button>
                        <button class="button secondary text-xs" title="聊天" disabled>💬</button>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}
