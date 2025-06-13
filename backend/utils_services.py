# backend/utils_services.py
# 存放通用輔助函數

import logging

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