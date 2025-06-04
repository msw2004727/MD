// js/main.js

// --- Global Variables and Initial Setup ---
// gameState, DOMElements, api-client functions, auth functions, ui functions, game-logic functions, event-handler functions
// 這些通常會通過 <script> 標籤的順序在全局作用域中可用。
// 如果使用模塊系統 (ES6 Modules)，則需要 import。
// 為了簡化，這裡假設它們已在全局作用域。

/**
 * 初始化 Firebase 應用。
 */
function initializeFirebaseApp() {
    // firebaseConfig 來自 firebase-config.js
    // 確認 firebase 和 firebaseConfig 是否已定義
    if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
        try {
            if (!firebase.apps.length) { // 避免重複初始化
                firebase.initializeApp(firebaseConfig);
                console.log("Firebase App initialized successfully.");
            } else {
                console.log("Firebase App already initialized.");
            }
        } catch (error) {
            console.error("Firebase initialization error:", error);
            showFeedbackModal('嚴重錯誤', '無法初始化遊戲核心服務，請稍後再試或聯繫管理員。');
        }
    } else {
        console.error("Firebase or firebaseConfig is not defined. Ensure firebase-config.js is loaded before main.js and Firebase SDKs are included.");
        // 顯示一個更用戶友好的錯誤
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; color: red; font-size: 1.2em;">遊戲載入失敗：缺少必要的 Firebase 設定。請檢查控制台以獲取更多資訊。</div>';
    }
}


/**
 * 遊戲初始化函數
 * 當 DOMContentLoaded 和 Firebase Auth 狀態確認後調用
 */
async function initializeGame() {
    console.log("Initializing game...");
    showFeedbackModal('遊戲載入中...', '正在準備您的怪獸異世界...', true);

    try {
        // 1. 初始化主題
        initializeTheme(); // ui.js

        // 2. 獲取遊戲核心設定
        const configs = await getGameConfigs(); // api-client.js
        if (configs && Object.keys(configs).length > 0) {
            updateGameState({ gameConfigs: configs }); // game-state.js
            console.log("Game configs loaded and saved to gameState.");
            // 使用遊戲設定更新UI（例如，最大修煉時間等）
            if (DOMElements.maxCultivationTimeText && configs.value_settings) {
                DOMElements.maxCultivationTimeText.textContent = configs.value_settings.max_cultivation_time_seconds || 3600;
            }
            // 更新滾動提示
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
            updateScrollingHints(gameHints);

        } else {
            throw new Error("無法獲取遊戲核心設定。");
        }

        // 3. 處理玩家數據 (這部分會在 onAuthStateChanged 回調中處理)
        // 如果沒有用戶登入，則停留在登入畫面
        if (!gameState.currentUser) {
            console.log("No user logged in. Staying on auth screen.");
            toggleElementDisplay(DOMElements.authScreen, true, 'flex');
            toggleElementDisplay(DOMElements.gameContainer, false);
            hideModal('feedback-modal');
            // 檢查是否需要顯示官方公告 (即使未登入)
            // if (localStorage.getItem('announcementShown_v1') !== 'true') {
            //     showModal('official-announcement-modal');
            // }
            return; // 等待用戶登入
        }

        // 如果已有用戶 (通常是 onAuthStateChanged 觸發後)
        await loadPlayerDataAndInitializeUI(gameState.currentUser);

        hideModal('feedback-modal');
    } catch (error) {
        console.error("Game initialization failed:", error);
        showFeedbackModal('遊戲載入失敗', `初始化過程中發生錯誤：${error.message}。請嘗試刷新頁面。`);
        // 保持 Auth Screen 顯示或顯示一個全局錯誤頁面
        toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        toggleElementDisplay(DOMElements.gameContainer, false);
    }
}

/**
 * 當 Firebase Auth 狀態改變時的回調函數
 * @param {firebase.User | null} user Firebase User 對象，或 null (如果未登入)
 */
async function onAuthStateChangedHandler(user) {
    if (user) {
        // 用戶已登入
        console.log("User is signed in:", user.uid);
        updateGameState({ currentUser: user, playerId: user.uid, playerNickname: user.displayName || user.email.split('@')[0] || "玩家" });
        
        // 如果遊戲容器尚未顯示，表示這是初次登入或刷新後的自動登入
        if (DOMElements.gameContainer.style.display === 'none') {
            await initializeGame(); // 確保遊戲設定已載入，然後載入玩家數據
        } else {
            // 如果遊戲容器已顯示 (例如，玩家剛完成註冊/登入操作)，直接載入玩家數據
            await loadPlayerDataAndInitializeUI(user);
        }
         // 顯示官方公告 (如果尚未顯示過)
        if (localStorage.getItem('announcementShown_v1') !== 'true') {
            updateAnnouncementPlayerName(gameState.playerNickname);
            showModal('official-announcement-modal');
        }

    } else {
        // 用戶已登出或未登入
        console.log("User is signed out or not yet signed in.");
        updateGameState({ currentUser: null, playerId: null });
        toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        toggleElementDisplay(DOMElements.gameContainer, false);
        updateMonsterSnapshot(null); // 清空快照
        // 清理可能存在的遊戲狀態
        resetDNACombinationSlots();
        renderDNACombinationSlots();
        renderPlayerDNAInventory();
        renderMonsterFarm();
        // 確保在登出時隱藏所有 modals
        hideAllModals();
    }
}

/**
 * 載入玩家數據並初始化相關 UI。
 * @param {firebase.User} user Firebase User 對象。
 */
async function loadPlayerDataAndInitializeUI(user) {
    if (!user) return;
    
    showFeedbackModal('載入中...', '正在獲取您的玩家資料...', true);
    try {
        const playerData = await getPlayerData(user.uid); // api-client.js
        if (playerData) {
            updateGameState({ 
                playerData: playerData, 
                playerNickname: playerData.nickname || user.displayName || user.email.split('@')[0] || "玩家" 
            });
            console.log("Player data loaded for:", user.uid, playerData);

            // 初始化 UI 組件
            renderPlayerDNAInventory();
            renderDNACombinationSlots();
            renderMonsterFarm();
            renderTemporaryBackpack(); // 初始化臨時背包

            // 選擇預設怪獸顯示在快照
            const defaultMonster = getDefaultSelectedMonster(); // game-state.js
            if (defaultMonster) {
                updateMonsterSnapshot(defaultMonster); // ui.js
            } else {
                updateMonsterSnapshot(null); // 如果沒有怪獸，顯示空狀態
            }

            // 顯示遊戲主容器，隱藏認證畫面
            toggleElementDisplay(DOMElements.authScreen, false);
            toggleElementDisplay(DOMElements.gameContainer, true, 'flex'); // main-container 使用 flex
            
            // 更新公告中的玩家名稱
            updateAnnouncementPlayerName(gameState.playerNickname);

        } else {
            throw new Error("無法獲取玩家遊戲資料。");
        }
        hideModal('feedback-modal');
    } catch (error) {
        console.error("Failed to load player data and initialize UI:", error);
        showFeedbackModal('資料載入失敗', `獲取玩家資料時發生錯誤：${error.message}。您可以嘗試重新登入。`, false, null, [
            { text: '重新登入', class: 'primary', onClick: async () => { await logoutUser(); /* onAuthStateChanged 會處理後續 */ } },
            { text: '關閉', class: 'secondary' }
        ]);
        // 如果載入玩家數據失敗，可能需要將用戶登出或顯示錯誤頁面
        // toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        // toggleElementDisplay(DOMElements.gameContainer, false);
    }
}


// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    // 1. 初始化 Firebase App
    initializeFirebaseApp();

    // 2. 設置 Firebase Auth 狀態監聽器
    // RosterAuthListener 來自 auth.js
    if (typeof RosterAuthListener === 'function') {
        RosterAuthListener(onAuthStateChangedHandler);
    } else {
        console.error("RosterAuthListener is not defined. Ensure auth.js is loaded correctly.");
        showFeedbackModal('嚴重錯誤', '遊戲認證服務載入失敗，請刷新頁面。');
        return;
    }
    
    // 3. 初始化事件監聽器 (來自 event-handlers.js)
    if (typeof initializeEventListeners === 'function') {
        initializeEventListeners();
    } else {
        console.error("initializeEventListeners is not defined. Ensure event-handlers.js is loaded correctly.");
    }

    // 4. 初始遊戲化 (部分邏輯移到 onAuthStateChangedHandler 中，確保在用戶登入後執行)
    // initializeGame(); // initializeGame 會在 onAuthStateChangedHandler 中被適時調用

    // 預設顯示第一個頁籤 (DNA管理)
    switchTabContent('dna-inventory-content', DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]'));
});

console.log("Main.js script loaded.");
