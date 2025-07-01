# backend/auth_middleware.py
from functools import wraps
from flask import request, jsonify
from firebase_admin import auth
import logging

auth_logger = logging.getLogger(__name__)

def firebase_auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "未授權：缺少或格式錯誤的 Authorization header。"}), 401

        id_token = auth_header.split('Bearer ')[1]
        try:
            decoded_token = auth.verify_id_token(id_token)
            player_id = decoded_token['uid']
            # 將驗證後的 player_id 傳遞給被裝飾的路由函數
            return f(player_id, *args, **kwargs)
        except auth.ExpiredIdTokenError:
            auth_logger.warning("Firebase token 已過期。")
            return jsonify({"error": "Token 已過期，請重新登入。"}), 401
        except auth.InvalidIdTokenError as e:
            auth_logger.error(f"無效的 Firebase token: {e}")
            return jsonify({"error": "無效的 Token。"}), 401
        except Exception as e:
            auth_logger.error(f"驗證 Firebase token 時發生未知錯誤: {e}", exc_info=True)
            return jsonify({"error": "Token 驗證失敗。"}), 500
    return decorated_function
