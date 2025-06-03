# MD/backend/main.py
# Flask 應用程式主啟動點

from flask import Flask, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
import json # **新增：導入 json 模組**

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

# 配置 CORS
# 這將允許來自任何來源的跨域請求。在生產環境中，你可能需要限制為特定的前端網域。
# 例如：CORS(app, resources={r"/api/*": {"origins": "https://msw2004727.github.io"}})
CORS(app) # 允許所有來源訪問所有路由

# 註冊藍圖
app.register_blueprint(md_bp)

# Firebase Admin SDK 初始化
# 嘗試從環境變數獲取 Firebase 服務帳戶金鑰
# 在 Render.com 上，你可以將整個 JSON 內容作為一個環境變數 (例如 FIREBASE_SERVICE_ACCOUNT_KEY)
# 或者將其路徑指向一個文件。這裡假設直接從環境變數獲取 JSON 字串。
firebase_credentials_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')

if firebase_credentials_json:
    try:
        # 如果是 JSON 字串，直接從字串載入憑證
        cred = credentials.Certificate(json.loads(firebase_credentials_json))
        firebase_admin.initialize_app(cred)
        app_logger.info("Firebase Admin SDK 已從環境變數成功初始化。")
    except Exception as e:
        app_logger.error(f"Firebase Admin SDK 初始化失敗 (從環境變數): {e}", exc_info=True)
else:
    # 如果環境變數中沒有，嘗試使用預設憑證 (例如在 Google Cloud Platform 上運行時)
    try:
        firebase_admin.initialize_app()
        app_logger.info("Firebase Admin SDK 已使用預設憑證初始化。")
    except Exception as e:
        app_logger.error(f"Firebase Admin SDK 初始化失敗 (使用預設憑證): {e}", exc_info=True)

# 獲取 Firestore 客戶端並注入到 MD_firebase_config 模組
if firebase_admin._apps: # 檢查 Firebase app 是否已成功初始化
    db_client = firestore.client()
    set_firestore_client(db_client)
    app_logger.info("Firestore 客戶端已注入到 MD_firebase_config。")
else:
    app_logger.error("Firebase Admin SDK 未成功初始化，Firestore 客戶端無法注入。")


# 在應用程式啟動時載入遊戲設定
# 這些設定將儲存在 Flask 的 current_app.config 中，供路由使用
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
    # 在生產環境中，應使用 Gunicorn 等 WSGI 伺服器來運行
    # 例如：gunicorn main:app -b 0.0.0.0:$PORT
    app_logger.info("在開發模式下啟動 Flask 應用程式。")
    app.run(debug=True, host='0.0.0.0', port=os.environ.get('PORT', 5000))

