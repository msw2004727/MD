# backend/monster_chat_services.py
# 處理怪獸 AI 聊天的核心服務邏輯

import logging
from typing import Dict, Any, List, Optional

# 從專案的其他模組導入必要的模型和服務
from .MD_models import PlayerGameData, Monster, GameConfigs, ChatHistoryEntry
from .player_services import get_player_data_service
from .MD_ai_services import get_ai_chat_completion # 我們稍後會建立這個函式

# 設定日誌記錄器
chat_logger = logging.getLogger(__name__)

# 定義短期記憶的長度 (儲存的對話數量)
CHAT_HISTORY_LIMIT = 20

def generate_monster_chat_response_service(
    player_id: str,
    monster_id: str,
    player_message: str,
    game_configs: GameConfigs
) -> Optional[Dict[str, Any]]:
    """
    生成怪獸的聊天回應，並管理其對話歷史。

    Args:
        player_id (str): 玩家的唯一ID。
        monster_id (str): 目標怪獸的唯一ID。
        player_message (str): 玩家發送的訊息。
        game_configs (GameConfigs): 當前的遊戲設定。

    Returns:
        Optional[Dict[str, Any]]: 包含AI回覆和更新後玩家資料的字典，或在失敗時返回 None。
    """
    # 1. 獲取最新的玩家資料
    player_data, _ = get_player_data_service(player_id, None, game_configs)
    if not player_data:
        chat_logger.error(f"無法獲取玩家 {player_id} 的資料。")
        return None

    # 2. 從玩家資料中找到目標怪獸
    monster_to_chat = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
    if not monster_to_chat:
        chat_logger.error(f"在玩家 {player_id} 的農場中找不到怪獸 {monster_id}。")
        return None

    # 3. 獲取或初始化怪獸的對話歷史 (短期記憶)
    chat_history: List[ChatHistoryEntry] = monster_to_chat.get("chatHistory", [])

    # 4. 呼叫 AI 服務以生成回應 (目前為佔位符)
    # 實際的 AI 呼叫會發生在這裡，我們會傳入怪獸資料、玩家資料和對話歷史
    # 為了先建立架構，我們暫時返回一個固定的回應
    # TODO: 替換為真實的 AI 呼叫
    # ai_reply_text = get_ai_chat_completion(monster_to_chat, player_data, chat_history, player_message)
    ai_reply_text = f"（{monster_to_chat.get('nickname')} 正在思考如何回應...）" # 暫時的預設回應

    if not ai_reply_text:
        chat_logger.error(f"AI 服務未能為怪獸 {monster_id} 生成回應。")
        return None

    # 5. 更新對話歷史
    # 將玩家的新訊息加入歷史
    chat_history.append({"role": "user", "content": player_message})
    # 將 AI 的新回覆加入歷史
    chat_history.append({"role": "assistant", "content": ai_reply_text})

    # 6. 維護短期記憶長度，移除最舊的紀錄
    if len(chat_history) > CHAT_HISTORY_LIMIT:
        chat_history = chat_history[-CHAT_HISTORY_LIMIT:]

    # 7. 將更新後的對話歷史寫回怪獸物件
    monster_to_chat["chatHistory"] = chat_history

    # 8. 準備回傳結果
    # 注意：這裡我們不直接儲存，而是將更新後的 player_data 傳回路由層，由路由層統一處理儲存
    result = {
        "ai_reply": ai_reply_text,
        "updated_player_data": player_data
    }
    
    chat_logger.info(f"成功為怪獸 {monster_id} 生成聊天回應。")
    return result
