// js/game-logic.js

// 注意：此檔案依賴 gameState, DOMElements, API client 函數, UI 更新函數等

/**
 * 將 DNA 移動到指定的組合槽，或在組合槽之間交換 DNA。
 * @param {object} draggedDnaObject - 被拖曳的 DNA 物件。
 * @param {number | null} sourceSlotIndexIfFromCombination - 如果 DNA 是從另一個組合槽拖曳的，則為其來源索引；否則為 null。
 * @param {number} targetSlotIndex - 目標組合槽的索引。
 */
function moveDnaToCombinationSlot(draggedDnaObject, sourceSlotIndexIfFromCombination, targetSlotIndex) {
    if (!draggedDnaObject) {
        console.error("moveDnaToCombinationSlot: draggedDnaObject 不可為空。");
        renderDNACombinationSlots(); // 保持UI一致
        return;
    }

    // 檢查目標槽位索引的有效性
    if (targetSlotIndex < 0 || targetSlotIndex >= gameState.dnaCombinationSlots.length) {
        console.warn(`moveDnaToCombinationSlot: 無效的目標槽位索引 ${targetSlotIndex}。`);
        renderDNACombinationSlots();
        return;
    }

    // 如果是從組合槽拖曳到自身，不執行任何操作
    if (sourceSlotIndexIfFromCombination !== null && sourceSlotIndexIfFromCombination === targetSlotIndex) {
        renderDNACombinationSlots();
        return;
    }

    const itemCurrentlyInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex];

    // 將拖曳的 DNA 放置到目標槽
    gameState.dnaCombinationSlots[targetSlotIndex] = draggedDnaObject;

    // 如果 DNA 是從另一個組合槽拖曳過來的
    if (sourceSlotIndexIfFromCombination !== null) {
        // 將原目標槽中的物品（如果存在）放回來源槽，實現交換
        // 如果目標槽原本是空的 (itemCurrentlyInTargetSlot is null)，來源槽會被正確清空
        gameState.dnaCombinationSlots[sourceSlotIndexIfFromCombination] = itemCurrentlyInTargetSlot;
    }
    // 如果 DNA 是從庫存拖曳過來的 (sourceSlotIndexIfFromCombination is null)，
    // 則庫存中的原始物品不會在此函數中被移除。庫存的渲染應處理顯示。
    // "刪除" 庫存物品的邏輯由拖曳到刪除區的事件處理。

    renderDNACombinationSlots(); // 重新渲染所有組合槽
    if (typeof updateMonsterSnapshot === 'function') { // 更新怪獸快照顯示（如果身體部位與組合槽關聯）
        updateMonsterSnapshot(getSelectedMonster() || null);
    }
    console.log(`DNA 已移動。來源槽: ${sourceSlotIndexIfFromCombination}, 目標槽: ${targetSlotIndex}`);
}


/**
 * 將 DNA 從各種來源移動到主庫存的特定位置，並處理潛在的物品交換。
 * @param {object} dnaToMove - 要移動的 DNA 物件（可以是模板或實例數據）。
 * @param {{type: string, id: string | number | null, originalInventoryIndex?: number | null}} sourceInfo - 來源資訊（類型和原始ID/索引）。
 * @param {number} targetInventoryIndex - 目標庫存槽的索引（視覺位置）。
 * @param {object | null} itemAtTargetInventorySlot - 目標庫存槽中原本的物品（如果有的話）。
 */
function handleDnaMoveIntoInventory(dnaToMove, sourceInfo, targetInventoryIndex, itemAtTargetInventorySlot) {
    if (!dnaToMove) {
        console.error("handleDnaMoveIntoInventory: dnaToMove 不可為空。");
        return;
    }
    // 修改點：使用 gameState.MAX_INVENTORY_SLOTS 來獲取最大槽位數
    const MAX_INVENTORY_SLOTS = gameState.MAX_INVENTORY_SLOTS;
    // 修改點：刪除區的固定索引改為 11 (第12格)
    const DELETE_SLOT_INDEX = 11;

    if (targetInventoryIndex < 0 || targetInventoryIndex >= MAX_INVENTORY_SLOTS) {
        console.warn(`handleDnaMoveIntoInventory: 無效的目標庫存索引 ${targetInventoryIndex}。`);
        return;
    }
    // 移除：刪除區邏輯現在在 event-handlers.js 的 handleDrop 中處理
    // if (targetInventoryIndex === DELETE_SLOT_INDEX) {
    //     console.warn("handleDnaMoveIntoInventory: 無法直接移動物品到刪除區。應由 handleDrop 處理刪除邏輯。");
    //     return;
    // }

    // 複製一份當前的 playerOwnedDNA，以便操作。這將作為我們最終設置到 gameState 的版本。
    let currentOwnedDna = [...gameState.playerData.playerOwnedDNA];

    // 1. 從原始來源移除被拖曳的 DNA
    if (sourceInfo.type === 'inventory') {
        // 如果是庫存內部移動，將原位置清空為 null
        if (sourceInfo.originalInventoryIndex !== null && sourceInfo.originalInventoryIndex !== undefined) {
             currentOwnedDna[sourceInfo.originalInventoryIndex] = null;
        }
    } else if (sourceInfo.type === 'combination') {
        gameState.dnaCombinationSlots[sourceInfo.id] = null; // 清空組合槽
    } else if (sourceInfo.type === 'temporaryBackpack') {
        // 從臨時背包移除，並為其生成新的實例 ID 以便加入主庫存
        // 修改點：這裡不再 splice，因為臨時背包現在也是固定槽位
        if (sourceInfo.id !== null && sourceInfo.id !== undefined) {
            gameState.temporaryBackpack[sourceInfo.id] = null; // 清空臨時背包的源槽位
        }
        const baseIdForNewInstance = dnaToMove.baseId || dnaToMove.id || `temp_template_${Date.now()}`;
        dnaToMove = { 
            ...dnaToMove, 
            id: `dna_inst_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            baseId: baseIdForNewInstance
        };
    }

    // 2. 處理目標槽位原本的物品 (如果存在)
    if (itemAtTargetInventorySlot && itemAtTargetInventorySlot.id) { // 如果目標槽位有物品
        // 將目標槽位原本的物品退回原拖曳位置，或找一個空位
        let returnIndex = sourceInfo.originalInventoryIndex; // 優先返回原位
        if (returnIndex === null || returnIndex === undefined || returnIndex === DELETE_SLOT_INDEX || currentOwnedDna[returnIndex] !== null) {
            // 如果原位無效、是刪除區、或原位已被佔用（例如從組合槽或臨時背包拖曳過來），則找第一個空位
            returnIndex = currentOwnedDna.indexOf(null);
            if (returnIndex === -1) {
                // 如果沒有空位，則添加到末尾 (不應該發生，因為庫存有固定數量且會優先找空位)
                console.warn("Inventory full, item at target could not be returned to a free slot.");
                // 這裡可以選擇：1. 丟棄物品 2. 添加到臨時背包 3. 提示玩家
                // 目前選擇直接丟棄，但應更友善提示
                return; // 阻止操作
            }
        }
        currentOwnedDna[returnIndex] = itemAtTargetInventorySlot;
    }

    // 3. 將被拖曳的 DNA 插入到目標位置
    // 注意：這裡假設 targetInventoryIndex 是一個有效的可放置槽位（非刪除區）
    currentOwnedDna[targetInventoryIndex] = dnaToMove;
    
    // 更新 gameState
    gameState.playerData.playerOwnedDNA = currentOwnedDna;
    
    // 重新渲染所有受影響的 UI 組件
    renderPlayerDNAInventory();
    renderDNACombinationSlots(); // 可能因為組合槽有物品被移出
    renderTemporaryBackpack();   // 可能因為臨時背包有物品被移出
    updateMonsterSnapshot(getSelectedMonster() || null);
    
    console.log(`DNA 已成功移動到庫存槽位 ${targetInventoryIndex}。`);
}


/**
 * 從玩家庫存中永久刪除指定的 DNA。
 * @param {string} dnaInstanceId 要刪除的 DNA 實例 ID。
 */
function deleteDNAFromInventory(dnaInstanceId) {
    if (!dnaInstanceId) {
        console.warn("deleteDNAFromInventory: dnaInstanceId 不可為空。");
        return;
    }
    if (gameState.playerData && gameState.playerData.playerOwnedDNA) {
        const initialLength = gameState.playerData.playerOwnedDNA.length;
        const dnaIndexToDelete = gameState.playerData.playerOwnedDNA.findIndex(dna => dna && dna.id === dnaInstanceId); // 查找索引

        if (dnaIndexToDelete !== -1) {
            // 修改點：將被刪除的 DNA 槽位設置為 null，以保持陣列固定長度
            gameState.playerData.playerOwnedDNA[dnaIndexToDelete] = null;
            console.log(`DNA 實例 ${dnaInstanceId} 已從 gameState.playerData.playerOwnedDNA 中移除 (設為 null)。`);
        } else {
            console.warn(`嘗試刪除 DNA 實例 ${dnaInstanceId}，但在 gameState.playerData.playerOwnedDNA 中未找到。`);
        }
    } else {
        console.warn("deleteDNAFromInventory: playerData 或 playerOwnedDNA 未定義。");
    }
    // 注意：這裡只處理前端狀態。實際應用中，還需要呼叫後端 API 持久化刪除。
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
 * 處理修煉結束邏輯。
 * @param {Event} event 事件對象。
 * @param {string} monsterId 怪獸 ID。
 * @param {number} trainingStartTime 修煉開始時間戳。
 * @param {number} trainingDuration 修煉總時長 (毫秒)。
 */
async function handleEndCultivationClick(event, monsterId, trainingStartTime, trainingDuration) {
    event.stopPropagation();
    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (!monster) {
        showFeedbackModal('錯誤', '找不到指定的怪獸。');
        return;
    }

    const now = Date.now();
    const elapsedTimeSeconds = Math.floor((now - trainingStartTime) / 1000); // 實際修煉秒數
    const totalDurationSeconds = trainingDuration / 1000;

    // 如果時間未到，可以選擇提示用戶是否強制結束
    if (elapsedTimeSeconds < totalDurationSeconds) {
        showConfirmationModal(
            '提前結束修煉',
            `怪獸 ${monster.nickname} 的修煉時間尚未結束 (${totalDurationSeconds - elapsedTimeSeconds}秒剩餘)。提前結束將無法獲得完整獎勵。確定要結束嗎？`,
            async () => {
                await handleCompleteCultivation(monsterId, elapsedTimeSeconds); // 傳入實際修煉秒數
            },
            'danger', // confirmButtonClass
            '強制結束'     // confirmButtonText
        );
    } else {
        // 時間已到，直接結算
        await handleCompleteCultivation(monsterId, totalDurationSeconds); // 傳入完整時長
    }
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
                const result = await disassembleMonster(monsterId); // api-client.js
                if (result && result.success) {
                    // 後端應該返回更新後的 farmedMonsters (如果有的話) 和獲得的 DNA
                    // 前端需要更新 gameState.playerData.farmedMonsters
                    // 並將獲得的 DNA 加入臨時背包或主庫存
                    if (result.returned_dna_templates_info && result.returned_dna_templates_info.length > 0) {
                        result.returned_dna_templates_info.forEach(dnaTemplateInfo => {
                            // 假設 dnaTemplateInfo 包含足夠信息以重建或查找完整的 DNA 模板
                            const fullTemplate = gameState.gameConfigs.dna_fragments.find(df => df.name === dnaTemplateInfo.name && df.rarity === dnaTemplateInfo.rarity);
                            if (fullTemplate) {
                                addDnaToTemporaryBackpack(fullTemplate); // 加入臨時背包
                            }
                        });
                         renderTemporaryBackpack(); // 更新臨時背包UI
                    }
                    await refreshPlayerData(); // 確保刷新玩家數據，包括農場列表
                    showFeedbackModal('放生成功', `${result.message || monster.nickname + " 已成功放生。"} ${result.returned_dna_templates_info && result.returned_dna_templates_info.length > 0 ? '獲得了新的DNA碎片！請查看臨時背包。' : ''}`);
                } else {
                    showFeedbackModal('放生失敗', result.error || '放生怪獸時發生錯誤。');
                }
            } catch (error) {
                showFeedbackModal('放生失敗', `請求錯誤: ${error.message}`);
            }
        },
        'danger', // confirmButtonClass
        '確定放生', // confirmButtonText
        monster // 傳遞怪獸資料以便在確認彈窗中顯示圖片
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
        const result = await completeCultivation(monsterId, durationSeconds); // api-client.js

        if (result && result.success) {
            // 更新前端的怪獸狀態 (技能等)
            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            if (monsterInFarm) {
                monsterInFarm.skills = result.updated_monster_skills || monsterInFarm.skills;
                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = false; // 標記修煉結束
                monsterInFarm.farmStatus.trainingStartTime = null;
                monsterInFarm.farmStatus.trainingDuration = null;
                 // 確保修煉完成後更新農場狀態為非修煉中
                if(monsterInFarm.farmStatus && monsterInFarm.farmStatus.hasOwnProperty('isTraining')) {
                    monsterInFarm.farmStatus.isTraining = false;
                }
            }
            renderMonsterFarm(); // 更新農場UI
            updateMonsterSnapshot(getSelectedMonster() || getDefaultSelectedMonster()); // 更新主快照


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
            gameState.lastCultivationResult = result; // 保存完整結果以便後續處理
            if (result.items_obtained && result.items_obtained.length > 0) {
                itemsHtml = "<ul>";
                result.items_obtained.forEach(item => {
                    // 假設 item 是 DNA 模板對象
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

            // 處理學習新技能的邏輯
            if (result.learned_new_skill_template) {
                promptLearnNewSkill(monsterId, result.learned_new_skill_template, monsterInFarm ? monsterInFarm.skills : []);
            }

        } else {
            showFeedbackModal('修煉失敗', result.error || '完成修煉時發生錯誤。');
             const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            if (monsterInFarm && monsterInFarm.farmStatus) { // 安全檢查
                monsterInFarm.farmStatus.isTraining = false;
            }
            renderMonsterFarm(); // 同步UI
        }
    } catch (error) {
        showFeedbackModal('修煉失敗', `請求錯誤: ${error.message}`);
        const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
        if (monsterInFarm && monsterInFarm.farmStatus) { // 安全檢查
            monsterInFarm.farmStatus.isTraining = false;
        }
        renderMonsterFarm(); // 同步UI
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
            async () => { // onConfirm
                try {
                    showFeedbackModal('學習中...', `正在為 ${monster.nickname} 學習新技能...`, true);
                    const result = await replaceMonsterSkill(monsterId, null, newSkillTemplate); // slotIndex is null for learning to new slot
                    if (result && result.success) {
                        await refreshPlayerData(); // 刷新數據以包含新技能
                        showFeedbackModal('學習成功！', `${monster.nickname} 成功學習了 ${newSkillTemplate.name}！`);
                    } else {
                        showFeedbackModal('學習失敗', result.error || '學習新技能時發生錯誤。');
                    }
                } catch (error) {
                    showFeedbackModal('學習失敗', `請求錯誤: ${error.message}`);
                }
            },
            'success', // confirmButtonClass
            '學習'     // confirmButtonText
        );
    } else {
        message += `但技能槽已滿 (${currentSkills.length}/${maxSkills})。是否要替換一个現有技能來學習它？<br><br>選擇要替換的技能：`;

        let skillOptionsHtml = '<div class="my-2 space-y-1">'; // 使用 space-y-1 增加按鈕間距
        currentSkills.forEach((skill, index) => {
            skillOptionsHtml += `
                <button class="skill-replace-option-btn button secondary text-sm p-1 w-full text-left" data-skill-slot="${index}">
                    替換：${skill.name} (Lv.${skill.level || 1})
                </button>`;
        });
        skillOptionsHtml += '</div>';
        message += skillOptionsHtml;

        // 使用 Feedback Modal 進行更複雜的交互
        showFeedbackModal(
            '領悟新技能 - 技能槽已滿',
            message,
            false, // isLoading
            null,  // monsterDetails
            [{ text: '不學習', class: 'secondary', onClick: () => { hideModal('feedback-modal');} }] // 僅提供一個關閉按鈕，實際操作由技能按鈕觸發
        );

        // 為動態添加的按鈕綁定事件
        const feedbackModalBody = DOMElements.feedbackModal.querySelector('.modal-body'); // 確保選擇正確的 body
        if (feedbackModalBody) {
            feedbackModalBody.querySelectorAll('.skill-replace-option-btn').forEach(button => {
                button.onclick = async () => {
                    const slotToReplace = parseInt(button.dataset.skillSlot, 10);
                    hideModal('feedback-modal'); // 先關閉選擇彈窗
                    try {
                        showFeedbackModal('替換技能中...', `正在為 ${monster.nickname} 替換技能中...`, true);
                        const result = await replaceMonsterSkill(monsterId, slotToReplace, newSkillTemplate);
                        if (result && result.success) {
                            await refreshPlayerData();
                            showFeedbackModal('替換成功！', `${monster.nickname} 成功學習了 ${newSkillTemplate.name}，替換了原技能！`);
                        } else {
                            showFeedbackModal('替換失敗', result.error || '學習新技能時發生錯誤。');
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
            addDnaToTemporaryBackpack(itemTemplate); // itemTemplate 應該是 DNA 模板對象
        });
        renderTemporaryBackpack();
        gameState.lastCultivationResult.items_obtained = []; // 清空已處理的物品
        // showFeedbackModal('提示', '所有修煉拾獲物品已加入臨時背包。'); // 可以在按鈕文字變化時隱含此信息
        if (DOMElements.addAllToTempBackpackBtn) {
            DOMElements.addAllToTempBackpackBtn.disabled = true;
            DOMElements.addAllToTempBackpackBtn.textContent = "已全數加入背包";
        }
    }
}

/**
 * 將指定的 DNA 模板加入臨時背包。
 * @param {object} dnaTemplate DNA 模板對象。
 */
function addDnaToTemporaryBackpack(dnaTemplate) {
    if (!dnaTemplate || !dnaTemplate.id) { // 確保 dnaTemplate 和其 id 存在 
        console.warn("addDnaToTemporaryBackpack: 無效的 dnaTemplate 或缺少 id。", dnaTemplate);
        return;
    }
    // 修改點：如果臨時背包已滿，則不添加，並尋找第一個空位放置
    const MAX_TEMP_SLOTS = 9; // 與 ui.js 中的 MAX_TEMP_SLOTS 保持一致
    
    let freeSlotIndex = -1;
    for (let i = 0; i < MAX_TEMP_SLOTS; i++) {
        // 檢查槽位是否為 null (空閒)
        if (gameState.temporaryBackpack[i] === null || gameState.temporaryBackpack[i] === undefined) {
            freeSlotIndex = i;
            break;
        }
    }

    if (freeSlotIndex !== -1) {
        gameState.temporaryBackpack[freeSlotIndex] = {
            type: 'dna', // 標記物品類型
            data: { ...dnaTemplate }, // 儲存 DNA 模板的完整數據
        };
        renderTemporaryBackpack(); // 更新臨時背包的 UI
        console.log(`DNA 模板 ${dnaTemplate.name} (ID: ${dnaTemplate.id}) 已加入臨時背包槽位 ${freeSlotIndex}。`);
    } else {
        showFeedbackModal('背包已滿', '臨時背包已滿，無法再拾取物品。請清理後再試。');
        console.warn("Temporary backpack is full. Cannot add new item.");
    }
}

/**
 * 清空臨時背包。
 */
function clearTemporaryBackpack() {
    // 修改點：清空臨時背包現在是將所有槽位設置為 null
    const MAX_TEMP_SLOTS = 9; // 與 ui.js 中的 MAX_TEMP_SLOTS 保持一致
    gameState.temporaryBackpack = Array(MAX_TEMP_SLOTS).fill(null);
    renderTemporaryBackpack();
    console.log("臨時背包已清空。");
}

/**
 * 處理從臨時背包移動物品到主 DNA 庫存。
 * (此函數目前由 renderTemporaryBackpack 中的 onClick 調用，用於快速移動到末尾)
 * @param {number} tempBackpackIndex 物品在臨時背包中的索引。
 */
async function handleMoveFromTempBackpackToInventory(tempBackpackIndex) {
    if (tempBackpackIndex < 0 || tempBackpackIndex >= gameState.temporaryBackpack.length) {
        console.warn("handleMoveFromTempBackpackToInventory: 索引越界。");
        return;
    }

    const itemToMove = gameState.temporaryBackpack[tempBackpackIndex];
    // 修改點：檢查物品是否存在於槽位
    if (itemToMove && itemToMove.type === 'dna' && itemToMove.data) {
        // 尋找第一個空位來放置，如果沒有空位則提示庫存滿
        const MAX_INVENTORY_SLOTS = gameState.MAX_INVENTORY_SLOTS;
        // 修改點：刪除區的固定索引改為 11 (第12格)
        const DELETE_SLOT_INDEX = 11; 
        let freeSlotIndex = -1;
        for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
            if (i === DELETE_SLOT_INDEX) continue; // 跳過刪除區
            if (gameState.playerData.playerOwnedDNA[i] === null) {
                freeSlotIndex = i;
                break;
            }
        }

        if (freeSlotIndex !== -1) {
            // 從臨時背包移除該物品 (設置為 null)
            gameState.temporaryBackpack[tempBackpackIndex] = null;
            
            // 將物品放入主庫存的空位
            gameState.playerData.playerOwnedDNA[freeSlotIndex] = { 
                ...itemToMove.data, 
                id: `dna_inst_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                baseId: itemToMove.data.baseId || itemToMove.data.id
            };
            
            renderTemporaryBackpack();
            renderPlayerDNAInventory();
            updateMonsterSnapshot(getSelectedMonster() || null);
            await savePlayerData(gameState.playerId, gameState.playerData); // 保存玩家資料

            showFeedbackModal(
                '物品已移動',
                `${itemToMove.data.name} 已成功移至您的 DNA 庫存。建議盡快保存遊戲進度以確保資料同步。`,
                false, null,
                [{ text: '好的', class: 'primary' }]
            );
        } else {
            showFeedbackModal('庫存已滿', '您的 DNA 庫存已滿，無法再從臨時背包移動物品。請清理後再試。');
        }
    } else {
        // 修改點：當槽位為 null 時，不進行錯誤日誌，因為這是預期行為
        if (itemToMove === null) {
            console.log(`handleMoveFromTempBackpackToInventory: 槽位 ${tempBackpackIndex} 為空。`);
        } else {
            showFeedbackModal('錯誤', '無法移動未知類型或資料不完整的物品。');
            console.error("handleMoveFromTempBackpackToInventory: 物品類型不是 'dna' 或缺少 data 屬性。", itemToMove);
        }
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

    const numberOfDraws = 1; // 目前固定抽1張，未來可以調整
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
        // 簡易隨機抽取，未來可以加入權重等複雜邏輯
        const randomIndex = Math.floor(Math.random() * allPossibleDna.length);
        const drawnTemplate = { ...allPossibleDna[randomIndex] }; // 複製模板
        drawnItems.push(drawnTemplate);
    }

    gameState.lastDnaDrawResult = drawnItems; // 保存抽卡結果，以便後續加入背包
    hideModal('feedback-modal');
    showDnaDrawModal(drawnItems); // 顯示抽卡結果彈窗
}


/**
 * 根據當前篩選條件過濾並渲染怪獸排行榜。
 */
function filterAndRenderMonsterLeaderboard() {
    if (!gameState.monsterLeaderboard) return;
    let filteredLeaderboard = gameState.monsterLeaderboard.filter(monster => !monster.isNPC); // 排除NPC
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
    if (!gameState.playerId) {
        console.warn("refreshPlayerData: 未找到 playerId，無法刷新。");
        return;
    }
    try {
        const playerData = await getPlayerData(gameState.playerId);
        if (playerData) {
            updateGameState({ playerData: playerData }); // 更新整個玩家數據
            // 重新渲染所有依賴玩家數據的UI組件
            renderPlayerDNAInventory();
            renderMonsterFarm();
            const currentSelectedMonster = getSelectedMonster() || getDefaultSelectedMonster();
            updateMonsterSnapshot(currentSelectedMonster);
            // 如果有其他如玩家統計數據的UI，也應在此更新
            console.log("玩家資料已刷新並同步至 gameState。");
        } else {
            console.warn("refreshPlayerData: 從後端獲取的玩家數據為空或無效。");
        }
    } catch (error) {
        showFeedbackModal('同步失敗', `無法更新玩家資料: ${error.message}`);
        console.error("refreshPlayerData 錯誤:", error);
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
        // 設定玩家怪獸為「戰鬥中」狀態
        playerMonster.farmStatus = playerMonster.farmStatus || {};
        playerMonster.farmStatus.isBattling = true;
        renderMonsterFarm(); // 更新農場UI，顯示出戰狀態
        updateMonsterSnapshot(playerMonster); // 將出戰怪獸顯示在快照區

        if (npcId) { // 挑戰 NPC (假設 NPC 資料在 gameConfigs 中)
            const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
            opponentMonster = npcTemplates.find(npc => npc.id === npcId);
            if (!opponentMonster) throw new Error(`找不到ID為 ${npcId} 的NPC對手。`);
            // NPC怪獸可能需要深拷貝或特殊處理以避免修改原始設定
            opponentMonster = JSON.parse(JSON.stringify(opponentMonster));
            opponentMonster.isNPC = true; // 確保標記為NPC
        } else if (monsterIdToChallenge && ownerId && ownerId !== gameState.playerId) { // 挑戰其他玩家的怪獸
            const opponentPlayerData = await getPlayerData(ownerId);
            if (!opponentPlayerData || !opponentPlayerData.farmedMonsters) throw new Error('無法獲取對手玩家資料。');
            opponentMonster = opponentPlayerData.farmedMonsters.find(m => m.id === monsterIdToChallenge);
            if (!opponentMonster) throw new Error(`找不到對手玩家的怪獸ID ${monsterIdToChallenge}。`);
        } else {
            // 判斷是否是從農場點擊“挑戰對手”（即 monsterIdToChallenge 是自己農場的怪獸，需要找PVE對手）
            if (monsterIdToChallenge && (!ownerId || ownerId === gameState.playerId) && !npcId) {
                 // 這裡應該觸發尋找 PVE 對手的邏輯，例如從 NPC 列表隨機選取一個
                const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
                if (npcTemplates.length > 0) {
                    opponentMonster = JSON.parse(JSON.stringify(npcTemplates[Math.floor(Math.random() * npcTemplates.length)]));
                    opponentMonster.isNPC = true; // 確保標記為NPC
                    console.log(`為玩家怪獸 ${playerMonster.nickname} 匹配到NPC對手: ${opponentMonster.nickname}`);
                } else {
                    throw new Error('沒有可用的NPC對手進行挑戰。');
                }
            } else {
                 throw new Error('無效的挑戰目標。請從排行榜選擇其他玩家的怪獸，或從農場發起PVE挑戰。');
            }
        }
        hideModal('feedback-modal');

        if (!opponentMonster) {
            showFeedbackModal('錯誤', '未能找到合適的挑戰對手。');
            // 如果未能找到對手，需要重置玩家怪獸的戰鬥狀態
            playerMonster.farmStatus.isBattling = false;
            renderMonsterFarm();
            updateMonsterSnapshot(playerMonster);
            return;
        }

        gameState.battleTargetMonster = opponentMonster; // 保存對手資訊

        showConfirmationModal(
            '確認出戰',
            `您確定要讓 ${playerMonster.nickname} (評價: ${playerMonster.score}) 挑戰 ${opponentMonster.nickname} (評價: ${opponentMonster.score}) 嗎？`,
            async () => {
                try {
                    showFeedbackModal('戰鬥中...', '正在激烈交鋒...', true);
                    const battleResult = await simulateBattle(playerMonster, opponentMonster);

                    // 戰鬥結束，重置玩家怪獸的戰鬥狀態
                    playerMonster.farmStatus.isBattling = false; 
                    renderMonsterFarm(); // 再次更新農場UI，清除戰鬥狀態

                    showBattleLogModal(battleResult.log,
                        battleResult.winner_id === playerMonster.id ? playerMonster.nickname : (battleResult.winner_id === opponentMonster.id ? opponentMonster.nickname : null),
                        battleResult.loser_id === playerMonster.id ? playerMonster.nickname : (battleResult.loser_id === opponentMonster.id ? opponentMonster.nickname : null)
                    );

                    // 戰後處理，例如更新玩家戰績、怪獸經驗等
                    if (battleResult.winner_id === playerMonster.id) {
                        // 玩家怪獸勝利的邏輯
                        console.log(`${playerMonster.nickname} 勝利!`);
                        if (battleResult.absorption_details && battleResult.absorption_details.updated_winning_monster) {
                             // 如果有吸收，則使用吸收後的怪獸數據更新
                            const absorbedMonsterData = battleResult.absorption_details.updated_winning_monster;
                            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === absorbedMonsterData.id);
                            if (monsterInFarm) {
                                Object.assign(monsterInFarm, absorbedMonsterData); // 更新農場中的怪獸數據
                                console.log(`怪獸 ${monsterInFarm.nickname} 在吸收後已更新。`);
                            }
                             // 更新玩家的DNA庫存 (如果吸收時有返回新DNA)
                            if (battleResult.absorption_details.updated_player_owned_dna) {
                                gameState.playerData.playerOwnedDNA = battleResult.absorption_details.updated_player_owned_dna;
                                renderPlayerDNAInventory();
                            }
                        }

                    } else if (battleResult.loser_id === playerMonster.id) {
                        // 玩家怪獸失敗的邏輯
                        console.log(`${playerMonster.nickname} 失敗.`);
                    }
                    // 統一刷新玩家數據，因為戰績等總會變動
                    await refreshPlayerData();
                    // renderMonsterFarm(); // 確保農場列表（包括技能經驗）更新 (已在上面調用)
                    updateMonsterSnapshot(getSelectedMonster());


                    hideModal('feedback-modal');

                } catch (battleError) {
                    showFeedbackModal('戰鬥失敗', `模擬戰鬥時發生錯誤: ${battleError.message}`);
                    console.error("模擬戰鬥錯誤:", battleError);
                    // 如果戰鬥失敗，也需要重置玩家怪獸的戰鬥狀態
                    playerMonster.farmStatus.isBattling = false; 
                    renderMonsterFarm();
                    updateMonsterSnapshot(playerMonster);
                }
            },
            'primary', // confirmButtonClass
            '開始戰鬥'   // confirmButtonText
        );

    } catch (error) {
        showFeedbackModal('錯誤', `準備戰鬥失敗: ${error.message}`);
        console.error("準備戰鬥錯誤:", error);
        // 如果準備戰鬥失敗，也需要重置玩家怪獸的戰鬥狀態
        if (playerMonster) {
            playerMonster.farmStatus.isBattling = false;
            renderMonsterFarm();
            updateMonsterSnapshot(playerMonster);
        }
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
        data = [...data]; // 確保操作的是副本
    }

    if (tableType === 'monster') {
        data = data.filter(item => !item.isNPC); // 確保排除NPC
    }


    data.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        // 特定處理 'resume' (勝/敗) 排序
        if (key === 'resume') {
            const winsA = valA?.wins || 0;
            const winsB = valB?.wins || 0;
            const lossesA = valA?.losses || 0;
            const lossesB = valB?.losses || 0;

            // 主要按勝場排序，勝場相同則按敗場少者優先 (升序時)
            if (winsA !== winsB) {
                return order === 'asc' ? winsA - winsB : winsB - winsA;
            }
            return order === 'asc' ? lossesA - lossesB : lossesB - lossesA; // 敗場少者優先
        }

        // 處理字串排序 (如 nickname)
        if (key === 'owner_nickname' || key === 'nickname' || typeof valA === 'string') {
            valA = String(valA || '').toLowerCase(); // 轉小寫並處理 null/undefined
            valB = String(valB || '').toLowerCase();
            return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        // 處理數值排序 (如 score, rank, wins, losses)
        valA = Number(valA || 0); // 處理 null/undefined
        valB = Number(valB || 0);
        return order === 'asc' ? valA - valB : valB - valA;
    });

    if (typeof updateLeaderboardTable === 'function') {
        updateLeaderboardTable(tableType, data);
    }
}


console.log("Game logic module loaded with updated drag-drop logic and other enhancements.");
