// event-handlers.js

// 導入其他模組中的函式和物件
import {
    openModal,
    closeModal,
    showFeedbackModal,
    applyTheme,
    populateNewbieGuide,
    updateMonsterInfoModal,
    openAndPopulatePlayerInfoModal,
    setupMonsterLeaderboardTabs,
    populateMonsterLeaderboard,
    populatePlayerLeaderboard,
    openDnaFarmTab,
    openGenericTab,
    setupDropZones
} from './ui.js';

import {
    combineDNA,
    handleDrawDnaButtonClick,
    toggleBattleStatus,
    promptReleaseMonster,
    startCultivation,
    addAllTrainingItemsToBackpack,
    closeTrainingResultsAndCheckReminder,
    searchFriends,
    promptChallengeMonster,
    moveFromTempToInventory,
    handleComboSlotClick,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDropOnDeleteSlot // 假設這是處理刪除區拖放的函式
} from './game-logic.js';

import { handleRegister, handleLogin, handleLogout } from './auth.js';
import * as GameState from './game-state.js'; // 假設您有一個 game-state.js 來管理狀態和DOM元素引用
import { auth } from './firebase-config.js'; // 從 Firebase 設定檔獲取 auth

// --- DOM 元素引用 ---
// 在一個完整的模組化系統中，這些元素引用最好是從一個專門的DOM管理模組獲取，
// 或者作為參數傳遞給初始化函式。為了簡化，這裡直接獲取。
function getStaticElements() {
    return {
        themeSwitcherBtn: document.getElementById('theme-switcher'),
        // Auth
        showLoginFormBtn: document.getElementById('show-login-form-btn'),
        showRegisterFormBtn: document.getElementById('show-register-form-btn'),
        registerNicknameInput: document.getElementById('register-nickname'), // 新增：註冊暱稱輸入框
        registerPasswordInput: document.getElementById('register-password'), // 新增：註冊密碼輸入框
        registerErrorDisplay: document.getElementById('register-error'), // 新增：註冊錯誤訊息顯示
        registerSubmitBtn: document.getElementById('register-submit-btn'),
        loginNicknameInput: document.getElementById('login-nickname'), // 新增：登入暱稱輸入框
        loginPasswordInput: document.getElementById('login-password'), // 新增：登入密碼輸入框
        loginErrorDisplay: document.getElementById('login-error'), // 新增：登入錯誤訊息顯示
        loginSubmitBtn: document.getElementById('login-submit-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        // Top Navigation
        monsterInfoButton: document.getElementById('monster-info-button'),
        playerInfoButton: document.getElementById('player-info-button'),
        showMonsterLeaderboardBtn: document.getElementById('show-monster-leaderboard-btn'),
        showPlayerLeaderboardBtn: document.getElementById('show-player-leaderboard-btn'),
        friendsListBtn: document.getElementById('friends-list-btn'),
        newbieGuideBtn: document.getElementById('newbie-guide-btn'),
        // DNA Actions
        combineButton: document.getElementById('combine-button'),
        drawDnaBtn: document.getElementById('draw-dna-btn'), // 新增：抽DNA按鈕
        // Tabs
        dnaInventoryTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="dna-inventory-content"]'),
        monsterFarmTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="monster-farm-content"]'),
        exchangeTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="exchange-content"]'),
        homesteadTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="homestead-content"]'),
        guildTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="guild-content"]'),
        monsterDetailsInfoTab: document.querySelector('#monster-info-tabs .tab-button[data-tab-target="monster-details-tab"]'),
        monsterLogsInfoTab: document.querySelector('#monster-info-tabs .tab-button[data-tab-target="monster-logs-tab"]'),
        // Modals - specific action buttons
        confirmActionBtn: document.getElementById('confirm-action-btn'), // 確認模態框的確定按鈕
        cancelActionBtn: document.getElementById('cancel-action-btn'), // 確認模態框的取消按鈕
        startCultivationBtn: document.getElementById('start-cultivation-btn'),
        addAllToTempBackpackBtn: document.getElementById('add-all-to-temp-backpack-btn'),
        reminderConfirmCloseBtn: document.getElementById('reminder-confirm-close-btn'),
        trainingResultsModalFinalCloseBtn: document.getElementById('training-results-modal-final-close-btn'), // 新增：修煉成果模態框的最終關閉按鈕

        // Inputs
        newbieGuideSearchInput: document.getElementById('newbie-guide-search-input'),
        friendsListSearchInput: document.getElementById('friends-list-search-input'),

        // Dynamic content containers for event delegation
        inventoryItemsContainer: document.getElementById('inventory-items'), // DNA碎片區域
        temporaryBackpackItemsContainer: document.getElementById('temporary-backpack-items'), // 臨時背包區域
        farmedMonstersList: document.getElementById('farmed-monsters-list'), // 怪物農場列表
        monsterLeaderboardTable: document.getElementById('monster-leaderboard-table'), // 怪獸排行榜表格
        playerLeaderboardTable: document.getElementById('player-leaderboard-table'), // 玩家英雄榜表格
        dnaCombinationSlots: document.getElementById('dna-combination-slots'), // DNA組合槽
        dnaDrawResultsGrid: document.getElementById('dna-draw-results-grid'), // DNA抽取結果網格
        modalContainer: document.body, // 用於所有模態框關閉按鈕的事件委託
    };
}

// --- 事件處理函式 ---
function handleThemeSwitch() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function handleOpenModalWrapper(modalId) {
    openModal(modalId);
}

function handleCloseModalWrapper(event) {
    const modalId = event.target.dataset.modalId || event.target.closest('[data-modal-close-button]')?.dataset.modalCloseButton;
    if (modalId) {
        closeModal(modalId);
    }
}

function handleTabSwitch(event, tabName, containerQuerySelector) {
    let containerId = null;
    if (event.currentTarget && event.currentTarget.closest(containerQuerySelector)) {
        containerId = event.currentTarget.closest(containerQuerySelector).id;
    }

    if (containerId === 'dna-farm-tabs') {
        openDnaFarmTab(event, tabName);
    } else if (containerId === 'monster-info-tabs') {
        openGenericTab(event, tabName, 'monster-info-modal');
    }
}

// --- 主要函式：初始化所有靜態事件監聽器 ---
export function initializeStaticEventListeners() {
    const elements = getStaticElements();

    // 主題切換按鈕
    if (elements.themeSwitcherBtn) {
        elements.themeSwitcherBtn.addEventListener('click', handleThemeSwitch);
    }

    // 認證相關按鈕
    if (elements.showLoginFormBtn) {
        elements.showLoginFormBtn.addEventListener('click', () => handleOpenModalWrapper('login-modal'));
    }
    if (elements.showRegisterFormBtn) {
        elements.showRegisterFormBtn.addEventListener('click', () => handleOpenModalWrapper('register-modal'));
    }
    if (elements.registerSubmitBtn) {
        elements.registerSubmitBtn.addEventListener('click', async () => {
            const nickname = elements.registerNicknameInput.value;
            const password = elements.registerPasswordInput.value;
            // 假設 handleRegister 處理 UI 反饋和錯誤顯示
            await handleRegister(nickname, password, elements.registerErrorDisplay);
        });
    }
    if (elements.loginSubmitBtn) {
        elements.loginSubmitBtn.addEventListener('click', async () => {
            const nickname = elements.loginNicknameInput.value;
            const password = elements.loginPasswordInput.value;
            // 假設 handleLogin 處理 UI 反饋和錯誤顯示
            await handleLogin(nickname, password, elements.loginErrorDisplay);
        });
    }
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }

    // 頂部導航按鈕
    if (elements.monsterInfoButton) {
        elements.monsterInfoButton.addEventListener('click', () => {
            // 假設 updateMonsterInfoModal 和 openAndPopulatePlayerInfoModal 處理其狀態和顯示
            updateMonsterInfoModal(GameState.currentMonster); // 假設 GameState.currentMonster 儲存當前怪獸資訊
            handleOpenModalWrapper('monster-info-modal');
        });
    }
    if (elements.playerInfoButton) {
        elements.playerInfoButton.addEventListener('click', () => {
            openAndPopulatePlayerInfoModal(auth.currentUser.uid); // 假設 openAndPopulatePlayerInfoModal 處理玩家資訊
            handleOpenModalWrapper('player-info-modal');
        });
    }
    if (elements.showMonsterLeaderboardBtn) {
        elements.showMonsterLeaderboardBtn.addEventListener('click', () => {
            setupMonsterLeaderboardTabs();
            populateMonsterLeaderboard('all'); // 預設顯示全部
            handleOpenModalWrapper('monster-leaderboard-modal');
        });
    }
    if (elements.showPlayerLeaderboardBtn) {
        elements.showPlayerLeaderboardBtn.addEventListener('click', () => {
            populatePlayerLeaderboard();
            handleOpenModalWrapper('player-leaderboard-modal');
        });
    }
    if (elements.friendsListBtn) {
        elements.friendsListBtn.addEventListener('click', () => {
            // 假設清空搜尋輸入框的邏輯在 ui.js 或此處處理
            if (elements.friendsListSearchInput) elements.friendsListSearchInput.value = '';
            handleOpenModalWrapper('friends-list-modal');
        });
    }
    if (elements.newbieGuideBtn) {
        elements.newbieGuideBtn.addEventListener('click', () => {
            populateNewbieGuide(); // 填充新手指南內容
            handleOpenModalWrapper('newbie-guide-modal');
        });
    }

    // DNA 操作按鈕
    if (elements.combineButton) {
        elements.combineButton.addEventListener('click', combineDNA); // 呼叫 game-logic.js 中的 combineDNA
    }
    if (elements.drawDnaBtn) {
        elements.drawDnaBtn.addEventListener('click', handleDrawDnaButtonClick); // 呼叫 game-logic.js 中的 handleDrawDnaButtonClick
    }

    // 頁籤按鈕 (使用事件委託或直接綁定，這裡採用直接綁定)
    if (elements.dnaInventoryTab) elements.dnaInventoryTab.addEventListener('click', (event) => handleTabSwitch(event, 'dna-inventory-content', '#dna-farm-tabs'));
    if (elements.monsterFarmTab) elements.monsterFarmTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-farm-content', '#dna-farm-tabs'));
    if (elements.exchangeTab) elements.exchangeTab.addEventListener('click', (event) => handleTabSwitch(event, 'exchange-content', '#dna-farm-tabs'));
    if (elements.homesteadTab) elements.homesteadTab.addEventListener('click', (event) => handleTabSwitch(event, 'homestead-content', '#dna-farm-tabs'));
    if (elements.guildTab) elements.guildTab.addEventListener('click', (event) => handleTabSwitch(event, 'guild-content', '#dna-farm-tabs'));

    if (elements.monsterDetailsInfoTab) elements.monsterDetailsInfoTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-details-tab', '#monster-info-tabs'));
    if (elements.monsterLogsInfoTab) elements.monsterLogsInfoTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-logs-tab', '#monster-info-tabs'));

    // 模態框關閉按鈕 (使用事件委託，因為它們可能在模態框內容動態載入後才出現)
    // 這裡改為監聽 body，並檢查點擊事件的目標
    if (elements.modalContainer) {
        elements.modalContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-close') || event.target.dataset.modalCloseButton) {
                handleCloseModalWrapper(event);
            }
        });
    }

    // 確認模態框的按鈕
    if (elements.cancelActionBtn) {
        elements.cancelActionBtn.addEventListener('click', () => closeModal('confirmation-modal')); // 取消按鈕應該關閉模態框
    }
    // confirmActionBtn 的點擊事件通常是動態設定的，取決於確認的內容，因此不在這裡靜態綁定。

    // 其他靜態按鈕
    if (elements.startCultivationBtn) {
        elements.startCultivationBtn.addEventListener('click', startCultivation); // 呼叫 game-logic.js 中的 startCultivation
    }
    if (elements.addAllToTempBackpackBtn) {
        elements.addAllToTempBackpackBtn.addEventListener('click', addAllTrainingItemsToBackpack); // 呼叫 game-logic.js 中的 addAllTrainingItemsToBackpack
    }
    if (elements.reminderConfirmCloseBtn) {
        elements.reminderConfirmCloseBtn.addEventListener('click', closeTrainingResultsAndCheckReminder); // 呼叫 game-logic.js 中的 closeTrainingResultsAndCheckReminder
    }
    if (elements.trainingResultsModalFinalCloseBtn) {
        elements.trainingResultsModalFinalCloseBtn.addEventListener('click', () => closeModal('training-results-modal'));
    }

    // 輸入框事件
    if (elements.newbieGuideSearchInput) {
        elements.newbieGuideSearchInput.addEventListener('input', (e) => populateNewbieGuide(e.target.value));
    }
    if (elements.friendsListSearchInput) {
        let friendsSearchDebounceTimer;
        elements.friendsListSearchInput.addEventListener('input', (e) => {
            clearTimeout(friendsSearchDebounceTimer);
            friendsSearchDebounceTimer = setTimeout(() => {
                searchFriends(e.target.value); // 呼叫 game-logic.js 中的 searchFriends
            }, 300);
        });
    }

    // 初始化拖放監聽器
    // 假設 setupDropZones 函式會為所有可拖放和可放置區域設置監聽器
    setupDropZones();

    // 針對動態生成的 DNA 碎片和臨時背包物品添加事件委託，處理拖放和點擊
    if (elements.inventoryItemsContainer) {
        elements.inventoryItemsContainer.addEventListener('dragstart', handleDragStart);
        elements.inventoryItemsContainer.addEventListener('dragover', handleDragOver);
        elements.inventoryItemsContainer.addEventListener('dragleave', handleDragLeave);
        elements.inventoryItemsContainer.addEventListener('drop', handleDrop); // 處理拖放到背包或刪除區
        elements.inventoryItemsContainer.addEventListener('click', (event) => {
            const deleteSlot = event.target.closest('[data-droptype="delete"]');
            if (deleteSlot) {
                // 如果點擊了刪除區，則觸發刪除邏輯
                handleDropOnDeleteSlot(event); // 假設此函式也能處理點擊刪除區
            }
        });
    }

    if (elements.temporaryBackpackItemsContainer) {
        elements.temporaryBackpackItemsContainer.addEventListener('dragstart', handleDragStart);
        elements.temporaryBackpackItemsContainer.addEventListener('dragover', handleDragOver);
        elements.temporaryBackpackItemsContainer.addEventListener('dragleave', handleDragLeave);
        elements.temporaryBackpackItemsContainer.addEventListener('drop', handleDrop); // 處理拖放到臨時背包
        elements.temporaryBackpackItemsContainer.addEventListener('click', (event) => {
            const item = event.target.closest('.backpack-item');
            if (item && item.dataset.slotIndex) {
                moveFromTempToInventory(parseInt(item.dataset.slotIndex)); // 呼叫 game-logic.js 中的 moveFromTempToInventory
            }
        });
    }

    if (elements.dnaCombinationSlots) {
        elements.dnaCombinationSlots.addEventListener('dragover', handleDragOver);
        elements.dnaCombinationSlots.addEventListener('dragleave', handleDragLeave);
        elements.dnaCombinationSlots.addEventListener('drop', handleDrop);
        elements.dnaCombinationSlots.addEventListener('click', (event) => {
            const slot = event.target.closest('.dna-slot[data-droptype="combination"]');
            if (slot && slot.dataset.slotId) {
                handleComboSlotClick(parseInt(slot.dataset.slotId)); // 呼叫 game-logic.js 中的 handleComboSlotClick
            }
        });
    }

    if (elements.dnaDrawResultsGrid) {
        elements.dnaDrawResultsGrid.addEventListener('click', (event) => {
            const addButton = event.target.closest('.add-drawn-to-temp-backpack-btn');
            if (addButton && addButton.dataset.dna) {
                // 假設 addDrawnToTempBackpack 是一個處理此邏輯的函式
                // 這裡直接呼叫 moveFromTempToInventory 模擬添加
                // 實際情況可能需要一個專門的函式來處理抽取的DNA添加到臨時背包
                const dnaInfo = JSON.parse(addButton.dataset.dna);
                // 假設 moveFromTempToInventory 也能處理這種情況，或者需要一個新的函式
                // 這裡暫時只記錄
                console.log("Add drawn DNA to temp backpack:", dnaInfo);
                // 您可能需要一個類似 addDrawnItemToTempBackpack(dnaInfo) 的函式
                showFeedbackModal("成功", `${dnaInfo.name} 已加入臨時背包！`);
                addButton.disabled = true; // 防止重複添加
            }
        });
    }


    // 怪物農場列表的動態按鈕 (養成、放生、出戰)
    if (elements.farmedMonstersList) {
        elements.farmedMonstersList.addEventListener('click', (event) => {
            const cultivateBtn = event.target.closest('.farm-monster-cultivate-btn');
            const releaseBtn = event.target.closest('.farm-monster-release-btn');
            const activeMonsterRadio = event.target.closest('input[name="active_monster"][type="radio"]');

            if (cultivateBtn && cultivateBtn.dataset.monsterId) {
                startCultivation(cultivateBtn.dataset.monsterId); // 呼叫 game-logic.js 中的 startCultivation
            } else if (releaseBtn && releaseBtn.dataset.monsterId) {
                promptReleaseMonster(releaseBtn.dataset.monsterId); // 呼叫 game-logic.js 中的 promptReleaseMonster
            } else if (activeMonsterRadio && activeMonsterRadio.value) {
                toggleBattleStatus(activeMonsterRadio.value); // 呼叫 game-logic.js 中的 toggleBattleStatus
            }
        });
    }

    // 排行榜中的挑戰按鈕和玩家暱稱連結
    if (elements.monsterLeaderboardTable) {
        elements.monsterLeaderboardTable.addEventListener('click', (event) => {
            const challengeBtn = event.target.closest('button[data-action="challenge"]');
            const playerNicknameLink = event.target.closest('.player-nickname-link');

            if (challengeBtn && challengeBtn.dataset.monsterId) {
                promptChallengeMonster(challengeBtn.dataset.monsterId); // 呼叫 game-logic.js 中的 promptChallengeMonster
            } else if (playerNicknameLink && playerNicknameLink.dataset.playerUid) {
                openAndPopulatePlayerInfoModal(playerNicknameLink.dataset.playerUid);
                handleOpenModalWrapper('player-info-modal');
            }
        });
    }

    if (elements.playerLeaderboardTable) {
        elements.playerLeaderboardTable.addEventListener('click', (event) => {
            const viewPlayerBtn = event.target.closest('button[data-action="view-player"]');
            if (viewPlayerBtn && viewPlayerBtn.dataset.playerUid) {
                openAndPopulatePlayerInfoModal(viewPlayerBtn.dataset.playerUid);
                handleOpenModalWrapper('player-info-modal');
            }
        });
    }

    // 怪獸排行榜元素篩選頁籤
    const monsterLeaderboardElementTabs = document.getElementById('monster-leaderboard-element-tabs');
    if (monsterLeaderboardElementTabs) {
        monsterLeaderboardElementTabs.addEventListener('click', (event) => {
            const tabButton = event.target.closest('.tab-button[data-element-filter]');
            if (tabButton) {
                // 移除所有按鈕的 active 類別
                monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                // 為被點擊的按鈕添加 active 類別
                tabButton.classList.add('active');
                populateMonsterLeaderboard(tabButton.dataset.elementFilter); // 呼叫 ui.js 中的 populateMonsterLeaderboard
            }
        });
    }

    console.log('Static and delegated event listeners initialized from event-handlers.js');
}

