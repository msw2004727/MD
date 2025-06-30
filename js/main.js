// js/main.js

// --- 核心修改處 START ---
// 移除舊的檢查機制，改用現代的 import 語法直接導入所有需要的模組和函式
import { initializeDOMElements, showFeedbackModal, hideModal, hideAllModals, updateTheme, switchTabContent, updatePlayerCurrencyDisplay, updateAnnouncementPlayerName, populateImageAssetSources } from './ui/ui.js';
import { initializeUIEventHandlers } from './handlers/ui-handlers.js';
import { initializeGameInteractionEventHandlers } from './handlers/game-interaction-handlers.js';
import { initializeDragDropEventHandlers } from './handlers/drag-drop-handlers.js';
import { initializeMonsterEventHandlers } from './handlers/monster-handlers.js';
import { initializeNoteHandlers } from './ui/ui-notes.js';
import { initializeChatSystem } from './ui/ui-chat.js';
import { initializeMailboxEventHandlers } from './ui/ui-mailbox.js';
import { initializeAdventureHandlers } from './handlers/adventure-handlers.js';
import { initializeTrainingHandlers } from './ui/ui-training.js';
import { RosterAuthListener, logoutUser } from './auth.js';
import { getGameConfigs, getPlayerData } from './api-client.js';
import { gameState, updateGameState, getDefaultSelectedMonster } from './game-state.js';
import { updateMonsterSnapshot } from './ui/ui-snapshot.js';
import { updateAllTimers, renderMonsterFarm } from './ui/ui-farm.js';
import { renderPlayerDNAInventory, renderDNACombinationSlots, renderTemporaryBackpack, resetDNACombinationSlots } from './ui/ui-inventory.js';
// --- 核心修改處 START ---
// 移除本行最後多餘的逗號
import { updateMailNotificationDot, checkAndShowNewTitleModal } from './game-logic.js';
// --- 核心修改處 END ---

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
        const response = await fetch('./announcement.json');
        if (!response.ok) {
            throw new Error('無法讀取公告檔案，網路回應錯誤。');
        }
        const announcementData = await response.json();

        const titleElement = document.querySelector('#official-announcement-modal .modal-header');
        const contentContainer = document.getElementById('announcement-content');
        const adBannerContainer = document.getElementById('announcement-ad-banner');

        if (titleElement && contentContainer && adBannerContainer) {
            titleElement.textContent = announcementData.title || "📢 遊戲官方公告";
            
            const bannerUrl = gameState.assetPaths?.images?.modals?.officialAnnouncement;
            if (bannerUrl) {
                adBannerContainer.innerHTML = `<img src="${bannerUrl}" alt="官方公告橫幅" style="max-width: 100%; max-height: 100%; border-radius: 4px;">`;
            } else {
                adBannerContainer.style.display = 'none';
            }
            
            let contentHtml = `<p>${announcementData.greeting || '親愛的'}<span id="announcement-player-name" class="font-bold text-[var(--accent-color)]">玩家</span>您好，</p>`;

            (announcementData.contentBlocks || []).forEach(block => {
                switch (block.type) {
                    case 'paragraph':
                        contentHtml += `<p>${block.text}</p>`;
                        break;
                    case 'image':
                        contentHtml += `<div class="announcement-image-container"><img src="${block.src}" alt="${block.alt || '公告圖片'}"></div>`;
                        break;
                    case 'columns':
                        contentHtml += `<div class="announcement-columns-container">`;
                        (block.columns || []).forEach(column => {
                            contentHtml += `<div class="announcement-column">`;
                            contentHtml += `<h5>${column.title}</h5>`;
                            contentHtml += `<ul>`;
                            (column.items || []).forEach(item => {
                                if (typeof item === 'string') {
                                    contentHtml += `<li>${item}</li>`;
                                } else if (typeof item === 'object' && item.text) {
                                    const colorClass = `text-color-${item.color || 'default'}`;
                                    contentHtml += `<li><span class="${colorClass}">${item.text}</span></li>`;
                                }
                            });
                            contentHtml += `</ul>`;
                            contentHtml += `</div>`;
                        });
                        contentHtml += `</div>`;
                        break;
                }
            });

            contentHtml += `<p style="text-align: right; margin-top: 20px; color: var(--rarity-legendary-text); font-weight: bold;">${announcementData.closing || '遊戲團隊 敬上'}</p>`;
            
            contentContainer.innerHTML = contentHtml;

            if (typeof updateAnnouncementPlayerName === 'function') {
                updateAnnouncementPlayerName(gameState.playerNickname);
            }
        }
    } catch (error) {
        console.error('讀取或顯示公告時發生錯誤:', error);
    }
}


async function initializeGame() {
    console.log("Initializing game...");
    showFeedbackModal('遊戲載入中...', '正在準備您的怪獸異世界...', true);

    try {
        if (typeof initializeTheme === 'function') updateTheme(localStorage.getItem('theme') || 'dark');

        if (!gameState.currentUser) {
            console.log("No user logged in. Aborting game initialization.");
            DOMElements.authScreen.style.display = 'flex';
            DOMElements.gameContainer.style.display = 'none';
            hideModal('feedback-modal');
            return;
        }

        const [configs, playerData, assetPaths, uiTextContent, chatGreetings] = await Promise.all([
            getGameConfigs(),
            getPlayerData(gameState.currentUser.uid),
            fetch('./assets.json').then(res => res.json()),
            fetch('./ui_text.json').then(res => res.json()),
            fetch('./chat_greetings.json').then(res => res.json())
        ]);

        if (!configs || Object.keys(configs).length === 0) throw new Error("無法獲取遊戲核心設定。");
        if (!playerData) throw new Error("無法獲取玩家遊戲資料。");
        if (!assetPaths) throw new Error("無法獲取遊戲圖片資源設定。");
        if (!uiTextContent) throw new Error("無法獲取介面文字內容設定。");
        if (!chatGreetings) throw new Error("無法獲取怪獸問候語資料庫。");
        
        updateGameState({
            gameConfigs: configs,
            playerData: playerData,
            assetPaths: assetPaths,
            uiTextContent: uiTextContent,
            chatGreetings: chatGreetings,
            playerNickname: playerData.nickname || gameState.currentUser.displayName || "玩家"
        });
        
        updateMailNotificationDot();
        populateImageAssetSources();

        if (DOMElements.maxCultivationTimeText && configs.value_settings) {
            DOMElements.maxCultivationTimeText.textContent = configs.value_settings.max_cultivation_time_seconds || 3600;
        }
        
        updatePlayerCurrencyDisplay(gameState.playerData.playerStats.gold || 0);

        renderPlayerDNAInventory();
        renderDNACombinationSlots();
        renderMonsterFarm();
        renderTemporaryBackpack();
        
        loadAndDisplayAnnouncement();

        const defaultMonster = getDefaultSelectedMonster();
        setTimeout(() => updateMonsterSnapshot(defaultMonster || null), 100);

        DOMElements.authScreen.style.display = 'none';
        DOMElements.gameContainer.style.display = 'flex';
        
        hideModal('feedback-modal');

        checkAndShowNewTitleModal(playerData);

    } catch (error) {
        console.error("Game initialization failed:", error);
        hideModal('feedback-modal');
        const logoutButton = {
            text: '重新登入',
            class: 'primary',
            onClick: async () => { await logoutUser(); }
        };
        showFeedbackModal('遊戲載入失敗', `初始化過程中發生錯誤：${error.message}。請嘗試刷新頁面或重新登入。`, false, null, [logoutButton, { text: '關閉', class: 'secondary' }]);
        DOMElements.authScreen.style.display = 'flex';
        DOMElements.gameContainer.style.display = 'none';
    }
}

async function onAuthStateChangedHandler(user) {
    if (user) {
        console.log("User is signed in:", user.uid);
        updateGameState({ currentUser: user, playerId: user.uid, playerNickname: user.displayName || (user.email ? user.email.split('@')[0] : "玩家") });
        
        await initializeGame();
        
        if (localStorage.getItem('announcementShown_v1') !== 'true') {
            showModal('official-announcement-modal');
        }

    } else {
        console.log("User is signed out or not yet signed in.");
        updateGameState({ currentUser: null, playerId: null, playerNickname: "玩家", playerData: null, gameConfigs: null });
        DOMElements.authScreen.style.display = 'flex';
        DOMElements.gameContainer.style.display = 'none';
        
        setTimeout(() => {
            updateMonsterSnapshot(null);
            resetDNACombinationSlots();
            renderPlayerDNAInventory();
            renderTemporaryBackpack();
            hideAllModals();
        }, 100);
    }
}

function initializeApp() {
    console.log("所有核心模組已導入，開始初始化應用程式。");
    initializeDOMElements(); 
    clearGameCacheOnExitOrRefresh();
    initializeFirebaseApp();
    RosterAuthListener(onAuthStateChangedHandler);

    initializeUIEventHandlers();
    initializeGameInteractionEventHandlers();
    initializeDragDropEventHandlers();
    initializeMonsterEventHandlers();
    initializeNoteHandlers();
    initializeChatSystem();
    initializeMailboxEventHandlers();
    initializeAdventureHandlers();
    initializeTrainingHandlers();

    setInterval(updateAllTimers, 1000);

    const firstTab = DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="dna-inventory-content"]');
    if (firstTab) {
        switchTabContent('dna-inventory-content', firstTab);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('beforeunload', clearGameCacheOnExitOrRefresh);

console.log("Main.js script loaded.");
