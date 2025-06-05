// js/api-client.js
// 假設 API_BASE_URL 從 config.js 導入 (或者在這裡直接定義)
// 假設 getCurrentUserToken 從 auth.js 導入

// 從 config.js 導入 API_BASE_URL
// 注意：如果 config.js 不是 ES6 模塊，您可能需要以其他方式訪問 API_BASE_URL
// 例如，如果它設置為全局變量：const API_BASE_URL = window.API_BASE_URL;
// 為了模塊化，最好確保 config.js 也使用 export。
// 暫時假設 API_BASE_URL 是可訪問的。

/**
 * 輔助函數，用於發送 fetch 請求並處理常見的錯誤。
 * @param {string} endpoint API 端點路徑 (例如 '/game-configs')
 * @param {object} options fetch 的選項 (method, headers, body 等)
 * @returns {Promise<any>} 解析後的 JSON 回應
 * @throws {Error} 如果網路回應不 ok 或發生其他錯誤
 */
async function fetchAPI(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const token = await window.auth.getCurrentUserToken(); // 假設 auth.js 的函數已掛載到 window
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${window.config.API_BASE_URL}${endpoint}`; // 假設 config.js 的變數已掛載到 window

    try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: response.statusText, status: response.status };
            }
            const error = new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
            error.status = response.status;
            error.data = errorData;
            console.error(`API Error (${url}): ${error.status} - ${error.message}`, errorData);
            throw error;
        }

        if (response.status === 204) {
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Fetch API Error for ${url}:`, error);
        throw error;
    }
}

// --- API 函數 ---

export async function getGameConfigs() {
    return fetchAPI('/game-configs');
}

export async function getPlayerData(playerId) {
    if (!playerId) {
        throw new Error("獲取玩家資料需要 playerId。");
    }
    return fetchAPI(`/player/${playerId}`);
}

export async function combineDNA(dnaIds) {
    if (!dnaIds || dnaIds.length === 0) {
        throw new Error("DNA 組合需要提供 DNA ID 列表。");
    }
    return fetchAPI('/combine', {
        method: 'POST',
        body: JSON.stringify({ dna_ids: dnaIds }),
    });
}

export async function simulateBattle(monster1Data, monster2Data) {
    return fetchAPI('/battle/simulate', {
        method: 'POST',
        body: JSON.stringify({
            monster1_data: monster1Data,
            monster2_data: monster2Data,
        }),
    });
}

export async function generateAIDescriptions(monsterData) {
    return fetchAPI('/generate-ai-descriptions', {
        method: 'POST',
        body: JSON.stringify({ monster_data: monsterData }),
    });
}

export async function updateMonsterCustomNickname(monsterId, customElementNickname) {
    return fetchAPI(`/monster/${monsterId}/update-nickname`, {
        method: 'POST',
        body: JSON.stringify({ custom_element_nickname: customElementNickname }),
    });
}

export async function healMonster(monsterId, healType) {
    return fetchAPI(`/monster/${monsterId}/heal`, {
        method: 'POST',
        body: JSON.stringify({ heal_type: healType }),
    });
}

export async function disassembleMonster(monsterId) {
    return fetchAPI(`/monster/${monsterId}/disassemble`, {
        method: 'POST',
    });
}

export async function rechargeMonsterWithDNA(monsterId, dnaInstanceId, rechargeTarget) {
    return fetchAPI(`/monster/${monsterId}/recharge`, {
        method: 'POST',
        body: JSON.stringify({
            dna_instance_id: dnaInstanceId,
            recharge_target: rechargeTarget,
        }),
    });
}

export async function completeCultivation(monsterId, durationSeconds) {
    return fetchAPI(`/monster/${monsterId}/cultivation/complete`, {
        method: 'POST',
        body: JSON.stringify({ duration_seconds: durationSeconds }),
    });
}

export async function replaceMonsterSkill(monsterId, slotIndex, newSkillTemplate) {
    return fetchAPI(`/monster/${monsterId}/skill/replace`, {
        method: 'POST',
        body: JSON.stringify({
            slot_index: slotIndex,
            new_skill_template: newSkillTemplate,
        }),
    });
}

export async function getMonsterLeaderboard(topN = 10) {
    return fetchAPI(`/leaderboard/monsters?top_n=${topN}`);
}

export async function getPlayerLeaderboard(topN = 10) {
    return fetchAPI(`/leaderboard/players?top_n=${topN}`);
}

export async function searchPlayers(nicknameQuery, limit = 10) {
    if (!nicknameQuery.trim()) {
        return Promise.resolve({ players: [] });
    }
    return fetchAPI(`/players/search?nickname=${encodeURIComponent(nicknameQuery)}&limit=${limit}`);
}

console.log("API client module loaded with exports.");
