# backend/config_editor_services.py
# 新增的服務檔案：處理後台編輯遊戲設定檔的相關邏輯

import os
import json
import logging
from flask import current_app

# 設定日誌記錄器
config_editor_logger = logging.getLogger(__name__)

# 定義 data 資料夾的絕對路徑
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
# 定義允許操作的子目錄
ALLOWED_SUBDIRS = ['skills']

def _is_safe_path(requested_path: str) -> bool:
    """
    安全性檢查：確保請求的路徑在允許的目錄範圍內，防止目錄遍歷攻擊。
    """
    # 將請求路徑標準化，解析 '..' 等相對路徑
    base_path = os.path.realpath(DATA_DIR)
    # 拼接並標準化最終路徑
    final_path = os.path.realpath(os.path.join(base_path, requested_path))
    
    # 檢查最終路徑是否在 base_path 的目錄樹下
    return os.path.commonpath([base_path, final_path]) == base_path

def list_editable_configs() -> list[str]:
    """
    列出 `backend/data` 目錄及其允許的子目錄下所有可編輯的設定檔。
    """
    config_files = []
    # 排除不應被編輯的檔案
    excluded_files = ['serviceAccountKey.json']

    # 讀取主 data 目錄
    for filename in os.listdir(DATA_DIR):
        if (filename.endswith('.json') or filename.endswith('.csv')) and filename not in excluded_files:
            config_files.append(filename)

    # 讀取允許的子目錄
    for subdir in ALLOWED_SUBDIRS:
        subdir_path = os.path.join(DATA_DIR, subdir)
        if os.path.isdir(subdir_path):
            for filename in os.listdir(subdir_path):
                 if filename.endswith('.json') or filename.endswith('.csv'):
                     config_files.append(os.path.join(subdir, filename).replace("\\", "/")) # 確保路徑分隔符統一

    config_editor_logger.info(f"成功列出 {len(config_files)} 個可編輯的設定檔。")
    return sorted(config_files)

def get_config_content(filename: str) -> tuple[Optional[str], Optional[str]]:
    """
    讀取指定設定檔的內容。
    返回 (內容, 錯誤訊息) 的元組。
    """
    if not _is_safe_path(filename):
        error_msg = f"安全性錯誤：禁止存取路徑 {filename}"
        config_editor_logger.error(error_msg)
        return None, error_msg

    file_path = os.path.join(DATA_DIR, filename)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return content, None
    except FileNotFoundError:
        return None, "找不到指定的設定檔。"
    except Exception as e:
        config_editor_logger.error(f"讀取設定檔 '{filename}' 時發生錯誤: {e}", exc_info=True)
        return None, "讀取檔案時發生伺服器內部錯誤。"

def save_config_content(filename: str, content: str) -> tuple[bool, Optional[str]]:
    """
    儲存修改後的設定檔內容。
    返回 (是否成功, 錯誤訊息) 的元組。
    """
    if not _is_safe_path(filename):
        error_msg = f"安全性錯誤：禁止寫入路徑 {filename}"
        config_editor_logger.error(error_msg)
        return False, error_msg

    # 如果是 JSON 檔案，先驗證其格式是否正確
    if filename.endswith('.json'):
        try:
            json.loads(content)
        except json.JSONDecodeError as e:
            error_msg = f"儲存失敗：內容不是有效的 JSON 格式。錯誤: {e}"
            config_editor_logger.error(error_msg)
            return False, error_msg

    file_path = os.path.join(DATA_DIR, filename)
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        config_editor_logger.info(f"設定檔 '{filename}' 已成功儲存。")
        
        # 觸發主應用程式重新載入設定
        reload_main_app_configs()
        
        return True, None
    except Exception as e:
        config_editor_logger.error(f"儲存設定檔 '{filename}' 時發生錯誤: {e}", exc_info=True)
        return False, "儲存檔案時發生伺服器內部錯誤。"

def reload_main_app_configs():
    """
    觸發主 Flask 應用程式重新載入所有遊戲設定。
    """
    try:
        from .MD_config_services import load_all_game_configs_from_firestore
        current_app.config['MD_GAME_CONFIGS'] = load_all_game_configs_from_firestore()
        config_editor_logger.info("主應用程式的遊戲設定已重新載入。")
    except Exception as e:
        config_editor_logger.error(f"重新載入遊戲設定時失敗: {e}", exc_info=True)
