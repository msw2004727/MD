# backend/leaderboard_search_services.py
# 處理排行榜和玩家搜尋的服務

import logging
from typing import List, Dict, Optional, Any
import copy # 用於深拷貝怪獸數據

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    Monster, PlayerStats, GameConfigs, ElementTypes, RarityNames
)

# 從 MD_firebase_config 導入 db 實例，因為這裡的服務需要與 Firestore 互動
from . import MD_firebase_config

# 導入 firestore 模組以使用其功能，例如查詢方向
from firebase_admin import firestore

leaderboard_search_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式或測試，避免循環導入 GameConfigs) ---
# 這裡只包含這個模組需要的預設值，避免重複和潛在的循環導入
DEFAULT_GAME_CONFIGS_FOR_LEADERBOARD: GameConfigs = {
    "dna_fragments": [],
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {},
    "personalities": [],
    "titles": ["新手"],
    "monster_achievements_list": [],
    "element_nicknames": {},
    "naming_constraints": {},
    "health_conditions": [],
    "newbie_guide": [],
    "npc_monsters": [], # NPC 怪獸資料
    "value_settings": {},
    "absorption_config": {},
    "cultivation_config": {},
    "elemental_advantage_chart": {}
}


# --- 排行榜與玩家搜尋服務 ---
def get_all_player_selected_monsters_service(top_n: int) -> List[Monster]:
    """
    高效能地獲取出戰怪獸排行榜。
    此函數現在直接查詢 MonsterLeaderboard 集合，而不是遍歷所有玩家。
    """
    if not MD_firebase_config.db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化 (get_all_player_selected_monsters_service 內部)。")
        return []
    
    db = MD_firebase_config.db
    all_selected_monsters: List[Monster] = []

    try:
        # 建立一個直接對 MonsterLeaderboard 集合的查詢
        query = db.collection('MonsterLeaderboard').order_by(
            'score', direction=firestore.Query.DESCENDING
        ).limit(top_n)

        # 執行查詢並處理結果
        docs = query.stream()
        for doc in docs:
            monster_data = doc.to_dict()
            # 確保返回的資料結構與舊版一致，以利前端處理
            # 在 player_services 中，我們存入的欄位名是 monster_id，這裡把它轉為 id
            monster_data['id'] = monster_data.get('monster_id', doc.id)
            all_selected_monsters.append(monster_data) # type: ignore
        
        leaderboard_search_services_logger.info(f"成功從 MonsterLeaderboard 集合獲取 {len(all_selected_monsters)} 隻怪獸。")
        return all_selected_monsters

    except Exception as e:
        # 如果查詢失敗，例如因為索引不存在
        error_str = str(e).lower()
        if "index" in error_str:
            leaderboard_search_services_logger.error(
                "讀取排行榜失敗，因為 Firestore 缺少必要的索引。請到 Firebase Console，為 `MonsterLeaderboard` 集合的 `score` 欄位建立一個『降序』索引。"
            )
        leaderboard_search_services_logger.error(f"從 MonsterLeaderboard 獲取怪獸時發生錯誤: {e}", exc_info=True)
        return []

def get_player_leaderboard_service(game_configs: GameConfigs, top_n: int = 10) -> List[PlayerStats]:
    """獲取玩家排行榜。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    if not MD_firebase_config.db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化 (get_player_leaderboard_service 內部)。")
        return []
    
    db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

    all_player_stats: List[PlayerStats] = []
    try:
        # 這裡的玩家排行榜邏輯暫時保持不變，因為它依賴於 playerStats 子集合，
        # 如果未來玩家數量龐大，也需要採用類似的 denormalization 策略。
        users_ref = db.collection('users')
        for user_doc in users_ref.stream(): # 注意：效能問題
            game_data_doc_ref = user_doc.reference.collection('gameData').document('main')
            game_data_doc = game_data_doc_ref.get()
            if game_data_doc.exists:
                player_game_data = game_data_doc.to_dict()
                if player_game_data and player_game_data.get("playerStats"):
                    stats: PlayerStats = player_game_data["playerStats"] # type: ignore
                    if "nickname" not in stats or not stats["nickname"]:
                        stats["nickname"] = player_game_data.get("nickname", user_doc.id) # type: ignore
                    stats["uid"] = user_doc.id # 新增：將 UID 加入到 stats 物件中
                    all_player_stats.append(stats)

        all_player_stats.sort(key=lambda ps: ps.get("score", 0), reverse=True)
        return all_player_stats[:top_n]
    except Exception as e:
        leaderboard_search_services_logger.error(f"獲取玩家排行榜時發生錯誤: {e}", exc_info=True)
        return []

# 確保 firestore 在這裡被導入，因為 search_players_service 會用到 firestore.FieldFilter
import firebase_admin
from firebase_admin import firestore

def search_players_service(nickname_query: str, limit: int = 10) -> List[Dict[str, str]]:
    """根據暱稱搜尋玩家。"""
    if not MD_firebase_config.db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化 (search_players_service 內部)。")
        return []
    
    db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

    if not nickname_query:
        return []

    results: List[Dict[str, str]] = []
    try:
        # 修正：使用正確的 firestore.FieldFilter
        query_ref = db.collection('users').where(
            filter=firestore.FieldFilter('nickname', '>=', nickname_query)
        ).where(
            filter=firestore.FieldFilter('nickname', '<=', nickname_query + '\uf8ff')
        ).limit(limit)

        docs = query_ref.stream()
        for doc in docs:
            user_data = doc.to_dict()
            if user_data and user_data.get("nickname"):
                results.append({"uid": doc.id, "nickname": user_data["nickname"]})
        return results
    except Exception as e:
        leaderboard_search_services_logger.error(f"搜尋玩家時發生錯誤 (query: '{nickname_query}'): {e}", exc_info=True)
        # 檢查是否為索引錯誤
        error_str = str(e).lower()
        if "index" in error_str and ("ensure" in error_str or "required" in error_str or "missing" in error_str):
            leaderboard_search_services_logger.error(
                "Firestore 搜尋玩家缺少必要的索引。請檢查 Firestore 控制台的索引建議，"
                "通常需要為 'users' 集合的 'nickname' 欄位建立升序索引。"
            )
        return []
