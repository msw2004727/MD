# backend/delete_all_users.py
# 用於清除 Firebase Authentication 中所有用戶資料的腳本

import firebase_admin
from firebase_admin import credentials, auth
import os
import json
import logging

# 設定日誌記錄器
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# 服務帳戶金鑰檔案的路徑 (本地開發時使用)
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json'

def initialize_firebase_admin():
    """
    初始化 Firebase Admin SDK。
    優先從環境變數 'FIREBASE_SERVICE_ACCOUNT_KEY' 載入憑證。
    如果環境變數不存在，則嘗試從本地檔案 'serviceAccountKey.json' 載入。
    """
    if not firebase_admin._apps: # 僅在尚未初始化時執行
        cred = None
        firebase_credentials_json_env = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')

        if firebase_credentials_json_env:
            logger.info("嘗試從環境變數載入 Firebase 憑證...")
            try:
                cred_obj = json.loads(firebase_credentials_json_env)
                cred = credentials.Certificate(cred_obj)
                logger.info("成功從環境變數解析憑證物件。")
            except Exception as e:
                logger.error(f"從環境變數解析 Firebase 憑證失敗: {e}", exc_info=True)
                cred = None
        else:
            logger.info(f"未設定環境變數憑證，嘗試從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 載入。")
            if os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
                try:
                    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
                    logger.info(f"成功從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 創建憑證物件。")
                except Exception as e:
                    logger.error(f"從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 創建 Firebase 憑證物件失敗: {e}", exc_info=True)
                    cred = None
            else:
                logger.critical(f"錯誤：找不到服務帳戶金鑰檔案：{SERVICE_ACCOUNT_KEY_PATH}，且未設定環境變數 'FIREBASE_SERVICE_ACCOUNT_KEY'。")
                logger.critical("請確認金鑰檔案已下載並放在正確位置，或設定環境變數。")
                return False # 初始化失敗

        if cred:
            logger.info("獲得有效憑證物件，嘗試初始化 Firebase Admin SDK...")
            try:
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK 已使用提供的憑證成功初始化。")
                return True # 初始化成功
            except Exception as e:
                logger.error(f"使用提供的憑證初始化 Firebase Admin SDK 失敗: {e}", exc_info=True)
                return False # 初始化失敗
        else:
            logger.critical("未能獲取有效的 Firebase 憑證，Firebase Admin SDK 未初始化。")
            return False # 初始化失敗
    else:
        logger.info("Firebase Admin SDK 已初始化，跳過重複初始化。")
    return True # 初始化成功


def delete_all_firebase_users():
    """
    從 Firebase Authentication 中刪除所有用戶。
    """
    if not initialize_firebase_admin():
        logger.error("Firebase Admin SDK 未能初始化。無法刪除用戶。")
        return

    confirm = input("警告：這將從 Firebase Authentication 中永久刪除所有用戶。此操作不可逆！\n您確定要繼續嗎？(輸入 'yes' 確認): ")
    if confirm.lower() != 'yes':
        logger.info("用戶刪除操作已取消。")
        return

    logger.info("開始刪除所有 Firebase Authentication 用戶...")
    deleted_count = 0
    errors = 0

    try:
        # auth.list_users() 預設每次獲取 1000 個用戶，直到所有用戶都被列出
        for user in auth.list_users().iterate_all():
            try:
                auth.delete_user(user.uid)
                logger.info(f"成功刪除用戶: {user.uid} (Email: {user.email}, DisplayName: {user.display_name})")
                deleted_count += 1
            except Exception as e:
                logger.error(f"刪除用戶 {user.uid} 失敗: {e}", exc_info=True)
                errors += 1
    except Exception as e:
        logger.critical(f"列出用戶時發生嚴重錯誤: {e}", exc_info=True)
        errors += 1

    logger.info(f"所有用戶刪除操作完成。成功刪除 {deleted_count} 個用戶，發生 {errors} 個錯誤。")

if __name__ == '__main__':
    delete_all_firebase_users()

