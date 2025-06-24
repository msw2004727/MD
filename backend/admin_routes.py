<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>後台儀表板 - 怪獸異世界</title>
    <link href="css/theme.css?v=0.4.1.1" rel="stylesheet">
    <link href="css/buttons.css?v=0.4.1.1" rel="stylesheet">
    <style>
        :root {
            --admin-bg: #1c1c1e;
            --admin-panel-bg: #2c2c2e;
            --admin-border-color: #444;
            --admin-text-primary: #f5f5f7;
            --admin-text-secondary: #a1a1a6;
            --admin-accent: #0a84ff;
            --admin-accent-hover: #3b9bff;
        }
        body {
            background-color: var(--admin-bg);
            color: var(--admin-text-primary);
            font-family: 'Noto Sans TC', sans-serif;
            margin: 0;
            display: flex;
            height: 100vh;
            overflow: hidden;
        }
        .sidebar {
            width: 240px;
            background-color: var(--admin-panel-bg);
            border-right: 1px solid var(--admin-border-color);
            display: flex;
            flex-direction: column;
            padding: 1rem 0;
            flex-shrink: 0;
            overflow-y: auto;
        }
        .sidebar-header {
            padding: 0 1.5rem 1rem;
            border-bottom: 1px solid var(--admin-border-color);
            text-align: center;
        }
        .sidebar-title {
            font-size: 1.25rem;
            font-weight: bold;
            color: var(--admin-accent);
            margin: 0;
        }
        .sidebar-nav {
            flex-grow: 1;
            list-style: none;
            padding: 0;
            margin: 1rem 0;
        }
        .sidebar-nav a {
            display: block;
            color: var(--admin-text-primary);
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
            transition: background-color 0.2s, color 0.2s;
            border-left: 3px solid transparent;
        }
        .sidebar-nav a:hover {
            background-color: color-mix(in srgb, var(--admin-accent) 15%, transparent);
        }
        .sidebar-nav a.active {
            background-color: color-mix(in srgb, var(--admin-accent) 25%, transparent);
            color: #fff;
            font-weight: 500;
            border-left-color: var(--admin-accent);
        }
        .sidebar-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--admin-border-color);
        }
        .main-content {
            flex-grow: 1;
            padding: 2rem;
            overflow-y: auto;
        }
        .content-header {
            margin-bottom: 1.5rem;
            border-bottom: 1px solid var(--admin-border-color);
            padding-bottom: 0.75rem;
        }
        #logout-btn {
            width: 100%;
        }
        .content-panel { display: none; }
        .content-panel.active { display: block; }
        .search-container { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        .admin-input {
            flex-grow: 1;
            padding: 8px 12px;
            font-size: 1rem;
            border-radius: 6px;
            border: 1px solid var(--admin-border-color);
            background-color: var(--admin-panel-bg);
            color: var(--admin-text-primary);
        }
        #player-data-display {
            background-color: transparent;
            color: var(--admin-text-secondary);
            padding: 0;
            border-radius: 0;
            white-space: normal;
            word-break: normal;
            border: none;
        }
        .data-section {
            background-color: var(--admin-panel-bg);
            border: 1px solid var(--admin-border-color);
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .data-section h3 {
            margin-top: 0;
            color: var(--admin-accent);
            border-bottom: 1px solid var(--admin-border-color);
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        .form-group label {
            font-size: 0.9rem;
            color: var(--admin-text-secondary);
        }
        .form-group input, .form-group textarea, .form-group select {
            padding: 8px 10px;
            font-size: 1rem;
            border-radius: 4px;
            border: 1px solid var(--admin-border-color);
            background-color: var(--admin-bg);
            color: var(--admin-text-primary);
            resize: vertical;
        }
        .dna-grid, .monster-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
        }
        .dna-card, .monster-card-admin {
            border: 1px solid var(--admin-border-color);
            padding: 1rem;
            border-radius: 6px;
        }
        .dna-card h4, .monster-card-admin h4 {
            margin: 0 0 0.5rem 0;
            font-size: 1rem;
            color: var(--admin-accent-hover);
        }
        .monster-card-admin ul {
            padding-left: 1.2rem;
            margin: 0;
        }
        .save-changes-container {
            margin-top: 1.5rem;
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }
        .admin-response-message {
            margin-top: 1rem;
            padding: 0.75rem;
            border-radius: 6px;
            text-align: center;
        }
        .admin-response-message.success {
            background-color: color-mix(in srgb, var(--success-color) 20%, transparent);
            color: var(--success-color);
        }
        .admin-response-message.error {
            background-color: color-mix(in srgb, var(--danger-color) 20%, transparent);
            color: var(--danger-color);
        }
        .broadcast-log-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        .broadcast-log-table th, .broadcast-log-table td {
            padding: 0.75rem;
            border-bottom: 1px solid var(--admin-border-color);
            text-align: left;
        }
        .broadcast-log-table th {
            font-weight: 600;
        }
        .broadcast-log-table td.actions-cell {
            text-align: right;
        }
        #player-search-results {
            margin-bottom: 1.5rem;
            max-height: 200px;
            overflow-y: auto;
        }
        .search-result-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .search-result-item:hover {
            background-color: var(--admin-panel-bg);
        }
        .search-result-item .uid {
            font-family: monospace;
            font-size: 0.8rem;
            color: var(--admin-text-secondary);
        }
        .overview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        .overview-card {
            background: var(--admin-panel-bg);
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid var(--admin-accent);
        }
        .overview-card .stat-title {
            font-size: 1rem;
            color: var(--admin-text-secondary);
            margin: 0 0 0.5rem 0;
        }
        .overview-card .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--admin-text-primary);
        }
        #game-configs-display {
            background-color: var(--admin-bg);
            border: 1px solid var(--admin-border-color);
            border-radius: 6px;
            padding: 1rem;
            margin-top: 1.5rem;
            max-height: 60vh;
            overflow: auto;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 0.9rem;
            color: var(--admin-text-secondary);
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">
            <h1 class="sidebar-title">上帝模式</h1>
        </div>
        <ul class="sidebar-nav">
            <li><a href="#" class="nav-item active" data-target="dashboard-home">總覽</a></li>
            <li><a href="#" class="nav-item" data-target="player-management">玩家管理</a></li>
            <li><a href="#" class="nav-item" data-target="mail-system">群發信件</a></li>
            <li><a href="#" class="nav-item" data-target="game-configs">遊戲設定</a></li>
        </ul>
        <div class="sidebar-footer">
            <button id="logout-btn" class="button danger">登出後台</button>
        </div>
    </div>
    <main class="main-content">
        <div id="dashboard-home" class="content-panel active">
            <h2 class="content-header">遊戲總覽</h2>
            <div class="data-section">
                <button id="generate-report-btn" class="button primary">生成全服數據報表</button>
                <div id="overview-report-container" style="margin-top: 1.5rem;">
                    <p>點擊按鈕以生成最新的伺服器數據統計。</p>
                </div>
            </div>
            <div class="data-section">
                <h3>系統狀態</h3>
                <p>目前系統時間: <span id="current-time"></span></p>
                <p>後端伺服器運行正常。</p>
            </div>
        </div>
        
        <div id="player-management" class="content-panel">
            <h2 class="content-header">玩家管理</h2>
            <div class="search-container">
                <input type="text" id="player-search-input" class="admin-input" placeholder="輸入玩家 UID 或暱稱進行查詢...">
                <button id="player-search-btn" class="button primary">查詢</button>
            </div>
            <div id="player-search-results"></div>
            <div id="player-data-display">
                <p style="color: var(--admin-text-secondary);">請輸入玩家 UID 或暱稱以檢視資料。</p>
            </div>
        </div>
        
        <div id="mail-system" class="content-panel">
            <h2 class="content-header">群發信件</h2>
            <div class="data-section">
                <h3>撰寫新信件</h3>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="broadcast-title">信件標題</label>
                    <input type="text" id="broadcast-title" class="admin-input" placeholder="輸入要發送的信件標題">
                </div>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="broadcast-content">信件內容</label>
                    <textarea id="broadcast-content" class="admin-input" rows="5" placeholder="輸入信件的詳細內容..."></textarea>
                </div>
                <div class="form-group">
                    <label for="broadcast-payload">附件 (Payload - JSON格式，可選)</label>
                    <textarea id="broadcast-payload" class="admin-input" rows="5" placeholder='例如：{"gold": 100}'></textarea>
                </div>
                <div class="save-changes-container">
                    <button id="broadcast-mail-btn" class="button success">向所有玩家發送</button>
                </div>
                <div id="broadcast-response" class="admin-response-message" style="display: none;"></div>
            </div>
            <div class="data-section">
                <h3>已發送系統信件歷史 <button id="refresh-log-btn" class="button secondary" style="font-size: 0.8rem; padding: 4px 8px; margin-left: 1rem;">刷新</button></h3>
                <div id="broadcast-log-container">
                    <p>正在載入紀錄...</p>
                </div>
            </div>
        </div>
        
        <div id="game-configs" class="content-panel">
            <h2 class="content-header">遊戲設定</h2>
            <div class="data-section">
                <h3>即時設定編輯器</h3>
                <div class="form-group">
                    <label for="config-file-selector">選擇要編輯的設定檔</label>
                    <select id="config-file-selector" class="admin-input"></select>
                </div>
                <pre id="game-configs-display"><p>請從上方選擇一個設定檔以檢視內容。</p></pre>
            </div>
        </div>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // --- 變數定義區 ---
            const adminToken = localStorage.getItem('admin_token');
            if (!adminToken) {
                window.location.href = 'admin.html';
                return;
            }
            const API_BASE_URL = '/api/MD'; 
            let currentPlayerData = null;

            // --- DOM 元素獲取區 ---
            const navItems = document.querySelectorAll('.nav-item');
            const contentPanels = document.querySelectorAll('.content-panel');
            const logoutBtn = document.getElementById('logout-btn');
            const currentTimeEl = document.getElementById('current-time');
            
            const searchInput = document.getElementById('player-search-input');
            const searchBtn = document.getElementById('player-search-btn');
            const dataDisplay = document.getElementById('player-data-display');
            const searchResultsContainer = document.getElementById('player-search-results');
            
            const broadcastBtn = document.getElementById('broadcast-mail-btn');
            const refreshLogBtn = document.getElementById('refresh-log-btn');
            const broadcastLogContainer = document.getElementById('broadcast-log-container');
            
            const generateReportBtn = document.getElementById('generate-report-btn');
            const overviewReportContainer = document.getElementById('overview-report-container');

            const configFileSelector = document.getElementById('config-file-selector');
            const configsDisplay = document.getElementById('game-configs-display');


            // --- 函式定義區 ---
            
            function switchTab(targetId) {
                navItems.forEach(item => {
                    item.classList.toggle('active', item.dataset.target === targetId);
                });
                contentPanels.forEach(panel => {
                    panel.classList.toggle('active', panel.id === targetId);
                });

                // 當切換到遊戲設定頁籤時，載入列表
                if (targetId === 'game-configs') {
                    loadAndPopulateConfigsDropdown();
                }
            }

            function updateTime() { if(currentTimeEl) { currentTimeEl.textContent = new Date().toLocaleString('zh-TW'); } }

            function renderPlayerData(playerData) { /* ... 內容不變 ... */ }
            async function handleSavePlayerData() { /* ... 內容不變 ... */ }
            async function handleSendPlayerMail() { /* ... 內容不變 ... */ }
            async function fetchAndDisplayPlayerData(uid) { /* ... 內容不變 ... */ }
            async function searchPlayer() { /* ... 內容不變 ... */ }
            async function loadBroadcastLog() { /* ... 內容不變 ... */ }
            async function handleRecallMail(event) { /* ... 內容不變 ... */ }
            async function handleBroadcastMail() { /* ... 內容不變 ... */ }
            async function handleGenerateReport() { /* ... 內容不變 ... */ }

            async function loadAndPopulateConfigsDropdown() {
                if (configFileSelector.options.length > 1) return; // 如果已經載入過，就不重複載入
                
                configFileSelector.innerHTML = '<option value="">請選擇一個檔案...</option>';
                try {
                    const response = await fetch(`${API_BASE_URL}/admin/list_configs`, {
                        headers: { 'Authorization': `Bearer ${adminToken}` }
                    });
                    const files = await response.json();
                    if (!response.ok) throw new Error(files.error || '無法獲取列表');

                    files.forEach(file => {
                        const option = new Option(file, file);
                        configFileSelector.add(option);
                    });
                } catch (err) {
                    console.error('載入設定檔列表失敗:', err);
                    const option = new Option(`載入失敗: ${err.message}`, '');
                    option.disabled = true;
                    configFileSelector.add(option);
                }
            }

            async function loadSelectedConfig() {
                const selectedFile = configFileSelector.value;
                if (!selectedFile) {
                    configsDisplay.textContent = '請從上方選擇一個設定檔以檢視內容。';
                    return;
                }
                
                configsDisplay.textContent = '正在從伺服器獲取資料...';
                try {
                     const response = await fetch(`${API_BASE_URL}/admin/get_config?file=${encodeURIComponent(selectedFile)}`, {
                        headers: { 'Authorization': `Bearer ${adminToken}` }
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || `伺服器錯誤: ${response.status}`);
                    
                    configsDisplay.textContent = JSON.stringify(result, null, 2);
                } catch (err) {
                    configsDisplay.textContent = `載入失敗：${err.message}`;
                }
            }


            // --- 事件綁定區 ---
            navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    switchTab(e.target.dataset.target);
                });
            });

            logoutBtn.addEventListener('click', () => { localStorage.removeItem('admin_token'); window.location.href = 'admin.html'; });
            searchBtn.addEventListener('click', searchPlayer);
            searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPlayer(); });
            searchResultsContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.search-result-item');
                if (item && item.dataset.uid) { fetchAndDisplayPlayerData(item.dataset.uid); }
            });
            dataDisplay.addEventListener('click', (e) => {
                if (e.target.id === 'save-player-data-btn') { handleSavePlayerData(); }
                if (e.target.id === 'send-player-mail-btn') { handleSendPlayerMail(); }
            });

            broadcastBtn.addEventListener('click', handleBroadcastMail);
            refreshLogBtn.addEventListener('click', loadBroadcastLog);
            broadcastLogContainer.addEventListener('click', handleRecallMail);
            generateReportBtn.addEventListener('click', handleGenerateReport);

            configFileSelector.addEventListener('change', loadSelectedConfig);

            // --- 初始執行區 ---
            updateTime();
            setInterval(updateTime, 1000);
            switchTab('dashboard-home');
        });
    </script>
</body>
</html>
