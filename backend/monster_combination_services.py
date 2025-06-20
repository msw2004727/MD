# backend/monster_combination_services.py
# 處理 DNA 組合、怪獸生成的核心邏輯

import random
import time
import logging
from typing import List, Dict, Optional, Union, Tuple, Any
from collections import Counter
import copy # 用於深拷貝怪獸數據

# --- 核心修改處 START ---
from datetime import datetime, timedelta, timezone
# --- 核心修改處 END ---

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
# --- 新增: 從 utils_services 導入共用函式 ---
from .utils_services import generate_monster_full_nickname, calculate_exp_to_next_level, get_effective_skill_with_level

monster_combination_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式或測試，避免循環導入) ---
DEFAULT_GAME_CONFIGS_FOR_COMBINATION: GameConfigs = {
    "dna_fragments": [], 
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {"無": [{"name":"撞擊", "power":10, "crit":5, "probability":100, "type":"無", "baseLevel":1, "mp_cost":0, "skill_category":"物理"}]}, # type: ignore
    "personalities": [{"name": "標準", "description": "一個標準的怪獸個性。", "colorDark": "#888888", "colorLight":"#AAAAAA", "skill_preferences": {"近戰":1.0}}], # type: ignore
    "titles": ["新手"],
    "monster_achievements_list": ["新秀"],
    "element_nicknames": {"火": {"普通": ["炎魂獸"]}}, # type: ignore
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
def _generate_combination_key(dna_template_ids: List[str]) -> str:
    """
    根據 DNA 模板 ID 列表生成唯一的組合鍵。
    """
    if not dna_template_ids:
        return "empty_combination"

    sorted_ids = sorted(dna_template_ids)
    return "_".join(sorted_ids)

def _calculate_final_resistances(base_resistances: Dict[str, int], game_configs: GameConfigs) -> Dict[str, int]:
    """
    根據克制關係計算最終的元素抗性。
    實現「正正相抵」和「正負相加」的邏輯。
    """
    chart = game_configs.get("elemental_advantage_chart", {})
    final_res = base_resistances.copy()

    # 建立一個克制關係列表，例如 [('水', '火'), ('火', '木'), ...]
    counter_pairs = []
    for attacker, defender_map in chart.items():
        for defender, multiplier in defender_map.items():
            if multiplier > 1.0: # 如果 A 對 B 的傷害 > 1，則 A 剋 B
                counter_pairs.append((attacker, defender))

    # 進行兩輪計算以處理連鎖反應
    for _ in range(2):
        for stronger, weaker in counter_pairs:
            res_strong = final_res.get(stronger, 0)
            res_weak = final_res.get(weaker, 0)

            # 規則2: 正負相加 (利用自身抗性反轉弱點)
            if res_strong > 0 and res_weak < 0:
                bonus = abs(res_weak)
                final_res[stronger] = res_strong + bonus
                final_res[weaker] = 0
                # 更新數值以供後續計算
                res_strong = final_res[stronger]
                res_weak = 0

            # 規則1: 正正相抵 (正抗性之間抵銷)
            if res_strong > 0 and res_weak > 0:
                cancellation = min(res_strong, res_weak)
                final_res[stronger] = res_strong - cancellation
                final_res[weaker] = res_weak - cancellation

    # 清理掉值為 0 的抗性
    return {k: v for k, v in final_res.items() if v != 0}


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

    if not dna_objects_from_request:
        monster_combination_services_logger.warning("DNA 組合請求中的 DNA 物件列表為空。")
        return None

    combined_dnas_data: List[DNAFragment] = []
    constituent_dna_template_ids: List[str] = []

    valid_dna_objects = [dna for dna in dna_objects_from_request if dna and isinstance(dna, dict)]
    
    for dna_obj in valid_dna_objects:
        # 【修改】只使用 `baseId` 來查找模板，不再備援使用 `id`
        template_id = dna_obj.get("baseId")
        
        if template_id and isinstance(template_id, str):
            dna_template = next((f for f in game_configs.get("dna_fragments", []) if f.get("id") == template_id), None)
            if dna_template:
                combined_dnas_data.append(dna_template)
                constituent_dna_template_ids.append(template_id)
            else:
                 monster_combination_services_logger.warning(f"在組合槽中發現一個ID為 '{template_id}' 的DNA，但在遊戲設定中找不到對應的模板資料，已跳過。")
        else:
            # 【修改】提供更精確的日誌訊息
            monster_combination_services_logger.warning(f"在組合槽的 DNA 物件中找不到有效的 'baseId'，已跳過。DNA 物件: {dna_obj}")
    
    # 遊戲規則要求必須放滿5個DNA
    if len(combined_dnas_data) < 5:
        monster_combination_services_logger.error(f"經過濾後，有效的 DNA 數量為 {len(combined_dnas_data)} 個，不足 5 個，無法組合。")
        return {"success": False, "error": "有效的 DNA 數量不足 5 個，無法組合。"}

    gmt8 = timezone(timedelta(hours=8))
    now_gmt8_str = datetime.now(gmt8).strftime("%Y-%m-%d %H:%M:%S")

    combination_key = _generate_combination_key(constituent_dna_template_ids)
    monster_recipes_ref = db.collection('MonsterRecipes').document(combination_key)
    recipe_doc = monster_recipes_ref.get()

    default_interaction_stats = {
        "chat_count": 0, "cultivation_count": 0, "touch_count": 0,
        "heal_count": 0, "near_death_count": 0, "feed_count": 0,
        "gift_count": 0, "bond_level": 1, "bond_points": 0
    }

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
        new_monster_instance["activityLog"] = [{"time": now_gmt8_str, "message": "從既有配方召喚。"}]
        new_monster_instance.setdefault("cultivation_gains", {})
        new_monster_instance.setdefault("interaction_stats", default_interaction_stats)

        for skill in new_monster_instance.get("skills", []):
            skill["current_exp"] = 0
            skill["exp_to_next_level"] = calculate_exp_to_next_level(skill.get("level", 1), game_configs.get("cultivation_config", {}).get("skill_exp_base_multiplier", 100))
            skill["is_active"] = True # 新增：確保舊配方的技能也是開啟狀態
        new_monster_instance["hp"] = new_monster_instance.get("initial_max_hp", 1)
        new_monster_instance["mp"] = new_monster_instance.get("initial_max_mp", 1)
        new_monster_instance["resume"] = {"wins": 0, "losses": 0}
        
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
        potential_skills.extend(all_skills_db.get(primary_element, []))
        if primary_element != "無" and "無" in all_skills_db:
            potential_skills.extend(all_skills_db.get("無", []))
            
        generated_skills = []
        if potential_skills:
            num_skills = random.randint(1, min(game_configs.get("value_settings", {}).get("max_monster_skills", 3), len(potential_skills)))
            selected_templates = random.sample(potential_skills, num_skills)
            for template in selected_templates:
                cultivation_cfg = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["cultivation_config"])
                initial_level = template.get("baseLevel", 1) + monster_rarity_data.get("skillLevelBonus", 0)
                initial_level = max(1, min(initial_level, cultivation_cfg.get("max_skill_level", 10)))
                
                new_skill = get_effective_skill_with_level(template, initial_level)
                new_skill['current_exp'] = 0
                new_skill['exp_to_next_level'] = calculate_exp_to_next_level(initial_level, cultivation_cfg.get("skill_exp_base_multiplier", 100))
                new_skill['is_active'] = True # 新增：確保新技能預設為開啟
                generated_skills.append(new_skill)

        if not generated_skills:
            monster_combination_services_logger.warning(f"怪獸屬性 {elements_present} 無可用技能，將指派預設'無'屬性技能。")
            default_skill_template = all_skills_db.get("無", [{}])[0]
            if default_skill_template:
                cultivation_cfg = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_COMBINATION["cultivation_config"])
                initial_level = default_skill_template.get("baseLevel", 1) + monster_rarity_data.get("skillLevelBonus", 0)
                initial_level = max(1, min(initial_level, cultivation_cfg.get("max_skill_level", 10)))

                new_skill = get_effective_skill_with_level(default_skill_template, initial_level)
                new_skill['current_exp'] = 0
                new_skill['exp_to_next_level'] = calculate_exp_to_next_level(initial_level, cultivation_cfg.get("skill_exp_base_multiplier", 100))
                new_skill['is_active'] = True # 新增：確保新技能預設為開啟
                generated_skills.append(new_skill)
            else:
                monster_combination_services_logger.error("連預設的'無'屬性技能都找不到，怪獸將沒有技能！")

        player_stats = player_data.get("playerStats", {})
        
        player_title = "新手" 
        equipped_id = player_stats.get("equipped_title_id")
        owned_titles = player_stats.get("titles", [])
        if equipped_id:
            equipped_title_obj = next((t for t in owned_titles if t.get("id") == equipped_id), None)
            if equipped_title_obj:
                player_title = equipped_title_obj.get("name", "新手")
        elif owned_titles and isinstance(owned_titles[0], dict):
             player_title = owned_titles[0].get("name", "新手")
        
        monster_achievement = random.choice(game_configs.get("monster_achievements_list", ["新秀"]))
        
        element_nicknames_map = game_configs.get("element_nicknames", {})
        rarity_specific_nicknames = element_nicknames_map.get(primary_element, {})
        possible_nicknames = rarity_specific_nicknames.get(monster_rarity_name, [primary_element])
        if not possible_nicknames:
            possible_nicknames = [primary_element]
        element_nickname = random.choice(possible_nicknames)
        
        naming_constraints = game_configs.get("naming_constraints", {})
        full_nickname = generate_monster_full_nickname(player_title, monster_achievement, element_nickname, naming_constraints)

        stat_multiplier = monster_rarity_data.get("statMultiplier", 1.0)
        initial_max_hp = int(base_stats.get("hp", 50) * stat_multiplier)
        initial_max_mp = int(base_stats.get("mp", 20) * stat_multiplier)
        
        standard_monster_data: Monster = {
            "id": f"template_{combination_key}",
            "nickname": full_nickname,
            "player_title_part": player_title,
            "achievement_part": monster_achievement,
            "element_nickname_part": element_nickname,
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
            "cultivation_gains": {},
            "interaction_stats": default_interaction_stats,
        }
        
        initial_resistances = Counter()
        for dna_frag in combined_dnas_data:
            initial_resistances.update(dna_frag.get("resistances", {}))
        
        resistance_bonus = monster_rarity_data.get("resistanceBonus", 0)
        for el in elements_present:
            initial_resistances[el] = initial_resistances.get(el, 0) + resistance_bonus

        final_resistances = _calculate_final_resistances(dict(initial_resistances), game_configs)
        standard_monster_data["resistances"] = final_resistances
        
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
        new_monster_instance["activityLog"] = [{"time": now_gmt8_str, "message": "誕生於神秘的 DNA 組合，首次發現新配方。"}]
        
        return {"monster": new_monster_instance}
