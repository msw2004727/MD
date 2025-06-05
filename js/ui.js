// js/ui.js

// 假設 gameState 全局可訪問或作為參數傳遞
// 假設 gameState.dnaFragmentSlotsData = [frag1, null, frag2, ...];
// 假設 MAX_DNA_SLOTS 在 config.js 中定義 (例如: export const MAX_DNA_SLOTS = 10;)

let draggedItem = null; // 當前被拖曳的 DNA 碎片元素
let sourceSlotIndex = null; // 被拖曳元素的原插槽索引

/**
 * 初始化 DNA 碎片網格的視覺插槽。
 * @param {number} slotCount - 要創建的插槽數量。
 */
export function initializeDnaFragmentGrid(slotCount) {
    const fragmentsContainer = document.querySelector('.dna-fragment-slots');
    if (!fragmentsContainer) {
        console.error("錯誤：找不到 DNA 碎片插槽容器 '.dna-fragment-slots'。");
        return;
    }
    fragmentsContainer.innerHTML = ''; // 清除先前內容
    // fragmentsContainer.style.display = 'grid'; // 使用 CSS 檔案中的樣式控制 display
    // fragmentsContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(100px, 1fr))`; // 移至 CSS
    // fragmentsContainer.style.gap = '10px'; // 移至 CSS
    // fragmentsContainer.style.padding = '10px'; // 移至 CSS
    // fragmentsContainer.style.minHeight = '150px'; // 移至 CSS

    for (let i = 0; i < slotCount; i++) {
        const slot = document.createElement('div');
        slot.classList.add('dna-slot');
        slot.dataset.slotIndex = i; // 設置插槽索引，用於邏輯處理
        // slot.style.border = '1px dashed #ccc'; // 移至 CSS
        // slot.style.minHeight = '60px'; // 移至 CSS
        // slot.style.display = 'flex'; // 移至 CSS
        // slot.style.alignItems = 'center'; // 移至 CSS
        // slot.style.justifyContent = 'center'; // 移至 CSS
        // slot.style.borderRadius = '4px'; // 移至 CSS

        // 為每個插槽添加拖放事件監聽器
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragenter', handleDragEnter);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
        fragmentsContainer.appendChild(slot);
    }
}

/**
 * 將可拖曳的 DNA 碎片渲染到網格插槽中。
 * @param {Array<Object|null>} fragmentsData - 代表每個插槽中 DNA 碎片的數據陣列。
 * null 表示空插槽。
 */
export function renderDnaFragmentsInGrid(fragmentsData) {
    const slots = document.querySelectorAll('.dna-fragment-slots .dna-slot');
    if (slots.length !== fragmentsData.length) {
        console.warn("插槽數量與碎片數據長度不匹配。可能需要重新初始化網格。");
        // 可以考慮在這裡調用 initializeDnaFragmentGrid(fragmentsData.length) 或拋出錯誤
    }

    slots.forEach((slot, index) => {
        slot.innerHTML = ''; // 清除此插槽中先前的碎片
        if (index < fragmentsData.length) { // 確保不超出 fragmentsData 範圍
            const fragment = fragmentsData[index];
            if (fragment) { // 如果插槽中有碎片數據
                const fragmentElement = createFragmentElement(fragment, index);
                slot.appendChild(fragmentElement);
            }
        }
    });
}

/**
 * 創建單個可拖曳的 DNA 碎片元素。
 * @param {Object} fragment - 包含 DNA 碎片信息的對象 (例如 { id: '...', sequence: '...' })。
 * @param {number} slotIndex - 此碎片所在的插槽索引。
 * @returns {HTMLElement} 創建的 DNA 碎片 DOM 元素。
 */
function createFragmentElement(fragment, slotIndex) {
    const div = document.createElement('div');
    div.classList.add('dna-fragment-item');
    // 確保 fragment.id 存在且唯一，如果不存在，則生成一個隨機ID
    div.id = `fragment-${fragment.id || (Date.now().toString(36) + Math.random().toString(36).substr(2, 5))}`;
    div.textContent = fragment.sequence || 'N/A'; // 顯示序列，如果沒有則顯示 N/A
    div.draggable = true; // 使元素可拖曳

    // 可選：將原始碎片數據存儲在元素上，以便後續訪問
    // div.dataset.fragmentData = JSON.stringify(fragment); 
    div.dataset.currentSlotIndex = slotIndex; // 標記其當前所在的插槽索引

    // 樣式已移至 CSS，這裡可以移除內聯樣式
    // div.style.padding = '10px';
    // ... 其他內聯樣式 ...

    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    return div;
}


// --- 拖放事件處理程序 ---

function handleDragStart(event) {
    draggedItem = event.target; // event.target 是被拖曳的 .dna-fragment-item
    // sourceSlotIndex 應該從被拖曳元素的父級 .dna-slot 獲取
    if (draggedItem.parentElement && draggedItem.parentElement.classList.contains('dna-slot')) {
        sourceSlotIndex = parseInt(draggedItem.parentElement.dataset.slotIndex);
    } else {
        console.error("無法確定拖曳元素的來源插槽。");
        event.preventDefault(); // 阻止拖曳操作
        return;
    }
    
    event.dataTransfer.setData('text/plain', draggedItem.id); // 可以用於識別被拖曳的元素
    event.dataTransfer.effectAllowed = 'move'; // 允許的拖放操作類型
    
    // 延遲添加 dragging class 以確保瀏覽器有時間擷取拖曳圖像
    setTimeout(() => {
        if (draggedItem) draggedItem.classList.add('dragging');
    }, 0);
    // console.log(`開始拖曳: 元素ID ${draggedItem.id}, 從插槽索引 ${sourceSlotIndex}`);
}

function handleDragOver(event) {
    event.preventDefault(); // 必須阻止默認行為以允許放置
    event.dataTransfer.dropEffect = 'move'; // 指示放置效果
}

function handleDragEnter(event) {
    event.preventDefault();
    let targetSlot = event.target;
    // 如果事件目標是插槽內的碎片，則將目標更正為其父級插槽
    if (targetSlot.classList.contains('dna-fragment-item')) {
        targetSlot = targetSlot.parentElement;
    }
    // 確保目標是有效的 DNA 插槽
    if (targetSlot.classList && targetSlot.classList.contains('dna-slot')) {
        targetSlot.classList.add('drag-over'); // 添加視覺反饋樣式
        // console.log('進入插槽:', targetSlot.dataset.slotIndex);
    }
}

function handleDragLeave(event) {
    let targetSlot = event.target;
    if (targetSlot.classList.contains('dna-fragment-item')) {
        targetSlot = targetSlot.parentElement;
    }
    if (targetSlot.classList && targetSlot.classList.contains('dna-slot')) {
        targetSlot.classList.remove('drag-over'); // 移除視覺反饋樣式
        // console.log('離開插槽:', targetSlot.dataset.slotIndex);
    }
}

function handleDrop(event) {
    event.preventDefault();
    // console.log('觸發放置事件');

    let targetDropZone = event.target;
    // 從事件目標向上遍歷，以找到實際的 '.dna-slot'
    while (targetDropZone && !targetDropZone.classList.contains('dna-slot')) {
        targetDropZone = targetDropZone.parentElement;
    }

    if (!draggedItem) {
        console.error("沒有找到被拖曳的項目。");
        cleanupDragStyles();
        return;
    }

    if (!targetDropZone || !targetDropZone.classList.contains('dna-slot')) {
        console.error("放置目標不是有效的插槽。");
        if (draggedItem) draggedItem.classList.remove('dragging');
        cleanupDragStyles();
        return;
    }

    targetDropZone.classList.remove('drag-over'); // 移除目標插槽的高亮

    const targetSlotIndex = parseInt(targetDropZone.dataset.slotIndex);

    if (isNaN(sourceSlotIndex) || isNaN(targetSlotIndex)) {
        console.error("來源或目標插槽索引無效。", `源: ${sourceSlotIndex}`, `目標: ${targetSlotIndex}`);
        if (draggedItem) draggedItem.classList.remove('dragging');
        cleanupDragStyles();
        return;
    }

    if (sourceSlotIndex === targetSlotIndex) {
        // console.log("放置在同一個插槽，不執行操作。");
        if (draggedItem) draggedItem.classList.remove('dragging');
        cleanupDragStyles();
        return;
    }
    
    // console.log(`放置: 元素ID ${draggedItem.id} (從插槽 ${sourceSlotIndex}) 到插槽 ${targetSlotIndex}`);

    // **核心邏輯: 更新遊戲狀態並重新渲染**
    // 這裡需要調用您遊戲狀態管理中的函數來實際交換數據
    // 並觸發 UI 的重新渲染。

    // 示例：假設您有一個全局的 gameState 對象和一個管理 DNA 碎片順序的函數
    if (window.gameState && typeof window.gameState.updateDnaFragmentOrderAndRender === 'function') {
        window.gameState.updateDnaFragmentOrderAndRender(sourceSlotIndex, targetSlotIndex);
    } else {
        // 如果沒有集中的狀態管理，這裡提供一個簡化的 DOM 直接操作作為備選（不推薦用於複雜應用）
        console.warn("未找到 gameState.updateDnaFragmentOrderAndRender 函數。將執行簡化的 DOM 交換。這可能導致數據與 UI 不同步。");
        
        const itemCurrentlyInTargetSlot = targetDropZone.querySelector('.dna-fragment-item');
        const sourceSlotElement = document.querySelector(`.dna-fragment-slots .dna-slot[data-slot-index="${sourceSlotIndex}"]`);

        if (itemCurrentlyInTargetSlot) { // 如果目標插槽有其他物品，則交換
            if (sourceSlotElement) {
                 sourceSlotElement.appendChild(itemCurrentlyInTargetSlot); // 將目標插槽的物品移到來源插槽
            } else {
                console.error("無法找到來源插槽元素進行交換。");
            }
        }
        targetDropZone.appendChild(draggedItem); // 將拖曳的物品放入目標插槽
    }
    
    // 清理工作在 handleDragEnd 中進行
}

function handleDragEnd(event) {
    // console.log('拖曳結束');
    if (draggedItem) { // 檢查 draggedItem 是否仍然設置
        draggedItem.classList.remove('dragging');
    }
    cleanupDragStyles(); // 清理所有插槽的 'drag-over' 樣式

    // 重置全局變量
    draggedItem = null;
    sourceSlotIndex = null;
}

/**
 * 清理所有插槽上的拖曳相關樣式（例如 'drag-over'）。
 */
function cleanupDragStyles() {
    document.querySelectorAll('.dna-fragment-slots .dna-slot.drag-over').forEach(s => {
        s.classList.remove('drag-over');
    });
}


// --- 舊的 DNA 碎片處理邏輯 ---
// 舊的 `populateDnaFragmentSlots` 函數與新的網格/插槽模型不兼容，
// 應被 `initializeDnaFragmentGrid` 和 `renderDnaFragmentsInGrid` 替代。
// 如果您在其他地方調用了 `populateDnaFragmentSlots`，
// 請確保更新為調用新的初始化和渲染函數。
/*
export function populateDnaFragmentSlots(fragments) {
    // ... 舊的排序和直接 DOM 操作邏輯 ...
    // 此函數已被新的基於插槽的系統取代。
}
*/

// --- 其他現有的 UI 函數 (showMessage, updatePlayerInfo 等) ---
// 這些函數如果仍在正確使用，應予以保留。
// 為簡潔起見，此處不再重複列出所有這些函數，但它們應成為最終文件的一部分。

export function showMessage(message, type = 'info', duration = 3000) {
    const container = document.getElementById('message-container');
    if (!container) {
        // console.error('未找到消息容器 (#message-container)!');
        // 如果沒有消息容器，可以考慮在 body 頂部動態創建一個
        const dynamicContainer = document.createElement('div');
        dynamicContainer.id = 'message-container';
        dynamicContainer.style.position = 'fixed';
        dynamicContainer.style.top = '20px';
        dynamicContainer.style.left = '50%';
        dynamicContainer.style.transform = 'translateX(-50%)';
        dynamicContainer.style.zIndex = '2000';
        dynamicContainer.style.display = 'flex';
        dynamicContainer.style.flexDirection = 'column';
        dynamicContainer.style.alignItems = 'center';
        document.body.appendChild(dynamicContainer);
        // console.log("已動態創建 #message-container");
        //showMessage(message, type, duration); // Retry with the new container
        //return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`; // 確保 CSS 中有對應的樣式
    messageDiv.textContent = message;
    
    // 添加一些基本樣式以確保可見性，以防 CSS 未完全加載
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.margin = '5px 0';
    messageDiv.style.borderRadius = 'var(--border-radius-small, 4px)';
    messageDiv.style.boxShadow = 'var(--box-shadow, 0 2px 5px rgba(0,0,0,0.2))';
    messageDiv.style.color = 'white'; // 默認文字顏色，背景色依 type 而定

    if (type === 'error') messageDiv.style.backgroundColor = 'var(--error-color, #e74c3c)';
    else if (type === 'success') messageDiv.style.backgroundColor = 'var(--success-color, #2ecc71)';
    else messageDiv.style.backgroundColor = 'var(--primary-color, #3498db)';


    (container || document.getElementById('message-container')).appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => messageDiv.remove(), 500);
    }, duration);
}

export function updatePlayerInfo(player) {
    const playerNameEl = document.getElementById('player-name-display');
    const scoreEl = document.getElementById('player-score-display');
    // 可以根據需要添加其他玩家信息元素的ID

    if (playerNameEl) playerNameEl.textContent = player.name || '玩家';
    if (scoreEl) scoreEl.textContent = player.score !== undefined ? player.score.toString() : '0'; // 確保是字符串
    // console.log("玩家信息已更新:", player);
}


export function updateChallengeInfo(challenge) {
    // console.log("正在使用以下信息更新挑戰信息:", challenge);
    const nameEl = document.getElementById('challenge-name');
    const descriptionEl = document.getElementById('challenge-description');
    const difficultyEl = document.getElementById('challenge-difficulty');
    const rewardsEl = document.getElementById('challenge-rewards');

    if (!nameEl || !descriptionEl || !difficultyEl || !rewardsEl) {
        console.warn("一個或多個挑戰信息元素未在 DOM 中找到。");
    }

    if (nameEl) nameEl.textContent = challenge.name || '未知挑戰';
    if (descriptionEl) descriptionEl.textContent = challenge.description || '沒有描述。';
    if (difficultyEl) difficultyEl.textContent = `難度: ${challenge.difficulty || '未知'}`;
    if (rewardsEl) {
        let rewardText = '無';
        if (challenge.rewards) {
            if (Array.isArray(challenge.rewards)) {
                rewardText = challenge.rewards.join(', ');
            } else if (typeof challenge.rewards === 'object') { // 例如 { points: 100, items: ["itemA"] }
                rewardText = Object.entries(challenge.rewards)
                                   .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join('/') : value}`)
                                   .join(', ');
            } else {
                rewardText = challenge.rewards.toString();
            }
        }
        rewardsEl.textContent = `獎勵: ${rewardText}`;
    }
}


export function displayAvailableChallenges(challenges, selectChallengeCallback) {
    const container = document.getElementById('challenge-selection-area');
    if (!container) {
        console.error("未找到挑戰選擇容器 (#challenge-selection-area)!");
        return;
    }
    
    let list = container.querySelector('ul');
    if (!list) {
        list = document.createElement('ul');
        list.style.listStyleType = 'none'; // 移除列表符號
        list.style.paddingLeft = '0'; // 移除默認的左內邊距
        container.appendChild(list);
    }
    list.innerHTML = ''; // 清除先前的挑戰列表

    if (!challenges || challenges.length === 0) {
        const noChallengeItem = document.createElement('li');
        noChallengeItem.textContent = '目前沒有可用的挑戰。';
        noChallengeItem.style.padding = '10px';
        noChallengeItem.style.textAlign = 'center';
        list.appendChild(noChallengeItem);
        return;
    }

    challenges.forEach(challenge => {
        const listItem = document.createElement('li');
        listItem.classList.add('challenge-item'); // 添加樣式類
        // 樣式建議在 CSS 文件中定義 .challenge-item
        listItem.style.display = 'flex';
        listItem.style.justifyContent = 'space-between';
        listItem.style.alignItems = 'center';
        listItem.style.padding = '10px';
        listItem.style.border = '1px solid var(--border-color, #ccc)';
        listItem.style.borderRadius = 'var(--border-radius-small, 4px)';
        listItem.style.marginBottom = '10px';
        listItem.style.backgroundColor = 'var(--background-color-soft, #f9f9f9)';
        
        const infoDiv = document.createElement('div');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = challenge.name || '未命名挑戰';
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.color = 'var(--primary-color, blue)';
        
        const difficultySpan = document.createElement('span');
        difficultySpan.textContent = ` (難度: ${challenge.difficulty || '未知'})`;
        difficultySpan.style.fontSize = '0.9em';
        difficultySpan.style.marginLeft = '10px';
        difficultySpan.style.color = 'var(--text-color, black)';

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(difficultySpan);

        const selectButton = document.createElement('button');
        selectButton.textContent = '選擇';
        selectButton.classList.add('button-primary'); // 使用主題按鈕樣式
        // selectButton.style.marginLeft = '20px'; // 由 flexbox 控制間距
        selectButton.onclick = () => {
            if (typeof selectChallengeCallback === 'function') {
                selectChallengeCallback(challenge.id);
            } else {
                console.error("selectChallengeCallback 不是一個函數。");
            }
        };

        listItem.appendChild(infoDiv);
        listItem.appendChild(selectButton);
        list.appendChild(listItem);
    });
}


export function showSection(sectionId) {
    const sections = document.querySelectorAll('.section'); // 假設所有主要區域都有 'section' class
    sections.forEach(section => {
        if (!section.classList.contains('hidden')) {
            section.classList.add('hidden');
        }
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.remove('hidden');
    } else {
        console.error(`未找到 ID 為 '${sectionId}' 的區域。`);
    }
}

export function updateTargetSequenceDisplay(sequence) {
    const el = document.getElementById('target-sequence-display');
    if (el) {
        const span = el.querySelector('span');
        if (span) span.textContent = sequence || '無';
        else el.textContent = `目標序列: ${sequence || '無'}`; // Fallback if no span
    }
}

export function updateAssembledSequenceDisplay(sequence) {
    const el = document.getElementById('assembled-sequence-display');
    if (el) {
        const span = el.querySelector('span');
        if (span) span.textContent = sequence || '無';
        else el.textContent = `你的序列: ${sequence || '無'}`; // Fallback if no span
    }
}

export function updateAssemblyFeedback(message, isError = false) {
    const el = document.getElementById('assembly-feedback');
    if (el) {
        el.textContent = message;
        el.style.color = isError ? 'var(--error-color, red)' : 'var(--success-color, green)';
    }
}

// 確保在您的主邏輯中 (例如 main.js 或 game-logic.js) 調用新的 DNA 碎片區域設置函數。
// 例如:
/*
import { initializeDnaFragmentGrid, renderDnaFragmentsInGrid } from './js/ui.js';
import { MAX_DNA_SLOTS } from './js/config.js'; // 假設 config.js 中有此常量

// 這個陣列應該是您遊戲狀態的一部分，代表插槽中的 DNA 碎片數據
// 它應該由您的遊戲邏輯（例如 game-state.js）管理
// window.currentFragmentsInSlots = []; // 不建議使用全局 window 變量，應通過模塊或 gameState 管理

export function setupDnaFragmentsArea(initialFragments, gameStateManager) {
    // 初始化數據陣列。用初始碎片填充，並用 null 填充至 MAX_DNA_SLOTS
    let fragmentsDataForGrid = new Array(MAX_DNA_SLOTS).fill(null);
    if (initialFragments) {
        initialFragments.slice(0, MAX_DNA_SLOTS).forEach((frag, index) => {
            // 確保 fragment 對象至少有 id 和 sequence 屬性
            fragmentsDataForGrid[index] = { 
                id: frag.id || `frag-${index}-${Date.now()}`, // 提供備用ID
                sequence: frag.sequence || "---",
                ...frag // 保留其他可能的屬性
            };
        });
    }
    
    // 將此數據存儲在您的 gameStateManager 中
    // gameStateManager.setDnaFragmentSlots(fragmentsDataForGrid);


    // ** 關鍵步驟：將 gameStateManager 傳遞或使其可訪問 **
    // 以便 handleDrop 可以調用它來更新狀態並重新渲染。
    // 這裡假設 gameState 有一個方法來更新順序並觸發渲染。
    if (!window.gameState) window.gameState = {};
    window.gameState.updateDnaFragmentOrderAndRender = (fromIndex, toIndex) => {
        // const currentSlots = gameStateManager.getDnaFragmentSlots(); // 從狀態管理器獲取當前數據
        // 假設 currentSlots 是 fragmentsDataForGrid 的引用或副本
        // 這裡直接修改 fragmentsDataForGrid (如果它是狀態的一部分)
        
        const itemBeingDragged = fragmentsDataForGrid[fromIndex];
        const itemInTargetSlot = fragmentsDataForGrid[toIndex];

        fragmentsDataForGrid[toIndex] = itemBeingDragged;
        fragmentsDataForGrid[fromIndex] = itemInTargetSlot;
        
        // 更新狀態管理器中的數據
        // gameStateManager.setDnaFragmentSlots(fragmentsDataForGrid);

        // 在更新數據後，重新渲染網格
        renderDnaFragmentsInGrid(fragmentsDataForGrid);
        
        // console.log("DNA 碎片順序已更新並重新渲染:", fragmentsDataForGrid);
    };


    initializeDnaFragmentGrid(MAX_DNA_SLOTS); // 創建空的視覺插槽
    renderDnaFragmentsInGrid(fragmentsDataForGrid); // 將碎片數據渲染到插槽中
}

// 在您的遊戲初始化或獲取到 DNA 碎片數據後調用 `setupDnaFragmentsArea`
// 例如: const fetchedFragments = await apiClient.getDnaFragments(challengeId);
// setupDnaFragmentsArea(fetchedFragments, myGameStateManager); // 傳入您的狀態管理器
*/
