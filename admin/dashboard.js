document.addEventListener('DOMContentLoaded', function() {
    // --- 變數定義區 ---
    const adminToken = localStorage.getItem('admin_token');
    const SENDER_PRESETS_KEY = 'admin_sender_presets'; 
    let currentPlayerData = null;
    let logIntervalId = null;
    let currentPlayerLogs = []; // 用於客戶端日誌篩選

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
    
    function updateTime() { 
        if(DOMElements.currentTimeEl) { 
            DOMElements.currentTimeEl.textContent = new Date().toLocaleString('zh-TW'); 
        } 
    }

    // --- 導覽邏輯 ---
    function switchTab(targetId) {
        if (logIntervalId) { clearInterval(logIntervalId); logIntervalId = null; }
        
        DOMElements.navItems.forEach(item => item.classList.toggle('active', item.dataset.target === targetId));
        DOMElements.contentPanels.forEach(panel => panel.classList.toggle('active', panel.id === targetId));
        
        // 【核心修正】在這裡補上對 'log-monitoring' 的處理
        if (targetId === 'game-configs' && typeof initializeConfigEditor === 'function') {
            initializeConfigEditor();
        } else if (targetId === 'mail-system') {
            loadBroadcastLog();
        } else if (targetId === 'log-monitoring') {
            loadAndDisplayLogs();
            logIntervalId = setInterval(loadAndDisplayLogs, 10000); // 10秒自動刷新
        } else if (targetId === 'dashboard-home' && DOMElements.overviewReportContainer.innerHTML.includes('點擊按鈕')) {
            handleGenerateReport();
        }
    }

    // --- 日誌監控邏輯 ---
    async function loadAndDisplayLogs() {
        if (!DOMElements.logDisplayContainer) return;
        DOMElements.logDisplayContainer.innerHTML = '<p style="color: var(--admin-text-secondary);">正在載入最新日誌...</p>';
        try {
            // 注意：後端日誌路由與其他 admin 路由不同
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
    function renderPlayerLogs(category = '全部') {
        if (!DOMElements.playerLogDisplay) return;

        const filteredLogs = category === '全部'
            ? currentPlayerLogs
            : currentPlayerLogs.filter(log => log.category === category);

        if (filteredLogs.length === 0) {
            DOMElements.playerLogDisplay.innerHTML = `<p class="placeholder-text">在「${category}」分類下暫無紀錄。</p>`;
            return;
        }
        
        const categoryColors = {
            '系統': '#9CA3AF', '金幣': '#FBBF24', '戰鬥': '#F87171',
            '合成': '#60A5FA', '物品': '#34D399'
        };

        DOMElements.playerLogDisplay.innerHTML = filteredLogs.map(log => {
            const date = new Date(log.timestamp * 1000).toLocaleString('zh-TW', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const color = categoryColors[log.category] || '#9CA3AF';
            // 移除訊息中的 HTML 標籤
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
        currentPlayerData = playerData;
        const stats = playerData.playerStats;
        const equippedTitle = stats.titles.find(t => t.id === stats.equipped_title_id) || { name: '無' };

        const statsHtml = `
            <div class="form-grid">
                <div class="form-group"><label>暱稱</label><input type="text" class="admin-input" id="admin-nickname" value="${playerData.nickname}"></div>
                <div class="form-group"><label>UID</label><input type="text" class="admin-input" value="${playerData.uid}" readonly></div>
                <div class="form-group"><label>金幣</label><input type="number" class="admin-input" id="admin-gold" value="${stats.gold || 0}"></div>
                <div class="form-group"><label>總積分</label><input type="number" class="admin-input" id="admin-score" value="${stats.score || 0}"></div>
                <div class="form-group"><label>勝場</label><input type="number" class="admin-input" id="admin-wins" value="${stats.wins || 0}"></div>
                <div class="form-group"><label>敗場</label><input type="number" class="admin-input" id="admin-losses" value="${stats.losses || 0}"></div>
            </div>
            <div class="form-group"><label>當前稱號</label><input type="text" class="admin-input" value="${equippedTitle.name}" readonly></div>`;

        const monstersHtml = (playerData.farmedMonsters.length > 0)
            ? `<div class="monster-grid">${playerData.farmedMonsters.map(m => `<div class="monster-card-admin"><h4>${m.nickname}</h4><ul><li>稀有度: ${m.rarity}</li><li>評價: ${m.score}</li></ul></div>`).join('')}</div>`
            : '<p class="placeholder-text">無持有怪獸</p>';

        const dnaHtml = (playerData.playerOwnedDNA.filter(d => d).length > 0)
            ? `<div class="dna-grid">${playerData.playerOwnedDNA.filter(d => d).map(d => `<div class="dna-item-admin">${d.name}</div>`).join('')}</div>`
            : '<p class="placeholder-text">庫存無DNA</p>';
        
        DOMElements.dataDisplay.innerHTML = `
            <div class="data-section">${statsHtml}</div>
            <div class="data-section"><h3>持有怪獸</h3>${monstersHtml}</div>
            <div class="data-section"><h3>DNA庫存</h3>${dnaHtml}</div>
            <div class="save-changes-container">
                <button id="send-player-mail-btn" class="button secondary">寄送系統信件</button>
                <button id="save-player-data-btn" class="button success">儲存玩家數值變更</button>
            </div>
        `;
        
        DOMElements.playerLogSection.style.display = 'block';
        currentPlayerLogs = (playerData.playerLogs || []).sort((a, b) => b.timestamp - a.timestamp);
        
        DOMElements.playerLogFilters.querySelectorAll('button').forEach(btn => btn.disabled = false);
        DOMElements.playerLogFilters.querySelector('.active')?.classList.remove('active');
        DOMElements.playerLogFilters.querySelector('button[data-log-category="全部"]').classList.add('active');
        renderPlayerLogs();
    }
    
    // --- 玩家管理主邏輯 ---
    async function fetchAndDisplayPlayerData(uid) {
        DOMElements.dataDisplay.innerHTML = '<p class="placeholder-text">查詢中...</p>';
        DOMElements.playerLogSection.style.display = 'none';
        DOMElements.searchResultsContainer.innerHTML = '';
        currentPlayerData = null;
        try {
            const data = await fetchAdminAPI(`/player_data?uid=${uid}`);
            renderPlayerData(data);
        } catch (err) {
            DOMElements.dataDisplay.innerHTML = `<p class="placeholder-text" style="color:var(--danger-color);">查詢失敗：${err.message}</p>`;
        }
    }

    async function searchPlayer() {
        const query = DOMElements.searchInput.value.trim();
        if (!query) {
            DOMElements.searchResultsContainer.innerHTML = '';
            DOMElements.dataDisplay.innerHTML = '<p class="placeholder-text">請輸入玩家 UID 或暱稱。</p>';
            return;
        }
        const isLikelyUid = query.length > 20;
        DOMElements.searchBtn.disabled = true;
        DOMElements.searchResultsContainer.innerHTML = '<p>搜尋中...</p>';
        DOMElements.dataDisplay.innerHTML = '';
        if (isLikelyUid) {
            await fetchAndDisplayPlayerData(query);
        } else {
            try {
                const result = await fetchAdminAPI(`/players/search?nickname=${encodeURIComponent(query)}&limit=10`);
                if (!result.players || result.players.length === 0) {
                    DOMElements.searchResultsContainer.innerHTML = '<p>找不到符合此暱稱的玩家。</p>';
                } else {
                    DOMElements.searchResultsContainer.innerHTML = result.players.map(p => `<div class="search-result-item" data-uid="${p.uid}"><span>${p.nickname}</span><span class="uid">${p.uid}</span></div>`).join('');
                }
            } catch (err) {
                DOMElements.searchResultsContainer.innerHTML = `<p style="color: var(--danger-color);">搜尋失敗：${err.message}</p>`;
            }
        }
        DOMElements.searchBtn.disabled = false;
    }

    async function handleSavePlayerData() {
        if (!currentPlayerData) {
            alert('沒有可儲存的玩家資料。');
            return;
        }
        const saveBtn = document.getElementById('save-player-data-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = '儲存中...';
        
        const dataToUpdate = JSON.parse(JSON.stringify(currentPlayerData));
        dataToUpdate.nickname = document.getElementById('admin-nickname').value;
        dataToUpdate.playerStats.nickname = dataToUpdate.nickname;
        dataToUpdate.playerStats.gold = parseInt(document.getElementById('admin-gold').value, 10);
        dataToUpdate.playerStats.score = parseInt(document.getElementById('admin-score').value, 10);
        dataToUpdate.playerStats.wins = parseInt(document.getElementById('admin-wins').value, 10);
        dataToUpdate.playerStats.losses = parseInt(document.getElementById('admin-losses').value, 10);
        
        try {
            const result = await fetchAdminAPI(`/player_data/${dataToUpdate.uid}`, {
                method: 'POST',
                body: JSON.stringify(dataToUpdate)
            });
            alert(result.message);
            currentPlayerData = dataToUpdate; // 更新本地緩存
        } catch (err) {
            alert(`儲存失敗：${err.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '儲存玩家數值變更';
        }
    }

    async function handleSendPlayerMail() { /* ... 與上一版相同 ... */ }
    async function handleGenerateReport() { /* ... 與上一版相同 ... */ }
    async function loadBroadcastLog() { /* ... 與上一版相同 ... */ }
    async function handleRecallMail(event) { /* ... 與上一版相同 ... */ }
    async function handleBroadcastMail() { /* ... 與上一版相同 ... */ }
    function saveSenderPreset() { /* ... 與上一版相同 ... */ }
    function loadSenderPresets() { /* ... 與上一版相同 ... */ }

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
                renderPlayerLogs(category);
            }
        });
    }
    
    // 其他事件綁定...
    DOMElements.broadcastBtn.addEventListener('click', handleBroadcastMail);
    DOMElements.saveSenderNameBtn.addEventListener('click', saveSenderPreset);
    DOMElements.broadcastSenderPresetsSelect.addEventListener('change', () => { if (DOMElements.broadcastSenderPresetsSelect.value) { DOMElements.broadcastSenderNameInput.value = DOMElements.broadcastSenderPresetsSelect.value; } });
    DOMElements.refreshLogBtn.addEventListener('click', loadBroadcastLog);
    DOMElements.broadcastLogContainer.addEventListener('click', handleRecallMail);
    DOMElements.generateReportBtn.addEventListener('click', handleGenerateReport);
    if (DOMElements.refreshLogsBtn) { DOMElements.refreshLogsBtn.addEventListener('click', loadAndDisplayLogs); }
    if (typeof initializeConfigEditor === 'function') { initializeConfigEditor(); }
    
    // --- 初始執行 ---
    updateTime();
    setInterval(updateTime, 1000);
    switchTab('dashboard-home');
    loadSenderPresets();
});
