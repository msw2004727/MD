# backend/battle_services.py
# 核心戰鬥邏輯服務

import random
import logging
import math
import copy
import time
from typing import List, Dict, Optional, Any, Tuple, Literal, Union
# --- 核心修改處 START ---
from datetime import datetime, timedelta, timezone
# --- 核心修改處 END ---

from .MD_models import (
    Monster, Skill, HealthCondition, ElementTypes, RarityDetail, GameConfigs,
    BattleLogEntry, BattleAction, BattleResult, Personality, ValueSettings, SkillCategory, MonsterActivityLogEntry,
    PlayerGameData
)
from .MD_ai_services import generate_battle_report_content
from .utils_services import get_effective_skill_with_level # 新增：導入新的共用函式


battle_logger = logging.getLogger(__name__)

BASIC_ATTACK: Skill = {
    "name": "普通攻擊",
    "power": 15,
    "crit": 5,
    "probability": 100,
    "type": "無",
    "mp_cost": 0,
    "skill_category": "物理",
    "baseLevel": 1
}

DEFAULT_GAME_CONFIGS_FOR_BATTLE: GameConfigs = {
    "dna_fragments": [],
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}},
    "skills": {"無": [{"name":"撞擊", "power":10, "crit":5, "probability":100, "type":"無", "baseLevel":1, "mp_cost":0, "skill_category":"物理"}]},
    "personalities": [],
    "titles": [],
    "monster_achievements_list": [],
    "element_nicknames": {},
    "naming_constraints": {},
    "health_conditions": [
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
        "base_accuracy": 80,
        "base_evasion": 5,
        "accuracy_per_speed": 0.1,
        "evasion_per_speed": 0.05,
        "crit_multiplier": 1.5
    },
    "absorption_config": {},
    "cultivation_config": {},
    "elemental_advantage_chart": {},
}

def _roll_dice(sides: int, num_dice: int = 1) -> int:
    return sum(random.randint(1, sides) for _ in range(num_dice))

def _calculate_elemental_advantage(attacker_element: ElementTypes, defender_elements: List[ElementTypes], game_configs: GameConfigs) -> float:
    chart = game_configs.get("elemental_advantage_chart", {})
    total_multiplier = 1.0
    for def_el in defender_elements:
        total_multiplier *= chart.get(attacker_element, {}).get(def_el, 1.0)
    return total_multiplier

def _get_monster_current_stats(monster: Monster, player_data: Optional[PlayerGameData]) -> Dict[str, Any]:
    gains = monster.get("cultivation_gains", {})
    title_buffs = {}

    if player_data:
        player_stats = player_data.get("playerStats", {})
        equipped_id = player_stats.get("equipped_title_id")
        if equipped_id:
            equipped_title = next((t for t in player_stats.get("titles", []) if t.get("id") == equipped_id), None)
            if equipped_title and equipped_title.get("buffs"):
                title_buffs = equipped_title.get("buffs", {})

    stats = {
        "hp": monster.get("current_hp", monster.get("hp", 0)),
        "mp": monster.get("current_mp", monster.get("mp", 0)),
        "attack": monster.get("attack", 0) + gains.get("attack", 0) + title_buffs.get("attack", 0) + monster.get("temp_attack_modifier", 0),
        "defense": monster.get("defense", 0) + gains.get("defense", 0) + title_buffs.get("defense", 0) + monster.get("temp_defense_modifier", 0),
        "speed": monster.get("speed", 0) + gains.get("speed", 0) + title_buffs.get("speed", 0) + monster.get("temp_speed_modifier", 0),
        "crit": monster.get("crit", 0) + gains.get("crit", 0) + title_buffs.get("crit", 0) + monster.get("temp_crit_modifier", 0),
        "initial_max_hp": monster.get("initial_max_hp", 0) + gains.get("hp", 0) + title_buffs.get("hp", 0),
        "initial_max_mp": monster.get("initial_max_mp", 0) + gains.get("mp", 0) + title_buffs.get("mp", 0),
        "accuracy": monster.get("temp_accuracy_modifier", 0),
        "evasion": monster.get("temp_evasion_modifier", 0)
    }

    if monster.get("healthConditions"):
        for condition in monster["healthConditions"]:
            effects = condition.get("effects", {})
            for stat, value in effects.items():
                if stat in stats:
                    stats[stat] += value
    return stats

def _get_active_skills(monster: Monster, current_mp: int) -> List[Skill]:
    active_skills = []
    for skill in monster.get("skills", []):
        effective_skill = get_effective_skill_with_level(skill, skill.get("level", 1))
        mp_cost = effective_skill.get("mp_cost", 0)
        if current_mp >= mp_cost:
            active_skills.append(skill)
    return active_skills

def _choose_action(attacker: Monster, defender: Monster, game_configs: GameConfigs, player_data: Optional[PlayerGameData]) -> Skill:
    attacker_current_stats = _get_monster_current_stats(attacker, player_data)
    all_mp_available_skills = _get_active_skills(attacker, attacker_current_stats["mp"])

    sensible_skills = []
    for skill in all_mp_available_skills:
        skill_category = skill.get("skill_category")
        skill_effect = skill.get("effect")

        if skill_category == "輔助" and skill_effect in ["heal", "heal_large", "rest"]:
            if attacker_current_stats["hp"] >= attacker_current_stats["initial_max_hp"]:
                continue

        if skill_category == "輔助" and skill_effect == "stat_change":
            amounts = skill.get("amount", [0])
            if isinstance(amounts, int): amounts = [amounts]
            is_a_buff = any(a > 0 for a in amounts)
            
            if is_a_buff:
                stats_to_buff = skill.get("stat", [])
                if isinstance(stats_to_buff, str): stats_to_buff = [stats_to_buff]
                
                already_buffed = False
                for stat in stats_to_buff:
                    if attacker.get(f"temp_{stat}_modifier", 0) > 0:
                        already_buffed = True
                        break
                if already_buffed:
                    continue

        sensible_skills.append(skill)

    if sensible_skills and random.random() <= 0.85:
        personality_prefs = attacker.get("personality", {}).get("skill_preferences", {})
        
        # --- 核心修改處 START ---
        # 檢查是否處於低血量狀態
        hp_percentage = attacker_current_stats["hp"] / attacker_current_stats["initial_max_hp"] if attacker_current_stats["initial_max_hp"] > 0 else 0
        is_low_hp = hp_percentage < 0.4  # 低血量閾值設為40%

        weighted_skills = []
        for skill in sensible_skills:
            skill_category = skill.get("skill_category", "其他")
            base_weight = personality_prefs.get(skill_category, 1.0)
            
            # 生存本能：如果血量低，動態調整權重
            situational_multiplier = 1.0
            if is_low_hp:
                if skill_category == "輔助":  # 治療或防禦性Buff
                    situational_multiplier = 3.0  # 大幅提高使用意願
                elif skill_category == "變化" and skill.get("effect") == "stat_change" and any(a > 0 for a in ([skill.get("amount")] if isinstance(skill.get("amount"), int) else skill.get("amount", []))): # 防禦性變化技能
                    situational_multiplier = 2.0  # 提高使用意願
                elif skill_category in ["物理", "近戰", "遠程", "魔法", "特殊"]: # 攻擊性技能
                    situational_multiplier = 0.5  # 降低攻擊意願
            
            final_weight = int(base_weight * situational_multiplier * 10)
            weighted_skills.extend([skill] * final_weight)
        # --- 核心修改處 END ---
        
        if weighted_skills:
            return random.choice(weighted_skills)
        else:
            return random.choice(sensible_skills)

    return BASIC_ATTACK

def _apply_skill_effect(performer: Monster, target: Monster, skill: Skill, game_configs: GameConfigs, performer_player_data: Optional[PlayerGameData], target_player_data: Optional[PlayerGameData]) -> Dict[str, Any]:
    stat_translation = {
        "hp": "HP", "mp": "MP", "attack": "攻擊", "defense": "防禦",
        "speed": "速度", "crit": "爆擊", "accuracy": "命中", "evasion": "閃避"
    }

    effective_skill = get_effective_skill_with_level(skill, skill.get("level", 1))
    action_details: Dict[str, Any] = {"performer_id": performer["id"], "target_id": target["id"], "skill_name": effective_skill["name"]}
    
    mp_cost = effective_skill.get("mp_cost", 0)
    performer["current_mp"] = max(0, performer.get("current_mp", 0) - mp_cost)
    action_details["mp_used"] = mp_cost

    attacker_current_stats = _get_monster_current_stats(performer, performer_player_data)
    defender_current_stats = _get_monster_current_stats(target, target_player_data)
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_BATTLE["value_settings"])
    
    hit_roll = random.randint(1, 100)
    final_accuracy = value_settings.get("base_accuracy", 80) + attacker_current_stats.get("accuracy", 0) - defender_current_stats.get("evasion", 0)
    
    if hit_roll > final_accuracy:
        action_details.update({"is_miss": True, "damage_dealt": 0, "log_message": f"- {performer['nickname']} 的 **{effective_skill['name']}** 被 {target['nickname']} 閃過了！"})
        return action_details
    
    action_details["is_miss"] = False
    is_crit = random.randint(1, 100) <= (attacker_current_stats["crit"] + effective_skill.get("crit", 0))
    action_details["is_crit"] = is_crit
    
    log_parts = [f"- {performer['nickname']} 使用了 **{effective_skill['name']}**！"]

    if effective_skill.get("power", 0) > 0:
        element_multiplier = _calculate_elemental_advantage(effective_skill["type"], target.get("elements", []), game_configs)
        raw_damage = max(1, (effective_skill["power"] + (attacker_current_stats["attack"] / 2) - (defender_current_stats["defense"] / 4)))
        damage = int(raw_damage * element_multiplier * (value_settings.get("crit_multiplier", 1.5) if is_crit else 1))
        
        target["current_hp"] = max(0, target.get("current_hp", 0) - damage)
        action_details["damage_dealt"] = damage
        log_parts.append(f" 對 {target['nickname']} 造成了 <damage>{damage}</damage> 點傷害。")
        if is_crit: log_parts.append(" **是暴擊！**")

    if effective_skill.get("effect") and random.randint(1, 100) <= effective_skill.get("probability", 100):
        effect_type = effective_skill["effect"]
        is_buff = "buff" in effect_type or "heal" in effect_type or (effective_skill.get("skill_category") == "輔助") or (effect_type == "stat_change" and isinstance(effective_skill.get("amount"), int) and effective_skill.get("amount", 0) > 0)
        effect_target = performer if is_buff else target
        
        # --- 核心修改處 START ---
        if effect_type == "stat_change" and "stat" in effective_skill and "amount" in effective_skill:
            stats_to_change = [effective_skill["stat"]] if isinstance(effective_skill["stat"], str) else effective_skill["stat"]
            amounts = [effective_skill["amount"]] if isinstance(effective_skill["amount"], int) else effective_skill["amount"]
            
            for stat, amount in zip(stats_to_change, amounts):
                effect_target[f"temp_{stat}_modifier"] = effect_target.get(f"temp_{stat}_modifier", 0) + amount
                
                translated_stat = stat_translation.get(stat, stat.upper())
                change_text = '提升' if amount > 0 else '下降'
                abs_amount = abs(amount)
                
                log_parts.append(f" {effect_target['nickname']}的**{translated_stat}**{change_text}了{abs_amount}點。")
        # --- 核心修改處 END ---

        elif effect_type in ["heal", "heal_large"] and "amount" in effective_skill:
            heal_amount = effective_skill["amount"]
            max_hp = _get_monster_current_stats(effect_target, performer_player_data if is_buff else target_player_data)["initial_max_hp"]
            healed_hp = min(heal_amount, max_hp - effect_target.get("current_hp", 0))
            if healed_hp > 0:
                effect_target["current_hp"] += healed_hp
                action_details["damage_healed"] = healed_hp
                log_parts.append(f" {effect_target['nickname']} 恢復了 <heal>{healed_hp}</heal> 點HP！")

        elif effect_type == "leech" and "amount" in effective_skill and action_details.get("damage_dealt", 0) > 0:
            leech_amount = int(action_details["damage_dealt"] * (effective_skill["amount"] / 100))
            max_hp = _get_monster_current_stats(performer, performer_player_data)["initial_max_hp"]
            healed_hp = min(leech_amount, max_hp - performer.get("current_hp", 0))
            if healed_hp > 0:
                performer["current_hp"] += healed_hp
                action_details["damage_healed"] = healed_hp
                log_parts.append(f" {performer['nickname']} 吸取了 <heal>{healed_hp}</heal> 點生命！")

        elif effect_type == "status_change" and "status_id" in effective_skill:
            status_template = next((s for s in game_configs.get("health_conditions", []) if s["id"] == effective_skill["status_id"]), None)
            if status_template and not any(cond.get("id") == status_template["id"] for cond in effect_target.get("healthConditions", [])):
                new_status = {**status_template, "duration": effective_skill.get("duration", status_template.get("duration", 1))}
                effect_target.setdefault("healthConditions", []).append(new_status)
                action_details["status_applied"] = status_template["id"]
                log_parts.append(f" {effect_target['nickname']} 陷入了**{status_template['name']}**狀態！")
        
    action_details["log_message"] = "".join(log_parts)
    
    if target["current_hp"] == 0: 
        action_details["log_message"] += f" {target['nickname']} 被擊倒了！"
        
    return action_details

def _process_health_conditions(monster: Monster, current_stats: Dict[str, Any]) -> Tuple[bool, List[str]]:
    log_messages: List[str] = []
    skip_turn = False
    
    if not monster.get("healthConditions"):
        return skip_turn, log_messages

    new_conditions = []
    for condition in monster["healthConditions"]:
        effects = condition.get("effects", {})
        if "hp_per_turn" in effects:
            hp_change = effects["hp_per_turn"]
            monster["current_hp"] = max(0, min(current_stats["initial_max_hp"], monster.get("current_hp", 0) + hp_change))
            log_messages.append(f"- {monster['nickname']} 因**{condition['name']}**狀態{'損失' if hp_change < 0 else '恢復'}了 <damage>{abs(hp_change)}</damage> 點HP。")

        if condition.get("chance_to_skip_turn", 0) > 0 and random.random() < condition["chance_to_skip_turn"]:
            skip_turn = True
            log_messages.append(f"- {monster['nickname']} 因**{condition['name']}**狀態而無法行動！")
        
        if condition.get("duration") is not None:
            condition["duration"] -= 1
            if condition["duration"] > 0:
                new_conditions.append(condition)
            else:
                log_messages.append(f"- {monster['nickname']} 的**{condition['name']}**狀態解除了。")
        else:
            new_conditions.append(condition)
    
    monster["healthConditions"] = new_conditions
    return skip_turn, log_messages


def simulate_battle_full(
    player_monster_data: Monster,
    opponent_monster_data: Monster,
    game_configs: GameConfigs,
    player_data: Optional[PlayerGameData] = None,
    opponent_player_data: Optional[PlayerGameData] = None
) -> BattleResult:
    player_monster = copy.deepcopy(player_monster_data)
    opponent_monster = copy.deepcopy(opponent_monster_data)

    player_battle_stats = {"total_damage_dealt": 0, "crit_hits": 0, "successful_evasions": 0, "highest_single_hit": 0, "skills_used": 0, "total_healing": 0, "damage_tanked": 0, "status_applied": 0}
    opponent_battle_stats = {"total_damage_dealt": 0, "crit_hits": 0, "successful_evasions": 0, "highest_single_hit": 0, "skills_used": 0, "total_healing": 0, "damage_tanked": 0, "status_applied": 0}
    
    player_initial_stats = _get_monster_current_stats(player_monster, player_data)
    opponent_initial_stats = _get_monster_current_stats(opponent_monster, opponent_player_data)
    player_monster["current_hp"] = player_initial_stats["initial_max_hp"]
    player_monster["current_mp"] = player_initial_stats["initial_max_mp"]
    opponent_monster["current_hp"] = opponent_initial_stats["initial_max_hp"]
    opponent_monster["current_mp"] = opponent_initial_stats["initial_max_mp"]
    
    player_monster.setdefault("healthConditions", [])
    opponent_monster.setdefault("healthConditions", [])
    
    all_raw_log_messages: List[str] = []
    all_turn_actions: List[BattleAction] = []
    max_turns = game_configs.get("value_settings", {}).get("max_battle_turns", 30)
    first_striker_name = ""

    # --- 核心修改處 START ---
    # 建立 GMT+8 的時區物件
    gmt8 = timezone(timedelta(hours=8))
    # --- 核心修改處 END ---

    for turn_num in range(1, max_turns + 2):
        if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0:
            break

        turn_raw_log_messages: List[str] = [f"--- 回合 {turn_num} 開始 ---"]
        
        player_stats_at_turn_start = _get_monster_current_stats(player_monster, player_data)
        opponent_stats_at_turn_start = _get_monster_current_stats(opponent_monster, opponent_player_data)

        turn_raw_log_messages.append(f"PlayerName: {player_monster['nickname']}")
        turn_raw_log_messages.append(f"PlayerHP: {player_monster['current_hp']}/{player_stats_at_turn_start['initial_max_hp']}")
        turn_raw_log_messages.append(f"PlayerMP: {player_monster['current_mp']}/{player_stats_at_turn_start['initial_max_mp']}")
        turn_raw_log_messages.append(f"OpponentName: {opponent_monster['nickname']}")
        turn_raw_log_messages.append(f"OpponentHP: {opponent_monster['current_hp']}/{opponent_stats_at_turn_start['initial_max_hp']}")
        turn_raw_log_messages.append(f"OpponentMP: {opponent_monster['current_mp']}/{opponent_stats_at_turn_start['initial_max_mp']}")
        
        player_skip, player_status_logs = _process_health_conditions(player_monster, player_stats_at_turn_start)
        turn_raw_log_messages.extend(player_status_logs)
        opponent_skip, opponent_status_logs = _process_health_conditions(opponent_monster, opponent_stats_at_turn_start)
        turn_raw_log_messages.extend(opponent_status_logs)

        if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0:
            all_raw_log_messages.extend(turn_raw_log_messages)
            break
            
        acting_order: List[Tuple[Monster, Optional[PlayerGameData], bool]] = sorted(
            [(player_monster, player_data, player_skip), (opponent_monster, opponent_player_data, opponent_skip)], 
            key=lambda x: _get_monster_current_stats(x[0], x[1])["speed"], 
            reverse=True
        )
        
        if turn_num == 1 and acting_order:
            first_striker_name = acting_order[0][0]['nickname']

        for i, (current_actor, actor_player_data, is_skipped) in enumerate(acting_order):
            if current_actor["current_hp"] <= 0: continue
            
            if is_skipped: continue

            target_actor = opponent_monster if current_actor["id"] == player_monster["id"] else player_monster
            target_player_data = opponent_player_data if current_actor["id"] == player_monster["id"] else player_data
            
            chosen_skill = _choose_action(current_actor, target_actor, game_configs, actor_player_data)
            
            action_result = _apply_skill_effect(current_actor, target_actor, chosen_skill, game_configs, actor_player_data, target_player_data)
            turn_raw_log_messages.append(action_result["log_message"])
            
            is_player_turn = current_actor["id"] == player_monster["id"]
            actor_stats = player_battle_stats if is_player_turn else opponent_battle_stats
            target_stats = opponent_battle_stats if is_player_turn else player_battle_stats
            
            actor_stats["skills_used"] += 1
            if action_result.get("is_miss"): target_stats["successful_evasions"] += 1
            if action_result.get("damage_dealt", 0) > 0:
                dmg = action_result["damage_dealt"]
                actor_stats["total_damage_dealt"] += dmg
                actor_stats["highest_single_hit"] = max(actor_stats["highest_single_hit"], dmg)
                target_stats["damage_tanked"] += dmg
            if action_result.get("is_crit"): actor_stats["crit_hits"] += 1
            if action_result.get("damage_healed", 0) > 0: actor_stats["total_healing"] += action_result["damage_healed"]
            if action_result.get("status_applied"): actor_stats["status_applied"] += 1

            all_turn_actions.append(BattleAction(**{k: v for k, v in action_result.items() if k in BattleAction.__annotations__}))

            if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0: break

        all_raw_log_messages.extend(turn_raw_log_messages)

    winner_id: Optional[str] = None; loser_id: Optional[str] = None
    if player_monster["current_hp"] <= 0 and opponent_monster["current_hp"] <= 0:
        winner_id, loser_id = "平手", "平手"
        all_raw_log_messages.append("--- 戰鬥結束 ---\n雙方同時倒下，戰鬥以平手收場。")
    elif player_monster["current_hp"] <= 0:
        winner_id, loser_id = opponent_monster["id"], player_monster["id"]
        all_raw_log_messages.append(f"--- 戰鬥結束 ---\n{opponent_monster['nickname']} 獲勝！")
    elif opponent_monster["current_hp"] <= 0:
        winner_id, loser_id = player_monster["id"], opponent_monster["id"]
        all_raw_log_messages.append(f"--- 戰鬥結束 ---\n{player_monster['nickname']} 獲勝！")
    else:
        winner_id, loser_id = "平手", "平手"
        all_raw_log_messages.append(f"--- 戰鬥結束 ---\n戰鬥達到最大回合數 ({max_turns})！雙方精疲力盡，平手！")
        
    battle_highlights = []
    highlight_map = { "最大傷害輸出者": "total_damage_dealt", "最高單次傷害者": "highest_single_hit", "爆擊最多次者": "crit_hits", "迴避最多次者": "successful_evasions", "最佳治療者": "total_healing", "戰術執行者": "skills_used", "最強妨礙者": "status_applied", "最強肉盾": "damage_tanked" }
    
    for text, key in highlight_map.items():
        p_val, o_val = player_battle_stats.get(key, 0), opponent_battle_stats.get(key, 0)
        if p_val > o_val: battle_highlights.append(f"{text}：{player_monster['nickname']} ({p_val})")
        elif o_val > p_val: battle_highlights.append(f"{text}：{opponent_monster['nickname']} ({o_val})")
        elif p_val > 0: battle_highlights.append(f"{text}：雙方勢均力敵 ({p_val})")

    if first_striker_name: battle_highlights.append(f"先發制人者：{first_striker_name}")
    if winner_id != "平手": battle_highlights.append(f"最終致勝者：{player_monster['nickname'] if winner_id == player_monster['id'] else opponent_monster['nickname']}")

    challenger_name = player_data.get("nickname", "玩家") if player_data else "玩家"
    challenger_monster_name = player_monster.get('nickname', '一個挑戰者')
    
    if opponent_monster.get('isNPC'): defender_name = "NPC"
    else: defender_name = opponent_player_data.get("nickname", "另一位玩家") if opponent_player_data else "另一位玩家"
    defender_monster_name = opponent_monster.get('nickname', '一個對手')

    challenger_display = f"「{challenger_name}」的「{challenger_monster_name}」"
    defender_display = f"「{defender_name}」的「{defender_monster_name}」"

    # --- 核心修改處 START ---
    # 使用 gmt8 時區物件來產生當前時間字串
    now_gmt8_str = datetime.now(gmt8).strftime("%Y-%m-%d %H:%M:%S")

    if winner_id == player_monster['id']: player_activity_log = {"time": now_gmt8_str, "message": f"挑戰 {defender_display}，您獲勝了！"}
    elif winner_id == opponent_monster['id']: player_activity_log = {"time": now_gmt8_str, "message": f"挑戰 {defender_display}，您不幸戰敗。"}
    else: player_activity_log = {"time": now_gmt8_str, "message": f"與 {defender_display} 戰成平手。"}

    if winner_id == opponent_monster['id']:
        opponent_activity_log = {"time": now_gmt8_str, "message": f"{challenger_display} 向您發起挑戰，防禦成功！"}
    elif winner_id == player_monster['id']:
        opponent_activity_log = {"time": now_gmt8_str, "message": f"{challenger_display} 向您發起挑戰，防禦失敗！"}
    else:
        opponent_activity_log = {"time": now_gmt8_str, "message": f"與 {challenger_display} 戰成平手。"}
    # --- 核心修改處 END ---


    final_battle_result: BattleResult = {
        "log_entries": [], "raw_full_log": all_raw_log_messages,
        "winner_id": winner_id, "loser_id": loser_id, "battle_end": True,
        "player_monster_final_hp": player_monster["current_hp"], "player_monster_final_mp": player_monster["current_mp"],
        "player_monster_final_skills": player_monster.get("skills", []),
        "player_monster_final_resume": player_monster.get("resume", {"wins": 0, "losses": 0}),
        "player_activity_log": player_activity_log, "opponent_activity_log": opponent_activity_log,
        "battle_highlights": battle_highlights
    }
    
    ai_battle_report = generate_battle_report_content(player_monster, opponent_monster, final_battle_result, all_raw_log_messages)
    final_battle_result["ai_battle_report_content"] = ai_battle_report

    battle_logger.info(f"完整戰鬥模擬結束。勝利者: {winner_id}, 失敗者: {loser_id}")
    return final_battle_result
