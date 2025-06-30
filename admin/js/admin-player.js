// admin/js/admin-player.js

function initializePlayerManagement(DOMElements) {
    let currentPlayerData = null;
    let currentPlayerLogs = [];

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
            const cleanMessage = log.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
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
            const allButton = DOMElements.playerLogFilters.querySelector('button[data-log-category="全部"]');
            if(allButton) allButton.classList.add('active');
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
            const data = await window.fetchAdminAPI(`/player_data?uid=${uid}`);
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
                const result = await window.fetchAdminAPI(`/players/search?nickname=${encodeURIComponent(query)}&limit=10`);
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
            const result = await window.fetchAdminAPI(`/player_data/${dataToUpdate.uid}`, { method: 'POST', body: JSON.stringify(dataToUpdate) });
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
            const result = await window.fetchAdminAPI(`/send_mail_to_player`, { method: 'POST', body: JSON.stringify({ recipient_id: currentPlayerData.uid, title, content, sender_name: senderName.trim() || '遊戲管理員' }) });
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
            const result = await window.fetchAdminAPI('/grant_exclusive_title', {
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

    // 事件綁定
    DOMElements.searchBtn.addEventListener('click', searchPlayer);
    DOMElements.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchPlayer(); });
    DOMElements.searchResultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item && item.dataset.uid) {
            fetchAndDisplayPlayerData(item.dataset.uid);
        }
    });
    
    DOMElements.dataDisplay.addEventListener('click', (e) => {
        if (e.target.id === 'save-player-data-btn') handleSavePlayerData();
        if (e.target.id === 'send-player-mail-btn') handleSendPlayerMail();
        if (e.target.id === 'grant-exclusive-title-btn') handleGrantExclusiveTitle();
    });

    if (DOMElements.playerLogFilters) {
        DOMElements.playerLogFilters.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const category = e.target.dataset.logCategory;
                const currentActive = DOMElements.playerLogFilters.querySelector('.active');
                if(currentActive) currentActive.classList.remove('active');
                e.target.classList.add('active');
                if (currentPlayerData) {
                    renderPlayerLogs(currentPlayerLogs, category);
                }
            }
        });
    }
}
