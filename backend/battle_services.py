# backend/battle_services.py
# 核心戰鬥邏輯服務

import random
import logging
import math
import copy
import time
from typing import List, Dict, Optional, Any, Tuple, Literal, Union

# 從 MD_models 導入相關的 TypedDict 定義
from .MD_models import (
    Monster, Skill, HealthCondition, ElementTypes, RarityDetail, GameConfigs,
    BattleLogEntry, BattleAction, BattleResult, Personality, ValueSettings, SkillCategory, MonsterActivityLogEntry
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

def _get_monster_current_stats(monster: Monster) -> Dict[str, Union[int, float]]:
    """獲取怪獸的當前有效戰鬥數值，考慮臨時修正和狀態。"""
    # 使用 .get() 並提供合理的預設值，以增加程式的穩健性，避免因資料缺失而崩潰
    stats = {
        "hp": monster.get("current_hp", monster.get("hp", 0)),
        "mp": monster.get("current_mp", monster.get("mp", 0)),
        "attack": monster.get("attack", 0) + monster.get("temp_attack_modifier", 0),
        "defense": monster.get("defense", 0) + monster.get("temp_defense_modifier", 0),
        "speed": monster.get("speed", 0) + monster.get("temp_speed_modifier", 0),
        "crit": monster.get("crit", 0) + monster.get("temp_crit_modifier", 0),
        "accuracy": monster.get("temp_accuracy_modifier", 0), # 臨時命中修正
        "evasion": monster.get("temp_evasion_modifier", 0) # 臨時閃避修正
    }

    # 應用健康狀態效果
    if monster.get("healthConditions"):
        for condition in monster["healthConditions"]:
            effects = condition.get("effects", {})
            for stat, value in effects.items():
                if stat in stats:
                    stats[stat] += value # type: ignore
    return stats # type: ignore

def _get_active_skills(monster: Monster, current_mp: Union[int, float]) -> List[Skill]:
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
    available_skills = _get_active_skills(attacker, current_attacker_stats.get("mp", 0))

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
        "performer_id": performer.get("id", "unknown_performer"),
        "target_id": target.get("id", "unknown_target"),
        "skill_name": skill.get("name", "未知技能"),
        "log_message": ""
    }
    
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_BATTLE.get("value_settings", {})) # type: ignore
    crit_multiplier = value_settings.get("crit_multiplier", 1.5)

    # 消耗 MP
    performer["current_mp"] = performer.get("current_mp", performer.get("mp", 0)) - skill.get("mp_cost", 0)
    if performer["current_mp"] < 0: performer["current_mp"] = 0 # 確保不為負值
    action_details["mp_used"] = skill.get("mp_cost", 0)

    # 計算命中和閃避
    attacker_current_stats = _get_monster_current_stats(performer)
    defender_current_stats = _get_monster_current_stats(target)

    base_accuracy = value_settings.get("base_accuracy", 80)
    base_evasion = value_settings.get("base_evasion", 5)
    acc_per_speed = value_settings.get("accuracy_per_speed", 0.1)
    eva_per_speed = value_settings.get("evasion_per_speed", 0.05)

    # 考慮速度差影響命中/閃避
    accuracy_modifier = int((attacker_current_stats.get("speed", 0) - defender_current_stats.get("speed", 0)) * acc_per_speed)
    evasion_modifier = int((defender_current_stats.get("speed", 0) - attacker_current_stats.get("speed", 0)) * eva_per_speed)

    final_accuracy = base_accuracy + attacker_current_stats.get("accuracy", 0) + accuracy_modifier + skill.get("hit_chance", 0)
    final_evasion = base_evasion + defender_current_stats.get("evasion", 0) + evasion_modifier
    
    hit_roll = random.randint(1, 100) # d100 命中擲骰
    
    is_hit = hit_roll <= (final_accuracy - final_evasion)
    
    performer_nickname = performer.get('nickname', '攻擊方')
    target_nickname = target.get('nickname', '防守方')

    if not is_hit:
        action_details["is_miss"] = True
        action_details["is_crit"] = False
        action_details["log_message"] = f"{performer_nickname} 對 {target_nickname} 發動了 {skill.get('name', '招式')}，但 {target_nickname} 靈巧地閃避了！"
        action_details["damage_dealt"] = 0
        return action_details

    is_crit = random.randint(1, 100) <= attacker_current_stats.get("crit", 0)
    action_details["is_crit"] = is_crit
    action_details["is_miss"] = False

    # 傷害計算
    damage = 0
    if skill.get("power", 0) > 0:
        base_damage = skill.get("power", 0)
        
        attacker_attack_stat = attacker_current_stats.get("attack", 0)
        defender_defense_stat = defender_current_stats.get("defense", 0)

        element_multiplier = _calculate_elemental_advantage(skill.get("type", "無"), target.get("elements", ["無"]), game_configs) # type: ignore

        raw_damage = max(1, (base_damage + (attacker_attack_stat / 2) - (defender_defense_stat / 4)))
        damage = int(raw_damage * element_multiplier)

        log_message = f"{performer_nickname} 對 {target_nickname} 發動了 {skill.get('name', '招式')}！"
        
        if is_crit:
            damage = int(damage * crit_multiplier)
            log_message += " 致命一擊！"
        
        if element_multiplier > 1.0:
            log_message += " 效果拔群！"
        elif element_multiplier < 1.0 and element_multiplier > 0:
            log_message += " 效果不太好..."
            
        target["current_hp"] = target.get("current_hp", target.get("hp", 0)) - damage
        action_details["damage_dealt"] = damage
        action_details["log_message"] = log_message + f" 造成 {damage} 點傷害。"
        
        if target.get("current_hp", 0) <= 0:
            action_details["log_message"] += f" {target_nickname} 被擊倒了！"
            target["current_hp"] = 0

    # 處理特殊效果 (簡化版)
    if skill.get("effect"):
        if skill.get("effect") == "heal" and skill.get("amount"):
            heal_amount = skill.get("amount", 0)
            current_max_hp = performer.get("hp", 0) + performer.get("cultivation_gains", {}).get("hp",0)
            performer["current_hp"] = min(current_max_hp, performer.get("current_hp", performer.get("hp", 0)) + heal_amount)
            action_details["damage_healed"] = heal_amount
            action_details["log_message"] += f" {performer_nickname} 恢復了 {heal_amount} 點 HP。"
        elif skill.get("effect") == "status_change" and skill.get("status_id") and skill.get("effect_target"):
            status_template = next((s for s in game_configs.get("health_conditions", []) if s.get("id") == skill.get("status_id")), None)
            if status_template:
                target_monster_for_status = target if skill.get("effect_target") == "opponent" else performer
                if not any(cond.get("id") == status_template.get("id") for cond in target_monster_for_status.get("healthConditions", [])):
                    if "healthConditions" not in target_monster_for_status:
                        target_monster_for_status["healthConditions"] = []
                    new_status = copy.deepcopy(status_template)
                    new_status["duration"] = status_template.get("duration", 1)
                    target_monster_for_status["healthConditions"].append(new_status) # type: ignore
                    action_details["status_applied"] = status_template.get("id")
                    action_details["log_message"] += f" {target_monster_for_status.get('nickname', '目標')} 陷入了 {status_template.get('name')} 狀態。"
    
    return action_details

def _process_health_conditions(monster: Monster) -> Tuple[bool, List[str]]:
    """處理怪獸的健康狀態，包括回合數減少和效果應用。返回是否跳過回合和日誌。"""
    log_messages: List[str] = []
    skip_turn = False
    monster_nickname = monster.get('nickname', '怪獸')
    
    if not monster.get("healthConditions"):
        return skip_turn, log_messages

    new_conditions = []
    for condition in monster["healthConditions"]:
        if "hp_per_turn" in condition.get("effects", {}):
            hp_change = condition["effects"]["hp_per_turn"] # type: ignore
            monster["current_hp"] = monster.get("current_hp", monster.get("hp", 0)) + hp_change
            current_max_hp = monster.get("hp", 0) + monster.get("cultivation_gains",{}).get("hp",0)
            monster["current_hp"] = max(0, min(current_max_hp, monster.get("current_hp", 0)))
            log_messages.append(f"{monster_nickname} 因 {condition.get('name')} 狀態 {'損失' if hp_change < 0 else '恢復'} 了 {abs(hp_change)} 點 HP。")

        if condition.get("chance_to_skip_turn", 0) > 0 and random.random() < condition.get("chance_to_skip_turn", 0):
            skip_turn = True
            log_messages.append(f"{monster_nickname} 因 {condition.get('name')} 狀態無法行動！")
        
        if condition.get("confusion_chance", 0) > 0 and random.random() < condition.get("confusion_chance", 0):
            confusion_damage = int(monster.get("attack", 0) * 0.1)
            monster["current_hp"] = monster.get("current_hp", monster.get("hp", 0)) - confusion_damage
            log_messages.append(f"{monster_nickname} 陷入混亂，攻擊了自己，造成 {confusion_damage} 點傷害！")

        if condition.get("duration") is not None:
            condition["duration"] -= 1 # type: ignore
            if condition.get("duration", 0) <= 0:
                log_messages.append(f"{monster_nickname} 的 {condition.get('name')} 狀態解除了！")
                continue
        new_conditions.append(condition)
    
    monster["healthConditions"] = new_conditions # type: ignore
    return skip_turn, log_messages


# --- 戰鬥服務核心 ---
def simulate_battle_full(
    player_monster_data: Monster,
    opponent_monster_data: Monster,
    game_configs: GameConfigs,
    player_nickname: str,
    opponent_nickname: Optional[str] = None
) -> BattleResult:
    """
    一次性模擬整個怪獸戰鬥，並返回所有回合的詳細日誌和最終結果。
    """
    player_monster = copy.deepcopy(player_monster_data)
    opponent_monster = copy.deepcopy(opponent_monster_data)

    player_battle_stats = {"total_damage_dealt": 0, "crit_hits": 0, "successful_evasions": 0, "highest_single_hit": 0, "skills_used": 0, "total_healing": 0, "damage_tanked": 0, "status_applied": 0}
    opponent_battle_stats = {"total_damage_dealt": 0, "crit_hits": 0, "successful_evasions": 0, "highest_single_hit": 0, "skills_used": 0, "total_healing": 0, "damage_tanked": 0, "status_applied": 0}

    player_monster["current_hp"] = player_monster.get("hp", 0)
    player_monster["current_mp"] = player_monster.get("mp", 0)
    opponent_monster["current_hp"] = opponent_monster.get("hp", 0)
    opponent_monster["current_mp"] = opponent_monster.get("mp", 0)
    
    player_monster.setdefault("healthConditions", [])
    opponent_monster.setdefault("healthConditions", [])

    all_raw_log_messages: List[str] = []
    all_turn_actions: List[BattleAction] = []

    max_turns = game_configs.get("value_settings", {}).get("max_battle_turns", 30)
    first_striker_name = ""

    for turn_num in range(1, max_turns + 2):
        if player_monster.get("current_hp", 0) <= 0 or opponent_monster.get("current_hp", 0) <= 0:
            break

        turn_raw_log_messages: List[str] = [f"--- 回合 {turn_num} 開始 ---"]
        
        player_skip, player_status_logs = _process_health_conditions(player_monster)
        turn_raw_log_messages.extend(player_status_logs)
        opponent_skip, opponent_status_logs = _process_health_conditions(opponent_monster)
        turn_raw_log_messages.extend(opponent_status_logs)

        if player_monster.get("current_hp", 0) <= 0 or opponent_monster.get("current_hp", 0) <= 0:
            pass 
        else:
            player_speed = _get_monster_current_stats(player_monster).get("speed", 0)
            opponent_speed = _get_monster_current_stats(opponent_monster).get("speed", 0)

            acting_order: List[Monster] = []
            if player_speed >= opponent_speed:
                acting_order = [player_monster, opponent_monster]
            else:
                acting_order = [opponent_monster, player_monster]
            
            if turn_num == 1:
                first_striker_name = acting_order[0].get('nickname', '未知先手')

            for i, current_actor in enumerate(acting_order):
                target_actor = opponent_monster if current_actor.get("id") == player_monster.get("id") else player_monster
                
                if current_actor.get("current_hp", 0) <= 0:
                    continue
                
                is_player_actor = current_actor.get("id") == player_monster.get("id")
                if (is_player_actor and player_skip) or (not is_player_actor and opponent_skip):
                    turn_raw_log_messages.append(f"{current_actor.get('nickname', '怪獸')} 本回合無法行動。")
                    continue

                chosen_skill = _choose_action(current_actor, target_actor, game_configs)
                if chosen_skill:
                    action_result = _apply_skill_effect(current_actor, target_actor, chosen_skill, game_configs)
                    turn_raw_log_messages.append(action_result["log_message"])
                    
                    actor_stats = player_battle_stats if is_player_actor else opponent_battle_stats
                    target_stats = opponent_battle_stats if is_player_actor else player_battle_stats
                    
                    actor_stats["skills_used"] += 1
                    if action_result.get("is_miss"):
                        target_stats["successful_evasions"] += 1
                    if action_result.get("damage_dealt", 0) > 0:
                        dmg = action_result.get("damage_dealt", 0)
                        actor_stats["total_damage_dealt"] += dmg
                        actor_stats["highest_single_hit"] = max(actor_stats["highest_single_hit"], dmg)
                        target_stats["damage_tanked"] += dmg
                    if action_result.get("is_crit"):
                        actor_stats["crit_hits"] += 1
                    if action_result.get("damage_healed", 0) > 0:
                        actor_stats["total_healing"] += action_result.get("damage_healed", 0)
                    if action_result.get("status_applied"):
                        actor_stats["status_applied"] += 1

                    all_turn_actions.append(action_result) # type: ignore
                else:
                    turn_raw_log_messages.append(f"{current_actor.get('nickname', '怪獸')} 無法行動，等待機會。")

                if player_monster.get("current_hp", 0) <= 0 or opponent_monster.get("current_hp", 0) <= 0:
                    break

        all_raw_log_messages.extend(turn_raw_log_messages)

    winner_id: Optional[str] = None
    loser_id: Optional[str] = None
    battle_end = True

    if player_monster.get("current_hp", 0) <= 0 and opponent_monster.get("current_hp", 0) <= 0:
        winner_id = "平手"
        loser_id = "平手"
        all_raw_log_messages.append("戰鬥結束！雙方同歸於盡，平手！")
    elif player_monster.get("current_hp", 0) <= 0:
        winner_id = opponent_monster.get("id")
        loser_id = player_monster.get("id")
        all_raw_log_messages.append(f"戰鬥結束！{opponent_monster.get('nickname', '對手')} 獲勝！")
    elif opponent_monster.get("current_hp", 0) <= 0:
        winner_id = player_monster.get("id")
        loser_id = opponent_monster.get("id")
        all_raw_log_messages.append(f"戰鬥結束！{player_monster.get('nickname', '玩家怪獸')} 獲勝！")
    else:
        winner_id = "平手"
        loser_id = "平手"
        all_raw_log_messages.append(f"戰鬥達到最大回合數 ({max_turns})！雙方精疲力盡，平手！")
        
    battle_highlights = []
    def get_highlight_winner(stat_key, p_stats, o_stats):
        if p_stats.get(stat_key, 0) > o_stats.get(stat_key, 0): return player_monster.get('nickname')
        if o_stats.get(stat_key, 0) > p_stats.get(stat_key, 0): return opponent_monster.get('nickname')
        return None
    
    highlight_map = {
        "最大傷害輸出者": "total_damage_dealt", "最高單次傷害者": "highest_single_hit",
        "爆擊最多次者": "crit_hits", "迴避最多次者": "successful_evasions",
        "最佳治療者": "total_healing", "戰術執行者": "skills_used",
        "最強妨礙者": "status_applied", "最強肉盾": "damage_tanked"
    }
    
    for text, key in highlight_map.items():
        if player_battle_stats.get(key, 0) > 0 or opponent_battle_stats.get(key, 0) > 0:
            winner_name = get_highlight_winner(key, player_battle_stats, opponent_battle_stats)
            if winner_name:
                battle_highlights.append(f"{text}：{winner_name}")

    if first_striker_name:
        battle_highlights.append(f"先發制人者：{first_striker_name}")

    player_activity_log: Optional[MonsterActivityLogEntry] = None
    opponent_activity_log: Optional[MonsterActivityLogEntry] = None

    challenger_name = player_nickname
    challenger_monster_name = player_monster.get('nickname', '一個挑戰者')
    
    if opponent_monster.get('isNPC'):
        defender_name = "NPC"
    else:
        defender_name = opponent_nickname if opponent_nickname else '另一位玩家'
    
    defender_monster_name = opponent_monster.get('nickname', '一個對手')

    challenger_display = f"「{challenger_name}」的「{challenger_monster_name}」"
    defender_display = f"「{defender_name}」的「{defender_monster_name}」"

    if winner_id == player_monster.get('id'):
        player_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"挑戰 {defender_display}，您獲勝了！"}
        if not opponent_monster.get('isNPC'):
            opponent_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"{challenger_display} 挑戰您的「{defender_monster_name}」，您不幸戰敗。"}
    elif winner_id == opponent_monster.get('id'):
        player_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"挑戰 {defender_display}，您不幸戰敗。"}
        if not opponent_monster.get('isNPC'):
            opponent_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"{challenger_display} 挑戰您的「{defender_monster_name}」，防禦成功！"}
    else:
        player_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"與 {defender_display} 戰成平手。"}
        if not opponent_monster.get('isNPC'):
            opponent_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"{challenger_display} 挑戰您的「{defender_monster_name}」，雙方戰成平手。"}

    final_battle_result: BattleResult = {
        "log_entries": [], "raw_full_log": all_raw_log_messages, # type: ignore
        "winner_id": winner_id, "loser_id": loser_id, "battle_end": battle_end, # type: ignore
        "player_monster_final_hp": player_monster.get("current_hp", 0), "player_monster_final_mp": player_monster.get("current_mp", 0),
        "player_monster_final_skills": player_monster.get("skills", []), # type: ignore
        "player_monster_final_resume": player_monster.get("resume", {"wins": 0, "losses": 0}), # type: ignore
        "player_activity_log": player_activity_log, "opponent_activity_log": opponent_activity_log,
        "battle_highlights": battle_highlights, # type: ignore
        "ai_battle_report_content": {}
    }
    
    ai_battle_report = generate_battle_report_content(
        player_monster_data, opponent_monster_data, final_battle_result, all_raw_log_messages # type: ignore
    )
    final_battle_result["ai_battle_report_content"] = ai_battle_report

    battle_logger.info(f"完整戰鬥模擬結束。勝利者: {winner_id}, 失敗者: {loser_id}")
    return final_battle_result
