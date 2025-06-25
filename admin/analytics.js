// admin/analytics.js - 營運儀表板的數據處理與渲染邏輯

// 使用 DOMContentLoaded 確保在 HTML 完全載入後才執行
document.addEventListener('DOMContentLoaded', () => {
    // 獲取所有需要的 DOM 元素
    const analyticsPanel = document.getElementById('analytics-dashboard');
    if (!analyticsPanel) {
        // 如果頁面上沒有這個面板，就什麼都不做
        return;
    }

    const controlsContainer = document.getElementById('analytics-controls');
    const kpiContainer = document.getElementById('analytics-kpi-cards');
    const engagementContainer = document.getElementById('analytics-engagement-charts');
    const economyContainer = document.getElementById('analytics-economy-report');
    const ecologyContainer = document.getElementById('analytics-monster-ecology');

    let chartInstances = {}; // 用於存放已初始化的圖表，方便更新

    /**
     * 初始化儀表板，建立控制項並載入預設數據
     */
    function initializeAnalyticsDashboard() {
        console.log("Initializing Analytics Dashboard...");
        createControls();
        // 載入預設為過去7天的數據
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 6);
        
        document.getElementById('analytics-start-date').value = formatDate(startDate);
        document.getElementById('analytics-end-date').value = formatDate(endDate);

        fetchAndRenderData();
    }

    /**
     * 建立日期選擇器和查詢按鈕
     */
    function createControls() {
        controlsContainer.innerHTML = `
            <div class="form-group">
                <label for="analytics-start-date">開始日期</label>
                <input type="date" id="analytics-start-date" class="admin-input">
            </div>
            <div class="form-group">
                <label for="analytics-end-date">結束日期</label>
                <input type="date" id="analytics-end-date" class="admin-input">
            </div>
            <button id="analytics-fetch-btn" class="button primary">查詢數據</button>
        `;

        document.getElementById('analytics-fetch-btn').addEventListener('click', fetchAndRenderData);
    }

    /**
     * 從後端 API 獲取數據並觸發渲染
     */
    async function fetchAndRenderData() {
        const startDate = document.getElementById('analytics-start-date').value;
        const endDate = document.getElementById('analytics-end-date').value;
        const fetchBtn = document.getElementById('analytics-fetch-btn');
        
        if (!startDate || !endDate) {
            alert('請選擇有效的開始與結束日期。');
            return;
        }

        fetchBtn.disabled = true;
        fetchBtn.textContent = '載入中...';
        setPlaceholders(true);

        try {
            const adminToken = localStorage.getItem('admin_token');
            const response = await fetch(`https://md-server-5wre.onrender.com/api/MD/admin/analytics?start=${startDate}&end=${endDate}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '獲取數據失敗');
            }
            
            const data = await response.json();
            
            // 使用獲取的數據渲染各個區塊
            renderKPIs(data.summary);
            renderEngagement(data.playerEngagement);
            renderEconomy(data.economy);
            renderMonsterEcology(data.monsterEcology);

        } catch (error) {
            console.error('獲取營運數據時發生錯誤:', error);
            kpiContainer.innerHTML = `<p class="placeholder-text error">獲取數據失敗: ${error.message}</p>`;
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.textContent = '查詢數據';
            setPlaceholders(false);
        }
    }

    /**
     * 渲染核心指標 (KPI) 卡片
     */
    function renderKPIs(summary) {
        if (!summary) return;
        kpiContainer.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-title">新註冊玩家</div>
                <div class="kpi-value">${summary.newUsers || 0}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">活躍玩家 (DAU)</div>
                <div class="kpi-value">${summary.activeUsers?.dau || 0}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">伺服器總玩家</div>
                <div class="kpi-value">${summary.totalPlayers || 0}</div>
            </div>
        `;
    }
    
    /**
     * 渲染玩家參與度區塊 (包含圖表)
     */
    function renderEngagement(engagement) {
        if (!engagement) return;
        // 準備一個 canvas 給圖表使用
        engagementContainer.innerHTML = `
            <p>總交戰次數: <strong>${engagement.totalBattles || 0}</strong></p>
            <p>總合成次數: <strong>${engagement.totalCombinations || 0}</strong></p>
            <p>AI對話次數: <strong>${engagement.aiChatMessages || 0}</strong></p>
            <div class="chart-container">
                <canvas id="cultivationChart"></canvas>
            </div>
        `;

        // 繪製圖表 (需要 Chart.js 函式庫)
        if (window.Chart && engagement.cultivationByLocation) {
            const ctx = document.getElementById('cultivationChart').getContext('2d');
            const labels = Object.keys(engagement.cultivationByLocation);
            const data = Object.values(engagement.cultivationByLocation);
            
            // 如果圖表已存在，先銷毀
            if (chartInstances.cultivation) {
                chartInstances.cultivation.destroy();
            }

            chartInstances.cultivation = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '各場所修煉次數',
                        data: data,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    }

    /**
     * 渲染經濟報告
     */
    function renderEconomy(economy) {
        if (!economy) return;

        const formatList = (title, data) => {
            let listHtml = `<h4>${title}</h4><ul>`;
            if (Object.keys(data || {}).length > 0) {
                listHtml += Object.entries(data).map(([key, value]) => `<li>${key}: <strong>${value.toLocaleString()}</strong></li>`).join('');
            } else {
                listHtml += '<li>無相關紀錄</li>';
            }
            listHtml += '</ul>';
            return listHtml;
        };

        economyContainer.innerHTML = `
            <p>伺服器金幣總存量: <strong>${(economy.totalGoldInServer || 0).toLocaleString()} 🪙</strong></p>
            <div class="dashboard-grid">
                <div>${formatList('金幣產生源 (Faucets)', economy.goldFaucets)}</div>
                <div>${formatList('金幣回收處 (Sinks)', economy.goldSinks)}</div>
            </div>
        `;
    }
    
    /**
     * 渲染怪獸生態表格
     */
    function renderMonsterEcology(ecology) {
        if (!ecology || !ecology.created) return;
        // 這裡可以擴充成顯示 created, existing, nearDeathEvents, healEvents 等多個表格
        const tableHtml = createEcologyTable('怪獸產生統計', ecology.created);
        ecologyContainer.innerHTML = tableHtml;
    }

    function createEcologyTable(title, data) {
        const rarities = ["普通", "稀有", "菁英", "傳奇", "神話"];
        const elements = Object.keys(data);
        
        let html = `<h4>${title}</h4><table class="analytics-table">`;
        html += `<thead><tr><th>屬性</th>${rarities.map(r => `<th>${r}</th>`).join('')}</tr></thead>`;
        html += `<tbody>`;
        elements.forEach(el => {
            html += `<tr><td>${el}</td>`;
            rarities.forEach(rarity => {
                html += `<td>${data[el]?.[rarity] || 0}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        return html;
    }

    /**
     * 輔助函式：格式化日期為 YYYY-MM-DD
     */
    function formatDate(date) {
        const d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();
        return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
    }
    
    /**
     * 輔助函式：設定佔位符顯示狀態
     */
    function setPlaceholders(isLoading) {
        if(isLoading) {
            kpiContainer.innerHTML = `<p class="placeholder-text">載入中...</p>`;
            engagementContainer.innerHTML = `<p class="placeholder-text">載入中...</p>`;
            economyContainer.innerHTML = `<p class="placeholder-text">載入中...</p>`;
            ecologyContainer.innerHTML = `<p class="placeholder-text">載入中...</p>`;
        }
    }


    // --- 初始化 ---
    // 我們需要一個機制來觸發這個初始化函式，
    // 這會在下一步修改 dashboard.js 時完成。
    // 目前，我們可以先手動在 console 中呼叫 `initializeAnalyticsDashboard()` 來測試。
    window.initializeAnalyticsDashboard = initializeAnalyticsDashboard;
});
