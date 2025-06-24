# backend/admin_routes.py
# 新增的後台管理專用路由

import os
import logging
from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timedelta, timezone
import jwt # PyJWT，用於生成和驗證 Token
from .player_services import get_player_data_service, save_player_data_service
from .MD_routes import _get_game_configs_data_from_app_context
from .mail_services import add_mail_to_player # --- 核心修改處：導入 add_mail_to_player ---
from . import MD_firebase_config # --- 核心修改處：導入 firebase_config ---

# 建立一個新的藍圖 (Blueprint) 來管理後台的路由
admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/MD/admin')

# 建立此路由專用的日誌記錄器
admin_logger = logging.getLogger(__name__)

ADMIN_PASSWORD = os.environ.get('MD_ADMIN_PASSWORD', 'dev_password')
JWT_SECRET_KEY = os.environ.get('MD_JWT_SECRET', 'a_very_secret_key_for_dev')

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
    player_data, _ = get_player_data_service(player_id, None, game_configs)

    if player_data:
        player_data['uid'] = player_id
        return jsonify(player_data), 200
    else:
        return jsonify({"error": f"找不到 UID 為 {player_id} 的玩家資料。"}), 404
        
# --- 核心修改處 START ---
@admin_bp.route('/broadcast_mail', methods=['POST'])
def broadcast_mail_route():
    """
    處理群發系統信件的請求。
    """
    if not verify_admin_token():
        return jsonify({"error": "管理員驗證失敗"}), 401

    data = request.json
    title = data.get('title')
    content = data.get('content')
    payload_str = data.get('payload_str', '{}') # 接收字串格式的 payload

    if not title or not content:
        return jsonify({"error": "信件標題和內容不能為空。"}), 400

    try:
        # 解析 JSON 字串 payload
        payload = json.loads(payload_str) if payload_str else {}
    except json.JSONDecodeError:
        return jsonify({"error": "附件 (Payload) 的 JSON 格式不正確。"}), 400

    db = MD_firebase_config.db
    if not db:
        admin_logger.error("群發信件失敗：Firestore 資料庫未初始化。")
        return jsonify({"error": "資料庫服務異常。"}), 500

    try:
        users_ref = db.collection('users')
        users_docs = users_ref.stream() # 獲取所有玩家文件
        
        batch = db.batch()
        count = 0

        mail_template = {
            "type": "system_message",
            "title": title,
            "content": content,
            "sender_name": "系統管理員",
            "payload": payload
        }

        for doc in users_docs:
            player_id = doc.id
            game_data_ref = users_ref.document(player_id).collection('gameData').document('main')
            
            # 使用 FieldValue.array_union 來安全地添加新信件
            # 注意：add_mail_to_player 內部是 insert(0)，更複雜，這裡簡化為批次更新
            # 為了使用批次處理，我們直接在這裡構造信件物件
            new_mail_item = {
                "id": str(uuid.uuid4()),
                "type": mail_template["type"],
                "title": mail_template["title"],
                "sender_name": mail_template["sender_name"],
                "timestamp": int(time.time()),
                "is_read": False,
                "content": mail_template["content"],
                "payload": mail_template["payload"],
            }
            # 使用 array_union 將新信件添加到 mailbox 陣列
            batch.update(game_data_ref, {'mailbox': firestore.ArrayUnion([new_mail_item])})
            count += 1

            # Firestore 的批次寫入上限為 500 次操作
            if count % 499 == 0:
                batch.commit()
                batch = db.batch()
                admin_logger.info(f"已提交一批次 ({count}) 的系統信件。")

        if count % 499 != 0:
            batch.commit() # 提交最後剩餘的批次

        admin_logger.info(f"群發系統信件成功，共發送給 {count} 位玩家。")
        return jsonify({"success": True, "message": f"成功發送信件給 {count} 位玩家。"}), 200

    except Exception as e:
        admin_logger.error(f"群發信件過程中發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "群發信件時發生伺服器內部錯誤。"}), 500
# --- 核心修改處 END ---

@admin_bp.route('/check_auth', methods=['GET'])
def check_auth_status():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"authenticated": False, "error": "缺少 Token"}), 401

    token = auth_header.split('Bearer ')[1]
    # 使用 self.verify_admin_token()
    if verify_admin_token():
        return jsonify({"authenticated": True, "message": "驗證成功！"}), 200
    else:
        return jsonify({"authenticated": False, "error": "Token 無效或已過期"}), 401
