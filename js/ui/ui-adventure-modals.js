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
        let summaryText = "遠征結束！\n\n";
        for (const key in stats) {
            if (Object.hasOwnProperty.call(stats, key)) {
                summaryText += `${key}: ${stats[key]}\n`;
            }
        }
        alert(summaryText);
        return;
    }

    const body = modal.querySelector('.modal-body');
    if (!body) return;
    
    // --- 核心修改處 START ---

    const bannerUrl = gameState.assetPaths?.images?.modals?.expeditionSummaryBanner || '';
    let modalContent = `<img src="${bannerUrl}" alt="遠征總結" style="width: 100%; max-width: 400px; display: block; margin: 0 auto 15px auto; border-radius: 6px;">`;
    
    modalContent += '<div class="summary-stats-grid">';

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

    statsOrder.forEach(item => {
        const value = stats?.[item.key] || 0;
        modalContent += `
            <div class="summary-stat-item">
                <span class="summary-stat-label">${item.label}</span>
                <span class="summary-stat-value ${item.class}">${value.toLocaleString()}</span>
            </div>
        `;
    });

    modalContent += '</div>';
    body.innerHTML = modalContent;
    
    // --- 核心修改處 END ---

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
