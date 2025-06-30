// js/ui/ui-training.js
// 負責渲染訓練場的UI介面與互動邏輯

// 從我們之前建立的檔案中，導入鍛鍊選項的設定資料
import { trainingOptions } from '../training_options.js';

/**
 * 渲染所有的鍛鍊選項卡片到畫面上
 */
function renderTrainingOptions() {
    // 找到我們在 index.html 中預留的容器
    const container = document.getElementById('training-options-container');
    if (!container) {
        console.error("Training options container not found!");
        return;
    }

    // 清空容器，以防重複渲染
    container.innerHTML = '';

    // 檢查是否有可用的鍛鍊選項
    if (!trainingOptions || trainingOptions.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">目前沒有可用的鍛鍊項目。</p>';
        return;
    }

    // 遍歷所有鍛鍊選項，並為每一個選項建立一張卡片
    trainingOptions.forEach(option => {
        const card = document.createElement('div');
        card.className = 'training-card';
        card.dataset.trainingId = option.id; // 將選項ID存儲在DOM中，方便後續點擊處理

        // 使用CSS變數來動態設定卡片頂部的顏色
        // 這會對應到我們在 training.css 中設定的 .training-card::before 樣式
        card.style.setProperty('--card-color', `var(--${option.color.replace('bg-', 'element-')}-text)`);

        // 將秒數轉換為更容易閱讀的格式 (例如：1 小時 30 分鐘)
        const formatTime = (seconds) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            let timeString = '';
            if (h > 0) timeString += `${h} 小時 `;
            if (m > 0) timeString += `${m} 分鐘`;
            return timeString.trim();
        };

        // 使用模板字符串填充卡片的內部HTML
        card.innerHTML = `
            <div class="training-card-header">
                <div class="training-card-icon">
                    <i class="${option.icon}"></i>
                </div>
                <h3 class="training-card-title">${option.name}</h3>
            </div>
            <p class="training-card-description">${option.description}</p>
            <div class="training-card-footer">
                <div class="training-card-info">
                    <span class="cost">${option.cost.toLocaleString()} 🪙</span>
                </div>
                <div class="training-card-info">
                    <span class="time">⏳ ${formatTime(option.time)}</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

/**
 * 初始化訓練場相關的事件監聽器
 */
export function initializeTrainingHandlers() {
    // 首次載入時，先渲染一次畫面
    renderTrainingOptions();

    const container = document.getElementById('training-options-container');
    if (container) {
        // 使用事件委派來監聽所有卡片的點擊事件
        container.addEventListener('click', (event) => {
            const card = event.target.closest('.training-card');
            if (card) {
                const trainingId = card.dataset.trainingId;
                // 後續我們將在此處處理點擊卡片後開始訓練的邏輯
                console.log(`你點擊了訓練項目: ${trainingId}`);
                // 例如: startTraining(trainingId);
            }
        });
    }
}
