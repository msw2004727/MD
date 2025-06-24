document.addEventListener('DOMContentLoaded', function() {
    // --- 變數定義區 ---
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
        window.location.href = 'index.html';
        return;
    }
    const API_BASE_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api/MD'; 
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
    const broadcastTitleInput = document.getElementById('broadcast-title');
    const broadcastContentInput = document.getElementById('broadcast-content');
    const broadcastPayloadInput = document.getElementById('broadcast-payload');
    const broadcastResponseEl = document.getElementById('broadcast-response');
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

        if (targetId === 'game-configs') {
            loadAndPopulateConfigsDropdown();
        } else if (targetId === 'mail-system') {
            loadBroadcastLog();
        }
    }

    function updateTime() { if(currentTimeEl) { currentTimeEl.textContent = new Date().toLocaleString('zh-TW'); } }

    function renderPlayerData(playerData) {
        currentPlayerData = playerData;
        dataDisplay.innerHTML = `
            <div class="data-section">
                <h3>玩家狀態 (Player Stats)</h3>
                <div class="form-grid">
                    <div class="form-group"><label for="admin-nickname">暱稱</label><input type="text" id="admin-nickname" class="admin-input" value="${playerData.nickname || ''}"></div>
                    <div class="form-group"><label for="admin-gold">金幣</label><input type="number" id="admin-gold" class="admin-input" value="${playerData.playerStats.gold || 0}"></div>
                    <div class="form-group"><label for="admin-wins">勝場</label><input type="number" id="admin-wins" class="admin-input" value="${playerData.playerStats.wins || 0}"></div>
                    <div class="form-group"><label for="admin-losses">敗場</label><input type="number" id="admin-losses" class="admin-input" value="${playerData.playerStats.losses || 0}"></div>
                </div>
            </div>
            <div class="data-section"><h3>DNA 碎片庫存 (預覽)</h3><div id="admin-dna-grid" class="dna-grid">${(playerData.playerOwnedDNA || []).map(dna => dna ? `<div class="dna-card"><h4>${dna.name} (${dna.rarity})</h4><p>屬性: ${dna.type}</p></div>` : '<div class="dna-card" style="opacity: 0.5;">空位</div>').join('')}</div></div>
            <div class="data-section"><h3>持有怪獸 (預覽)</h3><div id="admin-monster-grid" class="monster-grid">${(playerData.farmedMonsters || []).map(monster => `<div class="monster-card-admin"><h4>${monster.nickname} (${monster.rarity})</h4><ul><li>HP: ${monster.hp}/${monster.initial_max_hp}</li><li>評價: ${monster.score}</li></ul></div>`).join('')}</div></div>
            <div class="save-changes-container">
                <button id="send-player-mail-btn" class="button secondary">寄送系統信件</button>
                <button id="save-player-data-btn" class="button success">儲存玩家數值變更</button>
            </div>`;
    }

    async function handleSavePlayerData() {
        if (!currentPlayerData) { alert('沒有可儲存的玩家資料。'); return; }
        const saveBtn = document.getElementById('save-player-data-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = '儲存中...';
        
        const dataToUpdate = JSON.parse(JSON.stringify(currentPlayerData));
        dataToUpdate.nickname = document.getElementById('admin-nickname').value;
        dataToUpdate.playerStats.nickname = dataToUpdate.nickname;
        dataToUpdate.playerStats.gold = parseInt(document.getElementById('admin-gold').value, 10);
        dataToUpdate.playerStats.wins = parseInt(document.getElementById('admin-wins').value, 10);
        dataToUpdate.playerStats.losses = parseInt(document.getElementById('admin-losses').value, 10);
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/player_data/${dataToUpdate.uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify(dataToUpdate)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || '儲存失敗');
            alert(result.message);
            currentPlayerData = dataToUpdate;
        } catch (err) {
            alert(`儲存失敗：${err.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = '儲存玩家數值變更';
        }
    }

    async function handleSendPlayerMail() {
        if (!currentPlayerData) { alert('請先查詢一位玩家。'); return; }
        const title = prompt(`請輸入要寄送給「${currentPlayerData.nickname}」的信件標題：`);
        if (!title) return;
        const content = prompt(`請輸入信件內容：`);
        if (!content) return;

        const btn = document.getElementById('send-player-mail-btn');
        btn.disabled = true;
        try {
            const response = await fetch(`${API_BASE_URL}/admin/send_mail_to_player`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify({ recipient_id: currentPlayerData.uid, title, content })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || '發送失敗');
            alert(result.message);
        } catch (err) {
            alert(`發送失敗：${err.message}`);
        } finally {
            btn.disabled = false;
        }
    }

    async function fetchAndDisplayPlayerData(uid) {
        dataDisplay.innerHTML = '<p>查詢中...</p>';
        searchResultsContainer.innerHTML = '';
        currentPlayerData = null;
        try {
            const response = await fetch(`${API_BASE_URL}/admin/player_data?uid=${uid}`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `伺服器錯誤: ${response.status}`);
            renderPlayerData(result);
        } catch (err) {
            dataDisplay.innerHTML = `<p style="color: var(--danger-color);">查詢失敗：${err.message}</p>`;
        }
    }

    async function searchPlayer() {
        const query = searchInput.value.trim();
        if (!query) {
            searchResultsContainer.innerHTML = '';
            dataDisplay.innerHTML = '<p>請輸入玩家 UID 或暱稱。</p>';
            return;
        }
        const isLikelyUid = query.length > 20;
        searchBtn.disabled = true;
        searchResultsContainer.innerHTML = '<p>搜尋中...</p>';
        dataDisplay.innerHTML = '';
        if (isLikelyUid) {
            await fetchAndDisplayPlayerData(query);
        } else {
            try {
                const response = await fetch(`${API_BASE_URL}/players/search?nickname=${encodeURIComponent(query)}&limit=10`, { headers: { 'Authorization': `Bearer ${adminToken}` }});
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || '搜尋失敗');
                if (!result.players || result.players.length === 0) {
                    searchResultsContainer.innerHTML = '<p>找不到符合此暱稱的玩家。</p>';
                } else {
                    searchResultsContainer.innerHTML = result.players.map(p => `<div class="search-result-item" data-uid="${p.uid}"><span>${p.nickname}</span><span class="uid">${p.uid}</span></div>`).join('');
                }
            } catch (err) {
                 searchResultsContainer.innerHTML = `<p style="color: var(--danger-color);">搜尋失敗：${err.message}</p>`;
            }
        }
        searchBtn.disabled = false;
    }

    async function loadBroadcastLog() {
        broadcastLogContainer.innerHTML = '<p>正在載入紀錄...</p>';
        try {
            const response = await fetch(`${API_BASE_URL}/admin/get_broadcast_log`, { headers: { 'Authorization': `Bearer ${adminToken}` }});
            const logs = await response.json();
            if (!response.ok) throw new Error(logs.error || '載入失敗');

            if (logs.length === 0) {
                broadcastLogContainer.innerHTML = '<p>尚無系統信件發送紀錄。</p>';
                return;
            }

            let tableHtml = `<table class="broadcast-log-table"><thead><tr><th>發送時間</th><th>標題</th><th>內容摘要</th><th>操作</th></tr></thead><tbody>`;
            logs.forEach(log => {
                const date = new Date(log.timestamp * 1000).toLocaleString('zh-TW');
                const contentSummary = log.content.length > 30 ? log.content.substring(0, 30) + '...' : log.content;
                tableHtml += `<tr>
                    <td>${date}</td>
                    <td>${log.title}</td>
                    <td>${contentSummary}</td>
                    <td class="actions-cell"><button class="button danger text-xs recall-mail-btn" data-broadcast-id="${log.broadcastId}">回收此信件</button></td>
                </tr>`;
            });
            tableHtml += `</tbody></table>`;
            broadcastLogContainer.innerHTML = tableHtml;
        } catch (err) {
            broadcastLogContainer.innerHTML = `<p style="color: var(--danger-color);">載入紀錄失敗：${err.message}</p>`;
        }
    }
    
    async function handleRecallMail(event) {
        if (!event.target.classList.contains('recall-mail-btn')) return;
        
        const broadcastId = event.target.dataset.broadcastId;
        if (!confirm(`您確定要回收這封系統信件嗎？此操作將從所有玩家的信箱中移除它。`)) return;

        event.target.disabled = true;
        event.target.textContent = '回收中...';
        try {
            const response = await fetch(`${API_BASE_URL}/admin/recall_mail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify({ broadcastId: broadcastId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || '回收失敗');
            alert(result.message);
            loadBroadcastLog();
        } catch (err) {
            alert(`回收失敗：${err.message}`);
            event.target.disabled = false;
            event.target.textContent = '回收此信件';
        }
    }

    async function handleBroadcastMail() {
        const title = document.getElementById('broadcast-title').value.trim();
        const content = document.getElementById('broadcast-content').value.trim();
        const payloadStr = document.getElementById('broadcast-payload').value.trim() || '{}';

        if (!title || !content) {
            alert('信件標題和內容不能為空。');
            return;
        }

        const btn = document.getElementById('broadcast-mail-btn');
        const responseEl = document.getElementById('broadcast-response');

        btn.disabled = true;
        btn.textContent = '發送中...';
        responseEl.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/admin/broadcast_mail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify({ title, content, payload_str: payloadStr })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || '發送失敗');

            responseEl.textContent = result.message;
            responseEl.className = 'admin-response-message success';
            document.getElementById('broadcast-title').value = '';
            document.getElementById('broadcast-content').value = '';
            document.getElementById('broadcast-payload').value = '';
            loadBroadcastLog();
        } catch (err) {
            responseEl.textContent = `發送失敗：${err.message}`;
            responseEl.className = 'admin-response-message error';
        } finally {
            responseEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = '向所有玩家發送';
        }
    }

    // --- 核心修改處 START ---
    async function handleGenerateReport() {
        generateReportBtn.disabled = true;
        generateReportBtn.textContent = '生成中...';
        overviewReportContainer.innerHTML = '<p>正在從伺服器計算數據，請稍候...</p>';
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/game_overview`, { headers: { 'Authorization': `Bearer ${adminToken}` }});
            const stats = await response.json();
            if (!response.ok) throw new Error(stats.error || '獲取報表失敗');
            
            const rarityOrder = ["神話", "傳奇", "菁英", "稀有", "普通"];
            let rarityHtml = rarityOrder.map(rarity => `
                <div class="overview-card">
                    <h4 class="stat-title">${rarity}怪獸數量</h4>
                    <p class="stat-value">${(stats.monsterRarityCount[rarity] || 0).toLocaleString()}</p>
                </div>
            `).join('');

            overviewReportContainer.innerHTML = `
                <div class="overview-grid">
                    <div class="overview-card">
                        <h4 class="stat-title">總玩家數</h4>
                        <p class="stat-value">${(stats.totalPlayers || 0).toLocaleString()}</p>
                    </div>
                    <div class="overview-card">
                        <h4 class="stat-title">全服金幣總量</h4>
                        <p class="stat-value">${(stats.totalGold || 0).toLocaleString()} 🪙</p>
                    </div>
                     <div class="overview-card">
                        <h4 class="stat-title">全服DNA總數</h4>
                        <p class="stat-value">${(stats.totalDnaFragments || 0).toLocaleString()}</p>
                    </div>
                    ${rarityHtml}
                </div>
            `;
        } catch (err) {
            overviewReportContainer.innerHTML = `<p style="color: var(--danger-color);">生成報表失敗：${err.message}</p>`;
        } finally {
            generateReportBtn.disabled = false;
            generateReportBtn.textContent = '重新生成全服數據報表';
        }
    }
    // --- 核心修改處 END ---

    async function loadAndPopulateConfigsDropdown() {
        if (configFileSelector.options.length > 1 && !configFileSelector.dataset.needsRefresh) return;
        
        configFileSelector.innerHTML = '<option value="">請選擇一個檔案...</option>';
        configFileSelector.disabled = true;
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
            configFileSelector.dataset.needsRefresh = "false";
        } catch (err) {
            console.error('載入設定檔列表失敗:', err);
            const option = new Option(`載入失敗: ${err.message}`, '');
            option.disabled = true;
            configFileSelector.add(option);
        } finally {
            configFileSelector.disabled = false;
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

    logoutBtn.addEventListener('click', () => { localStorage.removeItem('admin_token'); window.location.href = 'index.html'; });
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
