// js/ui-farm.js
// 這個檔案專門處理「怪獸農場」頁籤的UI渲染與相關更新。

function updateAllTimers() {
    const timerElements = document.querySelectorAll('.training-timer');
    timerElements.forEach(timerEl => {
        const startTime = parseInt(timerEl.dataset.startTime, 10);
        const duration = parseInt(timerEl.dataset.duration, 10);
        if (!startTime || !duration) return;

        const now = Date.now();
        const elapsedTime = Math.floor((now - startTime) / 1000);
        const totalDuration = Math.floor(duration / 1000);
        const displayTime = Math.min(elapsedTime, totalDuration);

        // 找到對應的狀態文字元素 (即計時器前面的那個元素)
        const statusTextEl = timerEl.previousElementSibling;

        if (displayTime >= totalDuration) {
            // 修煉時間已滿
            if (statusTextEl) {
                statusTextEl.textContent = '已完成';
                statusTextEl.style.color = 'var(--success-color)';
                statusTextEl.style.fontWeight = 'bold';
            }
            // 隱藏計時器文字
            timerEl.style.display = 'none';
        } else {
            // 修煉仍在進行，更新計時器
            timerEl.textContent = `(${displayTime} / ${totalDuration}s)`;
        }
    });
}

function showMonsterInfoFromFarm(monsterId) {
    if (!monsterId) return;
    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (monster) {
        // This function is defined in ui-monster-modals.js
        if (typeof updateMonsterInfoModal === 'function') {
            updateMonsterInfoModal(monster, gameState.gameConfigs, gameState.playerData);
            showModal('monster-info-modal');
        } else {
            console.error("updateMonsterInfoModal function is not defined.");
        }
    } else {
        console.error(`Monster with ID ${monsterId} not found in farm.`);
        showFeedbackModal('錯誤', '找不到該怪獸的資料。');
    }
}


function renderMonsterFarm() {
    const headersContainer = DOMElements.farmHeaders;
    const listContainer = DOMElements.farmedMonstersList;

    if (!listContainer || !headersContainer) {
        console.error("renderMonsterFarm Error: Farm containers not found.");
        return;
    }

    headersContainer.innerHTML = '';
    listContainer.innerHTML = '';

    const headers = [
        { text: '#', key: 'index', sortable: false },
        { text: '出戰', key: 'deploy', sortable: false },
        { text: '怪獸', key: 'nickname', sortable: true },
        { text: '評價', key: 'score', sortable: true },
        { text: '狀態', key: 'farmStatus', sortable: true },
        { text: '操作', key: 'actions', sortable: false }
    ];

    headers.forEach(header => {
        const headerDiv = document.createElement('div');
        headerDiv.textContent = header.text;
        if (header.sortable) {
            headerDiv.classList.add('sortable');
            headerDiv.dataset.sortKey = header.key;
            if (gameState.farmSortConfig && gameState.farmSortConfig.key === header.key) {
                const arrow = document.createElement('span');
                arrow.className = 'sort-arrow';
                arrow.textContent = gameState.farmSortConfig.order === 'desc' ? ' ▼' : ' ▲';
                headerDiv.appendChild(arrow);
            }
        }
        headersContainer.appendChild(headerDiv);
    });
    
    const monsters = gameState.playerData?.farmedMonsters || [];

    if (monsters.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">您的農場空空如也，快去組合新的怪獸吧！</p>`;
        return;
    }
    
    const sortConfig = gameState.farmSortConfig || { key: 'score', order: 'desc' };
    monsters.sort((a, b) => {
        let valA = a[sortConfig.key] || 0;
        let valB = b[sortConfig.key] || 0;
        if (typeof valA === 'string') {
            return sortConfig.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return sortConfig.order === 'asc' ? valA - valB : valB - valA;
        }
    });

    monsters.forEach((monster, index) => {
        const monsterItem = document.createElement('div');
        const isDeployed = gameState.playerData.selectedMonsterId === monster.id;
        monsterItem.className = 'farm-monster-item';
        if (isDeployed) {
            monsterItem.classList.add('selected');
        }

        const colIndex = document.createElement('div');
        colIndex.className = 'farm-col farm-col-index';
        colIndex.textContent = index + 1;
        
        const colDeploy = document.createElement('div');
        colDeploy.className = 'farm-col farm-col-deploy';
        colDeploy.innerHTML = `<button class="button ${isDeployed ? 'success' : 'secondary'} text-xs" onclick="handleDeployMonsterClick('${monster.id}')" ${isDeployed ? 'disabled' : ''} style="min-width: 70px;" title="${isDeployed ? '出戰中' : '設為出戰'}">${isDeployed ? '⚔️' : '出戰'}</button>`;
        
        const colInfo = document.createElement('div');
        colInfo.className = 'farm-col farm-col-info';
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        
        const playerTitle = monster.player_title_part;
        const monsterAchievement = monster.achievement_part;
        const elementNickname = getMonsterDisplayName(monster, gameState.gameConfigs);
        
        let nameHtml;
        if (playerTitle && monsterAchievement && elementNickname) {
            nameHtml = `
                <div style="display: flex; align-items: baseline; gap: 0.5em;">
                    <span style="color: var(--rarity-legendary-text);">${playerTitle}</span>
                    <span style="color: var(--text-primary);">${monsterAchievement}</span>
                    <span class="text-rarity-${rarityKey}">${elementNickname}</span>
                </div>
            `;
        } else {
            nameHtml = `<span class="text-rarity-${rarityKey}">${monster.nickname || '名稱錯誤'}</span>`;
        }
        
        colInfo.innerHTML = `
            <a href="#" class="monster-name-link" onclick="showMonsterInfoFromFarm('${monster.id}'); return false;" style="text-decoration: none; width: 100%;">
                ${nameHtml}
            </a>`;
        
        const colScore = document.createElement('div');
        colScore.className = 'farm-col farm-col-score';
        colScore.textContent = monster.score || 0;
        colScore.style.color = 'var(--success-color)';

        const colStatus = document.createElement('div');
        colStatus.className = 'farm-col farm-col-status';
        colStatus.style.flexDirection = 'column';
        colStatus.style.lineHeight = '1.2';
        
        // ----- BUG 修正邏輯 START -----
        // 調整判斷順序，讓「修煉中」和「瀕死」的優先級高於「出戰中」
        if (monster.farmStatus?.isTraining) {
            const startTime = monster.farmStatus.trainingStartTime || Date.now();
            const duration = monster.farmStatus.trainingDuration || 3600000;
            colStatus.innerHTML = `
                <div style="color: var(--accent-color);">修煉中</div>
                <div class="training-timer text-xs" data-start-time="${startTime}" data-duration="${duration}" style="font-size: 0.8em;">(0/${duration/1000}s)</div>
            `;
        } else if (monster.hp < monster.initial_max_hp * 0.25) {
            colStatus.innerHTML = `<span style="color: var(--danger-color);">瀕死</span>`;
        } else if (isDeployed) {
            colStatus.innerHTML = `<span style="color: var(--rarity-mythical-text);">出戰中</span>`;
        } else {
            colStatus.textContent = '閒置中';
        }
        // ----- BUG 修正邏輯 END -----
        
        const colActions = document.createElement('div');
        colActions.className = 'farm-col farm-col-actions';
        let actionsHTML = '';

        if (isDeployed) {
            actionsHTML += `<button class="button primary text-xs" disabled>修煉</button>`;
            actionsHTML += `<button class="button danger text-xs" disabled style="margin-left: 5px;">放生</button>`;
        } else if (monster.farmStatus?.isTraining) {
            const startTime = monster.farmStatus.trainingStartTime || Date.now();
            const duration = monster.farmStatus.trainingDuration || 3600000;
            actionsHTML += `<button class="button warning text-xs" onclick="handleEndCultivationClick(event, '${monster.id}', ${startTime}, ${duration})">召回</button>`;
            actionsHTML += `<button class="button danger text-xs" disabled style="margin-left: 5px;">放生</button>`;
        } else {
            actionsHTML += `<button class="button primary text-xs" onclick="handleCultivateMonsterClick(event, '${monster.id}')">修煉</button>`;
            actionsHTML += `<button class="button danger text-xs" onclick="handleReleaseMonsterClick(event, '${monster.id}')" style="margin-left: 5px;">放生</button>`;
        }
        colActions.innerHTML = actionsHTML;
        
        monsterItem.appendChild(colIndex);
        monsterItem.appendChild(colDeploy);
        monsterItem.appendChild(colInfo);
        monsterItem.appendChild(colScore);
        monsterItem.appendChild(colStatus);
        monsterItem.appendChild(colActions);
        
        listContainer.appendChild(monsterItem);
    });
}
