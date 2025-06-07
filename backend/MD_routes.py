# backend/MD_routes.py
# 定義怪獸養成遊戲 (MD) 的 API 路由

from flask import Blueprint, jsonify, request, current_app
import firebase_admin
from firebase_admin import auth
import logging
import random

# 從拆分後的新服務模組中導入函式
from .player_services import get_player_data_service, save_player_data_service, draw_free_dna

# 直接從更細分的怪物管理服務模組中導入
from .monster_nickname_services import update_monster_custom_element_nickname_service
from .monster_healing_services import heal_monster_service, recharge_monster_with_dna_service
from .monster_disassembly_services import disassemble_monster_service
from .monster_cultivation_services import complete_cultivation_service, replace_monster_skill_service
from .monster_absorption_services import absorb_defeated_monster_service

from .leaderboard_search_services import (
    get_monster_leaderboard_service,
    get_player_leaderboard_service,
    search_players_service
)

# 從設定和 AI 服務模組引入函式
from .MD_config_services import load_all_game_configs_from_firestore
from .MD_models import PlayerGameData, Monster

md_bp = Blueprint('md_bp', __name__, url_prefix='/api/MD')
routes_logger = logging.getLogger(__name__)

# --- 輔助函式：獲取遊戲設定 ---
def _get_game_configs_data_from_app_context():
    if 'MD_GAME_CONFIGS' not in current_app.config:
        routes_logger.warning("MD_GAME_CONFIGS 未在 current_app.config 中找到，將嘗試即時載入。")
        from .MD_config_services import load_all_game_configs_from_firestore as load_configs_inner
        current_app.config['MD_GAME_CONFIGS'] = load_configs_inner()
    return current_app.config['MD_GAME_CONFIGS']

# --- 輔助函式：獲取已驗證的使用者 ID ---
def _get_authenticated_user_id():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, None, (jsonify({"error": "未授權：缺少 Token"}), 401)

    id_token = auth_header.split('Bearer ')[1]
    try:
        if firebase_admin._apps:
            decoded_token = auth.verify_id_token(id_token)
            user_id = decoded_token['uid']
            nickname = decoded_token.get('name') or \
                       (decoded_token.get('email').split('@')[0] if decoded_token.get('email') else "未知玩家")
            return user_id, nickname, None
        else:
            routes_logger.error("Firebase Admin SDK 未初始化，無法驗證 Token。")
            return None, None, (jsonify({"error": "伺服器設定錯誤，Token 驗證失敗。"}), 500)
    except auth.FirebaseAuthError as e:
        routes_logger.error(f"Token 驗證 FirebaseAuthError: {e}")
        return None, None, (jsonify({"error": "Token 無效或已過期。"}), 401)
    except Exception as e:
        routes_logger.error(f"Token 處理時發生未知錯誤: {e}", exc_info=True)
        return None, None, (jsonify({"error": f"Token 處理錯誤: {str(e)}"}), 403)


# --- 佔位符函式 (Placeholder Function) ---
def simulate_battle_service(monster1, monster2, game_configs):
    """Placeholder for battle simulation logic."""
    routes_logger.warning("正在使用佔位符 (placeholder) 的戰鬥模擬服務!")
    winner = random.choice([monster1, monster2])
    loser = monster2 if winner['id'] == monster1['id'] else monster1
    return {
        "log": [
            f"--- 戰鬥開始: {monster1['nickname']} vs {monster2['nickname']} ---",
            "這是一場激烈的模擬戰鬥...",
            f"最終，{winner['nickname']} 獲勝！"
        ],
        "winner_id": winner['id'],
        "loser_id": loser['id'],
        "monster1_updated_skills": monster1.get('skills', []), # 返回原始技能以避免錯誤
        "monster2_updated_skills": monster2.get('skills', [])
    }


# --- API 端點 ---
@md_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "MD API 運作中！"})

@md_bp.route('/game-configs', methods=['GET'])
def get_game_configs_route():
    configs = _get_game_configs_data_from_app_context()
    if not configs or not configs.get("dna_fragments"):
        routes_logger.error("遊戲設定未能成功載入或為空。")
        return jsonify({"error": "無法載入遊戲核心設定，請稍後再試或聯繫管理員。"}), 500
    return jsonify(configs), 200

@md_bp.route('/dna/draw-free', methods=['POST'])
def draw_free_dna_route():
    """
    處理免費抽取 DNA 的請求。
    """
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    try:
        # 由於 player_services 中的函式已改為同步，這裡直接呼叫即可
        drawn_dna_templates = draw_free_dna()
        if drawn_dna_templates is not None:
            routes_logger.info(f"玩家 {user_id} 成功抽取 {len(drawn_dna_templates)} 個DNA。")
            return jsonify({"success": True, "drawn_dna": drawn_dna_templates}), 200
        else:
            routes_logger.error(f"玩家 {user_id} 的 DNA 抽取失敗，服務層返回 None。")
            return jsonify({"error": "DNA抽取失敗，請稍後再試。"}), 500
    except Exception as e:
        routes_logger.error(f"執行免費 DNA 抽取時在路由層發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "伺服器內部錯誤，無法完成DNA抽取。"}), 500

@md_bp.route('/player/<path:requested_player_id>', methods=['GET'])
def get_player_info_route(requested_player_id: str):
    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法獲取玩家資料。"}), 500

    auth_header = request.headers.get('Authorization')
    token_player_id = None
    nickname_from_auth_token = None

    if auth_header and auth_header.startswith('Bearer '):
        id_token = auth_header.split('Bearer ')[1]
        try:
            if firebase_admin._apps:
                decoded_token = auth.verify_id_token(id_token)
                token_player_id = decoded_token['uid']
                nickname_from_auth_token = decoded_token.get('name') or \
                                           (decoded_token.get('email').split('@')[0] if decoded_token.get('email') else None)
                routes_logger.info(f"Token 驗證成功，UID: {token_player_id}, 暱稱來源: {nickname_from_auth_token}")
            else:
                routes_logger.warning("Firebase Admin SDK 未初始化，無法驗證 Token。")
        except auth.FirebaseAuthError as e:
            routes_logger.warning(f"Token 驗證失敗 (不影響公開查詢): {e}")
        except Exception as e:
            routes_logger.error(f"Token 處理時發生未知錯誤: {e}", exc_info=True)

    target_player_id_to_fetch = requested_player_id
    nickname_for_init = None

    if token_player_id and token_player_id == requested_player_id:
        routes_logger.info(f"獲取當前登入玩家 {target_player_id_to_fetch} 的資料。")
        nickname_for_init = nickname_from_auth_token
    else:
        routes_logger.info(f"公開查詢玩家 {target_player_id_to_fetch} 的資料。")

    player_data = get_player_data_service(
        player_id=target_player_id_to_fetch,
        nickname_from_auth=nickname_for_init,
        game_configs=game_configs
    )

    if player_data:
        return jsonify(player_data), 200
    else:
        routes_logger.warning(f"在服務層未能獲取或初始化玩家 {target_player_id_to_fetch} 的資料。")
        return jsonify({"error": f"找不到玩家 {target_player_id_to_fetch} 或無法初始化資料。"}), 404


@md_bp.route('/player/<player_id>/save', methods=['POST'])
def save_player_data_route(player_id: str):
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    if not user_id or user_id != player_id:
        return jsonify({"error": "未授權：您無權保存此玩家的資料。"}), 403

    game_data = request.json
    if not game_data:
        return jsonify({"error": "請求中缺少遊戲資料。"}), 400

    if save_player_data_service(player_id, game_data):
        return jsonify({"success": True, "message": "玩家資料保存成功。"}), 200
    else:
        return jsonify({"success": False, "error": "玩家資料保存失敗。"}), 500


@md_bp.route('/combine', methods=['POST'])
def combine_dna_api_route():
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    if not data or 'dna_ids' not in data or not isinstance(data['dna_ids'], list):
        return jsonify({"error": "請求格式錯誤，需要包含 'dna_ids' 列表"}), 400

    dna_ids_from_request = data['dna_ids']
    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法組合DNA。"}), 500

    player_data = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        routes_logger.error(f"組合DNA前無法獲取玩家 {user_id} 的資料。")
        return jsonify({"error": "無法獲取玩家資料以進行DNA組合。"}), 500

    combine_result = combine_dna_service(dna_ids_from_request, game_configs, player_data, user_id)

    if combine_result and combine_result.get("monster"):
        new_monster_object: Monster = combine_result["monster"]
        consumed_dna_indices = combine_result.get("consumed_dna_indices", [])

        # 後端直接處理資料更新
        # 1. 將消耗掉的 DNA 設置為 None
        for index in consumed_dna_indices:
            if 0 <= index < len(player_data["playerOwnedDNA"]):
                player_data["playerOwnedDNA"][index] = None
        
        # 2. 加入新怪獸到農場
        current_farmed_monsters = player_data.get("farmedMonsters", [])
        MAX_FARM_SLOTS = game_configs.get("value_settings", {}).get("max_farm_slots", 10)

        if len(current_farmed_monsters) < MAX_FARM_SLOTS:
            current_farmed_monsters.append(new_monster_object)
            player_data["farmedMonsters"] = current_farmed_monsters
            # 3. 更新玩家成就
            if "playerStats" in player_data and isinstance(player_data["playerStats"], dict):
                player_stats_achievements = player_data["playerStats"].get("achievements", [])
                if "首次組合怪獸" not in player_stats_achievements:
                    player_stats_achievements.append("首次組合怪獸")
                    player_data["playerStats"]["achievements"] = player_stats_achievements
            
            # 4. 儲存更新後的完整玩家資料
            if save_player_data_service(user_id, player_data):
                routes_logger.info(f"新怪獸已加入玩家 {user_id} 的農場並儲存。")
                return jsonify(new_monster_object), 201
            else:
                routes_logger.warning(f"警告：新怪獸已生成，但儲存玩家 {user_id} 資料失敗。")
                # 即使儲存失敗，也返回怪獸物件，讓前端至少可以顯示
                return jsonify(new_monster_object), 201
        else:
            routes_logger.info(f"玩家 {user_id} 的農場已滿，新怪獸 {new_monster_object.get('nickname', '未知')} 未加入。")
            # 注意：這裡我們不儲存，因為怪獸沒有地方放。但前端仍然會收到怪獸物件和警告。
            return jsonify({**new_monster_object, "farm_full_warning": "農場已滿，怪獸未自動加入農場。"}), 200
    else:
        error_message = "DNA 組合失敗，未能生成怪獸。"
        if combine_result and combine_result.get("error"):
            error_message = combine_result["error"]
        return jsonify({"error": error_message}), 400


@md_bp.route('/players/search', methods=['GET'])
def search_players_api_route():
    nickname_query = request.args.get('nickname', '').strip()
    limit_str = request.args.get('limit', '10')
    try:
        limit = int(limit_str)
        if limit <= 0 or limit > 50:
            limit = 10
    except ValueError:
        limit = 10
        routes_logger.warning(f"無效的 limit 參數值 '{limit_str}'，已使用預設值 10。")


    if not nickname_query:
        return jsonify({"error": "請提供搜尋的暱稱關鍵字。"}), 400

    results = search_players_service(nickname_query, limit)
    return jsonify({"players": results}), 200


@md_bp.route('/battle/simulate', methods=['POST'])
def simulate_battle_api_route():
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    monster1_data_req = data.get('monster1_data')
    monster2_data_req = data.get('monster2_data')

    if not monster1_data_req or not monster2_data_req:
        return jsonify({"error": "請求中必須包含兩隻怪獸的資料。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法模擬戰鬥。"}), 500

    battle_result = simulate_battle_service(monster1_data_req, monster2_data_req, game_configs)

    if user_id and monster1_data_req.get('id') and not monster1_data_req.get('isNPC'):
        player_data = get_player_data_service(user_id, nickname_from_token, game_configs)
        if player_data:
            player_stats = player_data.get("playerStats")
            if player_stats and isinstance(player_stats, dict):
                monster_id_in_battle = monster1_data_req['id']

                if battle_result.get("winner_id") == monster_id_in_battle:
                    player_stats["wins"] = player_stats.get("wins", 0) + 1
                elif battle_result.get("loser_id") == monster_id_in_battle:
                    player_stats["losses"] = player_stats.get("losses", 0) + 1

                farmed_monsters = player_data.get("farmedMonsters", [])
                monster_updated_in_farm = False
                for m_idx, monster_in_farm in enumerate(farmed_monsters):
                    if monster
