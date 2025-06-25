# backend/mail_routes.py
# 新增的路由檔案：專門處理信箱系統相關的 API 端點

import logging
from flask import Blueprint, jsonify, request

# 從專案的其他模組導入
# --- 核心修改處 START ---
# 更新 services 的 import 路徑
from .services.player_services import get_player_data_service, save_player_data_service
from .services.mail_services import add_mail_to_player, delete_mail_from_player, mark_mail_as_read, send_mail_to_player_service, claim_mail_attachments_service
# --- 核心修改處 END ---
from .MD_routes import _get_authenticated_user_id, _get_game_configs_data_from_app_context

# 建立一個新的藍圖 (Blueprint) 來管理信箱的路由
mail_bp = Blueprint('mail_bp', __name__, url_prefix='/api/MD/mailbox')

mail_routes_logger = logging.getLogger(__name__)


@mail_bp.route('/', methods=['GET'])
def get_mailbox_route():
    """
    獲取當前登入玩家的所有信件。
    """
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, None, game_configs)

    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    mailbox = player_data.get("mailbox", [])
    mail_routes_logger.info(f"成功為玩家 {user_id} 獲取 {len(mailbox)} 封信件。")
    return jsonify(mailbox), 200


@mail_bp.route('/<mail_id>', methods=['DELETE'])
def delete_mail_route(mail_id: str):
    """
    刪除一封指定的信件。
    """
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, None, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    updated_player_data = delete_mail_from_player(player_data, mail_id)
    
    if save_player_data_service(user_id, updated_player_data):
        return jsonify({"success": True, "message": "信件已刪除。"}), 200
    else:
        return jsonify({"error": "刪除信件後儲存資料失敗。"}), 500


@mail_bp.route('/<mail_id>/read', methods=['POST'])
def mark_as_read_route(mail_id: str):
    """
    將一封指定的信件標記為已讀。
    """
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, None, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    updated_player_data = mark_mail_as_read(player_data, mail_id)
    
    if save_player_data_service(user_id, updated_player_data):
        return jsonify({"success": True, "message": "信件已標記為已讀。"}), 200
    else:
        return jsonify({"error": "標記已讀後儲存資料失敗。"}), 500

@mail_bp.route('/send', methods=['POST'])
def send_mail_route():
    """
    處理玩家寄送一封新信件給另一位玩家。
    """
    # 驗證寄件人身份
    sender_id, sender_nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    # 從請求中獲取寄信資訊
    data = request.json
    recipient_id = data.get('recipient_id')
    title = data.get('title')
    content = data.get('content')
    payload = data.get('payload') # 新增：接收 payload

    # 驗證參數是否齊全
    if not all([recipient_id, title, content]):
        return jsonify({"error": "請求中缺少必要的欄位 (recipient_id, title, content)。"}), 400

    # 呼叫服務層的寄信函式
    success, error_msg = send_mail_to_player_service(
        sender_id=sender_id,
        sender_nickname=sender_nickname,
        recipient_id=recipient_id,
        title=title,
        content=content,
        payload=payload
    )

    if success:
        return jsonify({"success": True, "message": "信件已成功寄出。"}), 200
    else:
        # 服務層內部會記錄詳細錯誤，這裡只返回通用失敗訊息
        return jsonify({"error": "寄信失敗，可能是收件人不存在或伺服器內部錯誤。"}), 500

@mail_bp.route('/<mail_id>/claim', methods=['POST'])
def claim_attachments_route(mail_id: str):
    """
    處理玩家領取一封信件中所有附件的請求。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    # 呼叫我們在 mail_services 中建立的新函式
    updated_player_data, error_msg = claim_mail_attachments_service(player_data, mail_id, game_configs)

    if not updated_player_data:
        # 如果服務層返回 None，表示發生了嚴重錯誤
        return jsonify({"error": error_msg or "領取附件時發生未知錯誤。"}), 500

    # 儲存更新後的玩家資料
    if save_player_data_service(user_id, updated_player_data):
        response_data = {"success": True, "message": "附件已成功領取！"}
        if error_msg:
            # 如果有部分物品未領取成功 (例如背包滿了)，則在成功的回應中附加一條提示
            response_data["warning"] = error_msg
        return jsonify(response_data), 200
    else:
        return jsonify({"error": "領取附件後儲存玩家資料失敗。"}), 500