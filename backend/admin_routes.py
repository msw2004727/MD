# backend/admin_routes.py
# 新增的後台管理專用路由

import os
import logging
from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timedelta, timezone
import jwt # PyJWT，用於生成和驗證 Token
from .player_services import get_player_data_service # --- 核心修改處：導入玩家服務 ---
from .MD_routes import _get_game_configs_data_from_app_context # --- 核心修改處：導入遊戲設定 ---

# 建立一個新的藍圖 (Blueprint) 來管理後台的路由
admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/MD/admin')

# 建立此路由專用的日誌記錄器
admin_logger = logging.getLogger(__name__)

# 從環境變數讀取後台密碼和 JWT 金鑰，這是更安全的做法
# 您需要在 Render.com 的後台設定這兩個環境變數
ADMIN_PASSWORD = os.environ.get('MD_ADMIN_PASSWORD', 'dev_password') # 提供一個開發用的預設密碼
JWT_SECRET_KEY = os.environ.get('MD_JWT_SECRET', 'a_very_secret_key_for_dev') # 提供一個開發用的預設金鑰

def verify_admin_token() -> bool:
    """
    一個輔助函式，用於驗證請求標頭中的 JWT Token 是否有效。
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        admin_logger.warning("後台 Token 驗證失敗：缺少 Token 或格式不正確。")
        return False
    
    token = auth_header.split('Bearer ')[1]

    try:
        jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        return True
    except jwt.ExpiredSignatureError:
        admin_logger.warning("後台 Token 驗證失敗：Token 已過期。")
        return False
    except jwt.InvalidTokenError as e:
        admin_logger.warning(f"後台 Token 驗證失敗：無效的 Token ({e})。")
        return False

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
        try:
            payload = {
                'exp': datetime.now(timezone.utc) + timedelta(hours=8),
                'iat': datetime.now(timezone.utc),
                'sub': 'admin_user'
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
        admin_logger.warning("後台登入嘗試失敗：密碼錯誤。")
        return jsonify({"error": "密碼錯誤。"}), 401

# --- 核心修改處 START ---
@admin_bp.route('/player_data', methods=['GET'])
def get_player_data_for_admin():
    """
    為後台提供查詢指定玩家詳細資料的 API。
    需要管理員 Token 驗證。
    """
    if not verify_admin_token():
        return jsonify({"error": "管理員驗證失敗"}), 401

    player_id = request.args.get('uid')
    if not player_id:
        return jsonify({"error": "請提供玩家 UID。"}), 400

    admin_logger.info(f"後台請求查詢玩家資料，UID: {player_id}")
    
    game_configs = _get_game_configs_data_from_app_context()
    # 注意：這裡呼叫 get_player_data_service 時，第二個參數 nickname 傳入 None
    # 因為我們是透過 ID 直接查詢，而不是在玩家登入時初始化。
    player_data, _ = get_player_data_service(player_id, None, game_configs)

    if player_data:
        # 為了方便前端使用，我們將玩家的 UID 也加入到回傳的資料中
        player_data['uid'] = player_id
        return jsonify(player_data), 200
    else:
        return jsonify({"error": f"找不到 UID 為 {player_id} 的玩家資料。"}), 404
# --- 核心修改處 END ---

@admin_bp.route('/check_auth', methods=['GET'])
def check_auth_status():
    if not verify_admin_token():
        return jsonify({"authenticated": False, "error": "Token 無效或已過期"}), 401
    return jsonify({"authenticated": True, "message": "驗證成功！"}), 200
