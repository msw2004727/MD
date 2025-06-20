# functions/main.py
# Flask 應用程式主啟動點 - 已修改為適用於 Cloud Functions

# --- 路徑修正 ---
import os
import sys
# 將專案根目錄（functions資料夾的上一層）添加到 Python 的模組搜索路徑
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import json
import logging

# 導入 Cloud Functions 相關套件
from firebase_functions import https_fn, options

# 從新建立的日誌設定檔中導入設定函式
from functions.backend.logging_config import setup_logging

# 從專案模組導入藍圖和設定
from functions.backend.MD_routes import md_bp
from functions.backend.champion_routes import champion_bp
from functions.backend import MD_firebase_config
from functions.backend.MD_config_services import load_all_game_configs_from_firestore

# 執行日誌設定
setup_logging()
app_logger = logging.getLogger(__name__)

# --- Firebase Admin SDK 初始化 (邏輯維持不變) ---
SERVICE_ACCOUNT_KEY_PATH = os.path.join(os.path.dirname(__file__), 'backend', 'serviceAccountKey.json')
firebase_app_initialized = False
cred = None

app_logger.info("--- 開始 Firebase Admin SDK 初始化 (Cloud Function 環境) ---")

if not firebase_admin._apps:
    firebase_credentials_json_env = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    app_logger.info("環境變數 FIREBASE_SERVICE_ACCOUNT_KEY: %s", '已設定' if firebase_credentials_json_env else '未設定')

    if firebase_credentials_json_env:
        app_logger.info("嘗試從環境變數載入 Firebase 憑證...")
        try:
            cred_obj = json.loads(firebase_credentials_json_env)
            cred = credentials.Certificate(cred_obj)
            app_logger.info("成功從環境變數解析憑證物件。")
        except Exception as e:
            app_logger.error("從環境變數解析 Firebase 憑證失敗: %s", e, exc_info=True)
            cred = None
    elif os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
        app_logger.info("未設定環境變數憑證，嘗試從本地檔案 '%s' 載入 (適用於本地模擬器)。", SERVICE_ACCOUNT_KEY_PATH)
        try:
            cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
            app_logger.info("成功從本地檔案創建憑證物件。")
        except Exception as e:
            app_logger.error("從本地檔案創建 Firebase 憑證物件失敗: %s", e, exc_info=True)
            cred = None
    else:
        # 在 Cloud Functions 環境中，如果沒有設定環境變數，SDK 會自動使用應用程式預設憑證
        app_logger.info("未提供本地憑證，將依賴 Cloud Functions 的預設應用程式憑證。")
        try:
            firebase_admin.initialize_app()
            firebase_app_initialized = True
            app_logger.info("Firebase Admin SDK 已使用應用程式預設憑證成功初始化。")
        except Exception as e:
            app_logger.error("使用應用程式預設憑證初始化 Firebase Admin SDK 失敗: %s", e, exc_info=True)
            firebase_app_initialized = False

    if cred and not firebase_app_initialized:
        app_logger.info("獲得有效憑證物件，嘗試初始化 Firebase Admin SDK...")
        try:
            firebase_admin.initialize_app(cred)
            app_logger.info("Firebase Admin SDK 已使用提供的憑證成功初始化。")
            firebase_app_initialized = True
        except Exception as e:
            app_logger.error("使用提供的憑證初始化 Firebase Admin SDK 失敗: %s", e, exc_info=True)
            firebase_app_initialized = False
else:
    app_logger.info("Firebase Admin SDK 已初始化，跳過重複初始化。")
    firebase_app_initialized = True

app_logger.info("Firebase Admin SDK 初始化狀態: %s", firebase_app_initialized)
app_logger.info("--- Firebase Admin SDK 初始化結束 ---")

# --- Flask App 設定 ---
app = Flask(__name__)
allowed_origins = [
    "https://msw2004727.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    # 之後 Firebase Hosting 的網址也需要加入
]
CORS(app, origins=allowed_origins, supports_credentials=True)

# 獲取 Firestore 客戶端並注入
if firebase_app_initialized and MD_firebase_config.db is None:
    try:
        db_client = firestore.client()
        MD_firebase_config.set_firestore_client(db_client)
        app_logger.info("Firestore 客戶端已成功獲取並注入到 MD_firebase_config。")
    except Exception as e:
        app_logger.error("獲取 Firestore 客戶端或注入時發生錯誤: %s", e, exc_info=True)
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
    app_logger.warning("由於 Firebase 初始化或 Firestore 客戶端設定問題，未載入遊戲設定。")


# --- 註冊 Flask 藍圖 (API 路由) ---
app.register_blueprint(md_bp)
app.register_blueprint(champion_bp)

# --- Cloud Function 主要入口點 ---
@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins=[
            "https://aigame-fb578.web.app", # 預先加入未來 Firebase Hosting 的網址
            "https://aigame-fb578.firebaseapp.com",
            "https://msw2004727.github.io",
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://127.0.0.1:5501",
            "http://localhost:5501"
        ],
        cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
)
def api(req: https_fn.Request) -> https_fn.Response:
    """
    這是我們所有後端 API 的統一入口點。
    它會接收所有指向此函式的請求，並將它們轉交給我們的 Flask 應用程式處理。
    """
    with app.request_context(req.environ):
        return app.full_dispatch_request()