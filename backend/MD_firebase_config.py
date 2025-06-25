import firebase_admin
from firebase_admin import credentials, firestore, auth
import logging
import os
import json

# --- Firebase Initialization ---
try:
    # 從環境變數 'FIREBASE_CREDENTIALS_JSON' 讀取憑證的 JSON 字串
    cred_json_str = os.environ.get('FIREBASE_CREDENTIALS_JSON')

    if not cred_json_str:
        # 如果在環境中找不到這個變數，就記錄一個嚴重錯誤並讓程式啟動失敗
        # 這樣可以立刻知道是環境設定出了問題
        logging.critical("CRITICAL ERROR: FIREBASE_CREDENTIALS_JSON environment variable not set.")
        raise ValueError("FIREBASE_CREDENTIALS_JSON is not set in the environment. The application cannot start.")

    # 將 JSON 字串解析成 Python 的字典格式
    cred_json = json.loads(cred_json_str)

    # 使用解析後的字典來建立 Firebase 憑證物件
    cred = credentials.Certificate(cred_json)

    # 初始化 Firebase App
    # 檢查是否已經初始化，避免重複初始化
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
        logging.info("Firebase has been initialized successfully from environment variables.")
    else:
        logging.info("Firebase app already initialized.")

    db = firestore.client()

except Exception as e:
    logging.error(f"FATAL: Error initializing Firebase: {e}")
    # 在初始化失敗時，將 db 設為 None，讓後續操作能安全地失敗
    db = None

def verify_token(token):
    """Verifies the Firebase ID token."""
    if not db:
        logging.error("Firebase not initialized, cannot verify token.")
        return None
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logging.error(f"Error verifying token: {e}")
        return None
