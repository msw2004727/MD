// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js), gameState (來自 game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

let draggedElement = null;
let draggedDnaObject = null;
let draggedSourceType = null;
let draggedSourceIdentifier = null; // instanceId for inventory, slotIndex for combination, tempItemIndex for temp backpack

function handleDragStart(event) {
    const target = event.target.closest('.dna-item, .dna-slot.occupied, .temp-backpack-slot.occupied');
    if (!target) {
        event.preventDefault(); return;
    }
    draggedElement = target;
    draggedSourceType = target.dataset.dnaSource;

    console.log("Drag Start - Element:", target, "Source Type:", draggedSourceType, "Dataset:", JSON.parse(JSON.stringify(target.dataset)));

    if (draggedSourceType === 'inventory') {
        draggedSourceIdentifier = target.dataset.dnaId;
        if (!draggedSourceIdentifier) { console.warn("DragStart Inventory: Missing data-dna-id."); event.preventDefault(); return; }
        draggedDnaObject = gameState.playerData.playerOwnedDNA.find(d => d.id === draggedSourceIdentifier);
    } else if (draggedSourceType === 'combination') {
        draggedSourceIdentifier = parseInt(target.dataset.slotIndex, 10);
        if (isNaN(draggedSourceIdentifier)) { console.warn("DragStart Combination: Invalid data-slot-index."); event.preventDefault(); return; }
        draggedDnaObject = gameState.dnaCombinationSlots[draggedSourceIdentifier];
    } else if (draggedSourceType === 'temporaryBackpack') {
        draggedSourceIdentifier = parseInt(target.dataset.tempItemIndex, 10);
        if (isNaN(draggedSourceIdentifier)) { console.warn("DragStart TempBackpack: Invalid data-temp-item-index."); event.preventDefault(); return; }
        const tempItem = gameState.temporaryBackpack[draggedSourceIdentifier];
        draggedDnaObject = tempItem ? tempItem.data : null;
        if (draggedDnaObject && tempItem && tempItem.instanceId) { // 如果臨時物品有原始實例ID
            draggedDnaObject.originalInstanceIdIfFromInventory = tempItem.instanceId;
        }
        // 確保拖曳的對象有一個 id (可以是模板ID或臨時ID)
        if (draggedDnaObject && !draggedDnaObject.id) {
            draggedDnaObject.id = draggedDnaObject.baseId || `temp_template_for_drag_${Date.now()}`;
        }
    }

    if (!draggedDnaObject) {
        console.warn(`DragStart: Could not retrieve DNA object for source ${draggedSourceType} with identifier ${draggedSourceIdentifier}.`);
        event.preventDefault();
        return;
    }
    event.dataTransfer.setData('text/plain', draggedSourceIdentifier ? String(draggedSourceIdentifier) : 'unknown');
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { if (draggedElement) draggedElement.classList.add('dragging'); }, 0);
    console.log(`Dragging ${draggedSourceType} item:`, JSON.parse(JSON.stringify(draggedDnaObject)));
}

function handleDragEnd(event) {
    if (draggedElement) draggedElement.classList.remove('dragging');
    draggedElement = null;
    draggedDnaObject = null;
    draggedSourceType = null;
    draggedSourceIdentifier = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const validTarget = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items, #temporary-backpack-items');
    if (validTarget) {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        validTarget.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items, #temporary-backpack-items');
    if (target && !target.contains(event.relatedTarget) && !target.classList.contains('dragging')) {
        target.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    const dropTargetElement = event.target.closest('.dna-slot, #inventory-items, .inventory-slot-empty, #inventory-delete-slot, #temporary-backpack-items, .temp-backpack-slot, .temp-backpack-slot.empty');

    if (!draggedDnaObject || !dropTargetElement) {
        console.warn("Drop: No dragged DNA object or invalid drop target.", { draggedDnaObject, dropTargetElement });
        handleDragEnd(event);
        return;
    }
    dropTargetElement.classList.remove('drag-over');
    console.log("--- Drop Event ---");
    console.log("Target Element:", dropTargetElement.id || dropTargetElement.className, dropTargetElement.dataset);
    console.log("Dragged DNA Data (cloned for processing):", JSON.parse(JSON.stringify(draggedDnaObject)));
    console.log("Original Source Type:", draggedSourceType, "Original Source ID/Index:", draggedSourceIdentifier);

    const dnaDataToMove = JSON.parse(JSON.stringify(draggedDnaObject)); // Deep copy for manipulation
    const sourceWas = { type: draggedSourceType, id: draggedSourceIdentifier }; // Preserve original source info

    // --- A. 處理刪除 ---
    if (dropTargetElement.id === 'inventory-delete-slot') {
        let itemNameToDelete = dnaDataToMove.name || "該DNA";
        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${itemNameToDelete}" 嗎？此操作無法復原。`, () => {
            if (sourceWas.type === 'inventory' && typeof sourceWas.id === 'string') {
                deleteDNAFromInventory(sourceWas.id);
                renderPlayerDNAInventory();
            } else if (sourceWas.type === 'combination' && typeof sourceWas.id === 'number') {
                const dnaFromSlot = gameState.dnaCombinationSlots[sourceWas.id];
                if (dnaFromSlot && dnaFromSlot.id && gameState.playerData.playerOwnedDNA.some(d => d.id === dnaFromSlot.id)) {
                    deleteDNAFromInventory(dnaFromSlot.id); // 從主庫存刪除
                    renderPlayerDNAInventory();
                }
                gameState.dnaCombinationSlots[sourceWas.id] = null;
                renderDNACombinationSlots();
            } else if (sourceWas.type === 'temporaryBackpack' && typeof sourceWas.id === 'number') {
                const tempItemOriginal = gameState.temporaryBackpack[sourceWas.id]; // Get before splice
                if (tempItemOriginal && tempItemOriginal.instanceId && gameState.playerData.playerOwnedDNA.some(d => d.id === tempItemOriginal.instanceId)) {
                    deleteDNAFromInventory(tempItemOriginal.instanceId);
                    renderPlayerDNAInventory();
                }
                gameState.temporaryBackpack.splice(sourceWas.id, 1);
                renderTemporaryBackpack();
            }
            updateMonsterSnapshot(getSelectedMonster() || null);
            showFeedbackModal('操作成功', `DNA "${itemNameToDelete}" 已被刪除。`);
        });
    }
    // --- B. 處理拖曳到組合槽 ---
    else if (dropTargetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        const dnaInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex] ? JSON.parse(JSON.stringify(gameState.dnaCombinationSlots[targetSlotIndex])) : null;

        // 1. 從源頭移除 (如果不是組合槽到組合槽的交換)
        if (sourceWas.type === 'inventory' && typeof sourceWas.id === 'string') {
            deleteDNAFromInventory(sourceWas.id);
            renderPlayerDNAInventory();
        } else if (sourceWas.type === 'temporaryBackpack' && typeof sourceWas.id === 'number') {
            gameState.temporaryBackpack.splice(sourceWas.id, 1);
            renderTemporaryBackpack();
        }
        // (組合槽之間的移動，源槽由 moveDnaToCombinationSlot 處理)

        // 2. 放置/交換到目標組合槽
        moveDnaToCombinationSlot(dnaDataToMove, (sourceWas.type === 'combination' ? sourceWas.id : null), targetSlotIndex);

        // 3. 如果目標槽原本有物品，且來源不是組合槽，則將目標槽原物品“退回”
        if (dnaInTargetSlot && sourceWas.type !== 'combination') {
            if (sourceWas.type === 'inventory') {
                 if (!gameState.playerData.playerOwnedDNA.find(d => d.id === dnaInTargetSlot.id)) {
                    gameState.playerData.playerOwnedDNA.push(dnaInTargetSlot);
                 }
                renderPlayerDNAInventory();
            } else if (sourceWas.type === 'temporaryBackpack') {
                const instanceIdToPreserve = dnaInTargetSlot.originalInstanceIdIfFromInventory || dnaInTargetSlot.id;
                gameState.temporaryBackpack.push({ type: 'dna', data: dnaInTargetSlot, instanceId: instanceIdToPreserve });
                renderTemporaryBackpack();
            }
        }
    }
    // --- C. 處理拖曳到庫存區 (包括空槽) ---
    else if (dropTargetElement.id === 'inventory-items' || dropTargetElement.classList.contains('inventory-slot-empty')) {
        let targetInventoryIndex = -1; // -1 表示添加到末尾
        if (dropTargetElement.classList.contains('inventory-slot-empty')) {
            // 嘗試獲取空槽的索引 (這需要UI渲染時為空槽也添加 data-slot-index 或類似標識)
            // 假設UI層為 inventory-slot-empty 也添加了 data-inventory-index
            const emptySlotIndexStr = dropTargetElement.dataset.inventoryIndex;
            if (emptySlotIndexStr) targetInventoryIndex = parseInt(emptySlotIndexStr, 10);
        }

        if (sourceWas.type === 'combination' && typeof sourceWas.id === 'number') {
            // 從組合槽移回庫存
            if (dnaDataToMove.id && !gameState.playerData.playerOwnedDNA.find(d => d.id === dnaDataToMove.id)) {
                // 插入到特定位置或添加到末尾
                if (targetInventoryIndex !== -1 && targetInventoryIndex < gameState.playerData.playerOwnedDNA.length) {
                    gameState.playerData.playerOwnedDNA.splice(targetInventoryIndex, 0, dnaDataToMove);
                } else {
                    gameState.playerData.playerOwnedDNA.push(dnaDataToMove);
                }
            }
            gameState.dnaCombinationSlots[sourceWas.id] = null;
            renderDNACombinationSlots();
            renderPlayerDNAInventory();
            updateMonsterSnapshot(getSelectedMonster() || null);
        } else if (sourceWas.type === 'temporaryBackpack' && typeof sourceWas.id === 'number') {
            // 從臨時背包移到庫存
            const templateData = dnaDataToMove;
            const baseIdForNewInstance = templateData.baseId || templateData.id;
            const newInstanceId = `dna_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            const dnaToAdd = { ...templateData, id: newInstanceId, baseId: baseIdForNewInstance };
            delete dnaToAdd.originalInstanceIdIfFromInventory;

            if (!gameState.playerData.playerOwnedDNA) gameState.playerData.playerOwnedDNA = [];
            if (targetInventoryIndex !== -1 && targetInventoryIndex < gameState.playerData.playerOwnedDNA.length) {
                gameState.playerData.playerOwnedDNA.splice(targetInventoryIndex, 0, dnaToAdd);
            } else {
                gameState.playerData.playerOwnedDNA.push(dnaToAdd);
            }
            gameState.temporaryBackpack.splice(sourceWas.id, 1);
            renderTemporaryBackpack();
            renderPlayerDNAInventory();
        } else if (sourceWas.type === 'inventory' && typeof sourceWas.id === 'string' && targetInventoryIndex !== -1) {
            // 庫存內部拖曳到特定空位
            const itemIndex = gameState.playerData.playerOwnedDNA.findIndex(d => d.id === sourceWas.id);
            if (itemIndex !== -1) {
                const [itemToReorder] = gameState.playerData.playerOwnedDNA.splice(itemIndex, 1);
                if (targetInventoryIndex < gameState.playerData.playerOwnedDNA.length) {
                     gameState.playerData.playerOwnedDNA.splice(targetInventoryIndex, 0, itemToReorder);
                } else {
                    gameState.playerData.playerOwnedDNA.push(itemToReorder); // 如果目標索引超出，則加到末尾
                }
                renderPlayerDNAInventory();
            }
        }
    }
    // --- D. 處理拖曳到臨時背包區 (包括空槽) ---
    else if (dropTargetElement.id === 'temporary-backpack-items' || dropTargetElement.classList.contains('temp-backpack-slot')) {
        let targetTempIndex = -1;
        if (dropTargetElement.classList.contains('temp-backpack-slot') && dropTargetElement.dataset.tempItemIndex) {
            targetTempIndex = parseInt(dropTargetElement.dataset.tempItemIndex, 10);
             // 如果拖到的是已佔用槽，則行為類似交換 (如果目標也是臨時背包物品) 或插入
        } else if (dropTargetElement.classList.contains('temp-backpack-slot') && dropTargetElement.classList.contains('empty')) {
            // 需要 UI 為空槽也提供索引
            const emptySlotIndexStr = dropTargetElement.dataset.emptyTempIndex; // 假設空槽有此類 data attribute
            if (emptySlotIndexStr) targetTempIndex = parseInt(emptySlotIndexStr, 10);
        }


        let itemToAddToTemp;
        if (dnaDataToMove.originalInstanceIdIfFromInventory) { // 如果帶有原始實例ID，就用那個
            itemToAddToTemp = { type: 'dna', data: dnaDataToMove, instanceId: dnaDataToMove.originalInstanceIdIfFromInventory };
        } else { // 否則，它就是一個模板或者從組合槽來的（可能已有實例ID）
            itemToAddToTemp = { type: 'dna', data: dnaDataToMove, instanceId: dnaDataToMove.id };
        }
        delete itemToAddToTemp.data.originalInstanceIdIfFromInventory; // 清理


        if (sourceWas.type === 'inventory' && typeof sourceWas.id === 'string') {
            deleteDNAFromInventory(sourceWas.id);
            renderPlayerDNAInventory();
        } else if (sourceWas.type === 'combination' && typeof sourceWas.id === 'number') {
            gameState.dnaCombinationSlots[sourceWas.id] = null;
            renderDNACombinationSlots();
            updateMonsterSnapshot(getSelectedMonster() || null);
        } else if (sourceWas.type === 'temporaryBackpack' && typeof sourceWas.id === 'number') {
            // 從臨時背包到臨時背包 (排序)
            const [itemToReorder] = gameState.temporaryBackpack.splice(sourceWas.id, 1);
            if (targetTempIndex !== -1 && targetTempIndex < gameState.temporaryBackpack.length) {
                gameState.temporaryBackpack.splice(targetTempIndex, 0, itemToReorder);
            } else {
                gameState.temporaryBackpack.push(itemToReorder);
            }
            renderTemporaryBackpack();
            handleDragEnd(event); // 直接結束，因為已經處理完畢
            return;
        }

        // 添加到臨時背包
        if (targetTempIndex !== -1 && targetTempIndex < gameState.temporaryBackpack.length && dropTargetElement.classList.contains('occupied') && sourceWas.type !== 'temporaryBackpack') {
            // 拖到臨時背包的已佔用槽，執行交換
            const itemInTargetTempSlot = gameState.temporaryBackpack[targetTempIndex];
            gameState.temporaryBackpack[targetTempIndex] = itemToAddToTemp;
            // 將 itemInTargetTempSlot 放回原來的容器
            if (sourceWas.type === 'inventory') {
                if (!gameState.playerData.playerOwnedDNA.find(d => d.id === itemInTargetTempSlot.instanceId)) {
                     gameState.playerData.playerOwnedDNA.push(itemInTargetTempSlot.data); // 假設 instanceId 就是 data.id
                }
                renderPlayerDNAInventory();
            } else if (sourceWas.type === 'combination') {
                // 這裡需要決定如何處理從組合槽換出的物品
                // 為簡化，先假設不直接放回組合槽，而是提示用戶
                showFeedbackModal("操作提示", `${itemInTargetTempSlot.data.name} 從臨時背包被換出，請手動處理。`);
            }
        } else if (targetTempIndex !== -1 && targetTempIndex < gameState.temporaryBackpack.length) {
            gameState.temporaryBackpack.splice(targetTempIndex, 0, itemToAddToTemp);
        } else {
            gameState.temporaryBackpack.push(itemToAddToTemp);
        }
        renderTemporaryBackpack();
    } else {
        console.log("Drop: Unhandled drop target or scenario.", dropTargetElement.id, dropTargetElement.className);
    }

    handleDragEnd(event);
}


// --- Modal Close Button Handler --- (保持不變)
function handleModalCloseButtons() {
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.dataset.modalId || button.closest('.modal')?.id;
            if (modalId) {
                if (modalId === 'training-results-modal' && gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained && gameState.lastCultivationResult.items_obtained.length > 0) {
                    showModal('reminder-modal');
                } else {
                    hideModal(modalId);
                }
            }
        });
    });
}

// --- 其他事件處理函數 (保持不變) ---
function handleThemeSwitch() {
    if (DOMElements.themeSwitcherBtn) {
        DOMElements.themeSwitcherBtn.addEventListener('click', () => {
            const newTheme = gameState.currentTheme === 'dark' ? 'light' : 'dark';
            updateTheme(newTheme);
        });
    }
}

function handleAuthForms() {
    if (DOMElements.showRegisterFormBtn) DOMElements.showRegisterFormBtn.addEventListener('click', () => showModal('register-modal'));
    if (DOMElements.showLoginFormBtn) DOMElements.showLoginFormBtn.addEventListener('click', () => showModal('login-modal'));

    if (DOMElements.registerSubmitBtn) {
        DOMElements.registerSubmitBtn.addEventListener('click', async () => {
            const nickname = DOMElements.registerNicknameInput.value.trim();
            const password = DOMElements.registerPasswordInput.value;
            DOMElements.registerErrorMsg.textContent = '';
            if (!nickname || !password) {
                DOMElements.registerErrorMsg.textContent = '暱稱和密碼不能為空。';
                return;
            }
            try {
                showFeedbackModal('註冊中...', '正在為您創建帳號，請稍候...', true);
                await registerUser(nickname, password);
                hideModal('register-modal');
            } catch (error) {
                DOMElements.registerErrorMsg.textContent = error.message;
                hideModal('feedback-modal');
            }
        });
    }

    if (DOMElements.loginSubmitBtn) {
        DOMElements.loginSubmitBtn.addEventListener('click', async () => {
            const nickname = DOMElements.loginNicknameInput.value.trim();
            const password = DOMElements.loginPasswordInput.value;
            DOMElements.loginErrorMsg.textContent = '';
            if (!nickname || !password) {
                DOMElements.loginErrorMsg.textContent = '暱稱和密碼不能為空。';
                return;
            }
            try {
                showFeedbackModal('登入中...', '正在驗證您的身份，請稍候...', true);
                await loginUser(nickname, password);
                hideModal('login-modal');
            } catch (error) {
                DOMElements.loginErrorMsg.textContent = error.message;
                hideModal('feedback-modal');
            }
        });
    }

    if (DOMElements.mainLogoutBtn) {
        DOMElements.mainLogoutBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('登出中...', '正在安全登出...', true);
                await logoutUser();
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('登出失敗', `登出時發生錯誤: ${error.message}`);
            }
        });
    }
}

function handleTopNavButtons() {
    if (DOMElements.monsterInfoButton) {
        DOMElements.monsterInfoButton.addEventListener('click', () => {
            if (gameState.selectedMonsterId) {
                const monster = getSelectedMonster();
                if (monster) {
                    updateMonsterInfoModal(monster, gameState.gameConfigs);
                    showModal('monster-info-modal');
                } else {
                    showFeedbackModal('錯誤', '找不到選定的怪獸資料。');
                }
            } else {
                showFeedbackModal('提示', '請先在農場選擇一隻怪獸，或合成一隻新的怪獸。');
            }
        });
    }

    if (DOMElements.playerInfoButton) {
        DOMElements.playerInfoButton.addEventListener('click', () => {
            if (gameState.playerData && gameState.currentUser) {
                updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
                showModal('player-info-modal');
            } else {
                showFeedbackModal('錯誤', '無法載入玩家資訊，請先登入。');
            }
        });
    }

    if (DOMElements.showMonsterLeaderboardBtn) {
        DOMElements.showMonsterLeaderboardBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('載入中...', '正在獲取怪獸排行榜...', true);
                const leaderboardData = await getMonsterLeaderboard(20);
                gameState.monsterLeaderboard = leaderboardData;

                let elementsForTabs = ['all'];
                if (gameState.gameConfigs && gameState.gameConfigs.element_nicknames) {
                    elementsForTabs = ['all', ...Object.keys(gameState.gameConfigs.element_nicknames)];
                }
                updateMonsterLeaderboardElementTabs(elementsForTabs);
                filterAndRenderMonsterLeaderboard();
                hideModal('feedback-modal');
                showModal('monster-leaderboard-modal');
            } catch (error) {
                showFeedbackModal('載入失敗', `無法獲取怪獸排行榜: ${error.message}`);
            }
        });
    }

    if (DOMElements.showPlayerLeaderboardBtn) {
        DOMElements.showPlayerLeaderboardBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('載入中...', '正在獲取玩家排行榜...', true);
                const leaderboardData = await getPlayerLeaderboard(20);
                gameState.playerLeaderboard = leaderboardData;
                sortAndRenderLeaderboard('player');
                hideModal('feedback-modal');
                showModal('player-leaderboard-modal');
            } catch (error) {
                showFeedbackModal('載入失敗', `無法獲取玩家排行榜: ${error.message}`);
            }
        });
    }

    if (DOMElements.newbieGuideBtn) {
        DOMElements.newbieGuideBtn.addEventListener('click', () => {
            if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
                updateNewbieGuideModal(gameState.gameConfigs.newbie_guide);
                if(DOMElements.newbieGuideSearchInput) DOMElements.newbieGuideSearchInput.value = '';
                showModal('newbie-guide-modal');
            } else {
                showFeedbackModal('錯誤', '新手指南尚未載入。');
            }
        });
    }

    if (DOMElements.friendsListBtn) {
        DOMElements.friendsListBtn.addEventListener('click', () => {
            updateFriendsListModal([]);
            if(DOMElements.friendsListSearchInput) DOMElements.friendsListSearchInput.value = '';
            showModal('friends-list-modal');
        });
    }
}

function handleTabSwitching() {
    if (DOMElements.dnaFarmTabs) {
        DOMElements.dnaFarmTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                switchTabContent(targetTabId, event.target);
            }
        });
    }

    if (DOMElements.monsterInfoTabs) {
        DOMElements.monsterInfoTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                switchTabContent(targetTabId, event.target, 'monster-info-modal');
            }
        });
    }
}

async function handleCombineDna() {
    const dnaBaseIdsForCombination = gameState.dnaCombinationSlots
        .filter(slot => slot && slot.baseId)
        .map(slot => slot.baseId);

    if (dnaBaseIdsForCombination.length < 2) {
        showFeedbackModal('組合失敗', '至少需要選擇 2 個 DNA 碎片才能進行組合。');
        return;
    }

    try {
        showFeedbackModal('怪獸合成中...', '正在融合 DNA 的神秘力量...', true);
        const result = await combineDNA(dnaBaseIdsForCombination);

        if (result && result.id) {
            const newMonster = result;
            await refreshPlayerData();
            resetDNACombinationSlots();

            let feedbackMessage = `🎉 成功合成了新的怪獸：<strong>${newMonster.nickname}</strong>！<br>`;
            feedbackMessage += `屬性: ${newMonster.elements.join(', ')}, 稀有度: ${newMonster.rarity}<br>`;
            feedbackMessage += `HP: ${newMonster.hp}, 攻擊: ${newMonster.attack}, 防禦: ${newMonster.defense}, 速度: ${newMonster.speed}, 爆擊: ${newMonster.crit}%`;
            if (result.farm_full_warning) {
                feedbackMessage += `<br><strong class="text-[var(--warning-color)]">${result.farm_full_warning}</strong> 請至農場管理。`;
            }

            showFeedbackModal(
                '合成成功！',
                feedbackMessage,
                false,
                null,
                [{ text: '查看新怪獸', class: 'primary', onClick: () => {
                    gameState.selectedMonsterId = newMonster.id;
                    updateMonsterSnapshot(newMonster);
                    if (DOMElements.dnaFarmTabs && typeof switchTabContent === 'function') {
                        const monsterFarmTabButton = DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="monster-farm-content"]');
                        if(monsterFarmTabButton) switchTabContent('monster-farm-content', monsterFarmTabButton);
                    }
                }}, { text: '關閉', class: 'secondary'}]
            );

        } else if (result && result.error) {
            showFeedbackModal('合成失敗', result.error);
        } else {
            showFeedbackModal('合成失敗', '發生未知錯誤，未能生成怪獸。請檢查DNA組合或稍後再試。');
        }
    } catch (error) {
        let errorMessage = `請求錯誤: ${error.message}`;
        if (error.message && error.message.includes("未能生成怪獸")) {
            errorMessage = `合成失敗: DNA 組合未能生成怪獸。請檢查您的 DNA 組合或稍後再試。`;
        }
        showFeedbackModal('合成失敗', errorMessage);
        console.error("合成DNA錯誤:", error);
    }
}

function handleConfirmationActions() {
    // confirmActionBtn is dynamically bound in showConfirmationModal
}

function handleCultivationModals() {
    if (DOMElements.startCultivationBtn) {
        DOMElements.startCultivationBtn.addEventListener('click', async () => {
            if (!gameState.cultivationMonsterId) {
                showFeedbackModal('錯誤', '沒有選定要修煉的怪獸。');
                return;
            }
            const MOCK_CULTIVATION_DURATION_SECONDS = gameState.gameConfigs?.value_settings?.max_cultivation_time_seconds || 10;

            gameState.cultivationStartTime = Date.now();
            gameState.cultivationDurationSet = MOCK_CULTIVATION_DURATION_SECONDS;

            const monsterInFarm = gameState.playerData.farmedMonsters.find(m => m.id === gameState.cultivationMonsterId);
            if (monsterInFarm) {
                monsterInFarm.farmStatus = monsterInFarm.farmStatus || {};
                monsterInFarm.farmStatus.isTraining = true;
                monsterInFarm.farmStatus.trainingStartTime = gameState.cultivationStartTime;
                monsterInFarm.farmStatus.trainingDuration = MOCK_CULTIVATION_DURATION_SECONDS * 1000;
                renderMonsterFarm();
            }

            hideModal('cultivation-setup-modal');
            showFeedbackModal(
                '修煉開始！',
                `怪獸 ${monsterInFarm ? monsterInFarm.nickname : ''} 已開始為期 ${MOCK_CULTIVATION_DURATION_SECONDS} 秒的修煉。請稍後在農場列表查看成果。`,
                false,
                null,
                [{ text: '好的', class: 'primary'}]
            );
        });
    }

    if (DOMElements.closeTrainingResultsBtn) DOMElements.closeTrainingResultsBtn.addEventListener('click', () => {
         if (gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained && gameState.lastCultivationResult.items_obtained.length > 0) {
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });
    if (DOMElements.finalCloseTrainingResultsBtn) DOMElements.finalCloseTrainingResultsBtn.addEventListener('click', () => {
         if (gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained && gameState.lastCultivationResult.items_obtained.length > 0) {
            showModal('reminder-modal');
        } else {
            hideModal('training-results-modal');
        }
    });

    if (DOMElements.addAllToTempBackpackBtn) {
        DOMElements.addAllToTempBackpackBtn.addEventListener('click', () => {
            addAllCultivationItemsToTempBackpack();
        });
    }

    if (DOMElements.reminderConfirmCloseBtn) DOMElements.reminderConfirmCloseBtn.addEventListener('click', () => {
        hideModal('reminder-modal');
        hideModal('training-results-modal');
        clearTemporaryBackpack();
    });
    if (DOMElements.reminderCancelBtn) DOMElements.reminderCancelBtn.addEventListener('click', () => {
        hideModal('reminder-modal');
    });
}

function handleNewbieGuideSearch() {
    if (DOMElements.newbieGuideSearchInput) {
        DOMElements.newbieGuideSearchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
                updateNewbieGuideModal(gameState.gameConfigs.newbie_guide, searchTerm);
            }
        });
    }
}

function handleFriendsListSearch() {
   if (DOMElements.friendsListSearchInput) {
        DOMElements.friendsListSearchInput.addEventListener('input', async (event) => {
            const query = event.target.value.trim();
            if (query.length > 1) {
                try {
                    const result = await searchPlayers(query);
                    gameState.searchedPlayers = result.players || [];
                    updateFriendsListModal(gameState.searchedPlayers);
                } catch (error) {
                    console.error("搜尋玩家失敗:", error);
                    updateFriendsListModal([]);
                }
            } else if (query.length === 0) {
                updateFriendsListModal([]);
            }
        });
   }
}

function handleMonsterLeaderboardFilter() {
    if (DOMElements.monsterLeaderboardElementTabs) {
        DOMElements.monsterLeaderboardElementTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const filter = event.target.dataset.elementFilter;
                gameState.currentMonsterLeaderboardElementFilter = filter;
                DOMElements.monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                filterAndRenderMonsterLeaderboard();
            }
        });
    }
}

function handleLeaderboardSorting() {
    const tables = [DOMElements.monsterLeaderboardTable, DOMElements.playerLeaderboardTable];
    tables.forEach(table => {
        if (table) {
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                headerRow.addEventListener('click', (event) => {
                    const th = event.target.closest('th');
                    if (!th || !th.dataset.sortKey) return;

                    const sortKey = th.dataset.sortKey;
                    const tableType = table.id.includes('monster') ? 'monster' : 'player';

                    let currentSortConfig = gameState.leaderboardSortConfig?.[tableType] || {};
                    let newSortOrder = 'desc';
                    if (currentSortConfig.key === sortKey && currentSortConfig.order === 'desc') {
                        newSortOrder = 'asc';
                    } else if (currentSortConfig.key === sortKey && currentSortConfig.order === 'asc') {
                        newSortOrder = 'desc';
                    }

                    gameState.leaderboardSortConfig = {
                        ...gameState.leaderboardSortConfig,
                        [tableType]: { key: sortKey, order: newSortOrder }
                    };

                    sortAndRenderLeaderboard(tableType);
                    updateLeaderboardSortIcons(table, sortKey, newSortOrder);
                });
            }
        }
    });
}

function handleBattleLogModalClose() {
    if (DOMElements.closeBattleLogBtn) DOMElements.closeBattleLogBtn.addEventListener('click', () => {
        hideModal('battle-log-modal');
    });
}

function handleDnaDrawModal() {
    if (DOMElements.closeDnaDrawBtn) DOMElements.closeDnaDrawBtn.addEventListener('click', () => {
        hideModal('dna-draw-modal');
    });
    if (DOMElements.dnaDrawButton) DOMElements.dnaDrawButton.addEventListener('click', handleDrawDNAClick);

    if (DOMElements.dnaDrawResultsGrid) {
        DOMElements.dnaDrawResultsGrid.addEventListener('click', (event) => {
            if (event.target.classList.contains('add-drawn-dna-to-backpack-btn')) {
                const dnaIndex = parseInt(event.target.dataset.dnaIndex, 10);
                if (gameState.lastDnaDrawResult && gameState.lastDnaDrawResult[dnaIndex]) {
                    const dnaTemplate = gameState.lastDnaDrawResult[dnaIndex];
                    addDnaToTemporaryBackpack(dnaTemplate);
                    event.target.disabled = true;
                    event.target.textContent = '已加入';
                }
            }
        });
    }
}

function handleAnnouncementModalClose() {
    if (DOMElements.officialAnnouncementCloseX) {
        DOMElements.officialAnnouncementCloseX.addEventListener('click', () => {
            hideModal('official-announcement-modal');
            localStorage.setItem('announcementShown_v1', 'true');
        });
    }
}

function initializeEventListeners() {
    handleModalCloseButtons();
    handleThemeSwitch();
    handleAuthForms();
    handleTopNavButtons();
    handleTabSwitching();
    handleLeaderboardSorting();

    if (DOMElements.combineButton) DOMElements.combineButton.addEventListener('click', handleCombineDna);

    const dragDropContext = DOMElements.gameContainer || document.body;
    dragDropContext.addEventListener('dragstart', handleDragStart);
    dragDropContext.addEventListener('dragend', handleDragEnd);

    const dropZones = [
        DOMElements.dnaCombinationSlotsContainer,
        DOMElements.inventoryItemsContainer,
        document.getElementById('inventory-delete-slot'),
        DOMElements.temporaryBackpackContainer
    ];

    dropZones.forEach(zone => {
        if (zone) {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        }
    });

    handleConfirmationActions();
    handleCultivationModals();
    handleNewbieGuideSearch();
    handleFriendsListSearch();
    handleMonsterLeaderboardFilter();
    handleBattleLogModalClose();
    handleDnaDrawModal();
    handleAnnouncementModalClose();

    console.log("All event listeners initialized with v4 drag-drop logic (precise placement focus).");
}
