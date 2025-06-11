# backend/monster_nickname_services.py
# 處理怪獸的自定義暱稱管理

import logging
from typing import Optional, List, Dict, Any

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import Monster, PlayerGameData, GameConfigs, NamingConstraints, ElementTypes, PlayerStats
# 從 MD_firebase_config 導入 db 實例，因為這裡的服務需要與 Firestore 互動
from . import MD_firebase_config

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

# --- 輔助函式 ---
# 這個輔助函數從 monster_combination_services.py 移過來，因為它也用於怪獸暱稱更新
def _generate_monster_full_nickname(player_title: str, monster_achievement: str, element_nickname_part: str, naming_constraints: NamingConstraints) -> str:
    """根據玩家稱號、怪獸成就和元素暱稱部分生成怪獸的完整暱稱。"""
    pt = player_title[:naming_constraints.get("max_player_title_len", 5)]
    ma = monster_achievement[:naming_constraints.get("max_monster_achievement_len", 5)]
    en = element_nickname_part[:naming_constraints.get("max_element_nickname_len", 5)]
    full_name = f"{pt}{ma}{en}"
    return full_name[:naming_constraints.get("max_monster_full_nickname_len", 15)]


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

    element_nicknames_map: Dict[ElementTypes, str] = game_configs.get("element_nicknames", DEFAULT_GAME_CONFIGS_FOR_NICKNAME["element_nicknames"]) # type: ignore
    primary_element: ElementTypes = monster_to_update.get("elements", ["無"])[0] # type: ignore

    if not new_custom_element_nickname:
        monster_to_update["custom_element_nickname"] = None
        element_nickname_part_for_full_name = element_nicknames_map.get(primary_element, primary_element) # type: ignore
    else:
        processed_nickname = new_custom_element_nickname.strip()[:max_len]
        monster_to_update["custom_element_nickname"] = processed_nickname
        element_nickname_part_for_full_name = processed_nickname

    # --- 修改：更安全地獲取玩家稱號 ---
    player_stats = player_data.get("playerStats", {})
    player_current_title = "新手"  # 預設後備稱號
    
    equipped_id = player_stats.get("equipped_title_id")
    owned_titles = player_stats.get("titles", [])

    if owned_titles and isinstance(owned_titles, list):
        found_title_obj = None
        # 優先尋找已裝備的稱號
        if equipped_id:
            found_title_obj = next((t for t in owned_titles if isinstance(t, dict) and t.get("id") == equipped_id), None)
        
        # 如果找不到已裝備的，或根本沒有設定已裝備ID，則使用列表中的第一個
        if not found_title_obj and owned_titles:
            found_title_obj = owned_titles[0] if isinstance(owned_titles[0], dict) else None
            
        # 從稱號物件中獲取名稱
        if found_title_obj and found_title_obj.get("name"):
            player_current_title = found_title_obj["name"]
    
    monster_achievement = monster_to_update.get("title", "新秀")

    monster_to_update["nickname"] = _generate_monster_full_nickname(
        player_current_title, monster_achievement, element_nickname_part_for_full_name, naming_constraints
    )
    # --- 修改結束 ---

    player_data["farmedMonsters"][monster_idx] = monster_to_update # type: ignore
    monster_nickname_services_logger.info(f"怪獸 {monster_id} 的自定義屬性名已在服務層更新為 '{monster_to_update['custom_element_nickname']}'，完整暱稱更新為 '{monster_to_update['nickname']}'。等待路由層儲存。")
    return player_data
