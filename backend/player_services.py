# backend/player_services.py
# 處理玩家遊戲資料的初始化、獲取、保存功能

import time
import logging
from typing import List, Dict, Optional, Any
import firebase_admin
from firebase_admin import firestore
import random # 引入 random 模組

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import PlayerGameData, PlayerStats, PlayerOwnedDNA, GameConfigs, NamingConstraints, ValueSettings, DNAFragment

player_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式或測試，避免循環導入 GameConfigs) ---
DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER: GameConfigs = {
    "dna_fragments": [], 
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {}, 
    "personalities": [],
    "titles": ["新手"],
    "monster_achievements_list": ["新秀"],
    "element_nicknames": {"火": "炎獸"},
    "naming_constraints": {
        "max_player_title_len": 5, "max_monster_achievement_len": 5,
        "max_element_nickname_len": 5, "max_monster_full_nickname_len": 15
    },
    "health_conditions": [],
    "newbie_guide": [],
    "npc_monsters": [],
    "value_settings": {
        "element_value_factors": {},
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10,
        "max_monster_skills": 3,
        "max_battle_turns": 30,
        "max_inventory_slots": 12,
        "max_temp_backpack_slots": 9
    },
    "absorption_config": {},
    "cultivation_config": {},
    "elemental_advantage_chart": {},
}


def initialize_new_player_data(player_id: str, nickname: str, game_configs: GameConfigs) -> PlayerGameData:
    """為新玩家初始化遊戲資料。"""
    player_services_logger.info(f"為新玩家 {nickname} (ID: {player_id}) 初始化遊戲資料。")
    player_titles_list = game_configs.get("titles", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["titles"])
    default_player_title = player_titles_list[0] if player_titles_list else "新手" # type: ignore

    player_stats: PlayerStats = {
        "rank": "N/A", "wins": 0, "losses": 0, "score": 0,
        "titles": [default_player_title],
        "achievements": ["首次登入異世界"], "medals": 0, "nickname": nickname
    }

    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["value_settings"]) # type: ignore
    max_inventory_slots = value_settings.get("max_inventory_slots", 12)
    initial_dna_owned: List[Optional[PlayerOwnedDNA]] = [None] * max_inventory_slots

    dna_fragments_templates: List[DNAFragment] = game_configs.get("dna_fragments", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["dna_fragments"]) # type: ignore
    num_initial_dna = 6

    if dna_fragments_templates:
        eligible_dna_templates = [dna for dna in dna_fragments_templates if dna.get("rarity") in ["普通", "稀有"]]
        if not eligible_dna_templates:
            eligible_dna_templates = list(dna_fragments_templates) 

        for i in range(min(num_initial_dna, len(eligible_dna_templates), max_inventory_slots)):
            if not eligible_dna_templates: break
            template = random.choice(eligible_dna_templates)
            instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{i}"
            owned_dna_item: PlayerOwnedDNA = {**template, "id": instance_id, "baseId": template["id"]} # type: ignore
            initial_dna_owned[i] = owned_dna_item
            pass

    new_player_data: PlayerGameData = {
        "playerOwnedDNA": initial_dna_owned,
        "farmedMonsters": [],
        "playerStats": player_stats,
        "nickname": nickname,
        "lastSave": int(time.time()),
        "lastSeen": int(time.time()), # 新增：初始化 lastSeen
        "selectedMonsterId": None,
        "friends": [] # 為新玩家加入空的好友列表
    }
    player_services_logger.info(f"新玩家 {nickname} 資料初始化完畢，獲得 {num_initial_dna} 個初始 DNA。")
    return new_player_data

def get_player_data_service(player_id: str, nickname_from_auth: Optional[str], game_configs: GameConfigs) -> Optional[PlayerGameData]:
    """獲取玩家遊戲資料，如果不存在則初始化並儲存。"""
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        player_services_logger.error("Firestore 資料庫未初始化 (get_player_data_service 內部)。")
        return None

    db = firestore_db_instance

    try:
        user_profile_ref = db.collection('users').document(player_id)
        user_profile_doc = user_profile_ref.get()

        authoritative_nickname = nickname_from_auth
        if not authoritative_nickname:
            if user_profile_doc.exists:
                profile_data = user_profile_doc.to_dict()
                if profile_data and profile_data.get("nickname"):
                    authoritative_nickname = profile_data["nickname"]
            if not authoritative_nickname:
                authoritative_nickname = "未知玩家"

        if user_profile_doc.exists:
            profile_data = user_profile_doc.to_dict()
            update_fields = {"lastLogin": firestore.SERVER_TIMESTAMP, "lastSeen": firestore.SERVER_TIMESTAMP}
            if not profile_data or profile_data.get("nickname") != authoritative_nickname:
                update_fields["nickname"] = authoritative_nickname
                player_services_logger.info(f"已更新玩家 {player_id} 在 Firestore users 集合中的暱稱為: {authoritative_nickname}")
            try:
                user_profile_ref.update(update_fields) # 一次性更新
            except Exception as e:
                player_services_logger.error(f"更新玩家 {player_id} 的 profile 失敗: {e}", exc_info=True)
        else:
            player_services_logger.info(f"Firestore 中找不到玩家 {player_id} 的 users 集合 profile。嘗試建立。")
            try:
                user_profile_ref.set({"uid": player_id, "nickname": authoritative_nickname, "createdAt": firestore.SERVER_TIMESTAMP, "lastLogin": firestore.SERVER_TIMESTAMP, "lastSeen": firestore.SERVER_TIMESTAMP}) # type: ignore
                player_services_logger.info(f"成功為玩家 {player_id} 創建 Firestore users 集合中的 profile，暱稱: {authoritative_nickname}")
            except Exception as e:
                player_services_logger.error(f"建立玩家 {player_id} 的 Firestore users 集合 profile 失敗: {e}", exc_info=True)
                return None

        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_doc = game_data_ref.get()

        if game_data_doc.exists:
            player_game_data_dict = game_data_doc.to_dict()
            if player_game_data_dict:
                player_services_logger.info(f"成功從 Firestore 獲取玩家遊戲資料：{player_id}")
                
                loaded_dna = player_game_data_dict.get("playerOwnedDNA", [])
                max_inventory_slots = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["value_settings"]).get("max_inventory_slots", 12)
                
                if len(loaded_dna) < max_inventory_slots:
                    loaded_dna.extend([None] * (max_inventory_slots - len(loaded_dna)))
                elif len(loaded_dna) > max_inventory_slots:
                    loaded_dna = loaded_dna[:max_inventory_slots]

                player_game_data: PlayerGameData = {
                    "playerOwnedDNA": loaded_dna,
                    "farmedMonsters": player_game_data_dict.get("farmedMonsters", []),
                    "playerStats": player_game_data_dict.get("playerStats", {}), # type: ignore
                    "nickname": authoritative_nickname,
                    "lastSave": player_game_data_dict.get("lastSave", int(time.time())),
                    "lastSeen": player_game_data_dict.get("lastSeen", int(time.time())), # 新增：讀取 lastSeen
                    "selectedMonsterId": player_game_data_dict.get("selectedMonsterId", None),
                    "friends": player_game_data_dict.get("friends", []) # 讀取好友列表
                }
                if "nickname" not in player_game_data["playerStats"] or player_game_data["playerStats"]["nickname"] != authoritative_nickname: # type: ignore
                    player_game_data["playerStats"]["nickname"] = authoritative_nickname # type: ignore
                return player_game_data
        
        player_services_logger.info(f"在 Firestore 中找不到玩家 {player_id} 的遊戲資料，或資料為空。將初始化新玩家資料，並執行首次儲存。")
        new_player_data = initialize_new_player_data(player_id, authoritative_nickname, game_configs)
        
        if save_player_data_service(player_id, new_player_data):
            player_services_logger.info(f"新玩家 {player_id} 的遊戲資料已成功初始化並儲存到 Firestore。")
            return new_player_data
        else:
            player_services_logger.error(f"為新玩家 {player_id} 初始化資料後，首次儲存失敗！")
            return new_player_data

    except Exception as e:
        player_services_logger.error(f"獲取玩家資料時發生錯誤 ({player_id}): {e}", exc_info=True)
        return None

def save_player_data_service(player_id: str, game_data: PlayerGameData) -> bool:
    """儲存玩家遊戲資料到 Firestore。"""
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        player_services_logger.error("Firestore 資料庫未初始化 (save_player_data_service 內部)。")
        return False
    
    db = firestore_db_instance

    try:
        current_time = int(time.time()) # 取得當前時間戳
        data_to_save: Dict[str, Any] = {
            "playerOwnedDNA": game_data.get("playerOwnedDNA", []),
            "farmedMonsters": game_data.get("farmedMonsters", []),
            "playerStats": game_data.get("playerStats", {}),
            "nickname": game_data.get("nickname", "未知玩家"),
            "lastSave": current_time,
            "lastSeen": current_time, # 新增：每次儲存時都更新 lastSeen
            "selectedMonsterId": game_data.get("selectedMonsterId"),
            "friends": game_data.get("friends", []) # 儲存好友列表
        }

        player_services_logger.debug(f"DEBUG save_player_data_service: 玩家 {player_id} 即將保存的 farmedMonsters: {data_to_save['farmedMonsters']}")
        player_services_logger.debug(f"DEBUG save_player_data_service: 玩家 {player_id} 即將保存的 playerOwnedDNA: {data_to_save['playerOwnedDNA']}")


        if isinstance(data_to_save["playerStats"], dict) and \
           data_to_save["playerStats"].get("nickname") != data_to_save["nickname"]:
            data_to_save["playerStats"]["nickname"] = data_to_save["nickname"]

        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_ref.set(data_to_save) 
        player_services_logger.info(f"玩家 {player_id} 的遊戲資料已成功儲存到 Firestore。")
        return True
    except Exception as e:
        player_services_logger.error(f"儲存玩家遊戲資料到 Firestore 時發生錯誤 ({player_id}): {e}", exc_info=True)
        return False
        
def draw_free_dna() -> Optional[List[Dict[str, Any]]]:
    """
    執行免費的 DNA 抽取。
    規則：
    1. 隨機抽取 3 個 DNA。
    2. 卡池中只包含“普通”和“稀有”等級的 DNA。
    """
    player_services_logger.info("正在執行免費 DNA 抽取...")
    try:
        from .MD_config_services import load_all_game_configs_from_firestore
        game_configs = load_all_game_configs_from_firestore()

        if not game_configs or 'dna_fragments' not in game_configs:
            player_services_logger.error("無法載入 DNA 碎片設定，抽取失敗。")
            return None

        all_dna_fragments = game_configs['dna_fragments']
        
        allowed_rarities = {"普通", "稀有"}
        filtered_pool = [
            dna for dna in all_dna_fragments 
            if dna.get('rarity') in allowed_rarities
        ]

        if not filtered_pool:
            player_services_logger.error("篩選後的 DNA 卡池為空，無法抽取。")
            return []
            
        num_to_draw = 3
        
        drawn_dna_templates = random.choices(filtered_pool, k=num_to_draw)
        
        player_services_logger.info(f"成功抽取了 {num_to_draw} 個 DNA。")
        
        return drawn_dna_templates

    except Exception as e:
        player_services_logger.error(f"執行免費 DNA 抽取時發生錯誤: {e}", exc_info=True)
        return None

def get_friends_statuses_service(friend_ids: List[str]) -> Dict[str, Optional[int]]:
    """
    一次性獲取多個好友的 `lastSeen` 時間戳。
    """
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        player_services_logger.error("Firestore 資料庫未初始化 (get_friends_statuses_service 內部)。")
        return {friend_id: None for friend_id in friend_ids}
    
    db = firestore_db_instance
    statuses: Dict[str, Optional[int]] = {friend_id: None for friend_id in friend_ids}

    if not friend_ids:
        return statuses

    # Firestore 的 `in` 查詢一次最多支援 30 個元素
    # 如果好友列表可能超過 30，需要分批處理
    friend_id_chunks = [friend_ids[i:i + 30] for i in range(0, len(friend_ids), 30)]

    for chunk in friend_id_chunks:
        try:
            # 查詢 users 集合，效率更高
            docs = db.collection('users').where(firestore.FieldPath.document_id(), 'in', chunk).stream()
            for doc in docs:
                user_data = doc.to_dict()
                if user_data and 'lastSeen' in user_data:
                    last_seen_timestamp = user_data['lastSeen']
                    # Firestore 的 SERVER_TIMESTAMP 會在讀取時轉換為 datetime 物件
                    if hasattr(last_seen_timestamp, 'timestamp'):
                        statuses[doc.id] = int(last_seen_timestamp.timestamp())
                    elif isinstance(last_seen_timestamp, (int, float)):
                        statuses[doc.id] = int(last_seen_timestamp)
        except Exception as e:
            player_services_logger.error(f"查詢好友狀態時發生錯誤 (chunk: {chunk}): {e}", exc_info=True)

    return statuses
