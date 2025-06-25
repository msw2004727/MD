// js/ui-notes.js
// 負責處理「備註」功能的顯示與互動邏輯

/**
 * 將指定的怪獸備註渲染到註記顯示區。
 * @param {object} monster - 當前正在查看的怪獸物件。
 */
function renderMonsterNotes(monster) {
    const displayArea = document.getElementById('monster-notes-display');
    if (!displayArea) return;

    // 確保 monster.monsterNotes 是一個陣列
    const notes = Array.isArray(monster?.monsterNotes) ? monster.monsterNotes : [];

    if (notes.length === 0) {
        displayArea.innerHTML = `<p class="text-center text-sm text-[var(--text-secondary)]">尚無備註。</p>`;
        return;
    }

    // 將註記按時間戳由新到舊排序
    const sortedNotes = notes.sort((a, b) => b.timestamp - a.timestamp);

    displayArea.innerHTML = sortedNotes.map(note => {
        const date = new Date(note.timestamp * 1000);
        // 格式化時間為 YYYY-MM-DD HH:mm
        const formattedTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        // 將換行符 \n 轉換為 <br>
        const formattedContent = note.content.replace(/\n/g, '<br>');

        return `
            <div class="note-entry" style="border-bottom: 1px solid var(--border-color); padding: 8px 4px; margin-bottom: 8px;">
                <p class="note-timestamp" style="font-size: 0.8rem; color: var(--text-secondary);">${formattedTime}</p>
                <p class="note-content" style="margin-top: 4px; font-size: 0.95rem; line-height: 1.6;">${formattedContent}</p>
            </div>
        `;
    }).join('');
}


/**
 * 處理儲存怪獸備註的非同步操作。
 */
async function handleSaveMonsterNote() {
    const monsterId = DOMElements.monsterInfoModalHeader?.dataset.monsterId;
    if (!monsterId) {
        showFeedbackModal('錯誤', '找不到怪獸ID，無法儲存備註。');
        return;
    }

    const noteInputElement = document.getElementById('monster-note-input');
    if (!noteInputElement) return;

    const noteContent = noteInputElement.value.trim();
    if (!noteContent) {
        showFeedbackModal('提示', '備註內容不能為空。');
        return;
    }

    const saveButton = document.getElementById('save-monster-note-btn');
    saveButton.disabled = true;
    saveButton.textContent = '儲存中...';

    try {
        // 呼叫後端 API
        await fetchAPI('/notes', {
            method: 'POST',
            body: JSON.stringify({
                target_type: 'monster',
                monster_id: monsterId,
                note_content: noteContent
            }),
        });
        
        // 成功後的操作
        showFeedbackModal('成功', '備註已成功儲存！');
        noteInputElement.value = ''; // 清空輸入框

        // 刷新玩家資料以獲取最新的註記
        await refreshPlayerData();

        // 重新渲染註記
        const updatedMonster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
        if (updatedMonster) {
            renderMonsterNotes(updatedMonster);
        }

    } catch (error) {
        showFeedbackModal('儲存失敗', `無法儲存備註：${error.message}`);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = '儲存備註';
    }
}

/**
 * 初始化註記功能相關的所有事件監聽器。
 */
function initializeNoteHandlers() {
    const saveBtn = document.getElementById('save-monster-note-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveMonsterNote);
    }
    
    // 監聽怪獸資訊彈窗內的頁籤點擊，以便在切換到「備註」頁籤時觸發渲染
    const monsterInfoTabs = document.getElementById('monster-info-tabs');
    if (monsterInfoTabs) {
        monsterInfoTabs.addEventListener('click', (event) => {
            if (event.target.dataset.tabTarget === 'monster-notes-tab') {
                const monsterId = DOMElements.monsterInfoModalHeader?.dataset.monsterId;
                if (monsterId) {
                    const monster = gameState.playerData.farmedMonsters.find(m => m.id === monsterId);
                    if (monster) {
                        renderMonsterNotes(monster);
                    }
                }
            }
        });
    }
}
