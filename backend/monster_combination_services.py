# backend/monster_combination_services.py
# 處理 DNA 組合、怪獸生成的核心邏輯

import random
import time
import logging
from typing import List, Dict, Optional, Union, Tuple, Literal, Any
from collections import Counter
import copy # 用於深拷貝怪獸數據

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    PlayerGameData, PlayerStats, PlayerOwnedDNA,
    Monster, Skill, DNAFragment, RarityDetail, Personality,
    GameConfigs, ElementTypes, MonsterFarmStatus, MonsterAIDetails, MonsterResume,
    HealthCondition, AbsorptionConfig, CultivationConfig, SkillCategory, NamingConstraints,
    ValueSettings, RarityNames, MonsterRecipe
)
# 引入 AI 服務模組
from .MD_ai_services import generate_monster_ai_details

monster_combination_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式或測試，避免循環導入 GameConfigs) ---
# 這裡只包含這個模組需要的預設值，避免重複和潛在的循環導入
DEFAULT_GAME_CONFIGS_FOR_COMBINATION: GameConfigs = {
    "dna_fragments": [], # 實際會從 game_configs 載入
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
        "element_value_factors": {},
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10,
        "max_monster_skills": 3,
        "max_battle_turns": 30,
        "max_inventory_slots": 12,
        "max_temp_backpack_slots": 9
    },
    "absorption_config": {},
    "cultivation_config": {
        "skill_exp_base_multiplier": 100, "new_skill_chance": 0.1,
        "skill_exp_gain_range": (10,30), "max_skill_level": 5,
        "new_skill_rarity_bias": {"普通": 0.6, "稀有": 0.3, "菁英": 0.1} # type: ignore
    },
    "elemental_advantage_chart": {},
}


# --- 輔助函式 (僅用於此模組，或可進一步拆分到 utils_services.py) ---
def _calculate_exp_to_next_level(level: int, base_multiplier: int) -> int:
    """計算升到下一級所需的經驗值。"""
    if level <= 0: level = 1
    return level * base_multiplier

def _get_skill_from_template(skill_template: Skill, game_configs: GameConfigs, monster_rarity_data: RarityDetail, target_level: Optional[int] = None) -> Skill:
    """根據技能模板、遊戲設定和怪獸稀有度來實例化一個技能。"""
    cultivation_cfg = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["cultivation_config"])

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


# --- DNA 組合與怪獸生成服務 ---
def combine_dna_service(dna_ids_from_request: List[str], game_configs: GameConfigs, player_data: PlayerGameData, player_id: str) -> Optional[Dict[str, Any]]:
    """
    根據提供的 DNA ID 列表、遊戲設定和玩家資料來組合生成新的怪獸。
    此函式將先查詢 MonsterRecipes 集合，若配方存在則直接使用，否則生成新怪獸並記錄。
    此函數現在返回一個字典，包含怪獸物件和被消耗的 DNA 實例 ID 列表。
    """
    # 在函數內部動態獲取 db 實例，確保它已經被 main.py 設置
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        monster_combination_services_logger.error("Firestore 資料庫未初始化 (combine_dna_service 內部)。")
        return None

    db = firestore_db_instance # 將局部變數 db 指向已初始化的實例

    monster_combination_services_logger.debug(f"DEBUG combine_dna_service: 玩家 {player_id} 的完整 playerOwnedDNA: {player_data.get('playerOwnedDNA', 'N/A')}")

    if not dna_ids_from_request:
        monster_combination_services_logger.warning("DNA 組合請求中的 DNA ID 列表為空。")
        return None

    # 從玩家的 playerOwnedDNA 中找到對應的 DNA 實例，並獲取它們的 baseId
    # 同時記錄要消耗的實例 ID，並將這些 DNA 標記為 None (在 player_data 中)
    combined_dnas_data: List[DNAFragment] = []
    constituent_dna_template_ids: List[str] = []
    consumed_dna_instance_indices: List[int] = [] # 記錄被消耗的 DNA 在玩家庫存中的索引

    monster_combination_services_logger.debug(f"DEBUG combine_dna_service: 收到請求的 DNA ID 列表: {dna_ids_from_request}")

    for req_dna_instance_id in dna_ids_from_request:
        found_dna_instance = None
        found_dna_index = -1
        for idx, dna_item in enumerate(player_data.get("playerOwnedDNA", [])):
            monster_combination_services_logger.debug(f"DEBUG combine_dna_service: 檢查庫存槽位 {idx} - DNA: {dna_item.get('id') if dna_item else 'None'}, 匹配目標: {req_dna_instance_id}")
            if dna_item and dna_item.get("id") == req_dna_instance_id:
                found_dna_instance = dna_item
                found_dna_index = idx
                break
        
        if found_dna_instance: # Check if instance was found at all
            # Ensure baseId exists, if not, use its own ID as baseId (fallback)
            dna_base_id_to_use = found_dna_instance.get("baseId") or found_dna_instance.get("id")
            
            if dna_base_id_to_use: # Ensure we have a baseId
                monster_combination_services_logger.debug(f"DEBUG combine_dna_service: 成功找到匹配的 DNA: {found_dna_instance.get('id')}, 使用 baseId: {dna_base_id_to_use}")
                combined_dnas_data.append(found_dna_instance)
                constituent_dna_template_ids.append(dna_base_id_to_use) # Use the determined baseId
                consumed_dna_instance_indices.append(found_dna_index)
            else:
                monster_combination_services_logger.warning(f"在玩家庫存中找到 ID 為 {req_dna_instance_id} 的 DNA 實例，但缺少 baseId 且無法從 ID 推斷。無法用於組合。")
                return None
        else:
            monster_combination_services_logger.warning(f"在玩家庫存中找不到 ID 為 {req_dna_instance_id} 的 DNA 實例。無法用於組合。")
            return None

    monster_combination_services_logger.debug(f"DEBUG combine_dna_service: 成功匹配 {len(combined_dnas_data)} 個 DNA 實例。")
    monster_combination_services_logger.debug(f"DEBUG combine_dna_service: 待消耗的 DNA 索引: {consumed_dna_instance_indices}")

    if len(combined_dnas_data) < 2:
        monster_combination_services_logger.error("組合 DNA 數量不足 (至少需要 2 個)。")
        return None
    
    # 1. 生成 Combination Key
    combination_key = _generate_combination_key(constituent_dna_template_ids)
    monster_combination_services_logger.info(f"生成的組合鍵: {combination_key}")

    # 2. 查詢 MonsterRecipes 集合
    monster_recipes_ref = db.collection('MonsterRecipes').document(combination_key)
    recipe_doc = monster_recipes_ref.get()

    new_monster_instance: Optional[Monster] = None

    if recipe_doc.exists:
        # 3. 如果文檔存在（配方已記錄）
        monster_combination_services_logger.info(f"配方 '{combination_key}' 已存在於組合庫中，直接讀取。")
        recipe_data: MonsterRecipe = recipe_doc.to_dict() # type: ignore
        fixed_monster_data: Monster = recipe_data.get("resultingMonsterData") # type: ignore

        if fixed_monster_data:
            # 從固定數據創建一個新的怪獸實例，賦予新的 instance ID
            new_monster_instance = copy.deepcopy(fixed_monster_data)
            new_monster_instance["id"] = f"m_{player_id}_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
            new_monster_instance["creationTime"] = int(time.time()) # 實際創建時間
            new_monster_instance["farmStatus"] = {"active": False, "completed": False, "isBattling": False, "isTraining": False, "boosts": {}}
            new_monster_instance["activityLog"] = [{"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": "從既有配方召喚。"}] # 修正了逗號
            # 確保所有技能的 current_exp 和 exp_to_next_level 歸零或重設為初始值
            for skill in new_monster_instance.get("skills", []):
                skill["current_exp"] = 0
                skill["exp_to_next_level"] = _calculate_exp_to_next_level(skill.get("level", 1), game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["cultivation_config"]).get("skill_exp_base_multiplier", 100)) # type: ignore
            new_monster_instance["hp"] = new_monster_instance["initial_max_hp"] # 確保是滿血
            new_monster_instance["mp"] = new_monster_instance["initial_max_mp"] # 確保是滿藍
            new_monster_instance["resume"] = {"wins": 0, "losses": 0} # 新怪獸戰績歸零
            monster_combination_services_logger.info(f"已從組合庫生成怪獸 '{new_monster_instance['nickname']}' (ID: {new_monster_instance['id']})。")
            
            # 返回怪獸物件和被消耗的 DNA 實例索引列表
            return {"monster": new_monster_instance, "consumed_dna_indices": consumed_dna_instance_indices}
        else:
            monster_combination_services_logger.error(f"組合庫中的配方 '{combination_key}' 缺少 'resultingMonsterData'。")
            return None # 數據不完整

    else:
        # 3. 如果文檔不存在（全新配方）
        monster_combination_services_logger.info(f"配方 '{combination_key}' 為全新發現，開始生成新怪獸。")

        all_dna_fragments_templates: List[DNAFragment] = game_configs.get("dna_fragments", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["dna_fragments"]) # type: ignore
        all_skills_db: Dict[ElementTypes, List[Skill]] = game_configs.get("skills", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["skills"]) # type: ignore
        all_personalities_db: List[Personality] = game_configs.get("personalities", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["personalities"]) # type: ignore
        all_rarities_db: Dict[str, RarityDetail] = game_configs.get("rarities", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["rarities"]) # type: ignore
        naming_constraints: NamingConstraints = game_configs.get("naming_constraints", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["naming_constraints"]) # type: ignore
        element_nicknames_map: Dict[ElementTypes, str] = game_configs.get("element_nicknames", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["element_nicknames"]) # type: ignore
        monster_achievements_list: List[str] = game_configs.get("monster_achievements_list", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["monster_achievements_list"]) # type: ignore

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
                monster_combination_services_logger.warning(f"未知的稀有度名稱 '{dna_frag.get('rarity')}' 在 DNA 片段 {dna_frag.get('id')} 中。")
        monster_rarity_name: RarityNames = rarity_order[highest_rarity_index]

        rarity_key_lookup = {data["name"]: key for key, data in all_rarities_db.items()} # type: ignore
        monster_rarity_key = rarity_key_lookup.get(monster_rarity_name, "COMMON")
        monster_rarity_data: RarityDetail = all_rarities_db.get(monster_rarity_key, DEFAULT_GAME_CONFIGS_FOR_COMBINATION["rarities"]["COMMON"]) # type: ignore

        generated_skills: List[Skill] = []
        potential_skills_for_elements: List[Skill] = [] # type: ignore
        for el_str_skill in elements_present:
            el_skill: ElementTypes = el_str_skill # type: ignore
            if el_skill in all_skills_db and isinstance(all_skills_db.get(el_skill), list):
                potential_skills_for_elements.extend(all_skills_db[el_skill]) # type: ignore
        if "無" in all_skills_db and isinstance(all_skills_db.get("無"), list) and "無" not in elements_present:
            potential_skills_for_elements.extend(all_skills_db["無"]) # type: ignore

        if potential_skills_for_elements:
            num_skills_to_select = random.randint(1, min(game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["value_settings"]).get("max_monster_skills", 3), len(potential_skills_for_elements)))
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

        selected_personality_template: Personality = random.choice(all_personalities_db) if all_personalities_db else DEFAULT_GAME_CONFIGS_FOR_COMBINATION["personalities"][0] # type: ignore

        player_current_title = player_data.get("playerStats", {}).get("titles", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["titles"])[0] # type: ignore
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
        monster_combination_services_logger.info(f"為新怪獸 '{standard_monster_data['nickname']}' 調用 AI 生成詳細描述。")
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

        monster_combination_services_logger.info(f"服務層：新配方怪獸 '{standard_monster_data['nickname']}' 生成完成。評分: {score}")

        # 記錄到 MonsterRecipes 集合
        new_recipe_entry: MonsterRecipe = {
            "combinationKey": combination_key,
            "resultingMonsterData": standard_monster_data, # 存儲完整且固定的標準版怪獸數據
            "creationTimestamp": int(time.time()),
            "discoveredByPlayerId": player_id # 記錄首次發現的玩家 ID
        }
        try:
            db.collection('MonsterRecipes').document(combination_key).set(new_recipe_entry)
            monster_combination_services_logger.info(f"新配方 '{combination_key}' 及其怪獸數據已成功記錄到 MonsterRecipes。")
        except Exception as e:
            monster_combination_services_logger.error(f"寫入新配方 '{combination_key}' 到 MonsterRecipes 失敗: {e}", exc_info=True)
            return None # 這裡選擇返回 None，確保數據一致性

        # 創建怪獸實例並返回
        new_monster_instance = copy.deepcopy(standard_monster_data)
        new_monster_instance["id"] = f"m_{player_id}_{int(time.time() * 1000)}_{random.randint(1000, 9999)}" # 賦予新的實例 ID
        new_monster_instance["creationTime"] = int(time.time()) # 實際創建時間
        new_monster_instance["farmStatus"] = {"active": False, "completed": False, "isBattling": False, "isTraining": False, "boosts": {}}
        new_monster_instance["activityLog"] = [{"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": "誕生於神秘的 DNA 組合，首次發現新配方。"}] # 修正了逗號
        # 確保所有技能的 current_exp 和 exp_to_next_level 歸零或重設為初始值
        for skill in new_monster_instance.get("skills", []):
            skill["current_exp"] = 0
            skill["exp_to_next_level"] = _calculate_exp_to_next_level(skill.get("level", 1), game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["cultivation_config"]).get("skill_exp_base_multiplier", 100)) # type: ignore
        new_monster_instance["hp"] = new_monster_instance["initial_max_hp"] # 確保是滿血
        new_monster_instance["mp"] = new_monster_instance["initial_max_mp"] # 確保是滿藍
        new_monster_instance["resume"] = {"wins": 0, "losses": 0} # 新怪獸戰績歸零
        
        monster_combination_services_logger.info(f"已生成並記錄全新怪獸 '{new_monster_instance['nickname']}' (ID: {new_monster_instance['id']})。")
        
        # 返回怪獸物件和被消耗的 DNA 實例索引列表
        return {"monster": new_monster_instance, "consumed_dna_indices": consumed_dna_instance_indices}