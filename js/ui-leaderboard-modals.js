// js/ui-leaderboard-modals.js
//這個檔案負責處理與排行榜相關的彈窗內容，例如排行榜的表頭、表格內容更新，以及元素篩選頁籤的顯示。

// ---【修改】---
// 讓此函式接受一個 table HTML 元素，而不是 tableId
function setupLeaderboardTableHeaders(table, headersConfig) {
    if (!table) return;
    let thead = table.querySelector('thead');
    if (!thead) {
        thead = document.createElement('thead');
        table.appendChild(thead);
    }
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');
    headersConfig.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.text;
        th.dataset.sortKey = header.key;
        if(header.align) th.style.textAlign = header.align;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    let tbody = table.querySelector('tbody');
    if (!tbody) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
    }
    tbody.innerHTML = '';
}


// ---【修改】---
// 整個函式被重構，不再重新創建<table>，而是更新現有的表格內容
function updateLeaderboardTable(tableType, data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Leaderboard container element not found:", containerId);
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4">錯誤：找不到排行榜容器。</p>`;
        return;
    }
    
    // 直接從容器中找到對應的表格元素
    const tableId = `${tableType}-leaderboard-table`;
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Leaderboard table element #${tableId} not found inside container #${containerId}.`);
        return;
    }

    let headersConfig;
    if (tableType === 'monster') {
        headersConfig = [
            { text: '排名', key: 'rank', align: 'center' },
            { text: '頭像', key: 'avatar', align: 'center' },
            { text: '怪獸', key: 'nickname' },
            { text: '最終抗性', key: 'elements', align: 'center' },
            { text: '稀有度', key: 'rarity', align: 'center' },
            { text: '總評價', key: 'score', align: 'center' },
            { text: '勝/敗', key: 'resume', align: 'center' },
            { text: '擁有者', key: 'owner_nickname' },
            { text: '操作', key: 'actions', align: 'center' }
        ];
    } else { // player
        headersConfig = [
            { text: '排名', key: 'rank', align: 'center' },
            { text: '稱號', key: 'titles' },
            { text: '玩家暱稱', key: 'nickname' },
            { text: '總積分', key: 'score', align: 'center' },
            { text: '勝場', key: 'wins', align: 'center' },
            { text: '敗場', key: 'losses', align: 'center' }
        ];
    }
    
    setupLeaderboardTableHeaders(table, headersConfig);

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    if (!data || data.length === 0) {
        const colSpan = headersConfig.length;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-3 text-[var(--text-secondary)]">排行榜無資料。</td></tr>`;
        return;
    }
    
    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

    data.forEach((item, index) => {
        const row = tbody.insertRow();
        row.dataset.monsterId = item.id; 
        row.dataset.ownerId = item.owner_id;
        row.dataset.ownerNickname = item.owner_nickname;

        if (tableType === 'monster') {
            const isTraining = item.farmStatus?.isTraining || false;
            const isBattling = item.farmStatus?.isBattling || false;
            // 【新增】檢查此怪獸是否為冠軍
            const isChampion = gameState.champions.some(champ => champ && champ.id === item.id);

            const rankCell = row.insertCell();
            rankCell.textContent = index + 1;
            rankCell.style.textAlign = 'center';

            const avatarCell = row.insertCell();
            avatarCell.className = 'leaderboard-avatar-cell'; 

            const headInfo = item.head_dna_info || { type: '無', rarity: '普通' };
            const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);
            
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'leaderboard-avatar-container';
            const avatarImage = document.createElement('div');
            avatarImage.className = 'leaderboard-avatar-image';
            if (imagePath) {
                avatarImage.style.backgroundImage = `url('${imagePath}')`;
            }
            avatarContainer.appendChild(avatarImage);
            avatarCell.appendChild(avatarContainer);

            const nicknameCell = row.insertCell();
            const rarityKey = item.rarity ? (rarityMap[item.rarity] || 'common') : 'common';
            
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'leaderboard-monster-link';
            link.style.textDecoration = 'none';
            link.style.display = 'block';
            link.style.textAlign = 'left';
            link.style.whiteSpace = 'nowrap';
            link.style.overflow = 'hidden';
            link.style.textOverflow = 'ellipsis';
            link.style.fontSize = '1.1rem'; 
            
            const playerTitle = item.player_title_part;
            const monsterAchievement = item.achievement_part;
            const elementNickname = getMonsterDisplayName(item, gameState.gameConfigs);

            let nameHtml;
            if (playerTitle && monsterAchievement && elementNickname) {
                nameHtml = `
                    <span style="color: var(--rarity-legendary-text); margin-right: 4px;">${playerTitle}</span>
                    <span style="color: var(--text-primary); margin-right: 4px;">${monsterAchievement}</span>
                    <span class="text-rarity-${rarityKey}">${elementNickname}</span>
                `;
            } else {
                nameHtml = `<span class="text-rarity-${rarityKey}">${item.nickname || '名稱錯誤'}</span>`;
            }
            link.innerHTML = nameHtml;
            
            nicknameCell.appendChild(link);

            const elementsCell = row.insertCell();
            elementsCell.style.textAlign = 'center';
            const finalResistances = item.resistances || {};
            const resistanceElements = Object.keys(finalResistances).filter(el => finalResistances[el] !== 0);
            
            if (resistanceElements.length > 0) {
                elementsCell.innerHTML = resistanceElements.map(el =>
                    `<span class="text-xs text-element-${getElementCssClassKey(el)} font-bold mr-2">${el}</span>`
                ).join('');
            } else {
                elementsCell.innerHTML = `<span class="text-xs text-element-無 font-bold">無</span>`;
            }

            const rarityCell = row.insertCell();
            rarityCell.textContent = item.rarity;
            rarityCell.className = `text-rarity-${rarityKey}`;
            rarityCell.style.textAlign = 'center';

            const scoreCell = row.insertCell();
            scoreCell.textContent = item.score;
            scoreCell.style.textAlign = 'center';
            scoreCell.style.color = 'var(--success-color)';

            const resumeCell = row.insertCell();
            resumeCell.textContent = `${item.resume?.wins || 0} / ${item.resume?.losses || 0}`;
            resumeCell.style.textAlign = 'center';

            const ownerCell = row.insertCell();
            ownerCell.textContent = item.owner_nickname || 'N/A';
            if (item.owner_id === gameState.playerId) {
                ownerCell.style.fontWeight = 'bold';
                ownerCell.style.color = 'var(--accent-color)';
            }

            const actionsCell = row.insertCell();
            actionsCell.style.textAlign = 'center';
            const actionButton = document.createElement('button');
            actionButton.className = 'button primary text-xs py-1 px-2';

            // 【修改】將 isChampion 的判斷放在最前面
            if (isChampion) {
                actionButton.textContent = '在位中';
                actionButton.disabled = true;
                actionButton.style.color = 'var(--rarity-legendary-text)';
                actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                actionButton.style.cursor = 'not-allowed';
                actionButton.style.fontWeight = 'bold';
            } else if (item.owner_id === gameState.playerId) {
                actionButton.textContent = '我的怪獸';
                actionButton.disabled = true;
                actionButton.style.cursor = 'not-allowed';
                actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                actionButton.style.color = 'var(--text-secondary)';
            } else {
                if (item.hp / item.initial_max_hp < 0.25) {
                    actionButton.textContent = '瀕死';
                    actionButton.disabled = true;
                    actionButton.style.cursor = 'not-allowed';
                    actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                    actionButton.style.color = 'var(--danger-color)';
                    actionButton.style.fontWeight = 'bold';
                } else if (isTraining || isBattling) {
                    actionButton.textContent = '忙碌中';
                    actionButton.disabled = true;
                    actionButton.style.cursor = 'not-allowed';
                    actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                    actionButton.style.color = 'var(--text-secondary)';
                } else {
                    actionButton.textContent = '挑戰';
                    actionButton.onclick = (e) => handleChallengeMonsterClick(e, item.id, item.owner_id, null, item.owner_nickname);
                }
            }
            actionsCell.appendChild(actionButton);

        } else { // Player Leaderboard
            const rankCell = row.insertCell();
            let rankDisplay = `${index + 1}`;
            if (index === 0) {
                rankDisplay = `🥇 ${rankDisplay}`;
            } else if (index === 1) {
                rankDisplay = `🥈 ${rankDisplay}`;
            } else if (index === 2) {
                rankDisplay = `🥉 ${rankDisplay}`;
            }
            rankCell.textContent = rankDisplay;
            rankCell.style.textAlign = 'center';
            
            const titlesCell = row.insertCell();
            let equippedTitleName = '新手'; 
            if (item.titles && item.titles.length > 0) {
                const equippedId = item.equipped_title_id;
                let equippedTitle = null;
                if (equippedId) {
                    equippedTitle = item.titles.find(t => t.id === equippedId);
                }
                if (!equippedTitle) {
                    equippedTitle = item.titles[0];
                }
                if (equippedTitle && equippedTitle.name) {
                    equippedTitleName = equippedTitle.name;
                }
            }
            titlesCell.textContent = equippedTitleName;

            const nicknameCell = row.insertCell();
            if (item.uid) {
                nicknameCell.innerHTML = `<a href="#" onclick="viewPlayerInfo('${item.uid}'); return false;" style="text-decoration: none; color: var(--accent-color); font-weight: 500;">${item.nickname}</a>`;
            } else {
                nicknameCell.textContent = item.nickname;
            }

            const scoreCell = row.insertCell();
            scoreCell.textContent = item.score;
            scoreCell.style.textAlign = 'center';
            scoreCell.style.color = 'var(--success-color)';

            const winsCell = row.insertCell();
            winsCell.textContent = item.wins;
            winsCell.style.textAlign = 'center';

            const lossesCell = row.insertCell();
            lossesCell.textContent = item.losses;
            lossesCell.style.textAlign = 'center';
        }
    });

    updateLeaderboardSortHeader(table, gameState.leaderboardSortConfig[tableType]?.key, gameState.leaderboardSortConfig[tableType]?.order);
}


function updateLeaderboardSortHeader(table, sortKey, order) {
    if (!table) return;
    const headers = table.querySelectorAll('thead th');
    headers.forEach(th => {
        const arrow = th.querySelector('.sort-arrow');
        if (arrow) arrow.remove();

        if (th.dataset.sortKey === sortKey) {
            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'sort-arrow active';
            arrowSpan.textContent = order === 'asc' ? ' ▲' : ' ▼';
            th.appendChild(arrowSpan);
        }
    });
}

function updateMonsterLeaderboardElementTabs(elements) {
    const container = DOMElements.monsterLeaderboardElementTabs;
    if (!container) return;
    container.innerHTML = ''; 

    elements.forEach(element => {
        const tab = document.createElement('button');
        tab.className = 'button tab-button leaderboard-element-tab';
        tab.dataset.elementFilter = element;

        if (element === 'all') {
            tab.textContent = '全部';
            tab.classList.add('active'); 
        } else {
            tab.textContent = element;
            const cssClassKey = getElementCssClassKey(element);
            tab.classList.add(`text-element-${cssClassKey}`);
        }
        container.appendChild(tab);
    });
}
