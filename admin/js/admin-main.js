// admin/js/admin-main.js

document.addEventListener('DOMContentLoaded', function() {
    
    function initializeApp() {
        const adminToken = localStorage.getItem('admin_token');
        const ADMIN_API_URL = 'https://md-server-5wre.onrender.com/api/MD';

        if (!adminToken) {
            window.location.href = 'index.html';
            return;
        }

        const DOMElements = initializeDOMElements();
        let logIntervalId = null;

        // --- 通用函式 ---
        window.fetchAdminAPI = async function(endpoint, options = {}) {
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
            
            // 根據頁籤觸發對應的初始化函式
            if (targetId === 'dashboard-home' && typeof initializeOverview === 'function') initializeOverview();
            if (targetId === 'mail-system' && typeof initializeMailSystem === 'function') initializeMailSystem();
            if (targetId === 'cs-mailbox' && typeof initializeCsMailbox === 'function') initializeCsMailbox();
            if (targetId === 'adventure-island-settings' && typeof initializeAdventureSettings === 'function') initializeAdventureSettings();
            if (targetId === 'champion-guardians-settings' && typeof initializeGuardianSettings === 'function') initializeGuardianSettings();
            if (targetId === 'cultivation-settings' && typeof initializeCultivationSettings === 'function') initializeCultivationSettings();
            if (targetId === 'game-mechanics' && typeof initializeMechanicsSettings === 'function') initializeMechanicsSettings();
            if (targetId === 'elemental-advantage' && typeof initializeElementalSettings === 'function') initializeElementalSettings();
            if (targetId === 'log-monitoring') {
                if (typeof initializeLogMonitoring === 'function') {
                    logIntervalId = initializeLogMonitoring(DOMElements);
                }
            }
            if (targetId === 'game-configs' && typeof initializeConfigEditor === 'function') {
                initializeConfigEditor(ADMIN_API_URL, adminToken);
            }
        }

        // --- 事件綁定 ---
        DOMElements.navItems.forEach(item => item.addEventListener('click', (e) => { e.preventDefault(); switchTab(e.target.dataset.target); }));
        DOMElements.logoutBtn.addEventListener('click', () => { localStorage.removeItem('admin_token'); window.location.href = 'index.html'; });

        // 初始化所有其他模組
        if(typeof initializeDOMElements === 'function') initializeDOMElements();
        if(typeof initializePlayerManagement === 'function') initializePlayerManagement(DOMElements);

        // --- 初始執行 ---
        updateTime();
        setInterval(updateTime, 1000);
        switchTab('dashboard-home');
    }

    initializeApp();
});
