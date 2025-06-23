// js/handlers/adventure-handlers.js
// 專門處理「冒險島」頁籤內的所有使用者互動事件。

/**
 * 處理點擊冒險島設施卡片上的「挑戰」按鈕。
 * @param {Event} event - 點擊事件對象。
 */
function handleFacilityChallengeClick(event) {
    const button = event.target.closest('.challenge-facility-btn');
    if (!button) return;

    const facilityId = button.dataset.facilityId; 
    if (!facilityId) {
        console.error("挑戰按鈕上缺少 'data-facility-id' 屬性。");
        return;
    }

    // 從 gameState 中找到對應的設施資料
    const islandsData = gameState.gameConfigs.adventure_islands || [];
    let facilityData = null;

    for (const island of islandsData) {
        if (island.facilities && Array.isArray(island.facilities)) {
            facilityData = island.facilities.find(fac => fac.facilityId === facilityId);
            if (facilityData) break;
        }
    }

    if (facilityData) {
        // 呼叫在 ui-adventure.js 中新增的函式來顯示隊伍選擇彈窗
        showTeamSelectionModal(facilityData);
    } else {
        console.error(`在遊戲設定中找不到 ID 為 ${facilityId} 的設施資料。`);
        showFeedbackModal('錯誤', '找不到該設施的詳細資料。');
    }
}

/**
 * 初始化冒險島所有功能的事件監聽器。
 */
function initializeAdventureHandlers() {
    // 從 ui.js 中獲取冒險島的主容器
    const adventureContainer = DOMElements.guildContent;

    if (adventureContainer) {
        // 使用事件委派，將監聽器綁定在父容器上，以處理所有設施卡片的點擊
        adventureContainer.addEventListener('click', (event) => {
            const challengeButton = event.target.closest('.challenge-facility-btn');
            
            if (challengeButton) {
                // 如果點擊的是挑戰按鈕，則呼叫對應的處理函式
                handleFacilityChallengeClick(event);
            }
        });
        console.log("冒險島事件處理器已成功初始化，並監聽挑戰按鈕。");
    } else {
        // 這是個後備機制，以防 handler 比 ui.js 先載入
        setTimeout(initializeAdventureHandlers, 100);
    }
}
