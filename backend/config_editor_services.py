# backend/config_editor_services.py
# 新增的服務檔案：處理後台編輯遊戲設定檔的相關邏輯

import os
import json
import logging
from flask import current_app
from typing import Optional, Dict, Any, List, Union

# 【新增】從 firebase_admin 導入 firestore 以便操作資料庫
from firebase_admin import firestore

# 設定日誌記錄器
config_editor_logger = logging.getLogger(__name__)

# 【修改】建立一個從"檔案名稱"到"Firestore文件"的映射表
CONFIG_FILE_FIRESTORE_MAP = {
    "titles.json": ("Titles", "player_titles"),
    "dna_fragments.json": ("DNAFragments", "all_fragments"),
    "newbie_guide.json": ("NewbieGuide", "guide_entries"),
    "element_nicknames.json": ("ElementNicknames", "nicknames"),
    "battle_highlights.json": ("BattleHighlights", None),
    "adventure_islands.json": ("AdventureIslands", "islands"),
    "champion_guardians.json": ("ChampionGuardians", "guardians"),
    "status_effects.json": ("StatusEffects", "effects_list"),
    "skills/dark.json": ("Skills", "skill_database.暗"),
    "skills/earth.json": ("Skills", "skill_database.土"),
    "skills/fire.json": ("Skills", "skill_database.火"),
    "skills/gold.json": ("Skills", "skill_database.金"),
    "skills/light.json": ("Skills", "skill_database.光"),
    "skills/mix.json": ("Skills", "skill_database.混"),
    "skills/none.json": ("Skills", "skill_database.無"),
    "skills/poison.json": ("Skills", "skill_database.毒"),
    "skills/water.json": ("Skills", "skill_database.水"),
    "skills/wind.json": ("Skills", "skill_database.風"),
    "skills/wood.json": ("Skills", "skill_database.木"),
}


def list_editable_configs() -> list[str]:
    """
    列出所有可透過後台編輯的設定檔名稱。
    """
    return sorted(list(CONFIG_FILE_FIRESTORE_MAP.keys()))

def get_config_content(filename: str) -> tuple[Optional[Union[Dict, List]], Optional[str]]:
    """
    【重構】讀取指定設定檔的內容，來源改為 Firestore，直接回傳 Python 物件。
    """
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db:
        return None, "資料庫服務未初始化。"
        
    if filename not in CONFIG_FILE_FIRESTORE_MAP:
        return None, f"不支援的設定檔 '{filename}'。"

    doc_name, field_path = CONFIG_FILE_FIRESTORE_MAP[filename]

    try:
        doc_ref = db.collection('MD_GameConfigs').document(doc_name)
        doc = doc_ref.get()

        if not doc.exists:
            return None, f"Firestore 中找不到對應的文件：'{doc_name}'。"

        doc_data = doc.to_dict()
        if not doc_data:
            return {}, f"文件 '{doc_name}' 內容為空。"

        # 如果沒有指定 field_path，表示整個文件就是內容
        if field_path is None:
            return doc_data, None

        # 處理巢狀路徑 (例如 "skill_database.火")
        data_to_return = doc_data
        for key in field_path.split('.'):
            if isinstance(data_to_return, dict):
                data_to_return = data_to_return.get(key)
            else:
                return None, f"在文件 '{doc_name}' 中找不到欄位路徑：'{field_path}' (於 '{key}')"
            
            if data_to_return is None:
                return None, f"在文件 '{doc_name}' 中找不到欄位路徑：'{field_path}' (於 '{key}')"
        
        return data_to_return, None

    except Exception as e:
        config_editor_logger.error(f"從 Firestore 讀取設定檔 '{filename}' 時發生錯誤: {e}", exc_info=True)
        return None, "讀取 Firestore 資料時發生伺服器內部錯誤。"

def save_config_content(filename: str, content: Union[Dict, List]) -> tuple[bool, Optional[str]]:
    """
    【重構】儲存修改後的設定檔內容到 Firestore，直接接收 Python 物件。
    """
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db:
        return False, "資料庫服務未初始化。"

    if filename not in CONFIG_FILE_FIRESTORE_MAP:
        return False, f"不支援的設定檔 '{filename}'。"

    doc_name, field_path = CONFIG_FILE_FIRESTORE_MAP[filename]
    
    try:
        doc_ref = db.collection('MD_GameConfigs').document(doc_name)
        
        # 如果沒有指定 field_path，表示用新內容覆蓋整個文件
        if field_path is None:
            doc_ref.set(content)
        else:
            # 使用 update 方法更新指定欄位，不會影響同文件中的其他欄位
            doc_ref.update({
                field_path: content
            })
            
        config_editor_logger.info(f"設定檔 '{filename}' 已成功儲存至 Firestore 的 '{doc_name}.{field_path or ''}'。")
        
        reload_main_app_configs()
        return True, None
    except Exception as e:
        config_editor_logger.error(f"儲存設定檔 '{filename}' 到 Firestore 時發生錯誤: {e}", exc_info=True)
        return False, "儲存檔案到 Firestore 時發生伺服器內部錯誤。"

def reload_main_app_configs():
    """
    觸發主 Flask 應用程式重新載入所有遊戲設定。
    """
    try:
        from .MD_config_services import load_all_game_configs_from_firestore
        current_app.config['MD_GAME_CONFIGS'] = load_all_game_configs_from_firestore()
        config_editor_logger.info("主應用程式的遊戲設定已從 Firestore 重新載入。")
    except Exception as e:
        config_editor_logger.error(f"重新載入遊戲設定時失敗: {e}", exc_info=True)
