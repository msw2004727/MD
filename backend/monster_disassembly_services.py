# backend/monster_disassembly_services.py
# 處理怪獸的分解服務

import random
import time
import logging
from typing import List, Dict, Optional, Any

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    PlayerGameData, Monster, DNAFragment, GameConfigs, ElementTypes, RarityNames
)
# 從 MD_firebase_config 導入 db 實例
from . import MD_firebase_config

monster_disassembly_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式，避免循環導入) ---
# 這裡只包含這個模組需要的預設值
DEFAULT_GAME_CONFIGS_FOR_DISASSEMBLY: GameConfigs = {
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
        "max_temp_backpack_slots": 9
    },
    "absorption_config": {},
    "cultivation_config": {},
    "elemental_advantage_chart": {},
}


# --- 怪獸分解服務 ---
def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, Any]]: # Changed return type to Dict[str, Any] as it can return success/error
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    if not MD_firebase_config.db:
        monster_disassembly_services_logger.error("Firestore 資料庫未初始化 (disassemble_monster_service 內部)。")
        return {"success": False, "error": "Firestore 資料庫未初始化。"}
    
    db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

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

    monster_disassembly_services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", DEFAULT_GAME_CONFIGS_FOR_DISASSEMBLY["dna_fragments"]) # type: ignore

    if constituent_ids:
        # 如果怪獸有構成 DNA (即由組合而來)，則返回這些 DNA
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        # 如果怪獸沒有構成 DNA (例如是初始怪獸或 NPC 怪獸)，則隨機返回一些 DNA
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        # 嘗試返回與怪獸稀有度和元素相關的 DNA
        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            # 如果沒有匹配元素和稀有度的，則只按稀有度篩選
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            # 如果還是沒有，則從所有 DNA 中隨機選取
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break # 避免在空列表上 random.choice
            returned_dna_templates.append(random.choice(eligible_templates))

    # 從玩家的農場中移除該怪獸
    player_data["farmedMonsters"].pop(monster_index) # type: ignore

    # *** 新增：檢查被放生的怪獸是否為出戰怪獸，如果是，則清除出戰設定 ***
    if player_data.get("selectedMonsterId") == monster_id:
        player_data["selectedMonsterId"] = None
        monster_disassembly_services_logger.info(f"玩家 {player_id} 放生了出戰怪獸，已將 selectedMonsterId 清除。")
    
    # 將分解出的 DNA 實例化並加入玩家庫存的 None 槽位，或臨時背包
    current_owned_dna = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_DISASSEMBLY["value_settings"]).get("max_inventory_slots", 12) # type: ignore

    # 注意：這裡的 DNA 實例化和添加到玩家數據的邏輯應該與前端的 addDnaToTemporaryBackpack/handleMoveIntoInventory 保持一致
    # 為了簡化，這裡將其視為直接添加到 player_data 中，並返回給路由層讓路由層處理保存。
    # 這部分邏輯可以考慮移到 player_services 或更通用的物品管理服務中。
    
    # 這裡只返回分解出的模板，路由層再處理添加到玩家庫存。
    monster_disassembly_services_logger.info(f"怪獸 {monster_to_disassemble.get('nickname')} 已在服務層標記分解，返回 {len(returned_dna_templates)} 個DNA模板。等待路由層處理。")
    
    return {
        "success": True,
        "message": f"怪獸 {monster_to_disassemble.get('nickname')} 已準備分解！",
        "returned_dna_templates": returned_dna_templates, # 返回模板，路由層會將其轉化為實例
        "updated_farmed_monsters": player_data["farmedMonsters"] # 返回更新後的農場列表
    }
