# backend/utils_services.py
# 存放遊戲中可共用的輔助函式

import copy
from typing import List, Dict, Optional, Any, Literal
import math
import time

from .MD_models import Skill, GameConfigs, ValueSettings, NamingConstraints

# --- 核心修改處 START ---
# 移除 _add_player_log 函式，它將被搬到 player_services.py
# --- 核心修改處 END ---


# --- 新增：感情值計算的共用函式 START ---
def update_bond_with_diminishing_returns(
    interaction_stats: Dict[str, Any],
    action_key: str,
    base_point_change: int
) -> int:
    """
    計算並應用帶有時間衰減的感情值變化。
    返回實際變動的點數。
    """
    current_time = int(time.time())
    timestamp_key = f"last_{action_key}_timestamp"
    count_key = f"{action_key}_count_in_window"
    
    last_action_time = interaction_stats.get(timestamp_key, 0)
    count_in_window = interaction_stats.get(count_key, 0)
    
    time_window = 3600  # 1 小時
    
    if (current_time - last_action_time) > time_window:
        count_in_window = 1
    else:
        count_in_window += 1
        
    interaction_stats[timestamp_key] = current_time
    interaction_stats[count_key] = count_in_window
    
    # 時間衰減公式
    multiplier = 0.75 ** (count_in_window - 1)
    point_change = math.floor(base_point_change * multiplier)
    
    if point_change == 0 and base_point_change > 0:
        point_change = 1 # 確保正向互動至少有1點獎勵
        
    current_bond = interaction_stats.get("bond_points", 0)
    new_bond = max(-100, min(100, current_bond + point_change))
    interaction_stats["bond_points"] = new_bond
    
    return point_change
# --- 新增：感情值計算的共用函式 END ---


def generate_monster_full_nickname(
    player_title: str, # 雖然不再使用，但保留參數以向下相容
    monster_achievement: str, # 雖然不再使用，但保留參數以向下相容
    element_nickname: str,
    naming_constraints: NamingConstraints
) -> str:
    """
    生成怪獸的暱稱，現在只使用屬性名。
    """
    # 舊的稱號與成就部分被移除
    # p_title = player_title[:max_len_player_title]
    # m_achieve = monster_achievement[:max_len_monster_achievement]
    
    # 直接使用並處理屬性暱稱
    max_len_element_nickname = naming_constraints.get("max_element_nickname_len", 5)
    e_nick = element_nickname[:max_len_element_nickname]
    
    # 完整的暱稱現在就是屬性暱稱
    full_nickname = e_nick
    
    return full_nickname


def calculate_exp_to_next_level(current_level: int, base_multiplier: int = 100) -> int:
    """
    計算升到下一級所需的經驗值。
    """
    if current_level <= 0:
        current_level = 1
    
    return int(base_multiplier * (1.2 ** (current_level - 1)))


def get_effective_skill_with_level(skill_template: Skill, level: int) -> Skill:
    """
    根據技能模板和當前等級，計算技能的實際效果（如威力、MP消耗）。
    """
    if level <= 1:
        return copy.deepcopy(skill_template)

    effective_skill = copy.deepcopy(skill_template)
    effective_skill['level'] = level

    if 'power' in effective_skill and isinstance(effective_skill['power'], (int, float)) and effective_skill['power'] > 0:
        effective_skill['power'] = math.floor(effective_skill['power'] * (1 + (level - 1) * 0.08))

    if 'mp_cost' in effective_skill and isinstance(effective_skill['mp_cost'], (int, float)) and effective_skill['mp_cost'] > 0:
        reduction = math.floor((level - 1) / 2)
        effective_skill['mp_cost'] = max(0, effective_skill['mp_cost'] - reduction)
    
    if 'amount' in effective_skill and isinstance(effective_skill['amount'], (int, float)):
        effective_skill['amount'] = math.floor(effective_skill['amount'] * (1 + (level - 1) * 0.05))

    return effective_skill
