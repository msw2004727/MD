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
    (新增) 最後會用本地的 newbie_guide.json 和 titles.json 檔案覆蓋對應的內容。
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
            "HealthConditions": ("health_conditions", "conditions_list"),
            "NewbieGuide": ("newbie_guide", "guide_entries"),
            "NPCMonsters": ("npc_monsters", "monsters"),
            "NamingConstraints": ("naming_constraints", None),
            "ValueSettings": ("value_settings", None),
            "AbsorptionSettings": ("absorption_config", None),
            "CultivationSettings": ("cultivation_config", None),
            "ElementalAdvantageChart": ("elemental_advantage_chart", None),
            "CultivationStories": ("cultivation_stories", "story_library"),
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
                is_list_type = any(s in config_key for s in ['list', 'fragments', 'personalities', 'guide', 'conditions'])
                configs[config_key] = [] if is_list_type else {}
                config_logger.warning(f"在 Firestore 中找不到設定文檔：'{doc_name}'，已使用預設空值。")
        
        config_logger.info("Firestore 遠端設定已載入。")

    except Exception as e:
        config_logger.error(f"從 Firestore 載入遊戲設定時發生嚴重錯誤: {e}", exc_info=True)
    
    # --- 新增區塊：從本地檔案讀取並覆蓋新手指南 ---
    config_logger.info("正在嘗試從本地檔案系統載入新手指南...")
    try:
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        guide_path = os.path.join(data_dir, 'newbie_guide.json')
        
        if os.path.exists(guide_path):
            with open(guide_path, 'r', encoding='utf-8') as f:
                guide_data = json.load(f)
            # 無論 Firestore 中是否有資料，都用本地檔案的內容覆蓋
            configs['newbie_guide'] = guide_data
            config_logger.info("成功從本地檔案 newbie_guide.json 載入並覆蓋新手指南設定。")
        else:
            config_logger.warning(f"在本地找不到 newbie_guide.json，將使用 Firestore 中的版本（如果存在的話）。")
            if 'newbie_guide' not in configs:
                configs['newbie_guide'] = [] # 確保鍵存在
            
    except Exception as e:
        config_logger.error(f"從本地檔案載入新手指南時發生錯誤: {e}", exc_info=True)
        if 'newbie_guide' not in configs:
            configs['newbie_guide'] = [] # 確保鍵存在
    # --- 新增區塊結束 ---

    # --- 新增區塊：從本地檔案讀取並覆蓋稱號設定 ---
    config_logger.info("正在嘗試從本地檔案系統載入稱號設定...")
    try:
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        titles_path = os.path.join(data_dir, 'titles.json')
        
        if os.path.exists(titles_path):
            with open(titles_path, 'r', encoding='utf-8') as f:
                titles_data = json.load(f)
            # 無論 Firestore 中是否有資料，都用本地檔案的內容覆蓋
            configs['titles'] = titles_data
            config_logger.info("成功從本地檔案 titles.json 載入並覆蓋稱號設定。")
        else:
            config_logger.warning(f"在本地找不到 titles.json，將使用 Firestore 中的版本（如果存在的話）。")
            if 'titles' not in configs:
                configs['titles'] = [] # 確保鍵存在
            
    except Exception as e:
        config_logger.error(f"從本地檔案載入稱號設定時發生錯誤: {e}", exc_info=True)
        if 'titles' not in configs:
            configs['titles'] = [] # 確保鍵存在
    # --- 新增區塊結束 ---

    return configs
