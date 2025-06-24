// js/utils.js
// 存放整個專案可以共用的輔助函式

/**
 * 【重構】根據怪獸資料，生成包含稀有度顏色的完整 HTML 名稱標籤。
 * @param {object} monster - 怪獸物件。
 * @param {object} gameConfigs - 全局遊戲設定檔。
 * @returns {string} 包含樣式和名稱的 HTML 字串。
 */
function getMonsterDisplayName(monster, gameConfigs) {
    if (!monster) return '<span class="text-rarity-common">未知</span>';

    // 決定要顯示的名稱
    let displayName = '未知';
    if (monster.custom_element_nickname) {
        displayName = monster.custom_element_nickname;
    } else if (monster.element_nickname_part) {
        displayName = monster.element_nickname_part;
    } else if (monster.nickname) {
        // 作為後備，從完整名稱中提取最後一部分（通常是屬性名）
        const parts = monster.nickname.match(/[\u4e00-\u9fa5a-zA-Z0-9]+$/);
        displayName = parts ? parts[0] : monster.nickname;
    } else {
        displayName = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
    }

    // 決定稀有度對應的 CSS class
    const rarityMap = {
        '普通': 'common',
        '稀有': 'rare',
        '菁英': 'elite',
        '傳奇': 'legendary',
        '神話': 'mythical'
    };
    const rarityKey = monster.rarity ? (rarityMap[monster.rarity] || 'common') : 'common';
    const rarityClass = `text-rarity-${rarityKey}`;

    // 回傳組合好的 HTML 字串
    return `<span class="${rarityClass}">${displayName}</span>`;
}
