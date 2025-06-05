好的，我來幫您修復 main.js 文件，使其能夠正確地作為 ES6 模塊運行，並解決您截圖中顯示的 Unexpected token 'export' 和 initializeDOMElements function is not defined 的問題。

主要的修改思路：

添加 import 語句： 在 main.js 的頂部，我們需要明確地 import 所有它依賴的其他 JavaScript 文件（模塊）。例如，ui.js（包含 initializeDOMElements 和其他 UI 函數）、auth.js、api-client.js、game-state.js、game-logic.js、event-handlers.js 和 config.js 等。
確保函數調用正確： 導入模塊後，調用這些模塊中導出的函數時，需要使用正確的命名空間（例如，如果從 ui.js 導入為 ui，則調用 ui.initializeDOMElements()）。
全局變量和狀態管理： 雖然您提到了全局變量 gameState 和 DOMElements，在模塊化的結構中，更推薦的方式是將這些狀態或元素集合封裝在它們各自的模塊中，並通過導出的函數來訪問或修改它們，或者將其實例傳遞給需要的模塊。不過，為了盡可能少地改動您現有的邏輯，我會假設這些全局變量仍然存在，但會確保它們在被使用前已經被正確初始化。
Firebase 初始化： Firebase SDK 本身現在也推薦使用模塊化的方式導入。您的 initializeFirebaseApp 函數看起來是使用舊的全局 firebase 對象。我會將其更新為使用 ES6 模塊導入 Firebase。
以下是修改後的 main.js 完整內容：

我會盡量保持您原有的函數結構，主要添加 import 語句和調整函數調用。

JavaScript

// js/main.js

// --- ES6 Module Imports ---
// 假設這些文件都位於 js/ 目錄下，並且都正確使用了 export 導出其功能
// 請根據您的實際文件名和導出情況調整
import { firebaseConfig } from './firebase-config.js'; // 假設 firebase-config.js 導出 firebaseConfig
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
// import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'; // 如果用到 Firestore

import * as ui from './ui.js'; // 包含 initializeDOMElements, showFeedbackModal, toggleElementDisplay, etc.
import * as auth from './auth.js'; // 包含 RosterAuthListener, logoutUser
import * as apiClient from './api-client.js'; // 包含 getGameConfigs, getPlayerData
import * as gameStateManager from './game-state.js'; // 管理 gameState, updateGameState
import * as gameLogic from './game-logic.js'; // 包含 getDefaultSelectedMonster 等
import * as eventHandlers from './event-handlers.js'; // 包含 initializeEventListeners
import * as config from './config.js'; // 遊戲配置，例如 MAX_DNA_SLOTS

// --- Global Variables and Initial Setup ---
// 許多全局變量可以通過導入的模塊來訪問
// gameState 應該由 gameStateManager 管理
// DOMElements 應該由 ui 模塊初始化和管理，或者在此處初始化後傳遞

let DOMElements = {}; // 將在此處填充
let app; // Firebase App instance
let firebaseAuth; // Firebase Auth instance
// let db; // Firebase Firestore instance

/**
 * 清除遊戲緩存 (sessionStorage 和特定的 localStorage 項目)。
 * 會在頁面刷新或關閉視窗前調用。
 */
function clearGameCacheOnExitOrRefresh() {
    console.log("正在清除遊戲快取 (sessionStorage 和特定的 localStorage 項目)...");
    sessionStorage.clear();
    console.log("SessionStorage 已清除。");
    localStorage.removeItem('announcementShown_v1'); // 假設這是公告顯示的標記
    console.log("localStorage 項目 'announcementShown_v1' 已移除。");
}

/**
 * 初始化 Firebase 應用。
 */
function initializeFirebaseApp() {
    try {
        app = initializeApp(firebaseConfig);
        firebaseAuth = getAuth(app);
        // db = getFirestore(app); // 如果使用 Firestore
        console.log("Firebase App 初始化成功。");
    } catch (error) {
        console.error("Firebase 初始化錯誤:", error);
        ui.showFeedbackModal('嚴重錯誤', '無法初始化遊戲核心服務，請稍後再試或聯繫管理員。');
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-size: 1.2em;">遊戲載入失敗：核心服務初始化失敗。請檢查控制台。</div>';
        throw error; // 拋出錯誤以停止後續執行
    }
}

/**
 * 初始化 DOMElements 對象
 * 移到 main.js 中，因為它需要在所有模塊加載前或加載時獲取 DOM 引用
 */
function initializeLocalDOMElements() {
    // 這裡應該填充所有 DOM 元素的獲取邏輯
    // 例如:
    DOMElements.authScreen = document.getElementById('login-section');
    DOMElements.gameContainer = document.getElementById('main-content'); // 或者更具體的遊戲容器 ID
    DOMElements.maxCultivationTimeText = document.getElementById('max-cultivation-time'); // 假設有這個元素
    // ... 添加您 DOMElements 中所有需要的元素
    // 這個函數應該盡可能全面地獲取 ui.js 和其他模塊可能依賴的 DOM 元素
    // 或者，ui.js 應該自己導出一個初始化其內部所需 DOM 引用的函數

    // 以下是基於您原始 main.js 中隱含使用的 DOMElements 的猜測
    // 您需要根據您的 HTML 結構來填充和驗證這些
    DOMElements.dnaFarmTabs = document.querySelector('.dna-farm-tabs-container'); // 假設的類名
    DOMElements.loadingIndicator = document.getElementById('loading-indicator'); // 來自 ui.js
    DOMElements.messageContainer = document.getElementById('message-container'); // 來自 ui.js

    // 來自 ui.js 的其他元素，確保它們存在於 HTML 中
    DOMElements.playerNameDisplay = document.getElementById('player-name-display');
    DOMElements.playerScoreDisplay = document.getElementById('player-score-display');
    DOMElements.userIdDisplay = document.getElementById('user-id-display');
    DOMElements.lobbyPlayerName = document.getElementById('lobby-player-name');


    // 確保 ui 模塊也能訪問這些元素，或者 ui 模塊自己管理其元素
    // 一種方式是將 DOMElements 作為參數傳遞給 ui 模塊的初始化函數（如果有的話）
    // 或者 ui.js 導出一個 setDOMElements 的函數
    if (ui.setSharedDOMElements) { // 假設 ui.js 有這樣一個函數
        ui.setSharedDOMElements(DOMElements);
    }

    console.log("DOMElements 在 main.js 中初始化完畢:", DOMElements);
    if (Object.keys(DOMElements).some(key => DOMElements[key] === null) && DOMElements.authScreen) { // 檢查是否有關鍵元素未找到
        console.warn("一個或多個 DOMElements 未找到，請檢查 HTML ID 是否正確。");
    }
}


/**
 * 遊戲初始化函數
 * 當 DOMContentLoaded 和 Firebase Auth 狀態確認後調用
 */
async function initializeGame() {
    console.log("正在初始化遊戲...");
    ui.showFeedbackModal('遊戲載入中...', '正在準備您的怪獸異世界...', true, 0); // true 表示模態，0 表示不自動關閉

    try {
        if (ui.initializeTheme) ui.initializeTheme(); // 假設主題初始化在 ui.js

        const configs = await apiClient.getGameConfigs();
        if (configs && Object.keys(configs).length > 0) {
            gameStateManager.updateGameState({ gameConfigs: configs });
            console.log("遊戲設定已載入並儲存到 gameState。");
            if (DOMElements.maxCultivationTimeText && configs.value_settings) {
                DOMElements.maxCultivationTimeText.textContent = configs.value_settings.max_cultivation_time_seconds || 3600;
            }
            // ... (處理 gameHints 的邏輯保持不變)
        } else {
            throw new Error("無法獲取遊戲核心設定。");
        }

        const currentUser = gameStateManager.getCurrentUser(); // 從 gameStateManager 獲取用戶
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
    if (Object.keys(DOMElements).length === 0) {
        console.warn("onAuthStateChangedHandler 在 DOMElements 初始化前被調用。100毫秒後重試。");
        setTimeout(() => onAuthStateChangedHandler(user), 100);
        return;
    }

    const gameState = gameStateManager.getGameState(); // 獲取當前遊戲狀態

    if (user) {
        console.log("使用者已登入:", user.uid);
        gameStateManager.updateGameState({
            currentUser: user,
            playerId: user.uid,
            playerNickname: user.displayName || (user.email ? user.email.split('@')[0] : "玩家")
        });
        // 更新UI中的用戶信息
        ui.updatePlayerInfo({ name: gameStateManager.getGameState().playerNickname, score: gameStateManager.getGameState().playerData?.score, uid: user.uid });


        if (DOMElements.gameContainer && (DOMElements.gameContainer.style.display === 'none' || DOMElements.gameContainer.style.display === '')) {
            await initializeGame();
        } else {
            await loadPlayerDataAndInitializeUI(user);
        }
        // ... (處理公告的邏輯保持不變)

    } else {
        console.log("使用者已登出或尚未登入。");
        gameStateManager.updateGameState({ currentUser: null, playerId: null, playerNickname: "玩家", playerData: null });
        ui.updatePlayerInfo({ name: "玩家", score: 0, uid: null });


        if (DOMElements.authScreen) ui.toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) ui.toggleElementDisplay(DOMElements.gameContainer, false);

        // 重置 UI 組件 (確保這些函數存在於導入的模塊中)
        if (gameLogic.updateMonsterSnapshot) gameLogic.updateMonsterSnapshot(null);
        if (ui.resetDNACombinationSlots) ui.resetDNACombinationSlots(); // 假設在 ui.js
        if (ui.renderDNACombinationSlots) ui.renderDNACombinationSlots(gameStateManager.getGameState().dnaCombinationSlots || []); // 傳遞當前數據
        if (ui.renderPlayerDNAInventory) ui.renderPlayerDNAInventory(gameStateManager.getGameState().playerData?.dnaInventory || []);
        if (ui.renderMonsterFarm) ui.renderMonsterFarm(gameStateManager.getGameState().playerData?.monsters || []);
        if (ui.renderTemporaryBackpack) ui.renderTemporaryBackpack(gameStateManager.getGameState().temporaryBackpack || []);
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
        const playerData = await apiClient.getPlayerData(user.uid);
        if (playerData) {
            const nickname = playerData.nickname || user.displayName || (user.email ? user.email.split('@')[0] : "玩家");
            gameStateManager.updateGameState({
                playerData: playerData,
                playerNickname: nickname
            });
            console.log("玩家資料已載入:", user.uid);
            ui.updatePlayerInfo({ name: nickname, score: playerData.score, uid: user.uid });


            // 使用從 gameStateManager 獲取的數據來渲染 UI
            const currentGameState = gameStateManager.getGameState();
            if (ui.renderPlayerDNAInventory) ui.renderPlayerDNAInventory(currentGameState.playerData?.dnaInventory || []);
            if (ui.renderDNACombinationSlots) ui.renderDNACombinationSlots(currentGameState.dnaCombinationSlots || []);

            // 初始化 DNA 碎片區域 (如果需要從後端獲取初始碎片)
            // 假設 MAX_DNA_SLOTS 從 config.js 導入
            // 這裡需要確定 initialFragments 的來源
            const initialFragmentsForSlots = currentGameState.dnaCombinationSlots || new Array(config.MAX_DNA_SLOTS || 8).fill(null);
            if (ui.initializeDnaFragmentGrid && ui.renderDnaFragmentsInGrid) {
                 ui.initializeDnaFragmentGrid(config.MAX_DNA_SLOTS || 8); // 使用配置的插槽數量
                 ui.renderDnaFragmentsInGrid(initialFragmentsForSlots);
            }

            if (ui.renderMonsterFarm) ui.renderMonsterFarm(currentGameState.playerData?.monsters || []);
            if (ui.renderTemporaryBackpack) ui.renderTemporaryBackpack(currentGameState.temporaryBackpack || []);

            const defaultMonster = gameLogic.getDefaultSelectedMonster ? gameLogic.getDefaultSelectedMonster() : null;
            if (gameLogic.updateMonsterSnapshot) {
                gameLogic.updateMonsterSnapshot(defaultMonster || null);
            }

            if (DOMElements.authScreen) ui.toggleElementDisplay(DOMElements.authScreen, false);
            if (DOMElements.gameContainer) ui.toggleElementDisplay(DOMElements.gameContainer, true, 'flex');

            if (ui.updateAnnouncementPlayerName) ui.updateAnnouncementPlayerName(nickname);
            ui.hideModal('feedback-modal');

        } else {
            throw new Error("無法獲取玩家遊戲資料，後端未返回有效數據。");
        }
    } catch (error) {
        console.error("載入玩家資料並初始化 UI 失敗:", error);
        ui.hideModal('feedback-modal');
        ui.showFeedbackModal('資料載入失敗', `獲取玩家資料時發生錯誤：${error.message}。您可以嘗試重新登入。`, false, 5000, [
            { text: '重新登入', class: 'primary', onClick: async () => { await auth.logoutUser(firebaseAuth); } }, // 使用導入的 logoutUser
            { text: '關閉', class: 'secondary', onClick: () => ui.hideModal('feedback-modal') }
        ]);
    }
}


// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 清理緩存 (移到最前，以防後續初始化依賴乾淨狀態)
    clearGameCacheOnExitOrRefresh();

    // 2. 優先初始化本地 DOMElements 引用
    initializeLocalDOMElements(); // 這個函數現在定義在 main.js 內部

    console.log("DOM 已完全載入和解析。DOMElements 已初始化。");

    // 3. 初始化 Firebase App
    try {
        initializeFirebaseApp(); // 這個函數現在定義在 main.js 內部並使用導入的 Firebase 函數
    } catch (e) {
        console.error("無法啟動遊戲，Firebase 初始化失敗。");
        return; // 如果 Firebase 初始化失敗，則不繼續
    }

    // 4. 設置 Firebase Auth 狀態監聽器
    // RosterAuthListener 應該從 auth.js 導入為 auth.RosterAuthListener (如果它是那樣導出的)
    // 或者直接使用 onAuthStateChanged
    if (firebaseAuth) {
        onAuthStateChanged(firebaseAuth, onAuthStateChangedHandler);
    } else {
        console.error("Firebase Auth 實例未初始化。");
        ui.showFeedbackModal('嚴重錯誤', '遊戲認證服務載入失敗，請刷新頁面。');
        return;
    }

    // 5. 初始化事件監聽器
    // initializeEventListeners 應該從 event-handlers.js 導入
    if (eventHandlers.initializeEventListenersGlobal) { // 假設導出的函數名是 initializeEventListenersGlobal
        eventHandlers.initializeEventListenersGlobal();
    } else {
        console.error("initializeEventListenersGlobal 未定義。請確保 event-handlers.js 已正確加載和導出。");
    }

    // 6. 預設顯示第一個頁籤 (DNA管理)
    // switchTabContent 應該從 ui.js 導入
    if (DOMElements.dnaFarmTabs && DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]')) {
        if (ui.switchTabContent) {
            ui.switchTabContent('dna-inventory-content', DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]'));
        } else {
            console.warn("ui.switchTabContent 函數未定義。");
        }
    } else {
        console.warn("DNA Farm Tabs 或初始頁籤按鈕未找到。跳過預設頁籤切換。");
    }

    // 7. 嘗試初始化遊戲 (如果用戶可能已登入)
    // Auth 狀態監聽器會處理大部分情況，但如果頁面加載時用戶已登入，這裡可以加速首次加載
    // const initialUser = firebaseAuth.currentUser;
    // if (initialUser) {
    //     await onAuthStateChangedHandler(initialUser); // 觸發一次處理
    // } else {
    //     // 確保 Auth 畫面是可見的
    //     if (DOMElements.authScreen) ui.toggleElementDisplay(DOMElements.authScreen, true, 'flex');
    //     if (DOMElements.gameContainer) ui.toggleElementDisplay(DOMElements.gameContainer, false);
    // }
});

window.addEventListener('beforeunload', function (e) {
    clearGameCacheOnExitOrRefresh();
});

console.log("Main.js 腳本已載入。");
