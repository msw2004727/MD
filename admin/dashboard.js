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
                baseGoldInput: document.getElementById('floor-clear-base-gold'),
                bonusGoldInput: document.getElementById('floor-clear-bonus-gold'),
                facilitiesContainer: document.getElementById('adventure-facilities-container'),
                saveBtn: document.getElementById('save-adventure-settings-btn'),
                responseEl: document.getElementById('adventure-settings-response'),
                // --- 核心修改處 START ---
                growthFacilitiesContainer: document.getElementById('adventure-growth-facilities-container'),
                growthStatsContainer: document.getElementById('adventure-growth-stats-container'),
                saveGrowthBtn: document.getElementById('save-adventure-growth-settings-btn'),
                growthResponseEl: document.getElementById('adventure-growth-settings-response'),
                // --- 核心修改處 END ---
            },

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
            }
        }

        // --- 日誌監控邏輯 ---
        async function loadAndDisplayLogs() {
            if (!DOMElements.logDisplayContainer) return;
            const container = DOMElements.logDisplayContainer;
            const oldScrollHeight = container.scrollHeight;
            const oldScrollTop = container.scrollTop;
            try {
                const response = await fetch(`${ADMIN_API_URL}/logs`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
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
                    // 改用 fetch 直接呼叫正確的 API 路徑
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
                alert(`發送失敗：${err.message}`);
            } finally {
                btn.disabled = false;
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

        // --- 核心修改處 START ---
        // 冒險島設定邏輯
        async function loadAdventureSettings() {
            const { bossMultiplierInput, baseGoldInput, bonusGoldInput, facilitiesContainer, growthFacilitiesContainer, growthStatsContainer } = DOMElements.advSettings;
            if (!bossMultiplierInput || !growthFacilitiesContainer) return;

            // 清空舊內容
            bossMultiplierInput.value = '';
            baseGoldInput.value = '';
            bonusGoldInput.value = '';
            facilitiesContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
            growthFacilitiesContainer.innerHTML = '<p class="placeholder-text">載入中...</p>';
            growthStatsContainer.innerHTML = '';


            try {
                const [advSettings, islandsData, growthSettings] = await Promise.all([
                    fetchAdminAPI('/get_config?file=adventure_settings.json'),
                    fetchAdminAPI('/get_config?file=adventure_islands.json'),
                    fetchAdminAPI('/get_config?file=adventure_growth_settings.json')
                ]);

                // 渲染全域參數
                bossMultiplierInput.value = advSettings.boss_difficulty_multiplier_per_floor || 1.1;
                baseGoldInput.value = advSettings.floor_clear_base_gold || 50;
                bonusGoldInput.value = advSettings.floor_clear_bonus_gold_per_floor || 10;
                
                // 渲染設施入場費
                if (islandsData && Array.isArray(islandsData)) {
                    facilitiesContainer.innerHTML = islandsData.map(island => `
                        <div class="facility-settings-card" data-island-id="${island.islandId}">
                            <h4>${island.islandName || '未知島嶼'}</h4>
                            ${(island.facilities || []).map(facility => `
                                <div class="form-group">
                                    <label for="facility-cost-${facility.facilityId}">${facility.name} - 入場費</label>
                                    <input type="number" id="facility-cost-${facility.facilityId}" data-facility-id="${facility.facilityId}" class="admin-input" value="${facility.cost || 0}">
                                </div>
                            `).join('')}
                        </div>
                    `).join('');
                } else {
                    facilitiesContainer.innerHTML = '<p class="placeholder-text">找不到設施資料。</p>';
                }
                
                // 渲染隨機成長參數
                if (growthSettings && growthSettings.facilities) {
                    const facilityNames = {};
                    islandsData.forEach(island => island.facilities.forEach(f => { facilityNames[f.facilityId] = f.name; }));

                    growthFacilitiesContainer.innerHTML = Object.entries(growthSettings.facilities).map(([id, settings]) => `
                        <div class="facility-settings-card">
                            <h4>${facilityNames[id] || id}</h4>
                            <div class="form-group">
                                <label for="growth-chance-${id}">成長觸發機率 (%)</label>
                                <input type="number" id="growth-chance-${id}" data-facility-id="${id}" data-setting="growth_chance" class="admin-input" value="${(settings.growth_chance * 100).toFixed(1)}" step="0.1" min="0" max="100">
                            </div>
                             <div class="form-group">
                                <label for="growth-points-${id}">成長點數</label>
                                <input type="number" id="growth-points-${id}" data-facility-id="${id}" data-setting="growth_points" class="admin-input" value="${settings.growth_points}" step="1" min="0">
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
                            <input type="number" id="stat-weight-${stat}" data-stat-name="${stat}" class="admin-input" value="${weight}" step="1" min="0">
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
        // --- 核心修改處 END ---

        async function handleSaveAdventureSettings() {
            const { bossMultiplierInput, baseGoldInput, bonusGoldInput, facilitiesContainer, saveBtn, responseEl } = DOMElements.advSettings;
            
            const globalSettings = {
                boss_difficulty_multiplier_per_floor: parseFloat(bossMultiplierInput.value) || 1.1,
                floor_clear_base_gold: parseInt(baseGoldInput.value, 10) || 50,
                floor_clear_bonus_gold_per_floor: parseInt(bonusGoldInput.value, 10) || 10,
            };

            const facilitiesSettings = [];
            facilitiesContainer.querySelectorAll('input[data-facility-id]').forEach(input => {
                facilitiesSettings.push({
                    id: input.dataset.facilityId,
                    cost: parseInt(input.value, 10) || 0
                });
            });

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

        // --- 儀表板總覽邏輯 ---
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
        
        // --- 事件綁定 ---
        DOMElements.navItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); switchTab(e.target.dataset.target); }));
        DOMElements.logoutBtn.addEventListener('click', () => { localStorage.removeItem('admin_token'); window.location.href = 'index.html'; });
        DOMElements.searchBtn.addEventListener('click', searchPlayer);
        DOMElements.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPlayer(); });
        DOMElements.searchResultsContainer.addEventListener('click', (e) => { const item = e.target.closest('.search-result-item'); if (item && item.dataset.uid) { fetchAndDisplayPlayerData(item.dataset.uid); } });
        DOMElements.dataDisplay.addEventListener('click', (e) => { 
            if (e.target.id === 'save-player-data-btn') handleSavePlayerData(); 
            if (e.target.id === 'send-player-mail-btn') handleSendPlayerMail(); 
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
        DOMElements.generateReportBtn.addEventListener('click', handleGenerateReport);
        if (DOMElements.refreshLogsBtn) { DOMElements.refreshLogsBtn.addEventListener('click', loadAndDisplayLogs); }
        
        if (typeof initializeConfigEditor === 'function') {
             initializeConfigEditor(ADMIN_API_URL, adminToken);
        }
        
        // --- 初始執行 ---
        updateTime();
        setInterval(updateTime, 1000);
        switchTab('dashboard-home');
        loadSenderPresets();
    }

    // 執行主初始化函式
    initializeApp();
});
