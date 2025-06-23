# backend/adventure_routes.py
# 建立一個新的API藍圖，專門處理所有與「冒險島」相關的網路請求。

import logging
from flask import Blueprint, jsonify, request

# 從專案的其他模組導入
from .MD_routes import _get_authenticated_user_id, _get_game_configs_data_from_app_context
from .player_services import get_player_data_service, save_player_data_service
# --- 核心修改處 START ---
# 導入 complete_floor_service 服務
from .adventure_services import start_expedition_service, get_all_islands_service, advance_floor_service, complete_floor_service
# --- 核心修改處 END ---


# 建立一個新的藍圖 (Blueprint) 來管理冒險島的路由
adventure_bp = Blueprint('adventure_bp', __name__, url_prefix='/api/MD/adventure')

# 建立此路由專用的日誌記錄器
adventure_routes_logger = logging.getLogger(__name__)


@adventure_bp.route('/islands', methods=['GET'])
def get_islands_route():
    """
    獲取所有冒險島的靜態設定資料。
    """
    adventure_routes_logger.info("收到獲取所有冒險島資料的請求。")
    try:
        islands_data = get_all_islands_service()
        if not islands_data:
             return jsonify({"error": "找不到冒險島資料或資料為空。"}), 404
        
        return jsonify(islands_data), 200
    except Exception as e:
        adventure_routes_logger.error(f"獲取冒險島資料時在路由層發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "伺服器內部錯誤，無法獲取冒險島資料。"}), 500


@adventure_bp.route('/start', methods=['POST'])
def start_adventure_route():
    """
    處理玩家開始一次新遠征的請求。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    island_id = data.get('island_id')
    facility_id = data.get('facility_id')
    team_monster_ids = data.get('team_monster_ids')

    if not all([island_id, facility_id, team_monster_ids]):
        return jsonify({"error": "請求中缺少必要的欄位 (island_id, facility_id, team_monster_ids)。"}), 400

    adventure_routes_logger.info(f"玩家 {user_id} 請求開始遠征：島嶼 {island_id}, 設施 {facility_id}")
    
    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    updated_player_data, error_msg = start_expedition_service(
        player_data, island_id, facility_id, team_monster_ids, game_configs
    )

    if error_msg:
        return jsonify({"error": error_msg}), 400

    if updated_player_data:
        if save_player_data_service(user_id, updated_player_data):
            return jsonify({
                "success": True, 
                "message": "遠征已成功開始！",
                "adventure_progress": updated_player_data.get("adventure_progress")
            }), 200
        else:
            return jsonify({"error": "開始遠征後儲存玩家資料失敗。"}), 500
    else:
        return jsonify({"error": "開始遠征時發生未知服務錯誤。"}), 500


@adventure_bp.route('/progress', methods=['GET'])
def get_adventure_progress_route():
    """
    獲取玩家當前的冒險進度。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    adventure_progress = player_data.get("adventure_progress")

    if adventure_progress and adventure_progress.get("is_active"):
        return jsonify(adventure_progress), 200
    else:
        return jsonify({"is_active": False, "message": "目前沒有正在進行的遠征。"}), 200


@adventure_bp.route('/advance', methods=['POST'])
def advance_route():
    """
    處理玩家在地圖上推進的請求。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    service_result = advance_floor_service(player_data, game_configs)
    
    if not service_result.get("success"):
        return jsonify({"error": service_result.get("error", "推進失敗。")}), 400
        
    updated_progress = service_result.get("updated_progress")
    event_data = service_result.get("event_data")
    
    player_data["adventure_progress"] = updated_progress
    
    if save_player_data_service(user_id, player_data):
        adventure_routes_logger.info(f"玩家 {user_id} 成功推進冒險進度並已儲存。")
        return jsonify({
            "success": True,
            "event_data": event_data
        }), 200
    else:
        adventure_routes_logger.error(f"玩家 {user_id} 推進冒險進度後，儲存資料失敗。")
        return jsonify({"error": "推進成功但儲存進度失敗。"}), 500

# --- 核心修改處 START ---
@adventure_bp.route('/complete_floor', methods=['POST'])
def complete_floor_route():
    """
    處理玩家在擊敗BOSS後，通關當前樓層的請求。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response
        
    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404
        
    service_result = complete_floor_service(player_data)
    
    if not service_result.get("success"):
        return jsonify({"error": service_result.get("error", "通關結算失敗。")}), 400
        
    # 服務層已處理完所有邏輯，現在只需儲存
    updated_progress = service_result.get("updated_progress")
    player_data["adventure_progress"] = updated_progress

    if save_player_data_service(user_id, player_data):
        return jsonify({
            "success": True,
            "message": service_result.get("message"),
            "new_progress": updated_progress
        }), 200
    else:
        return jsonify({"error": "通關後儲存進度失敗。"}), 500
# --- 核心修改處 END ---
