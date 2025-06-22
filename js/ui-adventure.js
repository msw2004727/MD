// js/ui-adventure.js
// 專門負責渲染「冒險島」的所有UI，包括全景地圖、派遣隊伍視窗、探索地圖等。

let adventureDOMElements = {};

/**
 * 初始化「冒險島」頁籤所需的 DOM 元素。
 */
function initializeAdventureDOMElements() {
    adventureDOMElements = {
        // 「冒險島」頁籤的主內容容器，在 index.html 中對應的 ID 是 guild-content
        adventureTabContent: document.getElementById('guild-content'),
    };
}

/**
 * 渲染冒險島的主介面，包含背景圖和事件網格。
 */
function renderAdventureIsland() {
    // 確保容器存在
    if (!adventureDOMElements.adventureTabContent) {
        console.error("冒險島的內容容器 'guild-content' 未找到。");
        return;
    }

    // 清空現有內容，準備渲染新介面
    adventureDOMElements.adventureTabContent.innerHTML = '';

    // 建立地圖容器，這個容器將會套用我們在 adventure.css 中設定的背景圖
    const islandContainer = document.createElement('div');
    islandContainer.className = 'adventure-island-container';

    // 建立覆蓋在地圖上的網格容器
    const gridOverlay = document.createElement('div');
    gridOverlay.className = 'adventure-grid-overlay';

    // 產生 5x5 = 25 個格子
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'adventure-grid-cell';

        // 在每個格子中都先放入一個預設的按鈕
        const nodeButton = document.createElement('button');
        nodeButton.className = 'adventure-node-btn type-combat'; // 預設為戰鬥圖示
        nodeButton.dataset.nodeIndex = i; // 標記按鈕的索引
        
        // 為了方便未來擴充，可以隨機指派一些不同的圖示
        const nodeTypes = ['combat', 'combat', 'combat', 'treasure', 'fountain'];
        const randomType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
        nodeButton.classList.add(`type-${randomType}`);
        nodeButton.title = "探索此區域";

        cell.appendChild(nodeButton);
        gridOverlay.appendChild(cell);
    }

    // 將網格疊加到地圖容器上
    islandContainer.appendChild(gridOverlay);
    // 最後將完整的地圖容器放進頁籤內容區
    adventureDOMElements.adventureTabContent.appendChild(islandContainer);
}

/**
 * 初始化冒險島UI的總入口函式。
 * 當玩家點擊「冒險島」頁籤時，這個函式會被觸發。
 */
function initializeAdventureUI() {
    initializeAdventureDOMElements();
    renderAdventureIsland();
}
