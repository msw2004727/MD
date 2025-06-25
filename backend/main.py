import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 初始化 Firebase Admin SDK
# 注意：這裡假設 MD_firebase_config.py 仍在 backend/ 的根目錄
# 如果您也移動了它，請更新下面的 import
import MD_firebase_config

# 匯入服務 (Services)
# 注意：這些是根據您的整理進度，假設已移至 services/ 資料夾
from services.player_services import initialize_player
from services.utils_services import get_game_configs, get_announcement

# 匯入路由藍圖 (Blueprints)
# 注意：這些是根據您的整理進度，假設已移至 routes/ 資料夾
from routes.MD_routes import md_bp
from routes.admin_routes import admin_bp
from routes.adventure_routes import adventure_bp
from routes.champion_routes import champion_bp
from routes.config_editor_routes import config_editor_bp
from routes.mail_routes import mail_bp

# 設置日誌
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 註冊藍圖
app.register_blueprint(md_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(adventure_bp, url_prefix='/api/adventure')
app.register_blueprint(champion_bp, url_prefix='/api/champion')
app.register_blueprint(config_editor_bp, url_prefix='/api/config_editor')
app.register_blueprint(mail_bp, url_prefix='/api/mail')


@app.route('/api/initialize_player', methods=['POST'])
def handle_initialize_player():
    """處理玩家初始化請求"""
    return initialize_player()

@app.route('/api/game_configs', methods=['GET'])
def handle_get_game_configs():
    """提供遊戲設定檔"""
    return get_game_configs()

@app.route('/api/announcement', methods=['GET'])
def handle_get_announcement():
    """提供遊戲公告"""
    return get_announcement()


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not Found"}), 404

@app.errorhandler(500)
def internal_error(error):
    logging.error(f"Server Error: {error}")
    return jsonify({"error": "Internal Server Error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
