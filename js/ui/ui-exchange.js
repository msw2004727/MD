// js/ui/ui-exchange.js

/**
 * 【重構】從後端獲取數據，存入gameState，然後觸發排序和渲染
 */
async function renderExchange() {
    const grid = document.getElementById('exchange-content-grid');
    if (!grid) return;

    grid.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10 col-span-full">正在從星際交易所獲取最新商品...</p>';

    try {
        const listings = await getExchangeListings();
        gameState.exchangeListings = listings || []; // 緩存原始列表
        sortAndRenderExchangeListings(); // 根據當前排序設定來渲染
    } catch (error) {
        console.error("獲取交易所商品失敗:", error);
        grid.innerHTML = '<p class="text-center text-lg text-[var(--danger-color)] py-10 col-span-full">無法載入交易所商品，請稍後再試。</p>';
    }
}

/**
 * 【新】根據 gameState 中的排序設定，對緩存的��品列表進行排序並渲染
 */
function sortAndRenderExchangeListings() {
    const grid = document.getElementById('exchange-content-grid');
    if (!grid) return;

    const listings = [...gameState.exchangeListings]; // 創建一個副本來排序
    const { key, order } = gameState.exchangeSortConfig;

    // 定義稀有度的排序權重
    const rarityOrder = { '普通': 1, '稀有': 2, '菁英': 3, '傳奇': 4, '神話': 5 };

    listings.sort((a, b) => {
        let valA, valB;

        if (key === 'rarity') {
            valA = rarityOrder[a.dna.rarity] || 0;
            valB = rarityOrder[b.dna.rarity] || 0;
        } else if (['price', 'listedAt'].includes(key)) {
            valA = a[key];
            valB = b[key];
        } else {
            // 處理 HP, MP, attack 等在 dna 物件內部的屬性
            valA = a.dna[key];
            valB = b.dna[key];
        }
        
        // 確保是數字類型
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;

        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
    });

    grid.innerHTML = ''; // 清空現有內容

    if (listings.length === 0) {
        grid.innerHTML = '<p class="text-center text-lg text-[var(--text-secondary)] py-10 col-span-full">交易所目前沒有任何商品。</p>';
        return;
    }

    listings.forEach(item => {
        const card = document.createElement('div');
        const rarityKey = (item.dna.rarity || '普通').toLowerCase();
        const elementCssKey = getElementCssClassKey(item.dna.type || '無');
        
        card.className = `exchange-dna-card dna-item rarity-${rarityKey} element-${elementCssKey}`;
        
        const rarityClass = `text-rarity-${rarityKey}`;
        const elementType = item.dna.type || '無';
        const elementTypeClass = `text-element-${elementCssKey}`;

        card.innerHTML = `
            <div class="exchange-dna-info">
                <p class="exchange-dna-name ${rarityClass}">${item.dna.name}</p>
                <p class="exchange-dna-type ${elementTypeClass}">${elementType}屬性</p>
                <p class="exchange-dna-rarity ${rarityClass}">${item.dna.rarity}</p>
                <p class="exchange-dna-price">🪙 ${item.price.toLocaleString()}</p>
                <p class="exchange-dna-seller">${item.sellerName}</p>
            </div>
        `;
        
        card.addEventListener('click', () => openExchangeItemModal(item));
        grid.appendChild(card);
    });
}


/**
 * 渲染「我的賣場」彈窗
 */
async function renderMyStoreModal() {
    const sellableGrid = document.getElementById('sellable-dna-grid');
    const listedGrid = document.getElementById('listed-items-grid');
    if (!sellableGrid || !listedGrid) return;

    // 渲染可上架的DNA
    const sellableDna = gameState.playerData.playerOwnedDNA.filter(Boolean);
    if (sellableDna.length === 0) {
        sellableGrid.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">您的庫存中沒有可上架的DNA。</p>';
    } else {
        sellableGrid.innerHTML = '';
        sellableDna.forEach(dna => {
            const card = document.createElement('div');
            const rarityKey = (dna.rarity || '普通').toLowerCase();
            const elementCssKey = getElementCssClassKey(dna.type || '無');
            
            card.className = `exchange-dna-card dna-item rarity-${rarityKey} element-${elementCssKey}`;
            
            const rarityClass = `text-rarity-${rarityKey}`;
            const elementType = dna.type || '無';
            const elementTypeClass = `text-element-${elementCssKey}`;

            card.innerHTML = `
                <div class="exchange-dna-info">
                    <p class="exchange-dna-name ${rarityClass}">${dna.name}</p>
                    <p class="exchange-dna-type ${elementTypeClass}">${elementType}屬性</p>
                    <p class="exchange-dna-rarity ${rarityClass}">${dna.rarity}</p>
                </div>
            `;
            card.addEventListener('click', () => openListingSetupModal(dna));
            sellableGrid.appendChild(card);
        });
    }

    // 從後端獲取正在販售的商品並渲染
    listedGrid.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">正在獲取您販售中的商品...</p>';
    try {
        const myListings = await getMyExchangeListings();
        if (myListings.length === 0) {
            listedGrid.innerHTML = '<p class="text-center text-sm text-[var(--text-secondary)] py-4 col-span-full">您沒有正在販售的商品。</p>';
        } else {
            listedGrid.innerHTML = '';
            myListings.forEach(item => {
                const card = document.createElement('div');
                const rarityKey = (item.dna.rarity || '普通').toLowerCase();
                const elementCssKey = getElementCssClassKey(item.dna.type || '無');

                card.className = `exchange-dna-card dna-item rarity-${rarityKey} element-${elementCssKey}`;

                const rarityClass = `text-rarity-${rarityKey}`;
                const elementType = item.dna.type || '無';
                const elementTypeClass = `text-element-${elementCssKey}`;

                card.innerHTML = `
                    <div class="exchange-dna-info">
                        <p class="exchange-dna-name ${rarityClass}">${item.dna.name}</p>
                        <p class="exchange-dna-type ${elementTypeClass}">${elementType}屬性</p>
                        <p class="exchange-dna-rarity ${rarityClass}">${item.dna.rarity}</p>
                        <p class="exchange-dna-price">🪙 ${item.price.toLocaleString()}</p>
                    </div>
                `;
                card.addEventListener('click', () => openMyListedItemModal(item));
                listedGrid.appendChild(card);
            });
        }
    } catch (error) {
        console.error("獲取我的商品失敗:", error);
        listedGrid.innerHTML = '<p class="text-center text-sm text-[var(--danger-color)] py-4 col-span-full">無法載入您的商品。</p>';
    }
}

/**
 * 打開交易所商品的購買彈窗
 */
function openExchangeItemModal(item) {
    const modal = document.getElementById('exchange-item-modal');
    if (!modal) return;

    const dna = item.dna;

    modal.querySelector('#modal-dna-name').textContent = dna.name;
    const rarityEl = modal.querySelector('#modal-dna-rarity');
    rarityEl.textContent = dna.rarity;
    rarityEl.className = `rarity text-rarity-${(dna.rarity || '普通').toLowerCase()}`;

    modal.querySelector('#modal-stat-hp').textContent = dna.hp;
    modal.querySelector('#modal-stat-mp').textContent = dna.mp;
    modal.querySelector('#modal-stat-attack').textContent = dna.attack;
    modal.querySelector('#modal-stat-defense').textContent = dna.defense;
    modal.querySelector('#modal-stat-speed').textContent = dna.speed;
    modal.querySelector('#modal-stat-crit').textContent = `${dna.crit}%`;

    const purchaseInfoContainer = modal.querySelector('.modal-purchase-info');
    purchaseInfoContainer.innerHTML = `
        <div class="price-seller">
            <div class="price">🪙 ${item.price.toLocaleString()}</div>
            <div class="seller">由 ${item.sellerName} 販售</div>
        </div>
        <button class="button success buy-item-btn">購買商品</button>
    `;
    
    const buyButton = purchaseInfoContainer.querySelector('.buy-item-btn');
    
    if (item.sellerId === gameState.playerId) {
        buyButton.disabled = true;
        buyButton.textContent = '自己的商品';
        buyButton.classList.remove('success');
        buyButton.classList.add('secondary');
    } else {
        buyButton.onclick = () => handlePurchaseItemClick(item);
    }
    
    showModal('exchange-item-modal');
}

/**
 * 打開「我的賣場」中可上架DNA的設定彈窗
 */
function openListingSetupModal(dna) {
    const modal = document.getElementById('exchange-item-modal');
    if (!modal) return;

    modal.querySelector('#modal-dna-name').textContent = dna.name;
    const rarityEl = modal.querySelector('#modal-dna-rarity');
    rarityEl.textContent = dna.rarity;
    rarityEl.className = `rarity text-rarity-${(dna.rarity || '普通').toLowerCase()}`;

    modal.querySelector('#modal-stat-hp').textContent = dna.hp;
    modal.querySelector('#modal-stat-mp').textContent = dna.mp;
    modal.querySelector('#modal-stat-attack').textContent = dna.attack;
    modal.querySelector('#modal-stat-defense').textContent = dna.defense;
    modal.querySelector('#modal-stat-speed').textContent = dna.speed;
    modal.querySelector('#modal-stat-crit').textContent = `${dna.crit}%`;

    const purchaseInfoContainer = modal.querySelector('.modal-purchase-info');
    purchaseInfoContainer.innerHTML = `
        <div class="list-price-section">
            <div class="price-input-wrapper">
                <label for="listing-price-input">🪙</label>
                <input type="number" id="listing-price-input" placeholder="請設定價格">
            </div>
            <p class="fee-notice" id="fee-notice-text">※ 將收取 10% 手續費</p>
        </div>
        <button class="button success list-item-confirm-btn">確認上架</button>
    `;
    
    const priceInputEl = purchaseInfoContainer.querySelector('#listing-price-input');
    const feeNoticeEl = purchaseInfoContainer.querySelector('#fee-notice-text');
    
    priceInputEl.addEventListener('input', () => {
        const price = parseInt(priceInputEl.value, 10) || 0;
        const fee = Math.max(1, Math.floor(price * 0.10));
        if (price > 0) {
            feeNoticeEl.textContent = `※ 手續��: ${fee.toLocaleString()} 🪙`;
        } else {
            feeNoticeEl.textContent = '※ 將收取 10% 手續費';
        }
    });

    const confirmButton = purchaseInfoContainer.querySelector('.list-item-confirm-btn');
    confirmButton.onclick = () => {
        const price = parseInt(priceInputEl.value, 10);
        if (isNaN(price) || price <= 0) {
            showFeedbackModal('錯誤', '請輸入一個有效的正整數價格。');
            return;
        }
        const fee = Math.max(1, Math.floor(price * 0.10));
        showConfirmationModal(
            '確認上架',
            `您確定要以 ${price.toLocaleString()} 🪙 的價格上架「${dna.name}」嗎？<br>系統將收取 ${fee.toLocaleString()} 🪙 的手續費。`,
            async () => {
                showFeedbackModal('處理中...', '正在將您的商品上架...', true);
                try {
                    const result = await createExchangeListing(dna.id, price);
                    if (result.success) {
                        await refreshPlayerData();
                        hideModal('feedback-modal');
                        hideModal('exchange-item-modal');
                        showFeedbackModal('成功', '您的DNA已成功上架！');
                        renderMyStoreModal();
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    hideModal('feedback-modal');
                    showFeedbackModal('上架失敗', error.message);
                }
            },
            { confirmButtonClass: 'success', confirmButtonText: '確認上架' }
        );
    };

    showModal('exchange-item-modal');
}

/**
 * 打開「我的賣場」中已上架商品的下架彈窗
 */
function openMyListedItemModal(item) {
    const modal = document.getElementById('exchange-item-modal');
    if (!modal) return;

    const dna = item.dna;

    modal.querySelector('#modal-dna-name').textContent = dna.name;
    const rarityEl = modal.querySelector('#modal-dna-rarity');
    rarityEl.textContent = dna.rarity;
    rarityEl.className = `rarity text-rarity-${(dna.rarity || '普通').toLowerCase()}`;

    modal.querySelector('#modal-stat-hp').textContent = dna.hp;
    modal.querySelector('#modal-stat-mp').textContent = dna.mp;
    modal.querySelector('#modal-stat-attack').textContent = dna.attack;
    modal.querySelector('#modal-stat-defense').textContent = dna.defense;
    modal.querySelector('#modal-stat-speed').textContent = dna.speed;
    modal.querySelector('#modal-stat-crit').textContent = `${dna.crit}%`;

    const purchaseInfoContainer = modal.querySelector('.modal-purchase-info');
    purchaseInfoContainer.innerHTML = `
        <div class="price-seller">
            <div class="price">🪙 ${item.price.toLocaleString()}</div>
            <div class="seller" style="color: var(--text-secondary); font-size: 0.9rem;">正在販售中...</div>
        </div>
        <button class="button danger delist-item-btn">下架商品</button>
    `;
    const delistButton = purchaseInfoContainer.querySelector('.delist-item-btn');
    delistButton.onclick = () => handleDelistItemClick(item.id);

    showModal('exchange-item-modal');
}

/**
 * 處理點擊「購買」按鈕的事件
 */
function handlePurchaseItemClick(item) {
    const buyerGold = gameState.playerData.playerStats.gold || 0;
    if (buyerGold < item.price) {
        showFeedbackModal('金幣不足', `購買「${item.dna.name}」需要 ${item.price.toLocaleString()} 🪙，但您只有 ${buyerGold.toLocaleString()} 🪙。`);
        return;
    }

    showConfirmationModal(
        '確認購買',
        `您確定要花費 ${item.price.toLocaleString()} 🪙 購買「${item.dna.name}」嗎？`,
        async () => {
            showFeedbackModal('交易處理中...', '正在為您完成交易...', true);
            try {
                const result = await purchaseExchangeItem(item.id);
                if (result.success) {
                    await refreshPlayerData();
                    hideModal('feedback-modal');
                    hideModal('exchange-item-modal');
                    showFeedbackModal('購買成功', `您已成功購買「${result.item_name}」！`);
                    renderExchange();
                } else {
                    throw new Error(result.error || '未知的錯誤');
                }
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('購買失敗', error.message);
            }
        },
        { confirmButtonClass: 'success', confirmButtonText: '確認購買' }
    );
}

/**
 * 處理點擊「下架」按鈕的事件
 */
function handleDelistItemClick(listingId) {
    showConfirmationModal(
        '確認下架',
        '您確定要下架此商品嗎？已支付的手續費將不予退還。',
        async () => {
            showFeedbackModal('處理中...', '正在下架您的商品...', true);
            try {
                const result = await cancelExchangeListing(listingId);
                if (result.success) {
                    await refreshPlayerData();
                    hideModal('feedback-modal');
                    hideModal('exchange-item-modal');
                    showFeedbackModal('成功', '您的商品已成功下架！');
                    renderMyStoreModal();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                hideModal('feedback-modal');
                showFeedbackModal('下架失敗', error.message);
            }
        },
        { confirmButtonClass: 'danger', confirmButtonText: '確認下架' }
    );
}

/**
 * 初始化交易所的事件監聽器
 */
function initializeExchangeHandlers() {
    const modal = document.getElementById('exchange-item-modal');
    const myStoreModal = document.getElementById('my-store-modal');
    const myStoreBtn = document.getElementById('my-store-btn');
    const refreshBtn = document.getElementById('refresh-exchange-btn');
    const sortSelect = document.getElementById('exchange-sort-select');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            renderExchange();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const [key, order] = e.target.value.split('_');
            gameState.exchangeSortConfig = { key, order };
            sortAndRenderExchangeListings();
        });
    }

    if (myStoreBtn) {
        myStoreBtn.addEventListener('click', () => {
            renderMyStoreModal();
            showModal('my-store-modal');
        });
    }

    if (myStoreModal) {
        const closeBtn = myStoreModal.querySelector('.modal-close');
        if(closeBtn) {
            closeBtn.addEventListener('click', () => hideModal('my-store-modal'));
        }
        myStoreModal.addEventListener('click', (event) => {
            if (event.target === myStoreModal) {
                hideModal('my-store-modal');
            }
        });
    }

    if (modal) {
        const closeBtn = modal.querySelector('.modal-close-btn');
        if(closeBtn) {
            closeBtn.addEventListener('click', () => hideModal('exchange-item-modal'));
        }
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                hideModal('exchange-item-modal');
            }
        });
    }
}

// 當切換到交易所頁籤時，呼叫此函式
function setupExchangeTab() {
    renderExchange();
    initializeExchangeHandlers();
}