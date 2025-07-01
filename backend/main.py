import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

# 這裡我們需要從您的專案中找到原本的路由檔案
# 根據之前的錯誤日誌，我們知道有這些
from admin_routes import bp as admin_bp
# 接下來可能還有 MD_routes, adventure_routes 等，我們先把它們的位置空出來
# from MD_routes import bp as md_bp
# from adventure_routes import bp as adventure_bp
# ...

import MD_firebase_config

# 初始化 Firebase
MD_firebase_config.initialize_firebase()

# 建立 Flask app
app = Flask(__name__)

# 設定 CORS
CORS(app, resources={r"/api/*": {"origins": "https://msw2004727.github.io"},
                     r"/admin/api/*": {"origins": "https://msw2004727.github.io"}},
     supports_credentials=True)

# 註冊藍圖 (Blueprint)，這是 Flask 組織路由的方式
app.register_blueprint(admin_bp, url_prefix='/admin/api')
# app.register_blueprint(md_bp, url_prefix='/api')
# ...

# 根目錄路由
@app.route('/')
def index():
    return jsonify({"message": "歡迎來到怪獸地下城 API (Flask 版本)"})

# 全局錯誤處理
@app.errorhandler(HTTPException)
def handle_exception(e):
    """Return JSON instead of HTML for HTTP errors."""
    response = e.get_response()
    response.data = jsonify({
        "code": e.code,
        "name": e.name,
        "description": e.description,
    }).data
    response.content_type = "application/json"
    return response

# 如果直接執行這個檔案，就用 Flask 內建的伺服器
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
