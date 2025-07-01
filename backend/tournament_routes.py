# backend/tournament_routes.py
from flask import Blueprint, request, jsonify, current_app
from .auth_middleware import firebase_auth_required
from .tournament_services import find_ladder_opponent_service
from .player_services import get_player_data_service

tournament_bp = Blueprint('tournament_bp', __name__, url_prefix='/api/MD/tournament')

@tournament_bp.route('/find_match', methods=['POST'])
@firebase_auth_required
def find_match_route(player_id):
    """
    為當前玩家尋找一個天梯對手。
    """
    data = request.json
    player_pvp_points = data.get('pvp_points')
    match_type = data.get('match_type', 'equal') # 預設為 'equal'

    if player_pvp_points is None:
        game_configs = current_app.config.get('MD_GAME_CONFIGS', {})
        player_data, _ = get_player_data_service(player_id, None, game_configs)
        if not player_data:
            return jsonify({"success": False, "error": "無法獲取玩家資料"}), 500
        player_pvp_points = player_data.get("playerStats", {}).get("pvp_points", 0)

    result = find_ladder_opponent_service(player_id, player_pvp_points, match_type)
    
    if result.get("success"):
        return jsonify(result), 200
    else:
        return jsonify(result), 500
