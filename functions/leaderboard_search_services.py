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
# 移除此服務中獲取 NPC 怪獸的邏輯，使其僅處理玩家怪獸
def get_all_player_selected_monsters_service(game_configs: GameConfigs) -> List[Monster]:
    """
    獲取所有玩家設定為「出戰」的怪獸，用於排行榜。
    """
    if not MD_firebase_config.db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化 (get_all_player_selected_monsters_service 內部)。")
        return []
    
    db = MD_firebase_config.db

    all_selected_monsters: List[Monster] = []
    try:
        users_ref = db.collection('users')
        # ----- BUG 修正邏輯 START -----
        # 預先載入所有 DNA 範本，避免在迴圈中重複讀取
        all_dna_templates = game_configs.get("dna_fragments", [])
        # ----- BUG 修正邏輯 END -----

        for user_doc in users_ref.stream(): 
            game_data_doc_ref = user_doc.reference.collection('gameData').document('main')
            game_data_doc = game_data_doc_ref.get()
            if game_data_doc.exists:
                player_game_data = game_data_doc.to_dict()
                if player_game_data:
                    selected_monster_id = player_game_data.get("selectedMonsterId")
                    farmed_monsters = player_game_data.get("farmedMonsters", [])
                    player_nickname = player_game_data.get("nickname", user_doc.id)

                    if selected_monster_id:
                        for monster_dict in farmed_monsters:
                            if monster_dict.get("id") == selected_monster_id:
                                monster_copy = copy.deepcopy(monster_dict)
                                monster_copy["owner_nickname"] = player_nickname # type: ignore
                                monster_copy["owner_id"] = user_doc.id # type: ignore
                                
                                # ----- BUG 修正邏輯 START -----
                                # 尋找怪獸頭部對應的 DNA 資訊
                                head_dna_info = { "type": "無", "rarity": "普通" } # 設定預設值
                                constituent_ids = monster_copy.get("constituent_dna_ids", [])
                                
                                # 根據遊戲規則，第一個 DNA (索引 0) 對應頭部
                                if constituent_ids:
                                    head_dna_id = constituent_ids[0]
                                    head_dna_template = next((dna for dna in all_dna_templates if dna.get("id") == head_dna_id), None)
                                    if head_dna_template:
                                        head_dna_info["type"] = head_dna_template.get("type", "無")
                                        head_dna_info["rarity"] = head_dna_template.get("rarity", "普通")
                                
                                # 將頭部 DNA 的資訊附加到回傳的怪獸物件中
                                monster_copy["head_dna_info"] = head_dna_info # type: ignore
                                # ----- BUG 修正邏輯 END -----

                                if "farmStatus" not in monster_copy:
                                    monster_copy["farmStatus"] = {"isTraining": False, "isBattling": False} # type: ignore
                                
                                all_selected_monsters.append(monster_copy) # type: ignore
                                break
        
        leaderboard_search_services_logger.info(f"成功獲取 {len(all_selected_monsters)} 隻玩家出戰怪獸。")
        return all_selected_monsters
    except Exception as e:
        leaderboard_search_services_logger.error(f"獲取所有玩家出戰怪獸時發生錯誤: {e}", exc_info=True)
        return []

def get_monster_leaderboard_service(game_configs: GameConfigs, top_n: int = 10) -> List[Monster]:
    """
    獲取怪獸排行榜 (不再返回 NPC 怪獸，因為需求是所有怪獸都歸玩家所有)。
    此函數現在為空實現，等待 MD_routes.py 中調用 get_all_player_selected_monsters_service。
    """
    leaderboard_search_services_logger.info("根據需求，排行榜不再包含 NPC 怪獸。此服務返回空列表。")
    return []

def get_player_leaderboard_service(game_configs: GameConfigs, top_n: int = 10) -> List[PlayerStats]:
    """獲取玩家排行榜。"""
    if not MD_firebase_config.db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化 (get_player_leaderboard_service 內部)。")
        return []
    
    db = MD_firebase_config.db

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
                    stats["uid"] = user_doc.id # 新增：將 UID 加入到 stats 物件中
                    all_player_stats.append(stats)

        all_player_stats.sort(key=lambda ps: ps.get("score", 0), reverse=True)
        return all_player_stats[:top_n]
    except Exception as e:
        leaderboard_search_services_logger.error(f"獲取玩家排行榜時發生錯誤: {e}", exc_info=True)
        return []

import firebase_admin
from firebase_admin import firestore

def search_players_service(nickname_query: str, limit: int = 10) -> List[Dict[str, str]]:
    """根據暱稱搜尋玩家。"""
    if not MD_firebase_config.db:
        leaderboard_search_services_logger.error("Firestore 資料庫未初始化 (search_players_service 內部)。")
        return []
    
    db = MD_firebase_config.db

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
