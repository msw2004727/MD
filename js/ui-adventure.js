// js/ui-adventure.js
// 專門負責渲染「冒險島」的所有UI。

/**
 * 根據點擊的設施，顯示隊伍選擇彈窗。
 * @param {object} facility - 被點擊的設施的資料物件。
 */
function showTeamSelectionModal(facility) {
    const modal = document.getElementById('expedition-team-selection-modal');
    const title = document.getElementById('team-selection-modal-title');
    const facilityInfo = document.getElementById('team-selection-facility-info');
    const monsterListContainer = document.getElementById('team-selection-monster-list');
    const confirmBtn = document.getElementById('confirm-expedition-start-btn');

    if (!modal || !title || !facilityInfo || !monsterListContainer || !confirmBtn) {
        console.error("隊伍選擇彈窗的元件未找到。");
        return;
    }

    title.textContent = `遠征隊伍編成 - ${facility.name}`;
    facilityInfo.innerHTML = `
        <p><strong>地點：</strong>${facility.name}</p>
        <p class="text-sm text-[var(--text-secondary)] mt-1">${facility.description}</p>
        <p class="text-sm mt-2"><strong>費用：</strong><span style="color:gold;">${facility.cost} 🪙</span> | <strong>建議等級：</strong>${facility.level_range[0]}-${facility.level_range[1]}</p>
    `;

    monsterListContainer.innerHTML = '';
    let selectedMonsters = [];
    confirmBtn.disabled = true; // 按鈕在初始時應為禁用狀態

    const monsters = gameState.playerData?.farmedMonsters || [];

    if (monsters.length === 0) {
        monsterListContainer.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">您沒有可派遣的怪獸。</p>`;
    } else {
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

            card.innerHTML = `
                <div class="monster-selection-card-header">
                    <span class="text-rarity-${(monster.rarity || 'common').toLowerCase()}">${getMonsterDisplayName(monster, gameState.gameConfigs)}</span>
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

            if (!isDisabled) {
                card.addEventListener('click', () => {
                    const monsterId = card.dataset.monsterId;
                    if (selectedMonsters.includes(monsterId)) {
                        selectedMonsters = selectedMonsters.filter(id => id !== monsterId);
                        card.classList.remove('selected');
                    } else {
                        if (selectedMonsters.length < 3) {
                            selectedMonsters.push(monsterId);
                            card.classList.add('selected');
                        } else {
                            showFeedbackModal('提示', '最多只能選擇3隻怪獸參加遠征。');
                        }
                    }
                    // 【修改】直接更新按鈕的 disabled 狀態
                    confirmBtn.disabled = selectedMonsters.length === 0;
                });
            }
            monsterListContainer.appendChild(card);
        });
    }

    // 【修改】移除 cloneNode，直接為按鈕綁定 onclick 事件
    // 每次打開彈窗時，這個 onclick 都會被重新賦值，確保使用的是最新的 selectedMonsters 數據
    confirmBtn.onclick = () => {
        const islandsData = gameState.gameConfigs.adventure_islands || [];
        let islandId = null;
        for (const island of islandsData) {
            if (island.facilities && island.facilities.some(fac => fac.facilityId === facility.facilityId)) {
                islandId = island.islandId;
                break;
            }
        }
        
        if (islandId) {
            initiateExpedition(islandId, facility.facilityId, selectedMonsters);
        } else {
            showFeedbackModal('錯誤', '無法確定設施所屬的島嶼。');
        }
    };

    showModal('expedition-team-selection-modal');
}


/**
 * 渲染遠征進行中的主畫面。
 * (此為下一階段的預留函式)
 * @param {object} adventureProgress - 包含當前進度的物件。
 */
function renderAdventureProgressUI(adventureProgress) {
    console.log("TODO: 渲染遠征進度UI", adventureProgress);
    hideAllModals(); // 隱藏所有彈窗
    // 在這裡加入渲染進度條、事件描述、選項按鈕的程式碼
    const adventureTabContent = document.getElementById('guild-content');
    adventureTabContent.innerHTML = `<p class="text-center text-lg text-[var(--text-secondary)] py-10">遠征開始！(UI開發中...)</p>`;
}


/**
 * 根據後端傳來的島嶼資料，渲染冒險島的設施列表。
 */
async function initializeAdventureUI() {
    const adventureTabContent = document.getElementById('guild-content');
    if (!adventureTabContent) {
        console.error("冒險島的內容容器 'guild-content' 未找到。");
        return;
    }
    
    adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">正在從遠方島嶼獲取情报...</p>';

    try {
        const islandsData = await getAdventureIslandsData();
        adventureTabContent.innerHTML = '';

        if (!islandsData || !Array.isArray(islandsData) || islandsData.length === 0) {
            adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">目前沒有可前往的冒險島嶼。</p>';
            return;
        }

        // 暫時只處理第一個島嶼
        const island = islandsData[0];
        const facilities = island.facilities || [];
        
        if (gameState.gameConfigs) {
            gameState.gameConfigs.adventure_islands = islandsData;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'adventure-wrapper';
        const contentArea = document.createElement('div');
        contentArea.className = 'adventure-content-area';
        
        const wideBg = island.backgrounds?.wide || '';
        const narrowBg = island.backgrounds?.narrow || '';
        const styleId = 'adventure-bg-style';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = `
            .adventure-content-area { background-image: url('${narrowBg}'); }
            @media (min-width: 768px) { .adventure-content-area { background-image: url('${wideBg}'); } }
        `;

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
                        <span class="facility-cost">${facility.cost || 0} 🪙</span>
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
