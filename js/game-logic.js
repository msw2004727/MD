// js/game-logic.js

// 注意：此檔案依賴 gameState, DOMElements, API client 函數, UI 更新函數等

/**
 * 將 DNA 從來源（庫存或另一個組合槽）移動到指定的組合槽。
 * @param {string | null} dnaInstanceId 要移動的 DNA 實例 ID (來自庫存) 或 null (如果拖曳的是組合槽本身)。
 * @param {object | null} draggedDnaObject 被拖曳的 DNA 物件 (如果從組合槽拖曳)。
 * @param {'inventory' | 'combination'} source 來源 ('inventory' 或 'combination')。
 * @param {number | null} sourceSlotIndex 如果來源是組合槽，則為其索引。
 * @param {number} targetSlotIndex 目標組合槽的索引。
 */
function moveDnaToCombinationSlot(dnaInstanceId, draggedDnaObject, source, sourceSlotIndex, targetSlotIndex) {
    let dnaToMove = null;

    if (source === 'inventory' && dnaInstanceId) {
        const playerDna = gameState.playerData.playerOwnedDNA.find(d => d.id === dnaInstanceId);
        if (playerDna) {
            dnaToMove = { ...playerDna }; // 從庫存拖曳，創建副本
        }
    } else if (source === 'combination' && draggedDnaObject && sourceSlotIndex !== null) {
        dnaToMove = draggedDnaObject; // 從組合槽拖曳，直接使用物件
        // 清除來源槽的操作將在後面判斷是否成功放置後進行，或在交換時處理
    }

    if (!dnaToMove) {
        console.warn(`moveDnaToCombinationSlot: 無法找到要移動的 DNA。實例ID: ${dnaInstanceId}, 來源: ${source}`);
        renderDNACombinationSlots(); // 保持UI一致
        return;
    }

    // 檢查目標槽位索引的有效性
    if (targetSlotIndex < 0 || targetSlotIndex >= gameState.dnaCombinationSlots.length) {
        console.warn(`moveDnaToCombinationSlot: 無效的目標槽位索引 ${targetSlotIndex}。`);
        // 注意：如果拖曳失敗且是從組合槽拖出，物品會停留在原位（因為還沒清除來源槽）
        renderDNACombinationSlots();
        return;
    }

    // 如果拖曳到自身，不執行任何操作
    if (source === 'combination' && sourceSlotIndex === targetSlotIndex) {
        renderDNACombinationSlots();
        return;
    }

    const itemCurrentlyInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex];

    if (source === 'inventory') {
        // 從庫存拖曳到組合槽 (無論目標槽是否已佔用，都直接覆蓋)
        gameState.dnaCombinationSlots[targetSlotIndex] = dnaToMove;
    } else if (source === 'combination' && sourceSlotIndex !== null) {
        // 從一個組合槽拖曳到另一個組合槽
        if (itemCurrentlyInTargetSlot) {
            // 目標槽已佔用，執行交換
            gameState.dnaCombinationSlots[targetSlotIndex] = dnaToMove;
            gameState.dnaCombinationSlots[sourceSlotIndex] = itemCurrentlyInTargetSlot; // 將原目標槽物品移回來源槽
        } else {
            // 目標槽為空，直接移動
            gameState.dnaCombinationSlots[targetSlotIndex] = dnaToMove;
            gameState.dnaCombinationSlots[sourceSlotIndex] = null; // 清空來源槽
        }
    }

    renderDNACombinationSlots(); // 重新渲染所有組合槽
}


/**
 * 從玩家庫存中刪除指定的 DNA。
 * @param {string} dnaInstanceId 要刪除的 DNA 實例 ID。
 */
function deleteDNAFromInventory(dnaInstanceId) {
    if (gameState.playerData && gameState.playerData.playerOwnedDNA) {
        const initialLength = gameState.playerData.playerOwnedDNA.length;
        gameState.playerData.playerOwnedDNA = gameState.playerData.playerOwnedDNA.filter(dna => dna.id !== dnaInstanceId);
        if (gameState.playerData.playerOwnedDNA.length < initialLength) {
            console.log(`DNA ${dnaInstanceId} 已從 gameState 中移除。`);
        } else {
            console.warn(`嘗試刪除 DNA ${dnaInstanceId}，但在 gameState 中未找到。`);
        }
    }
}

/**
 * 處理玩家點擊農場中怪獸的“修煉”按鈕。
 * @param {Event} event 事件對象。
 * @param {string} monsterId 怪獸 ID。
 */
function handleCultivateMonsterClick(event, monsterId) {
    event.stopPropagation();
    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (!monster) {
        showFeedbackModal('錯誤', '找不到指定的怪獸。');
        return;
    }

    if (monster.farmStatus?.isBattling || monster.farmStatus?.isTraining) {
        showFeedbackModal('提示', `怪獸 ${monster.nickname} 目前正在忙碌中，無法開始新的修煉。`);
        return;
    }

    gameState.cultivationMonsterId = monsterId;
    if (DOMElements.cultivationMonsterNameText) DOMElements.cultivationMonsterNameText.textContent = monster.nickname;
    const maxTime = gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 3600;
    if (DOMElements.maxCultivationTimeText) DOMElements.maxCultivationTimeText.textContent = maxTime;
    showModal('cultivation-setup-modal');
}

/**
 * 處理玩家點擊農場中怪獸的“放生”按鈕。
 * @param {Event} event 事件對象。
 * @param {string} monsterId 怪獸 ID。
 */
async function handleReleaseMonsterClick(event, monsterId) {
    event.stopPropagation();
    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (!monster) {
        showFeedbackModal('錯誤', '找不到指定的怪獸。');
        return;
    }
    if (monster.farmStatus?.isBattling || monster.farmStatus?.isTraining) {
        showFeedbackModal('提示', `怪獸 ${monster.nickname} 目前正在忙碌中，無法放生。`);
        return;
    }

    showConfirmationModal(
        '確認放生',
        `您確定要放生怪獸 "${monster.nickname}" 嗎？放生後，您將根據其構成DNA獲得一些DNA碎片。此操作無法復原。`,
        async () => {
            try {
                showFeedbackModal('處理中...', `正在放生 ${monster.nickname}...`, true);
                const result = await disassembleMonster(monsterId);
                if (result && result.success) {
                    if (result.returned_dna_templates_info && result.returned_dna_templates_info.length > 0) {
                        result.returned_dna_templates_info.forEach(dnaTemplateInfo => {
                            const fullTemplate = gameState.gameConfigs.dna_fragments.find(df => df.name === dnaTemplateInfo.name && df.rarity === dnaTemplateInfo.rarity);
                            if (fullTemplate) {
                                addDnaToTemporaryBackpack(fullTemplate);
                            }
                        });
                         renderTemporaryBackpack();
                    }
                    await refreshPlayerData();
                    showFeedbackModal('放生成功', `${result.message || monster.nickname + " 已成功放生。"} ${result.returned_dna_templates_info && result.returned_dna_templates_info.length > 0 ? '獲得了新的DNA碎片！請查看臨時背包。' : ''}`);
                } else {
                    showFeedbackModal('放生失敗', result.error || '放生怪獸時發生錯誤。');
                }
            } catch (error) {
                showFeedbackModal('放生失敗', `請求錯誤: ${error.message}`);
            }
        },
        'danger',
        '確定放生',
        monster
    );
}

/**
 * 處理完成修煉的邏輯。
 * @param {string} monsterId 怪獸 ID。
 * @param {number} durationSeconds 修煉時長。
 */
async function handleCompleteCultivation(monsterId, durationSeconds) {
    if (!monsterId) return;

    try {
        showFeedbackModal('結算中...', '正在結算修煉成果...', true);
        const result = await completeCultivation(monsterId, durationSeconds);

        if (result && result.success) {
            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            if (monsterInFarm) {
                monsterInFarm.skills = result.updated_monster_skills || monsterInFarm.skills;
                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = false;
                monsterInFarm.farmStatus.trainingStartTime = null;
                monsterInFarm.farmStatus.trainingDuration = null;
            }
            renderMonsterFarm();
            updateMonsterSnapshot(getSelectedMonster() || getDefaultSelectedMonster());

            if (DOMElements.trainingResultsModalTitle) DOMElements.trainingResultsModalTitle.textContent = `${monsterInFarm ? monsterInFarm.nickname : '怪獸'}的修煉成果`;
            if (DOMElements.trainingStoryResult) DOMElements.trainingStoryResult.textContent = result.adventure_story || "沒有特別的故事發生。";

            let growthHtml = "<ul>";
            if (result.skill_updates_log && result.skill_updates_log.length > 0) {
                result.skill_updates_log.forEach(log => growthHtml += `<li>${log}</li>`);
            } else {
                growthHtml += "<li>技能沒有明顯變化。</li>";
            }
            growthHtml += "</ul>";
            if (DOMElements.trainingGrowthResult) DOMElements.trainingGrowthResult.innerHTML = growthHtml;

            let itemsHtml = "<p>沒有拾獲任何物品。</p>";
            gameState.lastCultivationResult = result;
            if (result.items_obtained && result.items_obtained.length > 0) {
                itemsHtml = "<ul>";
                result.items_obtained.forEach(item => {
                    itemsHtml += `<li>拾獲: ${item.name} (${item.rarity} ${item.type}屬性)</li>`;
                });
                itemsHtml += "</ul>";
                if (DOMElements.addAllToTempBackpackBtn) {
                    DOMElements.addAllToTempBackpackBtn.disabled = false;
                    DOMElements.addAllToTempBackpackBtn.textContent = "一鍵全數加入背包";
                }
            } else {
                if (DOMElements.addAllToTempBackpackBtn) {
                    DOMElements.addAllToTempBackpackBtn.disabled = true;
                    DOMElements.addAllToTempBackpackBtn.textContent = "無物品可加入";
                }
            }
            if (DOMElements.trainingItemsResult) DOMElements.trainingItemsResult.innerHTML = itemsHtml;

            hideModal('feedback-modal');
            showModal('training-results-modal');

            if (result.learned_new_skill_template) {
                promptLearnNewSkill(monsterId, result.learned_new_skill_template, monsterInFarm ? monsterInFarm.skills : []);
            }

        } else {
            showFeedbackModal('修煉失敗', result.error || '完成修煉時發生錯誤。');
            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            if (monsterInFarm && monsterInFarm.farmStatus) {
                monsterInFarm.farmStatus.isTraining = false;
            }
            renderMonsterFarm();
        }
    } catch (error) {
        showFeedbackModal('修煉失敗', `請求錯誤: ${error.message}`);
        const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
        if (monsterInFarm && monsterInFarm.farmStatus) {
            monsterInFarm.farmStatus.isTraining = false;
        }
        renderMonsterFarm();
    }
}

/**
 * 提示玩家是否學習新技能。
 * @param {string} monsterId 怪獸ID
 * @param {object} newSkillTemplate 新技能的模板
 * @param {Array<object>} currentSkills 怪獸當前的技能列表
 */
function promptLearnNewSkill(monsterId, newSkillTemplate, currentSkills) {
    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (!monster) return;

    const maxSkills = gameState.gameConfigs.value_settings?.max_monster_skills || 3;
    let message = `${monster.nickname} 領悟了新技能：<strong>${newSkillTemplate.name}</strong> (威力: ${newSkillTemplate.power}, MP: ${newSkillTemplate.mp_cost || 0})！<br>`;

    if (currentSkills.length < maxSkills) {
        message += "是否要學習這個技能？";
        showConfirmationModal(
            '領悟新技能！',
            message,
            async () => {
                try {
                    showFeedbackModal('學習中...', `正在為 ${monster.nickname} 學習新技能...`, true);
                    const result = await replaceMonsterSkill(monsterId, null, newSkillTemplate);
                    if (result && result.success) {
                        await refreshPlayerData();
                        showFeedbackModal('學習成功！', `${monster.nickname} 成功學習了 ${newSkillTemplate.name}！`);
                    } else {
                        showFeedbackModal('學習失敗', result.error || '學習新技能時發生錯誤。');
                    }
                } catch (error) {
                    showFeedbackModal('學習失敗', `請求錯誤: ${error.message}`);
                }
            },
            'success',
            '學習'
        );
    } else {
        message += `但技能槽已滿 (${currentSkills.length}/${maxSkills})。是否要替換一個現有技能來學習它？<br><br>選擇要替換的技能：`;

        let skillOptionsHtml = '<div class="my-2">';
        currentSkills.forEach((skill, index) => {
            skillOptionsHtml += `
                <button class="skill-replace-option-btn secondary text-sm p-1 mr-1 mb-1" data-skill-slot="${index}">
                    替換：${skill.name} (Lv.${skill.level || 1})
                </button>`;
        });
        skillOptionsHtml += '</div>';
        message += skillOptionsHtml;

        showFeedbackModal(
            '領悟新技能 - 技能槽已滿',
            message,
            false,
            null,
            [{ text: '不學習', class: 'secondary', onClick: () => {} }]
        );

        const feedbackModalBody = DOMElements.feedbackModal.querySelector('.modal-body');
        if (feedbackModalBody) {
            feedbackModalBody.querySelectorAll('.skill-replace-option-btn').forEach(button => {
                button.onclick = async () => {
                    const slotToReplace = parseInt(button.dataset.skillSlot, 10);
                    hideModal('feedback-modal');
                    try {
                        showFeedbackModal('替換技能中...', `正在為 ${monster.nickname} 替換技能...`, true);
                        const result = await replaceMonsterSkill(monsterId, slotToReplace, newSkillTemplate);
                        if (result && result.success) {
                            await refreshPlayerData();
                            showFeedbackModal('替換成功！', `${monster.nickname} 成功學習了 ${newSkillTemplate.name}，替換了原技能！`);
                        } else {
                            showFeedbackModal('替換失敗', result.error || '替換技能時發生錯誤。');
                        }
                    } catch (error) {
                        showFeedbackModal('替換失敗', `請求錯誤: ${error.message}`);
                    }
                };
            });
        }
    }
}


/**
 * 將修煉獲得的所有物品加入臨時背包。
 */
function addAllCultivationItemsToTempBackpack() {
    if (gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained) {
        gameState.lastCultivationResult.items_obtained.forEach(itemTemplate => {
            addDnaToTemporaryBackpack(itemTemplate);
        });
        renderTemporaryBackpack();
        gameState.lastCultivationResult.items_obtained = [];
        showFeedbackModal('提示', '所有修煉拾獲物品已加入臨時背包。');
    }
}

/**
 * 將指定的 DNA 模板加入臨時背包。
 * @param {object} dnaTemplate DNA 模板對象。
 */
function addDnaToTemporaryBackpack(dnaTemplate) {
    if (!dnaTemplate || !dnaTemplate.id) return;
    gameState.temporaryBackpack.push({
        type: 'dna',
        data: { ...dnaTemplate },
    });
    renderTemporaryBackpack();
    console.log(`${dnaTemplate.name} 已加入臨時背包。`);
}

/**
 * 清空臨時背包。
 */
function clearTemporaryBackpack() {
    gameState.temporaryBackpack = [];
    renderTemporaryBackpack();
    console.log("臨時背包已清空。");
}

/**
 * 處理從臨時背包移動物品到主 DNA 庫存。
 * @param {number} tempBackpackIndex 物品在臨時背包中的索引。
 */
async function handleMoveFromTempBackpackToInventory(tempBackpackIndex) {
    if (tempBackpackIndex < 0 || tempBackpackIndex >= gameState.temporaryBackpack.length) return;

    const itemToMove = gameState.temporaryBackpack[tempBackpackIndex];
    if (itemToMove.type === 'dna') {
        const newInstanceId = `dna_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const newOwnedDna = {
            ...itemToMove.data,
            id: newInstanceId,
            baseId: itemToMove.data.id
        };
        gameState.playerData.playerOwnedDNA.push(newOwnedDna);
        gameState.temporaryBackpack.splice(tempBackpackIndex, 1);

        renderPlayerDNAInventory();
        renderTemporaryBackpack();

        showFeedbackModal(
            '物品已移動',
            `${itemToMove.data.name} 已移至您的 DNA 庫存。建議盡快保存遊戲進度。`,
            false, null,
            [{ text: '好的', class: 'primary' }]
        );
    } else {
        showFeedbackModal('錯誤', '無法移動未知類型的物品。');
    }
}

/**
 * 處理抽卡按鈕點擊。
 */
async function handleDrawDNAClick() {
    if (!gameState.gameConfigs || !gameState.gameConfigs.dna_fragments) {
        showFeedbackModal('抽卡失敗', '遊戲設定尚未載入，無法進行DNA抽取。');
        return;
    }

    showFeedbackModal('DNA抽取中...', '正在搜尋稀有的DNA序列...', true);

    const numberOfDraws = 1;
    const drawnItems = [];
    const allPossibleDna = gameState.gameConfigs.dna_fragments;

    if (allPossibleDna.length === 0) {
        hideModal('feedback-modal');
        showFeedbackModal('提示', 'DNA池是空的，無法抽取。');
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 700));

    for (let i = 0; i < numberOfDraws; i++) {
        const randomIndex = Math.floor(Math.random() * allPossibleDna.length);
        const drawnTemplate = { ...allPossibleDna[randomIndex] };
        drawnItems.push(drawnTemplate);
    }

    gameState.lastDnaDrawResult = drawnItems;
    hideModal('feedback-modal');
    showDnaDrawModal(drawnItems);
}


/**
 * 根據當前篩選條件過濾並渲染怪獸排行榜。
 */
function filterAndRenderMonsterLeaderboard() {
    if (!gameState.monsterLeaderboard) return;
    let filteredLeaderboard = gameState.monsterLeaderboard.filter(monster => !monster.isNPC);
    if (gameState.currentMonsterLeaderboardElementFilter !== 'all') {
        filteredLeaderboard = filteredLeaderboard.filter(monster =>
            monster.elements && monster.elements.includes(gameState.currentMonsterLeaderboardElementFilter)
        );
    }
    sortAndRenderLeaderboard('monster', filteredLeaderboard);
}

/**
 * 刷新玩家數據 (從後端重新獲取)。
 */
async function refreshPlayerData() {
    if (!gameState.playerId) return;
    try {
        const playerData = await getPlayerData(gameState.playerId);
        if (playerData) {
            updateGameState({ playerData: playerData });
            renderPlayerDNAInventory();
            renderMonsterFarm();
            const currentSelectedMonster = getSelectedMonster() || getDefaultSelectedMonster();
            updateMonsterSnapshot(currentSelectedMonster);
        }
    } catch (error) {
        showFeedbackModal('同步失敗', `無法更新玩家資料: ${error.message}`);
    }
}

/**
 * 處理挑戰按鈕點擊。
 * @param {Event} event - 點擊事件。
 * @param {string} [monsterIdToChallenge=null] - 如果是從農場或排行榜挑戰特定怪獸，傳入其ID。
 * @param {string} [ownerId=null] - 如果挑戰的是其他玩家的怪獸，傳入擁有者ID。
 * @param {string} [npcId=null] - 如果挑戰的是NPC，傳入NPC ID。
 */
async function handleChallengeMonsterClick(event, monsterIdToChallenge = null, ownerId = null, npcId = null) {
    event.stopPropagation();

    const playerMonsterId = gameState.selectedMonsterId;
    if (!playerMonsterId) {
        showFeedbackModal('提示', '請先從您的農場選擇一隻出戰怪獸！');
        return;
    }

    const playerMonster = getSelectedMonster();
    if (!playerMonster) {
        showFeedbackModal('錯誤', '找不到您選擇的出戰怪獸資料。');
        return;
    }
    if (playerMonster.farmStatus?.isTraining || playerMonster.farmStatus?.isBattling) {
         showFeedbackModal('提示', `${playerMonster.nickname} 目前正在忙碌中，無法出戰。`);
        return;
    }

    let opponentMonster = null;

    try {
        showFeedbackModal('準備戰鬥...', '正在獲取對手資訊...', true);
        if (npcId) {
            showFeedbackModal('提示', 'NPC挑戰功能已調整。');
            hideModal('feedback-modal');
            return;

        } else if (monsterIdToChallenge && ownerId && ownerId !== gameState.playerId) {
            const opponentPlayerData = await getPlayerData(ownerId);
            if (!opponentPlayerData || !opponentPlayerData.farmedMonsters) throw new Error('無法獲取對手玩家資料。');
            opponentMonster = opponentPlayerData.farmedMonsters.find(m => m.id === monsterIdToChallenge);
            if (!opponentMonster) throw new Error(`找不到對手玩家的怪獸ID ${monsterIdToChallenge}。`);
        } else {
            if (monsterIdToChallenge && (!ownerId || ownerId === gameState.playerId)) {
                 showFeedbackModal('提示', '您不能挑戰自己農場中的怪獸（除非是透過排行榜挑戰其他玩家的怪獸）。請選擇出戰怪獸後，從排行榜選擇對手。');
                 hideModal('feedback-modal');
                 return;
            }
            throw new Error('請從排行榜選擇挑戰對手。');
        }
        hideModal('feedback-modal');

        if (!opponentMonster) {
            showFeedbackModal('錯誤', '未能找到合適的挑戰對手。');
            return;
        }

        gameState.battleTargetMonster = opponentMonster;

        showConfirmationModal(
            '確認出戰',
            `您確定要讓 ${playerMonster.nickname} (評價: ${playerMonster.score}) 挑戰 ${opponentMonster.nickname} (評價: ${opponentMonster.score}) 嗎？`,
            async () => {
                try {
                    showFeedbackModal('戰鬥中...', '正在激烈交鋒...', true);
                    const battleResult = await simulateBattle(playerMonster, opponentMonster);

                    showBattleLogModal(battleResult.log,
                        battleResult.winner_id === playerMonster.id ? playerMonster.nickname : (battleResult.winner_id === opponentMonster.id ? opponentMonster.nickname : null),
                        battleResult.loser_id === playerMonster.id ? playerMonster.nickname : (battleResult.loser_id === opponentMonster.id ? opponentMonster.nickname : null)
                    );

                    await refreshPlayerData();
                    hideModal('feedback-modal');

                } catch (battleError) {
                    showFeedbackModal('戰鬥失敗', `模擬戰鬥時發生錯誤: ${battleError.message}`);
                }
            },
            'primary',
            '開始戰鬥'
        );

    } catch (error) {
        showFeedbackModal('錯誤', `準備戰鬥失敗: ${error.message}`);
    }
}


/**
 * 排序並重新渲染排行榜
 * @param {'monster' | 'player'} tableType 排行榜類型
 * @param {Array<object>|null} dataToRender (可選) 如果傳入，則排序此數據，否則從 gameState 取
 */
function sortAndRenderLeaderboard(tableType, dataToRender = null) {
    const sortConfig = gameState.leaderboardSortConfig[tableType];
    if (!sortConfig) return;

    const { key, order } = sortConfig;
    let data = dataToRender;

    if (!data) {
        data = tableType === 'monster' ? [...gameState.monsterLeaderboard] : [...gameState.playerLeaderboard];
    } else {
        data = [...data];
    }

    if (tableType === 'monster') {
        data = data.filter(item => !item.isNPC);
    }


    data.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (key === 'resume') {
            const winsA = valA?.wins || 0;
            const winsB = valB?.wins || 0;
            const lossesA = valA?.losses || 0;
            const lossesB = valB?.losses || 0;

            if (winsA !== winsB) {
                return order === 'asc' ? winsA - winsB : winsB - winsA;
            }
            return order === 'asc' ? lossesA - lossesB : lossesB - lossesA;
        }

        if (key === 'owner_nickname' || key === 'nickname' || typeof valA === 'string') {
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        valA = Number(valA || 0);
        valB = Number(valB || 0);
        return order === 'asc' ? valA - valB : valB - valA;
    });

    if (typeof updateLeaderboardTable === 'function') {
        updateLeaderboardTable(tableType, data);
    }
}


console.log("Game logic module loaded with updated drag-drop logic.");
