// admin/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    
    // 將所有初始化和事件綁定邏輯封裝在一個主函式中
    function initializeApp() {
        // --- 變數定義區 ---
        const adminToken = localStorage.getItem('admin_token');
        const SENDER_PRESETS_KEY = 'admin_sender_presets'; 
        let currentPlayerData = null;
        let logIntervalId = null;
        let currentPlayerLogs = [];

        // 直接定義完整的後端 API URL，不再使用相對路徑或依賴外部檔案
        const ADMIN_API_URL = 'https://md-server-5wre.onrender.com/api/MD';

        if (!adminToken) {
            window.location.href = 'index.html';
            return;
        }
        
        // --- DOM 元素獲取區 ---
        const DOMElements = {
            navItems: document.querySelectorAll('.nav-item'),
            contentPanels: document.querySelectorAll('.content-panel'),
            logoutBtn: document.getElementById('logout-btn'),
            currentTimeEl: document.getElementById('current-time'),
            
            // 總覽
            generateReportBtn: document.getElementById('generate-report-btn'),
            overviewReportContainer: document.getElementById('overview-report-container'),
            wipeAllDataBtn: document.getElementById('wipe-all-data-btn'),
            
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
            
            csMailContainer: document.getElementById('cs-mail-container'),
            refreshCsMailBtn: document.getElementById('refresh-cs-mail-btn'),
            
            // 冒險島設定
            advSettings: {
                bossMultiplierInput: document.getElementById('boss-difficulty-multiplier'),
                facilitiesContainer: document.getElementById('adventure-facilities-container'),
                saveBtn: document.getElementById('save-adventure-settings-btn'),
                responseEl: document.getElementById('adventure-settings-response'),
                growthFacilitiesContainer: document.getElementById('adventure-growth-facilities-container'),
                growthStatsContainer: document.getElementById('adventure-growth-stats-container'),
                saveGrowthBtn: document.getElementById('save-adventure-growth-settings-btn'),
                growthResponseEl: document.getElementById('adventure-growth-settings-response'),
            },

            // 冠軍守衛設定
            guardianSettings: {
                container: document.getElementById('champion-guardians-container'),
                saveBtn: document.getElementById('save-champion-guardians-btn'),
                responseEl: document.getElementById('champion-guardians-response'),
            },

            // 修煉設定
            cultivationSettings: {
                dnaFindChanceInput: document.getElementById('cult-dna-find-chance'),
                dnaFindDivisorInput: document.getElementById('cult-dna-find-divisor'),
                lootTableContainer: document.getElementById('cultivation-loot-table-container'),
                statGrowthContainer: document.getElementById('cultivation-stat-growth-container'),
                saveBtn: document.getElementById('save-cultivation-settings-btn'),
                responseEl: document.getElementById('cultivation-settings-response'),
            },

            // 設定檔
            configFileSelector: document.getElementById('config-file-selector'),
            configDisplayArea: document.getElementById('game-configs-display'),
            saveConfigBtn: document.getElementById('save-config-btn'),
            configResponseEl: document.getElementById('config-response'),

            // 日誌監控
            logDisplayContainer: document.getElementById('log-display-container'),
            refreshLogsBtn: document.getElementById('refresh-logs-btn'),

            // 遊戲機制
            mechanics: {
                critMultiplier: document.getElementById('mech-crit-multiplier'),
                dmgFormulaBase: document.getElementById('mech-dmg-formula-base'),
                dmgFormulaScaling: document.getElementById('mech-dmg-formula-scaling'),
                cultDiminishBase: document.getElementById('mech-cult-diminish-base'),
                cultDiminishWindow: document.getElementById('mech-cult-diminish-window'),
                cultBondGain: document.getElementById('mech-cult-bond-gain'),
                expGainDivisor: document.getElementById('mech-exp-gain-divisor'),
                statPointsMin: document.getElementById('mech-stat-points-min'),
                statPointsMax: document.getElementById('mech-stat-points-max'),
                elementBias: document.getElementById('mech-element-bias'),
                saveBtn: document.getElementById('save-mechanics-btn'),
                responseEl: document.getElementById('mechanics-response'),
            },
            
            // 屬性相剋面板的元素
            elementalAdvantage: {
                container: document.getElementById('elemental-advantage-table-container'),
                saveBtn: document.getElementById('save-elemental-chart-btn'),
                responseEl: document.getElementById('elemental-chart-response'),
            }
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
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return response.json();
                } else {
                    return response.text();
                }
            } catch (error) {
                alert(`API 請求失敗: ${error.message}`);
                throw error;
            }
        }
        
        function updateTime() { 
            const now = new Date().toLocaleString('zh-TW', { hour12: false }).replace(',', '');
            if(DOMElements.currentTimeEl) { 
                DOMElements.currentTimeEl.textContent = now;
            }
            const overviewTimeEl = document.getElementById('current-time-overview');
            if(overviewTimeEl) {
                overviewTimeEl.textContent = now;
            }
        }

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
            } else if (targetId === 'cs-mailbox') { 
                loadCsMail();
            } else if (targetId === 'adventure-island-settings') {
                loadAdventureSettings();
            } else if (targetId === 'champion-guardians-settings') {
                loadChampionGuardians();
            } else if (targetId === 'cultivation-settings') {
                loadCultivationSettings();
            } else if (targetId === 'game-configs') {
                if (typeof initializeConfigEditor === 'function') {
                    initializeConfigEditor(ADMIN_API_URL, adminToken);
                } else {
                    console.error("config-editor.js 或 initializeConfigEditor 函式未載入。");
                    alert("設定檔編輯器模組載入失敗，請檢查控制台。");
                }
            } else if (targetId === 'log-monitoring') {
                loadAndDisplayLogs();
                logIntervalId = setInterval(loadAndDisplayLogs, 10000);
            } else if (targetId === 'game-mechanics') {
                loadGameMechanics();
            } else if (targetId === 'elemental-advantage') { 
                loadAndRenderElementalChart(); 
            }
        }

        // --- 日誌監控邏輯 ---
        async function loadAndDisplayLogs() {
            if (!DOMElements.logDisplayContainer) return;
            const container = DOMElements.logDisplayContainer;
            const oldScrollHeight = container.scrollHeight;
            const oldScrollTop = container.scrollTop;
            try {
                const response = await fetch(`${ADMIN_API_URL}/logs?_=${new Date().getTime()}`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
                if (!response.ok) throw new Error(`伺服器錯誤: ${response.status} ${response.statusText}`);
                
                const htmlContent = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, "text/html");
                const logEntries = doc.body.innerHTML;
                
                container.innerHTML = logEntries || '<p>日誌目前為空。</p>';
                const newScrollHeight = container.scrollHeight;
                container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
            } catch (err) {
                container.innerHTML = `<p style="color: var(--danger-color);">載入日誌失敗：${err.message}</p>`;
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
                // 清理訊息中的 HTML 標籤以避免 XSS
                const cleanMessage = log.message.replace(/</g, "&lt;").replace(/>/g, "&gt;"); 
                
                // 使用一個主 div (log-entry) 包裝每一條日誌的所有內容
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
            const equippedTitle = (stats.titles || []).find(t => t.id === stats.equipped_title_id) || { name: '無' };

            const statsHtml = `
                <div class="form-grid">
                    <div class="form-group"><label>暱稱</label><input type="text" class="admin-input" id="admin-nickname" value="${playerData.nickname || ''}"></div>
                    <div class="form-group"><label>UID</label><input type="text" class="admin-input" value="${playerData.uid || ''}" readonly></div>
                    <div class="form-group"><label>金幣</label><input type="number" class="admin-input" id="admin-gold" value="${stats.gold || 0}"></div>
                    <div class="form-group"><label>總積分</label><input type="number" class="admin-input" id="admin-score" value="${stats.score || 0}"></div>
                    <div class="form-group"><label>勝場</label><input type="number" class="admin-input" id="admin-wins" value="${stats.wins || 0}"></div>
                    <div class="form-group"><label>敗場</label><input type="number" class="admin-input" id="admin-losses" value="${stats.losses || 0}"></div>
                </div>
                <div class="form-group"><label>當前稱號</label><input type="text" class="admin-input" value="${equippedTitle.name}" readonly></div>`;

            const monstersHtml = (playerData.farmedMonsters && playerData.farmedMonsters.length > 0)
                ? `<div class="monster-grid">${playerData.farmedMonsters.map(m => `<div class="monster-card-admin"><h4>${m.nickname || '未知怪獸'}</h4><ul><li>稀有度: ${m.rarity}</li><li>評價: ${m.score || 0}</li></ul></div>`).join('')}</div>`
                : '<p class="placeholder-text">無持有怪獸</p>';

            const dnaHtml = (playerData.playerOwnedDNA && playerData.playerOwnedDNA.filter(d => d).length > 0)
                ? `<div class="dna-grid">${playerData.playerOwnedDNA.filter(d => d).map(d => `<div class="dna-item-admin">${d.name}</div>`).join('')}</div>`
                : '<p class="placeholder-text">庫存無DNA</p>';
            
            DOMElements.dataDisplay.innerHTML = `
                <div class="data-section">${statsHtml}</div>
                <div class="data-section"><h3>持有怪獸</h3>${monstersHtml}</div>
                <div class="data-section"><h3>DNA庫存</h3>${dnaHtml}</div>
                <div class="save-changes-container">
                    <button id="grant-exclusive-title-btn" class="button action">授予專屬稱號</button>
                    <button id="send-player-mail-btn" class="button secondary">寄送系統信件</button>
                    <button id="save-player-data-btn" class="button success">儲存玩家數值變更</button>
                </div>
            `;
            
            if (DOMElements.playerLogSection && DOMElements.playerLogDisplay && DOMElements.playerLogFilters) {
                DOMElements.playerLogSection.style.display = 'block';
                currentPlayerLogs = (playerData.playerLogs || []).sort((a, b) => b.timestamp - a.timestamp);
                
                DOMElements.playerLogFilters.querySelectorAll('button').forEach(btn => btn.disabled = false);
                const currentActive = DOMElements.playerLogFilters.querySelector('.active');
                if (currentActive) currentActive.classList.remove('active');
                DOMElements.playerLogFilters.querySelector('button[data-log-category="全部"]').classList.add('active');
                renderPlayerLogs(currentPlayerLogs, '全部');
            }
        }
        
        // --- 玩家管理主邏輯 ---
        async function fetchAndDisplayPlayerData(uid) {
            DOMElements.dataDisplay.innerHTML = '<p class="placeholder-text">查詢中...</p>';
            DOMElements.playerLogSection.style.display = 'none';
            DOMElements.searchResultsContainer.innerHTML = '';
            currentPlayerData = null;
            try {
                const data = await fetchAdminAPI(`/player_data?uid=${uid}`);
                data.uid = uid;
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
                    const response = await fetch(`${ADMIN_API_URL}/players/search?nickname=${encodeURIComponent(query)}&limit=10`, {
                        headers: { 'Authorization': `Bearer ${adminToken}` }
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || '搜尋失敗');

                    if (!result.players || result.players.length === 0) {
                        DOMElements.searchResultsContainer.innerHTML = '<p>找不到符合此暱稱的玩家。</p>';
                    } else {
                        DOMElements.searchResultsContainer.innerHTML = result.players.map(p => `<div class="search-result-item" data-uid="${p.uid}"><span>${p.nickname}</span><span class="uid">${p.uid}</span></div>`).join('');
                    }
                } catch (err) {
                    alert(`API 請求失敗: ${err.message}`);
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
                const result = await fetchAdminAPI(`/player_data/${dataToUpdate.uid}`, { method: 'POST', body: JSON.stringify(dataToUpdate) });
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
            const senderName = prompt("請輸入寄件人名稱：", "遊戲管理員");
            if (senderName === null) return; 
            const title = prompt(`請輸入要寄送給「${currentPlayerData.nickname}」的信件標題：`);
            if (!title) return;
            const content = prompt(`請輸入信件內容：`);
            if (!content) return;
            const btn = document.getElementById('send-player-mail-btn');
            btn.disabled = true;
            try {
                const result = await fetchAdminAPI(`/send_mail_to_player`, { method: 'POST', body: JSON.stringify({ recipient_id: currentPlayerData.uid, title, content, sender_name: senderName.trim() || '遊戲管理員' }) });
                alert(result.message);
            } catch (err) {
                alert(`發送失败：${err.message}`);
            } finally {
                btn.disabled = false;
            }
        }
        
        async function handleGrantExclusiveTitle() {
            if (!currentPlayerData) {
                alert('請先查詢一位玩家以授予稱號。');
                return;
            }

            const titleName = prompt(`請為玩家「${currentPlayerData.nickname}」輸入專屬稱號的名稱：`);
            if (!titleName) { alert('稱號名稱不能為空。'); return; }

            const titleDesc = prompt(`請輸入稱號「${titleName}」的描述：`);
            if (!titleDesc) { alert('稱號描述不能為空。'); return; }

            const buffsJson = prompt('請輸入稱號的加成效果 (JSON格式)，例如：\n{"attack": 10, "hp": 50}\n如果沒有加成，請輸入 {}', '{}');
            if (buffsJson === null) return;
            
            try {
                JSON.parse(buffsJson);
            } catch (e) {
                alert(`加成效果的 JSON 格式不正確：${e.message}`);
                return;
            }

            const btn = document.getElementById('grant-exclusive-title-btn');
            btn.disabled = true;
            btn.textContent = '授予中...';

            try {
                const result = await fetchAdminAPI('/grant_exclusive_title', {
                    method: 'POST',
                    body: JSON.stringify({
                        player_uid: currentPlayerData.uid,
                        title_name: titleName,
                        title_description: titleDesc,
                        buffs_json: buffsJson
                    })
                });
                alert(result.message);
                await fetchAndDisplayPlayerData(currentPlayerData.uid);
            } catch (err) {
                alert(`授予失敗：${err.message}`);
            } finally {
                btn.disabled = false;
                btn.textContent = '授予專屬稱號';
            }
        }

        // --- 廣播系統邏輯 ---
        async function loadBroadcastLog() {
            DOMElements.broadcastLogContainer.innerHTML = '<p>正在載入紀錄...</p>';
            try {
                const logs = await fetchAdminAPI('/get_broadcast_log');
                if (logs.length === 0) { 
                    DOMElements.broadcastLogContainer.innerHTML = '<p>尚無系統信件發送紀錄。</p>'; 
                    return; 
                }
                let tableHtml = `<table class="broadcast-log-table"><thead><tr><th>發送時間</th><th>標題</th><th>內容摘要</th><th>附件</th><th>操作</th></tr></thead><tbody>`;
                logs.forEach(log => {
                    const date = new Date(log.timestamp * 1000).toLocaleString('zh-TW');
                    const contentSummary = log.content.length > 20 ? log.content.substring(0, 20) + '...' : log.content;
                    const payloadSummary = JSON.stringify(log.payload || {}).substring(0, 25) + '...';
                    tableHtml += `<tr><td>${date}</td><td>${log.title}</td><td>${contentSummary}</td><td>${payloadSummary}</td><td class="actions-cell"><button class="button danger text-xs recall-mail-btn" data-broadcast-id="${log.broadcastId}">回收</button></td></tr>`;
                });
                tableHtml += `</tbody></table>`;
                DOMElements.broadcastLogContainer.innerHTML = tableHtml;
            } catch (err) { DOMElements.broadcastLogContainer.innerHTML = `<p style="color: var(--danger-color);">載入紀錄失敗：${err.message}</p>`; }
        }
        
        async function handleRecallMail(event) {
            if (!event.target.classList.contains('recall-mail-btn')) return;
            const broadcastId = event.target.dataset.broadcastId;
            if (!confirm(`您確定要回收這封系統信件嗎？(此操作僅從日誌中移除)`)) return;
            event.target.disabled = true;
            event.target.textContent = '...';
            try {
                await fetchAdminAPI('/recall_mail', { method: 'POST', body: JSON.stringify({ broadcastId }) });
                loadBroadcastLog();
            } catch (err) {
                alert(`回收失敗：${err.message}`);
                event.target.disabled = false;
                event.target.textContent = '回收';
            }
        }

        async function handleBroadcastMail() {
            const senderName = DOMElements.broadcastSenderNameInput.value.trim() || '遊戲管理員';
            const title = document.getElementById('broadcast-title').value.trim();
            const content = document.getElementById('broadcast-content').value.trim();
            const payloadStr = document.getElementById('broadcast-payload').value.trim() || '{}';
            if (!title || !content) { alert('信件標題和內容不能為空。'); return; }
            const btn = document.getElementById('broadcast-mail-btn');
            const responseEl = document.getElementById('broadcast-response');
            btn.disabled = true;
            btn.textContent = '發送中...';
            responseEl.style.display = 'none';
            try {
                JSON.parse(payloadStr);
                const result = await fetchAdminAPI('/broadcast_mail', { method: 'POST', body: JSON.stringify({ sender_name: senderName, title, content, payload_str: payloadStr }) });
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

        function saveSenderPreset() {
            const newName = DOMElements.broadcastSenderNameInput.value.trim();
            if (!newName) { alert('寄件人名稱不能為空。'); return; }
            let presets = [];
            try {
                const stored = localStorage.getItem(SENDER_PRESETS_KEY);
                if (stored) presets = JSON.parse(stored);
            } catch(e) { console.error("Error reading presets:", e); }
            if (!Array.isArray(presets)) presets = [];
            if (!presets.includes(newName)) {
                presets.push(newName);
                localStorage.setItem(SENDER_PRESETS_KEY, JSON.stringify(presets));
                alert(`已儲存寄件人：${newName}`);
                loadSenderPresets();
                DOMElements.broadcastSenderPresetsSelect.value = newName;
            } else {
                alert('此名稱已存在於預設選單中。');
            }
        }
        
        function loadSenderPresets() {
            let presets = ['遊戲管理員', '系統通知'];
            try {
                const storedPresets = localStorage.getItem(SENDER_PRESETS_KEY);
                if (storedPresets) {
                    const parsed = JSON.parse(storedPresets);
                    if (Array.isArray(parsed)) {
                        presets = parsed;
                    }
                }
            } catch (error) {
                console.error("讀取寄件人預設集失敗，將使用預設值:", error);
                localStorage.removeItem(SENDER_PRESETS_KEY);
            }
            DOMElements.broadcastSenderPresetsSelect.innerHTML = '<option value="">選擇預設名稱...</option>';
            presets.forEach(name => {
                const option = new Option(name, name);
                DOMElements.broadcastSenderPresetsSelect.add(option);
            });
        }
        
        // 客服信箱邏輯
        async function loadCsMail() {
            if (!DOMElements.csMailContainer) return;
            DOMElements.csMailContainer.innerHTML = '<p>正在載入玩家回覆...</p>';
            try {
                const mails = await fetchAdminAPI('/get_cs_mail');
                if (mails.length === 0) { 
                    DOMElements.csMailContainer.innerHTML = '<p class="placeholder-text">信箱目前是空的。</p>'; 
                    return; 
                }
                
                let mailHtml = mails.map(mail => {
                    const date = new Date(mail.timestamp * 1000).toLocaleString('zh-TW');
                    const sender = mail.sender_name || '未知玩家';
                    const senderId = mail.sender_id || 'N/A';
                    return `
                        <div class="cs-mail-item">
                            <div class="cs-mail-header">
                                <strong class="cs-mail-title">${mail.title}</strong>
                                <span class="cs-mail-meta">寄件人: ${sender} (${senderId})</span>
                                <span class="cs-mail-meta">${date}</span>
                            </div>
                            <div class="cs-mail-content">
                                ${mail.content.replace(/\n/g, '<br>')}
                            </div>
                            <div class="cs-mail-actions">
                                <button class="button secondary cs-reply-btn" data-recipient-id="${senderId}" data-recipient-name="${sender}">回覆</button>
                                <button class="button danger text-xs cs-delete-mail-btn" data-mail-id="${mail.id}">刪除</button>
                            </div>
                        </div>
                    `;
                }).join('');
                DOMElements.csMailContainer.innerHTML = mailHtml;
            } catch (err) { 
                DOMElements.csMailContainer.innerHTML = `<p style="color: var(--danger-color);">載入客服信件失敗：${err.message}</p>`;
            }
        }
        
        async function handleCsMailActions(event) {
            const replyBtn = event.target.closest('.cs-reply-btn');
            const deleteBtn = event.target.closest('.cs-delete-mail-btn');

            if (replyBtn) {
                const recipientId = replyBtn.dataset.recipientId;
                const recipientName = replyBtn.dataset.recipientName;
                const replyTitle = prompt(`回覆給「${recipientName}」的標題：`, `Re: ${replyBtn.closest('.cs-mail-item').querySelector('.cs-mail-title').textContent}`);
                if (!replyTitle) return;
                const replyContent = prompt(`請輸入回覆內容：`);
                if (!replyContent) return;
                
                replyBtn.disabled = true;
                replyBtn.textContent = '發送中...';
                try {
                    const result = await fetchAdminAPI('/send_mail_to_player', { 
                        method: 'POST', 
                        body: JSON.stringify({ 
                            recipient_id: recipientId, 
                            title: replyTitle, 
                            content: replyContent, 
                            sender_name: '客服團隊' 
                        }) 
                    });
                    alert(result.message);
                } catch (err) {
                    alert(`回覆失敗：${err.message}`);
                } finally {
                    replyBtn.disabled = false;
                    replyBtn.textContent = '回覆';
                }
            } else if (deleteBtn) {
                const mailId = deleteBtn.dataset.mailId;
                if (!confirm(`您確定要刪除這封來自玩家的信件嗎？此操作不可復原。`)) return;

                deleteBtn.disabled = true;
                deleteBtn.textContent = '刪除中...';
                try {
                    const result = await fetchAdminAPI(`/delete_cs_mail/${mailId}`, { method: 'DELETE' });
                    alert(result.message);
                    loadCsMail(); // 成功後重新載入列表
                } catch (err) {
                    alert(`刪除失敗：${err.message}`);
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = '刪除';
                }
            }
        }

        async function loadAdventureSettings() {
            const { bossMultiplierInput, facilitiesContainer, growthFacilitiesContainer, growthStatsContainer } = DOMElements.advSettings;
            if (!bossMultiplierInput || !growthFacilitiesContainer) return;

            bossMultiplierInput.value = '';
            facilitiesContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
            growthFacilitiesContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
            growthStatsContainer.innerHTML = '';

            try {
                const [advSettings, islandsData, growthSettings] = await Promise.all([
                    fetchAdminAPI('/get_config?file=adventure/adventure_settings.json'),
                    fetchAdminAPI('/get_config?file=adventure/adventure_islands.json'),
                    fetchAdminAPI('/get_config?file=adventure/adventure_growth_settings.json')
                ]);

                bossMultiplierInput.value = advSettings.boss_difficulty_multiplier_per_floor || 1.1;
                
                // --- 核心修改處 START ---
                if (islandsData && Array.isArray(islandsData) && islandsData.length > 0) {
                    const facilities = islandsData[0].facilities || [];
                    
                    let facilitiesHtml = '<div class="four-column-grid">';
                    
                    facilities.forEach(facility => {
                        facilitiesHtml += `
                            <div class="facility-column-card">
                                <h4>${facility.name}</h4>
                                <div class="form-group">
                                    <label for="facility-cost-${facility.facilityId}">入場費</label>
                                    <input type="number" id="facility-cost-${facility.facilityId}" data-facility-id="${facility.facilityId}" class="admin-input" value="${facility.cost || 0}">
                                </div>
                                <div class="form-group">
                                    <label for="facility-base-gold-${facility.facilityId}">通關基礎金幣</label>
                                    <input type="number" id="facility-base-gold-${facility.facilityId}" data-facility-id="${facility.facilityId}" class="admin-input" value="${facility.floor_clear_base_gold || 0}">
                                </div>
                                <div class="form-group">
                                    <label for="facility-bonus-gold-${facility.facilityId}">通關額外獎勵</label>
                                    <input type="number" id="facility-bonus-gold-${facility.facilityId}" data-facility-id="${facility.facilityId}" class="admin-input" value="${facility.floor_clear_bonus_gold_per_floor || 0}">
                                </div>
                            </div>
                        `;
                    });

                    facilitiesHtml += '</div>';
                    facilitiesContainer.innerHTML = facilitiesHtml;
                } else {
                    facilitiesContainer.innerHTML = '<p class="placeholder-text">找不到設施資料。</p>';
                }
                // --- 核心修改處 END ---
                
                if (growthSettings && growthSettings.facilities) {
                    const facilityNames = {};
                    islandsData.forEach(island => island.facilities.forEach(f => { facilityNames[f.facilityId] = f.name; }));

                    growthFacilitiesContainer.innerHTML = Object.entries(growthSettings.facilities).map(([id, settings]) => `
                        <div class="facility-settings-card">
                            <h4>${facilityNames[id] || id}</h4>
                            <div class="form-group">
                                <label for="growth-chance-${id}">成長觸發機率 (%)</label>
                                <input type="number" id="growth-chance-${id}" data-facility-id="${id}" data-setting="growth_chance" class="admin-input" value="${((settings.growth_chance || 0) * 100).toFixed(1)}" step="0.1" min="0" max="100">
                            </div>
                             <div class="form-group">
                                <label for="growth-points-${id}">成長點數</label>
                                <input type="number" id="growth-points-${id}" data-facility-id="${id}" data-setting="growth_points" class="admin-input" value="${settings.growth_points || 0}" step="1" min="0">
                            </div>
                        </div>
                    `).join('');
                } else {
                     growthFacilitiesContainer.innerHTML = '<p class="placeholder-text">找不到成長設定資料。</p>';
                }
                
                if (growthSettings && growthSettings.stat_weights) {
                    let statsHtml = `
                        <div class="facility-settings-card">
                            <h4>各項能力成長權重 (數字越大，越容易成長)</h4>`;
                    statsHtml += Object.entries(growthSettings.stat_weights).map(([stat, weight]) => `
                        <div class="form-group">
                            <label for="stat-weight-${stat}">${stat.toUpperCase()}</label>
                            <input type="number" id="stat-weight-${stat}" data-stat-name="${stat}" class="admin-input" value="${weight || 0}" step="1" min="0">
                        </div>
                    `).join('');
                    statsHtml += `</div>`;
                    growthStatsContainer.innerHTML = statsHtml;
                }

            } catch (err) {
                 facilitiesContainer.innerHTML = `<p style="color: var(--danger-color);">載入冒險島設定失敗：${err.message}</p>`;
                 growthFacilitiesContainer.innerHTML = `<p style="color: var(--danger-color);">載入成長設定失敗：${err.message}</p>`;
            }
        }
        
        async function handleSaveAdventureSettings() {
            const { bossMultiplierInput, facilitiesContainer, saveBtn, responseEl } = DOMElements.advSettings;
            
            const globalSettings = {
                boss_difficulty_multiplier_per_floor: parseFloat(bossMultiplierInput.value) || 1.1,
            };

            const facilitiesSettings = [];
            // --- 核心修改處 START ---
            // 修改 querySelector 以匹配新的 HTML 結構
            facilitiesContainer.querySelectorAll('input[data-facility-id]').forEach(input => {
                const facilityId = input.dataset.facilityId;
                // 防止重複添加
                if (!facilitiesSettings.some(f => f.id === facilityId)) {
                    facilitiesSettings.push({
                        id: facilityId,
                        cost: parseInt(document.getElementById(`facility-cost-${facilityId}`).value, 10) || 0,
                        floor_clear_base_gold: parseInt(document.getElementById(`facility-base-gold-${facilityId}`).value, 10) || 0,
                        floor_clear_bonus_gold_per_floor: parseInt(document.getElementById(`facility-bonus-gold-${facilityId}`).value, 10) || 0,
                    });
                }
            });
            // --- 核心修改處 END ---

            saveBtn.disabled = true;
            saveBtn.textContent = '儲存中...';
            responseEl.style.display = 'none';

            try {
                const result = await fetchAdminAPI('/save_adventure_settings', {
                    method: 'POST',
                    body: JSON.stringify({
                        global_settings: globalSettings,
                        facilities_settings: facilitiesSettings
                    })
                });
                
                responseEl.textContent = result.message;
                responseEl.className = 'admin-response-message success';

            } catch (err) {
                responseEl.textContent = `儲存失敗：${err.message}`;
                responseEl.className = 'admin-response-message error';
            } finally {
                responseEl.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.textContent = '儲存冒險島設定變更';
            }
        }

        async function handleSaveAdventureGrowthSettings() {
            const { growthFacilitiesContainer, growthStatsContainer, saveGrowthBtn, growthResponseEl } = DOMElements.advSettings;
            
            const newGrowthSettings = {
                facilities: {},
                stat_weights: {}
            };

            growthFacilitiesContainer.querySelectorAll('input[data-facility-id]').forEach(input => {
                const id = input.dataset.facilityId;
                if (!newGrowthSettings.facilities[id]) {
                    newGrowthSettings.facilities[id] = {};
                }
                if (input.dataset.setting === 'growth_chance') {
                    newGrowthSettings.facilities[id].growth_chance = parseFloat(input.value) / 100.0;
                } else if (input.dataset.setting === 'growth_points') {
                    newGrowthSettings.facilities[id].growth_points = parseInt(input.value, 10);
                }
            });

            growthStatsContainer.querySelectorAll('input[data-stat-name]').forEach(input => {
                const stat = input.dataset.statName;
                newGrowthSettings.stat_weights[stat] = parseInt(input.value, 10);
            });
            
            saveGrowthBtn.disabled = true;
            saveGrowthBtn.textContent = '儲存中...';
            growthResponseEl.style.display = 'none';

            try {
                const result = await fetchAdminAPI('/save_adventure_growth_settings', {
                    method: 'POST',
                    body: JSON.stringify(newGrowthSettings)
                });
                
                growthResponseEl.textContent = result.message;
                growthResponseEl.className = 'admin-response-message success';

            } catch (err) {
                growthResponseEl.textContent = `儲存失敗：${err.message}`;
                growthResponseEl.className = 'admin-response-message error';
            } finally {
                growthResponseEl.style.display = 'block';
                saveGrowthBtn.disabled = false;
                saveGrowthBtn.textContent = '儲存隨機成長設定';
            }
        }

        async function loadChampionGuardians() {
            const container = DOMElements.guardianSettings.container;
            container.innerHTML = '<p class="placeholder-text">載入中...</p>';
            try {
                const guardians = await fetchAdminAPI('/get_config?file=system/champion_guardians.json');
                let html = '';
                for (const rank in guardians) {
                    const guardian = guardians[rank];
                    html += `
                        <div class="facility-settings-card">
                            <h4>${guardian.nickname} (Rank ${rank.replace('rank','')})</h4>
                            <div class="form-grid">
                                <div class="form-group"><label>HP</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="initial_max_hp" value="${guardian.initial_max_hp}"></div>
                                <div class="form-group"><label>MP</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="initial_max_mp" value="${guardian.initial_max_mp}"></div>
                                <div class="form-group"><label>攻擊</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="attack" value="${guardian.attack}"></div>
                                <div class="form-group"><label>防禦</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="defense" value="${guardian.defense}"></div>
                                <div class="form-group"><label>速度</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="speed" value="${guardian.speed}"></div>
                                <div class="form-group"><label>爆擊</label><input type="number" class="admin-input guardian-stat" data-rank="${rank}" data-stat="crit" value="${guardian.crit}"></div>
                            </div>
                        </div>`;
                }
                container.innerHTML = html;
            } catch (err) {
                container.innerHTML = `<p style="color: var(--danger-color);">載入冠軍守衛設定失敗：${err.message}</p>`;
            }
        }

        async function handleSaveChampionGuardians() {
            const { container, saveBtn, responseEl } = DOMElements.guardianSettings;
            const newGuardianData = {};
            container.querySelectorAll('.guardian-stat').forEach(input => {
                const rank = input.dataset.rank;
                const stat = input.dataset.stat;
                if (!newGuardianData[rank]) newGuardianData[rank] = {};
                newGuardianData[rank][stat] = parseInt(input.value, 10);
            });
            saveBtn.disabled = true;
            saveBtn.textContent = '儲存中...';
            responseEl.style.display = 'none';
            try {
                const result = await fetchAdminAPI('/save_champion_guardians', { method: 'POST', body: JSON.stringify(newGuardianData) });
                responseEl.textContent = result.message;
                responseEl.className = 'admin-response-message success';
            } catch (err) {
                responseEl.textContent = `儲存失敗：${err.message}`;
                responseEl.className = 'admin-response-message error';
            } finally {
                responseEl.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.textContent = '儲存守衛設定變更';
            }
        }
        
        async function handleGenerateReport() {
            DOMElements.generateReportBtn.disabled = true;
            DOMElements.generateReportBtn.textContent = '生成中...';
            DOMElements.overviewReportContainer.innerHTML = '<p>正在從伺服器計算數據，請稍候...</p>';
            try {
                const stats = await fetchAdminAPI('/game_overview');
                const rarityOrder = ["神話", "傳奇", "菁英", "稀有", "普通"];
                let rarityHtml = rarityOrder.map(rarity => `<div class="overview-card"><h4 class="stat-title">${rarity}怪獸數量</h4><p class="stat-value">${(stats.monsterRarityCount[rarity] || 0).toLocaleString()}</p></div>`).join('');
                DOMElements.overviewReportContainer.innerHTML = `<div class="overview-grid"><div class="overview-card"><h4 class="stat-title">總玩家數</h4><p class="stat-value">${(stats.totalPlayers || 0).toLocaleString()}</p></div><div class="overview-card"><h4 class="stat-title">全服金幣總量</h4><p class="stat-value">${(stats.totalGold || 0).toLocaleString()} 🪙</p></div><div class="overview-card"><h4 class="stat-title">全服DNA總數</h4><p class="stat-value">${(stats.totalDnaFragments || 0).toLocaleString()}</p></div>${rarityHtml}</div>`;
            } catch (err) { DOMElements.overviewReportContainer.innerHTML = `<p style="color: var(--danger-color);">生成報表失敗：${err.message}</p>`; }
            finally { DOMElements.generateReportBtn.disabled = false; DOMElements.generateReportBtn.textContent = '重新生成全服數據報表'; }
        }
        
        async function handleWipeAllData() {
            if (!confirm('您確定要啟動清除所有玩家資料的程序嗎？\n這是一個無法復原的毀滅性操作！')) {
                return;
            }

            const enteredPassword = prompt('為確保安全，請輸入您的管理員登入密碼：');
            if (enteredPassword === null) { 
                return;
            }
            if (!enteredPassword) {
                alert('密碼不能為空。操作已取消。');
                return;
            }

            const confirmationPhrase = '確認清除所有資料';
            const finalConfirmation = prompt(`這是最後的警告！此操作將刪除所有玩家帳號與遊戲資料。\n\n如果您完全了解後果，請在下方輸入「${confirmationPhrase}」來繼續：`);
            if (finalConfirmation !== confirmationPhrase) {
                alert('確認字串輸入錯誤。操作已取消。');
                return;
            }

            DOMElements.wipeAllDataBtn.disabled = true;
            DOMElements.wipeAllDataBtn.textContent = '清除中...請勿關閉視窗';
            
            try {
                const result = await fetchAdminAPI('/wipe_all_data', {
                    method: 'POST',
                    body: JSON.stringify({ password: enteredPassword })
                });

                alert(result.message || '操作成功完成！');
                localStorage.removeItem('admin_token');
                window.location.reload();

            } catch (err) {
                alert(`清除失敗：${err.message}`);
            } finally {
                DOMElements.wipeAllDataBtn.disabled = false;
                DOMElements.wipeAllDataBtn.textContent = '執行清除程序...';
            }
        }

        async function loadGameMechanics() {
            const { responseEl, saveBtn, ...mechInputs } = DOMElements.mechanics;
            Object.values(mechInputs).forEach(input => input.disabled = true);
            responseEl.style.display = 'none';

            try {
                const data = await fetchAdminAPI('/get_config?file=game_mechanics.json');
                
                mechInputs.critMultiplier.value = data.battle_formulas.crit_multiplier;
                mechInputs.dmgFormulaBase.value = data.battle_formulas.damage_formula_base_multiplier;
                mechInputs.dmgFormulaScaling.value = data.battle_formulas.damage_formula_attack_scaling;
                
                mechInputs.cultDiminishBase.value = data.cultivation_rules.diminishing_returns_base;
                mechInputs.cultDiminishWindow.value = data.cultivation_rules.diminishing_returns_time_window_seconds;
                mechInputs.cultBondGain.value = data.cultivation_rules.base_bond_gain_on_completion;
                mechInputs.expGainDivisor.value = data.cultivation_rules.exp_gain_duration_divisor;
                mechInputs.statPointsMin.value = data.cultivation_rules.stat_growth_points_per_chance[0];
                mechInputs.statPointsMax.value = data.cultivation_rules.stat_growth_points_per_chance[1];
                mechInputs.elementBias.value = data.cultivation_rules.elemental_bias_multiplier;

                Object.values(mechInputs).forEach(input => input.disabled = false);
            } catch (err) {
                responseEl.textContent = `載入遊戲機制設定失敗：${err.message}`;
                responseEl.className = 'admin-response-message error';
                responseEl.style.display = 'block';
            }
        }
        
        async function handleSaveGameMechanics() {
            const { responseEl, saveBtn, ...mechInputs } = DOMElements.mechanics;
            
            const newData = {
                battle_formulas: {
                    comment: "戰鬥相關公式參數",
                    crit_multiplier: parseFloat(mechInputs.critMultiplier.value),
                    damage_formula_base_multiplier: parseFloat(mechInputs.dmgFormulaBase.value),
                    damage_formula_attack_scaling: parseFloat(mechInputs.dmgFormulaScaling.value)
                },
                cultivation_rules: {
                    comment: "修煉系統相關規則",
                    diminishing_returns_base: parseFloat(mechInputs.cultDiminishBase.value),
                    diminishing_returns_time_window_seconds: parseInt(mechInputs.cultDiminishWindow.value, 10),
                    base_bond_gain_on_completion: parseInt(mechInputs.cultBondGain.value, 10),
                    exp_gain_duration_divisor: parseInt(mechInputs.expGainDivisor.value, 10),
                    stat_growth_points_per_chance: [
                        parseInt(mechInputs.statPointsMin.value, 10),
                        parseInt(mechInputs.statPointsMax.value, 10)
                    ],
                    elemental_bias_multiplier: parseFloat(mechInputs.elementBias.value)
                },
                absorption_rules: {
                    comment: "戰後吸收系統規則 (目前停用)",
                    score_ratio_min_cap: 0.5,
                    score_ratio_max_cap: 2.0,
                    stat_gain_variance: [0.8, 1.2],
                    max_gain_multiplier_for_non_hpmp: 2.0,
                    max_hpmp_stat_growth_on_absorb: 1.05,
                    bonus_hpmp_stat_growth_on_absorb: 0.5
                }
            };

            saveBtn.disabled = true;
            saveBtn.textContent = '儲存中...';
            responseEl.style.display = 'none';

            try {
                const result = await fetchAdminAPI('/save_game_mechanics', {
                    method: 'POST',
                    body: JSON.stringify(newData)
                });
                responseEl.textContent = result.message;
                responseEl.className = 'admin-response-message success';
            } catch (err) {
                responseEl.textContent = `儲存失敗：${err.message}`;
                responseEl.className = 'admin-response-message error';
            } finally {
                responseEl.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.textContent = '儲存機制設定';
            }
        }
        
        async function loadAndRenderElementalChart() {
            const container = DOMElements.elementalAdvantage.container;
            if (!container) return;

            container.innerHTML = '<p class="placeholder-text">正在載入屬性克制表...</p>';

            try {
                const chartData = await fetchAdminAPI('/get_config?file=battle/elemental_advantage_chart.json');
                const elements = ["火", "水", "木", "金", "土", "光", "暗", "毒", "風", "無", "混"];
                
                let tableHTML = '<div class="table-wrapper"><table class="elemental-chart-table"><thead><tr><th>攻擊方 ↓</th>';
                elements.forEach(def => {
                    tableHTML += `<th>${def} (防)</th>`;
                });
                tableHTML += '</tr></thead><tbody>';

                elements.forEach(atk => {
                    tableHTML += `<tr><td>${atk} (攻)</td>`;
                    elements.forEach(def => {
                        const value = chartData[atk]?.[def] ?? 1.0;
                        tableHTML += `<td><input type="number" class="admin-input elemental-input" data-atk="${atk}" data-def="${def}" value="${value}" step="0.1"></td>`;
                    });
                    tableHTML += '</tr>';
                });
                
                tableHTML += '</tbody></table></div>';
                container.innerHTML = tableHTML;

            } catch (err) {
                container.innerHTML = `<p class="placeholder-text" style="color:var(--danger-color);">載入克制表失敗：${err.message}</p>`;
            }
        }

        async function handleSaveElementalChart() {
            const container = DOMElements.elementalAdvantage.container;
            const saveBtn = DOMElements.elementalAdvantage.saveBtn;
            const responseEl = DOMElements.elementalAdvantage.responseEl;
            
            const newChartData = {};
            const inputs = container.querySelectorAll('.elemental-input');
            
            inputs.forEach(input => {
                const atk = input.dataset.atk;
                const def = input.dataset.def;
                const value = parseFloat(input.value) || 1.0;

                if (!newChartData[atk]) {
                    newChartData[atk] = {};
                }
                newChartData[atk][def] = value;
            });
            
            saveBtn.disabled = true;
            saveBtn.textContent = '儲存中...';
            responseEl.style.display = 'none';

            try {
                const result = await fetchAdminAPI('/save_elemental_advantage', {
                    method: 'POST',
                    body: JSON.stringify(newChartData)
                });
                responseEl.textContent = result.message;
                responseEl.className = 'admin-response-message success';
            } catch (err) {
                responseEl.textContent = `儲存失敗：${err.message}`;
                responseEl.className = 'admin-response-message error';
            } finally {
                responseEl.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.textContent = '儲存屬性克制表';
            }
        }

        async function loadCultivationSettings() {
            const { dnaFindChanceInput, dnaFindDivisorInput, lootTableContainer, statGrowthContainer } = DOMElements.cultivationSettings;
            lootTableContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
            statGrowthContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
            try {
                const settings = await fetchAdminAPI('/get_config?file=system/CultivationSettings.json');
                
                dnaFindChanceInput.value = (settings.dna_find_chance * 100).toFixed(1);
                dnaFindDivisorInput.value = settings.dna_find_duration_divisor;

                const rarities = ["普通", "稀有", "菁英", "傳奇", "神話"];
                let lootTableHtml = '<h4>拾獲DNA稀有度機率 (總和需為100)</h4>';
                lootTableHtml += '<div class="form-grid">';
                for (const rarity of rarities) {
                    lootTableHtml += `<div class="facility-settings-card" data-monster-rarity="${rarity}"><h5>怪獸稀有度: ${rarity}</h5>`;
                    const table = settings.dna_find_loot_table[rarity] || {};
                    for (const lootRarity of rarities) {
                        lootTableHtml += `<div class="form-group"><label>${lootRarity} (%)</label><input type="number" class="admin-input cult-loot-chance" data-loot-rarity="${lootRarity}" value="${(table[lootRarity] || 0) * 100}"></div>`;
                    }
                    lootTableHtml += '</div>';
                }
                lootTableHtml += '</div>';
                lootTableContainer.innerHTML = lootTableHtml;

                let statGrowthHtml = '<h4>各修煉地點數值成長權重</h4>';
                for (const locId in settings.location_biases) {
                    const loc = settings.location_biases[locId];
                    statGrowthHtml += `<div class="facility-settings-card" data-location-id="${locId}"><h5>${loc.name}</h5>`;
                    statGrowthHtml += '<div class="form-grid">';
                    for (const stat in loc.stat_growth_weights) {
                        statGrowthHtml += `<div class="form-group"><label>${stat.toUpperCase()}</label><input type="number" class="admin-input cult-stat-weight" data-stat="${stat}" value="${loc.stat_growth_weights[stat]}"></div>`;
                    }
                    statGrowthHtml += '</div></div>';
                }
                statGrowthContainer.innerHTML = statGrowthHtml;
            } catch (err) {
                lootTableContainer.innerHTML = `<p style="color: var(--danger-color);">載入失敗：${err.message}</p>`;
                statGrowthContainer.innerHTML = '';
            }
        }

        async function handleSaveCultivationSettings() {
            const { dnaFindChanceInput, dnaFindDivisorInput, lootTableContainer, statGrowthContainer, saveBtn, responseEl } = DOMElements.cultivationSettings;
            const newSettings = {
                dna_find_chance: parseFloat(dnaFindChanceInput.value) / 100,
                dna_find_duration_divisor: parseInt(dnaFindDivisorInput.value, 10),
                dna_find_loot_table: {},
                location_biases: {}
            };
            lootTableContainer.querySelectorAll('.facility-settings-card').forEach(card => {
                const monsterRarity = card.dataset.monsterRarity;
                newSettings.dna_find_loot_table[monsterRarity] = {};
                card.querySelectorAll('.cult-loot-chance').forEach(input => {
                    const lootRarity = input.dataset.lootRarity;
                    newSettings.dna_find_loot_table[monsterRarity][lootRarity] = parseFloat(input.value) / 100;
                });
            });
            statGrowthContainer.querySelectorAll('.facility-settings-card').forEach(card => {
                const locId = card.dataset.locationId;
                newSettings.location_biases[locId] = { name: card.querySelector('h5').textContent, stat_growth_weights: {}, element_bias: [] }; // Assume element_bias is not edited here
                card.querySelectorAll('.cult-stat-weight').forEach(input => {
                    const stat = input.dataset.stat;
                    newSettings.location_biases[locId].stat_growth_weights[stat] = parseInt(input.value, 10);
                });
            });

            saveBtn.disabled = true;
            saveBtn.textContent = '儲存中...';
            responseEl.style.display = 'none';
            try {
                const result = await fetchAdminAPI('/save_cultivation_settings', { method: 'POST', body: JSON.stringify(newSettings) });
                responseEl.textContent = result.message;
                responseEl.className = 'admin-response-message success';
            } catch (err) {
                responseEl.textContent = `儲存失敗：${err.message}`;
                responseEl.className = 'admin-response-message error';
            } finally {
                responseEl.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.textContent = '儲存修煉設定';
            }
        }


        // --- 事件綁定 ---
        DOMElements.navItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); switchTab(e.target.dataset.target); }));
        DOMElements.logoutBtn.addEventListener('click', () => { localStorage.removeItem('admin_token'); window.location.href = 'index.html'; });
        DOMElements.searchBtn.addEventListener('click', searchPlayer);
        DOMElements.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPlayer(); });
        DOMElements.searchResultsContainer.addEventListener('click', (e) => { const item = e.target.closest('.search-result-item'); if (item && item.dataset.uid) { fetchAndDisplayPlayerData(item.dataset.uid); } });
        
        DOMElements.dataDisplay.addEventListener('click', (e) => { 
            if (e.target.id === 'save-player-data-btn') handleSavePlayerData(); 
            if (e.target.id === 'send-player-mail-btn') handleSendPlayerMail(); 
            if (e.target.id === 'grant-exclusive-title-btn') handleGrantExclusiveTitle();
        });

        if (DOMElements.playerLogFilters) {
            DOMElements.playerLogFilters.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const category = e.target.dataset.logCategory;
                    DOMElements.playerLogFilters.querySelector('.active').classList.remove('active');
                    e.target.classList.add('active');
                    if (currentPlayerData) {
                        renderPlayerLogs(currentPlayerLogs, category);
                    }
                }
            });
        }
        
        DOMElements.broadcastBtn.addEventListener('click', handleBroadcastMail);
        DOMElements.saveSenderNameBtn.addEventListener('click', saveSenderPreset);
        DOMElements.broadcastSenderPresetsSelect.addEventListener('change', () => { if (DOMElements.broadcastSenderPresetsSelect.value) { DOMElements.broadcastSenderNameInput.value = DOMElements.broadcastSenderPresetsSelect.value; } });
        DOMElements.refreshLogBtn.addEventListener('click', loadBroadcastLog);
        DOMElements.broadcastLogContainer.addEventListener('click', handleRecallMail);
        if (DOMElements.refreshCsMailBtn) { DOMElements.refreshCsMailBtn.addEventListener('click', loadCsMail); }
        if (DOMElements.csMailContainer) { DOMElements.csMailContainer.addEventListener('click', handleCsMailActions); }
        if (DOMElements.advSettings.saveBtn) { DOMElements.advSettings.saveBtn.addEventListener('click', handleSaveAdventureSettings); } 
        if (DOMElements.advSettings.saveGrowthBtn) { DOMElements.advSettings.saveGrowthBtn.addEventListener('click', handleSaveAdventureGrowthSettings); }
        DOMElements.generateReportBtn.addEventListener('click', handleGenerateReport);
        if (DOMElements.refreshLogsBtn) { DOMElements.refreshLogsBtn.addEventListener('click', loadAndDisplayLogs); }
        if (DOMElements.guardianSettings.saveBtn) { DOMElements.guardianSettings.saveBtn.addEventListener('click', handleSaveChampionGuardians); }
        if (DOMElements.cultivationSettings.saveBtn) { DOMElements.cultivationSettings.saveBtn.addEventListener('click', handleSaveCultivationSettings); }
        
        if (typeof initializeConfigEditor === 'function') {
             initializeConfigEditor(ADMIN_API_URL, adminToken);
        }
        
        if (DOMElements.wipeAllDataBtn) {
            DOMElements.wipeAllDataBtn.addEventListener('click', handleWipeAllData);
        }
        
        if (DOMElements.mechanics.saveBtn) {
            DOMElements.mechanics.saveBtn.addEventListener('click', handleSaveGameMechanics);
        }

        if (DOMElements.elementalAdvantage.saveBtn) {
            DOMElements.elementalAdvantage.saveBtn.addEventListener('click', handleSaveElementalChart);
        }

        // --- 初始執行 ---
        updateTime();
        setInterval(updateTime, 1000);
        switchTab('dashboard-home');
        loadSenderPresets();
    }

    initializeApp();
});
