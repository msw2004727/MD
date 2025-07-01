# backend/exchange_routes.py
import logging
from flask import Blueprint, jsonify, request

from .MD_routes import _get_authenticated_user_id, _get_game_configs_data_from_app_context
from .player_services import get_player_data_service
from .exchange_services import create_listing_service, cancel_listing_service
from . import MD_firebase_config

exchange_bp = Blueprint('exchange_bp', __name__, url_prefix='/api/MD/exchange')
exchange_routes_logger = logging.getLogger(__name__)

@exchange_bp.route('/listings', methods=['GET'])
def get_listings_route():
    """
    獲取交易所的商品列表。
    """
    db = MD_firebase_config.db
    if not db:
        return jsonify({"error": "資料庫服務異常"}), 500
    
    try:
        listings_ref = db.collection('ExchangeListings').where('status', '==', 'active').order_by('listedAt', direction='DESCENDING').limit(100).stream()
        listings = [doc.to_dict() for doc in listings_ref]
        return jsonify(listings), 200
    except Exception as e:
        exchange_routes_logger.error(f"獲取交易所列表時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "無法獲取商品列表。"}), 500

@exchange_bp.route('/my-listings', methods=['GET'])
def get_my_listings_route():
    """
    獲取當前登入玩家正在販售的商品列表。
    """
    user_id, _, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    db = MD_firebase_config.db
    if not db:
        return jsonify({"error": "資料庫服務異常"}), 500

    try:
        my_listings_ref = db.collection('ExchangeListings').where('sellerId', '==', user_id).order_by('listedAt', direction='DESCENDING').stream()
        my_listings = [doc.to_dict() for doc in my_listings_ref]
        return jsonify(my_listings), 200
    except Exception as e:
        exchange_routes_logger.error(f"獲取玩家 {user_id} 的商品列表時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "無法獲取您販售的商品列表。"}), 500

@exchange_bp.route('/list', methods=['POST'])
def create_listing_route():
    """
    處理玩家上架商品的請求。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    data = request.json
    item_id = data.get('item_id')
    price = data.get('price')

    if not item_id or not price:
        return jsonify({"error": "請求中缺少 'item_id' 或 'price'。"}), 400

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    result = create_listing_service(user_id, player_data, item_id, price)

    if result.get("success"):
        return jsonify(result), 201
    else:
        return jsonify({"error": result.get("error", "上架失敗。")}), 400

@exchange_bp.route('/delist/<listing_id>', methods=['POST'])
def cancel_listing_route(listing_id):
    """
    處理玩家下架商品的請求。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到玩家資料。"}), 404

    result = cancel_listing_service(user_id, player_data, listing_id)

    if result.get("success"):
        return jsonify(result), 200
    else:
        return jsonify({"error": result.get("error", "下架失敗。")}), 400

@exchange_bp.route('/buy/<listing_id>', methods=['POST'])
def purchase_item_route(listing_id):
    """
    處理玩家購買商品的請求。
    """
    user_id, nickname, error_response = _get_authenticated_user_id()
    if error_response:
        return error_response

    game_configs = _get_game_configs_data_from_app_context()
    player_data, _ = get_player_data_service(user_id, nickname, game_configs)
    if not player_data:
        return jsonify({"error": "找不到您的玩家資料。"}), 404

    from .exchange_services import purchase_item_service
    result = purchase_item_service(user_id, player_data, listing_id)

    if result.get("success"):
        return jsonify(result), 200
    else:
        return jsonify({"error": result.get("error", "購買失敗。")}), 400
