# backend/config_editor_routes.py
import logging
import json
from flask import Blueprint, jsonify, request

# --- 核心修改處：將大部分 import 移至函式內部 ---
# from .admin_routes import token_required
# from .config_editor_services import (
#     list_editable_configs,
#     get_config_content,
#     save_config_content,
#     save_adventure_settings_service
# )

config_editor_bp = Blueprint('config_editor_bp', __name__, url_prefix='/api/MD/admin')

config_editor_routes_logger = logging.getLogger(__name__)


@config_editor_bp.route('/list_configs', methods=['GET', 'OPTIONS'])
def list_configs_route():
    from .admin_routes import token_required
    from .config_editor_services import list_editable_configs
    
    @token_required
    def secured_list_configs():
        try:
            files = list_editable_configs()
            return jsonify(files), 200
        except Exception as e:
            config_editor_routes_logger.error(f"列出設定檔時發生錯誤: {e}", exc_info=True)
            return jsonify({"error": "無法獲取設定檔列表。"}), 500
            
    return secured_list_configs()


@config_editor_bp.route('/get_config', methods=['GET', 'OPTIONS'])
def get_config_route():
    from .admin_routes import token_required
    from .config_editor_services import get_config_content

    @token_required
    def secured_get_config():
        filename = request.args.get('file')
        if not filename:
            return jsonify({"error": "缺少 'file' 參數。"}), 400

        content_obj, error = get_config_content(filename)

        if error:
            return jsonify({"error": error}), 500
        
        return jsonify(content_obj), 200
        
    return secured_get_config()


@config_editor_bp.route('/save_config', methods=['POST', 'OPTIONS'])
def save_config_route():
    from .admin_routes import token_required
    from .config_editor_services import save_config_content

    @token_required
    def secured_save_config():
        data = request.get_json()
        filename = data.get('file')
        content_str = data.get('content')

        if not filename or content_str is None:
            return jsonify({"error": "請求中缺少 'file' 或 'content' 參數。"}), 400

        success, error = save_config_content(filename, content_str)
        
        if success:
            return jsonify({"success": True, "message": f"檔案 '{filename}' 已成功儲存並重新載入。"}), 200
        else:
            return jsonify({"error": error}), 500
            
    return secured_save_config()

@config_editor_bp.route('/save_adventure_settings', methods=['POST', 'OPTIONS'])
def save_adventure_settings_route():
    from .admin_routes import token_required
    from .config_editor_services import save_adventure_settings_service
    
    @token_required
    def secured_save_adventure_settings():
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
            
    return secured_save_adventure_settings()

@config_editor_bp.route('/save_adventure_growth_settings', methods=['POST', 'OPTIONS'])
def save_adventure_growth_settings_route():
    from .admin_routes import token_required
    from .config_editor_services import save_adventure_growth_settings_service

    @token_required
    def secured_save_adventure_growth_settings():
        data = request.get_json()
        if not data:
            return jsonify({"error": "請求中缺少設定資料。"}), 400
        
        success, error = save_adventure_growth_settings_service(data)
        
        if success:
            return jsonify({"success": True, "message": "冒險島成長設定已成功儲存並重新載入。"}), 200
        else:
            return jsonify({"error": error}), 500
            
    return secured_save_adventure_growth_settings()
