// js/ui.js
console.log("DEBUG: ui.js starting to load and define functions."); // Add this line

// 注意：此檔案會依賴 gameState (來自 js/game-state.js) 和其他輔助函數

let DOMElements = {}; // 在頂層聲明，但由 initializeDOMElements 初始化

// ====== 將 switchTabContent 函數聲明在頂層，確保其可見性 ======
function switchTabContent(targetTabId, clickedButton, modalId = null) {
    let tabButtonsContainer, tabContentsContainer;

    if (modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return;
        tabButtonsContainer = modalElement.querySelector('.tab-buttons');
        tabContentsContainer = modalElement;
    } else {
        tabButtonsContainer = DOMElements.dnaFarmTabs;
        tabContentsContainer = DOMElements.dnaFarmTabs.parentNode;
    }

    if (!tabButtonsContainer || !tabContentsContainer) return;

    tabButtonsContainer.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    clickedButton.classList.add('active');

    tabContentsContainer.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    const targetContent = tabContentsContainer.querySelector(`#${targetTabId}`);
    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.style.display = 'block';
    }
}
// =============================================================

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
        inventoryItemsContainer: document.getElementById('inventory-items'),
        temporaryBackpackContainer: document.getElementById('temporary-backpack-items'),
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
        refreshMonsterLeaderboardBtn: document.getElementById('refresh-monster-leaderboard-btn'),
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

    // 清理之前的內容
    DOMElements.feedbackModalMessage.innerHTML = '';
    toggleElementDisplay(DOMElements.feedbackModalSpinner, isLoading);
    if (DOMElements.feedbackMonsterDetails) {
        DOMElements.feedbackMonsterDetails.innerHTML = '';
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, false);
    }
    const modalBody = DOMElements.feedbackModal.querySelector('.modal-body');
    const existingBanner = modalBody ? modalBody.querySelector('.feedback-banner') : null;
    if (existingBanner) existingBanner.remove();

    DOMElements.feedbackModalTitle.textContent = title;

    if (monsterDetails) {
        // --- 合成成功的新版彈窗 ---
        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'feedback-banner';
        bannerContainer.style.textAlign = 'center';
        bannerContainer.style.marginBottom = '15px';
        bannerContainer.innerHTML = `<img src="https://github.com/msw2004727/MD/blob/main/images/BN002.png?raw=true" alt="合成成功橫幅" style="max-width: 100%; border-radius: 6px;">`;
        if(modalBody) modalBody.prepend(bannerContainer);

        const successMessage = "成功合成了新的怪獸";
        let discoveryMessage = "";
        if (monsterDetails.activityLog && monsterDetails.activityLog.some(log => log.message.includes("首次發現新配方"))) {
            discoveryMessage = `<p class="text-center text-sm text-[var(--rarity-legendary-text)] mt-2">是這個世界首次發現的稀有品種！</p>`;
        }

        DOMElements.feedbackModalMessage.innerHTML = `
            <h4 class="text-xl font-bold text-center text-[var(--accent-color)] mb-2">${monsterDetails.nickname || '未知怪獸'}</h4>
            <p class="text-center text-base text-[var(--text-secondary)]">${successMessage}</p>
            ${discoveryMessage}
        `;

        toggleElementDisplay(DOMElements.feedbackMonsterDetails, true, 'block');
        DOMElements.feedbackMonsterDetails.innerHTML = `
            <div class="details-section mt-4">
                 <h5 class="details-section-title">綜合評價</h5>
                 <p class="ai-generated-text text-sm">${monsterDetails.aiEvaluation || 'AI 綜合評價生成中或失敗...'}</p>
            </div>
        `;

        DOMElements.feedbackModal.querySelector('.modal-content').classList.remove('large-feedback-modal');

    } else if (title === '修煉開始！') {
        // --- 修煉開始的新版彈窗 ---
        let monsterName = '未知怪獸';
        const parts = message.split(' 已開始為期');
        if (parts.length > 0 && parts[0].startsWith('怪獸 ')) {
            monsterName = parts[0].substring(3);
        }

        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'feedback-banner';
        bannerContainer.style.textAlign = 'center';
        bannerContainer.style.marginBottom = '15px';
        bannerContainer.innerHTML = `<img src="https://github.com/msw2004727/MD/blob/main/images/BN004.png?raw=true" alt="修煉橫幅" style="max-width: 100%; border-radius: 6px;">`;
        if(modalBody) modalBody.prepend(bannerContainer);

        DOMElements.feedbackModalMessage.innerHTML = `<p class="text-center text-base">怪獸 <strong class="text-[var(--accent-color)]">${monsterName}</strong> 已開始修煉。</p>`;
        DOMElements.feedbackModal.querySelector('.modal-content').classList.remove('large-feedback-modal');

    } else {
        // --- 舊的簡單訊息顯示方式 (用於載入中、錯誤等) ---
        DOMElements.feedbackModalMessage.innerHTML = message;
        DOMElements.feedbackModal.querySelector('.modal-content').classList.remove('large-feedback-modal');
    }

    // 處理按鈕
    let footer = DOMElements.feedbackModal.querySelector('.modal-footer');
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
        const modalContent = DOMElements.feedbackModal.querySelector('.modal-content');
        if (modalContent) modalContent.appendChild(newFooter);
    }


    if (DOMElements.feedbackModalCloseX) {
        DOMElements.feedbackModalCloseX.setAttribute('data-modal-id', 'feedback-modal');
        DOMElements.feedbackModalCloseX.onclick = () => hideModal('feedback-modal');
    }

    showModal('feedback-modal');
}


function showConfirmationModal(title, message, onConfirm, options = {}) {
    const {
        confirmButtonClass = 'danger',
        confirmButtonText = '確定',
        monsterToRelease = null
    } = options;

    if (!DOMElements.confirmationModal || !DOMElements.confirmationModalTitle || !DOMElements.confirmationModalBody || !DOMElements.confirmActionBtn) {
        console.error("Confirmation modal elements not found in DOMElements.");
        return;
    }
    DOMElements.confirmationModalTitle.textContent = title;

    let bodyHtml = '';

    // NEW: Special layout for battle confirmation
    if (title === '確認出戰') {
        const playerMonster = getSelectedMonster();
        const opponentMonster = gameState.battleTargetMonster;

        if (playerMonster && opponentMonster) {
            const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
            const playerRarityKey = playerMonster.rarity ? (rarityMap[playerMonster.rarity] || 'common') : 'common';
            const opponentRarityKey = opponentMonster.rarity ? (rarityMap[opponentMonster.rarity] || 'common') : 'common';
            
            bodyHtml = `
                <div class="confirmation-banner" style="text-align: center; margin-bottom: 1rem;">
                    <img src="https://github.com/msw2004727/MD/blob/main/images/PK002.png?raw=true" alt="對戰" style="max-width: 100%; border-radius: 6px;">
                </div>
                <div class="battle-confirm-grid">
                    <div class="monster-confirm-details player">
                        <p class="monster-role">您的怪獸</p>
                        <p class="monster-name text-rarity-${playerRarityKey}">${playerMonster.nickname}</p>
                        <p class="monster-score">(評價: ${playerMonster.score})</p>
                    </div>
                    <div class="monster-confirm-details opponent">
                        <p class="monster-role">對手的怪獸</p>
                        <p class="monster-name text-rarity-${opponentRarityKey}">${opponentMonster.nickname}</p>
                        <p class="monster-score">(評價: ${opponentMonster.score})</p>
                    </div>
                </div>
                <p class="text-center mt-4">確定挑戰嗎?</p>
            `;
        } else {
             bodyHtml = `<p>${message}</p>`; // Fallback
        }
    } else if (title === '提前結束修煉') {
        bodyHtml += `
            <div class="confirmation-banner" style="text-align: center; margin-bottom: 15px;">
                <img src="https://github.com/msw2004727/MD/blob/main/images/BN006.png?raw=true" alt="提前結束修煉橫幅" style="max-width: 100%; border-radius: 6px;">
            </div>
            <p>${message}</p>
        `;
    } else if (monsterToRelease) {
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monsterToRelease.rarity ? (rarityMap[monsterToRelease.rarity] || 'common') : 'common';
        const coloredNickname = `<span class="text-rarity-${rarityKey} font-bold">${monsterToRelease.nickname}</span>`;
        const finalMessage = message.replace(`"${monsterToRelease.nickname}"`, coloredNickname);
        bodyHtml += `<p>${finalMessage}</p>`;

        const imgPlaceholder = DOMElements.releaseMonsterImagePlaceholder;
        const imgPreview = DOMElements.releaseMonsterImgPreview;
        if (imgPlaceholder && imgPreview) {
            const monsterPrimaryElement = monsterToRelease.elements && monsterToRelease.elements.length > 0 ? monsterToRelease.elements[0] : '無';
            imgPreview.src = getMonsterImagePathForSnapshot(monsterPrimaryElement, monsterToRelease.rarity);
            imgPreview.alt = monsterToRelease.nickname || '怪獸圖片';
            toggleElementDisplay(imgPlaceholder, true, 'flex');
        }
    } else {
        bodyHtml += `<p>${message}</p>`;
        if (DOMElements.releaseMonsterImagePlaceholder) {
            toggleElementDisplay(DOMElements.releaseMonsterImagePlaceholder, false);
        }
    }

    DOMElements.confirmationModalBody.innerHTML = bodyHtml;

    DOMElements.confirmActionBtn.textContent = confirmButtonText;
    DOMElements.confirmActionBtn.className = `button ${confirmButtonClass}`;

    const newConfirmBtn = DOMElements.confirmActionBtn.cloneNode(true);
    if (DOMElements.confirmActionBtn.parentNode) {
      DOMElements.confirmActionBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.confirmActionBtn);
    }
    DOMElements.confirmActionBtn = newConfirmBtn;

    DOMElements.confirmActionBtn.onclick = () => {
        onConfirm();
        hideModal('confirmation-modal');
    };

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
    const savedTheme = localStorage.getItem('theme') || 'dark';
    updateTheme(savedTheme);
}

function getMonsterImagePathForSnapshot(primaryElement, rarity) {
    const colors = {
        '火': 'FF6347/FFFFFF', '水': '1E90FF/FFFFFF', '木': '228B22/FFFFFF',
        '金': 'FFD700/000000', '土': 'D2B48C/000000', '光': 'F8F8FF/000000',
        '暗': 'A9A99/FFFFFF', '毒': '9932CC/FFFFFF', '風': '87CEEB/000000',
        '混': '778899/FFFFFF', '無': 'D3D3D3/000000'
    };
    const colorPair = colors[primaryElement] || colors['無'];
    return `https://placehold.co/120x90/${colorPair}?text=${encodeURIComponent(primaryElement)}&font=noto-sans-tc`;
}

function getMonsterPartImagePath(dnaTemplateId) {
    if (!dnaTemplateId || !gameState.gameConfigs || !gameState.gameConfigs.dna_fragments) {
        return null;
    }
    const dnaTemplate = gameState.gameConfigs.dna_fragments.find(d => d.id === dnaTemplateId);
    return dnaTemplate || null;
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
            applyDnaItemStyle(partElement, null); // Use the main styling function to clear
            partElement.innerHTML = ''; // Ensure no leftover text
            partElement.classList.add('empty-part');
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

    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

    DOMElements.monsterSnapshotBaseBg.src = "https://github.com/msw2004727/MD/blob/main/images/a001.png?raw=true";
    clearMonsterBodyPartsDisplay();

    if (monster && monster.id) {
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';

        DOMElements.monsterSnapshotBodySilhouette.src = "https://github.com/msw2004727/MD/blob/main/images/mb01.png?raw=true";
        DOMElements.monsterSnapshotBodySilhouette.style.opacity = 1;
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block';

        DOMElements.snapshotAchievementTitle.textContent = monster.title || (monster.monsterTitles && monster.monsterTitles.length > 0 ? monster.monsterTitles[0] : '新秀');

        DOMElements.snapshotNickname.textContent = monster.nickname || '未知怪獸';
        DOMElements.snapshotNickname.className = `text-rarity-${rarityKey}`;

        const resume = monster.resume || { wins: 0, losses: 0 };
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: ${resume.wins}</span><span>敗: ${resume.losses}</span>`;
        DOMElements.snapshotEvaluation.textContent = `總評價: ${monster.score || 0}`;

        if (DOMElements.snapshotMainContent) {
            DOMElements.snapshotMainContent.innerHTML = '';
        }

        const rarityColorVar = `var(--rarity-${rarityKey}-text, var(--text-secondary))`;
        DOMElements.monsterSnapshotArea.style.borderColor = rarityColorVar;
        DOMElements.monsterSnapshotArea.style.boxShadow = `0 0 10px -2px ${rarityColorVar}, inset 0 0 15px -5px color-mix(in srgb, ${rarityColorVar} 30%, transparent)`;
        DOMElements.monsterInfoButton.disabled = false;
        gameState.selectedMonsterId = monster.id;

        if (monster.constituent_dna_ids && monster.constituent_dna_ids.length > 0 && gameState.gameConfigs?.dna_fragments) {
            const partsMap = {
                0: DOMElements.monsterPartHead,
                1: DOMElements.monsterPartLeftArm,
                2: DOMElements.monsterPartRightArm,
                3: DOMElements.monsterPartLeftLeg,
                4: DOMElements.monsterPartRightLeg
            };

            clearMonsterBodyPartsDisplay();

            monster.constituent_dna_ids.forEach((dnaBaseId, index) => {
                const partElement = partsMap[index];
                if (partElement) {
                    const dnaTemplate = getMonsterPartImagePath(dnaBaseId);
                    applyDnaItemStyle(partElement, dnaTemplate); // Use the styling function
                    if (dnaTemplate) {
                        partElement.innerHTML = `<span class="dna-name-text">${dnaTemplate.name}</span>`;
                        partElement.classList.remove('empty-part');
                    } else {
                        partElement.innerHTML = '';
                        partElement.classList.add('empty-part');
                    }
                }
            });
            DOMElements.monsterPartsContainer.classList.remove('empty-snapshot');
        } else {
            clearMonsterBodyPartsDisplay();
            DOMElements.monsterPartsContainer.classList.add('empty-snapshot');
        }
    } else {
        DOMElements.monsterSnapshotBodySilhouette.src = "";
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'none';

        DOMElements.snapshotAchievementTitle.textContent = '初出茅廬';
        DOMElements.snapshotNickname.textContent = '尚無怪獸';
        DOMElements.snapshotNickname.className = ''; // 清除稀有度顏色
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: -</span><span>敗: -</span>`;
        DOMElements.snapshotEvaluation.textContent = `總評價: -`;
        if(DOMElements.snapshotMainContent) DOMElements.snapshotMainContent.innerHTML = '';
        DOMElements.monsterSnapshotArea.style.borderColor = 'var(--border-color)';
        DOMElements.monsterSnapshotArea.style.boxShadow = 'none';
        DOMElements.monsterInfoButton.disabled = true;
        gameState.selectedMonsterId = null;
        clearMonsterBodyPartsDisplay();
        DOMElements.monsterPartsContainer.classList.add('empty-snapshot');
    }
}


function applyDnaItemStyle(element, dnaData) {
    if (!element) return;

    if (!dnaData) {
        element.style.backgroundColor = '';
        element.style.color = '';
        element.style.borderColor = '';
        const nameSpan = element.querySelector('.dna-name-text');
        if (nameSpan) {
            nameSpan.textContent = "空位";
        }
        element.classList.add('empty');
        element.classList.remove('occupied');
        return;
    }

    element.classList.remove('empty');
    element.classList.add('occupied');

    const elementTypeMap = {
        '火': 'fire', '水': 'water', '木': 'wood', '金': 'gold', '土': 'earth',
        '光': 'light', '暗': 'dark', '毒': 'poison', '風': 'wind', '混': 'mix', '無': '無'
    };
    const typeKey = dnaData.type ? (elementTypeMap[dnaData.type] || dnaData.type.toLowerCase()) : '無';
    const elementBgVarName = `--element-${typeKey}-bg`;
    element.style.backgroundColor = `var(${elementBgVarName}, var(--bg-slot))`;

    const rarityMap = {
        '普通': 'common', '稀有': 'rare', '菁英': 'elite', '傳奇': 'legendary', '神話': 'mythical'
    };
    const rarityKey = dnaData.rarity ? (rarityMap[dnaData.rarity] || dnaData.rarity.toLowerCase()) : 'common';

    let rarityTextColorVar = `var(--rarity-${rarityKey}-text, var(--text-primary))`;

    element.style.color = rarityTextColorVar;
    element.style.borderColor = rarityTextColorVar;

    // Ensure the name is displayed
    const nameSpan = element.querySelector('.dna-name-text');
    if (nameSpan) {
        nameSpan.textContent = dnaData.name || '未知DNA';
    } else {
        element.innerHTML = `<span class="dna-name-text">${dnaData.name || '未知DNA'}</span>`;
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
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('dna-name-text');
        slot.appendChild(nameSpan);

        if (dna && dna.id) {
            slot.classList.add('occupied');
            nameSpan.textContent = dna.name || '未知DNA';
            applyDnaItemStyle(slot, dna);
            slot.draggable = true;
            slot.dataset.dnaId = dna.id;
            slot.dataset.dnaBaseId = dna.baseId;
            slot.dataset.dnaSource = 'combination';
            slot.dataset.slotIndex = index;
        } else {
            nameSpan.textContent = `組合槽 ${index + 1}`;
            slot.classList.add('empty');
            applyDnaItemStyle(slot, null);
            slot.dataset.slotIndex = index;
        }
        container.appendChild(slot);
    });
    if(DOMElements.combineButton) DOMElements.combineButton.disabled = gameState.dnaCombinationSlots.filter(s => s !== null).length < 2;
}

function renderPlayerDNAInventory() {
    const container = DOMElements.inventoryItemsContainer;
    if (!container) return;
    container.innerHTML = '';
    const MAX_INVENTORY_SLOTS = gameState.MAX_INVENTORY_SLOTS;
    const ownedDna = gameState.playerData?.playerOwnedDNA || [];

    for (let index = 0; index < MAX_INVENTORY_SLOTS; index++) {
        const item = document.createElement('div');
        item.classList.add('dna-item');

        if (index === 11) {
            item.id = 'inventory-delete-slot';
            item.classList.add('inventory-delete-slot');
            item.innerHTML = `<span class="delete-slot-main-text">刪除區</span><span class="delete-slot-sub-text">拖曳至此</span>`;
            item.draggable = false;
            item.dataset.inventoryIndex = index;
        } else {
            const dna = ownedDna[index];
            item.dataset.inventoryIndex = index;

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('dna-name-text');
            item.appendChild(nameSpan);

            if (dna) {
                item.draggable = true;
                item.dataset.dnaId = dna.id;
                item.dataset.dnaBaseId = dna.baseId;
                item.dataset.dnaSource = 'inventory';
                applyDnaItemStyle(item, dna);
            } else {
                item.draggable = true;
                item.dataset.dnaSource = 'inventory';
                applyDnaItemStyle(item, null);
                nameSpan.textContent = '空位';
            }
        }
        container.appendChild(item);
    }
}

function renderTemporaryBackpack() {
    const container = DOMElements.temporaryBackpackContainer;
    if (!container) return;
    container.innerHTML = '';
    const MAX_TEMP_SLOTS = 9;
    const currentTempItems = gameState.temporaryBackpack || [];

    let tempBackpackArray = new Array(MAX_TEMP_SLOTS).fill(null);
    currentTempItems.forEach((item, index) => {
        if (index < MAX_TEMP_SLOTS) {
            tempBackpackArray[index] = item;
        }
    });

    tempBackpackArray.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.classList.add('temp-backpack-slot', 'dna-item');
        slot.dataset.tempItemIndex = index;

        if (item) {
            slot.classList.add('occupied');
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('dna-name-text');
            nameSpan.textContent = item.data.name || '未知物品';
            slot.appendChild(nameSpan);
            applyDnaItemStyle(slot, item.data);
            slot.draggable = true;
            slot.dataset.dnaId = item.data.id;
            slot.dataset.dnaBaseId = item.data.baseId;
            slot.dataset.dnaSource = 'temporaryBackpack';
            slot.onclick = () => handleMoveFromTempBackpackToInventory(index);
        } else {
            slot.classList.add('empty');
            slot.innerHTML = `<span class="dna-name-text">空位</span>`;
            applyDnaItemStyle(slot, null);
            slot.draggable = false;
        }
        container.appendChild(slot);
    });
}

function renderMonsterFarm() {
    const listContainer = DOMElements.farmedMonstersListContainer;
    const farmHeaders = DOMElements.farmHeaders;
    if (!listContainer || !farmHeaders) return;

    // 動態產生表頭
    farmHeaders.innerHTML = `
        <div>出戰</div>
        <div>怪獸</div>
        <div>評價</div>
        <div>狀態</div>
        <div>養成</div>
    `;

    listContainer.innerHTML = '';

    if (!gameState.playerData || !gameState.playerData.farmedMonsters || gameState.playerData.farmedMonsters.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">農場空空如也，快去組合怪獸吧！</p>`;
        farmHeaders.style.display = 'none';
        return;
    }
    farmHeaders.style.display = 'grid';

    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

    gameState.playerData.farmedMonsters.forEach(monster => {
        const item = document.createElement('div');
        item.classList.add('farm-monster-item');

        const isDeployed = gameState.selectedMonsterId === monster.id;
        if (isDeployed) {
            item.classList.add('selected');
        }

        item.dataset.monsterId = monster.id;

        let statusText = "待命中";
        let statusStyle = "color: var(--warning-color); font-weight: bold;";

        // 新增：優先檢查瀕死狀態
        if (monster.hp <= monster.initial_max_hp * 0.25) {
            statusText = "瀕死";
            statusStyle = "color: var(--danger-color); font-weight: bold;";
        }

        if (monster.farmStatus) {
            if (isDeployed) {
                statusText = "出戰中";
                statusStyle = "color: var(--danger-color); font-weight: bold;";
            } else if (monster.farmStatus.isTraining) {
                const startTime = monster.farmStatus.trainingStartTime || 0;
                const totalDuration = monster.farmStatus.trainingDuration || 0;
                const totalDurationInSeconds = Math.floor(totalDuration / 1000);

                const elapsedTimeInSeconds = Math.floor((Date.now() - startTime) / 1000);

                if (elapsedTimeInSeconds < totalDurationInSeconds) {
                    statusText = `修煉中 (${elapsedTimeInSeconds}/${totalDurationInSeconds}s)`;
                    statusStyle = "color: var(--accent-color);";
                } else {
                    statusText = "修煉完成";
                    statusStyle = "color: var(--success-color); font-weight: bold;";
                }
            }
        }

        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';

        const battleButtonIcon = isDeployed ? '⚔️' : '🛡️';
        const battleButtonClass = isDeployed ? 'danger' : 'success';
        const battleButtonTitle = isDeployed ? '出戰中' : '設為出戰';

        const isTraining = monster.farmStatus?.isTraining;
        const cultivateBtnText = isTraining ? '召回' : '修煉';
        let cultivateBtnClasses = 'farm-monster-cultivate-btn button text-xs';
        let cultivateBtnStyle = '';

        if (isTraining) {
            cultivateBtnClasses += ' secondary';
            cultivateBtnStyle = `background-color: #D8BFD8; color: black; border-color: #C8A2C8;`;
        } else {
            cultivateBtnClasses += ' warning';
        }


        item.innerHTML = `
            <div class="farm-col farm-col-battle">
                <button class="farm-battle-btn button ${battleButtonClass}" title="${battleButtonTitle}">
                    ${battleButtonIcon}
                </button>
            </div>
            <div class="farm-col farm-col-info">
                <strong class="monster-name-display text-rarity-${rarityKey}">${monster.nickname}</strong>
                <div class="monster-details-display">
                    ${(monster.elements || []).map(el => `<span class="text-xs text-element-${getElementCssClassKey(el)}">${el}</span>`).join(' ')}
                </div>
            </div>
            <div class="farm-col farm-col-score">
                <span class="score-value">${monster.score || 0}</span>
            </div>
            <div class="farm-col farm-col-status">
                <span class="status-text" style="${statusStyle}">${statusText}</span>
            </div>
            <div class="farm-col farm-col-actions">
                <button class="farm-monster-info-btn button primary text-xs">資訊</button>
                <button class="${cultivateBtnClasses}"
                        style="${cultivateBtnStyle}"
                        title="${isTraining ? '召回修煉' : '開始修煉'}"
                        ${isDeployed ? 'disabled' : ''}>
                    ${cultivateBtnText}
                </button>
                <button class="farm-monster-release-btn button danger text-xs" ${isTraining || isDeployed ? 'disabled' : ''}>放生</button>
            </div>
        `;

        item.querySelector('.farm-battle-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeployMonsterClick(monster.id);
        });

        item.querySelector('.farm-monster-info-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            updateMonsterInfoModal(monster, gameState.gameConfigs);
            showModal('monster-info-modal');
        });

        const cultivateBtn = item.querySelector('.farm-monster-cultivate-btn');
        if (cultivateBtn) {
             cultivateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (monster.farmStatus?.isTraining) {
                    handleEndCultivationClick(e, monster.id, monster.farmStatus.trainingStartTime, monster.farmStatus.trainingDuration);
                } else {
                    handleCultivateMonsterClick(e, monster.id);
                }
            });
        }

        item.querySelector('.farm-monster-release-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            handleReleaseMonsterClick(e, monster.id);
        });

        listContainer.appendChild(item);
    });

    if (!gameState.farmTimerInterval) {
        gameState.farmTimerInterval = setInterval(renderMonsterFarm, 1000);
    }
}

function updatePlayerInfoModal(playerData, gameConfigs) {
    const body = DOMElements.playerInfoModalBody;
    if (!body || !playerData || !playerData.playerStats) {
        if (body) body.innerHTML = '<p>無法載入玩家資訊。</p>';
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
        const monsters = playerData.farmedMonsters;
        const previewLimit = 5;
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

        let previewHtml = monsters.slice(0, previewLimit).map(m => {
            const rarityKey = m.rarity ? (rarityMap[m.rarity] || 'common') : 'common';
            return `<li><span class="monster-name text-rarity-${rarityKey}">${m.nickname}</span> <span class="monster-score">評價: ${m.score || 0}</span></li>`
        }).join('');

        let moreMonstersHtml = '';
        if (monsters.length > previewLimit) {
            moreMonstersHtml = `<div id="more-monsters-list" style="display:none;">${
                monsters.slice(previewLimit).map(m => {
                    const rarityKey = m.rarity ? (rarityMap[m.rarity] || 'common') : 'common';
                    return `<li><span class="monster-name text-rarity-${rarityKey}">${m.nickname}</span> <span class="monster-score">評價: ${m.score || 0}</span></li>`
                }).join('')
            }</div>`;
        }

        ownedMonstersHtml = `<ul class="owned-monsters-list mt-1">${previewHtml}${moreMonstersHtml}</ul>`;

        if (monsters.length > previewLimit) {
            ownedMonstersHtml += `<button id="toggle-monster-list-btn" class="button secondary text-xs w-full mt-2">顯示更多 (${monsters.length - previewLimit}隻)...</button>`;
        }
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
        <div id="player-monsters-section" class="details-section mt-3">
            <h5 class="details-section-title">持有怪獸 (共 ${playerData.farmedMonsters.length || 0} 隻)</h5>
            ${ownedMonstersHtml}
        </div>
        <p class="creation-time-centered mt-3">上次存檔時間: ${new Date(playerData.lastSave * 1000).toLocaleString()}</p>
    `;

    const toggleBtn = body.querySelector('#toggle-monster-list-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const moreList = body.querySelector('#more-monsters-list');
            const isHidden = moreList.style.display === 'none';
            moreList.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? '收合列表' : `顯示更多 (${playerData.farmedMonsters.length - 5}隻)...`;
        });
    }
}

function updateMonsterInfoModal(monster, gameConfigs) {
    if (!DOMElements.monsterInfoModalHeader || !DOMElements.monsterDetailsTabContent || !DOMElements.monsterActivityLogsContainer) {
        console.error("Monster info modal elements not found in DOMElements.");
        return;
    }
    if (!monster || !monster.id) {
        DOMElements.monsterInfoModalHeader.innerHTML = '<h4 class="monster-info-name-styled">無法載入怪獸資訊</h4>';
        DOMElements.monsterDetailsTabContent.innerHTML = '<p>錯誤：找不到怪獸資料。</p>';
        DOMElements.monsterActivityLogsContainer.innerHTML = '<p>無法載入活動紀錄。</p>';
        return;
    }

    // 將怪獸 ID 附加到 header 元素上，以便事件處理器讀取
    DOMElements.monsterInfoModalHeader.dataset.monsterId = monster.id;

    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
    const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
    const rarityColorVar = `var(--rarity-${rarityKey}-text, var(--text-primary))`;
    
    const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
    const defaultElementNickname = gameConfigs.element_nicknames ? (gameConfigs.element_nicknames[primaryElement] || '') : '';
    const editableNickname = monster.custom_element_nickname || defaultElementNickname;

    DOMElements.monsterInfoModalHeader.innerHTML = `
        <div id="monster-nickname-display-container" class="monster-nickname-display-container">
            <h4 class="monster-info-name-styled" style="color: ${rarityColorVar};">
                ${monster.nickname}
            </h4>
            <button id="edit-monster-nickname-btn" class="button secondary" title="編輯名稱">✏️</button>
        </div>
        <div id="monster-nickname-edit-container" class="monster-nickname-edit-container" style="display: none;">
            <input type="text" id="monster-nickname-input" placeholder="輸入5個字以內" value="${editableNickname}" maxlength="5">
            <button id="confirm-nickname-change-btn" class="button success" title="確認">✔️</button>
            <button id="cancel-nickname-change-btn" class="button danger" title="取消">❌</button>
        </div>
    `;

    const detailsBody = DOMElements.monsterDetailsTabContent;

    let resistancesHtml = '<p class="text-sm">無特殊抗性/弱點</p>';
    if (monster.resistances && Object.keys(monster.resistances).length > 0) {
        resistancesHtml = '<ul class="list-disc list-inside text-sm">';
        for (const [element, value] of Object.entries(monster.resistances)) {
            if (value === 0) continue;
            const effect = value > 0 ? '抗性' : '弱點';
            const colorClass = value > 0 ? 'text-[var(--success-color)]' : 'text-[var(--danger-color)]';
            const elClass = typeof element === 'string' ? `text-element-${getElementCssClassKey(element)}` : '';
            resistancesHtml += `<li><span class="capitalize ${elClass}">${element}</span>: <span class="${colorClass}">${Math.abs(value)}% ${effect}</span></li>`;
        }
        resistancesHtml += '</ul>';
    }

    let skillsHtml = '<p class="text-sm">尚無技能</p>';
    const maxSkills = gameConfigs?.value_settings?.max_monster_skills || 3;
    if (monster.skills && monster.skills.length > 0) {
        skillsHtml = monster.skills.map(skill => {
            const skillTypeClass = typeof skill.type === 'string' ? `text-element-${getElementCssClassKey(skill.type)}` : '';
            const description = skill.description || skill.story || '暫無描述';
            const expPercentage = skill.exp_to_next_level > 0 ? (skill.current_exp / skill.exp_to_next_level) * 100 : 0;
            const expBarHtml = `
                <div style="margin-top: 5px;">
                    <div style="background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 1px; max-width: 200px; height: 14px;">
                        <div style="width: ${expPercentage}%; height: 100%; background-color: var(--accent-color); border-radius: 3px;"></div>
                    </div>
                    <p class="text-xs text-[var(--text-secondary)]" style="margin-top: 2px;">經驗: ${skill.current_exp} / ${skill.exp_to_next_level || '-'}</p>
                </div>
            `;

            return `
            <div class="skill-entry">
                <span class="skill-name ${skillTypeClass}">${skill.name} (Lv.${skill.level || 1})</span>
                <p class="skill-details">威力: ${skill.power}, 消耗MP: ${skill.mp_cost || 0}, 類別: ${skill.skill_category || '未知'}</p>
                <p class="skill-details text-xs">${description}</p>
                ${skill.current_exp !== undefined ? expBarHtml : ''}
            </div>
        `}).join('');
    }

    const personality = monster.personality || { name: '未知', description: '無' };
    const aiIntroduction = monster.aiIntroduction || 'AI 介紹生成中或失敗...';
    
    const resume = monster.resume || { wins: 0, losses: 0 };
    const challengeInfoHtml = `
        <div class="details-section">
            <h5 class="details-section-title">挑戰資訊</h5>
            <div class="details-item"><span class="details-label">勝場:</span><span class="details-value text-[var(--success-color)]">${resume.wins}</span></div>
            <div class="details-item"><span class="details-label">敗場:</span><span class="details-value text-[var(--danger-color)]">${resume.losses}</span></div>
            <div class="details-item"><span class="details-label">打出最高傷害:</span><span class="details-value">-</span></div>
            <div class="details-item"><span class="details-label">承受最高傷害:</span><span class="details-value">-</span></div>
            <div class="details-item"><span class="details-label">吞噬紀錄:</span><span class="details-value">-</span></div>
        </div>
    `;

    let constituentDnaHtml = '';
    const dnaSlots = new Array(5).fill(null);
    if (monster.constituent_dna_ids && gameState.gameConfigs?.dna_fragments) {
        monster.constituent_dna_ids.forEach((id, i) => {
            if (i < 5) {
                dnaSlots[i] = gameState.gameConfigs.dna_fragments.find(d => d.id === id) || null;
            }
        });
    }

    const dnaItemsHtml = dnaSlots.map(dna => {
        if (dna) {
            return `<div class="dna-item occupied" data-dna-ref-id="${dna.id}">
                        <span class="dna-name-text">${dna.name}</span>
                    </div>`;
        } else {
            return `<div class="dna-item empty"><span class="dna-name-text">無</span></div>`;
        }
    }).join('');

    constituentDnaHtml = `
        <div class="details-section">
            <h5 class="details-section-title">怪獸DNA組成</h5>
            <div class="inventory-grid" style="grid-template-columns: repeat(5, 1fr); gap: 0.5rem;">
                ${dnaItemsHtml}
            </div>
        </div>
    `;

    const gains = monster.cultivation_gains || {};
    const getGainHtml = (statName) => {
        const gain = gains[statName] || 0;
        if (gain > 0) {
            return ` <span style="color: var(--success-color); font-size: 0.9em; margin-left: 4px;">+${gain}</span>`;
        }
        return '';
    };

    detailsBody.innerHTML = `
        <div class="details-grid-rearranged">
            <div class="details-column-left" style="display: flex; flex-direction: column;">
                <div class="details-section" style="margin-bottom: 0.5rem;">
                    <h5 class="details-section-title">基礎屬性</h5>
                    <div class="details-item"><span class="details-label">稀有度:</span> <span class="details-value text-rarity-${rarityKey}">${monster.rarity}</span></div>
                    <div class="details-item"><span class="details-label">HP:</span> <span class="details-value">${monster.hp}/${monster.initial_max_hp}${getGainHtml('hp')}</span></div>
                    <div class="details-item"><span class="details-label">MP:</span> <span class="details-value">${monster.mp}/${monster.initial_max_mp}${getGainHtml('mp')}</span></div>
                    <div class="details-item"><span class="details-label">攻擊:</span> <span class="details-value">${monster.attack}${getGainHtml('attack')}</span></div>
                    <div class="details-item"><span class="details-label">防禦:</span> <span class="details-value">${monster.defense}${getGainHtml('defense')}</span></div>
                    <div class="details-item"><span class="details-label">速度:</span> <span class="details-value">${monster.speed}${getGainHtml('speed')}</span></div>
                    <div class="details-item"><span class="details-label">爆擊率:</span> <span class="details-value">${monster.crit}%${getGainHtml('crit')}</span></div>
                    <div class="details-item"><span class="details-label">總評價:</span> <span class="details-value text-[var(--success-color)]">${monster.score || 0}</span></div>
                </div>
                ${constituentDnaHtml}
            </div>

            <div class="details-column-right">
                ${challengeInfoHtml}
                <div class="details-section">
                    <h5 class="details-section-title">元素抗性</h5>
                    ${resistancesHtml}
                </div>
                <div class="details-section">
                    <h5 class="details-section-title">技能列表 (最多 ${maxSkills} 個)</h5>
                    ${skillsHtml}
                </div>
            </div>
        </div>

        <div class="details-section mt-3">
            <h5 class="details-section-title">個性說明</h5>
            <p class="ai-generated-text text-sm" style="line-height: 1.6;">
                <strong style="color: ${personality.colorDark || 'var(--accent-color)'};">${personality.name || '未知'}:</strong><br>
                ${personality.description || '暫無個性說明。'}
            </p>
        </div>
        <div class="details-section mt-3">
            <h5 class="details-section-title">生物調查紀錄</h5>
            <p class="ai-generated-text text-sm">${aiIntroduction}</p>
        </div>
        <p class="creation-time-centered">創建時間: ${new Date(monster.creationTime * 1000).toLocaleString()}</p>
    `;

    detailsBody.querySelectorAll('.dna-item[data-dna-ref-id]').forEach(el => {
        const dnaId = el.dataset.dnaRefId;
        const dnaTemplate = gameState.gameConfigs?.dna_fragments.find(d => d.id === dnaId);
        if (dnaTemplate) {
            applyDnaItemStyle(el, dnaTemplate);
        }
    });

    const logsContainer = DOMElements.monsterActivityLogsContainer;
    if (monster.activityLog && monster.activityLog.length > 0) {
        logsContainer.innerHTML = monster.activityLog.map(log =>
            `<div class="log-entry"><span class="log-time">${log.time}</span> <span class="log-message">${log.message}</span></div>`
        ).join('');
    } else {
        logsContainer.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">尚無活動紀錄。</p>';
    }

    if (DOMElements.monsterInfoTabs) {
        const firstTabButton = DOMElements.monsterInfoTabs.querySelector('.tab-button[data-tab-target="monster-details-tab"]');
        if (firstTabButton) {
            switchTabContent('monster-details-tab', firstTabButton, 'monster-info-modal');
        }
    }
}


function updateNewbieGuideModal(guideEntries, searchTerm = '') {
    const container = DOMElements.newbieGuideContentArea;
    if (!container) return;
    container.innerHTML = '';

    const filteredEntries = guideEntries.filter(entry =>
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredEntries.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)]">找不到符合 "${searchTerm}" 的指南內容。</p>`;
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

function setupLeaderboardTableHeaders(tableId, headersConfig) {
    const table = document.getElementById(tableId);
    if (!table) return;
    let thead = table.querySelector('thead');
    if (!thead) {
        thead = document.createElement('thead');
        table.appendChild(thead);
    }
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');
    headersConfig.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.text;
        th.dataset.sortKey = header.key;
        if(header.align) th.style.textAlign = header.align;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    let tbody = table.querySelector('tbody');
    if (!tbody) {
        tbody = document.createElement('tbody');
        table.appendChild(tbody);
    }
    tbody.innerHTML = '';
}

// 輔助函數：將中文元素名稱轉換為對應的英文 CSS 類名鍵
function getElementCssClassKey(chineseElement) {
    const elementTypeMap = {
        '火': 'fire', '水': 'water', '木': 'wood', '金': 'gold', '土': 'earth',
        '光': 'light', '暗': 'dark', '毒': 'poison', '風': 'wind', '混': 'mix', '無': '無'
    };
    return elementTypeMap[chineseElement] || '無'; // 預設為 '無'
}


function updateLeaderboardTable(tableType, data) {
    console.log("updateLeaderboardTable called with data:", data); // Debugging log
    const tableId = tableType === 'monster' ? 'monster-leaderboard-table' : 'player-leaderboard-table';
    const table = document.getElementById(tableId);
    if (!table) {
        console.error("Leaderboard table element not found:", tableId); // Debugging error
        return;
    }

    let headersConfig;
    if (tableType === 'monster') {
        headersConfig = [
            { text: '排名', key: 'rank', align: 'center' },
            { text: '怪獸暱稱', key: 'nickname' },
            { text: '元素', key: 'elements', align: 'center' },
            { text: '稀有度', key: 'rarity', align: 'center' },
            { text: '總評價', key: 'score', align: 'center' },
            { text: '勝/敗', key: 'resume', align: 'center' },
            { text: '擁有者', key: 'owner_nickname' },
            { text: '操作', key: 'actions', align: 'center' }
        ];
    } else { // player
        headersConfig = [
            { text: '排名', key: 'rank', align: 'center' },
            { text: '玩家暱稱', key: 'nickname' },
            { text: '總積分', key: 'score', align: 'center' },
            { text: '勝場', key: 'wins', align: 'center' },
            { text: '敗場', key: 'losses', align: 'center' },
            { text: '稱號', key: 'titles' }
        ];
    }
    setupLeaderboardTableHeaders(tableId, headersConfig);

    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        const colSpan = headersConfig.length;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-3 text-[var(--text-secondary)]">排行榜無資料。</td></tr>`;
        return;
    }
    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

    data.forEach((item, index) => {
        const row = tbody.insertRow();

        if (tableType === 'monster') {
            const isTraining = item.farmStatus?.isTraining || false;
            const isBattling = item.farmStatus?.isBattling || false;

            const rankCell = row.insertCell();
            rankCell.textContent = index + 1;
            rankCell.style.textAlign = 'center';

            const nicknameCell = row.insertCell();
            const nicknameSpan = document.createElement('span');
            const rarityKey = item.rarity ? (rarityMap[item.rarity] || 'common') : 'common';
            nicknameSpan.className = `text-rarity-${rarityKey}`;
            nicknameSpan.textContent = item.nickname;
            nicknameCell.appendChild(nicknameSpan);

            const elementsCell = row.insertCell();
            elementsCell.style.textAlign = 'center';
            if(item.elements && Array.isArray(item.elements)) {
                elementsCell.innerHTML = item.elements.map(el =>
                    `<span class="text-xs text-element-${getElementCssClassKey(el)} font-bold mr-2">${el}</span>`
                ).join('');
            }

            const rarityCell = row.insertCell();
            rarityCell.textContent = item.rarity;
            rarityCell.className = `text-rarity-${rarityKey}`;
            rarityCell.style.textAlign = 'center';

            const scoreCell = row.insertCell();
            scoreCell.textContent = item.score;
            scoreCell.style.textAlign = 'center';
            scoreCell.style.color = 'var(--success-color)';

            const resumeCell = row.insertCell();
            resumeCell.textContent = `${item.resume?.wins || 0} / ${item.resume?.losses || 0}`;
            resumeCell.style.textAlign = 'center';

            const ownerCell = row.insertCell();
            ownerCell.textContent = item.owner_nickname || 'N/A';
            if (item.owner_id === gameState.playerId) {
                ownerCell.style.fontWeight = 'bold';
                ownerCell.style.color = 'var(--accent-color)';
            }

            const actionsCell = row.insertCell();
            actionsCell.style.textAlign = 'center';
            const actionButton = document.createElement('button');
            actionButton.className = 'button primary text-xs py-1 px-2';

            if (item.owner_id === gameState.playerId) {
                actionButton.textContent = '我的怪獸';
                actionButton.disabled = true;
                actionButton.style.cursor = 'not-allowed';
                actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                actionButton.style.color = 'var(--text-secondary)';
            } else {
                if (item.hp / item.initial_max_hp < 0.25) {
                    actionButton.textContent = '瀕死';
                    actionButton.disabled = true;
                    actionButton.style.cursor = 'not-allowed';
                    actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                    actionButton.style.color = 'var(--danger-color)';
                    actionButton.style.fontWeight = 'bold';
                } else if (isTraining || isBattling) {
                    actionButton.textContent = '忙碌中';
                    actionButton.disabled = true;
                    actionButton.style.cursor = 'not-allowed';
                    actionButton.style.backgroundColor = 'var(--button-secondary-bg)';
                    actionButton.style.color = 'var(--text-secondary)';
                } else {
                    actionButton.textContent = '挑戰';
                    actionButton.onclick = (e) => handleChallengeMonsterClick(e, item.id, item.owner_id, null, item.owner_nickname);
                }
            }
            actionsCell.appendChild(actionButton);

        } else { // Player Leaderboard
            const rankCell = row.insertCell();
            rankCell.textContent = index + 1;
            rankCell.style.textAlign = 'center';

            row.insertCell().textContent = item.nickname;

            const scoreCell = row.insertCell();
            scoreCell.textContent = item.score;
            scoreCell.style.textAlign = 'center';
            scoreCell.style.color = 'var(--success-color)';

            const winsCell = row.insertCell();
            winsCell.textContent = item.wins;
            winsCell.style.textAlign = 'center';

            const lossesCell = row.insertCell();
            lossesCell.textContent = item.losses;
            lossesCell.style.textAlign = 'center';

            const titlesCell = row.insertCell();
            titlesCell.textContent = item.titles && item.titles.length > 0 ? item.titles.join(', ') : '無';
        }
    });
    updateLeaderboardSortHeader(table, gameState.leaderboardSortConfig[tableType]?.key, gameState.leaderboardSortConfig[tableType]?.order);
}

function updateLeaderboardSortHeader(table, sortKey, order) {
    if (!table) return;
    const headers = table.querySelectorAll('thead th');
    headers.forEach(th => {
        const arrow = th.querySelector('.sort-arrow');
        if (arrow) arrow.remove();

        if (th.dataset.sortKey === sortKey) {
            const arrowSpan = document.createElement('span');
            arrowSpan.className = 'sort-arrow active';
            arrowSpan.textContent = order === 'asc' ? ' ▲' : ' ▼';
            th.appendChild(arrowSpan);
        }
    });
}

// 新增：更新排行榜頁籤的函式
function updateMonsterLeaderboardElementTabs(elements) {
    const container = DOMElements.monsterLeaderboardElementTabs;
    if (!container) return;
    container.innerHTML = ''; // 清空現有頁籤

    elements.forEach(element => {
        const tab = document.createElement('button');
        tab.className = 'button tab-button leaderboard-element-tab';
        tab.dataset.elementFilter = element;

        if (element === 'all') {
            tab.textContent = '全部';
            tab.classList.add('active'); // 預設選中 "全部"
        } else {
            tab.textContent = element;
            const cssClassKey = getElementCssClassKey(element);
            tab.classList.add(`text-element-${cssClassKey}`);
        }
        container.appendChild(tab);
    });
}

// 調整 showBattleLogModal 函數以顯示新的單頁戰報
function showBattleLogModal(battleResult) {
    if (!DOMElements.battleLogArea || !DOMElements.battleLogModal) {
        console.error("Battle log modal elements not found in DOMElements.");
        return;
    }

    DOMElements.battleLogArea.innerHTML = ''; // 清空舊內容

    const battleReportContent = battleResult.ai_battle_report_content;

    // 修改：即使 battleReportContent 為空，也繼續執行，以便顯示部分內容或錯誤
    if (!battleReportContent) {
        DOMElements.battleLogArea.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">戰報資料結構錯誤，無法顯示。</p>';
        showModal('battle-log-modal');
        return;
    }

    const playerMonsterData = getSelectedMonster();
    const opponentMonsterData = gameState.battleTargetMonster;

    // 修改：formatBasicText 函數以處理粗體，不再處理數字
    function formatBasicText(text) {
        if (!text) return '';
        // 將 **text** 替換為 <strong>text</strong>
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
    
    const skillLevelColors = {
        1: 'var(--text-secondary)', 2: 'var(--text-secondary)', 3: 'var(--text-primary)',
        4: 'var(--text-primary)', 5: 'var(--accent-color)', 6: 'var(--accent-color)',
        7: 'var(--success-color)', 8: 'var(--success-color)', 9: 'var(--rarity-legendary-text)',
        10: 'var(--rarity-mythical-text)'
    };
    const rarityColors = {
        '普通': 'var(--rarity-common-text)', '稀有': 'var(--rarity-rare-text)',
        '菁英': 'var(--rarity-elite-text)', '傳奇': 'var(--rarity-legendary-text)',
        '神話': 'var(--rarity-mythical-text)'
    };

    function applyDynamicStylingToBattleReport(text, playerMon, opponentMon) {
        if (!text) return '(內容為空)';
        let styledText = text;
        const applyMonNameColor = (monData) => {
            if (monData && monData.nickname && monData.rarity) {
                const monColor = rarityColors[monData.rarity] || 'var(--text-primary)';
                styledText = styledText.replace(new RegExp(`(?![^<]*>)(?<!<span[^>]*?>|<strong>)(${monData.nickname})(?!<\\/span>|<\\/strong>)`, 'g'), `<span style="color: ${monColor}; font-weight: bold;">$1</span>`);
            }
        };
        if (playerMon) applyMonNameColor(playerMon);
        if (opponentMon) applyMonNameColor(opponentMon);

        const allSkills = [];
        if (playerMon && playerMon.skills) allSkills.push(...playerMon.skills);
        if (opponentMon && opponentMon.skills) allSkills.push(...opponentMon.skills);
        const uniqueSkillNames = new Set(allSkills.map(s => s.name));
        uniqueSkillNames.forEach(skillName => {
            const skillInfo = allSkills.find(s => s.name === skillName);
            if (skillInfo && skillInfo.level !== undefined) {
                const color = skillLevelColors[skillInfo.level] || skillLevelColors[1];
                styledText = styledText.replace(new RegExp(`(?![^<]*>)(?<!<span[^>]*?>|<strong>)(${skillName})(?!<\\/span>|<\\/strong>)`, 'g'), `<span style="color: ${color}; font-weight: bold;">$1</span>`);
            }
        });

        // 處理 <damage> 和 <heal> 標籤
        styledText = styledText.replace(/<damage>(.*?)<\/damage>/g, '<span class="battle-damage-value">-$1</span>');
        styledText = styledText.replace(/<heal>(.*?)<\/heal>/g, '<span class="battle-heal-value">+$1</span>');

        return styledText;
    }

    const reportContainer = document.createElement('div');
    reportContainer.classList.add('battle-report-container');

    const battleHeaderBanner = document.createElement('div');
    battleHeaderBanner.classList.add('battle-header-banner');
    battleHeaderBanner.innerHTML = `<img src="https://github.com/msw2004727/MD/blob/main/images/PK002.png?raw=true" alt="戰鬥記錄橫幅">`;
    const modalContent = DOMElements.battleLogModal.querySelector('.modal-content');
    if (modalContent) {
        const existingBanner = modalContent.querySelector('.battle-header-banner');
        if (existingBanner) existingBanner.remove();
        modalContent.insertBefore(battleHeaderBanner, modalContent.firstChild);
    }

    // 戰鬥對陣 (顯示基礎數值、歷史勝率、個性)
    const renderMonsterStats = (monster, isPlayer) => {
        if (!monster) return '<div>對手資料錯誤</div>'; // 防呆
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        const personalityName = monster.personality?.name?.replace('的', '') || '未知';
        const winRate = monster.resume && (monster.resume.wins + monster.resume.losses > 0)
            ? ((monster.resume.wins / (monster.resume.wins + monster.resume.losses)) * 100).toFixed(1)
            : 'N/A';
        const prefix = isPlayer ? '我方: ' : '敵方: ';
        const nicknameSpan = `<span class="monster-name">${prefix}${monster.nickname}</span>`;

        return `
            <div class="monster-stats-card text-rarity-${rarityKey}">
                ${nicknameSpan}
                <p class="monster-personality">個性: ${personalityName}</p>
                <div class="stats-grid">
                    <span>HP: ${monster.initial_max_hp}</span>
                    <span>攻擊: ${monster.attack}</span>
                    <span>防禦: ${monster.defense}</span>
                    <span>速度: ${monster.speed}</span>
                    <span>爆擊: ${monster.crit}%</span>
                    <span>勝率: ${winRate}%</span>
                </div>
            </div>
        `;
    };

    reportContainer.innerHTML += `
        <div class="report-section battle-intro-section">
            <h4 class="report-section-title">戰鬥對陣</h4>
            <div class="monster-vs-grid">
                <div class="player-side">${renderMonsterStats(playerMonsterData, true)}</div>
                <div class="vs-divider">VS</div>
                <div class="opponent-side">${renderMonsterStats(opponentMonsterData, false)}</div>
            </div>
        </div>
    `;

    const battleDescriptionFormatted = formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.battle_description, playerMonsterData, opponentMonsterData));

    reportContainer.innerHTML += `
        <div class="report-section battle-description-section">
            <h4 class="report-section-title">精彩交戰</h4>
            <div class="battle-description-content">${battleDescriptionFormatted.replace(/\n/g, '<br>')}</div>
        </div>`;
    
    let resultBannerHtml = '';
    if (battleResult.winner_id === playerMonsterData.id) {
        resultBannerHtml = `<h1 class="battle-result-win">勝</h1>`;
    } else if (battleResult.winner_id === '平手') {
        resultBannerHtml = `<h1 class="battle-result-draw">合</h1>`;
    } else {
        resultBannerHtml = `<h1 class="battle-result-loss">敗</h1>`;
    }

    reportContainer.innerHTML += `
        <div class="report-section battle-result-banner">
            ${resultBannerHtml}
        </div>
        <div class="report-section battle-summary-section">
            <h4 class="report-section-title">戰報總結</h4>
            <p class="battle-summary-text">${formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.battle_summary, playerMonsterData, opponentMonsterData))}</p>
        </div>`;

    const highlights = battleResult.battle_highlights || [];
    if (highlights.length > 0) {
        let highlightsHtml = highlights.map((item, index) => 
            `<li class="highlight-item" ${index >= 3 ? 'style="display:none;"' : ''}>${item}</li>`
        ).join('');
        
        let showMoreBtnHtml = '';
        if (highlights.length > 3) {
            showMoreBtnHtml = `<button id="toggle-highlights-btn" class="button secondary text-xs w-full mt-2">顯示更多...</button>`;
        }

        reportContainer.innerHTML += `
            <div class="report-section battle-highlights-section">
                <h4 class="report-section-title">戰鬥亮點</h4>
                <ul id="battle-highlights-list">${highlightsHtml}</ul>
                ${showMoreBtnHtml}
            </div>`;
    }

    reportContainer.innerHTML += `
        <div class="report-section battle-outcome-section">
            <h4 class="report-section-title">戰鬥結果細項</h4>
            <p class="loot-info-text">${formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.loot_info, playerMonsterData, opponentMonsterData))}</p>
            <p class="growth-info-text">${formatBasicText(applyDynamicStylingToBattleReport(battleReportContent.growth_info, playerMonsterData, opponentMonsterData))}</p>
        </div>`;

    DOMElements.battleLogArea.appendChild(reportContainer);

    const toggleBtn = DOMElements.battleLogArea.querySelector('#toggle-highlights-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const list = DOMElements.battleLogArea.querySelector('#battle-highlights-list');
            const isExpanded = toggleBtn.textContent === '收合列表';
            list.querySelectorAll('.highlight-item').forEach((item, index) => {
                if (index >= 3) {
                    item.style.display = isExpanded ? 'none' : 'list-item';
                }
            });
            toggleBtn.textContent = isExpanded ? `顯示更多...` : '收合列表';
        });
    }

    DOMElements.battleLogArea.scrollTop = 0;
    showModal('battle-log-modal');
}


function showDnaDrawModal(drawnItems) {
    if (!DOMElements.dnaDrawResultsGrid || !DOMElements.dnaDrawModal) return;
    const grid = DOMElements.dnaDrawResultsGrid;
    grid.innerHTML = '';

    if (!drawnItems || drawnItems.length === 0) {
        grid.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)]">本次未抽到任何DNA。</p>';
    } else {
        drawnItems.forEach((dna, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('dna-draw-result-item');
            applyDnaItemStyle(itemDiv, dna);

            itemDiv.innerHTML = `
                <span class="dna-name">${dna.name}</span>
                <span class="dna-type">${dna.type}屬性</span>
                <span class="dna-rarity text-rarity-${dna.rarity.toLowerCase()}">${dna.rarity}</span>
                <button class="add-drawn-dna-to-backpack-btn button primary text-xs mt-2" data-dna-index="${index}">加入背包</button>
            `;
            grid.appendChild(itemDiv);
        });
    }
    showModal('dna-draw-modal');
}

function updateAnnouncementPlayerName(playerName) {
    if (DOMElements.announcementPlayerName) {
        DOMElements.announcementPlayerName.textContent = playerName || "玩家";
    }
}

// 新增：用於更新修煉成果彈窗的函式
function updateTrainingResultsModal(results, monsterName) {
    if (!DOMElements.trainingResultsModal) return;

    DOMElements.trainingResultsModalTitle.textContent = `${monsterName} 的修煉成果`;

    const modalBody = DOMElements.trainingResultsModal.querySelector('.modal-body');
    let banner = modalBody.querySelector('.training-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.className = 'training-banner';
        banner.style.textAlign = 'center';
        banner.style.marginBottom = '1rem';
        modalBody.prepend(banner);
    }
    banner.innerHTML = `<img src="https://github.com/msw2004727/MD/blob/main/images/BN005.png?raw=true" alt="修煉成果橫幅" style="max-width: 100%; border-radius: 6px;">`;

    const storySection = DOMElements.trainingStoryResult.parentNode;
    if (storySection) {
        const storyContent = (results.adventure_story || "沒有特別的故事發生。").replace(/\n/g, '<br>');
        storySection.innerHTML = `
            <h5>📜 冒險故事</h5>
            <div id="adventure-story-container" style="display: none; padding: 5px; border-left: 3px solid var(--border-color); margin-top: 5px;">
                <p>${storyContent}</p>
            </div>
            <a href="#" id="toggle-story-btn" style="display: block; text-align: center; margin-top: 8px; color: var(--accent-color); cursor: pointer; text-decoration: underline;">點此查看此趟的冒險故事 ▼</a>
        `;
        
        const toggleBtn = storySection.querySelector('#toggle-story-btn');
        const storyContainer = storySection.querySelector('#adventure-story-container');
        if (toggleBtn && storyContainer) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isHidden = storyContainer.style.display === 'none';
                storyContainer.style.display = isHidden ? 'block' : 'none';
                toggleBtn.innerHTML = isHidden ? '收合冒險故事 ▲' : '點此查看此趟的冒險故事 ▼';
            });
        }
    }

    const statGrowthLogs = results.skill_updates_log.filter(log => log.startsWith("💪"));
    let statGrowthHtml = '<ul>';
    if (statGrowthLogs.length > 0) {
        statGrowthLogs.forEach(log => statGrowthHtml += `<li>${log}</li>`);
    } else {
        statGrowthHtml += "<li>這趟試煉基礎數值沒有提升。</li>";
    }
    statGrowthHtml += "</ul>";

    let skillAndNewSkillLogs = results.skill_updates_log.filter(log => log.startsWith("🎉") || log.startsWith("🌟"));
    let skillGrowthHtml = '<ul>';
    if (skillAndNewSkillLogs.length > 0) {
        skillAndNewSkillLogs.forEach(log => skillGrowthHtml += `<li>${log}</li>`);
    } else {
        skillGrowthHtml += "<li>能力沒有明顯變化。</li>";
    }
    skillGrowthHtml += "</ul>";

    DOMElements.trainingGrowthResult.innerHTML = `
        <div class="training-result-subsection">
            ${skillGrowthHtml}
        </div>
        <div class="training-result-subsection mt-3">
            <h5>💪 數值提升</h5>
            ${statGrowthHtml}
        </div>
    `;

    const itemsContainer = DOMElements.trainingItemsResult;
    itemsContainer.innerHTML = ''; 
    toggleElementDisplay(DOMElements.addAllToTempBackpackBtn, false);

    const items = results.items_obtained || [];
    if (items.length > 0) {
        const itemsGrid = document.createElement('div');
        itemsGrid.className = 'inventory-grid';
        items.forEach((item) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dna-item';
            applyDnaItemStyle(itemDiv, item);
            itemDiv.style.cursor = 'pointer';

            itemDiv.addEventListener('click', function handleItemClick() {
                addDnaToTemporaryBackpack(item);
                const itemIndex = gameState.lastCultivationResult.items_obtained.indexOf(item);
                if (itemIndex > -1) {
                    gameState.lastCultivationResult.items_obtained.splice(itemIndex, 1);
                }
                itemDiv.style.opacity = '0.5';
                itemDiv.style.pointerEvents = 'none';
                const originalTextSpan = itemDiv.querySelector('.dna-name-text');
                if(originalTextSpan) {
                    originalTextSpan.textContent = `${originalTextSpan.textContent} (已拾取)`;
                }
            }, { once: true });

            itemsGrid.appendChild(itemDiv);
        });
        itemsContainer.appendChild(itemsGrid);
    } else {
        itemsContainer.innerHTML = '<p>沒有拾獲任何物品。</p>';
    }

    showModal('training-results-modal');
}


console.log("UI module loaded - v8 with farm layout fixes.");
