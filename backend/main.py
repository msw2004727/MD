# MD/backend/main.py
# Flask 應用程式主啟動點

import os
import sys
import re 
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS 
import firebase_admin
from firebase_admin import credentials, firestore
import json
import logging

from backend.logging_config import setup_logging

# 導入所有功能的藍圖
from backend.MD_routes import md_bp
from backend.champion_routes import champion_bp 
from backend.mail_routes import mail_bp
from backend.adventure_routes import adventure_bp 
from backend.admin_routes import admin_bp
from backend.config_editor_routes import config_editor_bp

from backend import MD_firebase_config
from backend.MD_config_services import load_all_game_configs_from_firestore

setup_logging()
app_logger = logging.getLogger(__name__)
app = Flask(__name__)

# 註冊所有藍圖
app.register_blueprint(md_bp)
app.register_blueprint(champion_bp) 
app.register_blueprint(mail_bp)
app.register_blueprint(adventure_bp)
app.register_blueprint(admin_bp) 
app.register_blueprint(config_editor_bp)


# --- 核心修改處 START ---
# 在 CORS 設定中，加入您新的遊戲網址
CORS(app, resources={r"/api/*": {
    "origins": [
        "https://msw2004727.github.io",          # 舊的網址 (建議保留一段時間)
        "https://msw2004727.github.io/Mai",      # 您部署前端的新網址
        "https://msw2004727.github.io/Mai/",     # 同上，加上斜線以確保相容性
        re.compile(r"http://localhost:.*"),      # 允許本地開發測試
        re.compile(r"http://127.0.0.1:.*")     # 允許本地開發測試
    ],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})
app_logger.info(f"CORS configured to allow specific origins for /api/* path.")
# --- 核心修改處 END ---


# --- Firebase Admin SDK 初始化 ---
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json'
firebase_app_initialized = False
cred = None

app_logger.info("--- 開始 Firebase Admin SDK 初始化 ---")

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
    elif os.path.exists(os.path.join(os.path.dirname(__file__), SERVICE_ACCOUNT_KEY_PATH)):
        app_logger.info("未設定環境變數憑證，嘗試從本地檔案 '%s' 載入 (適用於本地開發)。", SERVICE_ACCOUNT_KEY_PATH)
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

app_logger.info("Firebase Admin SDK 初始化狀態: %s", firebase_app_initialized)
app_logger.info("--- Firebase Admin SDK 初始化結束 ---")


if firebase_app_initialized and firebase_admin._apps:
    try:
        db_client = firestore.client()
        MD_firebase_config.set_firestore_client(db_client)
        app_logger.info("Firestore 客戶端已成功獲取並注入到 MD_firebase_config。")
    except Exception as e:
        app_logger.error("獲取 Firestore 客戶端或注入時發生錯誤: %s", e, exc_info=True)
        firebase_app_initialized = False
else:
    app_logger.error("因 Firebase Admin SDK 初始化問題，無法獲取 Firestore 客戶端。")
    firebase_app_initialized = False

if firebase_app_initialized and MD_firebase_config.db is not None:
    with app.app_context():
        app.config['MD_GAME_CONFIGS'] = load_all_game_configs_from_firestore()
        if app.config.get('MD_GAME_CONFIGS'):
            app_logger.info("遊戲設定已成功載入到 Flask 應用程式配置中。")
        else:
            app_logger.error("遊戲設定載入失敗或為空。")
else:
    app_logger.warning("由於 Firebase 初始化或 Firestore 客戶端設定問題 (MD_firebase_config.db is None)，未載入遊戲設定。")


@app.route('/')
def index():
    game_configs_loaded = bool(app.config.get('MD_GAME_CONFIGS'))
    firebase_status = "已初始化" if firebase_app_initialized and MD_firebase_config.db is not None else "初始化失敗或 Firestore 客戶端未設定"
    return jsonify({
        "message": "怪獸養成後端服務運行中！",
        "firebase_status": firebase_status,
        "game_configs_loaded": game_configs_loaded,
        "api_health_check": "/api/MD/health",
        "log_viewer_url": "/api/MD/logs"
    }), 200

@app.route('/api/MD/logs')
def view_logs():
    log_directory = os.path.join(os.path.dirname(__file__), 'logs')
    return send_from_directory(log_directory, 'game_log.html')


if __name__ == '__main__':
    if firebase_app_initialized and MD_firebase_config.db is not None:
        app_logger.info("在開發模式下啟動 Flask 應用程式 (使用 Flask 內建伺服器)。")
        port = int(os.environ.get("PORT", 5000))
        app.run(debug=True, host='0.0.0.0', port=port)
    else:
        app_logger.critical("Firebase 未能成功初始化或 Firestore 客戶端未設定，Flask 應用程式無法啟動。請檢查日誌。")
