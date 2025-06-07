# backend/monster_cultivation_services.py
# 處理怪獸的修煉與技能成長服務

import random
import logging
from typing import List, Dict, Optional, Union, Tuple, Any

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    PlayerGameData, Monster, Skill, RarityDetail, GameConfigs, ElementTypes, RarityNames,
    CultivationConfig, ValueSettings, Personality, HealthCondition
)
# 從 MD_firebase_config 導入 db 實例
from . import MD_firebase_config
# 從 player_services 導入 get_player_data_service，因為修煉結算時可能需要重新獲取玩家數據
from .player_services import get_player_data_service

monster_cultivation_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式，避免循環導入) ---
# 這裡只包含這個模組需要的預設值
DEFAULT_GAME_CONFIGS_FOR_CULTIVATION: GameConfigs = {
    "dna_fragments": [], # 實際會從 game_configs 載入
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
    "value_settings": { # 需要 max_monster_skills
        "element_value_factors": {},
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10,
        "max_monster_skills": 3,
        "max_battle_turns": 30,
        "max_inventory_slots": 12,
        "max_temp_backpack_slots": 9
    },
    "absorption_config": {},
    "cultivation_config": { # 需要所有修煉相關設定
        "skill_exp_base_multiplier": 100, "new_skill_chance": 0.1,
        "skill_exp_gain_range": (10,30), "max_skill_level": 5,
        "new_skill_rarity_bias": {"普通": 0.6, "稀有": 0.3, "菁英": 0.1} # type: ignore
    },
    "elemental_advantage_chart": {},
}


# --- 輔助函式 (僅用於此模組) ---
def _calculate_exp_to_next_level(level: int, base_multiplier: int) -> int:
    """計算升到下一級所需的經驗值。"""
    if level <= 0: level = 1
    return level * base_multiplier

def _get_skill_from_template(skill_template: Skill, game_configs: GameConfigs, monster_rarity_data: RarityDetail, target_level: Optional[int] = None) -> Skill:
    """根據技能模板、遊戲設定和怪獸稀有度來實例化一個技能。
    這個函數在這裡重新定義或從 utils_services 導入
    如果它在 monster_combination_services 也被用到，則放在 utils_services 更合適。
    為了避免循環依賴，我們將其重新定義為內部函數。
    """
    cultivation_cfg = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["cultivation_config"])

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


# --- 修煉與技能成長服務 ---
def complete_cultivation_service(
    player_id: str,
    monster_id: str,
    duration_seconds: int,
    game_configs: GameConfigs
) -> Optional[Dict[str, Any]]:
    """完成怪獸修煉，計算經驗、潛在新技能等。"""
    if not MD_firebase_config.db:
        monster_cultivation_services_logger.error("Firestore 資料庫未初始化 (complete_cultivation_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。", "status_code": 500}
    
    db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

    # 從 player_services 獲取 player_data
    # 這裡需要呼叫 get_player_data_service，但其參數需要 nickname_from_auth (這裡沒有)
    # 為了簡化，暫時將 nickname_from_auth 設為 None，讓 get_player_data_service 自行處理
    # 但最佳實踐是從路由層傳遞過來
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

    if not monster_to_update.get("farmStatus"):
        monster_to_update["farmStatus"] = {"active": False, "completed": False, "isBattling": False, "isTraining": False, "boosts": {}} # type: ignore

    monster_to_update["farmStatus"]["isTraining"] = False # type: ignore
    monster_to_update["farmStatus"]["trainingStartTime"] = None # type: ignore
    monster_to_update["farmStatus"]["trainingDuration"] = None # type: ignore
    monster_to_update["farmStatus"]["type"] = "idle" # 修煉完成，進入發呆狀態

    cultivation_cfg: CultivationConfig = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["cultivation_config"]) # type: ignore
    monster_cultivation_services_logger.info(f"開始為怪獸 {monster_to_update.get('nickname')} (ID: {monster_id}) 結算修煉成果。時長: {duration_seconds}秒。")

    skill_updates_log: List[str] = []
    current_skills: List[Skill] = monster_to_update.get("skills", []) # type: ignore

    exp_gain_min, exp_gain_max = cultivation_cfg.get("skill_exp_gain_range", (10,50)) # type: ignore
    max_skill_lvl = cultivation_cfg.get("max_skill_level", 7) # type: ignore
    exp_multiplier = cultivation_cfg.get("skill_exp_base_multiplier", 100) # type: ignore

    for skill in current_skills:
        if skill.get("level", 1) >= max_skill_lvl: # type: ignore
            skill_updates_log.append(f"技能 '{skill.get('name')}' 已達最高等級。")
            continue

        exp_gained = random.randint(exp_gain_min, exp_gain_max) + int(duration_seconds / 10)
        skill["current_exp"] = skill.get("current_exp", 0) + exp_gained # type: ignore
        skill_updates_log.append(f"技能 '{skill.get('name')}' 獲得 {exp_gained} 經驗值。")

        while skill.get("level", 1) < max_skill_lvl and \
              skill.get("current_exp", 0) >= skill.get("exp_to_next_level", _calculate_exp_to_next_level(skill.get("level",1), exp_multiplier)): # type: ignore

            current_level = skill.get("level", 1) # type: ignore
            exp_needed = skill.get("exp_to_next_level",9999) # type: ignore
            skill["current_exp"] = skill.get("current_exp", 0) - exp_needed # type: ignore
            skill["level"] = current_level + 1 # type: ignore
            skill["exp_to_next_level"] = _calculate_exp_to_next_level(skill["level"], exp_multiplier) # type: ignore
            skill_updates_log.append(f"🎉 技能 '{skill.get('name')}' 等級提升至 {skill.get('level')}！")

    monster_to_update["skills"] = current_skills # type: ignore

    learned_new_skill_template: Optional[Skill] = None
    if random.random() < cultivation_cfg.get("new_skill_chance", 0.08): # type: ignore
        monster_elements: List[ElementTypes] = monster_to_update.get("elements", ["無"]) # type: ignore
        all_skills_db: Dict[ElementTypes, List[Skill]] = game_configs.get("skills", DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["skills"]) # type: ignore

        potential_new_skills: List[Skill] = [] # type: ignore
        current_skill_names = {s.get("name") for s in current_skills}

        # 這裡需要遍歷所有元素，從 all_skills_db 中獲取技能
        for el_str_learn in monster_elements:
            el_learn: ElementTypes = el_str_learn # type: ignore
            potential_new_skills.extend(all_skills_db.get(el_learn, [])) # type: ignore
        # 如果怪獸沒有「無」屬性，但「無」屬性技能存在，則也考慮「無」屬性技能
        if "無" not in monster_elements and "無" in all_skills_db:
            potential_new_skills.extend(all_skills_db.get("無", [])) # type: ignore


        learnable_skills = [s_template for s_template in potential_new_skills if s_template.get("name") not in current_skill_names]

        if learnable_skills:
            # 根據稀有度偏好選擇新技能 (如果 new_skill_rarity_bias 存在)
            new_skill_rarity_bias = cultivation_cfg.get("new_skill_rarity_bias") # type: ignore
            
            # 創建一個加權列表
            weighted_learnable_skills = []
            for skill_template in learnable_skills:
                # 假設技能模板有 rarity 屬性，如果沒有，這裡需要安全處理或從別處獲取
                skill_rarity = skill_template.get("rarity", "普通") # type: ignore
                bias_factor = new_skill_rarity_bias.get(skill_rarity, 1.0) if new_skill_rarity_bias else 1.0 # type: ignore
                
                for _ in range(int(bias_factor * 100)): # 乘以100以處理小數權重
                    weighted_learnable_skills.append(skill_template)

            if weighted_learnable_skills:
                learned_new_skill_template = random.choice(weighted_learnable_skills)
                skill_updates_log.append(f"🌟 怪獸領悟了新技能：'{learned_new_skill_template.get('name')}' (等級1)！") # type: ignore
            else:
                monster_cultivation_services_logger.info(f"怪獸 {monster_id} 有機會領悟新技能，但沒有可學習的技能。")


    player_data["farmedMonsters"][monster_idx] = monster_to_update # type: ignore

    # 修煉完成後儲存玩家資料
    from .player_services import save_player_data_service # 在這裡導入，避免循環
    if save_player_data_service(player_id, player_data):
        return {
            "success": True,
            "monster_id": monster_id,
            "updated_monster_skills": monster_to_update.get("skills"),
            "learned_new_skill_template": learned_new_skill_template,
            "skill_updates_log": skill_updates_log,
            "message": "修煉完成！查看成果。",
            "items_obtained": [] # TODO: 添加修煉可能獲得的物品
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
    """替換或學習怪獸的技能。"""
    if not MD_firebase_config.db:
        monster_cultivation_services_logger.error("Firestore 資料庫未初始化 (replace_monster_skill_service 內部)。")
        return None
    
    db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

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

    current_skills: List[Skill] = monster_to_update.get("skills", []) # type: ignore
    max_monster_skills = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["value_settings"]).get("max_monster_skills", 3) # type: ignore

    monster_rarity_name: RarityNames = monster_to_update.get("rarity", "普通") # type: ignore
    all_rarities_db: Dict[str, RarityDetail] = game_configs.get("rarities", DEFAULT_GAME_CONFIGS_FOR_CULTIVATION["rarities"]) # type: ignore
    rarity_key_lookup = {data["name"]: key for key, data in all_rarities_db.items()} # type: ignore
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

    monster_to_update["skills"] = current_skills # type: ignore
    player_data["farmedMonsters"][monster_idx] = monster_to_update # type: ignore

    from .player_services import save_player_data_service # 在這裡導入，避免循環
    if save_player_data_service(player_id, player_data):
        monster_cultivation_services_logger.info(f"怪獸 {monster_id} 的技能已在服務層更新（等待路由層儲存）。")
        return player_data
    else:
        monster_cultivation_services_logger.error(f"更新怪獸技能後儲存玩家 {player_id} 資料失敗。")
        return None