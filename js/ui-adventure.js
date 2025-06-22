// js/ui-adventure.js
// 專門負責渲染「冒險島」的所有UI。

/**
 * 初始化冒險島UI的總入口函式。
 * 當玩家點擊「冒險島」頁籤時，這個函式會被觸發。
 */
function initializeAdventureUI() {
    const adventureTabContent = document.getElementById('guild-content');
    if (!adventureTabContent) {
        console.error("冒險島的內容容器 'guild-content' 未找到。");
        return;
    }
    
    // 清空現有內容
    adventureTabContent.innerHTML = '';

    // 建立一個外層 Wrapper 來做置中
    const wrapper = document.createElement('div');
    wrapper.className = 'adventure-wrapper';

    // 建立一個內層 Content Area 來維持長寬比，並放置背景和網格
    const contentArea = document.createElement('div');
    contentArea.className = 'adventure-content-area';

    // 【核心修改】產生 3x3 = 9 個格子
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'adventure-grid-cell';
        cell.dataset.index = i; // 標記格子的索引

        // 【核心修改】計算並顯示座標
        const x = i % 3;
        const y = Math.floor(i / 3);
        
        const coordinateText = document.createElement('div');
        coordinateText.className = 'adventure-coordinate-text';
        coordinateText.textContent = `(${x}, ${y})`;
        
        cell.appendChild(coordinateText);
        contentArea.appendChild(cell);
    }

    // 組合結構並放入頁籤
    wrapper.appendChild(contentArea);
    adventureTabContent.appendChild(wrapper);
}
