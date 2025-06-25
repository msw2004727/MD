# backend/main.py

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database initialization
from backend.database.firebase_config import initialize_firebase

# Initialize Firebase
db = initialize_firebase()

# Import services
from backend.player_services import player_service
from backend.monster_combination_services import monster_combination_service
from backend.monster_cultivation_services import monster_cultivation_service
from backend.utils_services import utils_service

# Import blueprints
from backend.auth.auth_routes import auth_bp
from backend.admin_routes import admin_bp
from backend.mail_routes import mail_bp

# 【註解】由於 analytics_services.py 尚未完成，暫時不加載此模組以避免啟動錯誤
# from backend.analytics.analytics_routes import analytics_bp

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, supports_credentials=True)

# Set the secret key for session management
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'a_default_secret_key')

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(admin_bp)
app.register_blueprint(mail_bp, url_prefix='/api')

# 【註解】由於 analytics_services.py 尚未完成，暫時不註冊此藍圖
# app.register_blueprint(analytics_bp)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
