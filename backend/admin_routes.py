# backend/admin_routes.py
# 核心修改處：建立全新的後台管理路由檔案

import os
import jwt
import json
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import Blueprint, jsonify, request, current_app

# 從專案的其他模組導入
from .player_services import get_player_data_service, save_player_data_service
from .mail_services import send_mail_to_player_service

# 建立一個新的藍圖 (Blueprint) 來管理後台的路由
admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/MD/admin')

# 後台管理的密鑰，為了安全，建議您之後將其設定為 Render 的環境變數
ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', 'your_super_secret_admin_key_12345')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'msw2004727') # 您的後台密碼

# 裝飾器：用於驗證後台管理員的 JWT Token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            # 確保 "Bearer " 後有 token
            auth_header = request.headers['Authorization']
            if ' ' in auth_header:
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({'message': '錯誤：缺少 Token'}), 401

        try:
            # 驗證 token
            data = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({'message': '錯誤：Token 已過期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': '錯誤：無效的 Token'}), 401

        return f(*args, **kwargs)
    return decorated

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    """後台登入 API"""
    data = request.get_json()
    if not data or 'password' not in data:
        return jsonify({'error': '缺少密碼'}), 400

    if data['password'] == ADMIN_PASSWORD:
        # 密碼正確，生成 JWT Token
        token = jwt.encode({
            'user': 'admin',
            'exp': datetime.now(tz=timezone.utc) + timedelta(hours=8) # Token 有效期 8 小時
        }, ADMIN_SECRET_KEY, algorithm="HS256")
        
        return jsonify({'success': True, 'token': token})
    else:
        return jsonify({'success': False, 'error': '密碼錯誤'}), 401

# --- 以下是需要保護的後台路由 ---

@admin_bp.route('/player_data', methods=['GET'])
@token_required
def get_admin_player_data_route():
    uid = request.args.get('uid')
    if not uid:
        return jsonify({"error": "請求中缺少玩家 UID"}), 400
    
    # 從 Flask app context 獲取遊戲設定
    game_configs = current_app.config.get('MD_GAME_CONFIGS', {})
    player_data, _ = get_player_data_service(uid, None, game_configs)
    
    if player_data:
        player_data['uid'] = uid # 確保回傳的資料中包含uid
        return jsonify(player_data), 200
    else:
        return jsonify({"error": f"找不到 UID 為 {uid} 的玩家資料"}), 404

@admin_bp.route('/player_data/<string:uid>', methods=['POST'])
@token_required
def update_admin_player_data_route(uid):
    data_to_save = request.get_json()
    if not data_to_save:
        return jsonify({"error": "請求中沒有要儲存的資料"}), 400
    
    if save_player_data_service(uid, data_to_save):
        return jsonify({"success": True, "message": f"玩家 {uid} 的資料已成功更新。"}), 200
    else:
        return jsonify({"error": "儲存玩家資料時發生錯誤"}), 500

@admin_bp.route('/broadcast_mail', methods=['POST'])
@token_required
def broadcast_mail_route():
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db:
        return jsonify({"error": "資料庫服務異常"}), 500

    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    payload_str = data.get('payload_str', '{}')

    if not title or not content:
        return jsonify({"error": "信件標題和內容不能為空。"}), 400

    try:
        payload = json.loads(payload_str)
    except json.JSONDecodeError:
        return jsonify({"error": "附件 (Payload) 的 JSON 格式不正確。"}), 400

    try:
        users_ref = db.collection('users')
        all_users_docs = users_ref.stream()
        count = 0
        for user_doc in all_users_docs:
            recipient_id = user_doc.id
            # 直接調用信箱服務來處理單一玩家的信件發送
            send_mail_to_player_service(
                sender_id="system_admin",
                sender_nickname="遊戲管理員",
                recipient_id=recipient_id,
                title=title,
                content=content,
                payload=payload,
                mail_type="system_message"
            )
            count += 1
        
        # 記錄這次的廣播
        log_entry = {
            "broadcastId": str(time.time()),
            "timestamp": int(time.time()),
            "title": title,
            "content": content,
            "payload": payload,
            "recipient_count": count
        }
        db.collection('MD_SystemLogs').document('Broadcasts').collection('log_entries').add(log_entry)

        return jsonify({"success": True, "message": f"信件已成功發送給 {count} 位玩家。"}), 200
    except Exception as e:
        return jsonify({"error": f"群發信件時發生錯誤: {str(e)}"}), 500
