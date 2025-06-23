// js/ui-adventure.js
// 專門負責渲染「冒險島」的所有UI。

/**
 * 初始化冒險地圖的事件監聽器。
 * 使用事件委派模式，只在父容器上設定一個監聽器。
 * 這個函式現在應該只被呼叫一次。
 */
function initializeAdventureMapHandlers() {
    const nodesContainer = document.getElementById('adventure-map-nodes-container');
    if (!nodesContainer) return;

    // 為避免重複綁定，先移除可能存在的舊監聽器
    // 這次我們不使用 cloneNode，而是直接管理事件監聽
    if (nodesContainer.dataset.listenerAttached === 'true') {
        return; // 如果已經綁定過，就直接返回
    }

    nodesContainer.addEventListener('click', (event) => {
        const clickedNodeElement = event.target.closest('.map-node.clickable');
        if (!clickedNodeElement) return;

        const nodeId = clickedNodeElement.dataset.nodeId;
        if (!nodeId) return;
        
        const adventureProgress = gameState.playerData?.adventure_progress;
        if (!adventureProgress) return;
        
        const targetNode = adventureProgress.map_data.nodes.find(n => n.id === nodeId);
        if (targetNode) {
            handleMapNodeClick(targetNode);
        }
    });

    nodesContainer.dataset.listenerAttached = 'true'; // 標記已綁定
}

/**
 * 在 Canvas 上繪製給定的路徑。
 * @param {Array<object>} path - 由 A* 演算法回傳的節點陣列。
 */
function drawPathOnCanvas(path) {
    const canvas = document.getElementById('adventure-map-canvas');
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const GRID_SIZE = 30; // 必須與 renderAdventureMap 中使用的格子大小一致

    // 清除舊的路徑
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!path || path.length < 2) {
        return; // 路徑太短，無需繪製
    }

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 223, 186, 0.8)'; // 淡金色的路徑
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 5;

    // 從路徑的起點開始
    const startX = path[0].position.x * GRID_SIZE + GRID_SIZE / 2;
    const startY = path[0].position.y * GRID_SIZE + GRID_SIZE / 2;
    ctx.moveTo(startX, startY);

    // 連接到路徑上的每一個點
    for (let i = 1; i < path.length; i++) {
        const x = path[i].position.x * GRID_SIZE + GRID_SIZE / 2;
        const y = path[i].position.y * GRID_SIZE + GRID_SIZE / 2;
        ctx.lineTo(x, y);
    }

    ctx.stroke(); // 繪製路徑
}


// A* 路徑尋找演算法的實現。
function findAStarPath(nodes, startNode, goalNode) {
    const grid = [];
    const width = 30;
    const height = 30;
    for (let i = 0; i < height; i++) {
        grid.push(new Array(width).fill(null));
    }

    nodes.forEach(node => {
        grid[node.position.y][node.position.x] = node;
    });

    function heuristic(a, b) {
        return Math.abs(a.position.x - b.position.x) + Math.abs(a.position.y - b.position.y);
    }

    const openSet = [startNode]; 
    const cameFrom = new Map(); 

    const gScore = new Map(); 
    gScore.set(startNode.id, 0);

    const fScore = new Map(); 
    fScore.set(startNode.id, heuristic(startNode, goalNode));

    while (openSet.length > 0) {
        let current = openSet[0];
        for (let i = 1; i < openSet.length; i++) {
            if (fScore.get(openSet[i].id) < fScore.get(current.id)) {
                current = openSet[i];
            }
        }

        if (current.id === goalNode.id) {
            const path = [];
            let temp = current;
            while (temp) {
                path.push(temp);
                temp = cameFrom.get(temp.id);
            }
            return path.reverse();
        }

        const index = openSet.indexOf(current);
        openSet.splice(index, 1);

        const neighbors = [];
        const { x, y } = current.position;
        const potentialNeighbors = [
            (y > 0) ? grid[y - 1][x] : null,
            (y < height - 1) ? grid[y + 1][x] : null,
            (x > 0) ? grid[y][x - 1] : null,
            (x < width - 1) ? grid[y][x + 1] : null
        ];

        potentialNeighbors.forEach(neighbor => {
            if (neighbor && neighbor.type !== 'obstacle') {
                neighbors.push(neighbor);
            }
        });

        for (const neighbor of neighbors) {
            const tentativeGScore = gScore.get(current.id) + 1; 

            if (tentativeGScore < (gScore.get(neighbor.id) || Infinity)) {
                cameFrom.set(neighbor.id, current);
                gScore.set(neighbor.id, tentativeGScore);
                fScore.set(neighbor.id, tentativeGScore + heuristic(neighbor, goalNode));
                
                if (!openSet.some(node => node.id === neighbor.id)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return [];
}


/**
 * 處理地圖節點點擊事件。
 * @param {object} node - 被點擊的目標節點物件。
 */
function handleMapNodeClick(node) {
    const adventureProgress = gameState.playerData?.adventure_progress;
    if (!adventureProgress || !adventureProgress.is_active) return;
    
    const allNodes = adventureProgress.map_data.nodes;
    const currentNode = allNodes.find(n => n.id === adventureProgress.current_node_id);

    if (!currentNode) {
        showFeedbackModal('錯誤', '找不到玩家目前的位置資訊。');
        return;
    }
    
    if (currentNode.id === node.id) {
        drawPathOnCanvas([]); // 點擊自身，清除路徑
        return;
    }

    const path = findAStarPath(allNodes, currentNode, node);

    drawPathOnCanvas(path);

    if (path.length > 0) {
        console.log("找到的路徑:", path.map(p => p.id));
    } else {
        console.log(`找不到通往 (${node.position.x}, ${node.position.y}) 的路徑。`);
    }
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
    const facilityData = gameState.gameConfigs?.adventure_islands?.[0]?.facilities?.find(f => f.facilityId === facilityId);
    if (facilityData) {
        facilityName = facilityData.name;
    }
    title.textContent = `探索地圖 - ${facilityName}`;
    
    nodesContainer.innerHTML = '';
    const ctx = canvas.getContext('2d');
    
    const mapData = adventureProgress.map_data;
    const nodes = mapData.nodes;
    const playerCurrentNode = nodes.find(n => n.id === adventureProgress.current_node_id);

    const GRID_SIZE = 30; 
    canvas.width = 30 * GRID_SIZE;
    canvas.height = 30 * GRID_SIZE;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'map-node';
        nodeEl.textContent = node.display_char;
        nodeEl.style.gridColumnStart = node.position.x + 1;
        nodeEl.style.gridRowStart = node.position.y + 1;
        nodeEl.dataset.nodeId = node.id;
        
        if (node.type !== 'obstacle') {
            nodeEl.classList.add('clickable');
        }

        nodesContainer.appendChild(nodeEl);
    });
    
    if(playerCurrentNode) {
        const playerToken = document.createElement('div');
        playerToken.className = 'player-token';
        playerToken.textContent = '您';
        playerToken.style.left = `${playerCurrentNode.position.x * GRID_SIZE}px`;
        playerToken.style.top = `${playerCurrentNode.position.y * GRID_SIZE}px`;
        nodesContainer.appendChild(playerToken);
    }

    showModal('adventure-map-modal');
}


/**
 * 根據點擊的設施，顯示隊伍選擇彈窗。
 * @param {object} facility - 被點擊的設施的資料物件。
 */
function showTeamSelectionModal(facility) {
    const modal = document.getElementById('expedition-team-selection-modal');
    const title = document.getElementById('team-selection-modal-title');
    const facilityInfo = document.getElementById('team-selection-facility-info');
    const monsterListContainer = document.getElementById('team-selection-monster-list');
    const confirmBtn = document.getElementById('confirm-expedition-start-btn');

    if (!modal || !title || !facilityInfo || !monsterListContainer || !confirmBtn) {
        console.error("隊伍選擇彈窗的元件未找到。");
        return;
    }

    title.textContent = `遠征隊伍編成 - ${facility.name}`;
    facilityInfo.innerHTML = `
        <p><strong>地點：</strong>${facility.name}</p>
        <p class="text-sm text-[var(--text-secondary)] mt-1">${facility.description}</p>
        <p class="text-sm mt-2"><strong>費用：</strong><span style="color:gold;">${facility.cost} 🪙</span> | <strong>建議等級：</strong>${facility.level_range[0]}-${facility.level_range[1]}</p>
    `;

    monsterListContainer.innerHTML = '';
    let selectedMonsters = []; 

    const monsters = gameState.playerData?.farmedMonsters || [];

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

        if (!isDisabled) {
            card.addEventListener('click', () => {
                const monsterId = card.dataset.monsterId;
                if (selectedMonsters.includes(monsterId)) {
                    selectedMonsters = selectedMonsters.filter(id => id !== monsterId);
                    card.classList.remove('selected');
                } else {
                    if (selectedMonsters.length < 3) {
                        selectedMonsters.push(monsterId);
                        card.classList.add('selected');
                    } else {
                        showFeedbackModal('提示', '最多只能選擇3隻怪獸參加遠征。');
                    }
                }
                confirmBtn.disabled = selectedMonsters.length === 0;
            });
        }
        
        monsterListContainer.appendChild(card);
    });

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
            // --- 核心修改處 START ---
            // 在渲染地圖前，手動將後端回傳的 adventure_progress 更新到全域狀態中
            if (gameState.playerData) {
                gameState.playerData.adventure_progress = result.adventure_progress;
            }
            // 接著再刷新一次完整的玩家資料，確保金幣等狀態也同步
            await refreshPlayerData();
            // --- 核心修改處 END ---

            hideModal('feedback-modal');
            
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
    
    // 初始化一次性的事件監聽器
    initializeAdventureMapHandlers();

    const adventureProgress = gameState.playerData?.adventure_progress;
    if (adventureProgress && adventureProgress.is_active) {
        renderAdventureMap(adventureProgress);
        return;
    }
    
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
