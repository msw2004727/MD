# backend/leaderboard_search_services.py
# 處理排行榜和玩家搜尋的服務

import logging
from typing import List, Dict, Optional, Any
import copy 

from .MD_models import Monster, PlayerStats, GameConfigs
from . import MD_firebase_config
import firebase_admin
from firebase_admin import firestore

leaderboard_search_services_logger = logging.getLogger(__name__)

DEFAULT_GAME_CONFIGS_FOR_LEADERBOARD: GameConfigs = {
    "dna_fragments": [],
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}},
    "skills": {},
    "personalities": [],
    "titles": ["新手"],
    "monster_achievements_list": [],
    "element_nicknames": {},
    "naming_constraints": {},
    "health_conditions": [],
    "newbie_guide": [],
    "npc_monsters": [],
    "value_settings": {},
    "absorption_config": {},
    "cultivation_config": {},
    "elemental_advantage_chart": {}
}


# --- 排行榜與玩家搜尋服務 ---

def get_monster_leaderboard_service(game_configs: GameConfigs, top_n: int = 10) -> List[Monster]:
    """
    從專用的 MD_LeaderboardMonsters 集合中獲取怪獸排行榜。
    這是一種高效、可擴展的方法。
    """
    db = MD_firebase_config.db
    if not db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化，無法獲取怪獸排行榜。")
        return []

    leaderboard_monsters: List[Monster] = []
    try:
        # 直接查詢排行榜集合，並根據分數(score)進行降序排序，最後限制返回的數量
        query = db.collection('MD_LeaderboardMonsters').order_by('score', direction=firestore.Query.DESCENDING).limit(top_n)
        docs = query.stream()

        for doc in docs:
            leaderboard_monsters.append(doc.to_dict()) # type: ignore
        
        leaderboard_search_services_logger.info(f"成功從 MD_LeaderboardMonsters 集合中獲取了 {len(leaderboard_monsters)} 隻怪獸。")
        return leaderboard_monsters
    except Exception as e:
        leaderboard_search_services_logger.error(f"從 MD_LeaderboardMonsters 獲取排行榜時發生錯誤: {e}", exc_info=True)
        return []

def get_player_leaderboard_service(game_configs: GameConfigs, top_n: int = 10) -> List[PlayerStats]:
    """獲取玩家排行榜。"""
    db = MD_firebase_config.db
    if not db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化 (get_player_leaderboard_service 內部)。")
        return []
    
    all_player_stats: List[PlayerStats] = []
    try:
        users_ref = db.collection('users')
        for user_doc in users_ref.stream(): 
            game_data_doc_ref = user_doc.reference.collection('gameData').document('main')
            game_data_doc = game_data_doc_ref.get()
            if game_data_doc.exists:
                player_game_data = game_data_doc.to_dict()
                if player_game_data and player_game_data.get("playerStats"):
                    stats: PlayerStats = player_game_data["playerStats"] # type: ignore
                    if "nickname" not in stats or not stats["nickname"]:
                        stats["nickname"] = player_game_data.get("nickname", user_doc.id) # type: ignore
                    stats["uid"] = user_doc.id 
                    all_player_stats.append(stats)

        all_player_stats.sort(key=lambda ps: ps.get("score", 0), reverse=True)
        return all_player_stats[:top_n]
    except Exception as e:
        leaderboard_search_services_logger.error(f"獲取玩家排行榜時發生錯誤: {e}", exc_info=True)
        return []

def search_players_service(nickname_query: str, limit: int = 10) -> List[Dict[str, str]]:
    """根據暱稱搜尋玩家。"""
    db = MD_firebase_config.db
    if not db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化 (search_players_service 內部)。")
        return []
    
    if not nickname_query:
        return []

    results: List[Dict[str, str]] = []
    try:
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
        error_str = str(e).lower()
        if "index" in error_str and ("ensure" in error_str or "required" in error_str or "missing" in error_str):
            leaderboard_search_services_logger.error(
                "Firestore 搜尋玩家缺少必要的索引。請檢查 Firestore 控制台的索引建議，"
                "通常需要為 'users' 集合的 'nickname' 欄位建立升序索引。"
            )
        return []
