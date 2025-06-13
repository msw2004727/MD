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
        if (DOMElements.maxCultivationTimeText && configs.value_settings) {
            DOMElements.maxCultivationTimeText.textContent = configs.value_settings.max_cultivation_time_seconds || 3600;
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
        if (typeof updateScrollingHints === 'function') updateScrollingHints(gameHints);
        
        // 渲染遊戲主畫面
        if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
        if (typeof renderDNACombinationSlots === 'function') renderDNACombinationSlots();
        if (typeof renderMonsterFarm === 'function') renderMonsterFarm();
        if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack();

        const defaultMonster = getDefaultSelectedMonster();
        // 延遲更新怪獸快照，確保 DOMElements 完全可用
        setTimeout(() => {
            if (typeof updateMonsterSnapshot === 'function') {
                updateMonsterSnapshot(defaultMonster || null);
            }
        }, 100); // 延遲 100 毫秒


        // 切換主畫面顯示
        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, false);
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, true, 'flex');

        if (typeof updateAnnouncementPlayerName === 'function') updateAnnouncementPlayerName(gameState.playerNickname);
        if (typeof hideModal === 'function') hideModal('feedback-modal');

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
        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, false);
    }
}


/**
 * 當 Firebase Auth 狀態改變時的回調函數
 */
async function onAuthStateChangedHandler(user) {
    if (Object.keys(DOMElements).length === 0) {
        console.warn("onAuthStateChangedHandler called before DOMElements initialized. Retrying in 100ms.");
        setTimeout(() => onAuthStateChangedHandler(user), 100);
        return;
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
        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, false);
        
        // 清理UI
        // 延遲更新怪獸快照，確保 DOMElements 完全可用
        setTimeout(() => {
            if (typeof updateMonsterSnapshot === 'function') updateMonsterSnapshot(null);
            if (typeof resetDNACombinationSlots === 'function') resetDNACombinationSlots();
            if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
            if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack();
            if (typeof hideAllModals === 'function') hideAllModals();
        }, 100);
    }
}

// --- Application Entry Point ---

/**
 * 嘗試執行遊戲初始化。
 * 會檢查所有必要的函式是否已定義，如果尚未定義，會延遲後重試。
 */
function attemptToInitializeApp() {
    // 檢查核心函式是否已載入
    if (typeof initializeDOMElements === 'function' && 
        typeof initializeEventListeners === 'function' &&
        typeof RosterAuthListener === 'function') {
        
        console.log("所有核心函式已準備就緒，開始初始化應用程式。");

        // 1. 優先初始化 DOM 元素引用
        initializeDOMElements(); 
        
        // 2. 清理緩存
        clearGameCacheOnExitOrRefresh();
        console.log("DOM fully loaded and parsed. DOMElements initialized.");

        // 3. 初始化 Firebase App
        initializeFirebaseApp();

        // 4. 設置 Firebase Auth 狀態監聽器
        RosterAuthListener(onAuthStateChangedHandler);

        // 5. 初始化事件監聽器
        initializeEventListeners();

        // 6. 預設顯示第一個頁籤 (DNA管理)
        if (DOMElements.dnaFarmTabs && DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]')) {
            if (typeof switchTabContent === 'function') {
                switchTabContent('dna-inventory-content', DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]'));
            }
        } else {
            console.warn("DNA Farm Tabs or initial tab button not found. Skipping default tab switch.");
        }

    } else {
        // 如果函式尚未定義，則稍後重試
        console.warn("一個或多個核心初始化函式尚未定義，將在 100ms 後重試...");
        setTimeout(attemptToInitializeApp, 100);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // 啟動初始化程序
    attemptToInitializeApp();
});


window.addEventListener('beforeunload', function (e) {
    clearGameCacheOnExitOrRefresh();
});

console.log("Main.js script loaded.");
