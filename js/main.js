// js/main.js

// --- Global Variables and Initial Setup ---
// gameState, DOMElements, api-client functions, auth functions, ui functions, game-logic functions, event-handler functions
// 這些通常會通過 <script> 標籤的順序在全局作用域中可用。
// 如果使用模塊系統 (ES6 Modules)，則需要 import。
// 為了簡化，這裡假設它們已在全局作用域。

/**
 * 清除遊戲緩存 (sessionStorage 和特定的 localStorage 項目)。
 * 會在頁面刷新或關閉視窗前調用。
 */
function clearGameCacheOnExitOrRefresh() {
    console.log("Clearing game cache (sessionStorage and specific localStorage items)...");

    // 清除 sessionStorage 中的所有內容
    // sessionStorage 中的資料在瀏覽器分頁關閉時會自動清除，
    // 但在頁面刷新時會保留，所以我們在這裡也清除它以確保刷新時是乾淨的狀態。
    sessionStorage.clear();
    console.log("SessionStorage cleared.");

    // 清除 localStorage 中的特定項目
    // 根據需求，我們清除公告顯示狀態，但保留主題偏好設定。
    localStorage.removeItem('announcementShown_v1');
    console.log("localStorage item 'announcementShown_v1' removed.");

    // 注意：gameState 物件本身是 JavaScript 記憶體中的狀態，
    // 頁面刷新或關閉時它自然會消失，無需在此處手動重置其內部屬性，
    // 除非這些屬性被持久化到了 localStorage 且需要在 gameState 初始化前被清除。
    // 目前的設計中，dnaCombinationSlots 和 temporaryBackpack 是 gameState 的一部分，
    // 它們會隨頁面環境的銷毀而重置。
}

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
            // 如果 getGameConfigs 內部拋出錯誤，這裡可能不會執行，錯誤會在 catch 塊中處理
            // 但如果 getGameConfigs 返回了 null 或空對象，則執行這裡
            throw new Error("無法獲取遊戲核心設定。");
        }

        // 3. 處理玩家數據 (這部分會在 onAuthStateChanged 回調中處理)
        // 如果沒有用戶登入，則停留在登入畫面
        if (!gameState.currentUser) {
            console.log("No user logged in. Staying on auth screen.");
            toggleElementDisplay(DOMElements.authScreen, true, 'flex');
            toggleElementDisplay(DOMElements.gameContainer, false);
            hideModal('feedback-modal'); // 隱藏 "遊戲載入中"
            // 檢查是否需要顯示官方公告 (即使未登入)
            // if (localStorage.getItem('announcementShown_v1') !== 'true') {
            //     showModal('official-announcement-modal');
            // }
            return; // 等待用戶登入
        }

        // 如果已有用戶 (通常是 onAuthStateChanged 觸發後)
        await loadPlayerDataAndInitializeUI(gameState.currentUser);

        // 如果 loadPlayerDataAndInitializeUI 成功，它內部會 hide feedback modal
        // 如果它失敗，它內部會顯示錯誤 modal
        // 所以這裡不需要再 hideModal('feedback-modal')，除非 loadPlayerDataAndInitializeUI 沒有處理
        // 為了確保，如果前面的步驟都成功，且 loadPlayerDataAndInitializeUI 也成功執行完畢，
        // 我們可以再次確認 feedback-modal 是隱藏的。
        // 但通常情況下，最後一個異步操作完成後處理 modal 狀態更佳。
        // 此處的 hideModal 移至 loadPlayerDataAndInitializeUI 成功時執行。

    } catch (error) {
        console.error("Game initialization failed:", error);
        hideModal('feedback-modal'); // <--- 確保在拋出錯誤時隱藏載入提示
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
        if (DOMElements.gameContainer.style.display === 'none' || DOMElements.gameContainer.style.display === '') {
            await initializeGame(); // initializeGame 會處理載入提示和錯誤
        } else {
            // 如果遊戲容器已顯示 (例如，玩家剛完成註冊/登入操作)，直接載入玩家數據
            await loadPlayerDataAndInitializeUI(user); // loadPlayerDataAndInitializeUI 會處理載入提示和錯誤
        }
         // 顯示官方公告 (如果尚未顯示過)
        if (localStorage.getItem('announcementShown_v1') !== 'true' && gameState.currentUser) { // 確保用戶已登入才顯示公告
            updateAnnouncementPlayerName(gameState.playerNickname);
            showModal('official-announcement-modal');
        }

    } else {
        // 用戶已登出或未登入
        console.log("User is signed out or not yet signed in.");
        updateGameState({ currentUser: null, playerId: null, playerNickname: "玩家" }); // 重置暱稱
        toggleElementDisplay(DOMElements.authScreen, true, 'flex');
        toggleElementDisplay(DOMElements.gameContainer, false);
        updateMonsterSnapshot(null); // 清空快照
        // 清理可能存在的遊戲狀態
        resetDNACombinationSlots();
        renderDNACombinationSlots();
        renderPlayerDNAInventory();
        renderMonsterFarm();
        renderTemporaryBackpack(); // 清空臨時背包
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
                playerNickname: playerData.nickname || user.displayName || (user.email ? user.email.split('@')[0] : "玩家")
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
            hideModal('feedback-modal'); // <--- 成功載入後隱藏 "載入中"

        } else {
            // 如果 getPlayerData 返回 null 或 undefined 但未拋出錯誤
            throw new Error("無法獲取玩家遊戲資料，後端未返回有效數據。");
        }
    } catch (error) {
        console.error("Failed to load player data and initialize UI:", error);
        hideModal('feedback-modal'); // <--- 確保在拋出錯誤時隱藏載入提示
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
    // **新增**: 在 DOM 載入完成後，立即執行一次緩存清除，以處理「刷新瀏覽器」的情況。
    clearGameCacheOnExitOrRefresh();

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
    if (DOMElements.dnaFarmTabs && DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]')) {
        switchTabContent('dna-inventory-content', DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]'));
    } else {
        console.warn("DNA Farm Tabs or initial tab button not found. Skipping default tab switch.");
    }
});

// **新增**: 添加 beforeunload 事件監聽器，處理「關閉視窗」的情況。
window.addEventListener('beforeunload', function (e) {
    // 調用我們定義的緩存清除函式
    clearGameCacheOnExitOrRefresh();

    // 如果需要在用戶關閉前顯示提示，可以取消註解以下兩行。
    // 但請注意，現代瀏覽器對此行為有所限制，且無法自訂提示文字。
    // e.preventDefault(); // For some browsers to show the confirmation dialog
    // e.returnValue = ''; // For some browsers to show the confirmation dialog
});


console.log("Main.js script loaded.");
