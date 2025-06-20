# backend/MD_config_services.py
# 處理從 Firestore 載入遊戲核心設定的服務

import logging
from typing import Dict, Any
import os
import json

# 從 MD_firebase_config 導入 db 實例
from . import MD_firebase_config
# 從 MD_models 導入 GameConfigs 型別提示
from .MD_models import GameConfigs

config_logger = logging.getLogger(__name__)

def load_all_game_configs_from_firestore() -> GameConfigs:
    """
    從 Firestore 的 MD_GameConfigs 集合中載入所有遊戲設定文檔，
    並將它們組合成一個符合 GameConfigs 型別的字典。
    """
    db = MD_firebase_config.db
    if not db:
        config_logger.error("Firestore 資料庫未初始化，無法載入遊戲設定。")
        return {}  # 返回空字典或預設設定

    config_logger.info("開始從 Firestore 載入遊戲設定...")
    configs: Dict[str, Any] = {}
    try:
        config_collection_ref = db.collection('MD_GameConfigs')

        doc_map = {
            "DNAFragments": ("dna_fragments", "all_fragments"),
            "Rarities": ("rarities", "dna_rarities"),
            "Skills": ("skills", "skill_database"),
            "Personalities": ("personalities", "types"),
            "Titles": ("titles", "player_titles"),
            "MonsterAchievementsList": ("monster_achievements_list", "achievements"),
            "ElementNicknames": ("element_nicknames", "nicknames"),
            "StatusEffects": ("health_conditions", "effects_list"),
            "NewbieGuide": ("newbie_guide", "guide_entries"),
            "NPCMonsters": ("npc_monsters", "monsters"),
            "NamingConstraints": ("naming_constraints", None),
            "ValueSettings": ("value_settings", None),
            "AbsorptionSettings": ("absorption_config", None),
            "CultivationSettings": ("cultivation_config", None),
            "ElementalAdvantageChart": ("elemental_advantage_chart", None),
            "CultivationStories": ("cultivation_stories", "story_library"),
            "ChampionGuardians": ("champion_guardians", "guardians"),
            "BattleHighlights": ("battle_highlights", None), # 新增：讀取戰鬥亮點設定
        }

        for doc_name, (config_key, field_name) in doc_map.items():
            doc_ref = config_collection_ref.document(doc_name)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                if field_name and data:
                    configs[config_key] = data.get(field_name, {})
                elif data:
                    configs[config_key] = data
            else:
                # 如果是技能設定且資料庫中不存在，嘗試從本地檔案回退
                if doc_name == "Skills":
                    config_logger.warning(f"在 Firestore 中找不到設定文檔：'{doc_name}'，嘗試從本地檔案回退。")
                    data_dir = os.path.join(os.path.dirname(__file__), 'data')
                    skills_dir = os.path.join(data_dir, 'skills')
                    
                    if os.path.exists(skills_dir):
                        skill_database_data = {}
                        element_map = {
                            "fire": "火", "water": "水", "wood": "木", "gold": "金", "earth": "土",
                            "light": "光", "dark": "暗", "poison": "毒", "wind": "風", "none": "無", "mix": "混"
                        }
                        for filename in os.listdir(skills_dir):
                            if filename.endswith('.json'):
                                element_en = filename[:-5]
                                element_zh = element_map.get(element_en)
                                if element_zh:
                                    with open(os.path.join(skills_dir, filename), 'r', encoding='utf-8') as f:
                                        skill_database_data[element_zh] = json.load(f)
                        
                        configs[config_key] = skill_database_data
                        config_logger.info(f"成功從本地 'skills' 資料夾回退載入技能資料。")
                    else:
                        configs[config_key] = {}
                        config_logger.error(f"Firestore 和本地 'skills' 資料夾均找不到技能資料。")
                else:
                    is_list_type = any(s in config_key for s in ['list', 'fragments', 'personalities', 'guide', 'conditions'])
                    configs[config_key] = [] if is_list_type else {}
                    config_logger.warning(f"在 Firestore 中找不到設定文檔：'{doc_name}'，已使用預設空值。")
        
        config_logger.info("Firestore 遠端設定已成功載入。")

    except Exception as e:
        config_logger.error(f"從 Firestore 載入遊戲設定時發生嚴重錯誤: {e}", exc_info=True)
    
    return configs
