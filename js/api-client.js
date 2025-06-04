// js/api-client.js

// 注意：這個檔案依賴於 js/config.js 中的 API_BASE_URL 和 js/auth.js 中的 getCurrentUserToken

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

    // 自動附加 Authorization token (如果存在)
    const token = await getCurrentUserToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    // console.log(`Fetching: ${options.method || 'GET'} ${url}`, options.body ? `with body: ${options.body}` : '');

    try {
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // 如果回應不是 JSON，或者解析失敗
                errorData = { message: response.statusText, status: response.status };
            }
            const error = new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
            error.status = response.status;
            error.data = errorData;
            console.error(`API Error (${url}): ${error.status} - ${error.message}`, errorData);
            throw error;
        }

        // 如果回應狀態碼是 204 (No Content)，則不嘗試解析 JSON
        if (response.status === 204) {
            return null; 
        }
        return await response.json();
    } catch (error) {
        console.error(`Fetch API Error for ${url}:`, error);
        // 向上拋出錯誤，讓調用者處理
        throw error;
    }
}

// --- API 函數 ---

/**
 * 獲取遊戲核心設定
 * @returns {Promise<object>} 遊戲設定對象
 */
async function getGameConfigs() {
    return fetchAPI('/game-configs');
}

/**
 * 獲取指定玩家的遊戲資料
 * @param {string} playerId 玩家 ID
 * @returns {Promise<object>} 玩家遊戲資料
 */
async function getPlayerData(playerId) {
    if (!playerId) {
        throw new Error("獲取玩家資料需要 playerId。");
    }
    // 後端 /player/<path:requested_player_id> 路由會處理 Token 驗證
    // 如果是請求自己的資料，Token 會被用來識別；如果是查詢他人，則為公開查詢
    return fetchAPI(`/player/${playerId}`);
}


/**
 * 組合 DNA 生成新怪獸
 * @param {string[]} dnaIds 要組合的 DNA ID 列表
 * @returns {Promise<object>} 新生成的怪獸對象或錯誤訊息
 */
async function combineDNA(dnaIds) {
    if (!dnaIds || dnaIds.length === 0) {
        throw new Error("DNA 組合需要提供 DNA ID 列表。");
    }
    return fetchAPI('/combine', {
        method: 'POST',
        body: JSON.stringify({ dna_ids: dnaIds }),
    });
}

/**
 * 模擬戰鬥
 * @param {object} monster1Data 怪獸1的資料
 * @param {object} monster2Data 怪獸2的資料
 * @returns {Promise<object>} 戰鬥結果
 */
async function simulateBattle(monster1Data, monster2Data) {
    return fetchAPI('/battle/simulate', {
        method: 'POST',
        body: JSON.stringify({
            monster1_data: monster1Data,
            monster2_data: monster2Data,
        }),
    });
}

/**
 * 為怪獸生成 AI 描述
 * @param {object} monsterData 怪獸的基礎數據
 * @returns {Promise<object>} 包含 AI 生成描述的對象
 */
async function generateAIDescriptions(monsterData) {
    return fetchAPI('/generate-ai-descriptions', {
        method: 'POST',
        body: JSON.stringify({ monster_data: monsterData }),
    });
}

/**
 * 更新怪獸的自定義屬性名
 * @param {string} monsterId 怪獸 ID
 * @param {string} customElementNickname 新的自定義屬性名 (空字串表示清除)
 * @returns {Promise<object>} 更新結果，包含更新後的怪獸資料
 */
async function updateMonsterCustomNickname(monsterId, customElementNickname) {
    return fetchAPI(`/monster/${monsterId}/update-nickname`, {
        method: 'POST',
        body: JSON.stringify({ custom_element_nickname: customElementNickname }),
    });
}

/**
 * 治療怪獸
 * @param {string} monsterId 怪獸 ID
 * @param {'full_hp' | 'full_mp' | 'cure_conditions' | 'full_restore'} healType 治療類型
 * @returns {Promise<object>} 治療結果，包含更新後的怪獸資料
 */
async function healMonster(monsterId, healType) {
    return fetchAPI(`/monster/${monsterId}/heal`, {
        method: 'POST',
        body: JSON.stringify({ heal_type: healType }),
    });
}

/**
 * 分解怪獸
 * @param {string} monsterId 怪獸 ID
 * @returns {Promise<object>} 分解結果，包含返回的 DNA 模板和更新後的農場怪獸列表
 */
async function disassembleMonster(monsterId) {
    return fetchAPI(`/monster/${monsterId}/disassemble`, {
        method: 'POST',
    });
}

/**
 * 使用 DNA 為怪獸充能
 * @param {string} monsterId 怪獸 ID
 * @param {string} dnaInstanceId 要消耗的 DNA 實例 ID
 * @param {'hp' | 'mp'} rechargeTarget 充能目標 (HP 或 MP)
 * @returns {Promise<object>} 充能結果，包含更新後的怪獸和玩家 DNA 列表
 */
async function rechargeMonsterWithDNA(monsterId, dnaInstanceId, rechargeTarget) {
    return fetchAPI(`/monster/${monsterId}/recharge`, {
        method: 'POST',
        body: JSON.stringify({
            dna_instance_id: dnaInstanceId,
            recharge_target: rechargeTarget,
        }),
    });
}

/**
 * 完成怪獸修煉
 * @param {string} monsterId 怪獸 ID
 * @param {number} durationSeconds 修煉時長 (秒)
 * @returns {Promise<object>} 修煉結果，包含技能更新、潛在新技能等
 */
async function completeCultivation(monsterId, durationSeconds) {
    return fetchAPI(`/monster/${monsterId}/cultivation/complete`, {
        method: 'POST',
        body: JSON.stringify({ duration_seconds: durationSeconds }),
    });
}

/**
 * 替換或學習怪獸技能
 * @param {string} monsterId 怪獸 ID
 * @param {number | null} slotIndex 要替換的技能槽索引 (null 表示學習到新槽位)
 * @param {object} newSkillTemplate 新技能的模板數據
 * @returns {Promise<object>} 更新結果，包含更新後的怪獸資料
 */
async function replaceMonsterSkill(monsterId, slotIndex, newSkillTemplate) {
    return fetchAPI(`/monster/${monsterId}/skill/replace`, {
        method: 'POST',
        body: JSON.stringify({
            slot_index: slotIndex,
            new_skill_template: newSkillTemplate,
        }),
    });
}

/**
 * 獲取怪獸排行榜
 * @param {number} topN 需要的排行數量
 * @returns {Promise<Array<object>>} 怪獸排行榜列表
 */
async function getMonsterLeaderboard(topN = 10) {
    return fetchAPI(`/leaderboard/monsters?top_n=${topN}`);
}

/**
 * 獲取玩家排行榜
 * @param {number} topN 需要的排行數量
 * @returns {Promise<Array<object>>} 玩家排行榜列表
 */
async function getPlayerLeaderboard(topN = 10) {
    return fetchAPI(`/leaderboard/players?top_n=${topN}`);
}

/**
 * 根據暱稱搜尋玩家
 * @param {string} nicknameQuery 搜尋的暱稱關鍵字
 * @param {number} limit 返回結果的數量限制
 * @returns {Promise<object>} 包含玩家列表的搜尋結果
 */
async function searchPlayers(nicknameQuery, limit = 10) {
    if (!nicknameQuery.trim()) {
        return Promise.resolve({ players: [] }); // 如果查詢為空，直接返回空結果
    }
    return fetchAPI(`/players/search?nickname=${encodeURIComponent(nicknameQuery)}&limit=${limit}`);
}


console.log("API client module loaded.");

// 導出 (如果使用 ES6 模塊)
// export { getGameConfigs, getPlayerData, combineDNA, simulateBattle, generateAIDescriptions, updateMonsterCustomNickname, healMonster, disassembleMonster, rechargeMonsterWithDNA, completeCultivation, replaceMonsterSkill, getMonsterLeaderboard, getPlayerLeaderboard, searchPlayers };
