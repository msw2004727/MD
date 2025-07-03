// js/ui/ui-medical.js
// 這個檔案專門處理「醫療站」頁籤的UI渲染與相關更新。

/**
 * 渲染醫療站的主要介面。
 * 目前此函式為空，因為介面是靜態的 HTML。
 * 未來可以在此處加入動態元素的渲染邏輯。
 */
function renderMedicalStation() {
    // 目前介面是靜態的，不需要 JavaScript 渲染。
    // 保留此函式以便未來擴充。
    console.log("醫療站介面已載入。");
}

/**
 * 初始化醫療站的事件監聽。
 */
function initializeMedicalStationHandlers() {
    // 監聽主頁籤的點擊，如果點擊的是醫療站，就呼叫渲染函式
    const mainTabs = document.getElementById('dna-farm-tabs');
    if (mainTabs) {
        mainTabs.addEventListener('click', (event) => {
            if (event.target.dataset.tabTarget === 'medical-content') {
                renderMedicalStation();
            }
        });
    }

    // 為醫療站內的按鈕添���事件監聽（此處為範例）
    const medicalContent = document.getElementById('medical-content');
    if(medicalContent) {
        medicalContent.addEventListener('click', function(event) {
            if (event.target.tagName === 'BUTTON' && event.target.classList.contains('button')) {
                const card = event.target.closest('.medical-card');
                if (card) {
                    const title = card.querySelector('.medical-card-title').textContent;
                    console.log(`點擊了「${title}」功能的「開始」按鈕。`);
                    // 在此處可以呼叫對應的功能函式
                    // 例如: handleFeatureClick(title);
                }
            }
        });
    }
}
