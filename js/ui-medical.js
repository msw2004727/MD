// js/ui-medical.js
// 這個新檔案專門處理「醫療站」頁籤的UI渲染與相關更新。

let medicalStationElements = {};

/**
 * 初始化醫療站頁籤所需的 DOM 元素。
 */
function initializeMedicalStationDOMElements() {
    medicalStationElements = {
        headersContainer: document.getElementById('medical-station-headers'),
        listContainer: document.getElementById('medical-station-list'),
        wrapper: document.getElementById('medical-station-table-wrapper')
    };
}

/**
 * 渲染醫療站的怪獸列表。
 */
function renderMedicalStation() {
    // 確保 DOM 元素已初始化
    if (Object.keys(medicalStationElements).length === 0 || !medicalStationElements.listContainer) {
        initializeMedicalStationDOMElements();
    }
    
    const headersContainer = medicalStationElements.headersContainer;
    const listContainer = medicalStationElements.listContainer;

    if (!listContainer || !headersContainer) {
        console.error("renderMedicalStation Error: Medical station containers not found.");
        return;
    }

    headersContainer.innerHTML = '';
    listContainer.innerHTML = '';

    // 沿用農場的表頭結構，但最後一欄不同
    const headers = [
        { text: '#', key: 'index' },
        { text: '出戰', key: 'deploy' },
        { text: '怪獸', key: 'nickname' },
        { text: '評價', key: 'score' },
        { text: '狀態', key: 'farmStatus' },
        { text: '醫療操作', key: 'actions' }
    ];

    headers.forEach(header => {
        const headerDiv = document.createElement('div');
        headerDiv.textContent = header.text;
        headersContainer.appendChild(headerDiv);
    });

    const monsters = gameState.playerData?.farmedMonsters || [];

    if (monsters.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">您的農場空空如也，沒有可操作的怪獸。</p>`;
        return;
    }

    // 直接使用農場的排序設定來顯示
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

        // #
        const colIndex = document.createElement('div');
        colIndex.className = 'farm-col farm-col-index';
        colIndex.textContent = index + 1;
        
        // 出戰
        const colDeploy = document.createElement('div');
        colDeploy.className = 'farm-col farm-col-deploy';
        colDeploy.innerHTML = isDeployed ? '⚔️' : '-';
        
        // 怪獸
        const colInfo = document.createElement('div');
        colInfo.className = 'farm-col farm-col-info';
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        colInfo.innerHTML = `<a href="#" class="monster-name-link" onclick="showMonsterInfoFromFarm('${monster.id}'); return false;" style="text-decoration: none; width: 100%;"><span class="text-rarity-${rarityKey}">${monster.nickname || '名稱錯誤'}</span></a>`;
        
        // 評價
        const colScore = document.createElement('div');
        colScore.className = 'farm-col farm-col-score';
        colScore.textContent = monster.score || 0;
        colScore.style.color = 'var(--success-color)';

        // 狀態
        const colStatus = document.createElement('div');
        colStatus.className = 'farm-col farm-col-status';
        if (monster.hp < monster.initial_max_hp * 0.25) {
            colStatus.innerHTML = `<span style="color: var(--danger-color);">瀕死</span>`;
        } else if (monster.hp < monster.initial_max_hp) {
            colStatus.innerHTML = `<span style="color: var(--warning-color);">受傷</span>`;
        } else {
            colStatus.textContent = '健康';
        }

        // 醫療操作
        const colActions = document.createElement('div');
        colActions.className = 'farm-col farm-col-actions';
        // 未來功能的按鈕先用 disabled 狀態呈現
        colActions.innerHTML = `
            <button class="button success text-xs" onclick="handleHealClick('${monster.id}')" title="完全治癒怪獸的HP/MP與所有異常狀態">治療</button>
            <button class="button secondary text-xs" onclick="handleGeneModClick('${monster.id}')" style="margin-left: 5px;" title="未來功能：基因改造" disabled>基改</button>
            <button class="button secondary text-xs" onclick="handleExtractionClick('${monster.id}')" style="margin-left: 5px;" title="未來功能：摘除器官/DNA" disabled>摘除</button>
            <button class="button secondary text-xs" onclick="handleInjectionClick('${monster.id}')" style="margin-left: 5px;" title="未來功能：注射藥劑" disabled>打針</button>
        `;
        
        monsterItem.appendChild(colIndex);
        monsterItem.appendChild(colDeploy);
        monsterItem.appendChild(colInfo);
        monsterItem.appendChild(colScore);
        monsterItem.appendChild(colStatus);
        monsterItem.appendChild(colActions);
        
        listContainer.appendChild(monsterItem);
    });
}

/**
 * 初始化醫療站的事件監聽。
 */
function initializeMedicalStationHandlers() {
    // 監聽主頁籤的點擊，如果點擊的是醫療站，就渲染列表
    const mainTabs = document.getElementById('dna-farm-tabs');
    if (mainTabs) {
        mainTabs.addEventListener('click', (event) => {
            if (event.target.dataset.tabTarget === 'medical-content') {
                renderMedicalStation();
            }
        });
    }
}
