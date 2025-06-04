// js/game-state.js

// --- 遊戲狀態與資料 ---

// 目前登入的使用者物件 (由 Firebase auth 提供)
let currentLoggedInUser = null;
// 目前登入玩家的暱稱
let currentPlayerNickname = "";

// 當前主要顯示/操作的怪獸 (通常是出戰怪獸)
let currentMonster = null;
// 玩家擁有的 DNA 碎片列表
let playerOwnedDNA = [];
// 玩家農場中的怪獸列表
let farmedMonsters = [];
// 玩家統計資料
let playerStats = {
    rank: 0, // 排名
    wins: 0, // 勝場
    losses: 0, // 敗場
    score: 0, // 積分
    titles: [], // 稱號
    achievements: [], // 成就
    medals: 0, // 獎牌
    nickname: "" // 暱稱 (會從 currentPlayerNickname 同步)
};

// 遊戲設定 (將由後端載入，此處為預設值或結構)
let gameSettings = {
    dnaFragments: [], // DNA 碎片類型
    rarities: {},     // 稀有度設定
    skills: {},       // 技能資料庫
    personalities: [],// 個性類型
    titles: ["新手訓練家"], // 稱號列表
    healthConditions: [], // 健康狀態
    newbieGuide: []   // 新手指南內容
};

// 農場與背包相關常數
const MAX_FARM_SLOTS = 10; // 農場最大怪獸容量
const MAX_CULTIVATION_SECONDS = 999; // 最大修煉時長 (秒)
const NUM_INVENTORY_SLOTS = 10; // DNA 碎片庫 (主要背包) 的格子數量
const NUM_TEMP_BACKPACK_SLOTS = 18; // 臨時背包的格子數量
const NUM_COMBINATION_SLOTS = 5; // DNA 組合槽的數量

// 戰鬥與修煉相關狀態
let battlingMonsterId = null; // 當前出戰怪獸的 ID
let currentCultivationMonster = null; // 當前正在設定養成的怪獸
let itemsFromCurrentTraining = []; // 當前修煉拾獲的物品 (用於修煉成果彈窗)

// UI 互動相關狀態
// 這些陣列用於追蹤拖放和UI顯示的DNA項目
let inventoryDisplaySlots = new Array(NUM_INVENTORY_SLOTS).fill(null); // 對應 DNA 碎片庫 UI
let temporaryBackpackSlots = new Array(NUM_TEMP_BACKPACK_SLOTS).fill(null); // 對應臨時背包 UI
let combinationSlotsData = new Array(NUM_COMBINATION_SLOTS).fill(null); // 對應 DNA 組合槽 UI

// 暫存準備刪除或放生的項目資訊
let itemToDeleteInfo = null; // { id, slotIndex, sourceType }
let monsterToReleaseInfo = null; // { farmIndex, id }
let monsterToChallengeInfo = null; // 準備挑戰的對手怪獸資料

// 排行榜資料
let monsterLeaderboardData = []; // 包含真實玩家怪獸和 NPC 怪獸
let playerLeaderboardData = [];
let npcMonsters = []; // NPC 怪獸列表 (由 game-logic.js 初始化)

// 排序狀態
let currentMonsterSort = { column: 'score', order: 'desc' };
let currentPlayerSort = { column: 'score', order: 'desc' };

// 新手指南資料 (會從 gameSettings 同步)
let newbieGuideData = [];

// 注意：
// 這些變數在此處被宣告為全域變數 (在此檔案的作用域內)。
// 如果您使用模組系統 (ES6 Modules)，您可能需要 `export` 這些變數，
// 並在其他需要它們的檔案中 `import`。
// 如果不使用模組，確保此檔案在其他使用這些變數的檔案之前被載入 HTML 中。
