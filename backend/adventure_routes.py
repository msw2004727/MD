# backend/adventure_routes.py
# 建立一個新的API藍圖，專門處理所有與「冒險島」相關的網路請求。

import logging
from flask import Blueprint, jsonify, request

# 從專案的其他模組導入
from .MD_routes import _get_authenticated_user_id
from .player_services import get_player_data_service, save_player_data_service
# --- 核心修改處 START ---
from .adventure_services import start_expedition_service, move_on_adventure_map_service, handle_node_event_service, get_all_islands_service
# --- 核心修改處 END ---

# 建立一個新的藍圖 (Blueprint) 來管理冒險島的路由
adventure_bp = Blueprint('adventure_bp', __name__, url_prefix='/api/MD/adventure')

# 建立此路由專用的日誌記錄器
adventure_routes_logger = logging.getLogger(__name__)


# --- 核心修改處 START ---
@adventure_bp.route('/islands', methods=['GET'])
def get_islands_route():
    """
    獲取所有冒險島的靜態設定資料。
    這是一個公開的 API，任何人都可以查看。
    """
    adventure_routes_logger.info("收到獲取所有冒險島資料的請求。")
    try:
        islands_data = get_all_islands_service()
        if not islands_data:
             # 如果服務層返回空列表，表示找不到檔案或檔案為空
             return jsonify({"error": "找不到冒險島資料或資料為空。"}), 404
        
        return jsonify(islands_data), 200
    except Exception as e:
        adventure_routes_logger.error(f"獲取冒險島資料時在路由層發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "伺服器內部錯誤，無法獲取冒險島資料。"}), 500
# --- 核心修改處 END ---


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

    # 此處未來將呼叫 adventure_services 中的函式
    # success = start_expedition_service(...)

    return jsonify({"success": True, "message": "遠征功能開發中！"}), 200


@adventure_bp.route('/progress', methods=['GET'])
def get_adventure_progress_route():
    """
    獲取玩家當前的冒險進度。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    player_data, _ = get_player_data_service(user_id, nickname, {})
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    adventure_progress = player_data.get("adventure_progress")

    if adventure_progress and adventure_progress.get("is_active"):
        return jsonify(adventure_progress), 200
    else:
        return jsonify({"is_active": False, "message": "目前沒有正在進行的遠征。"}), 200


@adventure_bp.route('/move', methods=['POST'])
def move_on_map_route():
    """
    處理玩家在地圖上移動的請求。
    """
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response
    
    data = request.json
    target_node_id = data.get('target_node_id')
    if not target_node_id:
         return jsonify({"error": "請求中缺少目標節點ID (target_node_id)。"}), 400

    # 此處未來將呼叫 adventure_services 中的函式
    # updated_player_data = move_on_adventure_map_service(...)
    
    adventure_routes_logger.info(f"玩家 {user_id} 請求移動至節點 {target_node_id} (功能開發中)。")
    return jsonify({"success": True, "message": f"已移動至 {target_node_id} (功能開發中)。"}), 200
