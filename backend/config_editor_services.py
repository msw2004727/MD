# backend/config_editor_services.py
# 新增的服務檔案：處理後台編輯遊戲設定檔的相關邏輯

import os
import json
import logging
from flask import current_app
# 【修改】從 typing 模組導入所有需要的型別提示
from typing import Optional, Dict, Any, List, Union

# 【新增】從 firebase_admin 導入 firestore 以便操作資料庫
from firebase_admin import firestore

# 設定日誌記錄器
config_editor_logger = logging.getLogger(__name__)

# 檔案名稱到 Firestore 文件的映射表
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
    """列出所有可透過後台編輯的設定檔名稱。"""
    return sorted(list(CONFIG_FILE_FIRESTORE_MAP.keys()))

def get_config_content(filename: str) -> tuple[Optional[Union[Dict, List]], Optional[str]]:
    """
    【重構】讀取指定設定檔的內容，來源改為 Firestore，直接回傳 Python 物件。
    """
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db:
        return None, "資料庫服務未初始化。"
        
    # --- 核心修改處 START ---
    # 檢查是否為本地設定檔
    if filename == "adventure_settings.json":
        try:
            data_dir = os.path.join(os.path.dirname(__file__), 'data')
            file_path = os.path.join(data_dir, filename)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
            return content, None
        except Exception as e:
            config_editor_logger.error(f"從本地讀取設定檔 '{filename}' 時發生錯誤: {e}", exc_info=True)
            return None, f"讀取本地檔案 {filename} 時發生錯誤。"
    # --- 核心修改處 END ---

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

def save_config_content(filename: str, content_str: str) -> tuple[bool, Optional[str]]:
    """
    【重構】儲存修改後的設定檔內容到 Firestore。
    """
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db:
        return False, "資料庫服務未初始化。"

    if filename not in CONFIG_FILE_FIRESTORE_MAP:
        return False, f"不支援的設定檔 '{filename}'。"

    try:
        parsed_content = json.loads(content_str)
    except json.JSONDecodeError as e:
        error_msg = f"儲存失敗：內容不是有效的 JSON 格式。錯誤: {e}"
        config_editor_logger.error(error_msg)
        return False, error_msg

    doc_name, field_path = CONFIG_FILE_FIRESTORE_MAP[filename]
    
    try:
        doc_ref = db.collection('MD_GameConfigs').document(doc_name)
        
        if field_path is None:
            doc_ref.set(parsed_content)
        else:
            doc_ref.update({field_path: parsed_content})
            
        config_editor_logger.info(f"設定檔 '{filename}' 已成功儲存至 Firestore 的 '{doc_name}.{field_path or ''}'。")
        
        reload_main_app_configs()
        return True, None
    except Exception as e:
        config_editor_logger.error(f"儲存設定檔 '{filename}' 到 Firestore 時發生錯誤: {e}", exc_info=True)
        return False, "儲存檔案到 Firestore 時發生伺服器內部錯誤。"

# --- 核心修改處 START ---
def save_adventure_settings_service(global_settings: Dict, facilities_settings: List) -> tuple[bool, Optional[str]]:
    """
    專門用來儲存冒險島的相關設定。
    """
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    
    try:
        # 1. 儲存全域設定到 adventure_settings.json
        adv_settings_path = os.path.join(data_dir, 'adventure_settings.json')
        with open(adv_settings_path, 'w', encoding='utf-8') as f:
            json.dump(global_settings, f, indent=2, ensure_ascii=False)
        config_logger.info(f"已成功儲存全域冒險設定至 '{adv_settings_path}'。")

        # 2. 儲存各地區設施設定到 adventure_islands.json
        islands_path = os.path.join(data_dir, 'adventure_islands.json')
        
        # 先讀取現有的島嶼資料
        with open(islands_path, 'r', encoding='utf-8') as f:
            islands_data = json.load(f)

        # 更新設施的 cost
        for facility_update in facilities_settings:
            for island in islands_data:
                for facility in island.get('facilities', []):
                    if facility.get('facilityId') == facility_update.get('id'):
                        facility['cost'] = facility_update.get('cost', facility['cost'])
                        break
        
        # 將更新後的完整資料寫回檔案
        with open(islands_path, 'w', encoding='utf-8') as f:
            json.dump(islands_data, f, indent=2, ensure_ascii=False)
        config_logger.info(f"已成功更新並儲存各地區設施設定至 '{islands_path}'。")

        # 3. 觸發主應用程式重新載入所有設定
        reload_main_app_configs()
        
        return True, None
        
    except Exception as e:
        config_editor_logger.error(f"儲存冒險島設定時發生錯誤: {e}", exc_info=True)
        return False, "儲存冒險島設定時發生伺服器內部錯誤。"
# --- 核心修改處 END ---


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
