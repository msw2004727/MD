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
    修煉故事庫將從本地檔案系統覆蓋。
    """
    db = MD_firebase_config.db
    if not db:
        config_logger.error("Firestore 資料庫未初始化，無法載入遊戲設定。")
        return {}  # 返回空字典或預設設定

    config_logger.info("開始從 Firestore 載入遊戲設定...")
    configs: Dict[str, Any] = {}
    try:
        config_collection_ref = db.collection('MD_GameConfigs')

        # 定義 Firestore 文檔名稱與最終設定字典鍵名、以及資料欄位名的對應關係
        # 我們已移除 CultivationStories，因為將從本地檔案讀取
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
            # 以下文檔直接對應整個文檔內容
            "NamingConstraints": ("naming_constraints", None),
            "ValueSettings": ("value_settings", None),
            "AbsorptionSettings": ("absorption_config", None),
            "CultivationSettings": ("cultivation_config", None),
            "ElementalAdvantageChart": ("elemental_advantage_chart", None),
        }

        for doc_name, (config_key, field_name) in doc_map.items():
            doc_ref = config_collection_ref.document(doc_name)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                if field_name and data:
                    # 如果定義了 field_name，則從文檔中提取該欄位的資料
                    configs[config_key] = data.get(field_name, {})
                elif data:
                    # 否則，使用整個文檔的資料
                    configs[config_key] = data
            else:
                # 如果文檔不存在，根據鍵名給予一個合理的空值
                is_list_type = any(s in config_key for s in ['list', 'fragments', 'personalities', 'guide', 'conditions'])
                configs[config_key] = [] if is_list_type else {}
                config_logger.warning(f"在 Firestore 中找不到設定文檔：'{doc_name}'，已使用預設空值。")
        
        config_logger.info("Firestore 遠端設定已載入。")

    except Exception as e:
        config_logger.error(f"從 Firestore 載入遊戲設定時發生嚴重錯誤: {e}", exc_info=True)
        # 即使遠端失敗，也繼續嘗試載入本地故事
    
    # --- 新增：從本地檔案系統覆蓋修煉故事庫 ---
    config_logger.info("正在嘗試從本地檔案系統載入修煉故事庫...")
    try:
        # 構建相對於當前文件的 data 資料夾路徑
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        stories_path = os.path.join(data_dir, 'cultivation_stories.json')
        
        if os.path.exists(stories_path):
            with open(stories_path, 'r', encoding='utf-8') as f:
                stories_data = json.load(f)
            # 在主設定字典中新增或覆蓋 'cultivation_stories' 鍵
            configs['cultivation_stories'] = stories_data
            config_logger.info("成功從本地檔案 cultivation_stories.json 載入並覆蓋修煉故事設定。")
        else:
            config_logger.warning(f"在本地找不到 cultivation_stories.json，將使用 Firestore 中的版本（如果存在的話），否則為空。")
            if 'cultivation_stories' not in configs:
                configs['cultivation_stories'] = {} # 確保鍵存在
            
    except Exception as e:
        config_logger.error(f"從本地檔案載入修煉故事時發生錯誤: {e}", exc_info=True)
        if 'cultivation_stories' not in configs:
            configs['cultivation_stories'] = {} # 確保鍵存在
    # --- 新增結束 ---

    return configs
