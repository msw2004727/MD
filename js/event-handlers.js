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
    setupMonsterLeaderboardTabs, // 雖然這裡導入了，但實際邏輯可能在 UI 中處理
    populateMonsterLeaderboard,
    populatePlayerLeaderboard,
    openDnaFarmTab,
    openGenericTab,
    setupDropZones // 拖放設置函式
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
    handleDragStart, // 拖放開始
    handleDragOver,  // 拖放經過
    handleDragLeave, // 拖放離開
    handleDrop,      // 拖放結束
    handleDropOnDeleteSlot // 處理刪除區拖放的函式
} from './game-logic.js';

import { handleRegister, handleLogin, handleLogout } from './auth.js';
import * as GameState from './game-state.js'; // 遊戲狀態和 DOM 元素引用
// import { auth } from './firebase-config.js'; // auth 實例已經在 GameState 中，無需再次導入

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
    const tabContainer = event.currentTarget.closest(containerQuerySelector);
    if (!tabContainer) {
        console.error(`UI: Tab container with selector ${containerQuerySelector} not found for tab ${tabName}.`);
        return;
    }

    // 根據父容器的 ID 或特定屬性來判斷呼叫哪個通用的頁籤開啟函式
    if (tabContainer.id === 'dna-farm-tabs') {
        openDnaFarmTab(event, tabName);
    } else if (tabContainer.id === 'monster-info-tabs') {
        openGenericTab(event, tabName, '#' + tabContainer.id); // 傳遞正確的容器選擇器
    } else {
        openGenericTab(event, tabName, '#' + tabContainer.id); // 對於其他通用頁籤
    }
}

// --- 主要函式：初始化所有靜態事件監聽器 ---
export function initializeStaticEventListeners() {
    // 直接從 GameState.elements 獲取 DOM 元素引用
    const elements = GameState.elements;

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
        elements.registerSubmitBtn.addEventListener('click', handleRegister); // handleRegister 現在直接從 GameState.elements 獲取值
    }
    if (elements.loginSubmitBtn) {
        elements.loginSubmitBtn.addEventListener('click', handleLogin); // handleLogin 現在直接從 GameState.elements 獲取值
    }
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }

    // 頂部導航按鈕
    if (elements.monsterInfoButton) {
        elements.monsterInfoButton.addEventListener('click', () => {
            updateMonsterInfoModal(GameState.currentMonster); // 假設 GameState.currentMonster 儲存當前怪獸資訊
            handleOpenModalWrapper('monster-info-modal');
        });
    }
    if (elements.playerInfoButton) {
        elements.playerInfoButton.addEventListener('click', () => {
            // 確保 auth.currentUser 存在才傳遞 uid
            if (GameState.auth.currentUser) {
                openAndPopulatePlayerInfoModal(GameState.auth.currentUser.uid);
                handleOpenModalWrapper('player-info-modal');
            } else {
                showFeedbackModal("提示", "請先登入以查看玩家資訊。", false, true);
            }
        });
    }
    if (elements.showMonsterLeaderboardBtn) {
        elements.showMonsterLeaderboardBtn.addEventListener('click', () => {
            setupMonsterLeaderboardTabs(); // 設置排行榜頁籤
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
            if (elements.friendsListSearchInput) elements.friendsListSearchInput.value = ''; // 清空搜尋輸入框
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

    // 頁籤按鈕 (使用事件委託或直接綁定)
    if (elements.dnaInventoryTab) elements.dnaInventoryTab.addEventListener('click', (event) => handleTabSwitch(event, 'dna-inventory-content', '#dna-farm-tabs'));
    if (elements.monsterFarmTab) elements.monsterFarmTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-farm-content', '#dna-farm-tabs'));
    if (elements.exchangeTab) elements.exchangeTab.addEventListener('click', (event) => handleTabSwitch(event, 'exchange-content', '#dna-farm-tabs'));
    if (elements.homesteadTab) elements.homesteadTab.addEventListener('click', (event) => handleTabSwitch(event, 'homestead-content', '#dna-farm-tabs'));
    if (elements.guildTab) elements.guildTab.addEventListener('click', (event) => handleTabSwitch(event, 'guild-content', '#dna-farm-tabs'));

    if (elements.monsterDetailsInfoTab) elements.monsterDetailsInfoTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-details-tab', '#monster-info-tabs'));
    if (elements.monsterLogsInfoTab) elements.monsterLogsInfoTab.addEventListener('click', (event) => handleTabSwitch(event, 'monster-logs-tab', '#monster-info-tabs'));

    // 模態框關閉按鈕 (使用事件委託，因為它們可能在模態框內容動態載入後才出現)
    if (elements.modalContainer) {
        elements.modalContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-close') || event.target.dataset.modalCloseButton) {
                handleCloseModalWrapper(event);
            }
        });
    }

    // 確認模態框的取消按鈕
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

    // 初始化拖放監聽器 (這個函式已經在 UI 模組中)
    setupDropZones();

    // 針對動態生成的 DNA 碎片和臨時背包物品添加事件委託，處理拖放和點擊
    // 這些事件監聽器已經在 ui.js 的 setupDropZones 中處理，不需要在這裡重複綁定
    // 這裡只保留了針對特定點擊事件的處理，例如臨時背包點擊移動到庫存
    if (elements.temporaryBackpackItemsContainer) {
        elements.temporaryBackpackItemsContainer.addEventListener('click', (event) => {
            const item = event.target.closest('.dna-item[data-source-type="temporary"]'); // 使用更精確的選擇器
            if (item && item.dataset.slotIndex) {
                moveFromTempToInventory(parseInt(item.dataset.slotIndex)); // 呼叫 game-logic.js 中的 moveFromTempToInventory
            }
        });
    }

    if (elements.dnaDrawResultsGrid) {
        elements.dnaDrawResultsGrid.addEventListener('click', (event) => {
            const addButton = event.target.closest('.add-drawn-to-temp-backpack-btn');
            if (addButton && addButton.dataset.dna) {
                const dnaInfo = JSON.parse(addButton.dataset.dna);
                GameLogic.addToTemporaryBackpack(dnaInfo); // 呼叫 GameLogic 中的 addToTemporaryBackpack
                showFeedbackModal("成功", `${dnaInfo.name} 已加入臨時背包！`, true, false); // 顯示成功訊息
                addButton.disabled = true; // 防止重複添加
                addButton.textContent = '已加入'; // 更新按鈕文字
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
                GameLogic.openCultivationSetupModal(cultivateBtn.dataset.monsterId); // 呼叫 game-logic.js 中的 openCultivationSetupModal
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
                // 需要從 GameState.allPublicMonsters 中找到對應的怪獸數據
                const opponentMonster = GameState.allPublicMonsters.find(m => m.id === challengeBtn.dataset.monsterId);
                if (opponentMonster) {
                    promptChallengeMonster(opponentMonster); // 呼叫 game-logic.js 中的 promptChallengeMonster，傳遞完整物件
                } else {
                    showFeedbackModal("錯誤", "找不到要挑戰的怪獸數據。", false, true);
                }
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
    const monsterLeaderboardElementTabs = elements.monsterLeaderboardElementTabs; // 直接從 GameState.elements 獲取
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
