# backend/config_editor_routes.py
# 新增的路由檔案：專門處理後台編輯遊戲設定的 API

import logging
import json
from flask import Blueprint, jsonify, request

# 從專案的其他模組導入
from .admin_routes import token_required
from .config_editor_services import (
    list_editable_configs,
    get_config_content,
    save_config_content,
    save_adventure_settings_service # --- 核心修改處 START ---
)

# 建立一個新的藍圖 (Blueprint)
config_editor_bp = Blueprint('config_editor_bp', __name__, url_prefix='/api/MD/admin')

config_editor_routes_logger = logging.getLogger(__name__)


@config_editor_bp.route('/list_configs', methods=['GET', 'OPTIONS'])
@token_required
def list_configs_route():
    """提供可編輯的設定檔列表。"""
    try:
        files = list_editable_configs()
        return jsonify(files), 200
    except Exception as e:
        config_editor_routes_logger.error(f"列出設定檔時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "無法獲取設定檔列表。"}), 500

@config_editor_bp.route('/get_config', methods=['GET', 'OPTIONS'])
@token_required
def get_config_route():
    """
    【修改】根據檔名獲取設定檔內容。
    """
    filename = request.args.get('file')
    if not filename:
        return jsonify({"error": "缺少 'file' 參數。"}), 400

    # 服務層現在直接回傳 Python 物件
    content_obj, error = get_config_content(filename)

    if error:
        # 如果有錯誤訊息，就回傳 500 錯誤
        return jsonify({"error": error}), 500
    
    # 直接將 Python 物件交給 jsonify 處理，這是最安全的方式
    return jsonify(content_obj), 200


@config_editor_bp.route('/save_config', methods=['POST', 'OPTIONS'])
@token_required
def save_config_route():
    """
    【修改】儲存設定檔內容。
    """
    data = request.get_json()
    filename = data.get('file')
    content_str = data.get('content') # 前端傳來的是未經處理的字串

    if not filename or content_str is None:
        return jsonify({"error": "請求中缺少 'file' 或 'content' 參數。"}), 400

    # 將字串內容直接傳遞給服務層，由服務層負責解析和儲存
    success, error = save_config_content(filename, content_str)
    
    if success:
        return jsonify({"success": True, "message": f"檔案 '{filename}' 已成功儲存並重新載入。"}), 200
    else:
        return jsonify({"error": error}), 500

# --- 核心修改處 START ---
@config_editor_bp.route('/save_adventure_settings', methods=['POST', 'OPTIONS'])
@token_required
def save_adventure_settings_route():
    """
    儲存冒險島的專屬設定。
    """
    data = request.get_json()
    global_settings = data.get('global_settings')
    facilities_settings = data.get('facilities_settings')

    if not global_settings or not facilities_settings:
        return jsonify({"error": "請求中缺少 'global_settings' 或 'facilities_settings' 參數。"}), 400
    
    success, error = save_adventure_settings_service(global_settings, facilities_settings)
    
    if success:
        return jsonify({"success": True, "message": "冒險島設定已成功儲存並重新載入。"}), 200
    else:
        return jsonify({"error": error}), 500
# --- 核心修改處 END ---
