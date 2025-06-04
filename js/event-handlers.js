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
    handleDropOnDeleteSlot 
} from './game-logic.js';

import { handleRegister, handleLogin, handleLogout } from './auth.js';
import * as GameState from './game-state.js'; // 遊戲狀態和 DOM 元素引用

// --- 事件處理函式 ---
function handleThemeSwitch() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function handleCloseModalWrapper(event) {
    const modalId = event.target.dataset.modalId || event.target.closest('[data-modal-close-button]')?.dataset.modalCloseButton;
    if (modalId) {
        closeModal(modalId);
    }
}

function handleTabSwitch(event, tabName, containerQuerySelector) {
    const tabContainer = event.currentTarget.closest(containerQuerySelector);
    if (!tabContainer) {
        console.error(`UI: Tab container with selector ${containerQuerySelector} not found for tab ${tabName}.`);
        return;
    }

    if (tabContainer.id === 'dna-farm-tabs') {
        openDnaFarmTab(event, tabName);
    } else if (tabContainer.id === 'monster-info-tabs') {
        openGenericTab(event, tabName, '#' + tabContainer.id); 
    } else {
        openGenericTab(event, tabName, '#' + tabContainer.id); 
    }
}

// --- 主要函式：初始化所有靜態事件監聽器 ---
export function initializeStaticEventListeners() {
    console.log("event-handlers.js -> initializeStaticEventListeners: Function started."); // 新增日誌

    const elements = GameState.elements;

    if (elements.themeSwitcherBtn) {
        elements.themeSwitcherBtn.addEventListener('click', handleThemeSwitch);
        console.log("event-handlers.js: Theme switcher listener bound."); // 新增日誌
    }

    // 認證相關按鈕 (直接綁定到提交按鈕)
    if (elements.registerSubmitBtn) {
        elements.registerSubmitBtn.addEventListener('click', function(event) {
            console.log("event-handlers.js: Register button clicked, calling handleRegister."); // 新增點擊日誌
            event.preventDefault(); // 防止表單默認提交，如果有表單包圍
            handleRegister(); 
        });
        console.log("event-handlers.js: Register submit button listener bound."); // 新增日誌
    } else {
        console.warn("event-handlers.js: registerSubmitBtn not found in GameState.elements, cannot bind listener."); // 新增警告日誌
    }

    if (elements.loginSubmitBtn) {
        elements.loginSubmitBtn.addEventListener('click', function(event) {
            console.log("event-handlers.js: Login button clicked, calling handleLogin."); // 新增點擊日誌
            event.preventDefault(); // 防止表單默認提交，如果有表單包圍
            handleLogin();
        });
        console.log("event-handlers.js: Login submit button listener bound."); // 新增日誌
    } else {
        console.warn("event-handlers.js: loginSubmitBtn not found in GameState.elements, cannot bind listener."); // 新增警告日誌
    }
    
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
        console.log("event-handlers.js: Logout button listener bound."); // 新增日誌
    }

    // 頂部導航按鈕
    if (elements.monsterInfoButton) {
        elements.monsterInfoButton.addEventListener('click', () => {
            console.log("event-handlers.js: Monster Info button clicked."); // 新增日誌
            updateMonsterInfoModal(GameState.currentMonster); 
            openModal('monster-info-modal'); 
        });
    }
    if (elements.playerInfoButton) {
        elements.playerInfoButton.addEventListener('click', () => {
            console.log("event-handlers.js: Player Info button clicked."); // 新增日誌
            if (GameState.auth.currentUser) {
                openAndPopulatePlayerInfoModal(GameState.auth.currentUser.uid);
                openModal('player-info-modal');
            } else {
                showFeedbackModal("提示", "請先登入以查看玩家資訊。", false, true);
            }
        });
    }
    if (elements.showMonsterLeaderboardBtn) {
        elements.showMonsterLeaderboardBtn.addEventListener('click', () => {
            console.log("event-handlers.js: Monster Leaderboard button clicked."); // 新增日誌
            setupMonsterLeaderboardTabs(); 
            populateMonsterLeaderboard('all'); 
            openModal('monster-leaderboard-modal'); 
        });
    }
    if (elements.showPlayerLeaderboardBtn) {
        elements.showPlayerLeaderboardBtn.addEventListener('click', () => {
            console.log("event-handlers.js: Player Leaderboard button clicked."); // 新增日誌
            populatePlayerLeaderboard();
            openModal('player-leaderboard-modal');
        });
    }
    if (elements.friendsListBtn) {
        elements.friendsListBtn.addEventListener('click', () => {
            console.log("event-handlers.js: Friends List button clicked."); // 新增日誌
            if (elements.friendsListSearchInput) elements.friendsListSearchInput.value = ''; 
            openModal('friends-list-modal'); 
        });
    }
    if (elements.newbieGuideBtn) {
        elements.newbieGuideBtn.addEventListener('click', () => {
            console.log("event-handlers.js: Newbie Guide button clicked."); // 新增日誌
            populateNewbieGuide(); 
            openModal('newbie-guide-modal'); 
        });
    }

    // DNA 操作按鈕
    if (elements.combineButton) {
        elements.combineButton.addEventListener('click', combineDNA); 
        console.log("event-handlers.js: Combine DNA button listener bound."); // 新增日誌
    }
    if (elements.drawDnaBtn) {
        elements.drawDnaBtn.addEventListener('click', handleDrawDnaButtonClick); 
        console.log("event-handlers.js: Draw DNA button listener bound."); // 新增日誌
    }

    // 頁籤按鈕 (使用事件委託或直接綁定)
    if (elements.dnaInventoryTab) elements.dnaInventoryTab.addEventListener('click', (event) => handleTabSwitch(event, 'dna-inventory-content', '#dna-farm-tabs'));
    if (elements.monsterFarmTab) elements.monsterFarmTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-farm-content', '#dna-farm-tabs'));
    if (elements.exchangeTab) elements.exchangeTab.addEventListener('click', (event) => handleTabSwitch(event, 'exchange-content', '#dna-farm-tabs'));
    if (elements.homesteadTab) elements.homesteadTab.addEventListener('click', (event) => handleTabSwitch(event, 'homestead-content', '#dna-farm-tabs'));
    if (elements.guildTab) elements.guildTab.addEventListener('click', (event) => handleTabSwitch(event, 'guild-content', '#dna-farm-tabs'));

    if (elements.monsterDetailsInfoTab) elements.monsterDetailsInfoTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-details-tab', '#monster-info-tabs'));
    if (elements.monsterLogsInfoTab) elements.monsterLogsInfoTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-logs-tab', '#monster-info-tabs'));

    // 模態框關閉按鈕 (使用事件委託)
    document.body.addEventListener('click', (event) => { 
        if (event.target.classList.contains('modal-close') || event.target.dataset.modalCloseButton) {
            handleCloseModalWrapper(event);
        }
    });

    // 確認模態框的取消按鈕
    if (elements.cancelActionBtn) {
        elements.cancelActionBtn.addEventListener('click', () => closeModal('confirmation-modal')); 
    }

    // 其他靜態按鈕
    if (elements.startCultivationBtn) {
        elements.startCultivationBtn.addEventListener('click', startCultivation); 
    }
    if (elements.addAllToTempBackpackBtn) {
        elements.addAllToTempBackpackBtn.addEventListener('click', addAllTrainingItemsToBackpack); 
    }
    if (elements.reminderConfirmCloseBtn) {
        elements.reminderConfirmCloseBtn.addEventListener('click', () => {
            closeModal('reminder-modal'); 
            closeModal('training-results-modal'); 
            showFeedbackModal("提示", "未加入的物品已丟棄。", true, false); 
            GameState.itemsFromCurrentTraining = []; 
        });
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
    console.log("event-handlers.js: Drop zones setup called."); // 新增日誌

    // 針對動態生成的 DNA 碎片和臨時背包物品添加事件委託，處理拖放和點擊
    if (elements.temporaryBackpackItemsContainer) {
        elements.temporaryBackpackItemsContainer.addEventListener('click', (event) => {
            const item = event.target.closest('.dna-item[data-source-type="temporary"]'); 
            if (item && item.dataset.slotIndex) {
                moveFromTempToInventory(parseInt(item.dataset.slotIndex)); 
            }
        });
        console.log("event-handlers.js: Temporary backpack click listener bound."); // 新增日誌
    }

    if (elements.dnaDrawResultsGrid) {
        elements.dnaDrawResultsGrid.addEventListener('click', (event) => {
            const addButton = event.target.closest('.add-drawn-to-temp-backpack-btn');
            if (addButton && addButton.dataset.dna) {
                const dnaInfo = JSON.parse(addButton.dataset.dna);
                GameLogic.addToTemporaryBackpack(dnaInfo); 
                showFeedbackModal("成功", `${dnaInfo.name} 已加入臨時背包！`, true, false); 
                addButton.disabled = true; 
                addButton.textContent = '已加入'; 
            }
        });
        console.log("event-handlers.js: DNA draw results grid click listener bound."); // 新增日誌
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
        console.log("event-handlers.js: Farmed monsters list click listener bound."); // 新增日誌
    }

    // 排行榜中的挑戰按鈕和玩家暱稱連結
    if (elements.monsterLeaderboardTable) {
        elements.monsterLeaderboardTable.addEventListener('click', (event) => {
            const challengeBtn = event.target.closest('button[data-action="challenge"]');
            const playerNicknameLink = event.target.closest('.player-nickname-link');

            if (challengeBtn && challengeBtn.dataset.monsterId) {
                const opponentMonster = GameState.allPublicMonsters.find(m => m.id === challengeBtn.dataset.monsterId);
                if (opponentMonster) {
                    promptChallengeMonster(opponentMonster); 
                } else {
                    showFeedbackModal("錯誤", "找不到要挑戰的怪獸數據。", false, true);
                }
            } else if (playerNicknameLink && playerNicknameLink.dataset.playerUid) {
                openAndPopulatePlayerInfoModal(playerNicknameLink.dataset.playerUid);
                openModal('player-info-modal'); 
            }
        });
        console.log("event-handlers.js: Monster leaderboard click listener bound."); // 新增日誌
    }

    if (elements.playerLeaderboardTable) {
        elements.playerLeaderboardTable.addEventListener('click', (event) => {
            const viewPlayerBtn = event.target.closest('button[data-action="view-player"]');
            if (viewPlayerBtn && viewPlayerBtn.dataset.playerUid) {
                openAndPopulatePlayerInfoModal(viewPlayerBtn.dataset.playerUid);
                openModal('player-info-modal'); 
            }
        });
        console.log("event-handlers.js: Player leaderboard click listener bound."); // 新增日誌
    }

    // 怪獸排行榜元素篩選頁籤
    const monsterLeaderboardElementTabs = elements.monsterLeaderboardElementTabs; 
    if (monsterLeaderboardElementTabs) {
        monsterLeaderboardElementTabs.addEventListener('click', (event) => {
            const tabButton = event.target.closest('.tab-button[data-element-filter]');
            if (tabButton) {
                monsterLeaderboardElementTabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                tabButton.classList.add('active');
                populateMonsterLeaderboard(tabButton.dataset.elementFilter); 
            }
        });
        console.log("event-handlers.js: Monster leaderboard element tabs listener bound."); // 新增日誌
    }

    console.log('event-handlers.js -> initializeStaticEventListeners: Function complete.'); // 新增日誌
}
