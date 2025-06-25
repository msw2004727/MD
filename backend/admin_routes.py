# backend/admin_routes.py
import os
import jwt
import json
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import Blueprint, jsonify, request, current_app
from firebase_admin import firestore

# --- 核心修改處：將大部分 import 移至函式內部 ---
# from .player_services import get_player_data_service, save_player_data_service
# from . import config_editor_services

admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/MD/admin')

# --- 核心修改處：從環境變數讀取金鑰與密碼 ---
# 從環境變數讀取，不再提供程式碼內的預設值
ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', 'default_jwt_secret_for_dev_only')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
# --- 核心修改處 END ---

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # 處理 CORS 預檢請求 (OPTIONS)
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200
            
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if ' ' in auth_header:
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({'message': '錯誤：缺少 Token'}), 401

        try:
            jwt.decode(token, ADMIN_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({'message': '錯誤：Token 已過期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': '錯誤：無效的 Token'}), 401

        return f(*args, **kwargs)
    return decorated

@admin_bp.route('/login', methods=['POST', 'OPTIONS'])
def admin_login():
    # 處理 CORS 預檢請求 (OPTIONS)
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    data = request.get_json()

    # --- 核心修改處：增強密碼驗證邏輯 ---
    if not ADMIN_PASSWORD:
        current_app.logger.error("後台管理員密碼未在環境變數中設定，登入功能已禁用。")
        return jsonify({'error': '後台登入功能未啟用。'}), 503 # 503 Service Unavailable

    if not data or 'password' not in data:
        return jsonify({'error': '缺少密碼'}), 400
    
    if data['password'] == ADMIN_PASSWORD:
    # --- 核心修改處 END ---
        token = jwt.encode({
            'user': 'admin',
            'exp': datetime.now(tz=timezone.utc) + timedelta(hours=8)
        }, ADMIN_SECRET_KEY, algorithm="HS256")
        
        return jsonify({'success': True, 'token': token})
    else:
        return jsonify({'success': False, 'error': '密碼錯誤'}), 401

# --- 核心修改處 START ---
@admin_bp.route('/save_game_mechanics', methods=['POST', 'OPTIONS'])
@token_required
def save_game_mechanics_route():
    """
    接收來自前端「遊戲機制」面板的結構化資料，並儲存到 game_mechanics.json。
    """
    from .config_editor_services import save_game_mechanics_service
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "請求中缺少設定資料。"}), 400
    
    success, error = save_game_mechanics_service(data)
    
    if success:
        return jsonify({"success": True, "message": "遊戲機制設定已成功儲存並重新載入。"}), 200
    else:
        return jsonify({"error": error}), 500
# --- 核心修改處 END ---

@admin_bp.route('/player_data', methods=['GET', 'OPTIONS'])
@token_required
def get_admin_player_data_route():
    from .player_services import get_player_data_service
    uid = request.args.get('uid')
    if not uid:
        return jsonify({"error": "請求中缺少玩家 UID"}), 400
    game_configs = current_app.config.get('MD_GAME_CONFIGS', {})
    player_data, _ = get_player_data_service(uid, None, game_configs)
    if player_data:
        player_data['uid'] = uid
        return jsonify(player_data), 200
    else:
        return jsonify({"error": f"找不到 UID 為 {uid} 的玩家資料"}), 404

@admin_bp.route('/player_data/<string:uid>', methods=['POST', 'OPTIONS'])
@token_required
def update_admin_player_data_route(uid):
    from .player_services import save_player_data_service
    data_to_save = request.get_json()
    if not data_to_save:
        return jsonify({"error": "請求中沒有要儲存的資料"}), 400
    if save_player_data_service(uid, data_to_save):
        return jsonify({"success": True, "message": f"玩家 {uid} 的資料已成功更新。"}), 200
    else:
        return jsonify({"error": "儲存玩家資料時發生錯誤"}), 500

@admin_bp.route('/send_mail_to_player', methods=['POST', 'OPTIONS'])
@token_required
def send_mail_to_player_route():
    from .mail_services import send_mail_to_player_service
    data = request.get_json()
    recipient_id = data.get('recipient_id')
    title = data.get('title')
    content = data.get('content')
    sender_name = data.get('sender_name', '遊戲管理員')
    if not all([recipient_id, title, content]):
        return jsonify({"error": "請求中缺少 recipient_id, title, 或 content。"}), 400
    success, error_msg = send_mail_to_player_service(
        sender_id="system_admin",
        sender_nickname=sender_name,
        recipient_id=recipient_id,
        title=title,
        content=content,
        payload={},
        mail_type="system_message"
    )
    if success:
        return jsonify({"success": True, "message": f"信件已成功發送給玩家 {recipient_id}。"}), 200
    else:
        return jsonify({"error": error_msg or "發送信件時發生未知錯誤。"}), 500

@admin_bp.route('/get_broadcast_log', methods=['GET', 'OPTIONS'])
@token_required
def get_broadcast_log_route():
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db: return jsonify({"error": "資料庫服務異常"}), 500
    try:
        logs_ref = db.collection('MD_SystemLogs').document('Broadcasts').collection('log_entries').limit(50).stream()
        logs = [log.to_dict() for log in logs_ref]
        logs.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        return jsonify(logs), 200
    except Exception as e:
        current_app.logger.error(f"獲取群發信件歷史時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "獲取歷史紀錄時發生內部錯誤。"}), 500

@admin_bp.route('/get_cs_mail', methods=['GET', 'OPTIONS'])
@token_required
def get_cs_mail_route():
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db: return jsonify({"error": "資料庫服務異常"}), 500
    try:
        mails_ref = db.collection('MD_AdminMailbox').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(100).stream()
        mails = [mail.to_dict() for mail in mails_ref]
        return jsonify(mails), 200
    except Exception as e:
        current_app.logger.error(f"獲取客服信箱信件時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "獲取客服信箱時發生內部錯誤。"}), 500

@admin_bp.route('/broadcast_mail', methods=['POST', 'OPTIONS'])
@token_required
def broadcast_mail_route():
    from . import MD_firebase_config
    from .mail_services import send_mail_to_player_service
    db = MD_firebase_config.db
    if not db: return jsonify({"error": "資料庫服務異常"}), 500
    data = request.get_json()
    sender_name = data.get('sender_name', '遊戲管理員')
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
            success, _ = send_mail_to_player_service(
                sender_id="system_admin",
                sender_nickname=sender_name,
                recipient_id=recipient_id,
                title=title,
                content=content,
                payload=payload,
                mail_type="system_message"
            )
            if success: count += 1
        import time
        log_entry = {"broadcastId": str(time.time()), "timestamp": int(time.time()), "title": title, "content": content, "payload": payload, "recipient_count": count}
        db.collection('MD_SystemLogs').document('Broadcasts').collection('log_entries').add(log_entry)
        return jsonify({"success": True, "message": f"信件已成功發送給 {count} 位玩家。"}), 200
    except Exception as e:
        return jsonify({"error": f"群發信件時發生錯誤: {str(e)}"}), 500

@admin_bp.route('/game_overview', methods=['GET', 'OPTIONS'])
@token_required
def get_game_overview_route():
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db: return jsonify({"error": "資料庫服務異常"}), 500
    try:
        total_players, total_gold, total_dna_fragments = 0, 0, 0
        monster_rarity_count = {"普通": 0, "稀有": 0, "菁英": 0, "傳奇": 0, "神話": 0}
        users_ref = db.collection('users')
        all_users_docs = list(users_ref.stream())
        total_players = len(all_users_docs)
        for user_doc in all_users_docs:
            game_data_doc = user_doc.reference.collection('gameData').document('main').get()
            if not game_data_doc.exists: continue
            player_data = game_data_doc.to_dict()
            if not player_data: continue
            total_gold += player_data.get("playerStats", {}).get("gold", 0)
            total_dna_fragments += sum(1 for dna in player_data.get("playerOwnedDNA", []) if dna is not None)
            for monster in player_data.get("farmedMonsters", []):
                rarity = monster.get("rarity")
                if rarity in monster_rarity_count: monster_rarity_count[rarity] += 1
        overview_stats = {"totalPlayers": total_players, "totalGold": total_gold, "totalDnaFragments": total_dna_fragments, "monsterRarityCount": monster_rarity_count}
        return jsonify(overview_stats), 200
    except Exception as e:
        current_app.logger.error(f"生成遊戲總覽報表時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "生成報表時發生內部錯誤。"}), 500

@admin_bp.route('/recall_mail', methods=['POST', 'OPTIONS'])
@token_required
def recall_mail_route():
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db: return jsonify({"error": "資料庫服務異常"}), 500
    data = request.get_json()
    broadcast_id_to_recall = data.get('broadcastId')
    if not broadcast_id_to_recall:
        return jsonify({"error": "請求中缺少 broadcastId。"}), 400
    try:
        current_app.logger.info(f"Admin is attempting to recall broadcast mail with ID: {broadcast_id_to_recall}")
        query = db.collection('MD_SystemLogs').document('Broadcasts').collection('log_entries').where('broadcastId', '==', broadcast_id_to_recall).limit(1)
        docs = query.stream()
        doc_to_delete = next(docs, None)
        if doc_to_delete:
            doc_to_delete.reference.delete()
            return jsonify({"success": True, "message": f"廣播信件(ID: {broadcast_id_to_recall})已從日誌中移除。完整回收功能待開發。"}), 200
        else:
            return jsonify({"error": "在日誌中找不到該封廣播信件。"}), 404
    except Exception as e:
        current_app.logger.error(f"回收廣播信件時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "回收信件時發生內部錯誤。"}), 500

@admin_bp.route('/delete_cs_mail/<string:mail_id>', methods=['DELETE', 'OPTIONS'])
@token_required
def delete_cs_mail_route(mail_id):
    """
    刪除一封指定的客服信件。
    """
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db: 
        return jsonify({"error": "資料庫服務異常"}), 500
    
    try:
        mail_ref = db.collection('MD_AdminMailbox').document(mail_id)
        mail_doc = mail_ref.get()
        
        if not mail_doc.exists:
            return jsonify({"error": "找不到該封信件。"}), 404
            
        mail_ref.delete()
        current_app.logger.info(f"管理員已刪除客服信件，ID: {mail_id}")
        return jsonify({"success": True, "message": "信件已成功刪除。"}), 200
        
    except Exception as e:
        current_app.logger.error(f"刪除客服信件 {mail_id} 時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "刪除信件時發生內部錯誤。"}), 500
