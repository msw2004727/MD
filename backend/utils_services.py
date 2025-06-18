# backend/utils_services.py
# 存放通用輔助函數

import logging
from typing import Dict, Any, Optional
import copy
import math

# 從 MD_models 導入 NamingConstraints 和 Skill
from .MD_models import NamingConstraints, Skill

utils_logger = logging.getLogger(__name__)

def calculate_exp_to_next_level(level: int, base_multiplier: int) -> int:
    """
    計算升到下一級所需的經驗值。
    - 確保 level 不小於 1。
    - (level + 1) * base_multiplier。
    """
    if level <= 0:
        level = 1
    return (level + 1) * base_multiplier

def get_effective_skill_with_level(skill_template: Skill, level: int) -> Skill:
    """
    根據技能模板和指定等級，計算出技能的有效數值，包含里程碑效果。
    這是取代各服務中重複邏輯的中央函式。
    """
    effective_skill = copy.deepcopy(skill_template)
    effective_skill['level'] = level

    # 根據等級調整基礎數值
    if level > 1:
        base_power = skill_template.get("power", 0)
        if base_power > 0:
            # 每級提升 8% 的基礎威力
            effective_skill["power"] = int(base_power * (1 + (level - 1) * 0.08))

        base_mp_cost = skill_template.get("mp_cost", 0)
        if base_mp_cost > 0:
            # 每 2 級減少 1 點 MP 消耗
            effective_skill["mp_cost"] = max(1, base_mp_cost - math.floor((level - 1) / 2))

        base_crit = skill_template.get("crit", 0)
        if base_crit >= 0:
            # 每 2 級提升 1 點爆擊率
            effective_skill["crit"] = base_crit + math.floor((level - 1) / 2)

    # 檢查並應用已達成的里程碑效果
    milestones = skill_template.get("level_milestones")
    if milestones and isinstance(milestones, dict):
        for milestone_level_str, milestone_data in milestones.items():
            try:
                milestone_level = int(milestone_level_str)
                if level >= milestone_level:
                    # 應用里程碑提供的直接數值加成或效果修改
                    if "add_power" in milestone_data:
                        effective_skill["power"] = effective_skill.get("power", 0) + milestone_data["add_power"]
                    if "add_crit" in milestone_data:
                        effective_skill["crit"] = effective_skill.get("crit", 0) + milestone_data["add_crit"]
                    if "probability" in milestone_data:
                        effective_skill["probability"] = milestone_data["probability"]
                    # 可以根據需要擴展更多里程碑效果的應用
            except (ValueError, TypeError):
                continue

    return effective_skill


def generate_monster_full_nickname(player_title: str, monster_achievement: str, element_nickname_part: str, naming_constraints: NamingConstraints) -> str:
    """根據玩家稱號、怪獸成就和元素暱稱部分生成怪獸的完整暱稱。"""
    pt = player_title[:naming_constraints.get("max_player_title_len", 5)]
    ma = monster_achievement[:naming_constraints.get("max_monster_achievement_len", 5)]
    en = element_nickname_part[:naming_constraints.get("max_element_nickname_len", 5)]
    full_name = f"{pt}{ma}{en}"
    return full_name[:naming_constraints.get("max_monster_full_nickname_len", 15)]
