// js/ui-adventure-modals.js
// 處理冒險島相關的彈窗，例如遠征總結。

/**
 * 顯示遠征結束後的總結彈窗。
 * @param {object} stats - 包含遠征統計數據的物件。
 */
function showExpeditionSummaryModal(stats) {
    const modal = document.getElementById('expedition-summary-modal');
    if (!modal) {
        console.error("找不到遠征總結彈窗 (expedition-summary-modal)。");
        // 提供一個後備的 alert
        let summaryText = "遠征結束！\n\n";
        summaryText += `獲得金幣: ${stats.gold_obtained}\n`;
        summaryText += `獲得DNA碎片: ${stats.dna_fragments_obtained}\n`;
        summaryText += `遭遇事件數: ${stats.events_encountered}\n`;
        alert(summaryText);
        return;
    }

    const body = modal.querySelector('.modal-body');
    if (!body) return;

    const statsOrder = [
        { key: 'gold_obtained', label: '🪙 總計獲得金幣', class: 'text-gold' },
        { key: 'dna_fragments_obtained', label: '🧬 總計獲得DNA碎片', class: '' },
        { key: 'events_encountered', label: '🗺️ 總計遭遇事件', class: '' },
        { key: 'bosses_fought', label: '👹 總計挑戰BOSS', class: '' },
        { key: 'hp_consumed', label: '💔 總計消耗HP', class: 'text-danger' },
        { key: 'hp_healed', label: '💖 總計恢復HP', class: 'text-success' },
        { key: 'mp_consumed', label: '📉 總計消耗MP', class: 'text-danger' },
        { key: 'mp_healed', label: '💧 總計恢復MP', class: 'text-success' },
        { key: 'captain_switches', label: '🔄️ 總計更換隊長', class: '' },
        { key: 'buffs_received', label: '👍 總計獲得增益', class: 'text-success' },
        { key: 'debuffs_received', label: '👎 總計遭受減益', class: 'text-danger' }
    ];

    let statsHtml = '<div class="summary-stats-grid">';
    statsOrder.forEach(item => {
        const value = stats[item.key] || 0;
        statsHtml += `
            <div class="summary-stat-label">${item.label}</div>
            <div class="summary-stat-value ${item.class}">${value.toLocaleString()}</div>
        `;
    });
    statsHtml += '</div>';
    
    body.innerHTML = statsHtml;

    showModal('expedition-summary-modal');
}

/**
 * 初始化冒險島彈窗相關的事件監聽。
 */
function initializeAdventureModalHandlers() {
    const summaryModal = document.getElementById('expedition-summary-modal');
    if (summaryModal) {
        const closeBtn = summaryModal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hideModal('expedition-summary-modal');
                // 關閉後重新整理冒險島介面，顯示設施列表
                if (typeof initializeAdventureUI === 'function') {
                    initializeAdventureUI();
                }
            });
        }
    }
}

// 確保在 DOM 載入後執行
document.addEventListener('DOMContentLoaded', initializeAdventureModalHandlers);
