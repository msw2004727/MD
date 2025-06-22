# backend/friend_services.py
# 新增的服務檔案：專門處理好友系統的核心邏輯，如發送請求、回應請求等。

import logging
from typing import Optional, Dict, Any

# 從專案的其他模組導入
from .mail_services import send_mail_to_player_service
from .MD_models import PlayerGameData

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
        payload=payload
    )

    if success:
        friend_services_logger.info(f"成功為玩家 {sender_id} 生成好友請求信件，並交由 mail_service 發送給 {recipient_id}。")
    else:
        friend_services_logger.error(f"為玩家 {sender_id} 生成好友請求信件後，發送失敗。")

    return success
