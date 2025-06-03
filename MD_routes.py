# MD_routes.py
# 定義怪獸養成遊戲 (MD) 的 API 路由

from flask import Blueprint, jsonify, request, current_app # 新增 current_app
import firebase_admin
from firebase_admin import auth
import logging # 新增 logging

# 從服務和設定模組引入函式
from MD_services import (
    get_player_data_service,
    save_player_data_service,
    combine_dna_service,
    simulate_battle_service,
    search_players_service, # 新增引入 search_players_service
    update_monster_custom_element_nickname_service, # 新增引入
    absorb_defeated_monster_service, # 新增引入
    heal_monster_service, # 新增引入
    disassemble_monster_service, # 新增引入
    recharge_monster_with_dna_service, # 新增引入
    complete_cultivation_service, # 新增引入
    replace_monster_skill_service, # 新增引入
    get_monster_leaderboard_service, # 新增引入
    get_player_leaderboard_service # 新增引入
)
from MD_config_services import load_all_game_configs_from_firestore # 新增引入
from MD_models import PlayerGameData, Monster # 引入類型以便註解

md_bp = Blueprint('md_bp', __name__, url_prefix='/api/MD')
routes_logger = logging.getLogger(__name__) # 為路由設定日誌

# --- 輔助函式：獲取遊戲設定 ---
# 遊戲設定現在將在應用程式啟動時載入一次，並儲存在 current_app.config 中
# 或者，如果需要每次請求都重新載入（不建議用於不常變動的設定），則在此處呼叫
def _get_game_configs_data_from_app_context():
    """
    從 Flask 應用程式上下文中獲取遊戲設定。
    假設設定已在應用程式啟動時載入並儲存。
    """
    if 'MD_GAME_CONFIGS' not in current_app.config:
        routes_logger.warning("MD_GAME_CONFIGS 未在 current_app.config 中找到，將嘗試即時載入。")
        current_app.config['MD_GAME_CONFIGS'] = load_all_game_configs_from_firestore()
    return current_app.config['MD_GAME_CONFIGS']

# --- API 端點 ---
@md_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "MD API 運作中！"})

@md_bp.route('/game-configs', methods=['GET'])
def get_game_configs_route():
    configs = _get_game_configs_data_from_app_context()
    if not configs or not configs.get("dna_fragments"): # 簡單檢查設定是否成功載入
        routes_logger.error("遊戲設定未能成功載入或為空。")
        return jsonify({"error": "無法載入遊戲核心設定，請稍後再試或聯繫管理員。"}), 500
    return jsonify(configs), 200

@md_bp.route('/player/<path:requested_player_id>', methods=['GET'])
def get_player_info_route(requested_player_id: str):
    """
    獲取玩家遊戲資料。
    如果提供了有效的 Authorization Token，且 Token 中的 UID 與 requested_player_id 匹配，
    則視為獲取當前登入玩家的資料。
    否則，視為公開查詢指定 requested_player_id 的資料。
    """
    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法獲取玩家資料。"}), 500

    auth_header = request.headers.get('Authorization')
    token_player_id = None
    nickname_from_auth_token = None

    if auth_header and auth_header.startswith('Bearer '):
        id_token = auth_header.split('Bearer ')[1]
        try:
            if firebase_admin._apps: # 檢查 Firebase app 是否已初始化
                decoded_token = auth.verify_id_token(id_token)
                token_player_id = decoded_token['uid']
                # 從 token 中獲取 'name' (通常是 displayName) 或 'email' 作為暱稱備案
                nickname_from_auth_token = decoded_token.get('name') or \
                                           (decoded_token.get('email').split('@')[0] if decoded_token.get('email') else None)
                routes_logger.info(f"Token 驗證成功，UID: {token_player_id}, 暱稱來源: {nickname_from_auth_token}")
            else:
                routes_logger.warning("Firebase Admin SDK 未初始化，無法驗證 Token。")
        except auth.FirebaseAuthError as e:
            routes_logger.warning(f"Token 驗證失敗 (不影響公開查詢): {e}")
        except Exception as e:
            routes_logger.error(f"Token 處理時發生未知錯誤: {e}", exc_info=True)

    # 決定要查詢的 player_id 和用於初始化的 nickname
    target_player_id_to_fetch = requested_player_id
    nickname_for_init = None # 預設情況下，讓 service 層自行處理 nickname

    if token_player_id and token_player_id == requested_player_id:
        # 請求的是當前登入使用者自己的資料
        routes_logger.info(f"獲取當前登入玩家 {target_player_id_to_fetch} 的資料。")
        nickname_for_init = nickname_from_auth_token # 將 token 中的 nickname 傳遞給 service
    else:
        # 請求的是其他玩家的資料，或者 Token 無效/不匹配
        routes_logger.info(f"公開查詢玩家 {target_player_id_to_fetch} 的資料。")
        # nickname_for_init 保持為 None，service 層會嘗試從 DB 讀取或使用預設值

    player_data: Optional[PlayerGameData] = get_player_data_service(
        player_id=target_player_id_to_fetch,
        nickname_from_auth=nickname_for_init, # 傳遞從 token 來的 nickname (如果適用)
        game_configs=game_configs
    )

    if player_data:
        return jsonify(player_data), 200
    else:
        # 此處的 404 可能是因為 service 層在初始化新玩家時也失敗了
        routes_logger.warning(f"在服務層未能獲取或初始化玩家 {target_player_id_to_fetch} 的資料。")
        return jsonify({"error": f"找不到玩家 {target_player_id_to_fetch} 或無法初始化資料。"}), 404


@md_bp.route('/combine', methods=['POST'])
def combine_dna_api_route():
    user_id = None
    decoded_token_info = {}
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "未授權：缺少 Token"}), 401

    id_token = auth_header.split('Bearer ')[1]
    try:
        if firebase_admin._apps:
            decoded_token_info = auth.verify_id_token(id_token)
            user_id = decoded_token_info['uid']
        else:
            routes_logger.error("Firebase Admin SDK 未初始化，無法驗證 combine API 的 Token。")
            return jsonify({"error": "伺服器設定錯誤，Token 驗證失敗。"}), 500
    except auth.FirebaseAuthError as e:
        routes_logger.error(f"Combine API Token 驗證 FirebaseAuthError: {e}")
        return jsonify({"error": "Token 無效或已過期。"}), 401
    except Exception as e:
        routes_logger.error(f"Combine API Token 處理時發生未知錯誤: {e}", exc_info=True)
        return jsonify({"error": f"Token 處理錯誤: {str(e)}"}), 403

    if not user_id:
        return jsonify({"error": "無法從 Token 中識別使用者。"}), 401

    data = request.json
    if not data or 'dna_ids' not in data or not isinstance(data['dna_ids'], list):
        return jsonify({"error": "請求格式錯誤，需要包含 'dna_ids' 列表"}), 400

    dna_ids_from_request = data['dna_ids']
    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法組合DNA。"}), 500

    # 從 get_player_data_service 獲取 player_data
    player_data = get_player_data_service(user_id, decoded_token_info.get('name'), game_configs)
    if not player_data:
        # 即使 get_player_data_service 會嘗試初始化，這裡也再次檢查以防萬一
        routes_logger.error(f"組合DNA前無法獲取玩家 {user_id} 的資料。")
        return jsonify({"error": "無法獲取玩家資料以進行DNA組合。"}), 500

    new_monster_object: Optional[Monster] = combine_dna_service(dna_ids_from_request, game_configs, player_data)

    if new_monster_object:
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

            if save_player_data_service(user_id, player_data):
                routes_logger.info(f"新怪獸已加入玩家 {user_id} 的農場並儲存。")
            else:
                routes_logger.warning(f"警告：新怪獸已生成，但儲存玩家 {user_id} 資料失敗。")
            return jsonify(new_monster_object), 201
        else:
            routes_logger.info(f"玩家 {user_id} 的農場已滿，新怪獸 {new_monster_object.get('nickname', '未知')} 未加入。")
            # 即使農場已滿，也返回怪獸資料，讓前端決定如何處理 (例如提示玩家或放入臨時背包)
            return jsonify({**new_monster_object, "farm_full_warning": "農場已滿，怪獸未自動加入農場。"}), 200 # 200 OK 但帶有警告
    else:
        # combine_dna_service 返回 None 表示組合失敗
        return jsonify({"error": "DNA 組合失敗，未能生成怪獸。"}), 400


@md_bp.route('/players/search', methods=['GET'])
def search_players_api_route():
    nickname_query = request.args.get('nickname', '').strip()
    limit_str = request.args.get('limit', '10')
    try:
        limit = int(limit_str)
        if limit <= 0 or limit > 50: # 設定一個合理的上限
            limit = 10
    except ValueError:
        limit = 10
        routes_logger.warning(f"無效的 limit 參數值 '{limit_str}'，已使用預設值 10。")


    if not nickname_query:
        return jsonify({"error": "請提供搜尋的暱稱關鍵字。"}), 400

    # 呼叫 service 層的搜尋函式
    results = search_players_service(nickname_query, limit)
    return jsonify({"players": results}), 200


@md_bp.route('/battle/simulate', methods=['POST'])
def simulate_battle_api_route():
    user_id = None # 玩家自己的 ID (如果戰鬥涉及玩家怪獸)
    auth_header = request.headers.get('Authorization')
    nickname_from_token = None

    if auth_header and auth_header.startswith('Bearer '):
        id_token = auth_header.split('Bearer ')[1]
        try:
            if firebase_admin._apps:
                decoded_token = auth.verify_id_token(id_token)
                user_id = decoded_token['uid']
                nickname_from_token = decoded_token.get('name') or \
                                      (decoded_token.get('email').split('@')[0] if decoded_token.get('email') else None)
            else:
                routes_logger.warning("Firebase Admin SDK 未初始化 (simulate_battle_api_route)。")
        except Exception as e:
            routes_logger.warning(f"戰鬥路由 Token 驗證失敗 (非致命錯誤，可能為訪客或NPC對戰): {e}")

    data = request.json
    monster1_data_req = data.get('monster1_data') # 可能是玩家的怪獸
    monster2_data_req = data.get('monster2_data') # 可能是NPC或其他玩家的怪獸

    if not monster1_data_req or not monster2_data_req:
        return jsonify({"error": "請求中必須包含兩隻怪獸的資料。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    if not game_configs:
        return jsonify({"error": "遊戲設定載入失敗，無法模擬戰鬥。"}), 500

    battle_result = simulate_battle_service(monster1_data_req, monster2_data_req, game_configs)

    # 如果 user_id 存在 (表示是登入玩家發起的戰鬥)，並且 monster1 是該玩家的怪獸，則更新戰績
    # 注意：這裡假設 monster1_data_req 總是玩家自己的怪獸 (如果戰鬥涉及玩家)
    # 如果 monster1_data_req 也可能是 NPC，則需要更複雜的邏輯來判斷是否更新玩家戰績
    if user_id and monster1_data_req.get('id') and not monster1_data_req.get('isNPC'):
        player_data = get_player_data_service(user_id, nickname_from_token, game_configs)
        if player_data:
            player_stats = player_data.get("playerStats")
            if player_stats and isinstance(player_stats, dict): # 確保 player_stats 是字典
                monster_id_in_battle = monster1_data_req['id'] # 玩家怪獸的 ID

                # 更新玩家總戰績
                if battle_result.get("winner_id") == monster_id_in_battle:
                    player_stats["wins"] = player_stats.get("wins", 0) + 1
                elif battle_result.get("loser_id") == monster_id_in_battle:
                    player_stats["losses"] = player_stats.get("losses", 0) + 1
                # 平手不改變總勝敗

                # 更新怪獸的個別戰績 (resume)
                farmed_monsters = player_data.get("farmedMonsters", [])
                monster_updated_in_farm = False
                for m_idx, monster_in_farm in enumerate(farmed_monsters):
                    if monster_in_farm.get("id") == monster_id_in_battle:
                        monster_resume = monster_in_farm.get("resume", {"wins":0, "losses":0})
                        if battle_result.get("winner_id") == monster_id_in_battle:
                            monster_resume["wins"] = monster_resume.get("wins",0) + 1
                        elif battle_result.get("loser_id") == monster_id_in_battle:
                            monster_resume["losses"] = monster_resume.get("losses",0) + 1
                        farmed_monsters[m_idx]["resume"] = monster_resume # type: ignore

                        # 更新怪獸的技能經驗 (從戰鬥結果中獲取)
                        if battle_result.get("monster1_updated_skills"):
                             farmed_monsters[m_idx]["skills"] = battle_result["monster1_updated_skills"] # type: ignore
                        monster_updated_in_farm = True
                        break # 找到並更新後跳出

                if monster_updated_in_farm:
                    player_data["farmedMonsters"] = farmed_monsters
                player_data["playerStats"] = player_stats

                # 處理戰後吸收 (如果 monster1 勝利且對方不是 NPC)
                if battle_result.get("winner_id") == monster1_data_req.get('id') and \
                   battle_result.get("loser_id") == monster2_data_req.get('id') and \
                   not monster2_data_req.get('isNPC'):
                    routes_logger.info(f"怪獸 {monster1_data_req.get('nickname')} 勝利，嘗試吸收 {monster2_data_req.get('nickname')}")
                    absorption_result = absorb_defeated_monster_service(
                        player_id=user_id,
                        winning_monster_id=monster1_data_req['id'],
                        defeated_monster_snapshot=monster2_data_req, # monster2_data_req 是戰鬥前的快照
                        game_configs=game_configs,
                        player_data=player_data # 傳入已包含戰績更新的 player_data
                    )
                    if absorption_result and absorption_result.get("success"):
                        routes_logger.info(f"吸收成功: {absorption_result.get('message')}")
                        # player_data 已經在 absorb_defeated_monster_service 內部被修改並儲存
                        # 但我們需要將最新的 player_data (包含吸收後的怪獸狀態和DNA) 返回給 battle_result
                        battle_result["absorption_details"] = {
                            "message": absorption_result.get("message"),
                            "extracted_dna_templates": absorption_result.get("extracted_dna_templates"),
                            "stat_gains": absorption_result.get("stat_gains"),
                            # 返回更新後的勝利怪獸數據，以便前端更新
                            "updated_winning_monster": absorption_result.get("updated_winning_monster"),
                            "updated_player_owned_dna": absorption_result.get("updated_player_owned_dna")
                        }
                        # 注意：如果 absorb_defeated_monster_service 內部有儲存，這裡的 player_data 可能是最新的
                        # 但為了確保，最好是讓 service 返回更新後的 player_data，或者在這裡重新獲取
                    elif absorption_result:
                        routes_logger.warning(f"吸收失敗: {absorption_result.get('error')}")
                        battle_result["absorption_details"] = {"error": absorption_result.get("error")}
                    # 即使吸收失敗，戰績更新仍需儲存
                    if not save_player_data_service(user_id, player_data):
                        routes_logger.warning(f"警告：戰鬥結果/吸收後，儲存玩家 {user_id} 資料失敗。")

                else: # 如果沒有發生吸收，或者 monster1 不是勝利者，或者對方是NPC，則直接儲存戰績更新
                    if not save_player_data_service(user_id, player_data):
                        routes_logger.warning(f"警告：戰鬥結果已產生，但儲存玩家 {user_id} 戰績失敗。")
            else:
                routes_logger.warning(f"無法獲取玩家 {user_id} 資料以更新戰績，或 player_stats 結構不正確。")
        else:
            if not user_id:
                routes_logger.info("提示 (simulate_battle_api_route)：未提供有效 Token 或 Token 無效，戰績將不會儲存。")
            elif monster1_data_req.get('isNPC'):
                 routes_logger.info(f"提示 (simulate_battle_api_route)：怪獸 {monster1_data_req.get('nickname')} 是 NPC，戰績不記錄到玩家。")

    return jsonify(battle_result), 200

# --- 新增的路由 ---

@md_bp.route('/monster/<monster_id>/update-nickname', methods=['POST'])
def update_monster_nickname_route(monster_id: str):
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    data = request.json
    new_custom_element_nickname = data.get('custom_element_nickname')
    if new_custom_element_nickname is None: # 允許傳入空字串來清除自定義
        new_custom_element_nickname = ""
    elif not isinstance(new_custom_element_nickname, str):
        return jsonify({"error": "請求格式錯誤，需要 'custom_element_nickname' (字串)"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data = get_player_data_service(user_id, nickname_from_token, game_configs)
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
        return jsonify({"error": "更新怪獸暱稱失敗，可能是找不到怪獸或玩家。"}), 404


@md_bp.route('/monster/<monster_id>/heal', methods=['POST'])
def heal_monster_route(monster_id: str):
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    data = request.json
    heal_type = data.get('heal_type')
    if heal_type not in ["full_hp", "full_mp", "cure_conditions", "full_restore"]:
        return jsonify({"error": "無效的治療類型。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料"}), 404

    updated_player_data = heal_monster_service(
        user_id, monster_id, heal_type, game_configs, player_data # type: ignore
    )

    if updated_player_data:
        if save_player_data_service(user_id, updated_player_data):
            healed_monster = next((m for m in updated_player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
            return jsonify({"success": True, "message": f"怪獸 {healed_monster.get('nickname') if healed_monster else monster_id} 已治療。", "healed_monster": healed_monster}), 200
        else:
            return jsonify({"error": "治療怪獸後儲存失敗。"}), 500
    else: # heal_monster_service 可能返回 None 或原始 player_data
        original_monster = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
        if original_monster: # 如果只是無需治療
            return jsonify({"success": True, "message": "怪獸無需治療或治療類型無效。", "healed_monster": original_monster }), 200
        return jsonify({"error": "治療怪獸失敗。"}), 404


@md_bp.route('/monster/<monster_id>/disassemble', methods=['POST'])
def disassemble_monster_route(monster_id: str):
    user_id, nickname_from_token, error_response = _get_authenticated_user_id()
    if error_response: return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料"}), 404

    disassembly_result = disassemble_monster_service(
        user_id, monster_id, game_configs, player_data
    )

    if disassembly_result and disassembly_result.get("success"):
        # player_data 已在 service 層被修改 (移除了怪獸)
        # 現在需要將分解出的 DNA 加入 playerOwnedDNA
        returned_dna_templates = disassembly_result.get("returned_dna_templates", [])
        current_owned_dna = player_data.get("playerOwnedDNA", [])
        for dna_template in returned_dna_templates:
            instance_id = f"dna_{user_id}_{int(auth.datetime.datetime.now().timestamp() * 1000)}_{len(current_owned_dna)}" # 使用更可靠的時間戳
            owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
            current_owned_dna.append(owned_dna_item)
        player_data["playerOwnedDNA"] = current_owned_dna
        player_data["farmedMonsters"] = disassembly_result.get("updated_farmed_monsters", player_data.get("farmedMonsters"))


        if save_player_data_service(user_id, player_data):
            return jsonify({
                "success": True,
                "message": disassembly_result.get("message"),
                "returned_dna_templates_info": [{"name": dna.get("name"), "rarity": dna.get("rarity")} for dna in returned_dna_templates],
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
    player_data = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料"}), 404

    updated_player_data = recharge_monster_with_dna_service(
        user_id, monster_id, dna_instance_id, recharge_target, game_configs, player_data # type: ignore
    )

    if updated_player_data:
        if save_player_data_service(user_id, updated_player_data):
            recharged_monster = next((m for m in updated_player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
            return jsonify({"success": True, "message": "怪獸已充能。", "recharged_monster": recharged_monster, "updated_player_owned_dna": updated_player_data.get("playerOwnedDNA")}), 200
        else:
            return jsonify({"error": "怪獸充能後儲存失敗。"}), 500
    else: # 充能失敗 (例如屬性不符或DNA不存在)
        return jsonify({"error": "怪獸充能失敗，可能是屬性不符或DNA不存在。"}), 400


@md_bp.route('/monster/<monster_id>/cultivation/complete', methods=['POST'])
def complete_cultivation_route(monster_id: str):
    user_id, _, error_response = _get_authenticated_user_id() # nickname_from_token 在此路由中不是關鍵
    if error_response: return error_response

    data = request.json
    duration_seconds_str = data.get('duration_seconds')
    try:
        duration_seconds = int(duration_seconds_str) # type: ignore
        if duration_seconds <= 0:
            return jsonify({"error": "修煉時長必須為正數。"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "無效的修煉時長。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    # complete_cultivation_service 內部會獲取 player_data

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
    slot_to_replace_index_str = data.get('slot_index') # 可以是 null/None 表示學習到新槽位
    new_skill_template_data = data.get('new_skill_template') # 這是技能模板本身

    slot_to_replace_index = None
    if slot_to_replace_index_str is not None:
        try:
            slot_to_replace_index = int(slot_to_replace_index_str)
        except ValueError:
            return jsonify({"error": "無效的技能槽位索引。"}), 400

    if not new_skill_template_data or not isinstance(new_skill_template_data, dict) or "name" not in new_skill_template_data:
        return jsonify({"error": "請求格式錯誤，需要有效的 'new_skill_template' 物件。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data = get_player_data_service(user_id, nickname_from_token, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料"}), 404

    updated_player_data = replace_monster_skill_service(
        user_id, monster_id, slot_to_replace_index, new_skill_template_data, game_configs, player_data # type: ignore
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
    top_n_str = request.args.get('top_n', '10')
    try:
        top_n = int(top_n_str)
        if top_n <=0 or top_n > 50: top_n = 10
    except ValueError:
        top_n = 10
    game_configs = _get_game_configs_data_from_app_context()
    leaderboard = get_monster_leaderboard_service(game_configs, top_n)
    return jsonify(leaderboard), 200

@md_bp.route('/leaderboard/players', methods=['GET'])
def get_player_leaderboard_route():
    top_n_str = request.args.get('top_n', '10')
    try:
        top_n = int(top_n_str)
        if top_n <=0 or top_n > 50: top_n = 10
    except ValueError:
        top_n = 10
    game_configs = _get_game_configs_data_from_app_context() # game_configs 可能用於NPC資料等
    leaderboard = get_player_leaderboard_service(game_configs, top_n)
    return jsonify(leaderboard), 200


# --- 輔助函式：獲取已驗證的使用者 ID ---
def _get_authenticated_user_id():
    """從 Authorization Header 驗證 Firebase ID Token 並返回 user_id 和 nickname。"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, None, jsonify({"error": "未授權：缺少 Token"}), 401

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
            return None, None, jsonify({"error": "伺服器設定錯誤，Token 驗證失敗。"}), 500
    except auth.FirebaseAuthError as e:
        routes_logger.error(f"Token 驗證 FirebaseAuthError: {e}")
        return None, None, jsonify({"error": "Token 無效或已過期。"}), 401
    except Exception as e:
        routes_logger.error(f"Token 處理時發生未知錯誤: {e}", exc_info=True)
        return None, None, jsonify({"error": f"Token 處理錯誤: {str(e)}"}), 403

