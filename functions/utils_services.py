# backend/utils_services.py
# 存放遊戲中可共用的輔助函式

import copy
from typing import List, Dict, Optional, Any, Literal
import math
import time

from .MD_models import Skill, GameConfigs, ValueSettings, NamingConstraints

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
    
    # 日誌記錄可以在呼叫它的服務中進行，這裡保持函式純粹
    return point_change
# --- 新增：感情值計算的共用函式 END ---


def generate_monster_full_nickname(
    player_title: str,
    monster_achievement: str,
    element_nickname: str,
    naming_constraints: NamingConstraints
) -> str:
    """
    根據玩家稱號、怪獸成就和元素暱稱，生成完整的怪獸暱稱。
    """
    max_len_player_title = naming_constraints.get("max_player_title_len", 5)
    max_len_monster_achievement = naming_constraints.get("max_monster_achievement_len", 5)
    max_len_element_nickname = naming_constraints.get("max_element_nickname_len", 5)
    
    # 截斷各部分以符合長度限制
    p_title = player_title[:max_len_player_title]
    m_achieve = monster_achievement[:max_len_monster_achievement]
    e_nick = element_nickname[:max_len_element_nickname]
    
    # ----- BUG 修正邏輯 START -----
    # 組合最終的暱稱，移除引號和「的」
    full_nickname = f"{p_title}{m_achieve}{e_nick}"
    # ----- BUG 修正邏輯 END -----
    
    # 再次檢查總長度
    max_total_len = naming_constraints.get("max_monster_full_nickname_len", 20)
    if len(full_nickname) > max_total_len:
        # 如果超長，則進行截斷並加上省略號
        full_nickname = full_nickname[:max_total_len-1] + "…"
        
    return full_nickname


def calculate_exp_to_next_level(current_level: int, base_multiplier: int = 100) -> int:
    """
    計算升到下一級所需的經驗值。
    公式可以根據需要調整，例如加入指數增長。
    """
    if current_level <= 0:
        current_level = 1
    
    # 一個簡單的線性增長公式，可以根據需要調整
    # 例如： level 1 -> 100, level 2 -> 120, level 3 -> 140 ...
    # return base_multiplier + (current_level - 1) * 20
    
    # 或者一個指數增長公式
    return int(base_multiplier * (1.2 ** (current_level - 1)))


def get_effective_skill_with_level(skill_template: Skill, level: int) -> Skill:
    """
    根據技能模板和當前等級，計算技能的實際效果（如威力、MP消耗）。
    """
    if level <= 1:
        return copy.deepcopy(skill_template)

    effective_skill = copy.deepcopy(skill_template)
    effective_skill['level'] = level

    # 威力成長：每級提升 8%
    if 'power' in effective_skill and effective_skill['power'] > 0:
        effective_skill['power'] = math.floor(effective_skill['power'] * (1 + (level - 1) * 0.08))

    # MP 消耗降低：每 2 級降低 1 點
    if 'mp_cost' in effective_skill and effective_skill['mp_cost'] > 0:
        reduction = math.floor((level - 1) / 2)
        effective_skill['mp_cost'] = max(0, effective_skill['mp_cost'] - reduction)
    
    # 效果量成長 (例如 buff/debuff/heal 的量)
    if 'amount' in effective_skill and isinstance(effective_skill['amount'], (int, float)):
        # 假設效果量也以類似威力的形式成長
        effective_skill['amount'] = math.floor(effective_skill['amount'] * (1 + (level - 1) * 0.05))

    return effective_skill
