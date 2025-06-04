// js/game-state.js

// 初始化全局遊戲狀態對象
const gameState = {
    currentUser: null, // Firebase Auth User object
    playerId: null, // 當前玩家的 ID (通常是 UID)
    playerNickname: "玩家", // 玩家暱稱
    playerData: { // 玩家的遊戲進度資料
        playerOwnedDNA: [], // 玩家擁有的 DNA 碎片
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
        nickname: "玩家", // 頂層玩家暱稱
        lastSave: null
    },
    gameConfigs: null, // 從後端獲取的遊戲核心設定
    
    // UI 相關狀態
    isLoading: false, // 是否正在載入數據
    currentTheme: 'dark', // 當前主題 ('light' 或 'dark')
    selectedMonsterId: null, // 當前在快照中顯示或操作的怪獸 ID
    
    // DNA 組合相關狀態
    dnaCombinationSlots: [null, null, null, null, null], // DNA 組合槽中的 DNA (可以是 DNAFragment 對象或其 ID)
    
    // 臨時背包 (用於存放修煉拾取物等)
    temporaryBackpack: [], // 存放臨時物品，例如 { type: 'dna', data: {...dnaFragment}, quantity: 1 }

    // 其他可能需要的狀態
    currentError: null, // 當前錯誤訊息
    currentInfoMessage: null, // 當前提示訊息
    activeModalId: null, // 目前活動的彈窗 ID
    
    // 排行榜數據
    monsterLeaderboard: [],
    playerLeaderboard: [],
    currentMonsterLeaderboardElementFilter: 'all', // 當前怪獸排行榜的元素篩選

    // 好友/搜尋相關
    searchedPlayers: [], // 搜尋到的玩家列表

    // 修煉相關
    cultivationMonsterId: null, // 正在進行修煉設定的怪獸ID
    cultivationStartTime: null, // 修煉開始時間戳
    cultivationDurationSet: 0, // 設定的修煉時長 (秒)
    
    // 戰鬥相關
    battleTargetMonster: null, // 玩家選擇挑戰的對手怪獸資料
};

// 函數：更新遊戲狀態並觸發 UI 更新 (如果需要)
function updateGameState(newState) {
    // 簡單合併，更複雜的應用可能需要深度合併或使用狀態管理庫
    Object.assign(gameState, newState);
    
    // 可以在這裡觸發一個自定義事件，讓 UI 模塊監聽並更新
    // 例如：document.dispatchEvent(new CustomEvent('gameStateChanged', { detail: gameState }));
    // console.log("Game state updated:", gameState);
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
    if (gameState.playerData && gameState.playerData.farmedMonsters && gameState.playerData.farmedMonsters.length > 0) {
        return gameState.playerData.farmedMonsters[0];
    }
    return null;
}

// 函數：重設 DNA 組合槽
function resetDNACombinationSlots() {
    gameState.dnaCombinationSlots = [null, null, null, null, null];
    // 可能還需要更新 UI
}

// 函數：檢查 DNA 組合槽是否已滿
function areCombinationSlotsFull() {
    return gameState.dnaCombinationSlots.every(slot => slot !== null);
}

// 函數：檢查 DNA 組合槽是否為空
function areCombinationSlotsEmpty() {
    return gameState.dnaCombinationSlots.every(slot => slot === null);
}

// 函數：獲取組合槽中有效的 DNA IDs
function getValidDNAIdsFromCombinationSlots() {
    return gameState.dnaCombinationSlots.filter(slot => slot && slot.id).map(slot => slot.id);
}


console.log("Game state module loaded.");

// 導出 (如果使用 ES6 模塊)
// export { gameState, updateGameState, getSelectedMonster, getDefaultSelectedMonster, resetDNACombinationSlots, areCombinationSlotsFull, areCombinationSlotsEmpty, getValidDNAIdsFromCombinationSlots };
