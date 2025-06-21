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
        // --- 核心修改處 START ---
        mailReaderCloseBtn: document.getElementById('mail-reader-modal').querySelector('.button[data-modal-id="mail-reader-modal"]')
        // --- 核心修改處 END ---
    };
}

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

    mails.sort((a, b) => b.timestamp - a.timestamp);

    container.innerHTML = mails.map(mail => {
        const mailDate = new Date(mail.timestamp * 1000).toLocaleString();
        const statusClass = mail.is_read ? 'read' : 'unread';
        const senderName = mail.sender_name || '系統訊息';

        return `
            <div class="mail-item ${statusClass}" data-mail-id="${mail.id}">
                <div class="mail-status-light ${statusClass}" title="${statusClass === 'unread' ? '未讀' : '已讀'}"></div>
                <div class="mail-title-container">
                    <p class="mail-title">${mail.title}</p>
                    <p class="text-xs text-[var(--text-secondary)]">寄件人: ${senderName} | ${mailDate}</p>
                </div>
                <button class="mail-delete-btn" title="刪除信件" data-mail-id="${mail.id}">&times;</button>
            </div>
        `;
    }).join('');
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
    
    // --- 核心修改處 START ---
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

    // 讀信視窗的關閉按鈕
    if (mailboxDOMElements.mailReaderCloseBtn) {
        mailboxDOMElements.mailReaderCloseBtn.addEventListener('click', () => {
            hideModal('mail-reader-modal');
        });
    }

    // 為信箱列表容器設定事件委派
    if (mailboxDOMElements.mailListContainer) {
        mailboxDOMElements.mailListContainer.addEventListener('click', (event) => {
            const mailItem = event.target.closest('.mail-item');
            const deleteBtn = event.target.closest('.mail-delete-btn');

            if (deleteBtn) {
                const mailId = deleteBtn.dataset.mailId;
                handleDeleteMail(mailId, event);
            } else if (mailItem) {
                const mailId = mailItem.dataset.mailId;
                openMailReader(mailId);
            }
        });
    }
    // --- 核心修改處 END ---
}
