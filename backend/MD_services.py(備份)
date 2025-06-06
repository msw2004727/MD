# MD_services.py
# 包含「怪獸養成」遊戲的核心業務邏輯和與資料庫的互動

import random
import time
import logging
from typing import List, Dict, Optional, Union, Tuple, Literal, Any
from collections import Counter
import copy # 用於深拷貝戰鬥狀態

# 這裡不再直接從 .MD_firebase_config 導入 db，而是在函數內部動態獲取
# from .MD_firebase_config import db
import firebase_admin # 僅用於類型提示或檢查 firebase_admin._apps
from firebase_admin import firestore # 僅用於類型提示或 FieldFilter 等

from .MD_models import (
    PlayerGameData, PlayerStats, PlayerOwnedDNA,
    Monster, Skill, DNAFragment, RarityDetail, Personality,
    GameConfigs, ElementTypes, MonsterFarmStatus, MonsterAIDetails, MonsterResume,
    HealthCondition, AbsorptionConfig, CultivationConfig, SkillCategory, NamingConstraints,
    ValueSettings, RarityNames, MonsterRecipe # 確保 MonsterRecipe 也被引入
)
from .MD_ai_services import generate_monster_ai_details

services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式或測試，避免循環導入) ---
# 這些預設值應該只在 game_configs 完全無法獲取時作為最後的備案
DEFAULT_GAME_CONFIGS_FOR_UTILS: GameConfigs = {
    "dna_fragments": [],
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {"無": [{"name":"撞擊", "power":10, "crit":5, "probability":100, "type":"無", "baseLevel":1, "mp_cost":0, "skill_category":"物理"}]}, # type: ignore
    "personalities": [{"name": "標準", "description": "一個標準的怪獸個性。", "colorDark": "#888888", "colorLight":"#AAAAAA", "skill_preferences": {"近戰":1.0}}], # type: ignore
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
        "element_value_factors": {"火": 1.2, "水": 1.1, "無": 0.7, "混": 0.6},
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10, # 農場上限的預設值
        "max_monster_skills": 3, # 怪獸最大技能數的預設值
        "max_battle_turns": 30, # 戰鬥最大回合數
        "max_inventory_slots": 12, # 修改點：預設庫存槽位數為 12
        "max_temp_backpack_slots": 9 # 新增：預設臨時背包槽位數為 9
    },
    "absorption_config": {
        "base_stat_gain_factor": 0.03, "score_diff_exponent": 0.3,
        "max_stat_gain_percentage": 0.015, "min_stat_gain": 1,
        "dna_extraction_chance_base": 0.75,
        "dna_extraction_rarity_modifier": {"普通": 1.0, "稀有": 0.9} # type: ignore
    },
    "cultivation_config": {
        "skill_exp_base_multiplier": 100, "new_skill_chance": 0.1,
        "skill_exp_gain_range": (10,30), "max_skill_level": 5,
        "new_skill_rarity_bias": {"普通": 0.6, "稀有": 0.3, "菁英": 0.1} # type: ignore
    },
    "elemental_advantage_chart": { # type: ignore
        "火": {"木": 1.5, "水": 0.5, "金": 1.0, "土": 1.0, "風":1.0, "毒":1.0, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "水": {"火": 1.5, "土": 1.0, "木": 0.5, "金": 1.0},
    }
}


# --- 輔助函式 ---
def _calculate_exp_to_next_level(level: int, base_multiplier: int) -> int:
    """計算升到下一級所需的經驗值。"""
    if level <= 0: level = 1
    return level * base_multiplier

def _get_skill_from_template(skill_template: Skill, game_configs: GameConfigs, monster_rarity_data: RarityDetail, target_level: Optional[int] = None) -> Skill:
    """根據技能模板、遊戲設定和怪獸稀有度來實例化一個技能。"""
    cultivation_cfg = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_UTILS["cultivation_config"])

    if target_level is not None:
        skill_level = max(1, min(target_level, cultivation_cfg.get("max_skill_level", 7)))
    else:
        skill_level = skill_template.get("baseLevel", 1) + monster_rarity_data.get("skillLevelBonus", 0)
        skill_level = max(1, min(skill_level, cultivation_cfg.get("max_skill_level", 7))) # type: ignore

    new_skill_instance: Skill = {
        "name": skill_template.get("name", "未知技能"),
        "power": skill_template.get("power", 10),
        "crit": skill_template.get("crit", 5),
        "probability": skill_template.get("probability", 50),
        "story": skill_template.get("story", skill_template.get("description", "一個神秘的招式")),
        "type": skill_template.get("type", "無"), # type: ignore
        "baseLevel": skill_template.get("baseLevel", 1),
        "level": skill_level,
        "mp_cost": skill_template.get("mp_cost", 0),
        "skill_category": skill_template.get("skill_category", "其他"), # type: ignore
        "current_exp": 0,
        "exp_to_next_level": _calculate_exp_to_next_level(skill_level, cultivation_cfg.get("skill_exp_base_multiplier", 100)), # type: ignore
        "effect": skill_template.get("effect"), # 簡要效果標識
        "stat": skill_template.get("stat"),     # 影響的數值
        "amount": skill_template.get("amount"),   # 影響的量
        "duration": skill_template.get("duration"), # 持續回合
        "damage": skill_template.get("damage"),   # 額外傷害或治療量
        "recoilDamage": skill_template.get("recoilDamage") # 反傷比例
    }
    return new_skill_instance

def _generate_monster_full_nickname(player_title: str, monster_achievement: str, element_nickname_part: str, naming_constraints: NamingConstraints) -> str:
    """根據玩家稱號、怪獸成就和元素暱稱部分生成怪獸的完整暱稱。"""
    pt = player_title[:naming_constraints.get("max_player_title_len", 5)]
    ma = monster_achievement[:naming_constraints.get("max_monster_achievement_len", 5)]
    en = element_nickname_part[:naming_constraints.get("max_element_nickname_len", 5)]
    full_name = f"{pt}{ma}{en}"
    return full_name[:naming_constraints.get("max_monster_full_nickname_len", 15)]

def _generate_combination_key(dna_template_ids: List[str]) -> str:
    """
    根據 DNA 模板 ID 列表生成唯一的組合鍵。
    - 對輸入的 DNA 模板 ID 列表進行字母排序。
    - 將排序後的 ID 用底線 `_` 連接成一個單一字串。
    """
    if not dna_template_ids:
        return "empty_combination" # 處理空列表的情況

    # 1. 排序：確保順序不影響結果
    sorted_ids = sorted(dna_template_ids)

    # 2. 連接：將排序後的 ID 用固定分隔符連接
    return "_".join(sorted_ids)

# --- 玩家相關服務 ---
def initialize_new_player_data(player_id: str, nickname: str, game_configs: GameConfigs) -> PlayerGameData:
    """為新玩家初始化遊戲資料。"""
    services_logger.info(f"為新玩家 {nickname} (ID: {player_id}) 初始化遊戲資料。")
    player_titles_list = game_configs.get("titles", ["新手"])
    default_player_title = player_titles_list[0] if player_titles_list else "新手" # type: ignore

    player_stats: PlayerStats = {
        "rank": "N/A", "wins": 0, "losses": 0, "score": 0,
        "titles": [default_player_title],
        "achievements": ["首次登入異世界"], "medals": 0, "nickname": nickname
    }

    # 修改點：初始化 playerOwnedDNA 為固定大小的 None 陣列，從 game_configs 獲取最大槽位數
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 使用新的預設值
    initial_dna_owned: List[Optional[PlayerOwnedDNA]] = [None] * max_inventory_slots # 初始化為指定數量的 None

    dna_fragments_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore
    num_initial_dna = 6 # 可以考慮也放入 game_configs

    if dna_fragments_templates:
        eligible_dna_templates = [dna for dna in dna_fragments_templates if dna.get("rarity") in ["普通", "稀有"]]
        if not eligible_dna_templates:
            eligible_dna_templates = list(dna_fragments_templates) # 如果沒有普通/稀有，則從所有DNA中選

        for i in range(min(num_initial_dna, len(eligible_dna_templates), max_inventory_slots)): # 確保不超過庫存上限
            if not eligible_dna_templates: break # 避免在空列表上 random.choice
            template = random.choice(eligible_dna_templates)
            instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{i}"
            # 確保 PlayerOwnedDNA 包含 DNAFragment 的所有欄位，並加上實例特定的 id 和 baseId
            owned_dna_item: PlayerOwnedDNA = {**template, "id": instance_id, "baseId": template["id"]} # type: ignore
            initial_dna_owned[i] = owned_dna_item # 將 DNA 放置到指定索引

            if template in eligible_dna_templates: # 檢查 template 是否仍在列表中
                eligible_dna_templates.remove(template) # 避免重複選取

    new_player_data: PlayerGameData = {
        "playerOwnedDNA": initial_dna_owned, # 使用固定大小的陣列
        "farmedMonsters": [],
        "playerStats": player_stats,
        "nickname": nickname, # 頂層玩家暱稱
        "lastSave": int(time.time())
    }
    services_logger.info(f"新玩家 {nickname} 資料初始化完畢，獲得 {num_initial_dna} 個初始 DNA。")
    return new_player_data

def get_player_data_service(player_id: str, nickname_from_auth: Optional[str], game_configs: GameConfigs) -> Optional[PlayerGameData]:
    """獲取玩家遊戲資料，如果不存在則初始化。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (get_player_data_service 內部)。")
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
                    services_logger.info(f"已更新玩家 {player_id} 在 Firestore users 集合中的暱稱為: {authoritative_nickname}")
                except Exception as e:
                    services_logger.error(f"更新玩家 {player_id} 的 profile 失敗: {e}", exc_info=True)
            else: # 即使暱稱相同，也更新 lastLogin
                try:
                    user_profile_ref.update({"lastLogin": firestore.SERVER_TIMESTAMP}) # type: ignore
                    services_logger.info(f"已更新玩家 {player_id} 的最後登入時間。")
                except Exception as e:
                    services_logger.error(f"更新玩家 {player_id} 的最後登入時間失敗: {e}", exc_info=True)
        else:
            services_logger.info(f"Firestore 中找不到玩家 {player_id} 的 users 集合 profile。嘗試建立。")
            try:
                user_profile_ref.set({"uid": player_id, "nickname": authoritative_nickname, "createdAt": firestore.SERVER_TIMESTAMP, "lastLogin": firestore.SERVER_TIMESTAMP}) # type: ignore
                services_logger.info(f"成功為玩家 {player_id} 創建 Firestore users 集合中的 profile，暱稱: {authoritative_nickname}")
            except Exception as e:
                services_logger.error(f"建立玩家 {player_id} 的 Firestore users 集合 profile 失敗: {e}", exc_info=True)
                # 如果建立 profile 失敗，則後續的遊戲資料儲存也會失敗，直接返回 None
                return None
        # --- 結束新增的 try-except 區塊 ---


        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_doc = game_data_ref.get()

        if game_data_doc.exists:
            player_game_data_dict = game_data_doc.to_dict()
            if player_game_data_dict:
                services_logger.info(f"成功從 Firestore 獲取玩家遊戲資料：{player_id}")
                
                # 修改點：確保從 Firestore 載入的 playerOwnedDNA 補齊到最大槽位數
                loaded_dna = player_game_data_dict.get("playerOwnedDNA", [])
                max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 使用新的預設值
                
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

        services_logger.info(f"在 Firestore 中找不到玩家 {player_id} 的遊戲資料，或資料為空。將初始化新玩家資料，使用暱稱: {authoritative_nickname}。")
        new_player_data = initialize_new_player_data(player_id, authoritative_nickname, game_configs)
        services_logger.debug(f"DEBUG: 初始化新玩家資料鍵值: {new_player_data.keys()}") # 添加此行
        save_success = save_player_data_service(player_id, new_player_data)
        services_logger.debug(f"DEBUG: 儲存新玩家資料結果 for {player_id}: {save_success}") # 添加此行
        if save_success:
            services_logger.info(f"新玩家 {authoritative_nickname} 的初始資料已成功儲存。")
        else:
            services_logger.error(f"儲存新玩家 {authoritative_nickname} 的初始資料失敗。")
        return new_player_data

    except Exception as e:
        services_logger.error(f"獲取玩家資料時發生錯誤 ({player_id}): {e}", exc_info=True)
        return None

def save_player_data_service(player_id: str, game_data: PlayerGameData) -> bool:
    """儲存玩家遊戲資料到 Firestore。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (save_player_data_service 內部)。")
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

        # ====== 新增這行來打印即將保存的 farmedMonsters 內容 ======
        services_logger.debug(f"DEBUG save_player_data_service: 玩家 {player_id} 即將保存的 farmedMonsters: {data_to_save['farmedMonsters']}")
        # ==========================================================

        if isinstance(data_to_save["playerStats"], dict) and \
           data_to_save["playerStats"].get("nickname") != data_to_save["nickname"]:
            data_to_save["playerStats"]["nickname"] = data_to_save["nickname"]

        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_ref.set(data_to_save, merge=True)
        services_logger.info(f"玩家 {player_id} 的遊戲資料已成功儲存到 Firestore。")
        return True
    except Exception as e:
        services_logger.error(f"儲存玩家遊戲資料到 Firestore 時發生錯誤 ({player_id}): {e}", exc_info=True) # 確保這裡有 exc_info=True
        return False

# --- DNA 組合與怪獸生成服務 ---
def combine_dna_service(dna_ids_from_request: List[str], game_configs: GameConfigs, player_data: PlayerGameData, player_id: str) -> Optional[Monster]:
    """
    根據提供的 DNA ID 列表、遊戲設定和玩家資料來組合生成新的怪獸。
    此函式將先查詢 MonsterRecipes 集合，若配方存在則直接使用，否則生成新怪獸並記錄。
    """
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (combine_dna_service 內部)。")
        return None

    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    # ====== 新增這行來打印完整的 playerOwnedDNA ======
    services_logger.debug(f"DEBUG combine_dna_service: 玩家 {player_id} 的完整 playerOwnedDNA: {player_data.get('playerOwnedDNA', 'N/A')}")
    # =================================================

    if not dna_ids_from_request:
        services_logger.warning("DNA 組合請求中的 DNA ID 列表為空。")
        return None

    # 從玩家的 playerOwnedDNA 中找到對應的 DNA 實例，並獲取它們的 baseId
    # 同時記錄要消耗的實例 ID，並將這些 DNA 標記為 None (在 player_data 中)
    combined_dnas_data: List[DNAFragment] = []
    constituent_dna_template_ids: List[str] = []
    consumed_dna_instance_indices: List[int] = [] # 記錄被消耗的 DNA 在玩家庫存中的索引

    services_logger.debug(f"DEBUG combine_dna_service: 收到請求的 DNA ID 列表: {dna_ids_from_request}")

    for req_dna_instance_id in dna_ids_from_request:
        found_dna_instance = None
        found_dna_index = -1
        for idx, dna_item in enumerate(player_data.get("playerOwnedDNA", [])):
            # ====== 新增調試日誌 ======
            services_logger.debug(f"DEBUG combine_dna_service: 檢查庫存槽位 {idx} - DNA: {dna_item.get('id') if dna_item else 'None'}, 匹配目標: {req_dna_instance_id}")
            # ==========================
            if dna_item and dna_item.get("id") == req_dna_instance_id:
                found_dna_instance = dna_item
                found_dna_index = idx
                break
        
        if found_dna_instance: # Check if instance was found at all
            # Ensure baseId exists, if not, use its own ID as baseId (fallback)
            dna_base_id_to_use = found_dna_instance.get("baseId") or found_dna_instance.get("id")
            
            if dna_base_id_to_use: # Ensure we have a baseId
                services_logger.debug(f"DEBUG combine_dna_service: 成功找到匹配的 DNA: {found_dna_instance.get('id')}, 使用 baseId: {dna_base_id_to_use}")
                combined_dnas_data.append(found_dna_instance)
                constituent_dna_template_ids.append(dna_base_id_to_use) # Use the determined baseId
                consumed_dna_instance_indices.append(found_dna_index)
            else:
                services_logger.warning(f"在玩家庫存中找到 ID 為 {req_dna_instance_id} 的 DNA 實例，但缺少 baseId 且無法從 ID 推斷。無法用於組合。")
                return None
        else:
            services_logger.warning(f"在玩家庫存中找不到 ID 為 {req_dna_instance_id} 的 DNA 實例。無法用於組合。")
            return None

    services_logger.debug(f"DEBUG combine_dna_service: 成功匹配 {len(combined_dnas_data)} 個 DNA 實例。")
    services_logger.debug(f"DEBUG combine_dna_service: 待消耗的 DNA 索引: {consumed_dna_instance_indices}")

    if len(combined_dnas_data) < 2:
        services_logger.error("組合 DNA 數量不足 (至少需要 2 個)。")
        return None
    
    # 執行消耗 DNA 的操作
    # 移除這裡的 DNA 消耗邏輯，改由前端處理
    # for idx_to_consume in consumed_dna_instance_indices:
    #     player_data["playerOwnedDNA"][idx_to_consume] = None

    # 1. 生成 Combination Key
    combination_key = _generate_combination_key(constituent_dna_template_ids)
    services_logger.info(f"生成的組合鍵: {combination_key}")

    # 2. 查詢 MonsterRecipes 集合
    monster_recipes_ref = db.collection('MonsterRecipes').document(combination_key)
    recipe_doc = monster_recipes_ref.get()

    new_monster_instance: Optional[Monster] = None

    if recipe_doc.exists:
        # 3. 如果文檔存在（配方已記錄）
        services_logger.info(f"配方 '{combination_key}' 已存在於組合庫中，直接讀取。")
        recipe_data: MonsterRecipe = recipe_doc.to_dict() # type: ignore
        fixed_monster_data: Monster = recipe_data.get("resultingMonsterData") # type: ignore

        if fixed_monster_data:
            # 從固定數據創建一個新的怪獸實例，賦予新的 instance ID
            new_monster_instance = copy.deepcopy(fixed_monster_data)
            new_monster_instance["id"] = f"m_{player_id}_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
            new_monster_instance["creationTime"] = int(time.time()) # 實際創建時間
            new_monster_instance["farmStatus"] = {"active": False, "completed": False, "isBattling": False, "isTraining": False, "boosts": {}}
            # 修正 activityLog 的語法，確保它是列表而不是 tuple
            new_monster_instance["activityLog"] = [{"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": "從既有配方召喚。"}] 
            # 確保所有技能的 current_exp 和 exp_to_next_level 歸零或重設為初始值
            for skill in new_monster_instance.get("skills", []):
                skill["current_exp"] = 0
                skill["exp_to_next_level"] = _calculate_exp_to_next_level(skill.get("level", 1), game_configs.get("cultivation_config", {}).get("skill_exp_base_multiplier", 100)) # type: ignore
            new_monster_instance["hp"] = new_monster_instance["initial_max_hp"] # 確保是滿血
            new_monster_instance["mp"] = new_monster_instance["initial_max_mp"] # 確保是滿藍
            new_monster_instance["resume"] = {"wins": 0, "losses": 0} # 新怪獸戰績歸零
            services_logger.info(f"已從組合庫生成怪獸 '{new_monster_instance['nickname']}' (ID: {new_monster_instance['id']})。")
            
            # 返回怪獸物件和被消耗的 DNA 實例 ID 列表
            return {"monster": new_monster_instance, "consumed_dna_ids": consumed_dna_instance_indices} # 返回一個包含兩部分的字典
        else:
            services_logger.error(f"組合庫中的配方 '{combination_key}' 缺少 'resultingMonsterData'。")
            return None # 數據不完整

    else:
        # 3. 如果文檔不存在（全新配方）
        services_logger.info(f"配方 '{combination_key}' 為全新發現，開始生成新怪獸。")

        all_dna_fragments_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore
        all_skills_db: Dict[ElementTypes, List[Skill]] = game_configs.get("skills", {}) # type: ignore
        all_personalities_db: List[Personality] = game_configs.get("personalities", []) # type: ignore
        all_rarities_db: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
        naming_constraints: NamingConstraints = game_configs.get("naming_constraints", DEFAULT_GAME_CONFIGS_FOR_UTILS["naming_constraints"]) # type: ignore
        element_nicknames_map: Dict[ElementTypes, str] = game_configs.get("element_nicknames", DEFAULT_GAME_CONFIGS_FOR_UTILS["element_nicknames"]) # type: ignore
        monster_achievements_list: List[str] = game_configs.get("monster_achievements_list", DEFAULT_GAME_CONFIGS_FOR_UTILS["monster_achievements_list"]) # type: ignore

        # 執行現有怪獸生成邏輯
        base_stats: Dict[str, int] = {"attack": 0, "defense": 0, "speed": 0, "hp": 0, "mp": 0, "crit": 0}
        for dna_frag in combined_dnas_data: # 使用從玩家庫存中匹配到的 DNA 數據
            for stat_name_key in base_stats.keys():
                stat_name = stat_name_key # type: ignore
                base_stats[stat_name] += dna_frag.get(stat_name, 0) # type: ignore

        for stat_name_key in base_stats.keys():
            stat_name = stat_name_key # type: ignore
            if base_stats[stat_name] <= 0: # type: ignore
                base_stats[stat_name] = random.randint(1, 5) # type: ignore

        element_counts = Counter(dna.get("type", "無") for dna in combined_dnas_data) # type: ignore
        total_dna_pieces = len(combined_dnas_data)
        element_composition: Dict[ElementTypes, float] = {el: round((cnt / total_dna_pieces) * 100, 1) for el, cnt in element_counts.items()} if total_dna_pieces > 0 else {"無": 100.0} # type: ignore
        sorted_elements_by_comp = sorted(element_composition.items(), key=lambda item: item[1], reverse=True)
        elements_present: List[ElementTypes] = [el_comp[0] for el_comp in sorted_elements_by_comp] if sorted_elements_by_comp else ["無"] # type: ignore
        primary_element: ElementTypes = elements_present[0]

        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        highest_rarity_index = 0
        for dna_frag in combined_dnas_data:
            try:
                current_rarity_index = rarity_order.index(dna_frag.get("rarity", "普通")) # type: ignore
                highest_rarity_index = max(highest_rarity_index, current_rarity_index)
            except ValueError:
                services_logger.warning(f"未知的稀有度名稱 '{dna_frag.get('rarity')}' 在 DNA 片段 {dna_frag.get('id')} 中。")
        monster_rarity_name: RarityNames = rarity_order[highest_rarity_index]

        rarity_key_lookup = {data["name"]: key for key, data in all_rarities_db.items()} # type: ignore
        monster_rarity_key = rarity_key_lookup.get(monster_rarity_name, "COMMON")
        monster_rarity_data: RarityDetail = all_rarities_db.get(monster_rarity_key, DEFAULT_GAME_CONFIGS_FOR_UTILS["rarities"]["COMMON"]) # type: ignore

        generated_skills: List[Skill] = []
        potential_skills_for_elements: List[Skill] = [] # type: ignore
        for el_str_skill in elements_present:
            el_skill: ElementTypes = el_str_skill # type: ignore
            if el_skill in all_skills_db and isinstance(all_skills_db.get(el_skill), list):
                potential_skills_for_elements.extend(all_skills_db[el_skill]) # type: ignore
        if "無" in all_skills_db and isinstance(all_skills_db.get("無"), list) and "無" not in elements_present:
            potential_skills_for_elements.extend(all_skills_db["無"]) # type: ignore

        if potential_skills_for_elements:
            num_skills_to_select = random.randint(1, min(game_configs.get("value_settings", {}).get("max_monster_skills", 3), len(potential_skills_for_elements)))
            selected_skill_names_set = set()
            random.shuffle(potential_skills_for_elements)

            for skill_template in potential_skills_for_elements:
                if len(generated_skills) >= num_skills_to_select: break
                if skill_template and skill_template.get("name") not in selected_skill_names_set:
                    new_skill_instance = _get_skill_from_template(skill_template, game_configs, monster_rarity_data)
                    generated_skills.append(new_skill_instance)
                    selected_skill_names_set.add(new_skill_instance["name"])

        if not generated_skills:
            default_skill_template = all_skills_db.get("無", [{}])[0] if all_skills_db.get("無") else {} # type: ignore
            generated_skills.append(_get_skill_from_template(default_skill_template, game_configs, monster_rarity_data))

        selected_personality_template: Personality = random.choice(all_personalities_db) if all_personalities_db else DEFAULT_GAME_CONFIGS_FOR_UTILS["personalities"][0] # type: ignore

        player_current_title = player_data.get("playerStats", {}).get("titles", ["新手"])[0] # type: ignore
        monster_initial_achievement = random.choice(monster_achievements_list) if monster_achievements_list else "新秀" # type: ignore
        default_element_nickname = element_nicknames_map.get(primary_element, primary_element) # type: ignore
        monster_full_nickname = _generate_monster_full_nickname(
            player_current_title, monster_initial_achievement, default_element_nickname, naming_constraints # type: ignore
        )

        # 這裡的 monster_id 將是這個「標準版」怪獸的模板 ID
        standard_monster_template_id = f"template_{combination_key}"
        stat_multiplier = monster_rarity_data.get("statMultiplier", 1.0)
        initial_max_hp = int(base_stats["hp"] * stat_multiplier)
        initial_max_mp = int(base_stats["mp"] * stat_multiplier)

        # 組裝「標準版」怪獸數據
        standard_monster_data: Monster = {
            "id": standard_monster_template_id, # 注意：這裡使用 template ID
            "nickname": monster_full_nickname,
            "elements": elements_present,
            "elementComposition": element_composition,
            "hp": initial_max_hp, "mp": initial_max_mp,
            "initial_max_hp": initial_max_hp, "initial_max_mp": initial_max_mp,
            "attack": int(base_stats["attack"] * stat_multiplier),
            "defense": int(base_stats["defense"] * stat_multiplier),
            "speed": int(base_stats["speed"] * stat_multiplier),
            "crit": int(base_stats["crit"] * stat_multiplier),
            "skills": generated_skills,
            "rarity": monster_rarity_name,
            "title": monster_initial_achievement,
            "custom_element_nickname": None,
            "description": f"由 {', '.join(dna.get('name', '未知DNA') for dna in combined_dnas_data)} 的力量組合而成。",
            "personality": selected_personality_template,
            "creationTime": int(time.time()), # 配方創建時間
            "monsterTitles": [monster_initial_achievement],
            "monsterMedals": 0,
            "farmStatus": {"active": False, "completed": False, "isBattling": False, "isTraining": False, "boosts": {}}, # 初始狀態
            "activityLog": [], # 標準版怪獸的日誌應為空 (修正了逗號)
            "healthConditions": [],
            "resistances": {},
            "resume": {"wins": 0, "losses": 0},
            "constituent_dna_ids": constituent_dna_template_ids # 記錄組成該標準怪獸的 DNA 模板 ID
        }

        base_resistances: Dict[ElementTypes, int] = {} # type: ignore
        for dna_frag in combined_dnas_data:
            frag_res = dna_frag.get("resistances")
            if frag_res and isinstance(frag_res, dict):
                for el_str_res, val_res in frag_res.items():
                    el_key_res: ElementTypes = el_str_res # type: ignore
                    base_resistances[el_key_res] = base_resistances.get(el_key_res, 0) + val_res

        resistance_bonus_from_rarity = monster_rarity_data.get("resistanceBonus", 0)
        for el_str_present in elements_present:
            el_key_present: ElementTypes = el_str_present # type: ignore
            base_resistances[el_key_present] = base_resistances.get(el_key_present, 0) + resistance_bonus_from_rarity
        standard_monster_data["resistances"] = base_resistances
        
        # 調用 AI 服務生成描述
        services_logger.info(f"為新怪獸 '{standard_monster_data['nickname']}' 調用 AI 生成詳細描述。")
        ai_input_data_for_generation = {
            "nickname": standard_monster_data["nickname"],
            "elements": standard_monster_data["elements"],
            "rarity": standard_monster_data["rarity"],
            "hp": standard_monster_data["hp"], "mp": standard_monster_data["mp"],
            "attack": standard_monster_data["attack"], "defense": standard_monster_data["defense"],
            "speed": standard_monster_data["speed"], "crit": standard_monster_data["crit"],
            "personality_name": standard_monster_data["personality"]["name"], # type: ignore
            "personality_description": standard_monster_data["personality"]["description"] # type: ignore
        }
        
        ai_details: MonsterAIDetails = generate_monster_ai_details(ai_input_data_for_generation) # type: ignore
        
        # 填充 AI 生成的內容
        standard_monster_data["aiPersonality"] = ai_details.get("aiPersonality")
        standard_monster_data["aiIntroduction"] = ai_details.get("aiIntroduction")
        standard_monster_data["aiEvaluation"] = ai_details.get("aiEvaluation")

        # 計算評分
        score = (standard_monster_data["initial_max_hp"] // 10) + \
                standard_monster_data["attack"] + standard_monster_data["defense"] + \
                (standard_monster_data["speed"] // 2) + (standard_monster_data["crit"] * 2) + \
                (len(standard_monster_data["skills"]) * 15) + \
                (rarity_order.index(standard_monster_data["rarity"]) * 30)
        standard_monster_data["score"] = score

        services_logger.info(f"服務層：新配方怪獸 '{standard_monster_data['nickname']}' 生成完成。評分: {score}")

        # 記錄到 MonsterRecipes 集合
        new_recipe_entry: MonsterRecipe = {
            "combinationKey": combination_key,
            "resultingMonsterData": standard_monster_data, # 存儲完整且固定的標準版怪獸數據
            "creationTimestamp": int(time.time()),
            "discoveredByPlayerId": player_id # 記錄首次發現的玩家 ID
        }
        try:
            monster_recipes_ref.set(new_recipe_entry)
            services_logger.info(f"新配方 '{combination_key}' 及其怪獸數據已成功記錄到 MonsterRecipes。")
        except Exception as e:
            services_logger.error(f"寫入新配方 '{combination_key}' 到 MonsterRecipes 失敗: {e}", exc_info=True)
            # 如果寫入失敗，但怪獸已經生成，可以選擇返回怪獸但帶有警告，或者直接返回 None
            return None # 這裡選擇返回 None，確保數據一致性

        # 創建怪獸實例並返回
        new_monster_instance = copy.deepcopy(standard_monster_data)
        new_monster_instance["id"] = f"m_{player_id}_{int(time.time() * 1000)}_{random.randint(1000, 9999)}" # 賦予新的實例 ID
        new_monster_instance["creationTime"] = int(time.time()) # 實際創建時間
        new_monster_instance["farmStatus"] = {"active": False, "completed": False, "isBattling": False, "isTraining": False, "boosts": {}}
        # 修正 activityLog 的語法，確保它是列表而不是 tuple
        new_monster_instance["activityLog"] = [{"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": "誕生於神秘的 DNA 組合，首次發現新配方。"}] 
        # 確保所有技能的 current_exp 和 exp_to_next_level 歸零或重設為初始值
        for skill in new_monster_instance.get("skills", []):
            skill["current_exp"] = 0
            skill["exp_to_next_level"] = _calculate_exp_to_next_level(skill.get("level", 1), game_configs.get("cultivation_config", {}).get("skill_exp_base_multiplier", 100)) # type: ignore
        new_monster_instance["hp"] = new_monster_instance["initial_max_hp"] # 確保是滿血
        new_monster_instance["mp"] = new_monster_instance["initial_max_mp"] # 確保是滿藍
        new_monster_instance["resume"] = {"wins": 0, "losses": 0} # 新怪獸戰績歸零
        
        services_logger.info(f"已生成並記錄全新怪獸 '{new_monster_instance['nickname']}' (ID: {new_monster_instance['id']})。")
        
        # 返回怪獸物件和被消耗的 DNA 實例 ID 列表
        return {"monster": new_monster_instance, "consumed_dna_ids": consumed_dna_instance_indices} # 返回一個包含兩部分的字典


# --- 更新怪獸自定義屬性名服務 ---
def update_monster_custom_element_nickname_service(
    player_id: str,
    monster_id: str,
    new_custom_element_nickname: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """更新怪獸的自定義屬性名，並重新計算完整暱稱。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (update_monster_custom_element_nickname_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"更新屬性名失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_update: Optional[Monster] = None
    monster_idx = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_update = m
            monster_idx = idx
            break

    if not monster_to_update or monster_idx == -1:
        services_logger.error(f"更新屬性名失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    naming_constraints: NamingConstraints = game_configs.get("naming_constraints", DEFAULT_GAME_CONFIGS_FOR_UTILS["naming_constraints"]) # type: ignore
    max_len = naming_constraints.get("max_element_nickname_len", 5)

    element_nicknames_map: Dict[ElementTypes, str] = game_configs.get("element_nicknames", DEFAULT_GAME_CONFIGS_FOR_UTILS["element_nicknames"]) # type: ignore
    primary_element: ElementTypes = monster_to_update.get("elements", ["無"])[0] # type: ignore

    if not new_custom_element_nickname:
        monster_to_update["custom_element_nickname"] = None
        element_nickname_part_for_full_name = element_nicknames_map.get(primary_element, primary_element) # type: ignore
    else:
        processed_nickname = new_custom_element_nickname.strip()[:max_len]
        monster_to_update["custom_element_nickname"] = processed_nickname
        element_nickname_part_for_full_name = processed_nickname

    player_current_title = player_data.get("playerStats", {}).get("titles", ["新手"])[0] # type: ignore
    monster_achievement = monster_to_update.get("title", "新秀") # type: ignore

    monster_to_update["nickname"] = _generate_monster_full_nickname(
        player_current_title, monster_achievement, element_nickname_part_for_full_name, naming_constraints # type: ignore
    )

    player_data["farmedMonsters"][monster_idx] = monster_to_update # type: ignore
    services_logger.info(f"怪獸 {monster_id} 的自定義屬性名已在服務層更新為 '{monster_to_update['custom_element_nickname']}'，完整暱稱更新為 '{monster_to_update['nickname']}'。等待路由層儲存。")
    return player_data


# --- 戰鬥後吸收服務 ---
def absorb_defeated_monster_service(
    player_id: str,
    winning_monster_id: str,
    defeated_monster_snapshot: Monster,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, Any]]:
    """處理勝利怪獸吸收被擊敗怪獸的邏輯。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (absorb_defeated_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    winning_monster: Optional[Monster] = None
    winning_monster_idx = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == winning_monster_id:
            winning_monster = m
            winning_monster_idx = idx
            break

    if not winning_monster or winning_monster_idx == -1:
        return {"success": False, "error": f"找不到ID為 {winning_monster_id} 的勝利怪獸。"}

    services_logger.info(f"玩家 {player_id} 的怪獸 {winning_monster.get('nickname')} 開始吸收 {defeated_monster_snapshot.get('nickname')}。")

    absorption_cfg: AbsorptionConfig = game_configs.get("absorption_config", DEFAULT_GAME_CONFIGS_FOR_UTILS["absorption_config"]) # type: ignore
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore
    extracted_dna_templates: List[DNAFragment] = []

    defeated_constituent_ids = defeated_monster_snapshot.get("constituent_dna_ids", [])
    if defeated_constituent_ids:
        for dna_template_id in defeated_constituent_ids:
            dna_template = next((t for t in all_dna_templates if t.get("id") == dna_template_id), None)
            if dna_template:
                extraction_chance = absorption_cfg.get("dna_extraction_chance_base", 0.75)
                rarity_modifier = absorption_cfg.get("dna_extraction_rarity_modifier", {}).get(dna_template.get("rarity", "普通"), 1.0) # type: ignore
                if random.random() < (extraction_chance * rarity_modifier): # type: ignore
                    extracted_dna_templates.append(dna_template)
                    services_logger.info(f"成功提取DNA模板: {dna_template.get('name')}") # type: ignore

    stat_gains: Dict[str, int] = {}
    defeated_score = defeated_monster_snapshot.get("score", 100)
    winning_score = winning_monster.get("score", 100)
    if winning_score <= 0: winning_score = 100

    base_gain_factor = absorption_cfg.get("base_stat_gain_factor", 0.03)
    score_diff_exp = absorption_cfg.get("score_diff_exponent", 0.3)
    score_ratio_effect = min(2.0, max(0.5, (defeated_score / winning_score) ** score_diff_exp))

    stats_to_grow = ["hp", "mp", "attack", "defense", "speed", "crit"]
    for stat_key in stats_to_grow:
        defeated_stat_value = defeated_monster_snapshot.get(stat_key, 10 if stat_key not in ["hp", "mp"] else 50) # type: ignore
        gain = int(defeated_stat_value * base_gain_factor * score_ratio_effect * random.uniform(0.8, 1.2)) # type: ignore
        gain = max(absorption_cfg.get("min_stat_gain", 1) if gain > 0 else 0, gain) # type: ignore

        max_gain_for_stat = 0
        if stat_key in ["hp", "mp"]:
            max_gain_for_stat = int(winning_monster.get(f"initial_max_{stat_key}", 1000) * absorption_cfg.get("max_stat_gain_percentage", 0.015)) # type: ignore
        else:
            max_gain_for_stat = int(winning_monster.get(stat_key, 100) * absorption_cfg.get("max_stat_gain_percentage", 0.015) * 2) # type: ignore

        gain = min(gain, max(absorption_cfg.get("min_stat_gain", 1), max_gain_for_stat)) # type: ignore

        if gain > 0:
            current_stat_val = winning_monster.get(stat_key, 0) # type: ignore
            target_max_stat_val_key = f"initial_max_{stat_key}" if stat_key in ["hp", "mp"] else None

            if target_max_stat_val_key:
                max_val = winning_monster.get(target_max_stat_val_key, current_stat_val + gain) # type: ignore
                winning_monster[stat_key] = min(max_val, current_stat_val + gain) # type: ignore
                winning_monster[target_max_stat_val_key] = min(int(max_val * 1.05), max_val + int(gain * 0.5)) # type: ignore
            else:
                winning_monster[stat_key] = current_stat_val + gain # type: ignore
            stat_gains[stat_key] = gain
            services_logger.info(f"怪獸 {winning_monster_id} 的 {stat_key} 成長了 {gain}點。")

    player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore

    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in extracted_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    
    # 修改點：在 service 層處理將分解出的 DNA 加入玩家庫存的 None 槽位，並保持陣列長度
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12) # 修改點：使用新的預設值

    for dna_template in returned_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        
        # 修改點：找到第一個空位來放置新的 DNA
        free_slot_index = -1
        for i, dna_item in enumerate(current_owned_dna):
            if dna_item is None: # 找到第一個 None 槽位
                free_slot_index = i
                break
        
        if free_slot_index != -1 and free_slot_index < max_inventory_slots:
            current_owned_dna[free_slot_index] = owned_dna_item
        else:
            # 如果主庫存已滿，嘗試放入臨時背包
            max_temp_backpack_slots = game_configs.get("value_settings", {}).get("max_temp_backpack_slots", 9) # 新增：從 configs 獲取臨時背包槽位數
            temp_backpack = player_data.get("temporaryBackpack", []) # 獲取臨時背包
            
            free_temp_slot_index = -1
            for i in range(max_temp_backpack_slots):
                if i >= len(temp_backpack) or temp_backpack[i] is None: # Check if slot exists or is None
                    free_temp_slot_index = i
                    break
            
            if free_temp_slot_index != -1:
                # Extend temporary backpack if needed
                while len(temp_backpack) <= free_temp_slot_index:
                    temp_backpack.append(None)
                temp_backpack[free_temp_slot_index] = {"type": "dna", "data": owned_dna_item} # Wrap as temp item
                player_data["temporaryBackpack"] = temp_backpack # Update temporary backpack in player_data
                services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
                # 這部分邏輯只在後端運行，前端會再次刷新數據，所以可能不會直接看到此警告
                # 但理論上前端應該處理庫存滿的提示
                pass # DNA 被丟棄


    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp"]
):
    pass
