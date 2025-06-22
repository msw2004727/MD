// js/ui.js
console.log("DEBUG: ui.js starting to load and define functions."); // Add this line

// 注意：此檔案會依賴 gameState (來自 js/game-state.js) 和其他輔助函數
// 這個檔案現在是UI系統的核心，負責主畫面渲染和通用彈窗的顯示/隱藏。

let DOMElements = {}; // 在頂層聲明，但由 initializeDOMElements 初始化
let progressInterval = null; // 用於存放進度條的計時器ID

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

        // Friends list rendering is now handled within its own module/event
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

function injectLoadingBarStyles() {
    const styleId = 'dynamic-loading-bar-styles';
    if (document.getElementById(styleId)) return; // 如果樣式已存在，則不重複添加

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .progress-container {
            width: 80%;
            height: 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-primary);
            padding: 2px;
            margin: 1rem auto 0;
            overflow: hidden;
        }
        .progress-bar {
            height: 100%;
            width: 0%;
            border-radius: 4px;
            background-color: var(--accent-color);
            transition: width 0.4s ease-in-out;
        }
    `;
    document.head.appendChild(style);
}

function manageProgressBar(start = false) {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }

    const bar = document.getElementById("feedback-progress-bar");
    if (!bar) return;

    if (start) {
        let percent = 0;
        bar.style.width = "0%";
        progressInterval = setInterval(() => {
            if (percent >= 100) {
                percent = 0; 
            }
            percent += Math.random() * 5 + 2; 
            bar.style.width = Math.min(percent, 100) + "%";
        }, 400); 
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        setTimeout(() => {
            const scrollableBodies = modal.querySelectorAll('.modal-body, .tab-content, #newbie-guide-content-area, #monster-activity-logs, #player-monsters-table-container, #battle-log-area');
            scrollableBodies.forEach(body => {
                body.scrollTop = 0;
            });

            const tabButtonsContainer = modal.querySelector('.tab-buttons');
            if (tabButtonsContainer) {
                const firstTabButton = tabButtonsContainer.querySelector('.tab-button');
                if (firstTabButton && typeof switchTabContent === 'function') {
                    if (!firstTabButton.classList.contains('active')) {
                        const firstTabTargetId = firstTabButton.dataset.tabTarget;
                        switchTabContent(firstTabTargetId, firstTabButton, modalId);
                    }
                }
            }
        }, 0);
        
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
        
        if (modalId === 'feedback-modal') {
            if (gameState.feedbackHintInterval) {
                clearInterval(gameState.feedbackHintInterval);
                gameState.feedbackHintInterval = null;
            }
            manageProgressBar(false); 
        }
        
        if (modalId === 'training-results-modal' && gameState.trainingHintInterval) {
            clearInterval(gameState.trainingHintInterval);
            gameState.trainingHintInterval = null;
        }
    }
}

function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        hideModal(modal.id); 
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
    
    if (DOMElements.feedbackMonsterDetails) {
        DOMElements.feedbackMonsterDetails.innerHTML = '';
        toggleElementDisplay(DOMElements.feedbackMonsterDetails, false);
    }
    const modalBody = DOMElements.feedbackModal.querySelector('#feedback-modal-body-content');
    
    const existingProgressBar = modalBody.querySelector('.progress-container');
    if (existingProgressBar) existingProgressBar.remove();

    const existingBanner = modalBody.querySelector('.feedback-banner');
    if (existingBanner) existingBanner.remove();
    const existingHints = modalBody.querySelector('.loading-hints-container');
    if (existingHints) existingHints.remove();
    if (gameState.feedbackHintInterval) {
        clearInterval(gameState.feedbackHintInterval);
        gameState.feedbackHintInterval = null;
    }

    DOMElements.feedbackModalTitle.textContent = title;

    const addBannerAndHints = (bannerUrl, altText) => {
        if (!bannerUrl) return; 
        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'feedback-banner';
        bannerContainer.style.textAlign = 'center';
        bannerContainer.style.marginBottom = '15px';
        bannerContainer.innerHTML = `<img src="${bannerUrl}" alt="${altText}" style="max-width: 100%; border-radius: 6px;">`;
        modalBody.prepend(bannerContainer);

        const progressBarHtml = `
            <div class="progress-container">
              <div class="progress-bar" id="feedback-progress-bar"></div>
            </div>
        `;
        bannerContainer.insertAdjacentHTML('afterend', progressBarHtml);
        manageProgressBar(true);
        
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
        modalBody.querySelector('.progress-container').insertAdjacentElement('afterend', hintsContainer);
        
        const hintElement = document.getElementById('loading-hints-carousel');
        const hintsArray = gameState.uiTextContent?.training_hints || [];

        if (hintElement && hintsArray.length > 0) {
            const firstRandomIndex = Math.floor(Math.random() * hintsArray.length);
            hintElement.textContent = `💡 ${hintsArray[firstRandomIndex]}`;
            gameState.feedbackHintInterval = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * hintsArray.length);
                hintElement.textContent = `💡 ${hintsArray[randomIndex]}`;
            }, 2000); 
        }
    };
    
    // --- 核心修改處 START ---
    const loadingTitleMap = {
        '遊戲載入中': 'gameLoad',
        '登入中': 'login',
        '註冊中': 'register',
        '登出中': 'logout',
        '怪獸合成中': 'synthesis',
        '結算中': 'calculating',
        'DNA抽取中': 'dnaDrawing',
        '準備戰鬥': 'battlePrep',
        '戰鬥中': 'battling',
        '學習中': 'skillLearn',
        '替換技能中': 'skillLearn',
        '載入中': 'generic',
        '處理中': 'processing',
        '更新中': 'updating',
        '治療中...': 'healing', // 新增 '治療中...' 的對應鍵
    };
    // --- 核心修改處 END ---

    let loadingKey = null;
    if (isLoading) {
        for (const keyTitle in loadingTitleMap) {
            if (title.startsWith(keyTitle)) {
                loadingKey = loadingTitleMap[keyTitle];
                break;
            }
        }
    }
    
    if(isLoading) {
        injectLoadingBarStyles();
    }

    const loadingBanners = gameState.assetPaths?.images?.modals?.loadingBanners || {};
    const genericLoadingBanner = loadingBanners.generic || '';

    if (awardDetails) { 
        const bannerUrl = gameState.assetPaths?.images?.modals?.titleAward || '';
        const awardType = awardDetails.type === 'title' ? '稱號' : '成就';
        const awardName = awardDetails.name || '未知的榮譽';
        const buffs = awardDetails.buffs || {};

        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'feedback-banner';
        bannerContainer.style.textAlign = 'center';
        bannerContainer.style.marginBottom = '15px';
        bannerContainer.innerHTML = `<img src="${bannerUrl}" alt="榮譽橫幅" style="max-width: 100%; border-radius: 6px;">`;
        modalBody.prepend(bannerContainer);

        let messageHtml = `<p class="text-center text-base text-[var(--text-secondary)] mb-2">恭喜 ${gameState.playerNickname || '您'} 獲得新的${awardType}！</p>`;
        messageHtml += `<h4 class="text-2xl font-bold text-center mb-3" style="color: gold; text-shadow: 0 0 8px #000;">${awardName}</h4>`;
        
        if (Object.keys(buffs).length > 0) {
            const getBuffDisplayName = (key) => {
                 const names = { 
                     hp: 'HP值', mp: 'MP值', attack: '攻擊', defense: '防禦', speed: '速度', crit: '爆擊率', evasion: '閃避率',
                     cultivation_item_find_chance: '修煉物品發現率', cultivation_exp_gain: '修煉經驗提升',
                     cultivation_time_reduction: '修煉時間縮短', score_gain_boost: '積分獲取提升',
                     elemental_damage_boost: '元素傷害提升', poison_damage_boost: '毒系傷害提升',
                     leech_skill_effect: '吸血效果提升', mp_regen_per_turn: 'MP每回合恢復',
                     dna_return_rate_on_disassemble: '分解DNA返還率', fire_resistance: '火系抗性',
                     water_resistance: '水系抗性', wood_resistance: '木系抗性', gold_resistance: '金系抗性',
                     earth_resistance: '土系抗性', light_resistance: '光系抗性', dark_resistance: '暗系抗性'
                 };
                 return names[key] || key;
            };

            messageHtml += `<div class="details-section mt-4" style="background-color: var(--bg-primary); padding: 10px;">`;
            messageHtml += `<h5 class="details-section-title" style="margin-bottom: 8px;">稱號能力</h5><ul style="list-style: none; padding: 0; margin: 0;">`;
            for (const [stat, value] of Object.entries(buffs)) {
                const displayValue = (value > 0 && value < 1) ? `+${(value * 100).toFixed(0)}%` : `+${value}`;
                messageHtml += `<li style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border-color);"><span style="font-weight: 500;">${getBuffDisplayName(stat)}</span><span style="color: var(--danger-color); font-weight: bold;">${displayValue}</span></li>`;
            }
            messageHtml += `</ul></div>`;
        }
        
        DOMElements.feedbackModalMessage.innerHTML = messageHtml;
    }
    else if (loadingKey) {
        const bannerUrl = loadingBanners[loadingKey] || genericLoadingBanner;
        addBannerAndHints(bannerUrl, title);
    }
    else if (monsterDetails && monsterDetails.type === 'cultivation_start' && monsterDetails.monster) {
        const monster = monsterDetails.monster;
        let displayName;
        if (monster.custom_element_nickname) {
            displayName = monster.custom_element_nickname;
        } else {
            const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
            const monsterRarity = monster.rarity || '普通';
            const nicknamesByElement = gameState.gameConfigs?.element_nicknames?.[primaryElement];
            if (nicknamesByElement && nicknamesByElement[monsterRarity] && nicknamesByElement[monsterRarity].length > 0) {
                displayName = nicknamesByElement[monsterRarity][0];
            } else {
                displayName = primaryElement;
            }
        }
        const rarityMap = {'普通':'common', '稀有':'rare', '菁英':'elite', '傳奇':'legendary', '神話':'mythical'};
        const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
        
        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'feedback-banner';
        bannerContainer.style.textAlign = 'center';
        bannerContainer.style.marginBottom = '15px';
        const bannerUrl = gameState.assetPaths?.images?.modals?.trainingStart || '';
        bannerContainer.innerHTML = `<img src="${bannerUrl}" alt="修煉橫幅" style="max-width: 100%; border-radius: 6px;">`;
        modalBody.prepend(bannerContainer);

        DOMElements.feedbackModalMessage.innerHTML = `<p class="text-center text-base">怪獸 <strong class="text-rarity-${rarityKey}">${displayName}</strong> 已出發開始修煉。</p>`;
        DOMElements.feedbackModal.querySelector('.modal-content').classList.remove('large-feedback-modal');
    }
    else if (monsterDetails) { // Fallback for original synthesis success
        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'feedback-banner';
        bannerContainer.style.textAlign = 'center';
        bannerContainer.style.marginBottom = '15px';
        const bannerUrl = gameState.assetPaths?.images?.modals?.synthesisSuccess || '';
        bannerContainer.innerHTML = `<img src="${bannerUrl}" alt="合成成功橫幅" style="max-width: 100%; border-radius: 6px;">`;
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
            
            const playerDisplayName = getMonsterDisplayName(playerMonster, gameState.gameConfigs);
            const opponentDisplayName = getMonsterDisplayName(opponentMonster, gameState.gameConfigs);

            const playerRarityKey = playerMonster.rarity ? (rarityMap[playerMonster.rarity] || 'common') : 'common';
            const opponentRarityKey = opponentMonster.rarity ? (rarityMap[opponentMonster.rarity] || 'common') : 'common';
            
            const bannerUrl = gameState.assetPaths?.images?.modals?.battleConfirmation || '';

            const playerHpPercent = playerMonster.initial_max_hp > 0 ? (playerMonster.hp / playerMonster.initial_max_hp) * 100 : 0;
            const playerMpPercent = playerMonster.initial_max_mp > 0 ? (playerMonster.mp / playerMonster.initial_max_mp) * 100 : 0;
            const opponentHpPercent = opponentMonster.initial_max_hp > 0 ? (opponentMonster.hp / opponentMonster.initial_max_hp) * 100 : 0;
            const opponentMpPercent = opponentMonster.initial_max_mp > 0 ? (opponentMonster.mp / opponentMonster.initial_max_mp) * 100 : 0;

            bodyHtml = `
                <div class="confirmation-banner" style="text-align: center; margin-bottom: 1rem;">
                    <img src="${bannerUrl}" alt="對戰" style="max-width: 100%; border-radius: 6px;">
                </div>
                <div class="battle-confirm-grid">
                    <div class="monster-confirm-details player">
                        <p class="monster-role">您的怪獸</p>
                        <p class="monster-name text-rarity-${playerRarityKey}">${playerDisplayName}</p>
                        <p class="monster-score">(評價: ${playerMonster.score})</p>
                        <div class="confirm-stat-bar-container">
                            <div class="confirm-stat-bar hp"><div class="confirm-stat-bar-fill" style="width: ${playerHpPercent}%;"></div></div>
                            <div class="confirm-stat-bar mp"><div class="confirm-stat-bar-fill" style="width: ${playerMpPercent}%;"></div></div>
                        </div>
                    </div>
                    <div class="monster-confirm-details opponent">
                        <p class="monster-role">對手的怪獸</p>
                        <p class="monster-name text-rarity-${opponentRarityKey}">${opponentDisplayName}</p>
                        <p class="monster-score">(評價: ${opponentMonster.score})</p>
                        <div class="confirm-stat-bar-container">
                            <div class="confirm-stat-bar hp"><div class="confirm-stat-bar-fill" style="width: ${opponentHpPercent}%;"></div></div>
                            <div class="confirm-stat-bar mp"><div class="confirm-stat-bar-fill" style="width: ${opponentMpPercent}%;"></div></div>
                        </div>
                    </div>
                </div>
                <p class="text-center mt-4">確定挑戰嗎?</p>
            `;
        } else {
             bodyHtml = `<p>${message}</p>`; // Fallback
        }
    } else if (title === '提前結束修煉') {
        const bannerUrl = gameState.assetPaths?.images?.modals?.endTrainingEarly || '';
        bodyHtml += `
            <div class="confirmation-banner" style="text-align: center; margin-bottom: 15px;">
                <img src="${bannerUrl}" alt="提前結束修煉橫幅" style="max-width: 100%; border-radius: 6px;">
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

function getElementCssClassKey(chineseElement) {
    const elementTypeMap = {
        '火': 'fire', '水': 'water', '木': 'wood', '金': 'gold', '土': 'earth',
        '光': 'light', '暗': 'dark', '毒': 'poison', '風': 'wind', '混': 'mix', '無': '無'
    };
    return elementTypeMap[chineseElement] || '無'; 
}

function updateAnnouncementPlayerName(playerName) {
    const announcementPlayerNameElement = document.getElementById('announcement-player-name');
    if (announcementPlayerNameElement) {
        announcementPlayerNameElement.textContent = playerName || "玩家";
    }
}

console.log("UI core module loaded.");

function populateImageAssetSources() {
    if (!gameState.assetPaths || !gameState.assetPaths.images) {
        console.error("Asset paths not loaded. Cannot populate image sources.");
        return;
    }

    document.querySelectorAll('[data-asset-key]').forEach(element => {
        const keyPath = element.dataset.assetKey.split('.'); 
        let path = gameState.assetPaths.images;
        
        for (const key of keyPath) {
            path = path[key];
            if (!path) break;
        }

        if (typeof path === 'string') {
            element.src = path;
        } else {
            console.warn(`Asset key not found or is not a string: ${element.dataset.assetKey}`);
        }
    });
    console.log("Image asset sources have been populated dynamically.");
}

function updatePlayerCurrencyDisplay(amount) {
    const amountElement = document.getElementById('player-currency-amount');
    if (amountElement) {
        const numAmount = Number(amount);
        if (isNaN(numAmount)) {
            amountElement.textContent = '0';
            return;
        }
        amountElement.textContent = numAmount.toLocaleString('en-US');
    }
}
