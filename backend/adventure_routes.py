# backend/adventure_routes.py
# 建立一個新的API藍圖，專門處理所有與「冒險島」相關的網路請求。

import logging
from flask import Blueprint, jsonify, request

# 從專案的其他模組導入
# --- 核心修改處 START ---
from .services.player_services import get_player_data_service, save_player_data_service
from .services.adventure_services import (
    start_expedition_service, get_all_islands_service, advance_floor_service, 
    complete_floor_service, resolve_event_choice_service, switch_captain_service
)
# --- 核心修改處 END ---
from .MD_routes import _get_authenticated_user_id, _get_game_configs_data_from_app_context
# 導入戰鬥模擬服務，以便在BOSS戰後生成戰報
from .battle_services import simulate_battle_full


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

    try:
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
            
    except Exception as e:
        adventure_routes_logger.error(f"處理 /adventure/start 請求時發生嚴重錯誤: {e}", exc_info=True)
        return jsonify({"error": "伺服器在處理遠征請求時發生內部錯誤，請聯繫管理員。"}), 500


@adventure_bp.route('/abandon', methods=['POST'])
def abandon_adventure_route():
    """
    處理玩家中途放棄遠征的請求。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        return jsonify({"error": "沒有正在進行的遠征可以放棄。"}), 400

    farmed_monsters_map = {m["id"]: m for m in player_data.get("farmedMonsters", [])}
    for member in progress.get("expedition_team", []):
        if member["monster_id"] in farmed_monsters_map:
            monster_in_farm = farmed_monsters_map[member["monster_id"]]
            monster_in_farm["hp"] = member["current_hp"]
            monster_in_farm["mp"] = member["current_mp"]
            adventure_routes_logger.info(f"遠征結束：怪獸 {monster_in_farm.get('nickname')} 的 HP/MP 已同步回農場。")
    
    final_stats = progress.get("expedition_stats")

    progress["is_active"] = False
    player_data["adventure_progress"] = progress
    
    if save_player_data_service(user_id, player_data):
        adventure_routes_logger.info(f"玩家 {user_id} 已成功放棄遠征。")
        return jsonify({
            "success": True, 
            "message": "已成功結束本次遠征。",
            "expedition_stats": final_stats
        }), 200
    else:
        adventure_routes_logger.error(f"玩家 {user_id} 放棄遠征後，儲存資料失敗。")
        return jsonify({"error": "放棄遠征後儲存進度失敗。"}), 500


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
            "event_data": event_data,
            "updated_progress": updated_progress
        }), 200
    else:
        adventure_routes_logger.error(f"玩家 {user_id} 推進冒險進度後，儲存資料失敗。")
        return jsonify({"error": "推進成功但儲存進度失敗。"}), 500

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
        
    service_result = complete_floor_service(player_data, game_configs)
    
    if not service_result.get("success"):
        return jsonify({"error": service_result.get("error", "通關結算失敗。")}), 400
        
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

@adventure_bp.route('/resolve', methods=['POST'])
def resolve_choice_route():
    """
    處理玩家對冒險事件做出的選擇。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    choice_id = data.get('choice_id')
    if not choice_id:
        return jsonify({"error": "請求中缺少 'choice_id'。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404
        
    progress = player_data.get("adventure_progress", {})
    current_event = progress.get("current_event", {})
    
    if current_event.get("event_type") == "boss_encounter":
        boss_data = current_event.get("boss_data")
        if not boss_data:
            return jsonify({"error": "BOSS 資料遺失，無法開始戰鬥。"}), 500

        team = progress.get("expedition_team", [])
        if not team:
            return jsonify({"error": "您的隊伍是空的，無法戰鬥。"}), 400
            
        captain_id = team[0].get("monster_id")
        player_monster = next((m for m in player_data.get("farmedMonsters", []) if m["id"] == captain_id), None)
        if not player_monster:
            return jsonify({"error": "找不到您的遠征隊長資料。"}), 404

        battle_result = simulate_battle_full(player_monster, boss_data, game_configs, player_data)
        
        captain_in_team = next((member for member in team if member["monster_id"] == captain_id), None)
        if captain_in_team:
            captain_in_team["current_hp"] = battle_result.get("player_monster_final_hp", captain_in_team["current_hp"])
            captain_in_team["current_mp"] = battle_result.get("player_monster_final_mp", captain_in_team["current_mp"])
            adventure_routes_logger.info(f"遠征隊長 {captain_id} 戰後 HP/MP 更新為: {captain_in_team['current_hp']}/{captain_in_team['current_mp']}")
        
        progress["expedition_team"] = team
        
        if battle_result.get("winner_id") == captain_id:
            floor_completion_result = complete_floor_service(player_data, game_configs)
            player_data["adventure_progress"] = floor_completion_result.get("updated_progress")
            
            if save_player_data_service(user_id, player_data):
                return jsonify({
                    "success": True,
                    "event_outcome": "boss_win",
                    "battle_result": battle_result,
                    "message": floor_completion_result.get("message"),
                    "updated_progress": player_data["adventure_progress"]
                }), 200
            else:
                return jsonify({"error": "擊敗BOSS後儲存進度失敗。"}), 500
        else:
            farmed_monsters_map = {m["id"]: m for m in player_data.get("farmedMonsters", [])}
            for member in progress.get("expedition_team", []):
                if member["monster_id"] in farmed_monsters_map:
                    monster_in_farm = farmed_monsters_map[member["monster_id"]]
                    monster_in_farm["hp"] = member["current_hp"]
                    monster_in_farm["mp"] = member["current_mp"]
                    adventure_routes_logger.info(f"遠征失敗：怪獸 {monster_in_farm.get('nickname')} 的 HP/MP 已同步回農場。")
            
            progress["is_active"] = False
            player_data["adventure_progress"] = progress
            if save_player_data_service(user_id, player_data):
                 return jsonify({
                    "success": True,
                    "event_outcome": "boss_loss",
                    "battle_result": battle_result,
                    "message": "遠征失敗，您的隊伍已被擊敗。",
                    "updated_progress": player_data["adventure_progress"]
                }), 200
            else:
                return jsonify({"error": "戰敗後儲存進度失敗。"}), 500

    else:
        # 處理一般事件的選擇
        service_result = resolve_event_choice_service(player_data, choice_id, game_configs)
        
        if not service_result.get("success"):
            return jsonify({"error": service_result.get("error", "處理事件選擇失敗。")}), 400
            
        updated_progress = service_result.get("updated_progress")
        player_data["adventure_progress"] = updated_progress
        
        if save_player_data_service(user_id, player_data):
            return jsonify({
                "success": True,
                "event_outcome": "choice_resolved",
                "outcome_story": service_result.get("outcome_story"),
                "updated_progress": updated_progress,
                "updated_player_stats": player_data.get("playerStats")
            }), 200
        else:
            return jsonify({"error": "儲存事件結果失敗。"}), 500

@adventure_bp.route('/switch_captain', methods=['POST'])
def switch_captain_route():
    """
    處理玩家在遠征中更換隊長的請求。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    monster_id_to_promote = data.get('monster_id')

    if not monster_id_to_promote:
        return jsonify({"error": "請求中缺少 'monster_id'。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    updated_player_data = switch_captain_service(player_data, monster_id_to_promote)

    if not updated_player_data:
        return jsonify({"error": "更換隊長失敗，可能是怪獸無效或已是隊長。"}), 400

    if save_player_data_service(user_id, updated_player_data):
        return jsonify({
            "success": True,
            "message": "隊長已更換。",
            "updated_progress": updated_player_data.get("adventure_progress")
        }), 200
    else:
        return jsonify({"error": "更換隊長後儲存進度失敗。"}), 500