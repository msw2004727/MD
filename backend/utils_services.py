# backend/utils_services.py
# 存放通用輔助函數

import logging
from typing import Dict, Any

# 從 MD_models 導入 NamingConstraints
from .MD_models import NamingConstraints

utils_logger = logging.getLogger(__name__)

def calculate_exp_to_next_level(level: int, base_multiplier: int) -> int:
    """
    計算升到下一級所需的經驗值。
    - 確保 level 不小於 1。
    - level * base_multiplier。
    """
    if level <= 0:
        level = 1
    return level * base_multiplier

def generate_monster_full_nickname(player_title: str, monster_achievement: str, element_nickname_part: str, naming_constraints: NamingConstraints) -> str:
    """根據玩家稱號、怪獸成就和元素暱稱部分生成怪獸的完整暱稱。"""
    pt = player_title[:naming_constraints.get("max_player_title_len", 5)]
    ma = monster_achievement[:naming_constraints.get("max_monster_achievement_len", 5)]
    en = element_nickname_part[:naming_constraints.get("max_element_nickname_len", 5)]
    full_name = f"{pt}{ma}{en}"
    return full_name[:naming_constraints.get("max_monster_full_nickname_len", 15)]

# 可以在這裡添加其他通用輔助函數，例如：
# def generate_unique_instance_id(prefix: str, player_id: str) -> str:
#     """生成一個唯一的實例 ID"""
#     import time
#     import random
#     return f"{prefix}_{player_id}_{int(time.time() * 1000)}_{random.randint(0, 9999)}"

# def get_dna_template_by_id(dna_template_id: str, game_configs: Any) -> Optional[Dict[str, Any]]:
#     """從遊戲設定中根據 ID 查找 DNA 模板"""
#     if not game_configs or not game_configs.get("dna_fragments"):
#         return None
#     return next((d for d in game_configs["dna_fragments"] if d.get("id") == dna_template_id), None)
