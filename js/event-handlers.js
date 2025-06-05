// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js), gameState (來自 game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

let draggedElement = null;
let draggedDnaObject = null;
let draggedSourceType = null;
// draggedSourceIdentifier 現在可以是用於庫存或臨時背包的索引，或用於組合槽的索引。
let draggedSourceIdentifier = null;
let draggedSourceOriginalInventoryIndex = null; // 新增：如果來源是庫存，記錄其原始視覺索引

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
        draggedSourceOriginalInventoryIndex = parseInt(target.dataset.inventoryIndex, 10); // 記錄原始視覺索引
        if (!draggedSourceIdentifier) { console.warn("DragStart Inventory: Missing data-dna-id."); event.preventDefault(); return; }
        if (isNaN(draggedSourceOriginalInventoryIndex)) { console.warn("DragStart Inventory: Missing or invalid data-inventory-index."); event.preventDefault(); return; }
        draggedDnaObject = gameState.playerData.playerOwnedDNA.find(d => d.id === draggedSourceIdentifier);
    } else if (draggedSourceType === 'combination') {
        draggedSourceIdentifier = parseInt(target.dataset.slotIndex, 10);
        draggedSourceOriginalInventoryIndex = null; // 組合槽沒有原始庫存索引
        if (isNaN(draggedSourceIdentifier)) { console.warn("DragStart Combination: Invalid data-slot-index."); event.preventDefault(); return; }
        draggedDnaObject = gameState.dnaCombinationSlots[draggedSourceIdentifier];
    } else if (draggedSourceType === 'temporaryBackpack') {
        draggedSourceIdentifier = parseInt(target.dataset.tempItemIndex, 10);
        draggedSourceOriginalInventoryIndex = null; // 臨時背包沒有原始庫存索引
        if (isNaN(draggedSourceIdentifier)) { console.warn("DragStart TempBackpack: Invalid data-temp-item-index."); event.preventDefault(); return; }
        const tempItem = gameState.temporaryBackpack[draggedSourceIdentifier];
        draggedDnaObject = tempItem ? tempItem.data : null;
        // 確保拖曳的臨時背包物品有一個 id (可以是模板ID或臨時ID)
        if (draggedDnaObject && !draggedDnaObject.id) {
            draggedDnaObject.id = draggedDnaObject.baseId || `temp_template_for_drag_${Date.now()}`;
        }
        // 如果臨時背包中的物品有原始實例ID (例如從主庫存臨時移出的)，則保留
        if (tempItem && tempItem.instanceId) {
            draggedDnaObject.originalInstanceIdIfFromInventory = tempItem.instanceId;
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
    draggedSourceOriginalInventoryIndex = null; // 重置
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    // 允許拖曳到組合槽、庫存槽（包括空槽）、臨時背包槽（包括空槽）、刪除區
    const validTarget = event.target.closest('.dna-slot, .dna-item.empty, .dna-item.occupied, #inventory-delete-slot, .temp-backpack-slot.empty, .temp-backpack-slot.occupied');
    if (validTarget) {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        validTarget.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const target = event.target.closest('.dna-slot, .dna-item.empty, .dna-item.occupied, #inventory-delete-slot, .temp-backpack-slot.empty, .temp-backpack-slot.occupied');
    // 使用 contains 和 relatedTarget 確保只有真正離開時才移除 .drag-over
    if (target && !target.contains(event.relatedTarget) && !target.classList.contains('dragging')) {
        target.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    const dropTargetElement = event.target.closest('.dna-slot, .dna-item, #inventory-delete-slot, .temp-backpack-slot'); 
    // .dna-item 包含 .inventory-slot-empty 和 .dna-item.occupied
    // .temp-backpack-slot 包含 .temp-backpack-slot.empty 和 .temp-backpack-slot.occupied

    if (!draggedDnaObject || !dropTargetElement) {
        console.warn("Drop: No dragged DNA object or invalid drop target.", { draggedDnaObject, dropTargetElement });
        handleDragEnd(event);
        return;
    }
    dropTargetElement.classList.remove('drag-over');
    console.log("--- Drop Event ---");
    console.log("Target Element:", dropTargetElement.id || dropTargetElement.className, dropTargetElement.dataset);
    console.log("Dragged DNA Data (cloned for processing):", JSON.parse(JSON.stringify(draggedDnaObject)));
    console.log("Original Source Type:", draggedSourceType, "Original Source ID/Index:", draggedSourceIdentifier, "Original Inventory Index:", draggedSourceOriginalInventoryIndex);

    const dnaDataToMove = JSON.parse(JSON.stringify(draggedDnaObject)); // 深拷貝以供操作
    const sourceInfo = { 
        type: draggedSourceType, 
        id: draggedSourceIdentifier, 
        originalInventoryIndex: draggedSourceOriginalInventoryIndex 
    };

    // --- A. 處理刪除區 ---
    if (dropTargetElement.id === 'inventory-delete-slot') {
        let itemNameToDelete = dnaDataToMove.name || "該DNA";
        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${itemNameToDelete}" 嗎？此操作無法復原。`, () => {
            if (sourceInfo.type === 'inventory' && typeof sourceInfo.id === 'string') {
                deleteDNAFromInventory(sourceInfo.id);
            } else if (sourceInfo.type === 'combination' && typeof sourceInfo.id === 'number') {
                const dnaFromSlot = gameState.dnaCombinationSlots[sourceInfo.id];
                if (dnaFromSlot && dnaFromSlot.id && gameState.playerData.playerOwnedDNA.some(d => d.id === dnaFromSlot.id)) {
                    // 如果組合槽中的物品實際來源是庫存，則也從庫存中刪除
                    deleteDNAFromInventory(dnaFromSlot.id);
                }
                gameState.dnaCombinationSlots[sourceInfo.id] = null; // 清空組合槽
            } else if (sourceInfo.type === 'temporaryBackpack' && typeof sourceInfo.id === 'number') {
                // 從臨時背包刪除，如果它有對應到主庫存的原始實例ID，也從主庫存刪除
                const tempItemOriginal = gameState.temporaryBackpack[sourceInfo.id];
                if (tempItemOriginal && tempItemOriginal.instanceId && gameState.playerData.playerOwnedDNA.some(d => d.id === tempItemOriginal.instanceId)) {
                    deleteDNAFromInventory(tempItemOriginal.instanceId);
                }
                gameState.temporaryBackpack.splice(sourceInfo.id, 1); // 從臨時背包移除
            }
            renderPlayerDNAInventory(); // 重新渲染，因為可能從庫存刪除了
            renderDNACombinationSlots(); // 重新渲染，因為可能從組合槽刪除了
            renderTemporaryBackpack(); // 重新渲染，因為可能從臨時背包刪除了
            updateMonsterSnapshot(getSelectedMonster() || null); // 更新快照
            showFeedbackModal('操作成功', `DNA "${itemNameToDelete}" 已被刪除。`);
        });
    }
    // --- B. 處理拖曳到組合槽 ---
    else if (dropTargetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        // 確保目標槽位是有效的數字
        if (isNaN(targetSlotIndex)) {
            console.warn("Drop on DNA slot: Invalid targetSlotIndex.");
            handleDragEnd(event);
            return;
        }

        const itemCurrentlyInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex] ? JSON.parse(JSON.stringify(gameState.dnaCombinationSlots[targetSlotIndex])) : null;

        // 從原始來源移除被拖曳的 DNA (只在拖曳到組合槽時才處理，因為 moveDnaToCombinationSlot 不處理源移除)
        if (sourceInfo.type === 'inventory') {
            deleteDNAFromInventory(sourceInfo.id); // 從庫存中移除
        } else if (sourceInfo.type === 'temporaryBackpack') {
            gameState.temporaryBackpack.splice(sourceInfo.id, 1); // 從臨時背包移除
            renderTemporaryBackpack(); // 重新渲染臨時背包
        }
        // 如果是組合槽到組合槽，moveDnaToCombinationSlot 會自行處理交換

        // 放置/交換到目標組合槽
        moveDnaToCombinationSlot(dnaDataToMove, (sourceInfo.type === 'combination' ? sourceInfo.id : null), targetSlotIndex);

        // 如果目標槽原本有物品，且來源不是組合槽，則將目標槽原物品“退回”到庫存末尾
        if (itemCurrentlyInTargetSlot && sourceInfo.type !== 'combination') {
            if (!itemCurrentlyInTargetSlot.id) { // 如果被替換的物品沒有實際ID (例如它是空槽的表示)，則不處理退回
                 console.warn("Item in target slot had no ID, not returning to inventory.");
            } else if (!gameState.playerData.playerOwnedDNA.find(d => d.id === itemCurrentlyInTargetSlot.id)) {
                // 確保物品不在庫存中才添加，避免重複
                gameState.playerData.playerOwnedDNA.push(itemCurrentlyInTargetSlot);
            }
            renderPlayerDNAInventory(); // 重新渲染庫存
        }
    }
    // --- C. 處理拖曳到庫存區 (包括空槽和已佔用槽，用於自由放置/交換) ---
    else if (dropTargetElement.classList.contains('dna-item') && dropTargetElement.closest('#inventory-items')) {
        const targetInventoryIndex = parseInt(dropTargetElement.dataset.inventoryIndex, 10);
        // 確保目標索引是有效的數字
        if (isNaN(targetInventoryIndex)) {
            console.warn("Drop on Inventory: Invalid targetInventoryIndex.");
            handleDragEnd(event);
            return;
        }

        const itemAtTargetInventorySlot = dropTargetElement.classList.contains('occupied') 
                                           ? gameState.playerData.playerOwnedDNA[targetInventoryIndex] || null
                                           : null;

        // 調用統一的處理函數
        handleDnaMoveIntoInventory(dnaDataToMove, sourceInfo, targetInventoryIndex, itemAtTargetInventorySlot);
    }
    // --- D. 處理拖曳到臨時背包區 (包括空槽和已佔用槽) ---
    else if (dropTargetElement.classList.contains('temp-backpack-slot') || dropTargetElement.id === 'temporary-backpack-items') {
        let targetTempIndex;
        if (dropTargetElement.dataset.tempItemIndex) { // 如果拖曳到特定的槽位
            targetTempIndex = parseInt(dropTargetElement.dataset.tempItemIndex, 10);
        } else if (dropTargetElement.id === 'temporary-backpack-items') { // 如果拖曳到容器本身，則加到末尾的空位
            targetTempIndex = gameState.temporaryBackpack.length;
        }

        if (isNaN(targetTempIndex)) {
            console.warn("Drop on Temporary Backpack: Invalid targetTempIndex.");
            handleDragEnd(event);
            return;
        }

        let itemToAddToTemp = { type: 'dna', data: dnaDataToMove, instanceId: dnaDataToMove.id };
        if (dnaDataToMove.originalInstanceIdIfFromInventory) {
             itemToAddToTemp.instanceId = dnaDataToMove.originalInstanceIdIfFromInventory; // 恢復原始實例ID
        }
        delete itemToAddToTemp.data.originalInstanceIdIfFromInventory; // 清理臨時屬性


        let itemCurrentlyInTargetTempSlot = null;
        if (targetTempIndex < gameState.temporaryBackpack.length) {
            itemCurrentlyInTargetTempSlot = gameState.temporaryBackpack[targetTempIndex];
        }

        // 1. 從原始來源移除被拖曳的 DNA
        if (sourceInfo.type === 'inventory') {
            deleteDNAFromInventory(sourceInfo.id); // 從庫存中移除
        } else if (sourceInfo.type === 'combination') {
            gameState.dnaCombinationSlots[sourceInfo.id] = null;
            renderDNACombinationSlots();
            updateMonsterSnapshot(getSelectedMonster() || null);
        } else if (sourceInfo.type === 'temporaryBackpack') {
            // 如果是從臨時背包內部拖曳，則先從原位置移除
            gameState.temporaryBackpack.splice(sourceInfo.id, 1);
            // 由於移除了源項目，如果目標索引在源索引之後，則目標索引需要減1
            if (targetTempIndex > sourceInfo.id) {
                targetTempIndex--; 
            }
        }
        
        // 2. 處理被替換的物品（如果存在且不是內部拖曳）
        if (itemCurrentlyInTargetTempSlot && sourceInfo.type !== 'temporaryBackpack') {
            // 被替換的物品（itemCurrentlyInTargetTempSlot）將被退回到主庫存
            if (!itemCurrentlyInTargetTempSlot.data || !itemCurrentlyInTargetTempSlot.instanceId) {
                console.warn("Temporary backpack target slot item had no valid data, not returning to inventory.");
            } else {
                const dnaToReturn = {
                    ...itemCurrentlyInTargetTempSlot.data,
                    id: itemCurrentlyInTargetTempSlot.instanceId,
                    baseId: itemCurrentlyInTargetTempSlot.data.baseId || itemCurrentlyInTargetTempSlot.data.id 
                };
                // 確保物品不在庫存中才添加，避免重複
                if (!gameState.playerData.playerOwnedDNA.find(d => d.id === dnaToReturn.id)) {
                    gameState.playerData.playerOwnedDNA.push(dnaToReturn);
                }
            }
        }

        // 3. 將物品插入到目標位置
        // 如果目標索引超過當前背包實際長度，則直接推入（append）
        if (targetTempIndex > gameState.temporaryBackpack.length) {
            gameState.temporaryBackpack.push(itemToAddToTemp);
        } else {
            gameState.temporaryBackpack.splice(targetTempIndex, 0, itemToAddToTemp);
        }

        // 重新渲染所有受影響的 UI 組件
        renderPlayerDNAInventory(); // 更新庫存UI（因為可能從臨時背包退回了物品）
        renderTemporaryBackpack(); // 更新臨時背包UI
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

    // Note: Temporary Backpack items (slots) are now also direct drop targets.
    // Ensure that DOMElements.temporaryBackpackContainer is covering all children elements.
    // If you need to drop precisely on empty/occupied temp slots, the `closest` logic in handleDrop needs to find them correctly.
    // The current `dropTargetElement` correctly identifies `.temp-backpack-slot`.

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

    console.log("All event listeners initialized with enhanced drag-drop logic for temporary backpack.");
}
