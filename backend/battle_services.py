# backend/battle_services.py
# 核心戰鬥邏輯服務

import random
import logging
import math
import copy
from typing import List, Dict, Optional, Any, Tuple, Literal, Union

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    Monster, Skill, HealthCondition, ElementTypes, RarityDetail, GameConfigs,
    BattleLogEntry, BattleAction, BattleResult, Personality, ValueSettings, SkillCategory
)
# 從 MD_ai_services 導入實際的 AI 文本生成函數
from .MD_ai_services import generate_battle_report_content # 確保這裡正確導入新的函數


battle_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式，避免循環導入 GameConfigs) ---
# 這裡只包含戰鬥模組需要的預設值
DEFAULT_GAME_CONFIGS_FOR_BATTLE: GameConfigs = {
    "dna_fragments": [],
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {"無": [{"name":"撞擊", "power":10, "crit":5, "probability":100, "type":"無", "baseLevel":1, "mp_cost":0, "skill_category":"物理"}]}, # type: ignore
    "personalities": [],
    "titles": [],
    "monster_achievements_list": [],
    "element_nicknames": {},
    "naming_constraints": {},
    "health_conditions": [ # 至少包含一些預設狀態
        {"id": "poisoned", "name": "中毒", "description": "", "effects": {"hp_per_turn": -8}, "duration": 3},
        {"id": "paralyzed", "name": "麻痺", "description": "", "effects": {}, "chance_to_skip_turn": 0.3, "duration": 2},
        {"id": "burned", "name": "燒傷", "description": "", "effects": {"hp_per_turn": -5, "attack": -10}, "duration": 3},
        {"id": "confused", "name": "混亂", "description": "", "effects": {}, "confusion_chance": 0.5, "duration": 2}
    ],
    "newbie_guide": [],
    "npc_monsters": [],
    "value_settings": {
        "element_value_factors": {},
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10,
        "max_monster_skills": 3,
        "max_battle_turns": 30,
        "base_accuracy": 80, # 基礎命中率
        "base_evasion": 5, # 基礎閃避率
        "accuracy_per_speed": 0.1, # 每點速度影響 0.1% 命中
        "evasion_per_speed": 0.05, # 每點速度影響 0.05% 閃避
        "crit_multiplier": 1.5 # 暴擊傷害倍率
    },
    "absorption_config": {},
    "cultivation_config": {},
    "elemental_advantage_chart": {},
}

# --- 輔助函式 ---

def _roll_dice(sides: int, num_dice: int = 1) -> int:
    """擲骰，例如 _roll_dice(20) 是 d20, _roll_dice(6, 2) 是 2d6。"""
    return sum(random.randint(1, sides) for _ in range(num_dice))

def _calculate_elemental_advantage(attacker_element: ElementTypes, defender_elements: List[ElementTypes], game_configs: GameConfigs) -> float:
    """計算元素克制倍率。"""
    chart = game_configs.get("elemental_advantage_chart", {})
    total_multiplier = 1.0
    for def_el in defender_elements:
        # 確保 defender_elements 中的每個元素都在 chart 中有定義，否則使用 1.0
        total_multiplier *= chart.get(attacker_element, {}).get(def_el, 1.0)
    return total_multiplier

def _get_monster_current_stats(monster: Monster) -> Dict[str, int]:
    """獲取怪獸的當前有效戰鬥數值，考慮臨時修正和狀態。"""
    stats = {
        "hp": monster.get("current_hp", monster["hp"]),
        "mp": monster.get("current_mp", monster["mp"]),
        "attack": monster["attack"] + monster.get("temp_attack_modifier", 0),
        "defense": monster["defense"] + monster.get("temp_defense_modifier", 0),
        "speed": monster["speed"] + monster.get("temp_speed_modifier", 0),
        "crit": monster["crit"] + monster.get("temp_crit_modifier", 0),
        "accuracy": monster.get("temp_accuracy_modifier", 0), # 臨時命中修正
        "evasion": monster.get("temp_evasion_modifier", 0) # 臨時閃避修正
    }

    # 應用健康狀態效果
    if monster.get("healthConditions"):
        for condition in monster["healthConditions"]:
            effects = condition.get("effects", {})
            for stat, value in effects.items():
                if stat in stats:
                    stats[stat] += value
    return stats

def _get_active_skills(monster: Monster, current_mp: int) -> List[Skill]:
    """獲取怪獸當前 MP 足夠使用的技能。"""
    active_skills = []
    for skill in monster.get("skills", []):
        mp_cost = skill.get("mp_cost", 0)
        if current_mp >= mp_cost:
            active_skills.append(skill)
    return active_skills

def _choose_action(attacker: Monster, defender: Monster, game_configs: GameConfigs) -> Optional[Skill]:
    """怪獸選擇行動，考慮個性偏好和 MP。"""
    current_attacker_stats = _get_monster_current_stats(attacker)
    available_skills = _get_active_skills(attacker, current_attacker_stats["mp"])

    if not available_skills:
        # 如果沒有可用技能，嘗試普通攻擊或休息 (這裡簡化為返回 None，表示無法行動)
        return None 
    
    # 根據個性偏好選擇技能
    personality_prefs = attacker.get("personality", {}).get("skill_preferences", {})
    
    weighted_skills = []
    for skill in available_skills:
        category = skill.get("skill_category", "其他")
        weight = personality_prefs.get(category, 1.0) # 預設權重 1.0
        weighted_skills.extend([skill] * int(weight * 10)) # 將技能重複多次以增加被選中機率
    
    if not weighted_skills: # 如果加權後仍然沒有技能 (例如權重都是0或異常)
        return random.choice(available_skills) # 退而求其次，隨機選擇一個可用的

    return random.choice(weighted_skills)


def _apply_skill_effect(performer: Monster, target: Monster, skill: Skill, game_configs: GameConfigs) -> Dict[str, Any]:
    """應用技能效果，並返回日誌訊息和數值變化。"""
    action_details: Dict[str, Any] = {
        "performer_id": performer["id"],
        "target_id": target["id"],
        "skill_name": skill["name"],
        "log_message": ""
    }
    
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_BATTLE["value_settings"]) # type: ignore
    crit_multiplier = value_settings.get("crit_multiplier", 1.5)

    # 消耗 MP
    performer["current_mp"] = performer.get("current_mp", performer["mp"]) - skill.get("mp_cost", 0)
    if performer["current_mp"] < 0: performer["current_mp"] = 0 # 確保不為負值

    # 計算命中和閃避
    attacker_current_stats = _get_monster_current_stats(performer)
    defender_current_stats = _get_monster_current_stats(target)

    base_accuracy = value_settings.get("base_accuracy", 80)
    base_evasion = value_settings.get("base_evasion", 5)
    acc_per_speed = value_settings.get("accuracy_per_speed", 0.1)
    eva_per_speed = value_settings.get("evasion_per_speed", 0.05)

    # 考慮速度差影響命中/閃避
    accuracy_modifier = int((attacker_current_stats["speed"] - defender_current_stats["speed"]) * acc_per_speed)
    evasion_modifier = int((defender_current_stats["speed"] - attacker_current_stats["speed"]) * eva_per_speed)

    final_accuracy = base_accuracy + attacker_current_stats["accuracy"] + accuracy_modifier + skill.get("hit_chance", 0)
    final_evasion = base_evasion + defender_current_stats["evasion"] + evasion_modifier
    
    hit_roll = random.randint(1, 100) # d100 命中擲骰
    
    is_hit = hit_roll <= (final_accuracy - final_evasion)
    is_crit = False
    is_miss = not is_hit

    if skill.get("crit", 0) > 0 and random.randint(1, 100) <= skill["crit"]:
        is_crit = True
    
    action_details["is_crit"] = is_crit
    action_details["is_miss"] = is_miss

    if not is_hit:
        action_details["log_message"] = f"{performer['nickname']} 對 {target['nickname']} 發動了 {skill['name']}，但 {target['nickname']} 靈巧地閃避了！"
        action_details["damage_dealt"] = 0
        return action_details

    # 傷害計算
    damage = 0
    if skill.get("power", 0) > 0:
        base_damage = skill["power"]
        
        # 攻擊力 vs 防禦力
        attacker_attack_stat = attacker_current_stats["attack"]
        defender_defense_stat = defender_current_stats["defense"]

        # 元素克制
        element_multiplier = _calculate_elemental_advantage(skill["type"], target["elements"], game_configs)

        # 基礎傷害計算
        # 簡化公式: (技能威力 + 攻擊力 / 2 - 防禦力 / 4) * 元素倍率
        raw_damage = max(1, (base_damage + (attacker_attack_stat / 2) - (defender_defense_stat / 4)))
        damage = int(raw_damage * element_multiplier)

        if is_crit:
            damage = int(damage * crit_multiplier) # 暴擊傷害倍率
            action_details["log_message"] = f"{performer['nickname']} 對 {target['nickname']} 發動了 {skill['name']}！致命一擊！"
        else:
            action_details["log_message"] = f"{performer['nickname']} 對 {target['nickname']} 發動了 {skill['name']}！"
        
        target["current_hp"] = target.get("current_hp", target["hp"]) - damage
        action_details["damage_dealt"] = damage
        action_details["log_message"] += f" 造成 {damage} 點傷害。"
        
        if target["current_hp"] <= 0:
            action_details["log_message"] += f" {target['nickname']} 被擊倒了！"
            target["current_hp"] = 0

    # 處理特殊效果 (簡化版)
    if skill.get("effect"):
        if skill["effect"] == "heal" and skill.get("amount"):
            heal_amount = skill["amount"]
            performer["current_hp"] = min(performer["hp"] + performer.get("cultivation_gains", {}).get("hp",0), performer.get("current_hp", performer["hp"]) + heal_amount)
            action_details["damage_healed"] = heal_amount
            action_details["log_message"] += f" {performer['nickname']} 恢復了 {heal_amount} 點 HP。"
        elif skill["effect"] == "status_change" and skill.get("status_id") and skill.get("effect_target"):
            status_template = next((s for s in game_configs.get("health_conditions", []) if s["id"] == skill["status_id"]), None)
            if status_template:
                target_monster_for_status = target if skill["effect_target"] == "opponent" else performer
                # 檢查是否已存在該狀態
                if not any(cond["id"] == status_template["id"] for cond in target_monster_for_status.get("healthConditions", [])):
                    if "healthConditions" not in target_monster_for_status:
                        target_monster_for_status["healthConditions"] = []
                    # 複製狀態以確保獨立性
                    new_status = copy.deepcopy(status_template)
                    new_status["duration"] = status_template.get("duration", 1) # 設定初始持續回合
                    target_monster_for_status["healthConditions"].append(new_status)
                    action_details["status_applied"] = status_template["id"]
                    action_details["log_message"] += f" {target_monster_for_status['nickname']} 陷入了 {status_template['name']} 狀態。"
        # 更多效果...
    
    return action_details

def _process_health_conditions(monster: Monster) -> Tuple[bool, List[str]]:
    """處理怪獸的健康狀態，包括回合數減少和效果應用。返回是否跳過回合和日誌。"""
    log_messages: List[str] = []
    skip_turn = False
    
    if not monster.get("healthConditions"):
        return skip_turn, log_messages

    new_conditions = []
    for condition in monster["healthConditions"]:
        # 應用持續傷害/恢復
        if "hp_per_turn" in condition.get("effects", {}):
            hp_change = condition["effects"]["hp_per_turn"]
            monster["current_hp"] = monster.get("current_hp", monster["hp"]) + hp_change
            monster["current_hp"] = max(0, min(monster["hp"] + monster.get("cultivation_gains",{}).get("hp",0), monster["current_hp"])) # 確保不超過最大生命值且不低於0
            log_messages.append(f"{monster['nickname']} 因 {condition['name']} 狀態 {'損失' if hp_change < 0 else '恢復'} 了 {abs(hp_change)} 點 HP。")

        # 檢查是否跳過回合
        if condition.get("chance_to_skip_turn", 0) > 0 and random.random() < condition["chance_to_skip_turn"]:
            skip_turn = True
            log_messages.append(f"{monster['nickname']} 因 {condition['name']} 狀態無法行動！")
        
        # 檢查混亂自傷
        if condition.get("confusion_chance", 0) > 0 and random.random() < condition["confusion_chance"]:
            confusion_damage = int(monster["attack"] * 0.1) # 簡化為攻擊力10%的自傷
            monster["current_hp"] = monster.get("current_hp", monster["hp"]) - confusion_damage
            log_messages.append(f"{monster['nickname']} 陷入混亂，攻擊了自己，造成 {confusion_damage} 點傷害！")


        # 減少持續回合數
        if condition.get("duration") is not None:
            condition["duration"] -= 1
            if condition["duration"] <= 0:
                log_messages.append(f"{monster['nickname']} 的 {condition['name']} 狀態解除了！")
                continue # 狀態結束，不加入新列表
        new_conditions.append(condition)
    
    monster["healthConditions"] = new_conditions
    return skip_turn, log_messages


# --- 戰鬥服務核心 ---
def simulate_battle_full(
    player_monster_data: Monster,
    opponent_monster_data: Monster,
    game_configs: GameConfigs,
) -> BattleResult:
    """
    一次性模擬整個怪獸戰鬥，並返回所有回合的詳細日誌和最終結果。
    """
    player_monster = copy.deepcopy(player_monster_data)
    opponent_monster = copy.deepcopy(opponent_monster_data)

    # 初始化當前 HP/MP
    player_monster["current_hp"] = player_monster.get("current_hp", player_monster["hp"])
    player_monster["current_mp"] = player_monster.get("current_mp", player_monster["mp"])
    opponent_monster["current_hp"] = opponent_monster.get("current_hp", opponent_monster["hp"])
    opponent_monster["current_mp"] = opponent_monster.get("current_mp", opponent_monster["mp"])
    
    # 初始化臨時數值修正和健康狀態列表
    player_monster.setdefault("temp_attack_modifier", 0)
    player_monster.setdefault("temp_defense_modifier", 0)
    player_monster.setdefault("temp_speed_modifier", 0)
    player_monster.setdefault("temp_crit_modifier", 0)
    player_monster.setdefault("temp_accuracy_modifier", 0)
    player_monster.setdefault("temp_evasion_modifier", 0)
    player_monster.setdefault("healthConditions", [])

    opponent_monster.setdefault("temp_attack_modifier", 0)
    opponent_monster.setdefault("temp_defense_modifier", 0)
    opponent_monster.setdefault("temp_speed_modifier", 0)
    opponent_monster.setdefault("temp_crit_modifier", 0)
    opponent_monster.setdefault("temp_accuracy_modifier", 0)
    opponent_monster.setdefault("temp_evasion_modifier", 0)
    opponent_monster.setdefault("healthConditions", [])

    all_raw_log_messages: List[str] = [] # 儲存所有回合的原始日誌訊息
    all_turn_actions: List[BattleAction] = [] # 儲存所有回合的行動細節

    max_turns = game_configs.get("value_settings", {}).get("max_battle_turns", 30)

    for turn_num in range(1, max_turns + 2): # 加 1 處理最終回判斷平手
        # 如果已經分出勝負，則跳出循環
        if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0:
            break

        turn_raw_log_messages: List[str] = [f"--- 回合 {turn_num} 開始 ---"]
        
        # 處理回合開始時的健康狀態效果
        player_skip, player_status_logs = _process_health_conditions(player_monster)
        turn_raw_log_messages.extend(player_status_logs)
        opponent_skip, opponent_status_logs = _process_health_conditions(opponent_monster)
        turn_raw_log_messages.extend(opponent_status_logs)

        # 如果任何一方在狀態處理後 HP 歸零，則直接結束行動階段
        if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0:
            # 戰鬥在狀態處理後結束，後面的勝負判斷會處理
            pass 
        else:
            # 判斷行動順序 (速度快者先行動)
            player_speed = _get_monster_current_stats(player_monster)["speed"]
            opponent_speed = _get_monster_current_stats(opponent_monster)["speed"]

            acting_order: List[Monster] = []
            if player_speed >= opponent_speed:
                acting_order.append(player_monster)
                acting_order.append(opponent_monster)
            else:
                acting_order.append(opponent_monster)
                acting_order.append(player_monster)
            
            # 執行行動
            for i, current_actor in enumerate(acting_order):
                target_actor = opponent_monster if current_actor["id"] == player_monster["id"] else player_monster
                
                # 檢查是否被擊倒或跳過回合
                if current_actor["current_hp"] <= 0:
                    continue # 被擊倒無法行動
                
                if (current_actor["id"] == player_monster["id"] and player_skip) or \
                   (current_actor["id"] == opponent_monster["id"] and opponent_skip):
                    turn_raw_log_messages.append(f"{current_actor['nickname']} 本回合無法行動。")
                    continue # 跳過回合

                chosen_skill = _choose_action(current_actor, target_actor, game_configs)
                if chosen_skill:
                    action_result = _apply_skill_effect(current_actor, target_actor, chosen_skill, game_configs)
                    turn_raw_log_messages.append(action_result["log_message"])
                    all_turn_actions.append(BattleAction( # 將每次行動加入總行動列表
                        performer_id=current_actor["id"],
                        target_id=target_actor["id"],
                        skill_name=chosen_skill["name"],
                        damage_dealt=action_result.get("damage_dealt"),
                        damage_healed=action_result.get("damage_healed"),
                        status_applied=action_result.get("status_applied"),
                        is_crit=action_result.get("is_crit"),
                        is_miss=action_result.get("is_miss"),
                        log_message=action_result["log_message"]
                    ))
                else:
                    turn_raw_log_messages.append(f"{current_actor['nickname']} 無法行動，等待機會。") # 無法行動時的日誌

                # 每次行動後檢查是否分出勝負
                if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0:
                    break # 勝負已分，結束本回合行動

        all_raw_log_messages.extend(turn_raw_log_messages) # 將本回合的原始日誌加入總列表

    # 戰鬥結束，判斷勝負
    winner_id: Optional[str] = None
    loser_id: Optional[str] = None
    battle_end = True # 戰鬥結束

    if player_monster["current_hp"] <= 0 and opponent_monster["current_hp"] <= 0:
        winner_id = "平手" # 特殊標記平手
        loser_id = "平手"
        all_raw_log_messages.append("戰鬥結束！雙方同歸於盡，平手！")
    elif player_monster["current_hp"] <= 0:
        winner_id = opponent_monster["id"]
        loser_id = player_monster["id"]
        all_raw_log_messages.append(f"戰鬥結束！{opponent_monster['nickname']} 獲勝！")
    elif opponent_monster["current_hp"] <= 0:
        winner_id = player_monster["id"]
        loser_id = opponent_monster["id"]
        all_raw_log_messages.append(f"戰鬥結束！{player_monster['nickname']} 獲勝！")
    else: # 達到最大回合數，判斷平手
        winner_id = "平手"
        loser_id = "平手"
        all_raw_log_messages.append(f"戰鬥達到最大回合數 ({max_turns})！雙方精疲力盡，平手！")


    final_battle_result: BattleResult = {
        "log_entries": [], # 在此模式下，這個列表不再用於前端的逐回合顯示，但可以保留。
        "raw_full_log": all_raw_log_messages, # 儲存完整的原始日誌供 AI 生成戰報
        "winner_id": winner_id,
        "loser_id": loser_id,
        "battle_end": battle_end,
        "player_monster_final_hp": player_monster["current_hp"],
        "player_monster_final_mp": player_monster["current_mp"],
        "player_monster_final_skills": player_monster.get("skills", []), # 返回最終技能狀態
        "player_monster_final_resume": player_monster.get("resume", {"wins": 0, "losses": 0}),
    }
    
    # 呼叫 AI 服務生成戰報內容
    ai_battle_report = generate_battle_report_content(
        player_monster_data, # 傳入原始怪獸數據，AI可能需要更詳細的初始屬性
        opponent_monster_data,
        final_battle_result, # 包含勝負等最終結果
        all_raw_log_messages # 完整的原始日誌供 AI 總結
    )
    final_battle_result["ai_battle_report_content"] = ai_battle_report # 將 AI 生成的戰報內容加入結果

    battle_logger.info(f"完整戰鬥模擬結束。勝利者: {winner_id}, 失敗者: {loser_id}")
    return final_battle_result
