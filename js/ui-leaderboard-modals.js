// js/ui-leaderboard-modals.js
//這個檔案負責處理與排行榜相關的彈窗內容，例如排行榜的表頭、表格內容更新，以及元素篩選頁籤的顯示。
function setupLeaderboardTableHeaders(tableId, headersConfig) {
    const table = document.getElementById(tableId);
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

function updateLeaderboardTable(tableType, data) {
    console.log("updateLeaderboardTable called with data:", data);
    const tableId = tableType === 'monster' ? 'monster-leaderboard-table' : 'player-leaderboard-table';
    const table = document.getElementById(tableId);
    if (!table) {
        console.error("Leaderboard table element not found:", tableId);
        return;
    }

    let headersConfig;
    if (tableType === 'monster') {
        headersConfig = [
            { text: '排名', key: 'rank', align: 'center' },
            { text: '怪獸暱稱', key: 'nickname' },
            { text: '元素', key: 'elements', align: 'center' },
            { text: '稀有度', key: 'rarity', align: 'center' },
            { text: '總評價', key: 'score', align: 'center' },
            { text: '勝/敗', key: 'resume', align: 'center' },
            { text: '擁有者', key: 'owner_nickname' },
            { text: '操作', key: 'actions', align: 'center' }
        ];
    } else { // player
        headersConfig = [
            { text: '排名', key: 'rank', align: 'center' },
            { text: '玩家暱稱', key: 'nickname' },
            { text: '總積分', key: 'score', align: 'center' },
            { text: '勝場', key: 'wins', align: 'center' },
            { text: '敗場', key: 'losses', align: 'center' },
            { text: '稱號', key: 'titles' }
        ];
    }
    setupLeaderboardTableHeaders(tableId, headersConfig);

    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        const colSpan = headersConfig.length;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-3 text-[var(--text-secondary)]">排行榜無資料。</td></tr>`;
        return;
    }
    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

    data.forEach((item, index) => {
        const row = tbody.insertRow();
        row.dataset.monsterId = item.id; 

        if (tableType === 'monster') {
            const isTraining = item.farmStatus?.isTraining || false;
            const isBattling = item.farmStatus?.isBattling || false;

            const rankCell = row.insertCell();
            rankCell.textContent = index + 1;
            rankCell.style.textAlign = 'center';

            const nicknameCell = row.insertCell();
            const rarityKey = item.rarity ? (rarityMap[item.rarity] || 'common') : 'common';
            
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'leaderboard-monster-link';
            link.classList.add(`text-rarity-${rarityKey}`);
            link.style.textDecoration = 'none';
            link.textContent = item.nickname;
            nicknameCell.appendChild(link);


            const elementsCell = row.insertCell();
            elementsCell.style.textAlign = 'center';
            if(item.elements && Array.isArray(item.elements)) {
                elementsCell.innerHTML = item.elements.map(el =>
                    `<span class="text-xs text-element-${getElementCssClassKey(el)} font-bold mr-2">${el}</span>`
                ).join('');
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

            if (item.owner_id === gameState.playerId) {
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
            rankCell.textContent = index + 1;
            rankCell.style.textAlign = 'center';

            row.insertCell().textContent = item.nickname;

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

            const titlesCell = row.insertCell();
            titlesCell.textContent = item.titles && item.titles.length > 0 ? item.titles.join(', ') : '無';
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
