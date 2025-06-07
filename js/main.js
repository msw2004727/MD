// js/main.js

// --- Global Variables and Initial Setup ---
// gameState, DOMElements, api-client functions, auth functions, ui functions, game-logic functions, event-handler functions

/**
 * 清除遊戲緩存 (sessionStorage 和特定的 localStorage 項目)。
 * 會在頁面刷新或關閉視窗前調用。
 */
function clearGameCacheOnExitOrRefresh() {
    console.log("Clearing game cache (sessionStorage and specific localStorage items)...");
    sessionStorage.clear();
    console.log("SessionStorage cleared.");
    localStorage.removeItem('announcementShown_v1');
    console.log("localStorage item 'announcementShown_v1' removed.");
}

/**
 * 初始化 Firebase 應用。
 */
function initializeFirebaseApp() {
    if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                console.log("Firebase App initialized successfully.");
            } else {
                console.log("Firebase App already initialized.");
            }
        } catch (error) {
            console.error("Firebase initialization error:", error);
            if (typeof showFeedbackModal === 'function') { // 確保 showFeedbackModal 已定義
                showFeedbackModal('嚴重錯誤', '無法初始化遊戲核心服務，請稍後再試或聯繫管理員。');
            }
        }
    } else {
        console.error("Firebase or firebaseConfig is not defined. Ensure firebase-config.js is loaded before main.js and Firebase SDKs are included.");
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-size: 1.2em;">遊戲載入失敗：缺少必要的 Firebase 設定。請檢查控制台以獲取更多資訊。</div>';
    }
}


/**
 * 遊戲初始化函數 (已重構)
 * 當 DOMContentLoaded 和 Firebase Auth 狀態確認後調用
 */
async function initializeGame() {
    console.log("Initializing game...");
    if (typeof showFeedbackModal === 'function') {
        showFeedbackModal('遊戲載入中...', '正在準備您的怪獸異世界...', true);
    }

    try {
        if (typeof initializeTheme === 'function') initializeTheme();

        if (!gameState.currentUser) {
            console.log("No user logged in. Aborting game initialization.");
            // 確保 DOMElements.authScreen 和 DOMElements.gameContainer 存在才操作
            if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, true, 'flex');
            if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, false);
            if (typeof hideModal === 'function') hideModal('feedback-modal');
            return;
        }

        // 步驟 1: 平行獲取所有必要的遠端資料
        const [configs, playerData] = await Promise.all([
            getGameConfigs(),
            getPlayerData(gameState.currentUser.uid)
        ]);

        // 步驟 2: 驗證獲取的資料
        if (!configs || Object.keys(configs).length === 0) {
            throw new Error("無法獲取遊戲核心設定。");
        }
        if (!playerData) {
            throw new Error("無法獲取玩家遊戲資料。");
        }
        
        // 步驟 3: 一次性更新所有遊戲狀態
        updateGameState({
            gameConfigs: configs,
            playerData: playerData,
            playerNickname: playerData.nickname || gameState.currentUser.displayName || "玩家"
        });
        console.log("Game configs and player data loaded and saved to gameState.");

        // 步驟 4: 在確認所有狀態都準備好後，才開始渲染整個UI
        // 設定依賴遊戲設定的UI元素
        // 確保 maxCultivationTimeText 存在且 gameConfigs.value_settings 也存在
        if (DOMElements.maxCultivationTimeText && configs.value_settings) {
            DOMElements.maxCultivationTimeText.textContent = (configs.value_settings.max_cultivation_time_seconds / 60) || 60; // 假設單位是分鐘
        }
        const gameHints = [
            `💡 ${configs.naming_constraints?.max_monster_full_nickname_len || 15}字是怪獸暱稱的極限！`,
            "💡 稀有度越高的DNA，基礎能力越強！",
            "💡 嘗試不同的DNA組合，發掘隱藏的強力怪獸！",
            "💡 完成修煉有機會領悟新技能！",
            "💡 記得查看新手指南，了解更多遊戲訣竅！"
        ];
        if (configs.newbie_guide && configs.newbie_guide.length > 0) {
            gameHints.push(`💡 ${configs.newbie_guide[0].title} - ${configs.newbie_guide[0].content.substring(0, 20)}...`);
        }
        // updateScrollingHints 應該在 DOMElements 初始化後才被調用
        // if (typeof updateScrollingHints === 'function') updateScrollingHints(gameHints);
        
        // 渲染遊戲主畫面
        if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
        if (typeof renderDNACombinationSlots === 'function') renderDNACombinationSlots();
        if (typeof renderMonsterFarm === 'function') renderMonsterFarm();
        if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack();

        const defaultMonster = getDefaultSelectedMonster();
        if (typeof updateMonsterSnapshot === 'function') {
            updateMonsterSnapshot(defaultMonster || null);
        }
        
        // 切換主畫面顯示
        // 確保 DOMElements.authScreen 和 DOMElements.gameContainer 存在才操作
        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, false);
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, true, 'flex');

        if (typeof updateAnnouncementPlayerName === 'function') updateAnnouncementPlayerName(gameState.playerNickname);
        if (typeof hideModal === 'function') hideModal('feedback-modal');

        // 在所有 DOM 元素準備好後初始化事件監聽器
        if (typeof initializeEventListeners === 'function') {
            initializeEventListeners();
            console.log("Event listeners initialized after game UI rendering.");
        } else {
            console.error("CRITICAL: initializeEventListeners is not defined. Ensure event-handlers.js is loaded correctly.");
        }


    } catch (error) {
        console.error("Game initialization failed:", error);
        if (typeof hideModal === 'function') hideModal('feedback-modal');
        if (typeof showFeedbackModal === 'function') {
            const logoutButton = {
                text: '重新登入',
                class: 'primary',
                onClick: async () => { await logoutUser(); }
            };
            showFeedbackModal('遊戲載入失敗', `初始化過程中發生錯誤：${error.message}。請嘗試刷新頁面或重新登入。`, false, null, [logoutButton, { text: '關閉', class: 'secondary' }]);
        }
        // 確保 DOMElements.authScreen 和 DOMElements.gameContainer 存在才操作
        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, false);
    }
}


/**
 * 當 Firebase Auth 狀態改變時的回調函數
 */
async function onAuthStateChangedHandler(user) {
    // CRITICAL: 優先初始化 DOM 元素引用
    // 確保只初始化一次，並且在任何需要 DOMElements 的地方之前
    if (Object.keys(DOMElements).length === 0) {
        if (typeof initializeDOMElements === 'function') {
            initializeDOMElements(); 
            console.log("DOMElements initialized from onAuthStateChangedHandler.");
        } else {
            console.error("CRITICAL: initializeDOMElements function is not defined! UI will not work.");
            document.body.innerHTML = "遊戲介面關鍵組件初始化失敗，請刷新或聯繫管理員。";
            return; // 無法初始化 DOMElements，阻止後續邏輯
        }
    }

    if (user) {
        console.log("User is signed in:", user.uid);
        // 先只更新核心用戶資訊
        updateGameState({ currentUser: user, playerId: user.uid, playerNickname: user.displayName || (user.email ? user.email.split('@')[0] : "玩家") });
        
        // 呼叫重構後的遊戲初始化函數
        await initializeGame();
        
        // 檢查並顯示公告
        if (localStorage.getItem('announcementShown_v1') !== 'true') {
            if (typeof updateAnnouncementPlayerName === 'function') updateAnnouncementPlayerName(gameState.playerNickname);
            if (typeof showModal === 'function') showModal('official-announcement-modal');
        }

    } else {
        console.log("User is signed out or not yet signed in.");
        updateGameState({ currentUser: null, playerId: null, playerNickname: "玩家", playerData: null, gameConfigs: null });
        // 確保 DOMElements.authScreen 和 DOMElements.gameContainer 存在才操作
        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, false);
        
        // 清理UI
        if (typeof updateMonsterSnapshot === 'function') updateMonsterSnapshot(null);
        if (typeof resetDNACombinationSlots === 'function') resetDNACombinationSlots();
        if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
        if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack();
        if (typeof hideAllModals === 'function') hideAllModals();
    }
}

// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. 清理緩存 (此步驟不依賴 DOM 元素)
    clearGameCacheOnExitOrRefresh();
    console.log("DOM fully loaded and parsed.");

    // 2. 初始化 Firebase App (此步驟不依賴 DOM 元素)
    initializeFirebaseApp();

    // 3. 設置 Firebase Auth 狀態監聽器
    // onAuthStateChangedHandler 將會負責 DOMElements 的初始化
    if (typeof RosterAuthListener === 'function') {
        RosterAuthListener(onAuthStateChangedHandler);
    } else {
        console.error("RosterAuthListener is not defined. Ensure auth.js is loaded correctly.");
        if (typeof showFeedbackModal === 'function') {
            showFeedbackModal('嚴重錯誤', '遊戲認證服務載入失敗，請刷新頁面。');
        }
        return;
    }

    // 移除了 DOMElements.dnaFarmTabs 的判斷，因為它應在 DOMElements 初始化後再執行
    // 初始頁籤的顯示應在 initializeGame() 內部（在用戶登入並獲取數據後）或在一個安全的時機執行

});

window.addEventListener('beforeunload', function (e) {
    clearGameCacheOnExitOrRefresh();
});

console.log("Main.js script loaded.");
