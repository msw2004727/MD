# backend/admin_routes.py
from flask import Blueprint, jsonify, request, session, render_template, redirect, url_for
import os
import logging
from functools import wraps

# 匯入新的分析服務函式
from .analytics.analytics_services import (
    get_user_growth_data, 
    get_monster_distribution_data,
    get_battle_activity_data,
    get_economic_data,
    get_kpi_metrics,
    get_recent_activities,
    get_error_logs
)
# 匯入舊的管理服務函式
from .player_services import get_all_player_data
from .mail_services import admin_send_mail
from .config_editor_services import get_all_config_files, get_config_file_content, save_config_file_content

# 設定 Blueprint，使其能夠提供模板和靜態檔案
admin_bp = Blueprint('admin', __name__, 
                     template_folder=os.path.join(os.path.dirname(__file__), '..', 'admin'),
                     static_folder=os.path.join(os.path.dirname(__file__), '..', 'admin'))

logger = logging.getLogger(__name__)

# 從環境變數讀取後台密碼
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "default_password")

# --- 新的 Session 驗證機制 ---
def admin_required(f):
    """
    統一的裝飾器，用於檢查 Flask session 中是否有管理員登入的紀錄。
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin.login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

# --- 主要頁面路由 ---
@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            next_url = request.args.get('next')
            logger.info("Admin login successful.")
            return redirect(next_url or url_for('admin.dashboard'))
        else:
            logger.warning("Failed admin login attempt.")
            return "Invalid password", 401
    return render_template('index.html')

@admin_bp.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    logger.info("Admin logged out.")
    return redirect(url_for('admin.login'))

@admin_bp.route('/')
@admin_required
def dashboard():
    return render_template('dashboard.html')

@admin_bp.route('/analytics')
@admin_required
def analytics():
    return render_template('analytics.html')

@admin_bp.route('/config-editor')
@admin_required
def config_editor():
    return render_template('config-editor.html')

# === 新的儀表板 API ===
@admin_bp.route('/api/kpi-metrics')
@admin_required
def api_kpi_metrics():
    data = get_kpi_metrics()
    return jsonify(data)

@admin_bp.route('/api/recent-activities')
@admin_required
def api_recent_activities():
    data = get_recent_activities()
    return jsonify(data)

@admin_bp.route('/api/error-logs')
@admin_required
def api_error_logs():
    data = get_error_logs()
    return jsonify(data)
    
@admin_bp.route('/api/analytics/user-growth')
@admin_required
def api_user_growth():
    data = get_user_growth_data()
    return jsonify(data)

@admin_bp.route('/api/analytics/monster-distribution')
@admin_required
def api_monster_distribution():
    data = get_monster_distribution_data()
    return jsonify(data)

@admin_bp.route('/api/analytics/battle-activity')
@admin_required
def api_battle_activity():
    data = get_battle_activity_data()
    return jsonify(data)

@admin_bp.route('/api/analytics/economic')
@admin_required
def api_economic_data():
    data = get_economic_data()
    return jsonify(data)

# === 舊的管理功能 API (已整合) ===
@admin_bp.route('/api/management/player-data', methods=['GET'])
@admin_required
def player_data():
    player_data = get_all_player_data()
    return jsonify(player_data)

@admin_bp.route('/api/management/send-mail', methods=['POST'])
@admin_required
def send_mail_to_player():
    data = request.get_json()
    result = admin_send_mail(data['player_id'], data['title'], data['message'], data.get('attachments'))
    return jsonify(result)

@admin_bp.route('/api/management/configs', methods=['GET'])
@admin_required
def list_configs():
    files = get_all_config_files()
    return jsonify(files)

@admin_bp.route('/api/management/configs/<path:filename>', methods=['GET', 'POST'])
@admin_required
def handle_config_file(filename):
    if request.method == 'POST':
        content = request.get_json().get('content')
        result = save_config_file_content(filename, content)
        return jsonify(result)
    else: # GET
        content = get_config_file_content(filename)
        if content is None:
            return jsonify({"error": "File not found or could not be read."}), 404
        return jsonify({"filename": filename, "content": content})
