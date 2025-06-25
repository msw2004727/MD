// js/utils.js

/**
 * 格式化基本文字，將特定的 Markdown 符號移除。
 * @param {string} text - 要格式化的文字。
 * @returns {string} 格式化後的文字。
 */
function formatBasicText(text) {
    if (typeof text !== 'string') return '';
    // 直接移除 ** 和 * 符號，而不是轉換成 HTML 標籤
    let formattedText = text
        .replace(/\*\*/g, '') // 移除雙星號
        .replace(/\*/g, '');   // 移除單星號
    return formattedText;
}


/**
 * 格式化並應用動態樣式到戰報文字。
 * @param {string} reportText - 戰報文字。
 * @param {object} playerMonster - 玩家怪獸資料。
 * @param {object} opponentMonster - 對手怪獸資料。
 * @returns {string} 格式化後的 HTML 字串。
 */
function applyDynamicStylingToBattleReport(reportText, playerMonster, opponentMonster) {
    if (typeof reportText !== 'string') return '';

    // 基礎格式化，例如換行
    let formattedText = reportText.replace(/\n/g, '<br>');

    // 關鍵字和對應的 class
    const keywords = {
        "獲勝": "highlight-win",
        "戰敗": "highlight-lose",
        "平手": "highlight-draw",
        "致命一擊": "highlight-crit",
        "效果絕佳": "highlight-super-effective",
        "閃避": "highlight-dodge",
        "中毒": "highlight-status",
        "麻痺": "highlight-status",
        "混亂": "highlight-status",
        "睡眠": "highlight-status",
        "凍結": "highlight-status",
        "燒傷": "highlight-status",
        "能力提升": "highlight-buff",
        "能力下降": "highlight-debuff"
    };

    // 處理關鍵字高亮
    for (const [key, value] of Object.entries(keywords)) {
        const regex = new RegExp(key, "g");
        formattedText = formattedText.replace(regex, `<span class="${value}">${key}</span>`);
    }

    // 處理怪獸名稱高亮
    if (playerMonster && playerMonster.nickname) {
        const playerRegex = new RegExp(escapeRegExp(playerMonster.nickname), "g");
        formattedText = formattedText.replace(playerRegex, `<strong class="player-monster-name">${playerMonster.nickname}</strong>`);
    }
    if (opponentMonster && opponentMonster.nickname) {
        const opponentRegex = new RegExp(escapeRegExp(opponentMonster.nickname), "g");
        formattedText = formattedText.replace(opponentRegex, `<strong class="opponent-monster-name">${opponentMonster.nickname}</strong>`);
    }

    return formattedText;
}


/**
 * 顯示一個 toast 通知。
 * @param {string} message - 要顯示的訊息。
 * @param {('success'|'error'|'info')} type - 通知的類型。
 * @param {number} duration - 顯示的持續時間（毫秒）。
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Toast container not found!');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // 讓 toast 動畫進入
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // 設定時間讓 toast 消失
    setTimeout(() => {
        toast.classList.remove('show');
        // 在動畫結束後從 DOM 中移除
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

/**
 * 對字串進行轉義，使其可以在正規表達式中使用。
 * @param {string} string - 要轉義的字串。
 * @returns {string} 轉義後的字串。
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 在數字前補零，使其達到指定長度。
 * @param {number} num - 要格式化的數字。
 * @param {number} length - 總長度。
 * @returns {string} 補零後的字串。
 */
function padZero(num, length = 2) {
    return String(num).padStart(length, '0');
}
