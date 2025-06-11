# backend/MD_config_services.py
# 處理從本地檔案系統載入遊戲核心設定的服務

import logging
import os
import json
import csv
from typing import Dict, Any

# 從 MD_models 導入 GameConfigs 型別提示
from .MD_models import GameConfigs

config_logger = logging.getLogger(__name__)

def load_all_game_configs_from_local_files() -> GameConfigs:
    """
    從本地 'backend/data/' 資料夾載入所有遊戲設定檔案，
    並將它們組合成一個符合 GameConfigs 型別的字典。
    """
    config_logger.info("開始從本地檔案系統載入遊戲設定...")
    configs: Dict[str, Any] = {}
    
    # 獲取 data 資料夾的絕對路徑
    data_dir = os.path.join(os.path.dirname(__file__), 'data')

    # 定義要載入的檔案與其在最終設定字典中的鍵名
    # 格式: (檔名, 設定鍵名, 'list' 或 'dict' 或 'object_in_key', [可選] 提取的子鍵名)
    files_to_load = [
        ("dna_fragments.json", "dna_fragments", 'list_in_key', "all_fragments"),
        ("skills.json", "skills", 'dict_in_key', "skill_database"),
        ("personalities.csv", "personalities", 'csv_in_key', "types"),
        ("cultivation_stories.json", "cultivation_stories", 'dict_in_key', "story_library"),
        ("health_conditions.json", "health_conditions", 'list_in_key', "conditions_list"),
        ("newbie_guide.json", "newbie_guide", 'list_in_key', "guide_entries"),
        ("npc_monsters.json", "npc_monsters", 'list_in_key', "monsters"),
        ("rarities.json", "rarities", 'dict_in_key', "dna_rarities"),
        ("titles.json", "titles", 'list_in_key', "player_titles"),
        ("monster_achievements_list.json", "monster_achievements_list", 'list_in_key', "achievements"),
        ("element_nicknames.json", "element_nicknames", 'dict_in_key', "nicknames"),
        # 以下檔案直接對應整個檔案內容
        ("naming_constraints.json", "naming_constraints", 'direct_dict', None),
        ("value_settings.json", "value_settings", 'direct_dict', None),
        ("absorption_settings.json", "absorption_config", 'direct_dict', None),
        ("cultivation_settings.json", "cultivation_config", 'direct_dict', None),
        ("elemental_advantage_chart.json", "elemental_advantage_chart", 'direct_dict', None),
    ]

    for filename, config_key, load_type, field_name in files_to_load:
        file_path = os.path.join(data_dir, filename)
        if not os.path.exists(file_path):
            is_list = 'list' in load_type
            configs[config_key] = [] if is_list else {}
            config_logger.warning(f"在本地找不到設定檔：'{filename}'，已使用預設空值。")
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                if load_type == 'csv_in_key':
                    # 處理 CSV 檔案 (目前只有 personalities.csv)
                    reader = csv.DictReader(f)
                    csv_data = []
                    skill_categories = ["近戰", "遠程", "魔法", "輔助", "物理", "特殊", "變化", "其他"]
                    for row in reader:
                        skill_prefs = {key: float(row.get(key, 1.0)) for key in skill_categories}
                        personality = {
                            "name": row.get("name", "未知"),
                            "description": row.get("description", ""),
                            "colorDark": row.get("colorDark", "#FFFFFF"),
                            "colorLight": row.get("colorLight", "#000000"),
                            "skill_preferences": skill_prefs
                        }
                        csv_data.append(personality)
                    configs[config_key] = csv_data
                else:
                    # 處理 JSON 檔案
                    data = json.load(f)
                    if field_name:
                        configs[config_key] = data.get(field_name, [] if 'list' in load_type else {})
                    else:
                        configs[config_key] = data
            config_logger.info(f"成功從 '{filename}' 載入設定。")
        except Exception as e:
            is_list = 'list' in load_type
            configs[config_key] = [] if is_list else {}
            config_logger.error(f"從本地檔案 '{filename}' 載入設定時發生錯誤: {e}", exc_info=True)

    return configs
