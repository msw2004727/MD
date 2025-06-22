# backend/friend_services.py
# 新增的服務檔案：專門處理好友系統的核心邏輯，如發送請求、回應請求等。

import logging
from typing import Optional, Dict, Any

# 從專案的其他模組導入
from .mail_services import send_mail_to_player_service, delete_mail_from_player
from .MD_models import PlayerGameData
from .player_services import get_player_data_service, save_player_data_service


# 設定日誌記錄器
friend_services_logger = logging.getLogger(__name__)


def send_friend_request_service(
    sender_id: str,
    sender_nickname: str,
    recipient_id: str
) -> bool:
    """
    處理發送好友請求的核心邏輯。
    這個服務會打包一個標準的好友請求信件，並呼叫信箱服務來發送。

    Args:
        sender_id: 請求發送者的玩家 ID。
        sender_nickname: 請求發送者的暱稱。
        recipient_id: 請求接收者的玩家 ID。

    Returns:
        如果請求信件成功發送，則返回 True，否則返回 False。
    """
    friend_services_logger.info(f"玩家 {sender_nickname}({sender_id}) 準備向 {recipient_id} 發送好友請求。")

    # 定義好友請求信件的標準格式
    # --- 核心修改處 START ---
    # 將信件類型改為 'friend_request'，讓前端可以區分
    title = f"來自「{sender_nickname}」的好友請求"
    content = f"玩家「{sender_nickname}」想要將您加為好友。您可以在信箱中處理此請求。"
    
    # 建立 payload，這對於接收者回應請求至關重要
    # 我們將寄件人的資訊放在 payload 中，這樣收件人回覆時才知道要回覆給誰
    payload = {
        "request_type": "friend_request",
        "sender_id": sender_id,
        "sender_nickname": sender_nickname
    }

    # 呼叫現有的信箱服務來發送信件
    success = send_mail_to_player_service(
        sender_id=sender_id,
        sender_nickname=sender_nickname,
        recipient_id=recipient_id,
        title=title,
        content=content,
        payload=payload,
        mail_type="friend_request" # 指定信件類型
    )
    # --- 核心修改處 END ---

    if success:
        friend_services_logger.info(f"成功為玩家 {sender_id} 生成好友請求信件，並交由 mail_service 發送給 {recipient_id}。")
    else:
        friend_services_logger.error(f"為玩家 {sender_id} 生成好友請求信件後，發送失敗。")

    return success

# --- 核心修改處 START ---
def respond_to_friend_request_service(
    responder_id: str,
    mail_id: str,
    action: str
) -> bool:
    """
    處理對好友請求的回應 (同意或拒絕)。

    Args:
        responder_id: 正在回應請求的玩家ID。
        mail_id: 好友請求信件的ID。
        action: 玩家的操作，'accept' 或 'decline'。

    Returns:
        操作是否成功。
    """
    # 獲取回應者的資料
    responder_data, _ = get_player_data_service(responder_id, None, {})
    if not responder_data:
        friend_services_logger.error(f"回應好友請求失敗：找不到回應者 {responder_id} 的資料。")
        return False

    # 在回應者的信箱中尋找該請求信件
    friend_request_mail = None
    if responder_data.get("mailbox"):
        for mail in responder_data["mailbox"]:
            if mail.get("id") == mail_id and mail.get("type") == "friend_request":
                friend_request_mail = mail
                break
    
    if not friend_request_mail:
        friend_services_logger.warning(f"回應好友請求：在玩家 {responder_id} 的信箱中找不到 ID 為 {mail_id} 的好友請求信，可能已被處理。")
        # 即使信件找不到，也視為操作成功，避免前端卡住
        return True
        
    # 從信件的 payload 中獲取原始寄件人的資訊
    payload = friend_request_mail.get("payload", {})
    sender_id = payload.get("sender_id")
    sender_nickname = payload.get("sender_nickname")

    if not sender_id or not sender_nickname:
        friend_services_logger.error(f"好友請求信件 {mail_id} 的 payload 格式不正確，缺少 sender_id 或 sender_nickname。")
        return False

    # 如果玩家選擇同意
    if action == "accept":
        friend_services_logger.info(f"玩家 {responder_id} 同意了來自 {sender_nickname}({sender_id}) 的好友請求。")
        
        # 獲取寄件人的資料
        sender_data, _ = get_player_data_service(sender_id, None, {})
        if not sender_data:
            friend_services_logger.error(f"同意好友請求失敗：找不到寄件人 {sender_id} 的資料。")
            return False

        # 將雙方互相加入好友列表
        responder_info = {"uid": responder_id, "nickname": responder_data.get("nickname")}
        sender_info = {"uid": sender_id, "nickname": sender_nickname}
        
        # 更新回應者的好友列表 (如果不存在)
        if "friends" not in responder_data: responder_data["friends"] = []
        if not any(f.get("uid") == sender_id for f in responder_data["friends"]):
            responder_data["friends"].append(sender_info)

        # 更新寄件人的好友列表 (如果不存在)
        if "friends" not in sender_data: sender_data["friends"] = []
        if not any(f.get("uid") == responder_id for f in sender_data["friends"]):
            sender_data["friends"].append(responder_info)
            
        # 儲存寄件人的資料
        save_player_data_service(sender_id, sender_data)

    # 無論同意或拒絕，都從信箱中刪除這封請求信
    responder_data_after_delete = delete_mail_from_player(responder_data, mail_id)
    
    # 儲存回應者的資料 (包含了好友列表的更新和信件的刪除)
    if not save_player_data_service(responder_id, responder_data_after_delete):
        friend_services_logger.error(f"處理完好友請求後，儲存玩家 {responder_id} 的資料失敗。")
        return False
    
    return True
# --- 核心修改處 END ---
