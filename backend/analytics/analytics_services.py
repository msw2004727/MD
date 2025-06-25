# backend/analytics_services.py
# 新增的服務檔案：處理遊戲營運數據的紀錄與彙整

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List

# 從專案的其他模組導入
from . import MD_firebase_config
from .MD_models import PlayerGameData, GameConfigs

# 建立此服務專用的日誌記錄器
analytics_logger = logging.getLogger(__name__)

def log_event(event_type: str, details: Optional[Dict[str, Any]] = None):
    """
    向 Firestore 中的 EventLogs 集合寫入一條新的事件紀錄。
    這是一個中央日誌函式，將被遊戲中各個服務呼叫。

    Args:
        event_type (str): 事件的類型，例如 'user_registered', 'monster_created'。
        details (dict, optional): 包含與事件相關的額外資料。
    """
    db = MD_firebase_config.db
    if not db:
        analytics_logger.error("Firestore 資料庫未初始化，無法紀錄事件。")
        return

    try:
        event_log_ref = db.collection('EventLogs').document()
        log_data = {
            "type": event_type,
            "timestamp": int(time.time()),
            "details": details or {}
        }
        event_log_ref.set(log_data)
        analytics_logger.info(f"成功紀錄事件: {event_type}")
    except Exception as e:
        analytics_logger.error(f"紀錄事件 '{event_type}' 時發生錯誤: {e}", exc_info=True)


def aggregate_daily_data():
    """
    彙整 EventLogs 中的原始數據，計算並儲存每日的營運統計資料。
    注意：此函式的完整邏輯將在後續步驟中實現。
    這將是每日排程任務 (Cron Job) 要呼叫的核心函式。
    """
    # 待辦事項：
    # 1. 查詢過去24小時內的所有 EventLogs。
    # 2. 根據事件類型進行分類和計數。
    # 3. 處理需要掃描全體玩家的數據（如現存怪獸數量）。
    # 4. 將彙整結果寫入 AnalyticsData 集合的今日文件中。
    analytics_logger.info("每日數據彙整程序已觸發（目前為預留功能）。")
    
    # 這裡可以先放一個假的寫入，方便測試
    db = MD_firebase_config.db
    if not db:
        return

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc_ref = db.collection('AnalyticsData').document(f"daily_{today_str}")
    doc_ref.set({"placeholder": True, "last_updated": int(time.time())}, merge=True)


def get_analytics_for_range(start_date: str, end_date: str) -> Dict[str, Any]:
    """
    從 AnalyticsData 集合中獲取指定時間範圍內的彙整數據。

    Args:
        start_date (str): 開始日期 (格式 YYYY-MM-DD)
        end_date (str): 結束日期 (格式 YYYY-MM-DD)

    Returns:
        一個包含加總後統計數據的字典。
    """
    db = MD_firebase_config.db
    if not db:
        analytics_logger.error("Firestore 資料庫未初始化，無法獲取分析數據。")
        return {}
    
    # 待辦事項：
    # 1. 根據日期範圍查詢 AnalyticsData 中的文件。
    # 2. 將多天的數據進行加總。
    # 3. 回傳一個彙整後的結果物件。
    
    analytics_logger.info(f"正在為日期範圍 {start_date} - {end_date} 獲取分析數據（目前為預留功能）。")
    
    # 返回一個假的數據結構，以便前端可以先進行開發
    return {
        "date_range": f"{start_date} to {end_date}",
        "summary": { "newUsers": 0, "activeUsers": { "dau": 0 }, "totalPlayers": 0 },
        "monsterEcology": { "created": {}, "existing": {}, "nearDeathEvents": {}, "healEvents": {} },
        "playerEngagement": { "totalBattles": 0, "totalCombinations": 0, "aiChatMessages": 0, "cultivationByLocation": {} },
        "economy": { "goldFaucets": {}, "goldSinks": {}, "totalGoldInServer": 0 }
    }