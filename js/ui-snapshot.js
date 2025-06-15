// js/ui-snapshot.js
// 這個檔案專門處理主畫面上方「怪獸快照」面板的渲染與更新。

function getMonsterImagePathForSnapshot(primaryElement, rarity) {
    const colors = {
        '火': 'FF6347/FFFFFF', '水': '1E90FF/FFFFFF', '木': '228B22/FFFFFF',
        '金': 'FFD700/000000', '土': 'D2B48C/000000', '光': 'F8F8FF/000000',
        '暗': 'A9A9A9/FFFFFF', '毒': '9932CC/FFFFFF', '風': '87CEEB/000000',
        '混': '778899/FFFFFF', '無': 'D3D3D3/000000'
    };
    const colorPair = colors[primaryElement] || colors['無'];
    return `https://placehold.co/120x90/${colorPair}?text=${encodeURIComponent(primaryElement)}&font=noto-sans-tc`;
}

function getMonsterPartImagePath(partName, dnaType, dnaRarity) {
    // 確保 monsterPartAssets 已載入
    if (typeof monsterPartAssets === 'undefined') {
        console.warn('monsterPartAssets 未載入，無法獲取部位圖片路徑。');
        return null;
    }

    const partData = monsterPartAssets[partName];
    if (!partData) {
        console.warn(`未找到部位 '${partName}' 的圖片配置。`);
        return monsterPartAssets.globalDefault; // 使用全局預設圖
    }

    // 優先匹配精確的屬性+稀有度
    if (partData[dnaType] && partData[dnaType][dnaRarity]) {
        return partData[dnaType][dnaRarity];
    }
    // 次之匹配屬性預設 (如果有的話)
    if (partData[dnaType] && partData[dnaType].default) {
        return partData[dnaType].default;
    }
    // 再次之匹配部位預設
    if (partData.default) {
        return partData.default;
    }

    return monsterPartAssets.globalDefault; // 最終使用全局預設圖
}


function clearMonsterBodyPartsDisplay() {
    const partsMap = {
        Head: DOMElements.monsterPartHead,
        LeftArm: DOMElements.monsterPartLeftArm,
        RightArm: DOMElements.monsterPartRightArm,
        LeftLeg: DOMElements.monsterPartLeftLeg,
        RightLeg: DOMElements.monsterPartRightLeg,
    };
    for (const partName in partsMap) {
        const partElement = partsMap[partName];
        if (partElement) {
            partElement.classList.add('empty-part');
            const imgElement = partElement.querySelector('.monster-part-image');
            if (imgElement) {
                imgElement.src = '';
                imgElement.classList.remove('active');
            }
        }
    }
    if (DOMElements.monsterPartsContainer) DOMElements.monsterPartsContainer.classList.add('empty-snapshot');
}

function updateMonsterSnapshot(monster) {
    if (!DOMElements.monsterSnapshotArea || !DOMElements.snapshotNickname || !DOMElements.snapshotWinLoss ||
        !DOMElements.snapshotEvaluation || !DOMElements.monsterSnapshotBodySilhouette || !DOMElements.monsterPartsContainer ||
        !DOMElements.snapshotBarsContainer || !DOMElements.snapshotHpFill || !DOMElements.snapshotMpFill) {
        console.error("一個或多個怪獸快照相關的 DOM 元素未找到。");
        return;
    }

    const existingMonsterBtn = DOMElements.monsterSnapshotArea.querySelector('#snapshot-monster-details-btn');
    if (existingMonsterBtn) {
        existingMonsterBtn.remove();
    }
    const existingPlayerBtn = DOMElements.monsterSnapshotArea.querySelector('#snapshot-player-details-btn');
    if (existingPlayerBtn) {
        existingPlayerBtn.remove();
    }
    const existingGuideBtn = DOMElements.monsterSnapshotArea.querySelector('#snapshot-guide-btn');
    if (existingGuideBtn) {
        existingGuideBtn.remove();
    }

    const playerBtn = document.createElement('button');
    playerBtn.id = 'snapshot-player-details-btn';
    playerBtn.title = '查看玩家資訊';
    playerBtn.innerHTML = '📑';
    playerBtn.classList.add('corner-button');
    playerBtn.style.position = 'absolute';
    playerBtn.style.bottom = '8px';
    playerBtn.style.left = '8px';
    playerBtn.style.width = '32px';
    playerBtn.style.height = '32px';
    playerBtn.style.fontSize = '0.9rem';
    playerBtn.style.zIndex = '5';
    playerBtn.onclick = () => {
        if (gameState.playerData && typeof updatePlayerInfoModal === 'function') {
            updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
            showModal('player-info-modal');
        }
    };
    DOMElements.monsterSnapshotArea.appendChild(playerBtn);

    const guideBtn = document.createElement('button');
    guideBtn.id = 'snapshot-guide-btn';
    guideBtn.title = '新手上路';
    guideBtn.innerHTML = '🔰';
    guideBtn.classList.add('corner-button');
    guideBtn.style.position = 'absolute';
    guideBtn.style.bottom = '44px';
    guideBtn.style.left = '8px';
    guideBtn.style.width = '32px';
    guideBtn.style.height = '32px';
    guideBtn.style.fontSize = '0.9rem';
    guideBtn.style.zIndex = '5';
    guideBtn.onclick = () => {
        if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
            updateNewbieGuideModal(gameState.gameConfigs.newbie_guide);
            if(DOMElements.newbieGuideSearchInput) DOMElements.newbieGuideSearchInput.value = '';
            showModal('newbie-guide-modal');
        } else {
            showFeedbackModal('錯誤', '新手指南尚未載入。');
        }
    };
    DOMElements.monsterSnapshotArea.appendChild(guideBtn);


    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

    clearMonsterBodyPartsDisplay();

    if (monster && monster.id) {
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block';

        const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
        const elementNickname = monster.custom_element_nickname || 
                                (gameState.gameConfigs?.element_nicknames?.[primaryElement] || primaryElement);
        const achievement = monster.title || '新秀';
        
        DOMElements.snapshotNickname.textContent = elementNickname;
        DOMElements.snapshotNickname.className = `text-rarity-${rarityKey}`;
        DOMElements.snapshotAchievementTitle.textContent = achievement;

        const dnaSlots = new Array(5).fill(null);
        if (monster.constituent_dna_ids && gameState.gameConfigs?.dna_fragments) {
            monster.constituent_dna_ids.forEach((id, i) => {
                if (i < 5) {
                    dnaSlots[i] = gameState.gameConfigs.dna_fragments.find(d => d.id === id) || null;
                }
            });
        }
        
        const partsMap = {
            Head: DOMElements.monsterPartHead,
            LeftArm: DOMElements.monsterPartLeftArm,
            RightArm: DOMElements.monsterPartRightArm,
            LeftLeg: DOMElements.monsterPartLeftLeg,
            RightLeg: DOMElements.monsterPartRightLeg,
        };

        Object.keys(gameState.dnaSlotToBodyPartMapping).forEach(slotIndex => {
            const partKey = gameState.dnaSlotToBodyPartMapping[slotIndex]; 
            const capitalizedPartKey = partKey.charAt(0).toUpperCase() + partKey.slice(1);
            const partElement = partsMap[capitalizedPartKey];
            const dnaData = dnaSlots[slotIndex];

            if (partElement) {
                const imgElement = partElement.querySelector('.monster-part-image');
                
                if (dnaData && imgElement) {
                    const imgPath = getMonsterPartImagePath(partKey, dnaData.type, dnaData.rarity);
                    imgElement.src = imgPath || '';
                    if (imgPath) {
                        imgElement.classList.add('active');
                    } else {
                        imgElement.classList.remove('active');
                    }
                    partElement.classList.remove('empty-part');
                } else if (imgElement) {
                    imgElement.src = '';
                    imgElement.classList.remove('active');
                    partElement.classList.add('empty-part');
                }
            }
        });
        if (DOMElements.monsterPartsContainer) {
            DOMElements.monsterPartsContainer.classList.remove('empty-snapshot');
        }

        DOMElements.snapshotEvaluation.textContent = `評價: ${monster.score || 0}`;
        DOMElements.snapshotEvaluation.style.color = 'var(--success-color)';

        const resume = monster.resume || { wins: 0, losses: 0 };
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: ${resume.wins}</span><span>敗: ${resume.losses}</span>`;

        toggleElementDisplay(DOMElements.snapshotBarsContainer, true, 'flex');
        const hpPercent = monster.initial_max_hp > 0 ? (monster.hp / monster.initial_max_hp) * 100 : 0;
        const mpPercent = monster.initial_max_mp > 0 ? (monster.mp / monster.initial_max_mp) * 100 : 0;
        DOMElements.snapshotHpFill.style.width = `${hpPercent}%`;
        DOMElements.snapshotMpFill.style.width = `${mpPercent}%`;
        
        const rarityColorVar = `var(--rarity-${rarityKey}-text, var(--text-secondary))`;
        DOMElements.monsterSnapshotArea.style.borderColor = rarityColorVar;
        DOMElements.monsterSnapshotArea.style.boxShadow = `0 0 10px -2px ${rarityColorVar}, inset 0 0 15px -5px color-mix(in srgb, ${rarityColorVar} 30%, transparent)`;
        gameState.selectedMonsterId = monster.id;

        const monsterBtn = document.createElement('button');
        monsterBtn.id = 'snapshot-monster-details-btn';
        monsterBtn.title = '查看怪獸詳細資訊';
        monsterBtn.innerHTML = '📜';
        
        monsterBtn.classList.add('corner-button');
        monsterBtn.style.position = 'absolute';
        monsterBtn.style.bottom = '8px';
        monsterBtn.style.left = '44px';
        monsterBtn.style.width = '32px';
        monsterBtn.style.height = '32px';
        monsterBtn.style.fontSize = '0.9rem';
        monsterBtn.style.zIndex = '5';

        monsterBtn.onclick = () => {
            if (monster && typeof updateMonsterInfoModal === 'function') {
                updateMonsterInfoModal(monster, gameState.gameConfigs);
                showModal('monster-info-modal');
            }
        };

        DOMElements.monsterSnapshotArea.appendChild(monsterBtn);

    } else {
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'none';
        DOMElements.snapshotNickname.textContent = '尚無怪獸';
        DOMElements.snapshotNickname.className = '';
        DOMElements.snapshotAchievementTitle.textContent = '稱號';
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: -</span><span>敗: -</span>`;
        DOMElements.snapshotEvaluation.textContent = `評價: -`;
        toggleElementDisplay(DOMElements.snapshotBarsContainer, false);
        DOMElements.monsterSnapshotArea.style.borderColor = 'var(--border-color)';
        DOMElements.monsterSnapshotArea.style.boxShadow = 'none';
        gameState.selectedMonsterId = null;
    }
}
