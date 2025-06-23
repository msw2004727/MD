// js/handlers/adventure-handlers.js
// 專門處理「冒險島」頁籤內的所有使用者互動事件。

/**
 * 處理點擊冒險島設施卡片上的「挑戰」按鈕。
 * @param {Event} event - 點擊事件對象。
 */
function handleFacilityChallengeClick(event) {
    const button = event.target.closest('.challenge-facility-btn');
    // 從按鈕的 data-* 屬性中獲取設施ID
    const facilityId = button.dataset.facilityId; 

    if (!facilityId) {
        console.error("挑戰按鈕上缺少 'data-facility-id' 屬性。");
        return;
    }

    // 顯示一個暫時的彈窗，表示功能正在開發中
    const message = `您已選擇挑戰設施：${facilityId}！<br><br>後續的戰鬥邏輯正在開發中。`;
    
    // 確保 showFeedbackModal 函式存在
    if(typeof showFeedbackModal === 'function') {
        showFeedbackModal('準備挑戰', message);
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
        // 使用事件委派，將監聽器綁定在父容器上，以處理所有設施卡片的點擊
        adventureContainer.addEventListener('click', (event) => {
            const challengeButton = event.target.closest('.challenge-facility-btn');
            
            if (challengeButton) {
                // 如果點擊的是挑戰按鈕，則呼叫對應的處理函式
                handleFacilityChallengeClick(event);
            }
            // 未來可以在此處加入對其他按鈕的判斷，例如 '查看詳情' 等
        });
        console.log("冒險島事件處理器已成功初始化，並監聽挑戰按鈕。");
    } else {
        // 這是個後備機制，以防 handler 比 ui.js 先載入
        setTimeout(initializeAdventureHandlers, 100);
    }
}
