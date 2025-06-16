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

async function loadAndDisplayAnnouncement() {
    try {
        // 從根目錄讀取新的公告檔案
        const response = await fetch('./announcement.json');
        if (!response.ok) {
            throw new Error('無法讀取公告檔案，網路回應錯誤。');
        }
        const announcementData = await response.json();

        // 選取要填入內容的 DOM 元素
        const titleElement = document.querySelector('#official-announcement-modal .modal-header');
        const contentContainer = document.getElementById('announcement-content');

        if (titleElement && contentContainer) {
            // 更新標題
            titleElement.textContent = announcementData.title || "📢 遊戲官方公告";

            // 組合公告內容的 HTML
            let contentHtml = `<p>${announcementData.greeting || '親愛的'}<span id="announcement-player-name" class="font-bold text-[var(--accent-color)]">玩家</span>您好，</p>`;
            
            (announcementData.paragraphs || []).forEach(paragraph => {
                contentHtml += `<p>${paragraph}</p>`;
            });

            contentHtml += `<p style="text-align: right; margin-top: 20px; color: var(--rarity-legendary-text); font-weight: bold;">${announcementData.closing || '遊戲團隊 敬上'}</p>`;

            // 將組合好的 HTML 填入內容容器中
            contentContainer.innerHTML = contentHtml;

            // --- 核心修改處 START ---
            // 在HTML內容被插入後，立即更新玩家暱稱
            if (typeof updateAnnouncementPlayerName === 'function') {
                updateAnnouncementPlayerName(gameState.playerNickname);
            }
            // --- 核心修改處 END ---
        }

    } catch (error) {
        console.error('讀取或顯示公告時發生錯誤:', error);
        // 如果載入失敗，公告彈窗將維持空白，不會影響遊戲主體功能。
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

        const [configs, playerData, assetPaths, uiTextContent] = await Promise.all([
            getGameConfigs(),
            getPlayerData(gameState.currentUser.uid),
            fetch('./assets.json').then(res => res.json()),
            fetch('./ui_text.json').then(res => res.json())
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
        if (!uiTextContent) {
            throw new Error("無法獲取介面文字內容設定。");
        }
        
        updateGameState({
            gameConfigs: configs,
            playerData: playerData,
            assetPaths: assetPaths,
            uiTextContent: uiTextContent,
            playerNickname: playerData.nickname || gameState.currentUser.displayName || "玩家"
        });
        console.log("Game configs, player data, and asset paths loaded and saved to gameState.");

        if (typeof populateImageAssetSources === 'function') {
            populateImageAssetSources();
        }

        if (DOMElements.maxCultivationTimeText && configs.value_settings) {
            DOMElements.maxCultivationTimeText.textContent = configs.value_settings.max_cultivation_time_seconds || 3600;
        }
        
        if (typeof renderPlayerDNAInventory === 'function') renderPlayerDNAInventory();
        if (typeof renderDNACombinationSlots === 'function') renderDNACombinationSlots();
        if (typeof renderMonsterFarm === 'function') renderMonsterFarm();
        if (typeof renderTemporaryBackpack === 'function') renderTemporaryBackpack();
        
        // 新增：呼叫讀取並顯示公告的函式
        loadAndDisplayAnnouncement();

        const defaultMonster = getDefaultSelectedMonster();
        setTimeout(() => {
            if (typeof updateMonsterSnapshot === 'function') {
                updateMonsterSnapshot(defaultMonster || null);
            }
        }, 100);

        if (DOMElements.authScreen) toggleElementDisplay(DOMElements.authScreen, false);
        if (DOMElements.gameContainer) toggleElementDisplay(DOMElements.gameContainer, true, 'flex');
        
        // --- 核心修改處：移除此處的呼叫 ---
        // if (typeof updateAnnouncementPlayerName === 'function') updateAnnouncementPlayerName(gameState.playerNickname);

        if (typeof hideModal === 'function') hideModal('feedback-modal');

        if (playerData.newly_awarded_titles && playerData.newly_awarded_titles.length > 0) {
            const newTitle = playerData.newly_awarded_titles[0]; 
            if (typeof showFeedbackModal === 'function') {
                showFeedbackModal(
                    '榮譽加身！',
                    '', 
                    false,
                    null,
                    [{ text: '開啟我的冒險！', class: 'success' }],
                    {
                        type: 'title',
                        name: newTitle.name,
                        description: newTitle.description,
                        buffs: newTitle.buffs,
                        bannerUrl: gameState.assetPaths.images.modals.titleAward
                    }
                );
            }
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
            // --- 核心修改處：移除此處的呼叫 ---
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

// --- 【修改】 ---
// 修改了 attemptToInitializeApp 函式，使其能印出具體的錯誤資訊
function attemptToInitializeApp() {
    const requiredFunctions = [
        'initializeDOMElements', 'RosterAuthListener', 'initializeUIEventHandlers',
        'initializeGameInteractionEventHandlers', 'initializeDragDropEventHandlers',
        'initializeMonsterEventHandlers'
    ];
    
    // 找出所有未定義的函式
    const undefinedFunctions = requiredFunctions.filter(fnName => typeof window[fnName] !== 'function');

    if (undefinedFunctions.length === 0) {
        // 如果所有函式都已定義，則正常執行遊戲初始化
        console.log("所有核心函式已準備就緒，開始初始化應用程式。");
        initializeDOMElements(); 
        clearGameCacheOnExitOrRefresh();
        initializeFirebaseApp();
        RosterAuthListener(onAuthStateChangedHandler);

        initializeUIEventHandlers();
        initializeGameInteractionEventHandlers();
        initializeDragDropEventHandlers();
        initializeMonsterEventHandlers();

        setInterval(updateAllTimers, 1000);

        if (DOMElements.dnaFarmTabs && DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]')) {
            if (typeof switchTabContent === 'function') {
                switchTabContent('dna-inventory-content', DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]'));
            }
        }
    } else {
        // 如果有函式未定義，則在主控台印出確切是哪個函式不見了，然後重試
        console.warn(`一個或多個核心初始化函式尚未定義: [${undefinedFunctions.join(', ')}]，將在 100ms 後重試...`);
        setTimeout(attemptToInitializeApp, 100);
    }
}


document.addEventListener('DOMContentLoaded', attemptToInitializeApp);
window.addEventListener('beforeunload', clearGameCacheOnExitOrRefresh);

console.log("Main.js script loaded.");
