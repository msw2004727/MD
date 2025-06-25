# backend/analytics/analytics_services.py

from backend.MD_firebase_config import db
from datetime import datetime, time
import pytz
import logging

# 獲取日誌記錄器實例
logger = logging.getLogger(__name__)

def get_dau():
    """
    計算每日活躍使用者 (DAU)。
    活躍使用者的定義是今天有登入過的玩家。
    """
    try:
        # 定義UTC時區
        utc = pytz.UTC

        # 獲取當前的UTC日期
        today_utc = datetime.now(utc).date()
        
        # 定義今天的開始與結束時間 (UTC)
        start_of_day = datetime.combine(today_utc, time.min, tzinfo=utc)
        end_of_day = datetime.combine(today_utc, time.max, tzinfo=utc)

        # 查詢Firestore中 last_login 在今天範圍內的使用者
        users_ref = db.collection('users')
        query = users_ref.where('last_login', '>=', start_of_day).where('last_login', '<=', end_of_day)
        
        # 獲取查詢結果的文件數量
        active_users = query.get()
        dau_count = len(active_users)

        logger.info(f"成功計算DAU {today_utc.isoformat()}: {dau_count} 位使用者。")
        
        return {"date": today_utc.isoformat(), "dau": dau_count}

    except Exception as e:
        logger.error(f"計算DAU時發生錯誤: {e}", exc_info=True)
        # 回傳錯誤訊息
        return {"error": "無法計算DAU", "details": str(e)}, 500


def get_mau():
    # TODO: Implement MAU calculation
    return {"month": "2024-07", "mau": 1200}

def get_new_users():
    # TODO: Implement new user calculation
    return {"date": "2024-07-29", "new_users": 25}

def get_paying_users():
    # TODO: Implement paying user calculation
    return {"date": "2024-07-29", "paying_users": 10}

def get_revenue():
    # TODO: Implement revenue calculation
    return {"date": "2024-07-29", "revenue": 150.75}

def get_retention_rate():
    # TODO: Implement retention rate calculation
    return {
        "start_date": "2024-07-01",
        "end_date": "2024-07-07",
        "retention_rate": 0.35
    }

def get_player_growth():
    # TODO: Implement player growth calculation
    return {
        "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
        "data": [100, 150, 220, 300]
    }

def get_top_spending_players():
    # TODO: Implement top spending players calculation
    return [
        {"player_id": "player123", "total_spent": 50.00},
        {"player_id": "player456", "total_spent": 45.50}
    ]
