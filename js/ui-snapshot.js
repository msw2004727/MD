// js/ui-snapshot.js
// 這個檔案專門處理主畫面上方「怪獸快照」面板的渲染與更新。

function updateMailNotificationDot() {
    const dot = document.getElementById('mail-notification-dot');
    if (!dot) return;

    const hasUnread = gameState.playerData?.mailbox?.some(mail => !mail.is_read);
    dot.style.display = hasUnread ? 'block' : 'none';
}


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
    if (typeof monsterPartAssets === 'undefined') {
        return null;
    }

    const partData = monsterPartAssets[partName];
    if (!partData) {
        return monsterPartAssets.globalDefault; 
    }

    if (partData[dnaType] && partData[dnaType][dnaRarity]) {
        return partData[dnaType][dnaRarity];
    }
    if (partData[dnaType] && partData[dnaType].default) {
        return partData[dnaType].default;
    }
    if (partData.default) {
        return partData.default;
    }

    return monsterPartAssets.globalDefault; 
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
                imgElement.style.display = 'none';
                imgElement.src = '';
                imgElement.classList.remove('active');
            }

            const overlayElement = partElement.querySelector('.monster-part-overlay');
            if(overlayElement) {
                overlayElement.style.display = 'none';
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
    if (existingMonsterBtn) existingMonsterBtn.remove();
    
    const existingPlayerBtn = DOMElements.monsterSnapshotArea.querySelector('#snapshot-player-details-btn');
    if (existingPlayerBtn) existingPlayerBtn.remove();
    
    const existingGuideBtn = DOMElements.monsterSnapshotArea.querySelector('#snapshot-guide-btn');
    if (existingGuideBtn) existingGuideBtn.remove();
    
    const existingLeaderboardBtn = DOMElements.monsterSnapshotArea.querySelector('#snapshot-combined-leaderboard-btn');
    if (existingLeaderboardBtn) existingLeaderboardBtn.remove();
    const existingSelectionBtn = DOMElements.monsterSnapshotArea.querySelector('#snapshot-selection-modal-btn');
    if (existingSelectionBtn) existingSelectionBtn.remove();
    const existingMailBtn = DOMElements.monsterSnapshotArea.querySelector('#snapshot-mail-btn');
    if(existingMailBtn) existingMailBtn.remove();


    // 玩家資訊按鈕 (第2個)
    const playerBtn = document.createElement('button');
    playerBtn.id = 'snapshot-player-details-btn';
    playerBtn.title = '查看玩家資訊';
    playerBtn.innerHTML = '📑';
    playerBtn.classList.add('corner-button');
    playerBtn.style.position = 'absolute';
    playerBtn.style.bottom = '44px'; 
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

    const mailBtn = document.createElement('button');
    mailBtn.id = 'snapshot-mail-btn';
    mailBtn.title = '信箱';
    mailBtn.innerHTML = '✉️<span id="mail-notification-dot" class="notification-dot"></span>';
    mailBtn.classList.add('corner-button');
    mailBtn.style.position = 'absolute';
    mailBtn.style.bottom = '44px';
    mailBtn.style.right = '8px';
    mailBtn.style.width = '32px';
    mailBtn.style.height = '32px';
    mailBtn.style.fontSize = '0.9rem';
    mailBtn.style.zIndex = '5';
    DOMElements.monsterSnapshotArea.appendChild(mailBtn);

    // 新手上路按鈕 (第3個)
    const guideBtn = document.createElement('button');
    guideBtn.id = 'snapshot-guide-btn';
    guideBtn.title = '新手上路';
    guideBtn.innerHTML = '🔰';
    guideBtn.classList.add('corner-button');
    guideBtn.style.position = 'absolute';
    guideBtn.style.bottom = '80px'; 
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

    // 綜合選單按鈕 (第4個)
    const selectionBtn = document.createElement('button');
    selectionBtn.id = 'snapshot-selection-modal-btn';
    selectionBtn.title = '綜合選單';
    selectionBtn.innerHTML = '🪜';
    selectionBtn.classList.add('corner-button');
    selectionBtn.style.position = 'absolute';
    selectionBtn.style.bottom = '116px'; 
    selectionBtn.style.left = '8px';
    selectionBtn.style.width = '32px';
    selectionBtn.style.height = '32px';
    selectionBtn.style.fontSize = '0.9rem';
    selectionBtn.style.zIndex = '5';
    DOMElements.monsterSnapshotArea.appendChild(selectionBtn);

    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

    clearMonsterBodyPartsDisplay();

    if (monster && monster.id) {
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block';

        const elementNickname = getMonsterDisplayName(monster, gameState.gameConfigs);
        
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

        const elementTypeMap = {
            '火': 'fire', '水': 'water', '木': 'wood', '金': 'gold', '土': 'earth',
            '光': 'light', '暗': 'dark', '毒': 'poison', '風': 'wind', '混': 'mix', '無': '無'
        };

        Object.keys(gameState.dnaSlotToBodyPartMapping).forEach(slotIndex => {
            const partKey = gameState.dnaSlotToBodyPartMapping[slotIndex]; 
            const capitalizedPartKey = partKey.charAt(0).toUpperCase() + partKey.slice(1);
            const partElement = partsMap[capitalizedPartKey];
            const dnaData = dnaSlots[slotIndex];

            if (partElement) {
                const imgElement = partElement.querySelector('.monster-part-image');
                const overlayElement = partElement.querySelector('.monster-part-overlay');
                const textElement = overlayElement ? overlayElement.querySelector('.dna-name-text') : null;

                if (!imgElement || !overlayElement || !textElement) return;

                imgElement.style.display = 'none';
                imgElement.src = '';
                imgElement.classList.remove('active');
                overlayElement.style.display = 'none';
                partElement.classList.add('empty-part');

                if (dnaData) {
                    partElement.classList.remove('empty-part');
                    
                    const typeKey = dnaData.type ? (elementTypeMap[dnaData.type] || dnaData.type.toLowerCase()) : '無';
                    const dnaRarityKey = dnaData.rarity ? (rarityMap[dnaData.rarity] || dnaData.rarity.toLowerCase()) : 'common';
                    
                    overlayElement.style.display = 'flex';
                    overlayElement.style.backgroundColor = `var(--element-${typeKey}-bg, var(--bg-slot))`;
                    
                    textElement.textContent = dnaData.name || '';
                    textElement.className = 'dna-name-text';
                    textElement.style.color = `var(--rarity-${dnaRarityKey}-text, var(--text-primary))`;

                    let hasExactImage = false;
                    let imgPath = '';

                    if (monsterPartAssets && monsterPartAssets[partKey] && monsterPartAssets[partKey][dnaData.type] && monsterPartAssets[partKey][dnaData.type][dnaData.rarity]) {
                        hasExactImage = true;
                        imgPath = monsterPartAssets[partKey][dnaData.type][dnaData.rarity];
                    }

                    if (hasExactImage) {
                        imgElement.src = imgPath;
                    } else {
                        imgElement.src = 'images/parts/transparent.png';
                    }
                    
                    imgElement.style.display = 'block';
                    imgElement.classList.add('active');
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
        monsterBtn.style.left = '8px';
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

    // --- 核心修改處 START ---
    // 確保在整個快照區塊被完整繪製後，才呼叫紅點更新函式
    if (typeof updateMailNotificationDot === 'function') {
        updateMailNotificationDot();
    }
    // --- 核心修改處 END ---
}
