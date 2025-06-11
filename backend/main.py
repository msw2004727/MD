# MD/backend/main.py
# Flask 應用程式主啟動點

# --- 新增：路徑修正 ---
import os
import sys
# 將專案根目錄（backend資料夾的上一層）添加到 Python 的模組搜索路徑
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# --- 路徑修正結束 ---

from flask import Flask, jsonify, request
from flask_cors import CORS 
import firebase_admin
from firebase_admin import credentials, firestore
import json
import logging

# 將原本的相對導入改成從 backend 開始的絕對導入
from backend.MD_routes import md_bp
from backend import MD_firebase_config
from backend.MD_config_services import load_all_game_configs_from_firestore

# 設定日誌
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
app_logger = logging.getLogger(__name__)

# 初始化 Flask 應用程式
app = Flask(__name__)

# --- CORS 配置 ---
allowed_origins = [
    "https://msw2004727.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501"
]
CORS(app,
     origins=allowed_origins,
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     expose_headers=["Content-Type", "Authorization"]
)
app_logger.info(f"CORS configured to allow origins: {allowed_origins}")


# 註冊藍圖
app.register_blueprint(md_bp)

# --- Firebase Admin SDK 初始化 ---
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json'
firebase_app_initialized = False
cred = None

app_logger.info(f"--- 開始 Firebase Admin SDK 初始化 ---")

if not firebase_admin._apps:
    firebase_credentials_json_env = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    app_logger.info(f"環境變數 FIREBASE_SERVICE_ACCOUNT_KEY: {'已設定' if firebase_credentials_json_env else '未設定'}")

    if firebase_credentials_json_env:
        app_logger.info("嘗試從環境變數載入 Firebase 憑證...")
        try:
            cred_obj = json.loads(firebase_credentials_json_env)
            cred = credentials.Certificate(cred_obj)
            app_logger.info("成功從環境變數解析憑證物件。")
        except Exception as e:
            app_logger.error(f"從環境變數解析 Firebase 憑證失敗: {e}", exc_info=True)
            cred = None
    elif os.path.exists(os.path.join(os.path.dirname(__file__), SERVICE_ACCOUNT_KEY_PATH)): # 修正路徑檢查
        app_logger.info(f"未設定環境變數憑證，嘗試從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 載入 (適用於本地開發)。")
        try:
            cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), SERVICE_ACCOUNT_KEY_PATH))
            app_logger.info(f"成功從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 創建憑證物件。")
        except Exception as e:
            app_logger.error(f"從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 創建 Firebase 憑證物件失敗: {e}", exc_info=True)
            cred = None
    else:
        app_logger.warning("未找到環境變數或本地服務帳戶金鑰檔案。Firebase 將無法初始化。")

    if cred:
        app_logger.info("獲得有效憑證物件，嘗試初始化 Firebase Admin SDK...")
        try:
            firebase_admin.initialize_app(cred)
            app_logger.info("Firebase Admin SDK 已使用提供的憑證成功初始化。")
            firebase_app_initialized = True
        except Exception as e:
            app_logger.error(f"使用提供的憑證初始化 Firebase Admin SDK 失敗: {e}", exc_info=True)
            firebase_app_initialized = False
    else:
        app_logger.error("未能獲取有效的 Firebase 憑證，Firebase Admin SDK 未初始化。")
        firebase_app_initialized = False
else:
    app_logger.info("Firebase Admin SDK 已初始化，跳過重複初始化。")
    firebase_app_initialized = True

app_logger.info(f"Firebase Admin SDK 初始化狀態: {firebase_app_initialized}")
app_logger.info(f"--- Firebase Admin SDK 初始化結束 ---")


# 獲取 Firestore 客戶端並注入
if firebase_app_initialized and firebase_admin._apps:
    try:
        db_client = firestore.client()
        MD_firebase_config.set_firestore_client(db_client)
        app_logger.info("Firestore 客戶端已成功獲取並注入到 MD_firebase_config。")
    except Exception as e:
        app_logger.error(f"獲取 Firestore 客戶端或注入時發生錯誤: {e}", exc_info=True)
        firebase_app_initialized = False
else:
    app_logger.error("因 Firebase Admin SDK 初始化問題，無法獲取 Firestore 客戶端。")
    firebase_app_initialized = False

# 在應用程式啟動時載入遊戲設定
if firebase_app_initialized and MD_firebase_config.db is not None:
    with app.app_context():
        app.config['MD_GAME_CONFIGS'] = load_all_game_configs_from_firestore()
        if app.config.get('MD_GAME_CONFIGS'):
            app_logger.info("遊戲設定已成功載入到 Flask 應用程式配置中。")
        else:
            app_logger.error("遊戲設定載入失敗或為空。")
else:
    app_logger.warning("由於 Firebase 初始化或 Firestore 客戶端設定問題 (MD_firebase_config.db is None)，未載入遊戲設定。")


# 健康檢查路由
@app.route('/')
def index():
    game_configs_loaded = bool(app.config.get('MD_GAME_CONFIGS'))
    firebase_status = "已初始化" if firebase_app_initialized and MD_firebase_config.db is not None else "初始化失敗或 Firestore 客戶端未設定"
    return jsonify({
        "message": "怪獸養成後端服務運行中！",
        "firebase_status": firebase_status,
        "game_configs_loaded": game_configs_loaded,
        "api_health_check": "/api/MD/health"
    }), 200

# 如果直接運行此檔案 (例如本地開發)，則啟動 Flask 內建的開發伺服器
if __name__ == '__main__':
    if firebase_app_initialized and MD_firebase_config.db is not None:
        app_logger.info("在開發模式下啟動 Flask 應用程式 (使用 Flask 內建伺服器)。")
        port = int(os.environ.get("PORT", 5000))
        app.run(debug=True, host='0.0.0.0', port=port)
    else:
        app_logger.critical("Firebase 未能成功初始化或 Firestore 客戶端未設定，Flask 應用程式無法啟動。請檢查日誌。")
