// js/main.js

// --- ES6 Module Imports ---
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';

import * as ui from './ui.js';
import * as auth from './auth.js';
import * as apiClient from './api-client.js';
import * as gameStateManager from './game-state.js';
import * as gameLogic from './game-logic.js';
import * as eventHandlers from './event-handlers.js'; // 導入整個模塊
import * as config from './config.js';

// --- Global Variables and Initial Setup ---
let DOMElements = {}; // 由 ui.js 導出並在此處賦值
let app;
let firebaseAuthInstance; // 重命名以避免與 auth 模塊衝突

/**
 * 清除遊戲緩存
 */
function clearGameCacheOnExitOrRefresh() {
    console.log("正在清除遊戲快取...");
    sessionStorage.clear();
    localStorage.removeItem('announcementShown_v1');
    console.log("遊戲快取已清除。");
}

/**
 * 初始化 Firebase 應用。
 */
function initializeFirebaseApp() {
    try {
        app = initializeApp(firebaseConfig);
        firebaseAuthInstance = getAuth(app); // 使用重命名的變量
        console.log("Firebase App 初始化成功。");
    } catch (error) {
        console.error("Firebase 初始化錯誤:", error);
        ui.showFeedbackModal('嚴重錯誤', '無法初始化遊戲核心服務，請稍後再試或聯繫管理員。');
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-size: 1.2em;">遊戲載入失敗：核心服務初始化失敗。請檢查控制台。</div>';
        throw error;
    }
}

/**
 * 初始化 DOMElements 對象
 */
function initializeLocalDOMElements() {
    // 直接使用 ui.js 導出的 DOMElements
    DOMElements = ui.DOMElements;

    // 確保 ui.js 中的 DOMElements 也被填充
    if (typeof ui.initializeDOMElements === 'function') {
        ui.initializeDOMElements(); // 調用 ui.js 中的初始化函數（如果它存在且需要獨立調用）
    } else {
        console.warn("ui.initializeDOMElements is not a function. Assuming DOMElements are directly exported or managed within ui.js.");
    }


    // 特別修正 dnaFarmTabs 的獲取方式
    DOMElements.dnaFarmTabs = document.getElementById('dna-farm-tabs'); // 使用 ID 'dna-farm-tabs'


    console.log("DOMElements 在 main.js 中已引用/確認:", DOMElements);
    if (DOMElements.authScreen && Object.values(DOMElements).some(el => el === null)) {
        console.warn("一個或多個 DOMElements 未找到，請檢查 HTML ID 是否正確，以及 ui.js 中的元素獲取。");
    }
}


/**
 * 遊戲初始化函數
 */
async function initializeGame() {
    console.log("正在初始化遊戲...");
    ui.showFeedbackModal('遊戲載入中...', '正在準備您的怪獸異世界...', true, 0);

    try {
        ui.initializeTheme();

        const configs = await apiClient.getGameConfigs();
        if (configs && Object.keys(configs).length > 0) {
            gameStateManager.updateGameState({ gameConfigs: configs });
            console.log("遊戲設定已載入並儲存到 gameStateManager。");
            if (DOMElements.maxCultivationTimeText && configs.value_settings && configs.value_settings.max_cultivation_time_seconds) {
                DOMElements.maxCultivationTimeText.textContent = configs.value_settings.max_cultivation_time_seconds;
            }
            // 處理 gameHints
            if (configs.newbie_guide && configs.newbie_guide.length > 0 && DOMElements.scrollingHintsContainer) {
                const hints = configs.newbie_guide.map(entry => entry.title + ": " + entry.content.substring(0, 50) + "...");
                ui.startHintScrolling(DOMElements.scrollingHintsContainer, hints);
            }
        } else {
            throw new Error("無法獲取遊戲核心設定。");
        }

        // 使用 gameStateManager.getCurrentUser()
        const currentUser = gameStateManager.getCurrentUser();
        if (!currentUser) {
            console.log("沒有使用者登入，停留在驗證畫面。");
            if (DOMElements.authScreen) ui.toggleElementDisplay(DOMElements.authScreen, true, 'flex');
            if (DOMElements.gameContainer) ui.toggleElementDisplay(DOMElements.gameContainer, false);
            ui.hideModal('feedback-modal');
            return;
        }

        await loadPlayerDataAndInitializeUI(currentUser);

    } catch (error) {
        console.error("遊戲初始化失敗:", error);
        ui.hideModal('feedback-modal');
        ui.showFeedbackModal('遊戲載入失敗', `初始化過程中發生錯誤：${error.message}。請嘗試刷新頁面。`);
        if (DOMElements.authScreen) ui.toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) ui.toggleElementDisplay(DOMElements.gameContainer, false);
    }
}

/**
 * 當 Firebase Auth 狀態改變時的回調函數
 */
async function onAuthStateChangedHandler(user) {
    if (Object.keys(DOMElements).length === 0 && DOMElements.constructor === Object) {
        console.warn("onAuthStateChangedHandler 在 DOMElements 初始化前被調用。100毫秒後重試。");
        setTimeout(() => onAuthStateChangedHandler(user), 100);
        return;
    }

    // 使用 gameStateManager.getGameState()
    const currentGameState = gameStateManager.getGameState();

    if (user) {
        console.log("使用者已登入:", user.uid);
        const userNickname = user.displayName || (user.email ? user.email.split('@')[0] : "玩家");
        gameStateManager.updateGameState({
            currentUser: user,
            playerId: user.uid,
            playerNickname: userNickname
        });

        ui.updatePlayerInfoInUI({ name: userNickname, score: currentGameState.playerData?.playerStats?.score || 0, uid: user.uid });


        if (DOMElements.gameContainer && (DOMElements.gameContainer.style.display === 'none' || DOMElements.gameContainer.style.display === '')) {
            // 首次登入或刷新後自動登入，需要完整初始化
            await initializeGame(); // initializeGame 內部會調用 loadPlayerDataAndInitializeUI
        } else {
            // 如果遊戲容器已顯示 (例如，從註冊/登入彈窗過來)，只需加載數據和更新UI
            await loadPlayerDataAndInitializeUI(user);
        }

        // 處理公告
        const announcementShown = localStorage.getItem('announcementShown_v1');
        if (!announcementShown && DOMElements.officialAnnouncementModal) {
            ui.updateAnnouncementPlayerName(userNickname);
            ui.showModal('official-announcement-modal');
        }

    } else {
        console.log("使用者已登出或尚未登入。");
        gameStateManager.updateGameState({
            currentUser: null,
            playerId: null,
            playerNickname: "玩家",
            playerData: { // 提供一個最小的預設結構以避免後續訪問 undefined
                playerOwnedDNA: [],
                farmedMonsters: [],
                playerStats: { nickname: "玩家", titles: ["新手"], wins: 0, losses: 0, score: 0, achievements: [], medals: 0 }
            },
            selectedMonsterId: null,
            dnaCombinationSlots: [null, null, null, null, null],
            temporaryBackpack: []
        });
        ui.updatePlayerInfoInUI({ name: "玩家", score: 0, uid: null });


        if (DOMElements.authScreen) ui.toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) ui.toggleElementDisplay(DOMElements.gameContainer, false);

        ui.updateMonsterSnapshot(null);
        gameStateManager.resetDNACombinationSlots(); // 這會調用 renderDNACombinationSlots
        ui.renderPlayerDNAInventory([]);
        ui.renderMonsterFarm([]);
        ui.renderTemporaryBackpack([]);
        ui.hideAllModals();
    }
}

/**
 * 載入玩家數據並初始化相關 UI。
 */
async function loadPlayerDataAndInitializeUI(user) {
    if (!user) return;

    ui.showFeedbackModal('載入中...', '正在獲取您的玩家資料...', true, 0);
    try {
        const playerDataResponse = await apiClient.getPlayerData(user.uid);
        if (playerDataResponse) {
            const nicknameToUse = playerDataResponse.nickname || user.displayName || (user.email ? user.email.split('@')[0] : "玩家");
            gameStateManager.updateGameState({
                playerData: playerDataResponse,
                playerNickname: nicknameToUse // 確保 playerNickname 也被更新
            });
            console.log("玩家資料已載入:", user.uid, "暱稱:", nicknameToUse);

            // 使用 gameStateManager.getGameState() 來獲取最新的狀態
            const currentGameState = gameStateManager.getGameState();
            ui.updatePlayerInfoInUI({ name: nicknameToUse, score: currentGameState.playerData.playerStats?.score || 0, uid: user.uid });


            ui.renderPlayerDNAInventory(currentGameState.playerData.playerOwnedDNA || []);
            ui.renderDNACombinationSlots(currentGameState.dnaCombinationSlots || []); // 確保傳遞數據

            const initialFragmentsForSlots = currentGameState.dnaCombinationSlots || new Array(config.MAX_DNA_SLOTS || 5).fill(null);
            // ui.initializeDnaFragmentGrid(config.MAX_DNA_SLOTS || 5); // 這行可能不需要了，如果 renderDNACombinationSlots 處理了初始化
            // ui.renderDnaFragmentsInGrid(initialFragmentsForSlots); // 同上

            ui.renderMonsterFarm(currentGameState.playerData.farmedMonsters || []);
            ui.renderTemporaryBackpack(currentGameState.temporaryBackpack || []);

            const defaultMonster = gameStateManager.getDefaultSelectedMonster();
            ui.updateMonsterSnapshot(defaultMonster || null); // 如果是 null，快照區域會顯示預設狀態

            if (DOMElements.authScreen) ui.toggleElementDisplay(DOMElements.authScreen, false);
            if (DOMElements.gameContainer) ui.toggleElementDisplay(DOMElements.gameContainer, true, 'flex');

            if (ui.updateAnnouncementPlayerName) ui.updateAnnouncementPlayerName(nicknameToUse);
            ui.hideModal('feedback-modal');

        } else {
            throw new Error("無法獲取玩家遊戲資料，後端未返回有效數據。");
        }
    } catch (error) {
        console.error("載入玩家資料並初始化 UI 失敗:", error);
        ui.hideModal('feedback-modal');
        ui.showFeedbackModal('資料載入失敗', `獲取玩家資料時發生錯誤：${error.message}。您可以嘗試重新登入。`, false, 5000, [
            { text: '重新登入', class: 'primary', onClick: async () => { await auth.logoutUser(); } },
            { text: '關閉', class: 'secondary', onClick: () => ui.hideModal('feedback-modal') }
        ]);
    }
}


// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', async () => {
    clearGameCacheOnExitOrRefresh();
    initializeLocalDOMElements();
    console.log("DOM 已完全載入和解析。DOMElements 已初始化。");

    try {
        initializeFirebaseApp();
    } catch (e) {
        console.error("無法啟動遊戲，Firebase 初始化失敗。");
        return;
    }

    if (firebaseAuthInstance) { // 使用重命名的變量
        onAuthStateChanged(firebaseAuthInstance, onAuthStateChangedHandler);
    } else {
        console.error("Firebase Auth 實例未初始化。");
        ui.showFeedbackModal('嚴重錯誤', '遊戲認證服務載入失敗，請刷新頁面。');
        return;
    }

    // 修正：調用 eventHandlers 模塊中導出的 initializeEventListeners 函數
    if (typeof eventHandlers.initializeEventListeners === 'function') {
        eventHandlers.initializeEventListeners();
    } else {
        console.error("eventHandlers.initializeEventListeners 未定義。請確保 event-handlers.js 已正確加載和導出。");
    }


    // 預設顯示第一個頁籤 (DNA管理)
    // 修正: DOMElements.dnaFarmTabs 應該是頁籤按鈕的容器
    const dnaInventoryTabButton = DOMElements.dnaFarmTabs?.querySelector('.tab-button[data-tab-target="dna-inventory-content"]');
    if (DOMElements.dnaFarmTabs && dnaInventoryTabButton) {
        if (typeof ui.switchTabContent === 'function') {
            ui.switchTabContent('dna-inventory-content', dnaInventoryTabButton, 'dna-farm-tabs');
        } else {
            console.warn("ui.switchTabContent 函數未定義。");
        }
    } else {
        console.warn("DNA Farm Tabs (ID: dna-farm-tabs) 或初始頁籤按鈕未找到。跳過預設頁籤切換。");
        if (!DOMElements.dnaFarmTabs) console.warn("DOMElements.dnaFarmTabs is null or undefined.");
        if (!dnaInventoryTabButton) console.warn("DNA Inventory Tab Button (data-tab-target='dna-inventory-content') not found within dnaFarmTabs.");

    }
});

window.addEventListener('beforeunload', function (e) {
    clearGameCacheOnExitOrRefresh();
});

// 將關鍵的全局變量和函數掛載到 window 對象，以便其他模塊（如果它們不是 ES6 模塊）可以訪問
// 或者，如果所有 JS 文件都是 ES6 模塊，則應使用 import/export
window.DOMElements = DOMElements; // 允許其他模塊訪問由 ui.js 初始化的 DOM 元素
window.gameState = gameStateManager.getGameState(); // 提供對 gameState 的訪問（只讀快照）
window.gameStateManager = gameStateManager; // 提供對整個 gameStateManager 的訪問
window.ui = ui;
window.auth = auth;
window.apiClient = apiClient;
window.gameLogic = gameLogic;
window.config = config;


console.log("Main.js 腳本已載入並設置了全局變量。");
