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
 * 遊戲初始化函數
 * 當 DOMContentLoaded 和 Firebase Auth 狀態確認後調用
 */
async function initializeGame() {
    console.log("Initializing game...");
    if (typeof showFeedbackModal === 'function') {
        showFeedbackModal('遊戲載入中...', '正在準備您的怪獸異世界...', true);
    }

    try {
        if (typeof initializeTheme === 'function') initializeTheme(); 

        const configs = await getGameConfigs(); 
        if (configs && Object.keys(configs).length > 0) {
            updateGameState({ gameConfigs: configs }); 
            console.log("Game configs loaded and saved to gameState.");
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
                gameHints.push(`💡 ${configs.newbie_guide[0].title} - ${configs.newbie_guide[0].content.substring(0,20)}...`);
            }
            if (typeof updateScrollingHints === 'function') updateScrollingHints(gameHints);
        } else {
            throw new Error("無法獲取遊戲核心設定。");
        }

        if (!gameState.currentUser) {
            console.log("No user logged in. Staying on auth screen.");
            if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, true, 'flex');
            if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, false);
            if (typeof hideModal === 'function') hideModal('feedback-modal');
            return; 
        }

        await loadPlayerDataAndInitializeUI(gameState.currentUser);

    } catch (error) {
        console.error("Game initialization failed:", error);
        if (typeof hideModal === 'function') hideModal('feedback-modal');
        if (typeof showFeedbackModal === 'function') {
            showFeedbackModal('遊戲載入失敗', `初始化過程中發生錯誤：${error.message}。請嘗試刷新頁面。`);
        }
        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, false);
    }
}

/**
 * 當 Firebase Auth 狀態改變時的回調函數
 */
async function onAuthStateChangedHandler(user) {
    // 確保 DOMElements 已初始化
    if (Object.keys(DOMElements).length === 0) {
        console.warn("onAuthStateChangedHandler called before DOMElements initialized. Retrying in 100ms.");
        setTimeout(() => onAuthStateChangedHandler(user), 100); // 稍微延遲後重試
        return;
    }

    if (user) {
        console.log("User is signed in:", user.uid);
        updateGameState({ currentUser: user, playerId: user.uid, playerNickname: user.displayName || (user.email ? user.email.split('@')[0] : "玩家") });

        if (DOMElements.gameContainer && (DOMElements.gameContainer.style.display === 'none' || DOMElements.gameContainer.style.display === '')) {
            await initializeGame(); 
        } else {
            await loadPlayerDataAndInitializeUI(user); 
        }
        if (localStorage.getItem('announcementShown_v1') !== 'true' && gameState.currentUser) { 
            if (typeof updateAnnouncementPlayerName === 'function') updateAnnouncementPlayerName(gameState.playerNickname);
            if (typeof showModal === 'function') showModal('official-announcement-modal');
        }

    } else {
        console.log("User is signed out or not yet signed in.");
        updateGameState({ currentUser: null, playerId: null, playerNickname: "玩家" }); 
        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, false);
        
        if (typeof updateMonsterSnapshot === 'function') updateMonsterSnapshot(null); 
        if (typeof resetDNACombinationSlots === 'function') resetDNACombinationSlots();
        if (typeof renderDNACombinationSlots === 'function') renderDNACombinationSlots();
        if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
        if (typeof renderMonsterFarm === 'function') renderMonsterFarm();
        if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack(); 
        if (typeof hideAllModals === 'function') hideAllModals();
    }
}

/**
 * 載入玩家數據並初始化相關 UI。
 */
async function loadPlayerDataAndInitializeUI(user) {
    if (!user) return;

    if (typeof showFeedbackModal === 'function') {
        showFeedbackModal('載入中...', '正在獲取您的玩家資料...', true);
    }
    try {
        const playerData = await getPlayerData(user.uid); 
        if (playerData) {
            updateGameState({
                playerData: playerData,
                playerNickname: playerData.nickname || user.displayName || (user.email ? user.email.split('@')[0] : "玩家")
            });
            console.log("Player data loaded for:", user.uid);

            if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
            if (typeof renderDNACombinationSlots === 'function') renderDNACombinationSlots();
            if (typeof renderMonsterFarm === 'function') renderMonsterFarm();
            if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack(); 

            const defaultMonster = getDefaultSelectedMonster(); 
            if (typeof updateMonsterSnapshot === 'function') {
                updateMonsterSnapshot(defaultMonster || null);
            }

            if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, false);
            if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, true, 'flex'); 

            if (typeof updateAnnouncementPlayerName === 'function') updateAnnouncementPlayerName(gameState.playerNickname);
            if (typeof hideModal === 'function') hideModal('feedback-modal');

        } else {
            throw new Error("無法獲取玩家遊戲資料，後端未返回有效數據。");
        }
    } catch (error) {
        console.error("Failed to load player data and initialize UI:", error);
        if (typeof hideModal === 'function') hideModal('feedback-modal');
        if (typeof showFeedbackModal === 'function') {
            showFeedbackModal('資料載入失敗', `獲取玩家資料時發生錯誤：${error.message}。您可以嘗試重新登入。`, false, null, [
                { text: '重新登入', class: 'primary', onClick: async () => { await logoutUser(); } },
                { text: '關閉', class: 'secondary' }
            ]);
        }
    }
}


// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. 優先初始化 DOM 元素引用
    if (typeof initializeDOMElements === 'function') {
        initializeDOMElements(); 
    } else {
        console.error("CRITICAL: initializeDOMElements function is not defined! UI will not work.");
        document.body.innerHTML = "遊戲介面關鍵組件初始化失敗，請刷新或聯繫管理員。";
        return; 
    }
    
    // 2. 清理緩存
    clearGameCacheOnExitOrRefresh();
    console.log("DOM fully loaded and parsed. DOMElements initialized.");

    // 3. 初始化 Firebase App
    initializeFirebaseApp();

    // 4. 設置 Firebase Auth 狀態監聽器
    if (typeof RosterAuthListener === 'function') {
        RosterAuthListener(onAuthStateChangedHandler);
    } else {
        console.error("RosterAuthListener is not defined. Ensure auth.js is loaded correctly.");
        if (typeof showFeedbackModal === 'function') {
            showFeedbackModal('嚴重錯誤', '遊戲認證服務載入失敗，請刷新頁面。');
        }
        return;
    }

    // 5. 初始化事件監聽器
    if (typeof initializeEventListeners === 'function') {
        initializeEventListeners();
    } else {
        console.error("initializeEventListeners is not defined. Ensure event-handlers.js is loaded correctly.");
    }

    // 6. 預設顯示第一個頁籤 (DNA管理)
    if (DOMElements.dnaFarmTabs && DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]')) {
        if (typeof switchTabContent === 'function') {
            switchTabContent('dna-inventory-content', DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]'));
        }
    } else {
        console.warn("DNA Farm Tabs or initial tab button not found. Skipping default tab switch. DOMElements.dnaFarmTabs:", DOMElements.dnaFarmTabs);
    }
});

window.addEventListener('beforeunload', function (e) {
    clearGameCacheOnExitOrRefresh();
});

console.log("Main.js script loaded.");
