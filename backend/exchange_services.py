# backend/exchange_services.py
import logging
import time
import uuid
from typing import Dict, Any, Optional

from google.cloud import firestore

from .MD_models import PlayerGameData
from .player_services import save_player_data_service, _add_player_log
from . import MD_firebase_config

exchange_logger = logging.getLogger(__name__)

def create_listing_service(player_id: str, player_data: PlayerGameData, item_id: str, price: int) -> Dict[str, Any]:
    """
    處理玩家上架一個新的商品到交易所。

    Args:
        player_id: 賣家的玩家ID。
        player_data: 賣家的完整玩家資料。
        item_id: 要上架的DNA實例ID。
        price: 商品的定價。

    Returns:
        一個包含操作結果的字典。
    """
    if not isinstance(price, int) or price <= 0:
        return {"success": False, "error": "無效的價格。"}

    # 1. 從玩家庫存中找到對應的DNA
    inventory = player_data.get("playerOwnedDNA", [])
    item_to_list = None
    item_index = -1

    for i, item in enumerate(inventory):
        if item and item.get("id") == item_id:
            item_to_list = item
            item_index = i
            break

    if not item_to_list:
        return {"success": False, "error": "在您的庫存中找不到指定的DNA。"}

    # 2. 計算並扣除手續費
    fee = int(price * 0.10)
    if fee < 1 and price > 0:
        fee = 1 # 最低手續費為 1

    player_stats = player_data.get("playerStats", {})
    current_gold = player_stats.get("gold", 0)

    if current_gold < fee:
        return {"success": False, "error": f"金幣不足，上架需要支付 {fee} 🪙 的手續費。"}

    player_stats["gold"] = current_gold - fee
    exchange_logger.info(f"玩家 {player_id} 上架商品，已扣除手續費 {fee} 金幣。")

    # 3. 從玩家庫存中移除DNA
    inventory[item_index] = None
    player_data["playerOwnedDNA"] = inventory

    # 4. 在Firestore中創建新的商品列表
    db = MD_firebase_config.db
    if not db:
        return {"success": False, "error": "資料庫服務異常。"}

    listing_id = str(uuid.uuid4())
    new_listing = {
        "id": listing_id,
        "sellerId": player_id,
        "sellerName": player_data.get("nickname", "未知玩家"),
        "dna": item_to_list,
        "price": price,
        "listedAt": int(time.time()),
        "status": "active"
    }

    try:
        db.collection("ExchangeListings").document(listing_id).set(new_listing)
        exchange_logger.info(f"新的交易所商品已創建，ID: {listing_id}")
    except Exception as e:
        exchange_logger.error(f"寫入新的交易所商品時失敗: {e}", exc_info=True)
        # **重要**：如果寫入失敗，需要將物品和金幣還給玩家
        player_stats["gold"] = current_gold
        inventory[item_index] = item_to_list
        return {"success": False, "error": "無法將商品上架到交易所，您的物品和金幣未變動。"}

    # 5. 記錄日誌並儲存玩家資料
    _add_player_log(player_data, "交易所", f"成功上架了「{item_to_list.get('name')}」，支付了 {fee} 🪙 手續費。")
    
    if save_player_data_service(player_id, player_data):
        return {"success": True, "listing": new_listing}
    else:
        # **災難恢復**：如果最終存檔失敗，需要嘗試撤銷交易所的操作
        exchange_logger.error(f"玩家 {player_id} 的資料在商品上架後儲存失敗！嘗試撤銷操作...")
        db.collection("ExchangeListings").document(listing_id).delete()
        return {"success": False, "error": "上架後儲存玩家資料失敗，操作已撤銷。"}

def cancel_listing_service(player_id: str, player_data: PlayerGameData, listing_id: str) -> Dict[str, Any]:
    """
    處理玩家下架一個正在販售的商品。

    Args:
        player_id: 玩家ID。
        player_data: 玩家的完整資料。
        listing_id: 要下架的商品ID。

    Returns:
        一個包含操作結果的字典。
    """
    db = MD_firebase_config.db
    if not db:
        return {"success": False, "error": "資料庫服務異常。"}

    listing_ref = db.collection("ExchangeListings").document(listing_id)
    
    try:
        listing_doc = listing_ref.get()
        if not listing_doc.exists:
            return {"success": False, "error": "找不到該商品，可能已被購買或下架。"}

        listing_data = listing_doc.to_dict()

        if listing_data.get("sellerId") != player_id:
            return {"success": False, "error": "您不是該商品的賣家，無法下架。"}

        # 找到一個空的庫存槽位
        inventory = player_data.get("playerOwnedDNA", [])
        free_slot_index = -1
        for i, item in enumerate(inventory):
            if item is None:
                free_slot_index = i
                break
        
        if free_slot_index == -1:
            return {"success": False, "error": "您的庫存已滿，無法將下架的DNA放回。請先清理庫存。"}

        # 將DNA物品放回庫存
        dna_to_return = listing_data.get("dna")
        inventory[free_slot_index] = dna_to_return
        player_data["playerOwnedDNA"] = inventory

        # 從交易所刪除該商品
        listing_ref.delete()
        exchange_logger.info(f"玩家 {player_id} 已成功下架商品 {listing_id}。")

        # 記錄日誌並儲存玩家資料
        _add_player_log(player_data, "交易所", f"成功下架了「{dna_to_return.get('name')}」。")
        if save_player_data_service(player_id, player_data):
            return {"success": True, "returned_dna": dna_to_return}
        else:
            exchange_logger.error(f"玩家 {player_id} 的資料在商品下架後儲存失敗！")
            # **災難恢復**：嘗試將商品重新上架
            listing_ref.set(listing_data)
            return {"success": False, "error": "下架後儲存玩家資料失敗，操作已撤銷。"}

    except Exception as e:
        exchange_logger.error(f"下架商品 {listing_id} 時發生錯誤: {e}", exc_info=True)
        return {"success": False, "error": "處理下架時發生未知錯誤。"}



def purchase_item_service(buyer_id: str, buyer_data: PlayerGameData, listing_id: str) -> Dict[str, Any]:
    """
    處理玩家購買交易所商品的邏輯，使用 Firestore 交易來確保原子性。

    Args:
        buyer_id: 買家的玩家ID。
        buyer_data: 買家的完整玩家資料。
        listing_id: 要購買的商品ID。

    Returns:
        一個包含操作結果的字典。
    """
    db = MD_firebase_config.db
    if not db:
        return {"success": False, "error": "資料庫服務異常。"}

    listing_ref = db.collection("ExchangeListings").document(listing_id)
    buyer_ref = db.collection("users").document(buyer_id).collection("gameData").document("main")

    @firestore.transactional
    def process_purchase(transaction):
        # 1. 讀取所有需要的文檔
        listing_doc = listing_ref.get(transaction=transaction)
        if not listing_doc.exists:
            raise Exception("此商品已被購買或下架。")
        
        listing_data = listing_doc.to_dict()
        seller_id = listing_data.get("sellerId")

        if seller_id == buyer_id:
            raise Exception("您不能購買自己上架的商品。")

        seller_ref = db.collection("users").document(seller_id).collection("gameData").document("main")
        seller_doc = seller_ref.get(transaction=transaction)
        if not seller_doc.exists:
            raise Exception("找不到賣家資料，交易取消。")
            
        # 買家資料已在外部獲取，這裡直接使用
        current_buyer_data = buyer_data
        seller_data = seller_doc.to_dict()

        # 2. 執行所有驗證
        price = listing_data.get("price", 0)
        buyer_gold = current_buyer_data.get("playerStats", {}).get("gold", 0)

        if buyer_gold < price:
            raise Exception(f"您的金幣不足，需要 {price} 🪙��")

        buyer_inventory = current_buyer_data.get("playerOwnedDNA", [])
        free_slot_index = -1
        for i, item in enumerate(buyer_inventory):
            if item is None:
                free_slot_index = i
                break
        
        if free_slot_index == -1:
            raise Exception("您的庫存已滿，無法接收購買的DNA。")

        # 3. 執行所有資料更新
        # 更新買家
        current_buyer_data["playerStats"]["gold"] -= price
        dna_to_receive = listing_data.get("dna")
        current_buyer_data["playerOwnedDNA"][free_slot_index] = dna_to_receive
        _add_player_log(current_buyer_data, "交易所", f"成功購買了「{dna_to_receive.get('name')}」，花費了 {price} 🪙。")

        # 更新賣家
        seller_data["playerStats"]["gold"] += price
        _add_player_log(seller_data, "交易所", f"您上架的「{dna_to_receive.get('name')}」已售出，獲得了 {price} 🪙。")

        # 4. 在交易中更新文檔
        transaction.set(buyer_ref, current_buyer_data)
        transaction.set(seller_ref, seller_data)
        transaction.delete(listing_ref)
        
        return {"success": True, "item_name": dna_to_receive.get('name')}

    try:
        result = process_purchase(db.transaction())
        exchange_logger.info(f"玩家 {buyer_id} 成功購買商品 {listing_id}。")
        return result
    except Exception as e:
        exchange_logger.error(f"購買商品 {listing_id} 的交易失敗: {e}", exc_info=True)
        return {"success": False, "error": str(e)}
