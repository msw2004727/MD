# MD/backend/main.py
# Flask 應用程式主啟動點

from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
import json

# 導入你的藍圖 (使用相對導入，修正)
from .MD_routes import md_bp
# 導入 Firebase 配置設定函式 (使用相對導入，修正)
from . import MD_firebase_config
# 導入遊戲設定服務 (使用相對導入，修正)
from .MD_config_services import load_all_game_configs_from_firestore

# 設定日誌
# 將日誌級別從 INFO 改為 DEBUG，以便看到詳細的偵錯訊息
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
app_logger = logging.getLogger(__name__)

# 初始化 Flask 應用程式
app = Flask(__name__)

# --- CORS 配置 ---
# 定義一個允許來源的列表
allowed_origins = [
    "https://msw2004727.github.io",  # 您部署在 GitHub Pages 的前端網址
    "http://127.0.0.1:5500",       # 本地開發常用 Live Server 端口
    "http://localhost:5500",      # 本地開發常用 Live Server 端口
    "http://127.0.0.1:5501",       # 備用端口
    "http://localhost:5501"       # 備用端口
]

# 採用更精確的資源路徑設定，這在某些代理環境後可能更穩定
CORS(app, 
     resources={r"/api/*": {"origins": allowed_origins}},
     supports_credentials=True, 
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
)
app_logger.info(f"CORS configured to allow specific origins for /api/* path: {allowed_origins}")


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
    elif os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
        app_logger.info(f"未設定環境變數憑證，嘗試從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 載入 (適用於本地開發)。")
        key_file_exists = os.path.exists(SERVICE_ACCOUNT_KEY_PATH)
        app_logger.info(f"本地金鑰檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 是否存在: {key_file_exists}")
        if key_file_exists:
            try:
                cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
                app_logger.info(f"成功從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 創建憑證物件。")
            except Exception as e:
