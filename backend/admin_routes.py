# backend/admin_routes.py

from flask import Blueprint, jsonify, render_template, session, redirect, url_for, request, current_app
from .MD_config_services import get_game_config_files, get_game_config_content, save_game_config_content
from functools import wraps
import jwt
from datetime import datetime, timedelta
from .admin_auth_services import ADMIN_SECRET_KEY, create_admin_token

# Import analytics services
from .analytics.analytics_services import (
    get_dau, 
    get_mau, 
    get_new_users, 
    get_paying_users, 
    get_revenue, 
    get_retention_rate, 
    get_player_growth # <-- 已修正名稱
)

admin_bp = Blueprint('admin', __name__, template_folder='../admin', static_folder='../admin')

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = session.get('admin_token')
        if not token:
            return redirect(url_for('admin.login'))
        try:
            jwt.decode(token, ADMIN_SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return redirect(url_for('admin.login', error='Session expired, please login again'))
        except jwt.InvalidTokenError:
            return redirect(url_for('admin.login', error='Invalid token, please login again'))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/admin/')
@login_required
def admin_dashboard():
    return render_template('dashboard.html')

@admin_bp.route('/admin/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        # In a real app, you'd verify username and password against a database
        if username == 'admin' and password == 'your_secure_password': # Replace with secure check
            token = create_admin_token(username)
            session['admin_token'] = token
            return redirect(url_for('admin.admin_dashboard'))
        else:
            return render_template('login.html', error='Invalid credentials')
    return render_template('login.html')

@admin_bp.route('/admin/logout')
def logout():
    session.pop('admin_token', None)
    return redirect(url_for('admin.login'))

@admin_bp.route('/admin/config-editor')
@login_required
def config_editor():
    files = get_game_config_files()
    return render_template('config-editor.html', files=files)

@admin_bp.route('/api/admin/config-files/<path:filename>')
@login_required
def get_config_file(filename):
    content = get_game_config_content(filename)
    if content is not None:
        return jsonify({"content": content})
    return jsonify({"error": "File not found"}), 404

@admin_bp.route('/api/admin/config-files/<path:filename>', methods=['POST'])
@login_required
def save_config_file(filename):
    data = request.json
    if 'content' not in data:
        return jsonify({"error": "No content provided"}), 400
    
    success = save_game_config_content(filename, data['content'])
    if success:
        return jsonify({"message": "File saved successfully"})
    return jsonify({"error": "Failed to save file"}), 500

# Analytics API Endpoints
@admin_bp.route('/api/admin/analytics/dau')
@login_required
def dau_data():
    return jsonify(get_dau())

@admin_bp.route('/api/admin/analytics/mau')
@login_required
def mau_data():
    return jsonify(get_mau())

@admin_bp.route('/api/admin/analytics/new-users')
@login_required
def new_users_data():
    return jsonify(get_new_users())

@admin_bp.route('/api/admin/analytics/paying-users')
@login_required
def paying_users_data():
    return jsonify(get_paying_users())

@admin_bp.route('/api/admin/analytics/revenue')
@login_required
def revenue_data():
    return jsonify(get_revenue())

@admin_bp.route('/api/admin/analytics/retention')
@login_required
def retention_data():
    return jsonify(get_retention_rate())

@admin_bp.route('/api/admin/analytics/player-growth')
@login_required
def player_growth_data():
    data = get_player_growth() # <-- 已修正函式呼叫
    return jsonify(data)
