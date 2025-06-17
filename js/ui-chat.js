// js/ui-chat.js
// 負責處理「與怪獸聊天」功能的介面互動邏輯

// --- DOM 元素與狀態變數 ---
let chatModalElements = {};
let currentChatMonsterId = null;

function initializeChatDOMElements() {
    chatModalElements = {
        modal: document.getElementById('chat-modal'),
        header: document.getElementById('chat-modal-header'),
        logArea: document.getElementById('chat-log-area'),
        input: document.getElementById('chat-input'),
        sendBtn: document.getElementById('send-chat-btn'),
        openChatBtn: document.getElementById('chat-with-monster-btn') // 在 monster-info-modal 裡的按鈕
    };
}

/**
 * 渲染一條聊天訊息到對話紀錄區
 * @param {string} message - 訊息內容
 * @param {'user' | 'assistant' | 'system'} role - 訊息的角色
 */
function renderChatMessage(message, role) {
    if (!chatModalElements.logArea) return;

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('chat-message-wrapper', `role-${role}`);

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('chat-message-bubble');
    messageBubble.innerHTML = message.replace(/\n/g, '<br>'); // 支援換行

    messageWrapper.appendChild(messageBubble);
    
    // 將新訊息插入到頂部 (因為 logArea 使用了 flex-direction: column-reverse)
    chatModalElements.logArea.insertBefore(messageWrapper, chatModalElements.logArea.firstChild);
}

/**
 * 開啟與指定怪獸的聊天視窗
 * @param {object} monster - 要聊天的怪獸物件
 */
function openChatModal(monster) {
    if (!monster || !monster.id) {
        console.error("無效的怪獸資料，無法開啟聊天室。");
        return;
    }

    currentChatMonsterId = monster.id;
    
    if (chatModalElements.header) {
        chatModalElements.header.textContent = `與 ${monster.nickname} 聊天`;
    }
    if (chatModalElements.logArea) {
        chatModalElements.logArea.innerHTML = ''; // 清空舊的聊天紀錄
    }
    if (chatModalElements.input) {
        chatModalElements.input.value = ''; // 清空輸入框
    }

    // 渲染歷史訊息
    const chatHistory = monster.chatHistory || [];
    if (chatHistory.length > 0) {
        chatHistory.forEach(entry => {
            renderChatMessage(entry.content, entry.role);
        });
    } else {
        renderChatMessage(`你好，我是 ${monster.nickname}！有什麼事嗎？`, 'assistant');
    }

    showModal('chat-modal');
}


/**
 * 處理發送訊息的邏輯
 */
async function handleSendMessage() {
    if (!currentChatMonsterId || !chatModalElements.input || !chatModalElements.sendBtn) return;

    const message = chatModalElements.input.value.trim();
    if (!message) return;

    // 立刻顯示玩家訊息
    renderChatMessage(message, 'user');
    chatModalElements.input.value = '';
    
    // 禁用發送按鈕並顯示等待狀態
    chatModalElements.sendBtn.disabled = true;
    renderChatMessage("...", 'assistant-thinking'); // 顯示等待中的樣式

    try {
        const response = await fetchAPI(`/monster/${currentChatMonsterId}/chat`, {
            method: 'POST',
            body: JSON.stringify({ message: message }),
        });

        // 移除等待中的訊息
        const thinkingBubble = chatModalElements.logArea.querySelector('.role-assistant-thinking');
        if (thinkingBubble) {
            thinkingBubble.remove();
        }

        if (response && response.success && response.reply) {
            // 顯示 AI 的回覆
            renderChatMessage(response.reply, 'assistant');
            // 在背景刷新玩家資料，以同步最新的聊天歷史紀錄
            await refreshPlayerData();
        } else {
            throw new Error(response.error || '收到無效的回應');
        }

    } catch (error) {
        const thinkingBubble = chatModalElements.logArea.querySelector('.role-assistant-thinking');
        if (thinkingBubble) {
            thinkingBubble.remove();
        }
        renderChatMessage(`（發生錯誤，無法回應：${error.message}）`, 'system');
        console.error("發送聊天訊息失敗:", error);
    } finally {
        chatModalElements.sendBtn.disabled = false;
    }
}


/**
 * 初始化聊天系統的所有事件監聽器
 */
function initializeChatSystem() {
    initializeChatDOMElements();

    if (chatModalElements.openChatBtn) {
        chatModalElements.openChatBtn.addEventListener('click', () => {
            const monsterId = DOMElements.monsterInfoModalHeader?.dataset.monsterId;
            if (monsterId) {
                const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
                if (monster) {
                    openChatModal(monster);
                }
            }
        });
    }

    if (chatModalElements.sendBtn) {
        chatModalElements.sendBtn.addEventListener('click', handleSendMessage);
    }

    if (chatModalElements.input) {
        chatModalElements.input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // 防止換行
                handleSendMessage();
            }
        });
    }
}
