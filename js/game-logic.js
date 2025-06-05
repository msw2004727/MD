// js/game-logic.js
// 假設 gameState, DOMElements, apiClient, ui, gameStateManager 已經通過 window 全局掛載或正確導入

export function moveDnaToCombinationSlot(dnaInstanceId, draggedDnaObject, source, sourceSlotIndex, targetSlotIndex) {
    let dnaToMove = null;
    const currentGameState = window.gameStateManager.getGameState(); // 獲取最新狀態

    if (source === 'inventory' && dnaInstanceId) {
        const playerDna = currentGameState.playerData.playerOwnedDNA.find(d => d.id === dnaInstanceId);
        if (playerDna) {
            dnaToMove = { ...playerDna };
        }
    } else if (source === 'combination' && draggedDnaObject && sourceSlotIndex !== null) {
        dnaToMove = draggedDnaObject;
    }

    if (!dnaToMove) {
        console.warn(`moveDnaToCombinationSlot: 無法找到要移動的 DNA。實例ID: ${dnaInstanceId}, 來源: ${source}`);
        window.ui.renderDNACombinationSlots(currentGameState.dnaCombinationSlots);
        return;
    }

    if (targetSlotIndex < 0 || targetSlotIndex >= currentGameState.dnaCombinationSlots.length) {
        console.warn(`moveDnaToCombinationSlot: 無效的目標槽位索引 ${targetSlotIndex}。`);
        window.ui.renderDNACombinationSlots(currentGameState.dnaCombinationSlots);
        return;
    }

    if (source === 'combination' && sourceSlotIndex === targetSlotIndex) {
        window.ui.renderDNACombinationSlots(currentGameState.dnaCombinationSlots);
        return;
    }

    const newCombinationSlots = [...currentGameState.dnaCombinationSlots]; // 創建副本以修改
    const itemCurrentlyInTargetSlot = newCombinationSlots[targetSlotIndex];

    if (source === 'inventory') {
        newCombinationSlots[targetSlotIndex] = dnaToMove;
    } else if (source === 'combination' && sourceSlotIndex !== null) {
        if (itemCurrentlyInTargetSlot) {
            newCombinationSlots[targetSlotIndex] = dnaToMove;
            newCombinationSlots[sourceSlotIndex] = itemCurrentlyInTargetSlot;
        } else {
            newCombinationSlots[targetSlotIndex] = dnaToMove;
            newCombinationSlots[sourceSlotIndex] = null;
        }
    }
    window.gameStateManager.updateGameState({ dnaCombinationSlots: newCombinationSlots });
    window.ui.renderDNACombinationSlots(newCombinationSlots);
    window.ui.updateMonsterSnapshot(window.gameStateManager.getSelectedMonster() || window.gameStateManager.getDefaultSelectedMonster());
}

export function deleteDNAFromInventory(dnaInstanceId) {
    const currentPlayerData = window.gameStateManager.getGameState().playerData;
    if (currentPlayerData && currentPlayerData.playerOwnedDNA) {
        const initialLength = currentPlayerData.playerOwnedDNA.length;
        const updatedOwnedDNA = currentPlayerData.playerOwnedDNA.filter(dna => dna.id !== dnaInstanceId);
        if (updatedOwnedDNA.length < initialLength) {
            window.gameStateManager.updateGameState({
                playerData: { ...currentPlayerData, playerOwnedDNA: updatedOwnedDNA }
            });
            console.log(`DNA ${dnaInstanceId} 已從 gameState 中移除。`);
        } else {
            console.warn(`嘗試刪除 DNA ${dnaInstanceId}，但在 gameState 中未找到。`);
        }
    }
}

export async function handleCultivateMonsterClick(event, monsterId) {
    event.stopPropagation();
    const currentGameState = window.gameStateManager.getGameState();
    const monster = currentGameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (!monster) {
        window.ui.showFeedbackModal('錯誤', '找不到指定的怪獸。');
        return;
    }
    if (monster.farmStatus?.isBattling || monster.farmStatus?.isTraining) {
        window.ui.showFeedbackModal('提示', `怪獸 ${monster.nickname} 目前正在忙碌中，無法開始新的修煉。`);
        return;
    }
    window.gameStateManager.updateGameState({ cultivationMonsterId: monsterId });
    if (window.DOMElements.cultivationMonsterNameText) window.DOMElements.cultivationMonsterNameText.textContent = monster.nickname;
    const maxTime = currentGameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 3600;
    if (window.DOMElements.maxCultivationTimeText) window.DOMElements.maxCultivationTimeText.textContent = maxTime;
    window.ui.showModal('cultivation-setup-modal');
}

export async function handleReleaseMonsterClick(event, monsterId) {
    event.stopPropagation();
    const currentGameState = window.gameStateManager.getGameState();
    const monster = currentGameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (!monster) {
        window.ui.showFeedbackModal('錯誤', '找不到指定的怪獸。');
        return;
    }
    if (monster.farmStatus?.isBattling || monster.farmStatus?.isTraining) {
        window.ui.showFeedbackModal('提示', `怪獸 ${monster.nickname} 目前正在忙碌中，無法放生。`);
        return;
    }
    window.ui.showConfirmationModal(
        '確認放生',
        `您確定要放生怪獸 "${monster.nickname}" 嗎？放生後，您將根據其構成DNA獲得一些DNA碎片。此操作無法復原。`,
        async () => {
            try {
                window.ui.showFeedbackModal('處理中...', `正在放生 ${monster.nickname}...`, true);
                const result = await window.apiClient.disassembleMonster(monsterId);
                if (result && result.success) {
                    if (result.returned_dna_templates_info && result.returned_dna_templates_info.length > 0) {
                        result.returned_dna_templates_info.forEach(dnaTemplateInfo => {
                            const fullTemplate = currentGameState.gameConfigs.dna_fragments.find(df => df.name === dnaTemplateInfo.name && df.rarity === dnaTemplateInfo.rarity);
                            if (fullTemplate) addDnaToTemporaryBackpack(fullTemplate);
                        });
                         window.ui.renderTemporaryBackpack(window.gameStateManager.getGameState().temporaryBackpack);
                    }
                    await refreshPlayerData();
                    window.ui.showFeedbackModal('放生成功', `${result.message || monster.nickname + " 已成功放生。"} ${result.returned_dna_templates_info && result.returned_dna_templates_info.length > 0 ? '獲得了新的DNA碎片！請查看臨時背包。' : ''}`);
                } else {
                    window.ui.showFeedbackModal('放生失敗', result.error || '放生怪獸時發生錯誤。');
                }
            } catch (error) {
                window.ui.showFeedbackModal('放生失敗', `請求錯誤: ${error.message}`);
            }
        },
        'danger', '確定放生', monster
    );
}

export async function handleCompleteCultivation(monsterId, durationSeconds) {
    if (!monsterId) return;
    try {
        window.ui.showFeedbackModal('結算中...', '正在結算修煉成果...', true);
        const result = await window.apiClient.completeCultivation(monsterId, durationSeconds);
        const currentGameState = window.gameStateManager.getGameState(); // 獲取最新狀態

        if (result && result.success) {
            const monsterIndex = currentGameState.playerData.farmedMonsters.findIndex(m => m.id === monsterId);
            if (monsterIndex !== -1) {
                const updatedMonsters = [...currentGameState.playerData.farmedMonsters];
                updatedMonsters[monsterIndex].skills = result.updated_monster_skills || updatedMonsters[monsterIndex].skills;
                updatedMonsters[monsterIndex].farmStatus = updatedMonsters[monsterIndex].farmStatus || {};
                updatedMonsters[monsterIndex].farmStatus.isTraining = false;
                updatedMonsters[monsterIndex].farmStatus.trainingStartTime = null;
                updatedMonsters[monsterIndex].farmStatus.trainingDuration = null;
                window.gameStateManager.updateGameState({ playerData: { ...currentGameState.playerData, farmedMonsters: updatedMonsters }});
            }
            window.ui.renderMonsterFarm(currentGameState.playerData.farmedMonsters);
            window.ui.updateMonsterSnapshot(window.gameStateManager.getSelectedMonster() || window.gameStateManager.getDefaultSelectedMonster());

            if (window.DOMElements.trainingResultsModalTitle) window.DOMElements.trainingResultsModalTitle.textContent = `${currentGameState.playerData.farmedMonsters[monsterIndex]?.nickname || '怪獸'}的修煉成果`;
            if (window.DOMElements.trainingStoryResult) window.DOMElements.trainingStoryResult.textContent = result.adventure_story || "沒有特別的故事發生。";
            let growthHtml = "<ul>";
            if (result.skill_updates_log && result.skill_updates_log.length > 0) {
                result.skill_updates_log.forEach(log => growthHtml += `<li>${log}</li>`);
            } else { growthHtml += "<li>技能沒有明顯變化。</li>"; }
            growthHtml += "</ul>";
            if (window.DOMElements.trainingGrowthResult) window.DOMElements.trainingGrowthResult.innerHTML = growthHtml;
            let itemsHtml = "<p>沒有拾獲任何物品。</p>";
            window.gameStateManager.updateGameState({ lastCultivationResult: result });
            if (result.items_obtained && result.items_obtained.length > 0) {
                itemsHtml = "<ul>";
                result.items_obtained.forEach(item => itemsHtml += `<li>拾獲: ${item.name} (${item.rarity} ${item.type}屬性)</li>`);
                itemsHtml += "</ul>";
                if (window.DOMElements.addAllToTempBackpackBtn) {
                    window.DOMElements.addAllToTempBackpackBtn.disabled = false;
                    window.DOMElements.addAllToTempBackpackBtn.textContent = "一鍵全數加入背包";
                }
            } else {
                if (window.DOMElements.addAllToTempBackpackBtn) {
                    window.DOMElements.addAllToTempBackpackBtn.disabled = true;
                    window.DOMElements.addAllToTempBackpackBtn.textContent = "無物品可加入";
                }
            }
            if (window.DOMElements.trainingItemsResult) window.DOMElements.trainingItemsResult.innerHTML = itemsHtml;
            window.ui.hideModal('feedback-modal');
            window.ui.showModal('training-results-modal');
            if (result.learned_new_skill_template) {
                promptLearnNewSkill(monsterId, result.learned_new_skill_template, currentGameState.playerData.farmedMonsters[monsterIndex]?.skills || []);
            }
        } else {
            window.ui.showFeedbackModal('修煉失敗', result.error || '完成修煉時發生錯誤。');
            const monsterToUpdate = currentGameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            if (monsterToUpdate && monsterToUpdate.farmStatus) monsterToUpdate.farmStatus.isTraining = false;
            window.ui.renderMonsterFarm(currentGameState.playerData.farmedMonsters);
        }
    } catch (error) {
        window.ui.showFeedbackModal('修煉失敗', `請求錯誤: ${error.message}`);
        const currentGameState = window.gameStateManager.getGameState();
        const monsterToUpdate = currentGameState.playerData.farmedMonsters.find(m => m.id === monsterId);
        if (monsterToUpdate && monsterToUpdate.farmStatus) monsterToUpdate.farmStatus.isTraining = false;
        window.ui.renderMonsterFarm(currentGameState.playerData.farmedMonsters);
    }
}

export function promptLearnNewSkill(monsterId, newSkillTemplate, currentSkills) {
    const currentGameState = window.gameStateManager.getGameState();
    const monster = currentGameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (!monster) return;
    const maxSkills = currentGameState.gameConfigs.value_settings?.max_monster_skills || 3;
    let message = `${monster.nickname} 領悟了新技能：<strong>${newSkillTemplate.name}</strong> (威力: ${newSkillTemplate.power}, MP: ${newSkillTemplate.mp_cost || 0})！<br>`;
    if (currentSkills.length < maxSkills) {
        message += "是否要學習這個技能？";
        window.ui.showConfirmationModal('領悟新技能！', message, async () => {
            try {
                window.ui.showFeedbackModal('學習中...', `正在為 ${monster.nickname} 學習新技能...`, true);
                const result = await window.apiClient.replaceMonsterSkill(monsterId, null, newSkillTemplate);
                if (result && result.success) {
                    await refreshPlayerData();
                    window.ui.showFeedbackModal('學習成功！', `${monster.nickname} 成功學習了 ${newSkillTemplate.name}！`);
                } else { window.ui.showFeedbackModal('學習失敗', result.error || '學習新技能時發生錯誤。'); }
            } catch (error) { window.ui.showFeedbackModal('學習失敗', `請求錯誤: ${error.message}`); }
        }, 'success', '學習');
    } else {
        message += `但技能槽已滿 (${currentSkills.length}/${maxSkills})。是否要替換一個現有技能來學習它？<br><br>選擇要替換的技能：`;
        let skillOptionsHtml = '<div class="my-2">';
        currentSkills.forEach((skill, index) => {
            skillOptionsHtml += `<button class="skill-replace-option-btn secondary text-sm p-1 mr-1 mb-1" data-skill-slot="${index}">替換：${skill.name} (Lv.${skill.level || 1})</button>`;
        });
        skillOptionsHtml += '</div>';
        message += skillOptionsHtml;
        window.ui.showFeedbackModal('領悟新技能 - 技能槽已滿', message, false, null, [{ text: '不學習', class: 'secondary', onClick: () => {} }]);
        const feedbackModalBody = window.DOMElements.feedbackModal.querySelector('.modal-body');
        if (feedbackModalBody) {
            feedbackModalBody.querySelectorAll('.skill-replace-option-btn').forEach(button => {
                button.onclick = async () => {
                    const slotToReplace = parseInt(button.dataset.skillSlot, 10);
                    window.ui.hideModal('feedback-modal');
                    try {
                        window.ui.showFeedbackModal('替換技能中...', `正在為 ${monster.nickname} 替換技能...`, true);
                        const result = await window.apiClient.replaceMonsterSkill(monsterId, slotToReplace, newSkillTemplate);
                        if (result && result.success) {
                            await refreshPlayerData();
                            window.ui.showFeedbackModal('替換成功！', `${monster.nickname} 成功學習了 ${newSkillTemplate.name}，替換了原技能！`);
                        } else { window.ui.showFeedbackModal('替換失敗', result.error || '替換技能時發生錯誤。'); }
                    } catch (error) { window.ui.showFeedbackModal('替換失敗', `請求錯誤: ${error.message}`); }
                };
            });
        }
    }
}

export function addAllCultivationItemsToTempBackpack() {
    const currentGameState = window.gameStateManager.getGameState();
    if (currentGameState.lastCultivationResult && currentGameState.lastCultivationResult.items_obtained) {
        const updatedBackpack = [...currentGameState.temporaryBackpack];
        currentGameState.lastCultivationResult.items_obtained.forEach(itemTemplate => {
            updatedBackpack.push({ type: 'dna', data: { ...itemTemplate } });
        });
        window.gameStateManager.updateGameState({
            temporaryBackpack: updatedBackpack,
            lastCultivationResult: { ...currentGameState.lastCultivationResult, items_obtained: [] }
        });
        window.ui.renderTemporaryBackpack(updatedBackpack);
        window.ui.showFeedbackModal('提示', '所有修煉拾獲物品已加入臨時背包。');
    }
}

export function addDnaToTemporaryBackpack(dnaTemplate) {
    if (!dnaTemplate || !dnaTemplate.id) return;
    const currentGameState = window.gameStateManager.getGameState();
    const updatedBackpack = [...currentGameState.temporaryBackpack, { type: 'dna', data: { ...dnaTemplate } }];
    window.gameStateManager.updateGameState({ temporaryBackpack: updatedBackpack });
    window.ui.renderTemporaryBackpack(updatedBackpack);
    console.log(`${dnaTemplate.name} 已加入臨時背包。`);
}

export function clearTemporaryBackpack() {
    window.gameStateManager.updateGameState({ temporaryBackpack: [] });
    window.ui.renderTemporaryBackpack([]);
    console.log("臨時背包已清空。");
}

export async function handleMoveFromTempBackpackToInventory(tempBackpackIndex) {
    const currentGameState = window.gameStateManager.getGameState();
    if (tempBackpackIndex < 0 || tempBackpackIndex >= currentGameState.temporaryBackpack.length) return;
    const itemToMove = currentGameState.temporaryBackpack[tempBackpackIndex];
    if (itemToMove.type === 'dna') {
        const newInstanceId = `dna_${currentGameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const newOwnedDnaItem = { ...itemToMove.data, id: newInstanceId, baseId: itemToMove.data.id };
        const updatedOwnedDNA = [...currentGameState.playerData.playerOwnedDNA, newOwnedDnaItem];
        const updatedBackpack = currentGameState.temporaryBackpack.filter((_, idx) => idx !== tempBackpackIndex);
        window.gameStateManager.updateGameState({
            playerData: { ...currentGameState.playerData, playerOwnedDNA: updatedOwnedDNA },
            temporaryBackpack: updatedBackpack
        });
        window.ui.renderPlayerDNAInventory(updatedOwnedDNA);
        window.ui.renderTemporaryBackpack(updatedBackpack);
        window.ui.showFeedbackModal('物品已移動', `${itemToMove.data.name} 已移至您的 DNA 庫存。建議盡快保存遊戲進度。`, false, null, [{ text: '好的', class: 'primary' }]);
    } else { window.ui.showFeedbackModal('錯誤', '無法移動未知類型的物品。'); }
}

export async function handleDrawDNAClick() {
    const currentGameState = window.gameStateManager.getGameState();
    if (!currentGameState.gameConfigs || !currentGameState.gameConfigs.dna_fragments) {
        window.ui.showFeedbackModal('抽卡失敗', '遊戲設定尚未載入，無法進行DNA抽取。');
        return;
    }
    window.ui.showFeedbackModal('DNA抽取中...', '正在搜尋稀有的DNA序列...', true);
    const numberOfDraws = 1;
    const drawnItems = [];
    const allPossibleDna = currentGameState.gameConfigs.dna_fragments;
    if (allPossibleDna.length === 0) {
        window.ui.hideModal('feedback-modal');
        window.ui.showFeedbackModal('提示', 'DNA池是空的，無法抽取。');
        return;
    }
    await new Promise(resolve => setTimeout(resolve, 700));
    for (let i = 0; i < numberOfDraws; i++) {
        const randomIndex = Math.floor(Math.random() * allPossibleDna.length);
        drawnItems.push({ ...allPossibleDna[randomIndex] });
    }
    window.gameStateManager.updateGameState({ lastDnaDrawResult: drawnItems });
    window.ui.hideModal('feedback-modal');
    window.ui.showDnaDrawModal(drawnItems);
}

export function filterAndRenderMonsterLeaderboard() {
    const currentGameState = window.gameStateManager.getGameState();
    if (!currentGameState.monsterLeaderboard) return;
    let filteredLeaderboard = currentGameState.monsterLeaderboard.filter(monster => !monster.isNPC);
    if (currentGameState.currentMonsterLeaderboardElementFilter !== 'all') {
        filteredLeaderboard = filteredLeaderboard.filter(monster =>
            monster.elements && monster.elements.includes(currentGameState.currentMonsterLeaderboardElementFilter)
        );
    }
    sortAndRenderLeaderboard('monster', filteredLeaderboard);
}

export async function refreshPlayerData() {
    const currentGameState = window.gameStateManager.getGameState();
    if (!currentGameState.playerId) return;
    try {
        const playerDataResponse = await window.apiClient.getPlayerData(currentGameState.playerId);
        if (playerDataResponse) {
            window.gameStateManager.updateGameState({ playerData: playerDataResponse });
            window.ui.renderPlayerDNAInventory(playerDataResponse.playerOwnedDNA || []);
            window.ui.renderMonsterFarm(playerDataResponse.farmedMonsters || []);
            const currentSelectedMonster = window.gameStateManager.getSelectedMonster() || window.gameStateManager.getDefaultSelectedMonster();
            window.ui.updateMonsterSnapshot(currentSelectedMonster);
        }
    } catch (error) {
        window.ui.showFeedbackModal('同步失敗', `無法更新玩家資料: ${error.message}`);
    }
}

export async function handleChallengeMonsterClick(event, monsterIdToChallenge = null, ownerId = null, npcId = null) {
    event.stopPropagation();
    const currentGameState = window.gameStateManager.getGameState();
    const playerMonsterId = currentGameState.selectedMonsterId;
    if (!playerMonsterId) {
        window.ui.showFeedbackModal('提示', '請先從您的農場選擇一隻出戰怪獸！');
        return;
    }
    const playerMonster = window.gameStateManager.getSelectedMonster();
    if (!playerMonster) {
        window.ui.showFeedbackModal('錯誤', '找不到您選擇的出戰怪獸資料。');
        return;
    }
    if (playerMonster.farmStatus?.isTraining || playerMonster.farmStatus?.isBattling) {
         window.ui.showFeedbackModal('提示', `${playerMonster.nickname} 目前正在忙碌中，無法出戰。`);
        return;
    }
    let opponentMonster = null;
    try {
        window.ui.showFeedbackModal('準備戰鬥...', '正在獲取對手資訊...', true);
        if (npcId) {
            // This part seems to be intentionally disabled or needs adjustment.
            // For now, just show a message and return.
            window.ui.showFeedbackModal('提示', 'NPC挑戰功能目前已調整，請從排行榜挑戰其他玩家。');
            window.ui.hideModal('feedback-modal'); // Ensure the loading modal is hidden
            return;
        } else if (monsterIdToChallenge && ownerId && ownerId !== currentGameState.playerId) {
            const opponentPlayerData = await window.apiClient.getPlayerData(ownerId);
            if (!opponentPlayerData || !opponentPlayerData.farmedMonsters) throw new Error('無法獲取對手玩家資料。');
            opponentMonster = opponentPlayerData.farmedMonsters.find(m => m.id === monsterIdToChallenge);
            if (!opponentMonster) throw new Error(`找不到對手玩家的怪獸ID ${monsterIdToChallenge}。`);
        } else {
            if (monsterIdToChallenge && (!ownerId || ownerId === currentGameState.playerId)) {
                 window.ui.showFeedbackModal('提示', '您不能挑戰自己農場中的怪獸。請選擇出戰怪獸後，從排行榜選擇其他玩家的怪獸。');
                 window.ui.hideModal('feedback-modal');
                 return;
            }
            // If no specific opponent, maybe pick a random NPC or show error
            const npcs = currentGameState.gameConfigs?.npc_monsters;
            if (npcs && npcs.length > 0) {
                opponentMonster = npcs[Math.floor(Math.random() * npcs.length)];
                 window.ui.showFeedbackModal('提示', `自動為您匹配了NPC對手：${opponentMonster.nickname}！`);
                // No need to hide feedback modal here if we proceed to confirmation
            } else {
                throw new Error('目前沒有可挑戰的NPC對手，請從排行榜選擇玩家。');
            }
        }
        window.ui.hideModal('feedback-modal'); // Hide loading only if we are not immediately showing another modal

        if (!opponentMonster) {
            window.ui.showFeedbackModal('錯誤', '未能找到合適的挑戰對手。');
            return;
        }
        window.gameStateManager.updateGameState({ battleTargetMonster: opponentMonster });
        window.ui.showConfirmationModal('確認出戰', `您確定要讓 ${playerMonster.nickname} (評價: ${playerMonster.score || 0}) 挑戰 ${opponentMonster.nickname} (評價: ${opponentMonster.score || 0}) 嗎？`,
            async () => {
                try {
                    window.ui.showFeedbackModal('戰鬥中...', '正在激烈交鋒...', true);
                    const battleResult = await window.apiClient.simulateBattle(playerMonster, opponentMonster);
                    window.ui.showBattleLogModal(battleResult.log,
                        battleResult.winner_id === playerMonster.id ? playerMonster.nickname : (battleResult.winner_id === opponentMonster.id ? opponentMonster.nickname : null),
                        battleResult.loser_id === playerMonster.id ? playerMonster.nickname : (battleResult.loser_id === opponentMonster.id ? opponentMonster.nickname : null)
                    );
                    await refreshPlayerData(); // 刷新數據以更新戰績等
                    window.ui.hideModal('feedback-modal');
                } catch (battleError) {
                    window.ui.showFeedbackModal('戰鬥失敗', `模擬戰鬥時發生錯誤: ${battleError.message}`);
                }
            },
            'primary', '開始戰鬥'
        );
    } catch (error) {
        window.ui.showFeedbackModal('錯誤', `準備戰鬥失敗: ${error.message}`);
    }
}

export function sortAndRenderLeaderboard(tableType, dataToRender = null) {
    const currentGameState = window.gameStateManager.getGameState();
    const sortConfig = currentGameState.leaderboardSortConfig[tableType];
    if (!sortConfig) return;
    const { key, order } = sortConfig;
    let data = dataToRender;
    if (!data) {
        data = tableType === 'monster' ? [...currentGameState.monsterLeaderboard] : [...currentGameState.playerLeaderboard];
    } else { data = [...data]; }
    if (tableType === 'monster') data = data.filter(item => !item.isNPC);
    data.sort((a, b) => {
        let valA = a[key], valB = b[key];
        if (key === 'resume') {
            const winsA = valA?.wins || 0, winsB = valB?.wins || 0;
            const lossesA = valA?.losses || 0, lossesB = valB?.losses || 0;
            if (winsA !== winsB) return order === 'asc' ? winsA - winsB : winsB - winsA;
            return order === 'asc' ? lossesA - lossesB : lossesB - lossesA;
        }
        if (key === 'owner_nickname' || key === 'nickname' || typeof valA === 'string') {
            valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase();
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        valA = Number(valA || 0); valB = Number(valB || 0);
        return order === 'asc' ? valA - valB : valB - valA;
    });
    if (typeof window.ui.updateLeaderboardTable === 'function') {
        window.ui.updateLeaderboardTable(tableType, data);
    }
}

console.log("Game logic module loaded with exports.");
