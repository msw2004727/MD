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
    // **核心修改：將多個事件監聽器合併為一個，並使用更精確的邏輯判斷**
    const setupCombinedListener = (tableElement, tableType) => {
        if (!tableElement) return;

        tableElement.addEventListener('click', (event) => {
            const monsterLink = event.target.closest('a.leaderboard-monster-link');
            const challengeButton = event.target.closest('button');
            const sortableHeader = event.target.closest('th[data-sort-key]');

            // 1. 處理點擊怪獸名稱
            if (monsterLink) {
                event.preventDefault();
                const monsterId = monsterLink.closest('tr')?.dataset.monsterId;
                if (!monsterId) return;
                const monsterData = gameState.monsterLeaderboard.find(m => m.id === monsterId);
                if (monsterData) {
                    updateMonsterInfoModal(monsterData, gameState.gameConfigs);
                    showModal('monster-info-modal');
                }
                return; // 結束處理
            }

            // 2. 處理點擊「挑戰」按鈕
            if (challengeButton && challengeButton.textContent.includes('挑戰')) {
                 const monsterId = challengeButton.closest('tr')?.dataset.monsterId;
                 const monsterData = gameState.monsterLeaderboard.find(m => m.id === monsterId);
                 if(monsterData){
                    handleChallengeMonsterClick(event, monsterData.id, monsterData.owner_id, null, monsterData.owner_nickname);
                 }
                 return; // 結束處理
            }

            // 3. 處理點擊表頭排序
            if (sortableHeader) {
                const sortKey = sortableHeader.dataset.sortKey;
                let currentSortConfig = gameState.leaderboardSortConfig?.[tableType] || {};
                let newSortOrder = 'desc';
                if (currentSortConfig.key === sortKey && currentSortConfig.order === 'desc') {
                    newSortOrder = 'asc';
                } else if (currentSortConfig.key === sortKey && currentSortConfig.order === 'asc') {
                    newSortOrder = 'desc';
                }
                
                gameState.leaderboardSortConfig[tableType] = { key: sortKey, order: newSortOrder };
                
                if (tableType === 'monster') {
                    filterAndRenderMonsterLeaderboard();
                } else {
                    sortAndRenderLeaderboard(tableType);
                }
                return; // 結束處理
            }
        });
    };

    setupCombinedListener(DOMElements.monsterLeaderboardTable, 'monster');
    setupCombinedListener(DOMElements.playerLeaderboardTable, 'player');


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

    // 處理排行榜刷新按鈕
    if (DOMElements.refreshMonsterLeaderboardBtn) {
        DOMElements.refreshMonsterLeaderboardBtn.addEventListener('click', fetchAndDisplayMonsterLeaderboard);
    }
}
