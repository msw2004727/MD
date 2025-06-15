// js/handlers/monster-handlers.js

function initializeMonsterEventHandlers() {
    handleFarmActions();
    handleLeaderboardInteractions();
}

// 新增：補上缺少的表頭排序處理函數
function handleFarmHeaderSorting() {
    if (DOMElements.farmHeaders) {
        DOMElements.farmHeaders.addEventListener('click', (event) => {
            const target = event.target.closest('.sortable');
            if (!target) return;

            const sortKey = target.dataset.sortKey;
            if (!sortKey || ['actions', 'deploy', 'index'].includes(sortKey)) return;

            const currentSortKey = gameState.farmSortConfig.key;
            const currentSortOrder = gameState.farmSortConfig.order;

            let newSortOrder = 'desc';
            if (currentSortKey === sortKey && currentSortOrder === 'desc') {
                newSortOrder = 'asc';
            }
            
            gameState.farmSortConfig = {
                key: sortKey,
                order: newSortOrder
            };

            renderMonsterFarm();
        });
    }
}

function handleFarmActions() {
    // 使用事件委派來處理農場列表中的所有點擊事件
    if (DOMElements.farmedMonstersList) {
        DOMElements.farmedMonstersList.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const monsterItem = button.closest('.farm-monster-item');
            const monsterId = monsterItem?.querySelector('.monster-name-link')?.getAttribute('onclick')?.match(/'([^']+)'/)[1];
            
            if (!monsterId) return;

            if (button.textContent.includes('出戰')) {
                handleDeployMonsterClick(monsterId);
            } else if (button.textContent.includes('召回')) {
                const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
                if (monster?.farmStatus) {
                    handleEndCultivationClick(event, monsterId, monster.farmStatus.trainingStartTime, monster.farmStatus.trainingDuration);
                }
            } else if (button.textContent.includes('修煉')) {
                handleCultivateMonsterClick(event, monsterId);
            } else if (button.textContent.includes('放生')) {
                handleReleaseMonsterClick(event, monsterId);
            }
        });
    }
    
    // 處理農場表頭排序
    handleFarmHeaderSorting();
}


function handleLeaderboardInteractions() {
    // 處理怪獸排行榜中的點擊
    if (DOMElements.monsterLeaderboardTable) {
        DOMElements.monsterLeaderboardTable.addEventListener('click', (event) => {
            const link = event.target.closest('a.leaderboard-monster-link');
            if (link) {
                event.preventDefault();
                const monsterId = link.closest('tr')?.dataset.monsterId;
                if (!monsterId) return;
                const monsterData = gameState.monsterLeaderboard.find(m => m.id === monsterId);
                if (monsterData) {
                    updateMonsterInfoModal(monsterData, gameState.gameConfigs);
                    showModal('monster-info-modal');
                }
            }
            // 【移除】移除了原本會導致錯誤觸發的 else 區塊。
            // 現在只有點擊按鈕自身的 onclick 事件會觸發挑戰，點擊空白處則不會。
        });
    }

    // 處理元素篩選頁籤
    if (DOMElements.monsterLeaderboardElementTabs) {
        DOMElements.monsterLeaderboardElementTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const filter = event.target.dataset.elementFilter;
                gameState.currentMonsterLeaderboardElementFilter = filter;
                DOMElements.monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                filterAndRenderMonsterLeaderboard();
            }
        });
    }
    
    // 處理排行榜排序
    const tables = [DOMElements.monsterLeaderboardTable, DOMElements.playerLeaderboardTable];
    tables.forEach(table => {
        if (table) {
            table.addEventListener('click', (event) => {
                const th = event.target.closest('th');
                if (!th || !th.dataset.sortKey) return;

                const sortKey = th.dataset.sortKey;
                const tableType = table.id.includes('monster') ? 'monster' : 'player';
                let currentSortConfig = gameState.leaderboardSortConfig?.[tableType] || {};
                let newSortOrder = 'desc';
                if (currentSortConfig.key === sortKey && currentSortConfig.order === 'desc') newSortOrder = 'asc';
                else if (currentSortConfig.key === sortKey && currentSortConfig.order === 'asc') newSortOrder = 'desc';
                
                gameState.leaderboardSortConfig[tableType] = { key: sortKey, order: newSortOrder };
                
                if (tableType === 'monster') {
                    filterAndRenderMonsterLeaderboard();
                } else {
                    sortAndRenderLeaderboard(tableType);
                }
            });
        }
    });

    // 處理排行榜刷新按鈕
    if (DOMElements.refreshMonsterLeaderboardBtn) {
        DOMElements.refreshMonsterLeaderboardBtn.addEventListener('click', fetchAndDisplayMonsterLeaderboard);
    }
}
