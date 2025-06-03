// game-logic.js

// 實際導入所有必要的模組
import { auth, db, firebaseApp, __app_id } from './firebase-config.js'; // Firebase 實例和 __app_id
import * as ApiClient from './api-client.js'; // API 呼叫函式
import * as GameState from './game-state.js'; // 遊戲狀態和 DOM 元素引用
import * as UI from './ui.js'; // UI 操作函式

// --- DNA 和庫存邏輯 ---

// 輔助函式：更新所有相關的 UI 顯示
function updateAllUIDisplays() {
    UI.populateInventory();
    UI.populateTemporaryBackpack();
    UI.populateFarmList();
    UI.updateMonsterSnapshotDisplay(GameState.currentMonster);
    UI.updateActionButtonsStateUI(); // 更新按鈕狀態
}

// 輔助函式：將數據保存到 Firestore
async function savePlayerData() {
    await GameState.saveUserData();
}

export function handleDrawDnaButtonClick() {
    console.log("抽DNA按鈕被點擊");
    const drawnDnaForModal = [];
    if (GameState.gameSettings.dnaFragments && GameState.gameSettings.dnaFragments.length > 0) {
        // 篩選出可抽取的普通或稀有等級DNA
        const drawableDna = GameState.gameSettings.dnaFragments.filter(
            f => f.rarity === "普通" || f.rarity === "稀有" || f.rarity === "精英" || f.rarity === "傳說" || f.rarity === "神話"
        );
        if (drawableDna.length > 0) {
            for (let i = 0; i < 6; i++) { // 抽取 6 個 DNA
                const randomDnaTemplate = drawableDna[Math.floor(Math.random() * drawableDna.length)];
                const newDnaInstance = JSON.parse(JSON.stringify(randomDnaTemplate));
                newDnaInstance.tempId = `drawn_${Date.now()}_${i}`; // 給予臨時 ID
                drawnDnaForModal.push(newDnaInstance);
            }
        } else {
             UI.showFeedbackModal("提示", "沒有可抽取的DNA碎片。", false, true);
             console.warn("沒有可抽取的普通或稀有等級DNA。");
        }
    } else {
        UI.showFeedbackModal("提示", "遊戲設定中沒有DNA碎片資料。", false, true);
        console.warn("遊戲設定中沒有DNA碎片資料。");
    }

    UI.renderDnaDrawResults(drawnDnaForModal); // 讓 UI 模組渲染結果並打開模態框
}

export function addToTemporaryBackpack(dnaItem) {
    let added = false;
    // 尋找臨時背包中的空位
    for (let i = 0; i < GameState.NUM_TEMP_BACKPACK_SLOTS; i++) {
        if (GameState.temporaryBackpackSlots[i] === null) {
            const newItem = {...dnaItem};
            // 確保 newItem 有一個唯一的 ID，用於識別
            newItem.id = dnaItem.id || `temp_dna_${Date.now()}_${i}`;
            GameState.temporaryBackpackSlots[i] = newItem;
            added = true;
            break;
        }
    }
    if (!added) {
        // 如果臨時背包已滿，覆蓋最舊的物品（或給予提示）
        UI.showFeedbackModal("提示", `臨時背包已滿！${dnaItem.name} 未能加入，請整理背包。`, false, true);
        console.log(`臨時背包已滿。${dnaItem.name} 未能加入。`);
        // 這裡可以選擇覆蓋第一個位置，或者不添加
        // GameState.temporaryBackpackSlots[0] = {...dnaItem, id: dnaItem.id || `temp_dna_${Date.now()}_0`};
    }
    UI.populateTemporaryBackpack(); // 更新臨時背包 UI
    if (auth.currentUser) savePlayerData(); // 保存數據 (使用導入的 auth)
    console.log(`物品已添加到臨時背包：${dnaItem.name}。`);
}

export function moveFromTempToInventory(tempSlotIndex) {
    const itemToMove = GameState.temporaryBackpackSlots[tempSlotIndex];
    if (!itemToMove) return;

    // 尋找庫存中的空位
    const emptyMainSlot = GameState.playerData.playerOwnedDNA.findIndex(slot => slot === null);

    if (emptyMainSlot !== -1) {
        GameState.playerData.playerOwnedDNA[emptyMainSlot] = itemToMove; // 移入玩家庫存
        GameState.temporaryBackpackSlots[tempSlotIndex] = null; // 清空臨時背包槽位
        UI.populateInventory(); // 更新庫存 UI
        UI.populateTemporaryBackpack(); // 更新臨時背包 UI
        if (auth.currentUser) savePlayerData(); // 保存數據 (使用導入的 auth)
        UI.showFeedbackModal("成功", `${itemToMove.name} 已從臨時背包移至庫存。`, true, false);
        console.log("物品已從臨時背包移至庫存。");
    } else {
        UI.showFeedbackModal("提示", "DNA碎片庫已滿！請先清出空間。", false, true);
        console.log("DNA碎片庫已滿，無法從臨時背包移動物品。");
    }
}

export function promptDeleteItem(itemId, itemSlotIndex, itemSourceType, itemNameOverride = null) {
    GameState.itemToDeleteInfo = { id: itemId, slotIndex: itemSlotIndex, sourceType: itemSourceType };
    const itemName = itemNameOverride || (itemSourceType === 'inventory'
        ? (GameState.playerData.playerOwnedDNA[itemSlotIndex] ? GameState.playerData.playerOwnedDNA[itemSlotIndex].name : '該DNA')
        : (GameState.temporaryBackpackSlots[itemSlotIndex] ? GameState.temporaryBackpackSlots[itemSlotIndex].name : '該物品'));

    // 設置確認模態框的內容和行為
    const confirmationMessageEl = GameState.elements.confirmationMessage;
    const confirmActionBtnEl = GameState.elements.confirmActionBtn;
    const confirmationModalTitleEl = GameState.elements.confirmationModalTitle;
    const releaseMonsterImagePlaceholder = GameState.elements.releaseMonsterImagePlaceholder;

    if (confirmationMessageEl && confirmActionBtnEl && confirmationModalTitleEl && releaseMonsterImagePlaceholder) {
        confirmationModalTitleEl.textContent = "刪除確認";
        confirmationMessageEl.textContent = `確定刪除 "${itemName}"？此動作無法復原。`;
        releaseMonsterImagePlaceholder.style.display = 'none'; // 刪除物品時不顯示圖片

        confirmActionBtnEl.className = 'danger'; // 設置按鈕樣式為危險
        confirmActionBtnEl.textContent = '確定刪除';
        // 綁定確認按鈕的點擊事件
        confirmActionBtnEl.onclick = () => {
            deleteItemConfirmed(); // 呼叫實際刪除邏輯
        };
        UI.openModal('confirmation-modal'); // 打開確認模態框
    } else {
        console.error("確認模態框的必要元素未找到。");
        UI.showFeedbackModal("錯誤", "無法打開刪除確認視窗。", false, true);
    }
    console.log(`提示刪除 ${itemName}。`);
}

// 實際刪除物品的邏輯 (由確認模態框的確定按鈕呼叫)
function deleteItemConfirmed() {
    if (!GameState.itemToDeleteInfo) return;

    const { id, slotIndex, sourceType } = GameState.itemToDeleteInfo;
    let deletedItemName = '';

    if (sourceType === 'inventory') {
        if (GameState.playerData.playerOwnedDNA[slotIndex] && (GameState.playerData.playerOwnedDNA[slotIndex].id === id || GameState.playerData.playerOwnedDNA[slotIndex].tempId === id)) {
            deletedItemName = GameState.playerData.playerOwnedDNA[slotIndex].name;
            GameState.playerData.playerOwnedDNA[slotIndex] = null; // 清空庫存槽位
        }
    } else if (sourceType === 'temporary') {
        if (GameState.temporaryBackpackSlots[slotIndex] && (GameState.temporaryBackpackSlots[slotIndex].id === id || GameState.temporaryBackpackSlots[slotIndex].tempId === id)) {
            deletedItemName = GameState.temporaryBackpackSlots[slotIndex].name;
            GameState.temporaryBackpackSlots[slotIndex] = null; // 清空臨時背包槽位
        }
    }

    // 檢查組合槽中是否有該物品，如果有則清除
    for (let i = 0; i < GameState.NUM_COMBINATION_SLOTS; i++) {
        const comboItem = GameState.combinationSlotsData[i];
        if (comboItem && (comboItem.id === id || comboItem.tempId === id)) {
            clearCombinationSlot(i, false); // 清除組合槽，但不返回庫存
        }
    }

    UI.populateInventory(); // 更新庫存 UI
    UI.populateTemporaryBackpack(); // 更新臨時背包 UI
    UI.closeModal('confirmation-modal'); // 關閉確認模態框
    UI.updateActionButtonsStateUI(); // 更新按鈕狀態
    if (auth.currentUser) savePlayerData(); // 保存數據 (使用導入的 auth)
    GameState.itemToDeleteInfo = null; // 清空刪除資訊
    UI.showFeedbackModal("成功", `"${deletedItemName}" 已成功刪除。`, true, false);
    console.log(`物品 "${deletedItemName}" 已刪除。`);
}


// --- 拖放邏輯 ---
export function handleDragStart(e) {
    // 確保拖曳的是一個有效的 DNA 物品 
    const dnaInfoStr = e.target.dataset.dnaInfo;
    if (!dnaInfoStr) {
        e.preventDefault();
        return;
    }
    try {
        JSON.parse(dnaInfoStr);
    } catch (jsonError) {
        console.error("無效的 DNA 資訊 JSON:", jsonError);
        e.preventDefault();
        return;
    }

    e.dataTransfer.effectAllowed = "move"; // 允許移動操作
    e.dataTransfer.setData('application/json', dnaInfoStr); // 傳遞 DNA 物品的 JSON 數據 

    // 獲取來源槽位類型和索引
    const sourceType = e.target.closest('[data-droptype]').dataset.droptype;
    let sourceIndexStr = e.target.dataset.slotIndex || e.target.dataset.inventorySlotIndex || e.target.dataset.slotId;

    if (sourceIndexStr === undefined || sourceIndexStr === null || String(sourceIndexStr).trim() === "") {
        console.error("無法獲取來源槽位索引。");
        e.preventDefault();
        return;
    }

    e.dataTransfer.setData('text/source-type', sourceType);
    e.dataTransfer.setData('text/source-index', String(sourceIndexStr));
    console.log(`拖曳開始：來源類型 ${sourceType}, 索引 ${sourceIndexStr}, DNA: ${dnaInfoStr}`);
}

export function handleDrop(e) {
    e.preventDefault();
    const targetDropZone = e.target.closest('[data-droptype]');
    if (!targetDropZone) return; // 如果沒有拖放到有效的放置區
    if (targetDropZone.dataset.droptype === "delete") return; // 如果拖放到刪除區，則由 handleDropOnDeleteSlot 處理 

    // 移除拖曳時添加的視覺效果
    targetDropZone.classList.remove('drag-over');

    const dnaDataString = e.dataTransfer.getData('application/json');
    const sourceType = e.dataTransfer.getData('text/source-type');
    const sourceIndexString = e.dataTransfer.getData('text/source-index');

    if (!dnaDataString || !sourceType || sourceIndexString === null || sourceIndexString === undefined || sourceIndexString.trim() === "") {
        console.warn("拖放數據不完整。");
        return;
    }

    const sourceIndex = parseInt(sourceIndexString, 10);
    if (isNaN(sourceIndex)) {
        console.error("無效的來源索引。");
        return;
    }

    const droppedDNA = JSON.parse(dnaDataString);
    const targetDropType = targetDropZone.dataset.droptype;
    let moved = false;

    if (targetDropType === "combination") {
        const targetComboSlotIndex = parseInt(targetDropZone.dataset.slotId);
        if (!GameState.combinationSlotsData[targetComboSlotIndex]) { // 確保目標槽位是空的
            GameState.combinationSlotsData[targetComboSlotIndex] = droppedDNA;
            UI.updateCombinationSlotUI(targetComboSlotIndex, droppedDNA); // 更新 UI

            // 從來源移除物品
            if (sourceType === 'inventory') {
                GameState.playerData.playerOwnedDNA[sourceIndex] = null;
            } else if (sourceType === 'combination' && sourceIndex !== targetComboSlotIndex) {
                clearCombinationSlot(sourceIndex, false); // 清除來源組合槽，不返回庫存
            } else if (sourceType === 'temporary') {
                GameState.temporaryBackpackSlots[sourceIndex] = null;
            }
            moved = true;
        } else {
            UI.showFeedbackModal("提示", "組合槽位已被佔用！", false, true);
        }
    } else if (targetDropType === "inventory") {
        // 拖曳到庫存區
        const targetInventorySlotIndex = parseInt(targetDropZone.dataset.inventorySlotIndex); // 獲取目標槽位索引
        if (!GameState.playerData.playerOwnedDNA[targetInventorySlotIndex]) { // 確保目標槽位是空的
            GameState.playerData.playerOwnedDNA[targetInventorySlotIndex] = droppedDNA;

            // 從來源移除物品
            if (sourceType === 'combination') {
                clearCombinationSlot(sourceIndex, false); // 清除組合槽，不返回庫存
            } else if (sourceType === 'temporary') {
                GameState.temporaryBackpackSlots[sourceIndex] = null;
            } else if (sourceType === 'inventory' && sourceIndex !== targetInventorySlotIndex) {
                GameState.playerData.playerOwnedDNA[sourceIndex] = null; // 如果是庫存內部移動
            }
            moved = true;
        } else {
            UI.showFeedbackModal("提示", "庫存槽位已被佔用！", false, true);
        }
    } else if (targetDropType === "temporary") {
        // 拖曳到臨時背包區
        const targetTempSlotIndex = parseInt(targetDropZone.dataset.slotIndex);
        if (!GameState.temporaryBackpackSlots[targetTempSlotIndex]) { // 確保目標槽位是空的
            GameState.temporaryBackpackSlots[targetTempSlotIndex] = droppedDNA;

            // 從來源移除物品
            if (sourceType === 'combination') {
                clearCombinationSlot(sourceIndex, false); // 清除組合槽，不返回庫存
            } else if (sourceType === 'inventory') {
                GameState.playerData.playerOwnedDNA[sourceIndex] = null;
            } else if (sourceType === 'temporary' && sourceIndex !== targetTempSlotIndex) {
                GameState.temporaryBackpackSlots[sourceIndex] = null; // 如果是臨時背包內部移動
            }
            moved = true;
        } else {
            UI.showFeedbackModal("提示", "臨時背包槽位已被佔用！", false, true);
        }
    }

    if (moved) {
        updateAllUIDisplays(); // 更新所有相關 UI
        if (auth.currentUser) savePlayerData(); // 保存數據 (使用導入的 auth)
        UI.showFeedbackModal("成功", `${droppedDNA.name} 已成功移動！`, true, false);
    } else {
        UI.showFeedbackModal("提示", "物品未能移動到目標位置。", false, true);
    }
    console.log("拖放操作完成。");
}

export function handleDropOnDeleteSlot(e) {
    e.preventDefault();
    const targetDropZone = e.target.closest('[data-droptype="delete"]');
    if (!targetDropZone) return;

    targetDropZone.classList.remove('drag-over'); // 移除視覺效果

    const dnaDataString = e.dataTransfer.getData('application/json');
    const sourceType = e.dataTransfer.getData('text/source-type');
    const sourceIndexString = e.dataTransfer.getData('text/source-index');

    if (!dnaDataString || !sourceType || sourceIndexString === null || sourceIndexString === undefined || sourceIndexString.trim() === "") {
        console.warn("拖放數據不完整，無法刪除。");
        return;
    }

    const sourceIndex = parseInt(sourceIndexString, 10);
    const droppedDNA = JSON.parse(dnaDataString);

    // 呼叫提示刪除函式，讓使用者確認
    promptDeleteItem(droppedDNA.id || droppedDNA.tempId, sourceIndex, sourceType, droppedDNA.name);
    console.log("拖放到刪除區。");
}

export function handleDragOver(e) {
    e.preventDefault();
    // 添加視覺效果，表示可以放置
    const targetDropZone = e.target.closest('[data-droptype]');
    if (targetDropZone && targetDropZone.dataset.droptype !== "delete") {
        targetDropZone.classList.add('drag-over');
    } else if (targetDropZone && targetDropZone.dataset.droptype === "delete") {
        targetDropZone.classList.add('drag-over'); // 刪除區也有拖曳效果
    }
}

export function handleDragLeave(e) {
    // 移除視覺效果
    const targetDropZone = e.target.closest('[data-droptype]');
    if (targetDropZone) {
        targetDropZone.classList.remove('drag-over');
    }
}

export function handleComboSlotClick(slotId) {
    console.log("組合槽被點擊 (game-logic.js)");
    if (GameState.combinationSlotsData[slotId]) {
        clearCombinationSlot(slotId, true); // 清除槽位並返回庫存
        UI.showFeedbackModal("成功", "DNA碎片已從組合槽移除並返回背包。", true, false);
    }
}


export function clearCombinationSlot(comboSlotId, returnToInventory = true) {
    const returnedDNA = GameState.combinationSlotsData[comboSlotId];
    if (!returnedDNA) return;

    GameState.combinationSlotsData[comboSlotId] = null; // 清空數據中的組合槽
    UI.clearCombinationSlotUI(comboSlotId); // 更新 UI

    if (returnToInventory) {
        // 嘗試放回庫存
        const emptyInventorySlotIndex = GameState.playerData.playerOwnedDNA.findIndex(slot => slot === null);
        if (emptyInventorySlotIndex !== -1) {
            GameState.playerData.playerOwnedDNA[emptyInventorySlotIndex] = returnedDNA;
            UI.populateInventory(); // 更新庫存 UI
            UI.showFeedbackModal("成功", `${returnedDNA.name} 已返回DNA庫。`, true, false);
        } else {
            // 庫存已滿，嘗試放回臨時背包
            const emptyTempSlotIndex = GameState.temporaryBackpackSlots.findIndex(slot => slot === null);
            if (emptyTempSlotIndex !== -1) {
                GameState.temporaryBackpackSlots[emptyTempSlotIndex] = returnedDNA;
                UI.populateTemporaryBackpack(); // 更新臨時背包 UI
                UI.showFeedbackModal("成功", `${returnedDNA.name} 已返回臨時背包。`, true, false);
            } else {
                // 兩個都滿了，直接丟棄（或提示使用者整理）
                UI.showFeedbackModal("提示", `${returnedDNA.name} 已從組合槽移除，但背包和物品欄均已滿，請整理。`, false, true);
                console.log(`${returnedDNA.name} 已返回DNA池，但背包和物品欄均已滿。`);
            }
        }
    }
    UI.updateActionButtonsStateUI(); // 更新按鈕狀態
    if (auth.currentUser) savePlayerData(); // 保存數據 (使用導入的 auth)
    console.log(`組合槽 ${comboSlotId} 已清除。`);
}


// --- 怪獸創建與 AI ---
export async function combineDNA() {
    const dnaToCombine = GameState.combinationSlotsData.filter(slot => slot !== null);
    if (dnaToCombine.length === 0) {
        UI.showFeedbackModal("提示", "請先放入至少一個DNA碎片進行組合。", false, true);
        return;
    }
    if (!auth.currentUser) { // 使用導入的 auth
        UI.showFeedbackModal("錯誤", "請先登入才能組合怪獸。", false, true);
        return;
    }
    if (GameState.farmedMonsters.length >= GameState.MAX_FARM_SLOTS) {
        UI.showFeedbackModal("提示", `怪物農場已滿 (${GameState.MAX_FARM_SLOTS}隻)，無法組合新怪獸。請先放生部分怪獸。`, false, true);
        return;
    }


    // 提取 DNA 的 baseId 或構造 ID
    const idsToSend = dnaToCombine.map(dna => {
        // 如果是從遊戲設定中來的 DNA (有 baseId 或符合特定格式的 id)
        if (dna.baseId) return dna.baseId;
        if (dna.id && typeof dna.id === 'string' && dna.id.startsWith('dna_frag_')) {
            const parts = dna.id.split('_');
            if (parts.length >= 3) { // 例如 dna_frag_fire_01 -> dna_frag_fire
                return `${parts[0]}_${parts[1]}_${parts[2]}`;
            }
        }
        // 對於臨時抽取的 DNA，可能只有 tempId
        return dna.tempId || dna.id; // 確保有一個 ID
    }).filter(Boolean); // 過濾掉任何 null 或 undefined 的 ID

    UI.showFeedbackModal("組合中...", "正在努力組合新的怪獸，請稍候...", true, false);
    console.log("正在組合 DNA...", idsToSend);

    try {
        // const idToken = await auth.currentUser?.getIdToken(); // ApiClient 內部會處理認證，不需要在這裡獲取和傳遞

        // 呼叫後端 API 進行 DNA 組合 (移除 idToken 參數)
        const response = await ApiClient.combineDNA(idsToSend);

        if (!response || response.error) {
            throw new Error(response.error || "後端回傳組合錯誤但未提供詳細訊息。");
        }
        let newMonster = response; // 假設後端直接返回新怪獸物件

        // 為新怪獸生成 AI 描述
        newMonster = await generateAndStoreAIDescriptions(newMonster);

        // 檢查是否是第一次合成怪獸 (用於成就和自動出戰)
        const isFirstMonsterEver = GameState.farmedMonsters.length === 0 && (!GameState.playerData.achievements || !GameState.playerData.achievements.includes("首次組合怪獸"));

        // 將新怪獸添加到農場
        GameState.farmedMonsters.push(newMonster);
        addLogEntry(newMonster, "✨ 成功組合誕生！");

        // 如果是第一個怪獸，自動設定為出戰狀態
        if (isFirstMonsterEver) {
            newMonster.farmStatus = newMonster.farmStatus || {};
            newMonster.farmStatus.isBattling = true;
            GameState.battlingMonsterId = newMonster.id;
            GameState.currentMonster = newMonster; // 設定為當前怪獸
            addLogEntry(newMonster, "🟢 自動進入出戰狀態 (首次合成)。");
            // 添加成就
            if (!GameState.playerData.achievements.includes("首次組合怪獸")) {
                GameState.playerData.achievements.push("首次組合怪獸");
            }
        } else if (!GameState.currentMonster) {
            // 如果不是第一個，但目前沒有選中怪獸，則將其設為當前怪獸
            GameState.currentMonster = newMonster;
        }

        // 清空組合槽
        GameState.combinationSlotsData.fill(null);
        UI.createCombinationSlots(); // 重新渲染組合槽

        updateAllUIDisplays(); // 更新所有相關 UI
        savePlayerData(); // 保存數據

        UI.showFeedbackModal(`怪獸 "${newMonster.nickname}" 組合成功！`, `恭喜您，新的怪獸誕生了！`, false, true, true, newMonster);
        console.log(`怪獸 ${newMonster.nickname} 組合成功。`);

    } catch (error) {
        console.error("DNA 組合失敗:", error);
        UI.showFeedbackModal("組合失敗", `DNA組合失敗：${error.message}`, false, true);
    } finally {
        UI.updateActionButtonsStateUI(); // 確保按鈕狀態更新
    }
}

export async function generateAndStoreAIDescriptions(monster) {
    // 如果 AI 描述已存在，則直接返回
    if (!monster || (monster.aiPersonality && monster.aiIntroduction && monster.aiEvaluation)) {
        return monster;
    }

    UI.showFeedbackModal(`為 ${monster.nickname} 生成AI評價`, "正在與AI溝通，請稍候...", true, false);
    console.log(`正在為 ${monster.nickname} 生成 AI 描述...`);

    try {
        // const idToken = await auth.currentUser?.getIdToken(); // ApiClient 內部會處理認證，不需要在這裡獲取和傳遞
        // ApiClient.generateAIDescriptions 期望 monsterData 物件作為參數，而不是 prompt 字串
        const aiDescriptions = await ApiClient.generateAIDescriptions(monster);

        if (aiDescriptions) {
            monster.aiPersonality = aiDescriptions.personality;
            monster.aiIntroduction = aiDescriptions.introduction;
            monster.aiEvaluation = aiDescriptions.evaluation;
            console.log(`AI 描述為 ${monster.nickname} 生成成功。`);
        } else {
            console.warn(`未能為 ${monster.nickname} 生成 AI 描述。`);
            monster.aiPersonality = { name: "未知", text: "AI描述生成失敗。", color: "var(--text-secondary)" };
            monster.aiIntroduction = "AI描述生成失敗。";
            monster.aiEvaluation = "AI描述生成失敗。";
        }
    } catch (error) {
        console.error(`為 ${monster.nickname} 生成 AI 描述失敗:`, error);
        monster.aiPersonality = { name: "未知", text: "AI描述生成失敗。", color: "var(--text-secondary)" };
        monster.aiIntroduction = "AI描述生成失敗。";
        monster.aiEvaluation = "AI描述生成失敗。";
    } finally {
        UI.closeModal('feedback-modal'); // 關閉生成中的提示
        // 如果怪獸資訊模態框是打開的，且顯示的是當前怪獸，則更新它
        const monsterInfoModalEl = GameState.elements.monsterInfoModal;
        if (monsterInfoModalEl && monsterInfoModalEl.style.display === 'flex' && GameState.currentMonster && GameState.currentMonster.id === monster.id) {
            UI.updateMonsterInfoModal(monster); // 呼叫 UI 函式更新模態框內容
        }
        if (auth.currentUser) savePlayerData(); // 保存更新後的怪獸數據 (使用導入的 auth)
    }
    return monster;
}


// --- 農場邏輯 ---
export function toggleBattleStatus(monsterIdToBattle) {
    let newBattlingMonster = null;
    let changed = false;

    GameState.farmedMonsters.forEach(m => {
        if (!m.farmStatus) m.farmStatus = {}; // 確保 farmStatus 存在
        if (m.id === monsterIdToBattle) {
            if (m.farmStatus.isTraining) {
                UI.showFeedbackModal("提示", `${m.nickname} 正在修煉中，無法出戰。`, false, true);
                return; // 無法切換
            }
            const previousBattleStatus = m.farmStatus.isBattling;
            m.farmStatus.isBattling = !m.farmStatus.isBattling; // 切換出戰狀態
            if (m.farmStatus.isBattling !== previousBattleStatus) changed = true;
            addLogEntry(m, m.farmStatus.isBattling ? "🟢 進入出戰狀態。" : "🔴 解除出戰狀態，開始休息。");
            if (m.farmStatus.isBattling) newBattlingMonster = m;
        } else {
            if (m.farmStatus.isBattling) { // 如果其他怪獸正在出戰，則解除其出戰狀態
                m.farmStatus.isBattling = false;
                addLogEntry(m, "🔴 解除出戰狀態 (因其他怪獸出戰)。");
                changed = true;
            }
        }
    });

    GameState.battlingMonsterId = newBattlingMonster ? newBattlingMonster.id : null;
    GameState.currentMonster = newBattlingMonster || GameState.farmedMonsters[0] || null; // 更新當前顯示的怪獸

    updateAllUIDisplays(); // 更新所有相關 UI
    if (changed && auth.currentUser) savePlayerData(); // 如果狀態有改變則保存數據 (使用導入的 auth)
    UI.showFeedbackModal("成功", "怪獸出戰狀態已更新。", true, false);
    console.log(`怪獸 ${monsterIdToBattle} 的出戰狀態已切換。`);
}

export function openCultivationSetupModal(monsterId) {
    GameState.currentCultivationMonster = GameState.farmedMonsters.find(m => m.id === monsterId);
    if (!GameState.currentCultivationMonster) {
        console.error("無法找到要修煉的怪獸。");
        UI.showFeedbackModal("錯誤", "無法找到該怪獸進行修煉。", false, true);
        return;
    }

    const { cultivationMonsterName, maxCultivationTime } = GameState.elements;
    if (cultivationMonsterName && maxCultivationTime) {
        cultivationMonsterName.textContent = GameState.currentCultivationMonster.nickname;
        maxCultivationTime.textContent = GameState.MAX_CULTIVATION_SECONDS;
        UI.openModal('cultivation-setup-modal');
    } else {
        console.error("修煉設定模態框的必要元素未找到。");
        UI.showFeedbackModal("錯誤", "無法打開修煉設定視窗。", false, true);
    }
    console.log(`打開 ${monsterId} 的修煉設定。`);
}

export function startCultivation() {
    if (!GameState.currentCultivationMonster) return;

    if (!GameState.currentCultivationMonster.farmStatus) GameState.currentCultivationMonster.farmStatus = {};
    GameState.currentCultivationMonster.farmStatus.isTraining = true;
    GameState.currentCultivationMonster.farmStatus.trainingStartTime = Date.now();
    GameState.currentCultivationMonster.farmStatus.active = false; // 修煉時不活躍
    GameState.currentCultivationMonster.farmStatus.type = 'train';
    // 初始化或重置 boosts
    GameState.currentCultivationMonster.farmStatus.boosts = { hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, crit: 0};

    addLogEntry(GameState.currentCultivationMonster, "🏋️ 開始了新的修煉。");
    UI.closeModal('cultivation-setup-modal');
    UI.populateFarmList(); // 更新農場列表 UI
    if (auth.currentUser) savePlayerData(); // 使用導入的 auth

    // 啟動計時器
    if (GameState.currentCultivationMonster.farmStatus.timerId) {
        clearInterval(GameState.currentCultivationMonster.farmStatus.timerId);
    }
    GameState.currentCultivationMonster.farmStatus.timerId = setInterval(() => {
        const monsterInFarm = GameState.farmedMonsters.find(m => m.id === GameState.currentCultivationMonster.id);
        if (!monsterInFarm || !monsterInFarm.farmStatus || !monsterInFarm.farmStatus.isTraining) {
             clearInterval(GameState.currentCultivationMonster.farmStatus.timerId);
             GameState.currentCultivationMonster.farmStatus.timerId = null;
             return;
        }
        const elapsedSeconds = Math.floor((Date.now() - (monsterInFarm.farmStatus.trainingStartTime || Date.now())) / 1000);
        monsterInFarm.farmStatus.remainingTime = GameState.MAX_CULTIVATION_SECONDS - elapsedSeconds; // 更新剩餘時間

        // 更新農場列表中該怪獸的狀態顯示
        const farmItem = GameState.elements.farmedMonstersList?.querySelector(`.farm-monster-item[data-monster-id="${monsterInFarm.id}"]`);
        if (farmItem) {
            const statusDiv = farmItem.querySelector('.farm-monster-status');
            if (statusDiv) UI.updateFarmMonsterStatusDisplay(monsterInFarm, statusDiv);
        }

        console.log(`修煉計時器：${monsterInFarm.nickname} 剩餘 ${monsterInFarm.farmStatus.remainingTime} 秒。`);
        if (elapsedSeconds >= GameState.MAX_CULTIVATION_SECONDS) {
            console.log(`${monsterInFarm.nickname} 修煉已達上限 ${GameState.MAX_CULTIVATION_SECONDS} 秒。自動結束。`);
            pauseTraining(monsterInFarm.id);
        }
    }, 1000);
    UI.showFeedbackModal("修煉開始", `${GameState.currentCultivationMonster.nickname} 已開始修煉！`, true, false);
    console.log("修煉已開始。");
}

export function pauseTraining(monsterId) {
    const monster = GameState.farmedMonsters.find(m => m.id === monsterId);
    if (!monster || !monster.farmStatus || !monster.farmStatus.isTraining) return;

    if (monster.farmStatus.timerId) {
        clearInterval(monster.farmStatus.timerId);
        monster.farmStatus.timerId = null;
    }
    let trainingDuration = Math.floor((Date.now() - (monster.farmStatus.trainingStartTime || Date.now())) / 1000);
    trainingDuration = Math.min(trainingDuration, GameState.MAX_CULTIVATION_SECONDS); // 確保不超過最大時長

    monster.farmStatus.isTraining = false;
    monster.farmStatus.remainingTime = 0; // 重置剩餘時間
    addLogEntry(monster, `修煉結束，共持續 ${trainingDuration} 秒。`);
    resolveTrainingAndShowResults(monster, trainingDuration);
    UI.populateFarmList(); // 更新農場列表 UI
    if (auth.currentUser) savePlayerData(); // 使用導入的 auth
    UI.showFeedbackModal("修煉結束", `${monster.nickname} 的修煉已結束！`, true, false);
    console.log(`怪獸 ${monsterId} 的修煉已暫停。`);
}

export function resolveTrainingAndShowResults(monster, durationSeconds) {
    let story = `在 ${Math.floor(durationSeconds / 60)}分${durationSeconds % 60}秒 的刻苦修煉中，${monster.nickname} `;
    let growthLogHTML = "";
    GameState.itemsFromCurrentTraining = []; // 清空上次修煉的物品

    // 根據修煉時長增加屬性 (簡化邏輯)
    const baseGrowth = Math.floor(durationSeconds / 60) + 1; // 每分鐘至少增加一點
    monster.hp = (monster.hp || 0) + baseGrowth * 5;
    monster.mp = (monster.mp || 0) + baseGrowth * 2;
    monster.attack = (monster.attack || 0) + baseGrowth * 3;
    monster.defense = (monster.defense || 0) + baseGrowth * 2;
    monster.speed = (monster.speed || 0) + baseGrowth * 1;
    monster.totalEvaluation = (monster.totalEvaluation || 0) + baseGrowth * 10; // 總評價也提升

    growthLogHTML += `<ul class="list-disc list-inside text-sm">`;
    growthLogHTML += `<li>生命值提升: +${baseGrowth * 5}</li>`;
    growthLogHTML += `<li>魔力值提升: +${baseGrowth * 2}</li>`;
    growthLogHTML += `<li>攻擊力提升: +${baseGrowth * 3}</li>`;
    growthLogHTML += `<li>防禦力提升: +${baseGrowth * 2}</li>`;
    growthLogHTML += `<li>速度提升: +${baseGrowth * 1}</li>`;
    growthLogHTML += `<li>總評價提升: +${baseGrowth * 10}</li>`;
    growthLogHTML += `</ul>`;

    // 隨機獲得物品 (簡化邏輯)
    if (Math.random() > 0.5) { // 50% 機率獲得藥水
        GameState.itemsFromCurrentTraining.push({ name: "力量藥水", quantity: 1, type: "potion", addedToBackpack: false });
    }
    if (Math.random() > 0.7) { // 30% 機率獲得稀有礦石
        GameState.itemsFromCurrentTraining.push({ name: "稀有礦石", quantity: 1, type: "material", addedToBackpack: false });
    }
    if (Math.random() > 0.9) { // 10% 機率獲得稀有DNA碎片
        const rareDna = GameState.gameSettings.dnaFragments.find(d => d.rarity === '稀有');
        if (rareDna) {
            GameState.itemsFromCurrentTraining.push({ name: rareDna.name, quantity: 1, type: "dna", addedToBackpack: false, ...rareDna });
        }
    }

    // 更新修煉成果模態框的內容
    const { trainingResultsModalTitle, trainingStoryResult, trainingGrowthResult } = GameState.elements;
    if (trainingResultsModalTitle && trainingStoryResult && trainingGrowthResult) {
        trainingResultsModalTitle.innerHTML = `🎉 ${monster.nickname} 修煉成果 🎉`;
        trainingStoryResult.innerHTML = story + `牠的屬性得到了顯著提升！`;
        trainingGrowthResult.innerHTML = growthLogHTML || "<p>無數值變化。</p>";
    }

    UI.renderTrainingItems(); // 渲染拾獲物品列表
    UI.openModal('training-results-modal'); // 打開修煉成果模態框
    UI.updateMonsterInfoModal(monster); // 更新怪獸資訊模態框 (如果打開)
    UI.updateMonsterSnapshotDisplay(monster); // 更新快照面板
    if (auth.currentUser) savePlayerData(); // 保存數據 (使用導入的 auth)
    console.log("修煉成果已處理。");
}

export function addAllTrainingItemsToBackpack() {
    GameState.itemsFromCurrentTraining.forEach(item => {
        if (!item.addedToBackpack) {
            addToTemporaryBackpack(item); // 呼叫添加到臨時背包的邏輯
            item.addedToBackpack = true; // 標記為已加入
        }
    });
    UI.updateTrainingItemsDisplay(); // 更新修煉成果模態框中的按鈕狀態
    if (auth.currentUser) savePlayerData(); // 使用導入的 auth
    UI.showFeedbackModal("成功", "所有物品已加入臨時背包！", true, false);
    console.log("所有修煉物品已添加到臨時背包。");
}

export function closeTrainingResultsAndCheckReminder() {
    const unaddedItems = GameState.itemsFromCurrentTraining.filter(item => !item.addedToBackpack);
    if (unaddedItems.length > 0) {
        UI.openModal('reminder-modal'); // 如果有未加入的物品，打開提醒模態框
        console.log("存在未加入的修煉物品，顯示提醒模態框。");
    } else {
        GameState.itemsFromCurrentTraining = []; // 清空已處理的物品列表
        UI.closeModal('training-results-modal'); // 關閉修煉成果模態框
        console.log("關閉修煉成果模態框 (無未加入物品)。");
    }
}

// 處理提醒模態框的「仍要關閉」按鈕點擊
export function handleReminderConfirmClose() {
    GameState.itemsFromCurrentTraining = []; // 強制清空未加入的物品
    UI.closeModal('reminder-modal');
    UI.closeModal('training-results-modal');
    UI.showFeedbackModal("提示", "未加入的物品已丟棄。", true, false);
    console.log("已強制關閉修煉成果模態框，未加入物品已丟棄。");
}


export function promptReleaseMonster(monsterIdToRelease) {
    const monsterIndex = GameState.farmedMonsters.findIndex(m => m.id === monsterIdToRelease);
    if (monsterIndex === -1) {
        console.error("無法找到要放生的怪獸。");
        UI.showFeedbackModal("錯誤", "無法找到該怪獸進行放生。", false, true);
        return;
    }
    const monster = GameState.farmedMonsters[monsterIndex];
    GameState.monsterToReleaseInfo = { farmIndex: monsterIndex, id: monsterIdToRelease, monster: monster };

    // 設置確認模態框的內容和行為
    const confirmationMessageEl = GameState.elements.confirmationMessage;
    const confirmActionBtnEl = GameState.elements.confirmActionBtn;
    const confirmationModalTitleEl = GameState.elements.confirmationModalTitle;
    const releaseMonsterImagePlaceholder = GameState.elements.releaseMonsterImagePlaceholder;
    const releaseMonsterImgPreview = GameState.elements.releaseMonsterImgPreview;

    if (confirmationMessageEl && confirmActionBtnEl && confirmationModalTitleEl && releaseMonsterImagePlaceholder && releaseMonsterImgPreview) {
        confirmationModalTitleEl.textContent = "放生確認";
        confirmationMessageEl.innerHTML = `您確定要放生怪獸 <strong class="text-[var(--danger-color)]">${monster.nickname}</strong> 嗎？此動作無法復原！`;

        releaseMonsterImgPreview.src = monster.imageUrl || `https://placehold.co/100x100/161b22/8b949e?text=${monster.nickname}`;
        releaseMonsterImgPreview.alt = `${monster.nickname}圖片`;
        releaseMonsterImagePlaceholder.style.display = 'block'; // 顯示圖片

        confirmActionBtnEl.className = 'danger'; // 設置按鈕樣式為危險
        confirmActionBtnEl.textContent = '確定放生';
        // 綁定確認按鈕的點擊事件
        confirmActionBtnEl.onclick = () => {
            releaseMonsterConfirmed(); // 呼叫實際放生邏輯
        };
        UI.openModal('confirmation-modal'); // 打開確認模態框
    } else {
        console.error("確認模態框的必要元素未找到。");
        UI.showFeedbackModal("錯誤", "無法打開放生確認視窗。", false, true);
    }
    console.log(`提示放生 ${monster.nickname}。`);
}

// 實際放生怪獸的邏輯 (由確認模態框的確定按鈕呼叫)
function releaseMonsterConfirmed() {
    if (!GameState.monsterToReleaseInfo) return;

    const { id: releasedMonsterId, monster: releasedMonster } = GameState.monsterToReleaseInfo;

    // 從農場列表中移除怪獸
    GameState.farmedMonsters = GameState.farmedMonsters.filter(m => m.id !== releasedMonsterId);
    addLogEntry(releasedMonster, "� 被訓獸師放生了。");

    // 更新當前顯示的怪獸和出戰怪獸
    if (GameState.currentMonster && GameState.currentMonster.id === releasedMonsterId) {
        GameState.currentMonster = GameState.farmedMonsters.length > 0 ? GameState.farmedMonsters[0] : null;
    }
    if (GameState.battlingMonsterId === releasedMonsterId) {
        GameState.battlingMonsterId = null;
    }

    UI.populateFarmList(); // 更新農場列表 UI
    UI.updateMonsterSnapshotDisplay(GameState.currentMonster); // 更新快照面板 UI
    UI.updateActionButtonsStateUI(); // 更新按鈕狀態
    UI.closeModal('confirmation-modal'); // 關閉確認模態框
    if (auth.currentUser) savePlayerData(); // 保存數據 (使用導入的 auth)

    UI.showFeedbackModal("放生成功", `${releasedMonster.nickname} 已經回歸大自然了。`, true, false);
    GameState.monsterToReleaseInfo = null; // 清空放生資訊
    console.log(`怪獸 ${releasedMonster.nickname} 已放生。`);
}


// --- 日誌記錄 ---
export function addLogEntry(monster, message) {
    if (!monster || !message) return;

    // 確保 monster.activityLogs 存在且是陣列
    if (!monster.activityLogs) {
        monster.activityLogs = [];
    }

    const timestamp = new Date().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'});
    monster.activityLogs.unshift({ timestamp: timestamp, message: message }); // 添加到最前面

    // 限制日誌條目數量
    if (monster.activityLogs.length > 50) { // 限制為 50 條
        monster.activityLogs.pop();
    }

    // 如果怪獸資訊模態框是打開的，且顯示的是當前怪獸，則更新其活動日誌
    const monsterInfoModalEl = GameState.elements.monsterInfoModal;
    if (monsterInfoModalEl && monsterInfoModalEl.style.display === 'flex' && GameState.currentMonster && GameState.currentMonster.id === monster.id) {
        UI.updateMonsterActivityLog(monster);
    }
    console.log(`日誌為 ${monster.nickname}: ${message}。`);
}


// --- 戰鬥與社交 ---
export async function promptChallengeMonster(opponentMonsterData) {
    GameState.monsterToChallengeInfo = opponentMonsterData;
    const playerMonster = GameState.battlingMonsterId ? GameState.farmedMonsters.find(m => m.id === GameState.battlingMonsterId) : GameState.currentMonster;

    if (!playerMonster) {
        UI.showFeedbackModal("挑戰失敗", "你需要先指定一隻出戰怪獸才能挑戰！", false, true);
        console.log("挑戰失敗：未選擇出戰怪獸。");
        return;
    }
    if (playerMonster.farmStatus && playerMonster.farmStatus.isTraining) {
        UI.showFeedbackModal("挑戰失敗", `${playerMonster.nickname} 正在修煉中，無法出戰！`, false, true);
        console.log("挑戰失敗：出戰怪獸正在修煉。");
        return;
    }

    // 設置確認模態框的內容和行為
    const confirmationMessageEl = GameState.elements.confirmationMessage;
    const confirmActionBtnEl = GameState.elements.confirmActionBtn;
    const confirmationModalTitleEl = GameState.elements.confirmationModalTitle;
    const releaseMonsterImagePlaceholder = GameState.elements.releaseMonsterImagePlaceholder; // 這裡重用這個元素

    if (confirmationMessageEl && confirmActionBtnEl && confirmationModalTitleEl && releaseMonsterImagePlaceholder) {
        confirmationModalTitleEl.textContent = "挑戰確認";
        confirmationMessageEl.innerHTML = `您確定要使用 <strong class="text-[var(--accent-color)]">${playerMonster.nickname}</strong> 挑戰 <strong class="text-[var(--danger-color)]">${opponentMonsterData.nickname}</strong> 嗎？`;

        // 顯示對戰雙方的圖片 (簡化，只顯示一個)
        releaseMonsterImagePlaceholder.style.display = 'block';
        GameState.elements.releaseMonsterImgPreview.src = opponentMonsterData.imageUrl || `https://placehold.co/100x100/161b22/8b949e?text=${opponentMonsterData.nickname}`;
        GameState.elements.releaseMonsterImgPreview.alt = `${opponentMonsterData.nickname}圖片`;


        confirmActionBtnEl.className = 'primary'; // 挑戰是主要動作
        confirmActionBtnEl.textContent = '確定挑戰';
        // 綁定確認按鈕的點擊事件
        confirmActionBtnEl.onclick = async () => {
            await simulateBattle(playerMonster, opponentMonsterData); // 呼叫實際戰鬥邏輯
        };
        UI.openModal('confirmation-modal'); // 打開確認模態框
    } else {
        console.error("確認模態框的必要元素未找到。");
        UI.showFeedbackModal("錯誤", "無法打開挑戰確認視窗。", false, true);
    }
    console.log(`提示挑戰 ${playerMonster.nickname} 對 ${opponentMonsterData.nickname}。`);
}

// 實際戰鬥模擬邏輯 (由確認模態框的確定按鈕呼叫)
async function simulateBattle(playerMonster, opponentMonster) {
    UI.closeModal('confirmation-modal'); // 關閉確認模態框
    UI.showFeedbackModal("戰鬥中...", "激烈的戰鬥正在進行中...", true, false);
    console.log(`模擬戰鬥：${playerMonster.nickname} vs ${opponentMonster.nickname}`);

    try {
        // const idToken = await auth.currentUser?.getIdToken(); // ApiClient 內部會處理認證，不需要在這裡獲取和傳遞
        // 呼叫 ApiClient.simulateBattle (移除 idToken 參數)
        const battleResult = await ApiClient.simulateBattle(playerMonster, opponentMonster);

        if (!battleResult || battleResult.error) {
            throw new Error(battleResult.error || "後端戰鬥模擬錯誤但未提供詳細訊息。");
        }

        // 更新玩家怪獸的勝敗場次和日誌
        playerMonster.wins = (playerMonster.wins || 0) + (battleResult.winnerId === playerMonster.id ? 1 : 0);
        playerMonster.losses = (playerMonster.losses || 0) + (battleResult.winnerId !== playerMonster.id ? 1 : 0);
        addLogEntry(playerMonster, `⚔️ 參與戰鬥，結果：${battleResult.winnerId === playerMonster.id ? '勝利' : (battleResult.winnerId === 'draw' ? '平手' : '敗北')}！`);

        // 更新玩家總勝敗場次 (如果需要)
        GameState.playerData.wins = (GameState.playerData.wins || 0) + (battleResult.winnerId === playerMonster.id ? 1 : 0);
        GameState.playerData.losses = (GameState.playerData.losses || 0) + (battleResult.winnerId !== playerMonster.id ? 1 : 0);

        // 顯示戰鬥日誌模態框
        UI.displayBattleLog(battleResult.log); // 假設 battleResult.log 是一個包含日誌條目的陣列

        updateAllUIDisplays(); // 更新所有相關 UI
        if (auth.currentUser) savePlayerData(); // 保存數據 (使用導入的 auth)

        // 根據結果顯示最終回饋
        let feedbackTitle = "戰鬥結束";
        let feedbackMessage = "";
        if (battleResult.winnerId === playerMonster.id) {
            feedbackMessage = `恭喜！您的 ${playerMonster.nickname} 贏得了戰鬥！`;
            UI.showFeedbackModal(feedbackTitle, feedbackMessage, false, true, true, playerMonster);
        } else if (battleResult.winnerId === opponentMonster.id) {
            feedbackMessage = `很遺憾，您的 ${playerMonster.nickname} 輸掉了戰鬥。`;
            UI.showFeedbackModal(feedbackTitle, feedbackMessage, false, true, true, playerMonster);
        } else { // 平手
            feedbackMessage = `戰鬥平手！`;
            UI.showFeedbackModal(feedbackTitle, feedbackMessage, false, true);
        }

    } catch (error) {
        console.error("戰鬥模擬失敗:", error);
        UI.showFeedbackModal("戰鬥失敗", `戰鬥模擬失敗：${error.message}`, false, true);
    }
    console.log("戰鬥模擬完成。");
}


export async function searchFriends(searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerSearchTerm || lowerSearchTerm.length < 1) {
        UI.updateFriendsListContainerWithMessage("請輸入至少一個字元進行搜尋。");
        return;
    }

    UI.updateFriendsListContainerWithMessage("搜尋中...", false);
    console.log(`正在搜尋好友：${searchTerm}。`);

    try {
        // const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null; // ApiClient 內部會處理認證，不需要在這裡獲取和傳遞
        // 呼叫 ApiClient.searchPlayers (移除 idToken 參數)
        const players = await ApiClient.searchPlayers(lowerSearchTerm);

        if (players && players.length > 0) {
            UI.displaySearchedPlayers(players);
            UI.showFeedbackModal("搜尋完成", `找到 ${players.length} 位玩家。`, true, false);
        } else {
            UI.updateFriendsListContainerWithMessage("沒有找到符合條件的玩家。", false);
            UI.showFeedbackModal("搜尋完成", "沒有找到符合條件的玩家。", true, false);
        }
    } catch (error) {
        console.error("搜尋好友失敗:", error);
        UI.updateFriendsListContainerWithMessage(`搜尋失敗：${error.message}`, true);
        UI.showFeedbackModal("搜尋失敗", `搜尋好友失敗：${error.message}`, false, true);
    }
    console.log("好友搜尋邏輯完成。");
}

export async function showPlayerInfoPopup(playerUid) {
    if (!playerUid) return;

    UI.showFeedbackModal("讀取中...", "正在獲取玩家資訊...", true, false);
    console.log(`正在獲取玩家資訊：${playerUid}。`);

    try {
        // const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null; // ApiClient 內部會處理認證，不需要在這裡獲取和傳遞
        // 呼叫 ApiClient.getPlayer (移除 idToken 參數)
        const playerDataFromApi = await ApiClient.getPlayer(playerUid);

        if (playerDataFromApi) {
            UI.openAndPopulatePlayerInfoModal(playerDataFromApi, playerUid);
            UI.closeModal('feedback-modal'); // 關閉讀取中的提示
        } else {
            throw new Error("未能獲取玩家資訊。");
        }
    } catch (error) {
        console.error("獲取玩家資訊失敗:", error);
        UI.showFeedbackModal("錯誤", `獲取玩家資訊失敗：${error.message}`, false, true);
    }
    console.log("玩家資訊彈窗邏輯完成。");
}

// --- 排行榜數據獲取 ---
export function getFilteredAndSortedMonstersForLeaderboard(filterElement = 'all') {
    let filteredMonsters = GameState.farmedMonsters; // 這裡應該從 Firestore 獲取所有公開怪獸

    // 這裡為了演示，先使用玩家自己的怪獸，實際應該從 Firestore 公開集合獲取
    // 假設 GameState.allPublicMonsters 包含了所有公開怪獸數據
    // 如果沒有，則需要從 Firestore 載入
    if (!GameState.allPublicMonsters) {
        console.warn("GameState.allPublicMonsters 未載入，排行榜可能不完整。");
        // 這裡可以觸發載入公開怪獸的邏輯
        // 例如：loadPublicMonsters();
        // 為了演示，暫時使用玩家自己的怪獸
        filteredMonsters = GameState.farmedMonsters;
    } else {
        filteredMonsters = GameState.allPublicMonsters;
    }


    if (filterElement !== 'all') {
        filteredMonsters = filteredMonsters.filter(monster =>
            monster.elements && monster.elements.includes(filterElement)
        );
    }

    // 依總評價降序排序
    return [...filteredMonsters].sort((a, b) => (b.totalEvaluation || 0) - (a.totalEvaluation || 0));
}

export function getSortedPlayersForLeaderboard() {
    // 這裡應該從 Firestore 獲取所有公開玩家數據
    // 假設 GameState.allPublicPlayers 包含了所有公開玩家數據
    // 如果沒有，則需要從 Firestore 載入
    if (!GameState.allPublicPlayers) {
        console.warn("GameState.allPublicPlayers 未載入，玩家排行榜可能不完整。");
        // 這裡可以觸發載入公開玩家的邏輯
        // 例如：loadPublicPlayers();
        // 為了演示，暫時使用當前玩家數據
        return [{
            uid: GameState.playerData.uid,
            nickname: GameState.playerData.nickname,
            wins: GameState.playerData.wins,
            losses: GameState.playerData.losses,
            totalEvaluation: GameState.playerData.totalEvaluation || 0 // 假設玩家也有總評價
        }];
    }
    // 依勝場數降序排序
    return [...GameState.allPublicPlayers].sort((a, b) => (b.wins || 0) - (a.wins || 0));
}


// --- 遊戲設定與初始化 ---
export function initializeNpcMonsters() {
    // 這裡根據 GameState.gameSettings.npc_monsters 來初始化 NPC 怪獸數據
    // 這些數據通常是遊戲一開始就固定好的，或者從後端載入
    if (GameState.gameSettings.npc_monsters && GameState.gameSettings.npc_monsters.length > 0) {
        GameState.npcMonsters = GameState.gameSettings.npc_monsters;
        console.log(`NPC 怪獸已初始化：共 ${GameState.npcMonsters.length} 隻。`);
    } else {
        console.warn("遊戲設定中沒有 NPC 怪獸資料。");
        GameState.npcMonsters = [];
    }
}

// 輔助函式：獲取稀有度數據 (如果 gameSettings 中有定義)
export function getRarityData(rarityName) {
    return GameState.gameSettings.rarities[rarityName] || { name: rarityName, textVarKey: '--rarity-common-text' };
}

// 載入遊戲數據 (在使用者登入後呼叫)
export async function loadGameDataForUserLogic(uid, nickname) {
    console.log(`GameLogic: 載入遊戲數據 for UID: ${uid}, Nickname: ${nickname}`);
    try {
        // 調用 GameState 中的載入數據函式
        await GameState.loadUserData(uid);

        // 如果載入後沒有當前怪獸，嘗試設置第一隻
        if (!GameState.currentMonster && GameState.farmedMonsters.length > 0) {
            GameState.currentMonster = GameState.farmedMonsters[0];
            // 如果有出戰怪獸ID，則設置為出戰
            if (GameState.battlingMonsterId) {
                const battlingMonster = GameState.farmedMonsters.find(m => m.id === GameState.battlingMonsterId);
                if (battlingMonster) {
                    GameState.currentMonster = battlingMonster;
                }
            }
        }

        // 更新 UI
        updateAllUIDisplays();
        UI.showGameScreenAfterLogin(); // 確保顯示遊戲畫面

        // 載入公開怪獸和玩家數據用於排行榜 (如果需要)
        await loadPublicMonstersAndPlayers();

        console.log("GameLogic: 遊戲數據載入成功。");
    } catch (error) {
        console.error("GameLogic: 載入遊戲數據失敗：", error);
        UI.showFeedbackModal("錯誤", `載入遊戲數據失敗：${error.message}`, false, true);
        // 如果載入失敗，顯示認證畫面
        UI.showAuthScreen();
    }
}

// 保存初始玩家數據到後端 (在使用者註冊後呼叫)
export async function saveInitialPlayerDataToBackendLogic(uid, nickname, gameSettings) {
    console.log(`GameLogic: 保存初始玩家數據 for UID: ${uid}, Nickname: ${nickname}`);
    try {
        // 初始化玩家的基礎數據
        GameState.playerData = {
            uid: uid,
            nickname: nickname,
            wins: 0,
            losses: 0,
            gold: 100, // 初始金幣
            diamond: 10, // 初始鑽石
            achievements: [],
            ownedMonsters: [], // 初始空怪獸列表
            playerOwnedDNA: new Array(gameSettings.value_settings.max_inventory_slots).fill(null), // 初始空DNA庫存
            temporaryBackpackSlots: new Array(gameSettings.value_settings.max_temp_backpack_slots).fill(null), // 初始空臨時背包
            combinationSlotsData: new Array(gameSettings.value_settings.max_combination_slots).fill(null), // 初始空組合槽
        };
        GameState.farmedMonsters = []; // 初始農場空
        GameState.currentMonster = null; // 初始無當前怪獸
        GameState.battlingMonsterId = null; // 初始無出戰怪獸

        // 調用 GameState 中的保存數據函式
        await GameState.saveUserData();

        console.log("GameLogic: 初始玩家數據保存成功。");
    } catch (error) {
        console.error("GameLogic: 保存初始玩家數據失敗：", error);
        UI.showFeedbackModal("錯誤", `保存初始玩家數據失敗：${error.message}`, false, true);
    }
}

// 載入公開怪獸和玩家數據 (用於排行榜)
export async function loadPublicMonstersAndPlayers() {
    console.log("GameLogic: 載入公開怪獸和玩家數據...");
    try {
        // 載入所有公開怪獸數據
        const publicMonstersSnapshot = await db.collection('artifacts').doc(__app_id).collection('public').collection('data').doc('monsters').get();
        if (publicMonstersSnapshot.exists && publicMonstersSnapshot.data().list) {
            GameState.allPublicMonsters = publicMonstersSnapshot.data().list;
            console.log(`GameLogic: 已載入 ${GameState.allPublicMonsters.length} 隻公開怪獸。`);
        } else {
            GameState.allPublicMonsters = [];
            console.log("GameLogic: 沒有公開怪獸數據。");
        }

        // 載入所有公開玩家數據
        const publicPlayersSnapshot = await db.collection('artifacts').doc(__app_id).collection('public').collection('data').doc('players').get();
        if (publicPlayersSnapshot.exists && publicPlayersSnapshot.data().list) {
            GameState.allPublicPlayers = publicPlayersSnapshot.data().list;
            console.log(`GameLogic: 已載入 ${GameState.allPublicPlayers.length} 位公開玩家。`);
        } else {
            GameState.allPublicPlayers = [];
            console.log("GameLogic: 沒有公開玩家數據。");
        }

    } catch (error) {
        console.error("GameLogic: 載入公開數據失敗：", error);
        UI.showFeedbackModal("錯誤", `載入公開數據失敗：${error.message}`, false, true);
    }
}

// 重設遊戲數據 (登出時呼叫)
export function resetGameDataForUI() {
    console.log("GameLogic: 重設遊戲數據...");
    GameState.currentLoggedInUser = null;
    GameState.currentPlayerNickname = "";
    GameState.playerData = {
        uid: null, nickname: null, email: null,
        wins: 0, losses: 0, gold: 0, diamond: 0,
        achievements: [], ownedMonsters: [], playerOwnedDNA: [],
        temporaryBackpackSlots: [], combinationSlotsData: [],
    };
    GameState.currentMonster = null;
    GameState.farmedMonsters = [];
    GameState.battlingMonsterId = null;
    GameState.itemsFromCurrentTraining = [];
    GameState.monsterToReleaseInfo = null;
    GameState.monsterToChallengeInfo = null;
    GameState.currentCultivationMonster = null;
    GameState.inventoryDisplaySlots = new Array(GameState.NUM_INVENTORY_SLOTS).fill(null);
    GameState.temporaryBackpackSlots = new Array(GameState.NUM_TEMP_BACKPACK_SLOTS).fill(null);
    GameState.combinationSlotsData = new Array(GameState.NUM_COMBINATION_SLOTS).fill(null);
    GameState.allPublicMonsters = [];
    GameState.allPublicPlayers = [];

    updateAllUIDisplays(); // 更新所有 UI
    UI.createCombinationSlots(); // 重新創建組合槽 UI
    UI.updateActionButtonsStateUI(); // 更新按鈕狀態
    console.log("GameLogic: 遊戲數據已重設。");
}

// 保存玩家數據 (登出時或定期保存時呼叫)
export async function savePlayerDataLogic() {
    console.log("GameLogic: 保存玩家數據...");
    await GameState.saveUserData();
    console.log("GameLogic: 玩家數據保存完成。");
}
