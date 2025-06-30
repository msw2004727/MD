// admin/js/admin-overview.js

function initializeOverview() {
    const DOMElements = window.DOMElements || initializeDOMElements();
    const generateReportBtn = DOMElements.generateReportBtn;
    const overviewReportContainer = DOMElements.overviewReportContainer;
    const wipeAllDataBtn = DOMElements.wipeAllDataBtn;

    async function handleGenerateReport() {
        generateReportBtn.disabled = true;
        generateReportBtn.textContent = '生成中...';
        overviewReportContainer.innerHTML = '<p>正在從伺服器計算數據，請稍候...</p>';
        try {
            const stats = await window.fetchAdminAPI('/game_overview');
            const rarityOrder = ["神話", "傳奇", "菁英", "稀有", "普通"];
            let rarityHtml = rarityOrder.map(rarity => `<div class="overview-card"><h4 class="stat-title">${rarity}怪獸數量</h4><p class="stat-value">${(stats.monsterRarityCount[rarity] || 0).toLocaleString()}</p></div>`).join('');
            overviewReportContainer.innerHTML = `<div class="overview-grid"><div class="overview-card"><h4 class="stat-title">總玩家數</h4><p class="stat-value">${(stats.totalPlayers || 0).toLocaleString()}</p></div><div class="overview-card"><h4 class="stat-title">全服金幣總量</h4><p class="stat-value">${(stats.totalGold || 0).toLocaleString()} 🪙</p></div><div class="overview-card"><h4 class="stat-title">全服DNA總數</h4><p class="stat-value">${(stats.totalDnaFragments || 0).toLocaleString()}</p></div>${rarityHtml}</div>`;
        } catch (err) { overviewReportContainer.innerHTML = `<p style="color: var(--danger-color);">生成報表失敗：${err.message}</p>`; }
        finally { generateReportBtn.disabled = false; generateReportBtn.textContent = '重新生成全服數據報表'; }
    }

    async function handleWipeAllData() {
        if (!confirm('您確定要啟動清除所有玩家資料的程序嗎？\n這是一個無法復原的毀滅性操作！')) {
            return;
        }
        const enteredPassword = prompt('為確保安全，請輸入您的管理員登入密碼：');
        if (enteredPassword === null) return;
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
        wipeAllDataBtn.disabled = true;
        wipeAllDataBtn.textContent = '清除中...請勿關閉視窗';
        try {
            const result = await window.fetchAdminAPI('/wipe_all_data', {
                method: 'POST',
                body: JSON.stringify({ password: enteredPassword })
            });
            alert(result.message || '操作成功完成！');
            localStorage.removeItem('admin_token');
            window.location.reload();
        } catch (err) {
            alert(`清除失敗：${err.message}`);
        } finally {
            wipeAllDataBtn.disabled = false;
            wipeAllDataBtn.textContent = '執行清除程序...';
        }
    }

    if (generateReportBtn.innerHTML.includes('生成')) {
        handleGenerateReport();
    }
    
    generateReportBtn.addEventListener('click', handleGenerateReport);
    wipeAllDataBtn.addEventListener('click', handleWipeAllData);
}
