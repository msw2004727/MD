# backend/analytics/analytics_routes.py

from flask import Blueprint, jsonify
from .analytics_services import (
    get_dau,
    get_mau,
    get_new_users,
    get_paying_users,
    get_revenue,
    get_retention_rate,
    get_player_growth
)
# 【修改】將導入的函式名稱從 token_required 改為 login_required
from ..admin_routes import login_required

analytics_bp = Blueprint('analytics', __name__)

# 【修改】將 API 路由的保護裝飾器從 @token_required 改為 @login_required
@analytics_bp.route('/api/admin/analytics/dau')
@login_required
def dau_data():
    return jsonify(get_dau())

@analytics_bp.route('/api/admin/analytics/mau')
@login_required
def mau_data():
    return jsonify(get_mau())

@analytics_bp.route('/api/admin/analytics/new-users')
@login_required
def new_users_data():
    return jsonify(get_new_users())

@analytics_bp.route('/api/admin/analytics/paying-users')
@login_required
def paying_users_data():
    return jsonify(get_paying_users())

@analytics_bp.route('/api/admin/analytics/revenue')
@login_required
def revenue_data():
    return jsonify(get_revenue())

@analytics_bp.route('/api/admin/analytics/retention')
@login_required
def retention_data():
    return jsonify(get_retention_rate())

@analytics_bp.route('/api/admin/analytics/player-growth')
@login_required
def player_growth_data():
    data = get_player_growth()
    return jsonify(data)
