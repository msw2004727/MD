// js/handlers/ui-handlers.js

function initializeUIEventHandlers() {
    handleThemeSwitch();
    handleAuthForms();
    handleTopNavButtons();
    handleTabSwitching();
    handleModalCloseButtons(); // This function will be modified
    handleAnnouncementModalClose();
    handleBattleLogModalClose();
    handleNewbieGuideSearch();
    
    // 使用事件委派來處理動態生成的技能連結點擊
    document.body.addEventListener('click', function(event) {
        if (event.target && event.target.matches('.skill-name-link')) {
            handleSkillLinkClick(event);
        }
    });
}

// --- 個別事件處理函式 ---

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

function handleTopNavButtons() {
    if (DOMElements.playerInfoButton) {
        DOMElements.playerInfoButton.addEventListener('click', () => {
            if (gameState.playerData && gameState.currentUser) {
                updatePlayerInfoModal(gameState.playerData, gameState.gameConfigs);
                showModal('player-info-modal');
            } else {
                showFeedbackModal('錯誤', '無法載入玩家資訊，請先登入。');
            }
        });
    }

    if (DOMElements.showMonsterLeaderboardBtn) {
        DOMElements.showMonsterLeaderboardBtn.addEventListener('click', async () => {
            // 注意：排行榜的獲取邏輯保持在 leaderboard-handlers.js 中
            if (typeof fetchAndDisplayMonsterLeaderboard === 'function') {
                await fetchAndDisplayMonsterLeaderboard();
                showModal('monster-leaderboard-modal');
            }
        });
    }

    if (DOMElements.showPlayerLeaderboardBtn) {
        DOMElements.showPlayerLeaderboardBtn.addEventListener('click', async () => {
            try {
                showFeedbackModal('載入中...', '正在獲取玩家排行榜...', true);
                const leaderboardData = await getPlayerLeaderboard(20);
                gameState.playerLeaderboard = leaderboardData;
                sortAndRenderLeaderboard('player');
                hideModal('feedback-modal');
                showModal('player-leaderboard-modal');
            } catch (error) {
                showFeedbackModal('載入失敗', `無法獲取玩家排行榜: ${error.message}`);
            }
        });
    }

    if (DOMElements.newbieGuideBtn) {
        DOMElements.newbieGuideBtn.addEventListener('click', () => {
            if (gameState.gameConfigs && gameState.gameConfigs.newbie_guide) {
                updateNewbieGuideModal(gameState.gameConfigs.newbie_guide);
                if(DOMElements.newbieGuideSearchInput) DOMElements.newbieGuideSearchInput.value = '';
                showModal('newbie-guide-modal');
            } else {
                showFeedbackModal('錯誤', '新手指南尚未載入。');
            }
        });
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
    // 使用事件委派來處理所有 modal 的關閉按鈕
    document.body.addEventListener('click', (event) => {
        const closeButton = event.target.closest('.modal-close');
        if (closeButton) {
            const modalId = closeButton.dataset.modalId || closeButton.closest('.modal')?.id;
            if (modalId) {
                if (modalId === 'training-results-modal' && gameState.lastCultivationResult && gameState.lastCultivationResult.items_obtained && gameState.lastCultivationResult.items_obtained.length > 0) {
                    showModal('reminder-modal');
                } else {
                    hideModal(modalId);
                }
            }
        }
    });
    
    // 提醒視窗的按鈕事件保持不變，因為它們是靜態的
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
    // 這個函數現在可以正確接收到 event 物件
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
