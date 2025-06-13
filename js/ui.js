// js/ui.js
console.log("DEBUG: ui.js starting to load and define functions."); // Add this line

// 注意：此檔案會依賴 gameState (來自 js/game-state.js) 和其他輔助函數
// 這個檔案現在是UI系統的核心，負責主畫面渲染和通用彈窗的顯示/隱藏。

let DOMElements = {}; // 在頂層聲明，但由 initializeDOMElements 初始化

const TRAINING_GAME_HINTS = [
    "修煉時間越長，獲得的技能經驗值也越多。",
    "完成修煉是領悟新技能的主要途徑！",
    "在不同的修煉地點，怪獸的數值成長方向和可能拾獲的DNA類型會有所不同。",
    "即使修煉被中斷，已經過的時間仍然會提供部分獎勵。",
    "稀有度越高的怪獸，在修煉中越有可能找到更高品質的DNA碎片。",
    "修煉歸來的怪獸HP和MP會完全恢復！",
    "記得將修煉獲得的物品從「暫存背包」移入主庫存。",
    "怪獸的「個性」會影響其在修煉故事中的行為。",
    "累積足夠的技能經驗值後，技能等級會自動提升！",
    "修煉是提升怪獸基礎數值(白值)的唯一方式。",
    "修煉中，怪獸無法出戰或被放生。",
    "想要特定屬性的DNA？試試去對應的元素修煉地冒險吧！",
    "修煉時間越久，遭遇奇特事件的機率也越高。",
    "看看修煉後的「活動紀錄」，那裡記載了怪獸的成長軌跡。",
    "技能最高可升至10級，威力會大幅提升。",
    "如果技能已滿，領悟新技能時將有機會替換掉舊的。",
    "臨時背包空間有限，記得及時清理。",
    "怪獸的元素屬性會影響牠在某些修煉地的成長效率。",
    "有時候，一無所獲的修煉也是一種修行。",
    "冒險故事是由AI生成的，每次修煉都獨一無二！"
];


// 【新增】更新所有計時器的函式
function updateAllTimers() {
    const timerElements = document.querySelectorAll('.training-timer');
    timerElements.forEach(timerEl => {
        const startTime = parseInt(timerEl.dataset.startTime, 10);
        const duration = parseInt(timerEl.dataset.duration, 10);
        if (!startTime || !duration) return;

        const now = Date.now();
        const elapsedTime = Math.floor((now - startTime) / 1000);
        const totalDuration = Math.floor(duration / 1000);
        const displayTime = Math.min(elapsedTime, totalDuration);

        timerEl.textContent = `(${displayTime} / ${totalDuration}s)`;
    });
}


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
    });
    const targetContent = tabContentsContainer.querySelector(`#${targetTabId}`);
    if (targetContent) {
        targetContent.classList.add('active');

        if (targetTabId === 'friends-list-content') {
            if (typeof renderFriendsList === 'function') {
                renderFriendsList();
            }
        }
    }
}
// =============================================================

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
        playerInfoButton: document.getElementById('player-info-button'),
        showMonsterLeaderboardBtn: document.getElementById('show-monster-leaderboard-btn'),
        showPlayerLeaderboardBtn: document.getElementById('show-player-leaderboard-btn'),
        newbieGuideBtn: document.getElementById('newbie-guide-btn'),
        dnaCombinationSlotsContainer: document.getElementById('dna-combination-slots'),
        combineButton: document.getElementById('combine-button'),
        dnaDrawButton: document.getElementById('dna-draw-button'),
        inventoryItemsContainer: document.getElementById('inventory-items'),
        temporaryBackpackContainer: document.getElementById('temporary-backpack-items'),
        dnaFarmTabs: document.getElementById('dna-farm-tabs'),
        dnaInventoryContent: document.getElementById('dna-inventory-content'),
        monsterFarmContent: document.getElementById('monster-farm-content'),
        farmHeaders: document.getElementById('farm-headers'), 
        farmedMonstersList: document.getElementById('farmed-monsters-list'), 
        friendsListContent: document.getElementById('friends-list-content'),
        friendsTabSearchInput: document.getElementById('friends-tab-search-input'),
        friendsSearchResultsArea: document.getElementById('friends-search-results-area'),
        friendsListDisplayArea: document.getElementById('friends-list-display-area'),
        trainingGroundContent: document.getElementById('training-ground-content'),
        exchangeContent: document.getElementById('exchange-content'),
        homesteadContent: document.getElementById('homestead-content'),
        guildContent: document.getElementById('guild-content'),
        medicalContent: document.getElementById('medical-content'),
        breedingContent: document.getElementById('breeding-content'),
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
        // 【新增】對新呼吸動畫圖示的引用
        feedbackModalBreathingIcon: document.getElementById('feedback-modal-breathing-icon'),
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
        snapshotBarsContainer: document.getElementById('snapshot-bars-container'),
        snapshotHpFill: document.getElementById('snapshot-hp-fill'),
        snapshotMpFill: document.getElementById('snapshot-mp-fill'),
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
        if (modalId === 'feedback-modal' && gameState.feedbackHintInterval) {
            clearInterval(gameState.feedbackHintInterval);
            gameState.feedbackHintInterval = null;
        }
    }
}

function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal.id === 'feedback-modal' && gameState.feedbackHintInterval) {
            clearInterval(gameState.feedbackHintInterval);
            gameState.feedbackHintInterval = null;
        }
        modal.style.display = 'none';
    });
    gameState.activeModalId = null;
}

function showMonsterInfoFromFarm(monsterId) {
    if (!monsterId) return;
    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
    if (monster) {
        updateMonsterInfoModal(monster, gameState.gameConfigs, gameState.playerData);
        showModal('monster-info-modal');
    } else {
        console.error(`Monster with ID ${monsterId} not found in farm.`);
        showFeedbackModal('錯誤', '找不到該怪獸的資料。');
    }
}

function showFeedbackModal(title, message, isLoading = false, monsterDetails = null, actionButtons = null, awardDetails = null) {
    if (!DOMElements.feedbackModal || !DOMElements.feedbackModalTitle || !DOMElements.feedbackModalMessage) {
        console.error("Feedback modal elements not found in DOMElements.");
        return;
    }

    DOMElements.feedbackModalMessage.innerHTML = '';
    // 【已修改】從控制舊 spinner 改為控制新的呼吸動畫圖示
    toggleElementDisplay(DOMElements.feedbackModalBreathingIcon, isLoading, 'block');

    if (DOMElements.feedbackMonsterDetails) {
        DOMElements.feedbackMonsterDetails.innerHTML = '';
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, false);
    }
    const modalBody = DOMElements.feedbackModal.querySelector('#feedback-modal-body-content');

    const existingBanner = modalBody.querySelector('.feedback-banner');
    if (existingBanner) existingBanner.remove();
    const existingHints = modalBody.querySelector('.loading-hints-container');
    if (existingHints) existingHints.remove();
    if (gameState.feedbackHintInterval) {
        clearInterval(gameState.feedbackHintInterval);
        gameState.feedbackHintInterval = null;
    }

    DOMElements.feedbackModalTitle.textContent = title;

    if (awardDetails) { 
        const bannerUrl = awardDetails.bannerUrl || 'https://github.com/msw2004727/MD/blob/main/images/BN001.png?raw=true';
        const awardType = awardDetails.type === 'title' ? '稱號' : '成就';
        const awardName = awardDetails.name || '未知的榮譽';
        const buffs = awardDetails.buffs || {};

        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'feedback-banner';
        bannerContainer.style.textAlign = 'center';
        bannerContainer.style.marginBottom = '15px';
        bannerContainer.innerHTML = `<img src="${bannerUrl}" alt="榮譽橫幅" style="max-width: 100%; border-radius: 6px;">`;
        modalBody.prepend(bannerContainer);

        let messageHtml = `<p class="text-center text-base text-[var(--text-secondary)] mb-2">恭喜您獲得新的${awardType}！</p>`;
        messageHtml += `<h4 class="text-2xl font-bold text-center mb-3" style="color: gold; text-shadow: 0 0 8px #000;">${awardName}</h4>`;
        
        if (Object.keys(buffs).length > 0) {
            const statColorMap = {
                hp: 'var(--success-color)',
                mp: 'var(--accent-color)',
                attack: 'var(--danger-color)',
                defense: 'var(--rarity-rare-text)', 
                speed: 'var(--warning-color)',
                crit: 'var(--rarity-elite-text)', 
                default: 'var(--text-primary)'
            };

            const getBuffDisplayName = (key) => {
                 const names = { hp: 'HP', mp: 'MP', attack: '攻擊', defense: '防禦', speed: '速度', crit: '爆擊率' };
                 return names[key] || key;
            };

            messageHtml += `<div class="details-section mt-4" style="background-color: var(--bg-primary);">`;
            messageHtml += `<h5 class="details-section-title">稱號效果</h5><ul style="list-style: none; padding: 0; margin: 0;">`;
            for (const [stat, value] of Object.entries(buffs)) {
                const color = statColorMap[stat] || statColorMap.default;
                messageHtml += `<li style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border-color);"><span style="color: ${color}; font-weight: 500;">${getBuffDisplayName(stat)}</span><span style="color: ${color}; font-weight: bold;">+${value}</span></li>`;
            }
            messageHtml += `</ul></div>`;
        }
        
        DOMElements.feedbackModalMessage.innerHTML = messageHtml;
    }
    else if ((title === '結算中...' || title === '怪獸合成中...') && isLoading) {
        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'feedback-banner';
        bannerContainer.style.textAlign = 'center';
        bannerContainer.style.marginBottom = '15px';
        bannerContainer.innerHTML = `<img src="https://github.com/msw2004727/MD/blob/main/images/BN007.png?raw=true" alt="處理中橫幅" style="max-width: 100%; border-radius: 6px;">`;
        modalBody.prepend(bannerContainer);

        const hintsContainer = document.createElement('div');
        hintsContainer.className = 'loading-hints-container';
        hintsContainer.style.marginTop = '1rem';
        hintsContainer.style.padding = '0.5rem';
        hintsContainer.style.backgroundColor = 'var(--bg-primary)';
        hintsContainer.style.border = '1px solid var(--border-color)';
        hintsContainer.style.borderRadius = '6px';
        hintsContainer.style.textAlign = 'center';
        hintsContainer.style.fontStyle = 'italic';
        hintsContainer.style.color = 'var(--text-secondary)';
        hintsContainer.innerHTML = `<p id="loading-hints-carousel">正在讀取提示...</p>`;
        DOMElements.feedbackModalMessage.insertAdjacentElement('afterend', hintsContainer);
        
        const hintElement = document.getElementById('loading-hints-carousel');
        if (hintElement && TRAINING_GAME_HINTS.length > 0) {
            const firstRandomIndex = Math.floor(Math.random() * TRAINING_GAME_HINTS.length);
            hintElement.textContent = `💡 ${TRAINING_GAME_HINTS[firstRandomIndex]}`;
            gameState.feedbackHintInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * TRAINING_GAME_HINTS.length);
                hintElement.textContent = `💡 ${TRAINING_GAME_HINTS[randomIndex]}`;
            }, 5000); 
        }
    }


    else if (monsterDetails) {
        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'feedback-banner';
        bannerContainer.style.textAlign = 'center';
        bannerContainer.style.marginBottom = '15px';
        bannerContainer.innerHTML = `<img src="https://github.com/msw2004727/MD/blob/main/images/BN002.png?raw=true" alt="合成成功橫幅" style="max-width: 100%; border-radius: 6px;">`;
        modalBody.prepend(bannerContainer);

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
        modalBody.prepend(bannerContainer);

        DOMElements.feedbackModalMessage.innerHTML = `<p class="text-center text-base">怪獸 <strong class="text-[var(--accent-color)]">${monsterName}</strong> 已開始修煉。</p>`;
        DOMElements.feedbackModal.querySelector('.modal-content').classList.remove('large-feedback-modal');

    } else {
        DOMElements.feedbackModalMessage.innerHTML = message;
        DOMElements.feedbackModal.querySelector('.modal-content').classList.remove('large-feedback-modal');
    }

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
        '暗': 'A9A9A9/FFFFFF', '毒': '9932CC/FFFFFF', '風': '87CEEB/000000',
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
            applyDnaItemStyle(partElement, null);
            partElement.innerHTML = ''; 
            partElement.classList.add('empty-part');
        }
    }
    if (DOMElements.monsterPartsContainer) DOMElements.monsterPartsContainer.classList.add('empty-snapshot');
}

function updateMonsterSnapshot(monster) {
    if (!DOMElements.monsterSnapshotArea || !DOMElements.snapshotNickname || !DOMElements.snapshotWinLoss ||
        !DOMElements.snapshotEvaluation || !DOMElements.monsterSnapshotBodySilhouette || !DOMElements.monsterPartsContainer ||
        !DOMElements.snapshotBarsContainer || !DOMElements.snapshotHpFill || !DOMElements.snapshotMpFill) {
        console.error("一個或多個怪獸快照相關的 DOM 元素未找到。");
        return;
    }

    const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};

    clearMonsterBodyPartsDisplay();

    if (monster && monster.id) {
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'block';

        const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
        const elementNickname = monster.custom_element_nickname || 
                                (gameState.gameConfigs?.element_nicknames?.[primaryElement] || primaryElement);
        const achievement = monster.title || '新秀';
        
        DOMElements.snapshotNickname.textContent = elementNickname;
        DOMElements.snapshotNickname.className = `text-rarity-${rarityKey}`;
        DOMElements.snapshotAchievementTitle.textContent = achievement;

        const dnaSlots = new Array(5).fill(null);
        if (monster.constituent_dna_ids && gameState.gameConfigs?.dna_fragments) {
            monster.constituent_dna_ids.forEach((id, i) => {
                if (i < 5) {
                    dnaSlots[i] = gameState.gameConfigs.dna_fragments.find(d => d.id === id) || null;
                }
            });
        }
        
        const partsMap = {
            Head: DOMElements.monsterPartHead,
            LeftArm: DOMElements.monsterPartLeftArm,
            RightArm: DOMElements.monsterPartRightArm,
            LeftLeg: DOMElements.monsterPartLeftLeg,
            RightLeg: DOMElements.monsterPartRightLeg,
        };

        Object.keys(gameState.dnaSlotToBodyPartMapping).forEach(slotIndex => {
            const partKey = gameState.dnaSlotToBodyPartMapping[slotIndex];
            const capitalizedPartKey = partKey.charAt(0).toUpperCase() + partKey.slice(1);
            const partElement = partsMap[capitalizedPartKey];
            const dnaData = dnaSlots[slotIndex];

            if (partElement) {
                partElement.innerHTML = '';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'dna-name-text';
                partElement.appendChild(nameSpan);
                
                applyDnaItemStyle(partElement, dnaData);
                
                if (dnaData) {
                    partElement.classList.remove('empty-part');
                } else {
                    partElement.classList.add('empty-part');
                }
            }
        });
        if (DOMElements.monsterPartsContainer) {
            DOMElements.monsterPartsContainer.classList.remove('empty-snapshot');
        }

        DOMElements.snapshotEvaluation.textContent = `評價: ${monster.score || 0}`;
        DOMElements.snapshotEvaluation.style.color = 'var(--success-color)';

        const resume = monster.resume || { wins: 0, losses: 0 };
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: ${resume.wins}</span><span>敗: ${resume.losses}</span>`;

        toggleElementDisplay(DOMElements.snapshotBarsContainer, true, 'flex');
        const hpPercent = monster.initial_max_hp > 0 ? (monster.hp / monster.initial_max_hp) * 100 : 0;
        const mpPercent = monster.initial_max_mp > 0 ? (monster.mp / monster.initial_max_mp) * 100 : 0;
        DOMElements.snapshotHpFill.style.width = `${hpPercent}%`;
        DOMElements.snapshotMpFill.style.width = `${mpPercent}%`;
        
        const rarityColorVar = `var(--rarity-${rarityKey}-text, var(--text-secondary))`;
        DOMElements.monsterSnapshotArea.style.borderColor = rarityColorVar;
        DOMElements.monsterSnapshotArea.style.boxShadow = `0 0 10px -2px ${rarityColorVar}, inset 0 0 15px -5px color-mix(in srgb, ${rarityColorVar} 30%, transparent)`;
        gameState.selectedMonsterId = monster.id;

    } else {
        DOMElements.monsterSnapshotBodySilhouette.style.display = 'none';
        DOMElements.snapshotNickname.textContent = '尚無怪獸';
        DOMElements.snapshotNickname.className = '';
        DOMElements.snapshotAchievementTitle.textContent = '稱號';
        DOMElements.snapshotWinLoss.innerHTML = `<span>勝: -</span><span>敗: -</span>`;
        DOMElements.snapshotEvaluation.textContent = `評價: -`;
        toggleElementDisplay(DOMElements.snapshotBarsContainer, false);
        DOMElements.monsterSnapshotArea.style.borderColor = 'var(--border-color)';
        DOMElements.monsterSnapshotArea.style.boxShadow = 'none';
        gameState.selectedMonsterId = null;
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

        const typeSpan = document.createElement('span');
        typeSpan.classList.add('dna-type-text');
        slot.appendChild(typeSpan);

        if (dna && dna.id) {
            slot.classList.add('occupied');
            applyDnaItemStyle(slot, dna);
            slot.draggable = true;
            slot.dataset.dnaId = dna.id;
            slot.dataset.dnaBaseId = dna.baseId;
            slot.dataset.dnaSource = 'combination';
            slot.dataset.slotIndex = index;
            typeSpan.textContent = `${dna.type || '無'}屬性`; 
        } else {
            nameSpan.textContent = `組合槽 ${index + 1}`;
            slot.classList.add('empty');
            applyDnaItemStyle(slot, null);
            typeSpan.textContent = ''; 
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

            const typeSpan = document.createElement('span');
            typeSpan.classList.add('dna-type-text');
            item.appendChild(typeSpan);

            if (dna) {
                item.draggable = true;
                item.dataset.dnaId = dna.id;
                item.dataset.dnaBaseId = dna.baseId;
                item.dataset.dnaSource = 'inventory';
                applyDnaItemStyle(item, dna);
                typeSpan.textContent = `${dna.type || '無'}屬性`; 
            } else {
                item.draggable = true;
                item.dataset.dnaSource = 'inventory';
                applyDnaItemStyle(item, null);
                nameSpan.textContent = '空位';
                typeSpan.textContent = ''; 
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
            slot.appendChild(nameSpan);
            
            const typeSpan = document.createElement('span');
            typeSpan.classList.add('dna-type-text');
            slot.appendChild(typeSpan);
            
            applyDnaItemStyle(slot, item.data);
            typeSpan.textContent = `${item.data.type || '無'}屬性`;

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

async function renderFriendsList() {
    const container = DOMElements.friendsListDisplayArea;
    if (!container) return;

    const friends = gameState.playerData?.friends || [];

    if (friends.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4">好友列表空空如也，快去搜尋並新增好友吧！</p>`;
        return;
    }

    const friendIds = friends.map(f => f.uid);
    let friendStatuses = {};
    try {
        const response = await getFriendsStatuses(friendIds);
        if (response.success) {
            friendStatuses = response.statuses;
        }
    } catch (error) {
        console.error("無法獲取好友狀態:", error);
    }
    
    container.innerHTML = `
        <div class="friends-list-grid">
            ${friends.map(friend => {
                const title = friend.title || '稱號未定';
                const displayName = `${title} ${friend.nickname}`;
                
                const lastSeen = friendStatuses[friend.uid];
                const nowInSeconds = Date.now() / 1000;
                const isOnline = lastSeen && (nowInSeconds - lastSeen < 300); 

                return `
                <div class="friend-item-card">
                    <div class="friend-info">
                        <span class="online-status ${isOnline ? 'online' : 'offline'}"></span>
                        <a href="#" class="friend-name-link" onclick="viewPlayerInfo('${friend.uid}'); return false;">
                            ${displayName}
                        </a>
                    </div>
                    <div class="friend-actions">
                        <button class="button secondary text-xs" title="送禮" disabled>🎁</button>
                        <button class="button secondary text-xs" title="聊天" disabled>💬</button>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

function updateAnnouncementPlayerName(playerName) {
    if (DOMElements.announcementPlayerName) {
        DOMElements.announcementPlayerName.textContent = playerName || "玩家";
    }
}


function getElementCssClassKey(chineseElement) {
    const elementTypeMap = {
        '火': 'fire', '水': 'water', '木': 'wood', '金': 'gold', '土': 'earth',
        '光': 'light', '暗': 'dark', '毒': 'poison', '風': 'wind', '混': 'mix', '無': '無'
    };
    return elementTypeMap[chineseElement] || '無'; 
}


function renderMonsterFarm() {
    const headersContainer = DOMElements.farmHeaders;
    const listContainer = DOMElements.farmedMonstersList;

    if (!listContainer || !headersContainer) {
        console.error("renderMonsterFarm Error: Farm containers not found.");
        return;
    }

    headersContainer.innerHTML = '';
    listContainer.innerHTML = '';

    const headers = [
        { text: '#', key: 'index', sortable: false },
        { text: '出戰', key: 'deploy', sortable: false },
        { text: '怪獸', key: 'nickname', sortable: true },
        { text: '評價', key: 'score', sortable: true },
        { text: '狀態', key: 'farmStatus', sortable: true },
        { text: '操作', key: 'actions', sortable: false }
    ];

    headers.forEach(header => {
        const headerDiv = document.createElement('div');
        headerDiv.textContent = header.text;
        if (header.sortable) {
            headerDiv.classList.add('sortable');
            headerDiv.dataset.sortKey = header.key;
            if (gameState.farmSortConfig && gameState.farmSortConfig.key === header.key) {
                const arrow = document.createElement('span');
                arrow.className = 'sort-arrow';
                arrow.textContent = gameState.farmSortConfig.order === 'desc' ? ' ▼' : ' ▲';
                headerDiv.appendChild(arrow);
            }
        }
        headersContainer.appendChild(headerDiv);
    });
    
    const monsters = gameState.playerData?.farmedMonsters || [];

    if (monsters.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">您的農場空空如也，快去組合新的怪獸吧！</p>`;
        return;
    }
    
    const sortConfig = gameState.farmSortConfig || { key: 'score', order: 'desc' };
    monsters.sort((a, b) => {
        let valA = a[sortConfig.key] || 0;
        let valB = b[sortConfig.key] || 0;
        if (typeof valA === 'string') {
            return sortConfig.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return sortConfig.order === 'asc' ? valA - valB : valB - valA;
        }
    });

    monsters.forEach((monster, index) => {
        const monsterItem = document.createElement('div');
        monsterItem.className = 'farm-monster-item';
        if (gameState.selectedMonsterId === monster.id) {
            monsterItem.classList.add('selected');
        }

        const colIndex = document.createElement('div');
        colIndex.className = 'farm-col farm-col-index';
        colIndex.textContent = index + 1;
        
        const colDeploy = document.createElement('div');
        colDeploy.className = 'farm-col farm-col-deploy';
        const isDeployed = gameState.playerData.selectedMonsterId === monster.id;
        colDeploy.innerHTML = `<button class="button ${isDeployed ? 'success' : 'secondary'} text-xs" onclick="handleDeployMonsterClick('${monster.id}')" ${isDeployed ? 'disabled' : ''} style="min-width: 70px;" title="${isDeployed ? '出戰中' : '設為出戰'}">${isDeployed ? '⚔️' : '出戰'}</button>`;
        
        const colInfo = document.createElement('div');
        colInfo.className = 'farm-col farm-col-info';
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
        const elementNickname = monster.custom_element_nickname || 
                                (gameState.gameConfigs?.element_nicknames?.[primaryElement] || primaryElement);
        const achievement = monster.title || '';
        const fullNickname = monster.nickname || '';
        const playerTitle = fullNickname.replace(achievement, '').replace(elementNickname, '');

        colInfo.innerHTML = `
            <a href="#" class="monster-name-link text-rarity-${rarityKey}" onclick="showMonsterInfoFromFarm('${monster.id}'); return false;">
                <div class="monster-name-line1" style="font-size: 0.8em; color: var(--text-secondary);">${playerTitle}${achievement}</div>
                <div class="monster-name-line2" style="font-weight: bold;">${elementNickname}</div>
            </a>`;
        
        const colScore = document.createElement('div');
        colScore.className = 'farm-col farm-col-score';
        colScore.textContent = monster.score || 0;
        colScore.style.color = 'var(--success-color)';

        const colStatus = document.createElement('div');
        colStatus.className = 'farm-col farm-col-status';
        colStatus.style.flexDirection = 'column';
        colStatus.style.lineHeight = '1.2';
        
        if (monster.farmStatus?.isTraining) {
            const startTime = monster.farmStatus.trainingStartTime || Date.now();
            const duration = monster.farmStatus.trainingDuration || 3600000;
            colStatus.innerHTML = `
                <div style="color: var(--accent-color);">修煉中</div>
                <div class="training-timer text-xs" data-start-time="${startTime}" data-duration="${duration}" style="font-size: 0.8em;">(0/${duration/1000}s)</div>
            `;
        } else if (gameState.playerData.selectedMonsterId === monster.id) {
            colStatus.innerHTML = `<span style="color: var(--rarity-mythical-text);">出戰中</span>`;
        } else if (monster.hp < monster.initial_max_hp * 0.25) {
            colStatus.innerHTML = `<span style="color: var(--danger-color);">瀕死</span>`;
        } else {
            colStatus.textContent = '閒置中';
        }
        
        const colActions = document.createElement('div');
        colActions.className = 'farm-col farm-col-actions';
        let actionsHTML = '';
        if (monster.farmStatus?.isTraining) {
            const startTime = monster.farmStatus.trainingStartTime || Date.now();
            const duration = monster.farmStatus.trainingDuration || 3600000;
            actionsHTML += `<button class="button warning text-xs" onclick="handleEndCultivationClick(event, '${monster.id}', ${startTime}, ${duration})">召回</button>`;
        } else {
            actionsHTML += `<button class="button primary text-xs" onclick="handleCultivateMonsterClick(event, '${monster.id}')">修煉</button>`;
        }
        actionsHTML += `<button class="button danger text-xs" onclick="handleReleaseMonsterClick(event, '${monster.id}')" style="margin-left: 5px;">放生</button>`;
        colActions.innerHTML = actionsHTML;
        
        monsterItem.appendChild(colIndex);
        monsterItem.appendChild(colDeploy);
        monsterItem.appendChild(colInfo);
        monsterItem.appendChild(colScore);
        monsterItem.appendChild(colStatus);
        monsterItem.appendChild(colActions);
        
        listContainer.appendChild(monsterItem);
    });
}


console.log("UI core module loaded.");
