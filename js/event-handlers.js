// js/event-handlers.js

// 注意：此檔案依賴 DOMElements (來自 ui.js), gameState (來自 game-state.js),
// api-client.js 中的 API 函數, auth.js 中的認證函數,
// game-logic.js 中的遊戲邏輯函數, 以及 ui.js 中的 UI 更新函數。

let draggedElement = null;
let draggedDnaObject = null;
let draggedSourceType = null;
let draggedSourceIdentifier = null; // instanceId for inventory DNA, slotIndex for combination, tempItemIndex for temp backpack

function handleDragStart(event) {
    // 找到最近的拖曳源元素，它必須具有 dna-item, dna-slot.occupied 或 temp-backpack-slot.occupied 類
    const target = event.target.closest('.dna-item.occupied, .dna-slot.occupied, .temp-backpack-slot.occupied');
    if (!target) {
        event.preventDefault(); // 如果不是有效的可拖曳元素，則阻止拖曳
        return;
    }
    draggedElement = target;
    draggedSourceType = target.dataset.dnaSource;

    console.log("Drag Start - Element:", target, "Source Type:", draggedSourceType, "Dataset:", JSON.parse(JSON.stringify(target.dataset)));

    if (draggedSourceType === 'inventory') {
        // 對於庫存中的 DNA，其 identifier 是它的 data-inventory-index (數字)
        draggedSourceIdentifier = parseInt(target.dataset.inventoryIndex, 10);
        if (isNaN(draggedSourceIdentifier)) { console.warn("DragStart Inventory: Invalid data-inventory-index."); event.preventDefault(); return; }
        draggedDnaObject = gameState.playerData.playerOwnedDNA[draggedSourceIdentifier];
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
            draggedDnaObject.originalInstanceIdIfFromInventory = tempItem.instanceId; // 保留原 ID 供日後恢復
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
    // 將 identifier 設置到 dataTransfer 中，以便在 drop 時取回
    event.dataTransfer.setData('text/plain', String(draggedSourceIdentifier));
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { if (draggedElement) draggedElement.classList.add('dragging'); }, 0);
    console.log(`Dragging ${draggedSourceType} item with ID/Index: ${draggedSourceIdentifier}. Data:`, JSON.parse(JSON.stringify(draggedDnaObject)));
}

function handleDragEnd(event) {
    if (draggedElement) draggedElement.classList.remove('dragging');
    draggedElement = null;
    draggedDnaObject = null;
    draggedSourceType = null;
    draggedSourceIdentifier = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    console.log("Drag End: Resetting drag state.");
}

function handleDragOver(event) {
    event.preventDefault(); // 必須阻止預設行為，否則不會觸發 drop

    const validTarget = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot');
    
    // 清除所有先前的 highlighting
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

    if (validTarget) {
        let isAllowedDrop = false;

        // 如果是從庫存拖曳
        if (draggedSourceType === 'inventory') {
            // 允許拖曳到組合槽、空庫存槽、臨時背包或刪除區
            if (validTarget.classList.contains('dna-slot') ||
                validTarget.classList.contains('inventory-slot-empty') ||
                validTarget.classList.contains('temp-backpack-slot') || // 臨時背包可以是目標
                validTarget.id === 'inventory-delete-slot') {
                isAllowedDrop = true;
            }
        } 
        // 如果是從組合槽拖曳
        else if (draggedSourceType === 'combination') {
            // 允許拖曳到組合槽 (用於交換)、庫存 (空槽或已佔用，但需要考慮插入點)、臨時背包或刪除區
            if (validTarget.classList.contains('dna-slot') ||
                validTarget.classList.contains('dna-item') || // 庫存中的任一槽位（包括空槽）
                validTarget.classList.contains('temp-backpack-slot') ||
                validTarget.id === 'inventory-delete-slot') {
                isAllowedDrop = true;
            }
        }
        // 如果是從臨時背包拖曳
        else if (draggedSourceType === 'temporaryBackpack') {
            // 允許拖曳到組合槽、庫存 (空槽或已佔用) 或刪除區
            if (validTarget.classList.contains('dna-slot') ||
                validTarget.classList.contains('dna-item') || // 庫存中的任一槽位（包括空槽）
                validTarget.id === 'inventory-delete-slot') {
                isAllowedDrop = true;
            }
        }

        if (isAllowedDrop) {
            event.dataTransfer.dropEffect = 'move';
            validTarget.classList.add('drag-over');
        } else {
            event.dataTransfer.dropEffect = 'none'; // 不允許在此處放置
        }
    } else {
        event.dataTransfer.dropEffect = 'none'; // 不在任何有效目標上
    }
}


function handleDragLeave(event) {
    const target = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot');
    if (target && !target.contains(event.relatedTarget)) { // 確保鼠標真的離開了目標元素
        target.classList.remove('drag-over');
    }
}

async function handleDrop(event) {
    event.preventDefault(); // 阻止預設行為
    const dropTargetElement = event.target.closest('.dna-slot, .inventory-slot-empty, .temp-backpack-slot, #inventory-delete-slot');

    if (!draggedDnaObject || !dropTargetElement) {
        console.warn("Drop: No dragged DNA object or invalid drop target.", { draggedDnaObject, dropTargetElement });
        handleDragEnd(event);
        return;
    }
    dropTargetElement.classList.remove('drag-over'); // 移除拖曳時的視覺效果
    console.log("--- Drop Event ---");
    console.log("Target Element:", dropTargetElement.id || dropTargetElement.className, dropTargetElement.dataset);
    console.log("Dragged DNA Data (cloned for processing):", JSON.parse(JSON.stringify(draggedDnaObject)));
    console.log("Original Source Type:", draggedSourceType, "Original Source ID/Index:", draggedSourceIdentifier);

    const dnaDataToMove = JSON.parse(JSON.stringify(draggedDnaObject)); // 深拷貝以避免直接修改原始物件

    // --- A. 處理刪除 (拖曳到刪除區) ---
    if (dropTargetElement.id === 'inventory-delete-slot') {
        let itemNameToDelete = dnaDataToMove.name || "該DNA";
        showConfirmationModal('確認刪除', `您確定要永久刪除 DNA "${itemNameToDelete}" 嗎？此操作無法復原。`, () => {
            if (draggedSourceType === 'inventory' && typeof draggedSourceIdentifier === 'number') {
                deleteDNAFromInventory(draggedDnaObject.id); // 呼叫遊戲邏輯層的刪除函數
            } else if (draggedSourceType === 'combination' && typeof draggedSourceIdentifier === 'number') {
                // 如果是組合槽的 DNA，且該 DNA 存在於玩家的庫存中，則從庫存刪除
                const dnaInSlot = gameState.dnaCombinationSlots[draggedSourceIdentifier];
                if (dnaInSlot && dnaInSlot.id && gameState.playerData.playerOwnedDNA.some(d => d && d.id === dnaInSlot.id)) {
                    deleteDNAFromInventory(dnaInSlot.id);
                }
                gameState.dnaCombinationSlots[draggedSourceIdentifier] = null; // 清空組合槽
                renderDNACombinationSlots();
            } else if (draggedSourceType === 'temporaryBackpack' && typeof draggedSourceIdentifier === 'number') {
                // 從臨時背包中直接刪除
                gameState.temporaryBackpack.splice(draggedSourceIdentifier, 1);
                renderTemporaryBackpack();
            }
            updateMonsterSnapshot(getSelectedMonster() || null); // 更新快照顯示
            showFeedbackModal('操作成功', `DNA "${itemNameToDelete}" 已被刪除。`);
        });
    }
    // --- B. 處理拖曳到組合槽 ---
    else if (dropTargetElement.classList.contains('dna-slot')) {
        const targetSlotIndex = parseInt(dropTargetElement.dataset.slotIndex, 10);
        if (isNaN(targetSlotIndex)) { console.warn("Drop: Invalid targetSlotIndex for dna-slot."); handleDragEnd(event); return; }

        // 1. 從源頭移除 (如果不是組合槽之間的交換)
        if (draggedSourceType === 'inventory' && typeof draggedSourceIdentifier === 'number') {
            gameState.playerData.playerOwnedDNA[draggedSourceIdentifier] = null; // 將源庫存槽設為 null
            renderPlayerDNAInventory();
        } else if (draggedSourceType === 'temporaryBackpack' && typeof draggedSourceIdentifier === 'number') {
            gameState.temporaryBackpack.splice(draggedSourceIdentifier, 1); // 從臨時背包移除
            renderTemporaryBackpack();
        }
        // (組合槽之間的移動，源槽由 moveDnaToCombinationSlot 處理)

        // 2. 放置/交換到目標組合槽
        moveDnaToCombinationSlot(dnaDataToMove, (draggedSourceType === 'combination' ? draggedSourceIdentifier : null), targetSlotIndex);
        
        // 3. 如果目標槽原本有物品，且來源不是組合槽，則將目標槽原物品「退回」到庫存或臨時背包
        // 這裡需要檢查 moveDnaToCombinationSlot 是否已處理了交換，如果沒有，則需要手動處理退回
        // 為了簡化，moveDnaToCombinationSlot 已經處理了組合槽間的交換
        // 如果是從庫存/背包到組合槽，且目標組合槽原來有東西，那個東西會被移出
        // 目前 moveDnaToCombinationSlot 沒有處理這個被移出的物品的去向，這是一個問題點。
        // 當前設計是它會被 "丟棄" 或在渲染時消失。需要改進此處。
        // 暫時假定目標槽有物品時，該物品會被替換，原物品丟棄（不理想但符合現有 moveDnaToCombinationSlot 行為）
        // 更完善的方案是，如果目標槽非空，提示用戶替換還是取消，或自動退回到庫存
    }
    // --- C. 處理拖曳到庫存區 (包括空槽) ---
    else if (dropTargetElement.classList.contains('inventory-slot-empty')) {
        const targetInventoryIndex = parseInt(dropTargetElement.dataset.inventoryIndex, 10);
        if (isNaN(targetInventoryIndex)) { console.warn("Drop: Invalid targetInventoryIndex for inventory-slot-empty."); handleDragEnd(event); return; }

        // 確保目標槽位確實是空的
        if (gameState.playerData.playerOwnedDNA[targetInventoryIndex] !== null) {
            console.warn(`Drop: 目標庫存槽位 ${targetInventoryIndex} 已被佔用，不允許在此處放置。`);
            showFeedbackModal('操作無效', '該槽位已被佔用。請選擇一個空位。');
            handleDragEnd(event);
            return;
        }

        // 從源頭移除
        if (draggedSourceType === 'inventory' && typeof draggedSourceIdentifier === 'number') {
            gameState.playerData.playerOwnedDNA[draggedSourceIdentifier] = null; // 將源庫存槽設為 null
        } else if (draggedSourceType === 'combination' && typeof draggedSourceIdentifier === 'number') {
            gameState.dnaCombinationSlots[draggedSourceIdentifier] = null; // 清空組合槽
            renderDNACombinationSlots();
        } else if (draggedSourceType === 'temporaryBackpack' && typeof draggedSourceIdentifier === 'number') {
            // 從臨時背包中移除
            handleMoveFromTempBackpackToInventory(draggedSourceIdentifier, targetInventoryIndex); // 讓遊戲邏輯處理移動和添加到庫存
            handleDragEnd(event); // 結束拖曳事件
            return; // 提前返回，因為 handleMoveFromTempBackpackToInventory 會處理渲染
        } else {
            console.warn("Drop: 未知的 DNA 來源類型或 identifier。", draggedSourceType, draggedSourceIdentifier);
            handleDragEnd(event);
            return;
        }

        // 將 DNA 放置到目標空槽
        gameState.playerData.playerOwnedDNA[targetInventoryIndex] = dnaDataToMove;
        renderPlayerDNAInventory(); // 重新渲染庫存

    }
    // --- D. 處理拖曳到臨時背包區 (包括空槽) ---
    else if (dropTargetElement.classList.contains('temp-backpack-slot')) {
        const targetTempIndex = parseInt(dropTargetElement.dataset.tempItemIndex, 10);
        if (isNaN(targetTempIndex)) { console.warn("Drop: Invalid targetTempIndex for temp-backpack-slot."); handleDragEnd(event); return; }

        // 如果是從臨時背包拖曳到臨時背包 (排序)
        if (draggedSourceType === 'temporaryBackpack' && typeof draggedSourceIdentifier === 'number') {
            const [itemToReorder] = gameState.temporaryBackpack.splice(draggedSourceIdentifier, 1);
            // 根據目標槽是否被佔用來決定插入位置
            if (dropTargetElement.classList.contains('occupied')) {
                 // 如果拖曳到已佔用槽，找到該槽的真實索引並在其前面插入
                 // 這會導致後續元素移動，但這是臨時背包內部排序的行為
                 gameState.temporaryBackpack.splice(targetTempIndex, 0, itemToReorder);
            } else { // 拖曳到空槽，直接放置
                gameState.temporaryBackpack.splice(targetTempIndex, 0, itemToReorder);
            }
            renderTemporaryBackpack();
            handleDragEnd(event);
            return;
        }

        // 檢查臨時背包是否還有空位
        if (gameState.temporaryBackpack.length >= 24) { // MAX_TEMP_SLOTS = 24
            showFeedbackModal('背包已滿', '臨時背包已滿，無法放入更多物品。');
            handleDragEnd(event);
            return;
        }

        // 從源頭移除
        if (draggedSourceType === 'inventory' && typeof draggedSourceIdentifier === 'number') {
            gameState.playerData.playerOwnedDNA[draggedSourceIdentifier] = null; // 將源庫存槽設為 null
            renderPlayerDNAInventory();
        } else if (draggedSourceType === 'combination' && typeof draggedSourceIdentifier === 'number') {
            // 組合槽中的 DNA 被移入臨時背包
            gameState.dnaCombinationSlots[draggedSourceIdentifier] = null; // 清空組合槽
            renderDNACombinationSlots();
        } else {
            console.warn("Drop: 未知的 DNA 來源類型或 identifier。", draggedSourceType, draggedSourceIdentifier);
            handleDragEnd(event);
            return;
        }

        // 將物品加入臨時背包 (通常是加到最後，因為臨時背包沒有嚴格的"空位"概念)
        addDnaToTemporaryBackpack(dnaDataToMove); // 呼叫 game-logic 函數添加

    } else {
        console.log("Drop: Unhandled drop target or scenario.", dropTargetElement.id, dropTargetElement.className);
    }

    handleDragEnd(event); // 結束拖曳事件
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

// --- 其他事件處理函數 ---
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
