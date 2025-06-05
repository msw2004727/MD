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
        event.preventDefault();
        return;
    }

    draggedElement = target;
    draggedSourceType = target.dataset.dnaSource;

    console.log("Drag Start - Element:", target, "Source Type:", draggedSourceType);

    if (draggedSourceType === 'inventory') {
        draggedSourceIdentifier = target.dataset.dnaId;
        draggedDnaObject = gameState.playerData.playerOwnedDNA.find(d => d.id === draggedSourceIdentifier);
        if (draggedDnaObject) {
            event.dataTransfer.setData('text/plain', draggedSourceIdentifier);
            console.log("Dragging from Inventory - DNA ID:", draggedSourceIdentifier, "Object:", JSON.parse(JSON.stringify(draggedDnaObject)));
        }
    } else if (draggedSourceType === 'combination') {
        draggedSourceIdentifier = parseInt(target.dataset.slotIndex, 10);
        draggedDnaObject = gameState.dnaCombinationSlots[draggedSourceIdentifier];
        if (draggedDnaObject) {
            event.dataTransfer.setData('text/plain', `combo:${draggedSourceIdentifier}`);
            console.log("Dragging from Combination Slot - Index:", draggedSourceIdentifier, "Object:", JSON.parse(JSON.stringify(draggedDnaObject)));
        }
    } else if (draggedSourceType === 'temporaryBackpack') {
        draggedSourceIdentifier = parseInt(target.dataset.tempItemIndex, 10);
        const tempItem = gameState.temporaryBackpack[draggedSourceIdentifier];
        draggedDnaObject = tempItem ? tempItem.data : null; // 假設臨時背包存儲 {type: 'dna', data: {...}}
        if (draggedDnaObject) {
            event.dataTransfer.setData('text/plain', `temp:${draggedSourceIdentifier}`);
            // 如果臨時背包中的物品有唯一的 instanceId (例如從主庫存移過來時保留的)
            if (tempItem && tempItem.instanceId) {
                 draggedDnaObject.id = tempItem.instanceId; // 確保拖曳對象帶有正確的實例ID
            } else if (!draggedDnaObject.id) { // 如果拖曳的是模板，確保它有模板ID
                 draggedDnaObject.id = draggedDnaObject.baseId || `template_${Date.now()}`; // 臨時標識
            }
            console.log("Dragging from Temporary Backpack - Index:", draggedSourceIdentifier, "Object:", JSON.parse(JSON.stringify(draggedDnaObject)));
        }
    }

    if (!draggedDnaObject) {
        console.warn("Drag Start: Could not identify draggedDnaObject.");
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
    console.log("Drag End");
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items, #temporary-backpack-items');
    if (target) {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); // 清除舊的
        target.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot, #inventory-items, #temporary-backpack-items');
    if (target && !target.contains(event.relatedTarget)) { // 檢查 relatedTarget 避免子元素觸發 leave
        target.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault();
    console.log("Drop event triggered");
    const dropTargetElement = event.target.closest('.dna-slot, #inventory-items, #inventory-delete-slot, .inventory-slot-empty, #temporary-backpack-items, .temp-backpack-slot, .temp-backpack-slot.empty');

    if (!draggedDnaObject || !dropTargetElement) {
        console.warn("Drop: No dragged DNA object or invalid drop target.", {draggedDnaObject, dropTargetElement});
        handleDragEnd(event);
        return;
    }
    dropTargetElement.classList.remove('drag-over');
    console.log("Drop Target Element:", dropTargetElement.id || dropTargetElement.className);
    console.log("Dragged DNA Object:", JSON.parse(JSON.stringify(draggedDnaObject)));
    console.log("Source Type:", draggedSourceType, "Source ID/Index:", draggedSourceIdentifier);

    // 暫存被拖曳的DNA數據副本，以防在從源頭移除後丟失引用
    const dnaDataToMove = JSON.parse(JSON.stringify(draggedDnaObject));
    const originalSourceType = draggedSourceType;
    const originalSourceIdentifier = draggedSourceIdentifier;

    // --- 處理刪除 ---
    if (dropTargetElement.id === 'inventory-delete-slot') {
        let itemNameToDelete = dnaDataToMove.name || "該DNA";
        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${itemNameToDelete}" 嗎？此操作無法復原。`, () => {
            if (originalSourceType === 'inventory' && typeof originalSourceIdentifier === 'string') {
                deleteDNAFromInventory(originalSourceIdentifier); // game-logic.js
                renderPlayerDNAInventory();
            } else if (originalSourceType === 'combination' && typeof originalSourceIdentifier === 'number') {
                const dnaFromSlot = gameState.dnaCombinationSlots[originalSourceIdentifier]; // 再次確認，因為dnaDataToMove是副本
                if (dnaFromSlot && dnaFromSlot.id && gameState.playerData.playerOwnedDNA.some(d => d.id === dnaFromSlot.id)) { // 檢查是否是來自庫存的實例
                    deleteDNAFromInventory(dnaFromSlot.id); // 從主庫存刪除
                    renderPlayerDNAInventory();
                }
                gameState.dnaCombinationSlots[originalSourceIdentifier] = null;
                renderDNACombinationSlots();
            } else if (originalSourceType === 'temporaryBackpack' && typeof originalSourceIdentifier === 'number') {
                gameState.temporaryBackpack.splice(originalSourceIdentifier, 1);
                renderTemporaryBackpack();
            }
            updateMonsterSnapshot(getSelectedMonster() || null);
            showFeedbackModal('操作成功', `DNA "${itemNameToDelete}" 已被刪除。`);
        });
    }
    // --- 處理拖曳到組合槽 ---
    else if (dropTargetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        const itemCurrentlyInTargetSlot = gameState.dnaCombinationSlots[targetSlotIndex] ? JSON.parse(JSON.stringify(gameState.dnaCombinationSlots[targetSlotIndex])) : null;

        // 1. 從源頭移除 (如果是真實移動)
        if (originalSourceType === 'inventory' && typeof originalSourceIdentifier === 'string') {
            deleteDNAFromInventory(originalSourceIdentifier); // 從主庫存移除
            renderPlayerDNAInventory();
        } else if (originalSourceType === 'combination' && typeof originalSourceIdentifier === 'number') {
            // 如果是組合槽之間的移動，源槽的物品會在 moveDnaToCombinationSlot 中被 itemCurrentlyInTargetSlot (或null) 替換
            // 所以這裡不需要 gameState.dnaCombinationSlots[originalSourceIdentifier] = null; 除非 target 和 source 是同一個（已在 moveDnaToCombinationSlot 處理）
        } else if (originalSourceType === 'temporaryBackpack' && typeof originalSourceIdentifier === 'number') {
            gameState.temporaryBackpack.splice(originalSourceIdentifier, 1);
            renderTemporaryBackpack();
        }

        // 2. 放置/交換到目標組合槽
        moveDnaToCombinationSlot(dnaDataToMove, (originalSourceType === 'combination' ? originalSourceIdentifier : null), targetSlotIndex);

        // 3. 如果目標槽原本有物品，且來源不是組合槽 (即來源是庫存或臨時背包)，則將目標槽原物品移回來源類型的容器
        if (itemCurrentlyInTargetSlot && originalSourceType !== 'combination') {
            if (originalSourceType === 'inventory') { // 原本是從庫存拖來，被擠出的物品也回庫存
                if (!gameState.playerData.playerOwnedDNA.find(d => d.id === itemCurrentlyInTargetSlot.id)) { // 確保不重複添加
                     gameState.playerData.playerOwnedDNA.push(itemCurrentlyInTargetSlot);
                }
                renderPlayerDNAInventory();
                console.log(`Item ${itemCurrentlyInTargetSlot.name} bumped from combo slot ${targetSlotIndex} back to inventory.`);
            } else if (originalSourceType === 'temporaryBackpack') { // 原本是從臨時背包拖來，被擠出的物品回臨時背包
                gameState.temporaryBackpack.push({ type: 'dna', data: itemCurrentlyInTargetSlot });
                renderTemporaryBackpack();
                console.log(`Item ${itemCurrentlyInTargetSlot.name} bumped from combo slot ${targetSlotIndex} back to temporary backpack.`);
            }
        }
    }
    // --- 處理拖曳到庫存區 ---
    else if (dropTargetElement.id === 'inventory-items' || dropTargetElement.classList.contains('inventory-slot-empty')) {
        if (originalSourceType === 'combination' && typeof originalSourceIdentifier === 'number') {
            // 確保 dnaDataToMove 有有效的實例 ID
            if (dnaDataToMove.id && !gameState.playerData.playerOwnedDNA.find(d => d.id === dnaDataToMove.id)) {
                 gameState.playerData.playerOwnedDNA.push(dnaDataToMove);
            } else if (!dnaDataToMove.id) { // 如果是沒有實例ID的模板數據（理論上不應發生從組合槽來的情況）
                dnaDataToMove.id = `dna_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                dnaDataToMove.baseId = dnaDataToMove.baseId || dnaDataToMove.id; // 確保有 baseId
                gameState.playerData.playerOwnedDNA.push(dnaDataToMove);
            }
            gameState.dnaCombinationSlots[originalSourceIdentifier] = null;
            renderDNACombinationSlots();
            renderPlayerDNAInventory();
            updateMonsterSnapshot(getSelectedMonster() || null);
            console.log(`DNA ${dnaDataToMove.name} moved from combination slot ${originalSourceIdentifier} to inventory.`);
        } else if (originalSourceType === 'temporaryBackpack' && typeof originalSourceIdentifier === 'number') {
            // 從臨時背包到庫存，需要創建/確認實例ID
            if (!dnaDataToMove.id || gameState.playerData.playerOwnedDNA.find(d => d.id === dnaDataToMove.id)) { // 如果沒有唯一ID或ID已存在，則創建新的
                dnaDataToMove.id = `dna_${gameState.playerId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
            }
            dnaDataToMove.baseId = dnaDataToMove.baseId || dnaDataToMove.id; // 確保有 baseId
            gameState.playerData.playerOwnedDNA.push(dnaDataToMove);
            gameState.temporaryBackpack.splice(originalSourceIdentifier, 1);
            renderTemporaryBackpack();
            renderPlayerDNAInventory();
            console.log(`DNA ${dnaDataToMove.name} moved from temporary backpack to inventory.`);
        }
    }
    // --- 處理拖曳到臨時背包區 ---
    else if (dropTargetElement.id === 'temporary-backpack-items' || dropTargetElement.classList.contains('temp-backpack-slot')) {
        // (不包括從臨時背包拖到臨時背包的內部排序，那需要更複雜的 insert/splice)
        if (originalSourceType === 'inventory' && typeof originalSourceIdentifier === 'string') {
            // 這裡的 dnaDataToMove 是從 playerOwnedDNA 來的帶有 instanceId 的對象
            gameState.temporaryBackpack.push({ type: 'dna', data: dnaDataToMove, instanceId: dnaDataToMove.id }); // 保留 instanceId
            deleteDNAFromInventory(originalSourceIdentifier); // 從主庫存移除
            renderPlayerDNAInventory();
            renderTemporaryBackpack();
            console.log(`DNA ${dnaDataToMove.name} moved from inventory to temporary backpack.`);
        } else if (originalSourceType === 'combination' && typeof originalSourceIdentifier === 'number') {
            // dnaDataToMove 是從組合槽來的對象
            gameState.temporaryBackpack.push({ type: 'dna', data: dnaDataToMove, instanceId: dnaDataToMove.id }); // 保留 instanceId (如果存在)
            gameState.dnaCombinationSlots[originalSourceIdentifier] = null;
            renderDNACombinationSlots();
            renderTemporaryBackpack();
            updateMonsterSnapshot(getSelectedMonster() || null);
            console.log(`DNA ${dnaDataToMove.name} moved from combination slot ${originalSourceIdentifier} to temporary backpack.`);
        }
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

    const dragDropContext = DOMElements.gameContainer || document.body; // 主要的拖放上下文

    // 統一在 dragDropContext 上監聽 dragstart 和 dragend
    dragDropContext.addEventListener('dragstart', handleDragStart);
    dragDropContext.addEventListener('dragend', handleDragEnd);

    // 為所有潛在的放置目標區域分別綁定 dragover, dragleave, drop
    const dropZones = [
        DOMElements.dnaCombinationSlotsContainer,
        DOMElements.inventoryItemsContainer, // 整個庫存區作為放置目標
        document.getElementById('inventory-delete-slot'),
        DOMElements.temporaryBackpackContainer // 整個臨時背包區作為放置目標
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

    console.log("All event listeners initialized with v2 drag-drop logic.");
}
