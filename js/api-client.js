// api-client.js

import { auth } from './firebase-config.js';
// 移除對 loadDeepSeekApiKey 的導入，因為前端不再直接呼叫 AI API
// import { loadDeepSeekApiKey } from './loadApiKey.js'; 

// --- API Configuration ---
// 確保這是你後端服務的正確 URL
const API_BASE_URL = 'https://md-server-5wre.onrender.com/api/MD'; 

// 不再需要 DeepSeek API 的 URL 和模型，因為將通過後端代理
// const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
// const DEFAULT_MODEL = 'deepseek-chat';

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

// 修改 generateAIDescriptions 函式，使其呼叫後端路由
export async function generateAIDescriptions(monsterData) {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) throw new Error("請先登入才能生成AI描述。");

    // 假設後端有一個新的路由來處理 AI 描述生成
    const res = await fetch(`${API_BASE_URL}/generate-ai-descriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ monster_data: monsterData }) // 將怪獸數據作為請求體發送
    });
    return handleApiResponse(res, "生成AI描述失敗");
}
