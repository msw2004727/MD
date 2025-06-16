// js/handlers/monster-handlers.js

function initializeMonsterEventHandlers() {
    handleFarmActions();
    handleLeaderboardInteractions();
}

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
    const monsterContainer = DOMElements.monsterLeaderboardTableContainer;
    const playerContainer = DOMElements.playerLeaderboardTableContainer;

    // 【修改】對怪獸排行榜容器進行事件監聽，統一處理點擊與排序
    if (monsterContainer) {
        monsterContainer.addEventListener('click', (event) => {
            const link = event.target.closest('a.leaderboard-monster-link');
            const th = event.target.closest('th');

            if (link) { // 處理點擊怪獸名稱
                event.preventDefault();
                const monsterId = link.closest('tr')?.dataset.monsterId;
                if (!monsterId) return;
                const monsterData = gameState.monsterLeaderboard.find(m => m.id === monsterId);
                if (monsterData) {
                    updateMonsterInfoModal(monsterData, gameState.gameConfigs);
                    showModal('monster-info-modal');
                }
            } else if (th && th.dataset.sortKey) { // 處理點擊表頭排序
                const sortKey = th.dataset.sortKey;
                let currentSortConfig = gameState.leaderboardSortConfig?.monster || {};
                let newSortOrder = (currentSortConfig.key === sortKey && currentSortConfig.order === 'desc') ? 'asc' : 'desc';
                
                gameState.leaderboardSortConfig.monster = { key: sortKey, order: newSortOrder };
                filterAndRenderMonsterLeaderboard();
            }
        });
    }

    // 【修改】對玩家排行榜容器進行事件監聽，專門處理排序
    if (playerContainer) {
        playerContainer.addEventListener('click', (event) => {
            const th = event.target.closest('th');
            if (th && th.dataset.sortKey) { // 只處理表頭點擊
                const sortKey = th.dataset.sortKey;
                let currentSortConfig = gameState.leaderboardSortConfig?.player || {};
                let newSortOrder = (currentSortConfig.key === sortKey && currentSortConfig.order === 'desc') ? 'asc' : 'desc';

                gameState.leaderboardSortConfig.player = { key: sortKey, order: newSortOrder };
                sortAndRenderLeaderboard('player');
            }
        });
    }

    // 處理元素篩選頁籤 (維持不變)
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
    
    // 處理排行榜刷新按鈕 (維持不變)
    if (DOMElements.refreshMonsterLeaderboardBtn) {
        DOMElements.refreshMonsterLeaderboardBtn.addEventListener('click', fetchAndDisplayMonsterLeaderboard);
    }
}
