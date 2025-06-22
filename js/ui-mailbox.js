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

/**
 * 新增函式：動態注入信箱專用的CSS樣式，確保響應式佈局。
 */
function injectMailboxStyles() {
    const styleId = 'dynamic-mailbox-styles';
    if (document.getElementById(styleId)) return; 

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .mail-item.friend-request-item {
            display: grid;
            grid-template-columns: 20px 1fr;
            align-items: center;
            gap: 1rem;
        }
        .friend-request-item .mail-content-wrapper {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 0.75rem 1rem;
            width: 100%;
        }
        .friend-request-item .friend-request-actions {
            display: flex;
            gap: 0.5rem;
            flex-shrink: 0;
        }
        #mail-reader-modal .modal-close.system-notification-close-btn {
            background-color: var(--danger-color);
            color: var(--button-danger-text);
            width: 28px;
            height: 28px;
            font-size: 1.2rem;
            line-height: 28px;
            text-align: center;
            border-radius: 50%;
            padding: 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            border: 1px solid var(--danger-hover-dark);
        }
        #mail-reader-modal .modal-close.system-notification-close-btn:hover {
            background-color: var(--danger-hover-dark);
            color: var(--button-danger-text);
        }
        body.light-theme #mail-reader-modal .modal-close.system-notification-close-btn:hover {
             background-color: var(--danger-hover-light);
        }
    `;
    document.head.appendChild(style);
}


async function handleFriendResponse(mailId, action) {
    const actionText = action === 'accept' ? '同意' : '拒絕';
    showFeedbackModal('處理中...', `正在發送您的「${actionText}」回覆...`, true);

    try {
        const result = await respondToFriendRequest(mailId, action);
        if (result && result.success) {
            await refreshPlayerData(); 
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


function renderMailboxList(mails) {
    const container = mailboxDOMElements.mailListContainer;
    if (!container) return;

    if (!mails || mails.length === 0) {
        container.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)] py-10">信箱空空如也...</p>`;
        return;
    }

    mails.sort((a, b) => b.timestamp - a.timestamp);

    container.innerHTML = mails.map(mail => {
        const mailDate = new Date(mail.timestamp * 1000).toLocaleString();
        const statusClass = mail.is_read ? 'read' : 'unread';
        const senderName = mail.sender_name || '系統訊息';
        const mailStatusLight = `<div class="mail-status-light ${statusClass}" title="${statusClass === 'unread' ? '未讀' : '已讀'}"></div>`;

        let mailItemClass = `mail-item ${statusClass}`;

        if (mail.type === 'friend_request') {
            mailItemClass += ' friend-request-item';
            return `
                <div class="${mailItemClass}" data-mail-id="${mail.id}">
                    ${mailStatusLight}
                    <div class="mail-content-wrapper">
                        <div class="mail-title-container">
                            <p class="mail-title">${mail.title}</p>
                            <p class="text-xs text-[var(--text-secondary)]">寄件人: ${senderName} | ${mailDate}</p>
                        </div>
                        <div class="friend-request-actions">
                            <button class="button success text-xs accept-friend-btn" data-mail-id="${mail.id}">同意</button>
                            <button class="button secondary text-xs decline-friend-btn" data-mail-id="${mail.id}">拒絕</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            mailItemClass += ' mail-item-clickable'; 
            return `
                <div class="${mailItemClass}" data-mail-id="${mail.id}">
                    ${mailStatusLight}
                    <div class="mail-title-container">
                        <p class="mail-title">${mail.title}</p>
                        <p class="text-xs text-[var(--text-secondary)]">寄件人: ${senderName} | ${mailDate}</p>
                    </div>
                    <button class="mail-delete-btn" title="刪除信件" data-mail-id="${mail.id}">&times;</button>
                </div>
            `;
        }
    }).join('');
}


async function openMailReader(mailId) {
    const mail = gameState.playerData?.mailbox?.find(m => m.id === mailId);
    if (!mail) {
        showFeedbackModal('錯誤', '找不到該封信件。');
        return;
    }

    const senderName = mail.sender_name || '系統通知';
    mailboxDOMElements.mailReaderTitle.textContent = mail.title;
    
    if (senderName === '系統通知') {
        mailboxDOMElements.mailReaderSender.innerHTML = `<strong style="color: gold;">${senderName}</strong>`;
    } else {
        mailboxDOMElements.mailReaderSender.textContent = senderName;
    }
    
    mailboxDOMElements.mailReaderBody.innerHTML = mail.content.replace(/\\n/g, ' ');

    mailboxDOMElements.mailReaderTimestamp.textContent = new Date(mail.timestamp * 1000).toLocaleString();

    const footer = mailboxDOMElements.mailReaderModal.querySelector('.modal-footer');
    if (footer) {
        if (mail.sender_id && mail.type !== 'friend_request') {
            footer.innerHTML = `<button class="button primary reply-mail-btn" data-sender-id="${mail.sender_id}" data-sender-name="${mail.sender_name}">回覆寄件人</button>`;
        } else {
            footer.innerHTML = `<button class="button secondary" onclick="hideModal('mail-reader-modal')">關閉</button>`;
        }
    }

    // --- 核心修改處 START ---
    // 確保關閉按鈕一直都有紅圈樣式
    const closeButton = mailboxDOMElements.mailReaderModal.querySelector('.modal-close');
    if (closeButton) {
        closeButton.classList.add('system-notification-close-btn');
    }
    // --- 核心修改處 END ---

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

function initializeMailboxEventHandlers() {
    initializeMailboxDOMElements();
    injectMailboxStyles();
    
    if (mailboxDOMElements.refreshMailboxBtn) {
        mailboxDOMElements.refreshMailboxBtn.onclick = async () => {
            showFeedbackModal('刷新中...', '正在重新收取信件...', true);
            await refreshPlayerData();
            renderMailboxList(gameState.playerData?.mailbox || []);
            updateMailNotificationDot();
            hideModal('feedback-modal');
        };
    }

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
    if (mailboxDOMElements.mailReaderModal) {
        mailboxDOMElements.mailReaderModal.addEventListener('click', (event) => {
            const replyBtn = event.target.closest('.reply-mail-btn');
            const closeBtn = event.target.closest('.modal-close');

            if (replyBtn) {
                const senderId = replyBtn.dataset.senderId;
                const senderName = replyBtn.dataset.senderName;
                if (senderId && senderName && typeof openSendMailModal === 'function') {
                    hideModal('mail-reader-modal'); 
                    openSendMailModal(senderId, senderName); 
                }
            } else if (closeBtn) {
                const modalId = closeBtn.dataset.modalId || closeBtn.closest('.modal')?.id;
                if (modalId) {
                    hideModal(modalId);
                }
            }
        });
    }
}
