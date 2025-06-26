# backend/MD_config_services.py
# 負責載入所有遊戲設定檔

import logging
from typing import Dict, Any
from . import MD_firebase_config

config_services_logger = logging.getLogger(__name__)

def load_all_game_configs_from_firestore() -> Dict[str, Any]:
    """
    從 Firestore 的 MD_GameConfigs 集合中載入所有遊戲設定。
    """
    db = MD_firebase_config.db
    if not db:
        config_services_logger.error("Firestore 資料庫未初始化，無法載入遊戲設定。")
        return {}

    config_services_logger.info("正在從 Firestore 載入遊戲核心設定...")
    configs: Dict[str, Any] = {}
    
    # 這個映射表定義了 Firestore 文件名、它在最終 configs 字典中對應的鍵名，以及需要提取的特定欄位
    doc_to_key_map = {
        "DNAFragments": ("dna_fragments", "all_fragments"),
        "Skills": ("skills", "skill_database"),
        "Personalities": ("personalities", "types"),
        "Titles": ("titles", "player_titles"),
        "NewbieGuide": ("newbie_guide", "guide_entries"),
        "StatusEffects": ("status_effects", "effects_list"),
        "ElementNicknames": ("element_nicknames", "nicknames"),
        "MonsterAchievementsList": ("monster_achievements_list", "achievements"),
        "CultivationStories": ("cultivation_stories", "story_library"),
        "ChampionGuardians": ("champion_guardians", "guardians"),
        # === 修改：確保讀取 islands 欄位 ===
        "AdventureIslands": ("adventure_islands", "islands"),
        "AdventureEvents": ("adventure_events", None),
        "AdventureBosses": ("adventure_bosses", None),
        "Rarities": ("rarities", "dna_rarities"),
        "NamingConstraints": ("naming_constraints", None),
        "ValueSettings": ("value_settings", None),
        "AbsorptionSettings": ("absorption_settings", None),
        "CultivationSettings": ("cultivation_settings", None),
        "ElementalAdvantageChart": ("elemental_advantage_chart", None),
        "BattleHighlights": ("battle_highlights", None),
        "AdventureSettings": ("adventure_settings", None),
        "AdventureGrowthSettings": ("adventure_growth_settings", None)
    }

    try:
        docs = db.collection('MD_GameConfigs').stream()
        firestore_data = {doc.id: doc.to_dict() for doc in docs}

        for doc_name, (config_key, field_name) in doc_to_key_map.items():
            if doc_name in firestore_data:
                doc_content = firestore_data[doc_name]
                if doc_content: 
                    if field_name:
                        configs[config_key] = doc_content.get(field_name, {})
                    else:
                        configs[config_key] = doc_content
            else:
                config_services_logger.warning(f"在 Firestore 的 MD_GameConfigs 中找不到文件: '{doc_name}'，將跳過此項設定。")

        config_services_logger.info("已成功從 Firestore 組合遊戲設定。")
        return configs

    except Exception as e:
        config_services_logger.error(f"從 Firestore 載入遊戲設定時發生嚴重錯誤: {e}", exc_info=True)
        return {}
