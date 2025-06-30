// frontend/js/training_options.js
// 存放訓練場中所有可用的鍛鍊項目設定

// 基礎設定
const BASE_TRAINING_TIME_SECONDS = 3600; // 基礎訓練時間 (1小時)
const BASE_TRAINING_COST = 500; // 基礎訓練費用

// 定義各項數值的鍛鍊卡片
// 每個物件代表一張卡片，包含顯示名稱、對應的屬性鍵、費用、時間和卡片顏色
export const trainingOptions = [
    {
        id: 'hp_training',
        name: '生命值鍛鍊',
        description: '進行耐力訓練，專注於提升怪獸的基礎生命值上限。',
        stat: 'hp',
        cost: BASE_TRAINING_COST,
        time: BASE_TRAINING_TIME_SECONDS,
        color: 'bg-green-500', // 使用 Tailwind CSS 的綠色背景
        icon: 'fas fa-heart' // 使用 Font Awesome 的心形圖標
    },
    {
        id: 'mp_training',
        name: '能量值鍛νά',
        description: '進行冥想與精神力集中訓練，提升怪獸的能量值上限。',
        stat: 'mp',
        cost: BASE_TRAINING_COST,
        time: BASE_TRAINING_TIME_SECONDS,
        color: 'bg-blue-500', // 使用 Tailwind CSS 的藍色背景
        icon: 'fas fa-bolt' // 使用 Font Awesome 的閃電圖標
    },
    {
        id: 'attack_training',
        name: '力量鍛鍊',
        description: '進行高強度的攻擊技巧訓練，增強怪獸的物理與特殊攻擊力。',
        stat: 'attack',
        cost: Math.floor(BASE_TRAINING_COST * 1.2), // 攻擊是熱門選項，費用稍高
        time: Math.floor(BASE_TRAINING_TIME_SECONDS * 1.2), // 時間也稍長
        color: 'bg-red-500', // 使用 Tailwind CSS 的紅色背景
        icon: 'fas fa-gavel' // 使用 Font Awesome 的槌子圖標
    },
    {
        id: 'defense_training',
        name: '防禦鍛鍊',
        description: '進行堅韌的防禦姿態與傷害抵抗訓練，強化怪獸的防禦能力。',
        stat: 'defense',
        cost: Math.floor(BASE_TRAINING_COST * 1.2),
        time: Math.floor(BASE_TRAINING_TIME_SECONDS * 1.2),
        color: 'bg-gray-600', // 使用 Tailwind CSS 的灰色背景
        icon: 'fas fa-shield-alt' // 使用 Font Awesome 的盾牌圖標
    },
    {
        id: 'speed_training',
        name: '速度鍛鍊',
        description: '進行敏捷性與反應速度的極限挑戰，讓怪獸在戰鬥中搶得先機。',
        stat: 'speed',
        cost: Math.floor(BASE_TRAINING_COST * 1.5), // 速度是關鍵屬性，費用最高
        time: Math.floor(BASE_TRAINING_TIME_SECONDS * 1.5), // 時間也最長
        color: 'bg-yellow-400', // 使用 Tailwind CSS 的黃色背景
        icon: 'fas fa-running' // 使用 Font Awesome 的跑步圖標
    },
    {
        id: 'crit_training',
        name: '爆擊鍛鍊',
        description: '專注於精準打擊與弱點洞察，提升怪獸發動致命一擊的機率。',
        stat: 'crit',
        cost: Math.floor(BASE_TRAINING_COST * 1.3),
        time: Math.floor(BASE_TRAINING_TIME_SECONDS * 1.3),
        color: 'bg-purple-500', // 使用 Tailwind CSS 的紫色背景
        icon: 'fas fa-crosshairs' // 使用 Font Awesome 的準心圖標
    }
];

/**
 * 根據 ID 獲取特定的訓練選項
 * @param {string} id - 訓練選項的 ID
 * @returns {object|undefined} - 返回對應的訓練選項物件，如果找不到則返回 undefined
 */
export function getTrainingOptionById(id) {
    return trainingOptions.find(option => option.id === id);
}
