// js/game-logic.js

// 注意：此檔案依賴 gameState, DOMElements, API client 函數, UI 更新函數等

// --- 【新增】檢查並顯示新稱號的專用函式 ---
function checkAndShowNewTitleModal(playerData) {
    // 檢查後端回傳的資料中是否包含 newly_awarded_titles 欄位
    if (playerData && playerData.newly_awarded_titles && playerData.newly_awarded_titles.length > 0) {
        const newTitle = playerData.newly_awarded_titles[0]; // 暫時先只顯示第一個獲得的
        if (typeof showFeedbackModal === 'function') {
            showFeedbackModal(
                '榮譽加身！',
                '', 
                false,
                null,
                [{ text: '開啟我的冒險！', class: 'success' }],
                {
                    type: 'title',
                    name: newTitle.name,
                    description: newTitle.description,
                    buffs: newTitle.buffs,
                    bannerUrl: gameState.assetPaths.images.modals.titleAward
                }
            );
        }
    }
}


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
    
    const combinationSlots = gameState.playerData?.dnaCombinationSlots;
    if (!combinationSlots) {
        console.error("moveDnaToCombinationSlot: 玩家資料中的組合槽未定義。");
        return;
    }

    if (targetSlotIndex < 0 || targetSlotIndex >= combinationSlots.length) {
        console.warn(`moveDnaToCombinationSlot: 無效的目標槽位索引 ${targetSlotIndex}。`);
        renderDNACombinationSlots();
        return;
    }

    if (sourceSlotIndexIfFromCombination !== null && sourceSlotIndexIfFromCombination === targetSlotIndex) {
        renderDNACombinationSlots();
        return;
    }

    const itemCurrentlyInTargetSlot = combinationSlots && combinationSlots.length > targetSlotIndex ? combinationSlots?.[targetSlotIndex] : null;
    if (combinationSlots) combinationSlots[targetSlotIndex] = draggedDnaObject;

    if (sourceSlotIndexIfFromCombination !== null && combinationSlots) {
        combinationSlots[sourceSlotIndexIfFromCombination] = itemCurrentlyInTargetSlot;
    }
    
    renderDNACombinationSlots();
    if (typeof updateMonsterSnapshot === 'function') {
        updateMonsterSnapshot(getSelectedMonster() || null);
    }
    console.log(`DNA 已移動。來源槽: ${sourceSlotIndexIfFromCombination}, 目標槽: ${targetSlotIndex}`);
}


/**
 * 將 DNA 從各種來源移動到主庫存的特定位置，並處理潛在的物品交換。
 * @param {object} dnaToMove - 要移動的 DNA 物件。
 * @param {{type: string, id: string | number | null, originalInventoryIndex?: number | null}} sourceInfo - 來源資訊。
 * @param {number} targetInventoryIndex - 目標庫存槽的索引。
 * @param {object | null} itemAtTargetInventorySlot - 目標庫存槽中原本的物品。
 */
function handleDnaMoveIntoInventory(dnaToMove, sourceInfo, targetInventoryIndex, itemAtTargetInventorySlot) {
    if (!dnaToMove) {
        console.error("handleDnaMoveIntoInventory: dnaToMove 不可為空。");
        return;
    }
    const MAX_INVENTORY_SLOTS = gameState.MAX_INVENTORY_SLOTS;
    const DELETE_SLOT_INDEX = 11;

    if (targetInventoryIndex < 0 || targetInventoryIndex >= MAX_INVENTORY_SLOTS) {
        console.warn(`handleDnaMoveIntoInventory: 無效的目標庫存索引 ${targetInventoryIndex}。`);
        return;
    }

    let currentOwnedDna = [...(gameState.playerData.playerOwnedDNA || [])];

    if (sourceInfo.type === 'inventory') {
        if (sourceInfo.originalInventoryIndex !== null && sourceInfo.originalInventoryIndex !== undefined) {
             currentOwnedDna[sourceInfo.originalInventoryIndex] = null;
        }
    } else if (sourceInfo.type === 'combination') {
        if (gameState.playerData?.dnaCombinationSlots) {
            gameState.playerData.dnaCombinationSlots[sourceInfo.id] = null;
        }
    } else if (sourceInfo.type === 'temporaryBackpack') {
        if (sourceInfo.id !== null && sourceInfo.id !== undefined) {
            gameState.temporaryBackpack[sourceInfo.id] = null;
        }
        const baseIdForNewInstance = dnaToMove.baseId || dnaToMove.id || `temp_template_${Date.now()}`;
        dnaToMove = { 
            ...dnaToMove, 
            id: `dna_inst_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            baseId: baseIdForNewInstance
        };
    }

    if (itemAtTargetInventorySlot && itemAtTargetInventorySlot.id) {
        let returnIndex = sourceInfo.originalInventoryIndex;
        if (returnIndex === null || returnIndex === undefined || returnIndex === DELETE_SLOT_INDEX || currentOwnedDna[returnIndex] !== null) {
            returnIndex = currentOwnedDna.indexOf(null);
            if (returnIndex === -1) {
                console.warn("Inventory full, item at target could not be returned to a free slot.");
                return;
            }
        }
        currentOwnedDna[returnIndex] = itemAtTargetInventorySlot;
    }

    currentOwnedDna[targetInventoryIndex] = dnaToMove;
    
    gameState.playerData.playerOwnedDNA = currentOwnedDna;
    
    renderPlayerDNAInventory();
    renderDNACombinationSlots();
    renderTemporaryBackpack();
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
        const dnaIndexToDelete = gameState.playerData.playerOwnedDNA.findIndex(dna => dna && dna.id === dnaInstanceId);

        if (dnaIndexToDelete !== -1) {
            gameState.playerData.playerOwnedDNA[dnaIndexToDelete] = null;
            console.log(`DNA 實例 ${dnaInstanceId} 已從 gameState.playerData.playerOwnedDNA 中移除 (設為 null)。`);
        } else {
            console.warn(`嘗試刪除 DNA 實例 ${dnaInstanceId}，但在 gameState.playerData.playerOwnedDNA 中未找到。`);
        }
    } else {
        console.warn("deleteDNAFromInventory: playerData 或 playerOwnedDNA 未定義。");
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
    if (DOMElements.cultivationMonsterNameText) {
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        DOMElements.cultivationMonsterNameText.textContent = monster.nickname;
        DOMElements.cultivationMonsterNameText.className = `text-rarity-${rarityKey}`;
    }

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
    const elapsedTimeSeconds = Math.floor((now - trainingStartTime) / 1000);
    const totalDurationSeconds = trainingDuration / 1000;

    if (elapsedTimeSeconds < totalDurationSeconds) {
        const displayName = getMonsterDisplayName(monster, gameState.gameConfigs);

        showConfirmationModal(
            '提前結束修煉',
            `怪獸 ${displayName} 的修煉時間尚未結束 (${totalDurationSeconds - elapsedTimeSeconds}秒剩餘)。提前結束將無法獲得完整獎勵。確定要結束嗎？`,
            async () => {
                await handleCompleteCultivation(monsterId, elapsedTimeSeconds);
            },
            { confirmButtonClass: 'danger', confirmButtonText: '強制結束' }
        );
    } else {
        await handleCompleteCultivation(monsterId, totalDurationSeconds);
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
        `您確定要放生怪獸 "${monster.nickname}" 嗎？此為單向操作，一旦放生，牠將永遠離開，無法復原。`,
        async () => {
            try {
                showFeedbackModal('處理中...', `正在放生 ${monster.nickname}...`, true);
                const result = await disassembleMonster(monsterId);
                if (result && result.success) {
                    await refreshPlayerData();
                    const successMessage = `「${monster.nickname}」已回歸塵土。隨著一陣微光閃爍，牠的生命能量與構成的DNA碎片已消散在風中，僅留下一段無聲的回憶。`;
                    showFeedbackModal('放生成功', successMessage);
                } else {
                    showFeedbackModal('放生失敗', result.error || '放生怪獸時發生錯誤。');
                }
            } catch (error) {
                showFeedbackModal('放生失敗', `請求錯誤: ${error.message}`);
            }
        },
        { 
            confirmButtonClass: 'danger', 
            confirmButtonText: '確定放生', 
            monsterToRelease: monster 
        }
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
            await refreshPlayerData();
            
            gameState.lastCultivationResult = result;
            hideModal('feedback-modal');

            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            
            if (typeof updateTrainingResultsModal === 'function') {
                updateTrainingResultsModal(result, monsterInFarm ? monsterInFarm.nickname : '怪獸');
            } else {
                console.error("updateTrainingResultsModal is not defined. Cannot show results.");
                showFeedbackModal('錯誤', '無法顯示修煉成果。');
            }

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

    const skillDescription = newSkillTemplate.description || newSkillTemplate.story || '暫無描述。';
    
    const newSkillLink = `<a href="#" class="skill-name-link" data-skill-name="${newSkillTemplate.name}" style="text-decoration: none; color: var(--rarity-legendary-text); font-weight: bold;">${newSkillTemplate.name}</a>`;

    const maxSkills = gameState.gameConfigs.value_settings?.max_monster_skills || 3;
    
    let currentSkillsHtml = '<div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">';
    currentSkillsHtml += `<h5 style="font-weight: bold; color: var(--text-secondary); margin-bottom: 0.5rem;">${monster.nickname} 的目前技能：</h5>`;
    if (currentSkills.length > 0) {
        currentSkillsHtml += '<ul>';
        currentSkills.forEach(skill => {
            currentSkillsHtml += `<li style="font-size: 0.9em; margin-bottom: 2px;">- <a href="#" class="skill-name-link" data-skill-name="${skill.name}" style="text-decoration: none; color: inherit;">${skill.name}</a> (Lv.${skill.level || 1})</li>`;
        });
        currentSkillsHtml += '</ul>';
    } else {
        currentSkillsHtml += '<p style="font-size: 0.9em; color: var(--text-secondary);">無</p>';
    }
    currentSkillsHtml += '</div>';

    let message = `${monster.nickname} 領悟了新技能：${newSkillLink} (威力: ${newSkillTemplate.power}, MP: ${newSkillTemplate.mp_cost || 0})！<br>`;
    message += `<p class="text-sm text-[var(--text-secondary)] mt-2" style="font-size: 0.9em !important;">技能簡述：${skillDescription}</p>`;
    
    message += `<div id="skill-details-injection-point" class="mt-2"></div>`;
    
    message += currentSkillsHtml;

    const onLearn = async (slotToReplace = null) => {
        const actionText = slotToReplace !== null ? '替換技能中...' : '學習中...';
        const successText = slotToReplace !== null ? `${monster.nickname} 成功學習了 ${newSkillTemplate.name}，替換了原技能！` : `${monster.nickname} 成功學習了 ${newSkillTemplate.name}！`;
        const errorText = slotToReplace !== null ? '替換技能失敗' : '學習失敗';
        
        try {
            showFeedbackModal(actionText, `正在為 ${monster.nickname} 處理技能...`, true);
            const result = await replaceMonsterSkill(monsterId, slotToReplace, newSkillTemplate);
            if (result && result.success) {
                await refreshPlayerData();
                showFeedbackModal('操作成功！', successText);
            } else {
                showFeedbackModal(errorText, result.error || '學習新技能時發生錯誤。');
            }
        } catch (error) {
            showFeedbackModal(errorText, `請求錯誤: ${error.message}`);
        }
    };

    if (currentSkills.length < maxSkills) {
        message += "<p class='mt-4'>是否要學習這個技能？</p>";
        showFeedbackModal(
            '領悟新技能！',
            message,
            false,
            null,
            [
                { text: '學習', class: 'success', onClick: () => onLearn(null) },
                { text: '放棄', class: 'secondary', onClick: () => {} }
            ]
        );
    } else {
        message += `<p class='mt-4'>但技能槽已滿 (${currentSkills.length}/${maxSkills})。是否要替換一个現有技能來學習它？請選擇要替換的技能：</p>`;

        let skillOptionsHtml = '<div class="my-2 space-y-1">';
        currentSkills.forEach((skill) => {
            const currentSkillDescription = skill.story || skill.description || '無描述';
            const existingSkillLink = `<a href="#" class="skill-name-link" data-skill-name="${skill.name}" style="text-decoration: none; color: inherit;">${skill.name} (Lv.${skill.level || 1})</a>`;
            skillOptionsHtml += `
                <div class="skill-replace-option button secondary text-sm p-2 w-full text-left" data-skill-name="${skill.name}">
                    <div class="flex justify-between items-center">
                        <span>替換：${existingSkillLink}</span>
                        <button class="learn-replace-btn button success text-xs py-1 px-2" data-skill-name="${skill.name}">選擇</button>
                    </div>
                    <span class="block text-xs text-[var(--text-secondary)] pl-2 mt-1" style="font-size: 0.85em !important;">└ ${currentSkillDescription}</span>
                </div>`;
        });
        skillOptionsHtml += '</div>';
        message += skillOptionsHtml;

        showFeedbackModal(
            '領悟新技能 - 技能槽已滿',
            message,
            false,
            null,
            [{ text: '不學習', class: 'secondary', onClick: () => { hideModal('feedback-modal'); } }]
        );

        const feedbackModalBody = DOMElements.feedbackModal.querySelector('.modal-body');
        if (feedbackModalBody) {
            feedbackModalBody.querySelectorAll('.learn-replace-btn').forEach((button, index) => {
                button.onclick = (e) => {
                    e.stopPropagation();
                    hideModal('feedback-modal');
                    onLearn(index);
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
    if (!dnaTemplate || !dnaTemplate.id) {
        console.warn("addDnaToTemporaryBackpack: 無效的 dnaTemplate 或缺少 id。", dnaTemplate);
        return;
    }
    const MAX_TEMP_SLOTS = 9;
    
    let freeSlotIndex = -1;
    for (let i = 0; i < MAX_TEMP_SLOTS; i++) {
        if (gameState.temporaryBackpack[i] === null || gameState.temporaryBackpack[i] === undefined) {
            freeSlotIndex = i;
            break;
        }
    }

    if (freeSlotIndex !== -1) {
        gameState.temporaryBackpack[freeSlotIndex] = {
            type: 'dna',
            data: { ...dnaTemplate },
        };
        renderTemporaryBackpack();
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
    const MAX_TEMP_SLOTS = 9;
    gameState.temporaryBackpack = Array(MAX_TEMP_SLOTS).fill(null);
    renderTemporaryBackpack();
    console.log("臨時背包已清空。");
}

/**
 * 處理從臨時背包移動物品到主 DNA 庫存。
 * @param {number} tempBackpackIndex 物品在臨時背包中的索引。
 */
async function handleMoveFromTempBackpackToInventory(tempBackpackIndex) {
    if (tempBackpackIndex < 0 || tempBackpackIndex >= gameState.temporaryBackpack.length) {
        console.warn("handleMoveFromTempBackpackToInventory: 索引越界。");
        return;
    }

    const itemToMove = gameState.temporaryBackpack[tempBackpackIndex];
    if (itemToMove && itemToMove.type === 'dna' && itemToMove.data) {
        const MAX_INVENTORY_SLOTS = gameState.MAX_INVENTORY_SLOTS;
        const DELETE_SLOT_INDEX = 11; 
        let freeSlotIndex = -1;
        for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
            if (i === DELETE_SLOT_INDEX) continue;
            if (gameState.playerData.playerOwnedDNA[i] === null) {
                freeSlotIndex = i;
                break;
            }
        }

        if (freeSlotIndex !== -1) {
            gameState.temporaryBackpack[tempBackpackIndex] = null;
            
            gameState.playerData.playerOwnedDNA[freeSlotIndex] = { 
                ...itemToMove.data, 
                id: `dna_inst_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                baseId: itemToMove.data.baseId || itemToMove.data.id
            };
            
            renderTemporaryBackpack();
            renderPlayerDNAInventory();
            updateMonsterSnapshot(getSelectedMonster() || null);
            await savePlayerData(gameState.playerId, gameState.playerData);
            
        } else {
            showFeedbackModal('庫存已滿', '您的 DNA 庫存已滿，無法再從臨時背包移動物品。請清理後再試。');
        }
    } else {
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
    showFeedbackModal('DNA抽取中...', '正在搜尋稀有的DNA序列...', true);

    try {
        const result = await drawFreeDNA();
        
        if (result && result.success && result.drawn_dna) {
            const drawnItems = result.drawn_dna;
            gameState.lastDnaDrawResult = drawnItems; 
            hideModal('feedback-modal');
            showDnaDrawModal(drawnItems);
        } else {
            throw new Error(result.error || '從伺服器返回的抽卡數據無效。');
        }
    } catch (error) {
        console.error("DNA 抽取失敗:", error);
        hideModal('feedback-modal');
        showFeedbackModal('抽卡失敗', `與伺服器通信時發生錯誤: ${error.message}`);
    }
}


async function handleDeployMonsterClick(monsterId) {
    if (!monsterId || !gameState.playerData) {
        console.error("handleDeployMonsterClick: 無效的怪獸ID或玩家資料不存在。");
        return;
    }
    
    const newMonsterToDeploy = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (!newMonsterToDeploy) {
        console.error(`handleDeployMonsterClick: 在農場中找不到ID為 ${monsterId} 的怪獸。`);
        return;
    }

    if (newMonsterToDeploy.farmStatus?.isTraining) {
        showFeedbackModal('提示', '該怪獸正在修煉中，需要先召回才可以指派出戰。');
        return;
    }
    
    if (newMonsterToDeploy.hp < newMonsterToDeploy.initial_max_hp * 0.25) {
        showFeedbackModal('無法出戰', '瀕死狀態無法出戰，請先治療您的怪獸。');
        return;
    }

    const currentSelectedId = gameState.selectedMonsterId;
    if (currentSelectedId === monsterId) {
        return;
    }

    const proceedWithDeployment = async () => {
        gameState.selectedMonsterId = monsterId;
        gameState.playerData.selectedMonsterId = monsterId;
        
        if (typeof updateMonsterSnapshot === 'function') {
            updateMonsterSnapshot(newMonsterToDeploy);
        }
        if (typeof renderMonsterFarm === 'function') {
            renderMonsterFarm();
        }

        try {
            await savePlayerData(gameState.playerId, gameState.playerData);
            console.log(`玩家 ${gameState.playerId} 已將怪獸 ${monsterId} 設為出戰並儲存。`);
        } catch (error) {
            console.error("設置出戰怪獸並儲存時發生錯誤:", error);
            showFeedbackModal('錯誤', `設置出戰怪獸失敗: ${error.message}`);
        }
    };
    
    if (currentSelectedId) {
        showFeedbackModal('怪獸交接中...', '主人請稍候...🐾', true);
        try {
            const championsData = await getChampionsLeaderboard();
            hideModal('feedback-modal');
            
            const isCurrentChampion = championsData.some(champ => champ && champ.id === currentSelectedId);

            if (isCurrentChampion) {
                showConfirmationModal(
                    '確認更換出戰',
                    '您目前出戰的怪獸正位於冠軍殿堂中。更換出戰怪獸將會自動放棄目前的冠軍席位。您確定要更換嗎？',
                    proceedWithDeployment, 
                    { confirmButtonClass: 'danger', confirmButtonText: '確定更換' }
                );
            } else {
                await proceedWithDeployment(); 
            }
        } catch (error) {
            hideModal('feedback-modal');
            showFeedbackModal('錯誤', '檢查冠軍席位時發生錯誤，請稍後再試。');
        }
    } else {
        await proceedWithDeployment(); 
    }
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
    if (!gameState.playerId) {
        console.warn("refreshPlayerData: 未找到 playerId，無法刷新。");
        return;
    }
    try {
        const playerData = await getPlayerData(gameState.playerId);
        if (playerData) {
            updateGameState({ playerData: playerData });
            renderPlayerDNAInventory();
            renderMonsterFarm();
            const currentSelectedMonster = getSelectedMonster() || getDefaultSelectedMonster();
            updateMonsterSnapshot(currentSelectedMonster);
            
            if (typeof updateMailNotificationDot === 'function') {
                updateMailNotificationDot();
            }
            
            // --- 核心修改處 START ---
            if (typeof updatePlayerCurrencyDisplay === 'function') {
                updatePlayerCurrencyDisplay(playerData.playerStats.gold || 0);
            }
            // --- 核心修改處 END ---

            if (typeof checkAndShowNewTitleModal === 'function') {
                checkAndShowNewTitleModal(playerData);
            }

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
async function handleChallengeMonsterClick(event, monsterIdToChallenge = null, ownerId = null, npcId = null, ownerNickname = null) {
    if(event) event.stopPropagation();

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
    if (playerMonster.farmStatus?.isTraining) {
         showFeedbackModal('提示', `${playerMonster.nickname} 目前正在修煉中，無法出戰。`);
        return;
    }

    let opponentMonster = null;

    try {
        showFeedbackModal('準備戰鬥...', '正在獲取對手資訊...', true);
        
        playerMonster.farmStatus = { ...playerMonster.farmStatus, isBattling: true };
        renderMonsterFarm();
        updateMonsterSnapshot(playerMonster);

        if (npcId) {
            const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
            opponentMonster = npcTemplates.find(npc => npc.id === npcId);
            if (!opponentMonster) throw new Error(`找不到ID為 ${npcId} 的NPC對手。`);
            opponentMonster = JSON.parse(JSON.stringify(opponentMonster));
            opponentMonster.isNPC = true;
        } else if (monsterIdToChallenge && ownerId && ownerId !== gameState.playerId) {
            const opponentPlayerData = await getPlayerData(ownerId);
            if (!opponentPlayerData || !opponentPlayerData.farmedMonsters) throw new Error('無法獲取對手玩家資料。');
            opponentMonster = opponentPlayerData.farmedMonsters.find(m => m.id === monsterIdToChallenge);
            if (!opponentMonster) throw new Error(`找不到對手玩家的怪獸ID ${monsterIdToChallenge}。`);
        } else {
            const npcTemplates = gameState.gameConfigs?.npc_monsters || [];
            if (npcTemplates.length > 0) {
                opponentMonster = JSON.parse(JSON.stringify(npcTemplates[Math.floor(Math.random() * npcTemplates.length)]));
                opponentMonster.isNPC = true;
                console.log(`為玩家怪獸 ${playerMonster.nickname} 匹配到NPC對手: ${opponentMonster.nickname}`);
            } else {
                throw new Error('沒有可用的NPC對手進行挑戰。');
            }
        }
        hideModal('feedback-modal');

        if (!opponentMonster) {
            showFeedbackModal('錯誤', '未能找到合適的挑戰對手。');
            playerMonster.farmStatus.isBattling = false;
            renderMonsterFarm();
            updateMonsterSnapshot(playerMonster);
            return;
        }

        gameState.battleTargetMonster = opponentMonster;

        showConfirmationModal(
            '確認出戰',
            `您確定要讓 ${playerMonster.nickname} (評價: ${playerMonster.score}) 挑戰 ${opponentMonster.nickname} (評價: ${opponentMonster.score}) 嗎？`,
            async () => {
                try {
                    showFeedbackModal('戰鬥中...', '正在激烈交鋒...', true);
                    
                    const { battle_result: battleResult } = await simulateBattle({
                        player_monster_data: playerMonster,
                        opponent_monster_data: opponentMonster,
                        opponent_owner_id: ownerId,
                        opponent_owner_nickname: ownerNickname
                    });

                    await refreshPlayerData(); 
                    updateMonsterSnapshot(getSelectedMonster()); 

                    showBattleLogModal(battleResult);

                    hideModal('feedback-modal');

                } catch (battleError) {
                    showFeedbackModal('戰鬥失敗', `模擬戰鬥時發生錯誤: ${battleError.message}`);
                    console.error("模擬戰鬥錯誤:", battleError);
                    await refreshPlayerData(); 
                }
            },
            { confirmButtonClass: 'primary', confirmButtonText: '開始戰鬥' }
        );

    } catch (error) {
        showFeedbackModal('錯誤', `準備戰鬥失敗: ${error.message}`);
        console.error("準備戰鬥錯誤:", error);
        playerMonster.farmStatus.isBattling = false;
        renderMonsterFarm();
        updateMonsterSnapshot(playerMonster);
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
        const containerId = `${tableType}-leaderboard-table-container`;
        updateLeaderboardTable(tableType, data, containerId);
    }
}


console.log("Game logic module loaded with updated drag-drop logic and other enhancements.");

async function fetchAndDisplayMonsterLeaderboard() {
    try {
        showFeedbackModal('載入中...', '正在獲取怪獸排行榜...', true);
        const leaderboardData = await getMonsterLeaderboard(20); // Fetch top 20
        
        updateGameState({ monsterLeaderboard: leaderboardData || [] });
        
        filterAndRenderMonsterLeaderboard(); 
        
        if (DOMElements.monsterLeaderboardElementTabs && DOMElements.monsterLeaderboardElementTabs.innerHTML.trim() === '') {
            const allElements = ['all', '火', '水', '木', '金', '土', '光', '暗', '毒', '風', '混', '無'];
            updateMonsterLeaderboardElementTabs(allElements);
        }

        hideModal('feedback-modal');
    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('載入失敗', `無法獲取怪獸排行榜: ${error.message}`);
    }
}

async function handleClickInventory(event) {
    const itemElement = event.target.closest('.dna-item.occupied');
    if (!itemElement) return;

    const inventoryIndex = parseInt(itemElement.dataset.inventoryIndex, 10);
    const dnaObject = gameState.playerData.playerOwnedDNA[inventoryIndex];
    if (!dnaObject) return;
    
    // Find the first empty slot in the combination area
    const targetSlotIndex = gameState.playerData.dnaCombinationSlots.findIndex(slot => slot === null);

    if (targetSlotIndex !== -1) {
        // Move the DNA object
        gameState.playerData.playerOwnedDNA[inventoryIndex] = null;
        gameState.playerData.dnaCombinationSlots[targetSlotIndex] = dnaObject;
        
        // Re-render UI
        renderPlayerDNAInventory();
        renderDNACombinationSlots();
        
        // Save the new state
        await savePlayerData(gameState.playerId, gameState.playerData);
    } else {
        showFeedbackModal('提示', 'DNA組合欄位已滿！');
    }
}

async function handleClickCombinationSlot(event) {
    const slotElement = event.target.closest('.dna-slot.occupied');
    if (!slotElement) return;

    const slotIndex = parseInt(slotElement.dataset.slotIndex, 10);
    const dnaObject = gameState.playerData.dnaCombinationSlots[slotIndex];
    if (!dnaObject) return;

    // Find the first empty slot in the main inventory, skipping the delete slot
    let targetInventoryIndex = -1;
    for (let i = 0; i < gameState.MAX_INVENTORY_SLOTS; i++) {
        // Index 11 is the delete slot
        if (i !== 11 && !gameState.playerData.playerOwnedDNA[i]) {
            targetInventoryIndex = i;
            break;
        }
    }

    if (targetInventoryIndex !== -1) {
        // Move the DNA object
        gameState.playerData.dnaCombinationSlots[slotIndex] = null;
        gameState.playerData.playerOwnedDNA[targetInventoryIndex] = dnaObject;
        
        // Re-render UI
        renderPlayerDNAInventory();
        renderDNACombinationSlots();
        
        // Save the new state
        await savePlayerData(gameState.playerId, gameState.playerData);
    } else {
        showFeedbackModal('提示', 'DNA碎片庫存區已滿！');
    }
}
