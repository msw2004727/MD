# backend/config_editor_services.py
# 新增的服務檔案：處理後台編輯遊戲設定檔的相關邏輯

import os
import json
import logging
from flask import current_app
# 【新增】從 typing 模組導入 Optional，以解決 NameError
from typing import Optional

# 【新增】從 firebase_admin 導入 firestore 以便操作資料庫
from firebase_admin import firestore

# 設定日誌記錄器
config_editor_logger = logging.getLogger(__name__)

# 【修改】建立一個從"檔案名稱"到"Firestore文件"的映射表
# 這將告訴我們的服務，前端選擇的某個檔案，對應到資料庫的哪個文件和哪個欄位
CONFIG_FILE_FIRESTORE_MAP = {
    # 主要設定檔
    "titles.json": ("Titles", "player_titles"),
    "dna_fragments.json": ("DNAFragments", "all_fragments"),
    "newbie_guide.json": ("NewbieGuide", "guide_entries"),
    "element_nicknames.json": ("ElementNicknames", "nicknames"),
    "battle_highlights.json": ("BattleHighlights", "highlight_styles"),
    "adventure_islands.json": ("AdventureIslands", "islands"),
    "champion_guardians.json": ("ChampionGuardians", "guardians"),
    "status_effects.json": ("StatusEffects", "effects_list"),

    # 各屬性技能檔 (使用點表示法來更新巢狀欄位)
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
    (此函式邏輯不變，它定義了前端下拉選單的內容)
    """
    # 直接返回我們映射表中定義的所有鍵 (檔名)
    return sorted(list(CONFIG_FILE_FIRESTORE_MAP.keys()))

def get_config_content(filename: str) -> tuple[Optional[str], Optional[str]]:
    """
    【重構】讀取指定設定檔的內容，來源改為 Firestore。
    返回 (內容, 錯誤訊息) 的元組。
    """
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db:
        return None, "資料庫服務未初始化。"
        
    if filename not in CONFIG_FILE_FIRESTORE_MAP:
        return None, f"不支援的設定檔 '{filename}' 或其尚未被定義於映射表中。"

    doc_name, field_path = CONFIG_FILE_FIRESTORE_MAP[filename]

    try:
        doc_ref = db.collection('MD_GameConfigs').document(doc_name)
        doc = doc_ref.get()

        if not doc.exists:
            return None, f"Firestore 中找不到對應的文件：'{doc_name}'。"

        doc_data = doc.to_dict()
        
        # 【修改】使用更安全的 .get() 方法來處理巢狀路徑，避免 KeyError
        data_to_return = doc_data
        for key in field_path.split('.'):
            if isinstance(data_to_return, dict):
                data_to_return = data_to_return.get(key)
            else:
                # 如果中間路徑不是字典或不存在，則無法繼續尋找
                return None, f"在文件 '{doc_name}' 中找不到欄位路徑：'{field_path}' (於 '{key}')"
            
            if data_to_return is None:
                # 如果 get() 返回 None，表示鍵不存在
                return None, f"在文件 '{doc_name}' 中找不到欄位路徑：'{field_path}' (於 '{key}')"
        
        # 將Python物件轉換為格式化的JSON字串回傳給前端
        content_str = json.dumps(data_to_return, ensure_ascii=False, indent=2)
        return content_str, None

    except Exception as e:
        config_editor_logger.error(f"從 Firestore 讀取設定檔 '{filename}' 時發生錯誤: {e}", exc_info=True)
        return None, "讀取 Firestore 資料時發生伺服器內部錯誤。"

def save_config_content(filename: str, content: str) -> tuple[bool, Optional[str]]:
    """
    【重構】儲存修改後的設定檔內容到 Firestore。
    返回 (是否成功, 錯誤訊息) 的元組。
    """
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db:
        return False, "資料庫服務未初始化。"

    if filename not in CONFIG_FILE_FIRESTORE_MAP:
        return False, f"不支援的設定檔 '{filename}' 或其尚未被定義於映射表中。"

    try:
        # 將前端傳來的JSON字串內容解析為Python物件
        parsed_content = json.loads(content)
    except json.JSONDecodeError as e:
        error_msg = f"儲存失敗：內容不是有效的 JSON 格式。錯誤: {e}"
        config_editor_logger.error(error_msg)
        return False, error_msg

    doc_name, field_path = CONFIG_FILE_FIRESTORE_MAP[filename]
    
    try:
        doc_ref = db.collection('MD_GameConfigs').document(doc_name)
        # 使用 update 方法更新指定欄位，不會影響同文件中的其他欄位
        doc_ref.update({
            field_path: parsed_content
        })
        config_editor_logger.info(f"設定檔 '{filename}' 已成功儲存至 Firestore 的 '{doc_name}.{field_path}'。")
        
        # 觸發主應用程式重新載入設定
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
