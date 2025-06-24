# backend/admin_routes.py
# 新增的後台管理專用路由

import os
import logging
from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timedelta, timezone
import jwt # PyJWT，用於生成和驗證 Token
import uuid
import time
from .player_services import get_player_data_service, save_player_data_service 
from .MD_routes import _get_game_configs_data_from_app_context 
from .mail_services import add_mail_to_player 
from . import MD_firebase_config
from google.cloud import firestore
import json # 導入 json 模組

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
        
@admin_bp.route('/player_data/<string:player_id>', methods=['POST'])
def update_player_data_by_admin(player_id: str):
    """
    接收管理員從後台提交的修改後玩家資料，並儲存到資料庫。
    """
    if not verify_admin_token():
        return jsonify({"error": "管理員驗證失敗"}), 401

    updated_data = request.json
    if not updated_data:
        return jsonify({"error": "請求中未包含要更新的資料。"}), 400
        
    admin_logger.info(f"後台請求更新玩家 {player_id} 的資料。")

    try:
        if save_player_data_service(player_id, updated_data):
            admin_logger.info(f"成功更新玩家 {player_id} 的資料。")
            return jsonify({"success": True, "message": "玩家資料已成功儲存！"}), 200
        else:
            admin_logger.error(f"後台更新玩家 {player_id} 資料時，save_player_data_service 回傳 False。")
            return jsonify({"error": "儲存玩家資料到資料庫時失敗。"}), 500
            
    except Exception as e:
        admin_logger.error(f"後台更新玩家 {player_id} 資料時發生未知錯誤: {e}", exc_info=True)
        return jsonify({"error": "伺服器內部錯誤，更新失敗。"}), 500

@admin_bp.route('/broadcast_mail', methods=['POST'])
def broadcast_mail_route():
    """
    處理群發系統信件的請求，並記錄發送歷史。
    """
    if not verify_admin_token():
        return jsonify({"error": "管理員驗證失敗"}), 401

    data = request.json
    title = data.get('title')
    content = data.get('content')
    payload_str = data.get('payload_str', '{}') 

    if not title or not content:
        return jsonify({"error": "信件標題和內容不能為空。"}), 400

    try:
        payload = json.loads(payload_str) if payload_str else {}
    except json.JSONDecodeError:
        return jsonify({"error": "附件 (Payload) 的 JSON 格式不正確。"}), 400

    db = MD_firebase_config.db
    if not db:
        admin_logger.error("群發信件失敗：Firestore 資料庫未初始化。")
        return jsonify({"error": "資料庫服務異常。"}), 500

    try:
        users_ref = db.collection('users')
        users_docs = users_ref.stream() 
        
        batch = db.batch()
        count = 0
        broadcast_id = str(uuid.uuid4())
        timestamp = int(time.time())

        for doc in users_docs:
            player_id = doc.id
            game_data_ref = users_ref.document(player_id).collection('gameData').document('main')
            
            new_mail_item = {
                "id": str(uuid.uuid4()),
                "broadcastId": broadcast_id,
                "type": "system_message",
                "title": title,
                "sender_name": "系統管理員",
                "timestamp": timestamp,
                "is_read": False,
                "content": content,
                "payload": payload,
            }
            batch.update(game_data_ref, {'mailbox': firestore.ArrayUnion([new_mail_item])})
            count += 1

            if count % 499 == 0:
                batch.commit()
                batch = db.batch()
                admin_logger.info(f"已提交一批次 ({count}) 的系統信件。")

        if count > 0 and count % 499 != 0:
            batch.commit()
        
        log_ref = db.collection('MD_SystemMailLog').document(broadcast_id)
        log_ref.set({
            "broadcastId": broadcast_id,
            "title": title,
            "content": content,
            "payload": payload,
            "timestamp": timestamp,
            "sentToCount": count
        })

        admin_logger.info(f"群發系統信件成功，共發送給 {count} 位玩家。Broadcast ID: {broadcast_id}")
        return jsonify({"success": True, "message": f"成功發送信件給 {count} 位玩家。"}), 200

    except Exception as e:
        admin_logger.error(f"群發信件過程中發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "群發信件時發生伺服器內部錯誤。"}), 500

@admin_bp.route('/get_broadcast_log', methods=['GET'])
def get_broadcast_log_route():
    """
    獲取已發送的系統信件歷史紀錄。
    """
    if not verify_admin_token():
        return jsonify({"error": "管理員驗證失敗"}), 401
    
    db = MD_firebase_config.db
    if not db:
        return jsonify({"error": "資料庫服務異常。"}), 500

    try:
        log_ref = db.collection('MD_SystemMailLog').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(50)
        docs = log_ref.stream()
        logs = [doc.to_dict() for doc in docs]
        return jsonify(logs), 200
    except Exception as e:
        admin_logger.error(f"獲取系統信件日誌時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "獲取日誌時發生伺服器內部錯誤。"}), 500


@admin_bp.route('/recall_mail', methods=['POST'])
def recall_mail_route():
    """
    回收一封已發送的系統信件。
    """
    if not verify_admin_token():
        return jsonify({"error": "管理員驗證失敗"}), 401

    data = request.json
    broadcast_id = data.get('broadcastId')
    if not broadcast_id:
        return jsonify({"error": "請提供要回收的信件 broadcastId。"}), 400

    db = MD_firebase_config.db
    if not db:
        return jsonify({"error": "資料庫服務異常。"}), 500

    try:
        users_ref = db.collection('users')
        users_docs = users_ref.stream()
        
        batch = db.batch()
        count = 0
        
        for user_doc in users_docs:
            player_id = user_doc.id
            game_data_ref = users_ref.document(player_id).collection('gameData').document('main')
            player_data = game_data_ref.get().to_dict()

            if player_data and 'mailbox' in player_data:
                mailbox = player_data['mailbox']
                mail_to_remove = next((mail for mail in mailbox if mail.get("broadcastId") == broadcast_id), None)
                
                if mail_to_remove:
                    batch.update(game_data_ref, {'mailbox': firestore.ArrayRemove([mail_to_remove])})
                    count += 1

                    if count > 0 and count % 499 == 0:
                        batch.commit()
                        batch = db.batch()
                        admin_logger.info(f"已提交一批次 ({count}) 的信件回收操作。")

        if count > 0 and count % 499 != 0:
            batch.commit()

        log_ref = db.collection('MD_SystemMailLog').document(broadcast_id)
        log_ref.delete()

        admin_logger.info(f"信件回收成功，Broadcast ID: {broadcast_id}，共從 {count} 位玩家信箱中移除。")
        return jsonify({"success": True, "message": f"成功從 {count} 位玩家的信箱中回收信件。"}), 200

    except Exception as e:
        admin_logger.error(f"回收信件過程中發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "回收信件時發生伺服器內部錯誤。"}), 500

@admin_bp.route('/check_auth', methods=['GET'])
def check_auth_status():
    if not verify_admin_token():
        return jsonify({"authenticated": False, "error": "Token 無效或已過期"}), 401
    return jsonify({"authenticated": True, "message": "驗證成功！"}), 200
