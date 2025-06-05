// js/ui.js

// 注意：此檔案會依賴 gameState (來自 js/game-state.js) 和其他輔助函數

// --- DOM Element Selectors (集中管理，方便維護) ---
const DOMElements = {
    // Auth Screen
    authScreen: document.getElementById('auth-screen'),
    gameContainer: document.getElementById('game-container'),
    showLoginFormBtn: document.getElementById('show-login-form-btn'),
    showRegisterFormBtn: document.getElementById('show-register-form-btn'),
    mainLogoutBtn: document.getElementById('main-logout-btn'), 

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
    monsterImage: document.getElementById('monster-image'), // This might be the container for body parts later
    snapshotAchievementTitle: document.getElementById('snapshot-achievement-title'),
    snapshotNickname: document.getElementById('snapshot-nickname'),
    snapshotWinLoss: document.getElementById('snapshot-win-loss'),
    snapshotEvaluation: document.getElementById('snapshot-evaluation'),
    snapshotMainContent: document.getElementById('snapshot-main-content'), 
    // For monster parts, if you add them to DOMElements:
    // monsterPartHead: document.getElementById('monster-part-head'),
    // monsterPartLeftArm: document.getElementById('monster-part-left-arm'),
    // ... etc.

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
    dnaDrawButton: document.getElementById('dna-draw-button'), 

    // DNA Inventory Panel
    inventoryItemsContainer: document.getElementById('inventory-items'),
    
    // Temporary Backpack
    temporaryBackpackContainer: document.getElementById('temporary-backpack-items'),

    // Monster Farm Panel
    farmedMonstersListContainer: document.getElementById('farmed-monsters-list'),
    farmHeaders: document.getElementById('farm-headers'), 

    // Tabs
    dnaFarmTabs: document.getElementById('dna-farm-tabs'),
    dnaInventoryContent: document.getElementById('dna-inventory-content'),
    monsterFarmContent: document.getElementById('monster-farm-content'),
    trainingGroundContent: document.getElementById('training-ground-content'), 
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
    confirmationModalCloseX: document.getElementById('confirmation-modal-close-x'), // For the new X button
    releaseMonsterImagePlaceholder: document.getElementById('release-monster-image-placeholder'),
    releaseMonsterImgPreview: document.getElementById('release-monster-img-preview'),
    confirmActionBtn: document.getElementById('confirm-action-btn'),
    // cancelActionBtn: document.getElementById('cancel-action-btn'), // Removed as per request

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
    officialAnnouncementCloseX: document.getElementById('official-announcement-close-x'), 
    announcementPlayerName: document.getElementById('announcement-player-name'),

    scrollingHintsContainer: document.querySelector('.scrolling-hints-container'),
};

// --- Helper Functions ---

function toggleElementDisplay(element, show, displayType = 'block') {
    if (element) {
        element.style.display = show ? displayType : 'none';
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex'; 
        gameState.activeModalId = modalId;
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        if (gameState.activeModalId === modalId) {
            gameState.activeModalId = null;
        }
    }
}

function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.style.display = 'none');
    gameState.activeModalId = null;
}

function showFeedbackModal(title, message, isLoading = false, monsterDetails = null, actionButtons = null) {
    DOMElements.feedbackModalTitle.textContent = title;
    DOMElements.feedbackModalMessage.innerHTML = message; 
    toggleElementDisplay(DOMElements.feedbackModalSpinner, isLoading);

    if (monsterDetails) {
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
            // Add base 'button' class along with specific type (primary, secondary, etc.)
            button.className = `button ${btnConfig.class || 'secondary'}`;
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
 * 顯示確認 Modal (項目5: 移除X取消按鈕, 確定後關閉視窗)
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
    DOMElements.confirmActionBtn.className = `button ${confirmButtonClass}`; // Ensure base 'button' class
    
    // 移除舊的事件監聽器，再添加新的 (確保只有一個onConfirm)
    const newConfirmBtn = DOMElements.confirmActionBtn.cloneNode(true);
    DOMElements.confirmActionBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.confirmActionBtn);
    DOMElements.confirmActionBtn = newConfirmBtn; 

    DOMElements.confirmActionBtn.onclick = () => {
        onConfirm();
        hideModal('confirmation-modal'); // 項目5: 點確定後視窗要關閉
    };
    // 原來的 "X取消" 按鈕已從 HTML 移除。新的右上角 X 關閉按鈕由 handleModalCloseButtons 統一處理。
    // 確保 confirmationModalCloseX 在 DOMElements 中被定義並有正確的 data-modal-id。
    // 如果 confirmation-modal-close-x 是通用的 modal-close, 則無需特殊處理。
    if(DOMElements.confirmationModalCloseX) {
        DOMElements.confirmationModalCloseX.setAttribute('data-modal-id', 'confirmation-modal');
    }

    showModal('confirmation-modal');
}


// --- UI Update Functions ---

function updateTheme(themeName) {
    document.body.className = themeName === 'light' ? 'light-theme' : '';
    DOMElements.themeIcon.textContent = themeName === 'light' ? '☀️' : '🌙';
    gameState.currentTheme = themeName;
    localStorage.setItem('theme', themeName); 
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; 
    updateTheme(savedTheme);
}

/**
 * 更新怪獸快照面板 (項目6: 怪獸名字與總評價位置 - CSS處理定位, JS確保內容填充)
 * @param {object | null} monster 怪獸物件，或 null 表示無選中怪獸
 */
function updateMonsterSnapshot(monster) {
    // 這部分的JS邏輯主要是填充文字內容，具體位置由CSS決定
    // 假設HTML結構中 snapshotNickname 和 snapshotEvaluation 的容器位置已由CSS調整
    if (monster && monster.id) {
        DOMElements.snapshotAchievementTitle.textContent = monster.title || (monster.monsterTitles && monster.monsterTitles.length > 0 ? monster.monsterTitles[0] : '新秀');
        DOMElements.snapshotNickname.textContent = monster.nickname || '未知怪獸'; // 名字會顯示在CSS指定的位置
        
        const resume = monster.resume || { wins: 0, losses: 0 };
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: ${resume.wins}</span><span>敗: ${resume.losses}</span>`;
        
        DOMElements.snapshotEvaluation.textContent = `總評價: ${monster.score || 0}`; // 總評價會顯示在CSS指定的位置
        
        const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
        DOMElements.monsterImage.src = getMonsterImagePath(primaryElement, monster.rarity); // 主圖片/背景圖
        DOMElements.monsterImage.alt = monster.nickname || '怪獸圖片';

        // 更新身體部位圖片的邏輯 (如果之後實現)
        // updateMonsterBodyParts(gameState.dnaCombinationSlots);


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
        // 清空身體部位 (如果之後實現)
        // clearMonsterBodyParts();
    }
}

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
 * 項目1: DNA碎片(物品)顏色與文字
 * 項目6 (來自前次): DNA 物品樣式 - Rarity based background with opacity, element based text color
 */
function applyDnaItemStyle(element, dnaData) {
    if (!dnaData || !element) return;

    const rarity = dnaData.rarity ? dnaData.rarity.toLowerCase() : 'common'; // common 是小寫的
    const type = dnaData.type ? dnaData.type.toLowerCase() : '無';

    const rarityRgbVarName = `--rarity-${rarity}-rgb`; // e.g., --rarity-rare-rgb
    const elementTextColorVarName = `--element-${type}-text`; // e.g., --element-fire-text
    const rarityBorderColorVarName = `--rarity-${rarity}-text`;

    // 獲取CSS變數的原始值 (RGB字符串)
    const computedStyle = getComputedStyle(document.documentElement);
    const rarityRgbValue = computedStyle.getPropertyValue(rarityRgbVarName)?.trim() || computedStyle.getPropertyValue('--default-rgb').trim();

    element.style.backgroundColor = `rgba(${rarityRgbValue}, 0.7)`;
    element.style.color = `var(${elementTextColorVarName})`;
    element.style.borderColor = `var(${rarityBorderColorVarName}, var(--border-color))`;

    // Rarity badge (if needed, and a badge element exists within 'element')
    const rarityBadge = element.querySelector('.dna-rarity-badge');
    if (rarityBadge) {
        rarityBadge.textContent = dnaData.rarity ? dnaData.rarity[0] : '普';
        rarityBadge.style.backgroundColor = `var(${rarityBorderColorVarName})`; // Badge bg is solid rarity color
        const textColorForBadge = (dnaData.rarity === '傳奇' || dnaData.rarity === '金' || dnaData.rarity === '神話' || dnaData.rarity === '菁英') ? '#000' : '#fff'; // Adjust for contrast
        rarityBadge.style.color = textColorForBadge;
    }
}


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
            applyDnaItemStyle(slot, dna); // 應用統一樣式
            slot.draggable = true; 
            slot.dataset.dnaId = dna.id; 
            slot.dataset.dnaSource = 'combination';
        } else {
            slot.textContent = `組合槽 ${index + 1}`; // 修改空槽文字
            slot.classList.add('empty');
        }
        container.appendChild(slot);
    });

    DOMElements.combineButton.disabled = gameState.dnaCombinationSlots.filter(s => s !== null).length < 2; 
}

/**
 * 渲染玩家擁有的 DNA 碎片庫存
 * 項目4: DNA碎片欄的格子也要加上空位兩字
 */
function renderPlayerDNAInventory() {
    const container = DOMElements.inventoryItemsContainer;
    if (!container) return;
    container.innerHTML = ''; 
    const MAX_INVENTORY_SLOTS = 11; 

    const ownedDna = gameState.playerData?.playerOwnedDNA || [];

    ownedDna.slice(0, MAX_INVENTORY_SLOTS).forEach(dna => {
        const item = document.createElement('div');
        item.classList.add('dna-item');
        // item.textContent = dna.name || '未知DNA'; // 文字內容由 applyDnaItemStyle 或其他方式處理，避免覆蓋角標
        
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('dna-name-text'); // Class for styling name if needed
        nameSpan.textContent = dna.name || '未知DNA';
        item.appendChild(nameSpan);

        item.draggable = true;
        item.dataset.dnaId = dna.id; 
        item.dataset.dnaBaseId = dna.baseId; 
        item.dataset.dnaSource = 'inventory';

        applyDnaItemStyle(item, dna); // 應用統一樣式
        
        // 確保角標的創建邏輯在這裡，或在 applyDnaItemStyle 裡
        if (!item.querySelector('.dna-rarity-badge')) { // 避免重複添加
            const rarityBadge = document.createElement('span');
            rarityBadge.classList.add('dna-rarity-badge'); 
            rarityBadge.textContent = dna.rarity[0]; 
            rarityBadge.style.backgroundColor = `var(--rarity-${dna.rarity.toLowerCase()}-text)`;
            rarityBadge.style.color = (dna.rarity === '傳奇' || dna.rarity === '金' || dna.rarity === '神話' || dna.rarity === '菁英') ? '#000' : '#fff'; 
            item.appendChild(rarityBadge);
        }
        container.appendChild(item);
    });

    const emptySlotsToRender = MAX_INVENTORY_SLOTS - ownedDna.length;
    for (let i = 0; i < emptySlotsToRender; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.classList.add('inventory-slot-empty', 'dna-item'); // 給空槽也加上 dna-item 確保尺寸一致
        emptySlot.textContent = "空位"; // 項目4: DNA碎片欄的格子也要加上空位兩字
        container.appendChild(emptySlot);
    }
    
    const deleteSlot = document.createElement('div');
    deleteSlot.id = 'inventory-delete-slot';
    deleteSlot.classList.add('inventory-delete-slot', 'dna-item'); // 給刪除槽也加上 dna-item 確保尺寸一致
    deleteSlot.innerHTML = `<span class="delete-slot-main-text">刪除區</span><span class="delete-slot-sub-text">※拖曳至此</span>`;
    container.appendChild(deleteSlot);
}

/**
 * 渲染臨時背包 (項目3: 空位尺寸與DNA碎片區一致)
 */
function renderTemporaryBackpack() {
    const container = DOMElements.temporaryBackpackContainer;
    if (!container) return;
    container.innerHTML = '';
    const MAX_TEMP_SLOTS = 24;

    const currentTempItems = gameState.temporaryBackpack || [];

    currentTempItems.slice(0, MAX_TEMP_SLOTS).forEach((item, index) => {
        const slot = document.createElement('div');
        // 項目3: 確保尺寸一致，使用與DNA物品相同的class (如果CSS已統一樣式)
        slot.classList.add('temp-backpack-slot', 'occupied', 'dna-item'); 
        // slot.textContent = item.data.name || '未知物品'; // 改為appendChild
        
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('dna-name-text');
        nameSpan.textContent = item.data.name || '未知物品';
        slot.appendChild(nameSpan);

        applyDnaItemStyle(slot, item.data); // 假設 item.data 結構與DNA物件類似
        
        slot.onclick = () => handleMoveFromTempBackpackToInventory(index);
        container.appendChild(slot);
    });

    const emptyTempSlotsToRender = MAX_TEMP_SLOTS - currentTempItems.length;
    for (let i = 0; i < emptyTempSlotsToRender; i++) {
        const emptySlot = document.createElement('div');
        // 項目3: 確保尺寸一致
        emptySlot.classList.add('temp-backpack-slot', 'empty', 'dna-item'); 
        emptySlot.textContent = `空位`; 
        container.appendChild(emptySlot);
    }
}

// ... (其餘的 updatePlayerInfoModal, updateMonsterInfoModal, switchTabContent, updateNewbieGuideModal, updateFriendsListModal, updateLeaderboardTable, updateMonsterLeaderboardElementTabs, showBattleLogModal, showDnaDrawModal, updateAnnouncementPlayerName, updateScrollingHints 保持不變，除非特定需求影響它們)

// ... (renderMonsterFarm 保持不變，除非後續需求)

/**
 * 更新排行榜表格的表頭，為可排序的欄位添加 data-sort-key
 * @param {'monster' | 'player'} type 排行榜類型
 * @param {HTMLTableElement} table 表格元素
 */
function setupLeaderboardTableHeaders(type, table) {
    if (!table.querySelector('thead')) {
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const headersConfig = type === 'monster' 
            ? [
                { text: '#', sortKey: null }, 
                { text: '怪獸名稱', sortKey: 'nickname' }, 
                { text: '屬性', sortKey: 'elements' }, 
                { text: '評價', sortKey: 'score' }, 
                { text: '擁有者', sortKey: 'owner_nickname' }, 
                { text: '戰績', sortKey: 'resume' }
              ]
            : [
                { text: '#', sortKey: null }, 
                { text: '玩家暱稱', sortKey: 'nickname' }, 
                { text: '積分', sortKey: 'score' }, 
                { text: '戰績', sortKey: 'wins' }, 
                { text: '稱號', sortKey: 'titles' } 
              ];
        headersConfig.forEach(config => {
            const th = document.createElement('th');
            th.textContent = config.text;
            if (config.sortKey) {
                th.dataset.sortKey = config.sortKey; 
                th.innerHTML += ' <span class="sort-arrow"></span>'; 
            }
            headerRow.appendChild(th);
        });
    }
     // 初始化排序圖示
    const currentSortConfig = gameState.leaderboardSortConfig[type];
    if (currentSortConfig) {
        updateLeaderboardSortIcons(table, currentSortConfig.key, currentSortConfig.order);
    }
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

    setupLeaderboardTableHeaders(type, table); // 確保表頭已設置 data-sort-key

    let tbody = table.querySelector('tbody');
    if (tbody) tbody.remove(); 
    tbody = document.createElement('tbody');

    const dataToRender = type === 'monster' 
        ? leaderboardData.filter(item => !item.isNPC) 
        : leaderboardData;

    if (dataToRender.length === 0) {
        const tr = tbody.insertRow();
        const td = tr.insertCell();
        td.colSpan = type === 'monster' ? 6 : 5; 
        td.textContent = '排行榜目前是空的。';
        td.style.textAlign = 'center';
        td.style.padding = '20px';
    } else {
        dataToRender.forEach((item, index) => {
            const tr = tbody.insertRow();
            if (type === 'monster') {
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="font-semibold text-rarity-${item.rarity.toLowerCase()}">${item.nickname || '未知怪獸'}</td>
                    <td class="leaderboard-element-cell">${item.elements.map(el => `<span class="text-element-${el.toLowerCase()}">${el}</span>`).join(', ')}</td>
                    <td>${item.score || 0}</td>
                    <td>${item.owner_nickname || 'N/A'}</td>
                    <td>${item.resume?.wins || 0} / ${item.resume?.losses || 0}</td>
                `;
            } else { 
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
    
    // 表頭已在 setupLeaderboardTableHeaders 中處理
    // 更新排序圖示，以防數據是外部加載的，而排序狀態來自gameState
    const currentSortConfig = gameState.leaderboardSortConfig[type];
    if (currentSortConfig) {
        updateLeaderboardSortIcons(table, currentSortConfig.key, currentSortConfig.order);
    }
}


function updateLeaderboardSortIcons(tableElement, activeSortKey, sortOrder) {
    if (!tableElement) return;
    const headers = tableElement.querySelectorAll('thead th[data-sort-key]');
    headers.forEach(th => {
        const arrowSpan = th.querySelector('.sort-arrow');
        if (arrowSpan) {
            if (th.dataset.sortKey === activeSortKey) {
                arrowSpan.textContent = sortOrder === 'asc' ? '▲' : '▼';
                arrowSpan.classList.add('active');
            } else {
                arrowSpan.textContent = ''; 
                arrowSpan.classList.remove('active');
            }
        }
    });
}

function showDnaDrawModal(drawnDnaTemplates) {
    const gridContainer = DOMElements.dnaDrawResultsGrid;
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (!drawnDnaTemplates || drawnDnaTemplates.length === 0) {
        gridContainer.innerHTML = '<p class="text-center col-span-full">什麼也沒抽到...</p>';
    } else {
        drawnDnaTemplates.forEach((dna, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('dna-draw-result-item', 'dna-item'); // Add 'dna-item' for consistent styling
            
            applyDnaItemStyle(itemDiv, dna); // Use the helper to apply style
            
            // Clear textContent if applyDnaItemStyle doesn't handle it well with badges
            itemDiv.textContent = ''; // Clear if applyDnaItemStyle adds text directly

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('dna-name-text');
            nameSpan.textContent = dna.name || '未知DNA';
            itemDiv.appendChild(nameSpan);

            const typeSpan = document.createElement('div');
            typeSpan.classList.add('dna-type');
            typeSpan.textContent = dna.type;
            itemDiv.appendChild(typeSpan);
            
            const raritySpan = document.createElement('div');
            raritySpan.classList.add('dna-rarity', `text-rarity-${dna.rarity.toLowerCase()}`);
            raritySpan.textContent = dna.rarity;
            itemDiv.appendChild(raritySpan);

            const addButton = document.createElement('button');
            addButton.className = 'add-drawn-dna-to-backpack-btn button secondary text-xs mt-1'; // Added 'button' class
            addButton.dataset.dnaIndex = index;
            addButton.textContent = '加入背包';
            itemDiv.appendChild(addButton);
            
            // Ensure rarity badge is present if needed
             if (!itemDiv.querySelector('.dna-rarity-badge')) {
                const rarityBadge = document.createElement('span');
                rarityBadge.classList.add('dna-rarity-badge'); 
                rarityBadge.textContent = dna.rarity[0]; 
                rarityBadge.style.backgroundColor = `var(--rarity-${dna.rarity.toLowerCase()}-text)`;
                rarityBadge.style.color = (dna.rarity === '傳奇' || dna.rarity === '金' || dna.rarity === '神話' || dna.rarity === '菁英') ? '#000' : '#fff'; 
                itemDiv.appendChild(rarityBadge);
            }

            gridContainer.appendChild(itemDiv);
        });
    }
    showModal('dna-draw-modal');
}


// ... [Rest of the functions: updateMonsterLeaderboardElementTabs, showBattleLogModal, updateAnnouncementPlayerName, updateScrollingHints] remain the same for now
// ... Make sure these functions are present in your actual ui.js file if they were there before.

console.log("UI module loaded with further updates for DNA/item styling, empty slots, and leaderboard headers.");

