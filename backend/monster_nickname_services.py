# backend/monster_nickname_services.py
# 處理怪獸的自定義暱稱管理

import logging
from typing import Optional, List, Dict, Any

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import Monster, PlayerGameData, GameConfigs, NamingConstraints, ElementTypes, PlayerStats
# 從 MD_firebase_config 導入 db 實例，因為這裡的服務需要與 Firestore 互動
from . import MD_firebase_config
# --- 新增: 從 utils_services 導入共用函式 ---
from .utils_services import generate_monster_full_nickname

monster_nickname_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式，避免循環導入) ---
# 這裡只包含這個模組需要的預設值
DEFAULT_GAME_CONFIGS_FOR_NICKNAME: GameConfigs = {
    "dna_fragments": [],
    "rarities": {},
    "skills": {},
    "personalities": [],
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
    "value_settings": {},
    "absorption_config": {},
    "cultivation_config": {},
    "elemental_advantage_chart": {},
}

# --- 移除: _generate_monster_full_nickname 函式已移至 utils_services.py ---


# --- 怪獸自定義暱稱服務 ---
def update_monster_custom_element_nickname_service(
    player_id: str,
    monster_id: str,
    new_custom_element_nickname: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """更新怪獸的自定義屬性名，並重新計算完整暱稱。"""
    if not MD_firebase_config.db:
        monster_nickname_services_logger.error("Firestore 資料庫未初始化 (update_monster_custom_element_nickname_service 內部)。")
        return None
    
    db = MD_firebase_config.db # 將局部變數 db 指向已初始化的實例

    if not player_data or not player_data.get("farmedMonsters"):
        monster_nickname_services_logger.error(f"更新屬性名失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_update: Optional[Monster] = None
    monster_idx = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_update = m
            monster_idx = idx
            break

    if not monster_to_update or monster_idx == -1:
        monster_nickname_services_logger.error(f"更新屬性名失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    naming_constraints: NamingConstraints = game_configs.get("naming_constraints", DEFAULT_GAME_CONFIGS_FOR_NICKNAME["naming_constraints"]) # type: ignore
    max_len = naming_constraints.get("max_element_nickname_len", 5)

    element_nicknames_map: Dict[ElementTypes, Any] = game_configs.get("element_nicknames", DEFAULT_GAME_CONFIGS_FOR_NICKNAME["element_nicknames"]) # type: ignore
    
    # --- 核心修改處 START ---
    if not new_custom_element_nickname:
        # 如果傳入空字串，代表使用者想重設為預設名稱
        monster_to_update["custom_element_nickname"] = None
        # 重新計算預設的 element_nickname_part
        primary_element: ElementTypes = monster_to_update.get("elements", ["無"])[0] # type: ignore
        monster_rarity = monster_to_update.get("rarity", "普通")
        rarity_specific_nicknames = element_nicknames_map.get(primary_element, {})
        possible_nicknames = rarity_specific_nicknames.get(monster_rarity, [primary_element])
        default_nickname_part = possible_nicknames[0] if possible_nicknames else primary_element
        
        monster_to_update["element_nickname_part"] = default_nickname_part
        element_nickname_part_for_full_name = default_nickname_part
    else:
        # 如果有新名稱，則更新 custom 和 part 兩個欄位
        processed_nickname = new_custom_element_nickname.strip()[:max_len]
        monster_to_update["custom_element_nickname"] = processed_nickname
        monster_to_update["element_nickname_part"] = processed_nickname
        element_nickname_part_for_full_name = processed_nickname
    # --- 核心修改處 END ---

    player_stats = player_data.get("playerStats", {})
    player_current_title_name = "新手"
    
    equipped_id = player_stats.get("equipped_title_id")
    owned_titles = player_stats.get("titles", [])

    if equipped_id:
        equipped_title_obj = next((t for t in owned_titles if t.get("id") == equipped_id), None)
        if equipped_title_obj:
            player_current_title_name = equipped_title_obj.get("name", "新手")
    elif owned_titles and isinstance(owned_titles[0], dict):
        player_current_title_name = owned_titles[0].get("name", "新手")

    monster_achievement = monster_to_update.get("title", "新秀") # type: ignore

    monster_to_update["nickname"] = generate_monster_full_nickname(
        player_current_title_name, monster_achievement, element_nickname_part_for_full_name, naming_constraints # type: ignore
    )

    player_data["farmedMonsters"][monster_idx] = monster_to_update # type: ignore
    monster_nickname_services_logger.info(f"怪獸 {monster_id} 的自定義屬性名已在服務層更新為 '{monster_to_update['custom_element_nickname']}'，完整暱稱更新為 '{monster_to_update['nickname']}'。等待路由層儲存。")
    return player_data
