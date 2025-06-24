document.addEventListener('DOMContentLoaded', () => {
    // --- 全域變數與初始化 ---
    const adminToken = localStorage.getItem('admin_token');
    const API_BASE_URL = (typeof window.API_BASE_URL !== 'undefined') 
        ? window.API_BASE_URL 
        : 'https://md-server-5wre.onrender.com/api/MD'; 

    const DOMElements = {
        sidebarLinks: document.querySelectorAll('.nav-link'),
        mainContentSections: document.querySelectorAll('.admin-section'),
        logoutBtn: document.getElementById('logout-btn'),

        // 儀表板
        totalPlayers: document.getElementById('total-players'),
        totalGold: document.getElementById('total-gold'),
        totalDna: document.getElementById('total-dna'),
        rarityDistribution: document.getElementById('monster-rarity-distribution'),

        // 【修改】玩家管理
        playerSearchInput: document.getElementById('player-uid-search'),
        playerSearchBtn: document.getElementById('search-player-btn'),
        playerDataDisplay: document.getElementById('player-data-display'), // 新增

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
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        };
        options.headers = { ...defaultHeaders, ...options.headers };

        try {
            const response = await fetch(`${API_BASE_URL}/admin${endpoint}`, options);
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
            showFeedback('API 請求失敗', error.message);
            throw error;
        }
    }

    // --- 彈窗函式 ---
    function showFeedback(title, message) {
        DOMElements.feedbackTitle.textContent = title;
        DOMElements.feedbackMessage.textContent = message;
        DOMElements.feedbackModal.style.display = 'flex';
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
    async function loadGameOverview() {
        try {
            const data = await fetchAdminAPI('/game_overview');
            DOMElements.totalPlayers.textContent = data.totalPlayers.toLocaleString();
            DOMElements.totalGold.textContent = data.totalGold.toLocaleString();
            DOMElements.totalDna.textContent = data.totalDnaFragments.toLocaleString();
            
            const rarityContainer = DOMElements.rarityDistribution;
            rarityContainer.innerHTML = '';
            for (const [rarity, count] of Object.entries(data.monsterRarityCount)) {
                const item = document.createElement('div');
                item.className = 'rarity-item';
                item.innerHTML = `<span class="rarity-name">${rarity}</span><span class="rarity-count">${count.toLocaleString()}</span>`;
                rarityContainer.appendChild(item);
            }
        } catch (error) { console.error("載入遊戲總覽失敗:", error); }
    }

    // --- 【核心修改】玩家管理渲染邏輯 ---
    function renderPlayerStatsCard(stats) {
        const equippedTitle = stats.titles.find(t => t.id === stats.equipped_title_id) || { name: '無' };
        return `
            <div class="stat-card">
                <h3>玩家統計</h3>
                <p style="font-size: 1.5rem; color: var(--text-primary);">${stats.nickname || '未知'} <span style="font-size:0.8rem; color: var(--text-secondary);">(UID: ${stats.uid})</span></p>
                <div class="stats-grid" style="margin-top: 1rem;">
                    <div><strong>總積分:</strong> ${stats.score.toLocaleString()}</div>
                    <div><strong>金幣:</strong> ${stats.gold.toLocaleString()} 🪙</div>
                    <div><strong>勝場:</strong> ${stats.wins}</div>
                    <div><strong>敗場:</strong> ${stats.losses}</div>
                    <div><strong>已裝備稱號:</strong> ${equippedTitle.name}</div>
                </div>
            </div>
        `;
    }

    function renderMonstersTable(monsters) {
        if (!monsters || monsters.length === 0) {
            return `
                <div class="sub-section">
                    <h3>持有怪獸 (0)</h3>
                    <p class="placeholder-text" style="padding:1rem;">該玩家沒有任何怪獸。</p>
                </div>`;
        }
        let tableRows = '';
        monsters.forEach(m => {
            tableRows += `
                <tr>
                    <td>${m.nickname}</td>
                    <td>${m.rarity}</td>
                    <td>${m.elements.join(', ')}</td>
                    <td>${m.score}</td>
                </tr>`;
        });
        return `
            <div class="sub-section">
                <h3>持有怪獸 (${monsters.length})</h3>
                <div class="table-container">
                    <table>
                        <thead><tr><th>暱稱</th><th>稀有度</th><th>屬性</th><th>評價</th></tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderDnaInventory(dnaList) {
        const dnaItems = (dnaList || []).filter(d => d);
        if (dnaItems.length === 0) return '';
        
        let dnaHtml = '';
        dnaItems.forEach(d => {
            dnaHtml += `<div class="dna-item-admin">${d.name} (${d.rarity})</div>`;
        });

        return `
             <div class="sub-section">
                <h3>DNA 庫存 (${dnaItems.length})</h3>
                <div class="dna-grid">${dnaHtml}</div>
            </div>
        `;
    }

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
            // 可以加入更多卡片，如好友列表、信箱等
            displayHtml += '</div>';

            displayHtml += renderMonstersTable(data.farmedMonsters);
            displayHtml += renderDnaInventory(data.playerOwnedDNA);

            DOMElements.playerDataDisplay.innerHTML = displayHtml;
        } catch (error) {
            DOMElements.playerDataDisplay.innerHTML = `<p class="placeholder-text" style="color:var(--accent-danger);">查詢失敗: ${error.message}</p>`;
        }
    }

    // --- 廣播系統邏輯 (與之前相同) ---
    async function loadBroadcastLog() { /* ... */ }
    async function sendBroadcast() { /* ... */ }
    DOMElements.broadcastLogTableBody.addEventListener('click', async (e) => { /* ... */ });
    
    // --- 設定檔編輯器邏輯 (與之前相同) ---
    async function loadAndPopulateConfigsDropdown() { /* ... */ }
    async function loadSelectedConfig() { /* ... */ }
    async function saveConfig() { /* ... */ }


    // --- 事件綁定 ---
    DOMElements.logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('admin_token');
        window.location.href = 'index.html';
    });
    
    DOMElements.playerSearchBtn.addEventListener('click', searchPlayer);
    DOMElements.playerSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchPlayer();
    });
    
    // 【移除】儲存按鈕的事件監聽
    // DOMElements.savePlayerDataBtn.addEventListener('click', savePlayerData); 

    DOMElements.sendBroadcastBtn.addEventListener('click', sendBroadcast);
    DOMElements.configFileSelector.addEventListener('change', loadSelectedConfig);
    DOMElements.saveConfigBtn.addEventListener('click', saveConfig);
    DOMElements.feedbackCloseBtn.addEventListener('click', () => DOMElements.feedbackModal.style.display = 'none');


    // --- 初始載入 ---
    loadGameOverview();
});
