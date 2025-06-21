# backend/mail_services.py
# 新增的服務檔案：專門處理信箱系統的核心邏輯

import logging
import time
import uuid
from typing import Optional, List, Dict, Any

# 從專案的其他模組導入
from . import MD_firebase_config
from .MD_models import PlayerGameData, MailItem
# --- 核心修改處 START ---
# 導入儲存服務，以便在寄信後更新收件人的資料
from .player_services import save_player_data_service
# --- 核心修改處 END ---

# 設定日誌記錄器
mail_logger = logging.getLogger(__name__)


def add_mail_to_player(player_data: PlayerGameData, mail_item_template: Dict[str, Any]) -> Optional[PlayerGameData]:
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
    new_mail_item: MailItem = {
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


# --- 核心修改處 START ---
def send_mail_to_player_service(
    sender_id: str,
    sender_nickname: str,
    recipient_id: str,
    title: str,
    content: str,
    payload: Optional[Dict[str, Any]] = None
) -> bool:
    """
    處理一個玩家向另一個玩家發送信件的邏輯。

    Args:
        sender_id: 寄件人ID。
        sender_nickname: 寄件人暱稱。
        recipient_id: 收件人ID。
        title: 信件標題。
        content: 信件內容。
        payload: 附加的禮物資料 (可選)。

    Returns:
        如果信件成功發送並儲存，則返回 True，否則返回 False。
    """
    db = MD_firebase_config.db
    if not db:
        mail_logger.error("Firestore 資料庫未初始化，無法發送信件。")
        return False

    if sender_id == recipient_id:
        mail_logger.warning(f"玩家 {sender_id} 試圖寄信給自己，操作已阻止。")
        return False

    try:
        # 1. 獲取收件人的遊戲資料
        recipient_doc_ref = db.collection('users').document(recipient_id).collection('gameData').document('main')
        recipient_doc = recipient_doc_ref.get()

        if not recipient_doc.exists:
            mail_logger.error(f"寄信失敗：找不到收件人 {recipient_id} 的遊戲資料。")
            return False
        
        recipient_data: PlayerGameData = recipient_doc.to_dict() # type: ignore

        # 2. 建立信件範本
        mail_template = {
            "type": "system_message",  # 暫時使用 system_message 類型，未來可擴充為 player_mail
            "title": title,
            "content": content,
            "sender_id": sender_id,
            "sender_name": sender_nickname,
            "payload": payload or {}
        }

        # 3. 將信件加入收件人的信箱
        updated_recipient_data = add_mail_to_player(recipient_data, mail_template)

        if not updated_recipient_data:
            mail_logger.error(f"無法將信件加入收件人 {recipient_id} 的信箱。")
            return False

        # 4. 儲存更新後的收件人資料
        if save_player_data_service(recipient_id, updated_recipient_data):
            mail_logger.info(f"玩家 {sender_nickname} ({sender_id}) 成功寄送一封信件給 {recipient_id}。")
            return True
        else:
            mail_logger.error(f"儲存收件人 {recipient_id} 的資料時失敗。")
            return False

    except Exception as e:
        mail_logger.error(f"寄送信件過程中發生未知錯誤: {e}", exc_info=True)
        return False
# --- 核心修改處 END ---


def delete_mail_from_player(player_data: PlayerGameData, mail_id: str) -> Optional[PlayerGameData]:
    """
    從玩家的信箱中刪除一封信件。

    Args:
        player_data: 目標玩家的完整遊戲資料。
        mail_id: 要刪除的信件 ID。

    Returns:
        更新後的玩家資料 (如果成功)，否則返回 None。
    """
    if not player_data or not player_data.get("mailbox"):
        mail_logger.warning(f"刪除信件失敗：玩家沒有信箱或信箱為空。")
        return player_data # 返回原始資料，因為沒有可刪除的

    original_mail_count = len(player_data["mailbox"])
    player_data["mailbox"] = [mail for mail in player_data["mailbox"] if mail.get("id") != mail_id]
    
    if len(player_data["mailbox"]) < original_mail_count:
        mail_logger.info(f"成功從玩家 {player_data.get('nickname')} 的信箱中刪除 ID 為 {mail_id} 的信件。")
    else:
        mail_logger.warning(f"嘗試刪除信件 {mail_id}，但在玩家 {player_data.get('nickname')} 的信箱中找不到。")

    return player_data


def mark_mail_as_read(player_data: PlayerGameData, mail_id: str) -> Optional[PlayerGameData]:
    """
    將玩家信箱中的特定信件標記為已讀。

    Args:
        player_data: 目標玩家的完整遊戲資料。
        mail_id: 要標記為已讀的信件 ID。

    Returns:
        更新後的玩家資料 (如果成功)，否則返回 None。
    """
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
