// js/ui.js

// 注意：此檔案會依賴 gameState (來自 js/game-state.js) 和其他輔助函數

// --- DOM Element Selectors (集中管理，方便維護) ---
const DOMElements = {
    // Auth Screen
    authScreen: document.getElementById('auth-screen'),
    gameContainer: document.getElementById('game-container'),
    showLoginFormBtn: document.getElementById('show-login-form-btn'),
    showRegisterFormBtn: document.getElementById('show-register-form-btn'),
    logoutBtn: document.getElementById('logout-btn'),

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
    closeTrainingResultsBtn: document.getElementById('close-training-results-btn'), // X 按鈕
    finalCloseTrainingResultsBtn: document.getElementById('final-close-training-results-btn'), // 底部關閉按鈕

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
    announcementPlayerName: document.getElementById('announcement-player-name'),
    closeAnnouncementBtn: document.getElementById('close-announcement-btn'),

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
        modal.style.display = 'flex'; // 使用 flex 進行居中
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
    DOMElements.feedbackModalMessage.innerHTML = message; // 允許 HTML 內容
    toggleElementDisplay(DOMElements.feedbackModalSpinner, isLoading);

    if (monsterDetails) {
        // TODO: 實作顯示怪獸詳細資料的邏輯
        // DOMElements.feedbackMonsterDetails.innerHTML = renderMonsterFeedbackDetails(monsterDetails);
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, true);
    } else {
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, false);
    }
    
    // 清除舊按鈕並添加新按鈕
    const footer = DOMElements.feedbackModal.querySelector('.modal-footer');
    if (footer) footer.remove(); // 移除舊的 footer

    if (actionButtons && actionButtons.length > 0) {
        const newFooter = document.createElement('div');
        newFooter.className = 'modal-footer';
        actionButtons.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.className = btnConfig.class || 'secondary';
            button.onclick = () => {
                if (btnConfig.onClick) btnConfig.onClick();
                hideModal('feedback-modal'); // 點擊按鈕後通常關閉 modal
            };
            newFooter.appendChild(button);
        });
        DOMElements.feedbackModal.querySelector('.modal-content').appendChild(newFooter);
    } else {
        // 如果沒有提供按鈕，可以預設一個關閉按鈕或讓 X 按鈕處理
        // 確保 X 按鈕可以關閉
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
    DOMElements.confirmationModalBody.innerHTML = `<p>${message}</p>`; // 基礎訊息

    if (monsterToRelease && monsterToRelease.id) { // 假設怪獸圖片URL規則或從數據中獲取
        const imgPlaceholder = DOMElements.releaseMonsterImagePlaceholder;
        const imgPreview = DOMElements.releaseMonsterImgPreview;
        // TODO: 根據 monsterToRelease.elements[0] 或其他屬性決定圖片
        // 暫時使用通用佔位符
        const monsterPrimaryElement = monsterToRelease.elements && monsterToRelease.elements.length > 0 ? monsterToRelease.elements[0] : '無';
        imgPreview.src = getMonsterImagePath(monsterPrimaryElement, monsterToRelease.rarity); // 需要 getMonsterImagePath 函數
        imgPreview.alt = monsterToRelease.nickname || '怪獸圖片';
        toggleElementDisplay(imgPlaceholder, true, 'flex');
    } else {
        toggleElementDisplay(DOMElements.releaseMonsterImagePlaceholder, false);
    }

    DOMElements.confirmActionBtn.textContent = confirmButtonText;
    DOMElements.confirmActionBtn.className = confirmButtonClass; // 移除所有 class 再添加
    
    // 移除舊的事件監聽器，再添加新的
    const newConfirmBtn = DOMElements.confirmActionBtn.cloneNode(true);
    DOMElements.confirmActionBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.confirmActionBtn);
    DOMElements.confirmActionBtn = newConfirmBtn; // 更新 DOM 引用

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
    localStorage.setItem('theme', themeName); // 保存主題偏好
}

/**
 * 初始化主題 (從 localStorage 或預設)
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
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
        
        // 更新怪獸圖片 (需要一個函數來決定圖片路徑)
        const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
        DOMElements.monsterImage.src = getMonsterImagePath(primaryElement, monster.rarity);
        DOMElements.monsterImage.alt = monster.nickname || '怪獸圖片';

        // 顯示屬性圖標等在 snapshotMainContent
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

        // 根據稀有度設定背景漸層或邊框顏色
        const rarityColorVar = `var(--rarity-${monster.rarity.toLowerCase()}-text)`;
        DOMElements.monsterSnapshotArea.style.borderColor = rarityColorVar;
        DOMElements.monsterSnapshotArea.style.boxShadow = `0 0 10px -2px ${rarityColorVar}, inset 0 0 15px -5px color-mix(in srgb, ${rarityColorVar} 30%, transparent)`;

        DOMElements.monsterInfoButton.disabled = false;
        gameState.selectedMonsterId = monster.id;
    } else {
        // 沒有選中怪獸時的預設狀態
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
    // 這裡可以根據實際的圖片資源和命名規則來實現
    // 範例：使用 placehold.co 生成帶有文字的佔位圖片
    const colors = {
        '火': 'FF6347/FFFFFF', '水': '1E90FF/FFFFFF', '木': '228B22/FFFFFF',
        '金': 'FFD700/000000', '土': 'D2B48C/000000', '光': 'F8F8FF/000000',
        '暗': 'A9A9A9/FFFFFF', '毒': '9932CC/FFFFFF', '風': '87CEEB/000000',
        '混': '778899/FFFFFF', '無': 'D3D3D3/000000'
    };
    const colorPair = colors[primaryElement] || colors['無'];
    const text = `${primaryElement[0]}${rarity[0]}`; // 例如 "火普"
    // return `https://placehold.co/150x100/${colorPair}?text=${encodeURIComponent(text)}&font=noto-sans-tc`;
    // 為了更符合您的 HTML 結構，調整尺寸
    return `https://placehold.co/200x150/${colorPair}?text=${encodeURIComponent(primaryElement)}&font=noto-sans-tc`;
}


/**
 * 渲染 DNA 組合槽
 */
function renderDNACombinationSlots() {
    const container = DOMElements.dnaCombinationSlotsContainer;
    if (!container) return;
    container.innerHTML = ''; // 清空現有槽位

    gameState.dnaCombinationSlots.forEach((dna, index) => {
        const slot = document.createElement('div');
        slot.classList.add('dna-slot');
        slot.dataset.slotIndex = index;

        if (dna && dna.id) { // 假設 dna 是 DNAFragment 對象
            slot.classList.add('occupied');
            slot.textContent = dna.name || '未知DNA';
            // 根據 DNA 類型和稀有度設定樣式
            slot.style.backgroundColor = `var(--element-${dna.type.toLowerCase()}-bg)`;
            slot.style.color = `var(--element-${dna.type.toLowerCase()}-text)`;
            slot.style.borderColor = `var(--rarity-${dna.rarity.toLowerCase()}-text)`;
            slot.draggable = true; // 允許從槽中拖出
            slot.dataset.dnaId = dna.id; // 用於拖放識別
            slot.dataset.dnaSource = 'combination';
        } else {
            slot.textContent = `槽位 ${index + 1}`;
            slot.classList.add('empty');
        }
        container.appendChild(slot);
    });

    // 更新合成按鈕狀態
    DOMElements.combineButton.disabled = gameState.dnaCombinationSlots.filter(s => s !== null).length < 2; // 至少需要2個DNA才能合成
}

/**
 * 渲染玩家擁有的 DNA 碎片庫存
 */
function renderPlayerDNAInventory() {
    const container = DOMElements.inventoryItemsContainer;
    if (!container) return;
    container.innerHTML = ''; // 清空

    if (!gameState.playerData || !gameState.playerData.playerOwnedDNA || gameState.playerData.playerOwnedDNA.length === 0) {
        container.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] col-span-full">你的DNA庫存是空的。</p>';
        // 添加刪除區和抽卡按鈕
        addDeleteAndDrawSlots(container);
        return;
    }

    gameState.playerData.playerOwnedDNA.forEach(dna => {
        const item = document.createElement('div');
        item.classList.add('dna-item');
        item.textContent = dna.name || '未知DNA';
        item.draggable = true;
        item.dataset.dnaId = dna.id; // 使用實例 ID
        item.dataset.dnaBaseId = dna.baseId; // 模板 ID，如果需要
        item.dataset.dnaSource = 'inventory';

        // 根據 DNA 類型和稀有度設定樣式
        item.style.backgroundColor = `var(--element-${dna.type.toLowerCase()}-bg)`;
        item.style.color = `var(--element-${dna.type.toLowerCase()}-text)`;
        item.style.borderColor = `var(--rarity-${dna.rarity.toLowerCase()}-text)`;
        
        // 顯示稀有度角標 (可選)
        const rarityBadge = document.createElement('span');
        rarityBadge.textContent = dna.rarity[0]; // 例如 "普", "稀"
        rarityBadge.style.position = 'absolute';
        rarityBadge.style.top = '2px';
        rarityBadge.style.right = '2px';
        rarityBadge.style.fontSize = '0.6rem';
        rarityBadge.style.padding = '1px 3px';
        rarityBadge.style.borderRadius = '3px';
        rarityBadge.style.backgroundColor = `var(--rarity-${dna.rarity.toLowerCase()}-text)`;
        rarityBadge.style.color = dna.rarity === '傳奇' || dna.rarity === '金' ? '#000' : '#fff'; // 確保對比度
        item.appendChild(rarityBadge);

        container.appendChild(item);
    });
    addDeleteAndDrawSlots(container);
}

/**
 * 在 DNA 庫存末尾添加刪除區和抽卡按鈕
 * @param {HTMLElement} container DNA 庫存容器
 */
function addDeleteAndDrawSlots(container) {
    // 添加刪除區
    const deleteSlot = document.createElement('div');
    deleteSlot.id = 'inventory-delete-slot';
    deleteSlot.classList.add('inventory-delete-slot');
    deleteSlot.textContent = '🗑️ 拖曳至此刪除';
    container.appendChild(deleteSlot);

    // 添加抽卡按鈕 (如果需要)
    const drawButton = document.createElement('button');
    drawButton.id = 'dna-draw-button';
    drawButton.classList.add('dna-draw-button');
    drawButton.textContent = '🧬 抽取DNA (1次)';
    // drawButton.onclick = handleDrawDNAClick; // 事件處理器在 event-handlers.js 中綁定
    container.appendChild(drawButton);
}


/**
 * 渲染臨時背包
 */
function renderTemporaryBackpack() {
    const container = DOMElements.temporaryBackpackContainer;
    if (!container) return;
    container.innerHTML = '';

    if (gameState.temporaryBackpack.length === 0) {
        for (let i = 0; i < 5; i++) { // 預設顯示5個空槽
            const emptySlot = document.createElement('div');
            emptySlot.classList.add('temp-backpack-slot', 'empty');
            emptySlot.textContent = `空位 ${i + 1}`;
            container.appendChild(emptySlot);
        }
        return;
    }

    gameState.temporaryBackpack.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.classList.add('temp-backpack-slot', 'occupied');
        // 假設 item.data 包含 name, type, rarity 等屬性
        slot.textContent = item.data.name || '未知物品'; 
        slot.style.backgroundColor = `var(--element-${item.data.type.toLowerCase()}-bg)`;
        slot.style.color = `var(--element-${item.data.type.toLowerCase()}-text)`;
        slot.style.borderColor = `var(--rarity-${item.data.rarity.toLowerCase()}-text)`;
        
        // 添加點擊事件，將物品移至主 DNA 庫存
        slot.onclick = () => handleMoveFromTempBackpackToInventory(index);
        container.appendChild(slot);
    });

    // 補齊空槽位到至少5個
    const currentSlots = gameState.temporaryBackpack.length;
    for (let i = currentSlots; i < 5; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.classList.add('temp-backpack-slot', 'empty');
        emptySlot.textContent = `空位 ${i + 1}`;
        container.appendChild(emptySlot);
    }
}


/**
 * 渲染怪物農場列表
 */
function renderMonsterFarm() {
    const container = DOMElements.farmedMonstersListContainer;
    if (!container) return;
    container.innerHTML = ''; // 清空

    if (!gameState.playerData || !gameState.playerData.farmedMonsters || gameState.playerData.farmedMonsters.length === 0) {
        container.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">農場空空如也，快去組合怪獸吧！</p>';
        return;
    }

    gameState.playerData.farmedMonsters.forEach(monster => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('farm-monster-item');
        itemDiv.dataset.monsterId = monster.id;

        const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
        const rarityColorVar = `var(--rarity-${monster.rarity.toLowerCase()}-text)`;
        itemDiv.style.borderLeft = `4px solid ${rarityColorVar}`; // 左邊框標識稀有度

        let statusText = '待命中';
        let statusClass = '';
        if (monster.farmStatus) {
            if (monster.farmStatus.isBattling) {
                statusText = '戰鬥中...'; statusClass = 'battling';
            } else if (monster.farmStatus.isTraining) {
                statusText = '修煉中...'; statusClass = 'active';
            } else if (monster.farmStatus.active && monster.farmStatus.type) { // 其他活動
                statusText = `${monster.farmStatus.type}...`; statusClass = 'active';
            }
        }
        
        // 為了適應移動端佈局，按鈕組合在一起
        const actionsGroup = document.createElement('div');
        actionsGroup.classList.add('farm-monster-actions-group');

        // 出戰按鈕 (挑戰按鈕)
        const battleBtn = document.createElement('button');
        battleBtn.innerHTML = '⚔️'; // 劍圖標
        battleBtn.title = "挑戰其他怪獸";
        battleBtn.classList.add('farm-battle-btn', 'primary');
        battleBtn.dataset.monsterId = monster.id;
        battleBtn.onclick = (e) => handleChallengeMonsterClick(e, monster.id); // 事件處理器

        // 養成按鈕
        const cultivateBtn = document.createElement('button');
        cultivateBtn.textContent = '修煉';
        cultivateBtn.classList.add('farm-monster-cultivate-btn', 'warning', 'text-xs', 'px-1', 'py-0.5'); // 調整大小
        cultivateBtn.dataset.monsterId = monster.id;
        cultivateBtn.disabled = monster.farmStatus?.isBattling || monster.farmStatus?.isTraining;
        cultivateBtn.onclick = (e) => handleCultivateMonsterClick(e, monster.id);
        actionsGroup.appendChild(cultivateBtn);

        // 放生按鈕
        const releaseBtn = document.createElement('button');
        releaseBtn.textContent = '放生';
        releaseBtn.classList.add('farm-monster-release-btn', 'danger', 'text-xs', 'px-1', 'py-0.5'); // 調整大小
        releaseBtn.dataset.monsterId = monster.id;
        releaseBtn.disabled = monster.farmStatus?.isBattling || monster.farmStatus?.isTraining;
        releaseBtn.onclick = (e) => handleReleaseMonsterClick(e, monster.id);
        actionsGroup.appendChild(releaseBtn);

        itemDiv.innerHTML = `
            <div class="farm-battle-btn-container"></div> <!-- 出戰按鈕容器 -->
            <div class="farm-monster-name truncate" title="${monster.nickname || '未知怪獸'}">${monster.nickname || '未知怪獸'}</div>
            <div class="farm-monster-status ${statusClass} truncate" title="${statusText}">${statusText}</div>
            <div class="farm-monster-score hidden sm:block">${monster.score || 0}</div>
            <div class="farm-monster-actions-placeholder"></div> <!-- 養成/放生按鈕組的佔位符 -->
        `;
        // 將按鈕實際插入到對應的容器
        itemDiv.querySelector('.farm-battle-btn-container').appendChild(battleBtn);
        itemDiv.querySelector('.farm-monster-actions-placeholder').appendChild(actionsGroup);


        // 點擊怪獸名稱區域，更新快照並可選擇彈出資訊 Modal
        const nameArea = itemDiv.querySelector('.farm-monster-name');
        if (nameArea) {
            nameArea.style.cursor = 'pointer';
            nameArea.onclick = () => {
                updateMonsterSnapshot(monster);
                // 可以選擇是否自動打開怪獸資訊 Modal
                // showMonsterInfoModal(monster.id); 
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
        playerData.farmedMonsters.slice(0, 5).forEach(m => { // 最多顯示5隻
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

    // 詳細資訊 Tab
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

    // 活動紀錄 Tab
    const logsContainer = DOMElements.monsterActivityLogsContainer;
    if (monster.activityLog && monster.activityLog.length > 0) {
        logsContainer.innerHTML = monster.activityLog.map(log => 
            `<div class="log-entry"><span class="log-time">${log.time}</span> <span class="log-message">${log.message}</span></div>`
        ).join('');
    } else {
        logsContainer.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">尚無活動紀錄。</p>';
    }
    
    // 預設顯示詳細資訊 Tab
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
        tabContentContainer = modalElement; // Modal 本身作為內容容器的父級
    } else {
        // 預設為主畫面的 DNA/農場頁籤
        tabButtonContainer = DOMElements.dnaFarmTabs;
        tabContentContainer = DOMElements.dnaFarmTabs.parentNode; // 主 panel
    }

    if (!tabButtonContainer || !tabContentContainer) return;

    // 隱藏所有頁籤內容，移除按鈕的 active class
    tabButtonContainer.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    tabContentContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // 顯示目標頁籤內容，設定按鈕為 active
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
        // 假設 status 來自某處，這裡先預設
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
    if (tbody) tbody.remove(); // 清除舊的 tbody
    tbody = document.createElement('tbody');

    if (leaderboardData.length === 0) {
        const tr = tbody.insertRow();
        const td = tr.insertCell();
        td.colSpan = type === 'monster' ? 7 : 5; // 根據表頭數量調整
        td.textContent = '排行榜目前是空的。';
        td.style.textAlign = 'center';
        td.style.padding = '20px';
    } else {
        leaderboardData.forEach((item, index) => {
            const tr = tbody.insertRow();
            if (type === 'monster') {
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="font-semibold text-rarity-${item.rarity.toLowerCase()}">${item.nickname || '未知怪獸'}</td>
                    <td class="leaderboard-element-cell">${item.elements.map(el => `<span class="text-element-${el.toLowerCase()}">${el}</span>`).join(', ')}</td>
                    <td>${item.score || 0}</td>
                    <td>${item.owner_nickname || 'N/A'}</td>
                    <td>${item.resume?.wins || 0} / ${item.resume?.losses || 0}</td>
                    <td class="challenge-btn-cell">
                        ${ (gameState.playerId && item.owner_id !== gameState.playerId && !item.isNPC) ? 
                           `<button class="text-xs primary p-1 challenge-leaderboard-monster-btn" data-monster-id="${item.id}" data-owner-id="${item.owner_id}">挑戰</button>` : 
                           (item.isNPC ? `<button class="text-xs secondary p-1 challenge-npc-btn" data-npc-id="${item.id}">挑戰NPC</button>` : '') 
                        }
                    </td>
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
        const headers = type === 'monster' 
            ? ['#', '怪獸名稱', '屬性', '評價', '擁有者', '戰績', '操作']
            : ['#', '玩家暱稱', '積分', '戰績', '稱號'];
        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
    }
}

/**
 * 更新怪獸排行榜的元素篩選 Tab
 * @param {Array<string>} elements 元素列表 (例如 ["火", "水", ... "all"])
 */
function updateMonsterLeaderboardElementTabs(elements) {
    const container = DOMElements.monsterLeaderboardElementTabs;
    if (!container) return;
    container.innerHTML = ''; // 清空

    elements.forEach(element => {
        const button = document.createElement('button');
        button.classList.add('tab-button');
        button.dataset.tabTarget = `monster-leaderboard-${element.toLowerCase()}`; // 用於邏輯，非實際內容 ID
        button.dataset.elementFilter = element.toLowerCase();
        button.textContent = element === 'all' ? '全部' : element;
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
    } else if (loserNickname) { // 意味著另一方勝利，但可能平手或回合耗盡
        htmlLog += `<p class="battle-end loser">💔 ${loserNickname} 被擊敗了。</p>`;
    } else {
         htmlLog += `<p class="battle-end draw">🤝 戰鬥結束，平手或回合耗盡！</p>`;
    }

    logArea.innerHTML = htmlLog;
    logArea.scrollTop = logArea.scrollHeight; // 自動滾動到底部
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
            itemDiv.style.backgroundColor = `var(--element-${dna.type.toLowerCase()}-bg)`;
            itemDiv.style.color = `var(--element-${dna.type.toLowerCase()}-text)`;
            itemDiv.style.borderColor = `var(--rarity-${dna.rarity.toLowerCase()}-text)`;
            
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

    container.innerHTML = ''; // 清空現有提示
    const animationDuration = 15; // 秒，與 CSS 中的 animation-duration 匹配
    const displayTimePerHint = animationDuration / hints.length;

    hints.forEach((hint, index) => {
        const p = document.createElement('p');
        p.classList.add('scrolling-hint-text');
        p.textContent = hint;
        // 調整 animation-delay 以便提示輪播
        p.style.animationDelay = `${index * displayTimePerHint}s`;
        container.appendChild(p);
    });
}


console.log("UI module loaded.");

// 導出 (如果使用 ES6 模塊)
// export { DOMElements, toggleElementDisplay, showModal, hideModal, hideAllModals, showFeedbackModal, showConfirmationModal, updateTheme, initializeTheme, updateMonsterSnapshot, renderDNACombinationSlots, renderPlayerDNAInventory, renderTemporaryBackpack, renderMonsterFarm, updatePlayerInfoModal, updateMonsterInfoModal, switchTabContent, updateNewbieGuideModal, updateFriendsListModal, updateLeaderboardTable, updateMonsterLeaderboardElementTabs, showBattleLogModal, showDnaDrawModal, updateAnnouncementPlayerName, updateScrollingHints, getMonsterImagePath };
