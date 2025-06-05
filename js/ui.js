// js/ui.js

// --- DOM Element References ---
// 將 DOMElements 的聲明和初始化移到這裡，並導出它
// 確保在 DOMContentLoaded 之後調用 initializeDOMElements
export let DOMElements = {
    // Auth Screen
    authScreen: null,
    showRegisterFormBtn: null,
    showLoginFormBtn: null,
    registerModal: null,
    registerNicknameInput: null,
    registerPasswordInput: null,
    registerErrorMsg: null,
    registerSubmitBtn: null,
    loginModal: null,
    loginNicknameInput: null,
    loginPasswordInput: null,
    loginErrorMsg: null,
    loginSubmitBtn: null,
    mainLogoutBtn: null,

    // Game Container & General UI
    gameContainer: null,
    themeSwitcherBtn: null,
    themeIcon: null,
    loadingIndicator: null, //spinner
    feedbackModal: null,
    feedbackModalTitle: null,
    feedbackModalBodyContent: null,
    feedbackModalMessage: null,
    feedbackModalSpinner: null,
    confirmationModal: null,
    confirmationModalTitle: null,
    confirmationModalBody: null,
    confirmActionBtn: null,
    cancelActionBtn: null, // 可能需要，如果確認彈窗有取消按鈕
    officialAnnouncementModal: null,
    officialAnnouncementPlayerName: null,
    officialAnnouncementCloseX: null,


    // Monster Snapshot Area
    monsterSnapshotArea: null,
    monsterSnapshotBaseBg: null,
    monsterSnapshotBodySilhouette: null,
    monsterPartsContainer: null,
    monsterPartHead: null,
    monsterPartLeftArm: null,
    monsterPartRightArm: null,
    monsterPartLeftLeg: null,
    monsterPartRightLeg: null,
    snapshotAchievementTitle: null,
    snapshotNickname: null,
    snapshotEvaluation: null,
    snapshotWinLoss: null,
    snapshotMainContent: null, // For elemental icons, etc.


    // Top Navigation
    monsterInfoButton: null,
    playerInfoButton: null,
    showMonsterLeaderboardBtn: null,
    showPlayerLeaderboardBtn: null,
    friendsListBtn: null,
    newbieGuideBtn: null,

    // Tabs
    dnaFarmTabs: null, // 頁籤按鈕的容器 ID
    monsterInfoTabs: null, // 怪獸資訊彈窗內的頁籤按鈕容器 ID

    // DNA Management Tab
    dnaCombinationSlotsContainer: null, // DNA 組合槽的容器
    combineButton: null,
    dnaDrawButton: null,
    inventoryItemsContainer: null, // 玩家 DNA 碎片的容器
    inventoryDeleteSlot: null, // 刪除槽
    temporaryBackpackContainer: null, // 臨時背包容器

    // Monster Farm Tab
    farmHeaders: null,
    farmedMonstersList: null,

    // Modals
    monsterInfoModal: null,
    monsterInfoModalHeaderContent: null,
    monsterDetailsTabContent: null,
    monsterActivityLogs: null,
    playerInfoModal: null,
    playerInfoModalBody: null,
    monsterLeaderboardModal: null,
    monsterLeaderboardTable: null,
    monsterLeaderboardElementTabs: null, // 怪獸排行榜的元素篩選頁籤容器
    playerLeaderboardModal: null,
    playerLeaderboardTable: null,
    cultivationSetupModal: null,
    cultivationMonsterNameText: null,
    startCultivationBtn: null,
    maxCultivationTimeText: null, // For max cultivation time display
    trainingResultsModal: null,
    trainingResultsModalTitle: null,
    trainingStoryResult: null,
    trainingGrowthResult: null,
    trainingItemsResult: null,
    addAllToTempBackpackBtn: null,
    reminderModal: null,
    reminderConfirmCloseBtn: null,
    reminderCancelBtn: null,
    newbieGuideModal: null,
    newbieGuideSearchInput: null,
    newbieGuideContentArea: null,
    friendsListModal: null,
    friendsListSearchInput: null,
    friendsListContainer: null,
    battleLogModal: null,
    battleLogArea: null,
    closeBattleLogBtn: null,
    dnaDrawModal: null,
    dnaDrawResultsGrid: null,
    closeDnaDrawBtn: null,
};

export function initializeDOMElements() {
    DOMElements.authScreen = document.getElementById('auth-screen');
    DOMElements.showRegisterFormBtn = document.getElementById('show-register-form-btn');
    DOMElements.showLoginFormBtn = document.getElementById('show-login-form-btn');
    DOMElements.registerModal = document.getElementById('register-modal');
    DOMElements.registerNicknameInput = document.getElementById('register-nickname');
    DOMElements.registerPasswordInput = document.getElementById('register-password');
    DOMElements.registerErrorMsg = document.getElementById('register-error');
    DOMElements.registerSubmitBtn = document.getElementById('register-submit-btn');
    DOMElements.loginModal = document.getElementById('login-modal');
    DOMElements.loginNicknameInput = document.getElementById('login-nickname');
    DOMElements.loginPasswordInput = document.getElementById('login-password');
    DOMElements.loginErrorMsg = document.getElementById('login-error');
    DOMElements.loginSubmitBtn = document.getElementById('login-submit-btn');
    DOMElements.mainLogoutBtn = document.getElementById('main-logout-btn');

    DOMElements.gameContainer = document.getElementById('game-container');
    DOMElements.themeSwitcherBtn = document.getElementById('theme-switcher');
    DOMElements.themeIcon = document.getElementById('theme-icon');
    DOMElements.loadingIndicator = document.querySelector('.loading-spinner'); // Use querySelector if it's a class
    DOMElements.feedbackModal = document.getElementById('feedback-modal');
    DOMElements.feedbackModalTitle = document.getElementById('feedback-modal-title');
    DOMElements.feedbackModalBodyContent = document.getElementById('feedback-modal-body-content');
    DOMElements.feedbackModalMessage = document.getElementById('feedback-modal-message');
    DOMElements.feedbackModalSpinner = document.getElementById('feedback-modal-spinner');
    DOMElements.confirmationModal = document.getElementById('confirmation-modal');
    DOMElements.confirmationModalTitle = document.getElementById('confirmation-modal-title');
    DOMElements.confirmationModalBody = document.getElementById('confirmation-modal-body'); // Ensure this ID exists in HTML
    DOMElements.confirmActionBtn = document.getElementById('confirm-action-btn');
    // DOMElements.cancelActionBtn = document.getElementById('cancel-action-btn'); // If you add a cancel button

    DOMElements.officialAnnouncementModal = document.getElementById('official-announcement-modal');
    DOMElements.officialAnnouncementPlayerName = document.getElementById('announcement-player-name');
    DOMElements.officialAnnouncementCloseX = document.getElementById('official-announcement-close-x');


    DOMElements.monsterSnapshotArea = document.getElementById('monster-snapshot-area');
    DOMElements.monsterSnapshotBaseBg = document.getElementById('monster-snapshot-base-bg');
    DOMElements.monsterSnapshotBodySilhouette = document.getElementById('monster-snapshot-body-silhouette');
    DOMElements.monsterPartsContainer = document.getElementById('monster-parts-container');
    DOMElements.monsterPartHead = document.getElementById('monster-part-head');
    DOMElements.monsterPartLeftArm = document.getElementById('monster-part-left-arm');
    DOMElements.monsterPartRightArm = document.getElementById('monster-part-right-arm');
    DOMElements.monsterPartLeftLeg = document.getElementById('monster-part-left-leg');
    DOMElements.monsterPartRightLeg = document.getElementById('monster-part-right-leg');
    DOMElements.snapshotAchievementTitle = document.getElementById('snapshot-achievement-title');
    DOMElements.snapshotNickname = document.getElementById('snapshot-nickname');
    DOMElements.snapshotEvaluation = document.getElementById('snapshot-evaluation');
    DOMElements.snapshotWinLoss = document.getElementById('snapshot-win-loss');
    DOMElements.snapshotMainContent = document.getElementById('snapshot-main-content');


    DOMElements.monsterInfoButton = document.getElementById('monster-info-button');
    DOMElements.playerInfoButton = document.getElementById('player-info-button');
    DOMElements.showMonsterLeaderboardBtn = document.getElementById('show-monster-leaderboard-btn');
    DOMElements.showPlayerLeaderboardBtn = document.getElementById('show-player-leaderboard-btn');
    DOMElements.friendsListBtn = document.getElementById('friends-list-btn');
    DOMElements.newbieGuideBtn = document.getElementById('newbie-guide-btn');

    DOMElements.dnaFarmTabs = document.getElementById('dna-farm-tabs');
    DOMElements.monsterInfoTabs = document.getElementById('monster-info-tabs');

    DOMElements.dnaCombinationSlotsContainer = document.getElementById('dna-combination-slots');
    DOMElements.combineButton = document.getElementById('combine-button');
    DOMElements.dnaDrawButton = document.getElementById('dna-draw-button');
    DOMElements.inventoryItemsContainer = document.getElementById('inventory-items');
    DOMElements.inventoryDeleteSlot = document.getElementById('inventory-delete-slot'); // Make sure this ID exists
    DOMElements.temporaryBackpackContainer = document.getElementById('temporary-backpack-items');

    DOMElements.farmHeaders = document.getElementById('farm-headers');
    DOMElements.farmedMonstersList = document.getElementById('farmed-monsters-list');

    DOMElements.monsterInfoModal = document.getElementById('monster-info-modal');
    DOMElements.monsterInfoModalHeaderContent = document.getElementById('monster-info-modal-header-content');
    DOMElements.monsterDetailsTabContent = document.getElementById('monster-details-tab');
    DOMElements.monsterActivityLogs = document.getElementById('monster-activity-logs');
    DOMElements.playerInfoModal = document.getElementById('player-info-modal');
    DOMElements.playerInfoModalBody = document.getElementById('player-info-modal-body');
    DOMElements.monsterLeaderboardModal = document.getElementById('monster-leaderboard-modal');
    DOMElements.monsterLeaderboardTable = document.getElementById('monster-leaderboard-table');
    DOMElements.monsterLeaderboardElementTabs = document.getElementById('monster-leaderboard-element-tabs');
    DOMElements.playerLeaderboardModal = document.getElementById('player-leaderboard-modal');
    DOMElements.playerLeaderboardTable = document.getElementById('player-leaderboard-table');

    DOMElements.cultivationSetupModal = document.getElementById('cultivation-setup-modal');
    DOMElements.cultivationMonsterNameText = document.getElementById('cultivation-monster-name');
    DOMElements.startCultivationBtn = document.getElementById('start-cultivation-btn');
    DOMElements.maxCultivationTimeText = document.getElementById('max-cultivation-time');

    DOMElements.trainingResultsModal = document.getElementById('training-results-modal');
    DOMElements.trainingResultsModalTitle = document.getElementById('training-results-modal-title');
    DOMElements.trainingStoryResult = document.getElementById('training-story-result');
    DOMElements.trainingGrowthResult = document.getElementById('training-growth-result');
    DOMElements.trainingItemsResult = document.getElementById('training-items-result');
    DOMElements.addAllToTempBackpackBtn = document.getElementById('add-all-to-temp-backpack-btn');

    DOMElements.reminderModal = document.getElementById('reminder-modal');
    DOMElements.reminderConfirmCloseBtn = document.getElementById('reminder-confirm-close-btn');
    DOMElements.reminderCancelBtn = document.getElementById('reminder-cancel-btn');

    DOMElements.newbieGuideModal = document.getElementById('newbie-guide-modal');
    DOMElements.newbieGuideSearchInput = document.getElementById('newbie-guide-search-input');
    DOMElements.newbieGuideContentArea = document.getElementById('newbie-guide-content-area');

    DOMElements.friendsListModal = document.getElementById('friends-list-modal');
    DOMElements.friendsListSearchInput = document.getElementById('friends-list-search-input');
    DOMElements.friendsListContainer = document.getElementById('friends-list-container');

    DOMElements.battleLogModal = document.getElementById('battle-log-modal');
    DOMElements.battleLogArea = document.getElementById('battle-log-area');
    DOMElements.closeBattleLogBtn = document.getElementById('close-battle-log-btn');

    DOMElements.dnaDrawModal = document.getElementById('dna-draw-modal');
    DOMElements.dnaDrawResultsGrid = document.getElementById('dna-draw-results-grid');
    DOMElements.closeDnaDrawBtn = document.getElementById('close-dna-draw-btn');

    console.log("DOMElements initialized in ui.js");
}

// 調用一次以填充 DOMElements 對象 (在 DOMContentLoaded 之後由 main.js 調用會更安全)
// document.addEventListener('DOMContentLoaded', initializeDOMElements);
// 改為由 main.js 統一調用

// --- Theme Management ---
export function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    updateTheme(savedTheme);
    if (DOMElements.themeIcon) {
        DOMElements.themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

export function updateTheme(theme) {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(theme + '-theme');
    localStorage.setItem('theme', theme);
    window.gameStateManager.updateGameState({ currentTheme: theme }); // 使用 gameStateManager
    if (DOMElements.themeIcon) {
        DOMElements.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// --- Modal Management ---
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex'; // Use flex for centering
        window.gameStateManager.updateGameState({ activeModalId: modalId }); // 使用 gameStateManager
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        if (window.gameState.activeModalId === modalId) {
            window.gameStateManager.updateGameState({ activeModalId: null }); // 使用 gameStateManager
        }
    }
}

export function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
    window.gameStateManager.updateGameState({ activeModalId: null }); // 使用 gameStateManager
}

/**
 * 顯示一個通用回饋彈窗。
 * @param {string} title 彈窗標題。
 * @param {string} message 彈窗訊息 (可以是 HTML)。
 * @param {boolean} [showSpinner=false] 是否顯示載入動畫。
 * @param {number|null} [autoCloseDelay=null] 自動關閉延遲時間(毫秒)，null則不自動關閉。
 * @param {Array<Object>} [customButtons=null] 自定義按鈕 [{text: string, class: string, onClick: function}]
 */
export function showFeedbackModal(title, message, showSpinner = false, autoCloseDelay = null, customButtons = null) {
    if (!DOMElements.feedbackModal) {
        console.error("Feedback modal element not found!");
        alert(`${title}: ${message.replace(/<br>/g, "\n")}`); // Fallback
        return;
    }
    if (DOMElements.feedbackModalTitle) DOMElements.feedbackModalTitle.textContent = title;
    if (DOMElements.feedbackModalMessage) DOMElements.feedbackModalMessage.innerHTML = message; // Allow HTML in message
    if (DOMElements.feedbackModalSpinner) DOMElements.feedbackModalSpinner.style.display = showSpinner ? 'block' : 'none';

    const footer = DOMElements.feedbackModal.querySelector('.modal-footer');
    if (footer) footer.remove(); // 清除舊按鈕

    if (customButtons && customButtons.length > 0) {
        const newFooter = document.createElement('div');
        newFooter.className = 'modal-footer';
        customButtons.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.className = `button ${btnConfig.class || 'secondary'}`;
            button.addEventListener('click', () => {
                if (btnConfig.onClick) btnConfig.onClick();
                hideModal('feedback-modal');
            });
            newFooter.appendChild(button);
        });
        DOMElements.feedbackModalBodyContent.parentNode.appendChild(newFooter);
    } else if (!showSpinner && autoCloseDelay === null) { // 如果不是 spinner 且沒有自訂按鈕，則添加預設關閉按鈕
        const newFooter = document.createElement('div');
        newFooter.className = 'modal-footer';
        const closeButton = document.createElement('button');
        closeButton.textContent = '關閉';
        closeButton.className = 'button secondary';
        closeButton.onclick = () => hideModal('feedback-modal');
        newFooter.appendChild(closeButton);
        DOMElements.feedbackModalBodyContent.parentNode.appendChild(newFooter);
    }


    showModal('feedback-modal');

    if (autoCloseDelay !== null && !customButtons) { // 只有在沒有自定義按鈕時才自動關閉
        setTimeout(() => {
            // 檢查彈窗是否仍然是當前活動的，避免關閉由其他操作打開的新彈窗
            if (window.gameState.activeModalId === 'feedback-modal') {
                hideModal('feedback-modal');
            }
        }, autoCloseDelay);
    }
}

/**
 * 顯示一個確認對話框。
 * @param {string} title 標題。
 * @param {string} message 訊息 (可以是 HTML)。
 * @param {function} onConfirm 確認時的回調函數。
 * @param {string} [confirmButtonClass='primary'] 確認按鈕的樣式類別。
 * @param {string} [confirmButtonText='確定'] 確認按鈕的文字。
 * @param {object|null} [monsterToDisplay=null] (可選) 要在確認框中顯示的怪獸對象。
 */
export function showConfirmationModal(title, message, onConfirm, confirmButtonClass = 'primary', confirmButtonText = '確定', monsterToDisplay = null) {
    if (!DOMElements.confirmationModal) {
        console.error("Confirmation modal not found!");
        if (confirm(message)) onConfirm(); // Fallback
        return;
    }

    if (DOMElements.confirmationModalTitle) DOMElements.confirmationModalTitle.textContent = title;
    if (DOMElements.confirmationModalBody) DOMElements.confirmationModalBody.innerHTML = message; // 允許 HTML

    const releaseMonsterImagePlaceholder = DOMElements.confirmationModalBody.querySelector('#release-monster-image-placeholder');
    const releaseMonsterImgPreview = DOMElements.confirmationModalBody.querySelector('#release-monster-img-preview');

    if (monsterToDisplay && releaseMonsterImagePlaceholder && releaseMonsterImgPreview) {
        // 假設 monsterToDisplay 有一個主要的元素可以用來決定預覽圖的顏色或樣式
        const primaryElement = monsterToDisplay.elements ? monsterToDisplay.elements[0] : '無';
        const rarity = monsterToDisplay.rarity || '普通';
        // 這裡可以根據元素和稀有度選擇不同的預覽圖片，或者使用 placeholder
        // 例如: releaseMonsterImgPreview.src = getMonsterImagePlaceholder(primaryElement, rarity);
        // 為了簡化，我們先用一個固定的 placeholder，或者顯示怪獸名字
        releaseMonsterImgPreview.alt = monsterToDisplay.nickname || '怪獸預覽';
        releaseMonsterImgPreview.src = `https://placehold.co/120x90/${getElementColorCode(primaryElement, true)}/${getRarityColorCode(rarity, true)}?text=${encodeURIComponent(monsterToDisplay.nickname?.substring(0,5) || '預覽')}&font=noto-sans-tc`;
        releaseMonsterImagePlaceholder.style.display = 'flex';
    } else if (releaseMonsterImagePlaceholder) {
        releaseMonsterImagePlaceholder.style.display = 'none';
    }


    if (DOMElements.confirmActionBtn) {
        DOMElements.confirmActionBtn.textContent = confirmButtonText;
        DOMElements.confirmActionBtn.className = `button ${confirmButtonClass}`; // 移除舊的，添加新的

        // 移除舊的監聽器以防止重複執行
        const newConfirmBtn = DOMElements.confirmActionBtn.cloneNode(true);
        DOMElements.confirmActionBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.confirmActionBtn);
        DOMElements.confirmActionBtn = newConfirmBtn; // 更新引用

        DOMElements.confirmActionBtn.addEventListener('click', () => {
            onConfirm();
            hideModal('confirmation-modal');
        });
    }
    showModal('confirmation-modal');
}


// --- UI Update Functions ---
export function toggleElementDisplay(element, show, displayStyle = 'block') {
    if (element) {
        element.style.display = show ? displayStyle : 'none';
    }
}

/**
 * 更新UI上的玩家信息（例如名稱和分數）。
 * @param {object} playerInfo - 包含玩家信息的對象，例如 { name: "玩家1", score: 100, uid: "..." }。
 */
export function updatePlayerInfoInUI(playerInfo) {
    // 這些元素應該由 DOMElements 提供
    const playerNameEl = DOMElements.lobbyPlayerName; // 使用 lobbyPlayerName 作為主要顯示
    // const scoreEl = DOMElements.playerScoreDisplay; // 如果有分數顯示
    // const userIdEl = DOMElements.userIdDisplay; // 如果有 UID 顯示

    if (playerNameEl) {
        playerNameEl.textContent = playerInfo.name || "玩家";
    }
    // if (scoreEl) {
    //     scoreEl.textContent = playerInfo.score !== undefined ? playerInfo.score.toString() : '0';
    // }
    // if (userIdEl && playerInfo.uid) {
    //     userIdEl.textContent = `ID: ${playerInfo.uid}`;
    // }
}

// --- DNA Slot Rendering ---
/**
 * 渲染 DNA 組合槽。
 * @param {Array<Object|null>} combinationSlotsData - 包含組合槽中 DNA 數據的數組。
 */
export function renderDNACombinationSlots(combinationSlotsData) {
    if (!DOMElements.dnaCombinationSlotsContainer) {
        console.warn("DNA 組合槽容器未找到 (dna-combination-slots)。");
        return;
    }
    DOMElements.dnaCombinationSlotsContainer.innerHTML = ''; // 清空現有槽
    combinationSlotsData.forEach((dna, index) => {
        const slotElement = document.createElement('div');
        slotElement.classList.add('dna-slot');
        slotElement.dataset.slotIndex = index;

        if (dna) {
            slotElement.classList.add('occupied');
            // 這裡的 dna 應該是完整的 DNAFragment 對象或至少包含顯示所需的信息
            const dnaName = dna.name || '未知DNA';
            const dnaRarity = dna.rarity || '普通';
            const dnaType = dna.type || '無';

            slotElement.innerHTML = `
                <span class="dna-name-text">${dnaName}</span>
                <span class="dna-rarity-badge">${dnaRarity}</span>
            `;
            applyDnaItemStyle(slotElement, dnaType, dnaRarity); // 應用樣式
            slotElement.title = `${dnaName} (${dnaType}屬性, ${dnaRarity}級)\nHP:${dna.hp}, MP:${dna.mp}\n攻:${dna.attack}, 防:${dna.defense}, 速:${dna.speed}, 爆:${dna.crit}`;
            slotElement.dataset.dnaId = dna.id; // 實例ID (如果適用)
            slotElement.dataset.dnaBaseId = dna.baseId || dna.id; // 模板ID
            slotElement.draggable = true;
        } else {
            slotElement.classList.add('empty');
            slotElement.textContent = `槽位 ${index + 1}`;
        }
        DOMElements.dnaCombinationSlotsContainer.appendChild(slotElement);
    });

    // 更新合成按鈕的狀態
    if (DOMElements.combineButton) {
        const validSlotsCount = combinationSlotsData.filter(slot => slot !== null).length;
        DOMElements.combineButton.disabled = validSlotsCount < 2;
    }
}


/**
 * 渲染玩家擁有的 DNA 碎片庫存。
 * @param {Array<Object>} ownedDnaList - 玩家擁有的 DNA 列表。
 */
export function renderPlayerDNAInventory(ownedDnaList) {
    if (!DOMElements.inventoryItemsContainer) {
        console.warn("DNA 庫存容器未找到 (inventory-items)。");
        return;
    }
    DOMElements.inventoryItemsContainer.innerHTML = ''; // 清空

    if (ownedDnaList && ownedDnaList.length > 0) {
        ownedDnaList.forEach(dna => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('dna-item'); // Use 'dna-item' for styling draggable items
            itemElement.draggable = true;
            itemElement.dataset.dnaId = dna.id; // Store instance ID
            itemElement.dataset.dnaBaseId = dna.baseId || dna.id; // Store base template ID

            const dnaName = dna.name || '未知DNA';
            const dnaRarity = dna.rarity || '普通';
            const dnaType = dna.type || '無';

            itemElement.innerHTML = `
                <span class="dna-name-text">${dnaName}</span>
                <span class="dna-rarity-badge">${dnaRarity}</span>
            `;
            applyDnaItemStyle(itemElement, dnaType, dnaRarity);
            itemElement.title = `${dnaName} (${dnaType}屬性, ${dnaRarity}級)\nHP:${dna.hp}, MP:${dna.mp}\n攻:${dna.attack}, 防:${dna.defense}, 速:${dna.speed}, 爆:${dna.crit}`;
            DOMElements.inventoryItemsContainer.appendChild(itemElement);
        });
    } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.classList.add('inventory-slot-empty', 'col-span-full'); // Make it span all columns
        emptyMsg.textContent = 'DNA庫存是空的。';
        DOMElements.inventoryItemsContainer.appendChild(emptyMsg);
    }

    // 添加刪除槽 (如果不存在)
    if (!DOMElements.inventoryDeleteSlot && DOMElements.inventoryItemsContainer.parentNode) {
        const deleteSlotContainer = document.createElement('div');
        deleteSlotContainer.id = 'inventory-delete-slot-container';
        deleteSlotContainer.classList.add('panel-title-container', 'mt-4');
        deleteSlotContainer.innerHTML = `<h3 class="panel-title dna-panel-title text-sm">🗑️ 拖曳至此刪除</h3>`;

        const deleteSlot = document.createElement('div');
        deleteSlot.id = 'inventory-delete-slot';
        deleteSlot.classList.add('inventory-delete-slot', 'p-4', 'mt-2'); // Add some padding and margin
        deleteSlot.innerHTML = `<span class="delete-slot-main-text">刪除區</span><span class="delete-slot-sub-text">(拖曳DNA到此處刪除)</span>`;
        deleteSlotContainer.appendChild(deleteSlot);

        DOMElements.inventoryItemsContainer.parentNode.appendChild(deleteSlotContainer);
        DOMElements.inventoryDeleteSlot = deleteSlot; // 更新引用
    }
}

// ... (其他 UI 函數如 renderMonsterFarm, updateMonsterSnapshot, updateMonsterInfoModal, etc. 將保持不變或稍作調整以使用 DOMElements 和 gameStateManager)
// 這裡僅展示部分關鍵的修復和結構。

/**
 * 根據 DNA 的類型和稀有度應用樣式。
 * @param {HTMLElement} element 要應用樣式的 HTML 元素。
 * @param {string} type DNA 類型 (例如 '火', '水')。
 * @param {string} rarity DNA 稀有度 (例如 '普通', '稀有')。
 */
export function applyDnaItemStyle(element, type, rarity) {
    if (!element) return;

    // 移除舊的元素和稀有度相關 class
    const classList = element.classList;
    for (let i = classList.length - 1; i >= 0; i--) {
        const className = classList[i];
        if (className.startsWith('element-') || className.startsWith('rarity-') || className.startsWith('bg-element-') || className.startsWith('border-element-')) {
            classList.remove(className);
        }
    }

    // 應用新的文字顏色 class (來自 theme.css)
    const typeClass = `text-element-${type.toLowerCase()}`;
    const rarityClass = `text-rarity-${rarity.toLowerCase().replace(/\s+/g, '-')}`;
    element.classList.add(typeClass, rarityClass);

    // 應用背景和邊框顏色 (基於 theme.css 中的 RGB 變數)
    const rarityRgbVar = `--rarity-${rarity.toLowerCase().replace(/\s+/g, '-')}-rgb`;
    const defaultRgbVar = '--default-rgb'; // 一個後備的 RGB 變數

    // 從 CSS 變數獲取 RGB 值
    const style = getComputedStyle(document.documentElement);
    const rgbString = style.getPropertyValue(rarityRgbVar).trim() || style.getPropertyValue(defaultRgbVar).trim();

    if (rgbString) {
        element.style.backgroundColor = `rgba(${rgbString}, 0.15)`; // 背景半透明
        element.style.borderColor = `rgba(${rgbString}, 0.7)`;   // 邊框較不透明
    } else {
        // Fallback if RGB variable not found
        element.style.backgroundColor = 'var(--bg-slot)'; // 預設背景
        element.style.borderColor = 'var(--border-color)'; // 預設邊框
    }

    // 確保文字顏色優先於背景 (如果背景太深)
    const nameTextSpan = element.querySelector('.dna-name-text');
    if (nameTextSpan) {
        nameTextSpan.style.color = `var(--${typeClass})`; // 假設 text-element-xxx 是定義好的文字顏色變數
    }
}


// ... (其他的 UI 函數，如 updateMonsterSnapshot, renderMonsterFarm, updatePlayerInfoModal, etc.)
// 請確保這些函數都使用 DOMElements 和從 gameStateManager 獲取的 gameState。

export function updateMonsterSnapshot(monster) {
    if (!DOMElements.monsterSnapshotArea) return;

    const defaultBaseBg = "https://github.com/msw2004727/MD/blob/main/images/a001.png?raw=true";
    const defaultBodySilhouette = "https://github.com/msw2004727/MD/blob/main/images/mb01.png?raw=true";

    if (monster) {
        DOMElements.monsterSnapshotBaseBg.src = monster.baseImage || defaultBaseBg;
        DOMElements.monsterSnapshotBodySilhouette.src = monster.bodySilhouetteImage || defaultBodySilhouette;

        // 更新部位圖片 (假設 monster 對象中有 parts 屬性)
        const parts = monster.parts || {};
        const partMapping = window.gameStateManager.getGameState().dnaSlotToBodyPartMapping || {};

        Object.keys(partMapping).forEach(slotKey => {
            const partName = partMapping[slotKey]; // e.g., 'head'
            const partElement = DOMElements[`monsterPart${partName.charAt(0).toUpperCase() + partName.slice(1)}`]; // e.g., DOMElements.monsterPartHead
            if (partElement) {
                if (parts[partName] && parts[partName].image) {
                    partElement.style.backgroundImage = `url('${parts[partName].image}')`;
                    partElement.classList.remove('empty-part');
                    partElement.style.borderColor = 'transparent'; // 有圖時隱藏虛線框
                } else {
                    partElement.style.backgroundImage = 'none';
                    partElement.classList.add('empty-part');
                    partElement.style.borderColor = 'var(--accent-color)'; // 無圖時顯示虛線框
                }
            }
        });


        if (DOMElements.snapshotAchievementTitle) DOMElements.snapshotAchievementTitle.textContent = monster.title || (monster.monsterTitles && monster.monsterTitles[0]) || "無";
        if (DOMElements.snapshotNickname) DOMElements.snapshotNickname.textContent = monster.nickname || "未知怪獸";
        if (DOMElements.snapshotEvaluation) DOMElements.snapshotEvaluation.textContent = `總評價: ${monster.score || 0}`;

        if (DOMElements.snapshotWinLoss) {
            const resume = monster.resume || { wins: 0, losses: 0 };
            DOMElements.snapshotWinLoss.innerHTML = `<span>勝: ${resume.wins}</span><span>敗: ${resume.losses}</span>`;
        }

        if (DOMElements.snapshotMainContent) {
            DOMElements.snapshotMainContent.innerHTML = ''; // 清空
            if (monster.elements && monster.elements.length > 0) {
                monster.elements.forEach(element => {
                    const elSpan = document.createElement('span');
                    elSpan.textContent = element;
                    elSpan.className = `element-icon text-element-${element.toLowerCase()}`; // 假設有 CSS class
                    elSpan.style.margin = '0 3px';
                    elSpan.style.padding = '2px 5px';
                    elSpan.style.borderRadius = '3px';
                    elSpan.style.backgroundColor = `var(--element-${element.toLowerCase()}-bg)`;
                    DOMElements.snapshotMainContent.appendChild(elSpan);
                });
            }
        }
        if(DOMElements.monsterInfoButton) DOMElements.monsterInfoButton.disabled = false;

    } else { // No monster selected or monster is null
        DOMElements.monsterSnapshotBaseBg.src = defaultBaseBg;
        DOMElements.monsterSnapshotBodySilhouette.src = defaultBodySilhouette;

        // 清空所有部位
        Object.values(window.gameStateManager.getGameState().dnaSlotToBodyPartMapping || {}).forEach(partName => {
            const partElement = DOMElements[`monsterPart${partName.charAt(0).toUpperCase() + partName.slice(1)}`];
            if (partElement) {
                partElement.style.backgroundImage = 'none';
                partElement.classList.add('empty-part');
                partElement.style.borderColor = 'var(--accent-color)';
            }
        });

        if (DOMElements.snapshotAchievementTitle) DOMElements.snapshotAchievementTitle.textContent = "未選擇";
        if (DOMElements.snapshotNickname) DOMElements.snapshotNickname.textContent = "---";
        if (DOMElements.snapshotEvaluation) DOMElements.snapshotEvaluation.textContent = "總評價: -";
        if (DOMElements.snapshotWinLoss) DOMElements.snapshotWinLoss.innerHTML = `<span>勝: -</span><span>敗: -</span>`;
        if (DOMElements.snapshotMainContent) DOMElements.snapshotMainContent.innerHTML = '';
        if(DOMElements.monsterInfoButton) DOMElements.monsterInfoButton.disabled = true;
    }
}


// --- 繼續添加其他 UI 更新函數，例如：---
// renderMonsterFarm, updatePlayerInfoModal, updateMonsterLeaderboardElementTabs,
// updateLeaderboardTable, updateNewbieGuideModal, updateFriendsListModal,
// showBattleLogModal, showDnaDrawModal, updateAnnouncementPlayerName, startHintScrolling
// 確保它們都從 DOMElements 獲取DOM引用，並從 gameStateManager 獲取狀態。

export function renderMonsterFarm(monsters) {
    if (!DOMElements.farmedMonstersList) return;
    DOMElements.farmedMonstersList.innerHTML = '';

    if (!monsters || monsters.length === 0) {
        DOMElements.farmedMonstersList.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">農場空空如也，快去組合怪獸吧！</p>`;
        return;
    }

    monsters.forEach(monster => {
        const item = document.createElement('div');
        item.classList.add('farm-monster-item', 'cursor-pointer');
        item.dataset.monsterId = monster.id;

        let statusText = '待命中';
        let statusClass = '';
        if (monster.farmStatus?.isBattling) {
            statusText = '戰鬥中'; statusClass = 'battling';
        } else if (monster.farmStatus?.isTraining) {
            statusText = '修煉中'; statusClass = 'active';
        }

        item.innerHTML = `
            <div>
                <input type="radio" name="selected-monster-radio" value="${monster.id}" id="radio-${monster.id}" class="mr-1">
                <label for="radio-${monster.id}" class="farm-monster-name font-semibold text-[var(--accent-color)]">${monster.nickname}</label>
            </div>
            <div class="farm-monster-elements hidden sm:block">${monster.elements.join(', ')}</div>
            <div class="farm-monster-status ${statusClass}">${statusText}</div>
            <div class="farm-monster-score hidden sm:block text-[var(--success-color)]">${monster.score || 0}</div>
            <div class="farm-monster-actions-group flex gap-1">
                <button class="farm-battle-btn button success" title="挑戰對手">⚔️</button>
                <button class="farm-monster-cultivate-btn button warning text-xs p-1" title="修煉">🌱</button>
                <button class="farm-monster-release-btn button danger text-xs p-1" title="放生">♻️</button>
            </div>
        `;

        const radioBtn = item.querySelector('input[type="radio"]');
        if (monster.id === window.gameState.selectedMonsterId) {
            radioBtn.checked = true;
        }
        radioBtn.addEventListener('change', (e) => {
            if (e.target.checked) {
                window.gameStateManager.updateGameState({ selectedMonsterId: monster.id });
                updateMonsterSnapshot(monster);
                 // 更新所有radio按鈕的選中狀態
                document.querySelectorAll('input[name="selected-monster-radio"]').forEach(r => {
                    if (r !== e.target) r.checked = false;
                });
            }
        });
        // 允許點擊整行選中
        item.addEventListener('click', (e) => {
            if (e.target.type !== 'radio' && !e.target.closest('button')) { // 避免重複觸發或干擾按鈕
                radioBtn.checked = true;
                radioBtn.dispatchEvent(new Event('change')); // 手動觸發 change 事件
            }
        });


        item.querySelector('.farm-battle-btn').addEventListener('click', (e) => window.gameLogic.handleChallengeMonsterClick(e, monster.id, window.gameState.playerId));
        item.querySelector('.farm-monster-cultivate-btn').addEventListener('click', (e) => window.gameLogic.handleCultivateMonsterClick(e, monster.id));
        item.querySelector('.farm-monster-release-btn').addEventListener('click', (e) => window.gameLogic.handleReleaseMonsterClick(e, monster.id));

        DOMElements.farmedMonstersList.appendChild(item);
    });
}

export function renderTemporaryBackpack(items) {
    if (!DOMElements.temporaryBackpackContainer) return;
    DOMElements.temporaryBackpackContainer.innerHTML = '';

    if (!items || items.length === 0) {
        DOMElements.temporaryBackpackContainer.innerHTML = `<div class="inventory-slot-empty col-span-full text-center py-2">臨時背包是空的。</div>`;
        return;
    }

    items.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.classList.add('temp-backpack-slot', 'occupied'); // 假設所有物品都是有效的
        slot.dataset.tempIndex = index;

        if (item.type === 'dna' && item.data) {
            const dna = item.data;
            slot.innerHTML = `
                <span class="dna-name-text">${dna.name}</span>
                <span class="dna-rarity-badge">${dna.rarity}</span>
            `;
            applyDnaItemStyle(slot, dna.type, dna.rarity);
            slot.title = `${dna.name} (${dna.type}, ${dna.rarity})\n點擊以移至DNA庫存`;
            slot.addEventListener('click', () => window.gameLogic.handleMoveFromTempBackpackToInventory(index));
        } else {
            slot.textContent = '未知物品';
        }
        DOMElements.temporaryBackpackContainer.appendChild(slot);
    });
}


/**
 * 切換頁籤內容的顯示。
 * @param {string} targetTabId 要顯示的頁籤內容的 ID。
 * @param {HTMLElement} clickedButton 被點擊的頁籤按鈕元素。
 * @param {string} [tabContainerId='dna-farm-tabs'] 包含頁籤按鈕的容器的 ID。
 */
export function switchTabContent(targetTabId, clickedButton, tabContainerId = 'dna-farm-tabs') {
    const tabContainer = document.getElementById(tabContainerId);
    if (!tabContainer) {
        console.warn(`Tab container with ID '${tabContainerId}' not found.`);
        return;
    }

    // 隱藏所有與此容器相關的頁籤內容
    const contentParent = tabContainer.nextElementSibling?.id === targetTabId ? tabContainer.nextElementSibling.parentNode : (tabContainer.parentNode.querySelector(`#${targetTabId}`)?.parentNode || document);
    contentParent.querySelectorAll('.tab-content').forEach(content => {
        // 確保只隱藏與當前頁籤組相關的內容
        if (content.id.startsWith(tabContainerId.replace('-tabs', '')) || content.closest('.modal-content')) { // 簡化判斷，或者更精確地標記
            content.classList.remove('active');
        }
    });


    // 移除所有同組按鈕的 active class
    tabContainer.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // 顯示目標頁籤內容並激活按鈕
    const targetContent = document.getElementById(targetTabId);
    if (targetContent) {
        targetContent.classList.add('active');
        clickedButton.classList.add('active');
    } else {
        console.warn(`Tab content with ID '${targetTabId}' not found.`);
    }
}

// 其他依賴於 DOMElements 和 gameState 的 UI 函數...
// (例如：updatePlayerInfoModal, updateMonsterInfoModal, updateMonsterLeaderboardElementTabs, updateLeaderboardTable 等)
// 確保這些函數在 initializeDOMElements 之後被調用，並且能夠訪問 DOMElements 和 gameState。

// 此處省略了其餘的 UI 函數以保持簡潔，但它們應遵循相同的模式：
// 1. 從 DOMElements 獲取 DOM 引用。
// 2. 從 gameState (通過 gameStateManager.getGameState()) 獲取數據。
// 3. 更新 DOM。

export function getElementColorCode(elementName, forUrl = false) {
    const colors = {
        '火': forUrl ? 'e74c3c' : '#e74c3c', '水': forUrl ? '3498db' : '#3498db',
        '木': forUrl ? '2ecc71' : '#2ecc71', '金': forUrl ? 'f1c40f' : '#f1c40f',
        '土': forUrl ? 'a97c50' : '#a97c50', '光': forUrl ? 'f0f0f0' : '#f0f0f0',
        '暗': forUrl ? '505050' : '#505050', '毒': forUrl ? '8e44ad' : '#8e44ad',
        '風': forUrl ? '1abc9c' : '#1abc9c', '無': forUrl ? 'bdc3c7' : '#bdc3c7',
        '混': forUrl ? '7f8c8d' : '#7f8c8d'
    };
    return colors[elementName] || (forUrl ? 'cccccc' : '#cccccc');
}

export function getRarityColorCode(rarityName, forUrl = false) {
    const colors = {
        '普通': forUrl ? 'bdc3c7' : '#bdc3c7', '稀有': forUrl ? '3498db' : '#3498db',
        '菁英': forUrl ? 'e67e22' : '#e67e22', '傳奇': forUrl ? 'f1c40f' : '#f1c40f',
        '神話': forUrl ? '9b59b6' : '#9b59b6'
    };
    return colors[rarityName] || (forUrl ? 'aaaaaa' : '#aaaaaa');
}

// 確保在 main.js 中調用 initializeDOMElements
console.log("UI module loaded. Call initializeDOMElements() after DOM is ready.");

// 繼續添加其餘的 ui.js 函數...
// 例如：updatePlayerInfoModal, updateMonsterInfoModal, updateLeaderboardTable, updateNewbieGuideModal, updateFriendsListModal, showBattleLogModal, showDnaDrawModal, startHintScrolling, updateAnnouncementPlayerName

export function updatePlayerInfoModal(playerData, gameConfigs) {
    /* ... */
}
export function updateMonsterInfoModal(monster, gameConfigs) {
    /* ... */
}
export function updateMonsterLeaderboardElementTabs(elements) {
    /* ... */
}
export function updateLeaderboardTable(type, data) {
    /* ... */
}
export function updateLeaderboardSortIcons(tableElement, sortKey, sortOrder) {
    /* ... */
}
export function updateNewbieGuideModal(guideEntries, searchTerm = "") {
    /* ... */
}
export function updateFriendsListModal(friends) {
    /* ... */
}
export function showBattleLogModal(logEntries, winnerName, loserName) {
    /* ... */
}
export function showDnaDrawModal(drawnItems) {
    /* ... */
}
export function startHintScrolling(container, hints) {
    /* ... */
}
export function updateAnnouncementPlayerName(playerName) {
    /* ... */
}
