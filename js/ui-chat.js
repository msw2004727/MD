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
        // 【新增】互動按鈕的元素
        punchBtn: document.getElementById('interact-punch-btn'),
        patBtn: document.getElementById('interact-pat-btn'),
        kissBtn: document.getElementById('interact-kiss-btn'),
    };
}

/**
 * 渲染一條聊天訊息到對話紀錄區
 * @param {string} message - 訊息內容
 * @param {'user' | 'assistant' | 'system' | 'assistant-thinking' | 'interaction'} role - 訊息的角色
 */
function renderChatMessage(message, role) {
    if (!chatElements.logArea) return;

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('chat-message-wrapper', `role-${role}`);

    // ----- BUG 修正邏輯 START -----
    // 如果是怪獸的回應，就新增頭像
    if (role === 'assistant') {
        const monster = gameState.playerData.farmedMonsters.find(m => m.id === currentChatMonsterId);
        if (monster) {
            const headInfo = monster.head_dna_info || { type: '無', rarity: '普通' };
            const imagePath = getMonsterPartImagePath('head', headInfo.type, headInfo.rarity);
            
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'chat-avatar-container';
            const avatarImage = document.createElement('div');
            avatarImage.className = 'chat-avatar-image';
            if (imagePath) {
                avatarImage.style.backgroundImage = `url('${imagePath}')`;
            }
            avatarContainer.appendChild(avatarImage);
            messageWrapper.appendChild(avatarContainer);
        }
    }
    // ----- BUG 修正邏輯 END -----

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('chat-message-bubble');
    
    if (role === 'interaction') {
        messageBubble.innerHTML = `<i>${message.replace(/\n/g, '<br>')}</i>`;
    } else {
        messageBubble.innerHTML = message.replace(/\n/g, '<br>');
    }

    if (role === 'assistant' && currentChatMonsterId) {
        const monster = gameState.playerData.farmedMonsters.find(m => m.id === currentChatMonsterId);
        if (monster && monster.elements && monster.elements.length > 0) {
            const primaryElement = monster.elements[0];
            const elementCssKey = getElementCssClassKey(primaryElement); 
            if (elementCssKey) {
                messageBubble.classList.add(`text-element-${elementCssKey}`);
                messageBubble.style.color = `var(--element-${elementCssKey}-text)`; 
            }
        }
    }
    
    messageWrapper.appendChild(messageBubble);
    
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
    
    if (chatElements.logArea) chatElements.logArea.innerHTML = '';
    if (chatElements.input) chatElements.input.value = '';

    const chatHistory = monster.chatHistory || [];
    if (chatHistory.length > 0) {
        for (let i = 0; i < chatHistory.length; i++) {
            const entry = chatHistory[i];
            const role = entry.content.startsWith('（你') ? 'interaction' : entry.role;
            renderChatMessage(entry.content, role);
        }
    } else {
        const greetingsDB = gameState.chatGreetings;
        const shortName = monster.element_nickname_part || monster.nickname;
        let greetingPool = [];
        let finalGreeting = `你好，我是 ${shortName}！`; // 預設的後備問候語

        if (greetingsDB) {
            const personalityName = monster.personality?.name;
            const primaryElement = monster.elements?.[0];
            const rarity = monster.rarity;

            if (personalityName && greetingsDB.personality?.[personalityName]) {
                greetingPool.push(...greetingsDB.personality[personalityName]);
            }
            if (primaryElement && greetingsDB.element?.[primaryElement]) {
                greetingPool.push(...greetingsDB.element[primaryElement]);
            }
            if (rarity && greetingsDB.rarity?.[rarity]) {
                greetingPool.push(...greetingsDB.rarity[rarity]);
            }

            if (greetingPool.length === 0 && greetingsDB.default) {
                greetingPool.push(...greetingsDB.default);
            }
            
            if (greetingPool.length > 0) {
                finalGreeting = greetingPool[Math.floor(Math.random() * greetingPool.length)];
            }
        }
        
        renderChatMessage(finalGreeting.replace('{shortName}', shortName), 'assistant');
    }
}


/**
 * 【新增】處理物理互動按鈕的點擊
 * @param {'punch' | 'pat' | 'kiss'} action - 互動的類型
 */
async function handleInteractionClick(action) {
    if (!currentChatMonsterId) return;

    const actionTextMap = {
        punch: '你狠狠地揍了牠一拳。',
        pat: '你溫柔地摸了摸牠的頭。',
        kiss: '你快速地親了牠一下。'
    };
    const userActionText = actionTextMap[action];

    renderChatMessage(`（${userActionText}）`, 'interaction');
    
    Object.values(chatElements).forEach(btn => {
        if (btn && typeof btn.disabled !== 'undefined') btn.disabled = true;
    });
    renderChatMessage("(正在反應...)", 'assistant-thinking');

    try {
        const response = await interactWithMonster(currentChatMonsterId, action);

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
        console.error("發送互動請求失敗:", error);
    } finally {
        Object.values(chatElements).forEach(btn => {
            if (btn && typeof btn.disabled !== 'undefined') btn.disabled = false;
        });
    }
}


/**
 * 處理發送訊息的邏輯
 */
async function handleSendMessage() {
    if (!currentChatMonsterId || !chatElements.input || !chatElements.sendBtn) return;

    const message = chatElements.input.value.trim();
    if (!message) return;

    renderChatMessage(message, 'user');
    chatElements.input.value = '';
    
    Object.values(chatElements).forEach(btn => {
        if (btn && typeof btn.disabled !== 'undefined') btn.disabled = true;
    });
    renderChatMessage("(正在思考主人的意思)", 'assistant-thinking');

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
        Object.values(chatElements).forEach(btn => {
            if (btn && typeof btn.disabled !== 'undefined') btn.disabled = false;
        });
        chatElements.input.focus();
    }
}


/**
 * 初始化聊天系統的所有事件監聽器
 */
function initializeChatSystem() {
    initializeChatDOMElements();

    const monsterInfoTabs = document.getElementById('monster-info-tabs');
    if (monsterInfoTabs) {
        monsterInfoTabs.addEventListener('click', (event) => {
            if (event.target.dataset.tabTarget === 'monster-chat-tab') {
                const monsterId = DOMElements.monsterInfoModalHeader?.dataset.monsterId;
                if (monsterId) {
                    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
                    if (monster) {
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

    if (chatElements.punchBtn) {
        chatElements.punchBtn.addEventListener('click', () => handleInteractionClick('punch'));
    }
    if (chatElements.patBtn) {
        chatElements.patBtn.addEventListener('click', () => handleInteractionClick('pat'));
    }
    if (chatElements.kissBtn) {
        chatElements.kissBtn.addEventListener('click', () => handleInteractionClick('kiss'));
    }
}
