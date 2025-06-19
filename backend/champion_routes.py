# backend/champion_routes.py
# 新增的路由檔案：專門處理冠軍殿堂相關的 API

import logging
from flask import Blueprint, jsonify, request

# 從專案的其他模組導入
from .champion_services import get_full_champion_details_service
# 為了驗證玩家身分，我們需要從現有的路由檔案中導入驗證函式
from .MD_routes import _get_authenticated_user_id 

champion_bp = Blueprint('champion_bp', __name__, url_prefix='/api/MD')
champion_routes_logger = logging.getLogger(__name__)

@champion_bp.route('/champions', methods=['GET'])
def get_champions_route():
    """
    獲取冠軍殿堂四個席位的完整怪獸資料。
    這是一個公開的 API，任何人都可以查看。
    """
    champion_routes_logger.info("收到獲取冠軍殿堂資料的請求。")
    try:
        champion_details = get_full_champion_details_service()
        if champion_details is None:
             # 如果服務層在處理過程中出錯，會返回 None
             return jsonify({"error": "獲取冠軍資料時發生伺服器內部錯誤。"}), 500
        
        return jsonify(champion_details), 200
    except Exception as e:
        champion_routes_logger.error(f"獲取冠軍殿堂資料時在路由層發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "伺服器內部錯誤，無法獲取冠軍資料。"}), 500


@champion_bp.route('/champions/<int:rank>/challenge', methods=['POST'])
def challenge_champion_route(rank: int):
    """
    處理挑戰特定冠軍席位的請求。
    (此為第二階段後續步驟的邏輯預留位置)
    """
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    if not 1 <= rank <= 4:
        return jsonify({"error": "無效的挑戰排名。"}), 400

    champion_routes_logger.info(f"玩家 {user_id} 正在嘗試挑戰第 {rank} 名的冠軍。")
    
    # --- 待辦事項 ---
    # 1. 獲取玩家的出戰怪獸。
    # 2. 驗證玩家是否符合挑戰資格（例如，第4名才能挑戰第3名）。
    # 3. 獲取被挑戰的冠軍怪獸資料。
    # 4. 執行戰鬥模擬。
    # 5. 根據戰鬥結果，呼叫服務來更新冠軍名單。
    # 6. 返回戰鬥結果給前端。
    
    return jsonify({"success": True, "message": f"挑戰第 {rank} 名的功能正在開發中！"}), 501 # 501 Not Implemented