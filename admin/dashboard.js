document.addEventListener('DOMContentLoaded', () => {
    // --- 全域變數與初始化 ---
    const adminToken = localStorage.getItem('admin_token');
    const API_BASE_URL = (typeof window.API_BASE_URL !== 'undefined') 
        ? window.API_BASE_URL 
        : 'https://md-server-5wre.onrender.com/api/MD'; 

    let currentLogs = []; // 【新增】用來緩存當前查詢玩家的日誌

    const DOMElements = {
        sidebarLinks: document.querySelectorAll('.nav-link'),
        mainContentSections: document.querySelectorAll('.admin-section'),
        logoutBtn: document.getElementById('logout-btn'),

        // 儀表板
        totalPlayers: document.getElementById('total-players'),
        totalGold: document.getElementById('total-gold'),
        totalDna: document.getElementById('total-dna'),
        rarityDistribution: document.getElementById('monster-rarity-distribution'),

        // 玩家管理
        playerSearchInput: document.getElementById('player-uid-search'),
        playerSearchBtn: document.getElementById('search-player-btn'),
        playerDataDisplay: document.getElementById('player-data-display'),

        // 【新增】玩家日誌
        logPlayerSearchInput: document.getElementById('log-player-uid-search'),
        logPlayerSearchBtn: document.getElementById('search-log-player-btn'),
        logCategoryFilter: document.getElementById('log-category-filter'),
        logKeywordFilter: document.getElementById('log-keyword-filter'),
        logTableBody: document.getElementById('player-log-tbody'),

        // 廣播系統
        broadcastSenderInput: document.getElementById('broadcast-sender'),
        broadcastTitleInput: document.getElementById('broadcast-title'),
        broadcastContentInput: document.getElementById('broadcast-content'),
        broadcastPayloadInput: document.getElementById('broadcast-payload'),
        sendBroadcastBtn: document.getElementById('send-broadcast-btn'),
        broadcastLogTableBody: document.querySelector('#broadcast-log-table tbody'),

        // 設定檔編輯器
        configFileSelector: document.getElementById('config-file-selector'),
        configDisplayArea: document.getElementById('game-configs-display'),
        saveConfigBtn: document.getElementById('save-config-btn'),
        
        // 彈窗
        feedbackModal: document.getElementById('feedback-modal'),
        feedbackTitle: document.getElementById('feedback-title'),
        feedbackMessage: document.getElementById('feedback-message'),
        feedbackCloseBtn: document.getElementById('feedback-close-btn')
    };

    // --- 授權檢查 ---
    if (!adminToken) {
        alert('您尚未登入或 Token 已過期，將跳轉回登入頁面。');
        window.location.href = 'index.html';
        return;
    }

    // --- 通用 API 請求函式 ---
    async function fetchAdminAPI(endpoint, options = {}) {
        // ... (與上一版相同) ...
    }

    // --- 彈窗函式 ---
    function showFeedback(title, message) {
        // ... (與上一版相同) ...
    }

    // --- 導覽邏輯 ---
    function switchSection(targetId) {
        DOMElements.mainContentSections.forEach(section => section.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        if (targetId === 'dashboard-section') loadGameOverview();
        if (targetId === 'broadcast-system-section') loadBroadcastLog();
        if (targetId === 'config-editor-section') loadAndPopulateConfigsDropdown();
    }

    DOMElements.sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            DOMElements.sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            switchSection(link.dataset.target);
        });
    });
    
    // --- 儀表板邏輯 ---
    async function loadGameOverview() { /* ... */ }

    // --- 玩家管理渲染邏輯 ---
    function renderPlayerStatsCard(stats) { /* ... */ }
    function renderMonstersTable(monsters) { /* ... */ }
    function renderDnaInventory(dnaList) { /* ... */ }

    async function searchPlayer() {
        const uid = DOMElements.playerSearchInput.value.trim();
        if (!uid) {
            showFeedback('提示', '請輸入玩家 UID。');
            return;
        }
        DOMElements.playerDataDisplay.innerHTML = `<p class="placeholder-text">查詢中...</p>`;
        try {
            const data = await fetchAdminAPI(`/player_data?uid=${uid}`);
            
            let displayHtml = '<div class="player-main-info-grid">';
            displayHtml += renderPlayerStatsCard(data.playerStats);
            displayHtml += '</div>';
            displayHtml += renderMonstersTable(data.farmedMonsters);
            displayHtml += renderDnaInventory(data.playerOwnedDNA);

            DOMElements.playerDataDisplay.innerHTML = displayHtml;
        } catch (error) {
            DOMElements.playerDataDisplay.innerHTML = `<p class="placeholder-text" style="color:var(--accent-danger);">查詢失敗: ${error.message}</p>`;
        }
    }

    // --- 【新增】玩家日誌邏輯 ---
    function renderLogs() {
        const category = DOMElements.logCategoryFilter.value;
        const keyword = DOMElements.logKeywordFilter.value.toLowerCase();
        
        const filteredLogs = currentLogs.filter(log => {
            const categoryMatch = (category === 'all' || log.category === category);
            const keywordMatch = (!keyword || log.message.toLowerCase().includes(keyword));
            return categoryMatch && keywordMatch;
        });

        const tableBody = DOMElements.logTableBody;
        tableBody.innerHTML = '';

        if (filteredLogs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-secondary);">找不到符合條件的日誌。</td></tr>`;
            return;
        }

        const categoryColors = {
            '系統': 'system', '金幣': 'gold', '戰鬥': 'battle',
            '合成': 'synthesis', '物品': 'item'
        };

        filteredLogs.forEach(log => {
            const row = tableBody.insertRow();
            const timestamp = new Date(log.timestamp * 1000).toLocaleString('zh-TW', { hour12: false });
            const categoryClass = `log-category log-category-${categoryColors[log.category] || 'system'}`;
            
            row.innerHTML = `
                <td>${timestamp}</td>
                <td><span class="${categoryClass}">${log.category}</span></td>
                <td>${log.message}</td>
            `;
        });
    }

    async function loadPlayerLogs() {
        const uid = DOMElements.logPlayerSearchInput.value.trim();
        if (!uid) {
            showFeedback('提示', '請輸入玩家 UID。');
            return;
        }
        
        DOMElements.logTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">載入中...</td></tr>`;
        DOMElements.logCategoryFilter.disabled = true;
        DOMElements.logKeywordFilter.disabled = true;
        currentLogs = [];

        try {
            const data = await fetchAdminAPI(`/player_data?uid=${uid}`);
            currentLogs = (data.playerLogs || []).sort((a, b) => b.timestamp - a.timestamp); // 預設按時間倒序
            DOMElements.logCategoryFilter.disabled = false;
            DOMElements.logKeywordFilter.disabled = false;
            renderLogs(); // 首次渲染
        } catch (error) {
            DOMElements.logTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--accent-danger);">查詢失敗: ${error.message}</td></tr>`;
        }
    }

    // --- 廣播系統邏輯 (與之前相同) ---
    async function loadBroadcastLog() { /* ... */ }
    async function sendBroadcast() { /* ... */ }
    
    // --- 設定檔編輯器邏輯 (與之前相同) ---
    async function loadAndPopulateConfigsDropdown() { /* ... */ }
    async function loadSelectedConfig() { /* ... */ }
    async function saveConfig() { /* ... */ }

    // --- 事件綁定 ---
    DOMElements.logoutBtn.addEventListener('click', () => { /* ... */ });
    
    DOMElements.playerSearchBtn.addEventListener('click', searchPlayer);
    DOMElements.playerSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPlayer(); });
    
    // 【新增】日誌查詢和篩選的事件綁定
    DOMElements.logPlayerSearchBtn.addEventListener('click', loadPlayerLogs);
    DOMElements.logPlayerSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadPlayerLogs(); });
    DOMElements.logCategoryFilter.addEventListener('change', renderLogs);
    DOMElements.logKeywordFilter.addEventListener('input', renderLogs);
    
    DOMElements.sendBroadcastBtn.addEventListener('click', sendBroadcast);
    DOMElements.broadcastLogTableBody.addEventListener('click', (e) => { /* ... */ });
    DOMElements.configFileSelector.addEventListener('change', loadSelectedConfig);
    DOMElements.saveConfigBtn.addEventListener('click', saveConfig);
    DOMElements.feedbackCloseBtn.addEventListener('click', () => DOMElements.feedbackModal.style.display = 'none');


    // --- 初始載入 ---
    loadGameOverview();
});
