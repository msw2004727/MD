// js/ui-mailbox.js
// 處理信箱系統的 UI 渲染與互動邏輯

// --- DOM 元素定義 ---
let mailboxDOMElements = {};

function initializeMailboxDOMElements() {
    mailboxDOMElements = {
        mailboxModal: document.getElementById('mailbox-modal'),
        mailListContainer: document.getElementById('mailbox-list-container'),
        refreshMailboxBtn: document.getElementById('refresh-mailbox-btn'),
        deleteReadMailsBtn: document.getElementById('delete-read-mails-btn'),
        
        mailReaderModal: document.getElementById('mail-reader-modal'),
        mailReaderTitle: document.getElementById('mail-reader-title'),
        mailReaderSender: document.getElementById('mail-reader-sender'),
        mailReaderTimestamp: document.getElementById('mail-reader-timestamp'),
        mailReaderBody: document.getElementById('mail-reader-modal').querySelector('.mail-content-text'),
        mailReaderAttachmentsContainer: document.getElementById('mail-reader-attachments'),
        mailReaderCloseBtn: document.getElementById('mail-reader-modal').querySelector('.button[data-modal-id="mail-reader-modal"]')
    };
}

// --- 核心修改處 START ---
/**
 * 處理對好友請求的回應 (同意或拒絕)
 * @param {string} mailId - 信件的 ID
 * @param {'accept' | 'decline'} action - 玩家的操作
 */
async function handleFriendResponse(mailId, action) {
    const actionText = action === 'accept' ? '同意' : '拒絕';
    showFeedbackModal('處理中...', `正在發送您的「${actionText}」回覆...`, true);

    try {
        const result = await respondToFriendRequest(mailId, action);
        if (result && result.success) {
            await refreshPlayerData(); // 重新獲取玩家資料以更新好友列表和信箱
            renderMailboxList(gameState.playerData.mailbox);
            updateMailNotificationDot();
            hideModal('feedback-modal');
            
            const successMessage = action === 'accept' ? '已成功將對方加為好友！' : '已拒絕好友請求。';
            showFeedbackModal('成功', successMessage);
        } else {
            throw new Error(result.error || '未知的錯誤');
        }
    } catch (error) {
        hideModal('feedback-modal');
        showFeedbackModal('處理失敗', `無法處理您的回覆：${error.message}`);
    }
}
// --- 核心修改處 END ---


/**
 * 渲染信箱列表
 * @param {Array<object>} mails - 從後端獲取的信件物件陣列
 */
function renderMailboxList(mails) {
    const container = mailboxDOMElements.mailListContainer;
    if (!container) return;

    if (!mails || mails.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-10">信箱空空如也...</p>`;
        return;
    }

    // 按時間戳降序排序
    mails.sort((a, b) => b.timestamp - a.timestamp);

    // --- 核心修改處 START ---
    // 修改 grid-template-columns 以適應新的按鈕佈局
    container.innerHTML = mails.map(mail => {
        const mailDate = new Date(mail.timestamp * 1000).toLocaleString();
        const statusClass = mail.is_read ? 'read' : 'unread';
        const senderName = mail.sender_name || '系統訊息';
        const mailStatusLight = `<div class="mail-status-light ${statusClass}" title="${statusClass === 'unread' ? '未讀' : '已讀'}"></div>`;

        let mailContentHtml;
        let mailItemClass = `mail-item ${statusClass}`;

        if (mail.type === 'friend_request') {
            // 好友請求信件的特殊佈局
            mailItemClass += ' friend-request'; // 添加特殊class以便CSS調整
            mailContentHtml = `
                <div class="mail-title-container">
                    <p class="mail-title">${mail.title}</p>
                    <p class="text-xs text-[var(--text-secondary)]">寄件人: ${senderName} | ${mailDate}</p>
                </div>
                <div class="friend-request-actions" style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="button success text-xs accept-friend-btn" data-mail-id="${mail.id}">同意</button>
                    <button class="button secondary text-xs decline-friend-btn" data-mail-id="${mail.id}">拒絕</button>
                </div>
            `;
        } else {
            // 普通信件的佈局
            mailItemClass += ' mail-item-clickable'; // 讓普通信件可以點擊
            mailContentHtml = `
                <div class="mail-title-container">
                    <p class="mail-title">${mail.title}</p>
                    <p class="text-xs text-[var(--text-secondary)]">寄件人: ${senderName} | ${mailDate}</p>
                </div>
                <button class="mail-delete-btn" title="刪除信件" data-mail-id="${mail.id}">&times;</button>
            `;
        }
        
        return `<div class="${mailItemClass}" data-mail-id="${mail.id}">${mailStatusLight}${mailContentHtml}</div>`;
    }).join('');
    // --- 核心修改處 END ---
}


/**
 * 開啟單一信件的閱讀器
 * @param {string} mailId - 要開啟的信件 ID
 */
async function openMailReader(mailId) {
    const mail = gameState.playerData?.mailbox?.find(m => m.id === mailId);
    if (!mail) {
        showFeedbackModal('錯誤', '找不到該封信件。');
        return;
    }

    mailboxDOMElements.mailReaderTitle.textContent = mail.title;
    mailboxDOMElements.mailReaderSender.textContent = mail.sender_name || '系統';
    mailboxDOMElements.mailReaderTimestamp.textContent = new Date(mail.timestamp * 1000).toLocaleString();
    mailboxDOMElements.mailReaderBody.innerHTML = mail.content.replace(/\n/g, '<br>');

    // 處理好友請求的特殊顯示
    const friendRequestInfo = mailboxDOMElements.mailReaderBody.querySelector('.friend-request-info');
    if(friendRequestInfo) friendRequestInfo.remove(); // 清除舊的

    if (mail.type === 'friend_request') {
        const senderId = mail.payload?.sender_id;
        const infoDiv = document.createElement('div');
        infoDiv.className = 'friend-request-info';
        infoDiv.innerHTML = `
            <div style="border-top: 1px dashed var(--border-color); margin-top: 1rem; padding-top: 1rem;">
                <p class="text-center text-sm">這是一封好友請求信件。</p>
                <div class="flex justify-center gap-4 mt-2">
                    <button class="button success accept-friend-btn" data-mail-id="${mail.id}">✓ 同意</button>
                    <button class="button danger decline-friend-btn" data-mail-id="${mail.id}">✗ 拒絕</button>
                </div>
            </div>
        `;
        mailboxDOMElements.mailReaderBody.appendChild(infoDiv);
    }


    mailboxDOMElements.mailReaderAttachmentsContainer.style.display = 'none';

    showModal('mail-reader-modal');

    if (!mail.is_read) {
        try {
            await fetchAPI(`/mailbox/${mailId}/read`, { method: 'POST' });
            await refreshPlayerData(); 
            renderMailboxList(gameState.playerData.mailbox);
            updateMailNotificationDot();
        } catch (error) {
            console.error(`標記信件 ${mailId} 為已讀時失敗:`, error);
        }
    }
}

/**
 * 處理刪除信件的請求
 * @param {string} mailId - 要刪除的信件 ID
 * @param {Event} event - 點擊事件
 */
async function handleDeleteMail(mailId, event) {
    event.stopPropagation(); 

    showConfirmationModal(
        '確認刪除',
        '您確定要永久刪除這封信件嗎？',
        async () => {
            showFeedbackModal('刪除中...', '正在處理您的請求...', true);
            try {
                await fetchAPI(`/mailbox/${mailId}`, { method: 'DELETE' });
                await refreshPlayerData();
                renderMailboxList(gameState.playerData.mailbox);
                updateMailNotificationDot();
                hideModal('feedback-modal');
                showFeedbackModal('成功', '信件已刪除。');
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('刪除失敗', `無法刪除信件：${error.message}`);
            }
        },
        { confirmButtonClass: 'danger', confirmButtonText: '確定刪除' }
    );
}

/**
 * 初始化信箱系統的所有事件監聽器
 */
function initializeMailboxEventHandlers() {
    initializeMailboxDOMElements();
    
    // 刷新按鈕
    if (mailboxDOMElements.refreshMailboxBtn) {
        mailboxDOMElements.refreshMailboxBtn.onclick = async () => {
            showFeedbackModal('刷新中...', '正在重新收取信件...', true);
            await refreshPlayerData();
            renderMailboxList(gameState.playerData?.mailbox || []);
            updateMailNotificationDot();
            hideModal('feedback-modal');
        };
    }

    // 刪除已讀按鈕
    if (mailboxDOMElements.deleteReadMailsBtn) {
        mailboxDOMElements.deleteReadMailsBtn.onclick = async () => {
            const readMails = gameState.playerData?.mailbox?.filter(m => m.is_read) || [];
            if (readMails.length === 0) {
                showFeedbackModal('提示', '沒有已讀的信件可以刪除。');
                return;
            }
            
            showConfirmationModal(
                '確認操作',
                `您確定要刪除所有 ${readMails.length} 封已讀信件嗎？`,
                async () => {
                    showFeedbackModal('刪除中...', '正在批量刪除信件...', true);
                    try {
                        const deletePromises = readMails.map(mail => fetchAPI(`/mailbox/${mail.id}`, { method: 'DELETE' }));
                        await Promise.all(deletePromises);
                        await refreshPlayerData();
                        renderMailboxList(gameState.playerData.mailbox);
                        updateMailNotificationDot();
                        hideModal('feedback-modal');
                        showFeedbackModal('成功', '所有已讀信件均已刪除。');
                    } catch (error) {
                         hideModal('feedback-modal');
                         showFeedbackModal('刪除失敗', `刪除已讀信件時發生錯誤：${error.message}`);
                    }
                },
                { confirmButtonClass: 'danger', confirmButtonText: '全部刪除' }
            );
        };
    }
    
    // --- 核心修改處 START ---
    // 為信箱列表容器和讀信視窗設定事件委派
    function setupMailboxEventListeners(container) {
        if (!container) return;
        
        container.addEventListener('click', (event) => {
            const mailItem = event.target.closest('.mail-item-clickable');
            const deleteBtn = event.target.closest('.mail-delete-btn');
            const acceptBtn = event.target.closest('.accept-friend-btn');
            const declineBtn = event.target.closest('.decline-friend-btn');

            if (acceptBtn) {
                event.stopPropagation();
                handleFriendResponse(acceptBtn.dataset.mailId, 'accept');
            } else if (declineBtn) {
                event.stopPropagation();
                handleFriendResponse(declineBtn.dataset.mailId, 'decline');
            } else if (deleteBtn) {
                handleDeleteMail(deleteBtn.dataset.mailId, event);
            } else if (mailItem) {
                openMailReader(mailItem.dataset.mailId);
            }
        });
    }

    setupMailboxEventListeners(mailboxDOMElements.mailListContainer);
    setupMailboxEventListeners(mailboxDOMElements.mailReaderModal); // 讀信器內的按鈕也需要監聽
    // --- 核心修改處 END ---

    // 讀信視窗的關閉按鈕
    if (mailboxDOMElements.mailReaderCloseBtn) {
        mailboxDOMElements.mailReaderCloseBtn.addEventListener('click', () => {
            hideModal('mail-reader-modal');
        });
    }
}
