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
    // monsterImage: document.getElementById('monster-image'), // 原來的整體圖片，可能會被部位圖片取代或作為底層
    snapshotAchievementTitle: document.getElementById('snapshot-achievement-title'),
    snapshotNickname: document.getElementById('snapshot-nickname'), // 項目6，位置由CSS調整
    snapshotWinLoss: document.getElementById('snapshot-win-loss'),
    snapshotEvaluation: document.getElementById('snapshot-evaluation'), // 項目6，位置由CSS調整
    snapshotMainContent: document.getElementById('snapshot-main-content'), // 這個可能是屬性顯示區，確認是否與新部位圖重疊
    
    // 新增：怪獸部位元素 (假設HTML中新增了這些ID)
    monsterPartsContainer: document.getElementById('monster-parts-container'), // 整個部位的容器
    monsterPartHead: document.getElementById('monster-part-head'),
    monsterPartLeftArm: document.getElementById('monster-part-left-arm'),
    monsterPartRightArm: document.getElementById('monster-part-right-arm'),
    monsterPartLeftLeg: document.getElementById('monster-part-left-leg'),
    monsterPartRightLeg: document.getElementById('monster-part-right-leg'),


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
    confirmationModalCloseX: document.getElementById('confirmation-modal-close-x'), // 項目5，新的X按鈕
    releaseMonsterImagePlaceholder: document.getElementById('release-monster-image-placeholder'),
    releaseMonsterImgPreview: document.getElementById('release-monster-img-preview'),
    confirmActionBtn: document.getElementById('confirm-action-btn'),
    // cancelActionBtn: document.getElementById('cancel-action-btn'), // 項目5，已移除

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
            button.className = `button ${btnConfig.class || 'secondary'}`;
            button.onclick = () => {
                if (btnConfig.onClick) btnConfig.onClick();
                hideModal('feedback-modal'); 
            };
            newFooter.appendChild(button);
        });
        DOMElements.feedbackModal.querySelector('.modal-content').appendChild(newFooter);
    } else {
        if (DOMElements.feedbackModalCloseX) { // 確保X按鈕存在
            DOMElements.feedbackModalCloseX.onclick = () => hideModal('feedback-modal');
        }
    }
    showModal('feedback-modal');
}

/**
 * 顯示確認 Modal (項目5: 移除X取消按鈕, 確定後關閉視窗)
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
    DOMElements.confirmActionBtn.className = `button ${confirmButtonClass}`; 
    
    const newConfirmBtn = DOMElements.confirmActionBtn.cloneNode(true);
    DOMElements.confirmActionBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.confirmActionBtn);
    DOMElements.confirmActionBtn = newConfirmBtn; 

    DOMElements.confirmActionBtn.onclick = () => {
        onConfirm();
        hideModal('confirmation-modal'); 
    };
    
    // 項目5: 確保右上角的紅色X按鈕可以關閉確認彈窗
    if(DOMElements.confirmationModalCloseX) { 
        DOMElements.confirmationModalCloseX.setAttribute('data-modal-id', 'confirmation-modal');
        // 通用關閉邏輯在 event-handlers.js 中 handleModalCloseButtons 處理
    }
    showModal('confirmation-modal');
}


// --- UI Update Functions ---

function updateTheme(themeName) {
    document.body.className = themeName === 'light' ? 'light-theme' : '';
    DOMElements.themeIcon.textContent = themeName === 'light' ? '☀️' : '�';
    gameState.currentTheme = themeName;
    localStorage.setItem('theme', themeName); 
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; 
    updateTheme(savedTheme);
}

/**
 * 獲取指定DNA片段和身體部位的圖片路徑。
 * 這是一個新的輔助函數，您需要根據您的圖片資源來實現。
 * @param {object | null} dnaFragment - DNA片段物件，或null。
 * @param {string} bodyPartName - 身體部位名稱 (例如 'head', 'leftArm')。
 * @returns {string} 圖片URL，如果沒有對應圖片則返回預設占位符URL。
 */
function getMonsterPartImagePath(dnaFragment, bodyPartName) {
    // 預設占位符圖片的路徑或生成規則
    const defaultPartPlaceholder = `https://placehold.co/60x60/4a5568/a0aec0?text=${bodyPartName[0].toUpperCase()}&font=inter`;

    if (!dnaFragment || !dnaFragment.id) { // 如果槽位為空或DNA無效
        return defaultPartPlaceholder;
    }

    // 假設您的圖片命名規則類似： /images/monster_parts/{dna_id_prefix}_{bodyPartName}.png
    // 例如，dnaFragment.id 可能是 'dna_fire_c01'
    // 您可能需要從 dnaFragment.id 或 dnaFragment.baseId (如果有的話) 提取一個前綴
    // const dnaPrefix = dnaFragment.baseId ? dnaFragment.baseId.split('_')[1] : dnaFragment.id.split('_')[1];
    // return `/images/monster_parts/${dnaPrefix}_${bodyPartName}.png`;

    // 為了演示，我們根據DNA類型和部位返回一個不同的占位符
    const dnaTypeInitial = dnaFragment.type ? dnaFragment.type[0] : 'X';
    const partInitial = bodyPartName[0].toUpperCase();
    return `https://placehold.co/60x60/2d3748/e2e8f0?text=${dnaTypeInitial}${partInitial}&font=inter`;
}

/**
 * 清除怪獸身體部位的圖片（設為預設或透明）。
 */
function clearMonsterBodyPartsDisplay() {
    const defaultPartPlaceholder = `https://placehold.co/60x60/1A202C/4A5568?text=?&font=inter`; // 更中性的問號
    const parts = [
        DOMElements.monsterPartHead, DOMElements.monsterPartLeftArm, 
        DOMElements.monsterPartRightArm, DOMElements.monsterPartLeftLeg, 
        DOMElements.monsterPartRightLeg
    ];
    parts.forEach(partElement => {
        if (partElement) {
            partElement.style.backgroundImage = `url('${defaultPartPlaceholder}')`;
            partElement.innerHTML = ''; // 清除可能存在的內容 (如果使用 img 標籤)
        }
    });
    if (DOMElements.monsterPartsContainer) DOMElements.monsterPartsContainer.classList.add('empty-snapshot');
}

/**
 * 更新怪獸快照面板，包括新的身體部位顯示邏輯。
 * @param {object | null} monster - 當前選中的怪獸物件 (用於顯示名稱、評價等)。
 * 如果 monster 為 null，則顯示空狀態。
 * 身體部位的圖片來源於 gameState.dnaCombinationSlots。
 */
function updateMonsterSnapshot(monster) {
    // 更新怪獸基本資訊 (暱稱、評價等) - 項目6: 位置由CSS處理
    if (monster && monster.id) {
        DOMElements.snapshotAchievementTitle.textContent = monster.title || (monster.monsterTitles && monster.monsterTitles.length > 0 ? monster.monsterTitles[0] : '新秀');
        DOMElements.snapshotNickname.textContent = monster.nickname || '未知怪獸'; 
        const resume = monster.resume || { wins: 0, losses: 0 };
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: ${resume.wins}</span><span>敗: ${resume.losses}</span>`;
        DOMElements.snapshotEvaluation.textContent = `總評價: ${monster.score || 0}`; 
        
        let elementsHtml = '<div class="flex justify-center items-center space-x-1 mt-1">';
        if (monster.elements && monster.elements.length > 0) {
            monster.elements.forEach(element => {
                elementsHtml += `<span class="text-xs px-1.5 py-0.5 rounded-full text-element-${element.toLowerCase()} bg-element-${element.toLowerCase()}-bg">${element}</span>`;
            });
        } else {
            elementsHtml += `<span class="text-xs px-1.5 py-0.5 rounded-full text-element-無 bg-element-無-bg">無</span>`;
        }
        elementsHtml += '</div>';
        // DOMElements.snapshotMainContent.innerHTML = elementsHtml; // 這行可能會覆蓋身體部位，先註解

        const rarityColorVar = `var(--rarity-${monster.rarity.toLowerCase()}-text)`;
        DOMElements.monsterSnapshotArea.style.borderColor = rarityColorVar;
        DOMElements.monsterSnapshotArea.style.boxShadow = `0 0 10px -2px ${rarityColorVar}, inset 0 0 15px -5px color-mix(in srgb, ${rarityColorVar} 30%, transparent)`;
        DOMElements.monsterInfoButton.disabled = false;
        gameState.selectedMonsterId = monster.id;
        if (DOMElements.monsterPartsContainer) DOMElements.monsterPartsContainer.classList.remove('empty-snapshot');
    } else { 
        DOMElements.snapshotAchievementTitle.textContent = '尚無怪獸';
        DOMElements.snapshotNickname.textContent = '-';
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: -</span><span>敗: -</span>`;
        DOMElements.snapshotEvaluation.textContent = `總評價: -`;
        // DOMElements.snapshotMainContent.innerHTML = ''; // 清空屬性顯示
        DOMElements.monsterSnapshotArea.style.borderColor = 'var(--border-color)';
        DOMElements.monsterSnapshotArea.style.boxShadow = 'none';
        DOMElements.monsterInfoButton.disabled = true;
        gameState.selectedMonsterId = null;
    }

    // 更新身體部位圖片，基於 gameState.dnaCombinationSlots
    if (gameState.dnaSlotToBodyPartMapping && DOMElements.monsterPartsContainer) {
        let hasAnyDnaInSlots = false;
        Object.entries(gameState.dnaSlotToBodyPartMapping).forEach(([slotIndexStr, partName]) => {
            const slotIndex = parseInt(slotIndexStr, 10);
            const dnaInSlot = gameState.dnaCombinationSlots[slotIndex]; 
            const partElementId = `monster-part-${partName.toLowerCase().replace('arm', 'Arm').replace('leg', 'Leg')}`; // e.g. monster-part-leftArm
            const partElement = document.getElementById(partElementId); // 直接用ID获取，确保获取的是最新的DOM元素

            if (partElement) {
                const imagePath = getMonsterPartImagePath(dnaInSlot, partName);
                partElement.style.backgroundImage = `url('${imagePath}')`;
                // 可以根據需要設定其他樣式，如 background-size, repeat, position
                partElement.style.backgroundSize = 'contain'; 
                partElement.style.backgroundRepeat = 'no-repeat';
                partElement.style.backgroundPosition = 'center';
            }
            if (dnaInSlot) {
                hasAnyDnaInSlots = true;
            }
        });
        if (!monster && !hasAnyDnaInSlots) { // 如果沒有選中怪獸，且所有槽位都為空
            clearMonsterBodyPartsDisplay();
        } else {
            DOMElements.monsterPartsContainer.classList.remove('empty-snapshot');
        }

    } else { // 如果沒有映射關係或容器不存在，且無選中怪獸，則清除
        if (!monster) clearMonsterBodyPartsDisplay();
    }
}


// 原來的 getMonsterImagePath 可以保留，如果主怪獸圖片 monsterImage 元素還在且需要使用
// function getMonsterImagePath(primaryElement, rarity) { ... }


/**
 * 項目1: DNA碎片(物品)顏色與文字
 */
function applyDnaItemStyle(element, dnaData) {
    if (!dnaData || !element) return;
    const rarity = dnaData.rarity ? dnaData.rarity.toLowerCase() : 'common'; 
    const type = dnaData.type ? dnaData.type.toLowerCase() : '無';
    const rarityRgbVarName = `--rarity-${rarity}-rgb`; 
    const elementTextColorVarName = `--element-${type}-text`; 
    const rarityBorderColorVarName = `--rarity-${rarity}-text`;
    const computedStyle = getComputedStyle(document.documentElement);
    const rarityRgbValue = computedStyle.getPropertyValue(rarityRgbVarName)?.trim() || computedStyle.getPropertyValue('--default-rgb')?.trim() || '128, 128, 128'; // Added fallback for default-rgb

    element.style.backgroundColor = `rgba(${rarityRgbValue}, 0.7)`;
    element.style.color = `var(${elementTextColorVarName})`; //文字颜色使用var
    element.style.borderColor = `var(${rarityBorderColorVarName}, var(--border-color))`; //邊框颜色使用var

    const rarityBadge = element.querySelector('.dna-rarity-badge');
    if (rarityBadge) {
        rarityBadge.textContent = dnaData.rarity ? dnaData.rarity[0] : '普';
        rarityBadge.style.backgroundColor = `var(${rarityBorderColorVarName})`; 
        const textColorForBadge = (dnaData.rarity === '傳奇' || dnaData.rarity === '金' || dnaData.rarity === '神話' || dnaData.rarity === '菁英') ? '#000' : '#fff'; 
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
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('dna-name-text');
            nameSpan.textContent = dna.name || '未知DNA';
            slot.appendChild(nameSpan);
            applyDnaItemStyle(slot, dna); 
            slot.draggable = true; 
            slot.dataset.dnaId = dna.id; 
            slot.dataset.dnaSource = 'combination';
        } else {
            slot.textContent = `組合槽 ${index + 1}`; 
            slot.classList.add('empty');
        }
        container.appendChild(slot);
    });
    if(DOMElements.combineButton) DOMElements.combineButton.disabled = gameState.dnaCombinationSlots.filter(s => s !== null).length < 2; 
    
    // 當組合槽變化時，更新怪獸快照的身體部位
    if (typeof updateMonsterSnapshot === 'function') {
        // 如果當前有選中的怪獸，則傳遞它，否則傳遞null以僅根據組合槽更新部位
        updateMonsterSnapshot(getSelectedMonster()); 
    }
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
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('dna-name-text'); 
        nameSpan.textContent = dna.name || '未知DNA';
        item.appendChild(nameSpan);
        item.draggable = true;
        item.dataset.dnaId = dna.id; 
        item.dataset.dnaBaseId = dna.baseId; 
        item.dataset.dnaSource = 'inventory';
        applyDnaItemStyle(item, dna); 
        if (!item.querySelector('.dna-rarity-badge')) { 
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
        emptySlot.classList.add('inventory-slot-empty', 'dna-item'); 
        emptySlot.textContent = "空位"; // 項目4
        container.appendChild(emptySlot);
    }
    const deleteSlot = document.createElement('div');
    deleteSlot.id = 'inventory-delete-slot';
    deleteSlot.classList.add('inventory-delete-slot', 'dna-item'); 
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
        slot.classList.add('temp-backpack-slot', 'occupied', 'dna-item'); 
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('dna-name-text');
        nameSpan.textContent = item.data.name || '未知物品';
        slot.appendChild(nameSpan);
        applyDnaItemStyle(slot, item.data); // 假設 item.data (DNA模板) 包含 rarity 和 type
        slot.onclick = () => handleMoveFromTempBackpackToInventory(index);
        container.appendChild(slot);
    });
    const emptyTempSlotsToRender = MAX_TEMP_SLOTS - currentTempItems.length;
    for (let i = 0; i < emptyTempSlotsToRender; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.classList.add('temp-backpack-slot', 'empty', 'dna-item'); 
        emptySlot.textContent = `空位`; 
        container.appendChild(emptySlot);
    }
}

// ... (renderMonsterFarm, updatePlayerInfoModal, etc. 保持和上次一樣，但確保完整性)
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
        battleBtn.classList.add('farm-battle-btn', 'primary', 'button'); 
        battleBtn.dataset.monsterId = monster.id;
        battleBtn.onclick = (e) => handleChallengeMonsterClick(e, monster.id); 

        const cultivateBtn = document.createElement('button');
        cultivateBtn.textContent = '修煉';
        cultivateBtn.classList.add('farm-monster-cultivate-btn', 'warning', 'button'); 
        cultivateBtn.dataset.monsterId = monster.id;
        cultivateBtn.disabled = monster.farmStatus?.isBattling || monster.farmStatus?.isTraining;
        cultivateBtn.onclick = (e) => handleCultivateMonsterClick(e, monster.id);
        actionsGroup.appendChild(cultivateBtn);

        const releaseBtn = document.createElement('button');
        releaseBtn.textContent = '放生';
        releaseBtn.classList.add('farm-monster-release-btn', 'danger', 'button'); 
        releaseBtn.dataset.monsterId = monster.id;
        releaseBtn.disabled = monster.farmStatus?.isBattling || monster.farmStatus?.isTraining;
        releaseBtn.onclick = (e) => handleReleaseMonsterClick(e, monster.id);
        actionsGroup.appendChild(releaseBtn);

        itemDiv.innerHTML = `
            <div class="farm-battle-btn-container"></div> 
            <div class="farm-monster-name truncate" title="${monster.nickname || '未知怪獸'}">${monster.nickname || '未知怪獸'}</div>
            <div class="farm-monster-status ${statusClass} truncate" title="${statusText}">${statusText}</div>
            <div class="farm-monster-score hidden sm:block">${monster.score || 0}</div> 
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
                <button class="text-xs secondary p-1 challenge-friend-btn button" data-player-id="${player.uid}" data-player-nickname="${player.nickname}">挑戰</button>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

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
    const currentSortConfig = gameState.leaderboardSortConfig[type];
    if (currentSortConfig) {
        updateLeaderboardSortIcons(table, currentSortConfig.key, currentSortConfig.order);
    }
}

function updateLeaderboardTable(type, leaderboardData) {
    const tableId = type === 'monster' ? 'monster-leaderboard-table' : 'player-leaderboard-table';
    const table = document.getElementById(tableId);
    if (!table) return;

    setupLeaderboardTableHeaders(type, table); 

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

function updateMonsterLeaderboardElementTabs(elements) {
    const container = DOMElements.monsterLeaderboardElementTabs;
    if (!container) return;
    container.innerHTML = ''; 

    const sortedElements = ['all', ...elements.filter(el => el !== 'all').sort()];

    sortedElements.forEach(element => {
        const button = document.createElement('button');
        button.classList.add('tab-button');
        button.dataset.tabTarget = `monster-leaderboard-${element.toLowerCase()}`; 
        button.dataset.elementFilter = element.toLowerCase();
        button.textContent = element === 'all' ? '全部' : (gameState.gameConfigs?.element_nicknames?.[element] || element); 
        if (element.toLowerCase() === gameState.currentMonsterLeaderboardElementFilter) {
            button.classList.add('active');
        }
        container.appendChild(button);
    });
}

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

function showDnaDrawModal(drawnDnaTemplates) {
    const gridContainer = DOMElements.dnaDrawResultsGrid;
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (!drawnDnaTemplates || drawnDnaTemplates.length === 0) {
        gridContainer.innerHTML = '<p class="text-center col-span-full">什麼也沒抽到...</p>';
    } else {
        drawnDnaTemplates.forEach((dna, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('dna-draw-result-item', 'dna-item'); 
            
            applyDnaItemStyle(itemDiv, dna); 
            
            itemDiv.textContent = ''; 

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
            addButton.className = 'add-drawn-dna-to-backpack-btn button secondary text-xs mt-1'; 
            addButton.dataset.dnaIndex = index;
            addButton.textContent = '加入背包';
            itemDiv.appendChild(addButton);
            
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

function updateAnnouncementPlayerName(nickname) {
    if (DOMElements.announcementPlayerName) {
        DOMElements.announcementPlayerName.textContent = nickname || "玩家";
    }
}

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

console.log("UI module loaded with monster parts integration and other UI refinements.");
