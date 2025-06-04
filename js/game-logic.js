// js/game-logic.js

// 注意：此檔案依賴 gameState, DOMElements, API client 函數, UI 更新函數等

/**
 * 將 DNA 從來源（庫存或另一個組合槽）移動到指定的組合槽。
 * @param {string} dnaInstanceId 要移動的 DNA 實例 ID。
 * @param {'inventory' | 'combination'} source 來源 ('inventory' 或 'combination')。
 * @param {number | null} sourceSlotIndex 如果來源是組合槽，則為其索引。
 * @param {number} targetSlotIndex 目標組合槽的索引。
 */
function moveDnaToCombinationSlot(dnaInstanceId, source, sourceSlotIndex, targetSlotIndex) {
    let dnaToMove = null;

    if (source === 'inventory') {
        dnaToMove = gameState.playerData.playerOwnedDNA.find(d => d.id === dnaInstanceId);
    } else if (source === 'combination' && sourceSlotIndex !== null && sourceSlotIndex !== targetSlotIndex) {
        dnaToMove = gameState.dnaCombinationSlots[sourceSlotIndex];
        if (dnaToMove) {
            gameState.dnaCombinationSlots[sourceSlotIndex] = null; // 從原槽移除
        }
    }

    if (!dnaToMove) {
        console.warn(`moveDnaToCombinationSlot: 無法找到 ID 為 ${dnaInstanceId} 的 DNA。`);
        return;
    }

    // 檢查目標槽是否已有 DNA，如果有，則與其交換 (如果來源也是組合槽)
    // 或者，如果目標槽有 DNA 且來源是庫存，則先將目標槽的 DNA "放回" (概念上)
    // 簡化處理：如果目標槽有東西，先清空它 (如果它來自組合槽) 或提示 (如果它來自庫存)
    // 這裡的邏輯是，如果目標槽有東西，並且我們是從組合槽拖過來的，那麼就交換
    // 如果是從庫存拖過來，而目標槽有東西，則不允许（或者需要更複雜的“彈回”邏輯）

    if (gameState.dnaCombinationSlots[targetSlotIndex] && source === 'inventory') {
        showFeedbackModal('操作失敗', '組合槽已被佔用。請先清空目標槽位。');
        // 如果是從組合槽拖過來，需要把原先的dna放回去
        if (source === 'combination' && dnaToMove) {
             gameState.dnaCombinationSlots[sourceSlotIndex] = dnaToMove;
        }
        renderDNACombinationSlots();
        return;
    }
    
    // 交換邏輯 (如果拖曳來源和目標都是組合槽)
    if (source === 'combination' && gameState.dnaCombinationSlots[targetSlotIndex]) {
        const tempDna = gameState.dnaCombinationSlots[targetSlotIndex];
        gameState.dnaCombinationSlots[targetSlotIndex] = dnaToMove;
        if (sourceSlotIndex !== null) { // 確保 sourceSlotIndex 有效
             gameState.dnaCombinationSlots[sourceSlotIndex] = tempDna; // 將目標槽原有的DNA放回來源槽
        }
    } else {
        // 正常放置
        gameState.dnaCombinationSlots[targetSlotIndex] = dnaToMove;
    }

    renderDNACombinationSlots(); // 更新 UI
}

/**
 * 從玩家庫存中刪除指定的 DNA。
 * 注意：此函數僅更新 gameState，實際的持久化儲存應通過 API 調用後端完成。
 * 但在此架構中，我們通常是操作後直接調用保存整個 playerData。
 * @param {string} dnaInstanceId 要刪除的 DNA 實例 ID。
 */
function deleteDNAFromInventory(dnaInstanceId) {
    if (gameState.playerData && gameState.playerData.playerOwnedDNA) {
        gameState.playerData.playerOwnedDNA = gameState.playerData.playerOwnedDNA.filter(dna => dna.id !== dnaInstanceId);
        // 之後需要調用保存玩家數據的函數
        // savePlayerDataToServer(); // 假設有這個函數
        console.log(`DNA ${dnaInstanceId} 已從 gameState 中移除。`);
    }
}

/**
 * 處理玩家點擊農場中怪獸的“修煉”按鈕。
 * @param {Event} event 事件對象。
 * @param {string} monsterId 怪獸 ID。
 */
function handleCultivateMonsterClick(event, monsterId) {
    event.stopPropagation(); // 防止觸發父級的點擊事件 (例如打開怪獸快照)
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
    DOMElements.cultivationMonsterNameText.textContent = monster.nickname;
    // 可以在這裡從 gameConfigs 中獲取最大修煉時長並更新 UI
    const maxTime = gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 3600; // 預設1小時
    DOMElements.maxCultivationTimeText.textContent = maxTime; 
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
                const result = await disassembleMonster(monsterId); // api-client.js
                if (result && result.success) {
                    // 後端已處理怪獸移除，現在處理前端返回的DNA
                    if (result.returned_dna_templates_info && result.returned_dna_templates_info.length > 0) {
                        result.returned_dna_templates_info.forEach(dnaTemplateInfo => {
                             // 這裡的 dnaTemplateInfo 只有 name 和 rarity, 需要完整的 template 來加入背包
                             // 假設後端返回的 returned_dna_templates (在 MD_services.py 的 disassemble_monster_service) 包含完整模板
                             // 我們需要從 gameConfigs 中找到完整的模板
                            const fullTemplate = gameState.gameConfigs.dna_fragments.find(df => df.name === dnaTemplateInfo.name && df.rarity === dnaTemplateInfo.rarity);
                            if (fullTemplate) {
                                addDnaToTemporaryBackpack(fullTemplate); // 將分解獲得的DNA加入臨時背包
                            }
                        });
                         renderTemporaryBackpack();
                    }
                    await refreshPlayerData(); // 刷新玩家數據
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
        monster // 傳入怪獸物件以在確認彈窗中顯示圖片
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
            // 更新本地怪獸數據 (技能等)
            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            if (monsterInFarm) {
                monsterInFarm.skills = result.updated_monster_skills || monsterInFarm.skills;
                monsterInFarm.farmStatus.isTraining = false;
                monsterInFarm.farmStatus.trainingStartTime = null;
                monsterInFarm.farmStatus.trainingDuration = null;
                // 可以根據 result.stat_gains 更新怪獸的其他數值
            }
            renderMonsterFarm(); // 更新農場UI
            updateMonsterSnapshot(getSelectedMonster() || getDefaultSelectedMonster()); // 更新快照

            // 顯示修煉成果 Modal
            DOMElements.trainingResultsModalTitle.textContent = `${monsterInFarm ? monsterInFarm.nickname : '怪獸'}的修煉成果`;
            DOMElements.trainingStoryResult.textContent = result.adventure_story || "沒有特別的故事發生。";
            
            let growthHtml = "<ul>";
            if (result.skill_updates_log && result.skill_updates_log.length > 0) {
                result.skill_updates_log.forEach(log => growthHtml += `<li>${log}</li>`);
            } else {
                growthHtml += "<li>技能沒有明顯變化。</li>";
            }
            growthHtml += "</ul>";
            DOMElements.trainingGrowthResult.innerHTML = growthHtml;

            let itemsHtml = "<p>沒有拾獲任何物品。</p>";
            gameState.lastCultivationResult = result; // 保存結果供後續使用 (例如添加到背包)
            if (result.items_obtained && result.items_obtained.length > 0) {
                itemsHtml = "<ul>";
                result.items_obtained.forEach(item => {
                    // 假設 item 是 DNAFragment 模板
                    itemsHtml += `<li>拾獲: ${item.name} (${item.rarity} ${item.type}屬性)</li>`;
                });
                itemsHtml += "</ul>";
                DOMElements.addAllToTempBackpackBtn.disabled = false;
                DOMElements.addAllToTempBackpackBtn.textContent = "一鍵全數加入背包";
            } else {
                DOMElements.addAllToTempBackpackBtn.disabled = true;
                DOMElements.addAllToTempBackpackBtn.textContent = "無物品可加入";
            }
            DOMElements.trainingItemsResult.innerHTML = itemsHtml;
            
            hideModal('feedback-modal'); // 隱藏"結算中"
            showModal('training-results-modal');

            // 如果有新技能領悟
            if (result.learned_new_skill_template) {
                promptLearnNewSkill(monsterId, result.learned_new_skill_template, monsterInFarm.skills);
            }

        } else {
            showFeedbackModal('修煉失敗', result.error || '完成修煉時發生錯誤。');
            // 重置修煉狀態
            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
            if (monsterInFarm) {
                monsterInFarm.farmStatus.isTraining = false;
            }
            renderMonsterFarm();
        }
    } catch (error) {
        showFeedbackModal('修煉失敗', `請求錯誤: ${error.message}`);
        const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
        if (monsterInFarm) {
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
            async () => { // 確認學習
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
            'success', // 確認按鈕樣式
            '學習'
        );
    } else {
        message += `但技能槽已滿 (${currentSkills.length}/${maxSkills})。是否要替換一個現有技能來學習它？<br><br>選擇要替換的技能：`;
        
        let skillOptionsHtml = '<div class="my-2">';
        currentSkills.forEach((skill, index) => {
            skillOptionsHtml += `
                <button class="skill-replace-option-btn secondary text-sm p-1 mr-1 mb-1" data-skill-slot="${index}">
                    替換：${skill.name} (Lv.${skill.level})
                </button>`;
        });
        skillOptionsHtml += '</div>';
        message += skillOptionsHtml;

        // 使用 FeedbackModal 來呈現更複雜的選項
        showFeedbackModal(
            '領悟新技能 - 技能槽已滿',
            message,
            false,
            null,
            [{ text: '不學習', class: 'secondary', onClick: () => {} }] // "不學習" 按鈕
        );

        // 為動態生成的替換按鈕添加事件監聽器
        const feedbackModalBody = DOMElements.feedbackModal.querySelector('.modal-body');
        if (feedbackModalBody) {
            feedbackModalBody.querySelectorAll('.skill-replace-option-btn').forEach(button => {
                button.onclick = async () => {
                    const slotToReplace = parseInt(button.dataset.skillSlot, 10);
                    hideModal('feedback-modal'); // 先關閉選擇彈窗
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
            // 假設 itemTemplate 是 DNAFragment 模板
            addDnaToTemporaryBackpack(itemTemplate);
        });
        renderTemporaryBackpack(); // 更新臨時背包UI
        // 清空已處理的拾取物，防止重複添加
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
    // 為了簡化，我們假設臨時背包只存 DNA，並且每個 DNA 模板都是一個獨立的物品
    // 如果需要堆疊，則需要更複雜的邏輯
    gameState.temporaryBackpack.push({
        type: 'dna', // 標識物品類型
        data: { ...dnaTemplate }, // 複製模板數據
        // quantity: 1 // 如果需要數量
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
        // 創建一個新的實例 ID 給這個 DNA
        const newInstanceId = `dna_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const newOwnedDna = {
            ...itemToMove.data, // 原始模板數據
            id: newInstanceId,  // 新的實例 ID
            baseId: itemToMove.data.id // 保留原始模板 ID 作為 baseId
        };
        gameState.playerData.playerOwnedDNA.push(newOwnedDna);
        gameState.temporaryBackpack.splice(tempBackpackIndex, 1); // 從臨時背包移除

        renderPlayerDNAInventory();
        renderTemporaryBackpack();
        
        // 提示用戶保存數據
        showFeedbackModal(
            '物品已移動', 
            `${itemToMove.data.name} 已移至您的 DNA 庫存。建議盡快保存遊戲進度。`,
            false, null,
            [{ text: '好的', class: 'primary' }]
        );
        // 實際保存應由玩家手動觸發或定期自動保存
        // await savePlayerDataToServer(); 
    } else {
        showFeedbackModal('錯誤', '無法移動未知類型的物品。');
    }
}

/**
 * 處理抽卡按鈕點擊。
 */
async function handleDrawDNAClick() {
    // 實際的抽卡邏輯：
    // 1. 檢查玩家是否有足夠資源 (如果需要消耗資源)
    // 2. 調用後端 API 進行抽卡 (如果抽卡結果由後端決定)
    // 3. 或者，如果抽卡邏輯在前端，則直接在這裡實現
    // 4. 更新玩家的 DNA 庫存或臨時背包
    // 5. 更新 UI

    // 簡化版：前端隨機從 gameConfigs.dna_fragments 中抽取 N 個
    if (!gameState.gameConfigs || !gameState.gameConfigs.dna_fragments) {
        showFeedbackModal('抽卡失敗', '遊戲設定尚未載入，無法進行DNA抽取。');
        return;
    }

    const numberOfDraws = 1; // 一次抽1個
    const drawnItems = [];
    const allPossibleDna = gameState.gameConfigs.dna_fragments;

    if (allPossibleDna.length === 0) {
        showFeedbackModal('提示', 'DNA池是空的，無法抽取。');
        return;
    }

    for (let i = 0; i < numberOfDraws; i++) {
        // 可以根據稀有度等因素加權抽取，這裡先簡單隨機
        const randomIndex = Math.floor(Math.random() * allPossibleDna.length);
        drawnItems.push(allPossibleDna[randomIndex]);
    }
    
    gameState.lastDnaDrawResult = drawnItems; // 保存本次抽卡結果
    showDnaDrawModal(drawnItems); // 顯示抽卡結果彈窗
}


/**
 * 根據當前篩選條件過濾並渲染怪獸排行榜。
 */
function filterAndRenderMonsterLeaderboard() {
    if (!gameState.monsterLeaderboard) return;
    let filteredLeaderboard = gameState.monsterLeaderboard;
    if (gameState.currentMonsterLeaderboardElementFilter !== 'all') {
        filteredLeaderboard = gameState.monsterLeaderboard.filter(monster => 
            monster.elements && monster.elements.includes(gameState.currentMonsterLeaderboardElementFilter)
        );
    }
    updateLeaderboardTable('monster', filteredLeaderboard);
}

/**
 * 刷新玩家數據 (從後端重新獲取)。
 */
async function refreshPlayerData() {
    if (!gameState.playerId) return;
    try {
        // showFeedbackModal('同步中...', '正在更新玩家資料...', true); // 可選的載入提示
        const playerData = await getPlayerData(gameState.playerId); // api-client.js
        if (playerData) {
            updateGameState({ playerData: playerData });
            // 更新所有相關的 UI
            renderPlayerDNAInventory();
            renderMonsterFarm();
            const currentSelectedMonster = getSelectedMonster() || getDefaultSelectedMonster();
            updateMonsterSnapshot(currentSelectedMonster);
        }
        // hideModal('feedback-modal');
    } catch (error) {
        showFeedbackModal('同步失敗', `無法更新玩家資料: ${error.message}`);
    }
}

/**
 * 處理挑戰按鈕點擊（來自農場、好友列表或排行榜）。
 * @param {Event} event - 點擊事件。
 * @param {string} [monsterIdToChallenge=null] - 如果是從農場或排行榜挑戰特定怪獸，傳入其ID。
 * @param {string} [ownerId=null] - 如果挑戰的是其他玩家的怪獸，傳入擁有者ID。
 * @param {string} [npcId=null] - 如果挑戰的是NPC，傳入NPC ID。
 */
async function handleChallengeMonsterClick(event, monsterIdToChallenge = null, ownerId = null, npcId = null) {
    event.stopPropagation(); // 防止冒泡
    
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
        if (npcId) { // 挑戰 NPC
            opponentMonster = gameState.gameConfigs.npc_monsters.find(npc => npc.id === npcId);
            if (!opponentMonster) throw new Error(`找不到ID為 ${npcId} 的NPC怪獸。`);
        } else if (monsterIdToChallenge && ownerId && ownerId !== gameState.playerId) { // 挑戰其他玩家的特定怪獸
            const opponentPlayerData = await getPlayerData(ownerId);
            if (!opponentPlayerData || !opponentPlayerData.farmedMonsters) throw new Error('無法獲取對手玩家資料。');
            opponentMonster = opponentPlayerData.farmedMonsters.find(m => m.id === monsterIdToChallenge);
            if (!opponentMonster) throw new Error(`找不到對手玩家的怪獸ID ${monsterIdToChallenge}。`);
        } else { // 預設情況：隨機挑戰一個NPC或排行榜上的怪獸 (如果沒有指定目標)
            // 簡化：如果沒有明確目標，就隨機選一個NPC
            if (gameState.gameConfigs.npc_monsters && gameState.gameConfigs.npc_monsters.length > 0) {
                opponentMonster = gameState.gameConfigs.npc_monsters[Math.floor(Math.random() * gameState.gameConfigs.npc_monsters.length)];
            } else {
                throw new Error('沒有可挑戰的對手。');
            }
        }
        hideModal('feedback-modal');

        // 確認對手資料已獲取
        if (!opponentMonster) {
            showFeedbackModal('錯誤', '未能找到合適的挑戰對手。');
            return;
        }
        
        gameState.battleTargetMonster = opponentMonster; // 保存對手資料

        showConfirmationModal(
            '確認出戰',
            `您確定要讓 ${playerMonster.nickname} (評價: ${playerMonster.score}) 挑戰 ${opponentMonster.nickname} (評價: ${opponentMonster.score}) 嗎？`,
            async () => {
                try {
                    showFeedbackModal('戰鬥中...', '正在激烈交鋒...', true);
                    const battleResult = await simulateBattle(playerMonster, opponentMonster);
                    
                    // 處理戰鬥結果
                    // 1. 更新玩家怪獸的 HP/MP (如果後端沒返回，則前端模擬)
                    // 2. 更新戰績 (後端應已處理，前端可刷新數據)
                    // 3. 處理吸收 (如果勝利且對方非NPC，後端應已處理)
                    // 4. 顯示戰鬥日誌
                    
                    showBattleLogModal(battleResult.log, 
                        battleResult.winner_id === playerMonster.id ? playerMonster.nickname : (battleResult.winner_id === opponentMonster.id ? opponentMonster.nickname : null),
                        battleResult.loser_id === playerMonster.id ? playerMonster.nickname : (battleResult.loser_id === opponentMonster.id ? opponentMonster.nickname : null)
                    );
                    
                    // 刷新玩家數據以獲取最新狀態 (戰績、可能的吸收結果、技能經驗)
                    await refreshPlayerData();
                    hideModal('feedback-modal'); // 隱藏 "戰鬥中"

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


console.log("Game logic module loaded.");
