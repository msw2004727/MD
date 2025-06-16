// js/game-state.js

// 初始化全局遊戲狀態對象
const gameState = {
    currentUser: null, // Firebase Auth User object
    playerId: null, // 當前玩家的 ID (通常是 UID)
    playerNickname: "玩家", // 玩家暱稱
    
    // 定義最大庫存槽位數，與 UI/數據庫保持一致
    MAX_INVENTORY_SLOTS: 12, 

    playerData: { // 玩家的遊戲進度資料
        playerOwnedDNA: Array(12).fill(null), // 玩家擁有的 DNA 碎片 (固定 12 格)
        farmedMonsters: [], // 玩家農場中的怪獸
        playerStats: { // 玩家統計數據
            rank: "N/A",
            wins: 0,
            losses: 0,
            score: 0,
            titles: ["新手"],
            achievements: [],
            medals: 0,
            nickname: "玩家"
        },
        nickname: "玩家",
        lastSave: null,
        selectedMonsterId: null,
        // 新增：將組合槽狀態移至此處，使其成為可存檔的玩家資料
        dnaCombinationSlots: [null, null, null, null, null], 
    },
    gameConfigs: null, // 從後端獲取的遊戲核心設定
    assetPaths: null, // 新增：用於存放從 assets.json 讀取的圖片路徑
    uiTextContent: {}, // 新增：用於存放從 ui_text.json 讀取的文字內容
    
    // UI 相關狀態
    isLoading: false, 
    currentTheme: 'dark',
    selectedMonsterId: null, 
    
    // 移除：dnaCombinationSlots 已移至 playerData 中
    
    // 新增：DNA組合槽與身體部位的映射關係
    dnaSlotToBodyPartMapping: {
        0: 'head',
        1: 'leftArm',
        2: 'rightArm',
        3: 'leftLeg',
        4: 'rightLeg'
    },

    // 臨時背包
    temporaryBackpack: [],

    // 其他可能需要的狀態
    currentError: null,
    currentInfoMessage: null,
    activeModalId: null,
    
    // 排行榜數據
    monsterLeaderboard: [],
    playerLeaderboard: [],
    currentMonsterLeaderboardElementFilter: 'all',

    // 排行榜排序設定
    leaderboardSortConfig: {
        monster: { key: 'score', order: 'desc' },
        player: { key: 'score', order: 'desc' }
    },

    // 怪獸農場排序設定
    farmSortConfig: { key: 'score', order: 'desc' },

    // 好友/搜尋相關
    searchedPlayers: [],

    // 修煉相關
    cultivationMonsterId: null,
    cultivationStartTime: null,
    cultivationDurationSet: 0,
    lastCultivationResult: null,
    feedbackHintInterval: null, // 通用回饋視窗的提示計時器
    trainingHintInterval: null, // 修煉成果視窗的提示計時器
    
    // 戰鬥相關
    battleTargetMonster: null,
    viewedPlayerData: null,

    // DNA 抽卡相關
    lastDnaDrawResult: null,
};

// 函數：更新遊戲狀態並觸發 UI 更新 (如果需要)
function updateGameState(newState) {
    Object.assign(gameState, newState);
}

// 函數：獲取當前選中的怪獸對象
function getSelectedMonster() {
    if (!gameState.selectedMonsterId || !gameState.playerData || !gameState.playerData.farmedMonsters) {
        return null;
    }
    return gameState.playerData.farmedMonsters.find(m => m.id === gameState.selectedMonsterId) || null;
}

// 函數：獲取玩家農場中的第一隻怪獸作為預設選中
function getDefaultSelectedMonster() {
    const playerData = gameState.playerData;
    if (!playerData || !playerData.farmedMonsters || playerData.farmedMonsters.length === 0) {
        return null;
    }
    const savedSelectedId = playerData.selectedMonsterId;
    if (savedSelectedId) {
        const selectedMonster = playerData.farmedMonsters.find(m => m.id === savedSelectedId);
        if (selectedMonster) {
            return selectedMonster;
        }
    }
    return playerData.farmedMonsters[0];
}

// 函數：重設 DNA 組合槽
function resetDNACombinationSlots() {
    // 修改：指向 playerData 內部的新位置
    if (gameState.playerData) {
        gameState.playerData.dnaCombinationSlots = [null, null, null, null, null];
    }
    if (typeof renderDNACombinationSlots === 'function') { 
        renderDNACombinationSlots();
    }
    if (typeof updateMonsterSnapshot === 'function') {
        updateMonsterSnapshot(getSelectedMonster()); 
    }
}

// 函數：檢查 DNA 組合槽是否已滿
function areCombinationSlotsFull() {
    // 修改：指向 playerData 內部的新位置
    return gameState.playerData?.dnaCombinationSlots?.every(slot => slot !== null) ?? false;
}

// 函數：檢查 DNA 組合槽是否為空
function areCombinationSlotsEmpty() {
    // 修改：指向 playerData 內部的新位置
    return gameState.playerData?.dnaCombinationSlots?.every(slot => slot === null) ?? true;
}

// 函數：獲取組合槽中有效的 DNA IDs
function getValidDNAIdsFromCombinationSlots() {
    // 修改：指向 playerData 內部的新位置
    return gameState.playerData?.dnaCombinationSlots?.filter(slot => slot && slot.id).map(slot => slot.id) ?? [];
}


console.log("Game state module loaded with body part mapping and sort config.");
