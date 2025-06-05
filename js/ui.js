// js/ui.js

// 注意：此檔案會依賴 gameState (來自 js/game-state.js) 和其他輔助函數

let DOMElements = {}; // 在頂層聲明，但由 initializeDOMElements 初始化

// 這個函數需要在 main.js 的 DOMContentLoaded 中被優先調用
function initializeDOMElements() {
    DOMElements = {
        authScreen: document.getElementById('auth-screen'),
        gameContainer: document.getElementById('game-container'),
        showLoginFormBtn: document.getElementById('show-login-form-btn'),
        showRegisterFormBtn: document.getElementById('show-register-form-btn'),
        mainLogoutBtn: document.getElementById('main-logout-btn'),
        registerModal: document.getElementById('register-modal'),
        registerNicknameInput: document.getElementById('register-nickname'),
        registerPasswordInput: document.getElementById('register-password'),
        registerErrorMsg: document.getElementById('register-error'),
        registerSubmitBtn: document.getElementById('register-submit-btn'),
        loginModal: document.getElementById('login-modal'),
        loginNicknameInput: document.getElementById('login-nickname'),
        loginPasswordInput: document.getElementById('login-password'),
        loginErrorMsg: document.getElementById('login-error'),
        loginSubmitBtn: document.getElementById('login-submit-btn'),
        themeSwitcherBtn: document.getElementById('theme-switcher'),
        themeIcon: document.getElementById('theme-icon'),
        monsterSnapshotArea: document.getElementById('monster-snapshot-area'),
        snapshotAchievementTitle: document.getElementById('snapshot-achievement-title'),
        snapshotNickname: document.getElementById('snapshot-nickname'),
        snapshotWinLoss: document.getElementById('snapshot-win-loss'),
        snapshotEvaluation: document.getElementById('snapshot-evaluation'),
        snapshotMainContent: document.getElementById('snapshot-main-content'),
        monsterSnapshotBaseBg: document.getElementById('monster-snapshot-base-bg'),
        monsterSnapshotBodySilhouette: document.getElementById('monster-snapshot-body-silhouette'),
        monsterPartsContainer: document.getElementById('monster-parts-container'),
        monsterPartHead: document.getElementById('monster-part-head'),
        monsterPartLeftArm: document.getElementById('monster-part-left-arm'),
        monsterPartRightArm: document.getElementById('monster-part-right-arm'),
        monsterPartLeftLeg: document.getElementById('monster-part-left-leg'),
        monsterPartRightLeg: document.getElementById('monster-part-right-leg'),
        monsterInfoButton: document.getElementById('monster-info-button'),
        playerInfoButton: document.getElementById('player-info-button'),
        showMonsterLeaderboardBtn: document.getElementById('show-monster-leaderboard-btn'),
        showPlayerLeaderboardBtn: document.getElementById('show-player-leaderboard-btn'),
        friendsListBtn: document.getElementById('friends-list-btn'),
        newbieGuideBtn: document.getElementById('newbie-guide-btn'),
        dnaCombinationSlotsContainer: document.getElementById('dna-combination-slots'),
        combineButton: document.getElementById('combine-button'),
        dnaDrawButton: document.getElementById('dna-draw-button'),
        inventoryItemsContainer: document.getElementById('inventory-items'), // DNA碎片(庫存)的容器
        temporaryBackpackContainer: document.getElementById('temporary-backpack-items'), // 臨時背包的容器
        farmedMonstersListContainer: document.getElementById('farmed-monsters-list'),
        farmHeaders: document.getElementById('farm-headers'),
        dnaFarmTabs: document.getElementById('dna-farm-tabs'),
        dnaInventoryContent: document.getElementById('dna-inventory-content'),
        monsterFarmContent: document.getElementById('monster-farm-content'),
        trainingGroundContent: document.getElementById('training-ground-content'),
        exchangeContent: document.getElementById('exchange-content'),
        homesteadContent: document.getElementById('homestead-content'),
        guildContent: document.getElementById('guild-content'),
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
        confirmationModalCloseX: document.getElementById('confirmation-modal-close-x'),
        releaseMonsterImagePlaceholder: document.getElementById('release-monster-image-placeholder'),
        releaseMonsterImgPreview: document.getElementById('release-monster-img-preview'),
        confirmActionBtn: document.getElementById('confirm-action-btn'),
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
    console.log("DOMElements initialized in ui.js");
}

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
    if (!DOMElements.feedbackModal || !DOMElements.feedbackModalTitle || !DOMElements.feedbackModalMessage) {
        console.error("Feedback modal elements not found in DOMElements.");
        return;
    }
    DOMElements.feedbackModalTitle.textContent = title;
    DOMElements.feedbackModalMessage.innerHTML = message; // Use innerHTML for potential HTML in messages
    toggleElementDisplay(DOMElements.feedbackModalSpinner, isLoading);

    if (monsterDetails) {
        // Populate monster details if provided (implementation depends on monsterDetails structure)
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, true);
    } else {
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, false);
    }

    // Clear previous buttons and add new ones if provided
    const footer = DOMElements.feedbackModal.querySelector('.modal-footer');
    if (footer) footer.remove(); // Remove existing footer

    if (actionButtons && actionButtons.length > 0) {
        const newFooter = document.createElement('div');
        newFooter.className = 'modal-footer';
        actionButtons.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.className = `button ${btnConfig.class || 'secondary'}`; // Default to secondary
            button.onclick = () => {
                if (btnConfig.onClick) btnConfig.onClick();
                hideModal('feedback-modal'); // Always hide after action
            };
            newFooter.appendChild(button);
        });
        const modalContent = DOMElements.feedbackModal.querySelector('.modal-content');
        if (modalContent) modalContent.appendChild(newFooter);
    } else {
        // Ensure default close 'x' works if no action buttons
        if (DOMElements.feedbackModalCloseX) {
             DOMElements.feedbackModalCloseX.onclick = () => hideModal('feedback-modal');
        }
    }
    showModal('feedback-modal');
}

function showConfirmationModal(title, message, onConfirm, confirmButtonClass = 'danger', confirmButtonText = '確定', monsterToRelease = null) {
    if (!DOMElements.confirmationModal || !DOMElements.confirmationModalTitle || !DOMElements.confirmationModalBody || !DOMElements.confirmActionBtn) {
        console.error("Confirmation modal elements not found in DOMElements.");
        return;
    }
    DOMElements.confirmationModalTitle.textContent = title;
    DOMElements.confirmationModalBody.innerHTML = `<p>${message}</p>`; // Use innerHTML

    if (monsterToRelease && monsterToRelease.id) {
        const imgPlaceholder = DOMElements.releaseMonsterImagePlaceholder;
        const imgPreview = DOMElements.releaseMonsterImgPreview;
        if (imgPlaceholder && imgPreview) {
            const monsterPrimaryElement = monsterToRelease.elements && monsterToRelease.elements.length > 0 ? monsterToRelease.elements[0] : '無';
            imgPreview.src = getMonsterImagePathForSnapshot(monsterPrimaryElement, monsterToRelease.rarity);
            imgPreview.alt = monsterToRelease.nickname || '怪獸圖片';
            toggleElementDisplay(imgPlaceholder, true, 'flex');
        }
    } else {
        if (DOMElements.releaseMonsterImagePlaceholder) {
            toggleElementDisplay(DOMElements.releaseMonsterImagePlaceholder, false);
        }
    }

    DOMElements.confirmActionBtn.textContent = confirmButtonText;
    DOMElements.confirmActionBtn.className = `button ${confirmButtonClass}`; // Apply class for styling

    // Re-attach event listener to avoid multiple bindings from previous calls
    const newConfirmBtn = DOMElements.confirmActionBtn.cloneNode(true); // Clone to remove old listeners
    if (DOMElements.confirmActionBtn.parentNode) {
      DOMElements.confirmActionBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.confirmActionBtn);
    }
    DOMElements.confirmActionBtn = newConfirmBtn; // Update reference

    DOMElements.confirmActionBtn.onclick = () => {
        onConfirm();
        hideModal('confirmation-modal');
    };

    // Ensure close 'x' works
    if(DOMElements.confirmationModalCloseX) {
        DOMElements.confirmationModalCloseX.setAttribute('data-modal-id', 'confirmation-modal');
        DOMElements.confirmationModalCloseX.onclick = () => hideModal('confirmation-modal');
    }
    showModal('confirmation-modal');
}


// --- UI Update Functions ---

function updateTheme(themeName) {
    document.body.className = themeName === 'light' ? 'light-theme' : '';
    if (DOMElements.themeIcon) {
        DOMElements.themeIcon.textContent = themeName === 'light' ? '☀️' : '🌙';
    }
    gameState.currentTheme = themeName;
    localStorage.setItem('theme', themeName);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
    updateTheme(savedTheme);
}

function getMonsterImagePathForSnapshot(primaryElement, rarity) {
    const colors = {
        '火': 'FF6347/FFFFFF', '水': '1E90FF/FFFFFF', '木': '228B22/FFFFFF',
        '金': 'FFD700/000000', '土': 'D2B48C/000000', '光': 'F8F8FF/000000',
        '暗': 'A9A9A9/FFFFFF', '毒': '9932CC/FFFFFF', '風': '87CEEB/000000',
        '混': '778899/FFFFFF', '無': 'D3D3D3/000000'
    };
    const colorPair = colors[primaryElement] || colors['無'];
    return `https://placehold.co/120x90/${colorPair}?text=${encodeURIComponent(primaryElement)}&font=noto-sans-tc`;
}

function getMonsterPartImagePath(dnaFragment, bodyPartName) {
    // Ensure dnaFragment and its properties exist
    if (!dnaFragment || !dnaFragment.type || !dnaFragment.rarity) {
        return 'transparent'; // Return a transparent placeholder or handle error
    }
    const dnaTypeInitial = dnaFragment.type[0]; // Get first char of DNA type
    const partInitial = bodyPartName[0].toUpperCase(); // Get first char of body part name
    // Example placeholder URL, replace with actual image logic if needed
    return `https://placehold.co/80x80/2d3748/e2e8f0?text=${dnaTypeInitial}${partInitial}&font=inter`;
}


function clearMonsterBodyPartsDisplay() {
    const partsMap = {
        Head: DOMElements.monsterPartHead,
        LeftArm: DOMElements.monsterPartLeftArm,
        RightArm: DOMElements.monsterPartRightArm,
        LeftLeg: DOMElements.monsterPartLeftLeg,
        RightLeg: DOMElements.monsterPartRightLeg,
    };
    for (const partName in partsMap) {
        const partElement = partsMap[partName];
        if (partElement) {
            partElement.style.backgroundImage = 'none'; // Clear image
            partElement.classList.add('empty-part');   // Add class for empty styling
        }
    }
    if (DOMElements.monsterPartsContainer) DOMElements.monsterPartsContainer.classList.add('empty-snapshot');
}

function updateMonsterSnapshot(monster) {
    if (!DOMElements.monsterSnapshotArea || !DOMElements.snapshotAchievementTitle ||
        !DOMElements.snapshotNickname || !DOMElements.snapshotWinLoss ||
        !DOMElements.snapshotEvaluation || !DOMElements.monsterInfoButton ||
        !DOMElements.monsterSnapshotBaseBg || !DOMElements.monsterSnapshotBodySilhouette ||
        !DOMElements.monsterPartsContainer) {
        console.error("一個或多個怪獸快照相關的 DOM 元素未找到。");
        return;
    }

    DOMElements.monsterSnapshotBaseBg.src = "https://github.com/msw2004727/MD/blob/main/images/a9f25d4e-9381-4dea-aa33-603afb3d6261.png?raw=true"; // 您的背景圖

    if (monster && monster.id) { // 如果有選中的怪獸
        DOMElements.monsterSnapshotBodySilhouette.src = "https://github.com/msw2004727/MD/blob/main/images/monster_body_transparent.png?raw=true"; // 實際怪獸圖
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block'; // 確保圖片可見

        DOMElements.snapshotAchievementTitle.textContent = monster.title || (monster.monsterTitles && monster.monsterTitles.length > 0 ? monster.monsterTitles[0] : '新秀');
        DOMElements.snapshotNickname.textContent = monster.nickname || '未知怪獸';
        const resume = monster.resume || { wins: 0, losses: 0 };
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: ${resume.wins}</span><span>敗: ${resume.losses}</span>`;
        DOMElements.snapshotEvaluation.textContent = `總評價: ${monster.score || 0}`;

        let elementsHtml = '<div class="flex justify-center items-center space-x-1">';
        if (monster.elements && monster.elements.length > 0) {
            monster.elements.forEach(element => {
                const elementClass = typeof element === 'string' ? element.toLowerCase() : '無';
                elementsHtml += `<span class="text-xs px-1.5 py-0.5 rounded-full text-element-${elementClass} bg-element-${elementClass}-bg">${element}</span>`;
            });
        } else {
            elementsHtml += `<span class="text-xs px-1.5 py-0.5 rounded-full text-element-無 bg-element-無-bg">無</span>`;
        }
        elementsHtml += '</div>';
        if(DOMElements.snapshotMainContent) DOMElements.snapshotMainContent.innerHTML = elementsHtml;


        const rarityKey = typeof monster.rarity === 'string' ? monster.rarity.toLowerCase() : 'common';
        const rarityColorVar = `var(--rarity-${rarityKey}-text, var(--text-secondary))`;
        DOMElements.monsterSnapshotArea.style.borderColor = rarityColorVar;
        DOMElements.monsterSnapshotArea.style.boxShadow = `0 0 10px -2px ${rarityColorVar}, inset 0 0 15px -5px color-mix(in srgb, ${rarityColorVar} 30%, transparent)`;
        DOMElements.monsterInfoButton.disabled = false;
        gameState.selectedMonsterId = monster.id;
    } else { // 沒有選中怪獸
        DOMElements.monsterSnapshotBodySilhouette.src = "https://placehold.co/200x180/transparent/A0AEC0?text=選取或合成怪獸&font=noto-sans-tc"; // 佔位圖
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block';

        DOMElements.snapshotAchievementTitle.textContent = '初出茅廬';
        DOMElements.snapshotNickname.textContent = '尚無怪獸';
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: -</span><span>敗: -</span>`;
        DOMElements.snapshotEvaluation.textContent = `總評價: -`;
        if(DOMElements.snapshotMainContent) DOMElements.snapshotMainContent.innerHTML = ''; // 清空元素顯示
        DOMElements.monsterSnapshotArea.style.borderColor = 'var(--border-color)';
        DOMElements.monsterSnapshotArea.style.boxShadow = 'none';
        DOMElements.monsterInfoButton.disabled = true;
        gameState.selectedMonsterId = null;
    }

    // 更新身體部位顯示邏輯
    let hasAnyDnaInSlots = false;
    if (gameState.dnaSlotToBodyPartMapping && DOMElements.monsterPartsContainer) {
        Object.entries(gameState.dnaSlotToBodyPartMapping).forEach(([slotIndexStr, partNameKey]) => {
            const slotIndex = parseInt(slotIndexStr, 10);
            const dnaInSlot = gameState.dnaCombinationSlots[slotIndex]; // 從組合槽獲取DNA
            const partElement = DOMElements[`monsterPart${partNameKey.charAt(0).toUpperCase() + partNameKey.slice(1)}`];

            if (partElement) {
                const imagePath = getMonsterPartImagePath(dnaInSlot, partNameKey);
                if (imagePath === 'transparent') {
                    partElement.style.backgroundImage = 'none';
                    partElement.classList.add('empty-part');
                } else {
                    partElement.style.backgroundImage = `url('${imagePath}')`;
                    partElement.classList.remove('empty-part');
                }
            }
            if (dnaInSlot) {
                hasAnyDnaInSlots = true;
            }
        });
        // 如果有DNA在組合槽中，或者有選中的怪獸，則顯示部位容器
        if (hasAnyDnaInSlots || monster) {
            DOMElements.monsterPartsContainer.classList.remove('empty-snapshot');
        } else {
            DOMElements.monsterPartsContainer.classList.add('empty-snapshot');
            clearMonsterBodyPartsDisplay(); // 確保在完全沒有東西時清除所有部位
        }
    } else {
        // 如果沒有組合槽映射或部位容器，且沒有選中怪獸，則清除
        if (!monster) clearMonsterBodyPartsDisplay();
    }
}


function applyDnaItemStyle(element, dnaData) {
    if (!element) return;

    if (!dnaData) { // 如果是空槽或無數據
        element.style.backgroundColor = 'var(--bg-slot)'; // 或者一個更突出的空槽背景色
        const nameSpan = element.querySelector('.dna-name-text');
        if (nameSpan) nameSpan.style.color = 'var(--text-secondary)';
        else element.style.color = 'var(--text-secondary)';
        element.style.borderColor = 'var(--border-color)';
        const rarityBadge = element.querySelector('.dna-rarity-badge'); // 假設有稀有度標籤
        if (rarityBadge) rarityBadge.style.display = 'none'; // 隱藏空槽的稀有度標籤
        return;
    }

    // 根據 DNA 類型設定背景色
    const elementTypeMap = { // 確保與 theme.css 中的變數名對應
        '火': 'fire', '水': 'water', '木': 'wood', '金': 'gold', '土': 'earth',
        '光': 'light', '暗': 'dark', '毒': 'poison', '風': 'wind', '混': 'mix', '無': '無'
    };
    const typeKey = dnaData.type ? (elementTypeMap[dnaData.type] || dnaData.type.toLowerCase()) : '無';
    const elementBgVarName = `--element-${typeKey}-bg`; // e.g., --element-fire-bg
    element.style.backgroundColor = `var(${elementBgVarName}, var(--bg-slot))`; // 使用 CSS 變數

    // 根據 DNA 稀有度設定文字顏色和邊框顏色
    const rarityMap = { // 確保與 theme.css 中的變數名對應
        '普通': 'common', '稀有': 'rare', '菁英': 'elite', '傳奇': 'legendary', '神話': 'mythical'
    };
    const rarityKey = dnaData.rarity ? (rarityMap[dnaData.rarity] || dnaData.rarity.toLowerCase()) : 'common';

    let rarityTextColorVar = `var(--rarity-${rarityKey}-text, var(--text-primary))`; // e.g., --rarity-rare-text

    const nameSpan = element.querySelector('.dna-name-text');
    if (nameSpan) {
        nameSpan.style.color = rarityTextColorVar;
    } else {
        element.style.color = rarityTextColorVar; // 如果沒有 nameSpan，直接設定元素文字顏色
    }
    element.style.borderColor = rarityTextColorVar; // 邊框也用稀有度顏色

    // 稀有度標籤 (如果有的話) - 可選
    const rarityBadge = element.querySelector('.dna-rarity-badge');
    if (rarityBadge) {
        // rarityBadge.textContent = dnaData.rarity;
        // rarityBadge.style.backgroundColor = rarityColorVar; // 或其他對比色
        // rarityBadge.style.color = 'var(--button-primary-text)'; // 確保文字可見
        rarityBadge.style.display = 'none'; // 目前設計中不顯示文字標籤，顏色體現稀有度
    }
}


function renderDNACombinationSlots() {
    const container = DOMElements.dnaCombinationSlotsContainer;
    if (!container) return;
    container.innerHTML = ''; // 清空現有槽位
    gameState.dnaCombinationSlots.forEach((dna, index) => {
        const slot = document.createElement('div');
        slot.classList.add('dna-slot');
        slot.dataset.slotIndex = index; // 用於拖放識別
        slot.dataset.dnaSource = 'combination'; // 標記來源為組合槽

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('dna-name-text'); // 用於內部文字樣式

        if (dna && dna.id) { // 如果槽內有 DNA
            slot.classList.add('occupied');
            nameSpan.textContent = dna.name || '未知DNA';
            slot.appendChild(nameSpan);
            applyDnaItemStyle(slot, dna); // 應用樣式
            slot.draggable = true; // 允許拖曳
            slot.dataset.dnaId = dna.id; // 存儲 DNA 實例 ID
            slot.dataset.dnaBaseId = dna.baseId; // 存儲 DNA 模板 ID
        } else { // 空槽
            nameSpan.textContent = `組合槽 ${index + 1}`;
            slot.appendChild(nameSpan);
            slot.classList.add('empty');
            applyDnaItemStyle(slot, null); // 應用空槽樣式
        }
        container.appendChild(slot);
    });
    // 更新合成按鈕狀態
    if(DOMElements.combineButton) DOMElements.combineButton.disabled = gameState.dnaCombinationSlots.filter(s => s !== null).length < 2;

    // 渲染組合槽後，也更新怪獸快照的身體部位顯示
    if (typeof updateMonsterSnapshot === 'function') {
        updateMonsterSnapshot(getSelectedMonster()); // 傳遞當前選中怪獸或 null
    }
}

function renderPlayerDNAInventory() {
    const container = DOMElements.inventoryItemsContainer;
    if (!container) return;
    container.innerHTML = ''; // 清空
    const MAX_INVENTORY_SLOTS = 11; // 不包括刪除區
    const ownedDna = gameState.playerData?.playerOwnedDNA || [];

    // 渲染已擁有的 DNA
    for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
        const dna = ownedDna[i]; // 嘗試獲取該位置的DNA
        const item = document.createElement('div');
        item.classList.add('dna-item'); // 所有格子都用 .dna-item 以統一基礎樣式

        if (dna && dna.id) { // 如果此位置有 DNA
            item.dataset.dnaSource = 'inventory'; // 標記來源
            item.dataset.dnaId = dna.id;
            item.dataset.dnaBaseId = dna.baseId;
            item.draggable = true;

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('dna-name-text');
            nameSpan.textContent = dna.name || '未知DNA';
            item.appendChild(nameSpan);
            applyDnaItemStyle(item, dna);
        } else { // 如果此位置為空
            item.classList.add('inventory-slot-empty');
            item.textContent = "空位";
            item.dataset.inventoryIndex = i; // 為空槽添加索引，用於精確放置
            applyDnaItemStyle(item, null);
            // 空槽預設不可拖曳，但可以作為放置目標
        }
        container.appendChild(item);
    }

    // 添加刪除區
    const deleteSlot = document.createElement('div');
    deleteSlot.id = 'inventory-delete-slot';
    deleteSlot.classList.add('inventory-delete-slot', 'dna-item'); // dna-item 用於統一基礎樣式
    deleteSlot.innerHTML = `<span class="delete-slot-main-text">刪除區</span><span class="delete-slot-sub-text">※拖曳至此</span>`;
    container.appendChild(deleteSlot);
}

function renderTemporaryBackpack() {
    const container = DOMElements.temporaryBackpackContainer;
    if (!container) return;
    container.innerHTML = '';
    const MAX_TEMP_SLOTS = 24; // 假設臨時背包總共24個槽位
    const currentTempItems = gameState.temporaryBackpack || [];

    for (let i = 0; i < MAX_TEMP_SLOTS; i++) {
        const itemDataContainer = currentTempItems[i]; // 獲取該位置的物品容器 {type, data, instanceId?}
        const slot = document.createElement('div');
        slot.classList.add('temp-backpack-slot', 'dna-item'); // dna-item for basic styling

        if (itemDataContainer && itemDataContainer.data) { // 如果此位置有物品
            const dnaData = itemDataContainer.data;
            slot.classList.add('occupied');
            slot.draggable = true;
            slot.dataset.dnaSource = 'temporaryBackpack';
            slot.dataset.tempItemIndex = i; // 索引
            // 如果物品有原始的 instanceId (從主庫存來的)，則用它作為 dnaId
            // 否則，dnaData.id 是模板ID，可以存為 baseId
            if (itemDataContainer.instanceId) {
                slot.dataset.dnaId = itemDataContainer.instanceId;
            }
            slot.dataset.dnaBaseId = dnaData.id; // 總是指向模板ID

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('dna-name-text');
            nameSpan.textContent = dnaData.name || '未知物品';
            slot.appendChild(nameSpan);
            applyDnaItemStyle(slot, dnaData);
            // 點擊事件：從臨時背包移動到主庫存
            slot.onclick = () => handleMoveFromTempBackpackToInventory(i);
        } else { // 空槽
            slot.classList.add('empty');
            slot.textContent = `空位`;
            slot.dataset.emptyTempIndex = i; // 為空槽添加索引，用於精確放置
            applyDnaItemStyle(slot, null);
        }
        container.appendChild(slot);
    }
}


// --- (以下函數保持不變，省略以節省篇幅) ---
// renderMonsterFarm, updatePlayerInfoModal, updateMonsterInfoModal,
// switchTabContent, updateNewbieGuideModal, setupLeaderboardTableHeaders,
// updateLeaderboardTable, updateLeaderboardSortIcons, updateMonsterLeaderboardElementTabs,
// updateFriendsListModal, showBattleLogModal, showDnaDrawModal,
// updateAnnouncementPlayerName, updateScrollingHints

// 確保在文件末尾重新導出（如果 main.js 中沒有直接使用全局函數）
// export { initializeDOMElements, showModal, hideModal, showFeedbackModal, ... };
// 或者確保這些函數在全局作用域中可用

console.log("UI module loaded (v8 - drag drop slot indexing).");
