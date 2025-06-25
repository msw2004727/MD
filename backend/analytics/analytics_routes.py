# backend/analytics/analytics_routes.py
# 新增的路由檔案：專門處理營運儀表板的 API 請求

import logging
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

# 從相對路徑導入服務與驗證裝飾器
from .analytics_services import get_analytics_for_range
from ..admin_routes import token_required

# 建立一個新的藍圖 (Blueprint) 來管理統計儀表板的路由
analytics_bp = Blueprint('analytics_bp', __name__, url_prefix='/api/MD/admin')

# 建立此路由專用的日誌記錄器
analytics_routes_logger = logging.getLogger(__name__)


@analytics_bp.route('/analytics', methods=['GET'])
@token_required
def get_analytics_data_route():
    """
    提供彙整後的營運統計數據給前端儀表板。
    支援透過 query 參數指定日期範圍。
    """
    try:
        # 從請求的 URL 參數中獲取日期，如果未提供，則設定預設值（過去7天）
        today = datetime.utcnow().date()
        seven_days_ago = today - timedelta(days=7)
        
        start_date_str = request.args.get('start', seven_days_ago.strftime('%Y-%m-%d'))
        end_date_str = request.args.get('end', today.strftime('%Y-%m-%d'))

        analytics_routes_logger.info(f"收到分析數據請求，日期範圍: {start_date_str} 至 {end_date_str}")

        # 呼叫服務層的函式來獲取數據
        analytics_data = get_analytics_for_range(start_date_str, end_date_str)

        if not analytics_data:
            return jsonify({"error": "無法獲取分析數據。"}), 404

        return jsonify(analytics_data), 200

    except Exception as e:
        analytics_routes_logger.error(f"獲取分析數據時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "伺服器內部錯誤，無法處理分析數據請求。"}), 500
