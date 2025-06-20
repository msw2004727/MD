# backend/MD_routes.py
# 定義怪獸養成遊戲 (MD) 的 API 路由

from flask import Blueprint, jsonify, request, current_app
import firebase_admin
from firebase_admin import auth
import logging
import random
import copy 
import time 
import math
from typing import List, Dict, Any, Tuple

from flask_cors import cross_origin

from .player_services import get_player_data_service, save_player_data_service, draw_free_dna, get_friends_statuses_service, add_note_service
from .monster_combination_services import combine_dna_service 
from .monster_nickname_services import update_monster_custom_element_nickname_service
from .monster_healing_services import heal_monster_service, recharge_monster_with_dna_service
from .monster_disassembly_services import disassemble_monster_service
from .monster_cultivation_services import complete_cultivation_service, replace_monster_skill_service
from .monster_absorption_services import absorb_defeated_monster_service
from .battle_services import simulate_battle_full
# --- 核心修改處 START ---
from .monster_chat_services import generate_monster_chat_response_service, generate_monster_interaction_response_service, handle_skill_toggle_request_service
# --- 核心修改處 END ---
from .leaderboard_search_services import (
    get_player_leaderboard_service,
    search_players_service,
    get_all_player_selected_monsters_service
)
from .MD_config_services import load_all_game_configs_from_firestore
from .MD_models import PlayerGameData, Monster, BattleResult, GameConfigs
from .post_battle_services import process_battle_results


md_bp = Blueprint('md_bp', __name__, url_prefix='/api/MD')
routes_logger = logging.getLogger(__name__)

def _get_game_configs_data_from_app_context():
    if 'MD_GAME_CONFIGS' not in current_app.config:
        routes_logger.warning("MD_GAME_CONFIGS 未在 current_app.config 中找到，將嘗試即時載入。")
        from .MD_config_services import load_all_game_configs_from_firestore as load_configs_inner
        current_app.config['MD_GAME_CONFIGS'] = load_configs_inner()
    return current_app.config['MD_GAME_CONFIGS']

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
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    try:
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

@md_bp.route('/player/equip-title', methods=['POST'])
def equip_title_route():
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    title_id_to_equip = data.get('title_id')
    if not title_id_to_equip:
        return jsonify({"error": "請求中缺少 'title_id'。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname_from_token, game_configs)

    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    owned_titles = player_data.get("playerStats", {}).get("titles", [])
    if not any(title.get("id") == title_id_to_equip for title in owned_titles):
        return jsonify({"error": "未授權：您尚未擁有此稱號，無法裝備。"}), 403

    player_data["playerStats"]["equipped_title_id"] = title_id_to_equip
    
    if save_player_data_service(user_id, player_data):
        routes_logger.info(f"玩家 {user_id} 成功裝備稱號 ID: {title_id_to_equip}")
        return jsonify({
            "success": True, 
            "message": "稱號已成功裝備。",
            "equipped_title_id": title_id_to_equip
        }), 200
    else:
        routes_logger.error(f"玩家 {user_id} 裝備稱號 {title_id_to_equip} 後儲存失敗。")
        return jsonify({"error": "儲存失敗，請稍後再試。"}), 500

@md_bp.route('/player/<path:requested_player_id>', methods=['GET'])
def get_player_info_route(requested_player_id: str):
    from .post_battle_services import _check_and_award_titles as check_titles_utility

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

    is_self_request = token_player_id is not None and token_player_id == requested_player_id

    if is_self_request:
        routes_logger.info(f"獲取當前登入玩家 {target_player_id_to_fetch} 的資料。")
        nickname_for_init = nickname_from_auth_token
    else:
        routes_logger.info(f"公開查詢玩家 {target_player_id_to_fetch} 的資料。")

    player_data, is_new_player = get_player_data_service(
        player_id=target_player_id_to_fetch,
        nickname_from_auth=nickname_for_init,
        game_configs=game_configs
    )

    if player_data:
        if is_self_request:
            player_data, newly_awarded_titles = check_titles_utility(player_data, game_configs)
            
            if is_new_player:
                initial_titles = player_data.get("playerStats", {}).get("titles", [])
                for it in initial_titles:
                    if it not in newly_awarded_titles:
                        newly_awarded_titles.append(it)
            
            if newly_awarded_titles:
                save_player_data_service(target_player_id_to_fetch, player_data)
                routes_logger.info(f"玩家 {target_player_id_to_fetch} 的稱號資料已更新並儲存。")
                
                player_data["newly_awarded_titles"] = newly_awarded_titles
                routes_logger.info(f"將授予的 {len(newly_awarded_titles)} 個新稱號附加到回傳資料中。")
        
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

@md_bp.route('/notes', methods=['POST'])
def add_note_route():
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    target_type = data.get('target_type')
    note_content = data.get('note_content')
    monster_id = data.get('monster_id') # 可選

    if not target_type or not note_content:
        return jsonify({"error": "請求中缺少 'target_type' 或 'note_content'。"}), 400
    if target_type == 'monster' and not monster_id:
        return jsonify({"error": "當 target_type 為 'monster' 時，必須提供 'monster_id'。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    updated_player_data = add_note_service(player_data, target_type, note_content, monster_id)

    if updated_player_data:
        if save_player_data_service(user_id, updated_player_data):
            routes_logger.info(f"玩家 {user_id} 的註記已成功儲存。目標類型: {target_type}, 怪獸ID: {monster_id}")
            return jsonify({"success": True, "message": "註記已成功儲存。"}), 200
        else:
            routes_logger.error(f"儲存玩家 {user_id} 的註記後，保存資料失敗。")
            return jsonify({"error": "儲存註記失敗，請稍後再試。"}), 500
    else:
        routes_logger.warning(f"為玩家 {user_id} 新增註記失敗，服務層返回 None。")
        return jsonify({"error": "新增註記失敗，請檢查請求參數。"}), 400

@md_bp.route('/monster/<monster_id>/chat', methods=['POST'])
def chat_with_monster_route(monster_id: str):
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    player_message = data.get('message')
    if not player_message or not isinstance(player_message, str):
        return jsonify({"error": "請求中缺少 'message' 字串。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法進行聊天。"}), 500
    
    # 呼叫聊天服務
    service_result = generate_monster_chat_response_service(
        player_id=user_id,
        monster_id=monster_id,
        player_message=player_message,
        game_configs=game_configs
    )

    if not service_result:
        return jsonify({"error": "生成聊天回應時發生內部錯誤。"}), 500

    # 服務成功，獲取AI回覆和更新後的玩家資料
    ai_reply = service_result.get("ai_reply")
    updated_player_data = service_result.get("updated_player_data")

    # 儲存更新後的玩家資料（包含了新的聊天紀錄）
    if not save_player_data_service(user_id, updated_player_data):
        routes_logger.warning(f"警告：聊天回應已生成，但儲存玩家 {user_id} 的聊天紀錄失敗。")
        # 即使儲存失敗，我們仍然回傳 AI 回應，以確保前端體驗流暢
    
    return jsonify({"success": True, "reply": ai_reply}), 200


@md_bp.route('/combine', methods=['POST'])
def combine_dna_api_route():
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    if not data or 'dna_data' not in data or not isinstance(data['dna_data'], list):
        return jsonify({"error": "請求格式錯誤，需要包含 'dna_data' 列表"}), 400

    dna_objects_from_request = data['dna_data']
    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法組合DNA。"}), 500

    player_data, _ = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        routes_logger.error(f"組合DNA前無法獲取玩家 {user_id} 的資料。")
        return jsonify({"error": "無法獲取玩家資料以進行DNA組合。"}), 500

    combine_result = combine_dna_service(dna_objects_from_request, game_configs, player_data, user_id)

    if combine_result and combine_result.get("monster"):
        new_monster_object: Monster = combine_result["monster"]
        
        current_farmed_monsters = player_data.get("farmedMonsters", [])
        MAX_FARM_SLOTS = game_configs.get("value_settings", {}).get("max_farm_slots", 10)

        if len(current_farmed_monsters) < MAX_FARM_SLOTS:
            current_farmed_monsters.append(new_monster_object)
            player_data["farmedMonsters"] = current_farmed_monsters
            
            if "playerStats" in player_data and isinstance(player_data["playerStats"], dict):
                player_stats_achievements = player_data["playerStats"].get("achievements", [])
                if "首次組合怪獸" not in player_stats_achievements:
                    player_stats_achievements.append("首次組合怪獸")
                    player_data["playerStats"]["achievements"] = player_stats_achievements

            player_data["dnaCombinationSlots"] = [None] * 5
            routes_logger.info(f"玩家 {user_id} 合成成功，已在後端清除組合槽資料。")
            
            if save_player_data_service(user_id, player_data):
                routes_logger.info(f"新怪獸已加入玩家 {user_id} 的農場並儲存。")
                return jsonify(new_monster_object), 201
            else:
                routes_logger.error(f"儲存新怪獸至玩家 {user_id} 的農場時失敗。")
                return jsonify({"error": "怪獸已生成，但存檔失敗，請稍後再試。"}), 500
        else:
            routes_logger.info(f"玩家 {user_id} 的農場已滿，新怪獸 {new_monster_object.get('nickname', '未知')} 未加入。")
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
    player_monster_data_req = data.get('player_monster_data')
    opponent_monster_data_req = data.get('opponent_monster_data')
    opponent_owner_id_req = data.get('opponent_owner_id')
    opponent_owner_nickname_req = data.get('opponent_owner_nickname')

    # 新增：從請求中獲取冠軍挑戰的相關資訊
    is_champion_challenge = data.get('is_champion_challenge', False)
    challenged_rank = data.get('challenged_rank', None)

    if not player_monster_data_req or not opponent_monster_data_req:
        return jsonify({"error": "請求中必須包含兩隻怪獸的資料。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法模擬戰鬥。"}), 500

    player_data, _ = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "無法獲取您的玩家資料以開始戰鬥。"}), 404

    opponent_player_data = None
    if not opponent_monster_data_req.get('isNPC') and opponent_owner_id_req:
        opponent_player_data, _ = get_player_data_service(opponent_owner_id_req, opponent_owner_nickname_req, game_configs)
        if not opponent_player_data:
            routes_logger.warning(f"無法獲取對手玩家 {opponent_owner_id_req} 的資料，戰鬥將在沒有其稱號加成的情況下進行。")

    battle_result: BattleResult = simulate_battle_full( 
        player_monster_data=player_monster_data_req,
        opponent_monster_data=opponent_monster_data_req,
        game_configs=game_configs,
        player_data=player_data,
        opponent_player_data=opponent_player_data
    )

    if battle_result.get("battle_end"):
        routes_logger.info(f"戰鬥結束，呼叫 post_battle_services 進行結算...")
        player_data, newly_awarded_titles = process_battle_results(
            player_id=user_id,
            opponent_id=opponent_owner_id_req,
            player_data=player_data,
            opponent_player_data=opponent_player_data,
            player_monster_data=player_monster_data_req,
            opponent_monster_data=opponent_monster_data_req,
            battle_result=battle_result,
            game_configs=game_configs,
            is_champion_challenge=is_champion_challenge,
            challenged_rank=challenged_rank
        )
        
        if newly_awarded_titles:
            battle_result["newly_awarded_titles"] = newly_awarded_titles
    
    return jsonify({"success": True, "battle_result": battle_result}), 200


@md_bp.route('/generate-ai-descriptions', methods=['POST'])
def generate_ai_descriptions_route():
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    data = request.json
    monster_data = data.get('monster_data')
    if not monster_data:
        return jsonify({"error": "請求中缺少怪獸資料。"}), 400

    try:
        from .MD_ai_services import generate_monster_ai_details as generate_ai_details_inner
        ai_details = generate_ai_details_inner(monster_data)
        return jsonify(ai_details), 200
    except Exception as e:
        routes_logger.error(f"生成AI描述時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "生成AI描述失敗。", "details": str(e)}), 500


@md_bp.route('/monster/<monster_id>/update-nickname', methods=['POST'])
def update_monster_nickname_route(monster_id: str):
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    data = request.json
    new_custom_element_nickname = data.get('custom_element_nickname')
    if new_custom_element_nickname is None:
        new_custom_element_nickname = ""
    elif not isinstance(new_custom_element_nickname, str):
        return jsonify({"error": "請求格式錯誤，需要 'custom_element_nickname' (字串)"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料"}), 404

    updated_player_data = update_monster_custom_element_nickname_service(
        user_id, monster_id, new_custom_element_nickname, game_configs, player_data
    )

    if updated_player_data:
        if save_player_data_service(user_id, updated_player_data):
            updated_monster = next((m for m in updated_player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
            return jsonify({"success": True, "message": "怪獸暱稱已更新。", "updated_monster": updated_monster}), 200
        else:
            return jsonify({"error": "更新怪獸暱稱後儲存失敗。"}), 500
    else:
        original_monster = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
        if original_monster:
            return jsonify({"success": True, "message": "怪獸暱稱未變更。", "updated_monster": original_monster }), 200
        return jsonify({"error": "更新怪獸暱稱失敗。"}), 404


@md_bp.route('/monster/<monster_id>/heal', methods=['POST'])
def heal_monster_route(monster_id: str):
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    data = request.json
    heal_type = data.get('heal_type')
    if heal_type not in ["full_hp", "full_mp", "cure_conditions", "full_restore"]:
        return jsonify({"error": "無效的治療類型。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料"}), 404

    updated_player_data = heal_monster_service(
        user_id, monster_id, heal_type, game_configs, player_data
    )

    if updated_player_data:
        if save_player_data_service(user_id, updated_player_data):
            healed_monster = next((m for m in updated_player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
            return jsonify({"success": True, "message": f"怪獸 {healed_monster.get('nickname') if healed_monster else monster_id} 已治療。", "healed_monster": healed_monster}), 200
        else:
            return jsonify({"error": "治療怪獸後儲存失敗。"}), 500
    else:
        return jsonify({"error": "怪獸充能失敗，可能是屬性不符或DNA不存在。"}), 400


@md_bp.route('/monster/<monster_id>/disassemble', methods=['POST'])
def disassemble_monster_route(monster_id: str):
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料"}), 404

    disassembly_result = disassemble_monster_service(
        user_id, monster_id, game_configs, player_data
    )

    if disassembly_result and disassembly_result.get("success"):
        player_data["farmedMonsters"] = disassembly_result.get("updated_farmed_monsters", player_data.get("farmedMonsters"))

        if save_player_data_service(user_id, player_data):
            return jsonify({
                "success": True,
                "message": disassembly_result.get("message"),
                "returned_dna_templates_info": [], 
                "updated_player_owned_dna_count": len(player_data.get("playerOwnedDNA", [])),
                "updated_farmed_monsters_count": len(player_data.get("farmedMonsters", []))
            }), 200
        else:
            return jsonify({"error": "分解怪獸後儲存玩家資料失敗。"}), 500
    else:
        return jsonify({"error": disassembly_result.get("error", "分解怪獸失敗。")}), 400


@md_bp.route('/monster/<monster_id>/recharge', methods=['POST'])
def recharge_monster_route(monster_id: str):
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    data = request.json
    dna_instance_id = data.get('dna_instance_id')
    recharge_target = data.get('recharge_target')

    if not dna_instance_id or recharge_target not in ["hp", "mp"]:
        return jsonify({"error": "請求格式錯誤，需要 'dna_instance_id' 和 'recharge_target' ('hp' 或 'mp')"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料"}), 404

    updated_player_data = recharge_monster_with_dna_service(
        user_id, monster_id, dna_instance_id, recharge_target, game_configs, player_data
    )

    if updated_player_data:
        if save_player_data_service(user_id, updated_player_data):
            recharged_monster = next((m for m in updated_player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
            return jsonify({"success": True, "message": "怪獸已充能。", "recharged_monster": recharged_monster, "updated_player_owned_dna": updated_player_data.get("playerOwnedDNA")}), 200
        else:
            return jsonify({"error": "怪獸充能後儲存失敗。"}), 500
    else:
        return jsonify({"error": "怪獸充能失敗，可能是屬性不符或DNA不存在。"}), 400


@md_bp.route('/monster/<monster_id>/cultivation/complete', methods=['POST'])
def complete_cultivation_route(monster_id: str):
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    data = request.json
    duration_seconds_str = data.get('duration_seconds')
    try:
        duration_seconds = int(duration_seconds_str)
        if duration_seconds <= 0:
            return jsonify({"error": "修煉時長必須為正數。"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "無效的修煉時長。"}), 400

    game_configs = _get_game_configs_data_from_app_context()

    result = complete_cultivation_service(user_id, monster_id, duration_seconds, game_configs)

    if result and result.get("success"):
        return jsonify(result), 200
    else:
        status_code = result.get("status_code", 500) if result else 500
        return jsonify({"error": result.get("error", "完成修煉失敗。") if result else "完成修煉失敗。"}), status_code


@md_bp.route('/monster/<monster_id>/skill/replace', methods=['POST'])
def replace_monster_skill_route(monster_id: str):
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    data = request.json
    slot_to_replace_index_str = data.get('slot_index')
    new_skill_template_data = data.get('new_skill_template')

    slot_to_replace_index = None
    if slot_to_replace_index_str is not None:
        try:
            slot_to_replace_index = int(slot_to_replace_index_str)
        except ValueError:
            return jsonify({"error": "無效的技能槽位索引。"}), 400

    if not new_skill_template_data or not isinstance(new_skill_template_data, dict) or "name" not in new_skill_template_data:
        return jsonify({"error": "請求格式錯誤，需要有效的 'new_skill_template' 物件。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料"}), 404

    updated_player_data = replace_monster_skill_service(
        user_id, monster_id, slot_to_replace_index, new_skill_template_data, game_configs, player_data
    )

    if updated_player_data:
        if save_player_data_service(user_id, updated_player_data):
            updated_monster = next((m for m in updated_player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
            return jsonify({"success": True, "message": "怪獸技能已更新。", "updated_monster": updated_monster}), 200
        else:
            return jsonify({"error": "更新怪獸技能後儲存失敗。"}), 500
    else:
        return jsonify({"error": "更新怪獸技能失敗。"}), 400

@md_bp.route('/leaderboard/monsters', methods=['GET'])
def get_monster_leaderboard_route():
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response:
        routes_logger.warning("未授權請求怪獸排行榜，返回空列表。")
        return jsonify([]), 200


    top_n_str = request.args.get('top_n', '10')
    try:
        top_n = int(top_n_str)
        if top_n <=0 or top_n > 50: top_n = 10
    except ValueError:
        top_n = 10

    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法獲取排行榜。"}), 500

    all_player_selected_monsters = get_all_player_selected_monsters_service(game_configs)

    all_player_selected_monsters.sort(key=lambda m: m.get("score", 0), reverse=True)
    
    final_leaderboard = all_player_selected_monsters[:top_n]

    return jsonify(final_leaderboard), 200

@md_bp.route('/leaderboard/players', methods=['GET'])
def get_player_leaderboard_route():
    top_n_str = request.args.get('top_n', '10')
    try:
        top_n = int(top_n_str)
        if top_n <=0 or top_n > 50: top_n = 10
    except ValueError:
        top_n = 10
    game_configs = _get_game_configs_data_from_app_context()
    leaderboard = get_player_leaderboard_service(game_configs, top_n)
    return jsonify(leaderboard), 200

@md_bp.route('/friends/statuses', methods=['POST'])
def get_friends_statuses_route():
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    friend_ids = data.get('friend_ids')

    if not friend_ids or not isinstance(friend_ids, list):
        return jsonify({"error": "請求中必須包含一個 'friend_ids' 列表。"}), 400

    statuses = get_friends_statuses_service(friend_ids)
    return jsonify({"success": True, "statuses": statuses}), 200

@md_bp.route('/monster/<monster_id>/interact', methods=['POST'])
def interact_with_monster_route(monster_id: str):
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    action_type = data.get('action')
    if action_type not in ['punch', 'pat', 'kiss']:
        return jsonify({"error": "無效的互動類型。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法進行互動。"}), 500
    
    service_result = generate_monster_interaction_response_service(
        player_id=user_id,
        monster_id=monster_id,
        action_type=action_type,
        game_configs=game_configs
    )

    if not service_result:
        return jsonify({"error": "生成互動回應時發生內部錯誤。"}), 500

    ai_reply = service_result.get("ai_reply")
    updated_player_data = service_result.get("updated_player_data")

    if not save_player_data_service(user_id, updated_player_data):
        routes_logger.warning(f"警告：互動回應已生成，但儲存玩家 {user_id} 的資料失敗。")
    
    return jsonify({"success": True, "reply": ai_reply}), 200

# --- 核心修改處 START ---
@md_bp.route('/monster/<monster_id>/toggle-skill', methods=['POST'])
def toggle_skill_route(monster_id: str):
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    skill_name = data.get('skill_name')
    target_state = data.get('target_state')

    if not skill_name or not isinstance(skill_name, str) or target_state is None or not isinstance(target_state, bool):
        return jsonify({"error": "請求中必須包含 'skill_name' (字串) 和 'target_state' (布林值)。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    
    service_result = handle_skill_toggle_request_service(
        player_id=user_id,
        monster_id=monster_id,
        skill_name=skill_name,
        target_state=target_state,
        game_configs=game_configs
    )

    if not service_result or not service_result.get("success"):
        return jsonify({"error": service_result.get("error", "處理技能切換請求時發生內部錯誤。")}), 500

    # 如果怪獸同意，則儲存更新後的玩家資料
    if service_result.get("agreed"):
        updated_player_data = service_result.get("updated_player_data")
        if not save_player_data_service(user_id, updated_player_data):
            # 即使儲存失敗，也回傳成功，讓前端可以更新UI，避免體驗不一致
            routes_logger.error(f"警告：技能切換協商成功，但儲存玩家 {user_id} 的資料失敗。")

    return jsonify(service_result), 200
# --- 核心修改處 END ---
