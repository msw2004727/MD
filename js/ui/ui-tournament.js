// js/ui/ui-tournament.js

/**
 * 根據玩家的PVP數據，渲染天梯區塊的UI
 */
function renderLadderSection() {
    const playerStats = gameState.playerData?.playerStats;
    if (!playerStats) return;

    const pvpPoints = playerStats.pvp_points || 0;
    const pvpTier = playerStats.pvp_tier || "尚未定位";

    // 這裡可以定義不同段位的圖標和所需分數
    const tiers = {
        "銅牌": { icon: "🥉", min: 0, max: 100 },
        "銀牌": { icon: "🥈", min: 100, max: 300 },
        "金牌": { icon: "🥇", min: 300, max: 600 },
        "白金": { icon: "💎", min: 600, max: 1000 },
        "鑽石": { icon: "💠", min: 1000, max: 1500 },
        "大師": { icon: "👑", min: 1500, max: Infinity }
    };

    let currentTierInfo = Object.values(tiers).find(t => pvpPoints >= t.min && pvpPoints < t.max) || tiers["銅牌"];
    if (pvpPoints >= tiers["大師"].min) {
        currentTierInfo = tiers["大師"];
    }
    
    const pointsInTier = pvpPoints - currentTierInfo.min;
    const pointsForNextTier = currentTierInfo.max - currentTierInfo.min;
    const progressPercentage = (pointsInTier / pointsForNextTier) * 100;

    // 更新UI元素
    const rankIconEl = document.getElementById('ladder-rank-icon');
    const rankNameEl = document.getElementById('ladder-rank-name');
    const progressBarEl = document.getElementById('ladder-rank-progress-bar');
    const rankPointsEl = document.getElementById('ladder-rank-points');

    if (rankIconEl) rankIconEl.textContent = currentTierInfo.icon;
    if (rankNameEl) rankNameEl.textContent = pvpTier;
    if (progressBarEl) progressBarEl.style.width = `${Math.min(100, progressPercentage)}%`;
    if (rankPointsEl) rankPointsEl.textContent = `${pvpPoints} / ${currentTierInfo.max === Infinity ? '---' : currentTierInfo.max}`;
}

/**
 * 初始化武道大會頁籤的事件監聽器
 */
function initializeTournamentHandlers() {
    const weakBtn = document.getElementById('find-weak-opponent-btn');
    const equalBtn = document.getElementById('find-equal-opponent-btn');
    const strongBtn = document.getElementById('find-strong-opponent-btn');

    if (weakBtn) {
        weakBtn.addEventListener('click', () => handleFindLadderMatchClick('weak'));
    }
    if (equalBtn) {
        equalBtn.addEventListener('click', () => handleFindLadderMatchClick('equal'));
    }
    if (strongBtn) {
        strongBtn.addEventListener('click', () => handleFindLadderMatchClick('strong'));
    }
}

/**
 * 處理點擊「開始匹配對手」按鈕的事件
 * @param {'weak' | 'equal' | 'strong'} matchType 匹配類型
 */
async function handleFindLadderMatchClick(matchType) {
    const playerMonster = getSelectedMonster();
    if (!playerMonster) {
        showFeedbackModal('提示', '請先從您的農場選擇一隻出戰怪獸！');
        return;
    }

    showFeedbackModal('匹配中...', `正在為您尋找<span style="color: var(--danger-color);">${matchType === 'strong' ? '更強的' : (matchType === 'weak' ? '較弱的' : '實力相當的')}</span>對手...`, true);
    try {
        const playerPvpPoints = gameState.playerData?.playerStats?.pvp_points || 0;
        const result = await findLadderOpponent(playerPvpPoints, matchType);
        
        if (result.success) {
            const opponent = result.opponent;
            hideModal('feedback-modal');
            
            showConfirmationModal(
                '找到對手！',
                `為您匹配到對手：${opponent.nickname} (積分: ${opponent.pvp_points})。<br>是否立即發起挑戰？`,
                () => {
                    handleChallengeMonsterClick(null, opponent.selectedMonsterId, opponent.id, null, opponent.nickname, true);
                },
                { confirmButtonText: '發起挑戰' }
            );

        } else {
            throw new Error(result.error || '未知的匹配錯誤');
        }
    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('匹配失敗', `無法找到對手: ${error.message}`);
    }
}

/**
 * 渲染每日試煉區塊
 * @param {Array<object>} challenges - 每日試煉的設定數據
 */
function renderDailyChallenges(challenges) {
    const grid = document.getElementById('daily-challenges-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!challenges || challenges.length === 0) {
        grid.innerHTML = '<p class="text-center text-secondary col-span-full">今日的試煉已全部完成！</p>';
        return;
    }

    const completedChallenges = gameState.playerData?.playerStats?.daily_challenges_completed || {};
    const now = Math.floor(Date.now() / 1000);
    const cooldownSeconds = 24 * 60 * 60;

    challenges.forEach(challenge => {
        const card = document.createElement('div');
        card.className = 'panel text-center p-4';
        card.style.backgroundColor = 'var(--bg-slot)';

        const lastCompletedTime = completedChallenges[challenge.npc_id];
        const isCompleted = lastCompletedTime && (now - lastCompletedTime < cooldownSeconds);
        
        let buttonHtml = '';
        if (isCompleted) {
            const remainingSeconds = cooldownSeconds - (now - lastCompletedTime);
            const hours = Math.floor(remainingSeconds / 3600);
            const minutes = Math.floor((remainingSeconds % 3600) / 60);
            buttonHtml = `<button class="button secondary mt-4 text-xs" disabled>冷卻中 ${hours}h ${minutes}m</button>`;
        } else {
            buttonHtml = `<button class="button secondary mt-4 text-xs" onclick="handleChallengeMonsterClick(event, null, '${challenge.npc_id}', '${challenge.npc_id}', '試煉對手', false, 'daily')">挑戰</button>`;
        }

        card.innerHTML = `
            <div class="text-2xl mb-2">${challenge.icon}</div>
            <h4 class="font-bold">${challenge.name}</h4>
            <p class="text-sm text-secondary">${challenge.description}</p>
            <div class="text-sm font-bold mt-2" style="color: var(--success-color);">${challenge.rewardText}</div>
            ${buttonHtml}
        `;
        grid.appendChild(card);
    });
}

/**
 * 渲染特別錦標賽區塊
 * @param {object | null} tournament - 錦標賽的設定數據
 */
function renderSpecialTournament(tournament) {
    const info = document.getElementById('special-tournament-info');
    if (!info) return;

    if (!tournament || !tournament.is_active) {
        info.innerHTML = '<p class="text-center text-secondary">目前沒有正在舉行的特別錦標賽。</p>';
        return;
    }

    const now = new Date();
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);

    let statusHtml = '';
    if (now < startDate) {
        const diff = startDate.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        statusHtml = `距離開始還有: <span class="font-bold">${days} 天 ${hours} 小時</span>`;
    } else if (now > endDate) {
        statusHtml = `<span class="font-bold" style="color: var(--text-secondary);">已結束</span>`;
    } else {
        const diff = endDate.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        statusHtml = `距離結束還有: <span class="font-bold" style="color: var(--danger-color);">${days} 天 ${hours} 小時</span>`;
    }

    info.innerHTML = `
        <h3 class="text-xl font-bold" style="color: var(--rarity-mythical-text);">${tournament.name}</h3>
        <p class="text-secondary">${tournament.description}</p>
        <p class="mt-2">${statusHtml}</p>
        <button class="button danger mt-4" ${now < startDate || now > endDate ? 'disabled' : ''}>${now < startDate ? '尚未開始' : '進入錦標賽'}</button>
    `;
}

/**
 * 【新】渲染戰鬥通行證區塊的UI框架
 * @param {object} passData - 通行證的模擬數據
 */
function renderBattlePassSection(passData) {
    const levelEl = document.getElementById('battle-pass-level');
    const nextRewardEl = document.getElementById('battle-pass-next-reward');
    const progressBarEl = document.getElementById('battle-pass-progress-bar');

    if (levelEl && nextRewardEl && progressBarEl) {
        levelEl.textContent = `等級 ${passData.level}`;
        nextRewardEl.textContent = `下一級: ${passData.nextReward}`;
        progressBarEl.style.width = `${passData.progressPercentage}%`;
    }
}

/**
 * 【新】當一個每日試煉挑戰成功後，替換掉它
 * @param {string} completedNpcId - 已完成的試煉的NPC ID
 */
function replaceCompletedChallenge(completedNpcId) {
    const allChallenges = gameState.gameConfigs?.tournament_config?.daily_challenges || [];
    const currentIds = new Set(gameState.currentDailyChallenges.map(c => c.id));

    // 找到可用的、未出現在當前列表中的新試煉
    const availableNewChallenges = allChallenges.filter(c => !currentIds.has(c.id));

    if (availableNewChallenges.length > 0) {
        // 隨機選擇一個新的試煉
        const newChallenge = availableNewChallenges[Math.floor(Math.random() * availableNewChallenges.length)];
        
        // 找到舊試煉在當前列表中的索引，並替換它
        const completedIndex = gameState.currentDailyChallenges.findIndex(c => c.npc_id === completedNpcId);
        if (completedIndex !== -1) {
            gameState.currentDailyChallenges[completedIndex] = newChallenge;
        }
    } else {
        // 如果沒有更多可替換的，就移除已完成的
        gameState.currentDailyChallenges = gameState.currentDailyChallenges.filter(c => c.npc_id !== completedNpcId);
    }

    // 重新渲染每日試煉區塊
    renderDailyChallenges(gameState.currentDailyChallenges);
}


// 當切換到武道大會頁籤時，呼叫此函式
async function setupTournamentTab() {
    // 【新】如果當前的每日挑戰列表為空，則從總列表中隨機抽取
    if (!gameState.currentDailyChallenges || gameState.currentDailyChallenges.length === 0) {
        const allChallenges = gameState.gameConfigs?.tournament_config?.daily_challenges || [];
        // 洗牌演算法，隨機排序
        const shuffled = allChallenges.sort(() => 0.5 - Math.random());
        gameState.currentDailyChallenges = shuffled.slice(0, 3); // 選取前3個
    }

    const specialTournament = gameState.gameConfigs?.tournament_config?.special_tournaments?.[0] || null;

    // 模擬的戰鬥通行證數據
    const mockBattlePassData = {
        level: 5,
        nextReward: '傳奇DNA碎片',
        progressPercentage: 30
    };

    renderLadderSection();
    renderDailyChallenges(gameState.currentDailyChallenges); // 使用 gameState 中的列表來渲染
    renderSpecialTournament(specialTournament);
    renderBattlePassSection(mockBattlePassData);
    initializeTournamentHandlers();
    
    try {
        const championsData = await getChampionsLeaderboard();
        gameState.champions = championsData || [null, null, null, null];
        if (typeof renderChampionSlots === 'function') {
            renderChampionSlots(gameState.champions);
        }
    } catch (error) {
        console.error("無法載入冠軍殿堂:", error);
    }
}
