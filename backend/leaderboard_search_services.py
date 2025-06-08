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
# 更改此服務，使其僅獲取 NPC 怪獸
def get_monster_leaderboard_service(game_configs: GameConfigs, top_n: int = 10) -> List[Monster]:
    """
    獲取怪獸排行榜 (僅返回 NPC 怪獸，玩家怪獸將在路由層處理)。
    """
    if not MD_firebase_config.db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化 (get_monster_leaderboard_service 內部)。")
        return []
    
    # db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

    all_monsters: List[Monster] = []
    try:
        # 從 game_configs 中獲取 NPC 怪獸
        npc_monsters_templates: List[Monster] = game_configs.get("npc_monsters", DEFAULT_GAME_CONFIGS_FOR_LEADERBOARD["npc_monsters"]) # type: ignore
        if npc_monsters_templates:
            # 確保 NPC 怪獸有正確的 isNPC 標記和 owner_id (例如 "NPC")
            copied_npcs = copy.deepcopy(npc_monsters_templates)
            for npc in copied_npcs:
                npc["isNPC"] = True
                if "owner_id" not in npc:
                    npc["owner_id"] = "NPC"
                if "owner_nickname" not in npc:
                    npc["owner_nickname"] = "遊戲系統"
                # 確保 NPC 怪獸也有 farmStatus 屬性，即使是空字典，以便前端統一處理
                if "farmStatus" not in npc:
                    npc["farmStatus"] = {"isTraining": False, "isBattling": False} # 預設為不在訓練或戰鬥
            all_monsters.extend(copied_npcs)

        # 對 NPC 怪獸進行排序，雖然這裡只返回 NPC，但保持排序習慣
        all_monsters.sort(key=lambda m: m.get("score", 0), reverse=True)
        return all_monsters[:top_n]
    except Exception as e:
        leaderboard_search_services_logger.error(f"獲取怪獸排行榜 (NPC) 時發生錯誤: {e}", exc_info=True)
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
