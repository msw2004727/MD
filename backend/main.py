# MD/backend/main.py
# Flask 應用程式主啟動點

from flask import Flask, jsonify
from flask_cors import CORS # 確保導入
import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
import json

# 導入你的藍圖
from MD_routes import md_bp
# 導入 Firebase 配置設定函式
from MD_firebase_config import set_firestore_client, db as firestore_db_instance_from_config # 導入 db 以便檢查
# 導入遊戲設定服務
from MD_config_services import load_all_game_configs_from_firestore

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
app_logger = logging.getLogger(__name__)

# 初始化 Flask 應用程式
app = Flask(__name__)

# --- 更明確的 CORS 配置 ---
allowed_origins = [
    "https://msw2004727.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8080",
    "http://localhost:8080",
]
CORS(app,
     resources={r"/api/*": {"origins": allowed_origins}},
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
)
app_logger.info(f"CORS configured to allow requests from: {allowed_origins}")

# 註冊藍圖
app.register_blueprint(md_bp)

# --- Firebase Admin SDK 初始化 (增加除錯訊息) ---
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json'
firebase_app_initialized = False
cred = None # 初始化 cred 變數

app_logger.info(f"目前工作目錄: {os.getcwd()}") # <--- 除錯訊息：目前工作目錄
app_logger.info(f"檢查本地金鑰檔案路徑: {os.path.abspath(SERVICE_ACCOUNT_KEY_PATH)}") # <--- 除錯訊息：金鑰檔案的絕對路徑

if not firebase_admin._apps:
    firebase_credentials_json_env = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    app_logger.info(f"環境變數 FIREBASE_SERVICE_ACCOUNT_KEY: {'已設定' if firebase_credentials_json_env else '未設定'}")

    if firebase_credentials_json_env:
        try:
            cred_obj = json.loads(firebase_credentials_json_env)
            cred = credentials.Certificate(cred_obj)
            app_logger.info("準備從環境變數初始化 Firebase Admin SDK...")
        except Exception as e:
            app_logger.error(f"解析環境變數中的 Firebase 憑證失敗: {e}", exc_info=True)
            cred = None
    elif os.path.exists(SERVICE_ACCOUNT_KEY_PATH): # <--- 關鍵檢查點1
        app_logger.info(f"本地金鑰檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 存在。") # <--- 除錯訊息
        try:
            cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH) # <--- 關鍵載入點
            app_logger.info(f"成功從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 載入憑證物件。準備初始化 Firebase Admin SDK...")
        except Exception as e:
            app_logger.error(f"從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 載入 Firebase 憑證物件失敗: {e}", exc_info=True)
            cred = None
    else:
        app_logger.warning(f"本地金鑰檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 不存在。也未找到環境變數憑證。")
        # 在本地開發中，如果沒有明確的憑證，我們不主動嘗試 ADC 以避免 DefaultCredentialsError

    if cred: # <--- 關鍵檢查點2：只有在 cred 有效時才初始化
        app_logger.info("憑證物件 (cred) 已準備好，嘗試初始化 Firebase Admin SDK...")
        try:
            firebase_admin.initialize_app(cred)
            app_logger.info("Firebase Admin SDK 已成功初始化。")
            firebase_app_initialized = True
        except Exception as e:
            app_logger.error(f"使用獲取的憑證初始化 Firebase Admin SDK 失敗: {e}", exc_info=True)
            firebase_app_initialized = False
    else:
        app_logger.error("未能獲取有效的 Firebase 憑證 (cred is None)，Firebase Admin SDK 未初始化。")
        firebase_app_initialized = False
else:
    app_logger.info("Firebase Admin SDK 已初始化，跳過重複初始化。")
    firebase_app_initialized = True


# 獲取 Firestore 客戶端並注入到 MD_firebase_config 模組
if firebase_app_initialized and firebase_admin._apps:
    try:
        db_client = firestore.client()
        set_firestore_client(db_client)
        app_logger.info("Firestore 客戶端已成功獲取並注入到 MD_firebase_config。")
    except Exception as e:
        app_logger.error(f"獲取 Firestore 客戶端或注入時發生錯誤: {e}", exc_info=True)
        firebase_app_initialized = False
else:
    app_logger.error("Firebase Admin SDK 未成功初始化或應用程式列表為空，Firestore 客戶端無法注入。")
    firebase_app_initialized = False


# 在應用程式啟動時載入遊戲設定
if firebase_app_initialized and firestore_db_instance_from_config is not None:
    with app.app_context():
        app.config['MD_GAME_CONFIGS'] = load_all_game_configs_from_firestore()
        if app.config.get('MD_GAME_CONFIGS'):
            app_logger.info("遊戲設定已成功載入到 Flask 應用程式配置中。")
        else:
            app_logger.error("遊戲設定載入失敗或為空。")
else:
    app_logger.warning("由於 Firebase 初始化或 Firestore 客戶端設定問題，未載入遊戲設定。")


# 定義一個根路由，用於健康檢查或基本資訊
@app.route('/')
def index():
    return jsonify({"message": "怪獸養成後端服務運行中！訪問 /api/MD/health 檢查 API 狀態。"}), 200

# 如果直接運行此檔案，則啟動 Flask 開發伺服器
if __name__ == '__main__':
    if firebase_app_initialized and firestore_db_instance_from_config is not None:
        app_logger.info("在開發模式下啟動 Flask 應用程式。")
        app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
    else:
        app_logger.critical("Firebase Admin SDK 未能成功初始化或 Firestore 客戶端未設定，Flask 應用程式無法啟動。請檢查日誌中的錯誤訊息。")

