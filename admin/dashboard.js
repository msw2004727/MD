// 【重構】將所有邏輯包裹在 DOMContentLoaded 事件中，確保頁面元素都已存在
document.addEventListener('DOMContentLoaded', function() {
    
    // 將所有初始化和事件綁定邏輯封裝在一個主函式中
    function initializeApp() {
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
            generateReportBtn: document.getElementById('generate-report-btn'),
            overviewReportContainer: document.getElementById('overview-report-container'),
            searchInput: document.getElementById('player-search-input'),
            searchBtn: document.getElementById('player-search-btn'),
            searchResultsContainer: document.getElementById('player-search-results'),
            dataDisplay: document.getElementById('player-data-display'),
            playerLogSection: document.getElementById('player-log-section'),
            playerLogFilters: document.getElementById('player-log-filters'),
            playerLogDisplay: document.getElementById('player-log-display'),
            broadcastSenderNameInput: document.getElementById('broadcast-sender-name'),
            broadcastSenderPresetsSelect: document.getElementById('broadcast-sender-presets'),
            saveSenderNameBtn: document.getElementById('save-sender-name-btn'),
            broadcastBtn: document.getElementById('broadcast-mail-btn'),
            broadcastResponseEl: document.getElementById('broadcast-response'),
            refreshLogBtn: document.getElementById('refresh-log-btn'),
            broadcastLogContainer: document.getElementById('broadcast-log-container'),
            configFileSelector: document.getElementById('config-file-selector'),
            configDisplayArea: document.getElementById('game-configs-display'),
            saveConfigBtn: document.getElementById('save-config-btn'),
            configResponseEl: document.getElementById('config-response'),
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
                const data = await response.json();
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        localStorage.removeItem('admin_token');
                        alert('登入憑證已失效，請重新登入。');
                        window.location.href = 'index.html';
                    }
                    throw new Error(data.error || `伺服器錯誤: ${response.status}`);
                }
                return data;
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
            
            if (targetId === 'dashboard-home') {
                if (DOMElements.overviewReportContainer.innerHTML.includes('點擊按鈕')) {
                    handleGenerateReport();
                }
            } else if (targetId === 'mail-system') {
                loadBroadcastLog();
            } else if (targetId === 'game-configs') {
                if (typeof initializeConfigEditor === 'function') {
                    initializeConfigEditor();
                } else {
                    console.error("config-editor.js 或 initializeConfigEditor 函式未載入。");
                    alert("設定檔編輯器模組載入失敗，請檢查控制台。");
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
        function renderPlayerData(playerData) {
            // ... 省略與上一版相同的完整函式內容 ...
        }
        
        // --- 玩家管理主邏輯 ---
        async function fetchAndDisplayPlayerData(uid) {
            // ... 省略與上一版相同的完整函式內容 ...
        }
        async function searchPlayer() {
            // ... 省略與上一版相同的完整函式內容 ...
        }
        async function handleSavePlayerData() {
            // ... 省略與上一版相同的完整函式內容 ...
        }
        async function handleSendPlayerMail() {
            // ... 省略與上一版相同的完整函式內容 ...
        }

        // --- 廣播系統邏輯 ---
        async function loadBroadcastLog() { /* ...與上一版相同... */ }
        async function handleRecallMail(event) { /* ...與上一版相同... */ }
        async function handleBroadcastMail() { /* ...與上一版相同 ... */ }
        function saveSenderPreset() { /* ...與上一版相同... */ }
        function loadSenderPresets() { /* ...與上一版相同... */ }

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
        
        // --- 初始執行 ---
        updateTime();
        setInterval(updateTime, 1000);
        switchTab('dashboard-home');
        loadSenderPresets();
    }

    // 執行主初始化函式
    initializeApp();
});
