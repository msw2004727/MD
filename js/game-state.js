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
        nickname: "玩家",
        lastSave: null
    },
    gameConfigs: null, // 從後端獲取的遊戲核心設定
    isLoading: false,
    currentTheme: 'dark',
    selectedMonsterId: null,
    dnaCombinationSlots: [null, null, null, null, null],
    dnaSlotToBodyPartMapping: {
        0: 'head',
        1: 'leftArm',
        2: 'rightArm',
        3: 'leftLeg',
        4: 'rightLeg'
    },
    temporaryBackpack: [],
    currentError: null,
    currentInfoMessage: null,
    activeModalId: null,
    monsterLeaderboard: [],
    playerLeaderboard: [],
    currentMonsterLeaderboardElementFilter: 'all',
    leaderboardSortConfig: {
        monster: { key: 'score', order: 'desc' },
        player: { key: 'score', order: 'desc' }
    },
    searchedPlayers: [],
    cultivationMonsterId: null,
    cultivationStartTime: null,
    cultivationDurationSet: 0,
    lastCultivationResult: null,
    battleTargetMonster: null,
    lastDnaDrawResult: null,
};

// 函數：更新遊戲狀態
export function updateGameState(newState) {
    Object.assign(gameState, newState);
    // console.log("Game state updated:", JSON.parse(JSON.stringify(gameState))); // 深拷貝打印以避免循環引用問題
}

// 函數：獲取當前遊戲狀態 (修復點)
export function getGameState() {
    return gameState;
}

// 函數：獲取當前 Firebase 用戶 (修復點)
export function getCurrentUser() {
    return gameState.currentUser;
}


// 函數：獲取當前選中的怪獸對象
export function getSelectedMonster() {
    if (!gameState.selectedMonsterId || !gameState.playerData || !gameState.playerData.farmedMonsters) {
        return null;
    }
    return gameState.playerData.farmedMonsters.find(m => m.id === gameState.selectedMonsterId) || null;
}

// 函數：獲取玩家農場中的第一隻怪獸作為預設選中
export function getDefaultSelectedMonster() {
    if (gameState.playerData && gameState.playerData.farmedMonsters && gameState.playerData.farmedMonsters.length > 0) {
        return gameState.playerData.farmedMonsters[0];
    }
    return null;
}

// 函數：重設 DNA 組合槽
export function resetDNACombinationSlots() {
    gameState.dnaCombinationSlots = [null, null, null, null, null];
    if (typeof window.ui !== 'undefined' && typeof window.ui.renderDNACombinationSlots === 'function') {
        window.ui.renderDNACombinationSlots(gameState.dnaCombinationSlots);
    }
     // 當組合槽重設時，也嘗試更新快照中的身體部位
    if (typeof window.ui !== 'undefined' && typeof window.ui.updateMonsterSnapshot === 'function') {
        window.ui.updateMonsterSnapshot(getSelectedMonster() || getDefaultSelectedMonster());
    }
}

// 函數：檢查 DNA 組合槽是否已滿
export function areCombinationSlotsFull() {
    return gameState.dnaCombinationSlots.every(slot => slot !== null);
}

// 函數：檢查 DNA 組合槽是否為空
export function areCombinationSlotsEmpty() {
    return gameState.dnaCombinationSlots.every(slot => slot === null);
}

// 函數：獲取組合槽中有效的 DNA IDs (應該是 baseId)
export function getValidDNABaseIdsFromCombinationSlots() {
    return gameState.dnaCombinationSlots.filter(slot => slot && slot.baseId).map(slot => slot.baseId);
}


console.log("Game state module loaded with getGameState and other exports.");
