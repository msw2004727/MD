# backend/monster_cultivation_services.py
# 處理怪獸的修煉與技能成長服務

import random
import logging
import math
from typing import List, Dict, Optional, Union, Tuple, Any

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    PlayerGameData, Monster, Skill, RarityDetail, GameConfigs, ElementTypes, RarityNames,
    CultivationConfig, ValueSettings, Personality, HealthCondition, DNAFragment
)
# 從 MD_firebase_config 導入 db 實例
from . import MD_firebase_config
# 從 player_services 導入 get_player_data_service，因為修煉結算時可能需要重新獲取玩家數據
from .player_services import get_player_data_service
# 從 ai_services 導入新的故事生成函式
from .MD_ai_services import generate_cultivation_story

monster_cultivation_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式，避免循環導入) ---
DEFAULT_GAME_CONFIGS_FOR_CULTIVATION: GameConfigs = {
    "dna_fragments": [], 
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {"無": [{"name":"撞擊", "power":10, "crit":5, "probability":100, "type":"無", "baseLevel":1, "mp_cost":0, "skill_category":"物理"}]}, # type: ignore
    "personalities": [{"name": "標準", "description": "一個標準的怪獸個性。", "colorDark": "#888888", "colorLight":"#AAAAAA", "skill_preferences": {"近戰":1.0}}], # type: ignore
    "titles": [],
    "monster_achievements_list": [],
    "element_nicknames": {},
    "naming_constraints": {},
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
        "skill_exp_gain_range": (10,30), "max_skill_level": 10,
        "new_skill_rarity_bias": {"普通": 0.6, "稀有": 0.3, "菁英": 0.1}, # type: ignore
        "stat_growth_weights": {"hp": 30, "mp": 25, "attack": 20, "defense": 20, "speed": 15, "crit": 10},
        "stat_growth_duration_divisor": 900,
        "dna_find_chance": 0.5,
        "dna_find_duration_divisor": 1200,
        "dna_find_loot_table": {}
    },
    "elemental_advantage_chart": {},
}


# --- 輔助函式 (僅用於此模組) ---
def _calculate_exp_to_next_level(level: int, base_multiplier: int) -> int:
    """計算升到下一級所需的經驗值。"""
    if level <= 0: level = 1
    return (level + 1) * base_multiplier

def _get_skill_from_template(skill_template: Skill, game_configs: GameConfigs, monster_rarity_data: RarityDetail, target_level: Optional[int] = None) -> Skill:
    """根據技能模板、遊戲設定和怪獸稀有度來實例化一個技能。"""
    cultivation_cfg = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["cultivation_config"])

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
        "effect": skill_template.get("effect"),
        "stat": skill_template.get("stat"),
        "amount": skill_template.get("amount"),
        "duration": skill_template.get("duration"),
        "damage": skill_template.get("damage"),
        "recoilDamage": skill_template.get("recoilDamage")
    }
    return new_skill_instance


# --- 修煉與技能成長服務 ---
def complete_cultivation_service(
    player_id: str,
    monster_id: str,
    duration_seconds: int,
    game_configs: GameConfigs
) -> Optional[Dict[str, Any]]:
    """完成怪獸修煉，計算經驗、潛在新技能、數值成長和物品拾獲。"""
    if not MD_firebase_config.db:
        monster_cultivation_services_logger.error("Firestore 資料庫未初始化 (complete_cultivation_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。", "status_code": 500}
    
    db = MD_firebase_config.db
    
    player_data = get_player_data_service(player_id, None, game_configs) 
    if not player_data or not player_data.get("farmedMonsters"):
        monster_cultivation_services_logger.error(f"完成修煉失敗：找不到玩家 {player_id} 或其無怪獸。")
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。", "status_code": 404}

    monster_to_update: Optional[Monster] = None
    monster_idx = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_update = m
            monster_idx = idx
            break

    if not monster_to_update or monster_idx == -1:
        monster_cultivation_services_logger.error(f"完成修煉失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。", "status_code": 404}

    # 重設修煉狀態
    if not monster_to_update.get("farmStatus"):
        monster_to_update["farmStatus"] = {}
    monster_to_update["farmStatus"]["isTraining"] = False
    monster_to_update["farmStatus"]["trainingStartTime"] = None
    monster_to_update["farmStatus"]["trainingDuration"] = None
    
    cultivation_cfg: CultivationConfig = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["cultivation_config"]) # type: ignore
    monster_cultivation_services_logger.info(f"開始為怪獸 {monster_to_update.get('nickname')} 結算修煉成果。時長: {duration_seconds}秒。")
    
    skill_updates_log: List[str] = []
    
    # 1. 技能經驗與升級
    current_skills: List[Skill] = monster_to_update.get("skills", [])
    exp_gain_min, exp_gain_max = cultivation_cfg.get("skill_exp_gain_range", (15,75))
    max_skill_lvl = cultivation_cfg.get("max_skill_level", 10)
    exp_multiplier = cultivation_cfg.get("skill_exp_base_multiplier", 100)

    for skill in current_skills:
        if skill.get("level", 1) >= max_skill_lvl:
            continue
        exp_gained = random.randint(exp_gain_min, exp_gain_max) + int(duration_seconds / 10)
        skill["current_exp"] = skill.get("current_exp", 0) + exp_gained
        
        while skill.get("level", 1) < max_skill_lvl and skill.get("current_exp", 0) >= skill.get("exp_to_next_level", 9999):
            skill["current_exp"] -= skill.get("exp_to_next_level", 9999)
            skill["level"] = skill.get("level", 1) + 1
            skill["exp_to_next_level"] = _calculate_exp_to_next_level(skill["level"], exp_multiplier)
            skill_updates_log.append(f"🎉 技能 '{skill.get('name')}' 等級提升至 {skill.get('level')}！")
    monster_to_update["skills"] = current_skills

    # 2. 領悟新技能
    learned_new_skill_template: Optional[Skill] = None
    if random.random() < cultivation_cfg.get("new_skill_chance", 0.1):
        monster_elements: List[ElementTypes] = monster_to_update.get("elements", ["無"]) # type: ignore
        all_skills_db: Dict[ElementTypes, List[Skill]] = game_configs.get("skills", {})
        potential_new_skills: List[Skill] = []
        current_skill_names = {s.get("name") for s in current_skills}
        for el_str_learn in monster_elements:
            potential_new_skills.extend(all_skills_db.get(el_str_learn, [])) # type: ignore
        if "無" not in monster_elements and "無" in all_skills_db:
            potential_new_skills.extend(all_skills_db.get("無", []))
        learnable_skills = [s for s in potential_new_skills if s.get("name") not in current_skill_names]
        if learnable_skills:
            learned_new_skill_template = random.choice(learnable_skills)
            skill_updates_log.append(f"🌟 怪獸領悟了新技能：'{learned_new_skill_template.get('name')}' (等級1)！")

    # 3. 基礎數值成長
    stat_divisor = cultivation_cfg.get("stat_growth_duration_divisor", 900)
    growth_chances = math.floor(duration_seconds / stat_divisor)
    if growth_chances > 0:
        growth_weights_map = cultivation_cfg.get("stat_growth_weights", {})
        stats_pool = list(growth_weights_map.keys())
        weights = list(growth_weights_map.values())
        
        stats_to_grow = random.choices(stats_pool, weights=weights, k=growth_chances)
        
        stat_growth_log_map = {}
        for stat in stats_to_grow:
            gain = random.randint(1, 2) # 每次固定提升1-2點
            stat_growth_log_map[stat] = stat_growth_log_map.get(stat, 0) + gain

        for stat, total_gain in stat_growth_log_map.items():
            if stat in ["hp", "mp"]:
                max_stat_key = f"initial_max_{stat}"
                monster_to_update[max_stat_key] = monster_to_update.get(max_stat_key, 0) + total_gain
                monster_to_update[stat] = monster_to_update.get(max_stat_key", 0) # 同時補滿
            else:
                monster_to_update[stat] = monster_to_update.get(stat, 0) + total_gain
            skill_updates_log.append(f"💪 基礎能力 '{stat.upper()}' 提升了 {total_gain} 點！")

    # 4. 拾獲DNA碎片
    items_obtained: List[DNAFragment] = []
    if random.random() < cultivation_cfg.get("dna_find_chance", 0.5):
        dna_find_divisor = cultivation_cfg.get("dna_find_duration_divisor", 1200)
        num_items = 1 + math.floor(duration_seconds / dna_find_divisor)
        
        monster_rarity: RarityNames = monster_to_update.get("rarity", "普通")
        loot_table: Dict[RarityNames, float] = cultivation_cfg.get("dna_find_loot_table", {}).get(monster_rarity, {"普通": 1.0})
        
        all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", [])
        monster_elements = monster_to_update.get("elements", ["無"])
        
        dna_pool = [dna for dna in all_dna_templates if dna.get("type") in monster_elements]
        if not dna_pool: dna_pool = all_dna_templates

        for _ in range(num_items):
            if not dna_pool: break
            
            rarity_pool = list(loot_table.keys())
            rarity_weights = list(loot_table.values())
            chosen_rarity = random.choices(rarity_pool, weights=rarity_weights, k=1)[0]
            
            quality_pool = [dna for dna in dna_pool if dna.get("rarity") == chosen_rarity]
            if quality_pool:
                found_item = random.choice(quality_pool)
                items_obtained.append(found_item)
                skill_updates_log.append(f"💎 拾獲了DNA碎片：[{found_item.get('rarity')}] {found_item.get('name')}！")

    # 5. 重新計算總評價
    rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"]
    monster_to_update["score"] = (monster_to_update.get("initial_max_hp",0) // 10) + \
                                   monster_to_update.get("attack",0) + monster_to_update.get("defense",0) + \
                                   (monster_to_update.get("speed",0) // 2) + (monster_to_update.get("crit",0) * 2) + \
                                   (len(monster_to_update.get("skills",[])) * 15) + \
                                   (rarity_order.index(monster_to_update.get("rarity","普通")) * 30)
    
    # 6. 生成AI冒險故事
    max_duration = game_configs.get("value_settings", {}).get("max_cultivation_time_seconds", 3600)
    duration_percentage = duration_seconds / max_duration
    adventure_story = generate_cultivation_story(
        monster_name=monster_to_update.get('nickname', '一隻怪獸'),
        duration_percentage=duration_percentage,
        skill_updates_log=skill_updates_log,
        items_obtained=items_obtained
    )
                                   
    player_data["farmedMonsters"][monster_idx] = monster_to_update
    
    from .player_services import save_player_data_service
    if save_player_data_service(player_id, player_data):
        return {
            "success": True,
            "updated_monster_skills": monster_to_update.get("skills"),
            "learned_new_skill_template": learned_new_skill_template,
            "skill_updates_log": skill_updates_log,
            "adventure_story": adventure_story,
            "items_obtained": items_obtained 
        }
    else:
        monster_cultivation_services_logger.error(f"完成修煉後儲存玩家 {player_id} 資料失敗。")
        return {"success": False, "error": "完成修煉後儲存資料失敗。", "status_code": 500}


def replace_monster_skill_service(
    player_id: str,
    monster_id: str,
    slot_to_replace_index: Optional[int],
    new_skill_template_data: Skill,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    # ... (此函數維持不變) ...
    if not MD_firebase_config.db:
        monster_cultivation_services_logger.error("Firestore 資料庫未初始化 (replace_monster_skill_service 內部)。")
        return None
    
    db = MD_firebase_config.db
    if not player_data or not player_data.get("farmedMonsters"):
        monster_cultivation_services_logger.error(f"替換技能失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_update: Optional[Monster] = None
    monster_idx = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_update = m
            monster_idx = idx
            break

    if not monster_to_update or monster_idx == -1:
        monster_cultivation_services_logger.error(f"替換技能失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    current_skills: List[Skill] = monster_to_update.get("skills", [])
    max_monster_skills = game_configs.get("value_settings", {}).get("max_monster_skills", 3)

    monster_rarity_name: RarityNames = monster_to_update.get("rarity", "普通")
    all_rarities_db: Dict[str, RarityDetail] = game_configs.get("rarities", {})
    rarity_key_lookup = {data["name"]: key for key, data in all_rarities_db.items()}
    monster_rarity_key = rarity_key_lookup.get(monster_rarity_name, "COMMON")
    monster_rarity_data: RarityDetail = all_rarities_db.get(monster_rarity_key, DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["rarities"]["COMMON"])

    new_skill_instance = _get_skill_from_template(new_skill_template_data, game_configs, monster_rarity_data, target_level=1)

    if slot_to_replace_index is not None and 0 <= slot_to_replace_index < len(current_skills):
        monster_cultivation_services_logger.info(f"怪獸 {monster_id} 的技能槽 {slot_to_replace_index} 將被替換為 '{new_skill_instance['name']}'。")
        current_skills[slot_to_replace_index] = new_skill_instance
    elif len(current_skills) < max_monster_skills:
        monster_cultivation_services_logger.info(f"怪獸 {monster_id} 學習了新技能 '{new_skill_instance['name']}' 到新槽位。")
        current_skills.append(new_skill_instance)
    else:
        monster_cultivation_services_logger.warning(f"怪獸 {monster_id} 技能槽已滿 ({len(current_skills)}/{max_monster_skills})，無法學習新技能 '{new_skill_instance['name']}'。")
        return player_data

    monster_to_update["skills"] = current_skills
    player_data["farmedMonsters"][monster_idx] = monster_to_update

    from .player_services import save_player_data_service
    if save_player_data_service(player_id, player_data):
        monster_cultivation_services_logger.info(f"怪獸 {monster_id} 的技能已在服務層更新（等待路由層儲存）。")
        return player_data
    else:
        monster_cultivation_services_logger.error(f"更新怪獸技能後儲存玩家 {player_id} 資料失敗。")
        return None
