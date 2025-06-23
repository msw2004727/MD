// js/ui-adventure.js
// 專門負責渲染「冒險島」的所有UI。

/**
 * 根據點擊的設施，顯示隊伍選擇彈窗。
 * @param {object} facility - 被點擊的設施的資料物件。
 */
function showTeamSelectionModal(facility) {
    // 獲取彈窗及其內部元件
    const modal = document.getElementById('expedition-team-selection-modal');
    const title = document.getElementById('team-selection-modal-title');
    const facilityInfo = document.getElementById('team-selection-facility-info');
    const monsterListContainer = document.getElementById('team-selection-monster-list');
    const confirmBtn = document.getElementById('confirm-expedition-start-btn');

    if (!modal || !title || !facilityInfo || !monsterListContainer || !confirmBtn) {
        console.error("隊伍選擇彈窗的元件未找到。");
        return;
    }

    // 更新彈窗標題與設施資訊
    title.textContent = `遠征隊伍編成 - ${facility.name}`;
    facilityInfo.innerHTML = `
        <p><strong>地點：</strong>${facility.name}</p>
        <p class="text-sm text-[var(--text-secondary)] mt-1">${facility.description}</p>
        <p class="text-sm mt-2"><strong>費用：</strong><span style="color:gold;">${facility.cost} 🪙</span> | <strong>建議等級：</strong>${facility.level_range[0]}-${facility.level_range[1]}</p>
    `;

    // 清空舊的怪獸列表
    monsterListContainer.innerHTML = '';
    let selectedMonsters = []; // 用於追蹤被選中的怪獸ID

    const monsters = gameState.playerData?.farmedMonsters || [];

    // 渲染所有可選的怪獸卡片
    monsters.forEach(monster => {
        const card = document.createElement('div');
        card.className = 'monster-selection-card';
        card.dataset.monsterId = monster.id;

        const isBusy = monster.farmStatus?.isTraining || monster.farmStatus?.isBattling;
        const isInjured = monster.hp < monster.initial_max_hp * 0.25;
        const isDisabled = isBusy || isInjured;

        if (isDisabled) {
            card.classList.add('disabled');
        }

        // 獲取頭像圖片
        const headInfo = { type: '無', rarity: '普通' };
        const constituentIds = monster.constituent_dna_ids || [];
        if (constituentIds.length > 0) {
            const headDnaId = constituentIds[0];
            const allDnaTemplates = gameState.gameConfigs?.dna_fragments || [];
            const headDnaTemplate = allDnaTemplates.find(dna => dna.id === headDnaId);
            if (headDnaTemplate) {
                headInfo.type = headDnaTemplate.type || '無';
                headInfo.rarity = headDnaTemplate.rarity || '普通';
            }
        }
        const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);

        // 填充卡片內容
        card.innerHTML = `
            <div class="monster-selection-card-header">
                <span class="text-rarity-${monster.rarity.toLowerCase()}">${getMonsterDisplayName(monster, gameState.gameConfigs)}</span>
                <span class="text-sm">Lv.${monster.level || 1}</span>
            </div>
            <div class="monster-selection-card-body">
                <div class="monster-selection-avatar" style="${imagePath ? `background-image: url('${imagePath}')` : ''}"></div>
                <div class="monster-selection-stats">
                    <span>HP: ${monster.hp}/${monster.initial_max_hp}</span>
                    <span>攻擊: ${monster.attack}</span>
                    <span>防禦: ${monster.defense}</span>
                    ${isBusy ? `<span style="color:var(--warning-color);">修煉中</span>` : ''}
                    ${isInjured ? `<span style="color:var(--danger-color);">瀕死</span>` : ''}
                </div>
            </div>
        `;

        // 綁定點擊事件
        if (!isDisabled) {
            card.addEventListener('click', () => {
                const monsterId = card.dataset.monsterId;
                if (selectedMonsters.includes(monsterId)) {
                    // 如果已選中，則取消選擇
                    selectedMonsters = selectedMonsters.filter(id => id !== monsterId);
                    card.classList.remove('selected');
                } else {
                    // 如果未選中，檢查是否已達上限
                    if (selectedMonsters.length < 3) {
                        selectedMonsters.push(monsterId);
                        card.classList.add('selected');
                    } else {
                        showFeedbackModal('提示', '最多只能選擇3隻怪獸參加遠征。');
                    }
                }
                // 更新確認按鈕的狀態
                confirmBtn.disabled = selectedMonsters.length === 0;
            });
        }
        
        monsterListContainer.appendChild(card);
    });

    // 綁定確認按鈕的事件
    confirmBtn.onclick = () => {
        // 在這裡呼叫實際開始遠征的函式
        startExpedition(facility.id, selectedMonsters);
    };

    // 顯示彈窗
    showModal('expedition-team-selection-modal');
}

/**
 * 處理開始遠征的邏輯（目前為預留）
 * @param {string} facilityId - 設施ID
 * @param {Array<string>} teamMonsterIds - 被選中的怪獸ID列表
 */
async function startExpedition(facilityId, teamMonsterIds) {
    hideModal('expedition-team-selection-modal');
    showFeedbackModal('準備出發...', `正在為「${facilityId}」組建遠征隊...`, true);

    try {
        // TODO: 在下一階段，這裡將會呼叫後端的 /adventure/start API
        // const result = await fetchAPI('/adventure/start', { ... });
        
        // 暫時顯示開發中訊息
        setTimeout(() => {
            hideModal('feedback-modal');
            showFeedbackModal('提示', '遠征隊伍已確認！後續的地圖與戰鬥功能正在全力開發中，敬請期待！');
        }, 1500);

    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('錯誤', `開始遠征失敗：${error.message}`);
    }
}


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
    
    adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">正在從遠方島嶼獲取情報...</p>';

    try {
        const islandsData = await getAdventureIslandsData();
        adventureTabContent.innerHTML = '';

        if (!islandsData || !Array.isArray(islandsData) || islandsData.length === 0) {
            adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">目前沒有可前往的冒險島嶼。</p>';
            return;
        }

        const island = islandsData[0];
        const facilities = island.facilities || [];
        
        // 將島嶼資料存到 gameState 中，以便後續使用
        if (!gameState.gameConfigs.adventure_islands) {
            gameState.gameConfigs.adventure_islands = islandsData;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'adventure-wrapper';
        const contentArea = document.createElement('div');
        contentArea.className = 'adventure-content-area';
        
        const wideBg = island.backgrounds?.wide || '';
        const narrowBg = island.backgrounds?.narrow || '';
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
        document.head.appendChild(style);

        const islandContainer = document.createElement('div');
        islandContainer.className = 'adventure-island-container';
        const islandTitle = document.createElement('h3');
        islandTitle.className = 'adventure-island-title';
        islandTitle.textContent = island.islandName || '未知的島嶼';
        islandContainer.appendChild(islandTitle);

        const facilityList = document.createElement('div');
        facilityList.className = 'adventure-facility-list';

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

        islandContainer.appendChild(facilityList);
        contentArea.appendChild(islandContainer);
        wrapper.appendChild(contentArea);
        adventureTabContent.appendChild(wrapper);

    } catch (error) {
        console.error("獲取或渲染冒險島資料時發生錯誤:", error);
        adventureTabContent.innerHTML = `<p class="text-center text-lg text-[var(--text-secondary)] py-10" style="color: var(--danger-color);">錯誤：無法載入冒險島資料。<br>${error.message}</p>`;
    }
}
