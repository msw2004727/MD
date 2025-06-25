// js/ui-adventure.js
// 專門負責渲染「冒險島」的所有UI。

/**
 * 根據點擊的設施，顯示隊伍選擇彈窗。
 * @param {object} facility - 被點擊的設施的資料物件。
 * @param {string} islandId - 設施所在的島嶼ID。
 */
function showTeamSelectionModal(facility, islandId) {
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
    confirmBtn.disabled = true; 

    function updateCaptainMedal() {
        monsterListContainer.querySelectorAll('.captain-medal').forEach(medal => medal.remove());
        if (selectedMonsters.length > 0) {
            const captainId = selectedMonsters[0];
            const captainCard = monsterListContainer.querySelector(`.monster-selection-card[data-monster-id="${captainId}"]`);
            if (captainCard) {
                const header = captainCard.querySelector('.monster-selection-card-header');
                if (header) {
                    const medalEl = document.createElement('span');
                    medalEl.className = 'captain-medal';
                    medalEl.textContent = '🎖️';
                    medalEl.title = '遠征隊隊長';
                    header.appendChild(medalEl);
                }
            }
        }
    }

    const monsters = gameState.playerData?.farmedMonsters || [];

    if (monsters.length === 0) {
        monsterListContainer.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">您沒有可派遣的怪獸。</p>`;
    } else {
        monsters.forEach(monster => {
            const card = document.createElement('div');
            card.className = 'monster-selection-card';
            card.dataset.monsterId = monster.id;

            const isDeployed = monster.id === gameState.playerData.selectedMonsterId;
            const isBusy = monster.farmStatus?.isTraining || monster.farmStatus?.isBattling;
            const isInjured = monster.hp < monster.initial_max_hp * 0.25;
            const isDisabled = isBusy || isInjured || isDeployed;

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
                </div>
                <div class="monster-selection-card-body">
                    <div class="monster-selection-avatar" style="${imagePath ? `background-image: url('${imagePath}')` : ''}"></div>
                    <div class="monster-selection-stats">
                        <span>HP: ${monster.hp}/${monster.initial_max_hp}</span>
                        <span>攻擊: ${monster.attack}</span>
                        <span>防禦: ${monster.defense}</span>
                        ${isBusy ? `<span style="color:var(--warning-color);">修煉中</span>` : ''}
                        ${isInjured ? `<span style="color:var(--danger-color);">瀕死</span>` : ''}
                        ${isDeployed ? `<span style="color:var(--accent-color);">出戰中</span>` : ''}
                    </div>
                </div>
            `;

            if (!isDisabled) {
                card.addEventListener('click', () => {
                    const monsterId = card.dataset.monsterId;
                    const selectedIndex = selectedMonsters.indexOf(monsterId);

                    if (selectedIndex > -1) {
                        selectedMonsters.splice(selectedIndex, 1);
                        card.classList.remove('selected');
                    } else {
                        if (selectedMonsters.length < 3) {
                            selectedMonsters.push(monsterId);
                            card.classList.add('selected');
                        } else {
                            const deselectedId = selectedMonsters.shift(); 
                            const deselectedCard = monsterListContainer.querySelector(`.monster-selection-card[data-monster-id="${deselectedId}"]`);
                            if (deselectedCard) {
                                deselectedCard.classList.remove('selected');
                            }
                            selectedMonsters.push(monsterId);
                            card.classList.add('selected');
                        }
                    }
                    
                    updateCaptainMedal();
                    confirmBtn.disabled = selectedMonsters.length === 0;
                });
            }
            monsterListContainer.appendChild(card);
        });
    }

    confirmBtn.onclick = () => {
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
 * @param {object} adventureProgress - 包含當前進度的物件。
 */
function renderAdventureProgressUI(adventureProgress) {
    hideAllModals(); 
    const adventureTabContent = document.getElementById('guild-content');
    if (!adventureTabContent) return;

    const facilityData = gameState.gameConfigs?.adventure_islands
        .flatMap(island => island.facilities)
        .find(f => f.facilityId === adventureProgress.facility_id);
    const facilityName = facilityData?.name || '未知的區域';

    let progressBarHtml = '';
    for (let i = 0; i < adventureProgress.total_steps_in_floor; i++) {
        let stepClass = 'progress-step';
        if (i < adventureProgress.current_step) {
            stepClass += ' completed';
        } else if (i === adventureProgress.current_step) {
            stepClass += ' current';
        }
        progressBarHtml += `<div class="${stepClass}" title="第 ${i + 1} 步"></div>`;
    }

    let teamStatusHtml = '';
    adventureProgress.expedition_team.forEach((member, index) => {
        const originalMonster = gameState.playerData.farmedMonsters.find(m => m.id === member.monster_id);
        if (!originalMonster) return;

        const displayName = getMonsterDisplayName(originalMonster, gameState.gameConfigs);
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = originalMonster.rarity ? (rarityMap[originalMonster.rarity] || 'common') : 'common';

        const headInfo = { type: '無', rarity: '普通' };
        const constituentIds = originalMonster.constituent_dna_ids || [];
        if (constituentIds.length > 0) {
            const headDnaId = constituentIds[0];
            const headDnaTemplate = gameState.gameConfigs.dna_fragments.find(dna => dna.id === headDnaId);
            if (headDnaTemplate) {
                headInfo.type = headDnaTemplate.type || '無';
                headInfo.rarity = headDnaTemplate.rarity || '普通';
            }
        }
        const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);
        
        const isCaptain = index === 0;
        const captainMedal = isCaptain ? '<span class="captain-medal" title="遠征隊隊長">🎖️</span>' : '';
        
        const switchCaptainBtn = !isCaptain ? 
            `<button class="button secondary text-xs switch-captain-btn" data-monster-id="${member.monster_id}" title="任命為隊長" style="padding: 2px 6px; line-height: 1; min-width: auto; margin-left: 5px;">換</button>` : '';

        teamStatusHtml += `
            <div class="team-member-card" data-monster-id-in-expedition="${member.monster_id}">
                <div class="avatar" style="background-image: url('${imagePath}')"></div>
                <div class="info">
                    <div class="name text-rarity-${rarityKey}">${displayName} ${captainMedal}${switchCaptainBtn}</div>
                    <div class="status-bar-container" style="gap: 4px; margin-top: 2px;">
                        <div class="status-bar-background" style="height: 8px;">
                            <div class="status-bar-fill" style="width: ${(member.current_hp / originalMonster.initial_max_hp) * 100}%; background-color: var(--success-color);"></div>
                        </div>
                        <span class="status-bar-value" style="font-size: 0.7rem;">${member.current_hp}/${originalMonster.initial_max_hp}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    adventureTabContent.innerHTML = `
        <div class="adventure-progress-container">
            <header class="adventure-progress-header">
                <h3>${facilityName} - 第 ${adventureProgress.current_floor} 層</h3>
            </header>
            
            <div class="adventure-progress-bar-container">
                ${progressBarHtml}
            </div>

            <div class="adventure-main-content">
                <aside class="adventure-team-status-panel">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 class="details-section-title" style="border: none; margin: 0; padding: 0;">遠征隊</h4>
                        <span id="team-status-effects" style="display: flex; gap: 0.5rem;"></span>
                    </div>
                    ${teamStatusHtml}
                </aside>

                <main id="adventure-event-panel" class="adventure-event-panel">
                    <div id="adventure-event-description" class="event-description">
                        
                    </div>
                    <div id="adventure-random-growth-display" class="random-growth-display"></div>
                    <div id="adventure-event-choices" class="event-choices"></div>
                </main>
            </div>

            <footer class="adventure-actions">
                <button id="adventure-abandon-btn" class="button danger">放棄遠征</button>
                <button id="adventure-advance-btn" class="button primary">繼續前進</button>
            </footer>
        </div>
    `;

    const growthDisplayEl = document.getElementById('adventure-random-growth-display');
    const growthResult = adventureProgress.last_event_growth;

    if (growthResult && growthDisplayEl) {
        const monster = gameState.playerData.farmedMonsters.find(m => m.id === growthResult.monster_id);
        let growthHtml = '';
        if(monster) {
            const displayName = getMonsterDisplayName(monster, gameState.gameConfigs);
            const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
            const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';

            const headInfo = { type: '無', rarity: '普通' };
            const constituentIds = monster.constituent_dna_ids || [];
            if (constituentIds.length > 0) {
                const headDnaId = constituentIds[0];
                const headDnaTemplate = gameState.gameConfigs.dna_fragments.find(dna => dna.id === headDnaId);
                if (headDnaTemplate) {
                    headInfo.type = headDnaTemplate.type || '無';
                    headInfo.rarity = headDnaTemplate.rarity || '普通';
                }
            }
            const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);
            const statMap = { 'hp': 'HP', 'mp': 'MP', 'attack': '攻擊', 'defense': '防禦', 'speed': '速度', 'crit': '爆擊' };
            
            const gainsText = Object.entries(growthResult.stat_gains)
                .map(([stat, amount]) => `${statMap[stat] || stat} +${amount}`)
                .join('、');

            growthHtml = `
                <div class="growth-result-card">
                    <div class="avatar" style="background-image: url('${imagePath}')"></div>
                    <div class="growth-info">
                        <span class="monster-name text-rarity-${rarityKey}">${displayName}</span>
                        <span class="gains-text">${gainsText}</span>
                    </div>
                </div>
            `;
        }
        growthDisplayEl.innerHTML = growthHtml;
    }

    const advanceBtn = document.getElementById('adventure-advance-btn');
    const choicesEl = document.getElementById('adventure-event-choices');
    const descriptionEl = document.getElementById('adventure-event-description');
    
    const currentEvent = adventureProgress.current_event;
    
    const descriptionText = adventureProgress.story_override || currentEvent?.description;

    if (descriptionText) {
        descriptionEl.innerHTML = `<p>${descriptionText.replace(/\n/g, '<br>')}</p>`;
    }

    if (currentEvent && currentEvent.choices && currentEvent.choices.length > 0) {
        choicesEl.innerHTML = currentEvent.choices.map(choice => 
            `<button class="button secondary w-full adventure-choice-btn" data-choice-id="${choice.choice_id}">${choice.text}</button>`
        ).join('');
        if (advanceBtn) advanceBtn.style.display = 'none';
    } else {
        if (descriptionEl.innerHTML.trim() === '') {
            descriptionEl.innerHTML = `<p>你們已準備好，可以繼續前進了。</p>`;
        }
        choicesEl.innerHTML = '';
        if (advanceBtn) advanceBtn.style.display = 'block';
    }
}

/**
 * 在指定的怪獸卡片或隊伍標題上顯示暫時的狀態效果圖示。
 * @param {string} effectType - 'buff' 或 'debuff'
 * @param {string} statName - 屬性中文名，如 '攻擊'
 */
function displayTemporaryStatusEffect(effectType, statName) {
    const statMap = { '攻擊': '攻', '防禦': '防', '速度': '速', '命中率': '命', '閃避率': '閃', '特攻': '特攻', '特防': '特防', 'all': '全' };
    const shortStatName = statMap[statName] || statName;
    const indicatorText = `${shortStatName}${effectType === 'buff' ? '▲' : '▼'}`;
    const indicatorClass = effectType === 'buff' ? 'buff' : 'debuff';

    const container = document.getElementById('team-status-effects');
    if (!container) return;

    const indicator = document.createElement('span');
    indicator.className = `status-effect-indicator ${indicatorClass}`;
    indicator.textContent = indicatorText;
    
    // 清除舊的同類圖示，避免重疊
    const oldIndicators = container.querySelectorAll('.status-effect-indicator');
    oldIndicators.forEach(ind => ind.remove());
    
    container.appendChild(indicator);
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
    
    const adventureProgress = gameState.playerData?.adventure_progress;
    if (adventureProgress && adventureProgress.is_active) {
        renderAdventureProgressUI(adventureProgress);
        return;
    }
    
    adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">🏝️正在從遠方島嶼獲取情報...</p>';

    try {
        const islandsData = await getAdventureIslandsData();
        adventureTabContent.innerHTML = '';

        if (!islandsData || !Array.isArray(islandsData) || islandsData.length === 0) {
            adventureTabContent.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">目前沒有可前往的冒險島嶼。</p>';
            return;
        }

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
                // --- 核心修改處 START ---
                // 移除了 facility-reward-preview 的 font-weight: bold;
                card.innerHTML = `
                    <div class="facility-card-header">
                        <h4 class="facility-title">${facility.name || '未知設施'}</h4>
                        <span class="facility-cost">${facility.cost || 0} 🪙</span>
                    </div>
                    <div class="facility-card-body">
                        <p>${facility.description || '暫無描述。'}</p>
                        <div class="facility-reward-preview" style="color: var(--rarity-legendary-text); font-size: 0.75rem; text-align: left; padding-top: 0.75rem; padding-bottom: 0.25rem;">
                            🏆 ${facility.reward_preview || ''}
                        </div>
                    </div>
                    <div class="facility-card-footer">
                        <button class="button secondary" style="width: 36px; height: 36px; border-radius: 50%; padding: 0; font-size: 1.2rem;" title="層數排行榜 (開發中)" disabled>🏆</button>
                        <button class="button primary challenge-facility-btn" data-facility-id="${facility.facilityId}">挑戰</button>
                    </div>
                `;
                // --- 核心修改處 END ---
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
