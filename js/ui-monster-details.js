// js/ui-monster-details.js
//這個檔案將負責處理與怪獸自身相關的彈窗，如詳細資訊、戰鬥日誌、養成結果等
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
    
    // --- 核心修改處 START ---
    // 使用新的共用函式來取代原本重複的邏輯
    const editableNickname = getMonsterDisplayName(monster, gameState.gameConfigs);
    // --- 核心修改處 END ---

    // 【修改】修正檢查怪獸是否為玩家自己的邏輯
    const isOwnMonster = gameState.playerData.farmedMonsters.some(m => m.id === monster.id);

    DOMElements.monsterInfoModalHeader.innerHTML = `
        <div id="monster-nickname-display-container" class="monster-nickname-display-container">
            <h4 class="monster-info-name-styled" style="color: ${rarityColorVar};">
                ${monster.nickname}
            </h4>
            ${isOwnMonster ? `<button id="edit-monster-nickname-btn" class="button secondary" title="編輯名稱">✏️</button>` : ''}
        </div>
        <div id="monster-nickname-edit-container" class="monster-nickname-edit-container" style="display: none;">
            <input type="text" id="monster-nickname-input" placeholder="輸入5個字以內" value="${editableNickname}" maxlength="5">
            <button id="confirm-nickname-change-btn" class="button success" title="確認">✔️</button>
            <button id="cancel-nickname-change-btn" class="button danger" title="取消">❌</button>
        </div>
    `;

    const detailsBody = DOMElements.monsterDetailsTabContent;

    // ----- BUG 修正邏輯 START -----
    let titleBuffs = {};
    let ownerStats = null;

    // 1. 檢查怪獸是否屬於當前登入的玩家
    if (gameState.playerData && gameState.playerData.farmedMonsters.some(m => m.id === monster.id)) {
        ownerStats = gameState.playerData.playerStats;
    } 
    // 2. 如果不屬於，則檢查是否屬於當前正在查看的另一位玩家
    else if (gameState.viewedPlayerData && gameState.viewedPlayerData.farmedMonsters.some(m => m.id === monster.id)) {
        ownerStats = gameState.viewedPlayerData.playerStats;
    }

    // 3. 如果找到了擁有者，則從該擁有者的資料中獲取稱號加成
    if (ownerStats) {
        const equippedId = ownerStats.equipped_title_id;
        if (equippedId && ownerStats.titles) {
            const equippedTitle = ownerStats.titles.find(t => t.id === equippedId);
            if (equippedTitle && equippedTitle.buffs) {
                titleBuffs = equippedTitle.buffs;
            }
        }
    }
    // ----- BUG 修正邏輯 END -----

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
            const description = skill.description || skill.story || '暫無描述。';
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
            
            const skillRarity = skill.rarity || '普通';
            const skillRarityKey = rarityMap[skillRarity] || 'common';
            const skillRarityClass = `text-rarity-${skillRarityKey}`;

            const skillNameAndBadgeHtml = `
                <div class="skill-name-container">
                    <a href="#" class="skill-name-link ${skillRarityClass}" data-skill-name="${skill.name}" style="text-decoration: none;">${skill.name} (Lv.${level})</a>
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

    const dnaSlots = new Array(5).fill(null);
    if (monster.constituent_dna_ids && gameState.gameConfigs?.dna_fragments) {
        monster.constituent_dna_ids.forEach((id, i) => {
            if (i < 5) {
                dnaSlots[i] = gameState.gameConfigs.dna_fragments.find(d => d.id.trim() === id.trim()) || null;
            }
        });
    }

    const dnaItemsHtml = dnaSlots.map(dna => {
        if (dna) {
            const elementCssKey = getElementCssClassKey(dna.type || '無');
            const elementChar = (dna.type || '無').charAt(0);
            const rarityKey = dna.rarity ? (rarityMap[dna.rarity] || 'common') : 'common';
            const rarityColorVar = `var(--rarity-${rarityKey}-text, var(--text-primary))`;
            const elementBgVarName = `var(--element-${elementCssKey}-bg, var(--bg-slot))`;
            const itemStyle = `background-color: ${elementBgVarName}; color: ${rarityColorVar}; border-color: ${rarityColorVar};`;
            
            return `
                <div class="dna-composition-item-wrapper">
                    <div class="dna-item occupied" style="${itemStyle}" data-dna-ref-id="${dna.id}">
                        <span class="dna-name-text">${dna.name}</span>
                    </div>
                    <div class="dna-attribute-box text-element-${elementCssKey}">
                        ${elementChar}
                    </div>
                </div>`;
        } else {
            return `
                <div class="dna-composition-item-wrapper">
                    <div class="dna-item empty">
                        <span class="dna-name-text">無</span>
                    </div>
                    <div class="dna-attribute-box empty">
                        -
                    </div>
                </div>`;
        }
    }).join('');

    const constituentDnaHtml = `
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

    const interactionStats = monster.interaction_stats || {};
    const battleCount = (monster.resume?.wins || 0) + (monster.resume?.losses || 0);
    const bondPoints = interactionStats.bond_points || 0;
    const bondPercentage = ((bondPoints + 100) / 200) * 100;

    const interactionHtml = `
        <div class="details-section">
            <h5 class="details-section-title">怪獸互動</h5>
            <div class="details-item"><span class="details-label">聊天次數：</span><span class="details-value">${interactionStats.chat_count || 0}</span></div>
            <div class="details-item"><span class="details-label">修煉次數：</span><span class="details-value">${interactionStats.cultivation_count || 0}</span></div>
            <div class="details-item"><span class="details-label">對戰次數：</span><span class="details-value">${battleCount}</span></div>
            <div class="details-item"><span class="details-label">接觸次數：</span><span class="details-value">${interactionStats.touch_count || 0}</span></div>
            <div class="details-item"><span class="details-label">治療次數：</span><span class="details-value">${interactionStats.heal_count || 0}</span></div>
            <div class="details-item"><span class="details-label">瀕死次數：</span><span class="details-value">${interactionStats.near_death_count || 0}</span></div>
            <div class="details-item"><span class="details-label">餵食次數：</span><span class="details-value">${interactionStats.feed_count || 0}</span></div>
            <div class="details-item"><span class="details-label">收禮次數：</span><span class="details-value">${interactionStats.gift_count || 0}</span></div>
            
            <div class="bond-bar-container">
                 <div class="bond-bar-labels">
                     <span>厭惡</span>
                     <span>冷漠</span>
                     <span>熱情</span>
                 </div>
                 <div class="bond-bar">
                     <div class="bond-bar-marker" style="left: ${bondPercentage}%;"></div>
                 </div>
            </div>
        </div>
    `;

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
                ${interactionHtml}
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

    const logsContainer = DOMElements.monsterActivityLogsContainer;
    if (monster.activityLog && monster.activityLog.length > 0) {
        logsContainer.innerHTML = monster.activityLog.map(log =>
            `<div class="log-entry"><span class="log-time">${log.time}</span> <span class="log-message">${log.message}</span></div>`
        ).join('');
    } else {
        logsContainer.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">尚無活動紀錄。</p>';
    }

    if (DOMElements.monsterInfoTabs) {
        const notesTab = DOMElements.monsterInfoTabs.querySelector('[data-tab-target="monster-notes-tab"]');
        if (notesTab) notesTab.style.display = isOwnMonster ? 'block' : 'none';
        
        const chatTab = DOMElements.monsterInfoTabs.querySelector('[data-tab-target="monster-chat-tab"]');
        if (chatTab) chatTab.style.display = isOwnMonster ? 'block' : 'none';

        const firstTabButton = DOMElements.monsterInfoTabs.querySelector('.tab-button[data-tab-target="monster-details-tab"]');
        if (!isOwnMonster && firstTabButton) {
            switchTabContent('monster-details-tab', firstTabButton, 'monster-info-modal');
        }
    }


    const displayContainer = DOMElements.monsterInfoModalHeader.querySelector('#monster-nickname-display-container');
    const editContainer = DOMElements.monsterInfoModalHeader.querySelector('#monster-nickname-edit-container');
    const editBtn = DOMElements.monsterInfoModalHeader.querySelector('#edit-monster-nickname-btn');
    const confirmBtn = DOMElements.monsterInfoModalHeader.querySelector('#confirm-nickname-change-btn');
    const cancelBtn = DOMElements.monsterInfoModalHeader.querySelector('#cancel-nickname-change-btn');
    const nicknameInput = DOMElements.monsterInfoModalHeader.querySelector('#monster-nickname-input');

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (displayContainer) displayContainer.style.display = 'none';
            if (editContainer) editContainer.style.display = 'flex';
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (displayContainer) displayContainer.style.display = 'flex';
            if (editContainer) editContainer.style.display = 'none';
        });
    }

    if (confirmBtn && nicknameInput) {
        confirmBtn.addEventListener('click', async () => {
            const monsterId = DOMElements.monsterInfoModalHeader.dataset.monsterId;
            const newNickname = nicknameInput.value.trim();
            const maxLen = nicknameInput.maxLength || 5;

            if (newNickname.length > maxLen) {
                showFeedbackModal('錯誤', `暱稱不能超過 ${maxLen} 個字。`);
                return;
            }
            
            confirmBtn.disabled = true;
            showFeedbackModal('更新中...', '正在更新怪獸的屬性代表名...', true);

            try {
                const result = await updateMonsterCustomNickname(monsterId, newNickname);
                if (result && result.success) {
                    await refreshPlayerData(); 
                    const updatedMonster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
                    if (updatedMonster) {
                        updateMonsterInfoModal(updatedMonster, gameState.gameConfigs);
                    }
                    hideModal('feedback-modal');
                    showFeedbackModal('成功', '怪獸屬性代表名已更新！');
                } else {
                    throw new Error(result.error || '更新失敗');
                }
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('錯誤', `更新暱稱失敗：${error.message}`);
                confirmBtn.disabled = false;
                if (displayContainer) displayContainer.style.display = 'flex';
                if (editContainer) editContainer.style.display = 'none';
            }
        });
    }
}
