/**
 * 怪獸部位圖片資源對應表
 * 結構:
 * 部位 (part) -> 屬性 (type) -> 稀有度 (rarity) -> 圖片路徑 (image path)
 * * - 每個部位都包含一個 'default' 鍵，作為該部位找不到對應圖片時的後備。
 * - 全局提供一個 'globalDefault' 鍵，作為最終的後備圖片。
 */
const monsterPartAssets = {
    // =======================================================================
    // 頭部 (Head)
    // =======================================================================
    head: {
        // 火屬性
        '火': {
            '普通': 'images/parts/head/fire-common.png',
            '稀有': 'images/parts/head/fire-rare.png',
            '菁英': 'images/parts/head/fire-elite.png',
            '傳奇': 'images/parts/head/fire-legendary.png',
            '神話': 'images/parts/head/fire-mythical.png',
        },
        // 水屬性
        '水': {
            '普通': 'images/parts/head/water-common.png',
            '稀有': 'images/parts/head/water-rare.png',
            '菁英': 'images/parts/head/water-elite.png',
            '傳奇': 'images/parts/head/water-legendary.png',
            '神話': 'images/parts/head/water-mythical.png',
        },
        // 木屬性
        '木': {
            '普通': 'images/parts/head/wood-common.png',
            '稀有': 'images/parts/head/wood-rare.png',
            '菁英': 'images/parts/head/wood-elite.png',
            '傳奇': 'images/parts/head/wood-legendary.png',
            '神話': 'images/parts/head/wood-mythical.png',
        },
        // 金屬性
        '金': {
            '普通': 'images/parts/head/gold-common.png',
            '稀有': 'images/parts/head/gold-rare.png',
            '菁英': 'images/parts/head/gold-elite.png',
            '傳奇': 'images/parts/head/gold-legendary.png',
            '神話': 'images/parts/head/gold-mythical.png',
        },
        // 土屬性
        '土': {
            '普通': 'images/parts/head/earth-common.png',
            '稀有': 'images/parts/head/earth-rare.png',
            '菁英': 'images/parts/head/earth-elite.png',
            '傳奇': 'images/parts/head/earth-legendary.png',
            '神話': 'images/parts/head/earth-mythical.png',
        },
        // 光屬性
        '光': {
            '普通': 'images/parts/head/light-common.png',
            '稀有': 'images/parts/head/light-rare.png',
            '菁英': 'images/parts/head/light-elite.png',
            '傳奇': 'images/parts/head/light-legendary.png',
            '神話': 'images/parts/head/light-mythical.png',
        },
        // 暗屬性
        '暗': {
            '普通': 'images/parts/head/dark-common.png',
            '稀有': 'images/parts/head/dark-rare.png',
            '菁英': 'images/parts/head/dark-elite.png',
            '傳奇': 'images/parts/head/dark-legendary.png',
            '神話': 'images/parts/head/dark-mythical.png',
        },
        // 毒屬性
        '毒': {
            '普通': 'images/parts/head/poison-common.png',
            '稀有': 'images/parts/head/poison-rare.png',
            '菁英': 'images/parts/head/poison-elite.png',
            '傳奇': 'images/parts/head/poison-legendary.png',
            '神話': 'images/parts/head/poison-mythical.png',
        },
        // 風屬性
        '風': {
            '普通': 'images/parts/head/wind-common.png',
            '稀有': 'images/parts/head/wind-rare.png',
            '菁英': 'images/parts/head/wind-elite.png',
            '傳奇': 'images/parts/head/wind-legendary.png',
            '神話': 'images/parts/head/wind-mythical.png',
        },
        // 無屬性
        '無': {
            '普通': 'images/parts/head/none-common.png',
            '稀有': 'images/parts/head/none-rare.png',
            '菁英': 'images/parts/head/none-elite.png',
            '傳奇': 'images/parts/head/none-legendary.png',
            '神話': 'images/parts/head/none-mythical.png',
        },
        // 混屬性
        '混': {
            '普通': 'images/parts/head/mix-common.png',
            '稀有': 'images/parts/head/mix-rare.png',
            '菁英': 'images/parts/head/mix-elite.png',
            '傳奇': 'images/parts/head/mix-legendary.png',
            '神話': 'images/parts/head/mix-mythical.png',
        },
        // 頭部預設圖片
        'default': 'images/parts/transparent.png'
    },
    // =======================================================================
    // 左手臂 (Left Arm)
    // =======================================================================
    leftArm: {
        '火': {
            '普通': 'images/parts/left-arm/fire-common.png',
            '稀有': 'images/parts/left-arm/fire-rare.png',
            '菁英': 'images/parts/left-arm/fire-elite.png',
            '傳奇': 'images/parts/left-arm/fire-legendary.png',
            '神話': 'images/parts/left-arm/fire-mythical.png',
        },
        '水': {
            '普通': 'images/parts/left-arm/water-common.png',
            '稀有': 'images/parts/left-arm/water-rare.png',
            '菁英': 'images/parts/left-arm/water-elite.png',
            '傳奇': 'images/parts/left-arm/water-legendary.png',
            '神話': 'images/parts/left-arm/water-mythical.png',
        },
        '木': {
            '普通': 'images/parts/left-arm/wood-common.png',
            '稀有': 'images/parts/left-arm/wood-rare.png',
            '菁英': 'images/parts/left-arm/wood-elite.png',
            '傳奇': 'images/parts/left-arm/wood-legendary.png',
            '神話': 'images/parts/left-arm/wood-mythical.png',
        },
        '金': {
            '普通': 'images/parts/left-arm/gold-common.png',
            '稀有': 'images/parts/left-arm/gold-rare.png',
            '菁英': 'images/parts/left-arm/gold-elite.png',
            '傳奇': 'images/parts/left-arm/gold-legendary.png',
            '神話': 'images/parts/left-arm/gold-mythical.png',
        },
        '土': {
            '普通': 'images/parts/left-arm/earth-common.png',
            '稀有': 'images/parts/left-arm/earth-rare.png',
            '菁英': 'images/parts/left-arm/earth-elite.png',
            '傳奇': 'images/parts/left-arm/earth-legendary.png',
            '神話': 'images/parts/left-arm/earth-mythical.png',
        },
        '光': {
            '普通': 'images/parts/left-arm/light-common.png',
            '稀有': 'images/parts/left-arm/light-rare.png',
            '菁英': 'images/parts/left-arm/light-elite.png',
            '傳奇': 'images/parts/left-arm/light-legendary.png',
            '神話': 'images/parts/left-arm/light-mythical.png',
        },
        '暗': {
            '普通': 'images/parts/left-arm/dark-common.png',
            '稀有': 'images/parts/left-arm/dark-rare.png',
            '菁英': 'images/parts/left-arm/dark-elite.png',
            '傳奇': 'images/parts/left-arm/dark-legendary.png',
            '神話': 'images/parts/left-arm/dark-mythical.png',
        },
        '毒': {
            '普通': 'images/parts/left-arm/poison-common.png',
            '稀有': 'images/parts/left-arm/poison-rare.png',
            '菁英': 'images/parts/left-arm/poison-elite.png',
            '傳奇': 'images/parts/left-arm/poison-legendary.png',
            '神話': 'images/parts/left-arm/poison-mythical.png',
        },
        '風': {
            '普通': 'images/parts/left-arm/wind-common.png',
            '稀有': 'images/parts/left-arm/wind-rare.png',
            '菁英': 'images/parts/left-arm/wind-elite.png',
            '傳奇': 'images/parts/left-arm/wind-legendary.png',
            '神話': 'images/parts/left-arm/wind-mythical.png',
        },
        '無': {
            '普通': 'images/parts/left-arm/none-common.png',
            '稀有': 'images/parts/left-arm/none-rare.png',
            '菁英': 'images/parts/left-arm/none-elite.png',
            '傳奇': 'images/parts/left-arm/none-legendary.png',
            '神話': 'images/parts/left-arm/none-mythical.png',
        },
        '混': {
            '普通': 'images/parts/left-arm/mix-common.png',
            '稀有': 'images/parts/left-arm/mix-rare.png',
            '菁英': 'images/parts/left-arm/mix-elite.png',
            '傳奇': 'images/parts/left-arm/mix-legendary.png',
            '神話': 'images/parts/left-arm/mix-mythical.png',
        },
        // 左手臂預設圖片
        'default': 'images/parts/transparent.png'
    },
    // =======================================================================
    // 右手臂 (Right Arm)
    // =======================================================================
    rightArm: {
        '火': {
            '普通': 'images/parts/right-arm/fire-common.png',
            '稀有': 'images/parts/right-arm/fire-rare.png',
            '菁英': 'images/parts/right-arm/fire-elite.png',
            '傳奇': 'images/parts/right-arm/fire-legendary.png',
            '神話': 'images/parts/right-arm/fire-mythical.png',
        },
        '水': {
            '普通': 'images/parts/right-arm/water-common.png',
            '稀有': 'images/parts/right-arm/water-rare.png',
            '菁英': 'images/parts/right-arm/water-elite.png',
            '傳奇': 'images/parts/right-arm/water-legendary.png',
            '神話': 'images/parts/right-arm/water-mythical.png',
        },
        '木': {
            '普通': 'images/parts/right-arm/wood-common.png',
            '稀有': 'images/parts/right-arm/wood-rare.png',
            '菁英': 'images/parts/right-arm/wood-elite.png',
            '傳奇': 'images/parts/right-arm/wood-legendary.png',
            '神話': 'images/parts/right-arm/wood-mythical.png',
        },
        '金': {
            '普通': 'images/parts/right-arm/gold-common.png',
            '稀有': 'images/parts/right-arm/gold-rare.png',
            '菁英': 'images/parts/right-arm/gold-elite.png',
            '傳奇': 'images/parts/right-arm/gold-legendary.png',
            '神話': 'images/parts/right-arm/gold-mythical.png',
        },
        '土': {
            '普通': 'images/parts/right-arm/earth-common.png',
            '稀有': 'images/parts/right-arm/earth-rare.png',
            '菁英': 'images/parts/right-arm/earth-elite.png',
            '傳奇': 'images/parts/right-arm/earth-legendary.png',
            '神話': 'images/parts/right-arm/earth-mythical.png',
        },
        '光': {
            '普通': 'images/parts/right-arm/light-common.png',
            '稀有': 'images/parts/right-arm/light-rare.png',
            '菁英': 'images/parts/right-arm/light-elite.png',
            '傳奇': 'images/parts/right-arm/light-legendary.png',
            '神話': 'images/parts/right-arm/light-mythical.png',
        },
        '暗': {
            '普通': 'images/parts/right-arm/dark-common.png',
            '稀有': 'images/parts/right-arm/dark-rare.png',
            '菁英': 'images/parts/right-arm/dark-elite.png',
            '傳奇': 'images/parts/right-arm/dark-legendary.png',
            '神話': 'images/parts/right-arm/dark-mythical.png',
        },
        '毒': {
            '普通': 'images/parts/right-arm/poison-common.png',
            '稀有': 'images/parts/right-arm/poison-rare.png',
            '菁英': 'images/parts/right-arm/poison-elite.png',
            '傳奇': 'images/parts/right-arm/poison-legendary.png',
            '神話': 'images/parts/right-arm/poison-mythical.png',
        },
        '風': {
            '普通': 'images/parts/right-arm/wind-common.png',
            '稀有': 'images/parts/right-arm/wind-rare.png',
            '菁英': 'images/parts/right-arm/wind-elite.png',
            '傳奇': 'images/parts/right-arm/wind-legendary.png',
            '神話': 'images/parts/right-arm/wind-mythical.png',
        },
        '無': {
            '普通': 'images/parts/right-arm/none-common.png',
            '稀有': 'images/parts/right-arm/none-rare.png',
            '菁英': 'images/parts/right-arm/none-elite.png',
            '傳奇': 'images/parts/right-arm/none-legendary.png',
            '神話': 'images/parts/right-arm/none-mythical.png',
        },
        '混': {
            '普通': 'images/parts/right-arm/mix-common.png',
            '稀有': 'images/parts/right-arm/mix-rare.png',
            '菁英': 'images/parts/right-arm/mix-elite.png',
            '傳奇': 'images/parts/right-arm/mix-legendary.png',
            '神話': 'images/parts/right-arm/mix-mythical.png',
        },
        // 右手臂預設圖片
        'default': 'images/parts/transparent.png'
    },
    // =======================================================================
    // 左腳 (Left Leg)
    // =======================================================================
    leftLeg: {
        '火': {
            '普通': 'images/parts/left-leg/fire-common.png',
            '稀有': 'images/parts/left-leg/fire-rare.png',
            '菁英': 'images/parts/left-leg/fire-elite.png',
            '傳奇': 'images/parts/left-leg/fire-legendary.png',
            '神話': 'images/parts/left-leg/fire-mythical.png',
        },
        '水': {
            '普通': 'images/parts/left-leg/water-common.png',
            '稀有': 'images/parts/left-leg/water-rare.png',
            '菁英': 'images/parts/left-leg/water-elite.png',
            '傳奇': 'images/parts/left-leg/water-legendary.png',
            '神話': 'images/parts/left-leg/water-mythical.png',
        },
        '木': {
            '普通': 'images/parts/left-leg/wood-common.png',
            '稀有': 'images/parts/left-leg/wood-rare.png',
            '菁英': 'images/parts/left-leg/wood-elite.png',
            '傳奇': 'images/parts/left-leg/wood-legendary.png',
            '神話': 'images/parts/left-leg/wood-mythical.png',
        },
        '金': {
            '普通': 'images/parts/left-leg/gold-common.png',
            '稀有': 'images/parts/left-leg/gold-rare.png',
            '菁英': 'images/parts/left-leg/gold-elite.png',
            '傳奇': 'images/parts/left-leg/gold-legendary.png',
            '神話': 'images/parts/left-leg/gold-mythical.png',
        },
        '土': {
            '普通': 'images/parts/left-leg/earth-common.png',
            '稀有': 'images/parts/left-leg/earth-rare.png',
            '菁英': 'images/parts/left-leg/earth-elite.png',
            '傳奇': 'images/parts/left-leg/earth-legendary.png',
            '神話': 'images/parts/left-leg/earth-mythical.png',
        },
        '光': {
            '普通': 'images/parts/left-leg/light-common.png',
            '稀有': 'images/parts/left-leg/light-rare.png',
            '菁英': 'images/parts/left-leg/light-elite.png',
            '傳奇': 'images/parts/left-leg/light-legendary.png',
            '神話': 'images/parts/left-leg/light-mythical.png',
        },
        '暗': {
            '普通': 'images/parts/left-leg/dark-common.png',
            '稀有': 'images/parts/left-leg/dark-rare.png',
            '菁英': 'images/parts/left-leg/dark-elite.png',
            '傳奇': 'images/parts/left-leg/dark-legendary.png',
            '神話': 'images/parts/left-leg/dark-mythical.png',
        },
        '毒': {
            '普通': 'images/parts/left-leg/poison-common.png',
            '稀有': 'images/parts/left-leg/poison-rare.png',
            '菁英': 'images/parts/left-leg/poison-elite.png',
            '傳奇': 'images/parts/left-leg/poison-legendary.png',
            '神話': 'images/parts/left-leg/poison-mythical.png',
        },
        '風': {
            '普通': 'images/parts/left-leg/wind-common.png',
            '稀有': 'images/parts/left-leg/wind-rare.png',
            '菁英': 'images/parts/left-leg/wind-elite.png',
            '傳奇': 'images/parts/left-leg/wind-legendary.png',
            '神話': 'images/parts/left-leg/wind-mythical.png',
        },
        '無': {
            '普通': 'images/parts/left-leg/none-common.png',
            '稀有': 'images/parts/left-leg/none-rare.png',
            '菁英': 'images/parts/left-leg/none-elite.png',
            '傳奇': 'images/parts/left-leg/none-legendary.png',
            '神話': 'images/parts/left-leg/none-mythical.png',
        },
        '混': {
            '普通': 'images/parts/left-leg/mix-common.png',
            '稀有': 'images/parts/left-leg/mix-rare.png',
            '菁英': 'images/parts/left-leg/mix-elite.png',
            '傳奇': 'images/parts/left-leg/mix-legendary.png',
            '神話': 'images/parts/left-leg/mix-mythical.png',
        },
        // 左腳預設圖片
        'default': 'images/parts/transparent.png'
    },
    // =======================================================================
    // 右腳 (Right Leg)
    // =======================================================================
    rightLeg: {
        '火': {
            '普通': 'images/parts/right-leg/fire-common.png',
            '稀有': 'images/parts/right-leg/fire-rare.png',
            '菁英': 'images/parts/right-leg/fire-elite.png',
            '傳奇': 'images/parts/right-leg/fire-legendary.png',
            '神話': 'images/parts/right-leg/fire-mythical.png',
        },
        '水': {
            '普通': 'images/parts/right-leg/water-common.png',
            '稀有': 'images/parts/right-leg/water-rare.png',
            '菁英': 'images/parts/right-leg/water-elite.png',
            '傳奇': 'images/parts/right-leg/water-legendary.png',
            '神話': 'images/parts/right-leg/water-mythical.png',
        },
        '木': {
            '普通': 'images/parts/right-leg/wood-common.png',
            '稀有': 'images/parts/right-leg/wood-rare.png',
            '菁英': 'images/parts/right-leg/wood-elite.png',
            '傳奇': 'images/parts/right-leg/wood-legendary.png',
            '神話': 'images/parts/right-leg/wood-mythical.png',
        },
        '金': {
            '普通': 'images/parts/right-leg/gold-common.png',
            '稀有': 'images/parts/right-leg/gold-rare.png',
            '菁英': 'images/parts/right-leg/gold-elite.png',
            '傳奇': 'images/parts/right-leg/gold-legendary.png',
            '神話': 'images/parts/right-leg/gold-mythical.png',
        },
        '土': {
            '普通': 'images/parts/right-leg/earth-common.png',
            '稀有': 'images/parts/right-leg/earth-rare.png',
            '菁英': 'images/parts/right-leg/earth-elite.png',
            '傳奇': 'images/parts/right-leg/earth-legendary.png',
            '神話': 'images/parts/right-leg/earth-mythical.png',
        },
        '光': {
            '普通': 'images/parts/right-leg/light-common.png',
            '稀有': 'images/parts/right-leg/light-rare.png',
            '菁英': 'images/parts/right-leg/light-elite.png',
            '傳奇': 'images/parts/right-leg/light-legendary.png',
            '神話': 'images/parts/right-leg/light-mythical.png',
        },
        '暗': {
            '普通': 'images/parts/right-leg/dark-common.png',
            '稀有': 'images/parts/right-leg/dark-rare.png',
            '菁英': 'images/parts/right-leg/dark-elite.png',
            '傳奇': 'images/parts/right-leg/dark-legendary.png',
            '神話': 'images/parts/right-leg/dark-mythical.png',
        },
        '毒': {
            '普通': 'images/parts/right-leg/poison-common.png',
            '稀有': 'images/parts/right-leg/poison-rare.png',
            '菁英': 'images/parts/right-leg/poison-elite.png',
            '傳奇': 'images/parts/right-leg/poison-legendary.png',
            '神話': 'images/parts/right-leg/poison-mythical.png',
        },
        '風': {
            '普通': 'images/parts/right-leg/wind-common.png',
            '稀有': 'images/parts/right-leg/wind-rare.png',
            '菁英': 'images/parts/right-leg/wind-elite.png',
            '傳奇': 'images/parts/right-leg/wind-legendary.png',
            '神話': 'images/parts/right-leg/wind-mythical.png',
        },
        '無': {
            '普通': 'images/parts/right-leg/none-common.png',
            '稀有': 'images/parts/right-leg/none-rare.png',
            '菁英': 'images/parts/right-leg/none-elite.png',
            '傳奇': 'images/parts/right-leg/none-legendary.png',
            '神話': 'images/parts/right-leg/none-mythical.png',
        },
        '混': {
            '普通': 'images/parts/right-leg/mix-common.png',
            '稀有': 'images/parts/right-leg/mix-rare.png',
            '菁英': 'images/parts/right-leg/mix-elite.png',
            '傳奇': 'images/parts/right-leg/mix-legendary.png',
            '神話': 'images/parts/right-leg/mix-mythical.png',
        },
        // 右腳預設圖片
        'default': 'images/parts/transparent.png'
    },
    // =======================================================================
    // 全局後備 (Global Fallback)
    // =======================================================================
    globalDefault: 'images/parts/transparent.png' // 透明圖片，當所有查找都失敗時使用
};
