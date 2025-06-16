// js/handlers/ui-handlers.js

function initializeUIEventHandlers() {
    handleThemeSwitch();
    handleAuthForms();
    // handleTopNavButtons(); // 已移除
    handleTabSwitching();
    handleModalCloseButtons(); 
    handleAnnouncementModalClose();
    handleBattleLogModalClose();
    handleNewbieGuideSearch();
    handleSelectionModalActions();
    
    // --- 核心修改處 START ---
    // 為新的 Banner 彈窗按鈕綁定事件
    handleInventoryGuideModal();
    // --- 核心修改處 END ---
}

// --- 核心修改處 START ---
// 新增函式來處理 Banner 彈窗的開啟
function handleInventoryGuideModal() {
    const openBtn = document.getElementById('inventory-guide-button');
    const bannerModal = document.getElementById('banner-modal');
    const bannerContent = document.getElementById('banner-modal-content');

    if (openBtn && bannerModal) {
        openBtn.addEventListener('click', () => {
            // 從遊戲狀態中讀取在 assets.json 設定好的圖片路徑
            const bannerUrl = gameState.assetPaths?.images?.modals?.dnaGuideBanner;

            if (bannerContent && bannerUrl) {
                // 將彈窗內容設為包含該圖片的<img>標籤
                bannerContent.innerHTML = `<img src="${bannerUrl}" alt="DNA碎片說明圖" style="max-width: 100%; height: auto; display: block; border-radius: 6px;">`;
            } else if (bannerContent) {
                // 如果找不到圖片路徑，則顯示錯誤訊息
                bannerContent.innerHTML = '<p>說明圖片載入失敗。</p>';
            }
            showModal('banner-modal');
        });
    }
}
// --- 核心修改處 END ---

// 【新增】處理天梯-排行榜彈窗內的點擊事件
function handleSelectionModalActions() {
    const selectionModal = document.getElementById('selection-modal');
    if (!selectionModal) return;

    selectionModal.addEventListener('click', (event) => {
        const monsterColumn = event.target.closest('#open-monster-leaderboard-from-selection');
        const playerColumn = event.target.closest('#open-player-leaderboard-from-selection');

        if (monsterColumn) {
            hideModal('selection-modal');
            handleMonsterLeaderboardClick(); // 呼叫現有的函式來打開怪獸排行榜
        } else if (playerColumn) {
            hideModal('selection-modal');
            handlePlayerLeaderboardClick(); // 呼叫現有的函式來打開玩家排行榜
        }
    });
}

function handleThemeSwitch() {
    if (DOMElements.themeSwitcherBtn) {
        DOMElements.themeSwitcherBtn.addEventListener('click', () => {
            const newTheme = gameState.currentTheme === 'dark' ? 'light' : 'dark';
            updateTheme(newTheme);
        });
    }
}

function handleAuthForms() {
    if (DOMElements.showRegisterFormBtn) DOMElements.showRegisterFormBtn.addEventListener('click', () => showModal('register-modal'));
    if (DOMElements.showLoginFormBtn) DOMElements.showLoginFormBtn.addEventListener('click', () => showModal('login-modal'));

    if (DOMElements.registerSubmitBtn) {
        DOMElements.registerSubmitBtn.addEventListener('click', async () => {
            const nickname = DOMElements.registerNicknameInput.value.trim();
            const password = DOMElements.registerPasswordInput.value;
            DOMElements.registerErrorMsg.textContent = '';
            if (!nickname || !password) {
                DOMElements.registerErrorMsg.textContent = '暱稱和密碼不能為空。';
                return;
            }
            try {
                showFeedbackModal('註冊中...', '正在為您創建帳號，請稍候...', true);
                await registerUser(nickname, password);
                hideModal('register-modal');
            } catch (error) {
                DOMElements.registerErrorMsg.textContent = error.message;
                hideModal('feedback-modal');
            }
        });
    }

    if (DOMElements.loginSubmitBtn) {
        DOMElements.loginSubmitBtn.addEventListener('click', async () => {
            const nickname = DOMElements.loginNicknameInput.value.trim();
            const password = DOMElements.loginPasswordInput.value;
            DOMElements.loginErrorMsg.textContent = '';
            if (!nickname || !password) {
                DOMElements.loginErrorMsg.textContent = '暱稱和密碼不能為空。';
                return;
            }
            try {
                showFeedbackModal('登入中...', '正在驗證您的身份，請稍候...', true);
                await loginUser(nickname, password);
                hideModal('login-modal');
            } catch (error) {
                DOMElements.loginErrorMsg.textContent = error.message;
                hideModal('feedback-modal');
            }
        });
    }

    if (DOMElements.mainLogoutBtn) {
        DOMElements.mainLogoutBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('登出中...', '正在安全登出...', true);
                await logoutUser();
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('登出失敗', `登出時發生錯誤: ${error.message}`);
            }
        });
    }
}

async function handleMonsterLeaderboardClick() {
    try {
        showFeedbackModal('載入中...', '正在獲取怪獸排行榜...', true);
        const leaderboardData = await getMonsterLeaderboard(20);
        
        gameState.monsterLeaderboard = leaderboardData || [];
        
        updateLeaderboardTable('monster', gameState.monsterLeaderboard, 'monster-leaderboard-table-container'); 
        
        if (DOMElements.monsterLeaderboardElementTabs && DOMElements.monsterLeaderboardElementTabs.innerHTML.trim() === '') {
            const allElements = ['all', '火', '水', '木', '金', '土', '光', '暗', '毒', '風', '混', '無'];
            updateMonsterLeaderboardElementTabs(allElements);
        }

        hideModal('feedback-modal');
        showModal('monster-leaderboard-modal');
    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('載入失敗', `無法獲取怪獸排行榜: ${error.message}`);
    }
}

async function handlePlayerLeaderboardClick() {
    try {
        showFeedbackModal('載入中...', '正在獲取玩家排行榜...', true);
        const leaderboardData = await getPlayerLeaderboard(20);

        gameState.playerLeaderboard = leaderboardData || [];

        updateLeaderboardTable('player', gameState.playerLeaderboard, 'player-leaderboard-table-container');

        hideModal('feedback-modal');
        showModal('player-leaderboard-modal');
    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('載入失敗', `無法獲取玩家排行榜: ${error.message}`);
    }
}


async function handleCombinedLeaderboardClick() {
    console.log("handleCombinedLeaderboardClick 函式已觸發。");
    showFeedbackModal('載入中...', '正在獲取最新的排行榜資訊...', true);
    try {
        const [monsterData, playerData] = await Promise.all([
            getMonsterLeaderboard(20),
            getPlayerLeaderboard(20)
        ]);
        console.log("已成功獲取怪獸與玩家排行榜資料。");

        gameState.monsterLeaderboard = monsterData || [];
        gameState.playerLeaderboard = playerData || [];

        updateLeaderboardTable('monster', gameState.monsterLeaderboard, 'combined-monster-leaderboard-container');
        updateLeaderboardTable('player', gameState.playerLeaderboard, 'combined-player-leaderboard-container');
        console.log("排行榜表格已渲染。");
        
        hideModal('feedback-modal');
        showModal('combined-leaderboard-modal'); 
        console.log("顯示綜合排行榜彈窗。");

    } catch (error) {
        console.error("處理綜合排行榜點擊時發生錯誤:", error);
        hideModal('feedback-modal');
        showFeedbackModal('載入失敗', `無法獲取排行榜資訊: ${error.message}`);
    }
}


function handleTabSwitching() {
    if (DOMElements.dnaFarmTabs) {
        DOMElements.dnaFarmTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                switchTabContent(targetTabId, event.target);
            }
        });
    }

    if (DOMElements.monsterInfoTabs) {
        DOMElements.monsterInfoTabs.addEventListener('click', (event) => {
            if (event.target.classList.contains('tab-button')) {
                const targetTabId = event.target.dataset.tabTarget;
                switchTabContent(targetTabId, event.target, 'monster-info-modal');
            }
        });
    }
}

function handleModalCloseButtons() {
    document.body.addEventListener('click', (event) => {
        const closeButton = event.target.closest('.modal-close');
        if (closeButton) {
            const modalId = closeButton.dataset.modalId || closeButton.closest('.modal')?.id;
            if (modalId) {
                if (modalId === 'training-results-modal' && gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained && gameState.lastCultivationResult.items_obtained.some(item => item !== null)) {
                    showModal('reminder-modal');
                } else {
                    hideModal(modalId);
                }
            }
        }
    });
    
    if (DOMElements.reminderConfirmCloseBtn) DOMElements.reminderConfirmCloseBtn.addEventListener('click', () => {
        hideModal('reminder-modal');
        hideModal('training-results-modal');
        if (gameState.lastCultivationResult) {
            gameState.lastCultivationResult.items_obtained = []; 
        }
    });
    if (DOMElements.reminderCancelBtn) DOMElements.reminderCancelBtn.addEventListener('click', () => {
        hideModal('reminder-modal');
    });
}

function handleAnnouncementModalClose() {
    if (DOMElements.officialAnnouncementCloseX) {
        DOMElements.officialAnnouncementCloseX.addEventListener('click', () => {
            hideModal('official-announcement-modal');
            localStorage.setItem('announcementShown_v1', 'true');
        });
    }
}

function handleBattleLogModalClose() {
    if (DOMElements.closeBattleLogBtn) DOMElements.closeBattleLogBtn.addEventListener('click', () => {
        hideModal('battle-log-modal');
        refreshPlayerData();
    });
}

function handleNewbieGuideSearch() {
    if (DOMElements.newbieGuideSearchInput) {
        DOMElements.newbieGuideSearchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
                updateNewbieGuideModal(gameState.gameConfigs.newbie_guide, searchTerm);
            }
        });
    }
}

async function handleSkillLinkClick(event) {
    if (!event || !event.target) return;

    const target = event.target.closest('.skill-name-link');
    if (!target) return;

    event.preventDefault();

    const skillName = target.dataset.skillName;
    if (!skillName) return;

    let skillDetails = null;
    if (gameState.gameConfigs && gameState.gameConfigs.skills) {
        for (const elementType in gameState.gameConfigs.skills) {
            const skillsInElement = gameState.gameConfigs.skills[elementType];
            if (Array.isArray(skillsInElement)) {
                const foundSkill = skillsInElement.find(s => s.name === skillName);
                if (foundSkill) {
                    skillDetails = foundSkill;
                    break;
                }
            }
        }
    }

    if (skillDetails) {
        const description = skillDetails.description || skillDetails.story || '暫無描述。';
        const mpCost = skillDetails.mp_cost !== undefined ? skillDetails.mp_cost : 'N/A';
        const power = skillDetails.power !== undefined ? skillDetails.power : 'N/A';
        const category = skillDetails.skill_category || '未知';
        
        const message = `
            <div style="text-align: left; background-color: var(--bg-primary); padding: 8px; border-radius: 4px; border: 1px solid var(--border-color);">
                <p><strong>技能: ${skillName}</strong></p>
                <p><strong>類別:</strong> ${category} &nbsp;&nbsp; <strong>威力:</strong> ${power} &nbsp;&nbsp; <strong>消耗MP:</strong> ${mpCost}</p>
                <hr style="margin: 8px 0; border-color: var(--border-color);">
                <p>${description}</p>
            </div>
        `;
        
        const feedbackModalBody = target.closest('#feedback-modal-body-content');
        const injectionPoint = document.getElementById('skill-details-injection-point');

        if (feedbackModalBody && injectionPoint) {
            injectionPoint.innerHTML = message;
        } else {
            showFeedbackModal(`技能: ${skillName}`, message);
        }
    } else {
        showFeedbackModal('錯誤', `找不到名為 "${skillName}" 的技能詳細資料。`);
    }
}

document.body.addEventListener('click', function(event) {
    const skillLink = event.target.closest('.skill-name-link');
    if (skillLink) {
        handleSkillLinkClick(event);
    }

    const selectionBtn = event.target.closest('#snapshot-selection-modal-btn');
    if (selectionBtn) {
        showModal('selection-modal');
    }
});
