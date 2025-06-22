// js/handlers/adventure-handlers.js
// 專門處理「冒險島」頁籤內的所有使用者互動事件。

/**
 * 處理點擊冒險島上的探索節點按鈕。
 * @param {Event} event - 點擊事件對象。
 */
function handleAdventureNodeClick(event) {
    const button = event.target.closest('.adventure-node-btn');
    if (!button) {
        return; // 如果點擊的不是按鈕，則不執行任何操作
    }

    const nodeIndex = button.dataset.nodeIndex;
    const nodeType = Array.from(button.classList).find(cls => cls.startsWith('type-'))?.split('-')[1] || '未知';

    // 顯示一個暫時的彈窗，表示功能正在開發中
    // 之後這裡會替換為打開「指派遠征隊伍」的彈窗邏輯
    const message = `你點擊了第 ${parseInt(nodeIndex, 10) + 1} 號探索區域（類型：${nodeType}）！<br><br>指派遠征隊伍的功能正在加速開發中，敬請期待！`;
    
    if(typeof showFeedbackModal === 'function') {
        showFeedbackModal('準備遠征', message);
    } else {
        alert(message.replace(/<br>/g, '\n'));
    }
}

/**
 * 初始化冒險島所有功能的事件監聽器。
 */
function initializeAdventureHandlers() {
    // 從 ui.js 中獲取冒險島的主容器
    const adventureContainer = DOMElements.adventureTabContent;

    if (adventureContainer) {
        // 使用事件委派，將監聽器綁定在父容器上，以處理所有探索按鈕的點擊
        adventureContainer.addEventListener('click', handleAdventureNodeClick);
        console.log("冒險島事件處理器已成功初始化。");
    } else {
        // 這是個後備機制，以防 handler 比 ui.js 先載入
        setTimeout(initializeAdventureHandlers, 100);
    }
}
