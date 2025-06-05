// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js), gameState (來自 game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

// --- Drag and Drop Handlers for DNA ---
let draggedElement = null; // 通用被拖曳元素
let draggedDnaObject = null; // 被拖曳的實際DNA數據對象
let draggedSourceType = null; // 'inventory', 'combination', 'temporaryBackpack'
let draggedSourceIdentifier = null; // DNA instance ID or slot index or temp item index

function handleDragStart(event) {
    const target = event.target.closest('.dna-item, .dna-slot.occupied, .temp-backpack-slot.occupied');
    if (!target) {
        console.log("Drag Start: Invalid target", target);
        event.preventDefault();
        return;
    }

    draggedElement = target;
    draggedSourceType = target.dataset.dnaSource; // 'inventory', 'combination', 'temporaryBackpack'

    console.log("Drag Start - Element:", target, "Source Type:", draggedSourceType, "Element Dataset:", JSON.parse(JSON.stringify(target.dataset)));

    if (draggedSourceType === 'inventory') {
        draggedSourceIdentifier = target.dataset.dnaId;
        if (!draggedSourceIdentifier) {
            console.warn("Drag Start from Inventory: Missing data-dna-id on element:", target);
            event.preventDefault(); return;
        }
        draggedDnaObject = gameState.playerData.playerOwnedDNA.find(d => d.id === draggedSourceIdentifier);
        if (draggedDnaObject) {
            event.dataTransfer.setData('text/plain', draggedSourceIdentifier);
            console.log("Dragging from Inventory - DNA ID:", draggedSourceIdentifier, "Object:", JSON.parse(JSON.stringify(draggedDnaObject)));
        } else {
             console.warn("Drag Start from Inventory: Could not find DNA object in gameState for ID:", draggedSourceIdentifier);
             event.preventDefault(); return;
        }
    } else if (draggedSourceType === 'combination') {
        draggedSourceIdentifier = parseInt(target.dataset.slotIndex, 10);
         if (isNaN(draggedSourceIdentifier)) {
            console.warn("Drag Start from Combination: Invalid or missing data-slot-index on element:", target);
            event.preventDefault(); return;
        }
        draggedDnaObject = gameState.dnaCombinationSlots[draggedSourceIdentifier];
        if (draggedDnaObject) {
            event.dataTransfer.setData('text/plain', `combo:${draggedSourceIdentifier}`);
            console.log("Dragging from Combination Slot - Index:", draggedSourceIdentifier, "Object:", JSON.parse(JSON.stringify(draggedDnaObject)));
        } else {
            console.warn("Drag Start from Combination: Could not find DNA object in gameState for slot index:", draggedSourceIdentifier);
            event.preventDefault(); return;
        }
    } else if (draggedSourceType === 'temporaryBackpack') {
        draggedSourceIdentifier = parseInt(target.dataset.tempItemIndex, 10);
        if (isNaN(draggedSourceIdentifier)) {
            console.warn("Drag Start from Temporary Backpack: Invalid or missing data-temp-item-index on element:", target);
            event.preventDefault(); return;
        }
        const tempItem = gameState.temporaryBackpack[draggedSourceIdentifier];
        draggedDnaObject = tempItem ? tempItem.data : null;

        if (draggedDnaObject) {
            event.dataTransfer.setData('text/plain', `temp:${draggedSourceIdentifier}`);
            // 將 tempItem 的 instanceId (如果存在) 暫時附加到 draggedDnaObject，以便在 drop 時識別
            if (tempItem && tempItem.instanceId) {
                 draggedDnaObject.originalInstanceIdIfFromInventory = tempItem.instanceId;
                 console.log("Drag Start from Temp: originalInstanceIdIfFromInventory set to", tempItem.instanceId);
            }
            // 確保拖曳的對象有一個 id (可以是模板ID或臨時ID)
            if (!draggedDnaObject.id) {
                draggedDnaObject.id = draggedDnaObject.baseId || `temp_template_${Date.now()}`;
            }
            console.log("Dragging from Temporary Backpack - Index:", draggedSourceIdentifier, "Object:", JSON.parse(JSON.stringify(draggedDnaObject)));
        } else {
            console.warn("Drag Start from Temporary Backpack: Could not find DNA object in gameState for temp index:", draggedSourceIdentifier);
            event.preventDefault(); return;
        }
    }

    if (!draggedDnaObject) {
        console.warn("Drag Start: Could not identify draggedDnaObject at the end of handler.");
        event.preventDefault();
        return;
    }

    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
        if (draggedElement) draggedElement.classList.add('dragging');
    }, 0);
}

function handleDragEnd(event) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
    }
    draggedElement = null;
    draggedDnaObject = null;
    draggedSourceType = null;
    draggedSourceIdentifier = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    // console.log("Drag End");
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items, #temporary-backpack-items');
    if (target) {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        target.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items, #temporary-backpack-items');
    if (target && !target.contains(event.relatedTarget)) {
        target.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    const dropTargetElement = event.target.closest('.dna-slot, #inventory-items, #inventory-delete-slot, .inventory-slot-empty, #temporary-backpack-items, .temp-backpack-slot, .temp-backpack-slot.empty');

    if (!draggedDnaObject || !dropTargetElement) {
        console.warn("Drop: No dragged DNA object or invalid drop target.", {draggedDnaObject, dropTargetElement});
        handleDragEnd(event);
        return;
    }
    dropTargetElement.classList.remove('drag-over');
    console.log("Drop Event - Target Element:", dropTargetElement.id || dropTargetElement.className);
    console.log("Drop Event - Dragged DNA Data (before processing):", JSON.parse(JSON.stringify(draggedDnaObject)));
    console.log("Drop Event - Source Type:", draggedSourceType, "Source ID/Index:", draggedSourceIdentifier);

    const dnaDataToProcess = JSON.parse(JSON.stringify(draggedDnaObject)); // Critical: Use a deep copy for processing
    const originalSourceType = draggedSourceType; // Preserve original source type
    const originalSourceIdentifier = draggedSourceIdentifier; // Preserve original source identifier

    // --- 處理刪除 ---
    if (dropTargetElement.id === 'inventory-delete-slot') {
        let itemNameToDelete = dnaDataToProcess.name || "該DNA";
        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${itemNameToDelete}" 嗎？此操作無法復原。`, () => {
            if (originalSourceType === 'inventory' && typeof originalSourceIdentifier === 'string') {
                console.log(`Deleting from inventory: ID ${originalSourceIdentifier}`);
                deleteDNAFromInventory(originalSourceIdentifier);
                renderPlayerDNAInventory();
            } else if (originalSourceType === 'combination' && typeof originalSourceIdentifier === 'number') {
                const dnaFromSlot = gameState.dnaCombinationSlots[originalSourceIdentifier];
                if (dnaFromSlot && dnaFromSlot.id && gameState.playerData.playerOwnedDNA.some(d => d.id === dnaFromSlot.id)) {
                    console.log(`Deleting from inventory (originated from combo slot): ID ${dnaFromSlot.id}`);
                    deleteDNAFromInventory(dnaFromSlot.id);
                    renderPlayerDNAInventory();
                }
                gameState.dnaCombinationSlots[originalSourceIdentifier] = null;
                console.log(`Cleared combination slot: Index ${originalSourceIdentifier}`);
                renderDNACombinationSlots();
            } else if (originalSourceType === 'temporaryBackpack' && typeof originalSourceIdentifier === 'number') {
                const tempItem = gameState.temporaryBackpack[originalSourceIdentifier]; // Get the item before splice
                if (tempItem && tempItem.instanceId && gameState.playerData.playerOwnedDNA.some(d => d.id === tempItem.instanceId)) {
                    // If the item in temp an original instanceId from inventory, delete that instance from inventory too.
                    console.log(`Deleting from inventory (originated from temp backpack): ID ${tempItem.instanceId}`);
                    deleteDNAFromInventory(tempItem.instanceId);
                    renderPlayerDNAInventory();
                }
                gameState.temporaryBackpack.splice(originalSourceIdentifier, 1);
                console.log(`Removed from temporary backpack: Index ${originalSourceIdentifier}`);
                renderTemporaryBackpack();
            }
            updateMonsterSnapshot(getSelectedMonster() || null);
            showFeedbackModal('操作成功', `DNA "${itemNameToDelete}" 已被刪除。`);
        });
    }
    // --- 處理拖曳到組合槽 ---
    else if (dropTargetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        console.log(`Drop Target: Combination Slot, Index ${targetSlotIndex}`);
        const itemCurrentlyInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex] ? JSON.parse(JSON.stringify(gameState.dnaCombinationSlots[targetSlotIndex])) : null;

        // 1. 從源頭移除
        if (originalSourceType === 'inventory' && typeof originalSourceIdentifier === 'string') {
            deleteDNAFromInventory(originalSourceIdentifier);
            renderPlayerDNAInventory();
        } else if (originalSourceType === 'temporaryBackpack' && typeof originalSourceIdentifier === 'number') {
            gameState.temporaryBackpack.splice(originalSourceIdentifier, 1);
            renderTemporaryBackpack();
        }
        // (如果從組合槽來，moveDnaToCombinationSlot 會處理源槽的清空/交換)

        // 2. 放置/交換到目標組合槽
        moveDnaToCombinationSlot(dnaDataToProcess, (originalSourceType === 'combination' ? originalSourceIdentifier : null), targetSlotIndex);

        // 3. 如果目標槽原本有物品，且來源不是組合槽 (即來源是庫存或臨時背包)，則將目標槽原物品“退回”
        if (itemCurrentlyInTargetSlot && originalSourceType !== 'combination') {
            console.log(`Item ${itemCurrentlyInTargetSlot.name} was in target slot ${targetSlotIndex}, returning it.`);
            if (originalSourceType === 'inventory') { // 來源是庫存，被擠出的物品也回庫存
                if (!gameState.playerData.playerOwnedDNA.find(d => d.id === itemCurrentlyInTargetSlot.id)) {
                     gameState.playerData.playerOwnedDNA.push(itemCurrentlyInTargetSlot);
                }
                renderPlayerDNAInventory();
            } else if (originalSourceType === 'temporaryBackpack') { // 來源是臨時背包，被擠出的物品回臨時背包
                // 確保退回時保持其 originalInstanceIdIfFromInventory (如果有的話)
                const instanceIdToPreserve = itemCurrentlyInTargetSlot.originalInstanceIdIfFromInventory || itemCurrentlyInTargetSlot.id;
                gameState.temporaryBackpack.push({ type: 'dna', data: itemCurrentlyInTargetSlot, instanceId: instanceIdToPreserve });
                renderTemporaryBackpack();
            }
        }
    }
    // --- 處理拖曳到庫存區 (主 DNA 碎片區) ---
    else if (dropTargetElement.id === 'inventory-items' || dropTargetElement.classList.contains('inventory-slot-empty')) {
        console.log("Drop Target: Inventory Area");
        if (originalSourceType === 'combination' && typeof originalSourceIdentifier === 'number') {
            // 從組合槽移回庫存
            if (dnaDataToProcess.id && !gameState.playerData.playerOwnedDNA.find(d => d.id === dnaDataToProcess.id)) {
                gameState.playerData.playerOwnedDNA.push(dnaDataToProcess);
                 console.log(`Added ${dnaDataToProcess.name} (ID: ${dnaDataToProcess.id}) back to inventory from combo slot.`);
            } else if (!dnaDataToProcess.id) { // 不應發生，組合槽內應有實例ID
                console.warn("DNA from combo slot missing instance ID, cannot reliably add to inventory.");
            } else {
                console.log(`DNA ${dnaDataToProcess.name} (ID: ${dnaDataToProcess.id}) already in inventory or ID conflict.`);
            }
            gameState.dnaCombinationSlots[originalSourceIdentifier] = null;
            renderDNACombinationSlots();
            renderPlayerDNAInventory();
            updateMonsterSnapshot(getSelectedMonster() || null);
        } else if (originalSourceType === 'temporaryBackpack' && typeof originalSourceIdentifier === 'number') {
            // 從臨時背包移到庫存
            const templateData = dnaDataToProcess; // dnaDataToProcess is tempItem.data
            const baseIdForNewInstance = templateData.baseId || templateData.id; // templateData.id is the template's original ID
            const newInstanceId = `dna_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

            const dnaToAdd = {
                ...templateData,
                id: newInstanceId,
                baseId: baseIdForNewInstance
            };
            delete dnaToAdd.originalInstanceIdIfFromInventory; // 清理臨時屬性

            if (!gameState.playerData.playerOwnedDNA) gameState.playerData.playerOwnedDNA = [];
            gameState.playerData.playerOwnedDNA.push(dnaToAdd);
            console.log(`Added ${dnaToAdd.name} (New ID: ${dnaToAdd.id}, BaseID: ${dnaToAdd.baseId}) to inventory from temp backpack.`);

            gameState.temporaryBackpack.splice(originalSourceIdentifier, 1);
            renderTemporaryBackpack();
            renderPlayerDNAInventory();
        }
    }
    // --- 處理拖曳到臨時背包區 ---
    else if (dropTargetElement.id === 'temporary-backpack-items' || dropTargetElement.classList.contains('temp-backpack-slot')) {
        console.log("Drop Target: Temporary Backpack Area");
        // (不包括從臨時背包拖到臨時背包的內部排序)
        if (originalSourceType === 'inventory' && typeof originalSourceIdentifier === 'string') {
            const instanceIdFromInventory = dnaDataToProcess.id; // 這是從庫存拖曳的物品的唯一實例ID
            gameState.temporaryBackpack.push({ type: 'dna', data: dnaDataToProcess, instanceId: instanceIdFromInventory });
            deleteDNAFromInventory(originalSourceIdentifier); // 從主庫存移除
            renderPlayerDNAInventory();
            renderTemporaryBackpack();
            console.log(`DNA ${dnaDataToProcess.name} (Instance ID: ${instanceIdFromInventory}) moved from inventory to temporary backpack.`);
        } else if (originalSourceType === 'combination' && typeof originalSourceIdentifier === 'number') {
            const instanceIdFromCombo = dnaDataToProcess.id; // 組合槽中的物品應有實例ID
            gameState.temporaryBackpack.push({ type: 'dna', data: dnaDataToProcess, instanceId: instanceIdFromCombo });
            gameState.dnaCombinationSlots[originalSourceIdentifier] = null;
            renderDNACombinationSlots();
            renderTemporaryBackpack();
            updateMonsterSnapshot(getSelectedMonster() || null);
            console.log(`DNA ${dnaDataToProcess.name} (Instance ID: ${instanceIdFromCombo}) moved from combination slot ${originalSourceIdentifier} to temporary backpack.`);
        }
    } else {
        console.log("Drop: Unhandled drop target or scenario.", dropTargetElement);
    }

    handleDragEnd(event);
}


// --- Modal Close Button Handler ---
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


// --- Theme Switcher Handler ---
function handleThemeSwitch() {
    if (DOMElements.themeSwitcherBtn) {
        DOMElements.themeSwitcherBtn.addEventListener('click', () => {
            const newTheme = gameState.currentTheme === 'dark' ? 'light' : 'dark';
            updateTheme(newTheme);
        });
    }
}

// --- Auth Form Handlers & Logout ---
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

// --- Top Navigation Button Handlers ---
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

// --- Tab Switching Handler ---
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

// --- DNA Combination Handler ---
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

// --- Confirmation Modal Action Handler ---
function handleConfirmationActions() {
    // confirmActionBtn is dynamically bound in showConfirmationModal
}

// --- Cultivation Modal Handlers ---
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

// --- Newbie Guide Search Handler ---
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

// --- Friends List Search Handler ---
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

// --- Leaderboard Element Filter Handler ---
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

// --- Leaderboard Sorting Handler ---
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


// --- Battle Log Modal Close Handler ---
function handleBattleLogModalClose() {
    if (DOMElements.closeBattleLogBtn) DOMElements.closeBattleLogBtn.addEventListener('click', () => {
        hideModal('battle-log-modal');
    });
}

// --- DNA Draw Modal Handlers ---
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

// --- Official Announcement Modal Close Handler ---
function handleAnnouncementModalClose() {
    if (DOMElements.officialAnnouncementCloseX) {
        DOMElements.officialAnnouncementCloseX.addEventListener('click', () => {
            hideModal('official-announcement-modal');
            localStorage.setItem('announcementShown_v1', 'true');
        });
    }
}


// --- Main Function to Add All Event Listeners ---
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

    console.log("All event listeners initialized with v3 drag-drop logic (includes temp backpack fixes).");
}
