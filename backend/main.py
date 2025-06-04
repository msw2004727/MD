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
from MD_firebase_config import set_firestore_client
# 導入遊戲設定服務
from MD_config_services import load_all_game_configs_from_firestore

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
app_logger = logging.getLogger(__name__)

# 初始化 Flask 應用程式
app = Flask(__name__)

# --- 更明確的 CORS 配置 ---
# 定義允許的前端來源
# 您的 GitHub Pages 域名是 https://msw2004727.github.io
# 如果您的遊戲部署在子目錄，例如 https://msw2004727.github.io/your-repo-name/
# origin 仍然是 https://msw2004727.github.io
allowed_origins = [
    "https://msw2004727.github.io",  # 您的 GitHub Pages
    "http://127.0.0.1:5500",         # 常見的 Live Server 本地開發端口
    "http://localhost:5500",
    "http://127.0.0.1:8080",         # 其他可能的本地開發端口
    "http://localhost:8080",
    # 如果您使用其他本地開發端口，也請加入
]

# CORS(app) # 舊的簡單配置
# 將 CORS 策略應用於所有 /api/ 路徑下的路由，並明確指定來源和方法
CORS(app, 
     resources={r"/api/*": {"origins": allowed_origins}}, 
     supports_credentials=True, 
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], # 確保 OPTIONS 被允許
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"] # 允許常見的標頭
)
app_logger.info(f"CORS configured to allow requests from: {allowed_origins}")

# 註冊藍圖
app.register_blueprint(md_bp)

# Firebase Admin SDK 初始化
firebase_credentials_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')

if firebase_credentials_json:
    try:
        cred = credentials.Certificate(json.loads(firebase_credentials_json))
        firebase_admin.initialize_app(cred)
        app_logger.info("Firebase Admin SDK 已從環境變數成功初始化。")
    except Exception as e:
        app_logger.error(f"Firebase Admin SDK 初始化失敗 (從環境變數): {e}", exc_info=True)
else:
    try:
        firebase_admin.initialize_app() # 嘗試使用預設憑證
        app_logger.info("Firebase Admin SDK 已使用預設憑證初始化。")
    except Exception as e:
        app_logger.error(f"Firebase Admin SDK 初始化失敗 (使用預設憑證): {e}", exc_info=True)

# 獲取 Firestore 客戶端並注入到 MD_firebase_config 模組
if firebase_admin._apps:
    db_client = firestore.client()
    set_firestore_client(db_client)
    app_logger.info("Firestore 客戶端已注入到 MD_firebase_config。")
else:
    app_logger.error("Firebase Admin SDK 未成功初始化，Firestore 客戶端無法注入。")


# 在應用程式啟動時載入遊戲設定
with app.app_context():
    app.config['MD_GAME_CONFIGS'] = load_all_game_configs_from_firestore()
    if app.config['MD_GAME_CONFIGS']:
        app_logger.info("遊戲設定已成功載入到 Flask 應用程式配置中。")
    else:
        app_logger.error("遊戲設定載入失敗。")

# 定義一個根路由，用於健康檢查或基本資訊
@app.route('/')
def index():
    return jsonify({"message": "怪獸養成後端服務運行中！訪問 /api/MD/health 檢查 API 狀態。"}), 200

# 如果直接運行此檔案，則啟動 Flask 開發伺服器
if __name__ == '__main__':
    app_logger.info("在開發模式下啟動 Flask 應用程式。")
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
