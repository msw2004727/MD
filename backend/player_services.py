# backend/player_services.py
# 處理玩家遊戲資料的初始化、獲取、保存功能

import time
import logging
from typing import List, Dict, Optional, Any
import firebase_admin
from firebase_admin import firestore

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import PlayerGameData, PlayerStats, PlayerOwnedDNA, GameConfigs, NamingConstraints, ValueSettings, DNAFragment

player_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式或測試，避免循環導入 GameConfigs) ---
# 這些預設值應該只在 game_configs 完全無法獲取時作為最後的備案
DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER: GameConfigs = {
    "dna_fragments": [], # 實際會從 game_configs 載入
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {}, # 實際會從 game_configs 載入
    "personalities": [], # 實際會從 game_configs 載入
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

    # 從 game_configs 獲取最大槽位數，如果沒有則使用預設值
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["value_settings"]) # type: ignore
    max_inventory_slots = value_settings.get("max_inventory_slots", 12)
    initial_dna_owned: List[Optional[PlayerOwnedDNA]] = [None] * max_inventory_slots # 初始化為指定數量的 None

    dna_fragments_templates: List[DNAFragment] = game_configs.get("dna_fragments", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["dna_fragments"]) # type: ignore
    num_initial_dna = 6 # 可以考慮也放入 game_configs

    if dna_fragments_templates:
        # 篩選出普通和稀有度的 DNA 作為初始 DNA 來源
        eligible_dna_templates = [dna for dna in dna_fragments_templates if dna.get("rarity") in ["普通", "稀有"]]
        if not eligible_dna_templates:
            # 如果沒有普通/稀有，則從所有 DNA 中選 (作為 fallback)
            eligible_dna_templates = list(dna_fragments_templates) 

        # 為新玩家生成初始 DNA
        import random # 確保 random 模組在這裡被導入
        for i in range(min(num_initial_dna, len(eligible_dna_templates), max_inventory_slots)): # 確保不超過庫存上限
            if not eligible_dna_templates: break # 避免在空列表上 random.choice
            template = random.choice(eligible_dna_templates)
            instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{i}"
            # 確保 PlayerOwnedDNA 包含 DNAFragment 的所有欄位，並加上實例特定的 id 和 baseId
            owned_dna_item: PlayerOwnedDNA = {**template, "id": instance_id, "baseId": template["id"]} # type: ignore
            initial_dna_owned[i] = owned_dna_item # 將 DNA 放置到指定索引

            # 從可用模板中移除已選取的，避免重複（如果初始DNA數量少於模板總數）
            # 注意：此處邏輯可能需要優化，因為移除會改變列表，影響後續 random.choice
            # 更安全的做法是複製列表後再移除，或者使用 random.sample
            # 但對於小量初始DNA，這樣做通常沒問題。
            # 如果 template in eligible_dna_templates: # 檢查 template 是否仍在列表中
            #     eligible_dna_templates.remove(template) 
            pass # 這裡不移除，讓 random.choice 可以重複選擇，或者使用 random.sample 確保唯一性

    new_player_data: PlayerGameData = {
        "playerOwnedDNA": initial_dna_owned, # 使用固定大小的陣列
        "farmedMonsters": [],
        "playerStats": player_stats,
        "nickname": nickname, # 頂層玩家暱稱
        "lastSave": int(time.time())
    }
    player_services_logger.info(f"新玩家 {nickname} 資料初始化完畢，獲得 {num_initial_dna} 個初始 DNA。")
    return new_player_data

def get_player_data_service(player_id: str, nickname_from_auth: Optional[str], game_configs: GameConfigs) -> Optional[PlayerGameData]:
    """獲取玩家遊戲資料，如果不存在則初始化。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        player_services_logger.error("Firestore 資料庫未初始化 (get_player_data_service 內部)。")
        return None

    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

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

        # --- 新增的 try-except 區塊，用於偵錯 users/{UID} 文件建立 ---
        if user_profile_doc.exists:
            profile_data = user_profile_doc.to_dict()
            if profile_data and profile_data.get("nickname") != authoritative_nickname:
                try:
                    user_profile_ref.update({"nickname": authoritative_nickname, "lastLogin": firestore.SERVER_TIMESTAMP}) # type: ignore
                    player_services_logger.info(f"已更新玩家 {player_id} 在 Firestore users 集合中的暱稱為: {authoritative_nickname}")
                except Exception as e:
                    player_services_logger.error(f"更新玩家 {player_id} 的 profile 失敗: {e}", exc_info=True)
            else: # 即使暱稱相同，也更新 lastLogin
                try:
                    user_profile_ref.update({"lastLogin": firestore.SERVER_TIMESTAMP}) # type: ignore
                    player_services_logger.info(f"已更新玩家 {player_id} 的最後登入時間。")
                except Exception as e:
                    player_services_logger.error(f"更新玩家 {player_id} 的最後登入時間失敗: {e}", exc_info=True)
        else:
            player_services_logger.info(f"Firestore 中找不到玩家 {player_id} 的 users 集合 profile。嘗試建立。")
            try:
                user_profile_ref.set({"uid": player_id, "nickname": authoritative_nickname, "createdAt": firestore.SERVER_TIMESTAMP, "lastLogin": firestore.SERVER_TIMESTAMP}) # type: ignore
                player_services_logger.info(f"成功為玩家 {player_id} 創建 Firestore users 集合中的 profile，暱稱: {authoritative_nickname}")
            except Exception as e:
                player_services_logger.error(f"建立玩家 {player_id} 的 Firestore users 集合 profile 失敗: {e}", exc_info=True)
                # 如果建立 profile 失敗，則後續的遊戲資料儲存也會失敗，直接返回 None
                return None
        # --- 結束新增的 try-except 區塊 ---


        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_doc = game_data_ref.get()

        if game_data_doc.exists:
            player_game_data_dict = game_data_doc.to_dict()
            if player_game_data_dict:
                player_services_logger.info(f"成功從 Firestore 獲取玩家遊戲資料：{player_id}")
                
                # 修改點：確保從 Firestore 載入的 playerOwnedDNA 補齊到最大槽位數
                loaded_dna = player_game_data_dict.get("playerOwnedDNA", [])
                max_inventory_slots = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["value_settings"]).get("max_inventory_slots", 12) # 使用新的預設值
                
                # 如果載入的 DNA 陣列長度不足，用 None 填充
                if len(loaded_dna) < max_inventory_slots:
                    loaded_dna.extend([None] * (max_inventory_slots - len(loaded_dna)))
                # 如果載入的 DNA 陣列長度超過，則截斷
                elif len(loaded_dna) > max_inventory_slots:
                    loaded_dna = loaded_dna[:max_inventory_slots]

                player_game_data: PlayerGameData = {
                    "playerOwnedDNA": loaded_dna, # 使用處理後的 DNA 列表
                    "farmedMonsters": player_game_data_dict.get("farmedMonsters", []),
                    "playerStats": player_game_data_dict.get("playerStats", {}), # type: ignore
                    "nickname": authoritative_nickname,
                    "lastSave": int(time.time())
                }
                if "nickname" not in player_game_data["playerStats"] or player_game_data["playerStats"]["nickname"] != authoritative_nickname: # type: ignore
                    player_game_data["playerStats"]["nickname"] = authoritative_nickname # type: ignore
                return player_game_data

        player_services_logger.info(f"在 Firestore 中找不到玩家 {player_id} 的遊戲資料，或資料為空。將初始化新玩家資料，使用暱稱: {authoritative_nickname}。")
        # 在這裡呼叫 save_player_data_service 自身，而不是從 main.py 導入
        # 這會導致循環依賴，所以 get_player_data_service 內部不再呼叫 save_player_data_service。
        # 而是讓調用者 (例如 main.py) 在初始化後負責保存。
        new_player_data = initialize_new_player_data(player_id, authoritative_nickname, game_configs)
        
        # 在這裡確保新的玩家資料被保存，如果這裡是入口點的話
        # 這個保存邏輯現在會由外部（例如 MD_routes.py 中的 get_player_info_route）來處理，
        # 因為 player_services 不應直接依賴 save_player_data_service 導致循環導入。
        # save_success = save_player_data_service(player_id, new_player_data) # REMOVED: Moved to route layer
        # player_services_logger.debug(f"DEBUG: 儲存新玩家資料結果 for {player_id}: {save_success}") # REMOVED
        # if save_success: # REMOVED
        #     player_services_logger.info(f"新玩家 {authoritative_nickname} 的初始資料已成功儲存。") # REMOVED
        # else: # REMOVED
        #     player_services_logger.error(f"儲存新玩家 {authoritative_nickname} 的初始資料失敗。") # REMOVED
        return new_player_data

    except Exception as e:
        player_services_logger.error(f"獲取玩家資料時發生錯誤 ({player_id}): {e}", exc_info=True)
        return None

def save_player_data_service(player_id: str, game_data: PlayerGameData) -> bool:
    """儲存玩家遊戲資料到 Firestore。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        player_services_logger.error("Firestore 資料庫未初始化 (save_player_data_service 內部)。")
        return False
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    try:
        data_to_save: Dict[str, Any] = {
            "playerOwnedDNA": game_data.get("playerOwnedDNA", []),
            "farmedMonsters": game_data.get("farmedMonsters", []),
            "playerStats": game_data.get("playerStats", {}),
            "nickname": game_data.get("nickname", "未知玩家"),
            "lastSave": int(time.time())
        }

        player_services_logger.debug(f"DEBUG save_player_data_service: 玩家 {player_id} 即將保存的 farmedMonsters: {data_to_save['farmedMonsters']}")
        player_services_logger.debug(f"DEBUG save_player_data_service: 玩家 {player_id} 即將保存的 playerOwnedDNA: {data_to_save['playerOwnedDNA']}")


        if isinstance(data_to_save["playerStats"], dict) and \
           data_to_save["playerStats"].get("nickname") != data_to_save["nickname"]:
            data_to_save["playerStats"]["nickname"] = data_to_save["nickname"]

        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_ref.set(data_to_save, merge=True)
        player_services_logger.info(f"玩家 {player_id} 的遊戲資料已成功儲存到 Firestore。")
        return True
    except Exception as e:
        player_services_logger.error(f"儲存玩家遊戲資料到 Firestore 時發生錯誤 ({player_id}): {e}", exc_info=True)
        return False

# 移除 MD_services.py 中其他的輔助函式和服務函式
# 他們將會被拆分到 player_services.py 以外的其他新檔案中