// js/ui-chat.js
// 負責處理「與怪獸聊天」功能的介面互動邏輯

// --- DOM 元素與狀態變數 ---
let chatElements = {}; // 重新命名以避免與其他模組衝突
let currentChatMonsterId = null;

function initializeChatDOMElements() {
    // DOM 元素現在都在 #monster-chat-tab 內部
    chatElements = {
        logArea: document.getElementById('chat-log-area'),
        input: document.getElementById('chat-input'),
        sendBtn: document.getElementById('send-chat-btn'),
    };
}

/**
 * 渲染一條聊天訊息到對話紀錄區
 * @param {string} message - 訊息內容
 * @param {'user' | 'assistant' | 'system' | 'assistant-thinking'} role - 訊息的角色
 */
function renderChatMessage(message, role) {
    if (!chatElements.logArea) return;

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('chat-message-wrapper', `role-${role}`);

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('chat-message-bubble');
    messageBubble.innerHTML = message.replace(/\n/g, '<br>'); // 支援換行

    // --- 【核心修改】為怪獸訊息添加屬性顏色 ---
    if (role === 'assistant' && currentChatMonsterId) {
        const monster = gameState.playerData.farmedMonsters.find(m => m.id === currentChatMonsterId);
        if (monster && monster.elements && monster.elements.length > 0) {
            const primaryElement = monster.elements[0];
            const elementCssKey = getElementCssClassKey(primaryElement); // 呼叫在 ui.js 中的輔助函式
            if (elementCssKey) {
                messageBubble.classList.add(`text-element-${elementCssKey}`);
                messageBubble.style.color = `var(--element-${elementCssKey}-text)`; // 直接應用CSS變數確保顏色正確
            }
        }
    }
    // --- 【修改結束】 ---

    messageWrapper.appendChild(messageBubble);
    
    // 將新訊息插入到頂部 (因為 logArea 使用了 flex-direction: column-reverse)
    chatElements.logArea.insertBefore(messageWrapper, chatElements.logArea.firstChild);
}

/**
 * 準備並渲染聊天頁籤的內容
 * @param {object} monster - 要聊天的怪獸物件
 */
function setupChatTab(monster) {
    if (!monster || !monster.id) {
        console.error("無效的怪獸資料，無法設定聊天頁籤。");
        return;
    }

    currentChatMonsterId = monster.id;
    
    // 清空舊的聊天紀錄和輸入
    if (chatElements.logArea) chatElements.logArea.innerHTML = '';
    if (chatElements.input) chatElements.input.value = '';

    // 渲染歷史訊息
    const chatHistory = monster.chatHistory || [];
    if (chatHistory.length > 0) {
        chatHistory.forEach(entry => {
            renderChatMessage(entry.content, entry.role);
        });
    } else {
        // 如果沒有歷史紀錄，顯示預設的歡迎訊息
        renderChatMessage(`你好，我是 ${monster.nickname}！有什麼事嗎？`, 'assistant');
    }
}


/**
 * 處理發送訊息的邏輯
 */
async function handleSendMessage() {
    if (!currentChatMonsterId || !chatElements.input || !chatElements.sendBtn) return;

    const message = chatElements.input.value.trim();
    if (!message) return;

    // 立刻顯示玩家訊息
    renderChatMessage(message, 'user');
    chatElements.input.value = '';
    
    // 禁用發送按鈕並顯示等待狀態
    chatElements.sendBtn.disabled = true;
    renderChatMessage("(正在思考主人的意思)", 'assistant-thinking'); // 顯示等待中的樣式

    try {
        const response = await fetchAPI(`/monster/${currentChatMonsterId}/chat`, {
            method: 'POST',
            body: JSON.stringify({ message: message }),
        });

        const thinkingBubble = chatElements.logArea.querySelector('.role-assistant-thinking');
        if (thinkingBubble) thinkingBubble.remove();

        if (response && response.success && response.reply) {
            renderChatMessage(response.reply, 'assistant');
            await refreshPlayerData();
        } else {
            throw new Error(response.error || '收到無效的回應');
        }

    } catch (error) {
        const thinkingBubble = chatElements.logArea.querySelector('.role-assistant-thinking');
        if (thinkingBubble) thinkingBubble.remove();
        renderChatMessage(`（發生錯誤，無法回應：${error.message}）`, 'system');
        console.error("發送聊天訊息失敗:", error);
    } finally {
        chatElements.sendBtn.disabled = false;
        chatElements.input.focus(); // 發送後讓使用者可以繼續輸入
    }
}


/**
 * 初始化聊天系統的所有事件監聽器
 */
function initializeChatSystem() {
    initializeChatDOMElements();

    // 監聽怪獸資訊彈窗內的頁籤點擊
    const monsterInfoTabs = document.getElementById('monster-info-tabs');
    if (monsterInfoTabs) {
        monsterInfoTabs.addEventListener('click', (event) => {
            // 如果點擊的是「對話」頁籤
            if (event.target.dataset.tabTarget === 'monster-chat-tab') {
                const monsterId = DOMElements.monsterInfoModalHeader?.dataset.monsterId;
                if (monsterId) {
                    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
                    if (monster) {
                        // 載入該怪獸的聊天內容
                        setupChatTab(monster);
                    }
                }
            }
        });
    }

    if (chatElements.sendBtn) {
        chatElements.sendBtn.addEventListener('click', handleSendMessage);
    }

    if (chatElements.input) {
        chatElements.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !chatElements.sendBtn.disabled) {
                event.preventDefault();
                handleSendMessage();
            }
        });
    }
}
