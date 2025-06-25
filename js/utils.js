// js/utils.js
// 存放整個專案可以共用的輔助函式

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
