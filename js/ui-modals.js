// js/ui-modals.js
// 注意：此檔案依賴 ui.js, gameState.js, game-logic.js 等檔案中的函式與變數。
// 它專門負責生成與更新各種複雜彈窗的內容。

function updatePlayerInfoModal(playerData, gameConfigs) {
    const body = DOMElements.playerInfoModalBody;
    if (!body || !playerData || !playerData.playerStats) {
        if (body) body.innerHTML = '<p>無法載入玩家資訊。</p>';
        return;
    }
    const stats = playerData.playerStats;
    const nickname = playerData.nickname || stats.nickname || "未知玩家";

    let titlesHtml = '<p>尚無稱號</p>';
    const ownedTitles = stats.titles || [];
    const equippedTitleId = stats.equipped_title_id || (ownedTitles.length > 0 ? ownedTitles[0].id : null);

    if (ownedTitles.length > 0) {
        titlesHtml = ownedTitles.map(title => {
            const isEquipped = title.id === equippedTitleId;
            const buttonHtml = isEquipped
                ? `<span class="button success text-xs py-1 px-2" style="cursor: default; min-width: 80px; text-align: center;">✔️ 已裝備</span>`
                : `<button class="button primary text-xs py-1 px-2 equip-title-btn" data-title-id="${title.id}" style="min-width: 80px;">裝備</button>`;

            let buffsHtml = '';
            if (title.buffs && Object.keys(title.buffs).length > 0) {
                const statDisplayName = { hp: 'HP', mp: 'MP', attack: '攻擊', defense: '防禦', speed: '速度', crit: '爆擊率' };
                buffsHtml = '<div class="title-buffs" style="font-size: 0.85em; color: var(--success-color); margin-top: 5px;">效果：';
                buffsHtml += Object.entries(title.buffs).map(([stat, value]) => `${statDisplayName[stat] || stat} +${value}`).join('，');
                buffsHtml += '</div>';
            }

            return `
                <div class="title-entry" style="background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span style="font-weight: bold; font-size: 1.1em; color: ${isEquipped ? 'gold' : 'var(--text-primary)'};">${title.name}</span>
                        ${buttonHtml}
                    </div>
                    <p style="font-size: 0.9em; color: var(--text-secondary); margin: 0;">${title.description || ''}</p>
                    ${buffsHtml}
                </div>
            `;
        }).join('');
    }


    let achievementsHtml = '<p>尚無成就</p>';
    if (stats.achievements && stats.achievements.length > 0) {
        achievementsHtml = `<ul class="list-disc list-inside ml-1 text-sm">${stats.achievements.map(ach => `<li>${ach}</li>`).join('')}</ul>`;
    }

    let ownedMonstersHtml = '<p>尚無怪獸</p>';
    if (playerData.farmedMonsters && playerData.farmedMonsters.length > 0) {
        const monsters = playerData.farmedMonsters;
        const previewLimit = 5;
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

        let previewHtml = monsters.slice(0, previewLimit).map(m => {
            const rarityKey = m.rarity ? (rarityMap[m.rarity] || 'common') : 'common';
            return `<li><a href="#" class="monster-name text-rarity-${rarityKey} player-info-monster-link" data-monster-id="${m.id}" data-owner-uid="${playerData.uid}" style="text-decoration: none;">${m.nickname}</a> <span class="monster-score">評價: ${m.score || 0}</span></li>`;
        }).join('');

        let moreMonstersHtml = '';
        if (monsters.length > previewLimit) {
            moreMonstersHtml = `<div id="more-monsters-list" style="display:none;">${
                monsters.slice(previewLimit).map(m => {
                    const rarityKey = m.rarity ? (rarityMap[m.rarity] || 'common') : 'common';
                    return `<li><a href="#" class="monster-name text-rarity-${rarityKey} player-info-monster-link" data-monster-id="${m.id}" data-owner-uid="${playerData.uid}" style="text-decoration: none;">${m.nickname}</a> <span class="monster-score">評價: ${m.score || 0}</span></li>`;
                }).join('')
            }</div>`;
        }

        ownedMonstersHtml = `<ul class="owned-monsters-list mt-1">${previewHtml}${moreMonstersHtml}</ul>`;

        if (monsters.length > previewLimit) {
            ownedMonstersHtml += `<button id="toggle-monster-list-btn" class="button secondary text-xs w-full mt-2">顯示更多 (${monsters.length - 5}隻)...</button>`;
        }
    }

    const medalsHtml = stats.medals > 0 ? `${'🥇'.repeat(Math.min(stats.medals, 5))} (${stats.medals})` : '無';

    body.innerHTML = `
        <div class="text-center mb-4">
            <h4 class="text-2xl font-bold text-[var(--accent-color)]">${nickname}</h4>
        </div>
        <div class="details-grid">
            <div class="details-section">
                <h5 class="details-section-title">基本統計</h5>
                <div class="details-item"><span class="details-label">等級/排名:</span> <span class="details-value">${stats.rank || 'N/A'}</span></div>
                <div class="details-item"><span class="details-label">總勝場:</span> <span class="details-value text-[var(--success-color)]">${stats.wins || 0}</span></div>
                <div class="details-item"><span class="details-label">總敗場:</span> <span class="details-value text-[var(--danger-color)]">${stats.losses || 0}</span></div>
                <div class="details-item"><span class="details-label">總積分:</span> <span class="details-value">${stats.score || 0}</span></div>
            </div>
            <div class="details-section">
                <h5 class="details-section-title">榮譽與稱號</h5>
                <div class="mb-2">
                    <div id="player-titles-list">${titlesHtml}</div>
                </div>
                <div class="mb-2">
                    <span class="details-label block mb-1">勳章:</span>
                    <span class="details-value medal-emoji">${medalsHtml}</span>
                </div>
                 <div>
                    <span class="details-label block mb-1">已達成成就:</span>
                    ${achievementsHtml}
                </div>
            </div>
        </div>
        <div id="player-monsters-section" class="details-section mt-3">
            <h5 class="details-section-title">持有怪獸 (共 ${playerData.farmedMonsters.length || 0} 隻)</h5>
            ${ownedMonstersHtml}
        </div>
        <p class="creation-time-centered mt-3">上次存檔時間: ${new Date(playerData.lastSave * 1000).toLocaleString()}</p>
    `;

    const toggleBtn = body.querySelector('#toggle-monster-list-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const moreList = body.querySelector('#more-monsters-list');
            const isHidden = moreList.style.display === 'none';
            moreList.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '收合列表' : `顯示更多 (${playerData.farmedMonsters.length - 5}隻)...`;
        });
    }
}

async function viewPlayerInfo(playerId) {
    if (!playerId) return;

    showFeedbackModal('載入中...', `正在獲取玩家資訊...`, true);

    try {
        const playerData = await getPlayerData(playerId);
        if (playerData) {
            playerData.uid = playerId;
            updateGameState({ viewedPlayerData: playerData });
            updatePlayerInfoModal(playerData, gameState.gameConfigs);
            hideModal('feedback-modal');
            showModal('player-info-modal');
        } else {
            throw new Error('找不到該玩家的資料。');
        }
    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('錯誤', `無法載入玩家資訊：${error.message}`);
    }
}


function updateMonsterInfoModal(monster, gameConfigs) {
    if (!DOMElements.monsterInfoModalHeader || !DOMElements.monsterDetailsTabContent || !DOMElements.monsterActivityLogsContainer) {
        console.error("Monster info modal elements not found in DOMElements.");
        return;
    }
    if (!monster || !monster.id) {
        DOMElements.monsterInfoModalHeader.innerHTML = '<h4 class="monster-info-name-styled">無法載入怪獸資訊</h4>';
        DOMElements.monsterDetailsTabContent.innerHTML = '<p>錯誤：找不到怪獸資料。</p>';
        DOMElements.monsterActivityLogsContainer.innerHTML = '<p>無法載入活動紀錄。</p>';
        return;
    }

    DOMElements.monsterInfoModalHeader.dataset.monsterId = monster.id;

    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
    const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
    const rarityColorVar = `var(--rarity-${rarityKey}-text, var(--text-primary))`;
    
    const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
    const defaultElementNickname = gameConfigs.element_nicknames ? (gameConfigs.element_nicknames[primaryElement] || '') : '';
    const editableNickname = monster.custom_element_nickname || defaultElementNickname;

    DOMElements.monsterInfoModalHeader.innerHTML = `
        <div id="monster-nickname-display-container" class="monster-nickname-display-container">
            <h4 class="monster-info-name-styled" style="color: ${rarityColorVar};">
                ${monster.nickname}
            </h4>
            <button id="edit-monster-nickname-btn" class="button secondary" title="編輯名稱">✏️</button>
        </div>
        <div id="monster-nickname-edit-container" class="monster-nickname-edit-container" style="display: none;">
            <input type="text" id="monster-nickname-input" placeholder="輸入5個字以內" value="${editableNickname}" maxlength="5">
            <button id="confirm-nickname-change-btn" class="button success" title="確認">✔️</button>
            <button id="cancel-nickname-change-btn" class="button danger" title="取消">❌</button>
        </div>
    `;

    const detailsBody = DOMElements.monsterDetailsTabContent;

    let titleBuffs = {};
    const monsterOwnerId = monster.owner_id || gameState.playerId;
    if (monsterOwnerId === gameState.playerId && gameState.playerData.playerStats) {
        const stats = gameState.playerData.playerStats;
        const equippedId = stats.equipped_title_id;
        if (equippedId && stats.titles) {
            const equippedTitle = stats.titles.find(t => t.id === equippedId);
            if (equippedTitle && equippedTitle.buffs) {
                titleBuffs = equippedTitle.buffs;
            }
        }
    }

    let resistancesHtml = '<p class="text-sm">無特殊抗性/弱點</p>';
    if (monster.resistances && Object.keys(monster.resistances).length > 0) {
        resistancesHtml = '<ul class="list-disc list-inside text-sm">';
        for (const [element, value] of Object.entries(monster.resistances)) {
            if (value === 0) continue;
            const effect = value > 0 ? '抗性' : '弱點';
            const colorClass = value > 0 ? 'text-[var(--success-color)]' : 'text-[var(--danger-color)]';
            const elClass = typeof element === 'string' ? `text-element-${getElementCssClassKey(element)}` : '';
            resistancesHtml += `<li><span class="capitalize ${elClass}">${element}</span>: <span class="${colorClass}">${Math.abs(value)}% ${effect}</span></li>`;
        }
        resistancesHtml += '</ul>';
    }

    let skillsHtml = '<p class="text-sm">尚無技能</p>';
    const maxSkills = gameConfigs?.value_settings?.max_monster_skills || 3;
    if (monster.skills && monster.skills.length > 0) {
        skillsHtml = monster.skills.map(skill => {
            const skillTypeClass = typeof skill.type === 'string' ? `text-element-${getElementCssClassKey(skill.type)}` : '';
            const description = skill.description || skill.story || '暫無描述';
            const expPercentage = skill.exp_to_next_level > 0 ? (skill.current_exp / skill.exp_to_next_level) * 100 : 0;
            const expBarHtml = `
                <div style="margin-top: 5px;">
                    <div style="background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 1px; max-width: 200px; height: 14px;">
                        <div style="width: ${expPercentage}%; height: 100%; background-color: var(--accent-color); border-radius: 3px;"></div>
                    </div>
                    <p class="text-xs text-[var(--text-secondary)]" style="margin-top: 2px;">經驗: ${skill.current_exp} / ${skill.exp_to_next_level || '-'}</p>
                </div>
            `;
            
            const level = skill.level || 1;
            let powerDisplay = skill.power > 0 ? skill.power : '---';
            if (level > 1 && skill.power > 0) {
                const effectivePower = Math.floor(skill.power * (1 + (level - 1) * 0.08));
                powerDisplay = `${skill.power} <span class="text-[var(--success-color)]" style="font-size:0.9em;">▸ ${effectivePower}</span>`;
            }

            let mpCostDisplay = skill.mp_cost > 0 ? skill.mp_cost : '0';
            if (level > 1 && skill.mp_cost > 0) {
                const effectiveMpCost = Math.max(1, skill.mp_cost - Math.floor((level - 1) / 2));
                mpCostDisplay = `${skill.mp_cost} <span class="text-[var(--danger-color)]" style="font-size:0.9em;">▸ ${effectiveMpCost}</span>`;
            }

            const skillTypeChar = (skill.type || '無').charAt(0);
            const elementBgVar = `var(--element-${getElementCssClassKey(skill.type || '無')}-bg)`;
            const elementTextVar = `var(--element-${getElementCssClassKey(skill.type || '無')}-text)`;
            const attributeBadgeHtml = `<span class="skill-attribute-badge text-element-${getElementCssClassKey(skill.type || '無')}" style="background-color: ${elementBgVar}; color: ${elementTextVar};">${skillTypeChar}</span>`;
            
            const skillNameAndBadgeHtml = `
                <div class="skill-name-container">
                    <a href="#" class="skill-name-link ${skillTypeClass}" data-skill-name="${skill.name}" style="text-decoration: none; color: inherit;">${skill.name} (Lv.${level})</a>
                    ${attributeBadgeHtml}
                </div>`;
            
            let milestonesHtml = '';
            let skillTemplate = null;
            if (gameState.gameConfigs && gameState.gameConfigs.skills) {
                for (const type in gameState.gameConfigs.skills) {
                    const found = gameState.gameConfigs.skills[type].find(s => s.name === skill.name);
                    if (found) {
                        skillTemplate = found;
                        break;
                    }
                }
            }

            if (skillTemplate && skillTemplate.level_milestones) {
                milestonesHtml += `<div class="mt-2" style="font-size: 0.9em; border-top: 1px dashed var(--border-color); padding-top: 5px;">`;
                for (const levelStr in skillTemplate.level_milestones) {
                    const milestoneLevel = parseInt(levelStr, 10);
                    const milestone = skillTemplate.level_milestones[levelStr];
                    const isUnlocked = level >= milestoneLevel;

                    const icon = isUnlocked ? '✔️' : '🔒';
                    const color = isUnlocked ? 'var(--success-color)' : 'var(--text-secondary)';
                    
                    milestonesHtml += `
                        <div style="color: ${color}; margin-top: 3px;">
                            <span style="font-weight: bold;">${icon} Lv.${milestoneLevel}:</span>
                            <span>${milestone.description}</span>
                        </div>
                    `;
                }
                milestonesHtml += `</div>`;
            }
            
            return `
            <div class="skill-entry">
                ${skillNameAndBadgeHtml}
                <p class="skill-details text-xs">威力: ${powerDisplay}, MP: ${mpCostDisplay}, 類別: ${skill.skill_category || '未知'}</p>
                <p class="skill-details text-xs">${description}</p>
                ${skill.current_exp !== undefined ? expBarHtml : ''}
                ${milestonesHtml}
            </div>
        `;
        }).join('');
    }

    const personality = monster.personality || { name: '未知', description: '無' };
    const aiIntroduction = monster.aiIntroduction || 'AI 介紹生成中或失敗...';
    
    const resume = monster.resume || { wins: 0, losses: 0 };
    const challengeInfoHtml = `
        <div class="details-section">
            <h5 class="details-section-title">挑戰資訊</h5>
            <div class="details-item"><span class="details-label">勝場:</span><span class="details-value text-[var(--success-color)]">${resume.wins}</span></div>
            <div class="details-item"><span class="details-label">敗場:</span><span class="details-value text-[var(--danger-color)]">${resume.losses}</span></div>
            <div class="details-item"><span class="details-label">打出最高傷害:</span><span class="details-value">-</span></div>
            <div class="details-item"><span class="details-label">承受最高傷害:</span><span class="details-value">-</span></div>
            <div class="details-item"><span class="details-label">吞噬紀錄:</span><span class="details-value">-</span></div>
        </div>
    `;

    let constituentDnaHtml = '';
    const dnaSlots = new Array(5).fill(null);
    if (monster.constituent_dna_ids && gameState.gameConfigs?.dna_fragments) {
        monster.constituent_dna_ids.forEach((id, i) => {
            if (i < 5) {
                dnaSlots[i] = gameState.gameConfigs.dna_fragments.find(d => d.id === id) || null;
            }
        });
    }
    
    // 【已修改】這裡的邏輯被更新，以符合新的單一區塊、垂直排列方式
    const dnaItemsHtml = dnaSlots.map(dna => {
        if (dna) {
            const rarityKey = (dna.rarity || 'common').toLowerCase().replace('普通','common').replace('稀有','rare').replace('菁英','elite').replace('傳奇','legendary').replace('神話','mythical');
            const elementCssKey = getElementCssClassKey(dna.type || '無');
            const elementChar = (dna.type || '無').charAt(0);
            
            // 手動組合樣式以符合新設計
            const boxStyle = `
                background-color: var(--element-${elementCssKey}-bg);
                border: 1px solid var(--element-${elementCssKey}-text);
                display: flex;
                flex-direction: column;
                justify-content: space-around;
                text-align: center;
            `;

            const nameStyle = `
                color: var(--rarity-${rarityKey}-text);
                font-weight: bold;
                flex-grow: 1;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const charStyle = `
                color: var(--element-${elementCssKey}-text);
                font-weight: bold;
                line-height: 1;
            `;

            return `
                <div class="dna-item occupied" data-dna-ref-id="${dna.id}" style="${boxStyle}">
                    <span class="dna-name-text" style="${nameStyle}">${dna.name}</span>
                    <span class="dna-attribute-char" style="${charStyle}">${elementChar}</span>
                </div>`;
        } else {
            // 空白格子的樣式維持不變
            return `<div class="dna-item empty"><span>無</span></div>`;
        }
    }).join('');


    constituentDnaHtml = `
        <div class="details-section">
            <h5 class="details-section-title">怪獸DNA組成</h5>
            <div class="inventory-grid" style="grid-template-columns: repeat(5, 1fr); gap: 0.5rem;">
                ${dnaItemsHtml}
            </div>
        </div>
    `;

    const gains = monster.cultivation_gains || {};
    const getGainHtml = (statName) => {
        const gain = gains[statName] || 0;
        if (gain > 0) {
            return ` <span style="color: var(--success-color); font-size: 0.9em; margin-left: 4px;">+${gain}</span>`;
        }
        return '';
    };

    const getTitleBuffHtml = (statName) => {
        const buff = titleBuffs[statName] || 0;
        if (buff > 0) {
            return ` <span style="color: var(--danger-color); font-size: 0.9em; margin-left: 4px;">+${buff}</span>`;
        }
        return '';
    };

    detailsBody.innerHTML = `
        <div class="details-grid-rearranged">
            <div class="details-column-left" style="display: flex; flex-direction: column;">
                <div class="details-section" style="margin-bottom: 0.5rem;">
                    <h5 class="details-section-title">基礎屬性</h5>
                    <div class="details-item"><span class="details-label">稀有度:</span> <span class="details-value text-rarity-${rarityKey}">${monster.rarity}</span></div>
                    <div class="details-item"><span class="details-label">HP:</span> <span class="details-value">${monster.hp}/${monster.initial_max_hp}${getGainHtml('hp')}${getTitleBuffHtml('hp')}</span></div>
                    <div class="details-item"><span class="details-label">MP:</span> <span class="details-value">${monster.mp}/${monster.initial_max_mp}${getGainHtml('mp')}${getTitleBuffHtml('mp')}</span></div>
                    <div class="details-item"><span class="details-label">攻擊:</span> <span class="details-value">${monster.attack}${getGainHtml('attack')}${getTitleBuffHtml('attack')}</span></div>
                    <div class="details-item"><span class="details-label">防禦:</span> <span class="details-value">${monster.defense}${getGainHtml('defense')}${getTitleBuffHtml('defense')}</span></div>
                    <div class="details-item"><span class="details-label">速度:</span> <span class="details-value">${monster.speed}${getGainHtml('speed')}${getTitleBuffHtml('speed')}</span></div>
                    <div class="details-item"><span class="details-label">爆擊率:</span> <span class="details-value">${monster.crit}%${getGainHtml('crit')}${getTitleBuffHtml('crit')}</span></div>
                    <div class="details-item"><span class="details-label">總評價:</span> <span class="details-value text-[var(--success-color)]">${monster.score || 0}</span></div>
                </div>
                ${constituentDnaHtml}
            </div>

            <div class="details-column-right">
                ${challengeInfoHtml}
                <div class="details-section">
                    <h5 class="details-section-title">元素抗性</h5>
                    ${resistancesHtml}
                </div>
                <div class="details-section">
                    <h5 class="details-section-title">技能列表 (最多 ${maxSkills} 個)</h5>
                    ${skillsHtml}
                </div>
            </div>
        </div>

        <div class="details-section mt-3">
            <h5 class="details-section-title">個性說明</h5>
            <p class="ai-generated-text text-sm" style="line-height: 1.6;">
                <strong style="color: ${personality.colorDark || 'var(--accent-color)'};">${personality.name || '未知'}:</strong><br>
                ${personality.description || '暫無個性說明。'}
            </p>
        </div>
        <div class="details-section mt-3">
            <h5 class="details-section-title">生物調查紀錄</h5>
            <p class="ai-generated-text text-sm">${aiIntroduction}</p>
        </div>
        <p class="creation-time-centered">創建時間: ${new Date(monster.creationTime * 1000).toLocaleString()}</p>
    `;

    // 【修改】由於我們手動處理了樣式，不再需要對這些特定項目呼叫 applyDnaItemStyle
    // detailsBody.querySelectorAll('.dna-item[data-dna-ref-id]').forEach(el => {
    //     const dnaId = el.dataset.dnaRefId;
    //     const dnaTemplate = gameState.gameConfigs?.dna_fragments.find(d => d.id === dnaId);
    //     if (dnaTemplate) {
    //         applyDnaItemStyle(el, dnaTemplate);
    //     }
    // });

    const logsContainer = DOMElements.monsterActivityLogsContainer;
    if (monster.activityLog && monster.activityLog.length > 0) {
        logsContainer.innerHTML = monster.activityLog.map(log =>
            `<div class="log-entry"><span class="log-time">${log.time}</span> <span class="log-message">${log.message}</span></div>`
        ).join('');
    } else {
        logsContainer.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">尚無活動紀錄。</p>';
    }

    if (DOMElements.monsterInfoTabs) {
        const firstTabButton = DOMElements.monsterInfoTabs.querySelector('.tab-button[data-tab-target="monster-details-tab"]');
        if (firstTabButton) {
            switchTabContent('monster-details-tab', firstTabButton, 'monster-info-modal');
        }
    }
}


function updateNewbieGuideModal(guideEntries, searchTerm = '') {
    const container = DOMElements.newbieGuideContentArea;
    if (!container) return;
    container.innerHTML = '';

    const filteredEntries = guideEntries.filter(entry =>
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredEntries.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)]">找不到符合 "${searchTerm}" 的指南內容。</p>`;
        return;
    }

    filteredEntries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('mb-4', 'pb-3', 'border-b', 'border-[var(--border-color)]');
        entryDiv.innerHTML = `
            <h5 class="text-lg font-semibold text-[var(--accent-color)] mb-1">${entry.title}</h5>
            <p class="text-sm leading-relaxed">${entry.content.replace(/\n/g, '<br>')}</p>
        `;
        container.appendChild(entryDiv);
    });
}

function updateFriendsSearchResults(players) {
    const container = DOMElements.friendsSearchResultsArea;
    if (!container) return;

    if (!players || players.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-2">找不到符合條件的玩家。</p>`;
        return;
    }

    container.innerHTML = players.map(player => {
        const isFriend = gameState.playerData.friends?.some(f => f.uid === player.uid);
        const isSelf = player.uid === gameState.playerId;
        let buttonHtml;

        if (isSelf) {
            buttonHtml = `<button class="button secondary text-xs" disabled>這是您</button>`;
        } else if (isFriend) {
            buttonHtml = `<button class="button secondary text-xs" disabled>已是好友</button>`;
        } else {
            buttonHtml = `<button class="button primary text-xs" onclick="handleAddFriend('${player.uid}', '${player.nickname}')">加為好友</button>`;
        }

        return `
            <div class="friend-item">
                <span class="friend-name">${player.nickname}</span>
                <div class="friend-actions">
                    <button class="button secondary text-xs" onclick="viewPlayerInfo('${player.uid}')">查看資訊</button>
                    ${buttonHtml}
                </div>
            </div>
        `;
    }).join('');
}


function setupLeaderboardTableHeaders(tableId, headersConfig) {
    const table = document.getElementById(tableId);
    if (!table) return;
    let thead = table.querySelector('thead');
    if (!thead) {
        thead = document.createElement('thead');
        table.appendChild(thead);
    }
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');
    headersConfig.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.text;
        th.dataset.sortKey = header.key;
        if(header.align) th.style.textAlign = header.align;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    let tbody = table.querySelector('tbody');
    if (!tbody) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
    }
    tbody.innerHTML = '';
}

function updateLeaderboardTable(tableType, data) {
    console.log("updateLeaderboardTable called with data:", data);
    const tableId = tableType === 'monster' ? 'monster-leaderboard-table' : 'player-leaderboard-table';
    const table = document.getElementById(tableId);
    if (!table) {
        console.error("Leaderboard table element not found:", tableId);
        return;
    }

    let headersConfig;
    if (tableType === 'monster') {
        headersConfig = [
            { text: '排名', key: 'rank', align: 'center' },
            { text: '怪獸暱稱', key: 'nickname' },
            { text: '元素', key: 'elements', align: 'center' },
            { text: '稀有度', key: 'rarity', align: 'center' },
            { text: '總評價', key: 'score', align: 'center' },
            { text: '勝/敗', key: 'resume', align: 'center' },
            { text: '擁有者', key: 'owner_nickname' },
            { text: '操作', key: 'actions', align: 'center' }
        ];
    } else { // player
        headersConfig = [
            { text: '排名', key: 'rank', align: 'center' },
            { text: '玩家暱稱', key: 'nickname' },
            { text: '總積分', key: 'score', align: 'center' },
            { text: '勝場', key: 'wins', align: 'center' },
            { text: '敗場', key: 'losses', align: 'center' },
            { text: '稱號', key: 'titles' }
        ];
    }
    setupLeaderboardTableHeaders(tableId, headersConfig);

    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        const colSpan = headersConfig.length;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-3 text-[var(--text-secondary)]">排行榜無資料。</td></tr>`;
        return;
    }
    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

    data.forEach((item, index) => {
        const row = tbody.insertRow();
        row.dataset.monsterId = item.id; 

        if (tableType === 'monster') {
            const isTraining = item.farmStatus?.isTraining || false;
            const isBattling = item.farmStatus?.isBattling || false;

            const rankCell = row.insertCell();
            rankCell.textContent = index + 1;
            rankCell.style.textAlign = 'center';

            const nicknameCell = row.insertCell();
            const rarityKey = item.rarity ? (rarityMap[item.rarity] || 'common') : 'common';
            
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'leaderboard-monster-link';
            link.classList.add(`text-rarity-${rarityKey}`);
            link.style.textDecoration = 'none';
            link.textContent = item.nickname;
            nicknameCell.appendChild(link);


            const elementsCell = row.insertCell();
            elementsCell.style.textAlign = 'center';
            if(item.elements && Array.isArray(item.elements)) {
                elementsCell.innerHTML = item.elements.map(el =>
                    `<span class="text-xs text-element-${getElementCssClassKey(el)} font-bold mr-2">${el}</span>`
                ).join('');
            }

            const rarityCell = row.insertCell();
            rarityCell.textContent = item.rarity;
            rarityCell.className = `text-rarity-${rarityKey}`;
            rarityCell.style.textAlign = 'center';

            const scoreCell = row.insertCell();
            scoreCell.textContent = item.score;
            scoreCell.style.textAlign = 'center';
            scoreCell.style.color = 'var(--success-color)';

            const resumeCell = row.insertCell();
            resumeCell.textContent = `${item.resume?.wins || 0} / ${item.resume?.losses || 0}`;
            resumeCell.style.textAlign = 'center';

            const ownerCell = row.insertCell();
            ownerCell.textContent = item.owner_nickname || 'N/A';
            if (item.owner_id === gameState.playerId) {
                ownerCell.style.fontWeight = 'bold';
                ownerCell.style.color = 'var(--accent-color)';
            }

            const actionsCell = row.insertCell();
            actionsCell.style.textAlign = 'center';
            const actionButton = document.createElement('button');
            actionButton.className = 'button primary text-xs py-1 px-2';

            if (item.owner_id === gameState.playerId) {
                actionButton.textContent = '我的怪獸';
                actionButton.disabled = true;
                actionButton.style.cursor = 'not-allowed';
                actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                actionButton.style.color = 'var(--text-secondary)';
            } else {
                if (item.hp / item.initial_max_hp < 0.25) {
                    actionButton.textContent = '瀕死';
                    actionButton.disabled = true;
                    actionButton.style.cursor = 'not-allowed';
                    actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                    actionButton.style.color = 'var(--danger-color)';
                    actionButton.style.fontWeight = 'bold';
                } else if (isTraining || isBattling) {
                    actionButton.textContent = '忙碌中';
                    actionButton.disabled = true;
                    actionButton.style.cursor = 'not-allowed';
                    actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                    actionButton.style.color = 'var(--text-secondary)';
                } else {
                    actionButton.textContent = '挑戰';
                    actionButton.onclick = (e) => handleChallengeMonsterClick(e, item.id, item.owner_id, null, item.owner_nickname);
                }
            }
            actionsCell.appendChild(actionButton);

        } else { // Player Leaderboard
            const rankCell = row.insertCell();
            rankCell.textContent = index + 1;
            rankCell.style.textAlign = 'center';

            row.insertCell().textContent = item.nickname;

            const scoreCell = row.insertCell();
            scoreCell.textContent = item.score;
            scoreCell.style.textAlign = 'center';
            scoreCell.style.color = 'var(--success-color)';

            const winsCell = row.insertCell();
            winsCell.textContent = item.wins;
            winsCell.style.textAlign = 'center';

            const lossesCell = row.insertCell();
            lossesCell.textContent = item.losses;
            lossesCell.style.textAlign = 'center';

            const titlesCell = row.insertCell();
            titlesCell.textContent = item.titles && item.titles.length > 0 ? item.titles.join(', ') : '無';
        }
    });
    updateLeaderboardSortHeader(table, gameState.leaderboardSortConfig[tableType]?.key, gameState.leaderboardSortConfig[tableType]?.order);
}

function updateLeaderboardSortHeader(table, sortKey, order) {
    if (!table) return;
    const headers = table.querySelectorAll('thead th');
    headers.forEach(th => {
        const arrow = th.querySelector('.sort-arrow');
        if (arrow) arrow.remove();

        if (th.dataset.sortKey === sortKey) {
            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'sort-arrow active';
            arrowSpan.textContent = order === 'asc' ? ' ▲' : ' ▼';
            th.appendChild(arrowSpan);
        }
    });
}

function updateMonsterLeaderboardElementTabs(elements) {
    const container = DOMElements.monsterLeaderboardElementTabs;
    if (!container) return;
    container.innerHTML = ''; 

    elements.forEach(element => {
        const tab = document.createElement('button');
        tab.className = 'button tab-button leaderboard-element-tab';
        tab.dataset.elementFilter = element;

        if (element === 'all') {
            tab.textContent = '全部';
            tab.classList.add('active'); 
        } else {
            tab.textContent = element;
            const cssClassKey = getElementCssClassKey(element);
            tab.classList.add(`text-element-${cssClassKey}`);
        }
        container.appendChild(tab);
    });
}

function showBattleLogModal(battleResult) {
    if (!DOMElements.battleLogArea || !DOMElements.battleLogModal) {
        console.error("Battle log modal elements not found in DOMElements.");
        return;
    }

    DOMElements.battleLogArea.innerHTML = ''; 

    const battleReportContent = battleResult.ai_battle_report_content;

    if (!battleReportContent) {
        DOMElements.battleLogArea.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">戰報資料結構錯誤，無法顯示。</p>';
        showModal('battle-log-modal');
        return;
    }

    const playerMonsterData = getSelectedMonster();
    const opponentMonsterData = gameState.battleTargetMonster;
    if (!playerMonsterData || !opponentMonsterData) {
        DOMElements.battleLogArea.innerHTML = '<p>遺失戰鬥怪獸資料，無法呈現戰報。</p>';
        showModal('battle-log-modal');
        return;
    }

    function formatBasicText(text) {
        if (!text) return '';
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
    
    const skillLevelColors = {
        1: 'var(--text-secondary)', 2: 'var(--text-secondary)', 3: 'var(--text-primary)',
        4: 'var(--text-primary)', 5: 'var(--accent-color)', 6: 'var(--accent-color)',
        7: 'var(--success-color)', 8: 'var(--success-color)', 9: 'var(--rarity-legendary-text)',
        10: 'var(--rarity-mythical-text)'
    };
    const rarityColors = {
        '普通': 'var(--rarity-common-text)', '稀有': 'var(--rarity-rare-text)',
        '菁英': 'var(--rarity-elite-text)', '傳奇': 'var(--rarity-legendary-text)',
        '神話': 'var(--rarity-mythical-text)'
    };

    function applyDynamicStylingToBattleReport(text, playerMon, opponentMon) {
        if (!text) return '(內容為空)';
        let styledText = text;
        const applyMonNameColor = (monData) => {
            if (monData && monData.nickname && monData.rarity) {
                const monColor = rarityColors[monData.rarity] || 'var(--text-primary)';
                styledText = styledText.replace(new RegExp(`(?![^<]*>)(?<!<span[^>]*?>|<strong>)(${monData.nickname})(?!<\\/span>|<\\/strong>)`, 'g'), `<span style="color: ${monColor}; font-weight: bold;">$1</span>`);
            }
        };
        if (playerMon) applyMonNameColor(playerMon);
        if (opponentMon) applyMonNameColor(opponentMon);

        const allSkills = [];
        if (playerMon && playerMon.skills) allSkills.push(...playerMon.skills);
        if (opponentMon && opponentMon.skills) allSkills.push(...opponentMon.skills);
        const uniqueSkillNames = new Set(allSkills.map(s => s.name));
        uniqueSkillNames.forEach(skillName => {
            const skillInfo = allSkills.find(s => s.name === skillName);
            if (skillInfo && skillInfo.level !== undefined) {
                const color = skillLevelColors[skillInfo.level] || skillLevelColors[1];
                const regex = new RegExp(`(?![^<]*>)(?<!<a[^>]*?>)(?<!<span[^>]*?>|<strong>)(${skillName})(?!<\\/a>|<\\/span>|<\\/strong>)`, 'g');
                styledText = styledText.replace(regex, `<a href="#" class="skill-name-link" data-skill-name="${skillName}" style="color: ${color}; font-weight: bold; text-decoration: none;">$1</a>`);
            }
        });

        styledText = styledText.replace(/<damage>(.*?)<\/damage>/g, '<span class="battle-damage-value">-$1</span>');
        styledText = styledText.replace(/<heal>(.*?)<\/heal>/g, '<span class="battle-heal-value">+$1</span>');

        return styledText;
    }

    const reportContainer = document.createElement('div');
    reportContainer.classList.add('battle-report-container');

    const battleHeaderBanner = document.createElement('div');
    battleHeaderBanner.classList.add('battle-header-banner');
    battleHeaderBanner.innerHTML = `<img src="https://github.com/msw2004727/MD/blob/main/images/PK002.png?raw=true" alt="戰鬥記錄橫幅">`;
    const modalContent = DOMElements.battleLogModal.querySelector('.modal-content');
    if (modalContent) {
        const existingBanner = modalContent.querySelector('.battle-header-banner');
        if (existingBanner) existingBanner.remove();
        modalContent.insertBefore(battleHeaderBanner, modalContent.firstChild);
    }

    const renderMonsterStats = (monster, isPlayer) => {
        if (!monster) return '<div>對手資料錯誤</div>';
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        const personalityName = monster.personality?.name?.replace('的', '') || '未知';
        const winRate = monster.resume && (monster.resume.wins + monster.resume.losses > 0)
            ? ((monster.resume.wins / (monster.resume.wins + monster.resume.losses)) * 100).toFixed(1)
            : 'N/A';
        const prefix = isPlayer ? '⚔️ ' : '🛡️ ';
        const nicknameSpan = `<span class="monster-name">${prefix}${monster.nickname}</span>`;

        return `
            <div class="monster-stats-card text-rarity-${rarityKey}">
                ${nicknameSpan}
                <p class="monster-personality">個性: ${personalityName}</p>
                <div class="stats-grid">
                    <span>HP: ${monster.initial_max_hp}</span>
                    <span>攻擊: ${monster.attack}</span>
                    <span>防禦: ${monster.defense}</span>
                    <span>速度: ${monster.speed}</span>
                    <span>爆擊: ${monster.crit}%</span>
                    <span>勝率: ${winRate}%</span>
                </div>
            </div>
        `;
    };

    reportContainer.innerHTML += `
        <div class="report-section battle-intro-section">
            <h4 class="report-section-title">戰鬥對陣</h4>
            <div class="monster-vs-grid">
                <div class="player-side">${renderMonsterStats(playerMonsterData, true)}</div>
                <div class="vs-divider">VS</div>
                <div class="opponent-side">${renderMonsterStats(opponentMonsterData, false)}</div>
            </div>
        </div>
    `;

    const battleDescriptionContentDiv = document.createElement('div');
    battleDescriptionContentDiv.classList.add('battle-description-content');

    const createStatusBar = (label, value, max, color) => {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        return `
            <div class="status-bar-container">
                <span class="status-bar-label">${label}</span>
                <div class="status-bar-background">
                    <div class="status-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                </div>
                <span class="status-bar-value">${value} / ${max}</span>
            </div>
        `;
    };
    
    const rawLog = battleResult.raw_full_log || [];
    const battleTurns = [];
    let currentTurn = null;

    rawLog.forEach(line => {
        if (line.startsWith('--- 回合')) {
            if (currentTurn) battleTurns.push(currentTurn);
            currentTurn = { header: line, playerStatus: {}, opponentStatus: {}, actions: [] };
        } else if (line.startsWith('PlayerHP:')) {
            const [current, max] = line.split(':')[1].split('/');
            if (currentTurn) currentTurn.playerStatus.hp = { current: parseInt(current), max: parseInt(max) };
        } else if (line.startsWith('PlayerMP:')) {
            const [current, max] = line.split(':')[1].split('/');
            if (currentTurn) currentTurn.playerStatus.mp = { current: parseInt(current), max: parseInt(max) };
        } else if (line.startsWith('OpponentHP:')) {
            const [current, max] = line.split(':')[1].split('/');
            if (currentTurn) currentTurn.opponentStatus.hp = { current: parseInt(current), max: parseInt(max) };
        } else if (line.startsWith('OpponentMP:')) {
            const [current, max] = line.split(':')[1].split('/');
            if (currentTurn) currentTurn.opponentStatus.mp = { current: parseInt(current), max: parseInt(max) };
        } else if (line.startsWith('- ')) {
            if (currentTurn) currentTurn.actions.push(line.substring(2));
        } else if (!line.startsWith('--- 戰鬥結束 ---') && !line.startsWith('PlayerName:') && !line.startsWith('OpponentName:')) {
            if (currentTurn) currentTurn.actions.push(line);
        }
    });
    if (currentTurn) battleTurns.push(currentTurn);

    battleTurns.forEach(turn => {
        const turnHeaderDiv = document.createElement('div');
        turnHeaderDiv.className = 'turn-divider-line';
        turnHeaderDiv.textContent = turn.header;
        battleDescriptionContentDiv.appendChild(turnHeaderDiv);

        const statusBlockDiv = document.createElement('div');
        statusBlockDiv.className = 'turn-status-block';

        let statusHtml = '';
        const playerRarityKey = playerMonsterData.rarity ? (rarityColors[playerMonsterData.rarity] ? playerMonsterData.rarity.toLowerCase() : 'common') : 'common';
        const opponentRarityKey = opponentMonsterData.rarity ? (rarityColors[opponentMonsterData.rarity] ? opponentMonsterData.rarity.toLowerCase() : 'common') : 'common';

        if (turn.playerStatus.hp && turn.playerStatus.mp) {
            statusHtml += `
                <div class="font-bold text-rarity-${playerRarityKey}">⚔️ ${playerMonsterData.nickname}</div>
                ${createStatusBar('HP', turn.playerStatus.hp.current, turn.playerStatus.hp.max, 'var(--success-color)')}
                ${createStatusBar('MP', turn.playerStatus.mp.current, turn.playerStatus.mp.max, 'var(--accent-color)')}
            `;
        }
        if (turn.opponentStatus.hp && turn.opponentStatus.mp) {
             statusHtml += `
                <div class="font-bold mt-2 text-rarity-${opponentRarityKey}">🛡️ ${opponentMonsterData.nickname}</div>
                ${createStatusBar('HP', turn.opponentStatus.hp.current, turn.opponentStatus.hp.max, 'var(--success-color)')}
                ${createStatusBar('MP', turn.opponentStatus.mp.current, turn.opponentStatus.mp.max, 'var(--accent-color)')}
             `;
        }
        statusBlockDiv.innerHTML = statusHtml;
        battleDescriptionContentDiv.appendChild(statusBlockDiv);

        turn.actions.forEach(action => {
            const p = document.createElement('p');
            p.innerHTML = applyDynamicStylingToBattleReport(action, playerMonsterData, opponentMonsterData);
            battleDescriptionContentDiv.appendChild(p);
        });
    });

    const descriptionSection = document.createElement('div');
    descriptionSection.className = 'report-section battle-description-section';
    descriptionSection.innerHTML = `<h4 class="report-section-title">精彩交戰</h4>`;
    descriptionSection.appendChild(battleDescriptionContentDiv);
    reportContainer.appendChild(descriptionSection);
    
    let resultBannerHtml = '';
    if (battleResult.winner_id === playerMonsterData.id) {
        resultBannerHtml = `<h1 class="battle-result-win">勝</h1>`;
    } else if (battleResult.winner_id === '平手') {
        resultBannerHtml = `<h1 class="battle-result-draw">合</h1>`;
    } else {
        resultBannerHtml = `<h1 class="battle-result-loss">敗</h1>`;
    }

    reportContainer.innerHTML += `
        <div class="report-section battle-result-banner">
            ${resultBannerHtml}
        </div>
        <div class="report-section battle-summary-section">
            <h4 class="report-section-title">戰報總結</h4>
            <p class="battle-summary-text">${formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.battle_summary, playerMonsterData, opponentMonsterData))}</p>
        </div>`;

    const highlights = battleResult.battle_highlights || [];
    if (highlights.length > 0) {
        let highlightsHtml = highlights.map((item, index) => 
            `<li class="highlight-item" ${index >= 3 ? 'style="display:none;"' : ''}>${item}</li>`
        ).join('');
        
        let showMoreBtnHtml = '';
        if (highlights.length > 3) {
            showMoreBtnHtml = `<button id="toggle-highlights-btn" class="button secondary text-xs w-full mt-2">顯示更多...</button>`;
        }

        reportContainer.innerHTML += `
            <div class="report-section battle-highlights-section">
                <h4 class="report-section-title">戰鬥亮點</h4>
                <ul id="battle-highlights-list">${highlightsHtml}</ul>
                ${showMoreBtnHtml}
            </div>`;
    }

    reportContainer.innerHTML += `
        <div class="report-section battle-outcome-section">
            <h4 class="report-section-title">戰鬥結果細項</h4>
            <p class="loot-info-text">${formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.loot_info, playerMonsterData, opponentMonsterData))}</p>
            <p class="growth-info-text">${formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.growth_info, playerMonsterData, opponentMonsterData))}</p>
        </div>`;

    DOMElements.battleLogArea.appendChild(reportContainer);

    const toggleBtn = DOMElements.battleLogArea.querySelector('#toggle-highlights-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const list = DOMElements.battleLogArea.querySelector('#battle-highlights-list');
            const isExpanded = toggleBtn.textContent === '收合列表';
            list.querySelectorAll('.highlight-item').forEach((item, index) => {
                if (index >= 3) {
                    item.style.display = isExpanded ? 'none' : 'list-item';
                }
            });
            toggleBtn.textContent = isExpanded ? `顯示更多...` : '收合列表';
        });
    }

    DOMElements.battleLogArea.scrollTop = 0;
    showModal('battle-log-modal');
}


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

            itemDiv.innerHTML = `
                <span class="dna-name">${dna.name}</span>
                <span class="dna-type">${dna.type}屬性</span>
                <span class="dna-rarity text-rarity-${dna.rarity.toLowerCase()}">${dna.rarity}</span>
                <button class="add-drawn-dna-to-backpack-btn button primary text-xs mt-2" data-dna-index="${index}">加入背包</button>
            `;
            grid.appendChild(itemDiv);
        });
    }
    showModal('dna-draw-modal');
}

function updateTrainingResultsModal(results, monsterName) {
    if (!DOMElements.trainingResultsModal) return;

    DOMElements.trainingResultsModalTitle.textContent = `${monsterName} 的修煉成果`;
    const modalBody = DOMElements.trainingResultsModal.querySelector('.modal-body');

    // -- 重構開始 --
    
    // 樣式定義，用於分隔線
    const dividerStyle = `
        border: none;
        height: 1px;
        background-color: var(--border-color);
        margin: 1.5rem 0;
    `;
    
    // 1. 橫幅和提示
    const bannerHtml = `
        <div class="training-banner" style="text-align: center; margin-bottom: 1rem;">
            <img src="https://github.com/msw2004727/MD/blob/main/images/BN005.png?raw=true" alt="修煉成果橫幅" style="max-width: 100%; border-radius: 6px;">
        </div>
    `;

    let hintHtml = '';
    if (TRAINING_GAME_HINTS.length > 0) {
        const randomIndex = Math.floor(Math.random() * TRAINING_GAME_HINTS.length);
        hintHtml = `
            <div class="training-hints-container" style="margin-bottom: 1rem; padding: 0.5rem; background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; text-align: center; font-style: italic; color: var(--text-secondary);">
                <p>${TRAINING_GAME_HINTS[randomIndex]}</p>
            </div>
        `;
    }

    // 2. 冒險故事
    let storyHtml = '';
    const storyContent = (results.adventure_story || "").replace(/\n/g, '<br>');
    if (storyContent) {
        storyHtml = `
            <div class="training-section">
                <h5 class="details-section-title" style="border: none; padding-bottom: 0;">冒險故事</h5>
                <div id="adventure-story-container" style="display: none; padding: 10px 5px; border-left: 3px solid var(--border-color); margin-top: 10px; font-size: 0.9rem;">
                    <p>${storyContent}</p>
                </div>
                <a href="#" id="toggle-story-btn" style="display: block; text-align: center; margin-top: 8px; color: var(--accent-color); cursor: pointer; text-decoration: underline;">點此查看此趟的冒險故事 ▼</a>
            </div>
            <hr style="${dividerStyle}">
        `;
    }

    // 3. 能力成長
    const statGrowthLogs = results.skill_updates_log.filter(log => log.startsWith("💪"));
    let statGrowthHtml = '<ul>';
    if (statGrowthLogs.length > 0) {
        statGrowthLogs.forEach(log => {
            let cleanLog = log.substring(log.indexOf(' ') + 1); // 移除 emoji 和前面的空格
            // 將 "提升" 替換為紅色箭頭
            cleanLog = cleanLog.replace('提升', '<span style="color: var(--danger-color); font-weight: bold;">▲</span>');
            statGrowthHtml += `<li>${cleanLog}</li>`;
        });
    } else {
        statGrowthHtml += "<li>基礎數值無變化。</li>";
    }
    statGrowthHtml += "</ul>";
    
    const skillAndNewSkillLogs = results.skill_updates_log.filter(log => log.startsWith("🎉") || log.startsWith("🌟"));
    let skillGrowthHtml = '<ul>';
    if (skillAndNewSkillLogs.length > 0) {
        skillAndNewSkillLogs.forEach(log => {
            let cleanLog = log.substring(log.indexOf(' ') + 1); // 移除 emoji
            const updatedLog = cleanLog.replace(/'(.+?)'/g, (match, skillName) => {
                return `'<a href="#" class="skill-name-link" data-skill-name="${skillName}" style="text-decoration: none; color: inherit;">${skillName}</a>'`;
            });
            skillGrowthHtml += `<li>${updatedLog}</li>`;
        });
    } else {
        skillGrowthHtml += "<li>技能無變化。</li>";
    }
    skillGrowthHtml += "</ul>";

    const growthSectionHtml = `
        <div class="training-section">
            <h5 class="details-section-title" style="border: none; padding-bottom: 0;">能力成長</h5>
            <div class="training-result-subsection mt-2">
                ${skillGrowthHtml}
            </div>
            <div class="training-result-subsection mt-3">
                <h6 style="font-weight: 600; font-size: 0.95rem;">數值變化</h6>
                ${statGrowthHtml}
            </div>
        </div>
        <hr style="${dividerStyle}">
    `;

    // 4. 拾獲物品
    let itemsSectionHtml = '';
    const items = results.items_obtained || [];
    if (items.length > 0) {
        const itemsGridHtml = `
            <div class="inventory-grid mt-2">
                ${items.map((item, index) => {
                    const rarityKey = item.rarity ? item.rarity.toLowerCase() : 'common';
                    return `
                        <div class="dna-item-wrapper">
                            <div class="dna-item occupied">
                                <span class="dna-name" style="font-weight: bold; margin-bottom: 4px;">${item.name}</span>
                                <span class="dna-type text-rarity-${rarityKey}">${item.type}屬性</span>
                                <span class="dna-rarity text-rarity-${rarityKey}" style="font-weight: bold;">${item.rarity}</span>
                                <button class="button primary pickup-btn" data-item-index="${index}" style="padding: 5px 10px; margin-top: 8px;">拾取</button>
                            </div>
                        </div>`;
                }).join('')}
            </div>`;
        
        itemsSectionHtml = `
            <div class="training-section">
                <h5 class="details-section-title" style="border: none; padding-bottom: 0;">拾獲物品</h5>
                ${itemsGridHtml}
                <button id="add-all-to-temp-backpack-btn" class="button primary w-full mt-3">全部拾取</button>
            </div>
        `;
    } else {
        itemsSectionHtml = `
            <div class="training-section">
                <h5 class="details-section-title" style="border: none; padding-bottom: 0;">拾獲物品</h5>
                <p>沒有拾獲任何物品。</p>
            </div>
        `;
    }

    // 5. 組合並渲染到 modal-body
    modalBody.innerHTML = bannerHtml + hintHtml + storyHtml + growthSectionHtml + itemsSectionHtml;

    // 6. 重新綁定事件監聽器
    // 冒險故事開關
    const toggleBtn = modalBody.querySelector('#toggle-story-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const storyContainer = modalBody.querySelector('#adventure-story-container');
            const isHidden = storyContainer.style.display === 'none';
            storyContainer.style.display = isHidden ? 'block' : 'none';
            toggleBtn.innerHTML = isHidden ? '收合冒ential冒險故事 ▲' : '點此查看此趟的冒險故事 ▼';
        });
    }

    // 單個拾取按鈕
    modalBody.querySelectorAll('.pickup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemIndex = parseInt(e.target.dataset.itemIndex, 10);
            const item = items[itemIndex];
            if (item) {
                addDnaToTemporaryBackpack(item);
                btn.disabled = true;
                btn.textContent = "已拾取";
            }
        });
    });

    // 全部拾取按鈕
    const addAllBtn = modalBody.querySelector('#add-all-to-temp-backpack-btn');
    if (addAllBtn) {
        if (items.length === 0) {
            addAllBtn.style.display = 'none';
        }
        addAllBtn.addEventListener('click', () => {
            items.forEach((item, index) => {
                const btn = modalBody.querySelector(`.pickup-btn[data-item-index="${index}"]`);
                if (btn && !btn.disabled) {
                    addDnaToTemporaryBackpack(item);
                    btn.disabled = true;
                    btn.textContent = "已拾取";
                }
            });
        });
    }
    
    // 顯示 Modal
    showModal('training-results-modal');
}


console.log("UI Modals module loaded.");
