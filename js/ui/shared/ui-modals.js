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
            return ` <span style="color: var(--success-color); font-weight: bold; font-size: 0.9em; margin-left: 4px;">+${gain}</span>`;
        }
        return '';
    };

    const getTitleBuffHtml = (statName) => {
        const buff = titleBuffs[statName] || 0;
        if (buff > 0) {
            return ` <span style="color: var(--danger-color); font-weight: bold; font-size: 0.9em; margin-left: 4px;">+${buff}</span>`;
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

    detailsBody.querySelectorAll('.dna-item[data-dna-ref-id]').forEach(el => {
        const dnaId = el.dataset.dnaRefId;
        const dnaTemplate = gameState.gameConfigs?.dna_fragments.find(d => d.id === dnaId);
        if (dnaTemplate) {
            applyDnaItemStyle(el, dnaTemplate);
        }
    });

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
    const tableId = tableType === 'monster' ? 'monster-leaderboard-table' : 'player-leaderboard-table';
    const table = document.getElementById(tableId);
    if (!table) return;

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

            // 修改點: 將玩家暱稱從純文字改為可點擊的連結
            const nicknameCell = row.insertCell();
            if (item.uid) { // 確保 uid 存在
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = item.nickname;
                link.style.textDecoration = 'none';
                link.style.color = 'var(--accent-color)';
                link.style.fontWeight = '500';
                link.onclick = (e) => {
                    e.preventDefault();
                    viewPlayerInfo(item.uid);
                };
                nicknameCell.appendChild(link);
            } else {
                nicknameCell.textContent = item.nickname; // 如果沒有 uid，則退回純文字
            }

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
            if (item.titles && item.titles.length > 0) {
                const equippedId = item.equipped_title_id;
                let titleToShow = item.titles[0]; // 預設顯示第一個
                if (equippedId) {
                    const foundTitle = item.titles.find(t => t.id === equippedId);
                    if (foundTitle) {
                        titleToShow = foundTitle;
                    }
                }
                titlesCell.textContent = titleToShow.name || '未知稱號';
            } else {
                titlesCell.textContent = '無';
            }
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

// 新增：更新排行榜頁籤的函式
function updateMonsterLeaderboardElementTabs(elements) {
    const container = DOMElements.monsterLeaderboardElementTabs;
    if (!container) return;
    container.innerHTML = ''; // 清空現有頁籤

    elements.forEach(element => {
        const tab = document.createElement('button');
        tab.className = 'button tab-button leaderboard-element-tab';
        tab.dataset.elementFilter = element;

        if (element === 'all') {
            tab.textContent = '全部';
            tab.classList.add('active'); // 預設選中 "全部"
        } else {
            tab.textContent = element;
            const cssClassKey = getElementCssClassKey(element);
            tab.classList.add(`text-element-${cssClassKey}`);
        }
        container.appendChild(tab);
    });
}

// 調整 showBattleLogModal 函數以顯示新的單頁戰報
function showBattleLogModal(battleResult) {
    if (!DOMElements.battleLogArea || !DOMElements.battleLogModal) {
        console.error("Battle log modal elements not found in DOMElements.");
        return;
    }

    DOMElements.battleLogArea.innerHTML = ''; // 清空舊內容

    const battleReportContent = battleResult.ai_battle_report_content;

    // 修改：即使 battleReportContent 為空，也繼續執行，以便顯示部分內容或錯誤
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

    // 修改：formatBasicText 函數以處理粗體，不再處理數字
    function formatBasicText(text) {
        if (!text) return '';
        // 將 **text** 替換為 <strong>text</strong>
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
        if (!text) return '';
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

        // 處理 <damage> 和 <heal> 標籤
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

    // 戰鬥對陣 (顯示基礎數值、歷史勝率、個性)
    const renderMonsterStats = (monster, isPlayer) => {
        if (!monster) return '<div>對手資料錯誤</div>'; // 防呆
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

    // ===== NEW: Battle Log Parsing Logic Start =====
    const battleDescriptionContentDiv = document.createElement('div');
    battleDescriptionContentDiv.classList.add('battle-description-content');

    const createStatusBar = (label, value, max, color) => {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        // 使用內聯樣式設定顏色，避免修改CSS檔案
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
            const styledActionText = applyDynamicStylingToBattleReport(action, playerMonsterData, opponentMonsterData);
            if (styledActionText.trim() !== '') {
                const p = document.createElement('p');
                p.innerHTML = styledActionText;
                battleDescriptionContentDiv.appendChild(p);
            }
        });
    });

    const descriptionSection = document.createElement('div');
    descriptionSection.className = 'report-section battle-description-section';
    descriptionSection.innerHTML = `<h4 class="report-section-title">精彩交戰</h4>`;
    descriptionSection.appendChild(battleDescriptionContentDiv);
    reportContainer.appendChild(descriptionSection);
    // ===== NEW: Battle Log Parsing Logic End =====
    
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

    // 移除舊的橫幅和提示，並加入新的
    let existingBanner = modalBody.querySelector('.training-banner');
    if (existingBanner) existingBanner.remove();
    let existingHints = modalBody.querySelector('.training-hints-container');
    if (existingHints) existingHints.remove();
    
    const newBanner = document.createElement('div');
    newBanner.className = 'training-banner';
    newBanner.style.textAlign = 'center';
    newBanner.style.marginBottom = '1rem';
    newBanner.innerHTML = `<img src="https://github.com/msw2004727/MD/blob/main/images/BN005.png?raw=true" alt="修煉成果橫幅" style="max-width: 100%; border-radius: 6px;">`;
    modalBody.prepend(newBanner);
    
    // 新增靜態遊戲提示區塊
    const hintsContainer = document.createElement('div');
    hintsContainer.className = 'training-hints-container';
    hintsContainer.style.marginBottom = '1rem';
    hintsContainer.style.padding = '0.5rem';
    hintsContainer.style.backgroundColor = 'var(--bg-primary)';
    hintsContainer.style.border = '1px solid var(--border-color)';
    hintsContainer.style.borderRadius = '6px';
    hintsContainer.style.textAlign = 'center';
    hintsContainer.style.fontStyle = 'italic';
    hintsContainer.style.color = 'var(--text-secondary)';
    
    // 顯示隨機靜態提示
    if (TRAINING_GAME_HINTS.length > 0) {
        const randomIndex = Math.floor(Math.random() * TRAINING_GAME_HINTS.length);
        hintsContainer.innerHTML = `<p id="training-hints-carousel">💡 ${TRAINING_GAME_HINTS[randomIndex]}</p>`;
    } else {
        hintsContainer.innerHTML = `<p id="training-hints-carousel">💡 修煉可以讓怪獸變得更強！</p>`;
    }
    newBanner.insertAdjacentElement('afterend', hintsContainer);

    // --- 修改開始 ---
    // 改為通過更穩定的方式尋找故事區塊
    const growthResultEl = DOMElements.trainingGrowthResult;
    let storySection = null;
    if (growthResultEl && growthResultEl.parentNode) {
        // 假設“成長紀錄”區塊的父元素是 .training-result-section
        const growthSectionWrapper = growthResultEl.parentNode;
        // “冒險故事”區塊是“成長紀錄”區塊的前一個兄弟元素
        if (growthSectionWrapper.previousElementSibling) {
            storySection = growthSectionWrapper.previousElementSibling;
        }
    }
    // 如果找不到，作為後備，嘗試舊方法 (僅在第一次有效)
    if (!storySection) {
        storySection = DOMElements.trainingStoryResult.parentNode;
    }
    // --- 修改結束 ---

    if (storySection) {
        const storyContent = (results.adventure_story || "沒有特別的故事發生。").replace(/\n/g, '<br>');
        // 直接覆蓋整個故事區塊的內部HTML，確保結構每次都重新生成
        storySection.innerHTML = `
            <h5>📜 冒險故事</h5>
            <div id="adventure-story-container" style="display: none; padding: 5px; border-left: 3px solid var(--border-color); margin-top: 5px;">
                <p>${storyContent}</p>
            </div>
            <a href="#" id="toggle-story-btn" style="display: block; text-align: center; margin-top: 8px; color: var(--accent-color); cursor: pointer; text-decoration: underline;">點此查看此趟的冒險故事 ▼</a>
        `;
        
        const toggleBtn = storySection.querySelector('#toggle-story-btn');
        const storyContainer = storySection.querySelector('#adventure-story-container');
        if (toggleBtn && storyContainer) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isHidden = storyContainer.style.display === 'none';
                storyContainer.style.display = isHidden ? 'block' : 'none';
                toggleBtn.innerHTML = isHidden ? '收合冒險故事 ▲' : '點此查看此趟的冒險故事 ▼';
            });
        }
    }

    const statGrowthLogs = results.skill_updates_log.filter(log => log.startsWith("💪"));
    let statGrowthHtml = '<ul>';
    if (statGrowthLogs.length > 0) {
        statGrowthLogs.forEach(log => statGrowthHtml += `<li>${log}</li>`);
    } else {
        statGrowthHtml += "<li>這趟試煉基礎數值沒有提升。</li>";
    }
    statGrowthHtml += "</ul>";

    const skillAndNewSkillLogs = results.skill_updates_log.filter(log => log.startsWith("🎉") || log.startsWith("🌟"));
    let skillGrowthHtml = '<ul>';
    if (skillAndNewSkillLogs.length > 0) {
        skillAndNewSkillLogs.forEach(log => {
            // 使用正則表達式尋找單引號內的技能名稱
            const updatedLog = log.replace(/'(.+?)'/g, (match, skillName) => {
                // 將匹配到的技能名稱轉換為帶有連結的 HTML
                return `'<a href="#" class="skill-name-link" data-skill-name="${skillName}" style="text-decoration: none; color: inherit;">${skillName}</a>'`;
            });
            skillGrowthHtml += `<li>${updatedLog}</li>`;
        });
    } else {
        skillGrowthHtml += "<li>能力沒有明顯變化。</li>";
    }
    skillGrowthHtml += "</ul>";


    DOMElements.trainingGrowthResult.innerHTML = `
        <div class="training-result-subsection">
            ${skillGrowthHtml}
        </div>
        <div class="training-result-subsection mt-3">
            <h5>💪 數值提升</h5>
            ${statGrowthHtml}
        </div>
    `;

    const itemsContainer = DOMElements.trainingItemsResult;
    itemsContainer.innerHTML = ''; 
    toggleElementDisplay(DOMElements.addAllToTempBackpackBtn, false);

    const items = results.items_obtained || [];
    if (items.length > 0) {
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'inventory-grid';
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('dna-draw-result-item');
            applyDnaItemStyle(itemDiv, item);

            itemDiv.innerHTML = `
                <span class="dna-name">${item.name}</span>
                <span class="dna-type">${item.type}屬性</span>
                <span class="dna-rarity text-rarity-${item.rarity.toLowerCase()}">${item.rarity}</span>
                <button class="add-trained-dna-to-backpack-btn button primary text-xs mt-2" data-item-index="${index}">拾取</button>
            `;
            
            const pickupButton = itemDiv.querySelector('.add-trained-dna-to-backpack-btn');
            if (pickupButton) {
                pickupButton.addEventListener('click', function handlePickupClick() {
                    addDnaToTemporaryBackpack(item);

                    const itemIndexInState = gameState.lastCultivationResult.items_obtained.findIndex(i => i.id === item.id);
                    if (itemIndexInState > -1) {
                        gameState.lastCultivationResult.items_obtained.splice(itemIndexInState, 1);
                    }
                    
                    pickupButton.disabled = true;
                    pickupButton.textContent = '已拾取';
                    itemDiv.style.opacity = '0.6';
                }, { once: true });
            }

            itemsGrid.appendChild(itemDiv);
        });
        itemsContainer.appendChild(itemsGrid);
    } else {
        itemsContainer.innerHTML = '<p>沒有拾獲任何物品。</p>';
    }

    showModal('training-results-modal');
}


console.log("UI Modals module loaded.");
