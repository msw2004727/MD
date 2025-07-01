// admin/js/admin-mail.js

function initializeMailSystem() {
    const DOMElements = window.DOMElements || initializeDOMElements();
    const SENDER_PRESETS_KEY = 'admin_sender_presets';

    // --- 廣播系統邏輯 ---
    async function loadBroadcastLog() {
        if (!DOMElements.broadcastLogContainer) return;
        DOMElements.broadcastLogContainer.innerHTML = '<p>正在載入紀錄...</p>';
        try {
            const logs = await window.fetchAdminAPI('/get_broadcast_log');
            if (logs.length === 0) {
                DOMElements.broadcastLogContainer.innerHTML = '<p>尚無系統信件發送紀錄。</p>';
                return;
            }
            let tableHtml = `<table class="broadcast-log-table"><thead><tr><th>發送時間</th><th>標題</th><th>內容摘要</th><th>附件</th><th>操作</th></tr></thead><tbody>`;
            logs.forEach(log => {
                const date = new Date(log.timestamp * 1000).toLocaleString('zh-TW');
                const contentSummary = log.content.length > 20 ? log.content.substring(0, 20) + '...' : log.content;
                const payloadSummary = JSON.stringify(log.payload || {}).substring(0, 25) + '...';
                tableHtml += `<tr><td>${date}</td><td>${log.title}</td><td>${contentSummary}</td><td>${payloadSummary}</td><td class="actions-cell"><button class="button danger text-xs recall-mail-btn" data-broadcast-id="${log.broadcastId}">回收</button></td></tr>`;
            });
            tableHtml += `</tbody></table>`;
            DOMElements.broadcastLogContainer.innerHTML = tableHtml;
        } catch (err) {
            DOMElements.broadcastLogContainer.innerHTML = `<p style="color: var(--danger-color);">載入紀錄失敗：${err.message}</p>`;
        }
    }

    async function handleRecallMail(event) {
        if (!event.target.classList.contains('recall-mail-btn')) return;
        const broadcastId = event.target.dataset.broadcastId;
        if (!confirm(`您確定要回收這封系統信件嗎？(此操作僅從日誌中移除)`)) return;
        event.target.disabled = true;
        event.target.textContent = '...';
        try {
            await window.fetchAdminAPI('/recall_mail', { method: 'POST', body: JSON.stringify({ broadcastId }) });
            loadBroadcastLog();
        } catch (err) {
            alert(`回收失敗：${err.message}`);
            event.target.disabled = false;
            event.target.textContent = '回收';
        }
    }

    async function handleBroadcastMail() {
        const senderName = DOMElements.broadcastSenderNameInput.value.trim() || '遊戲管理員';
        const title = document.getElementById('broadcast-title').value.trim();
        const content = document.getElementById('broadcast-content').value.trim();
        const payloadStr = document.getElementById('broadcast-payload').value.trim() || '{}';
        if (!title || !content) { alert('信件標題和內容不能為空。'); return; }
        const btn = DOMElements.broadcastBtn;
        const responseEl = DOMElements.broadcastResponseEl;
        btn.disabled = true;
        btn.textContent = '發送中...';
        responseEl.style.display = 'none';
        try {
            JSON.parse(payloadStr);
            const result = await window.fetchAdminAPI('/broadcast_mail', { method: 'POST', body: JSON.stringify({ sender_name: senderName, title, content, payload_str: payloadStr }) });
            responseEl.textContent = result.message;
            responseEl.className = 'admin-response-message success';
            document.getElementById('broadcast-title').value = '';
            document.getElementById('broadcast-content').value = '';
            document.getElementById('broadcast-payload').value = '';
            loadBroadcastLog();
        } catch (err) {
            responseEl.textContent = `發送失敗：${err.message}`;
            responseEl.className = 'admin-response-message error';
        } finally {
            responseEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = '向所有玩家發送';
        }
    }

    function saveSenderPreset() {
        const newName = DOMElements.broadcastSenderNameInput.value.trim();
        if (!newName) { alert('寄件人名稱不能為空。'); return; }
        let presets = [];
        try {
            const stored = localStorage.getItem(SENDER_PRESETS_KEY);
            if (stored) presets = JSON.parse(stored);
        } catch (e) { console.error("Error reading presets:", e); }
        if (!Array.isArray(presets)) presets = [];
        if (!presets.includes(newName)) {
            presets.push(newName);
            localStorage.setItem(SENDER_PRESETS_KEY, JSON.stringify(presets));
            alert(`已儲存寄件人：${newName}`);
            loadSenderPresets();
            DOMElements.broadcastSenderPresetsSelect.value = newName;
        } else {
            alert('此名稱已存在於預設選單中。');
        }
    }

    function loadSenderPresets() {
        let presets = ['遊戲管理員', '系統通知'];
        try {
            const storedPresets = localStorage.getItem(SENDER_PRESETS_KEY);
            if (storedPresets) {
                const parsed = JSON.parse(storedPresets);
                if (Array.isArray(parsed)) {
                    presets = parsed;
                }
            }
        } catch (error) {
            console.error("讀取寄件人預設集失敗，將使用預設值:", error);
            localStorage.removeItem(SENDER_PRESETS_KEY);
        }
        DOMElements.broadcastSenderPresetsSelect.innerHTML = '<option value="">選擇預設名稱...</option>';
        presets.forEach(name => {
            const option = new Option(name, name);
            DOMElements.broadcastSenderPresetsSelect.add(option);
        });
    }

    // 事件綁定
    DOMElements.broadcastBtn.addEventListener('click', handleBroadcastMail);
    DOMElements.saveSenderNameBtn.addEventListener('click', saveSenderPreset);
    DOMElements.broadcastSenderPresetsSelect.addEventListener('change', () => { if (DOMElements.broadcastSenderPresetsSelect.value) { DOMElements.broadcastSenderNameInput.value = DOMElements.broadcastSenderPresetsSelect.value; } });
    DOMElements.refreshLogBtn.addEventListener('click', loadBroadcastLog);
    DOMElements.broadcastLogContainer.addEventListener('click', handleRecallMail);

    // 初始載入
    loadBroadcastLog();
    loadSenderPresets();
}

function initializeCsMailbox() {
    const DOMElements = window.DOMElements || initializeDOMElements();

    async function loadCsMail() {
        if (!DOMElements.csMailContainer) return;
        DOMElements.csMailContainer.innerHTML = '<p>正在載入玩家回覆...</p>';
        try {
            const mails = await window.fetchAdminAPI('/get_cs_mail');
            if (mails.length === 0) {
                DOMElements.csMailContainer.innerHTML = '<p class="placeholder-text">信箱目前是空的。</p>';
                return;
            }
            let mailHtml = mails.map(mail => {
                const date = new Date(mail.timestamp * 1000).toLocaleString('zh-TW');
                const sender = mail.sender_name || '未知玩家';
                const senderId = mail.sender_id || 'N/A';
                return `
                    <div class="cs-mail-item">
                        <div class="cs-mail-header">
                            <strong class="cs-mail-title">${mail.title}</strong>
                            <span class="cs-mail-meta">寄件人: ${sender} (${senderId})</span>
                            <span class="cs-mail-meta">${date}</span>
                        </div>
                        <div class="cs-mail-content">
                            ${mail.content.replace(/\n/g, '<br>')}
                        </div>
                        <div class="cs-mail-actions">
                            <button class="button secondary cs-reply-btn" data-recipient-id="${senderId}" data-recipient-name="${sender}">回覆</button>
                            <button class="button danger text-xs cs-delete-mail-btn" data-mail-id="${mail.id}">刪除</button>
                        </div>
                    </div>
                `;
            }).join('');
            DOMElements.csMailContainer.innerHTML = mailHtml;
        } catch (err) {
            DOMElements.csMailContainer.innerHTML = `<p style="color: var(--danger-color);">載入客服信件失敗：${err.message}</p>`;
        }
    }
    
    async function handleCsMailActions(event) {
        const replyBtn = event.target.closest('.cs-reply-btn');
        const deleteBtn = event.target.closest('.cs-delete-mail-btn');

        if (replyBtn) {
            const recipientId = replyBtn.dataset.recipientId;
            const recipientName = replyBtn.dataset.recipientName;
            const replyTitle = prompt(`回覆給「${recipientName}」的標題：`, `Re: ${replyBtn.closest('.cs-mail-item').querySelector('.cs-mail-title').textContent}`);
            if (!replyTitle) return;
            const replyContent = prompt(`請輸入回覆內容：`);
            if (!replyContent) return;
            
            replyBtn.disabled = true;
            replyBtn.textContent = '發送中...';
            try {
                const result = await window.fetchAdminAPI('/send_mail_to_player', { 
                    method: 'POST', 
                    body: JSON.stringify({ 
                        recipient_id: recipientId, 
                        title: replyTitle, 
                        content: replyContent, 
                        sender_name: '客服團隊' 
                    }) 
                });
                alert(result.message);
            } catch (err) {
                alert(`回覆失敗：${err.message}`);
            } finally {
                replyBtn.disabled = false;
                replyBtn.textContent = '回覆';
            }
        } else if (deleteBtn) {
            const mailId = deleteBtn.dataset.mailId;
            if (!confirm(`您確定要刪除這封來自玩家的信件嗎？此操作不可復原。`)) return;

            deleteBtn.disabled = true;
            deleteBtn.textContent = '刪除中...';
            try {
                const result = await window.fetchAdminAPI(`/delete_cs_mail/${mailId}`, { method: 'DELETE' });
                alert(result.message);
                loadCsMail(); // 成功後重新載入列表
            } catch (err) {
                alert(`刪除失敗：${err.message}`);
                deleteBtn.disabled = false;
                deleteBtn.textContent = '刪除';
            }
        }
    }

    if (DOMElements.refreshCsMailBtn) { DOMElements.refreshCsMailBtn.addEventListener('click', loadCsMail); }
    if (DOMElements.csMailContainer) { DOMElements.csMailContainer.addEventListener('click', handleCsMailActions); }

    loadCsMail();
}
