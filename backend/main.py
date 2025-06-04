# MD/backend/main.py
# Flask 應用程式主啟動點

from flask import Flask, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
import json

# 導入你的藍圖 (使用相對導入，修正)
from .MD_routes import md_bp
# 導入 Firebase 配置設定函式 (使用相對導入，修正)
from . import MD_firebase_config # 這是導入同層級模組的標準相對方式
# 導入遊戲設定服務 (使用相對導入，修正)
from .MD_config_services import load_all_game_configs_from_firestore

# 設定日誌
# 建議在 Render.com 上，日誌會自動導向標準輸出，平台會收集它們
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
app_logger = logging.getLogger(__name__)

# 初始化 Flask 應用程式
# 注意：當使用 Gunicorn 這樣的 WSGI 伺服器時，它們會負責創建 app 實例。
# 但為了本地開發和讓 Render 的 build 過程能找到 app，我們仍然在這裡定義它。
app = Flask(__name__)

# --- CORS 配置 ---
allowed_origins = [
    "https://msw2004727.github.io",  # 您的 GitHub Pages
    "http://127.0.0.1:5500",         # 本地 Live Server
    "http://localhost:5500",
    "http://127.0.0.1:8080",         # 其他本地開發端口
    "http://localhost:8080",
]
CORS(app,
     resources={r"/api/*": {"origins": allowed_origins}},
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
)
app_logger.info(f"CORS configured for origins: {allowed_origins}")

# 註冊藍圖
app.register_blueprint(md_bp)

# --- Firebase Admin SDK 初始化 ---
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json' # 本地開發時使用
firebase_app_initialized = False
cred = None

app_logger.info(f"--- 開始 Firebase Admin SDK 初始化 ---")

if not firebase_admin._apps: # 僅在尚未初始化時執行
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
    elif os.path.exists(SERVICE_ACCOUNT_KEY_PATH): # 僅在本地開發且未設定環境變數時嘗試
        app_logger.info(f"未設定環境變數憑證，嘗試從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 載入 (適用於本地開發)。")
        key_file_exists = os.path.exists(SERVICE_ACCOUNT_KEY_PATH)
        app_logger.info(f"本地金鑰檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 是否存在: {key_file_exists}")
        if key_file_exists:
            try:
                cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
                app_logger.info(f"成功從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 創建憑證物件。")
            except Exception as e:
                app_logger.error(f"從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 創建 Firebase 憑證物件失敗: {e}", exc_info=True)
                cred = None
        else:
            app_logger.warning(f"本地金鑰檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 不存在。")
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
        MD_firebase_config.set_firestore_client(db_client) # 使用絕對路徑調用 set_firestore_client，正確
        app_logger.info("Firestore 客戶端已成功獲取並注入到 MD_firebase_config。")
    except Exception as e:
        app_logger.error(f"獲取 Firestore 客戶端或注入時發生錯誤: {e}", exc_info=True)
        firebase_app_initialized = False # 如果獲取客戶端失敗，標記為不成功
else:
    app_logger.error("因 Firebase Admin SDK 初始化問題，無法獲取 Firestore 客戶端。")
    firebase_app_initialized = False

# 在應用程式啟動時載入遊戲設定
# 確保在 Firestore 客戶端成功設定後才執行
if firebase_app_initialized and MD_firebase_config.db is not None: # 使用絕對路徑檢查 db，正確
    with app.app_context(): # 確保在應用程式上下文中操作 app.config
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
    # 檢查遊戲設定是否已載入，提供更詳細的狀態
    game_configs_loaded = bool(app.config.get('MD_GAME_CONFIGS'))
    firebase_status = "已初始化" if firebase_app_initialized and MD_firebase_config.db is not None else "初始化失敗或 Firestore 客戶端未設定"
    return jsonify({
        "message": "怪獸養成後端服務運行中！",
        "firebase_status": firebase_status,
        "game_configs_loaded": game_configs_loaded,
        "api_health_check": "/api/MD/health"
    }), 200

# 如果直接運行此檔案 (例如本地開發)，則啟動 Flask 內建的開發伺服器
# 當部署到 Render.com 時，Render 會使用 Gunicorn (或其他 WSGI 伺服器) 來啟動應用，
# 它會直接尋找名為 'app' 的 Flask 實例，而不會執行這個 __main__ 區塊。
if __name__ == '__main__':
    if firebase_app_initialized and MD_firebase_config.db is not None:
        app_logger.info("在開發模式下啟動 Flask 應用程式 (使用 Flask 內建伺服器)。")
        # Render.com 通常會使用類似 'gunicorn main:app' 的命令來啟動，
        # 其中 'main' 是您的檔案名 (main.py)，'app' 是 Flask 應用程式實例。
        # Gunicorn 會處理綁定到 $PORT 環境變數。
        # 本地開發時，Flask 內建伺服器使用以下配置。
        port = int(os.environ.get("PORT", 5000)) # 允許 Render 設定 PORT
        app.run(debug=True, host='0.0.0.0', port=port)
    else:
        app_logger.critical("Firebase 未能成功初始化或 Firestore 客戶端未設定，Flask 應用程式無法啟動。請檢查日誌。")

