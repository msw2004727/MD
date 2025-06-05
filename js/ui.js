// js/ui.js

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

// 修正後的 showFeedbackModal 函數，針對合成成功進行優化排版
function showFeedbackModal(title, message, isLoading = false, monsterDetails = null, actionButtons = null) {
    if (!DOMElements.feedbackModal || !DOMElements.feedbackModalTitle || !DOMElements.feedbackModalMessage) {
        console.error("Feedback modal elements not found in DOMElements.");
        return;
    }
    DOMElements.feedbackModalTitle.textContent = title;
    DOMElements.feedbackModalMessage.innerHTML = message;
    toggleElementDisplay(DOMElements.feedbackModalSpinner, isLoading);

    // 清除舊的怪獸詳細內容區域的內容
    if (DOMElements.feedbackMonsterDetails) {
        DOMElements.feedbackMonsterDetails.innerHTML = '';
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, false);
    }
    
    // 移除現有的圖片橫幅和基本數值容器，避免重複添加
    const feedbackModalBody = DOMElements.feedbackModal.querySelector('.modal-body');
    const existingBanner = feedbackModalBody.querySelector('#monster-banner-container');
    if (existingBanner) existingBanner.remove();
    const existingBasicStats = feedbackModalBody.querySelector('.feedback-monster-basic-stats');
    if (existingBasicStats) existingBasicStats.remove();


    if (monsterDetails) {
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, true, 'block');

        const primaryElement = monsterDetails.elements && monsterDetails.elements.length > 0 ? monsterDetails.elements[0] : '無';
        const rarityKey = typeof monsterDetails.rarity === 'string' ? monsterDetails.rarity.toLowerCase() : 'common';
        const monsterBannerPath = `https://placehold.co/700x150/4a5568/a0aec0?text=${encodeURIComponent(monsterDetails.nickname || '新怪獸')}+Banner&font=noto-sans-tc`; // 佔位圖橫幅
        // 您可以將 monsterSilhouettePath 替換為實際的怪獸全身圖
        // const monsterSilhouettePath = "https://github.com/msw2004727/MD/blob/main/images/mb01.png?raw=true"; 

        // 創建怪獸橫幅圖片容器
        const bannerContainer = document.createElement('div');
        bannerContainer.id = 'monster-banner-container';
        bannerContainer.innerHTML = `
            <img src="${monsterBannerPath}" alt="${monsterDetails.nickname || '新怪獸'} Banner" class="w-full h-auto rounded-md object-cover">
        `;
        // 插入到 modal-header 下方，消息上方
        DOMElements.feedbackModalTitle.after(bannerContainer);


        // 創建怪獸基本數值區塊
        const basicStatsContainer = document.createElement('div');
        basicStatsContainer.className = 'feedback-monster-basic-stats text-center py-3';
        let elementsDisplay = monsterDetails.elements.map(el => {
            const elClass = typeof el === 'string' ? el.toLowerCase() : '無';
            return `<span class="text-xs px-2 py-1 rounded-full text-element-${elClass} bg-element-${elClass}-bg mr-1">${el}</span>`;
        }).join('');

        basicStatsContainer.innerHTML = `
            <div class="feedback-monster-stats-grid">
                <div><strong>HP:</strong> ${monsterDetails.hp || 0}</div>
                <div><strong>MP:</strong> ${monsterDetails.mp || 0}</div>
                <div><strong>攻擊:</strong> ${monsterDetails.attack || 0}</div>
                <div><strong>防禦:</strong> ${monsterDetails.defense || 0}</div>
                <div><strong>速度:</strong> ${monsterDetails.speed || 0}</div>
                <div><strong>爆擊:</strong> ${monsterDetails.crit || 0}%</div>
            </div>
            <p class="text-sm mt-2"><strong>元素:</strong> ${elementsDisplay || '無'}</p>
            <p class="text-sm"><strong>稀有度:</strong> <span class="text-rarity-${rarityKey}">${monsterDetails.rarity || '普通'}</span></p>
            <p class="text-base mt-2"><strong>總評價:</strong> <span class="text-[var(--success-color)] text-lg font-bold">${monsterDetails.score || 0}</span></p>
        `;
        bannerContainer.after(basicStatsContainer); // 插入到橫幅下方


        DOMElements.feedbackModalMessage.innerHTML = `
            <h4 class="text-lg font-semibold text-center text-[var(--text-primary)] mb-2">${monsterDetails.nickname || '未知怪獸'}</h4>
            ${message} `;


        // 重新組織 AI 描述和其他詳細資訊到 feedbackMonsterDetails 容器
        DOMElements.feedbackMonsterDetails.innerHTML = `
            <div class="feedback-monster-ai-grid mt-4">
                <div class="feedback-monster-info-section">
                    <h5 class="feedback-monster-info-title">AI 個性分析</h5>
                    <p class="ai-generated-text text-sm">${monsterDetails.aiPersonality || 'AI 個性描述生成中或失敗...'}</p>
                </div>
                <div class="feedback-monster-info-section">
                    <h5 class="feedback-monster-info-title">AI 背景介紹</h5>
                    <p class="ai-generated-text text-sm">${monsterDetails.aiIntroduction || 'AI 介紹生成中或失敗...'}</p>
                </div>
                <div class="feedback-monster-info-section col-span-full">
                    <h5 class="feedback-monster-info-title">AI 綜合評價與培養建議</h5>
                    <p class="ai-generated-text text-sm">${monsterDetails.aiEvaluation || 'AI 綜合評價與培養建議...'}</p>
                </div>
            </div>
            <p class="creation-time-centered">創建時間: ${new Date(monsterDetails.creationTime * 1000).toLocaleString()}</p>
        `;
    }

    // 處理 modal-footer，移除舊的或創建新的
    let footer = DOMElements.feedbackModal.querySelector('.modal-footer');
    if (footer) footer.remove(); // 移除所有 footer

    // 創建新的 footer (只包含 actionButtons，如果傳入的話)
    const newFooter = document.createElement('div');
    newFooter.className = 'modal-footer';

    if (actionButtons && actionButtons.length > 0) {
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
    } else {
        // 如果沒有指定 actionButtons，則不添加任何按鈕 (符合刪除關閉按鈕的要求)
        // 右上角的 X 關閉按鈕不受這裡的控制，它會一直存在。
    }
    const modalContent = DOMElements.feedbackModal.querySelector('.modal-content');
    if (modalContent) modalContent.appendChild(newFooter);


    // 處理右上角的 X 關閉按鈕的樣式和行為
    if (DOMElements.feedbackModalCloseX) {
        DOMElements.feedbackModalCloseX.setAttribute('data-modal-id', 'feedback-modal');
        DOMElements.feedbackModalCloseX.onclick = () => hideModal('feedback-modal');
        // CSS 樣式將在 components.css 中定義為紅色圈圈帶 X
    }
    
    // 確保 modal-content 類別調整以適應新的寬度
    DOMElements.feedbackModal.querySelector('.modal-content').classList.add('large-feedback-modal'); // 添加一個新的類來擴展寬度

    showModal('feedback-modal');
}


function showConfirmationModal(title, message, onConfirm, confirmButtonClass = 'danger', confirmButtonText = '確定', monsterToRelease = null) {
    if (!DOMElements.confirmationModal || !DOMElements.confirmationModalTitle || !DOMElements.confirmationModalBody || !DOMElements.confirmActionBtn) {
        console.error("Confirmation modal elements not found in DOMElements.");
        return;
    }
    DOMElements.confirmationModalTitle.textContent = title;
    DOMElements.confirmationModalBody.innerHTML = `<p>${message}</p>`;

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

// 修正後的 getMonsterPartImagePath，現在接受 DNA 模板 ID
function getMonsterPartImagePath(dnaTemplateId) {
    if (!dnaTemplateId || !gameState.gameConfigs || !gameState.gameConfigs.dna_fragments) {
        // 如果沒有 DNA 模板 ID 或遊戲設定未載入，則返回一個標記，表示沒有圖案
        return { isPlaceholder: true }; 
    }
    // 從 gameConfigs 中找到對應的 DNA 模板
    const dnaTemplate = gameState.gameConfigs.dna_fragments.find(d => d.id === dnaTemplateId);
    if (!dnaTemplate) {
        // 找不到模板，也返回標記，表示沒有圖案
        return { isPlaceholder: true }; 
    }

    const elementTypeMap = {
        '火': 'fire', '水': 'water', '木': 'wood', '金': 'gold', '土': 'earth',
        '光': 'light', '暗': 'dark', '毒': 'poison', '風': 'wind', '混': 'mix', '無': '無'
    };
    const typeKey = dnaTemplate.type ? (elementTypeMap[dnaTemplate.type] || dnaTemplate.type.toLowerCase()) : '無';
    const rarityKey = dnaTemplate.rarity ? dnaTemplate.rarity.toLowerCase() : 'common';

    // 返回一個包含 DNA 樣式所需資訊的對象，而不是圖片路徑
    return {
        isPlaceholder: false,
        elementType: dnaTemplate.type,
        rarity: dnaTemplate.rarity,
        nameAbbr: dnaTemplate.name.substring(0,2) // 名稱縮寫
    };
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
            partElement.style.backgroundImage = 'none';
            partElement.classList.add('empty-part');
            partElement.textContent = ''; // 清除任何文本
            partElement.style.backgroundColor = ''; // 清除背景色
            partElement.style.color = ''; // 清除文字顏色
            partElement.style.borderColor = 'var(--border-color)'; // 恢復默認邊框
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

    // 處理全身照的透明化
    DOMElements.monsterSnapshotBaseBg.src = "https://github.com/msw2004727/MD/blob/main/images/a001.png?raw=true";
    // 如果怪獸沒有全身圖的URL或者是一個NPC且沒有專門的全身圖，則將輪廓圖透明化
    // 這裡假設 monster.fullBodyImageUrl 是一個存在的屬性，或者 NPC 怪獸沒有這個屬性
    if (monster && monster.fullBodyImageUrl && !monster.isNPC) { 
        DOMElements.monsterSnapshotBodySilhouette.src = monster.fullBodyImageUrl;
        DOMElements.monsterSnapshotBodySilhouette.style.opacity = 1; // 顯示圖片
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block';
    } else {
        // 如果沒有特定全身圖，或者它是NPC，則輪廓圖完全透明，不遮擋
        DOMElements.monsterSnapshotBodySilhouette.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="; // 最小的透明 GIF
        DOMElements.monsterSnapshotBodySilhouette.style.opacity = 0; // 完全透明
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block'; // 確保元素佔位
    }

    // 清空所有部位圖示
    clearMonsterBodyPartsDisplay();

    if (monster && monster.id) {
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block'; // 確保輪廓圖可見（即使透明）

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

        // ====== 根據 monster.constituent_dna_ids 顯示 DNA 部位圖案 ======
        if (monster.constituent_dna_ids && monster.constituent_dna_ids.length > 0 && gameState.gameConfigs?.dna_fragments) {
            const partsMap = { // 直接使用 DOM 元素引用
                0: DOMElements.monsterPartHead,
                1: DOMElements.monsterPartLeftArm,
                2: DOMElements.monsterPartRightArm,
                3: DOMElements.monsterPartLeftLeg,
                4: DOMElements.monsterPartRightLeg
            };

            // 先清空所有部位的文本，以防從之前狀態殘留
            for (const key in partsMap) {
                if (partsMap.hasOwnProperty(key) && partsMap[key]) {
                    partsMap[key].textContent = '';
                }
            }
            
            monster.constituent_dna_ids.forEach((dnaBaseId, index) => {
                const partElement = partsMap[index]; // 獲取對應的部位 DOM 元素
                if (partElement) {
                    const dnaInfo = gameState.gameConfigs.dna_fragments.find(d => d.id === dnaBaseId);

                    if (dnaInfo) {
                        const elementTypeMap = {
                            '火': 'fire', '水': 'water', '木': 'wood', '金': 'gold', '土': 'earth',
                            '光': 'light', '暗': 'dark', '毒': 'poison', '風': 'wind', '混': 'mix', '無': '無'
                        };
                        const typeClass = elementTypeMap[dnaInfo.type] || dnaInfo.type.toLowerCase();
                        const rarityClass = dnaInfo.rarity.toLowerCase();

                        // 應用背景色和文字顏色
                        partElement.style.backgroundColor = `var(--element-${typeClass}-bg)`;
                        partElement.style.color = `var(--rarity-${rarityClass}-text)`; // 使用稀有度文本顏色
                        partElement.style.borderColor = `var(--rarity-${rarityClass}-text)`; // 邊框顏色也用稀有度
                        partElement.style.backgroundImage = 'none'; // 確保沒有背景圖片
                        partElement.classList.remove('empty-part'); // 移除空狀態
                        partElement.textContent = dnaInfo.name.substring(0, 2); // 顯示 DNA 名稱前兩個字
                        partElement.style.fontWeight = 'bold';
                        partElement.style.fontSize = '0.75rem';
                        partElement.style.display = 'flex'; // 確保內容居中
                        partElement.style.alignItems = 'center';
                        partElement.style.justifyContent = 'center';
                    } else {
                        // 如果找不到對應的 DNA 模板，顯示為空位
                        partElement.style.backgroundImage = 'none';
                        partElement.classList.add('empty-part');
                        partElement.textContent = ''; // 清除文字
                        partElement.style.backgroundColor = ''; // 清除背景色
                        partElement.style.color = ''; // 清除文字顏色
                        partElement.style.borderColor = 'var(--border-color)'; // 恢復默認邊框
                    }
                }
            });
            DOMElements.monsterPartsContainer.classList.remove('empty-snapshot'); // 有 DNA 則移除空狀態
        } else {
            // 如果怪獸沒有 constituent_dna_ids，則清空部位顯示
            clearMonsterBodyPartsDisplay();
            DOMElements.monsterPartsContainer.classList.add('empty-snapshot');
        }
        // =============================================================

    } else {
        // 如果沒有選中怪獸，則輪廓圖透明，清空所有部位顯示
        DOMElements.monsterSnapshotBodySilhouette.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="; // 最小的透明 GIF
        DOMElements.monsterSnapshotBodySilhouette.style.opacity = 0; // 完全透明
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block'; // 確保元素佔位
        
        DOMElements.snapshotAchievementTitle.textContent = '初出茅廬';
        DOMElements.snapshotNickname.textContent = '尚無怪獸';
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: -</span><span>敗: -</span>`;
        DOMElements.snapshotEvaluation.textContent = `總評價: -`;
        if(DOMElements.snapshotMainContent) DOMElements.snapshotMainContent.innerHTML = '';
        DOMElements.monsterSnapshotArea.style.borderColor = 'var(--border-color)';
        DOMElements.monsterSnapshotArea.style.boxShadow = 'none';
        DOMElements.monsterInfoButton.disabled = true;
        gameState.selectedMonsterId = null;
        clearMonsterBodyPartsDisplay(); // 清空所有部位顯示
        DOMElements.monsterPartsContainer.classList.add('empty-snapshot');
    }
}


function applyDnaItemStyle(element, dnaData) {
    if (!element) return;

    if (!dnaData) {
        // 這是空槽位的樣式
        element.style.backgroundColor = 'var(--bg-slot)';
        const nameSpan = element.querySelector('.dna-name-text');
        if (nameSpan) {
            nameSpan.style.color = 'var(--text-secondary)';
            nameSpan.textContent = "空位"; // 設置空位文本
        }
        else element.style.color = 'var(--text-secondary)';
        element.style.borderColor = 'var(--border-color)';
        element.classList.add('empty'); // 確保有 empty class
        element.classList.remove('occupied'); // 移除 occupied class
        const rarityBadge = element.querySelector('.dna-rarity-badge');
        if (rarityBadge) rarityBadge.style.display = 'none';
        return;
    }

    // 已佔用槽位的樣式
    element.classList.remove('empty'); // 移除 empty class
    element.classList.add('occupied'); // 確保有 occupied class

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

    const nameSpan = element.querySelector('.dna-name-text');
    if (nameSpan) {
        nameSpan.style.color = rarityTextColorVar;
        nameSpan.textContent = dnaData.name || '未知DNA'; // 設置 DNA 名字
    } else {
        element.style.color = rarityTextColorVar;
    }
    element.style.borderColor = rarityTextColorVar;

    const rarityBadge = element.querySelector('.dna-rarity-badge');
    if (rarityBadge) {
        rarityBadge.style.display = 'none'; // 通常在 DNA 項目中不顯示這個徽章，或根據設計調整
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

        if (dna && dna.id) {
            slot.classList.add('occupied');
            nameSpan.textContent = dna.name || '未知DNA';
            slot.appendChild(nameSpan);
            applyDnaItemStyle(slot, dna);
            slot.draggable = true;
            slot.dataset.dnaId = dna.id; // 實例 ID
            slot.dataset.dnaBaseId = dna.baseId; // 模板 ID，用於合成
            slot.dataset.dnaSource = 'combination';
            slot.dataset.slotIndex = index; // Ensure this is also on occupied slots
        } else {
            // 這個分支現在會調用 applyDnaItemStyle(slot, null) 來設置空位樣式
            nameSpan.textContent = `組合槽 ${index + 1}`; // 仍然顯示組合槽號碼
            slot.appendChild(nameSpan);
            slot.classList.add('empty');
            applyDnaItemStyle(slot, null); // 傳入 null 以應用空槽樣式
            slot.dataset.slotIndex = index; // Ensure this is also on empty slots
        }
        container.appendChild(slot);
    });
    if(DOMElements.combineButton) DOMElements.combineButton.disabled = gameState.dnaCombinationSlots.filter(s => s !== null).length < 2;

    // 移除這裡的 updateMonsterSnapshot，它現在只由 updateMonsterSnapshot 自己調用
    // if (typeof updateMonsterSnapshot === 'function') {
    //     updateMonsterSnapshot(getSelectedMonster());
    // }
}

function renderPlayerDNAInventory() {
    const container = DOMElements.inventoryItemsContainer;
    if (!container) return;
    container.innerHTML = '';
    const MAX_INVENTORY_SLOTS = gameState.MAX_INVENTORY_SLOTS; // 從 gameState 中獲取最大槽位數
    const ownedDna = gameState.playerData?.playerOwnedDNA || [];

    // 修改點：調整 DNA 庫存的渲染邏輯，第12個位置固定為刪除區 (索引 11)
    for (let index = 0; index < MAX_INVENTORY_SLOTS; index++) {
        const item = document.createElement('div');
        item.classList.add('dna-item');
        
        if (index === 11) { // 第12個位置 (索引為11) 為刪除區
            item.id = 'inventory-delete-slot';
            item.classList.add('inventory-delete-slot');
            item.innerHTML = `<span class="delete-slot-main-text">刪除區</span><span class="delete-slot-sub-text">※拖曳至此</span>`;
            // 刪除區不可拖曳，只可接受放置
            item.draggable = false; 
            item.dataset.inventoryIndex = index; // 保持索引一致
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
                item.draggable = true; // 空槽位也應可拖曳，以便接收物品 (但拖曳本身不會拖曳空槽位)
                item.dataset.dnaSource = 'inventory';
                applyDnaItemStyle(item, null);
            }
        }
        container.appendChild(item);
    }
}

function renderTemporaryBackpack() {
    const container = DOMElements.temporaryBackpackContainer;
    if (!container) return;
    container.innerHTML = '';
    // 修改點: 臨時背包的顯示格數從 24 改為 9
    const MAX_TEMP_SLOTS = 9; 
    const currentTempItems = gameState.temporaryBackpack || [];

    // Create a temporary array that represents all slots, including nulls for empty ones
    let tempBackpackArray = new Array(MAX_TEMP_SLOTS).fill(null);
    currentTempItems.forEach((item, index) => {
        if (index < MAX_TEMP_SLOTS) {
            tempBackpackArray[index] = item;
        }
    });

    tempBackpackArray.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.classList.add('temp-backpack-slot', 'dna-item'); // Consistent styling with dna-item
        slot.dataset.tempItemIndex = index; // Crucial: Add index to both occupied and empty slots

        if (item) { // If slot is occupied
            slot.classList.add('occupied');
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('dna-name-text');
            nameSpan.textContent = item.data.name || '未知物品';
            slot.appendChild(nameSpan);
            applyDnaItemStyle(slot, item.data);
            slot.draggable = true; // Temporary backpack items are draggable
            slot.dataset.dnaId = item.data.id; // Or a unique temp ID if it's not a real DNA instance yet
            slot.dataset.dnaBaseId = item.data.baseId;
            slot.dataset.dnaSource = 'temporaryBackpack';
            slot.onclick = () => handleMoveFromTempBackpackToInventory(index); // Still allow click for quick move
        } else { // If slot is empty
            slot.classList.add('empty');
            slot.textContent = `空位`; // Change to use textContent directly for empty slots
            applyDnaItemStyle(slot, null);
            slot.draggable = false; // Empty slots are not draggable, as they don't contain an item to drag
        }
        container.appendChild(slot);
    });
}

function renderMonsterFarm() {
    const listContainer = DOMElements.farmedMonstersListContainer;
    const farmHeaders = DOMElements.farmHeaders;
    if (!listContainer || !farmHeaders) return;

    listContainer.innerHTML = '';

    if (!gameState.playerData || !gameState.playerData.farmedMonsters || gameState.playerData.farmedMonsters.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">農場空空如也，快去組合怪獸吧！</p>`;
        farmHeaders.style.display = 'none';
        return;
    }
    farmHeaders.style.display = 'grid';

    gameState.playerData.farmedMonsters.forEach(monster => {
        const item = document.createElement('div');
        item.classList.add('farm-monster-item');
        if (gameState.selectedMonsterId === monster.id) {
            item.classList.add('selected');
            item.style.backgroundColor = 'var(--accent-hover)';
        }
        item.dataset.monsterId = monster.id;

        let statusText = "待命中";
        let statusClass = "text-[var(--text-secondary)]"; // 預設灰色
        if (monster.farmStatus) {
            if (monster.farmStatus.isBattling) {
                statusText = "戰鬥中"; statusClass = "farm-monster-status battling"; // 紅色
            } else if (monster.farmStatus.isTraining) {
                // 如果是修煉中，需要讀秒並顯示
                const endTime = monster.farmStatus.trainingStartTime + monster.farmStatus.trainingDuration;
                const now = Date.now();
                if (now < endTime) {
                    const remainingTime = Math.max(0, Math.ceil((endTime - now) / 1000));
                    statusText = `修煉中 (${remainingTime}秒)`; 
                    statusClass = "farm-monster-status active"; // 黃色
                } else {
                    statusText = "修煉完成!"; statusClass = "text-[var(--success-color)] font-bold"; // 綠色
                }
            } else if (monster.farmStatus.completed) {
                 statusText = "已完成"; statusClass = "text-[var(--success-color)]"; // 綠色
            }
        }

        const elementsDisplay = monster.elements.map(el =>
            `<span class="text-xs px-1 py-0.5 rounded-full text-element-${el.toLowerCase()} bg-element-${el.toLowerCase()}-bg">${el}</span>`
        ).join(' ');

        item.innerHTML = `
            <div class="text-center">
                <button class="farm-monster-item button farm-battle-btn ${monster.farmStatus?.isBattling ? 'danger' : 'success'}"
                        data-monster-id="${monster.id}"
                        title="${monster.farmStatus?.isBattling ? '戰鬥中' : '挑戰對手'}"
                        ${monster.farmStatus?.isBattling ? 'disabled' : ''}>
                    ⚔️
                </button>
            </div>
            <div class="text-center"> <strong class="block text-sm text-[var(--text-primary)]">${monster.nickname}</strong>
                <div class="text-xs">${elementsDisplay} <span class="text-rarity-${monster.rarity.toLowerCase()}">${monster.rarity}</span></div>
                <div class="farm-monster-score sm:hidden">評價: ${monster.score || 0}</div>
            </div>
            <div class="farm-monster-status text-center ${statusClass}">
                ${statusText}
            </div>
            <div class="farm-monster-score hidden sm:block text-center text-[var(--success-color)]">${monster.score || 0}</div>
            <div class="farm-monster-actions-group text-center"> <button class="farm-monster-info-btn button secondary text-xs" data-monster-id="${monster.id}">資訊</button>
                <button class="farm-monster-cultivate-btn button text-xs ${monster.farmStatus?.isTraining ? 'danger' : 'warning'}" 
                        data-monster-id="${monster.id}" 
                        title="${monster.farmStatus?.isTraining ? '結束修煉' : '開始修煉'}"
                        ${monster.farmStatus?.isBattling ? 'disabled' : ''}>
                    ${monster.farmStatus?.isTraining ? '結束' : '修煉'}
                </button>
                <button class="farm-monster-release-btn button danger text-xs" data-monster-id="${monster.id}" ${monster.farmStatus?.isTraining || monster.farmStatus?.isBattling ? 'disabled' : ''}>放生</button>
            </div>
        `;

        item.addEventListener('click', () => {
            gameState.selectedMonsterId = monster.id;
            updateMonsterSnapshot(monster);
            listContainer.querySelectorAll('.farm-monster-item').forEach(el => {
                el.classList.remove('selected');
                el.style.backgroundColor = '';
            });
            item.classList.add('selected');
            item.style.backgroundColor = 'var(--accent-hover)';
            if (DOMElements.dnaFarmTabs && typeof switchTabContent === 'function') {
                const monsterFarmTabButton = DOMElements.dnaFarmTabs.querySelector('.tab-button[data-tab-target="monster-farm-content"]');
                if(monsterFarmTabButton) switchTabContent('monster-farm-content', monsterFarmTabButton);
            }
        });

        item.querySelector('.farm-monster-info-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // 防止事件冒泡到父級的 item.addEventListener
            updateMonsterInfoModal(monster, gameState.gameConfigs);
            showModal('monster-info-modal');
        });

        item.querySelector('.farm-battle-btn').addEventListener('click', (e) => handleChallengeMonsterClick(e, monster.id));
        
        // 修正修煉按鈕邏輯：根據狀態呼叫不同處理函數
        const cultivateButton = item.querySelector('.farm-monster-cultivate-btn');
        if (cultivateButton) {
            if (monster.farmStatus?.isTraining) {
                cultivateButton.addEventListener('click', (e) => handleEndCultivationClick(e, monster.id, monster.farmStatus.trainingStartTime, monster.farmStatus.trainingDuration));
            } else {
                cultivateButton.addEventListener('click', (e) => handleCultivateMonsterClick(e, monster.id));
            }
        }
        item.querySelector('.farm-monster-release-btn').addEventListener('click', (e) => handleReleaseMonsterClick(e, monster.id));

        listContainer.appendChild(item);
    });
}

function updatePlayerInfoModal(playerData, gameConfigs) {
    const body = DOMElements.playerInfoModalBody;
    if (!body || !playerData || !playerData.playerStats) {
        if(body) body.innerHTML = '<p>無法載入玩家資訊。</p>';
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

    const rarityKey = typeof monster.rarity === 'string' ? monster.rarity.toLowerCase() : 'common';
    const rarityColorVar = `var(--rarity-${rarityKey}-text, var(--accent-color))`;
    DOMElements.monsterInfoModalHeader.innerHTML = `
        <h4 class="monster-info-name-styled" style="color: ${rarityColorVar}; border-color: ${rarityColorVar};">
            ${monster.nickname}
        </h4>
        <p class="text-xs text-[var(--text-secondary)] mt-1">ID: ${monster.id}</p>
    `;

    const detailsBody = DOMElements.monsterDetailsTabContent;
    let elementsDisplay = monster.elements.map(el => {
        const elClass = typeof el === 'string' ? el.toLowerCase() : '無';
        return `<span class="text-xs px-2 py-1 rounded-full text-element-${elClass} bg-element-${elClass}-bg mr-1">${el}</span>`;
    }).join('');

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
    const maxSkills = gameConfigs?.value_settings?.max_monster_skills || 3;
    if (monster.skills && monster.skills.length > 0) {
        skillsHtml = monster.skills.map(skill => {
            const skillTypeClass = typeof skill.type === 'string' ? skill.type.toLowerCase() : '無';
            return `
            <div class="skill-entry">
                <span class="skill-name text-element-${skillTypeClass}">${skill.name} (Lv.${skill.level || 1})</span>
                <p class="skill-details">威力: ${skill.power}, 消耗MP: ${skill.mp_cost || 0}, 類別: ${skill.skill_category || '未知'}</p>
                <p class="skill-details text-xs">${skill.story || skill.description || '暫無描述'}</p>
                ${skill.current_exp !== undefined ? `<p class="text-xs text-[var(--text-secondary)]">經驗: ${skill.current_exp}/${skill.exp_to_next_level || '-'}</p>` : ''}
            </div>
        `}).join('');
    }

    const personality = monster.personality || { name: '未知', description: '個性不明' };
    const aiPersonality = monster.aiPersonality || 'AI 個性描述生成中或失敗...';
    const aiIntroduction = monster.aiIntroduction || 'AI 介紹生成中或失敗...';
    const aiEvaluation = monster.aiEvaluation || 'AI 綜合評價與培養建議...';

    detailsBody.innerHTML = `
        <div class="details-grid">
            <div class="details-section">
                <h5 class="details-section-title">基礎屬性</h5>
                <div class="details-item"><span class="details-label">元素:</span> <span class="details-value">${elementsDisplay}</span></div>
                <div class="details-item"><span class="details-label">稀有度:</span> <span class="details-value text-rarity-${rarityKey}">${monster.rarity}</span></div>
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
            <h5 class="details-section-title">技能列表 (最多 ${maxSkills} 個)</h5>
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

    if (DOMElements.monsterInfoTabs) {
        const firstTabButton = DOMElements.monsterInfoTabs.querySelector('.tab-button[data-tab-target="monster-details-tab"]');
        if (firstTabButton) {
            switchTabContent('monster-details-tab', firstTabButton, 'monster-info-modal');
        }
    }
}

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
        th.innerHTML += ' <span class="sort-arrow"></span>';
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

function updateLeaderboardTable(tableType, data) {
    const tableId = tableType === 'monster' ? 'monster-leaderboard-table' : 'player-leaderboard-table';
    const table = document.getElementById(tableId);
    if (!table) return;

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
    } else {
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

    data.forEach((item, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = index + 1;

        if (tableType === 'monster') {
            row.insertCell().textContent = item.nickname;
            const elementsCell = row.insertCell();
            elementsCell.style.textAlign = 'center';
            item.elements.forEach(el => {
                 const elSpan = document.createElement('span');
                 elSpan.textContent = el;
                 elSpan.className = `text-xs px-1.5 py-0.5 rounded-full text-element-${el.toLowerCase()} bg-element-${el.toLowerCase()}-bg mr-1`;
                 elementsCell.appendChild(elSpan);
            });
            const rarityCell = row.insertCell();
            rarityCell.textContent = item.rarity;
            rarityCell.className = `text-rarity-${item.rarity.toLowerCase()}`;
            rarityCell.style.textAlign = 'center';

            const scoreCell = row.insertCell();
            scoreCell.textContent = item.score;
            scoreCell.style.textAlign = 'center';
            scoreCell.style.color = 'var(--success-color)';

            const resumeCell = row.insertCell();
            resumeCell.textContent = `${item.resume?.wins || 0} / ${item.resume?.losses || 0}`;
            resumeCell.style.textAlign = 'center';

            row.insertCell().textContent = item.owner_nickname || 'N/A';
            const actionsCell = row.insertCell();
            actionsCell.style.textAlign = 'center';
            if (item.owner_id !== gameState.playerId && !item.isNPC) {
                const challengeBtn = document.createElement('button');
                challengeBtn.textContent = '挑戰';
                challengeBtn.className = 'button primary text-xs py-1 px-2';
                challengeBtn.onclick = (e) => handleChallengeMonsterClick(e, item.id, item.owner_id);
                actionsCell.appendChild(challengeBtn);
            }
        } else {
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
    updateLeaderboardSortIcons(table, gameState.leaderboardSortConfig[tableType]?.key, gameState.leaderboardSortConfig[tableType]?.order);
}

function updateLeaderboardSortIcons(tableElement, activeKey, activeOrder) {
    if (!tableElement) return;
    const headers = tableElement.querySelectorAll('thead th');
    headers.forEach(th => {
        const arrowSpan = th.querySelector('.sort-arrow');
        if (arrowSpan) {
            if (th.dataset.sortKey === activeKey) {
                arrowSpan.textContent = activeOrder === 'asc' ? '▲' : '▼';
                arrowSpan.classList.add('active');
            } else {
                arrowSpan.textContent = '';
                arrowSpan.classList.remove('active');
            }
        }
    });
}

function updateMonsterLeaderboardElementTabs(elements) {
    const tabsContainer = DOMElements.monsterLeaderboardElementTabs;
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    const elementTypeMap = {
        'fire':'火','water':'水','wood':'木','gold':'金','earth':'土',
        'light':'光','dark':'暗','poison':'毒','wind':'風','mix':'混','無':'無'
    };

    elements.forEach(elementKey => {
        const button = document.createElement('button');
        button.classList.add('tab-button');
        button.textContent = elementKey === 'all' ? '全部' : (elementTypeMap[elementKey.toLowerCase()] || elementKey);
        button.dataset.elementFilter = elementKey;
        if (elementKey === gameState.currentMonsterLeaderboardElementFilter) {
            button.classList.add('active');
        }
        tabsContainer.appendChild(button);
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
                <button class="text-xs secondary p-1 view-player-btn button" data-player-id="${player.uid}" data-player-nickname="${player.nickname}">查看</button>
            </div>
        `;
        container.appendChild(itemDiv);

        itemDiv.querySelector('.view-player-btn').addEventListener('click', async (e) => {
            const playerId = e.target.dataset.playerId;
            const playerNickname = e.target.dataset.playerNickname;
            showFeedbackModal('載入中...', `正在獲取玩家 ${playerNickname} 的資訊...`, true);
            try {
                const playerData = await getPlayerData(playerId);
                hideModal('feedback-modal');
                if (playerData) {
                    updatePlayerInfoModal(playerData, gameState.gameConfigs);
                    showModal('player-info-modal');
                } else {
                    showFeedbackModal('錯誤', `無法獲取玩家 ${playerNickname} 的資訊。`);
                }
            } catch (error) {
                showFeedbackModal('錯誤', `獲取玩家資訊失敗: ${error.message}`);
            }
        });
    });
}

function showBattleLogModal(logEntries, winnerName = null, loserName = null) {
    if (!DOMElements.battleLogArea || !DOMElements.battleLogModal) return;
    DOMElements.battleLogArea.innerHTML = '';

    logEntries.forEach(entry => {
        const p = document.createElement('p');
        if (entry.startsWith('--- 回合')) {
            p.className = 'turn-divider';
        } else if (entry.includes('獲勝！')) {
            p.className = 'battle-end winner';
        } else if (entry.includes('被擊倒了！') || entry.includes('倒下了！')) {
            p.className = 'defeated';
        } else if (entry.includes('致命一擊！')) {
            p.className = 'crit-hit';
        } else if (entry.includes('恢復了') && entry.includes('HP')) {
            p.className = 'heal-action';
        }
        p.textContent = entry;
        DOMElements.battleLogArea.appendChild(p);
    });

    if (winnerName) {
        const winnerP = document.createElement('p');
        winnerP.className = 'battle-end winner mt-3';
        winnerP.textContent = `🏆 ${winnerName} 獲勝！🏆`;
        DOMElements.battleLogArea.appendChild(winnerP);
    } else if (loserName && logEntries.some(l => l.includes("平手"))) {
         const drawP = document.createElement('p');
        drawP.className = 'battle-end draw mt-3';
        drawP.textContent = `🤝 平手！🤝`;
        DOMElements.battleLogArea.appendChild(drawP);
    }
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

function updateScrollingHints(hintsArray) {
    const container = DOMElements.scrollingHintsContainer;
    if (!container || !hintsArray || hintsArray.length === 0) return;
    container.innerHTML = '';

    const totalDuration = hintsArray.length * 5;
    // The animation is set on the child elements, not the container itself for infinite scrolling effect
    // container.style.animationDuration = `${totalDuration}s`; // This line might not be necessary depending on CSS setup
    hintsArray.forEach((hint, index) => {
        const p = document.createElement('p');
        p.classList.add('scrolling-hint-text');
        p.textContent = hint;
        // The animation delay and duration for individual hints are typically handled by CSS @keyframes
        // and nth-child selectors if the number of hints is fixed,
        // or by dynamically setting animation-delay if JS controls the animation animation lifecycle per hint.
        // The current CSS has animation-delay based on nth-child.
        // If hintsArray can vary in length, a more dynamic CSS or JS animation approach might be needed.
        // For simplicity, assuming CSS handles the cycling.
        container.appendChild(p);
    });
}

console.log("UI module loaded - v7 with transparent placeholder and other UI function completions.");
