// game-logic.js

import { auth, db, firebaseApp, __app_id } from './firebase-config.js';
import * as ApiClient from './api-client.js';
import * as GameState from './game-state.js';
import * as UI from './ui.js';

function updateAllUIDisplays() {
    UI.populateInventory();
    UI.populateTemporaryBackpack();
    UI.populateFarmList();
    UI.updateMonsterSnapshotDisplay(GameState.currentMonster);
    UI.updateActionButtonsStateUI();
}

async function savePlayerData() {
    await GameState.saveUserData();
}

export function handleDrawDnaButtonClick() {
    console.log("抽DNA按鈕被點擊");
    const drawnDnaForModal = [];
    const dnaFragments = GameState.gameSettings.dna_fragments || [];

    if (dnaFragments.length > 0) {
        const drawableDna = dnaFragments.filter(
            f => f.rarity === "普通" || f.rarity === "稀有" || f.rarity === "菁英" || f.rarity === "傳奇" || f.rarity === "神話"
        );
        if (drawableDna.length > 0) {
            for (let i = 0; i < 6; i++) {
                const randomDnaTemplate = drawableDna[Math.floor(Math.random() * drawableDna.length)];
                const newDnaInstance = JSON.parse(JSON.stringify(randomDnaTemplate));
                newDnaInstance.tempId = `drawn_${Date.now()}_${i}`;
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

    UI.renderDnaDrawResults(drawnDnaForModal);
}

export function addToTemporaryBackpack(dnaItem) {
    let added = false;
    for (let i = 0; i < GameState.NUM_TEMP_BACKPACK_SLOTS; i++) {
        if (GameState.temporaryBackpackSlots[i] === null) {
            const newItem = {...dnaItem};
            newItem.id = dnaItem.id || `temp_dna_${Date.now()}_${i}`;
            GameState.temporaryBackpackSlots[i] = newItem;
            added = true;
            break;
        }
    }
    if (!added) {
        UI.showFeedbackModal("提示", `臨時背包已滿！${dnaItem.name} 未能加入，請整理背包。`, false, true);
        console.log(`臨時背包已滿。${dnaItem.name} 未能加入。`);
    }
    UI.populateTemporaryBackpack();
    if (auth.currentUser) savePlayerData();
    console.log(`物品已添加到臨時背包：${dnaItem.name}。`);
}

export function moveFromTempToInventory(tempSlotIndex) {
    const itemToMove = GameState.temporaryBackpackSlots[tempSlotIndex];
    if (!itemToMove) return;

    const emptyMainSlot = GameState.playerData.playerOwnedDNA.findIndex(slot => slot === null);

    if (emptyMainSlot !== -1) {
        GameState.playerData.playerOwnedDNA[emptyMainSlot] = itemToMove;
        GameState.temporaryBackpackSlots[tempSlotIndex] = null;
        UI.populateInventory();
        UI.populateTemporaryBackpack();
        if (auth.currentUser) savePlayerData();
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

    const confirmationMessageEl = GameState.elements.confirmationMessage;
    const confirmActionBtnEl = GameState.elements.confirmActionBtn;
    const confirmationModalTitleEl = GameState.elements.confirmationModalTitle;
    const releaseMonsterImagePlaceholder = GameState.elements.releaseMonsterImagePlaceholder;

    if (confirmationMessageEl && confirmActionBtnEl && confirmationModalTitleEl && releaseMonsterImagePlaceholder) {
        confirmationModalTitleEl.textContent = "刪除確認";
        confirmationMessageEl.textContent = `確定刪除 "${itemName}"？此動作無法復原。`;
        releaseMonsterImagePlaceholder.style.display = 'none';

        confirmActionBtnEl.className = 'danger';
        confirmActionBtnEl.textContent = '確定刪除';
        confirmActionBtnEl.onclick = () => {
            deleteItemConfirmed();
        };
        UI.openModal('confirmation-modal');
    } else {
        console.error("確認模態框的必要元素未找到。");
        UI.showFeedbackModal("錯誤", "無法打開刪除確認視窗。", false, true);
    }
    console.log(`提示刪除 ${itemName}。`);
}

function deleteItemConfirmed() {
    if (!GameState.itemToDeleteInfo) return;

    const { id, slotIndex, sourceType } = GameState.itemToDeleteInfo;
    let deletedItemName = '';

    if (sourceType === 'inventory') {
        if (GameState.playerData.playerOwnedDNA[slotIndex] && (GameState.playerData.playerOwnedDNA[slotIndex].id === id || GameState.playerData.playerOwnedDNA[slotIndex].tempId === id)) {
            deletedItemName = GameState.playerData.playerOwnedDNA[slotIndex].name;
            GameState.playerData.playerOwnedDNA[slotIndex] = null;
        }
    } else if (sourceType === 'temporary') {
        if (GameState.temporaryBackpackSlots[slotIndex] && (GameState.temporaryBackpackSlots[slotIndex].id === id || GameState.temporaryBackpackSlots[slotIndex].tempId === id)) {
            deletedItemName = GameState.temporaryBackpackSlots[slotIndex].name;
            GameState.temporaryBackpackSlots[slotIndex] = null;
        }
    }

    for (let i = 0; i < GameState.NUM_COMBINATION_SLOTS; i++) {
        const comboItem = GameState.combinationSlotsData[i];
        if (comboItem && (comboItem.id === id || comboItem.tempId === id)) {
            clearCombinationSlot(i, false);
        }
    }

    UI.populateInventory();
    UI.populateTemporaryBackpack();
    UI.closeModal('confirmation-modal');
    UI.updateActionButtonsStateUI();
    if (auth.currentUser) savePlayerData();
    GameState.itemToDeleteInfo = null;
    UI.showFeedbackModal("成功", `"${deletedItemName}" 已成功刪除。`, true, false);
    console.log(`物品 "${deletedItemName}" 已刪除。`);
}


export function handleDragStart(e) {
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

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData('application/json', dnaInfoStr);

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
    if (!targetDropZone) return;
    if (targetDropZone.dataset.droptype === "delete") return;

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
        if (!GameState.combinationSlotsData[targetComboSlotIndex]) {
            GameState.combinationSlotsData[targetComboSlotIndex] = droppedDNA;
            UI.updateCombinationSlotUI(targetComboSlotIndex, droppedDNA);

            if (sourceType === 'inventory') {
                GameState.playerData.playerOwnedDNA[sourceIndex] = null;
            } else if (sourceType === 'combination' && sourceIndex !== targetComboSlotIndex) {
                clearCombinationSlot(sourceIndex, false);
            } else if (sourceType === 'temporary') {
                GameState.temporaryBackpackSlots[sourceIndex] = null;
            }
            moved = true;
        } else {
            UI.showFeedbackModal("提示", "組合槽位已被佔用！", false, true);
        }
    } else if (targetDropType === "inventory") {
        const targetInventorySlotIndex = parseInt(targetDropZone.dataset.inventorySlotIndex);
        if (!GameState.playerData.playerOwnedDNA[targetInventorySlotIndex]) {
            GameState.playerData.playerOwnedDNA[targetInventorySlotIndex] = droppedDNA;

            if (sourceType === 'combination') {
                clearCombinationSlot(sourceIndex, false);
            } else if (sourceType === 'temporary') {
                GameState.temporaryBackpackSlots[sourceIndex] = null;
            } else if (sourceType === 'inventory' && sourceIndex !== targetInventorySlotIndex) {
                GameState.playerData.playerOwnedDNA[sourceIndex] = null;
            }
            moved = true;
        } else {
            UI.showFeedbackModal("提示", "庫存槽位已被佔用！", false, true);
        }
    } else if (targetDropType === "temporary") {
        const targetTempSlotIndex = parseInt(targetDropZone.dataset.slotIndex);
        if (!GameState.temporaryBackpackSlots[targetTempSlotIndex]) {
            GameState.temporaryBackpackSlots[targetTempSlotIndex] = droppedDNA;

            if (sourceType === 'combination') {
                clearCombinationSlot(sourceIndex, false);
            } else if (sourceType === 'inventory') {
                GameState.playerData.playerOwnedDNA[sourceIndex] = null;
            } else if (sourceType === 'temporary' && sourceIndex !== targetTempSlotIndex) {
                GameState.temporaryBackpackSlots[sourceIndex] = null;
            }
            moved = true;
        } else {
            UI.showFeedbackModal("提示", "臨時背包槽位已被佔用！", false, true);
        }
    }

    if (moved) {
        updateAllUIDisplays();
        if (auth.currentUser) savePlayerData();
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

    targetDropZone.classList.remove('drag-over');

    const dnaDataString = e.dataTransfer.getData('application/json');
    const sourceType = e.dataTransfer.getData('text/source-type');
    const sourceIndexString = e.dataTransfer.getData('text/source-index');

    if (!dnaDataString || !sourceType || sourceIndexString === null || sourceIndexString === undefined || sourceIndexString.trim() === "") {
        console.warn("拖放數據不完整，無法刪除。");
        return;
    }

    const sourceIndex = parseInt(sourceIndexString, 10);
    const droppedDNA = JSON.parse(dnaDataString);

    promptDeleteItem(droppedDNA.id || droppedDNA.tempId, sourceIndex, sourceType, droppedDNA.name);
    console.log("拖放到刪除區。");
}

export function handleDragOver(e) {
    e.preventDefault();
    const targetDropZone = e.target.closest('[data-droptype]');
    if (targetDropZone && targetDropZone.dataset.droptype !== "delete") {
        targetDropZone.classList.add('drag-over');
    } else if (targetDropZone && targetDropZone.dataset.droptype === "delete") {
        targetDropZone.classList.add('drag-over');
    }
}

export function handleDragLeave(e) {
    const targetDropZone = e.target.closest('[data-droptype]');
    if (targetDropZone) {
        targetDropZone.classList.remove('drag-over');
    }
}

export function handleComboSlotClick(slotId) {
    console.log("組合槽被點擊 (game-logic.js)");
    if (GameState.combinationSlotsData[slotId]) {
        clearCombinationSlot(slotId, true);
        UI.showFeedbackModal("成功", "DNA碎片已從組合槽移除並返回背包。", true, false);
    }
}


export function clearCombinationSlot(comboSlotId, returnToInventory = true) {
    const returnedDNA = GameState.combinationSlotsData[comboSlotId];
    if (!returnedDNA) return;

    GameState.combinationSlotsData[comboSlotId] = null;
    UI.clearCombinationSlotUI(comboSlotId);

    if (returnToInventory) {
        const emptyInventorySlotIndex = GameState.playerData.playerOwnedDNA.findIndex(slot => slot === null);
        if (emptyInventorySlotIndex !== -1) {
            GameState.playerData.playerOwnedDNA[emptyInventorySlotIndex] = returnedDNA;
            UI.populateInventory();
            UI.showFeedbackModal("成功", `${returnedDNA.name} 已返回DNA庫。`, true, false);
        } else {
            const emptyTempSlotIndex = GameState.temporaryBackpackSlots.findIndex(slot => slot === null);
            if (emptyTempSlotIndex !== -1) {
                GameState.temporaryBackpackSlots[emptyTempSlotIndex] = returnedDNA;
                UI.populateTemporaryBackpack();
                UI.showFeedbackModal("成功", `${returnedDNA.name} 已返回臨時背包。`, true, false);
            } else {
                UI.showFeedbackModal("提示", `${returnedDNA.name} 已從組合槽移除，但背包和物品欄均已滿，請整理。`, false, true);
                console.log(`${returnedDNA.name} 已返回DNA池，但背包和物品欄均已滿。`);
            }
        }
    }
    UI.updateActionButtonsStateUI();
    if (auth.currentUser) savePlayerData();
    console.log(`組合槽 ${comboSlotId} 已清除。`);
}


export async function combineDNA() {
    const dnaToCombine = GameState.combinationSlotsData.filter(slot => slot !== null);
    if (dnaToCombine.length === 0) {
        UI.showFeedbackModal("提示", "請先放入至少一個DNA碎片進行組合。", false, true);
        return;
    }
    if (!auth.currentUser) {
        UI.showFeedbackModal("錯誤", "請先登入才能組合怪獸。", false, true);
        return;
    }
    const MAX_FARM_SLOTS = GameState.gameSettings.value_settings?.max_farm_slots || 10;
    if (GameState.farmedMonsters.length >= MAX_FARM_SLOTS) {
        UI.showFeedbackModal("提示", `怪物農場已滿 (${MAX_FARM_SLOTS}隻)，無法組合新怪獸。請先放生部分怪獸。`, false, true);
        return;
    }


    const idsToSend = dnaToCombine.map(dna => {
        if (dna.baseId) return dna.baseId;
        if (dna.id && typeof dna.id === 'string' && dna.id.startsWith('dna_frag_')) {
            const parts = dna.id.split('_');
            if (parts.length >= 3) {
                return `${parts[0]}_${parts[1]}_${parts[2]}`;
            }
        }
        return dna.tempId || dna.id;
    }).filter(Boolean);

    UI.showFeedbackModal("組合中...", "正在努力組合新的怪獸，請稍候...", true, false);
    console.log("正在組合 DNA...", idsToSend);

    try {
        const response = await ApiClient.combineDNA(idsToSend);

        if (!response || response.error) {
            throw new Error(response.error || "後端回傳組合錯誤但未提供詳細訊息。");
        }
        let newMonster = response;

        newMonster = await generateAndStoreAIDescriptions(newMonster);

        const isFirstMonsterEver = GameState.farmedMonsters.length === 0 && (!GameState.playerData.achievements || !GameState.playerData.achievements.includes("首次組合怪獸"));

        GameState.farmedMonsters.push(newMonster);
        addLogEntry(newMonster, "✨ 成功組合誕生！");

        if (isFirstMonsterEver) {
            newMonster.farmStatus = newMonster.farmStatus || {};
            newMonster.farmStatus.isBattling = true;
            GameState.battlingMonsterId = newMonster.id;
            GameState.currentMonster = newMonster;
            addLogEntry(newMonster, "🟢 自動進入出戰狀態 (首次合成)。");
            if (!GameState.playerData.achievements.includes("首次組合怪獸")) {
                GameState.playerData.achievements.push("首次組合怪獸");
            }
        } else if (!GameState.currentMonster) {
            GameState.currentMonster = newMonster;
        }

        GameState.combinationSlotsData.fill(null);
        UI.createCombinationSlots();

        updateAllUIDisplays();
        savePlayerData();

        UI.showFeedbackModal(`怪獸 "${newMonster.nickname}" 組合成功！`, `恭喜您，新的怪獸誕生了！`, false, true, true, newMonster);
        console.log(`怪獸 ${newMonster.nickname} 組合成功。`);

    } catch (error) {
        console.error("DNA 組合失敗:", error);
        UI.showFeedbackModal("組合失敗", `DNA組合失敗：${error.message}`, false, true);
    } finally {
        UI.updateActionButtonsStateUI();
    }
}

export async function generateAndStoreAIDescriptions(monster) {
    if (!monster || (monster.aiPersonality && monster.aiIntroduction && monster.aiEvaluation)) {
        return monster;
    }

    UI.showFeedbackModal(`為 ${monster.nickname} 生成AI評價`, "正在與AI溝通，請稍候...", true, false);
    console.log(`正在為 ${monster.nickname} 生成 AI 描述...`);

    try {
        const aiDescriptions = await ApiClient.generateAIDescriptions(monster);

        if (aiDescriptions) {
            monster.aiPersonality = {
                name: aiDescriptions.personality?.name || monster.personality?.name || "未知",
                text: aiDescriptions.personality?.text || "AI個性描述生成失敗。",
                color: aiDescriptions.personality?.color || "var(--text-secondary)"
            };
            monster.aiIntroduction = aiDescriptions.introduction;
            monster.aiEvaluation = aiDescriptions.evaluation;
            console.log(`AI 描述為 ${monster.nickname} 生成成功。`);
        } else {
            console.warn(`未能為 ${monster.nickname} 生成 AI 描述。`);
            monster.aiPersonality = { name: "未知", text: "AI描述生成失敗。", color: "var(--text-secondary)" };
            monster.aiIntroduction = "AI描述生成失敗。";
            monster.aiEvaluation = "AI描述生成失敗.";
        }
    } catch (error) {
        console.error(`為 ${monster.nickname} 生成 AI 描述失敗:`, error);
        monster.aiPersonality = { name: "未知", text: "AI描述生成失敗。", color: "var(--text-secondary)" };
        monster.aiIntroduction = "AI描述生成失敗。";
        monster.aiEvaluation = "AI描述生成失敗.";
    } finally {
        UI.closeModal('feedback-modal');
        const monsterInfoModalEl = GameState.elements.monsterInfoModal;
        if (monsterInfoModalEl && monsterInfoModalEl.style.display === 'flex' && GameState.currentMonster && GameState.currentMonster.id === monster.id) {
            UI.updateMonsterInfoModal(monster);
        }
        if (auth.currentUser) savePlayerData();
    }
    return monster;
}


export function toggleBattleStatus(monsterIdToBattle) {
    let newBattlingMonster = null;
    let changed = false;

    GameState.farmedMonsters.forEach(m => {
        if (!m.farmStatus) m.farmStatus = {};
        if (m.id === monsterIdToBattle) {
            if (m.farmStatus.isTraining) {
                UI.showFeedbackModal("提示", `${m.nickname} 正在修煉中，無法出戰。`, false, true);
                return;
            }
            const previousBattleStatus = m.farmStatus.isBattling;
            m.farmStatus.isBattling = !m.farmStatus.isBattling;
            if (m.farmStatus.isBattling !== previousBattleStatus) changed = true;
            addLogEntry(m, m.farmStatus.isBattling ? "🟢 進入出戰狀態。" : "🔴 解除出戰狀態，開始休息。");
            if (m.farmStatus.isBattling) newBattlingMonster = m;
        } else {
            if (m.farmStatus.isBattling) {
                m.farmStatus.isBattling = false;
                addLogEntry(m, "🔴 解除出戰狀態 (因其他怪獸出戰)。");
                changed = true;
            }
        }
    });

    GameState.battlingMonsterId = newBattlingMonster ? newBattlingMonster.id : null;
    GameState.currentMonster = newBattlingMonster || GameState.farmedMonsters[0] || null;

    updateAllUIDisplays();
    if (changed && auth.currentUser) savePlayerData();
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
        maxCultivationTime.textContent = GameState.MAX_CULTIVATION_SECONDS || 999;
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
    GameState.currentCultivationMonster.farmStatus.active = false;
    GameState.currentCultivationMonster.farmStatus.type = 'train';
    GameState.currentCultivationMonster.farmStatus.boosts = { hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, crit: 0};

    addLogEntry(GameState.currentCultivationMonster, "🏋️ 開始了新的修煉。");
    UI.closeModal('cultivation-setup-modal');
    UI.populateFarmList();
    if (auth.currentUser) savePlayerData();

    if (GameState.currentCultivationMonster.farmStatus.timerId) {
        clearInterval(GameState.currentCultivationMonster.farmStatus.timerId);
        GameState.currentCultivationMonster.farmStatus.timerId = null;
    }
    const maxCultivationSeconds = GameState.MAX_CULTIVATION_SECONDS || 999;
    GameState.currentCultivationMonster.farmStatus.timerId = setInterval(() => {
        const monsterInFarm = GameState.farmedMonsters.find(m => m.id === GameState.currentCultivationMonster.id);
        if (!monsterInFarm || !monsterInFarm.farmStatus || !monsterInFarm.farmStatus.isTraining) {
             clearInterval(GameState.currentCultivationMonster.farmStatus.timerId);
             GameState.currentCultivationMonster.farmStatus.timerId = null;
             return;
        }
        const elapsedSeconds = Math.floor((Date.now() - (monsterInFarm.farmStatus.trainingStartTime || Date.now())) / 1000);
        monsterInFarm.farmStatus.remainingTime = maxCultivationSeconds - elapsedSeconds;

        const farmItem = GameState.elements.farmedMonstersList?.querySelector(`.farm-monster-item[data-monster-id="${monsterInFarm.id}"]`);
        if (farmItem) {
            const statusDiv = farmItem.querySelector('.farm-monster-status');
            if (statusDiv) UI.updateFarmMonsterStatusDisplay(monsterInFarm, statusDiv);
        }

        console.log(`修煉計時器：${monsterInFarm.nickname} 剩餘 ${monsterInFarm.farmStatus.remainingTime} 秒。`);
        if (elapsedSeconds >= maxCultivationSeconds) {
            console.log(`${monsterInFarm.nickname} 修煉已達上限 ${maxCultivationSeconds} 秒。自動結束。`);
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
    trainingDuration = Math.min(trainingDuration, GameState.MAX_CULTIVATION_SECONDS || 999);

    monster.farmStatus.isTraining = false;
    monster.farmStatus.remainingTime = 0;
    addLogEntry(monster, `修煉結束，共持續 ${trainingDuration} 秒。`);
    resolveTrainingAndShowResults(monster, trainingDuration);
    UI.populateFarmList();
    if (auth.currentUser) savePlayerData();
    UI.showFeedbackModal("修煉結束", `${monster.nickname} 的修煉已結束！`, true, false);
    console.log(`怪獸 ${monsterId} 的修煉已暫停。`);
}

export function resolveTrainingAndShowResults(monster, durationSeconds) {
    let story = `在 ${Math.floor(durationSeconds / 60)}分${durationSeconds % 60}秒 的刻苦修煉中，${monster.nickname} `;
    let growthLogHTML = "";
    GameState.itemsFromCurrentTraining = [];

    const baseGrowth = Math.floor(durationSeconds / 60) + 1;
    monster.hp = (monster.hp || 0) + baseGrowth * 5;
    monster.mp = (monster.mp || 0) + baseGrowth * 2;
    monster.attack = (monster.attack || 0) + baseGrowth * 3;
    monster.defense = (monster.defense || 0) + baseGrowth * 2;
    monster.speed = (monster.speed || 0) + baseGrowth * 1;
    monster.totalEvaluation = (monster.totalEvaluation || 0) + baseGrowth * 10;

    growthLogHTML += `<ul class="list-disc list-inside text-sm">`;
    growthLogHTML += `<li>生命值提升: +${baseGrowth * 5}</li>`;
    growthLogHTML += `<li>魔力值提升: +${baseGrowth * 2}</li>`;
    growthLogHTML += `<li>攻擊力提升: +${baseGrowth * 3}</li>`;
    growthLogHTML += `<li>防禦力提升: +${baseGrowth * 2}</li>`;
    growthLogHTML += `<li>速度提升: +${baseGrowth * 1}</li>`;
    growthLogHTML += `<li>總評價提升: +${baseGrowth * 10}</li>`;
    growthLogHTML += `</ul>`;

    const dnaFragments = GameState.gameSettings.dna_fragments || [];
    if (Math.random() > 0.9) {
        const rareDna = dnaFragments.find(d => d.rarity === '稀有');
        if (rareDna) {
            GameState.itemsFromCurrentTraining.push({ name: rareDna.name, quantity: 1, type: "dna", addedToBackpack: false, ...rareDna });
        }
    }
    if (Math.random() > 0.5) {
        GameState.itemsFromCurrentTraining.push({ name: "力量藥水", quantity: 1, type: "potion", addedToBackpack: false });
    }
    if (Math.random() > 0.7) {
        GameState.itemsFromCurrentTraining.push({ name: "稀有礦石", quantity: 1, type: "material", addedToBackpack: false });
    }

    const { trainingResultsModalTitle, trainingStoryResult, trainingGrowthResult } = GameState.elements;
    if (trainingResultsModalTitle && trainingStoryResult && trainingGrowthResult) {
        trainingResultsModalTitle.innerHTML = `🎉 ${monster.nickname} 修煉成果 🎉`;
        trainingStoryResult.innerHTML = story + `牠的屬性得到了顯著提升！`;
        trainingGrowthResult.innerHTML = growthLogHTML || "<p>無數值變化。</p>";
    }

    UI.renderTrainingItems();
    UI.openModal('training-results-modal');
    UI.updateMonsterInfoModal(monster);
    UI.updateMonsterSnapshotDisplay(monster);
    if (auth.currentUser) savePlayerData();
    console.log("修煉成果已處理。");
}

export function addAllTrainingItemsToBackpack() {
    GameState.itemsFromCurrentTraining.forEach(item => {
        if (!item.addedToBackpack) {
            addToTemporaryBackpack(item);
            item.addedToBackpack = true;
        }
    });
    UI.updateTrainingItemsDisplay();
    if (auth.currentUser) savePlayerData();
    UI.showFeedbackModal("成功", "所有物品已加入臨時背包！", true, false);
    console.log("所有修煉物品已添加到臨時背包。");
}

export function closeTrainingResultsAndCheckReminder() {
    const unaddedItems = GameState.itemsFromCurrentTraining.filter(item => !item.addedToBackpack);
    if (unaddedItems.length > 0) {
        UI.openModal('reminder-modal');
        console.log("存在未加入的修煉物品，顯示提醒模態框。");
    } else {
        GameState.itemsFromCurrentTraining = [];
        UI.closeModal('training-results-modal');
        console.log("關閉修煉成果模態框 (無未加入物品)。");
    }
}

export function handleReminderConfirmClose() {
    GameState.itemsFromCurrentTraining = [];
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

    const confirmationMessageEl = GameState.elements.confirmationMessage;
    const confirmActionBtnEl = GameState.elements.confirmActionBtn;
    const confirmationModalTitleEl = GameState.elements.confirmationModalTitle;
    const releaseMonsterImagePlaceholder = GameState.elements.releaseMonsterImagePlaceholder;

    if (confirmationMessageEl && confirmActionBtnEl && confirmationModalTitleEl && releaseMonsterImagePlaceholder) {
        confirmationModalTitleEl.textContent = "放生確認";
        confirmationMessageEl.innerHTML = `您確定要放生怪獸 <strong class="text-[var(--danger-color)]">${monster.nickname}</strong> 嗎？此動作無法復原！`;

        const releaseMonsterImgPreview = GameState.elements.releaseMonsterImgPreview;
        if (releaseMonsterImgPreview) {
            releaseMonsterImgPreview.src = monster.imageUrl || `https://placehold.co/100x100/161b22/8b949e?text=${monster.nickname}`;
            releaseMonsterImgPreview.alt = `${monster.nickname}圖片`;
            releaseMonsterImagePlaceholder.style.display = 'block';
        } else {
            console.warn("UI: releaseMonsterImgPreview element not found for promptReleaseMonster.");
        }


        confirmActionBtnEl.className = 'danger';
        confirmActionBtnEl.textContent = '確定放生';
        confirmActionBtnEl.onclick = () => {
            releaseMonsterConfirmed();
        };
        UI.openModal('confirmation-modal');
    } else {
        console.error("確認模態框的必要元素未找到。");
        UI.showFeedbackModal("錯誤", "無法打開放生確認視窗。", false, true);
    }
    console.log(`提示放生 ${monster.nickname}。`);
}

function releaseMonsterConfirmed() {
    if (!GameState.monsterToReleaseInfo) return;

    const { id: releasedMonsterId, monster: releasedMonster } = GameState.monsterToReleaseInfo;

    GameState.farmedMonsters = GameState.farmedMonsters.filter(m => m.id !== releasedMonsterId);
    addLogEntry(releasedMonster, " 被訓獸師放生了。");

    if (GameState.currentMonster && GameState.currentMonster.id === releasedMonsterId) {
        GameState.currentMonster = GameState.farmedMonsters.length > 0 ? GameState.farmedMonsters[0] : null;
    }
    if (GameState.battlingMonsterId === releasedMonsterId) {
        GameState.battlingMonsterId = null;
    }

    UI.populateFarmList();
    UI.updateMonsterSnapshotDisplay(GameState.currentMonster);
    UI.updateActionButtonsStateUI();
    UI.closeModal('confirmation-modal');
    if (auth.currentUser) savePlayerData();

    UI.showFeedbackModal("放生成功", `${releasedMonster.nickname} 已經回歸大自然了。`, true, false);
    GameState.monsterToReleaseInfo = null;
    console.log(`怪獸 ${releasedMonster.nickname} 已放生。`);
}


export function addLogEntry(monster, message) {
    if (!monster || !message) return;

    if (!monster.activityLogs) {
        monster.activityLogs = [];
    }

    const timestamp = new Date().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'});
    monster.activityLogs.unshift({ timestamp: timestamp, message: message });

    if (monster.activityLogs.length > 50) {
        monster.activityLogs.pop();
    }

    const monsterInfoModalEl = GameState.elements.monsterInfoModal;
    if (monsterInfoModalEl && monsterInfoModalEl.style.display === 'flex' && GameState.currentMonster && GameState.currentMonster.id === monster.id) {
        UI.updateMonsterActivityLog(monster);
    }
    console.log(`日誌為 ${monster.nickname}: ${message}。`);
}


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

    const confirmationMessageEl = GameState.elements.confirmationMessage;
    const confirmActionBtnEl = GameState.elements.confirmActionBtn;
    const confirmationModalTitleEl = GameState.elements.confirmationModalTitle;
    const releaseMonsterImagePlaceholder = GameState.elements.releaseMonsterImagePlaceholder;

    if (confirmationMessageEl && confirmActionBtnEl && confirmationModalTitleEl && releaseMonsterImagePlaceholder) {
        confirmationModalTitleEl.textContent = "挑戰確認";
        confirmationMessageEl.innerHTML = `您確定要使用 <strong class="text-[var(--accent-color)]">${playerMonster.nickname}</strong> 挑戰 <strong class="text-[var(--danger-color)]">${opponentMonsterData.nickname}</strong> 嗎？`;

        const releaseMonsterImgPreview = GameState.elements.releaseMonsterImgPreview;
        if (releaseMonsterImgPreview) {
            releaseMonsterImgPreview.src = opponentMonsterData.imageUrl || `https://placehold.co/100x100/161b22/8b949e?text=${opponentMonsterData.nickname}`;
            releaseMonsterImgPreview.alt = `${opponentMonsterData.nickname}圖片`;
            releaseMonsterImagePlaceholder.style.display = 'block';
        } else {
            console.warn("UI: releaseMonsterImgPreview element not found for promptChallengeMonster.");
        }


        confirmActionBtnEl.className = 'primary';
        confirmActionBtnEl.textContent = '確定挑戰';
        confirmActionBtnEl.onclick = async () => {
            await simulateBattle(playerMonster, opponentMonsterData);
        };
        UI.openModal('confirmation-modal');
    } else {
        console.error("確認模態框的必要元素未找到。");
        UI.showFeedbackModal("錯誤", "無法打開挑戰確認視窗。", false, true);
    }
    console.log(`提示挑戰 ${playerMonster.nickname} 對 ${opponentMonsterData.nickname}。`);
}

async function simulateBattle(playerMonster, opponentMonster) {
    UI.closeModal('confirmation-modal');
    UI.showFeedbackModal("戰鬥中...", "激烈的戰鬥正在進行中...", true, false);
    console.log(`模擬戰鬥：${playerMonster.nickname} vs ${opponentMonster.nickname}`);

    try {
        const battleResult = await ApiClient.simulateBattle(playerMonster, opponentMonster);

        if (!battleResult || battleResult.error) {
            throw new Error(battleResult.error || "後端戰鬥模擬錯誤但未提供詳細訊息。");
        }

        playerMonster.wins = (playerMonster.wins || 0) + (battleResult.winnerId === playerMonster.id ? 1 : 0);
        playerMonster.losses = (playerMonster.losses || 0) + (battleResult.winnerId !== playerMonster.id ? 1 : 0);
        addLogEntry(playerMonster, `⚔️ 參與戰鬥，結果：${battleResult.winnerId === playerMonster.id ? '勝利' : (battleResult.winnerId === 'draw' ? '平手' : '敗北')}！`);

        GameState.playerData.wins = (GameState.playerData.wins || 0) + (battleResult.winnerId === playerMonster.id ? 1 : 0);
        GameState.playerData.losses = (GameState.playerData.losses || 0) + (battleResult.winnerId !== playerMonster.id ? 1 : 0);

        UI.displayBattleLog(battleResult.log);

        updateAllUIDisplays();
        if (auth.currentUser) savePlayerData();

        let feedbackTitle = "戰鬥結束";
        let feedbackMessage = "";
        if (battleResult.winnerId === playerMonster.id) {
            feedbackMessage = `恭喜！您的 ${playerMonster.nickname} 贏得了戰鬥！`;
            UI.showFeedbackModal(feedbackTitle, feedbackMessage, false, true, true, playerMonster);
        } else if (battleResult.winnerId === opponentMonster.id) {
            feedbackMessage = `很遺憾，您的 ${playerMonster.nickname} 輸掉了戰鬥。`;
            UI.showFeedbackModal(feedbackTitle, feedbackMessage, false, true, true, playerMonster);
        } else {
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
        const playerDataFromApi = await ApiClient.getPlayer(playerUid);

        if (playerDataFromApi) {
            UI.openAndPopulatePlayerInfoModal(playerDataFromApi, playerUid);
            UI.closeModal('feedback-modal');
        } else {
            throw new Error("未能獲取玩家資訊。");
        }
    } catch (error) {
        console.error("獲取玩家資訊失敗:", error);
        UI.showFeedbackModal("錯誤", `獲取玩家資訊失敗：${error.message}`, false, true);
    }
    console.log("玩家資訊彈窗邏輯完成。");
}

export function getFilteredAndSortedMonstersForLeaderboard(filterElement = 'all') {
    let filteredMonsters = GameState.farmedMonsters;

    if (!GameState.allPublicMonsters) {
        console.warn("GameState.allPublicMonsters 未載入，排行榜可能不完整。");
        filteredMonsters = GameState.farmedMonsters;
    } else {
        filteredMonsters = GameState.allPublicMonsters;
    }


    if (filterElement !== 'all') {
        filteredMonsters = filteredMonsters.filter(monster =>
            monster.elements && monster.elements.includes(filterElement)
        );
    }

    return [...filteredMonsters].sort((a, b) => (b.totalEvaluation || 0) - (a.totalEvaluation || 0));
}

export function getSortedPlayersForLeaderboard() {
    if (!GameState.allPublicPlayers) {
        console.warn("GameState.allPublicPlayers 未載入，玩家排行榜可能不完整。");
        return [{
            uid: GameState.playerData.uid,
            nickname: GameState.playerData.nickname,
            wins: GameState.playerData.wins,
            losses: GameState.playerData.losses,
            totalEvaluation: GameState.playerData.totalEvaluation || 0
        }];
    }
    return [...GameState.allPublicPlayers].sort((a, b) => (b.wins || 0) - (a.wins || 0));
}


export function initializeNpcMonsters() {
    // 這裡根據 GameState.gameSettings.npc_monsters 來初始化 NPC 怪獸數據
    // 這些數據通常是遊戲一開始就固定好的，或者從後端載入
    // 確保 GameState.gameSettings 和 GameState.gameSettings.npc_monsters 存在
    if (GameState.gameSettings && Array.isArray(GameState.gameSettings.npc_monsters)) {
        // 使用 slice() 創建一個新的陣列副本，確保它是可擴展的
        GameState.npcMonsters = GameState.gameSettings.npc_monsters.slice();
        console.log(`NPC 怪獸已初始化：共 ${GameState.npcMonsters.length} 隻。`);
    } else {
        console.warn("遊戲設定中沒有 NPC 怪獸資料或 GameState.gameSettings 結構不完整。將使用空陣列。");
        // 確保 GameState.npcMonsters 即使沒有從 GameSettings 複製也能是一個陣列
        if (!Array.isArray(GameState.npcMonsters)) {
            GameState.npcMonsters = [];
        }
    }
}

export function getRarityData(rarityName) {
    return GameState.gameSettings.rarities?.[rarityName] || { name: rarityName, textVarKey: '--rarity-common-text' };
}

export async function loadGameDataForUserLogic(uid, nickname) {
    console.log(`GameLogic: 載入使用者數據 for UID: ${uid}, Nickname: ${nickname}`);
    try {
        await GameState.loadUserData(uid);

        if (!GameState.currentMonster && GameState.farmedMonsters.length > 0) {
            GameState.currentMonster = GameState.farmedMonsters[0];
            if (GameState.battlingMonsterId) {
                const battlingMonster = GameState.farmedMonsters.find(m => m.id === GameState.battlingMonsterId);
                if (battlingMonster) {
                    GameState.currentMonster = battlingMonster;
                }
            }
        }

        updateAllUIDisplays();
        UI.showGameScreenAfterLogin();

        await loadPublicMonstersAndPlayers();

        console.log("GameLogic: 遊戲數據載入成功。");
    } catch (error) {
        console.error("GameLogic: 載入遊戲數據失敗：", error);
        UI.showFeedbackModal("錯誤", `載入遊戲數據失敗：${error.message}`, false, true);
        UI.showAuthScreen();
    }
}

export async function saveInitialPlayerDataToBackendLogic(uid, nickname, gameSettings) {
    console.log(`GameLogic: 保存初始玩家數據 for UID: ${uid}, Nickname: ${nickname}`);
    try {
        const maxInventorySlots = gameSettings.value_settings?.max_inventory_slots || 10;
        const maxTempBackpackSlots = gameSettings.value_settings?.max_temp_backpack_slots || 18;
        const maxCombinationSlots = gameSettings.value_settings?.max_combination_slots || 5;

        GameState.playerData = {
            uid: uid,
            nickname: nickname,
            wins: 0,
            losses: 0,
            gold: 100,
            diamond: 10,
            achievements: [],
            ownedMonsters: [],
            playerOwnedDNA: new Array(maxInventorySlots).fill(null),
            temporaryBackpackSlots: new Array(maxTempBackpackSlots).fill(null),
            combinationSlotsData: new Array(maxCombinationSlots).fill(null),
        };
        GameState.farmedMonsters = [];
        GameState.currentMonster = null;
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

        await GameState.saveUserData();

        console.log("GameLogic: 初始玩家數據保存成功。");
    } catch (error) {
        console.error("GameLogic: 保存初始玩家數據失敗：", error);
        UI.showFeedbackModal("錯誤", `保存初始玩家數據失敗：${error.message}`, false, true);
    }
}

export async function loadPublicMonstersAndPlayers() {
    console.log("GameLogic: 載入公開怪獸和玩家數據...");
    try {
        const publicMonstersSnapshot = await db.collection('artifacts').doc(__app_id).collection('public').collection('data').doc('monsters').get();
        if (publicMonstersSnapshot.exists && publicMonstersSnapshot.data().list) {
            GameState.allPublicMonsters = publicMonstersSnapshot.data().list;
            console.log(`GameLogic: 已載入 ${GameState.allPublicMonsters.length} 隻公開怪獸。`);
        } else {
            GameState.allPublicMonsters = [];
            console.log("GameLogic: 沒有公開怪獸數據。");
        }

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

    updateAllUIDisplays();
    UI.createCombinationSlots();
    UI.updateActionButtonsStateUI();
    console.log("GameLogic: 遊戲數據已重設。");
}

export async function savePlayerDataLogic() {
    console.log("GameLogic: 保存玩家數據...");
    await GameState.saveUserData();
    console.log("GameLogic: 玩家數據保存完成。");
}
