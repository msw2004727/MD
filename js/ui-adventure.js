// js/ui-adventure.js
// 專門負責渲染「冒險島」的所有UI。

// --- 核心修改處 START ---
/**
 * 在 Canvas 上繪製指定的路徑。
 * @param {Array<object>} path - 由節點物件組成的路徑陣列。
 */
function drawPathOnCanvas(path) {
    const canvas = document.getElementById('adventure-map-canvas');
    if (!canvas || path.length < 2) return;

    const ctx = canvas.getContext('2d');
    const GRID_SIZE = 30;
    const HALF_GRID = GRID_SIZE / 2;

    // 清除舊的路徑
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 設定路徑樣式
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 223, 0, 0.7)'; // 半透明的金色
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 將第一個節點設為起點
    const startNode = path[0];
    ctx.moveTo(startNode.position.x * GRID_SIZE + HALF_GRID, startNode.position.y * GRID_SIZE + HALF_GRID);

    // 依序連接路徑上的所有節點
    for (let i = 1; i < path.length; i++) {
        const node = path[i];
        ctx.lineTo(node.position.x * GRID_SIZE + HALF_GRID, node.position.y * GRID_SIZE + HALF_GRID);
    }

    // 繪製路徑
    ctx.stroke();
}

/**
 * 清除 Canvas 上的路徑。
 */
function clearPathOnCanvas() {
    const canvas = document.getElementById('adventure-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// A* 路徑尋找演算法的實現。
/**
 * A* (A-Star) 路徑尋找演算法的實現。
 * @param {Array<object>} nodes - 地圖上所有節點的陣列。
 * @param {object} startNode - 起點節點。
 * @param {object} goalNode - 終點節點。
 * @returns {Array<object>} - 從起點到終點的路徑節點陣列，若無路徑則為空陣列。
 */
function findAStarPath(nodes, startNode, goalNode) {
    // 將節點列表轉換為更容易查找的 2D 網格
    const grid = [];
    nodes.forEach(node => {
        if (!grid[node.position.y]) {
            grid[node.position.y] = [];
        }
        grid[node.position.y][node.position.x] = node;
    });

    // A* 演算法的輔助函式：計算兩點間的曼哈頓距離（Heuristic）
    function heuristic(a, b) {
        return Math.abs(a.position.x - b.position.x) + Math.abs(a.position.y - b.position.y);
    }

    const openSet = [startNode]; // 待評估的節點
    const cameFrom = new Map(); // 記錄路徑

    const gScore = new Map(); // 從起點到當前節點的實際成本
    gScore.set(startNode.id, 0);

    const fScore = new Map(); // gScore + heuristic，預估總成本
    fScore.set(startNode.id, heuristic(startNode, goalNode));

    while (openSet.length > 0) {
        // 在 openSet 中找到 fScore 最低的節點
        let current = openSet[0];
        for (let i = 1; i < openSet.length; i++) {
            if (fScore.get(openSet[i].id) < fScore.get(current.id)) {
                current = openSet[i];
            }
        }

        // 如果已到達終點，則重構並返回路徑
        if (current.id === goalNode.id) {
            const path = [];
            let temp = current;
            while (temp) {
                path.push(temp);
                temp = cameFrom.get(temp.id);
            }
            return path.reverse();
        }

        // 將 current 從 openSet 移出
        const index = openSet.indexOf(current);
        openSet.splice(index, 1);

        // 獲取鄰居節點
        const neighbors = [];
        const { x, y } = current.position;
        const potentialNeighbors = [
            grid[y]?.[x - 1], grid[y]?.[x + 1],
            grid[y - 1]?.[x], grid[y + 1]?.[x]
        ];

        potentialNeighbors.forEach(neighbor => {
            // 必須是有效節點且不是障礙物
            if (neighbor && neighbor.type !== 'obstacle') {
                neighbors.push(neighbor);
            }
        });

        // 遍歷鄰居
        for (const neighbor of neighbors) {
            const tentativeGScore = gScore.get(current.id) + 1; // 假設每步成本為 1

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

    // 如果 openSet 為空仍未找到路徑，則返回空陣列
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

    const path = findAStarPath(allNodes, currentNode, node);

    if (path.length > 0) {
        // 繪製路徑
        drawPathOnCanvas(path);
        
        const pathCost = path.length - 1;
        
        // 步驟 2.2.3 & 2.2.4 的預留位置
        const confirmationMessage = `
            <p>您規劃的路徑長度為 ${pathCost} 步。</p>
            <p class="text-sm text-[var(--text-secondary)] mt-2">預計消耗：${pathCost} 探索點，${Math.ceil(pathCost / 5)} 份糧食。</p>
            <p class="mt-4">確定要移動嗎？</p>
        `;
        
        showConfirmationModal(
            '確認移動',
            confirmationMessage,
            () => {
                // TODO: 呼叫後端的 /move API
                console.log("確認移動！呼叫後端 API...");
                clearPathOnCanvas();
            },
            { 
                confirmButtonClass: 'primary', 
                confirmButtonText: '出發',
                onCancel: () => {
                    // 如果取消，清除路徑
                    clearPathOnCanvas();
                }
            }
        );

    } else {
        clearPathOnCanvas();
        showFeedbackModal('無法移動', `找不到通往 (${node.position.x}, ${node.position.y}) 的路徑。`);
    }
}
// --- 核心修改處 END ---


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
    const playerStartPos = mapData.player_start_pos;
    const nodes = mapData.nodes;

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
            nodeEl.addEventListener('click', () => handleMapNodeClick(node));
        }

        nodesContainer.appendChild(nodeEl);
    });

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
            const headDnaTemplate = allDnaTemplates.find(
