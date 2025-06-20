// js/utils.js
// 存放整個專案可以共用的輔助函式

/**
 * 根據怪獸的資料和遊戲設定，獲取其正確的屬性代表名（短名稱）。
 * 優先順序：自訂名稱 > 儲存的預設名稱 > 主要元素名稱。
 * @param {object} monster - 怪獸物件。
 * @param {object} gameConfigs - 全局遊戲設定檔。
 * @returns {string} 怪獸的屬性代表名。
 */
function getMonsterDisplayName(monster, gameConfigs) {
    if (!monster) return '未知';

    // 1. 優先使用玩家自訂的名稱
    if (monster.custom_element_nickname) {
        return monster.custom_element_nickname;
    }

    // 2. 其次，直接使用怪獸誕生時被賦予的屬性代表名
    if (monster.element_nickname_part) {
        return monster.element_nickname_part;
    }

    // 3. 如果以上都沒有（為了相容舊資料），則根據元素名稱做為最終後備
    const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
    return primaryElement;
}
