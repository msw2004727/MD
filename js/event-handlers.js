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
    handleDropOnDeleteSlot,
    handleReminderConfirmClose // 確保導入這個函式
} from './game-logic.js';

import { handleRegister, handleLogin, handleLogout } from './auth.js';
import * as GameState from './game-state.js'; // 假設您有一個 game-state.js 來管理狀態和DOM元素引用
import { auth } from './firebase-config.js'; // 從 Firebase 設定檔獲取 auth

// --- DOM 元素引用 ---
function getStaticElements() {
    return {
        themeSwitcherBtn: document.getElementById('theme-switcher'),
        // Auth
        showLoginFormBtn: document.getElementById('show-login-form-btn'),
        showRegisterFormBtn: document.getElementById('show-register-form-btn'),
        registerNicknameInput: document.getElementById('register-nickname'),
        registerPasswordInput: document.getElementById('register-password'),
        registerErrorDisplay: document.getElementById('register-error'),
        registerSubmitBtn: document.getElementById('register-submit-btn'),
        loginNicknameInput: document.getElementById('login-nickname'),
        loginPasswordInput: document.getElementById('login-password'),
        loginErrorDisplay: document.getElementById('login-error'),
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
        drawDnaBtn: document.getElementById('draw-dna-btn'),
        // Tabs
        dnaInventoryTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="dna-inventory-content"]'),
        monsterFarmTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="monster-farm-content"]'),
        exchangeTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="exchange-content"]'),
        homesteadTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="homestead-content"]'),
        guildTab: document.querySelector('#dna-farm-tabs .tab-button[data-tab-target="guild-content"]'),
        monsterDetailsInfoTab: document.querySelector('#monster-info-tabs .tab-button[data-tab-target="monster-details-tab"]'),
        monsterLogsInfoTab: document.querySelector('#monster-info-tabs .tab-button[data-tab-target="monster-logs-tab"]'),
        // Modals - specific action buttons
        confirmActionBtn: document.getElementById('confirm-action-btn'),
        cancelActionBtn: document.getElementById('cancel-action-btn'),
        startCultivationBtn: document.getElementById('start-cultivation-btn'),
        addAllToTempBackpackBtn: document.getElementById('add-all-to-temp-backpack-btn'),
        reminderConfirmCloseBtn: document.getElementById('reminder-confirm-close-btn'),
        reminderCancelBtn: document.getElementById('reminder-cancel-btn'),
        trainingResultsModalFinalCloseBtn: document.getElementById('training-results-modal-final-close-btn'),

        // Inputs
        newbieGuideSearchInput: document.getElementById('newbie-guide-search-input'),
        friendsListSearchInput: document.getElementById('friends-list-search-input'),

        // Dynamic content containers for event delegation
        inventoryItemsContainer: document.getElementById('inventory-items'),
        temporaryBackpackItemsContainer: document.getElementById('temporary-backpack-items'),
        farmedMonstersList: document.getElementById('farmed-monsters-list'),
        monsterLeaderboardTable: document.getElementById('monster-leaderboard-table'),
        playerLeaderboardTable: document.getElementById('player-leaderboard-table'),
        dnaCombinationSlots: document.getElementById('dna-combination-slots'), // 這裡應該是 dnaCombinationSlotsContainer
        dnaDrawResultsGrid: document.getElementById('dna-draw-results-grid'),
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
        elements.registerSubmitBtn.addEventListener('click', async () => { // 修正這裡的語法
            const nickname = elements.registerNicknameInput.value;
            const password = elements.registerPasswordInput.value;
            await handleRegister(nickname, password, elements.registerErrorDisplay);
        });
    }
    if (elements.loginSubmitBtn) {
        elements.loginSubmitBtn.addEventListener('click', async () => { // 修正這裡的語法
            const nickname = elements.loginNicknameInput.value;
            const password = elements.loginPasswordInput.value;
            await handleLogin(nickname, password, elements.loginErrorDisplay);
        });
    }
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }

    // 頂部導航按鈕
    if (elements.monsterInfoButton) {
        elements.monsterInfoButton.addEventListener('click', () => {
            updateMonsterInfoModal(GameState.currentMonster);
            handleOpenModalWrapper('monster-info-modal');
        });
    }
    if (elements.playerInfoButton) {
        elements.playerInfoButton.addEventListener('click', () => {
            openAndPopulatePlayerInfoModal(GameState.playerData, auth.currentUser.uid);
            handleOpenModalWrapper('player-info-modal');
        });
    }
    if (elements.showMonsterLeaderboardBtn) {
        elements.showMonsterLeaderboardBtn.addEventListener('click', () => {
            setupMonsterLeaderboardTabs();
            populateMonsterLeaderboard('all');
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
            if (elements.friendsListSearchInput) elements.friendsListSearchInput.value = '';
            handleOpenModalWrapper('friends-list-modal');
        });
    }
    if (elements.newbieGuideBtn) {
        elements.newbieGuideBtn.addEventListener('click', () => {
            populateNewbieGuide();
            handleOpenModalWrapper('newbie-guide-modal');
        });
    }

    // DNA 操作按鈕
    if (elements.combineButton) {
        elements.combineButton.addEventListener('click', combineDNA);
    }
    if (elements.drawDnaBtn) {
        elements.drawDnaBtn.addEventListener('click', handleDrawDnaButtonClick);
    }

    // 頁籤按鈕
    if (elements.dnaInventoryTab) elements.dnaInventoryTab.addEventListener('click', (event) => handleTabSwitch(event, 'dna-inventory-content', '#dna-farm-tabs'));
    if (elements.monsterFarmTab) elements.monsterFarmTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-farm-content', '#dna-farm-tabs'));
    if (elements.exchangeTab) elements.exchangeTab.addEventListener('click', (event) => handleTabSwitch(event, 'exchange-content', '#dna-farm-tabs'));
    if (elements.homesteadTab) elements.homesteadTab.addEventListener('click', (event) => handleTabSwitch(event, 'homestead-content', '#dna-farm-tabs'));
    if (elements.guildTab) elements.guildTab.addEventListener('click', (event) => handleTabSwitch(event, 'guild-content', '#dna-farm-tabs'));

    if (elements.monsterDetailsInfoTab) elements.monsterDetailsInfoTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-details-tab', '#monster-info-tabs'));
    if (elements.monsterLogsInfoTab) elements.monsterLogsInfoTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-logs-tab', '#monster-info-tabs'));


    // 模態框關閉按鈕 (使用事件委託)
    if (elements.modalContainer) {
        elements.modalContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-close') || event.target.dataset.modalCloseButton) {
                handleCloseModalWrapper(event);
            }
        });
    }

    // 確認模態框的按鈕
    if (elements.cancelActionBtn) {
        elements.cancelActionBtn.addEventListener('click', () => closeModal('confirmation-modal'));
    }

    // 其他靜態按鈕
    if (elements.startCultivationBtn) {
        elements.startCultivationBtn.addEventListener('click', () => GameLogic.openCultivationSetupModal(GameState.currentMonster.id));
    }
    if (elements.addAllToTempBackpackBtn) {
        elements.addAllToTempBackpackBtn.addEventListener('click', addAllTrainingItemsToBackpack);
    }
    if (elements.reminderConfirmCloseBtn) {
        elements.reminderConfirmCloseBtn.addEventListener('click', handleReminderConfirmClose);
    }
    if (elements.reminderCancelBtn) {
        elements.reminderCancelBtn.addEventListener('click', () => closeModal('reminder-modal'));
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
                searchFriends(e.target.value);
            }, 300);
        });
    }

    // 初始化拖放監聽器
    setupDropZones();

    // 針對動態生成的 DNA 碎片和臨時背包物品添加事件委託，處理拖放和點擊
    if (elements.inventoryItemsContainer) {
        elements.inventoryItemsContainer.addEventListener('dragstart', GameLogic.handleDragStart);
        elements.inventoryItemsContainer.addEventListener('dragover', GameLogic.handleDragOver);
        elements.inventoryItemsContainer.addEventListener('dragleave', GameLogic.handleDragLeave);
        elements.inventoryItemsContainer.addEventListener('drop', GameLogic.handleDrop);
        elements.inventoryItemsContainer.addEventListener('click', (event) => {
            const deleteSlot = event.target.closest('.inventory-delete-slot');
            if (deleteSlot) {
                // 如果點擊了刪除區，則觸發刪除邏輯
                // 注意：這裡如果只是點擊，而不是拖放，需要額外判斷邏輯
                // 目前暫時不處理單純點擊刪除區
            }
        });
    }

    if (elements.temporaryBackpackItemsContainer) {
        elements.temporaryBackpackItemsContainer.addEventListener('dragstart', GameLogic.handleDragStart);
        elements.temporaryBackpackItemsContainer.addEventListener('dragover', GameLogic.handleDragOver);
        elements.temporaryBackpackItemsContainer.addEventListener('dragleave', GameLogic.handleDragLeave);
        elements.temporaryBackpackItemsContainer.addEventListener('drop', GameLogic.handleDrop);
        elements.temporaryBackpackItemsContainer.addEventListener('click', (event) => {
            const itemElement = event.target.closest('.temp-backpack-slot.occupied');
            if (itemElement && itemElement.dataset.slotIndex !== undefined) {
                const index = parseInt(itemElement.dataset.slotIndex);
                GameLogic.moveFromTempToInventory(index);
            }
        });
    }

    if (elements.dnaCombinationSlots) { // 這裡應該是 dnaCombinationSlotsContainer
        elements.dnaCombinationSlots.addEventListener('dragover', GameLogic.handleDragOver);
        elements.dnaCombinationSlots.addEventListener('dragleave', GameLogic.handleDragLeave);
        elements.dnaCombinationSlots.addEventListener('drop', GameLogic.handleDrop);
        elements.dnaCombinationSlots.addEventListener('click', (event) => {
            const slot = event.target.closest('.dna-slot[data-droptype="combination"]');
            if (slot && slot.dataset.slotId !== undefined) {
                handleComboSlotClick(parseInt(slot.dataset.slotId));
            }
        });
    }

    if (elements.dnaDrawResultsGrid) {
        elements.dnaDrawResultsGrid.addEventListener('click', (event) => {
            const addButton = event.target.closest('.add-drawn-to-temp-backpack-btn');
            if (addButton && addButton.dataset.dna) {
                const dnaInfo = JSON.parse(addButton.dataset.dna);
                GameLogic.addToTemporaryBackpack(dnaInfo);
                addButton.textContent = '已加入';
                addButton.disabled = true;
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
                GameLogic.openCultivationSetupModal(cultivateBtn.dataset.monsterId);
            } else if (releaseBtn && releaseBtn.dataset.monsterId) {
                promptReleaseMonster(releaseBtn.dataset.monsterId);
            } else if (activeMonsterRadio && activeMonsterRadio.value) {
                toggleBattleStatus(activeMonsterRadio.value);
            }
        });
    }

    // 排行榜中的挑戰按鈕和玩家暱稱連結
    if (elements.monsterLeaderboardTable) {
        elements.monsterLeaderboardTable.addEventListener('click', (event) => {
            const challengeBtn = event.target.closest('button[data-action="challenge"]');
            const playerNicknameLink = event.target.closest('.player-nickname-link');

            if (challengeBtn && challengeBtn.dataset.monsterId) {
                promptChallengeMonster(challengeBtn.dataset.monsterId);
            } else if (playerNicknameLink && playerNicknameLink.dataset.playerUid) {
                showPlayerInfoPopup(playerNicknameLink.dataset.playerUid);
            }
        });
    }

    if (elements.playerLeaderboardTable) {
        elements.playerLeaderboardTable.addEventListener('click', (event) => {
            const viewPlayerBtn = event.target.closest('button[data-action="view-player"]');
            if (viewPlayerBtn && viewPlayerBtn.dataset.playerUid) {
                showPlayerInfoPopup(viewPlayerBtn.dataset.playerUid);
            }
        });
    }

    // 怪獸排行榜元素篩選頁籤
    const monsterLeaderboardElementTabs = document.getElementById('monster-leaderboard-element-tabs');
    if (monsterLeaderboardElementTabs) {
        monsterLeaderboardElementTabs.addEventListener('click', (event) => {
            const tabButton = event.target.closest('.tab-button[data-element-filter]');
            if (tabButton) {
                monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                tabButton.classList.add('active');
                populateMonsterLeaderboard(tabButton.dataset.elementFilter);
            }
        });
    }

    console.log('Static and delegated event listeners initialized from event-handlers.js');
}
