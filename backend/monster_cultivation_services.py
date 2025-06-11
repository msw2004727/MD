# backend/monster_cultivation_services.py
# 處理怪獸的修煉與技能成長服務

import random
import logging
import math
import time 
from typing import List, Dict, Optional, Union, Tuple, Any
from collections import Counter

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    PlayerGameData, Monster, Skill, RarityDetail, GameConfigs, ElementTypes, RarityNames,
    CultivationConfig, ValueSettings, Personality, HealthCondition, DNAFragment, MonsterActivityLogEntry
)
# 從 MD_firebase_config 導入 db 實例
from . import MD_firebase_config
# 從 player_services 導入 get_player_data_service
from .player_services import get_player_data_service, save_player_data_service # 確保這裡也導入 save_player_data_service

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
        "skill_exp_gain_range": (10,30), "max_skill_level": 5,
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
        "stat": skill_template.get("stat"),     # 影響的數值
        "amount": skill_template.get("amount"),   # 影響的量
        "duration": skill_template.get("duration"), # 持續回合
        "damage": skill_template.get("damage"),   # 額外傷害或治療量 (非 DoT)
        "recoilDamage": skill_template.get("recoilDamage")
    }
    return new_skill_instance

def _generate_story_from_library(
    monster_name: str,
    game_configs: GameConfigs,
    duration_percentage: float,
    skill_updates_log: List[str],
    items_obtained: List[Dict],
    learned_new_skill_template: Optional[Skill],
    training_location: str
) -> str:
    """從故事庫中生成組合式冒險故事。"""
    story_library = game_configs.get("cultivation_stories", {})
    if not story_library:
        return f"{monster_name} 結束了一次紮實的修煉，感覺自己又變強了一些。"

    # 確定時間階段
    if duration_percentage <= 0.25: tier_key = "tier_25"
    elif duration_percentage <= 0.5: tier_key = "tier_50"
    elif duration_percentage <= 0.75: tier_key = "tier_75"
    else: tier_key = "tier_100"

    # 確定事件結果
    if learned_new_skill_template and items_obtained: outcome_key = "item_and_new_skill"
    elif learned_new_skill_template: outcome_key = "new_skill_learned"
    elif items_obtained: outcome_key = "item_found"
    else: outcome_key = "base_story"

    # 安全地獲取故事庫內容，如果特定地點或階段不存在，則使用預設
    location_stories = story_library.get(training_location, story_library.get("gaia", {}))
    tier_stories = location_stories.get(tier_key, location_stories.get("tier_25", {}))

    story_parts = []
    
    # 組合故事
    if outcome_key == "base_story":
        base_templates = tier_stories.get("base_story", ["{monster_name} 順利地完成了修煉，沒有發生特別的事情。"])
        if base_templates:
            story_parts.append(random.choice(base_templates))
    else:
        opening_templates = tier_stories.get("opening", [])
        event_templates = tier_stories.get("event", {}).get(outcome_key, [])
        closing_templates = tier_stories.get("closing", [])

        if opening_templates: story_parts.append(random.choice(opening_templates))
        if event_templates: story_parts.append(random.choice(event_templates))
        if closing_templates: story_parts.append(random.choice(closing_templates))

    if not story_parts:
        return f"{monster_name} 的修煉充滿了無法言喻的經歷。"

    # 替換佔位符
    final_story = " ".join(story_parts)
    
    # 準備替換用的字串
    item_list_str = "、".join([item.get('name', '神秘碎片') for item in items_obtained]) if items_obtained else "神秘物品"
    new_skill_name_str = learned_new_skill_template.get('name', '神秘技能') if learned_new_skill_template else "新招式"
    trained_skills_list = [log.split("'")[1] for log in skill_updates_log if "技能" in log and "領悟" not in log]
    trained_skills_str = "、".join(trained_skills_list) or "各種技巧"

    return final_story.format(
        monster_name=monster_name,
        item_list=item_list_str,
        new_skill_name=new_skill_name_str,
        trained_skills=trained_skills_str
    )


# --- 修煉與技能成長服務 ---
def complete_cultivation_service(
    player_id: str,
    monster_id: str,
    duration_seconds: int,
    game_configs: GameConfigs
) -> Optional[Dict[str, Any]]:
    """完成怪獸修煉，計算經驗、潛在新技能、數值成長和物品拾獲。"""
    monster_cultivation_services_logger.info(f"--- [Cultivation Service] Received request for monster_id: {monster_id}")
    player_data = get_player_data_service(player_id, None, game_configs) 
    if not player_data or not player_data.get("farmedMonsters"):
        monster_cultivation_services_logger.error(f"完成修煉失敗：找不到玩家 {player_id} 或其無怪獸。")
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。", "status_code": 404}

    monster_to_update: Optional[Monster] = None
    monster_idx = -1
    
    monster_cultivation_services_logger.info(f"--- [Cultivation Service] Searching for monster in farm of {len(player_data.get('farmedMonsters', []))} monsters.")
    for idx, m in enumerate(player_data["farmedMonsters"]):
        monster_cultivation_services_logger.info(f"--- [Cultivation Service] Checking monster at index {idx} with ID: {m.get('id')}")
        if m.get("id") == monster_id:
            monster_to_update = m
            monster_idx = idx
            monster_cultivation_services_logger.info(f"--- [Cultivation Service] Match found! Monster data: {monster_to_update}")
            break

    if not monster_to_update or monster_idx == -1:
        monster_cultivation_services_logger.error(f"完成修煉失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。", "status_code": 404}

    # 獲取並重置修煉狀態
    training_location = monster_to_update.get("farmStatus", {}).get("trainingLocation", "gaia") # 先獲取地點
    if not monster_to_update.get("farmStatus"): monster_to_update["farmStatus"] = {}
    monster_to_update["farmStatus"]["isTraining"] = False
    monster_to_update["farmStatus"]["trainingStartTime"] = None
    monster_to_update["farmStatus"]["trainingDuration"] = None
    monster_to_update["farmStatus"]["trainingLocation"] = None

    cultivation_cfg: CultivationConfig = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["cultivation_config"]) # type: ignore
    
    skill_updates_log: List[str] = []
    items_obtained: List[DNAFragment] = []
    learned_new_skill_template: Optional[Skill] = None
    
    max_duration = game_configs.get("value_settings", {}).get("max_cultivation_time_seconds", 3600)
    duration_percentage = duration_seconds / max_duration if max_duration > 0 else 0

    if duration_percentage < 0.01:
        skill_updates_log.append("沒有任何成長。")
    else:
        monster_cultivation_services_logger.info(f"開始為怪獸 {monster_to_update.get('nickname')} 結算修煉成果。時長: {duration_seconds}秒。")
        
        # 1. 技能經驗與升級
        current_skills: List[Skill] = monster_to_update.get("skills", [])
        exp_gain_min, exp_gain_max = cultivation_cfg.get("skill_exp_gain_range", (15,75))
        max_skill_lvl = cultivation_cfg.get("max_skill_level", 10)
        exp_multiplier = cultivation_cfg.get("skill_exp_base_multiplier", 100)
        for skill in current_skills:
            if skill.get("level", 1) >= max_skill_lvl: continue
            exp_gained = random.randint(exp_gain_min, exp_gain_max) + int(duration_seconds / 10)
            skill["current_exp"] = skill.get("current_exp", 0) + exp_gained
            while skill.get("level", 1) < max_skill_lvl and skill.get("current_exp", 0) >= skill.get("exp_to_next_level", 9999):
                skill["current_exp"] -= skill.get("exp_to_next_level", 9999)
                skill["level"] = skill.get("level", 1) + 1
                skill["exp_to_next_level"] = _calculate_exp_to_next_level(skill["level"], exp_multiplier)
                skill_updates_log.append(f"🎉 技能 '{skill.get('name')}' 等級提升至 {skill.get('level')}！")
        monster_to_update["skills"] = current_skills

        # 2. 領悟新技能
        actual_new_skill_chance = cultivation_cfg.get("new_skill_chance", 0.1) * (1 + duration_percentage)
        if random.random() < actual_new_skill_chance:
            monster_elements: List[ElementTypes] = monster_to_update.get("elements", ["無"])
            all_skills_db: Dict[ElementTypes, List[Skill]] = game_configs.get("skills", {})
            potential_new_skills: List[Skill] = []
            current_skill_names = {s.get("name") for s in current_skills}
            for el in monster_elements: potential_new_skills.extend(all_skills_db.get(el, []))
            if "無" not in monster_elements and "無" in all_skills_db: potential_new_skills.extend(all_skills_db.get("無", []))
            learnable_skills = [s for s in potential_new_skills if s.get("name") not in current_skill_names]
            if learnable_skills:
                rarity_bias = cultivation_cfg.get("new_skill_rarity_bias", {})
                biased_skills_pool = []
                for skill_template in learnable_skills:
                    skill_rarity = skill_template.get("rarity", "普通") # type: ignore
                    bias_factor = rarity_bias.get(skill_rarity, 0.0) # type: ignore
                    biased_skills_pool.extend([skill_template] * int(bias_factor * 100))
                
                if not biased_skills_pool: biased_skills_pool = learnable_skills
                learned_new_skill_template = random.choice(biased_skills_pool)
                skill_updates_log.append(f"🌟 怪獸領悟了新技能：'{learned_new_skill_template.get('name')}' (等級1)！")

        # 3. 基礎數值成長
        stat_divisor = cultivation_cfg.get("stat_growth_duration_divisor", 900)
        growth_chances = max(1, math.floor(duration_seconds / stat_divisor))
        
        location_configs = game_configs.get("cultivation_config", {}).get("location_biases", {}) # type: ignore
        current_location_bias = location_configs.get(training_location, {}) # type: ignore
        default_stat_growth_weights = cultivation_cfg.get("stat_growth_weights", {})
        growth_weights_map = current_location_bias.get("stat_growth_weights", default_stat_growth_weights) # type: ignore
        
        monster_primary_element = monster_to_update.get("elements", ["無"])[0]
        element_bias_list = current_location_bias.get("element_bias", []) # type: ignore
        
        final_growth_weights = {**growth_weights_map}
        if monster_primary_element in element_bias_list:
            for stat_key in final_growth_weights:
                final_growth_weights[stat_key] = int(final_growth_weights[stat_key] * 1.2)

        if final_growth_weights and sum(final_growth_weights.values()) > 0:
            stats_pool = list(final_growth_weights.keys())
            weights = list(final_growth_weights.values())
            
            cultivation_gains = monster_to_update.get("cultivation_gains", {})
            if not isinstance(cultivation_gains, dict): cultivation_gains = {}

            for _ in range(growth_chances):
                chosen_stat = random.choices(stats_pool, weights=weights, k=1)[0]
                gain_amount = random.randint(1, 2)
                if chosen_stat in ['hp', 'mp']:
                    max_stat_key = f'initial_max_{chosen_stat}'
                    monster_to_update[max_stat_key] = monster_to_update.get(max_stat_key, 0) + gain_amount
                else:
                    monster_to_update[chosen_stat] = monster_to_update.get(chosen_stat, 0) + gain_amount
                cultivation_gains[chosen_stat] = cultivation_gains.get(chosen_stat, 0) + gain_amount
                skill_updates_log.append(f"💪 基礎能力 '{chosen_stat.upper()}' 潛力提升了 {gain_amount} 點！")
            monster_to_update["cultivation_gains"] = cultivation_gains
            
        if not any(log.startswith("💪") for log in skill_updates_log):
            skill_updates_log.append("這趟試煉基礎數值沒有提升。")

        # 4. 拾獲DNA碎片
        actual_dna_find_chance = cultivation_cfg.get("dna_find_chance", 0.5) * (1 + duration_percentage)
        if random.random() < actual_dna_find_chance:
            dna_find_divisor = cultivation_cfg.get("dna_find_duration_divisor", 1200)
            num_items = 1 + math.floor(duration_seconds / dna_find_divisor)
            monster_rarity: RarityNames = monster_to_update.get("rarity", "普通")
            loot_table = cultivation_cfg.get("dna_find_loot_table", {}).get(monster_rarity, {"普通": 1.0})
            all_dna_templates = game_configs.get("dna_fragments", [])
            monster_elements = monster_to_update.get("elements", ["無"])
            
            dna_pool = []
            if element_bias_list: dna_pool = [dna for dna in all_dna_templates if dna.get("type") in element_bias_list]
            if not dna_pool: dna_pool = [dna for dna in all_dna_templates if dna.get("type") in monster_elements]
            if not dna_pool: dna_pool = all_dna_templates
                
            for _ in range(min(num_items, len(dna_pool))):
                if not dna_pool or not loot_table: break
                rarity_pool, rarity_weights = zip(*loot_table.items())
                chosen_rarity = random.choices(rarity_pool, weights=rarity_weights, k=1)[0]
                quality_pool = [dna for dna in dna_pool if dna.get("rarity") == chosen_rarity]
                if quality_pool: items_obtained.append(random.choice(quality_pool))
    
    # 5. 生成修煉故事 (從故事庫)
    monster_name_for_story = monster_to_update.get('nickname', '一隻怪獸')
    monster_cultivation_services_logger.info(f"--- [Cultivation Service] Generating story for monster_name: '{monster_name_for_story}'")
    adventure_story = _generate_story_from_library(
        monster_name=monster_name_for_story,
        game_configs=game_configs,
        duration_percentage=duration_percentage,
        skill_updates_log=skill_updates_log,
        items_obtained=items_obtained,
        learned_new_skill_template=learned_new_skill_template,
        training_location=training_location
    )

    # 6. 重新計算總評價 (使用更新後的基礎數值)
    rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"]
    current_hp_for_score = monster_to_update.get("initial_max_hp", 0)
    current_mp_for_score = monster_to_update.get("initial_max_mp", 0)
    current_attack = monster_to_update.get("attack", 0)
    current_defense = monster_to_update.get("defense", 0)
    current_speed = monster_to_update.get("speed", 0)
    current_crit = monster_to_update.get("crit", 0)
    
    monster_to_update["score"] = (current_hp_for_score // 10) + \
                                   (current_mp_for_score // 10) + \
                                   current_attack + \
                                   current_defense + \
                                   (current_speed // 2) + \
                                   (current_crit * 2) + \
                                   (len(monster_to_update.get("skills",[])) * 15) + \
                                   (rarity_order.index(monster_to_update.get("rarity","普通")) * 30)
    
    # 7. 將修煉總結加入活動紀錄
    log_message_parts = [f"修煉時間：{duration_seconds}s"]
    growth_summary = [log for log in skill_updates_log if log.startswith("🎉") or log.startswith("🌟") or log.startswith("💪")]
    log_message_parts.append(f"成長資訊：{', '.join(growth_summary) if growth_summary else '無'}")
    if items_obtained:
        item_names = [f"{i+1}.{item.get('name')}" for i, item in enumerate(items_obtained)]
        log_message_parts.append(f"撿拾物品：{' '.join(item_names)}")
    else:
        log_message_parts.append("撿拾物品：無")
    
    new_log_entry: MonsterActivityLogEntry = {
        "time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "message": "\n".join(log_message_parts)
    }
    if "activityLog" not in monster_to_update: monster_to_update["activityLog"] = []
    monster_to_update["activityLog"].insert(0, new_log_entry)
    
    # 8. 確保修煉後 HP/MP 為滿值
    monster_to_update["hp"] = monster_to_update.get("initial_max_hp", 0)
    monster_to_update["mp"] = monster_to_update.get("initial_max_mp", 0)
                                   
    player_data["farmedMonsters"][monster_idx] = monster_to_update
    
    if save_player_data_service(player_id, player_data):
        return {
            "success": True,
            "updated_monster": monster_to_update,
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
    monster_rarity_data: RarityDetail = all_rarities_db.get(monster_rarity_key, DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["rarities"]["COMMON"]) # type: ignore

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

    if save_player_data_service(player_id, player_data):
        monster_cultivation_services_logger.info(f"怪獸 {monster_id} 的技能已在服務層更新（等待路由層儲存）。")
        return player_data
    else:
        monster_cultivation_services_logger.error(f"更新怪獸技能後儲存玩家 {player_id} 資料失敗。")
        return None
