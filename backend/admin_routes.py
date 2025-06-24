# backend/admin_routes.py
# 核心修改處：建立全新的後台管理路由檔案

import os
import jwt
import json
from datetime import datetime, timedelta, timezone
from functools import wraps
# 【新增】導入 firestore 以便使用查詢功能
from firebase_admin import firestore
from flask import Blueprint, jsonify, request, current_app

# 從專案的其他模組導入
from .player_services import get_player_data_service, save_player_data_service
# 【修改】導入整個 config_editor_services 模組
from . import config_editor_services

# 建立一個新的藍圖 (Blueprint) 來管理後台的路由
admin_bp = Blueprint('admin_bp', __name__, url_prefix='/api/MD/admin')

# 後台管理的密鑰，為了安全，建議您之後將其設定為 Render 的環境變數
ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', 'your_super_secret_admin_key_12345')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'msw2004727') # 您的後台密碼

# 裝飾器：用於驗證後台管理員的 JWT Token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # 針對瀏覽器因CORS發出的預檢請求(OPTIONS)，直接回傳成功
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
            data = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({'message': '錯誤：Token 已過期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': '錯誤：無效的 Token'}), 401

        return f(*args, **kwargs)
    return decorated

# 【修改】將 config_editor 相關路由移至專門的檔案，這裡只保留 admin 核心路由
# backend/admin_routes.py

@admin_bp.route('/login', methods=['POST', 'OPTIONS'])
def admin_login():
    """後台登入 API"""
    data = request.get_json()
    if not data or 'password' not in data:
        return jsonify({'error': '缺少密碼'}), 400
    if data['password'] == ADMIN_PASSWORD:
        token = jwt.encode({
            'user': 'admin',
            'exp': datetime.now(tz=timezone.utc) + timedelta(hours=8)
        }, ADMIN_SECRET_KEY, algorithm="HS256")
        
        return jsonify({'success': True, 'token': token})
    else:
        return jsonify({'success': False, 'error': '密碼錯誤'}), 401

@admin_bp.route('/player_data', methods=['GET', 'OPTIONS'])
@token_required
def get_admin_player_data_route():
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

# --- 核心修改處 START ---
@admin_bp.route('/get_cs_mail', methods=['GET', 'OPTIONS'])
@token_required
def get_cs_mail_route():
    """獲取後台客服信箱中的所有信件。"""
    from . import MD_firebase_config
    db = MD_firebase_config.db
    if not db: return jsonify({"error": "資料庫服務異常"}), 500
    try:
        # 從 MD_AdminMailbox 集合讀取信件，並按時間排序
        mails_ref = db.collection('MD_AdminMailbox').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(100).stream()
        mails = [mail.to_dict() for mail in mails_ref]
        return jsonify(mails), 200
    except Exception as e:
        current_app.logger.error(f"獲取客服信箱信件時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "獲取客服信箱時發生內部錯誤。"}), 500
# --- 核心修改處 END ---

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
