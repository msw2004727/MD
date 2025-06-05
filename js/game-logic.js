// js/game-logic.js

// 注意：此檔案依賴 gameState, DOMElements, API client 函數, UI 更新函數等

/**
 * 處理 DNA 從來源（庫存、組合槽、臨時背包）移動或交換到目標位置的邏輯。
 * @param {object} draggedDnaObject 被拖曳的 DNA 物件。
 * @param {'inventory' | 'combination' | 'temporary'} sourceCategory 來源類型。
 * @param {number} sourceSlotIndex 來源槽位的索引。
 * @param {'inventory' | 'combination' | 'temporary'} targetCategory 目標類型。
 * @param {number} targetSlotIndex 目標槽位的索引。
 */
function moveOrSwapDna(draggedDnaObject, sourceCategory, sourceSlotIndex, targetCategory, targetSlotIndex) {
    if (!draggedDnaObject || !draggedDnaObject.id) { // 確保拖曳的是有效的DNA物件
        console.warn("moveOrSwapDna: 無效的拖曳DNA物件。");
        return;
    }

    let sourceArray;
    let targetArray;

    // 根據來源類型獲取對應的 gameState 陣列
    if (sourceCategory === 'inventory') sourceArray = gameState.playerData.playerOwnedDNA;
    else if (sourceCategory === 'combination') sourceArray = gameState.dnaCombinationSlots;
    else if (sourceCategory === 'temporary') sourceArray = gameState.temporaryBackpack.map(item => item.data); // 假設臨時背包存的是 {type:'dna', data:{...}}
    else return; // 未知來源

    // 根據目標類型獲取對應的 gameState 陣列
    if (targetCategory === 'inventory') targetArray = gameState.playerData.playerOwnedDNA;
    else if (targetCategory === 'combination') targetArray = gameState.dnaCombinationSlots;
    else if (targetCategory === 'temporary') targetArray = gameState.temporaryBackpack; // 這裡直接用 gameState.temporaryBackpack
    else return; // 未知目標

    // 確保索引有效
    if (sourceSlotIndex < 0 || sourceSlotIndex >= sourceArray.length ||
        targetSlotIndex < 0 || targetSlotIndex >= targetArray.length) {
        if (targetCategory === 'inventory' && targetSlotIndex >= targetArray.length && targetSlotIndex < (DOMElements.inventoryItemsContainer?.children.length -1 || 0) ) {
            // 允許拖到空的 inventory slot, targetArray[targetSlotIndex] 會是 undefined
        } else if (targetCategory === 'temporary' && targetSlotIndex >= targetArray.length && targetSlotIndex < (DOMElements.temporaryBackpackContainer?.children.length || 0) ) {
            // 允許拖到空的 temporary slot
        }
        else {
            console.warn("moveOrSwapDna: 無效的來源或目標索引。", sourceCategory, sourceSlotIndex, targetCategory, targetSlotIndex, sourceArray.length, targetArray.length);
            return;
        }
    }


    const itemCurrentlyInTargetSlot = targetCategory === 'temporary' ?
        (targetArray[targetSlotIndex] ? targetArray[targetSlotIndex].data : null) :
        targetArray[targetSlotIndex];

    // 執行移動或交換
    if (targetCategory === 'temporary') {
        // 特殊處理臨時背包，因為它的結構是 {type, data}
        if (targetArray[targetSlotIndex]) { // 如果目標臨時背包槽有物品，則交換
            targetArray[targetSlotIndex].data = draggedDnaObject;
        } else { // 目標臨時背包槽為空
            targetArray[targetSlotIndex] = { type: 'dna', data: draggedDnaObject };
        }
    } else {
        targetArray[targetSlotIndex] = draggedDnaObject;
    }


    if (itemCurrentlyInTargetSlot) { // 如果目標槽原本有物品，則將其移回來源槽 (交換)
        if (sourceCategory === 'temporary') {
            if (sourceArray[sourceSlotIndex]) { // 這裡的 sourceArray 是 map 過的，要操作 gameState.temporaryBackpack
                 gameState.temporaryBackpack[sourceSlotIndex].data = itemCurrentlyInTargetSlot;
            } else { // 如果來源臨時槽為空 (理論上不會發生，因為拖曳的是有內容的)
                gameState.temporaryBackpack[sourceSlotIndex] = { type: 'dna', data: itemCurrentlyInTargetSlot };
            }
        } else {
            sourceArray[sourceSlotIndex] = itemCurrentlyInTargetSlot;
        }
    } else { // 如果目標槽原本是空的，則清空來源槽
        if (sourceCategory === 'temporary') {
            gameState.temporaryBackpack[sourceSlotIndex] = null; // 或 splice
             // 清理空槽位 (可選)
            gameState.temporaryBackpack = gameState.temporaryBackpack.filter(Boolean);

        } else {
            sourceArray[sourceSlotIndex] = null;
        }
    }

    // 重新渲染受影響的UI區域
    if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
    if (typeof renderDNACombinationSlots === 'function') renderDNACombinationSlots();
    if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack();
    if (typeof updateMonsterSnapshot === 'function') updateMonsterSnapshot(getSelectedMonster());

    console.log(`DNA Swapped/Moved: ${draggedDnaObject.name} from ${sourceCategory}[${sourceSlotIndex}] to ${targetCategory}[${targetSlotIndex}]`);
}


/**
 * 從玩家庫存中刪除指定的 DNA。
 * @param {string} dnaInstanceId 要刪除的 DNA 實例 ID。
 */
function deleteDNAFromInventory(dnaInstanceId) {
    if (gameState.playerData && gameState.playerData.playerOwnedDNA) {
        const initialLength = gameState.playerData.playerOwnedDNA.length;
        gameState.playerData.playerOwnedDNA = gameState.playerData.playerOwnedDNA.filter(dna => dna && dna.id !== dnaInstanceId);
        if (gameState.playerData.playerOwnedDNA.length < initialLength) {
            console.log(`DNA ${dnaInstanceId} 已從 gameState 中移除。`);
        } else {
            console.warn(`嘗試刪除 DNA ${dnaInstanceId}，但在 gameState 中未找到。`);
        }
    }
     // 如果組合槽中有這個DNA，也一併清除
    gameState.dnaCombinationSlots = gameState.dnaCombinationSlots.map(slot =>
        (slot && slot.id === dnaInstanceId) ? null : slot
    );
    if (typeof renderDNACombinationSlots === 'function') renderDNACombinationSlots();
}

/**
 * 處理玩家點擊農場中怪獸的“修煉”按鈕。
 * @param {Event} event 事件對象。
 * @param {string} monsterId 怪獸 ID。
 */
function handleCultivateMonsterClick(event, monsterId) {
    event.stopPropagation(); // 防止事件冒泡觸發農場項目的點擊事件
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
    const maxTime = gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 3600; // 預設1小時
    if (DOMElements.maxCultivationTimeText) DOMElements.maxCultivationTimeText.textContent = maxTime;
    showModal('cultivation-setup-modal');
}

/**
 * 處理玩家點擊農場中怪獸的“放生”按鈕。
 * @param {Event} event 事件對象。
 * @param {string} monsterId 怪獸 ID。
 */
async function handleReleaseMonsterClick(event, monsterId) {
    event.stopPropagation(); // 防止事件冒泡
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
                const result = await disassembleMonster(monsterId); // API call
                if (result && result.success) {
                    // 將返回的 DNA 模板加入臨時背包
                    if (result.returned_dna_templates_info && result.returned_dna_templates_info.length > 0) {
                        result.returned_dna_templates_info.forEach(dnaTemplateInfo => {
                            // 需要從 gameConfigs 中找到完整的 DNA 模板數據
                            const fullTemplate = gameState.gameConfigs.dna_fragments.find(df => df.name === dnaTemplateInfo.name && df.rarity === dnaTemplateInfo.rarity);
                            if (fullTemplate) {
                                addDnaToTemporaryBackpack(fullTemplate);
                            }
                        });
                         renderTemporaryBackpack(); // 更新臨時背包UI
                    }
                    await refreshPlayerData(); // 更新玩家農場列表等
                    showFeedbackModal('放生成功', `${result.message || monster.nickname + " 已成功放生。"} ${result.returned_dna_templates_info && result.returned_dna_templates_info.length > 0 ? '獲得了新的DNA碎片！請查看臨時背包。' : ''}`);
                } else {
                    showFeedbackModal('放生失敗', result.error || '放生怪獸時發生錯誤。');
                }
            } catch (error) {
                showFeedbackModal('放生失敗', `請求錯誤: ${error.message}`);
            }
        },
        'danger', // confirm button class
        '確定放生', // confirm button text
        monster // Pass monster data for image preview in confirmation modal
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
        const result = await completeCultivation(monsterId, durationSeconds); // API call

        if (result && result.success) {
            // 更新本地怪獸數據 (技能等)
            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            if (monsterInFarm) {
                monsterInFarm.skills = result.updated_monster_skills || monsterInFarm.skills;
                // 清除修煉狀態
                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = false;
                monsterInFarm.farmStatus.trainingStartTime = null;
                monsterInFarm.farmStatus.trainingDuration = null;
            }
            renderMonsterFarm(); // 更新農場列表
            updateMonsterSnapshot(getSelectedMonster() || getDefaultSelectedMonster()); // 更新快照

            // 顯示修煉成果彈窗
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
            gameState.lastCultivationResult = result; // 保存結果以便加入背包
            if (result.items_obtained && result.items_obtained.length > 0) {
                itemsHtml = "<ul>";
                result.items_obtained.forEach(item => {
                    // item 應該是 DNA 模板
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

            // 如果領悟了新技能，彈出學習提示
            if (result.learned_new_skill_template) {
                promptLearnNewSkill(monsterId, result.learned_new_skill_template, monsterInFarm ? monsterInFarm.skills : []);
            }

        } else {
            showFeedbackModal('修煉失敗', result.error || '完成修煉時發生錯誤。');
            // 確保修煉狀態被清除
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
                    const result = await replaceMonsterSkill(monsterId, null, newSkillTemplate); // slotIndex null for new slot
                    if (result && result.success) {
                        await refreshPlayerData(); // 刷新以獲取更新後的怪獸（包含新技能）
                        showFeedbackModal('學習成功！', `${monster.nickname} 成功學習了 ${newSkillTemplate.name}！`);
                    } else {
                        showFeedbackModal('學習失敗', result.error || '學習新技能時發生錯誤。');
                    }
                } catch (error) {
                    showFeedbackModal('學習失敗', `請求錯誤: ${error.message}`);
                }
            },
            'success', // confirm button class
            '學習' // confirm button text
        );
    } else { // 技能槽已滿
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

        // 使用 feedbackModal 來展示替換選項
        showFeedbackModal(
            '領悟新技能 - 技能槽已滿',
            message,
            false, // not loading
            null, // no monster details needed here specifically
            [{ text: '不學習', class: 'secondary', onClick: () => {} }] // "不學習" 按鈕
        );

        // 為動態添加的按鈕綁定事件
        const feedbackModalBody = DOMElements.feedbackModal.querySelector('.modal-body'); // 假設 message 在 modal-body 內
        if (feedbackModalBody) {
            feedbackModalBody.querySelectorAll('.skill-replace-option-btn').forEach(button => {
                button.onclick = async () => {
                    const slotToReplace = parseInt(button.dataset.skillSlot, 10);
                    hideModal('feedback-modal'); // 關閉當前的 feedbackModal
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
            addDnaToTemporaryBackpack(itemTemplate); // itemTemplate 應該是完整的 DNA 模板
        });
        renderTemporaryBackpack();
        gameState.lastCultivationResult.items_obtained = []; // 清空已處理的物品
        showFeedbackModal('提示', '所有修煉拾獲物品已加入臨時背包。');
        // 更新按鈕狀態
        if (DOMElements.addAllToTempBackpackBtn) {
             DOMElements.addAllToTempBackpackBtn.disabled = true;
             DOMElements.addAllToTempBackpackBtn.textContent = "已加入背包";
        }
    }
}

/**
 * 將指定的 DNA 模板加入臨時背包。
 * @param {object} dnaTemplate DNA 模板對象。
 */
function addDnaToTemporaryBackpack(dnaTemplate) {
    if (!dnaTemplate || !dnaTemplate.id) { // 確保是有效的 DNA 模板
        console.warn("addDnaToTemporaryBackpack: 試圖加入無效的 DNA 模板。", dnaTemplate);
        return;
    }
    // 臨時背包現在期望的結構是 { type: 'dna', data: {...dnaFragment} }
    gameState.temporaryBackpack.push({
        type: 'dna',
        data: { ...dnaTemplate }, // 儲存完整的 DNA 模板數據
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
        // 創建一個新的實例ID，因為移入庫存的是一個新的實例
        const newInstanceId = `dna_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const newOwnedDna = {
            ...itemToMove.data, // itemToMove.data 是 DNA 模板
            id: newInstanceId,   // 新的實例 ID
            baseId: itemToMove.data.id // baseId 應該是模板的 ID
        };
        gameState.playerData.playerOwnedDNA.push(newOwnedDna);
        gameState.temporaryBackpack.splice(tempBackpackIndex, 1); // 從臨時背包移除

        renderPlayerDNAInventory();
        renderTemporaryBackpack();

        showFeedbackModal(
            '物品已移動',
            `${itemToMove.data.name} 已移至您的 DNA 庫存。建議盡快保存遊戲進度。`,
            false, null,
            [{ text: '好的', class: 'primary' }]
        );
        // TODO: Consider calling savePlayerData() here or prompting user
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

    const numberOfDraws = 1; // 假設一次抽1個，如果需要多抽，可以調整
    const drawnItems = [];
    const allPossibleDna = gameState.gameConfigs.dna_fragments;

    if (allPossibleDna.length === 0) {
        hideModal('feedback-modal');
        showFeedbackModal('提示', 'DNA池是空的，無法抽取。');
        return;
    }

    // 模擬抽卡延遲
    await new Promise(resolve => setTimeout(resolve, 700)); // 0.7秒延遲

    for (let i = 0; i < numberOfDraws; i++) {
        // 這裡可以加入更複雜的抽卡機率邏輯，例如根據稀有度
        const randomIndex = Math.floor(Math.random() * allPossibleDna.length);
        const drawnTemplate = { ...allPossibleDna[randomIndex] }; // 複製模板
        // 注意：抽到的DNA是模板，加入臨時背包時應處理成實例或讓臨時背包直接接受模板
        drawnItems.push(drawnTemplate);
    }

    gameState.lastDnaDrawResult = drawnItems; // 保存抽卡結果，供加入背包使用
    hideModal('feedback-modal');
    showDnaDrawModal(drawnItems); // 顯示抽卡結果彈窗
}


/**
 * 根據當前篩選條件和排序配置，過濾並渲染怪獸排行榜。
 */
function filterAndRenderMonsterLeaderboard() {
    if (!gameState.monsterLeaderboard) return;
    let filteredLeaderboard = gameState.monsterLeaderboard;

    // 篩選邏輯
    if (gameState.currentMonsterLeaderboardElementFilter === 'NPC') {
        filteredLeaderboard = filteredLeaderboard.filter(monster => monster.isNPC);
    } else if (gameState.currentMonsterLeaderboardElementFilter !== 'all') {
        filteredLeaderboard = filteredLeaderboard.filter(monster =>
            !monster.isNPC && monster.elements && monster.elements.includes(gameState.currentMonsterLeaderboardElementFilter)
        );
    } else { // 'all' - 顯示所有非NPC怪獸
        filteredLeaderboard = filteredLeaderboard.filter(monster => !monster.isNPC);
    }

    sortAndRenderLeaderboard('monster', filteredLeaderboard); // 使用已有的排序和渲染函數
}

/**
 * 刷新玩家數據 (從後端重新獲取)。
 */
async function refreshPlayerData() {
    if (!gameState.playerId) return;
    try {
        const playerData = await getPlayerData(gameState.playerId); // API Call
        if (playerData) {
            updateGameState({ playerData: playerData });
            // 重新渲染相關UI
            renderPlayerDNAInventory();
            renderMonsterFarm();
            // 更新快照，優先顯示已選中的，否則顯示農場第一個，都沒有則為null
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
 * @param {string} [npcId=null] - 如果挑戰的是NPC，傳入NPC ID (但此範例中NPC是直接從gameConfigs獲取)。
 */
async function handleChallengeMonsterClick(event, monsterIdToChallenge = null, ownerId = null) {
    event.stopPropagation(); // 防止事件冒泡

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
    if (playerMonster.farmStatus?.isTraining || playerMonster.farmStatus?.isBattling) { // 確保不是忙碌狀態
         showFeedbackModal('提示', `${playerMonster.nickname} 目前正在忙碌中，無法出戰。`);
        return;
    }


    let opponentMonster = null;

    try {
        showFeedbackModal('準備戰鬥...', '正在獲取對手資訊...', true);
        if (monsterIdToChallenge && ownerId && ownerId !== gameState.playerId) { // 挑戰其他玩家的怪獸
            const opponentPlayerData = await getPlayerData(ownerId); // API Call
            if (!opponentPlayerData || !opponentPlayerData.farmedMonsters) throw new Error('無法獲取對手玩家資料。');
            opponentMonster = opponentPlayerData.farmedMonsters.find(m => m.id === monsterIdToChallenge);
            if (!opponentMonster) throw new Error(`找不到對手玩家的怪獸ID ${monsterIdToChallenge}。`);
        } else if (monsterIdToChallenge && gameState.monsterLeaderboard.some(m => m.id === monsterIdToChallenge && m.isNPC)) { // 挑戰排行榜上的NPC
            opponentMonster = gameState.monsterLeaderboard.find(m => m.id === monsterIdToChallenge && m.isNPC);
             if (!opponentMonster) throw new Error(`在排行榜NPC列表中找不到ID為 ${monsterIdToChallenge} 的NPC。`);
        } else { // 預設是從NPC列表隨機選一個 (如果沒有指定排行榜NPC)
            // 這裡的邏輯需要根據實際的NPC挑戰方式調整
            // 假設 gameState.gameConfigs.npc_monsters 存有NPC模板
            const npcTemplates = gameState.gameConfigs?.npc_monsters;
            if (npcTemplates && npcTemplates.length > 0) {
                opponentMonster = { ...npcTemplates[Math.floor(Math.random() * npcTemplates.length)] }; // 複製NPC模板
                opponentMonster.id = opponentMonster.id || `npc_battle_${Date.now()}`; // 確保NPC有唯一ID用於戰鬥
                opponentMonster.isNPC = true; // 明確標記為NPC
            } else {
                 throw new Error('未能找到合適的挑戰對手 (無指定對手且無NPC可選)。');
            }
        }
        hideModal('feedback-modal');

        if (!opponentMonster) {
            showFeedbackModal('錯誤', '未能找到合適的挑戰對手。');
            return;
        }

        gameState.battleTargetMonster = opponentMonster; // 保存對手資訊

        showConfirmationModal(
            '確認出戰',
            `您確定要讓 ${playerMonster.nickname} (評價: ${playerMonster.score}) 挑戰 ${opponentMonster.nickname} (評價: ${opponentMonster.score}) 嗎？`,
            async () => {
                try {
                    showFeedbackModal('戰鬥中...', '正在激烈交鋒...', true);
                    const battleResult = await simulateBattle(playerMonster, opponentMonster); // API call

                    showBattleLogModal(battleResult.log,
                        battleResult.winner_id === playerMonster.id ? playerMonster.nickname : (battleResult.winner_id === opponentMonster.id ? opponentMonster.nickname : null),
                        battleResult.loser_id === playerMonster.id ? playerMonster.nickname : (battleResult.loser_id === opponentMonster.id ? opponentMonster.nickname : null)
                    );

                    // 戰後處理：更新玩家戰績、怪獸經驗等
                    // 這部分邏輯比較複雜，可能需要後端也參與部分更新，或者前端在這裡處理完後再統一保存
                    // 假設 battleResult 返回了更新後的玩家怪獸數據 (例如技能經驗)
                    await refreshPlayerData(); // 簡單起見，直接刷新玩家數據
                    hideModal('feedback-modal');

                } catch (battleError) {
                    showFeedbackModal('戰鬥失敗', `模擬戰鬥時發生錯誤: ${battleError.message}`);
                }
            },
            'primary', // confirm button class
            '開始戰鬥' // confirm button text
        );

    } catch (error) {
        showFeedbackModal('錯誤', `準備戰鬥失敗: ${error.message}`);
    }
}


/**
 * 根據當前排序配置對排行榜數據進行排序，並調用UI更新。
 * @param {'monster' | 'player'} tableType 排行榜類型。
 * @param {Array<object>|null} dataToRender (可選) 如果傳入，則排序此數據，否則從 gameState 取。
 */
function sortAndRenderLeaderboard(tableType, dataToRender = null) {
    const sortConfig = gameState.leaderboardSortConfig[tableType];
    if (!sortConfig) return;

    const { key, order } = sortConfig;
    let data = dataToRender;

    // 如果沒有傳入 dataToRender，則從 gameState 中獲取對應的排行榜數據
    if (!data) {
        data = tableType === 'monster' ? [...gameState.monsterLeaderboard] : [...gameState.playerLeaderboard];
    } else {
        data = [...data]; // 創建副本以避免修改原始數據
    }

    // 確保只排序非NPC怪獸，除非篩選條件是NPC
    if (tableType === 'monster' && gameState.currentMonsterLeaderboardElementFilter !== 'NPC') {
        data = data.filter(item => !item.isNPC);
    }


    data.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        // 特定欄位的特殊處理
        if (key === 'resume') { // 勝/敗
            const winsA = valA?.wins || 0;
            const winsB = valB?.wins || 0;
            const lossesA = valA?.losses || 0;
            const lossesB = valB?.losses || 0;
            if (winsA !== winsB) return order === 'asc' ? winsA - winsB : winsB - winsA;
            return order === 'asc' ? lossesA - lossesB : lossesB - lossesA; // 敗場少者優先
        } else if (key === 'rarity') {
            const rarityOrder = ["普通", "稀有", "菁英", "傳奇", "神話"];
            valA = rarityOrder.indexOf(valA);
            valB = rarityOrder.indexOf(valB);
        } else if (key === 'elements') { // 按主元素排序
            valA = (valA && valA.length > 0) ? valA[0] : '無';
            valB = (valB && valB.length > 0) ? valB[0] : '無';
        } else if (key === 'titles' && tableType === 'player') { // 按主稱號排序
            valA = (valA && valA.length > 0) ? valA[0] : '';
            valB = (valB && valB.length > 0) ? valB[0] : '';
        }


        // 通用排序邏輯
        if (typeof valA === 'string' && typeof valB === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else { // 數字或其他類型
            valA = Number(valA || 0);
            valB = Number(valB || 0);
            return order === 'asc' ? valA - valB : valB - valA;
        }
    });

    if (typeof updateLeaderboardTable === 'function') {
        updateLeaderboardTable(tableType, data);
    }
}


console.log("Game logic module loaded (v19 - with drag-drop & leaderboard enhancements).");
