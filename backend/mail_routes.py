# backend/mail_routes.py
# 新增的路由檔案：專門處理信箱系統相關的 API 端點

import logging
from flask import Blueprint, jsonify, request

# 從專案的其他模組導入
from .player_services import get_player_data_service, save_player_data_service
from .mail_services import add_mail_to_player, delete_mail_from_player, mark_mail_as_read
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

# 可以在此處預留未來功能的路由，例如 "寄信"
# @mail_bp.route('/send', methods=['POST'])
# def send_mail_route():
#     # ... 待實現的寄信邏輯 ...
#     pass
