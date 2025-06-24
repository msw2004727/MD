# backend/mail_services.py
# 新增的服務檔案：專門處理信箱系統的核心邏輯

import logging
import time
import uuid
# --- 核心修改處 START ---
# 導入 TYPE_CHECKING 用於處理循環依賴的類型提示
from typing import Optional, List, Dict, Any, Tuple, TYPE_CHECKING

# 從專案的其他模組導入
from . import MD_firebase_config
# from .MD_models import PlayerGameData, MailItem, PlayerOwnedDNA # 移除此處的直接導入

# 使用 TYPE_CHECKING 來避免運行時的循環導入錯誤
if TYPE_CHECKING:
    from .MD_models import PlayerGameData, MailItem, PlayerOwnedDNA, GameConfigs
# --- 核心修改處 END ---


# 設定日誌記錄器
mail_logger = logging.getLogger(__name__)


def add_mail_to_player(player_data: 'PlayerGameData', mail_item_template: Dict[str, Any]) -> Optional['PlayerGameData']:
    """
    為指定玩家的信箱新增一封信件。

    Args:
        player_data: 目標玩家的完整遊戲資料。
        mail_item_template: 一個包含信件基本資訊的字典，
                            例如 {'type': 'system_message', 'title': '歡迎訊息', 'content': '...'}。

    Returns:
        更新後的玩家資料 (如果成功)，否則返回 None。
    """
    if not player_data:
        mail_logger.error("新增信件失敗：player_data 為空。")
        return None

    # 為信件產生一個唯一的ID和時間戳
    new_mail_item: 'MailItem' = {
        "id": str(uuid.uuid4()),  # 使用 uuid 保證 ID 的唯一性
        "type": mail_item_template.get("type", "system_message"),
        "title": mail_item_template.get("title", "無標題"),
        "sender_id": mail_item_template.get("sender_id"),
        "sender_name": mail_item_template.get("sender_name"),
        "timestamp": int(time.time()),
        "is_read": False,
        "content": mail_item_template.get("content"),
        "payload": mail_item_template.get("payload", {}),
    }

    # 找到玩家的信箱，如果不存在則建立一個
    if "mailbox" not in player_data or not isinstance(player_data.get("mailbox"), list):
        player_data["mailbox"] = []

    # 將新信件加到信箱的最前面
    player_data["mailbox"].insert(0, new_mail_item)

    mail_logger.info(f"成功為玩家 {player_data.get('nickname')} 新增一封標題為 '{new_mail_item['title']}' 的信件。")

    return player_data


def send_mail_to_player_service(
    sender_id: str,
    sender_nickname: str,
    recipient_id: str,
    title: str,
    content: str,
    payload: Optional[Dict[str, Any]] = None,
    mail_type: str = "system_message"
) -> bool:
    """
    處理一個玩家向另一個玩家發送信件的邏輯。
    包含附件時，會先從寄件人身上扣除資產。
    """
    from .player_services import save_player_data_service, get_player_data_service
    
    db = MD_firebase_config.db
    if not db:
        mail_logger.error("Firestore 資料庫未初始化，無法發送信件。")
        return False

    if sender_id == recipient_id:
        mail_logger.warning(f"玩家 {sender_id} 試圖寄信給自己，操作已阻止。")
        return False

    try:
        # 如果信件帶有附件，則先處理寄件人的資產扣除
        if payload and (payload.get("gold", 0) > 0 or payload.get("items")):
            sender_data, _ = get_player_data_service(sender_id, sender_nickname, {})
            if not sender_data:
                mail_logger.error(f"寄信失敗：找不到寄件人 {sender_id} 的資料以扣除資產。")
                return False

            # 處理金幣
            gold_to_send = int(payload.get("gold", 0))
            if gold_to_send > 0:
                sender_gold = sender_data.get("playerStats", {}).get("gold", 0)
                if sender_gold < gold_to_send:
                    mail_logger.warning(f"寄信失敗：寄件人 {sender_id} 金幣不足。")
                    return False
                sender_data["playerStats"]["gold"] = sender_gold - gold_to_send

            # 處理物品 (DNA)
            items_to_send = payload.get("items", [])
            if items_to_send:
                sender_inventory = sender_data.get("playerOwnedDNA", [])
                item_ids_to_remove = {item['data']['id'] for item in items_to_send if item.get('type') == 'dna' and 'data' in item and 'id' in item['data']}
                
                sender_item_ids = {dna['id'] for dna in sender_inventory if dna}
                if not item_ids_to_remove.issubset(sender_item_ids):
                    mail_logger.error(f"寄信失敗：寄件人 {sender_id} 的庫存中找不到所有指定的DNA。")
                    return False

                new_inventory = [dna for dna in sender_inventory if not (dna and dna['id'] in item_ids_to_remove)]
                sender_data["playerOwnedDNA"] = new_inventory

            if not save_player_data_service(sender_id, sender_data):
                mail_logger.error(f"寄信失敗：扣除寄件人 {sender_id} 的資產後儲存失敗。")
                return False

        # 獲取收件人資料並加入信件
        recipient_doc_ref = db.collection('users').document(recipient_id).collection('gameData').document('main')
        recipient_doc = recipient_doc_ref.get()

        if not recipient_doc.exists:
            mail_logger.error(f"寄信失敗：找不到收件人 {recipient_id} 的遊戲資料。")
            return False
        
        recipient_data: 'PlayerGameData' = recipient_doc.to_dict() # type: ignore

        mail_template = {
            "type": mail_type, "title": title, "content": content,
            "sender_id": sender_id, "sender_name": sender_nickname, "payload": payload or {}
        }

        updated_recipient_data = add_mail_to_player(recipient_data, mail_template)

        if not updated_recipient_data:
            mail_logger.error(f"無法將信件加入收件人 {recipient_id} 的信箱。")
            return False

        if save_player_data_service(recipient_id, updated_recipient_data):
            mail_logger.info(f"玩家 {sender_nickname} ({sender_id}) 成功寄送一封信件給 {recipient_id}。")
            return True
        else:
            mail_logger.error(f"儲存收件人 {recipient_id} 的資料時失敗。")
            return False

    except Exception as e:
        mail_logger.error(f"寄送信件過程中發生未知錯誤: {e}", exc_info=True)
        return False


def delete_mail_from_player(player_data: 'PlayerGameData', mail_id: str) -> Optional['PlayerGameData']:
    if not player_data or not player_data.get("mailbox"):
        mail_logger.warning(f"刪除信件失敗：玩家沒有信箱或信箱為空。")
        return player_data

    original_mail_count = len(player_data["mailbox"])
    player_data["mailbox"] = [mail for mail in player_data["mailbox"] if mail.get("id") != mail_id]
    
    if len(player_data["mailbox"]) < original_mail_count:
        mail_logger.info(f"成功從玩家 {player_data.get('nickname')} 的信箱中刪除 ID 為 {mail_id} 的信件。")
    else:
        mail_logger.warning(f"嘗試刪除信件 {mail_id}，但在玩家 {player_data.get('nickname')} 的信箱中找不到。")

    return player_data


def mark_mail_as_read(player_data: 'PlayerGameData', mail_id: str) -> Optional['PlayerGameData']:
    if not player_data or not player_data.get("mailbox"):
        mail_logger.warning(f"標記已讀失敗：玩家沒有信箱或信箱為空。")
        return player_data

    mail_found = False
    for mail in player_data.get("mailbox", []):
        if mail.get("id") == mail_id:
            if not mail.get("is_read"):
                mail["is_read"] = True
                mail_logger.info(f"已將玩家 {player_data.get('nickname')} 的信件 {mail_id} 標記為已讀。")
            mail_found = True
            break
    
    if not mail_found:
        mail_logger.warning(f"嘗試標記信件 {mail_id} 為已讀，但在玩家 {player_data.get('nickname')} 的信箱中找不到。")

    return player_data


def claim_mail_attachments_service(player_data: 'PlayerGameData', mail_id: str, game_configs: 'GameConfigs') -> Tuple[Optional['PlayerGameData'], Optional[str]]:
    """
    處理玩家領取信件附件的邏輯。
    返回一個元組 (更新後的玩家資料, 錯誤訊息)。如果成功，錯誤訊息為 None。
    """
    if not player_data or "mailbox" not in player_data:
        return None, "找不到玩家資料或信箱。"

    target_mail = None
    mail_index = -1
    for i, mail in enumerate(player_data["mailbox"]):
        if mail.get("id") == mail_id:
            target_mail = mail
            mail_index = i
            break

    if not target_mail:
        return None, f"在信箱中找不到 ID 為 {mail_id} 的信件。"

    payload = target_mail.get("payload")
    if not payload or (payload.get("gold", 0) == 0 and not payload.get("items")):
        target_mail["title"] = target_mail.get("title", "無標題") + " (無附件)"
        return player_data, "此信件沒有附件可以領取。"

    player_stats = player_data.get("playerStats", {})
    inventory: List[Optional['PlayerOwnedDNA']] = player_data.get("playerOwnedDNA", [])
    max_inventory_slots = game_configs.get("value_settings", {}).get("max_inventory_slots", 12)

    gold_to_claim = int(payload.get("gold", 0))
    if gold_to_claim > 0:
        player_stats["gold"] = player_stats.get("gold", 0) + gold_to_claim
        mail_logger.info(f"玩家 {player_data.get('nickname')} 從信件 {mail_id} 領取了 {gold_to_claim} 金幣。")

    items_to_claim = payload.get("items", [])
    unclaimed_items = []
    if items_to_claim:
        for item in items_to_claim:
            if item.get("type") == "dna":
                dna_data = item.get("data")
                if not dna_data: continue

                free_slot_idx = -1
                while len(inventory) < max_inventory_slots:
                    inventory.append(None)
                
                for i in range(max_inventory_slots):
                    if inventory[i] is None:
                        free_slot_idx = i
                        break
                
                if free_slot_idx != -1:
                    inventory[free_slot_idx] = dna_data
                    mail_logger.info(f"玩家 {player_data.get('nickname')} 將DNA '{dna_data.get('name')}' 放入庫存槽位 {free_slot_idx}。")
                else:
                    unclaimed_items.append(item)
                    mail_logger.warning(f"玩家 {player_data.get('nickname')} 的庫存已滿，無法領取DNA '{dna_data.get('name')}'。")

    player_data["playerStats"] = player_stats
    player_data["playerOwnedDNA"] = inventory

    error_msg = None
    if not unclaimed_items:
        target_mail["payload"] = {}
        target_mail["title"] = target_mail.get("title", "無標題") + " (已領取)"
        mail_logger.info(f"信件 {mail_id} 的所有附件已被領取。")
    else:
        target_mail["payload"]["items"] = unclaimed_items
        if gold_to_claim > 0:
            target_mail["payload"]["gold"] = 0
        target_mail["title"] = target_mail.get("title", "無標題") + " (部分領取)"
        error_msg = "庫存已滿，部分附件無法領取。請清理庫存後再試一次。"
        mail_logger.warning(f"信件 {mail_id} 的部分附件因庫存已滿而未被領取。")

    target_mail["is_read"] = True
    player_data["mailbox"][mail_index] = target_mail
    
    return player_data, error_msg
