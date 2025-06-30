// admin/js/admin-logs.js

function initializeLogMonitoring() {
    const DOMElements = window.DOMElements || initializeDOMElements();
    const adminToken = localStorage.getItem('admin_token');
    const ADMIN_API_URL = 'https://md-server-5wre.onrender.com/api/MD';
    
    const container = DOMElements.logDisplayContainer;
    const refreshBtn = DOMElements.refreshLogsBtn;

    async function loadAndDisplayLogs() {
        if (!container) return;
        
        const oldScrollHeight = container.scrollHeight;
        const oldScrollTop = container.scrollTop;
        const isScrolledToBottom = oldScrollHeight - container.clientHeight <= oldScrollTop + 1;

        try {
            const response = await fetch(`${ADMIN_API_URL}/logs?_=${new Date().getTime()}`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
            if (!response.ok) throw new Error(`伺服器錯誤: ${response.status} ${response.statusText}`);
            
            const htmlContent = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, "text/html");
            const logEntries = doc.body.innerHTML;
            
            container.innerHTML = logEntries || '<p>日誌目前為空。</p>';
            
            if (isScrolledToBottom) {
                container.scrollTop = container.scrollHeight;
            } else {
                const newScrollHeight = container.scrollHeight;
                container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
            }
        } catch (err) {
            container.innerHTML = `<p style="color: var(--danger-color);">載入日誌失敗：${err.message}</p>`;
        }
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAndDisplayLogs);
    }
    
    loadAndDisplayLogs();
    return setInterval(loadAndDisplayLogs, 10000);
}
