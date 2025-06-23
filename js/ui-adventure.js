// js/ui-adventure.js
// 專門負責渲染「冒險島」的所有UI。

/**
 * 【新增】處理地圖節點點擊事件的預留函式。
 * @param {object} node - 被點擊的節點物件。
 */
function handleMapNodeClick(node) {
    console.log("Clicked on node:", node);
    // TODO:
    // 1. 檢查此節點是否與玩家當前位置相鄰。
    // 2. 如果不相鄰，則計算路徑。
    // 3. 在 Canvas 上繪製路徑預覽。
    // 4. 彈出確認視窗，顯示消耗資源。
    // 5. 確認後，呼叫後端 /move API。

    // 目前僅顯示一個簡單的提示
    showFeedbackModal('移動確認', `你確定要移動到座標 (${node.position.x}, ${node.position.y}) 嗎？<br><br>（路徑規劃與資源消耗功能開發中）`);
}


/**
 * 根據後端傳來的地圖資料，渲染冒險地圖。
 * @param {object} adventureProgress - 包含地圖資料的完整冒險進度物件。
 */
function renderAdventureMap(adventureProgress) {
    const modal = document.getElementById('adventure-map-modal');
    const nodesContainer = document.getElementById('adventure-map-nodes-container');
    const canvas = document.getElementById('adventure-map-canvas');
    const title = document.getElementById('adventure-map-title');

    if (!modal || !nodesContainer || !canvas || !title) {
        console.error("冒險地圖的元件未找到。");
        return;
    }

    const facilityId = adventureProgress.facility_id;
    let facilityName = facilityId;
    // 從遊戲設定中查找設施名稱
    const facilityData = gameState.gameConfigs?.adventure_islands?.[0]?.facilities?.find(f => f.facilityId === facilityId);
    if (facilityData) {
        facilityName = facilityData.name;
    }
    title.textContent = `探索地圖 - ${facilityName}`;
    
    // 清空舊的地圖節點
    nodesContainer.innerHTML = '';
    const ctx = canvas.getContext('2d');
    
    const mapData = adventureProgress.map_data;
    const playerStartPos = mapData.player_start_pos;
    const nodes = mapData.nodes;

    const GRID_SIZE = 30; // 每個格子的像素大小
    canvas.width = 30 * GRID_SIZE;
    canvas.height = 30 * GRID_SIZE;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 渲染所有節點圖示
    nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'map-node';
        nodeEl.textContent = node.display_char;
        nodeEl.style.gridColumnStart = node.position.x + 1;
        nodeEl.style.gridRowStart = node.position.y + 1;
        nodeEl.dataset.nodeId = node.id;
        
        // --- 核心修改處 START ---
        // 只為非障礙物節點添加點擊事件
        if (node.type !== 'obstacle') {
            nodeEl.classList.add('clickable'); // 添加一個 class 以便 CSS 可以設定滑鼠指標樣式
            nodeEl.addEventListener('click', () => handleMapNodeClick(node));
        }
        // --- 核心修改處 END ---

        nodesContainer.appendChild(nodeEl);
    });

    // 渲染玩家圖示
    const playerToken = document.createElement('div');
    playerToken.className = 'player-token';
    playerToken.textContent = '您';
    playerToken.style.left = `${playerStartPos.x * GRID_SIZE}px`;
    playerToken.style.top = `${playerStartPos.y * GRID_SIZE}px`;
    nodesContainer.appendChild(playerToken);

    showModal('adventure-map-modal');
}


/**
 * 根據點擊的設施，顯示隊伍選擇彈窗。
 * @param {object} facility - 被點擊的設施的資料物件。
 */
function showTeamSelectionModal(facility) {
    // 獲取彈窗及其內部元件
    const modal = document.getElementById('expedition-team-selection-modal');
    const title = document.getElementById('team-selection-modal-title');
    const facilityInfo = document.getElementById('team-selection-facility-info');
    const monsterListContainer = document.getElementById('team-selection-monster-list');
    const confirmBtn = document.getElementById('confirm-expedition-start-btn');

    if (!modal || !title || !facilityInfo || !monsterListContainer || !confirmBtn) {
        console.error("隊伍選擇彈窗的元件未找到。");
        return;
    }

    // 更新彈窗標題與設施資訊
    title.textContent = `遠征隊伍編成 - ${facility.name}`;
    facilityInfo.innerHTML = `
        <p><strong>地點：</strong>${facility.name}</p>
        <p class="text-sm text-[var(--text-secondary)] mt-1">${facility.description}</p>
        <p class="text-sm mt-2"><strong>費用：</strong><span style="color:gold;">${facility.cost} 🪙</span> | <strong>建議等級：</strong>${facility.level_range[0]}-${facility.level_range[1]}</p>
    `;

    // 清空舊的怪獸列表
    monsterListContainer.innerHTML = '';
    let selectedMonsters = []; // 用於追蹤被選中的怪獸ID

    const monsters = gameState.playerData?.farmedMonsters || [];

    // 渲染所有可選的怪獸卡片
    monsters.forEach(monster => {
        const card = document.createElement('div');
        card.className = 'monster-selection-card';
        card.dataset.monsterId = monster.id;

        const isBusy = monster.farmStatus?.isTraining || monster.farmStatus?.isBattling;
        const isInjured = monster.hp < monster.initial_max_hp * 0.25;
        const isDisabled = isBusy || isInjured;

        if (isDisabled) {
            card.classList.add('disabled');
        }

        // 獲取頭像圖片
        const headInfo = { type: '無', rarity: '普通' };
        const constituentIds = monster.constituent_dna_ids || [];
        if (constituentIds.length > 0) {
            const headDnaId = constituentIds[0];
            const allDnaTemplates = gameState.gameConfigs?.dna_fragments || [];
            const headDnaTemplate = allDnaTemplates.find(dna => dna.id === headDnaId);
            if (headDnaTemplate) {
                headInfo.type = headDnaTemplate.type || '無';
                headInfo.rarity = headDnaTemplate.rarity || '普通';
            }
        }
        const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);

        // 填充卡片內容
        card.innerHTML = `
            <div class="monster-selection-card-header">
                <span class="text-rarity-${monster.rarity.toLowerCase()}">${getMonsterDisplayName(monster, gameState.gameConfigs)}</span>
                <span class="text-sm">Lv.${monster.level || 1}</span>
            </div>
            <div class="monster-selection-card-body">
                <div class="monster-selection-avatar" style="${imagePath ? `background-image: url('${imagePath}')` : ''}"></div>
                <div class="monster-selection-stats">
                    <span>HP: ${monster.hp}/${monster.initial_max_hp}</span>
                    <span>攻擊: ${monster.attack}</span>
                    <span>防禦: ${monster.defense}</span>
                    ${isBusy ? `<span style="color:var(--warning-color);">修煉中</span>` : ''}
                    ${isInjured ? `<span style="color:var(--danger-color);">瀕死</span>` : ''}
                </div>
            </div>
        `;

        // 綁定點擊事件
        if (!isDisabled) {
            card.addEventListener('click', () => {
                const monsterId = card.dataset.monsterId;
                if (selectedMonsters.includes(monsterId)) {
                    // 如果已選中，則取消選擇
                    selectedMonsters = selectedMonsters.filter(id => id !== monsterId);
                    card.classList.remove('selected');
                } else {
                    // 如果未選中，檢查是否已達上限
                    if (selectedMonsters.length < 3) {
                        selectedMonsters.push(monsterId);
                        card.classList.add('selected');
                    } else {
                        showFeedbackModal('提示', '最多只能選擇3隻怪獸參加遠征。');
                    }
                }
                // 更新確認按鈕的狀態
                confirmBtn.disabled = selectedMonsters.length === 0;
            });
        }
        
        monsterListContainer.appendChild(card);
    });

    // 綁定確認按鈕的事件
    confirmBtn.onclick = () => {
        const islandsData = gameState.gameConfigs.adventure_islands || [];
        let islandId = null;
        for (const island of islandsData) {
            if (island.facilities && island.facilities.some(fac => fac.facilityId === facility.facilityId)) {
                islandId = island.islandId;
                break;
            }
        }
        
        if (islandId) {
            initiateExpedition(islandId, facility.facilityId, selectedMonsters);
        } else {
            showFeedbackModal('錯誤', '無法確定設施所屬的島嶼。');
        }
    };

    showModal('expedition-team-selection-modal');
}

/**
 * 處理開始遠征的邏輯，呼叫後端 API。
 * @param {string} islandId - 島嶼ID
 * @param {string} facilityId - 設施ID
 * @param {Array<string>} teamMonsterIds - 被選中的怪獸ID列表
 */
async function initiateExpedition(islandId, facilityId, teamMonsterIds) {
    hideModal('expedition-team-selection-modal');
    showFeedbackModal('準備出發...', `正在為「${facilityId}」組建遠征隊...`, true);

    try {
        const result = await startExpedition(islandId, facilityId, teamMonsterIds);

        if (result && result.success) {
            await refreshPlayerData();
            hideModal('feedback-modal');
            
            // 成功後，呼叫渲染地圖的函式
            renderAdventureMap(result.adventure_progress);

        } else {
            throw new Error(result?.error || '未知的錯誤導致遠征無法開始。');
        }

    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('出發失敗', `無法開始遠征：${error.message}`);
    }
}


/**
 * 初始化冒險島UI的總入口函式。
 */
async function initializeAdventureUI() {
    const adventureTabContent = document.getElementById('guild-content');
    if (!adventureTabContent) {
        console.error("冒險島的內容容器 'guild-content' 未找到。");
        return;
    }
    
    // 檢查玩家是否正在遠征中
    const adventureProgress = gameState.playerData?.adventure_progress;
    if (adventureProgress && adventureProgress.is_active) {
        // 如果正在遠征，直接顯示地圖
        renderAdventureMap(adventureProgress);
        return;
    }
    
    // 如果沒有在遠征，則顯示島嶼選擇列表
    adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">正在從遠方島嶼獲取情报...</p>';

    try {
        const islandsData = await getAdventureIslandsData();
        adventureTabContent.innerHTML = '';

        if (!islandsData || !Array.isArray(islandsData) || islandsData.length === 0) {
            adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">目前沒有可前往的冒險島嶼。</p>';
            return;
        }

        const island = islandsData[0];
        const facilities = island.facilities || [];
        
        if (gameState.gameConfigs) {
            gameState.gameConfigs.adventure_islands = islandsData;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'adventure-wrapper';
        const contentArea = document.createElement('div');
        contentArea.className = 'adventure-content-area';
        
        const wideBg = island.backgrounds?.wide || '';
        const narrowBg = island.backgrounds?.narrow || '';
        const style = document.createElement('style');
        style.textContent = `
            .adventure-content-area {
                background-image: url('${narrowBg}');
            }
            @media (min-width: 768px) {
                .adventure-content-area {
                    background-image: url('${wideBg}');
                }
            }
        `;
        document.head.appendChild(style);

        const islandContainer = document.createElement('div');
        islandContainer.className = 'adventure-island-container';
        const islandTitle = document.createElement('h3');
        islandTitle.className = 'adventure-island-title';
        islandTitle.textContent = island.islandName || '未知的島嶼';
        islandContainer.appendChild(islandTitle);

        const facilityList = document.createElement('div');
        facilityList.className = 'adventure-facility-list';

        if (facilities.length > 0) {
            facilities.forEach(facility => {
                const card = document.createElement('div');
                card.className = 'adventure-facility-card';
                card.innerHTML = `
                    <div class="facility-card-header">
                        <h4 class="facility-title">${facility.name || '未知設施'}</h4>
                        <span class="facility-cost">費用: ${facility.cost || 0} 🪙</span>
                    </div>
                    <div class="facility-card-body">
                        <p>${facility.description || '暫無描述。'}</p>
                    </div>
                    <div class="facility-card-footer">
                        <button class="button primary challenge-facility-btn" data-facility-id="${facility.facilityId}">挑戰</button>
                    </div>
                `;
                facilityList.appendChild(card);
            });
        } else {
            facilityList.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">這座島嶼上目前沒有可挑戰的設施。</p>';
        }

        islandContainer.appendChild(facilityList);
        contentArea.appendChild(islandContainer);
        wrapper.appendChild(contentArea);
        adventureTabContent.appendChild(wrapper);

    } catch (error) {
        console.error("獲取或渲染冒險島資料時發生錯誤:", error);
        adventureTabContent.innerHTML = `<p class="text-center text-lg text-[var(--text-secondary)] py-10" style="color: var(--danger-color);">錯誤：無法載入冒險島資料。<br>${error.message}</p>`;
    }
}
