# backend/monster_healing_services.py
# 處理怪獸的治療和充能服務

import logging
from typing import List, Dict, Optional, Union, Tuple, Literal, Any
import time
import math

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    PlayerGameData, PlayerStats, PlayerOwnedDNA,
    Monster, Skill, DNAFragment, RarityDetail, Personality,
    GameConfigs, ElementTypes, MonsterFarmStatus, MonsterAIDetails, MonsterResume,
    HealthCondition, AbsorptionConfig, CultivationConfig, SkillCategory, NamingConstraints,
    ValueSettings, RarityNames
)
# 從 MD_firebase_config 導入 db 實例
from . import MD_firebase_config
# --- 核心修改處 START ---
# 從共用函式庫導入感情值計算工具
from .utils_services import update_bond_with_diminishing_returns
# --- 核心修改處 END ---


monster_healing_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式，避免循環導入) ---
# 這裡只包含這個模組需要的預設值
DEFAULT_GAME_CONFIGS_FOR_HEALING: GameConfigs = {
    "dna_fragments": [],
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {},
    "personalities": [],
    "titles": [],
    "monster_achievements_list": [],
    "element_nicknames": {},
    "naming_constraints": {},
    "health_conditions": [],
    "newbie_guide": [],
    "npc_monsters": [],
    "value_settings": {
        "element_value_factors": {"火": 1.2, "水": 1.1, "無": 0.7, "混": 0.6},
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


# --- 輔助函式 (僅用於此模組，或可進一步拆分到 utils_services.py) ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    if not MD_firebase_config.db:
        monster_healing_services_logger.error("Firestore 資料庫未初始化 (calculate_dna_value 內部)。")
        return 0
    
    # db = MD_firebase_config.db # 不再需要，因為 db 已經在 module level 設置
    # 此處 db 僅用於語義化日誌，實際操作不依賴它

    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", DEFAULT_GAME_CONFIGS_FOR_HEALING["rarities"]) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_HEALING["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    monster_healing_services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)


# --- 怪獸治療與充能服務 ---
def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    if not MD_firebase_config.db:
        monster_healing_services_logger.error("Firestore 資料庫未初始化 (heal_monster_service 內部)。")
        return None
    
    db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        monster_healing_services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        monster_healing_services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    monster_healing_services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
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
            monster_healing_services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        # --- 核心修改處 START ---
        interaction_stats = monster_to_heal.setdefault("interaction_stats", {})
        interaction_stats["heal_count"] = interaction_stats.get("heal_count", 0) + 1
        
        # 改為呼叫共用的函式
        point_change = update_bond_with_diminishing_returns(interaction_stats, "heal", 1)

        if point_change > 0:
            monster_healing_services_logger.info(f"治療成功，感情值增加 {point_change} 點，目前為 {interaction_stats.get('bond_points', 0)}。")
        # --- 核心修改處 END ---
        
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        monster_healing_services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        monster_healing_services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def recharge_monster_with_dna_service(
    player_id: str,
    monster_id: str,
    dna_instance_id_to_consume: str,
    recharge_target: Literal["hp", "mp"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """使用指定的 DNA 碎片為怪獸充能 HP 或 MP。"""
    if not MD_firebase_config.db:
        monster_healing_services_logger.error("Firestore 資料庫未初始化 (recharge_monster_with_dna_service 內部)。")
        return None
    
    db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters") or not player_data.get("playerOwnedDNA"):
        monster_healing_services_logger.error(f"充能失敗：找不到玩家 {player_id} 或其無怪獸/DNA庫。")
        return None

    monster_to_recharge: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_recharge = m
            monster_index = idx
            break

    dna_to_consume: Optional[PlayerOwnedDNA] = None
    dna_index = -1
    for idx, dna in enumerate(player_data["playerOwnedDNA"]):
        if dna and dna.get("id") == dna_instance_id_to_consume: # 檢查 dna 是否為 None
            dna_to_consume = dna
            dna_index = idx
            break

    if not monster_to_recharge or not dna_to_consume:
        monster_healing_services_logger.error(f"充能失敗：找不到怪獸 {monster_id} 或 DNA {dna_instance_id_to_consume}。")
        return None

    dna_element: ElementTypes = dna_to_consume.get("type", "無") # type: ignore
    monster_elements: List[ElementTypes] = monster_to_recharge.get("elements", ["無"]) # type: ignore

    if dna_element not in monster_elements:
        monster_healing_services_logger.warning(f"充能失敗：DNA屬性 ({dna_element}) 與怪獸屬性 ({monster_elements}) 不符。")
        return player_data # 返回原始數據，不進行充能

    dna_value = calculate_dna_value(dna_to_consume, game_configs) # 使用模組內部的輔助函數
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_HEALING["value_settings"]) # type: ignore
    conversion_factor = value_settings.get("dna_recharge_conversion_factor", 0.1)
    amount_to_restore = int(dna_value * conversion_factor)

    if amount_to_restore <= 0:
        monster_healing_services_logger.info(f"DNA {dna_to_consume.get('name')}' 價值不足以充能。")
        return player_data

    target_stat_current_key: Literal["hp", "mp"] = recharge_target
    target_stat_max_key: Literal["initial_max_hp", "initial_max_mp"] = f"initial_max_{recharge_target}" # type: ignore

    current_val = monster_to_recharge.get(target_stat_current_key, 0) # type: ignore
    max_val = monster_to_recharge.get(target_stat_max_key, current_val + amount_to_restore) # type: ignore

    new_val = min(max_val, current_val + amount_to_restore) # type: ignore

    if new_val > current_val: # type: ignore
        monster_to_recharge[target_stat_current_key] = new_val # type: ignore
        monster_healing_services_logger.info(f"怪獸 {monster_id} 的 {recharge_target} 已恢復至 {new_val}。")
    else:
        monster_healing_services_logger.info(f"怪獸 {monster_id} 的 {recharge_target} 已滿或無變化。")
        return player_data # 返回原始數據，不進行充能

    # 修改點：將被消耗的 DNA 槽位設置為 None
    import random # 確保這裡也導入 random
    import time # 確保這裡也導入 time
    player_data["playerOwnedDNA"][dna_index] = None
    player_data["farmedMonsters"][monster_index] = monster_to_recharge # type: ignore

    monster_healing_services_logger.info(f"怪獸 {monster_id} 已使用DNA {dna_to_consume.get('name')} 充能 {recharge_target}（等待路由層儲存）。")
    return player_data
