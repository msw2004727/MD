// js/ui-monster-modals.js
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

    const playerDisplayName = getMonsterDisplayName(playerMonsterData, gameState.gameConfigs);
    const opponentDisplayName = getMonsterDisplayName(opponentMonsterData, gameState.gameConfigs);

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

        const replaceName = (fullNickname, shortName, rarity) => {
            const monColor = rarityColors[rarity] || 'var(--text-primary)';
            const searchRegex = new RegExp(fullNickname.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g');
            const replacement = `<span style="color: ${monColor}; font-weight: bold;">${shortName}</span>`;
            styledText = styledText.replace(searchRegex, replacement);
        };

        if (playerMon && playerMon.nickname) {
            replaceName(playerMon.nickname, playerDisplayName, playerMon.rarity);
        }
        if (opponentMon && opponentMon.nickname) {
            replaceName(opponentMon.nickname, opponentDisplayName, opponentMon.rarity);
        }
        
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
    const bannerUrl = gameState.assetPaths?.images?.modals?.battleLogHeader || '';
    battleHeaderBanner.innerHTML = `<img src="${bannerUrl}" alt="戰鬥記錄橫幅">`;
    const modalContent = DOMElements.battleLogModal.querySelector('.modal-content');
    if (modalContent) {
        const existingBanner = modalContent.querySelector('.battle-header-banner');
        if (existingBanner) existingBanner.remove();
        modalContent.insertBefore(battleHeaderBanner, modalContent.firstChild);
    }

    const renderMonsterStats = (monster, displayName, isPlayer) => {
        if (!monster) return '<div>對手資料錯誤</div>';
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        const personalityName = monster.personality?.name?.replace('的', '') || '未知';
        const winRate = monster.resume && (monster.resume.wins + monster.resume.losses > 0)
            ? ((monster.resume.wins / (monster.resume.wins + monster.resume.losses)) * 100).toFixed(1)
            : 'N/A';
        const prefix = isPlayer ? '⚔️ ' : '🛡️ ';
        const nicknameSpan = `<span class="monster-name">${prefix}${displayName}</span>`;

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
            <div class="monster-vs-container">
                <div class="player-side-card">${renderMonsterStats(playerMonsterData, playerDisplayName, true)}</div>
                <div class="opponent-side-card">${renderMonsterStats(opponentMonsterData, opponentDisplayName, false)}</div>
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
                <div class="font-bold text-rarity-${playerRarityKey}">⚔️ ${playerDisplayName}</div>
                ${createStatusBar('HP', turn.playerStatus.hp.current, turn.playerStatus.hp.max, 'var(--success-color)')}
                ${createStatusBar('MP', turn.playerStatus.mp.current, turn.playerStatus.mp.max, 'var(--accent-color)')}
            `;
        }
        if (turn.opponentStatus.hp && turn.opponentStatus.mp) {
             statusHtml += `
                <div class="font-bold mt-2 text-rarity-${opponentRarityKey}">🛡️ ${opponentDisplayName}</div>
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


console.log("UI Modals module loaded.");
