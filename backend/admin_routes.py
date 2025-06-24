# backend/admin_routes.py
# 新增的後台管理專用路由

import os
import logging
from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timedelta, timezone
import jwt # PyJWT，用於生成和驗證 Token

# 建立一個新的藍圖 (Blueprint) 來管理後台的路由
admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/MD/admin')

# 建立此路由專用的日誌記錄器
admin_logger = logging.getLogger(__name__)

# 從環境變數讀取後台密碼和 JWT 金鑰，這是更安全的做法
# 您需要在 Render.com 的後台設定這兩個環境變數
ADMIN_PASSWORD = os.environ.get('MD_ADMIN_PASSWORD', 'dev_password') # 提供一個開發用的預設密碼
JWT_SECRET_KEY = os.environ.get('MD_JWT_SECRET', 'a_very_secret_key_for_dev') # 提供一個開發用的預設金鑰

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    """
    處理後台登入請求。
    """
    data = request.json
    password = data.get('password')

    if not password:
        return jsonify({"error": "請提供密碼。"}), 400

    if password == ADMIN_PASSWORD:
        # 密碼正確，生成一個有時效性的 JWT Token
        try:
            payload = {
                'exp': datetime.now(timezone.utc) + timedelta(hours=8), # Token 8 小時後過期
                'iat': datetime.now(timezone.utc),
                'sub': 'admin_user' # 主題，代表是管理員用戶
            }
            token = jwt.encode(
                payload,
                JWT_SECRET_KEY,
                algorithm='HS256'
            )
            admin_logger.info("後台登入成功，已生成 Token。")
            return jsonify({"success": True, "token": token}), 200
        except Exception as e:
            admin_logger.error(f"生成 JWT Token 時發生錯誤: {e}", exc_info=True)
            return jsonify({"error": "生成認證時發生內部錯誤。"}), 500
    else:
        # 密碼錯誤
        admin_logger.warning("後台登入嘗試失敗：密碼錯誤。")
        return jsonify({"error": "密碼錯誤。"}), 401


def verify_admin_token(token: str) -> bool:
    """
    一個輔助函式，用於驗證傳入的 JWT Token 是否有效。
    未來的後台 API 端點都會呼叫此函式。
    """
    if not token:
        return False
    try:
        jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        return True
    except jwt.ExpiredSignatureError:
        admin_logger.warning("後台 Token 驗證失敗：Token 已過期。")
        return False
    except jwt.InvalidTokenError as e:
        admin_logger.warning(f"後台 Token 驗證失敗：無效的 Token ({e})。")
        return False

# 可以在這裡預留一個需要驗證的測試路由
@admin_bp.route('/check_auth', methods=['GET'])
def check_auth_status():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"authenticated": False, "error": "缺少 Token"}), 401

    token = auth_header.split('Bearer ')[1]
    if verify_admin_token(token):
        return jsonify({"authenticated": True, "message": "驗證成功！"}), 200
    else:
        return jsonify({"authenticated": False, "error": "Token 無效或已過期"}), 401
