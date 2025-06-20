# backend/battle_services.py
# 核心戰鬥邏輯服務 (重構版)

import random
import logging
import math
import copy
import time
from typing import List, Dict, Optional, Any, Tuple, Literal, Union
from datetime import datetime, timedelta, timezone

from .MD_models import (
    Monster, Skill, HealthCondition, ElementTypes, RarityDetail, GameConfigs,
    BattleLogEntry, BattleAction, BattleResult, Personality, ValueSettings, SkillCategory, MonsterActivityLogEntry,
    SkillEffect, SkillPhase, PlayerGameData
)
from .MD_ai_services import generate_battle_report_content
from .utils_services import get_effective_skill_with_level


battle_logger = logging.getLogger(__name__)

BASIC_ATTACK: Skill = {
    "name": "普通攻擊",
    "description": "基礎的物理攻擊。",
    "type": "無",
    "rarity": "普通",
    "skill_category": "物理",
    "mp_cost": 0,
    "accuracy": 95,
    "priority": 0,
    "effects": [
        {
            "type": "damage",
            "power": 15,
            "target": "opponent_single"
        }
    ]
}

def _calculate_elemental_advantage(attacker_element: ElementTypes, defender_elements: List[ElementTypes], game_configs: GameConfigs) -> float:
    chart = game_configs.get("elemental_advantage_chart", {})
    total_multiplier = 1.0
    for def_el in defender_elements:
        total_multiplier *= chart.get(attacker_element, {}).get(def_el, 1.0)
    return total_multiplier

def _get_monster_current_stats(monster: Monster, player_data: Optional[PlayerGameData], game_configs: GameConfigs) -> Dict[str, Any]:
    gains = monster.get("cultivation_gains", {})
    title_buffs = {}

    if player_data:
        player_stats = player_data.get("playerStats", {})
        equipped_id = player_stats.get("equipped_title_id")
        if equipped_id:
            equipped_title = next((t for t in player_stats.get("titles", []) if t.get("id") == equipped_id), None)
            if equipped_title and equipped_title.get("buffs"):
                title_buffs = equipped_title.get("buffs", {})

    total_crit = monster.get("crit", 0) + gains.get("crit", 0) + title_buffs.get("crit", 0) + monster.get("temp_crit_modifier", 0)

    stats = {
        "hp": monster.get("current_hp", monster.get("hp", 0)),
        "mp": monster.get("current_mp", monster.get("mp", 0)),
        "attack": monster.get("attack", 0) + gains.get("attack", 0) + title_buffs.get("attack", 0) + monster.get("temp_attack_modifier", 0),
        "defense": monster.get("defense", 0) + gains.get("defense", 0) + title_buffs.get("defense", 0) + monster.get("temp_defense_modifier", 0),
        "speed": monster.get("speed", 0) + gains.get("speed", 0) + title_buffs.get("speed", 0) + monster.get("temp_speed_modifier", 0),
        "crit": min(total_crit, 50),
        "initial_max_hp": monster.get("initial_max_hp", 0) + gains.get("hp", 0) + title_buffs.get("hp", 0),
        "initial_max_mp": monster.get("initial_max_mp", 0) + gains.get("mp", 0) + title_buffs.get("mp", 0),
        "accuracy": monster.get("temp_accuracy_modifier", 0),
        "evasion": monster.get("temp_evasion_modifier", 0)
    }

    if monster.get("healthConditions"):
        all_conditions = game_configs.get("health_conditions", [])
        for condition in monster["healthConditions"]:
            condition_template = next((c for c in all_conditions if c.get("id") == condition.get("id")), None)
            if condition_template:
                effects = condition_template.get("effects", {})
                for stat, value in effects.items():
                    if stat in stats and "per_turn" not in stat:
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
    attacker_current_stats = _get_monster_current_stats(attacker, player_data, game_configs)
    all_mp_available_skills = _get_active_skills(attacker, attacker_current_stats["mp"])

    sensible_skills = []
    for skill in all_mp_available_skills:
        sensible_skills.append(skill)

    if sensible_skills and random.random() <= 0.50:
        personality_prefs = attacker.get("personality", {}).get("skill_preferences", {})
        hp_percentage = attacker_current_stats["hp"] / attacker_current_stats["initial_max_hp"] if attacker_current_stats["initial_max_hp"] > 0 else 0
        is_low_hp = hp_percentage < 0.4

        weighted_skills = []
        for skill in sensible_skills:
            skill_category = skill.get("skill_category", "其他")
            base_weight = personality_prefs.get(skill_category, 1.0)
            
            situational_multiplier = 1.0
            if is_low_hp:
                if skill_category == "輔助":
                    situational_multiplier = 2.5
                elif skill_category == "變化":
                    situational_multiplier = 1.5
            
            final_weight = int(base_weight * situational_multiplier * 10)
            weighted_skills.extend([skill] * final_weight)
        
        if weighted_skills:
            return random.choice(weighted_skills)
        elif sensible_skills:
            return random.choice(sensible_skills)

    return BASIC_ATTACK

def _apply_skill_effects(performer: Monster, target: Monster, skill: Skill, effects: List[SkillEffect], game_configs: GameConfigs, action_details: Dict, log_parts: List[str]):
    """處理單個技能中定義的多個效果"""
    performer_pd = action_details.get('performer_data')
    target_pd = action_details.get('target_data')
    
    for effect in effects:
        effect_target = performer if effect.get("target") == "self" else target
        
        if effect.get("type") == "damage":
            attacker_stats = _get_monster_current_stats(performer, performer_pd, game_configs)
            defender_stats = _get_monster_current_stats(target, target_pd, game_configs)
            
            power = effect.get("power", 0)
            attack_stat = attacker_stats.get("attack", 1)
            # ----- BUG 修正邏輯 START -----
            # 確保防禦力最低為 1，避免除以零的錯誤
            defense_stat = max(1, defender_stats.get("defense", 1))
            # ----- BUG 修正邏輯 END -----
            element_multiplier = _calculate_elemental_advantage(skill["type"], target.get("elements", []), game_configs)

            raw_damage = max(1, (power * (attack_stat / defense_stat) * 0.5) + (attack_stat * 0.1))
            final_damage = int(raw_damage * element_multiplier)

            if action_details.get("is_crit"):
                final_damage = int(final_damage * game_configs.get("value_settings", {}).get("crit_multiplier", 1.5))

            effect_target["current_hp"] = max(0, effect_target.get("current_hp", 0) - final_damage)
            action_details["damage_dealt"] = action_details.get("damage_dealt", 0) + final_damage
            
            advantage_text = ""
            if element_multiplier > 1.0: advantage_text = " 效果絕佳！"
            elif element_multiplier < 1.0: advantage_text = " 效果不太好..."

            log_parts.append(f"對 {target['nickname']} 造成了 <damage>{final_damage}</damage> 點傷害。{advantage_text}")

        elif effect.get("type") == "apply_status":
            if random.random() <= effect.get("chance", 1.0):
                all_conditions_templates = game_configs.get("health_conditions", [])
                status_template = next((s for s in all_conditions_templates if s.get("id") == effect.get("status_id")), None)
                if status_template and not any(cond.get("id") == effect.get("status_id") for cond in effect_target.get("healthConditions", [])):
                    duration_str = status_template.get("duration_turns", "1")
                    turn_duration = 1
                    if "-" in duration_str:
                        min_t, max_t = map(int, duration_str.split('-'))
                        turn_duration = random.randint(min_t, max_t)
                    else:
                        try:
                            turn_duration = int(duration_str)
                        except (ValueError, TypeError):
                            turn_duration = 99
                    
                    new_status = {"id": status_template["id"], "name": status_template["name"], "duration": turn_duration}
                    effect_target.setdefault("healthConditions", []).append(new_status)
                    action_details["status_applied"] = status_template["name"]
                    if effect.get("log_success"):
                        log_parts.append(f" {effect['log_success'].format(target=effect_target['nickname'])}")
        
        elif effect.get("type") == "stat_change":
            if random.random() <= effect.get("chance", 1.0):
                stats_to_change = [effect["stat"]] if isinstance(effect["stat"], str) else effect["stat"]
                amounts = [effect["amount"]] if isinstance(effect["amount"], int) else effect["amount"]
                for stat, amount in zip(stats_to_change, amounts):
                     effect_target[f"temp_{stat}_modifier"] = effect_target.get(f"temp_{stat}_modifier", 0) + amount
                if effect.get("log_success"):
                    log_parts.append(f" {effect['log_success'].format(performer=performer['nickname'], target=target['nickname'])}")
        
        # ----- 新增 START -----
        # 新增對 "special" 類型效果的處理
        elif effect.get("type") == "special":
            special_id = effect.get("special_logic_id")
            if special_id == "recoil":
                recoil_factor = effect.get("recoil_factor", 0.25)
                damage_dealt = action_details.get("damage_dealt", 0)
                recoil_damage = int(damage_dealt * recoil_factor)
                if recoil_damage > 0:
                    performer["current_hp"] = max(0, performer.get("current_hp", 0) - recoil_damage)
                    log_parts.append(f" {performer['nickname']}也因反作用力受到了 <damage>{recoil_damage}</damage> 點傷害！")
            # 可以在此處用 elif 新增更多 special_id 的處理邏輯
            else:
                log_parts.append(f" 發動了未知的特殊效果「{special_id}」！")
        # ----- 新增 END -----


def _process_turn_start_effects(monster: Monster, game_configs: GameConfigs) -> Tuple[bool, List[str]]:
    log_messages: List[str] = []
    skip_turn = False
    if not monster.get("healthConditions"):
        return skip_turn, log_messages

    all_conditions_templates = game_configs.get("health_conditions", [])
    new_conditions = []
    for active_condition in monster.get("healthConditions", []):
        condition_template = next((c for c in all_conditions_templates if c.get("id") == active_condition.get("id")), None)
        if not condition_template: continue

        if condition_template.get("chance_to_skip_turn", 0) > 0 and random.random() < condition_template["chance_to_skip_turn"]:
            skip_turn = True
            log_messages.append(f"- {monster['nickname']} 因**{condition_template['name']}**狀態而無法行動！")

        effects = condition_template.get("effects", {})
        if effects.get("hp_per_turn", 0) != 0:
            hp_change = effects["hp_per_turn"]
            monster["current_hp"] = max(0, monster.get("current_hp", 0) + hp_change)
            log_messages.append(f"- {monster['nickname']} 因**{condition_template['name']}**狀態{'損失' if hp_change < 0 else '恢復'}了 <damage>{abs(hp_change)}</damage> 點HP。")
            
        if active_condition.get("duration", 99) > 1:
            active_condition["duration"] -= 1
            new_conditions.append(active_condition)
        else:
            log_messages.append(f"- {monster['nickname']} 的**{condition_template['name']}**狀態解除了。")
            
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
    
    for m in [player_monster, opponent_monster]:
        current_stats = _get_monster_current_stats(m, player_data if m['id'] == player_monster['id'] else opponent_player_data, game_configs)
        m["current_hp"] = current_stats["hp"]
        m["current_mp"] = current_stats["mp"]
        m.setdefault("healthConditions", [])
        m.setdefault("temp_attack_modifier", 0)
        m.setdefault("temp_defense_modifier", 0)
        m.setdefault("temp_speed_modifier", 0)
        m.setdefault("temp_crit_modifier", 0)
        m.setdefault("temp_accuracy_modifier", 0)
        m.setdefault("temp_evasion_modifier", 0)

    all_raw_log_messages: List[str] = []
    gmt8 = timezone(timedelta(hours=8))
    
    for turn_num in range(1, game_configs.get("value_settings", {}).get("max_battle_turns", 30) + 1):
        if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0: break

        turn_log = [f"--- 回合 {turn_num} 開始 ---"]
        
        player_conditions_json = json.dumps(player_monster.get("healthConditions", []), ensure_ascii=False)
        opponent_conditions_json = json.dumps(opponent_monster.get("healthConditions", []), ensure_ascii=False)
        turn_log.append(f"PlayerConditions:{player_conditions_json}")
        turn_log.append(f"OpponentConditions:{opponent_conditions_json}")

        turn_log.append(f"PlayerHP:{player_monster['current_hp']}/{_get_monster_current_stats(player_monster, player_data, game_configs)['initial_max_hp']}")
        turn_log.append(f"PlayerMP:{player_monster['current_mp']}/{_get_monster_current_stats(player_monster, player_data, game_configs)['initial_max_mp']}")
        turn_log.append(f"OpponentHP:{opponent_monster['current_hp']}/{_get_monster_current_stats(opponent_monster, opponent_player_data, game_configs)['initial_max_hp']}")
        turn_log.append(f"OpponentMP:{opponent_monster['current_mp']}/{_get_monster_current_stats(opponent_monster, opponent_player_data, game_configs)['initial_max_mp']}")
        
        player_skip, p_logs = _process_turn_start_effects(player_monster, game_configs)
        turn_log.extend(p_logs)
        opponent_skip, o_logs = _process_turn_start_effects(opponent_monster, game_configs)
        turn_log.extend(o_logs)

        if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0:
            all_raw_log_messages.extend(turn_log)
            break

        p_speed = _get_monster_current_stats(player_monster, player_data, game_configs)["speed"]
        o_speed = _get_monster_current_stats(opponent_monster, opponent_player_data, game_configs)["speed"]
        acting_order = sorted(
            [(player_monster, opponent_monster, player_skip, player_data, opponent_player_data), 
             (opponent_monster, player_monster, opponent_skip, opponent_player_data, player_data)], 
            key=lambda x: _get_monster_current_stats(x[0], x[3], game_configs)["speed"], 
            reverse=True
        )

        for performer, target, is_skipped, performer_pd, target_pd in acting_order:
            if performer["current_hp"] <= 0 or target["current_hp"] <= 0: continue
            if is_skipped: continue

            chosen_skill_template = _choose_action(performer, target, game_configs, performer_pd)
            effective_skill = get_effective_skill_with_level(chosen_skill_template, chosen_skill_template.get("level", 1))

            performer["current_mp"] -= effective_skill.get("mp_cost", 0)
            log_parts = [f"- {performer['nickname']} 使用了 **{effective_skill['name']}**！"]
            action_details = {"performer_data": performer_pd, "target_data": target_pd}

            accuracy = effective_skill.get("accuracy", 95)
            if accuracy != "auto" and random.randint(1, 100) > accuracy:
                log_parts.append(f" 但是攻擊被 {target['nickname']} 閃過了！")
            else:
                is_crit = random.randint(1, 100) <= _get_monster_current_stats(performer, performer_pd, game_configs)["crit"]
                action_details["is_crit"] = is_crit
                if is_crit: log_parts.append(" **是會心一擊！**")

                _apply_skill_effects(performer, target, effective_skill, effective_skill.get("effects", []), game_configs, action_details, log_parts)

            turn_log.append("".join(log_parts))

        all_raw_log_messages.extend(turn_log)

    winner_id: Optional[str] = None
    loser_id: Optional[str] = None
    if player_monster["current_hp"] <= 0 and opponent_monster["current_hp"] > 0:
        winner_id, loser_id = opponent_monster["id"], player_monster["id"]
    elif opponent_monster["current_hp"] <= 0 and player_monster["current_hp"] > 0:
        winner_id, loser_id = player_monster["id"], opponent_monster["id"]
    else: # Draw or both fainted
        winner_id, loser_id = "平手", "平手"

    all_raw_log_messages.append("--- 戰鬥結束 ---")

    now_gmt8_str = datetime.now(gmt8).strftime("%Y-%m-%d %H:%M:%S")
    player_activity_log = {"time": now_gmt8_str, "message": f"與 {opponent_monster.get('nickname')} 的戰鬥結束。"}
    opponent_activity_log = {"time": now_gmt8_str, "message": f"與 {player_monster.get('nickname')} 的戰鬥結束。"}
    
    final_battle_result: BattleResult = {
        "winner_id": winner_id, "loser_id": loser_id, "raw_full_log": all_raw_log_messages,
        "player_monster_final_hp": player_monster["current_hp"], "player_monster_final_mp": player_monster["current_mp"],
        "player_monster_final_skills": player_monster.get("skills", []), "player_monster_final_resume": player_monster.get("resume", {"wins": 0, "losses": 0}),
        "player_activity_log": player_activity_log, "opponent_activity_log": opponent_activity_log,
        "battle_highlights": [], "log_entries": [], "battle_end": True,
        "ai_battle_report_content": {}
    }
    
    return final_battle_result
