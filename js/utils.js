// js/utils.js
// 存放整個專案可以共用的輔助函式

/**
 * 根據怪獸的資料和遊戲設定，獲取其正確的屬性代表名（短名稱）。
 * 優先順序：自訂名稱 > 預設屬性暱稱 > 主要元素名稱。
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

    // 2. 如果沒有自訂名稱，則從遊戲設定中找預設暱稱
    const primaryElement = monster.elements && monster.elements.length > 0 ? monster.elements[0] : '無';
    const monsterRarity = monster.rarity || '普通';
    
    const nicknamesByElement = gameConfigs?.element_nicknames?.[primaryElement];
    if (nicknamesByElement && nicknamesByElement[monsterRarity] && nicknamesByElement[monsterRarity].length > 0) {
        // 使用該屬性該稀有度的第一個預設名稱
        return nicknamesByElement[monsterRarity][0];
    }

    // 3. 如果連預設暱稱都沒有，則直接使用主要元素名稱作為後備
    return primaryElement;
}
