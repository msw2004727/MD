// ui.js - 使用者介面與 DOM 操作模組

// 實際導入其他模組中的函式和物件
import * as GameState from './game-state.js'; // 遊戲狀態和 DOM 元素引用
import * as GameLogic from './game-logic.js'; // 如果 UI 操作需要觸發遊戲邏輯

// --- 通用 UI 輔助函式 ---

export function openModal(modalId) {
    const modal = document.getElementById(modalId); // 獲取 DOM 元素
    if (modal) {
        modal.style.display = 'flex';
        console.log(`UI: Modal ${modalId} opened.`);
    } else {
        console.warn(`UI: Modal with id ${modalId} not found.`);
    }
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId); // 獲取 DOM 元素
    if (modal) {
        modal.style.display = 'none';
        console.log(`UI: Modal ${modalId} closed.`);
    } else {
        console.warn(`UI: Modal with id ${modalId} not found.`);
    }
}

export function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modalElement => {
        if (modalElement && modalElement.id) {
            closeModal(modalElement.id);
        }
    });
    console.log("UI: All modals closed.");
}

export function showFeedbackModal(title, messageOrContent, showSpinner, showCloseXButton = true, showMonsterDetails = false, monsterForDetails = null) {
    const { feedbackModal, feedbackModalTitle, feedbackModalSpinner, feedbackModalCloseX, feedbackMonsterDetailsDiv, feedbackModalMessage } = GameState.elements;

    if (!feedbackModalTitle || !feedbackModalSpinner || !feedbackModalCloseX || !feedbackMonsterDetailsDiv || !feedbackModalMessage) {
        console.error("UI: Feedback modal elements not found in GameState.elements. Please ensure they are initialized.");
        return;
    }

    feedbackModalTitle.textContent = title;
    feedbackModalSpinner.style.display = showSpinner ? 'block' : 'none';
    feedbackModalCloseX.style.display = showCloseXButton ? 'block' : 'none';

    feedbackMonsterDetailsDiv.innerHTML = ''; // 清空怪物詳細資訊區域
    if (showMonsterDetails && monsterForDetails) {
        feedbackModalMessage.innerHTML = ""; // 清空一般訊息
        feedbackMonsterDetailsDiv.style.display = 'block';

        // 渲染 monsterForDetails 的 HTML 結構
        const personalityObj = monsterForDetails.personality || {name: "未知", text: "個性資料不完整", color: "var(--text-secondary)"};
        let elementCompHTML = monsterForDetails.elementComposition ? Object.entries(monsterForDetails.elementComposition)
            .map(([el, pc]) => `<span style="color:${getElementStyling(el).text}; font-weight:bold;">${el} ${pc}%</span>`)
            .join(', ') : "無";

        let skillsHTML = '';
        if (monsterForDetails.skills && monsterForDetails.skills.length > 0) {
            skillsHTML = monsterForDetails.skills.map(skill => `
                <div class="feedback-skill-entry">
                    <span class="feedback-skill-name">${skill.name}</span>
                    <span class="feedback-skill-description">${skill.description}</span>
                </div>
            `).join('');
        } else {
            skillsHTML = '<p class="text-sm text-[var(--text-secondary)]">無技能</p>';
        }

        feedbackMonsterDetailsDiv.innerHTML = `
            <p class="text-sm font-bold">怪獸名稱: <span class="text-[var(--accent-color)]">${monsterForDetails.nickname}</span></p>
            <p class="text-sm">等級: ${monsterForDetails.level || 1}</p>
            <p class="text-sm">總評價: ${monsterForDetails.totalEvaluation || 0}</p>
            <p class="text-sm">屬性組成: ${elementCompHTML}</p>
            <h6 class="font-bold mt-2">技能:</h6>
            <div>${skillsHTML}</div>
        `;
        console.log("UI: Feedback modal showing monster details for", monsterForDetails.nickname);
    } else {
        feedbackMonsterDetailsDiv.style.display = 'none';
        feedbackModalMessage.innerHTML = typeof messageOrContent === 'string' ? messageOrContent.replace(/\n/g, '<br>') : '';
        if (typeof messageOrContent !== 'string' && messageOrContent instanceof HTMLElement) {
             feedbackModalMessage.innerHTML = ''; // 清空先前的訊息
             feedbackModalMessage.appendChild(messageOrContent);
        }
    }
    openModal('feedback-modal');
}

export function applyTheme(theme) {
    const { themeIcon } = GameState.elements;
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        if (themeIcon) themeIcon.textContent = '☀️';
    } else {
        document.body.classList.remove('light-theme');
        if (themeIcon) themeIcon.textContent = '🌙';
    }
    localStorage.setItem('theme', theme);
    // 重新渲染需要主題樣式的 UI 部分
    updateMonsterSnapshotDisplay(GameState.currentMonster);
    populateInventory(); // 重新填充庫存以應用主題樣式
    populateTemporaryBackpack(); // 重新填充臨時背包以應用主題樣式
    console.log(`UI: Theme applied - ${theme}. Snapshot and inventories refreshed.`);
}

export function getContrastColor(hexColor) {
    const currentThemeIsLight = document.body.classList.contains('light-theme');
    if (!hexColor) {
        return currentThemeIsLight ? 'var(--text-primary-light)' : 'var(--text-primary-dark)';
    }
    let R, G, B;
    hexColor = hexColor.replace("#", "");
    if (hexColor.length === 3) {
        R = parseInt(hexColor[0] + hexColor[0], 16);
        G = parseInt(hexColor[1] + hexColor[1], 16);
        B = parseInt(hexColor[2] + hexColor[2], 16);
    } else if (hexColor.length === 6) {
        R = parseInt(hexColor.substring(0, 2), 16);
        G = parseInt(hexColor.substring(2, 4), 16);
        B = parseInt(hexColor.substring(4, 6), 16);
    } else {
        return currentThemeIsLight ? 'var(--text-primary-light)' : 'var(--text-primary-dark)';
    }
    const yiq = (R * 299 + G * 587 + B * 114) / 1000;
    return yiq >= 128 ? (currentThemeIsLight ? '#000000' : '#FFFFFF' ) : (currentThemeIsLight ? '#FFFFFF' : '#000000');
}

export function getElementStyling(elementType) {
    if (!elementType) elementType = '無';
    const typeKey = elementType.toLowerCase();
    switch(typeKey) {
        case '火': return { text: 'var(--element-fire-text)', bg: 'var(--element-fire-bg)' };
        case '水': return { text: 'var(--element-water-text)', bg: 'var(--element-water-bg)' };
        case '木': return { text: 'var(--element-wood-text)', bg: 'var(--element-wood-bg)' };
        case '金': return { text: 'var(--element-gold-text)', bg: 'var(--element-gold-bg)' };
        case '土': return { text: 'var(--element-earth-text)', bg: 'var(--element-earth-bg)' };
        case '光': return { text: 'var(--element-light-text)', bg: 'var(--element-light-bg)' };
        case '暗': return { text: 'var(--element-dark-text)', bg: 'var(--element-dark-bg)' };
        case '毒': return { text: 'var(--element-poison-text)', bg: 'var(--element-poison-bg)' };
        case '風': return { text: 'var(--element-wind-text)', bg: 'var(--element-wind-bg)' };
        case '混': return { text: 'var(--element-mix-text)', bg: 'var(--element-mix-bg)' }; // 混合屬性
        case '無': return { text: 'var(--element-無-text)', bg: 'var(--element-無-bg)' }; // 無屬性
        default: return { text: 'var(--element-mix-text)', bg: 'var(--element-mix-bg)' };
    }
}

export function getRarityStyling(rarityName) {
    // 這裡直接使用 CSS 變數，假設它們在 theme.css 中定義
    switch(rarityName) {
        case "普通": return { text: 'var(--rarity-common-text)'};
        case "稀有": return { text: 'var(--rarity-rare-text)'};
        case "精英": return { text: 'var(--rarity-elite-text)'};
        case "傳說": return { text: 'var(--rarity-legendary-text)'};
        case "神話": return { text: 'var(--rarity-mythical-text)'};
        default: return { text: 'var(--rarity-common-text)'};
    }
}


// --- 頁籤控制 ---
export function openGenericTab(evt, tabName, containerQuerySelector) {
    const tabContainer = evt.currentTarget.closest(containerQuerySelector);
    if (!tabContainer) {
        console.error(`UI: Tab container with selector ${containerQuerySelector} not found.`);
        return;
    }

    // 移除所有同組頁籤的 active 類別
    tabContainer.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    // 為被點擊的頁籤按鈕添加 active 類別
    evt.currentTarget.classList.add('active');

    // 隱藏所有同組頁籤內容
    tabContainer.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    // 顯示目標頁籤內容
    const targetContent = document.getElementById(tabName);
    if (targetContent) {
        targetContent.classList.add('active');
    } else {
        console.warn(`UI: Tab content with id ${tabName} not found.`);
    }
    console.log(`UI: Opening generic tab ${tabName} in ${containerQuerySelector}`);
}

export function openDnaFarmTab(evt, tabName) {
    // 這裡直接呼叫 openGenericTab，因為它們的邏輯是相似的
    openGenericTab(evt, tabName, '#dna-farm-tabs');
    console.log(`UI: Opening DNA/Farm tab ${tabName}`);
}

// --- 庫存與 DNA 顯示 ---
export function createDnaElement(item, index, sourceType) {
    const slotDiv = document.createElement('div');
    slotDiv.className = `dna-item ${sourceType}-slot ${item ? 'occupied' : 'empty'}`;
    slotDiv.draggable = item ? true : false; // 只有有物品時才能拖曳
    slotDiv.dataset.slotIndex = index; // 標記槽位索引
    slotDiv.dataset.sourceType = sourceType; // 標記來源類型

    if (item) {
        slotDiv.dataset.dnaInfo = JSON.stringify(item); // 儲存 DNA 資訊
        const elementStyle = getElementStyling(item.elements && item.elements.length > 0 ? item.elements[0] : '無');
        const rarityStyle = getRarityStyling(item.rarity);

        slotDiv.innerHTML = `
            <span class="dna-name" style="color:${rarityStyle.text};">${item.name}</span>
            <span class="dna-type" style="color:${elementStyle.text};">${item.elements ? item.elements.join('/') + '屬性' : '無屬性'}</span>
            <span class="dna-rarity" style="color:${rarityStyle.text};">稀有度: ${item.rarity}</span>
        `;
        slotDiv.style.backgroundColor = elementStyle.bg; // 應用背景色
    } else {
        slotDiv.textContent = '空位';
        slotDiv.classList.add('inventory-slot-empty'); // 添加空槽位樣式
    }
    return slotDiv;
}

export function populateInventory() {
    const { inventoryItemsContainer } = GameState.elements;
    if (!inventoryItemsContainer) { console.error("UI: inventoryItemsContainer not found!"); return; }
    inventoryItemsContainer.innerHTML = '';

    for (let i = 0; i < GameState.NUM_INVENTORY_SLOTS; i++) {
        const item = GameState.playerOwnedDNA[i]; // 從 GameState.playerOwnedDNA 獲取物品
        const slotDiv = createDnaElement(item, i, 'inventory');
        inventoryItemsContainer.appendChild(slotDiv);
    }

    // 添加 "抽DNA" 按鈕
    const drawDnaBtnElement = document.createElement('div');
    drawDnaBtnElement.className = 'dna-item dna-action-slot dna-draw-button';
    drawDnaBtnElement.id = 'draw-dna-btn'; // 確保 ID 正確
    drawDnaBtnElement.innerHTML = '<span class="text-xl">➕</span><br>抽DNA';
    inventoryItemsContainer.appendChild(drawDnaBtnElement);

    // 添加 "刪除區"
    const deleteSlotDiv = document.createElement('div');
    deleteSlotDiv.className = 'dna-item dna-action-slot inventory-delete-slot';
    deleteSlotDiv.dataset.droptype = 'delete';
    deleteSlotDiv.innerHTML = '<span class="text-xl">🗑️</span><br>刪除區';
    inventoryItemsContainer.appendChild(deleteSlotDiv);

    console.log("UI: Inventory populated.");
}

export function populateTemporaryBackpack() {
    const { temporaryBackpackItemsContainer } = GameState.elements;
    if (!temporaryBackpackItemsContainer) { console.error("UI: temporaryBackpackItemsContainer not found!"); return; }
    temporaryBackpackItemsContainer.innerHTML = '';

    for (let i = 0; i < GameState.NUM_TEMP_BACKPACK_SLOTS; i++) {
        const item = GameState.temporaryBackpackSlots[i];
        const slotDiv = createDnaElement(item, i, 'temporary'); // 使用 createDnaElement 創建
        slotDiv.classList.add('temp-backpack-slot'); // 添加臨時背包專用樣式
        if (item) {
            slotDiv.classList.remove('inventory-slot-empty'); // 如果有物品，移除空槽位樣式
            slotDiv.classList.add('occupied');
        } else {
            slotDiv.classList.add('empty');
        }
        temporaryBackpackItemsContainer.appendChild(slotDiv);
    }
    console.log("UI: Temporary backpack populated.");
}

export function updateCombinationSlotUI(comboSlotId, dnaItem) {
    const { dnaCombinationSlotsContainer } = GameState.elements; // 使用 dnaCombinationSlotsContainer
    if (!dnaCombinationSlotsContainer) { console.error("UI: dnaCombinationSlotsContainer not found!"); return; }

    const slotElement = dnaCombinationSlotsContainer.querySelector(`[data-slot-id="${comboSlotId}"]`);
    if (slotElement) {
        if (dnaItem) {
            const elementStyle = getElementStyling(dnaItem.elements && dnaItem.elements.length > 0 ? dnaItem.elements[0] : '無');
            const rarityStyle = getRarityStyling(dnaItem.rarity);
            slotElement.innerHTML = `
                <span class="dna-name" style="color:${rarityStyle.text};">${dnaItem.name}</span>
                <span class="dna-type" style="color:${elementStyle.text};">${dnaItem.elements ? dnaItem.elements.join('/') + '屬性' : '無屬性'}</span>
                <span class="dna-rarity" style="color:${rarityStyle.text};">稀有度: ${dnaItem.rarity}</span>
            `;
            slotElement.style.backgroundColor = elementStyle.bg;
            slotElement.classList.remove('empty', 'border-dashed', 'border-gray-500', 'text-gray-400');
            slotElement.classList.add('occupied');
        } else {
            slotElement.innerHTML = '拖曳DNA至此';
            slotElement.style.backgroundColor = ''; // 清除背景色
            slotElement.classList.add('empty', 'border-dashed', 'border-gray-500', 'text-gray-400');
            slotElement.classList.remove('occupied');
        }
    }
    console.log(`UI: Combination slot ${comboSlotId} UI updated.`);
}

export function clearCombinationSlotUI(comboSlotId) {
    updateCombinationSlotUI(comboSlotId, null); // 呼叫更新函式並傳入 null 來清除
    console.log(`UI: Combination slot ${comboSlotId} UI cleared.`);
}

export function createCombinationSlots() {
    const { dnaCombinationSlotsContainer } = GameState.elements;
    if (!dnaCombinationSlotsContainer) { console.error("UI: dnaCombinationSlotsContainer not found!"); return; }

    dnaCombinationSlotsContainer.innerHTML = ''; // 清空現有槽位
    for (let i = 0; i < GameState.NUM_COMBINATION_SLOTS; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'dna-slot border border-dashed border-gray-500 rounded-md flex items-center justify-center text-gray-400';
        slotDiv.dataset.droptype = 'combination';
        slotDiv.dataset.slotId = i;
        slotDiv.textContent = '拖曳DNA至此';
        dnaCombinationSlotsContainer.appendChild(slotDiv);
    }
    console.log("UI: Combination slots created.");
}

// --- 怪獸相關 UI ---
export function updateMonsterSnapshotDisplay(monster) {
    const { monsterImageElement, snapshotAchievementTitle, snapshotNickname, snapshotWinLoss, snapshotEvaluation, monsterInfoButton, snapshotMainContent } = GameState.elements;

    if (!monsterImageElement || !snapshotAchievementTitle || !snapshotNickname || !snapshotWinLoss || !snapshotEvaluation || !monsterInfoButton || !snapshotMainContent) {
        console.error("UI: Monster snapshot elements not found in GameState.elements.");
        return;
    }

    if (monster) {
        monsterImageElement.src = monster.imageUrl || `https://placehold.co/200x150/161b22/8b949e?text=${monster.nickname}&font=noto-sans-tc`;
        monsterImageElement.alt = `${monster.nickname}圖片`;
        snapshotAchievementTitle.textContent = monster.title || '初出茅廬';
        snapshotNickname.textContent = monster.nickname || '-';
        snapshotWinLoss.innerHTML = `<span>勝: ${monster.wins || 0}</span><span>敗: ${monster.losses || 0}</span>`;
        snapshotEvaluation.textContent = `總評價: ${monster.totalEvaluation || 0}`;

        // 更新快照中的基本屬性顯示
        const elementStyle = getElementStyling(monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無');
        snapshotMainContent.innerHTML = `
            <p class="text-sm">屬性: <span class="font-bold" style="color:${elementStyle.text};">${monster.elements ? monster.elements.join('/') : '無'}</span></p>
            <p class="text-sm">等級: <span class="font-bold">${monster.level || 1}</span></p>
            <p class="text-sm">戰力: <span class="font-bold">${monster.combatPower || 0}</span></p>
            <p class="text-sm">技能: <span class="font-bold">${monster.skills && monster.skills.length > 0 ? monster.skills[0].name : '無'}</span></p>
        `;
        monsterInfoButton.disabled = false; // 有怪獸時啟用按鈕
    } else {
        // 沒有怪獸時顯示預設狀態
        monsterImageElement.src = "https://placehold.co/200x150/161b22/8b949e?text=怪獸&font=noto-sans-tc";
        monsterImageElement.alt = "當前怪獸圖片";
        snapshotAchievementTitle.textContent = '初出茅廬';
        snapshotNickname.textContent = '-';
        snapshotWinLoss.innerHTML = `<span>勝: 0</span><span>敗: 0</span>`;
        snapshotEvaluation.textContent = `總評價: 0`;
        snapshotMainContent.innerHTML = `
            <p class="text-sm">屬性: <span class="font-bold">?</span></p>
            <p class="text-sm">等級: <span class="font-bold">?</span></p>
            <p class="text-sm">戰力: <span class="font-bold">?</span></p>
            <p class="text-sm">技能: <span class="font-bold">?</span></p>
        `;
        monsterInfoButton.disabled = true; // 沒有怪獸時禁用按鈕
    }
    console.log("UI: Monster snapshot updated for", monster ? monster.nickname : "no monster");
}

export function renderMonsterInfoModalContent(monster) {
    const { monsterInfoModalHeaderContent, monsterDetailsTab, monsterActivityLogs } = GameState.elements;
    if (!monsterInfoModalHeaderContent || !monsterDetailsTab || !monsterActivityLogs) {
        console.error("UI: Monster info modal content elements not found.");
        return;
    }

    if (!monster) {
        monsterInfoModalHeaderContent.innerHTML = `
            <img src="https://placehold.co/80x80/161b22/8b949e?text=怪獸" alt="怪獸頭像" class="rounded-full mr-4">
            <div>
                <h4 class="text-xl font-bold monster-info-name-styled">無怪獸資訊</h4>
                <p class="text-sm text-[var(--text-secondary)]">訓獸師: -</p>
            </div>
        `;
        monsterDetailsTab.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10">請先選擇一隻怪獸。</p>';
        monsterActivityLogs.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4" id="monster-activity-logs-empty-message">尚無活動紀錄。</p>';
        return;
    }

    // 更新怪獸資訊模態框頭部
    monsterInfoModalHeaderContent.innerHTML = `
        <img src="${monster.imageUrl || 'https://placehold.co/80x80/161b22/8b949e?text=怪獸'}" alt="${monster.nickname}頭像" class="rounded-full mr-4">
        <div>
            <h4 class="text-xl font-bold monster-info-name-styled">${monster.nickname} (Lv. ${monster.level || 1})</h4>
            <p class="text-sm text-[var(--text-secondary)]">訓獸師: <span class="player-nickname-link cursor-pointer text-[var(--accent-color)]" data-player-uid="${monster.ownerUid || ''}">${monster.ownerNickname || '未知'}</span></p>
        </div>
    `;

    // 渲染詳細資訊頁籤
    const personalityText = monster.aiPersonality?.text || '一段關於怪獸個性的詳細描述。';
    const introductionText = monster.aiIntroduction || '一段關於怪獸的背景故事或趣味介紹，包含其數值如何融入敘述。';
    const evaluationText = monster.aiEvaluation || '一段針對怪獸的綜合評價與培養建議，指出優勢劣勢及戰術定位。';

    let skillsListHtml = '';
    if (monster.skills && monster.skills.length > 0) {
        skillsListHtml = monster.skills.map(skill => `
            <div class="skill-entry">
                <span class="skill-name">${skill.name}</span>
                <span class="skill-details">${skill.description}</span>
            </div>
        `).join('');
    } else {
        skillsListHtml = '<p class="text-sm text-[var(--text-secondary)]">無技能</p>';
    }

    monsterDetailsTab.innerHTML = `
        <h5 class="font-bold mb-2">基本屬性</h5>
        <div class="details-grid">
            <div class="details-item"><span class="details-label">類型:</span> <span class="details-value">${monster.type || '未知'}</span></div>
            <div class="details-item"><span class="details-label">元素:</span> <span class="details-value" style="color:${getElementStyling(monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無').text};">${monster.elements ? monster.elements.join('/') : '無'}</span></div>
            <div class="details-item"><span class="details-label">生命值(HP):</span> <span class="details-value">${monster.hp || 0}</span></div>
            <div class="details-item"><span class="details-label">魔力值(MP):</span> <span class="details-value">${monster.mp || 0}</span></div>
            <div class="details-item"><span class="details-label">攻擊力:</span> <span class="details-value">${monster.attack || 0}</span></div>
            <div class="details-item"><span class="details-label">防禦力:</span> <span class="details-value">${monster.defense || 0}</span></div>
            <div class="details-item"><span class="details-label">速度:</span> <span class="details-value">${monster.speed || 0}</span></div>
            <div class="details-item"><span class="details-label">爆擊率:</span> <span class="details-value">${(monster.critRate || 0) * 100}%</span></div>
            <div class="details-item"><span class="details-label">個性:</span> <span class="details-value" style="color:${monster.aiPersonality?.color || 'var(--accent-color)'};">${monster.personality || '無'}</span></div>
        </div>
        <p class="personality-text mt-2">${personalityText}</p>

        <h5 class="font-bold mb-2 mt-4">技能列表</h5>
        <div class="skills-list">${skillsListHtml}</div>

        <h5 class="font-bold mb-2 mt-4">背景故事</h5>
        <p class="ai-generated-text">${introductionText}</p>

        <h5 class="font-bold mb-2 mt-4">綜合評價與培養建議</h5>
        <p class="ai-generated-text">${evaluationText}</p>
        <p class="creation-time-centered">創建時間: ${monster.creationTime ? new Date(monster.creationTime).toLocaleString() : '未知'}</p>
    `;

    // 更新活動紀錄頁籤
    updateMonsterActivityLog(monster);

    console.log(`UI: Rendering monster info modal content for ${monster.nickname}`);
}


export function updateMonsterInfoModal(monster) {
    if (!monster) {
        renderMonsterInfoModalContent(null); // 呼叫渲染函式處理空狀態
        openGenericTab(null, 'monster-details-tab', '#monster-info-tabs'); // 確保顯示預設頁籤
        return;
    }

    // 檢查 AI 描述是否已存在
    if (!monster.aiPersonality || !monster.aiIntroduction || !monster.aiEvaluation) {
        renderMonsterInfoModalContent(monster); // 先渲染基本資訊
        // 呼叫 game-logic 函式來生成 AI 描述
        GameLogic.generateAndStoreAIDescriptions(monster).then(updatedMonster => {
            // 只有當模態框仍然打開且顯示的是同一個怪獸時才更新 UI
            const currentModalMonsterNameElement = GameState.elements.monsterInfoModalHeaderContent?.querySelector('.monster-info-name-styled');
            if (document.getElementById('monster-info-modal').style.display === 'flex' && currentModalMonsterNameElement && currentModalMonsterNameElement.textContent.includes(updatedMonster.nickname)) {
                renderMonsterInfoModalContent(updatedMonster); // AI 描述回來後再次渲染
            }
        }).catch(error => {
            console.error("Failed to generate AI descriptions:", error);
            // 顯示錯誤訊息，但仍顯示基本資訊
            showFeedbackModal("錯誤", "無法生成怪獸描述，請稍後再試。", false, true);
        });
        console.log(`UI: Monster info for ${monster.nickname} displayed, AI description pending/being fetched by game-logic.`);
    } else {
        renderMonsterInfoModalContent(monster); // 直接渲染完整資訊
    }
    openGenericTab(null, 'monster-details-tab', '#monster-info-tabs'); // 確保顯示預設頁籤
}


export function updateMonsterActivityLog(monster) {
    const { monsterActivityLogs } = GameState.elements;
    if (!monsterActivityLogs) { console.error("UI: monsterActivityLogs not found!"); return; }

    if (monster && monster.activityLogs && monster.activityLogs.length > 0) {
        monsterActivityLogs.innerHTML = `
            <ul class="list-disc list-inside text-sm">
                ${monster.activityLogs.map(log => `
                    <li><span class="log-time">[${new Date(log.timestamp).toLocaleString()}]</span> <span class="log-message">${log.message}</span></li>
                `).join('')}
            </ul>
        `;
        document.getElementById('monster-activity-logs-empty-message').style.display = 'none';
    } else {
        monsterActivityLogs.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4" id="monster-activity-logs-empty-message">尚無活動紀錄。</p>';
        document.getElementById('monster-activity-logs-empty-message').style.display = 'block';
    }
    console.log(`UI: Monster activity log updated for ${monster ? monster.nickname : '無怪獸'}.`);
}


// --- 農場 UI ---
export function populateFarmList() {
    const { farmedMonstersList, farmEmptyMessage } = GameState.elements;
    if (!farmedMonstersList || !farmEmptyMessage) { console.error("UI: Farm list elements not found!"); return; }

    farmedMonstersList.innerHTML = ''; // 清空現有列表

    if (GameState.farmedMonsters.length === 0) {
        farmEmptyMessage.style.display = 'block';
    } else {
        farmEmptyMessage.style.display = 'none';
        GameState.farmedMonsters.forEach(monster => {
            const monsterItemDiv = document.createElement('div');
            monsterItemDiv.className = 'farm-monster-item farm-header-grid py-2 border-b border-gray-700 items-center';
            monsterItemDiv.dataset.monsterId = monster.id;

            const isCultivating = monster.farmStatus && monster.farmStatus.isCultivating;
            const isBattling = monster.farmStatus && monster.farmStatus.isBattling;
            const statusText = isCultivating ? `修煉中 (${monster.farmStatus.remainingTime}s)` : (isBattling ? '出戰中' : '活躍');
            const statusClass = isCultivating ? 'text-yellow-400' : (isBattling ? 'text-red-400' : 'text-green-400');

            monsterItemDiv.innerHTML = `
                <div>
                    <input type="radio" name="active_monster" value="${monster.id}" id="active_monster_${monster.id}" ${isBattling ? 'checked' : ''} ${isCultivating ? 'disabled' : ''}>
                    <label for="active_monster_${monster.id}" class="sr-only">選擇${monster.nickname}出戰</label>
                </div>
                <div class="flex items-center">
                    <img src="${monster.imageUrl || 'https://placehold.co/40x40/161b22/8b949e?text=M'}" alt="${monster.nickname}圖片" class="rounded-full mr-2">
                    <span class="farm-monster-name">${monster.nickname}</span>
                </div>
                <div class="${statusClass} farm-monster-status">${statusText}</div>
                <div class="hidden sm:block farm-monster-score">${monster.totalEvaluation || 0}</div>
                <div class="farm-monster-actions-group">
                    <button class="text-xs secondary p-1 farm-monster-cultivate-btn" data-action="cultivate" data-monster-id="${monster.id}" ${isCultivating ? 'disabled' : ''}>養成</button>
                    <button class="text-xs danger p-1 farm-monster-release-btn" data-action="release" data-monster-id="${monster.id}" ${isCultivating || isBattling ? 'disabled' : ''}>放生</button>
                </div>
            `;
            farmedMonstersList.appendChild(monsterItemDiv);
        });
    }
    console.log("UI: Farm list populated.");
}

export function updateFarmMonsterStatusDisplay(monster, statusDivElement) {
    if (!monster || !statusDivElement) return;

    const isCultivating = monster.farmStatus && monster.farmStatus.isCultivating;
    const isBattling = monster.farmStatus && monster.farmStatus.isBattling;
    const statusText = isCultivating ? `修煉中 (${monster.farmStatus.remainingTime}s)` : (isBattling ? '出戰中' : '活躍');
    const statusClass = isCultivating ? 'text-yellow-400' : (isBattling ? 'text-red-400' : 'text-green-400');

    statusDivElement.className = `${statusClass} farm-monster-status`; // 更新 class
    statusDivElement.textContent = statusText; // 更新文字

    // 更新按鈕狀態
    const parentItem = statusDivElement.closest('.farm-monster-item');
    if (parentItem) {
        const cultivateBtn = parentItem.querySelector('.farm-monster-cultivate-btn');
        const releaseBtn = parentItem.querySelector('.farm-monster-release-btn');
        const battleRadio = parentItem.querySelector('input[name="active_monster"]');

        if (cultivateBtn) cultivateBtn.disabled = isCultivating;
        if (releaseBtn) releaseBtn.disabled = isCultivating || isBattling;
        if (battleRadio) battleRadio.disabled = isCultivating;
        if (battleRadio && isBattling) battleRadio.checked = true;
    }
    console.log(`UI: Farm monster status display updated for ${monster.nickname}.`);
}


// --- 修煉 UI ---
export function renderTrainingItems() {
    const { trainingItemsResult, addAllToTempBackpackBtn } = GameState.elements;
    if (!trainingItemsResult || !addAllToTempBackpackBtn) { console.error("UI: Training results elements not found!"); return; }

    trainingItemsResult.innerHTML = '';
    if (GameState.itemsFromCurrentTraining.length > 0) {
        GameState.itemsFromCurrentTraining.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-card bg-gray-700 p-2 rounded-md text-center text-xs flex justify-between items-center';
            itemDiv.innerHTML = `
                <span>${item.name} x${item.quantity}</span>
                <button class="text-xs secondary p-1 add-one-to-temp-backpack-btn" data-item-index="${index}" ${item.addedToBackpack ? 'disabled' : ''}>
                    ${item.addedToBackpack ? '已加入' : '加入背包'}
                </button>
            `;
            trainingItemsResult.appendChild(itemDiv);
        });
        addAllToTempBackpackBtn.style.display = 'block'; // 顯示一鍵加入按鈕
    } else {
        trainingItemsResult.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-2">本次修煉沒有拾獲任何物品。</p>';
        addAllToTempBackpackBtn.style.display = 'none'; // 隱藏一鍵加入按鈕
    }
    console.log("UI: Training items rendered.");
}

export function updateTrainingItemsDisplay() {
    const { trainingItemsResult } = GameState.elements;
    if (!trainingItemsResult) { console.error("UI: trainingItemsResult not found!"); return; }

    GameState.itemsFromCurrentTraining.forEach((item, index) => {
        const btn = trainingItemsResult.querySelector(`.add-one-to-temp-backpack-btn[data-item-index="${index}"]`);
        if (btn && item.addedToBackpack) {
            btn.textContent = '已加入';
            btn.disabled = true;
        }
    });
    // 檢查是否所有物品都已加入，如果是，禁用「一鍵全數加入背包」按鈕
    const allAdded = GameState.itemsFromCurrentTraining.every(item => item.addedToBackpack);
    if (allAdded && GameState.elements.addAllToTempBackpackBtn) {
        GameState.elements.addAllToTempBackpackBtn.disabled = true;
        GameState.elements.addAllToTempBackpackBtn.textContent = '所有物品已加入';
    }
    console.log("UI: Training items display (button states) updated.");
}


// --- 排行榜 UI ---
export function setupMonsterLeaderboardTabs() {
    // 頁籤按鈕在 HTML 中已經存在，這裡不需要動態創建
    console.log("UI: Monster leaderboard tabs setup (assuming static HTML).");
}
export function populateMonsterLeaderboard(filterElement = 'all') {
    const { monsterLeaderboardTable, monsterLeaderboardEmptyMessage } = GameState.elements;
    if (!monsterLeaderboardTable || !monsterLeaderboardEmptyMessage) { console.error("UI: Monster leaderboard elements not found!"); return; }

    const tbody = monsterLeaderboardTable.querySelector('tbody');
    if (!tbody) { console.error("UI: Monster leaderboard tbody not found!"); return; }
    tbody.innerHTML = ''; // 清空現有內容

    // 獲取排序後的怪獸資料
    const filteredMonsters = GameLogic.getFilteredAndSortedMonstersForLeaderboard(filterElement);

    if (filteredMonsters.length === 0) {
        monsterLeaderboardEmptyMessage.style.display = 'block';
        monsterLeaderboardTable.style.display = 'none';
    } else {
        monsterLeaderboardEmptyMessage.style.display = 'none';
        monsterLeaderboardTable.style.display = 'table';
        filteredMonsters.forEach((monster, index) => {
            const row = document.createElement('tr');
            row.dataset.monsterId = monster.id;
            row.dataset.playerUid = monster.ownerUid;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${monster.nickname}</td>
                <td><span class="player-nickname-link cursor-pointer text-[var(--accent-color)]" data-player-uid="${monster.ownerUid}">${monster.ownerNickname || '未知'}</span></td>
                <td>${monster.totalEvaluation || 0}</td>
                <td><button class="text-xs primary p-1" data-action="challenge" data-monster-id="${monster.id}">挑戰</button></td>
            `;
            tbody.appendChild(row);
        });
    }
    console.log(`UI: Monster leaderboard populated for element: ${filterElement}`);
}
export function populatePlayerLeaderboard() {
    const { playerLeaderboardTable, playerLeaderboardEmptyMessage } = GameState.elements;
    if (!playerLeaderboardTable || !playerLeaderboardEmptyMessage) { console.error("UI: Player leaderboard elements not found!"); return; }

    const tbody = playerLeaderboardTable.querySelector('tbody');
    if (!tbody) { console.error("UI: Player leaderboard tbody not found!"); return; }
    tbody.innerHTML = ''; // 清空現有內容

    // 獲取排序後的玩家資料
    const sortedPlayers = GameLogic.getSortedPlayersForLeaderboard();

    if (sortedPlayers.length === 0) {
        playerLeaderboardEmptyMessage.style.display = 'block';
        playerLeaderboardTable.style.display = 'none';
    } else {
        playerLeaderboardEmptyMessage.style.display = 'none';
        playerLeaderboardTable.style.display = 'table';
        sortedPlayers.forEach((player, index) => {
            const row = document.createElement('tr');
            row.dataset.playerUid = player.uid;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${player.nickname}</td>
                <td>${player.wins || 0}</td>
                <td>${player.losses || 0}</td>
                <td><button class="text-xs primary p-1" data-action="view-player" data-player-uid="${player.uid}">查看</button></td>
            `;
            tbody.appendChild(row);
        });
    }
    console.log("UI: Player leaderboard populated.");
}

// --- 其他 UI ---
export function populateNewbieGuide(searchTerm = "") {
    const { newbieGuideContentArea } = GameState.elements;
    if (!newbieGuideContentArea) { console.error("UI: newbieGuideContentArea not found!"); return; }

    newbieGuideContentArea.innerHTML = '';
    const filteredGuide = GameState.gameSettings.newbie_guide.filter(item =>
        item.title.includes(searchTerm) || item.content.includes(searchTerm)
    );

    if (filteredGuide.length > 0) {
        filteredGuide.forEach(item => {
            const guideEntry = document.createElement('div');
            guideEntry.innerHTML = `
                <h4 class="font-bold mb-2">${item.title}</h4>
                <p class="text-sm mb-4">${item.content}</p>
            `;
            newbieGuideContentArea.appendChild(guideEntry);
        });
    } else {
        newbieGuideContentArea.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">沒有找到相關指南內容。</p>';
    }
    console.log(`UI: Newbie guide populated/filtered with term: "${searchTerm}".`);
}

export function displaySearchedPlayers(playersToDisplay) {
    const { friendsListContainer } = GameState.elements;
    if (!friendsListContainer) { console.error("UI: friendsListContainer not found!"); return; }

    friendsListContainer.innerHTML = ''; // 清空現有內容

    if (playersToDisplay.length > 0) {
        const ul = document.createElement('ul');
        ul.className = 'list-disc list-inside text-sm mt-4';
        playersToDisplay.forEach(player => {
            const li = document.createElement('li');
            li.className = 'friend-item';
            li.innerHTML = `
                <span class="friend-name">${player.nickname}</span> (ID: ${player.uid})
                <button class="text-xs secondary p-1 ml-2" data-action="view-player" data-player-uid="${player.uid}">查看</button>
            `;
            ul.appendChild(li);
        });
        friendsListContainer.appendChild(ul);
    } else {
        friendsListContainer.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">沒有找到符合條件的玩家。</p>';
    }
    console.log("UI: Searched players displayed.");
}

export function updateFriendsListContainerWithMessage(message, isError = false) {
    const { friendsListContainer } = GameState.elements;
    if (friendsListContainer) {
        friendsListContainer.innerHTML = `<p class="text-center text-base ${isError ? 'text-[var(--danger-color)]' : 'text-[var(--text-secondary)]'}">${message}</p>`;
    }
    console.log(`UI: Friends list container message updated: "${message}", isError: ${isError}`);
}


export function openAndPopulatePlayerInfoModal(playerGameData, targetPlayerUid) {
    const { playerInfoNickname, playerInfoUid, playerInfoWins, playerInfoLosses, playerInfoGold, playerInfoDiamond, playerInfoAchievements, playerInfoAchievementsEmptyMessage, playerInfoOwnedMonsters, playerInfoOwnedMonstersEmptyMessage } = GameState.elements;

    if (!playerInfoNickname || !playerInfoUid || !playerInfoWins || !playerInfoLosses || !playerInfoGold || !playerInfoDiamond || !playerInfoAchievements || !playerInfoAchievementsEmptyMessage || !playerInfoOwnedMonsters || !playerInfoOwnedMonstersEmptyMessage) {
        console.error("UI: Player info modal elements not found in GameState.elements.");
        return;
    }

    // 這裡假設 playerGameData 已經包含完整的玩家資料
    const player = playerGameData; // 或者從 GameState.playerData 獲取

    playerInfoNickname.textContent = player.nickname || '未知玩家';
    playerInfoUid.textContent = player.uid || '未知ID';
    playerInfoWins.textContent = player.wins || 0;
    playerInfoLosses.textContent = player.losses || 0;
    playerInfoGold.textContent = player.gold || 0;
    playerInfoDiamond.textContent = player.diamond || 0;

    // 成就列表
    if (player.achievements && player.achievements.length > 0) {
        playerInfoAchievements.innerHTML = player.achievements.map(ach => `<li>${ach.title}: ${ach.description}</li>`).join('');
        playerInfoAchievementsEmptyMessage.style.display = 'none';
    } else {
        playerInfoAchievements.innerHTML = '';
        playerInfoAchievementsEmptyMessage.style.display = 'block';
    }

    // 擁有怪獸列表
    if (player.ownedMonsters && player.ownedMonsters.length > 0) {
        playerInfoOwnedMonsters.innerHTML = player.ownedMonsters.map(monster => `
            <li><span class="monster-name">${monster.nickname}</span> <span class="monster-score">總評價: ${monster.totalEvaluation || 0}</span></li>
        `).join('');
        playerInfoOwnedMonstersEmptyMessage.style.display = 'none';
    } else {
        playerInfoOwnedMonsters.innerHTML = '';
        playerInfoOwnedMonstersEmptyMessage.style.display = 'block';
    }

    openModal('player-info-modal');
    console.log(`UI: Player info modal populated and opened for UID: ${targetPlayerUid}.`);
}

export function displayBattleLog(logEntries) {
    const { battleLogArea, battleLogEmptyMessage } = GameState.elements;
    if (!battleLogArea || !battleLogEmptyMessage) { console.error("UI: Battle log elements not found!"); return; }

    battleLogArea.innerHTML = ''; // 清空現有內容

    if (logEntries && logEntries.length > 0) {
        logEntries.forEach(entry => {
            const p = document.createElement('p');
            // 這裡可以根據 logEntry 的類型應用不同的樣式，例如：
            // if (entry.type === 'turn-divider') p.className = 'turn-divider';
            // if (entry.type === 'crit-hit') p.className = 'crit-hit';
            p.innerHTML = entry.message; // 假設 message 已經包含 HTML 標籤
            battleLogArea.appendChild(p);
        });
        battleLogEmptyMessage.style.display = 'none';
    } else {
        battleLogEmptyMessage.style.display = 'block';
    }
    openModal('battle-log-modal');
    console.log("UI: Battle log displayed.");
}

export function renderDnaDrawResults(drawnDnaForModal) {
    const { dnaDrawResultsGrid } = GameState.elements;
    if (!dnaDrawResultsGrid) { console.error("UI: dnaDrawResultsGrid not found!"); return; }

    dnaDrawResultsGrid.innerHTML = '';
    if (drawnDnaForModal && drawnDnaForModal.length > 0) {
        drawnDnaForModal.forEach(dna => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dna-draw-result-item';
            const elementStyle = getElementStyling(dna.elements && dna.elements.length > 0 ? dna.elements[0] : '無');
            const rarityStyle = getRarityStyling(dna.rarity);

            itemDiv.innerHTML = `
                <span class="dna-name" style="color:${rarityStyle.text};">${dna.name}</span>
                <span class="dna-type" style="color:${elementStyle.text};">${dna.elements ? dna.elements.join('/') + '屬性' : '無屬性'}</span>
                <span class="dna-rarity" style="color:${rarityStyle.text};">稀有度: ${dna.rarity}</span>
                <button class="text-xs secondary p-1 add-drawn-to-temp-backpack-btn" data-dna='${JSON.stringify(dna)}'>加入背包</button>
            `;
            dnaDrawResultsGrid.appendChild(itemDiv);
        });
    } else {
        dnaDrawResultsGrid.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4">未能抽到任何DNA...</p>';
    }
    openModal('dna-draw-modal'); // 顯示抽獎結果模態框
    console.log("UI: DNA draw results rendered.");
}


export function showAuthScreen() {
    const { authScreen, gameContainer } = GameState.elements;
    if (authScreen) {
        authScreen.style.display = 'flex';
    }
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
    closeAllModals(); // 確保所有彈窗關閉
    console.log("UI: Auth screen shown.");
}

export function showGameScreenAfterLogin() {
    const { authScreen, gameContainer } = GameState.elements;
    if (authScreen) {
        authScreen.style.display = 'none';
    }
    if (gameContainer) {
        gameContainer.style.display = 'flex'; // 這裡設置為 flex，因為 layout.css 中已經定義了 flex-direction 和 align-items
    }
    closeAllModals(); // 登入後關閉所有彈窗
    console.log("UI: Game screen shown after login.");
}

export function initializeInventoryDisplay() {
    // 這個函式現在只負責呼叫 UI 相關的填充函式
    populateInventory();
    populateTemporaryBackpack();
    console.log("UI: Inventory display initialized (called populate functions).");
}

export function updateMonsterInfoButtonState(currentMonster) {
    const { monsterInfoButton } = GameState.elements;
    if (monsterInfoButton) {
        monsterInfoButton.disabled = !currentMonster;
        // 注意: 點擊事件監聽器應在 event-handlers.js 中綁定，這裡只更新狀態
    }
    console.log("UI: Monster info button state updated.");
}

export function updateActionButtonsStateUI() {
    const { combineButton, monsterInfoButton } = GameState.elements;

    // 更新組合按鈕狀態
    if (combineButton) {
        const hasItemsInCombination = GameState.combinationSlotsData.some(s => s !== null);
        combineButton.disabled = !hasItemsInCombination;
    }

    // 更新怪獸資訊按鈕狀態
    if (monsterInfoButton) {
         // 判斷是否有怪獸可以顯示資訊
         const monsterForInfo = GameState.currentMonster; // 假設 GameState.currentMonster 是當前選中的怪獸
         monsterInfoButton.disabled = !monsterForInfo;
    }
    console.log("UI: Action buttons state updated.");
}

// --- 拖放相關 UI 設置 ---
export function setupDropZones() {
    const { inventoryItemsContainer, temporaryBackpackItemsContainer, dnaCombinationSlotsContainer, inventoryDeleteSlot, drawDnaBtn } = GameState.elements; // Changed to dnaCombinationSlotsContainer

    // 確保這些元素存在
    if (!inventoryItemsContainer || !temporaryBackpackItemsContainer || !dnaCombinationSlotsContainer || !inventoryDeleteSlot || !drawDnaBtn) {
        console.error("UI: One or more drop zone elements not found in GameState.elements.");
        return;
    }

    // 將拖放事件監聽器綁定到容器上，使用事件委託
    // 這些事件處理函式將呼叫 GameLogic 中的對應邏輯

    // 庫存區 (用於拖出物品)
    inventoryItemsContainer.addEventListener('dragstart', GameLogic.handleDragStart);
    inventoryItemsContainer.addEventListener('dragover', GameLogic.handleDragOver);
    inventoryItemsContainer.addEventListener('dragleave', GameLogic.handleDragLeave);
    inventoryItemsContainer.addEventListener('drop', GameLogic.handleDrop); // 處理拖放到庫存區

    // 臨時背包區 (用於拖出物品)
    temporaryBackpackItemsContainer.addEventListener('dragstart', GameLogic.handleDragStart);
    temporaryBackpackItemsContainer.addEventListener('dragover', GameLogic.handleDragOver);
    temporaryBackpackItemsContainer.addEventListener('dragleave', GameLogic.handleDragLeave);
    temporaryBackpackItemsContainer.addEventListener('drop', GameLogic.handleDrop); // 處理拖放到臨時背包區

    // DNA 組合槽 (用於拖入物品)
    dnaCombinationSlotsContainer.addEventListener('dragover', GameLogic.handleDragOver); // Changed to dnaCombinationSlotsContainer
    dnaCombinationSlotsContainer.addEventListener('dragleave', GameLogic.handleDragLeave); // Changed to dnaCombinationSlotsContainer
    dnaCombinationSlotsContainer.addEventListener('drop', GameLogic.handleDrop); // Changed to dnaCombinationSlotsContainer

    // 刪除區 (用於拖入物品)
    inventoryDeleteSlot.addEventListener('dragover', GameLogic.handleDragOver);
    inventoryDeleteSlot.addEventListener('dragleave', GameLogic.handleDragLeave);
    inventoryDeleteSlot.addEventListener('drop', GameLogic.handleDropOnDeleteSlot); // 呼叫 GameLogic 中的刪除邏輯

    console.log("UI: Drag and Drop listeners initialized via setupDropZones.");
}
