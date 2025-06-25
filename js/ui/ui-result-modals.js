// js/ui-result-modals.js
// 這個檔案負責處理顯示各種操作「結果」的彈窗。

function showDnaDrawModal(drawnItems) {
    if (!DOMElements.dnaDrawResultsGrid || !DOMElements.dnaDrawModal) return;
    const grid = DOMElements.dnaDrawResultsGrid;
    grid.innerHTML = '';

    if (!drawnItems || drawnItems.length === 0) {
        grid.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)]">本次未抽到任何DNA。</p>';
    } else {
        drawnItems.forEach((dna, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('dna-draw-result-item');
            applyDnaItemStyle(itemDiv, dna);

            const elementType = dna.type || '無';
            const elementCssKey = getElementCssClassKey(elementType);
            const typeSpanClass = `dna-type text-element-${elementCssKey}`;
            const rarityKey = dna.rarity ? dna.rarity.toLowerCase() : 'common';

            itemDiv.innerHTML = `
                <span class="dna-name text-rarity-${rarityKey}">${dna.name}</span>
                <span class="${typeSpanClass}">${elementType}屬性</span>
                <span class="dna-rarity text-rarity-${rarityKey}">${dna.rarity}</span>
                <button class="add-drawn-dna-to-backpack-btn button primary text-xs mt-2" data-dna-index="${index}">加入背包</button>
            `;
            grid.appendChild(itemDiv);
        });
    }
    showModal('dna-draw-modal');
}

function updateTrainingResultsModal(results, monsterName) {
    if (!DOMElements.trainingResultsModal) return;

    const monster = gameState.playerData.farmedMonsters.find(m => m.nickname === monsterName);
    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
    const rarityKey = monster?.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
    const rarityColorVar = `var(--rarity-${rarityKey}-text, var(--text-primary))`;

    let titleName = monsterName;
    if (monster) {
        titleName = getMonsterDisplayName(monster, gameState.gameConfigs);
    }
    
    DOMElements.trainingResultsModalTitle.innerHTML = `<span style="color: ${rarityColorVar};">${titleName}</span> <span style="font-weight: normal;">的修煉成果</span>`;
    
    const modalBody = DOMElements.trainingResultsModal.querySelector('.modal-body');

    const bannerUrl = gameState.assetPaths?.images?.modals?.trainingResults || '';
    const bannerHtml = `<div class="training-banner" style="text-align: center; margin-bottom: 1rem;"><img src="${bannerUrl}" alt="修煉成果橫幅" style="max-width: 100%; border-radius: 6px;"></div>`;
    
    const hintHtml = `<div class="training-hints-container" style="margin-bottom: 1rem; padding: 0.5rem; background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; text-align: center; font-style: italic; color: var(--text-secondary);"><p id="training-hints-carousel">正在讀取提示...</p></div>`;

    let storyHtml = '';
    const storyContent = (results.adventure_story || "").replace(/\n/g, '<br>');
    if (storyContent) {
        storyHtml = `<div class="training-section"><h5 class="details-section-title" style="border: none; padding-bottom: 0;">冒險故事</h5><div id="adventure-story-container" style="display: none; padding: 10px 5px; border-left: 3px solid var(--border-color); margin-top: 10px; font-size: 0.9rem;"><p>${storyContent}</p></div><a href="#" id="toggle-story-btn" style="display: block; text-align: center; margin-top: 8px; color: var(--accent-color); cursor: pointer; text-decoration: underline;">點此查看此趟的冒險故事 ▼</a></div>`;
    }

    const skillAndNewSkillLogs = results.skill_updates_log.filter(log => log.startsWith("🎉") || log.startsWith("🌟"));
    let skillGrowthHtml = '<ul>';
    if (skillAndNewSkillLogs.length > 0) {
        skillAndNewSkillLogs.forEach(log => {
            let cleanLog = log.substring(log.indexOf(' ') + 1);
            const updatedLog = cleanLog.replace(/'(.+?)'/g, (match, skillName) => `'<a href="#" class="skill-name-link" data-skill-name="${skillName}" style="text-decoration: none; color: inherit;">${skillName}</a>'`);
            skillGrowthHtml += `<li>${updatedLog}</li>`;
        });
    } else {
        skillGrowthHtml += "<li>技能無變化。</li>";
    }
    skillGrowthHtml += "</ul>";
    const abilityGrowthSectionHtml = `<div class="training-section"><h5 class="details-section-title" style="border: none; padding-bottom: 0;">能力成長</h5><div class="training-result-subsection mt-2" style="font-size: 0.9rem;">${skillGrowthHtml}</div></div>`;

    const statGrowthLogs = results.skill_updates_log.filter(log => log.startsWith("💪"));
    let statGrowthHtml = '<ul>';
    if (statGrowthLogs.length > 0) {
        const statNameMap = {
            'HP': '生命值', 'MP': '魔力值', 'ATTACK': '攻擊', 'DEFENSE': '防禦', 'SPEED': '速度', 'CRIT': '爆擊率'
        };
        statGrowthLogs.forEach(log => {
            let cleanLog = log.substring(log.indexOf(' ') + 1);
            cleanLog = cleanLog.replace(/'(.*?)'/g, (match, statKey) => {
                const translatedName = statNameMap[statKey] || statKey;
                return `<span style="color: gold; font-weight: bold;">${translatedName}</span>`;
            });
            cleanLog = cleanLog.replace('提升', '<span style="color: var(--danger-color); font-weight: bold;">▲</span>');
            statGrowthHtml += `<li>${cleanLog}</li>`;
        });
    } else {
        statGrowthHtml += "<li>基礎數值無變化。</li>";
    }
    statGrowthHtml += "</ul>";
    const valueChangeSectionHtml = `<div class="training-section" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;"><h5 class="details-section-title" style="border: none; padding-bottom: 0; color: var(--accent-color);">數值變化</h5><div class="training-result-subsection mt-2" style="font-size: 0.9rem;">${statGrowthHtml}</div></div>`;

    let itemsSectionHtml = '';
    const items = results.items_obtained || [];
    if (items.length > 0) {
        itemsSectionHtml = `<div class="training-section" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;"><h5 class="details-section-title" style="border: none; padding-bottom: 0;">拾獲物品</h5><div class="inventory-grid mt-2" id="training-items-grid"></div></div>`;
    } else {
        itemsSectionHtml = `<div class="training-section" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;"><h5 class="details-section-title" style="border: none; padding-bottom: 0;">拾獲物品</h5><p>沒有拾獲任何物品。</p></div>`;
    }

    modalBody.innerHTML = bannerHtml + hintHtml + storyHtml + abilityGrowthSectionHtml + valueChangeSectionHtml + itemsSectionHtml;

    const hintElement = modalBody.querySelector('#training-hints-carousel');
    const hintsArray = gameState.uiTextContent?.training_hints || [];
    
    if (gameState.trainingHintInterval) {
        clearInterval(gameState.trainingHintInterval);
        gameState.trainingHintInterval = null;
    }

    if (hintElement && hintsArray.length > 0) {
        const firstRandomIndex = Math.floor(Math.random() * hintsArray.length);
        hintElement.textContent = `💡 ${hintsArray[firstRandomIndex]}`;
        gameState.trainingHintInterval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * hintsArray.length);
            hintElement.textContent = `💡 ${hintsArray[randomIndex]}`;
        }, 2000);
    } else if (hintElement) {
        const hintContainer = hintElement.closest('.training-hints-container');
        if (hintContainer) hintContainer.style.display = 'none';
    }

    const itemsGridContainer = modalBody.querySelector('#training-items-grid');
    if (itemsGridContainer && typeof applyDnaItemStyle === 'function') {
        items.forEach((item, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'dna-item-wrapper';
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dna-item occupied';
            
            applyDnaItemStyle(itemDiv, item);

            const elementType = item.type || '無';
            const elementCssKey = getElementCssClassKey(elementType);
            const rarityKey = item.rarity ? item.rarity.toLowerCase() : 'common';
            const typeSpanClass = `dna-type text-element-${elementCssKey}`;

            itemDiv.innerHTML = `
                <span class="dna-name" style="font-weight: bold; margin-bottom: 4px;">${item.name}</span>
                <span class="${typeSpanClass}">${elementType}屬性</span>
                <span class="dna-rarity text-rarity-${rarityKey}" style="font-weight: bold;">${item.rarity}</span>
                <button class="button primary pickup-btn" data-item-index="${index}" style="padding: 5px 10px; margin-top: 8px;">拾取</button>
            `;
            wrapper.appendChild(itemDiv);
            itemsGridContainer.appendChild(wrapper);
        });
    }

    const toggleBtn = modalBody.querySelector('#toggle-story-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const storyContainer = modalBody.querySelector('#adventure-story-container');
            const isHidden = storyContainer.style.display === 'none';
            storyContainer.style.display = isHidden ? 'block' : 'none';
            toggleBtn.innerHTML = isHidden ? '收合此趟的冒險故事 ▲' : '點此查看此趟的冒險故事 ▼';
        });
    }

    modalBody.querySelectorAll('.pickup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemIndex = parseInt(e.target.dataset.itemIndex, 10);
            if (gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained) {
                const item = gameState.lastCultivationResult.items_obtained[itemIndex];
                if (item) {
                    addDnaToTemporaryBackpack(item);
                    gameState.lastCultivationResult.items_obtained[itemIndex] = null;
                    btn.disabled = true;
                    btn.textContent = "已拾取";
                }
            }
        });
    });
    
    const closeBtn = DOMElements.trainingResultsModal.querySelector('#close-training-results-btn');
    if (closeBtn) {
        closeBtn.onclick = (event) => {
            event.stopPropagation();
            
            const itemsStillLeft = gameState.lastCultivationResult?.items_obtained?.some(item => item !== null);

            if (itemsStillLeft) {
                showModal('reminder-modal');
            } else {
                hideModal('training-results-modal');
            }
        };
    }
    
    showModal('training-results-modal');
}
