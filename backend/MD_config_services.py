# backend/MD_config_services.py

import os
import logging
from .MD_firebase_config import db # 新增：引入Firestore資料庫連線

logger = logging.getLogger(__name__)

# --- 新增：從Firestore載入遊戲設定的函式 ---
def load_all_game_configs_from_firestore():
    """
    從Firestore的 'game_configs' 集合中載入所有遊戲設定。
    這會在伺服器啟動時執行，將設定載入到記憶體中。
    """
    try:
        configs = {}
        docs = db.collection('game_configs').stream()
        for doc in docs:
            configs[doc.id] = doc.to_dict()
        logger.info("成功從Firestore載入所有遊戲設定。")
        return configs
    except Exception as e:
        logger.error(f"從Firestore載入遊戲設定時發生嚴重錯誤: {e}", exc_info=True)
        # 如果設定檔沒成功載入，伺服器必須停止運作，所以拋出例外
        raise

# --- 以下是上次新增的，給後台編輯器用的函式 ---

# 獲取當前檔案(MD_config_services.py)所在的目錄 (backend)
# 然後獲取其父目錄，也就是整個專案的根目錄
# 這樣可以確保無論在哪裡執行，路徑都是正確的
CONFIG_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# 為了安全，定義允許被編輯的資料夾
# 防止後台編輯器讀寫到非預期的系統檔案
ALLOWED_CONFIG_DIRS = [
    os.path.join(CONFIG_BASE_DIR, 'backend', 'adventure'),
    os.path.join(CONFIG_BASE_DIR, 'backend', 'battle'),
    os.path.join(CONFIG_BASE_DIR, 'backend', 'monster'),
    os.path.join(CONFIG_BASE_DIR, 'backend', 'system'),
    CONFIG_BASE_DIR  # 允許讀取根目錄下的設定檔，例如 announcement.json
]

def is_safe_path(path):
    """檢查解析後的絕對路徑是否在任何一個允許的目錄下"""
    try:
        resolved_path = os.path.abspath(path)
        # 確保請求的路徑不會跑到允許的目錄之外
        #例如 ../../之類的惡意路徑
        for allowed_dir in ALLOWED_CONFIG_DIRS:
            if os.path.commonpath([resolved_path, allowed_dir]) == allowed_dir:
                return True
        return False
    except ValueError:
        return False

def get_game_config_files():
    """
    掃描並回傳所有在允許目錄內的 .json 和 .csv 設定檔列表。
    """
    config_files = []
    allowed_extensions = ('.json', '.csv')
    
    # 將允許的目錄納入搜索範圍
    search_dirs = [d for d in ALLOWED_CONFIG_DIRS if os.path.isdir(d)]

    for search_dir in search_dirs:
        for root, _, files in os.walk(search_dir):
            for file in files:
                if file.endswith(allowed_extensions):
                    full_path = os.path.join(root, file)
                    # 產生相對於專案根目錄的相對路徑，方便前端顯示
                    relative_path = os.path.relpath(full_path, CONFIG_BASE_DIR)
                    config_files.append(relative_path.replace("\\", "/"))

    # 移除重複的項目並排序
    return sorted(list(set(config_files)))

def get_game_config_content(filename):
    """
    讀取並回傳指定設定檔的內容。
    filename 是相對於專案根目錄的路徑。
    """
    try:
        full_path = os.path.join(CONFIG_BASE_DIR, filename)
        if not is_safe_path(full_path):
            logger.warning(f"偵測到不安全的檔案讀取嘗試: {filename}")
            return None

        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            logger.error(f"設定檔不存在: {filename}")
            return None
    except Exception as e:
        logger.error(f"讀取設定檔 {filename} 時發生錯誤: {e}")
        return None

def save_game_config_content(filename, content):
    """
    將新的內容儲存到指定的設定檔。
    filename 是相對於專案根目錄的路徑。
    """
    try:
        full_path = os.path.join(CONFIG_BASE_DIR, filename)
        if not is_safe_path(full_path):
            logger.warning(f"偵測到不安全的檔案儲存嘗試: {filename}")
            return False

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        logger.info(f"成功儲存設定檔: {filename}")
        return True
    except Exception as e:
        logger.error(f"儲存設定檔 {filename} 時發生錯誤: {e}")
        return False
