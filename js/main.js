// main.js - 應用程式主進入點與協調器

// 實際導入所有必要的模組
import { auth, db, firebaseApp } from './firebase-config.js'; // Firebase 實例已在此模組中初始化並導出
import * as GameState from './game-state.js'; // 遊戲狀態和 DOM 元素引用
import * as UI from './ui.js'; // UI 操作函式
import * as GameLogic from './game-logic.js'; // 遊戲邏輯函式
import * as ApiClient from './api-client.js'; // API 呼叫函式
import * as Auth from './auth.js'; // 使用者驗證函式
import { initializeStaticEventListeners } from './event-handlers.js'; // 事件處理註冊

// --- DOM 元素獲取與初始化 (通常在應用程式啟動早期執行) ---
// 這個函式負責獲取所有在 index.html 中定義的 DOM 元素，並將它們儲存到 GameState.elements 中。
function initializeDOMReferences() {
    // 確保 GameState.elements 物件存在且可擴展
    // 如果它在 GameState.js 中被定義為 const elements = {};
    // 並且在某處被 Object.freeze(elements); 了，這裡會出問題。
    // 但如果只是普通的物件字面量，這行是防禦性的。
    // 如果 GameState.elements 已經是 Object.freeze() 的結果，這行不會改變它。
    if (!GameState.elements || Object.isFrozen(GameState.elements)) {
        // 如果 GameState.elements 不存在或已被凍結，重新初始化為一個新的空物件
        // 這通常表示 GameState.js 中的定義方式有問題，或者有其他程式碼凍結了它
        GameState.elements = {}; // 重新賦值為一個新的可擴展物件
    }


    // 主題切換
    GameState.elements.themeSwitcherBtn = document.getElementById('theme-switcher');
    GameState.elements.themeIcon = document.getElementById('theme-icon');

    // 認證畫面
    GameState.elements.authScreen = document.getElementById('auth-screen');
    GameState.elements.gameContainer = document.getElementById('game-container');
    GameState.elements.showLoginFormBtn = document.getElementById('show-login-form-btn');
    GameState.elements.showRegisterFormBtn = document.getElementById('show-register-form-btn');
    GameState.elements.registerNicknameInput = document.getElementById('register-nickname');
    GameState.elements.registerPasswordInput = document.getElementById('register-password');
    GameState.elements.registerErrorDisplay = document.getElementById('register-error');
    GameState.elements.registerSubmitBtn = document.getElementById('register-submit-btn');
    GameState.elements.loginNicknameInput = document.getElementById('login-nickname');
    GameState.elements.loginPasswordInput = document.getElementById('login-password');
    GameState.elements.loginErrorDisplay = document.getElementById('login-error');
    GameState.elements.loginSubmitBtn = document.getElementById('login-submit-btn');
    GameState.elements.logoutBtn = document.getElementById('logout-btn');

    // 頂部導航
    GameState.elements.monsterInfoButton = document.getElementById('monster-info-button');
    GameState.elements.playerInfoButton = document.getElementById('player-info-button');
    GameState.elements.showMonsterLeaderboardBtn = document.getElementById('show-monster-leaderboard-btn');
    GameState.elements.showPlayerLeaderboardBtn = document.getElementById('show-player-leaderboard-btn');
    GameState.elements.friendsListBtn = document.getElementById('friends-list-btn');
    GameState.elements.newbieGuideBtn = document.getElementById('newbie-guide-btn');

    // 怪獸快照面板
    GameState.elements.monsterSnapshotArea = document.getElementById('monster-snapshot-area');
    GameState.elements.monsterImageElement = document.getElementById('monster-image');
    GameState.elements.snapshotAchievementTitle = document.getElementById('snapshot-achievement-title');
    GameState.elements.snapshotNickname = document.getElementById('snapshot-nickname');
    GameState.elements.snapshotWinLoss = document.getElementById('snapshot-win-loss');
    GameState.elements.snapshotMainContent = document.getElementById('snapshot-main-content');
    GameState.elements.snapshotEvaluation = document.getElementById('snapshot-evaluation');

    // DNA管理頁籤
    GameState.elements.dnaCombinationSlotsContainer = document.getElementById('dna-combination-slots');
    GameState.elements.combineButton = document.getElementById('combine-button');
    GameState.elements.inventoryItemsContainer = document.getElementById('inventory-items');
    GameState.elements.drawDnaBtn = document.getElementById('draw-dna-btn');
    GameState.elements.inventoryDeleteSlot = document.querySelector('[data-droptype="delete"]'); // 刪除區可能沒有 ID，使用 data 屬性
    GameState.elements.temporaryBackpackItemsContainer = document.getElementById('temporary-backpack-items');

    // 怪物農場頁籤
    GameState.elements.farmedMonstersList = document.getElementById('farmed-monsters-list');
    GameState.elements.farmEmptyMessage = document.getElementById('farm-empty-message');

    // 模態框通用元素
    GameState.elements.feedbackModal = document.getElementById('feedback-modal');
    GameState.elements.feedbackModalTitle = document.getElementById('feedback-modal-title');
    GameState.elements.feedbackModalSpinner = document.getElementById('feedback-modal-spinner');
    GameState.elements.feedbackModalCloseX = document.getElementById('feedback-modal-close-x');
    GameState.elements.feedbackModalMessage = document.getElementById('feedback-modal-message');
    GameState.elements.feedbackMonsterDetailsDiv = document.getElementById('feedback-monster-details');

    // 確認模態框
    GameState.elements.confirmationModal = document.getElementById('confirmation-modal');
    GameState.elements.confirmationModalTitle = document.getElementById('confirmation-modal-title');
    GameState.elements.confirmationModalBody = document.getElementById('confirmation-modal-body');
    GameState.elements.confirmationMessage = document.getElementById('confirmation-message');
    GameState.elements.confirmActionBtn = document.getElementById('confirm-action-btn');
    GameState.elements.cancelActionBtn = document.getElementById('cancel-action-btn');
    GameState.elements.releaseMonsterImagePlaceholder = document.getElementById('release-monster-image-placeholder');
    GameState.elements.releaseMonsterImgPreview = document.getElementById('release-monster-img-preview');

    // 修煉設定模態框
    GameState.elements.cultivationSetupModal = document.getElementById('cultivation-setup-modal');
    GameState.elements.cultivationSetupModalTitle = document.getElementById('cultivation-setup-modal-title');
    GameState.elements.cultivationMonsterName = document.getElementById('cultivation-monster-name');
    GameState.elements.startCultivationBtn = document.getElementById('start-cultivation-btn');
    GameState.elements.maxCultivationTime = document.getElementById('max-cultivation-time');

    // 修煉成果模態框
    GameState.elements.trainingResultsModal = document.getElementById('training-results-modal');
    GameState.elements.trainingResultsModalTitle = document.getElementById('training-results-modal-title');
    GameState.elements.trainingStoryResult = document.getElementById('training-story-result');
    GameState.elements.trainingGrowthResult = document.getElementById('training-growth-result');
    GameState.elements.trainingItemsResult = document.getElementById('training-items-result');
    GameState.elements.addAllToTempBackpackBtn = document.getElementById('add-all-to-temp-backpack-btn');
    GameState.elements.trainingResultsModalFinalCloseBtn = document.getElementById('training-results-modal-final-close-btn');

    // 新手指南模態框
    GameState.elements.newbieGuideModal = document.getElementById('newbie-guide-modal');
    GameState.elements.newbieGuideSearchInput = document.getElementById('newbie-guide-search-input');
    GameState.elements.newbieGuideContentArea = document.getElementById('newbie-guide-content-area');

    // 提醒模態框 (修煉拾獲物品未領取)
    GameState.elements.reminderModal = document.getElementById('reminder-modal');
    GameState.elements.reminderModalTitle = document.getElementById('reminder-modal-title');
    GameState.elements.reminderModalBody = document.getElementById('reminder-modal-body');
    GameState.elements.reminderConfirmCloseBtn = document.getElementById('reminder-confirm-close-btn');
    GameState.elements.reminderCancelBtn = document.getElementById('reminder-cancel-btn');

    // 好友名單模態框
    GameState.elements.friendsListModal = document.getElementById('friends-list-modal');
    GameState.elements.friendsListSearchInput = document.getElementById('friends-list-search-input');
    GameState.elements.friendsListContainer = document.getElementById('friends-list-container');

    // 戰鬥記錄模態框
    GameState.elements.battleLogModal = document.getElementById('battle-log-modal');
    GameState.elements.battleLogArea = document.getElementById('battle-log-area');
    GameState.elements.battleLogEmptyMessage = document.getElementById('battle-log-empty-message');

    // DNA 抽取結果模態框
    GameState.elements.dnaDrawModal = document.getElementById('dna-draw-modal');
    GameState.elements.dnaDrawResultsGrid = document.getElementById('dna-draw-results-grid');

    // 排行榜模態框
    GameState.elements.monsterLeaderboardModal = document.getElementById('monster-leaderboard-modal');
    GameState.elements.monsterLeaderboardElementTabs = document.getElementById('monster-leaderboard-element-tabs');
    GameState.elements.monsterLeaderboardTable = document.getElementById('monster-leaderboard-table');
    GameState.elements.monsterLeaderboardEmptyMessage = document.getElementById('monster-leaderboard-empty-message');
    GameState.elements.playerLeaderboardModal = document.getElementById('player-leaderboard-modal');
    GameState.elements.playerLeaderboardTable = document.getElementById('player-leaderboard-table');
    GameState.elements.playerLeaderboardEmptyMessage = document.getElementById('player-leaderboard-empty-message');

    // 怪獸資訊模態框
    GameState.elements.monsterInfoModal = document.getElementById('monster-info-modal');
    GameState.elements.monsterInfoModalHeaderContent = document.getElementById('monster-info-modal-header-content');
    GameState.elements.monsterInfoTabs = document.getElementById('monster-info-tabs');
    GameState.elements.monsterDetailsTab = document.getElementById('monster-details-tab');
    GameState.elements.monsterActivityLogs = document.getElementById('monster-activity-logs');

    // 玩家資訊模態框
    GameState.elements.playerInfoModal = document.getElementById('player-info-modal');
    GameState.elements.playerInfoNickname = document.getElementById('player-info-nickname');
    GameState.elements.playerInfoUid = document.getElementById('player-info-uid');
    GameState.elements.playerInfoWins = document.getElementById('player-info-wins');
    GameState.elements.playerInfoLosses = document.getElementById('player-info-losses');
    GameState.elements.playerInfoGold = document.getElementById('player-info-gold');
    GameState.elements.playerInfoDiamond = document.getElementById('player-info-diamond');
    GameState.elements.playerInfoAchievements = document.getElementById('player-info-achievements');
    GameState.elements.playerInfoAchievementsEmptyMessage = document.getElementById('player-info-achievements-empty-message');
    GameState.elements.playerInfoOwnedMonsters = document.getElementById('player-info-owned-monsters');
    GameState.elements.playerInfoOwnedMonstersEmptyMessage = document.getElementById('player-info-owned-monsters-empty-message');

    // 頁籤按鈕 (用於初始選擇)
    GameState.elements.firstDnaFarmTab = document.querySelector('#dna-farm-tabs .tab-button');

    console.log("main.js: DOM 元素引用已初始化到 GameState.elements");
}


// --- 主要應用程式初始化函式 ---
async function initializeApp() {
    console.log("main.js: Initializing application...");

    // 0. 初始化 DOM 元素引用
    initializeDOMReferences(); // 確保 GameState.elements 可用

    // 1. 初始化 Firebase 實例並存儲到 GameState
    // firebase-config.js 已經在導入時執行了 firebase.initializeApp
    // 我們需要確保 auth 和 db 實例已從 firebase-config.js 正確導出並在此可用。
    GameState.auth = auth;
    GameState.db = db;
    GameState.firebaseApp = firebaseApp; // 如果其他地方需要 firebase app 實例
    console.log("main.js: Firebase 實例已存儲到 GameState。");

    // 2. 獲取遊戲核心設定
    try {
        const configs = await ApiClient.fetchGameConfigs(); // 來自 api-client.js (已改名)
        GameState.gameSettings = configs; // 更新全域遊戲設定
        GameLogic.initializeNpcMonsters(); // 如果 NPC 初始化依賴 gameSettings，則在此呼叫
        console.log("main.js: 遊戲設定已獲取並存儲到 GameState。");
        UI.populateNewbieGuide(); // 使用獲取的設定填充新手指南 (來自 ui.js)
    } catch (error) {
        console.error("main.js: 無法載入初始遊戲設定。使用預設值。", error);
        UI.showFeedbackModal("錯誤", "無法載入遊戲核心設定，部分功能可能異常。", false, true, false);
        // GameState.gameSettings 會保留其預設值（如果在 game-state.js 中有定義）
        GameLogic.initializeNpcMonsters(); // 即使設定失敗，也嘗試用預設值初始化NPC
    }

    // 3. 應用初始主題
    const preferredTheme = localStorage.getItem('theme') || 'dark';
    UI.applyTheme(preferredTheme); // 來自 ui.js
    console.log("main.js: 初始主題已應用。");

    // 4. 初始化 UI 元件 (例如組合槽)
    UI.createCombinationSlots(); // 來自 ui.js
    console.log("main.js: 初始 UI 元件 (如 DNA 槽) 已創建。");

    // 5. 註冊靜態事件監聽器
    initializeStaticEventListeners(); // 來自 event-handlers.js
    console.log("main.js: 靜態事件監聽器已初始化。");

    // 6. 更新操作按鈕的初始狀態
    UI.updateActionButtonsStateUI(); // 來自 ui.js (可能依賴 GameState)
    console.log("main.js: 操作按鈕的初始狀態已更新。");

    // 7. 初始化 Firebase 驗證狀態監聽器
    // initializeAuthListener 內部會根據登入狀態決定是顯示 authScreen 還是嘗試載入遊戲資料
    Auth.initializeAuthListener(); // 來自 auth.js
    console.log("main.js: Firebase 驗證監聽器已初始化。");


    // 8. 設定初始顯示的頁籤 (如果需要)
    if (GameState.elements.firstDnaFarmTab) {
        // 模擬點擊第一個頁籤，以確保其內容被正確顯示和初始化
        UI.openDnaFarmTab({ currentTarget: GameState.elements.firstDnaFarmTab }, 'dna-inventory-content'); // 來自 ui.js
        console.log("main.js: 初始頁籤顯示已設定。");
    }

    // 9. 初始時，總是先嘗試顯示驗證畫面
    // initializeAuthListener 中的邏輯會處理後續是否切換到遊戲畫面
    UI.showAuthScreen(); // 來自 ui.js
    console.log("main.js: 驗證畫面已初始顯示。");

    console.log("main.js: 應用程式初始化完成。");
}

// --- 啟動應用程式 ---
// 確保在 DOM 完全載入後執行，或者因為是 ES6 模組，通常會自動延遲執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
