# backend/config_editor_routes.py
# 新增的路由檔案：專門處理後台編輯遊戲設定的 API

import logging
from flask import Blueprint, jsonify, request

# 從專案的其他模組導入
from .admin_routes import token_required
from .config_editor_services import (
    list_editable_configs,
    get_config_content,
    save_config_content
)

# 建立一個新的藍圖 (Blueprint)
config_editor_bp = Blueprint('config_editor_bp', __name__, url_prefix='/api/MD/admin')

config_editor_routes_logger = logging.getLogger(__name__)


@config_editor_bp.route('/list_configs', methods=['GET'])
@token_required
def list_configs_route():
    """提供可編輯的設定檔列表。"""
    try:
        files = list_editable_configs()
        return jsonify(files), 200
    except Exception as e:
        config_editor_routes_logger.error(f"列出設定檔時發生錯誤: {e}", exc_info=True)
        return jsonify({"error": "無法獲取設定檔列表。"}), 500

@config_editor_bp.route('/get_config', methods=['GET'])
@token_required
def get_config_route():
    """根據檔名獲取設定檔內容。"""
    filename = request.args.get('file')
    if not filename:
        return jsonify({"error": "缺少 'file' 參數。"}), 400

    content, error = get_config_content(filename)
    if error:
        return jsonify({"error": error}), 404 if "找不到" in error else 500
    
    # 嘗試將 JSON 字串解析為物件回傳，否則直接回傳純文字
    try:
        return jsonify(json.loads(content)), 200
    except json.JSONDecodeError:
        return jsonify({"content": content}), 200


@config_editor_bp.route('/save_config', methods=['POST'])
@token_required
def save_config_route():
    """儲存設定檔內容。"""
    data = request.get_json()
    filename = data.get('file')
    content = data.get('content')

    if not filename or content is None:
        return jsonify({"error": "請求中缺少 'file' 或 'content' 參數。"}), 400

    success, error = save_config_content(filename, content)
    
    if success:
        return jsonify({"success": True, "message": f"檔案 '{filename}' 已成功儲存並重新載入。"}), 200
    else:
        return jsonify({"error": error}), 500
