// js/api-client.js

// 注意：此檔案依賴於 js/config.js 中的 API_BASE_URL 和 js/auth.js 中的 getCurrentUserToken

const MAX_RETRIES = 3; // 最大重試次數
const RETRY_DELAY_MS = 1000; // 重試之間的延遲時間 (毫秒)

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

    for (let i = 0; i < MAX_RETRIES; i++) {
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

                // 對於 5xx 錯誤 (伺服器錯誤) 或網路錯誤，嘗試重試
                if ((response.status >= 500 || response.status === 0) && i < MAX_RETRIES - 1) {
                    console.warn(`Retrying API call to ${url} (attempt ${i + 1}/${MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1))); // 增加延遲時間
                    continue; // 繼續下一次重試
                }
                throw error; // 非重試錯誤或已達最大重試次數，拋出錯誤
            }

            // 如果回應狀態碼是 204 (No Content)，則不嘗試解析 JSON
            if (response.status === 204) {
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(`Fetch API Error for ${url}:`, error);
            // 對於網路錯誤 (例如 CORS 錯誤、連線中斷等)，也嘗試重試
            if (i < MAX_RETRIES - 1 && (error instanceof TypeError || error.message.includes("Failed to fetch"))) {
                console.warn(`Retrying API call to ${url} due to network error (attempt ${i + 1}/${MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1))); // 增加延遲時間
                continue;
            }
            // 向上拋出錯誤，讓調用者處理
            throw error;
        }
    }
    // 如果所有重試都失敗，這裡會隱含地拋出最後一個錯誤
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
    return fetchAPI(`/player/${playerId}`);
}

/**
 * 將玩家的遊戲資料保存到後端。
 * @param {string} playerId 玩家 ID
 * @param {object} playerData 玩家的完整遊戲資料物件
 * @returns {Promise<object>} 保存結果
 */
async function savePlayerData(playerId, playerData) {
    if (!playerId || !playerData) {
        throw new Error("保存玩家資料需要 playerId 和 playerData。");
    }
    return fetchAPI(`/player/${playerId}/save`, {
        method: 'POST',
        body: JSON.stringify(playerData),
    });
}


/**
 * 組合 DNA 生成新怪獸
 * @param {string[]} dnaInstanceIds 要組合的 DNA 實例 ID 列表
 * @returns {Promise<object>} 新生成的怪獸對象或錯誤訊息
 */
async function combineDNA(dnaInstanceIds) {
    if (!dnaInstanceIds || dnaInstanceIds.length === 0) {
        throw new Error("DNA 組合需要提供 DNA 實例 ID 列表。");
    }
    return fetchAPI('/combine', {
        method: 'POST',
        body: JSON.stringify({ dna_ids: dnaInstanceIds }),
    });
}

/**
 * 執行一次免費的 DNA 抽取
 * @returns {Promise<object>} 包含抽取結果的對象
 */
async function drawFreeDNA() {
    return fetchAPI('/dna/draw-free', {
        method: 'POST', // 使用 POST 請求，即使沒有 body，通常抽獎等改變資源狀態的操作會用 POST
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
 * @param {string} customElementNickname 新的自定義屬性名
 * @returns {Promise<object>} 更新結果
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
 * @returns {Promise<object>} 治療結果
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
 * @returns {Promise<object>} 分解結果
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
 * @param {'hp' | 'mp'} rechargeTarget 充能目標
 * @returns {Promise<object>} 充能結果
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
 * @returns {Promise<object>} 修煉結果
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
 * @param {number | null} slotIndex 要替換的技能槽索引
 * @param {object} newSkillTemplate 新技能的模板數據
 * @returns {Promise<object>} 更新結果
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
    // 移除: return fetchAPI(`/leaderboard/monsters?top_n=${topN}`);
    // 新增: 加入 include_base_id=true 參數
    return fetchAPI(`/leaderboard/monsters?top_n=${topN}&include_base_id=true`);
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
        return Promise.resolve({ players: [] });
    }
    return fetchAPI(`/players/search?nickname=${encodeURIComponent(nicknameQuery)}&limit=${limit}`);
}


console.log("API client module loaded.");
