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
DEFAULT_GAME_CONFIGS_FOR_COMBINATION: GameConfigs = {
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
    return (level + 1) * base_multiplier

def _get_skill_from_template(skill_template: Skill, game_configs: GameConfigs, monster_rarity_data: RarityDetail, target_level: Optional[int] = None) -> Skill:
    """根據技能模板、遊戲設定和怪獸稀有度來實例化一個技能。"""
    cultivation_cfg = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["cultivation_config"])

    if target_level is not None:
        skill_level = max(1, min(target_level, cultivation_cfg.get("max_skill_level", 10)))
    else:
        skill_level = skill_template.get("baseLevel", 1) + monster_rarity_data.get("skillLevelBonus", 0)
        skill_level = max(1, min(skill_level, cultivation_cfg.get("max_skill_level", 10))) # type: ignore

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
        # 以下為更詳細的效果參數，用於實現輔助性、恢復性、同歸於盡性等
        "stat": skill_template.get("stat"),     # 影響的數值
        "amount": skill_template.get("amount"),   # 影響的量
        "duration": skill_template.get("duration"), # 持續回合
        "damage": skill_template.get("damage"),   # 額外傷害或治療量 (非 DoT)
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
    """
    if not dna_template_ids:
        return "empty_combination"

    sorted_ids = sorted(dna_template_ids)
    return "_".join(sorted_ids)


# --- DNA 組合與怪獸生成服務 ---
def combine_dna_service(dna_objects_from_request: List[Dict[str, Any]], game_configs: GameConfigs, player_data: PlayerGameData, player_id: str) -> Optional[Dict[str, Any]]:
    """
    根據前端傳來的、已在組合槽中的完整 DNA 物件列表來生成新的怪獸。
    """
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        monster_combination_services_logger.error("Firestore 資料庫未初始化 (combine_dna_service 內部)。")
        return None

    db = firestore_db_instance

    if not dna_objects_from_request or len(dna_objects_from_request) < 2:
        monster_combination_services_logger.warning("DNA 組合請求中的 DNA 物件列表為空或數量不足。")
        return None

    # 直接使用從請求中傳來的 DNA 物件資料
    combined_dnas_data: List[DNAFragment] = dna_objects_from_request
    # 提取 DNA 模板 ID (baseId) 用於生成配方鍵值
    constituent_dna_template_ids: List[str] = [dna.get("baseId") or dna.get("id", "") for dna in combined_dnas_data if dna]

    if len(combined_dnas_data) < 2:
        monster_combination_services_logger.error("組合 DNA 數量不足 (至少需要 2 個)。")
        return None
    
    combination_key = _generate_combination_key(constituent_dna_template_ids)
    monster_recipes_ref = db.collection('MonsterRecipes').document(combination_key)
    recipe_doc = monster_recipes_ref.get()

    if recipe_doc.exists:
        monster_combination_services_logger.info(f"配方 '{combination_key}' 已存在，直接讀取。")
        recipe_data: MonsterRecipe = recipe_doc.to_dict() # type: ignore
        fixed_monster_data: Monster = recipe_data.get("resultingMonsterData") # type: ignore
        if not fixed_monster_data:
            monster_combination_services_logger.error(f"組合庫中的配方 '{combination_key}' 缺少 'resultingMonsterData'。")
            return None
        
        new_monster_instance = copy.deepcopy(fixed_monster_data)
        new_monster_instance["id"] = f"m_{player_id}_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
        new_monster_instance["creationTime"] = int(time.time())
        new_monster_instance["farmStatus"] = {"active": False, "completed": False, "isBattling": False, "isTraining": False, "boosts": {}}
        new_monster_instance["activityLog"] = [{"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": "從既有配方召喚。"}]
        new_monster_instance.setdefault("cultivation_gains", {})
        for skill in new_monster_instance.get("skills", []):
            skill["current_exp"] = 0
            skill["exp_to_next_level"] = _calculate_exp_to_next_level(skill.get("level", 1), game_configs.get("cultivation_config", {}).get("skill_exp_base_multiplier", 100))
        new_monster_instance["hp"] = new_monster_instance.get("initial_max_hp", 1)
        new_monster_instance["mp"] = new_monster_instance.get("initial_max_mp", 1)
        new_monster_instance["resume"] = {"wins": 0, "losses": 0}
        
        # 返回怪獸物件，讓路由層處理後續
        return {"monster": new_monster_instance}

    else:
        monster_combination_services_logger.info(f"配方 '{combination_key}' 為全新發現，開始生成新怪獸。")
        
        all_skills_db = game_configs.get("skills", {})
        all_rarities_db = game_configs.get("rarities", {})
        
        base_stats = Counter()
        for dna_frag in combined_dnas_data:
            for stat_name, value in dna_frag.items():
                if isinstance(value, (int, float)):
                     base_stats[stat_name] += value
        
        element_counts = Counter(dna.get("type", "無") for dna in combined_dnas_data)
        total_dna_pieces = len(combined_dnas_data)
        element_composition = {el: round((cnt / total_dna_pieces) * 100, 1) for el, cnt in element_counts.items()} if total_dna_pieces > 0 else {"無": 100.0}
        elements_present = [el for el, _ in sorted(element_composition.items(), key=lambda item: item[1], reverse=True)] or ["無"]
        primary_element = elements_present[0]

        rarity_order = ["普通", "稀有", "菁英", "傳奇", "神話"]
        highest_rarity_index = max((rarity_order.index(dna.get("rarity", "普通")) for dna in combined_dnas_data if dna.get("rarity") in rarity_order), default=0)
        monster_rarity_name = rarity_order[highest_rarity_index]
        
        rarity_key = next((k for k, v in all_rarities_db.items() if v.get("name") == monster_rarity_name), "COMMON")
        monster_rarity_data = all_rarities_db.get(rarity_key, {})

        potential_skills = []
        for el in elements_present:
            potential_skills.extend(all_skills_db.get(el, []))
        if "無" not in elements_present:
            potential_skills.extend(all_skills_db.get("無", []))
            
        generated_skills = []
        if potential_skills:
            num_skills = random.randint(1, min(game_configs.get("value_settings", {}).get("max_monster_skills", 3), len(potential_skills)))
            selected_templates = random.sample(potential_skills, num_skills)
            for template in selected_templates:
                generated_skills.append(_get_skill_from_template(template, game_configs, monster_rarity_data))
        
        if not generated_skills:
            monster_combination_services_logger.warning(f"怪獸屬性 {elements_present} 無可用技能，將指派預設'無'屬性技能。")
            default_skill_template = all_skills_db.get("無", [{}])[0]
            if default_skill_template:
                generated_skills.append(_get_skill_from_template(default_skill_template, game_configs, monster_rarity_data))
            else:
                monster_combination_services_logger.error("連預設的'無'屬性技能都找不到，怪獸將沒有技能！")

        player_stats = player_data.get("playerStats", {})
        
        # --- 修正暱稱產生邏輯 ---
        player_title = "新手" # 預設值
        equipped_id = player_stats.get("equipped_title_id")
        owned_titles = player_stats.get("titles", [])
        if equipped_id:
            equipped_title_obj = next((t for t in owned_titles if t.get("id") == equipped_id), None)
            if equipped_title_obj:
                player_title = equipped_title_obj.get("name", "新手")
        elif owned_titles: # 如果沒有裝備ID，但有稱號列表，則使用第一個
             player_title = owned_titles[0].get("name", "新手")
        # --- 修正結束 ---
        
        monster_achievement = random.choice(game_configs.get("monster_achievements_list", ["新秀"]))
        element_nickname = game_configs.get("element_nicknames", {}).get(primary_element, primary_element)
        
        naming_constraints = game_configs.get("naming_constraints", {})
        full_nickname = _generate_monster_full_nickname(player_title, monster_achievement, element_nickname, naming_constraints)

        stat_multiplier = monster_rarity_data.get("statMultiplier", 1.0)
        initial_max_hp = int(base_stats.get("hp", 50) * stat_multiplier)
        initial_max_mp = int(base_stats.get("mp", 20) * stat_multiplier)
        
        standard_monster_data: Monster = {
            "id": f"template_{combination_key}",
            "nickname": full_nickname,
            "elements": elements_present,
            "elementComposition": element_composition,
            "hp": initial_max_hp,
            "mp": initial_max_mp,
            "initial_max_hp": initial_max_hp,
            "initial_max_mp": initial_max_mp,
            "attack": int(base_stats.get("attack", 10) * stat_multiplier),
            "defense": int(base_stats.get("defense", 10) * stat_multiplier),
            "speed": int(base_stats.get("speed", 10) * stat_multiplier),
            "crit": int(base_stats.get("crit", 5) * stat_multiplier),
            "skills": generated_skills,
            "rarity": monster_rarity_name,
            "title": monster_achievement,
            "custom_element_nickname": None,
            "description": f"由 {', '.join(dna.get('name', '未知DNA') for dna in combined_dnas_data)} 的力量組合而成。",
            "personality": random.choice(game_configs.get("personalities", [{}])),
            "creationTime": int(time.time()),
            "monsterTitles": [monster_achievement],
            "monsterMedals": 0,
            "farmStatus": {},
            "activityLog": [],
            "healthConditions": [],
            "resistances": {},
            "resume": {"wins": 0, "losses": 0},
            "constituent_dna_ids": constituent_dna_template_ids,
            "cultivation_gains": {}
        }
        
        base_resistances = Counter()
        for dna_frag in combined_dnas_data:
            base_resistances.update(dna_frag.get("resistances", {}))
        resistance_bonus = monster_rarity_data.get("resistanceBonus", 0)
        for el in elements_present:
            base_resistances[el] = base_resistances.get(el, 0) + resistance_bonus
        standard_monster_data["resistances"] = dict(base_resistances)
        
        ai_details = generate_monster_ai_details(standard_monster_data)
        standard_monster_data.update(ai_details)

        score = (standard_monster_data["initial_max_hp"] // 10) + standard_monster_data["attack"] + standard_monster_data["defense"] + (standard_monster_data["speed"] // 2) + (standard_monster_data["crit"] * 2) + (len(standard_monster_data["skills"]) * 15) + (rarity_order.index(standard_monster_data["rarity"]) * 30)
        standard_monster_data["score"] = score
        
        new_recipe_entry = {
            "combinationKey": combination_key,
            "resultingMonsterData": standard_monster_data,
            "creationTimestamp": int(time.time()),
            "discoveredByPlayerId": player_id
        }
        
        try:
            db.collection('MonsterRecipes').document(combination_key).set(new_recipe_entry)
            monster_combination_services_logger.info(f"新配方 '{combination_key}' 已成功記錄。")
        except Exception as e:
            monster_combination_services_logger.error(f"寫入新配方 '{combination_key}' 失敗: {e}")
            return None

        new_monster_instance = copy.deepcopy(standard_monster_data)
        new_monster_instance["id"] = f"m_{player_id}_{int(time.time() * 1000)}"
        new_monster_instance["creationTime"] = int(time.time())
        new_monster_instance["farmStatus"] = {"active": False, "isBattling": False, "isTraining": False, "completed": False}
        new_monster_instance["activityLog"] = [{"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": "誕生於神秘的 DNA 組合，首次發現新配方。"}]
        
        return {"monster": new_monster_instance}
