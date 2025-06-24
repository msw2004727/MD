document.addEventListener('DOMContentLoaded', () => {
    // --- 全域變數與初始化 ---
    const adminToken = localStorage.getItem('admin_token');
    
    // 【優化】動態獲取 API URL，如果全局 config.js 存在則使用，否則使用後備 URL
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

        // 玩家管理
        playerSearchInput: document.getElementById('player-uid-search'),
        playerSearchBtn: document.getElementById('search-player-btn'),
        playerDataEditor: document.getElementById('player-data-editor'),
        savePlayerDataBtn: document.getElementById('save-player-data-btn'),

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
                // 如果是 Token 錯誤，直接跳轉回登入頁
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
        DOMElements.mainContentSections.forEach(section => {
            section.classList.remove('active');
        });
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
        } catch (error) {
            console.error("載入遊戲總覽失敗:", error);
        }
    }

    // --- 玩家管理邏輯 ---
    async function searchPlayer() {
        const uid = DOMElements.playerSearchInput.value.trim();
        if (!uid) {
            showFeedback('提示', '請輸入玩家 UID。');
            return;
        }
        DOMElements.savePlayerDataBtn.disabled = true;
        DOMElements.playerDataEditor.value = "查詢中...";
        try {
            const data = await fetchAdminAPI(`/player_data?uid=${uid}`);
            DOMElements.playerDataEditor.value = JSON.stringify(data, null, 2);
            DOMElements.savePlayerDataBtn.disabled = false;
        } catch (error) {
            DOMElements.playerDataEditor.value = `查詢失敗: ${error.message}`;
        }
    }

    async function savePlayerData() {
        const uid = DOMElements.playerSearchInput.value.trim();
        const content = DOMElements.playerDataEditor.value;
        if (!uid) return;

        try {
            const dataToSave = JSON.parse(content);
            DOMElements.savePlayerDataBtn.textContent = "儲存中...";
            DOMElements.savePlayerDataBtn.disabled = true;

            const result = await fetchAdminAPI(`/player_data/${uid}`, {
                method: 'POST',
                body: JSON.stringify(dataToSave)
            });
            
            // 【優化】儲存成功後，清空編輯器並提示用戶重新查詢以獲取最新資料
            DOMElements.playerDataEditor.value = "儲存成功！請重新查詢以檢視最新資料。";
            DOMElements.savePlayerDataBtn.disabled = true;
            showFeedback('成功', result.message);

        } catch (error) {
            showFeedback('儲存失敗', `資料格式錯誤或API請求失敗: ${error.message}`);
        } finally {
            DOMElements.savePlayerDataBtn.textContent = "儲存玩家資料變更";
            // 注意：這裡不把 disabled 設回 false，強制使用者重新查詢
        }
    }
    
    // --- 廣播系統邏輯 ---
    async function loadBroadcastLog() {
        try {
            const logs = await fetchAdminAPI('/get_broadcast_log');
            const tableBody = DOMElements.broadcastLogTableBody;
            tableBody.innerHTML = '';
            logs.forEach(log => {
                const row = tableBody.insertRow();
                const timestamp = new Date(log.timestamp * 1000).toLocaleString('zh-TW', { hour12: false });
                const payloadStr = JSON.stringify(log.payload || {});

                row.innerHTML = `
                    <td>${timestamp}</td>
                    <td>${log.title}</td>
                    <td>${log.content}</td>
                    <td><textarea rows="1" readonly>${payloadStr}</textarea></td>
                    <td><button class="btn btn-danger" data-id="${log.broadcastId}">撤回</button></td>
                `;
            });
        } catch (error) {
            console.error("載入廣播紀錄失敗:", error);
        }
    }

    async function sendBroadcast() {
        const payload = {
            sender_name: DOMElements.broadcastSenderInput.value,
            title: DOMElements.broadcastTitleInput.value,
            content: DOMElements.broadcastContentInput.value,
            payload_str: DOMElements.broadcastPayloadInput.value || '{}'
        };
        if (!payload.title || !payload.content) {
            showFeedback('錯誤', '標題和內容不能為空。');
            return;
        }
        try {
            JSON.parse(payload.payload_str);
        } catch {
            showFeedback('錯誤', '附件的 JSON 格式不正確。');
            return;
        }

        try {
            const result = await fetchAdminAPI('/broadcast_mail', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showFeedback('成功', result.message);
            // 清空輸入框
            DOMElements.broadcastTitleInput.value = '';
            DOMElements.broadcastContentInput.value = '';
            DOMElements.broadcastPayloadInput.value = '';
            loadBroadcastLog(); // 重新載入紀錄
        } catch (error) {
            console.error("廣播失敗:", error);
        }
    }

    DOMElements.broadcastLogTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-danger')) {
            const broadcastId = e.target.dataset.id;
            if (confirm(`您確定要撤回這封廣播嗎？(此操作僅從日誌中移除，功能待擴充)`)) {
                try {
                    await fetchAdminAPI('/recall_mail', {
                        method: 'POST',
                        body: JSON.stringify({ broadcastId })
                    });
                    loadBroadcastLog();
                } catch (error) {
                   console.error("撤回失敗:", error);
                }
            }
        }
    });

    // --- 設定檔編輯器邏輯 ---
    async function loadAndPopulateConfigsDropdown() {
        try {
            const files = await fetchAdminAPI('/list_configs');
            const selector = DOMElements.configFileSelector;
            while (selector.options.length > 1) {
                selector.remove(1);
            }
            files.forEach(file => {
                selector.add(new Option(file, file));
            });
        } catch (error) {
            console.error("載入設定檔列表失敗:", error);
        }
    }

    async function loadSelectedConfig() {
        const selectedFile = DOMElements.configFileSelector.value;
        if (!selectedFile) {
            DOMElements.configDisplayArea.value = '';
            DOMElements.saveConfigBtn.disabled = true;
            return;
        }
        DOMElements.configDisplayArea.value = "載入中...";
        try {
            const data = await fetchAdminAPI(`/get_config?file=${encodeURIComponent(selectedFile)}`);
            DOMElements.configDisplayArea.value = JSON.stringify(data, null, 2);
            DOMElements.saveConfigBtn.disabled = false;
        } catch (error) {
            DOMElements.configDisplayArea.value = `載入失敗: ${error.message}`;
            DOMElements.saveConfigBtn.disabled = true;
        }
    }
    
    async function saveConfig() {
        const selectedFile = DOMElements.configFileSelector.value;
        const content = DOMElements.configDisplayArea.value;
        if (!selectedFile) return;

        try {
            JSON.parse(content);
            DOMElements.saveConfigBtn.textContent = '儲存中...';
            DOMElements.saveConfigBtn.disabled = true;
            const result = await fetchAdminAPI('/save_config', {
                method: 'POST',
                body: JSON.stringify({ file: selectedFile, content })
            });
            showFeedback('成功', result.message);
        } catch (error) {
            showFeedback('儲存失敗', `資料格式錯誤或API請求失敗: ${error.message}`);
        } finally {
            DOMElements.saveConfigBtn.textContent = '儲存設定變更';
            DOMElements.saveConfigBtn.disabled = false;
        }
    }

    // --- 事件綁定 ---
    DOMElements.logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('admin_token');
        window.location.href = 'index.html';
    });
    
    DOMElements.playerSearchBtn.addEventListener('click', searchPlayer);
    // 【優化】增加 Enter 鍵觸發搜尋
    DOMElements.playerSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            searchPlayer();
        }
    });

    DOMElements.savePlayerDataBtn.addEventListener('click', savePlayerData);
    DOMElements.sendBroadcastBtn.addEventListener('click', sendBroadcast);
    DOMElements.configFileSelector.addEventListener('change', loadSelectedConfig);
    DOMElements.saveConfigBtn.addEventListener('click', saveConfig);
    DOMElements.feedbackCloseBtn.addEventListener('click', () => DOMElements.feedbackModal.style.display = 'none');


    // --- 初始載入 ---
    loadGameOverview();
});
