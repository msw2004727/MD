// api-client.js

import { auth } from './firebase-config.js';
import { loadDeepSeekApiKey } from './loadApiKey.js';

// --- API Configuration ---
const API_BASE_URL = 'https://md-server-5wre.onrender.com/api/MD'; // 確保這是你後端服務的正確 URL
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

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

async function handleApiResponse(response, errorMessagePrefix = "API 請求失敗") {
    if (!response.ok) {
        let errorData = {};
        try {
            errorData = await response.json();
        } catch (e) {
            const text = await response.text();
            throw new Error(`${errorMessagePrefix}，狀態碼: ${response.status}，響應: ${text}`);
        }
        throw new Error(errorData.error || `${errorMessagePrefix}，狀態碼: ${response.status}`);
    }
    return response.json();
}

export async function fetchGameConfigs() {
    const response = await fetch(`${API_BASE_URL}/game-configs`);
    return handleApiResponse(response, "獲取遊戲設定失敗");
}

export async function getPlayer(userId) {
    const headers = await getAuthHeaders(false);
    const res = await fetch(`${API_BASE_URL}/player/${userId}`, { headers });
    if (res.status === 404) {
        console.warn(`玩家 ${userId} 的資料未找到 (404)。`);
        return null;
    }
    return handleApiResponse(res, "獲取玩家資料失敗");
}

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

export async function searchPlayers(nicknameQuery, limit = 10) {
    const headers = await getAuthHeaders(false);
    const res = await fetch(`${API_BASE_URL}/players/search?nickname=${encodeURIComponent(nicknameQuery)}&limit=${limit}`, { headers });
    return handleApiResponse(res, "搜尋玩家失敗");
}

export async function savePlayerData(userId, playerData) {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) throw new Error("請先登入才能保存玩家數據。");

    const res = await fetch(`${API_BASE_URL}/player/${userId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(playerData)
    });
    return handleApiResponse(res, "保存玩家數據失敗");
}

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
        response_format: { type: "json_object" }
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
