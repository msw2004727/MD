// js/main.js

function clearGameCacheOnExitOrRefresh() {
    console.log("Clearing game cache (sessionStorage and specific localStorage items)...");
    sessionStorage.clear();
    console.log("SessionStorage cleared.");
    localStorage.removeItem('announcementShown_v1');
    console.log("localStorage item 'announcementShown_v1' removed.");
}

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
            if (typeof showFeedbackModal === 'function') {
                showFeedbackModal('嚴重錯誤', '無法初始化遊戲核心服務，請稍後再試或聯繫管理員。');
            }
        }
    } else {
        console.error("Firebase or firebaseConfig is not defined. Ensure firebase-config.js is loaded before main.js and Firebase SDKs are included.");
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-size: 1.2em;">遊戲載入失敗：缺少必要的 Firebase 設定。請檢查控制台以獲取更多資訊。</div>';
    }
}

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

        const [configs, playerData, assetPaths] = await Promise.all([
            getGameConfigs(),
            getPlayerData(gameState.currentUser.uid),
            fetch('./assets.json').then(res => res.json())
        ]);

        if (!configs || Object.keys(configs).length === 0) {
            throw new Error("無法獲取遊戲核心設定。");
        }
        if (!playerData) {
            throw new Error("無法獲取玩家遊戲資料。");
        }
        if (!assetPaths) {
            throw new Error("無法獲取遊戲圖片資源設定。");
        }
        
        updateGameState({
            gameConfigs: configs,
            playerData: playerData,
            assetPaths: assetPaths,
            playerNickname: playerData.nickname || gameState.currentUser.displayName || "玩家"
        });
        console.log("Game configs, player data, and asset paths loaded and saved to gameState.");

        if (DOMElements.maxCultivationTimeText && configs.value_settings) {
            DOMElements.maxCultivationTimeText.textContent = configs.value_settings.max_cultivation_time_seconds || 3600;
        }
        
        if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
        if (typeof renderDNACombinationSlots === 'function') renderDNACombinationSlots();
        if (typeof renderMonsterFarm === 'function') renderMonsterFarm();
        if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack();

        const defaultMonster = getDefaultSelectedMonster();
        setTimeout(() => {
            if (typeof updateMonsterSnapshot === 'function') {
                updateMonsterSnapshot(defaultMonster || null);
            }
        }, 100);

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

async function onAuthStateChangedHandler(user) {
    if (Object.keys(DOMElements).length === 0) {
        setTimeout(() => onAuthStateChangedHandler(user), 100);
        return;
    }

    if (user) {
        console.log("User is signed in:", user.uid);
        updateGameState({ currentUser: user, playerId: user.uid, playerNickname: user.displayName || (user.email ? user.email.split('@')[0] : "玩家") });
        
        await initializeGame();
        
        if (localStorage.getItem('announcementShown_v1') !== 'true') {
            if (typeof updateAnnouncementPlayerName === 'function') updateAnnouncementPlayerName(gameState.playerNickname);
            if (typeof showModal === 'function') showModal('official-announcement-modal');
        }

    } else {
        console.log("User is signed out or not yet signed in.");
        updateGameState({ currentUser: null, playerId: null, playerNickname: "玩家", playerData: null, gameConfigs: null });
        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, false);
        
        setTimeout(() => {
            if (typeof updateMonsterSnapshot === 'function') updateMonsterSnapshot(null);
            if (typeof resetDNACombinationSlots === 'function') resetDNACombinationSlots();
            if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
            if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack();
            if (typeof hideAllModals === 'function') hideAllModals();
        }, 100);
    }
}

function attemptToInitializeApp() {
    const requiredFunctions = [
        'initializeDOMElements', 'RosterAuthListener', 'initializeUIEventHandlers',
        'initializeGameInteractionEventHandlers', 'initializeDragDropEventHandlers',
        'initializeMonsterEventHandlers' // 新增的檢查
    ];
    
    const allFunctionsDefined = requiredFunctions.every(fnName => typeof window[fnName] === 'function');

    if (allFunctionsDefined) {
        console.log("所有核心函式已準備就緒，開始初始化應用程式。");
        initializeDOMElements(); 
        clearGameCacheOnExitOrRefresh();
        initializeFirebaseApp();
        RosterAuthListener(onAuthStateChangedHandler);

        // 初始化所有拆分後的事件監聽器
        initializeUIEventHandlers();
        initializeGameInteractionEventHandlers();
        initializeDragDropEventHandlers();
        initializeMonsterEventHandlers(); // 新增的呼叫

        // 全域計時器
        setInterval(updateAllTimers, 1000);

        if (DOMElements.dnaFarmTabs && DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]')) {
            if (typeof switchTabContent === 'function') {
                switchTabContent('dna-inventory-content', DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]'));
            }
        }
    } else {
        console.warn("一個或多個核心初始化函式尚未定義，將在 100ms 後重試...");
        setTimeout(attemptToInitializeApp, 100);
    }
}

document.addEventListener('DOMContentLoaded', attemptToInitializeApp);
window.addEventListener('beforeunload', clearGameCacheOnExitOrRefresh);

console.log("Main.js script loaded.");
