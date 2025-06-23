// js/ui-adventure.js
// 專門負責渲染「冒險島」的所有UI。

/**
 * 初始化冒險島UI的總入口函式。
 * 當玩家點擊「冒險島」頁籤時，這個函式會被觸發。
 * 現在它會從後端獲取資料來動態渲染。
 */
async function initializeAdventureUI() {
    const adventureTabContent = document.getElementById('guild-content');
    if (!adventureTabContent) {
        console.error("冒險島的內容容器 'guild-content' 未找到。");
        return;
    }
    
    // 清空現有內容並顯示載入中提示
    adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">正在從遠方島嶼獲取情報...</p>';

    try {
        const islandsData = await getAdventureIslandsData();

        // 再次清空，準備渲染真實內容
        adventureTabContent.innerHTML = '';

        if (!islandsData || !Array.isArray(islandsData) || islandsData.length === 0) {
            adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">目前沒有可前往的冒險島嶼。</p>';
            return;
        }

        // 目前只處理第一個島嶼的資料
        const island = islandsData[0];
        const facilities = island.facilities || [];

        // 建立一個外層 Wrapper 來做置中
        const wrapper = document.createElement('div');
        wrapper.className = 'adventure-wrapper';

        // 建立一個內層 Content Area 來維持長寬比，並放置背景和內容
        const contentArea = document.createElement('div');
        contentArea.className = 'adventure-content-area';
        
        // 根據後端資料設定背景圖
        const wideBg = island.backgrounds?.wide || '';
        const narrowBg = island.backgrounds?.narrow || '';

        // 使用 style 標籤來動態設定響應式背景
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
        document.head.appendChild(style); // 將樣式注入到文檔頭部


        // 建立島嶼容器
        const islandContainer = document.createElement('div');
        islandContainer.className = 'adventure-island-container';

        // 建立島嶼標題
        const islandTitle = document.createElement('h3');
        islandTitle.className = 'adventure-island-title';
        islandTitle.textContent = island.islandName || '未知的島嶼';
        islandContainer.appendChild(islandTitle);

        // 建立設施列表容器
        const facilityList = document.createElement('div');
        facilityList.className = 'adventure-facility-list';

        // 根據設施資料動態生成卡片
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

        // 組合結構並放入頁籤
        islandContainer.appendChild(facilityList);
        contentArea.appendChild(islandContainer);
        wrapper.appendChild(contentArea);
        adventureTabContent.appendChild(wrapper);

    } catch (error) {
        console.error("獲取或渲染冒險島資料時發生錯誤:", error);
        adventureTabContent.innerHTML = `<p class="text-center text-lg text-[var(--text-secondary)] py-10" style="color: var(--danger-color);">錯誤：無法載入冒險島資料。<br>${error.message}</p>`;
    }
}
