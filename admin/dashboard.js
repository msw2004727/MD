document.addEventListener('DOMContentLoaded', function() {
    // --- 變數定義區 ---
    const adminToken = localStorage.getItem('admin_token');
    const SENDER_PRESETS_KEY = 'admin_sender_presets'; 
    let currentPlayerData = null;
    let logIntervalId = null;
    let currentPlayerLogs = [];

    if (!adminToken) {
        window.location.href = 'index.html';
        return;
    }
    const ADMIN_API_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api/MD'; 
    
    // --- DOM 元素獲取區 ---
    const DOMElements = {
        navItems: document.querySelectorAll('.nav-item'),
        contentPanels: document.querySelectorAll('.content-panel'),
        logoutBtn: document.getElementById('logout-btn'),
        currentTimeEl: document.getElementById('current-time'),
        
        // 總覽
        generateReportBtn: document.getElementById('generate-report-btn'),
        overviewReportContainer: document.getElementById('overview-report-container'),
        
        // 玩家管理
        searchInput: document.getElementById('player-search-input'),
        searchBtn: document.getElementById('player-search-btn'),
        searchResultsContainer: document.getElementById('player-search-results'),
        dataDisplay: document.getElementById('player-data-display'),
        playerLogSection: document.getElementById('player-log-section'),
        playerLogFilters: document.getElementById('player-log-filters'),
        playerLogDisplay: document.getElementById('player-log-display'),
        
        // 廣播
        broadcastSenderNameInput: document.getElementById('broadcast-sender-name'),
        broadcastSenderPresetsSelect: document.getElementById('broadcast-sender-presets'),
        saveSenderNameBtn: document.getElementById('save-sender-name-btn'),
        broadcastBtn: document.getElementById('broadcast-mail-btn'),
        broadcastResponseEl: document.getElementById('broadcast-response'),
        refreshLogBtn: document.getElementById('refresh-log-btn'),
        broadcastLogContainer: document.getElementById('broadcast-log-container'),
        
        // 設定檔
        configFileSelector: document.getElementById('config-file-selector'),
        configDisplayArea: document.getElementById('game-configs-display'),
        saveConfigBtn: document.getElementById('save-config-btn'),
        configResponseEl: document.getElementById('config-response'),

        // 日誌監控
        logDisplayContainer: document.getElementById('log-display-container'),
        refreshLogsBtn: document.getElementById('refresh-logs-btn'),
    };

    // --- 通用函式 ---
    async function fetchAdminAPI(endpoint, options = {}) {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        };
        options.headers = { ...defaultHeaders, ...options.headers };

        try {
            const response = await fetch(`${ADMIN_API_URL}/admin${endpoint}`, options);
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: response.statusText }));
                 if (response.status === 401 || response.status === 403) {
                     localStorage.removeItem('admin_token');
                     alert('登入憑證已失效，請重新登入。');
                     window.location.href = 'index.html';
                 }
                throw new Error(errorData.error || `伺服器錯誤: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            alert(`API 請求失敗: ${error.message}`);
            throw error;
        }
    }
    
    function updateTime() { if(DOMElements.currentTimeEl) { DOMElements.currentTimeEl.textContent = new Date().toLocaleString('zh-TW'); } }

    // --- 導覽邏輯 ---
    function switchTab(targetId) {
        if (logIntervalId) { clearInterval(logIntervalId); logIntervalId = null; }
        
        DOMElements.navItems.forEach(item => item.classList.toggle('active', item.dataset.target === targetId));
        DOMElements.contentPanels.forEach(panel => panel.classList.toggle('active', panel.id === targetId));
        
        // 【核心修正】補上所有頁籤的初始載入邏輯
        if (targetId === 'dashboard-home') {
            handleGenerateReport();
        } else if (targetId === 'mail-system') {
            loadBroadcastLog();
        } else if (targetId === 'game-configs') {
            // 【優化】增加函式存在性檢查
            if (typeof initializeConfigEditor === 'function') {
                initializeConfigEditor();
            } else {
                console.error("config-editor.js 或 initializeConfigEditor 函式未載入。");
            }
        } else if (targetId === 'log-monitoring') {
            loadAndDisplayLogs();
            logIntervalId = setInterval(loadAndDisplayLogs, 10000);
        }
    }

    // --- 日誌監控邏輯 ---
    async function loadAndDisplayLogs() {
        if (!DOMElements.logDisplayContainer) return;
        DOMElements.logDisplayContainer.innerHTML = '<p style="color: var(--admin-text-secondary);">正在載入最新日誌...</p>';
        try {
            const response = await fetch(`${ADMIN_API_URL}/logs`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
            if (!response.ok) throw new Error(`伺服器錯誤: ${response.status} ${response.statusText}`);
            
            const htmlContent = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, "text/html");
            const logEntries = doc.body.innerHTML;
            
            DOMElements.logDisplayContainer.innerHTML = logEntries || '<p>日誌目前為空。</p>';
            DOMElements.logDisplayContainer.scrollTop = DOMElements.logDisplayContainer.scrollHeight;
        } catch (err) {
            DOMElements.logDisplayContainer.innerHTML = `<p style="color: var(--danger-color);">載入日誌失敗：${err.message}</p>`;
        }
    }
    
    // --- 玩家日誌渲染與篩選 ---
    function renderPlayerLogs(logs, category = '全部') {
        if (!DOMElements.playerLogDisplay) return;

        if (!logs || logs.length === 0) {
            DOMElements.playerLogDisplay.innerHTML = '<p class="placeholder-text">該玩家暫無日誌紀錄。</p>';
            return;
        }

        const filteredLogs = category === '全部'
            ? logs
            : logs.filter(log => log.category === category);

        if (filteredLogs.length === 0) {
            DOMElements.playerLogDisplay.innerHTML = `<p class="placeholder-text">在「${category}」分類下暫無紀錄。</p>`;
            return;
        }
        
        const categoryColors = { '系統': '#9CA3AF', '金幣': '#FBBF24', '戰鬥': '#F87171', '合成': '#60A5FA', '物品': '#34D399' };
        DOMElements.playerLogDisplay.innerHTML = filteredLogs.map(log => {
            const date = new Date(log.timestamp * 1000).toLocaleString('zh-TW', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const color = categoryColors[log.category] || '#9CA3AF';
            const cleanMessage = log.message.replace(/<[^>]*>/g, '');
            return `
                <div class="log-entry">
                    <div class="log-meta">
                        <span class="log-timestamp">${date}</span>
                        <span class="log-category" style="background-color:${color};">${log.category}</span>
                    </div>
                    <div class="log-message">${cleanMessage}</div>
                </div>
            `;
        }).join('');
    }

    // --- 玩家資料渲染 ---
    function renderPlayerData(playerData) { /* ...與上一版相同... */ }
    
    // --- 玩家管理主邏輯 ---
    async function fetchAndDisplayPlayerData(uid) { /* ...與上一版相同... */ }
    async function searchPlayer() { /* ...與上一版相同... */ }
    async function handleSavePlayerData() { /* ...與上一版相同... */ }
    async function handleSendPlayerMail() { /* ...與上一版相同... */ }

    // --- 廣播系統邏輯 ---
    async function loadBroadcastLog() { /* ...與上一版相同... */ }
    async function handleRecallMail(event) { /* ...與上一版相同... */ }
    async function handleBroadcastMail() { /* ...與上一版相同 ... */ }
    
    // 【核心修正】修復潛在的 JSON 解析錯誤
    function loadSenderPresets() {
        let presets = ['遊戲管理員', '系統通知']; // 預設值
        try {
            const storedPresets = localStorage.getItem(SENDER_PRESETS_KEY);
            // 只有當 storedPresets 存在且不為空時才嘗試解析
            if (storedPresets) {
                const parsed = JSON.parse(storedPresets);
                if (Array.isArray(parsed)) {
                    presets = parsed;
                }
            }
        } catch (error) {
            console.error("讀取寄件人預設集失敗，將使用預設值:", error);
            localStorage.removeItem(SENDER_PRESETS_KEY); // 清除損壞的資料
        }
        
        DOMElements.broadcastSenderPresetsSelect.innerHTML = '<option value="">選擇預設名稱...</option>';
        presets.forEach(name => {
            const option = new Option(name, name);
            DOMElements.broadcastSenderPresetsSelect.add(option);
        });
    }

    function saveSenderPreset() { /* ...與上一版相同... */ }

    // --- 儀表板總覽邏輯 ---
    async function handleGenerateReport() { /* ...與上一版相同... */ }
    
    // --- 事件綁定 ---
    DOMElements.navItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); switchTab(e.target.dataset.target); }));
    DOMElements.logoutBtn.addEventListener('click', () => { localStorage.removeItem('admin_token'); window.location.href = 'index.html'; });
    DOMElements.searchBtn.addEventListener('click', searchPlayer);
    DOMElements.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPlayer(); });
    DOMElements.searchResultsContainer.addEventListener('click', (e) => { const item = e.target.closest('.search-result-item'); if (item && item.dataset.uid) { fetchAndDisplayPlayerData(item.dataset.uid); } });
    DOMElements.dataDisplay.addEventListener('click', (e) => { 
        if (e.target.id === 'save-player-data-btn') { handleSavePlayerData(); } 
        if (e.target.id === 'send-player-mail-btn') { handleSendPlayerMail(); } 
    });
    if (DOMElements.playerLogFilters) {
        DOMElements.playerLogFilters.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const category = e.target.dataset.logCategory;
                DOMElements.playerLogFilters.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                if (currentPlayerData) {
                    renderPlayerLogs(category);
                }
            }
        });
    }
    
    DOMElements.broadcastBtn.addEventListener('click', handleBroadcastMail);
    DOMElements.saveSenderNameBtn.addEventListener('click', saveSenderPreset);
    DOMElements.broadcastSenderPresetsSelect.addEventListener('change', () => { if (DOMElements.broadcastSenderPresetsSelect.value) { DOMElements.broadcastSenderNameInput.value = DOMElements.broadcastSenderPresetsSelect.value; } });
    DOMElements.refreshLogBtn.addEventListener('click', loadBroadcastLog);
    DOMElements.broadcastLogContainer.addEventListener('click', handleRecallMail);
    DOMElements.generateReportBtn.addEventListener('click', handleGenerateReport);
    if (DOMElements.refreshLogsBtn) { DOMElements.refreshLogsBtn.addEventListener('click', loadAndDisplayLogs); }
    
    // config-editor.js 的初始化將在 switchTab 內部根據需要調用，以確保其存在
    
    // --- 初始執行 ---
    updateTime();
    setInterval(updateTime, 1000);
    switchTab('dashboard-home');
    loadSenderPresets();
});
