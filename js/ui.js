// js/ui.js

// 注意：此檔案會依賴 gameState (來自 js/game-state.js) 和其他輔助函數

// --- DOM Element Selectors (集中管理，方便維護) ---
const DOMElements = {
    // Auth Screen
    authScreen: document.getElementById('auth-screen'),
    gameContainer: document.getElementById('game-container'),
    showLoginFormBtn: document.getElementById('show-login-form-btn'),
    showRegisterFormBtn: document.getElementById('show-register-form-btn'),
    // logoutBtn: document.getElementById('logout-btn'), // 原右上角登出按鈕，已由 main-logout-btn 取代
    mainLogoutBtn: document.getElementById('main-logout-btn'), // 新左上角登出按鈕

    // Register Modal
    registerModal: document.getElementById('register-modal'),
    registerNicknameInput: document.getElementById('register-nickname'),
    registerPasswordInput: document.getElementById('register-password'),
    registerErrorMsg: document.getElementById('register-error'),
    registerSubmitBtn: document.getElementById('register-submit-btn'),
    
    // Login Modal
    loginModal: document.getElementById('login-modal'),
    loginNicknameInput: document.getElementById('login-nickname'),
    loginPasswordInput: document.getElementById('login-password'),
    loginErrorMsg: document.getElementById('login-error'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),

    // Theme Switcher
    themeSwitcherBtn: document.getElementById('theme-switcher'),
    themeIcon: document.getElementById('theme-icon'),

    // Monster Snapshot Panel
    monsterSnapshotArea: document.getElementById('monster-snapshot-area'),
    monsterImage: document.getElementById('monster-image'),
    snapshotAchievementTitle: document.getElementById('snapshot-achievement-title'),
    snapshotNickname: document.getElementById('snapshot-nickname'),
    snapshotWinLoss: document.getElementById('snapshot-win-loss'),
    snapshotEvaluation: document.getElementById('snapshot-evaluation'),
    snapshotMainContent: document.getElementById('snapshot-main-content'), // 用於顯示屬性等

    // Top Navigation Buttons
    monsterInfoButton: document.getElementById('monster-info-button'),
    playerInfoButton: document.getElementById('player-info-button'),
    showMonsterLeaderboardBtn: document.getElementById('show-monster-leaderboard-btn'),
    showPlayerLeaderboardBtn: document.getElementById('show-player-leaderboard-btn'),
    friendsListBtn: document.getElementById('friends-list-btn'),
    newbieGuideBtn: document.getElementById('newbie-guide-btn'),

    // DNA Combination Panel
    dnaCombinationSlotsContainer: document.getElementById('dna-combination-slots'),
    combineButton: document.getElementById('combine-button'),
    dnaDrawButton: document.getElementById('dna-draw-button'), // 抽取DNA按鈕

    // DNA Inventory Panel
    inventoryItemsContainer: document.getElementById('inventory-items'),
    
    // Temporary Backpack
    temporaryBackpackContainer: document.getElementById('temporary-backpack-items'),

    // Monster Farm Panel
    farmedMonstersListContainer: document.getElementById('farmed-monsters-list'),
    farmHeaders: document.getElementById('farm-headers'), // 農場表頭

    // Tabs
    dnaFarmTabs: document.getElementById('dna-farm-tabs'),
    dnaInventoryContent: document.getElementById('dna-inventory-content'),
    monsterFarmContent: document.getElementById('monster-farm-content'),
    trainingGroundContent: document.getElementById('training-ground-content'), // 訓練場頁籤內容
    exchangeContent: document.getElementById('exchange-content'),
    homesteadContent: document.getElementById('homestead-content'),
    guildContent: document.getElementById('guild-content'),

    // Modals
    monsterInfoModal: document.getElementById('monster-info-modal'),
    monsterInfoModalHeader: document.getElementById('monster-info-modal-header-content'),
    monsterInfoTabs: document.getElementById('monster-info-tabs'),
    monsterDetailsTabContent: document.getElementById('monster-details-tab'),
    monsterLogsTabContent: document.getElementById('monster-logs-tab'),
    monsterActivityLogsContainer: document.getElementById('monster-activity-logs'),

    playerInfoModal: document.getElementById('player-info-modal'),
    playerInfoModalBody: document.getElementById('player-info-modal-body'),

    feedbackModal: document.getElementById('feedback-modal'),
    feedbackModalCloseX: document.getElementById('feedback-modal-close-x'),
    feedbackModalTitle: document.getElementById('feedback-modal-title'),
    feedbackModalSpinner: document.getElementById('feedback-modal-spinner'),
    feedbackModalMessage: document.getElementById('feedback-modal-message'),
    feedbackMonsterDetails: document.getElementById('feedback-monster-details'),

    confirmationModal: document.getElementById('confirmation-modal'),
    confirmationModalTitle: document.getElementById('confirmation-modal-title'),
    confirmationModalBody: document.getElementById('confirmation-modal-body'),
    releaseMonsterImagePlaceholder: document.getElementById('release-monster-image-placeholder'),
    releaseMonsterImgPreview: document.getElementById('release-monster-img-preview'),
    confirmActionBtn: document.getElementById('confirm-action-btn'),
    cancelActionBtn: document.getElementById('cancel-action-btn'),

    cultivationSetupModal: document.getElementById('cultivation-setup-modal'),
    cultivationSetupModalTitle: document.getElementById('cultivation-setup-modal-title'),
    cultivationMonsterNameText: document.getElementById('cultivation-monster-name'),
    startCultivationBtn: document.getElementById('start-cultivation-btn'),
    maxCultivationTimeText: document.getElementById('max-cultivation-time'),

    trainingResultsModal: document.getElementById('training-results-modal'),
    trainingResultsModalTitle: document.getElementById('training-results-modal-title'),
    trainingStoryResult: document.getElementById('training-story-result'),
    trainingGrowthResult: document.getElementById('training-growth-result'),
    trainingItemsResult: document.getElementById('training-items-result'),
    addAllToTempBackpackBtn: document.getElementById('add-all-to-temp-backpack-btn'),
    closeTrainingResultsBtn: document.getElementById('close-training-results-btn'), 
    finalCloseTrainingResultsBtn: document.getElementById('final-close-training-results-btn'), 

    newbieGuideModal: document.getElementById('newbie-guide-modal'),
    newbieGuideSearchInput: document.getElementById('newbie-guide-search-input'),
    newbieGuideContentArea: document.getElementById('newbie-guide-content-area'),

    reminderModal: document.getElementById('reminder-modal'),
    reminderConfirmCloseBtn: document.getElementById('reminder-confirm-close-btn'),
    reminderCancelBtn: document.getElementById('reminder-cancel-btn'),
    
    friendsListModal: document.getElementById('friends-list-modal'),
    friendsListSearchInput: document.getElementById('friends-list-search-input'),
    friendsListContainer: document.getElementById('friends-list-container'),

    monsterLeaderboardModal: document.getElementById('monster-leaderboard-modal'),
    monsterLeaderboardTabsContainer: document.getElementById('monster-leaderboard-tabs-container'),
    monsterLeaderboardElementTabs: document.getElementById('monster-leaderboard-element-tabs'),
    monsterLeaderboardTableContainer: document.getElementById('monster-leaderboard-table-container'),
    monsterLeaderboardTable: document.getElementById('monster-leaderboard-table'),

    playerLeaderboardModal: document.getElementById('player-leaderboard-modal'),
    playerLeaderboardTableContainer: document.getElementById('player-leaderboard-table-container'),
    playerLeaderboardTable: document.getElementById('player-leaderboard-table'),

    battleLogModal: document.getElementById('battle-log-modal'),
    battleLogArea: document.getElementById('battle-log-area'),
    closeBattleLogBtn: document.getElementById('close-battle-log-btn'),

    dnaDrawModal: document.getElementById('dna-draw-modal'),
    dnaDrawResultsGrid: document.getElementById('dna-draw-results-grid'),
    closeDnaDrawBtn: document.getElementById('close-dna-draw-btn'),

    officialAnnouncementModal: document.getElementById('official-announcement-modal'),
    officialAnnouncementCloseX: document.getElementById('official-announcement-close-x'), // Specific X for announcement
    announcementPlayerName: document.getElementById('announcement-player-name'),
    // closeAnnouncementBtn: document.getElementById('close-announcement-btn'), // "我知道了"按鈕已在HTML移除

    // Scrolling Hints
    scrollingHintsContainer: document.querySelector('.scrolling-hints-container'),
};

// --- Helper Functions ---

/**
 * 切換元素的顯示狀態 (display: none/block 或 flex)
 * @param {HTMLElement} element
 * @param {boolean} show true 則顯示, false 則隱藏
 * @param {string} displayType 顯示時的 display 類型 (預設 'block')
 */
function toggleElementDisplay(element, show, displayType = 'block') {
    if (element) {
        element.style.display = show ? displayType : 'none';
    }
}

/**
 * 顯示 Modal 彈窗
 * @param {string} modalId 要顯示的 Modal 的 ID
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex'; 
        gameState.activeModalId = modalId;
    }
}

/**
 * 隱藏 Modal 彈窗
 * @param {string} modalId 要隱藏的 Modal 的 ID
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        if (gameState.activeModalId === modalId) {
            gameState.activeModalId = null;
        }
    }
}

/**
 * 隱藏所有 Modal 彈窗
 */
function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.style.display = 'none');
    gameState.activeModalId = null;
}

/**
 * 顯示回饋訊息 Modal
 * @param {string} title 標題
 * @param {string} message 訊息內容 (可以是 HTML)
 * @param {boolean} isLoading 是否顯示載入中 spinner
 * @param {object|null} monsterDetails (可選) 怪獸詳細資料用於顯示
 * @param {Array<object>|null} actionButtons (可選) 按鈕配置 [{ text: '按鈕文字', class: 'primary/secondary/danger', onClick: function }]
 */
function showFeedbackModal(title, message, isLoading = false, monsterDetails = null, actionButtons = null) {
    DOMElements.feedbackModalTitle.textContent = title;
    DOMElements.feedbackModalMessage.innerHTML = message; 
    toggleElementDisplay(DOMElements.feedbackModalSpinner, isLoading);

    if (monsterDetails) {
        // DOMElements.feedbackMonsterDetails.innerHTML = renderMonsterFeedbackDetails(monsterDetails);
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, true);
    } else {
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, false);
    }
    
    const footer = DOMElements.feedbackModal.querySelector('.modal-footer');
    if (footer) footer.remove(); 

    if (actionButtons && actionButtons.length > 0) {
        const newFooter = document.createElement('div');
        newFooter.className = 'modal-footer';
        actionButtons.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.className = btnConfig.class || 'secondary';
            button.onclick = () => {
                if (btnConfig.onClick) btnConfig.onClick();
                hideModal('feedback-modal'); 
            };
            newFooter.appendChild(button);
        });
        DOMElements.feedbackModal.querySelector('.modal-content').appendChild(newFooter);
    } else {
        DOMElements.feedbackModalCloseX.onclick = () => hideModal('feedback-modal');
    }

    showModal('feedback-modal');
}

/**
 * 顯示確認 Modal
 * @param {string} title 標題
 * @param {string} message 確認訊息
 * @param {function} onConfirm 確認後執行的回調函數
 * @param {string} confirmButtonClass (可選) 確認按鈕的 class (預設 'danger')
 * @param {string} confirmButtonText (可選) 確認按鈕的文字 (預設 '確定')
 * @param {object|null} monsterToRelease (可選) 如果是放生怪獸，傳入怪獸物件以顯示圖片
 */
function showConfirmationModal(title, message, onConfirm, confirmButtonClass = 'danger', confirmButtonText = '確定', monsterToRelease = null) {
    DOMElements.confirmationModalTitle.textContent = title;
    DOMElements.confirmationModalBody.innerHTML = `<p>${message}</p>`; 

    if (monsterToRelease && monsterToRelease.id) { 
        const imgPlaceholder = DOMElements.releaseMonsterImagePlaceholder;
        const imgPreview = DOMElements.releaseMonsterImgPreview;
        const monsterPrimaryElement = monsterToRelease.elements && monsterToRelease.elements.length > 0 ? monsterToRelease.elements[0] : '無';
        imgPreview.src = getMonsterImagePath(monsterPrimaryElement, monsterToRelease.rarity); 
        imgPreview.alt = monsterToRelease.nickname || '怪獸圖片';
        toggleElementDisplay(imgPlaceholder, true, 'flex');
    } else {
        toggleElementDisplay(DOMElements.releaseMonsterImagePlaceholder, false);
    }

    DOMElements.confirmActionBtn.textContent = confirmButtonText;
    DOMElements.confirmActionBtn.className = confirmButtonClass; 
    
    const newConfirmBtn = DOMElements.confirmActionBtn.cloneNode(true);
    DOMElements.confirmActionBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.confirmActionBtn);
    DOMElements.confirmActionBtn = newConfirmBtn; 

    DOMElements.confirmActionBtn.onclick = () => {
        onConfirm();
        hideModal('confirmation-modal');
    };
    showModal('confirmation-modal');
}


// --- UI Update Functions ---

/**
 * 更新主題 (light/dark)
 * @param {'light' | 'dark'} themeName
 */
function updateTheme(themeName) {
    document.body.className = themeName === 'light' ? 'light-theme' : '';
    DOMElements.themeIcon.textContent = themeName === 'light' ? '☀️' : '🌙';
    gameState.currentTheme = themeName;
    localStorage.setItem('theme', themeName); 
}

/**
 * 初始化主題 (從 localStorage 或預設)
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
    updateTheme(savedTheme);
}

/**
 * 更新怪獸快照面板
 * @param {object | null} monster 怪獸物件，或 null 表示無選中怪獸
 */
function updateMonsterSnapshot(monster) {
    if (monster && monster.id) {
        DOMElements.snapshotAchievementTitle.textContent = monster.title || (monster.monsterTitles && monster.monsterTitles.length > 0 ? monster.monsterTitles[0] : '新秀');
        DOMElements.snapshotNickname.textContent = monster.nickname || '未知怪獸';
        
        const resume = monster.resume || { wins: 0, losses: 0 };
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: ${resume.wins}</span><span>敗: ${resume.losses}</span>`;
        
        DOMElements.snapshotEvaluation.textContent = `總評價: ${monster.score || 0}`;
        
        const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
        DOMElements.monsterImage.src = getMonsterImagePath(primaryElement, monster.rarity);
        DOMElements.monsterImage.alt = monster.nickname || '怪獸圖片';

        let elementsHtml = '<div class="flex justify-center items-center space-x-1 mt-1">';
        if (monster.elements && monster.elements.length > 0) {
            monster.elements.forEach(element => {
                elementsHtml += `<span class="text-xs px-1.5 py-0.5 rounded-full text-element-${element.toLowerCase()} bg-element-${element.toLowerCase()}-bg">${element}</span>`;
            });
        } else {
            elementsHtml += `<span class="text-xs px-1.5 py-0.5 rounded-full text-element-無 bg-element-無-bg">無</span>`;
        }
        elementsHtml += '</div>';
        DOMElements.snapshotMainContent.innerHTML = elementsHtml;

        const rarityColorVar = `var(--rarity-${monster.rarity.toLowerCase()}-text)`;
        DOMElements.monsterSnapshotArea.style.borderColor = rarityColorVar;
        DOMElements.monsterSnapshotArea.style.boxShadow = `0 0 10px -2px ${rarityColorVar}, inset 0 0 15px -5px color-mix(in srgb, ${rarityColorVar} 30%, transparent)`;

        DOMElements.monsterInfoButton.disabled = false;
        gameState.selectedMonsterId = monster.id;
    } else {
        DOMElements.snapshotAchievementTitle.textContent = '尚無怪獸';
        DOMElements.snapshotNickname.textContent = '-';
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: -</span><span>敗: -</span>`;
        DOMElements.snapshotEvaluation.textContent = `總評價: -`;
        DOMElements.monsterImage.src = 'https://placehold.co/200x150/161b22/8b949e?text=無怪獸&font=noto-sans-tc';
        DOMElements.monsterImage.alt = '無怪獸';
        DOMElements.snapshotMainContent.innerHTML = '';
        DOMElements.monsterSnapshotArea.style.borderColor = 'var(--border-color)';
        DOMElements.monsterSnapshotArea.style.boxShadow = 'none';
        DOMElements.monsterInfoButton.disabled = true;
        gameState.selectedMonsterId = null;
    }
}


/**
 * 根據元素和稀有度獲取怪獸圖片路徑 (佔位符邏輯)
 * @param {string} primaryElement 主要元素
 * @param {string} rarity 稀有度
 * @returns {string} 圖片 URL
 */
function getMonsterImagePath(primaryElement, rarity) {
    const colors = {
        '火': 'FF6347/FFFFFF', '水': '1E90FF/FFFFFF', '木': '228B22/FFFFFF',
        '金': 'FFD700/000000', '土': 'D2B48C/000000', '光': 'F8F8FF/000000',
        '暗': 'A9A9A9/FFFFFF', '毒': '9932CC/FFFFFF', '風': '87CEEB/000000',
        '混': '778899/FFFFFF', '無': 'D3D3D3/000000'
    };
    const colorPair = colors[primaryElement] || colors['無'];
    return `https://placehold.co/200x150/${colorPair}?text=${encodeURIComponent(primaryElement)}&font=noto-sans-tc`;
}


/**
 * 渲染 DNA 組合槽
 */
function renderDNACombinationSlots() {
    const container = DOMElements.dnaCombinationSlotsContainer;
    if (!container) return;
    container.innerHTML = ''; 

    gameState.dnaCombinationSlots.forEach((dna, index) => {
        const slot = document.createElement('div');
        slot.classList.add('dna-slot');
        slot.dataset.slotIndex = index;

        if (dna && dna.id) { 
            slot.classList.add('occupied');
            slot.textContent = dna.name || '未知DNA';
            
            // 項目6: DNA 物品樣式 - 背景色與文字顏色
            const rarityColorVar = `var(--rarity-${dna.rarity.toLowerCase()}-rgb, var(--default-rgb))`; // 預設為一個基礎RGB
            const elementTextColorVar = `var(--element-${dna.type.toLowerCase()}-text, var(--text-primary))`;
            
            slot.style.backgroundColor = `rgba(${rarityColorVar}, 0.7)`;
            slot.style.color = elementTextColorVar;
            slot.style.borderColor = `var(--rarity-${dna.rarity.toLowerCase()}-text, var(--border-color))`;

            slot.draggable = true; 
            slot.dataset.dnaId = dna.id; 
            slot.dataset.dnaSource = 'combination';
        } else {
            slot.textContent = `槽位 ${index + 1}`;
            slot.classList.add('empty');
        }
        container.appendChild(slot);
    });

    DOMElements.combineButton.disabled = gameState.dnaCombinationSlots.filter(s => s !== null).length < 2; 
}

/**
 * 渲染玩家擁有的 DNA 碎片庫存 (項目3: DNA碎片欄位12格, 最後一格刪除區)
 */
function renderPlayerDNAInventory() {
    const container = DOMElements.inventoryItemsContainer;
    if (!container) return;
    container.innerHTML = ''; 
    const MAX_INVENTORY_SLOTS = 11; // 11個DNA槽 + 1個刪除槽

    const ownedDna = gameState.playerData?.playerOwnedDNA || [];

    // 渲染已擁有的DNA
    ownedDna.slice(0, MAX_INVENTORY_SLOTS).forEach(dna => {
        const item = document.createElement('div');
        item.classList.add('dna-item');
        item.textContent = dna.name || '未知DNA';
        item.draggable = true;
        item.dataset.dnaId = dna.id; 
        item.dataset.dnaBaseId = dna.baseId; 
        item.dataset.dnaSource = 'inventory';

        // 項目6: DNA 物品樣式 - 背景色與文字顏色
        const rarityColorVar = `var(--rarity-${dna.rarity.toLowerCase()}-rgb, var(--default-rgb))`;
        const elementTextColorVar = `var(--element-${dna.type.toLowerCase()}-text, var(--text-primary))`;

        item.style.backgroundColor = `rgba(${rarityColorVar}, 0.7)`;
        item.style.color = elementTextColorVar;
        item.style.borderColor = `var(--rarity-${dna.rarity.toLowerCase()}-text, var(--border-color))`;
        
        const rarityBadge = document.createElement('span');
        rarityBadge.classList.add('dna-rarity-badge'); // 使用 CSS class
        rarityBadge.textContent = dna.rarity[0]; 
        rarityBadge.style.backgroundColor = `var(--rarity-${dna.rarity.toLowerCase()}-text)`;
        rarityBadge.style.color = (dna.rarity === '傳奇' || dna.rarity === '金' || dna.rarity === '神話') ? '#000' : '#fff'; 
        item.appendChild(rarityBadge);

        container.appendChild(item);
    });

    // 渲染空槽位 (如果DNA數量不足11個)
    const emptySlotsToRender = MAX_INVENTORY_SLOTS - ownedDna.length;
    for (let i = 0; i < emptySlotsToRender; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.classList.add('inventory-slot-empty'); // 使用特定class
        emptySlot.textContent = ` `; // 可以留空或顯示點點點
        container.appendChild(emptySlot);
    }
    
    // 渲染刪除區 (固定在第12格)
    const deleteSlot = document.createElement('div');
    deleteSlot.id = 'inventory-delete-slot';
    deleteSlot.classList.add('inventory-delete-slot'); // 應用CSS樣式
    deleteSlot.innerHTML = `<span class="delete-slot-main-text">刪除區</span><span class="delete-slot-sub-text">※拖曳至此</span>`;
    container.appendChild(deleteSlot);

    // 注意：原 addDeleteAndDrawSlots 函數中抽取DNA按鈕的邏輯已移至HTML，
    // 所以此處不再需要呼叫 addDeleteAndDrawSlots。
}


/**
 * 渲染臨時背包 (項目4: 24格空位)
 */
function renderTemporaryBackpack() {
    const container = DOMElements.temporaryBackpackContainer;
    if (!container) return;
    container.innerHTML = '';
    const MAX_TEMP_SLOTS = 24;

    const currentTempItems = gameState.temporaryBackpack || [];

    currentTempItems.slice(0, MAX_TEMP_SLOTS).forEach((item, index) => {
        const slot = document.createElement('div');
        slot.classList.add('temp-backpack-slot', 'occupied');
        slot.textContent = item.data.name || '未知物品'; 
        
        // 應用與DNA item類似的樣式 (如果物品有 rarity 和 type)
        if (item.data.rarity && item.data.type) {
            const rarityColorVar = `var(--rarity-${item.data.rarity.toLowerCase()}-rgb, var(--default-rgb))`;
            const elementTextColorVar = `var(--element-${item.data.type.toLowerCase()}-text, var(--text-primary))`;
            slot.style.backgroundColor = `rgba(${rarityColorVar}, 0.7)`;
            slot.style.color = elementTextColorVar;
            slot.style.borderColor = `var(--rarity-${item.data.rarity.toLowerCase()}-text, var(--border-color))`;
        } else { // 預設樣式
            slot.style.backgroundColor = `var(--bg-slot)`;
            slot.style.color = `var(--text-primary)`;
            slot.style.borderColor = `var(--border-color)`;
        }
        
        slot.onclick = () => handleMoveFromTempBackpackToInventory(index);
        container.appendChild(slot);
    });

    const emptyTempSlotsToRender = MAX_TEMP_SLOTS - currentTempItems.length;
    for (let i = 0; i < emptyTempSlotsToRender; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.classList.add('temp-backpack-slot', 'empty');
        emptySlot.textContent = `空位`; // 更簡潔的空位文字
        container.appendChild(emptySlot);
    }
}


/**
 * 渲染怪物農場列表
 */
function renderMonsterFarm() {
    const container = DOMElements.farmedMonstersListContainer;
    if (!container) return;
    container.innerHTML = ''; 

    if (!gameState.playerData || !gameState.playerData.farmedMonsters || gameState.playerData.farmedMonsters.length === 0) {
        container.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">農場空空如也，快去組合怪獸吧！</p>';
        return;
    }

    gameState.playerData.farmedMonsters.forEach(monster => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('farm-monster-item');
        itemDiv.dataset.monsterId = monster.id;

        const rarityColorVar = `var(--rarity-${monster.rarity.toLowerCase()}-text)`;
        itemDiv.style.borderLeft = `4px solid ${rarityColorVar}`; 

        let statusText = '待命中';
        let statusClass = '';
        if (monster.farmStatus) {
            if (monster.farmStatus.isBattling) {
                statusText = '戰鬥中...'; statusClass = 'battling';
            } else if (monster.farmStatus.isTraining) {
                statusText = '修煉中...'; statusClass = 'active';
            } else if (monster.farmStatus.active && monster.farmStatus.type) { 
                statusText = `${monster.farmStatus.type}...`; statusClass = 'active';
            }
        }
        
        const actionsGroup = document.createElement('div');
        actionsGroup.classList.add('farm-monster-actions-group');

        const battleBtn = document.createElement('button');
        battleBtn.innerHTML = '⚔️'; 
        battleBtn.title = "挑戰其他怪獸";
        battleBtn.classList.add('farm-battle-btn', 'primary');
        battleBtn.dataset.monsterId = monster.id;
        battleBtn.onclick = (e) => handleChallengeMonsterClick(e, monster.id); 

        const cultivateBtn = document.createElement('button');
        cultivateBtn.textContent = '修煉';
        cultivateBtn.classList.add('farm-monster-cultivate-btn', 'warning'); 
        cultivateBtn.dataset.monsterId = monster.id;
        cultivateBtn.disabled = monster.farmStatus?.isBattling || monster.farmStatus?.isTraining;
        cultivateBtn.onclick = (e) => handleCultivateMonsterClick(e, monster.id);
        actionsGroup.appendChild(cultivateBtn);

        const releaseBtn = document.createElement('button');
        releaseBtn.textContent = '放生';
        releaseBtn.classList.add('farm-monster-release-btn', 'danger'); 
        releaseBtn.dataset.monsterId = monster.id;
        releaseBtn.disabled = monster.farmStatus?.isBattling || monster.farmStatus?.isTraining;
        releaseBtn.onclick = (e) => handleReleaseMonsterClick(e, monster.id);
        actionsGroup.appendChild(releaseBtn);

        itemDiv.innerHTML = `
            <div class="farm-battle-btn-container"></div> 
            <div class="farm-monster-name truncate" title="${monster.nickname || '未知怪獸'}">${monster.nickname || '未知怪獸'}</div>
            <div class="farm-monster-status ${statusClass} truncate" title="${statusText}">${statusText}</div>
            <div class="farm-monster-score hidden sm:block">${monster.score || 0}</div> <!--  sm:block ensures it's hidden on mobile by default if hidden-on-mobile is used in header -->
            <div class="farm-monster-actions-placeholder"></div> 
        `;
        itemDiv.querySelector('.farm-battle-btn-container').appendChild(battleBtn);
        itemDiv.querySelector('.farm-monster-actions-placeholder').appendChild(actionsGroup);


        const nameArea = itemDiv.querySelector('.farm-monster-name');
        if (nameArea) {
            nameArea.style.cursor = 'pointer';
            nameArea.onclick = () => {
                updateMonsterSnapshot(monster);
            };
        }
        container.appendChild(itemDiv);
    });
}


/**
 * 更新玩家資訊 Modal
 * @param {object} playerData 玩家的完整遊戲資料
 * @param {object} gameConfigs 遊戲設定檔
 */
function updatePlayerInfoModal(playerData, gameConfigs) {
    const body = DOMElements.playerInfoModalBody;
    if (!body || !playerData || !playerData.playerStats) {
        body.innerHTML = '<p>無法載入玩家資訊。</p>';
        return;
    }

    const stats = playerData.playerStats;
    const nickname = playerData.nickname || stats.nickname || "未知玩家";

    let titlesHtml = '<p>尚無稱號</p>';
    if (stats.titles && stats.titles.length > 0) {
        titlesHtml = stats.titles.map(title => `<span class="inline-block bg-[var(--accent-color)] text-[var(--button-primary-text)] text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">${title}</span>`).join('');
    }
    
    let achievementsHtml = '<p>尚無成就</p>';
    if (stats.achievements && stats.achievements.length > 0) {
        achievementsHtml = `<ul class="list-disc list-inside ml-1 text-sm">${stats.achievements.map(ach => `<li>${ach}</li>`).join('')}</ul>`;
    }

    let ownedMonstersHtml = '<p>尚無怪獸</p>';
    if (playerData.farmedMonsters && playerData.farmedMonsters.length > 0) {
        ownedMonstersHtml = `<ul class="owned-monsters-list mt-1">`;
        playerData.farmedMonsters.slice(0, 5).forEach(m => { 
            ownedMonstersHtml += `<li><span class="monster-name">${m.nickname}</span> <span class="monster-score">評價: ${m.score || 0}</span></li>`;
        });
        if (playerData.farmedMonsters.length > 5) {
            ownedMonstersHtml += `<li>...等共 ${playerData.farmedMonsters.length} 隻</li>`;
        }
        ownedMonstersHtml += `</ul>`;
    }
    
    const medalsHtml = stats.medals > 0 ? `${'🥇'.repeat(Math.min(stats.medals, 5))} (${stats.medals})` : '無';

    body.innerHTML = `
        <div class="text-center mb-4">
            <h4 class="text-2xl font-bold text-[var(--accent-color)]">${nickname}</h4>
            <p class="text-sm text-[var(--text-secondary)]">UID: ${gameState.playerId || 'N/A'}</p>
        </div>
        <div class="details-grid">
            <div class="details-section">
                <h5 class="details-section-title">基本統計</h5>
                <div class="details-item"><span class="details-label">等級/排名:</span> <span class="details-value">${stats.rank || 'N/A'}</span></div>
                <div class="details-item"><span class="details-label">總勝場:</span> <span class="details-value text-[var(--success-color)]">${stats.wins || 0}</span></div>
                <div class="details-item"><span class="details-label">總敗場:</span> <span class="details-value text-[var(--danger-color)]">${stats.losses || 0}</span></div>
                <div class="details-item"><span class="details-label">總積分:</span> <span class="details-value">${stats.score || 0}</span></div>
            </div>
            <div class="details-section">
                <h5 class="details-section-title">榮譽</h5>
                <div class="mb-2">
                    <span class="details-label block mb-1">當前稱號:</span>
                    <div>${titlesHtml}</div>
                </div>
                <div class="mb-2">
                    <span class="details-label block mb-1">勳章:</span>
                    <span class="details-value medal-emoji">${medalsHtml}</span>
                </div>
                 <div>
                    <span class="details-label block mb-1">已達成成就:</span>
                    ${achievementsHtml}
                </div>
            </div>
        </div>
        <div class="details-section mt-3">
            <h5 class="details-section-title">持有怪獸 (部分預覽)</h5>
            ${ownedMonstersHtml}
        </div>
        <p class="creation-time-centered mt-3">上次存檔時間: ${new Date(playerData.lastSave * 1000).toLocaleString()}</p>
    `;
}


/**
 * 更新怪獸資訊 Modal
 * @param {object} monster 怪獸物件
 * @param {object} gameConfigs 遊戲設定檔
 */
function updateMonsterInfoModal(monster, gameConfigs) {
    if (!monster || !monster.id) {
        DOMElements.monsterInfoModalHeader.innerHTML = '<h4 class="monster-info-name-styled">無法載入怪獸資訊</h4>';
        DOMElements.monsterDetailsTabContent.innerHTML = '<p>錯誤：找不到怪獸資料。</p>';
        DOMElements.monsterActivityLogsContainer.innerHTML = '<p>無法載入活動紀錄。</p>';
        return;
    }

    const rarityColorVar = `var(--rarity-${monster.rarity.toLowerCase()}-text)`;
    DOMElements.monsterInfoModalHeader.innerHTML = `
        <h4 class="monster-info-name-styled" style="color: ${rarityColorVar}; border-color: ${rarityColorVar};">
            ${monster.nickname}
        </h4>
        <p class="text-xs text-[var(--text-secondary)] mt-1">ID: ${monster.id}</p>
    `;

    const detailsBody = DOMElements.monsterDetailsTabContent;
    let elementsDisplay = monster.elements.map(el => 
        `<span class="text-xs px-2 py-1 rounded-full text-element-${el.toLowerCase()} bg-element-${el.toLowerCase()}-bg mr-1">${el}</span>`
    ).join('');
    
    let resistancesHtml = '<p class="text-sm">無特殊抗性/弱點</p>';
    if (monster.resistances && Object.keys(monster.resistances).length > 0) {
        resistancesHtml = '<ul class="list-disc list-inside text-sm">';
        for (const [element, value] of Object.entries(monster.resistances)) {
            if (value === 0) continue;
            const effect = value > 0 ? '抗性' : '弱點';
            const colorClass = value > 0 ? 'text-[var(--success-color)]' : 'text-[var(--danger-color)]';
            resistancesHtml += `<li>${element}: <span class="${colorClass}">${effect} ${Math.abs(value)}%</span></li>`;
        }
        resistancesHtml += '</ul>';
    }

    let skillsHtml = '<p class="text-sm">尚無技能</p>';
    if (monster.skills && monster.skills.length > 0) {
        skillsHtml = monster.skills.map(skill => `
            <div class="skill-entry">
                <span class="skill-name text-element-${skill.type.toLowerCase()}">${skill.name} (Lv.${skill.level || 1})</span>
                <p class="skill-details">威力: ${skill.power}, 消耗MP: ${skill.mp_cost || 0}, 類別: ${skill.skill_category || '未知'}</p>
                <p class="skill-details text-xs">${skill.story || skill.description || '暫無描述'}</p>
                ${skill.current_exp !== undefined ? `<p class="text-xs text-[var(--text-secondary)]">經驗: ${skill.current_exp}/${skill.exp_to_next_level || '-'}</p>` : ''}
            </div>
        `).join('');
    }
    
    const personality = monster.personality || { name: '未知', description: '個性不明' };
    const aiPersonality = monster.aiPersonality || 'AI 個性描述生成中或失敗...';
    const aiIntroduction = monster.aiIntroduction || 'AI 介紹生成中或失敗...';
    const aiEvaluation = monster.aiEvaluation || 'AI 綜合評價生成中或失敗...';

    detailsBody.innerHTML = `
        <div class="details-grid">
            <div class="details-section">
                <h5 class="details-section-title">基礎屬性</h5>
                <div class="details-item"><span class="details-label">元素:</span> <span class="details-value">${elementsDisplay}</span></div>
                <div class="details-item"><span class="details-label">稀有度:</span> <span class="details-value text-rarity-${monster.rarity.toLowerCase()}">${monster.rarity}</span></div>
                <div class="details-item"><span class="details-label">HP:</span> <span class="details-value">${monster.hp}/${monster.initial_max_hp}</span></div>
                <div class="details-item"><span class="details-label">MP:</span> <span class="details-value">${monster.mp}/${monster.initial_max_mp}</span></div>
                <div class="details-item"><span class="details-label">攻擊:</span> <span class="details-value">${monster.attack}</span></div>
                <div class="details-item"><span class="details-label">防禦:</span> <span class="details-value">${monster.defense}</span></div>
                <div class="details-item"><span class="details-label">速度:</span> <span class="details-value">${monster.speed}</span></div>
                <div class="details-item"><span class="details-label">爆擊率:</span> <span class="details-value">${monster.crit}%</span></div>
                <div class="details-item"><span class="details-label">總評價:</span> <span class="details-value text-[var(--success-color)]">${monster.score || 0}</span></div>
            </div>
            <div class="details-section">
                <h5 class="details-section-title">元素抗性</h5>
                ${resistancesHtml}
            </div>
        </div>
        <div class="details-section mt-3">
            <h5 class="details-section-title">個性</h5>
            <p class="font-semibold text-[var(--accent-color)]">${personality.name}</p>
            <p class="personality-text text-sm">${personality.description}</p>
        </div>
        <div class="details-section mt-3">
            <h5 class="details-section-title">技能列表 (最多 ${gameConfigs.value_settings?.max_monster_skills || 3} 個)</h5>
            ${skillsHtml}
        </div>
        <div class="details-section mt-3">
            <h5 class="details-section-title">AI 深度解析</h5>
            <p class="font-semibold">AI 個性分析:</p>
            <p class="ai-generated-text text-sm">${aiPersonality}</p>
            <p class="font-semibold mt-2">AI 背景介紹:</p>
            <p class="ai-generated-text text-sm">${aiIntroduction}</p>
            <p class="font-semibold mt-2">AI 綜合評價與培養建議:</p>
            <p class="ai-generated-text text-sm">${aiEvaluation}</p>
        </div>
        <p class="creation-time-centered">創建時間: ${new Date(monster.creationTime * 1000).toLocaleString()}</p>
    `;

    const logsContainer = DOMElements.monsterActivityLogsContainer;
    if (monster.activityLog && monster.activityLog.length > 0) {
        logsContainer.innerHTML = monster.activityLog.map(log => 
            `<div class="log-entry"><span class="log-time">${log.time}</span> <span class="log-message">${log.message}</span></div>`
        ).join('');
    } else {
        logsContainer.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">尚無活動紀錄。</p>';
    }
    
    switchTabContent('monster-details-tab', DOMElements.monsterInfoTabs.querySelector('.tab-button[data-tab-target="monster-details-tab"]'), 'monster-info-modal');
}

/**
 * 切換頁籤內容的顯示
 * @param {string} targetTabId 要顯示的頁籤內容的 ID
 * @param {HTMLElement} clickedTabButton 被點擊的頁籤按鈕
 * @param {string} parentModalId (可選) 如果頁籤在 Modal 內，提供 Modal ID 以正確選擇元素
 */
function switchTabContent(targetTabId, clickedTabButton, parentModalId = null) {
    let tabButtonContainer, tabContentContainer;

    if (parentModalId) {
        const modalElement = document.getElementById(parentModalId);
        if (!modalElement) return;
        tabButtonContainer = modalElement.querySelector('.tab-buttons');
        tabContentContainer = modalElement; 
    } else {
        tabButtonContainer = DOMElements.dnaFarmTabs;
        tabContentContainer = DOMElements.dnaFarmTabs.parentNode; 
    }

    if (!tabButtonContainer || !tabContentContainer) return;

    tabButtonContainer.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    tabContentContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const targetContent = tabContentContainer.querySelector(`#${targetTabId}`);
    if (targetContent) targetContent.classList.add('active');
    if (clickedTabButton) clickedTabButton.classList.add('active');
}


/**
 * 更新新手指南 Modal 的內容
 * @param {Array<object>} guideEntries 指南條目列表
 * @param {string|null} searchTerm (可選) 搜尋關鍵字，用於篩選
 */
function updateNewbieGuideModal(guideEntries, searchTerm = null) {
    const container = DOMElements.newbieGuideContentArea;
    if (!container) return;
    container.innerHTML = '';

    const filteredEntries = searchTerm
        ? guideEntries.filter(entry => 
            entry.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            entry.content.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : guideEntries;

    if (filteredEntries.length === 0) {
        container.innerHTML = `<p class="text-center text-[var(--text-secondary)]">找不到符合「${searchTerm || ''}」的指南內容。</p>`;
        return;
    }

    filteredEntries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('mb-4', 'pb-3', 'border-b', 'border-[var(--border-color)]');
        entryDiv.innerHTML = `
            <h5 class="text-lg font-semibold text-[var(--accent-color)] mb-1">${entry.title}</h5>
            <p class="text-sm leading-relaxed">${entry.content.replace(/\n/g, '<br>')}</p>
        `;
        container.appendChild(entryDiv);
    });
}

/**
 * 更新好友列表 Modal
 * @param {Array<object>} players 玩家列表 [{ uid: string, nickname: string, status?: 'online'|'offline' }]
 */
function updateFriendsListModal(players) {
    const container = DOMElements.friendsListContainer;
    if (!container) return;
    container.innerHTML = '';

    if (players.length === 0) {
        container.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)]">找不到玩家或好友列表為空。</p>';
        return;
    }

    players.forEach(player => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('friend-item');
        const status = player.status || (Math.random() > 0.5 ? 'online' : 'offline'); 
        const statusClass = status === 'online' ? 'online' : 'offline';

        itemDiv.innerHTML = `
            <span class="friend-name">${player.nickname}</span>
            <div class="flex items-center space-x-2">
                <span class="friend-status ${statusClass}">${status === 'online' ? '線上' : '離線'}</span>
                <button class="text-xs secondary p-1 challenge-friend-btn" data-player-id="${player.uid}" data-player-nickname="${player.nickname}">挑戰</button>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

/**
 * 更新排行榜表格
 * @param {'monster' | 'player'} type 排行榜類型
 * @param {Array<object>} leaderboardData 排行榜數據
 */
function updateLeaderboardTable(type, leaderboardData) {
    const tableId = type === 'monster' ? 'monster-leaderboard-table' : 'player-leaderboard-table';
    const table = document.getElementById(tableId);
    if (!table) return;

    let tbody = table.querySelector('tbody');
    if (tbody) tbody.remove(); 
    tbody = document.createElement('tbody');

    // 項目12: 移除怪物排行榜內的NPC功能 (這裡篩選掉 isNPC 的怪獸)
    const dataToRender = type === 'monster' 
        ? leaderboardData.filter(item => !item.isNPC) 
        : leaderboardData;


    if (dataToRender.length === 0) {
        const tr = tbody.insertRow();
        const td = tr.insertCell();
        td.colSpan = type === 'monster' ? 6 : 5; // 怪獸排行少了一欄"操作" (因為NPC移除了)
        td.textContent = '排行榜目前是空的。';
        td.style.textAlign = 'center';
        td.style.padding = '20px';
    } else {
        dataToRender.forEach((item, index) => {
            const tr = tbody.insertRow();
            if (type === 'monster') {
                // 移除原來的挑戰按鈕欄位，因為 isNPC 的怪獸已被過濾
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="font-semibold text-rarity-${item.rarity.toLowerCase()}">${item.nickname || '未知怪獸'}</td>
                    <td class="leaderboard-element-cell">${item.elements.map(el => `<span class="text-element-${el.toLowerCase()}">${el}</span>`).join(', ')}</td>
                    <td>${item.score || 0}</td>
                    <td>${item.owner_nickname || 'N/A'}</td>
                    <td>${item.resume?.wins || 0} / ${item.resume?.losses || 0}</td>
                `;
            } else { // Player Leaderboard
                 tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="font-semibold text-[var(--accent-color)]">${item.nickname || '未知玩家'}</td>
                    <td>${item.score || 0}</td>
                    <td>${item.wins || 0} / ${item.losses || 0}</td>
                    <td>${item.titles && item.titles.length > 0 ? item.titles[0] : '新手'}</td>
                `;
            }
        });
    }
    table.appendChild(tbody);

    // 更新表頭 (如果尚未創建)
    if (!table.querySelector('thead')) {
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        // 怪獸排行榜表頭移除"操作"
        const headers = type === 'monster' 
            ? ['#', '怪獸名稱', '屬性', '評價', '擁有者', '戰績'] 
            : ['#', '玩家暱稱', '積分', '戰績', '稱號'];
        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
    }
}

/**
 * 更新怪獸排行榜的元素篩選 Tab (項目9: 所有屬性分類頁籤)
 * @param {Array<string>} elements 元素列表 (例如 ["火", "水", ... "all"])
 */
function updateMonsterLeaderboardElementTabs(elements) {
    const container = DOMElements.monsterLeaderboardElementTabs;
    if (!container) return;
    container.innerHTML = ''; 

    // 確保 "all" (全部) 在最前面
    const sortedElements = ['all', ...elements.filter(el => el !== 'all').sort()];

    sortedElements.forEach(element => {
        const button = document.createElement('button');
        button.classList.add('tab-button');
        button.dataset.tabTarget = `monster-leaderboard-${element.toLowerCase()}`; 
        button.dataset.elementFilter = element.toLowerCase();
        button.textContent = element === 'all' ? '全部' : (gameState.gameConfigs?.element_nicknames?.[element] || element); // 顯示元素暱稱
        if (element.toLowerCase() === gameState.currentMonsterLeaderboardElementFilter) {
            button.classList.add('active');
        }
        container.appendChild(button);
    });
}


/**
 * 顯示戰鬥記錄 Modal
 * @param {Array<string>} logEntries 戰鬥日誌條目
 * @param {string} winnerNickname (可選) 勝者暱稱
 * @param {string} loserNickname (可選) 敗者暱稱
 */
function showBattleLogModal(logEntries, winnerNickname = null, loserNickname = null) {
    const logArea = DOMElements.battleLogArea;
    if (!logArea) return;

    let htmlLog = "";
    logEntries.forEach(entry => {
        let entryClass = "";
        if (entry.includes("致命一擊") || entry.includes("效果絕佳")) entryClass = "crit-hit";
        else if (entry.includes("恢復了") || entry.includes("治癒了")) entryClass = "heal-action";
        else if (entry.includes("倒下了！") || entry.includes("被擊倒了！")) entryClass = "defeated";
        else if (entry.startsWith("--- 回合")) entryClass = "turn-divider";
        else if (entry.startsWith("⚔️ 戰鬥開始！")) entryClass = "battle-start";
        
        htmlLog += `<p class="${entryClass}">${entry.replace(/\n/g, '<br>')}</p>`;
    });

    if (winnerNickname) {
        htmlLog += `<p class="battle-end winner">🏆 ${winnerNickname} 獲勝！</p>`;
    } else if (loserNickname) { 
        htmlLog += `<p class="battle-end loser">💔 ${loserNickname} 被擊敗了。</p>`;
    } else {
         htmlLog += `<p class="battle-end draw">🤝 戰鬥結束，平手或回合耗盡！</p>`;
    }

    logArea.innerHTML = htmlLog;
    logArea.scrollTop = logArea.scrollHeight; 
    showModal('battle-log-modal');
}

/**
 * 顯示 DNA 抽取結果 Modal
 * @param {Array<object>} drawnDnaTemplates 抽到的 DNA 模板列表
 */
function showDnaDrawModal(drawnDnaTemplates) {
    const gridContainer = DOMElements.dnaDrawResultsGrid;
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (!drawnDnaTemplates || drawnDnaTemplates.length === 0) {
        gridContainer.innerHTML = '<p class="text-center col-span-full">什麼也沒抽到...</p>';
    } else {
        drawnDnaTemplates.forEach((dna, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('dna-draw-result-item');
            
            // 應用與DNA item類似的樣式 (如果物品有 rarity 和 type)
            const rarityColorVar = `var(--rarity-${dna.rarity.toLowerCase()}-rgb, var(--default-rgb))`;
            const elementTextColorVar = `var(--element-${dna.type.toLowerCase()}-text, var(--text-primary))`;
            itemDiv.style.backgroundColor = `rgba(${rarityColorVar}, 0.7)`;
            itemDiv.style.color = elementTextColorVar;
            itemDiv.style.borderColor = `var(--rarity-${dna.rarity.toLowerCase()}-text, var(--border-color))`;
            
            itemDiv.innerHTML = `
                <div class="dna-name">${dna.name}</div>
                <div class="dna-type">${dna.type}</div>
                <div class="dna-rarity text-rarity-${dna.rarity.toLowerCase()}">${dna.rarity}</div>
                <button class="add-drawn-dna-to-backpack-btn secondary text-xs mt-1" data-dna-index="${index}">加入背包</button>
            `;
            gridContainer.appendChild(itemDiv);
        });
    }
    showModal('dna-draw-modal');
}

/**
 * 更新官方公告 Modal 中的玩家暱稱
 * @param {string} nickname 玩家暱稱
 */
function updateAnnouncementPlayerName(nickname) {
    if (DOMElements.announcementPlayerName) {
        DOMElements.announcementPlayerName.textContent = nickname || "玩家";
    }
}

/**
 * 更新滾動提示訊息
 * @param {Array<string>} hints 提示訊息列表
 */
function updateScrollingHints(hints) {
    const container = DOMElements.scrollingHintsContainer;
    if (!container || !hints || hints.length === 0) return;

    container.innerHTML = ''; 
    const animationDuration = 15; 
    const displayTimePerHint = animationDuration / hints.length;

    hints.forEach((hint, index) => {
        const p = document.createElement('p');
        p.classList.add('scrolling-hint-text');
        p.textContent = hint;
        p.style.animationDelay = `${index * displayTimePerHint}s`;
        container.appendChild(p);
    });
}


// 預設RGB顏色，用於DNA物品樣式，以防稀有度顏色未定義RGB版本
document.documentElement.style.setProperty('--default-rgb', '128, 128, 128'); 
// 假設 theme.css 中會定義 --rarity-common-rgb, --rarity-rare-rgb 等

console.log("UI module loaded with new updates.");

