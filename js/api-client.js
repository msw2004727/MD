// api-client.js

import { auth } from './firebase-config.js'; // 只需要 auth，db 在此模組中未使用
import { loadDeepSeekApiKey } from './loadApiKey.js';

// --- API Configuration ---
const API_BASE_URL = 'https://d1d5ef45-d04b-4a1c-be4b-64a0680c6847-00-xxpggv06ka2e.sisko.replit.dev/api/MD';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat'; // DeepSeek 推薦使用 deepseek-chat 或 deepseek-coder

/**
 * 獲取包含認證 token 的 HTTP Headers。
 * @param {boolean} includeContentType - 是否包含 'Content-Type': 'application/json'。
 * @returns {Promise<Object>} 包含 headers 的物件。
 */
async function getAuthHeaders(includeContentType = true) {
    const headers = {};
    if (includeContentType) headers['Content-Type'] = 'application/json';
    if (auth && auth.currentUser) {
        try {
            const idToken = await auth.currentUser.getIdToken();
            headers['Authorization'] = `Bearer ${idToken}`;
        } catch (error) {
            console.warn("無法獲取 Firebase Token，API 請求可能未經授權：", error);
        }
    }
    return headers;
}

/**
 * 處理 API 響應，如果響應不成功則拋出錯誤。
 * @param {Response} response - fetch API 的 Response 物件。
 * @param {string} errorMessagePrefix - 錯誤訊息前綴。
 * @returns {Promise<Object>} 解析後的 JSON 數據。
 * @throws {Error} 如果響應不成功。
 */
async function handleApiResponse(response, errorMessagePrefix = "API 請求失敗") {
    if (!response.ok) {
        let errorData = {};
        try {
            errorData = await response.json();
        } catch (e) {
            // 如果無法解析 JSON，則嘗試獲取文本
            const text = await response.text();
            throw new Error(`${errorMessagePrefix}，狀態碼: ${response.status}，響應: ${text}`);
        }
        throw new Error(errorData.error || `${errorMessagePrefix}，狀態碼: ${response.status}`);
    }
    return response.json();
}

// --- 遊戲後端 API ---

/**
 * 獲取遊戲設定。
 * @returns {Promise<Object>} 遊戲設定數據。
 */
export async function fetchGameConfigs() {
    const response = await fetch("https://test-1-jnro.onrender.com/api/MD/game-configs");
    return handleApiResponse(response, "獲取遊戲設定失敗");
}

/**
 * 獲取玩家資料。
 * @param {string} userId - 玩家的 UID。
 * @returns {Promise<Object>} 玩家資料。
 */
export async function getPlayer(userId) {
    const headers = await getAuthHeaders(false); // 不需要 Content-Type
    const res = await fetch(`${API_BASE_URL}/player/${userId}`, { headers });
    // 對於 404 錯誤，如果沒有找到玩家，可能返回空對象或特定結構
    if (res.status === 404) {
        console.warn(`玩家 ${userId} 的資料未找到 (404)。`);
        return null; // 或者返回一個表示未找到的特定值
    }
    return handleApiResponse(res, "獲取玩家資料失敗");
}

/**
 * 進行 DNA 組合。
 * @param {string[]} dna_ids - 要組合的 DNA ID 陣列。
 * @returns {Promise<Object>} 組合後的新怪獸數據。
 */
export async function combineDNA(dna_ids) {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) throw new Error("請先登入再進行 DNA 組合。");

    const res = await fetch(`${API_BASE_URL}/combine`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ dna_ids })
    });
    return handleApiResponse(res, "DNA 組合失敗");
}

/**
 * 模擬戰鬥。
 * @param {Object} playerMonsterData - 玩家怪獸的數據。
 * @param {Object} opponentMonsterData - 對手怪獸的數據。
 * @returns {Promise<Object>} 戰鬥結果數據。
 */
export async function simulateBattle(playerMonsterData, opponentMonsterData) {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) throw new Error("請先登入才能模擬戰鬥。");

    const res = await fetch(`${API_BASE_URL}/battle/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ monster1_data: playerMonsterData, monster2_data: opponentMonsterData })
    });
    return handleApiResponse(res, "戰鬥模擬失敗");
}

/**
 * 搜尋玩家。
 * @param {string} nicknameQuery - 玩家暱稱的查詢字符串。
 * @param {number} [limit=10] - 返回結果的最大數量。
 * @returns {Promise<Object[]>} 匹配的玩家列表。
 */
export async function searchPlayers(nicknameQuery, limit = 10) {
    const headers = await getAuthHeaders(false); // 不需要 Content-Type
    const res = await fetch(`${API_BASE_URL}/players/search?nickname=${encodeURIComponent(nicknameQuery)}&limit=${limit}`, { headers });
    return handleApiResponse(res, "搜尋玩家失敗");
}

/**
 * 保存玩家數據（包括初始數據）。
 * @param {string} userId - 玩家的 UID。
 * @param {Object} playerData - 要保存的玩家數據。
 * @returns {Promise<Object>} 保存結果。
 */
export async function savePlayerData(userId, playerData) {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) throw new Error("請先登入才能保存玩家數據。");

    const res = await fetch(`${API_BASE_URL}/player/${userId}`, {
        method: 'POST', // 或 PUT，取決於後端設計
        headers,
        body: JSON.stringify(playerData)
    });
    return handleApiResponse(res, "保存玩家數據失敗");
}


// --- DeepSeek AI ---

/**
 * 使用 DeepSeek AI 生成怪獸描述。
 * @param {Object} monsterData - 包含怪獸基本資料的物件。
 * @returns {Promise<Object>} 包含 personality, introduction, evaluation 的 JSON 物件。
 */
export async function generateAIDescriptions(monsterData) {
    const apiKey = await loadDeepSeekApiKey();
    if (!apiKey) throw new Error("DeepSeek API Key 載入失敗。");

    const prompt = `
請為一隻名為「${monsterData.nickname || '未知怪獸'}」的怪獸，生成詳細的中文描述性文字。它的基本資料如下：
- 屬性：${monsterData.elements && monsterData.elements.length > 0 ? monsterData.elements.join('、') : '無'}
- 稀有度：${monsterData.rarity || '普通'}
- 生命值(HP)：約 ${monsterData.hp || 0}
- 魔力值(MP)：約 ${monsterData.mp || 0}
- 攻擊力：約 ${monsterData.attack || 0}
- 防禦力：約 ${monsterData.defense || 0}
- 速度：約 ${monsterData.speed || 0}
- 爆擊率：約 ${(monsterData.critRate || 0) * 100}%
- 個性名稱：${monsterData.personality || '未知'}

請依據上述內容，以 JSON 格式回傳三個鍵：
1. personality：一個物件，包含 "name" (個性名稱，例如 "熱血", "冷靜"), "text" (個性描述，至少 100 字), "color" (與個性相符的 CSS 顏色代碼，例如 "#FF4500")。
2. introduction：背景介紹與能力描寫（至少 150 字）。
3. evaluation：綜合評價與養成建議（至少 200 字）。
請確保返回的 JSON 格式嚴格正確，並且所有文字欄位都是中文。
`;

    const payload = {
        model: DEFAULT_MODEL,
        messages: [
            { role: "system", content: "你是一個怪獸養成遊戲的敘述設計師，精通中文。" },
            { role: "user", content: prompt }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" } // 要求返回 JSON 格式
    };

    const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`DeepSeek API 請求失敗：${response.status} - ${text}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("DeepSeek API 回傳內容為空。");
    }

    try {
        const parsedContent = JSON.parse(content);
        // 簡單驗證返回的結構
        if (parsedContent.personality && parsedContent.introduction && parsedContent.evaluation) {
            return parsedContent;
        } else {
            throw new Error("DeepSeek 回傳的 JSON 結構不符合預期。");
        }
    } catch (e) {
        console.error("DeepSeek 回傳內容解析失敗:", content, e);
        throw new Error(`DeepSeek 回傳格式無法解析為 JSON 或格式不正確: ${e.message}`);
    }
}
