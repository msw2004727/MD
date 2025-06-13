# backend/monster_absorption_services.py
# 處理怪獸的戰鬥後吸收服務

import random
import time
import logging
from typing import List, Dict, Optional, Any, Literal
import copy # 用於深拷貝怪獸數據

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    PlayerGameData, Monster, DNAFragment, GameConfigs, ElementTypes, RarityNames,
    AbsorptionConfig, ValueSettings, PlayerOwnedDNA
)
# 從 MD_firebase_config 導入 db 實例
from . import MD_firebase_config
# 從 utils_services 導入 calculate_dna_value (如果它被定義為通用輔助函數的話)
# 或者如果 calculate_dna_value 僅在 healing/recharge 中使用，那麼就不要在這裡導入

monster_absorption_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式，避免循環導入) ---
# 這裡只包含這個模組需要的預設值
DEFAULT_GAME_CONFIGS_FOR_ABSORPTION: GameConfigs = {
    "dna_fragments": [], # 實際會從 game_configs 載入
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
        "element_value_factors": {},
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10,
        "max_monster_skills": 3,
        "max_battle_turns": 30,
        "max_inventory_slots": 12,
        "max_temp_backpack_slots": 9 # 需要 max_temp_backpack_slots
    },
    "absorption_config": { # 需要所有吸收相關設定
        "base_stat_gain_factor": 0.03, "score_diff_exponent": 0.3,
        "max_stat_gain_percentage": 0.015, "min_stat_gain": 1,
        "dna_extraction_chance_base": 0.75,
        "dna_extraction_rarity_modifier": {"普通": 1.0, "稀有": 0.9} # type: ignore
    },
    "cultivation_config": {},
    "elemental_advantage_chart": {},
}


# --- 戰鬥後吸收服務 ---
def absorb_defeated_monster_service(
    player_id: str,
    winning_monster_id: str,
    defeated_monster_snapshot: Monster,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, Any]]:
    """處理勝利怪獸吸收被擊敗怪獸的邏輯。"""
    if not MD_firebase_config.db:
        monster_absorption_services_logger.error("Firestore 資料庫未初始化 (absorb_defeated_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

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

    monster_absorption_services_logger.info(f"玩家 {player_id} 的怪獸 {winning_monster.get('nickname')} 開始吸收 {defeated_monster_snapshot.get('nickname')}。")

    absorption_cfg: AbsorptionConfig = game_configs.get("absorption_config", DEFAULT_GAME_CONFIGS_FOR_ABSORPTION["absorption_config"]) # type: ignore
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", DEFAULT_GAME_CONFIGS_FOR_ABSORPTION["dna_fragments"]) # type: ignore
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
                    monster_absorption_services_logger.info(f"成功提取DNA模板: {dna_template.get('name')}") # type: ignore

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
            monster_absorption_services_logger.info(f"怪獸 {winning_monster_id} 的 {stat_key} 成長了 {gain}點。")

    player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore

    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_ABSORPTION["value_settings"]).get("max_inventory_slots", 12) # type: ignore

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
            max_temp_backpack_slots = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_ABSORPTION["value_settings"]).get("max_temp_backpack_slots", 9) # type: ignore
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
                monster_absorption_services_logger.info(f"玩家 {player_id} 的 DNA 庫存已滿，DNA '{owned_dna_item.get('name')}' 已放入臨時背包。")
            else:
                monster_absorption_services_logger.warning(f"玩家 {player_id} 的 DNA 庫存和臨時背包都已滿，DNA '{owned_dna_item.get('name')}' 已被丟棄。")
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