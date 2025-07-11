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
                // 嘗試解析錯誤回應的 JSON，如果不是 JSON 格式則忽略
                errorData = await response.json();
            } catch (e) {
                errorData = { message: response.statusText || 'Unknown error', status: response.status };
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

        // 檢查是否為網路錯誤 (例如伺服器無回應或CORS預檢失敗)
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            const networkError = new Error(
                '網路連線失敗：您所在的異世界網路環境不穩定或伺服器正在從休眠中甦醒。請稍後再試一次。'
            );
            networkError.name = 'NetworkError';
            throw networkError;
        }
        
        // 對於其他類型的錯誤，繼續向上拋出
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
    const result = await fetchAPI(`/player/${playerId}/save`, {
        method: 'POST',
        body: JSON.stringify(playerData),
    });
    if (result && result.success) {
        // 成功保存後，更新前端的 gameState.playerData
        if (typeof gameState !== 'undefined') {
            gameState.playerData = playerData;
        }
    }
    return result;
}


/**
 * 組合 DNA 生成新怪獸
 * @param {object[]} dnaObjects 要組合的 DNA 物件列表
 * @returns {Promise<object>} 新生成的怪獸對象或錯誤訊息
 */
async function combineDNA(dnaObjects) {
    if (!dnaObjects || dnaObjects.length === 0) {
        throw new Error("DNA 組合需要提供 DNA 物件列表。");
    }
    return fetchAPI('/combine', {
        method: 'POST',
        body: JSON.stringify({ dna_data: dnaObjects }),
    });
}

/**
 * 執行一次免費的 DNA 抽取
 * @returns {Promise<object>} 包含抽取結果的對象
 */
async function drawFreeDNA() {
    return fetchAPI('/dna/draw-free', {
        method: 'POST', 
    });
}


/**
 * 模擬戰鬥 (現在支援一次性返回完整戰報)
 * @param {object} battleRequestData - 包含 player_monster_data 和 opponent_monster_data 的物件
 * @returns {Promise<object>} 戰鬥結果，包含 AI 生成的戰報內容
 */
async function simulateBattle(battleRequestData) { 
    if (!battleRequestData || !battleRequestData.player_monster_data || !battleRequestData.opponent_monster_data) {
        throw new Error("simulateBattle 函數需要一個包含 player_monster_data 和 opponent_monster_data 的物件。");
    }
    // 確保 is_ladder_match 和 challenge_type 被正確傳遞
    return fetchAPI('/battle/simulate', {
        method: 'POST',
        body: JSON.stringify(battleRequestData), 
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
 * 裝備一個稱號
 * @param {string} titleId 要裝備的稱號 ID
 * @returns {Promise<object>} 更新結果
 */
async function equipTitle(titleId) {
    return fetchAPI('/player/equip-title', {
        method: 'POST',
        body: JSON.stringify({ title_id: titleId }),
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
    return fetchAPI(`/leaderboard/monsters?top_n=${topN}`);
}

/**
 * 獲取冠軍殿堂排行榜
 * @returns {Promise<Array<object>>} 冠軍殿堂怪獸列表 (固定4個位置)
 */
async function getChampionsLeaderboard() {
    return fetchAPI('/champions');
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

/**
 * 獲取好友的上線狀態
 * @param {string[]} friendIds - 好友 UID 的陣列
 * @returns {Promise<object>} - 包含好友狀態的物件，鍵為 UID，值為 lastSeen 時間戳
 */
async function getFriendsStatuses(friendIds) {
    if (!friendIds || friendIds.length === 0) {
        return Promise.resolve({ success: true, statuses: {} });
    }
    return fetchAPI('/friends/statuses', {
        method: 'POST',
        body: JSON.stringify({ friend_ids: friendIds }),
    });
}

/**
 * 發送好���請求給另一位玩家
 * @param {string} recipientId 收件人的 ID
 * @returns {Promise<object>} 後端的回應
 */
async function sendFriendRequest(recipientId) {
    return fetchAPI('/friends/request', {
        method: 'POST',
        body: JSON.stringify({
            recipient_id: recipientId
        }),
    });
}

/**
 * 回應好友請求
 * @param {string} mailId 好友請求信件的 ID
 * @param {'accept' | 'decline'} action 玩家的操作
 * @returns {Promise<object>} 後端的回應
 */
async function respondToFriendRequest(mailId, action) {
    return fetchAPI('/friends/response', {
        method: 'POST',
        body: JSON.stringify({
            mail_id: mailId,
            action: action
        }),
    });
}

/**
 * 寄送一封信件給另一位玩家
 * @param {string} recipientId 收件人的 ID
 * @param {string} title 信件標題
 * @param {string} content 信件內容
 * @param {object | null} payload 附件內容 (可選)
 * @returns {Promise<object>} 後端的回應
 */
async function sendMail(recipientId, title, content, payload = null) {
    return fetchAPI('/mailbox/send', {
        method: 'POST',
        body: JSON.stringify({
            recipient_id: recipientId,
            title: title,
            content: content,
            payload: payload
        }),
    });
}

/**
 * 與怪獸進行物理互動
 * @param {string} monsterId 怪獸的 ID
 * @param {'punch' | 'pat' | 'kiss'} action 互動的類型
 * @returns {Promise<object>} 包含 AI 回應的物件
 */
async function interactWithMonster(monsterId, action) {
    return fetchAPI(`/monster/${monsterId}/interact`, {
        method: 'POST',
        body: JSON.stringify({ action: action }),
    });
}


/**
 * 請求切換技能的開關狀態
 * @param {string} monsterId 怪獸的 ID
 * @param {string} skillName 技能的名稱
 * @param {boolean} targetState 想要的狀態 (true 為開啟, false 為關閉)
 * @returns {Promise<object>} 包含怪獸是否同意及 AI 回應的物件
 */
async function toggleSkillActiveState(monsterId, skillName, targetState) {
    return fetchAPI(`/monster/${monsterId}/toggle-skill`, {
        method: 'POST',
        body: JSON.stringify({
            skill_name: skillName,
            target_state: targetState
        }),
    });
}

/**
 * 從好友列表中移除一位好友
 * @param {string} friendId 要移除的好友 ID
 * @returns {Promise<object>} 後端的回應
 */
async function removeFriend(friendId) {
    return fetchAPI('/friends/remove', {
        method: 'POST',
        body: JSON.stringify({ friend_id: friendId }),
    });
}

/**
 * 獲取冒險島的資料
 * @returns {Promise<Array<object>>} 包含所有島嶼設定資料的陣列
 */
async function getAdventureIslandsData() {
    return fetchAPI('/adventure/islands');
}

/**
 * 開始一次新的遠征
 * @param {string} islandId 島嶼ID
 * @param {string} facilityId 設施ID
 * @param {Array<string>} teamMonsterIds 選擇的怪獸ID列表
 * @returns {Promise<object>} 包含遠征進度或錯誤訊息的物件
 */
async function startExpedition(islandId, facilityId, teamMonsterIds) {
    return fetchAPI('/adventure/start', {
        method: 'POST',
        body: JSON.stringify({
            island_id: islandId,
            facility_id: facilityId,
            team_monster_ids: teamMonsterIds
        }),
    });
}

/**
 * 在冒險中推進一步。
 * @returns {Promise<object>} 包含新事件資料或錯誤訊息的物件。
 */
async function advanceAdventure() {
    return fetchAPI('/adventure/advance', {
        method: 'POST'
    });
}

/**
 * 通關當前樓層並前進到下一層。
 * @returns {Promise<object>} 包含成功訊息與新進度資料的物件。
 */
async function completeAdventureFloor() {
    return fetchAPI('/adventure/complete_floor', {
        method: 'POST'
    });
}


/**
 * 處理玩家對冒險事件的選擇。
 * @param {string} choiceId - 玩家選擇的選項ID。
 * @returns {Promise<object>} 包含事件結果與更新後進度的物件。
 */
async function resolveAdventureEvent(choiceId) {
    return fetchAPI('/adventure/resolve', {
        method: 'POST',
        body: JSON.stringify({ choice_id: choiceId }),
    });
}

/**
 * 領取一封信件中的所有附件。
 * @param {string} mailId - 要領取附件的信件 ID。
 * @returns {Promise<object>} 包含操作結果的物件。
 */
async function claimMailAttachments(mailId) {
    if (!mailId) {
        throw new Error("領取附件需要提供 mailId。");
    }
    return fetchAPI(`/mailbox/${mailId}/claim`, {
        method: 'POST'
    });
}

// --- 核心修改處 START ---
/**
 * 請求放棄當前的遠征。
 * @returns {Promise<object>} 包含成功訊息與最終統計數據的物件。
 */
async function abandonAdventure() {
    return fetchAPI('/adventure/abandon', {
        method: 'POST'
    });
}

/**
 * 請求更換遠征隊的隊長。
 * @param {string} monsterId - 要晉升為新隊長的怪獸ID。
 * @returns {Promise<object>} 包含成功訊息與更新後進度的物件。
 */
async function switchAdventureCaptain(monsterId) {
    return fetchAPI('/adventure/switch_captain', {
        method: 'POST',
        body: JSON.stringify({ monster_id: monsterId }),
    });
}

/**
 * 獲取交易所的商品列表
 * @returns {Promise<Array<object>>} 商品列表
 */
async function getExchangeListings() {
    return fetchAPI('/exchange/listings');
}

/**
 * 獲取我正在販售的商品列表
 * @returns {Promise<Array<object>>} 我的商品列表
 */
async function getMyExchangeListings() {
    return fetchAPI('/exchange/my-listings');
}

/**
 * 上架一個商品到交易所
 * @param {string} itemId - 要上架的DNA實例ID
 * @param {number} price - 定價
 * @returns {Promise<object>} 後端的回應
 */
async function createExchangeListing(itemId, price) {
    return fetchAPI('/exchange/list', {
        method: 'POST',
        body: JSON.stringify({ item_id: itemId, price: price }),
    });
}

/**
 * 從交易所下架一個商品
 * @param {string} listingId - 要下架的商品ID
 * @returns {Promise<object>} 後端的回應
 */
async function cancelExchangeListing(listingId) {
    return fetchAPI(`/exchange/delist/${listingId}`, {
        method: 'POST',
    });
}

/**
 * 從交易所購買一個商品
 * @param {string} listingId - 要購買的商品ID
 * @returns {Promise<object>} 後端的回應
 */
async function purchaseExchangeItem(listingId) {
    return fetchAPI(`/exchange/buy/${listingId}`, {
        method: 'POST',
    });
}

/**
 * 尋找一個天梯對手
 * @param {number} pvpPoints 玩家當前的PVP積分
 * @param {'weak' | 'equal' | 'strong'} matchType 匹配類型
 * @returns {Promise<object>} 包含對手資料的物件
 */
async function findLadderOpponent(pvpPoints, matchType) {
    return fetchAPI('/tournament/find_match', {
        method: 'POST',
        body: JSON.stringify({ 
            pvp_points: pvpPoints,
            match_type: matchType 
        }),
    });
}

// --- 核心修改處 END ---


console.log("API client module loaded.");
