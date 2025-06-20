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

def _extract_battle_highlights(raw_log: List[str], chosen_style: Dict[str, str]) -> List[str]:
    """從原始戰鬥日誌中提取關鍵事件作為亮點。"""
    highlights = []
    
    keyword_to_event_map = {
        "是會心一擊！": "crit",
        "效果絕佳！": "super_effective",
        "閃過了！": "dodge",
        "中毒了！": "poison",
        "陷入了麻痺！": "paralysis",
        "陷入了混亂！": "confusion",
        "睡著了！": "sleep",
        "凍結了！": "freeze",
        "燒傷！": "burn",
        "能力大幅提升": "stat_up",
        "能力大幅下降": "stat_down"
    }

    added_highlights = set()

    for log_line in raw_log:
        for keyword, event_key in keyword_to_event_map.items():
            if keyword in log_line:
                description = chosen_style.get(event_key)
                if description and description not in added_highlights:
                    highlights.append(description)
                    added_highlights.add(description)
                    break 

    if not highlights:
        default_highlight = chosen_style.get("default", "這是一場值得記錄的戰鬥。")
        highlights.append(default_highlight)
        
    return highlights[:5]


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

    base_stats = {
        "attack": monster.get("attack", 0) + gains.get("attack", 0) + title_buffs.get("attack", 0),
        "defense": monster.get("defense", 0) + gains.get("defense", 0) + title_buffs.get("defense", 0),
        "speed": monster.get("speed", 0) + gains.get("speed", 0) + title_buffs.get("speed", 0),
        "crit": monster.get("crit", 0) + gains.get("crit", 0) + title_buffs.get("crit", 0),
        "initial_max_hp": monster.get("initial_max_hp", 0) + gains.get("hp", 0) + title_buffs.get("hp", 0),
        "initial_max_mp": monster.get("initial_max_mp", 0) + gains.get("mp", 0) + title_buffs.get("mp", 0),
    }

    final_attack = (base_stats["attack"] * monster.get("temp_attack_multiplier", 1.0)) + monster.get("temp_attack_modifier", 0)
    final_defense = (base_stats["defense"] * monster.get("temp_defense_multiplier", 1.0)) + monster.get("temp_defense_modifier", 0)
    final_speed = (base_stats["speed"] * monster.get("temp_speed_multiplier", 1.0)) + monster.get("temp_speed_modifier", 0)
    final_crit = base_stats["crit"] + monster.get("temp_crit_modifier", 0)

    stats = {
        "hp": monster.get("current_hp", monster.get("hp", 0)),
        "mp": monster.get("current_mp", monster.get("mp", 0)),
        "attack": final_attack,
        "defense": final_defense,
        "speed": final_speed,
        "crit": min(final_crit, 50),
        "initial_max_hp": base_stats["initial_max_hp"],
        "initial_max_mp": base_stats["initial_max_mp"],
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


def _get_active_skills(monster: Monster, current_mp: int, game_configs: GameConfigs) -> List[Skill]:
    available_skills: List[Skill] = []
    all_skills_db = game_configs.get("skills", {})
    
    for skill_stub in monster.get("skills", []):
        skill_name = skill_stub.get("name")
        if not skill_name:
            continue

        skill_template = None
        for element_skills in all_skills_db.values():
            found = next((s for s in element_skills if s.get("name") == skill_name), None)
            if found:
                skill_template = found
                break
        
        if not skill_template:
            battle_logger.warning(f"怪獸 {monster.get('nickname')} 的技能 '{skill_name}' 在遊戲設定中找不到範本。")
            continue
            
        full_skill_data = copy.deepcopy(skill_template)
        full_skill_data.update(skill_stub)
        
        effective_skill = get_effective_skill_with_level(full_skill_data, full_skill_data.get("level", 1))
        
        mp_cost = effective_skill.get("mp_cost", 0)

        # --- 核心修改處 START ---
        # 新增 is_active 狀態檢查，若該欄位不存在，則預設為 True (開啟)
        is_skill_active = effective_skill.get('is_active', True)
        if current_mp >= mp_cost and is_skill_active:
            available_skills.append(full_skill_data)
        # --- 核心修改處 END ---
            
    return available_skills

def _choose_action(attacker: Monster, defender: Monster, game_configs: GameConfigs, player_data: Optional[PlayerGameData]) -> Skill:
    attacker_current_stats = _get_monster_current_stats(attacker, player_data, game_configs)
    all_mp_available_skills = _get_active_skills(attacker, attacker_current_stats["mp"], game_configs)

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

def _apply_skill_effects(performer: Monster, target: Monster, skill: Skill, effects: List[SkillEffect], game_configs: GameConfigs, action_details: Dict, log_parts: List[str], battle_state: Dict[str, Any]):
    performer_pd = action_details.get('performer_data')
    target_pd = action_details.get('target_data')
    
    for effect in effects:
        effect_target_monster = performer if effect.get("target") == "self" else target
        
        if effect.get("type") == "damage":
            attacker_stats = _get_monster_current_stats(performer, performer_pd, game_configs)
            defender_stats = _get_monster_current_stats(target, target_pd, game_configs)
            
            special_logic_id = next((e.get("special_logic_id") for e in skill.get("effects", []) if "special_logic_id" in e), None)
            
            if special_logic_id == "ignore_defense_buffs":
                defense_stat = max(1, target.get("defense", 1))
                log_parts.append(f" 攻擊無視了 **{target['nickname']}** 的防禦提升！")
            else:
                defense_stat = max(1, defender_stats.get("defense", 1))

            power = effect.get("power", 0)
            attack_stat = attacker_stats.get("attack", 1)
            element_multiplier = _calculate_elemental_advantage(skill["type"], target.get("elements", []), game_configs)

            raw_damage = max(1, (power * (attack_stat / defense_stat) * 0.5) + (attack_stat * 0.1))
            final_damage = int(raw_damage * element_multiplier)

            if action_details.get("is_crit"):
                final_damage = int(final_damage * game_configs.get("value_settings", {}).get("crit_multiplier", 1.5))

            effect_target_monster["current_hp"] = max(0, effect_target_monster.get("current_hp", 0) - final_damage)
            action_details["damage_dealt"] = action_details.get("damage_dealt", 0) + final_damage
            
            advantage_text = ""
            if element_multiplier > 1.0: advantage_text = " 效果絕佳！"
            elif element_multiplier < 1.0: advantage_text = " 效果不太好..."

            log_parts.append(f"對 **{target['nickname']}** 造成了 <damage>{final_damage}</damage> 點傷害。{advantage_text}")

        elif effect.get("type") == "apply_status":
            if random.random() <= effect.get("chance", 1.0):
                all_conditions_templates = game_configs.get("health_conditions", [])
                status_template = next((s for s in all_conditions_templates if s.get("id") == effect.get("status_id")), None)
                if status_template and not any(cond.get("id") == effect.get("status_id") for cond in effect_target_monster.get("healthConditions", [])):
                    duration_str = str(effect.get("duration", status_template.get("duration_turns", "1")))
                    turn_duration = 1
                    if "-" in duration_str:
                        min_t, max_t = map(int, duration_str.split('-'))
                        turn_duration = random.randint(min_t, max_t)
                    else:
                        try: turn_duration = int(duration_str)
                        except (ValueError, TypeError): turn_duration = 99
                    
                    new_status = {"id": status_template["id"], "name": status_template["name"], "duration": turn_duration}
                    effect_target_monster.setdefault("healthConditions", []).append(new_status)
                    action_details["status_applied"] = status_template["name"]
                    if effect.get("log_success"):
                        log_parts.append(f" {effect['log_success'].format(target=effect_target_monster['nickname'])}")
        
        elif effect.get("type") == "stat_change":
            if random.random() <= effect.get("chance", 1.0):
                is_multiplier = effect.get("is_multiplier", False)
                stat_map = {"攻擊":"attack", "防禦":"defense", "速度":"speed", "特攻":"special_attack", "特防":"special_defense", "爆擊":"crit", "命中": "accuracy"}

                stats_to_change_zh = [effect["stat"]] if isinstance(effect["stat"], str) else effect["stat"]
                amounts = [effect["amount"]] if isinstance(effect["amount"], (int, float)) else effect["amount"]
                
                for stat_zh, amount in zip(stats_to_change_zh, amounts):
                    stat_en = stat_map.get(stat_zh, stat_zh.lower())
                    
                    modifier_key_mult = f"temp_{stat_en}_multiplier"
                    modifier_key_add = f"temp_{stat_en}_modifier"

                    if is_multiplier:
                        effect_target_monster[modifier_key_mult] = effect_target_monster.get(modifier_key_mult, 1.0) * (1 + amount)
                    else:
                        effect_target_monster[modifier_key_add] = effect_target_monster.get(modifier_key_add, 0) + amount
                
                if effect.get("log_success"):
                    amount_str = f"{abs(amounts[0]*100):.0f}%" if is_multiplier else str(abs(amounts[0]))
                    formatted_log = effect['log_success'].format(
                        performer=performer['nickname'], 
                        target=target['nickname'],
                        stat=stats_to_change_zh[0],
                        amount=amount_str,
                        duration=effect.get("duration", 0)
                    )
                    log_parts.append(f" {formatted_log}")

        elif effect.get("type") == "special":
            special_id = effect.get("special_logic_id")
            if special_id == "recoil":
                recoil_factor = effect.get("recoil_factor", 0.25)
                damage_dealt = action_details.get("damage_dealt", 0)
                recoil_damage = int(damage_dealt * recoil_factor)
                if recoil_damage > 0:
                    performer["current_hp"] = max(0, performer.get("current_hp", 0) - recoil_damage)
                    log_parts.append(f" **{performer['nickname']}**也因反作用力受到了 <damage>{recoil_damage}</damage> 點傷害！")
            
            elif special_id == "sandstorm":
                duration = effect.get("duration", 5)
                battle_state["weather"] = {"type": "sandstorm", "duration": duration}
                if effect.get("log_success"):
                    log_parts.append(f" {effect['log_success']}")
            
            elif special_id == "ignore_defense_buffs":
                pass
            else:
                log_parts.append(f" 發動了未知的特殊效果「{special_id}」！")

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
            log_messages.append(f"- **{monster['nickname']}** 因**{condition_template['name']}**狀態而無法行動！")

        effects = condition_template.get("effects", {})
        if effects.get("hp_per_turn", 0) != 0:
            hp_change = effects["hp_per_turn"]
            monster["current_hp"] = max(0, monster.get("current_hp", 0) + hp_change)
            log_messages.append(f"- **{monster['nickname']}** 因**{condition_template['name']}**狀態{'損失' if hp_change < 0 else '恢復'}了 <damage>{abs(hp_change)}</damage> 點HP。")
            
        if active_condition.get("duration", 99) > 1:
            active_condition["duration"] -= 1
            new_conditions.append(active_condition)
        else:
            log_messages.append(f"- **{monster['nickname']}** 的**{condition_template['name']}**狀態解除了。")
            
    monster["healthConditions"] = new_conditions
    return skip_turn, log_messages

def _process_end_of_turn_effects(battle_state: Dict[str, Any], player_monster: Monster, opponent_monster: Monster, log_parts: List[str]):
    weather = battle_state.get("weather")
    if not weather:
        return

    weather_type = weather.get("type")
    
    if weather_type == "sandstorm":
        log_parts.append("- 猛烈的沙塵暴持續肆虐！")
        for monster in [player_monster, opponent_monster]:
            # 土、金屬性免疫沙塵暴
            if "土" not in monster.get("elements", []) and "金" not in monster.get("elements", []):
                damage = math.floor(monster.get("initial_max_hp", 100) / 16)
                monster["current_hp"] = max(0, monster.get("current_hp", 0) - damage)
                log_parts.append(f"- **{monster['nickname']}** 被沙塵暴捲入，受到了 <damage>{damage}</damage> 點傷害。")

    # 減少天氣持續時間
    if weather.get("duration", 0) > 0:
        weather["duration"] -= 1
        if weather["duration"] <= 0:
            log_parts.append(f"- {weather_type} 停止了。")
            battle_state["weather"] = None


def simulate_battle_full(
    player_monster_data: Monster,
    opponent_monster_data: Monster,
    game_configs: GameConfigs,
    player_data: Optional[PlayerGameData] = None,
    opponent_player_data: Optional[PlayerGameData] = None
) -> BattleResult:
    player_monster = copy.deepcopy(player_monster_data)
    opponent_monster = copy.deepcopy(opponent_monster_data)
    
    all_styles = game_configs.get("battle_highlights", {}).get("highlight_styles", {})
    if all_styles:
        chosen_style_name = random.choice(list(all_styles.keys()))
        chosen_style_dict = all_styles[chosen_style_name]
        battle_logger.info(f"本次戰鬥亮點風格已選定為: {chosen_style_name}")
    else:
        chosen_style_dict = {"default": "一場激烈的戰鬥發生了。"}
        battle_logger.warning("在遊戲設定中找不到戰鬥亮點風格，將使用預設值。")

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
        m.setdefault("temp_attack_multiplier", 1.0)
        m.setdefault("temp_defense_multiplier", 1.0)
        m.setdefault("temp_speed_multiplier", 1.0)

    battle_state: Dict[str, Any] = {"weather": None}

    all_raw_log_messages: List[str] = []
    gmt8 = timezone(timedelta(hours=8))
    
    for turn_num in range(1, game_configs.get("value_settings", {}).get("max_battle_turns", 30) + 1):
        if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0: break

        turn_log = [f"--- 回合 {turn_num} 開始 ---"]
        
        player_status_text = "良好"
        if player_monster.get("healthConditions"): player_status_text = ", ".join([c.get('name', '未知') for c in player_monster["healthConditions"]])
        opponent_status_text = "良好"
        if opponent_monster.get("healthConditions"): opponent_status_text = ", ".join([c.get('name', '未知') for c in opponent_monster["healthConditions"]])

        turn_log.extend([
            f"PlayerName:{player_monster['nickname']}",
            f"PlayerHP:{player_monster['current_hp']}/{_get_monster_current_stats(player_monster, player_data, game_configs)['initial_max_hp']}",
            f"PlayerMP:{player_monster['current_mp']}/{_get_monster_current_stats(player_monster, player_data, game_configs)['initial_max_mp']}",
            f"PlayerStatus:{player_status_text}",
            f"OpponentName:{opponent_monster['nickname']}",
            f"OpponentHP:{opponent_monster['current_hp']}/{_get_monster_current_stats(opponent_monster, opponent_player_data, game_configs)['initial_max_hp']}",
            f"OpponentMP:{opponent_monster['current_mp']}/{_get_monster_current_stats(opponent_monster, opponent_player_data, game_configs)['initial_max_mp']}",
            f"OpponentStatus:{opponent_status_text}"
        ])
        
        player_skip, p_logs = _process_turn_start_effects(player_monster, game_configs)
        turn_log.extend(p_logs)
        opponent_skip, o_logs = _process_turn_start_effects(opponent_monster, game_configs)
        turn_log.extend(o_logs)

        if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0:
            all_raw_log_messages.extend(turn_log)
            break

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
            log_parts = [f"- **{performer['nickname']}** 使用了 Lv{effective_skill.get('level', 1)} **{effective_skill['name']}**！"]
            action_details = {"performer_data": performer_pd, "target_data": target_pd}

            accuracy = effective_skill.get("accuracy", 95)
            if accuracy != "auto" and random.randint(1, 100) > accuracy:
                log_parts.append(f" 但是攻擊被 **{target['nickname']}** 閃過了！")
            else:
                is_crit = random.randint(1, 100) <= _get_monster_current_stats(performer, performer_pd, game_configs)["crit"]
                action_details["is_crit"] = is_crit
                if is_crit: log_parts.append(" **是會心一擊！**")

                _apply_skill_effects(performer, target, effective_skill, effective_skill.get("effects", []), game_configs, action_details, log_parts, battle_state)

            turn_log.append("".join(log_parts))
        
        _process_end_of_turn_effects(battle_state, player_monster, opponent_monster, turn_log)

        all_raw_log_messages.extend(turn_log)

    winner_id: Optional[str] = None
    loser_id: Optional[str] = None
    if player_monster["current_hp"] <= 0 and opponent_monster["current_hp"] > 0:
        winner_id, loser_id = opponent_monster["id"], player_monster["id"]
    elif opponent_monster["current_hp"] <= 0 and player_monster["current_hp"] > 0:
        winner_id, loser_id = player_monster["id"], opponent_monster["id"]
    else:
        winner_id, loser_id = "平手", "平手"

    all_raw_log_messages.append("--- 戰鬥結束 ---")

    now_gmt8_str = datetime.now(gmt8).strftime("%Y-%m-%d %H:%M:%S")
    player_activity_log = {"time": now_gmt8_str, "message": f"與 {opponent_monster.get('nickname')} 的戰鬥結束。"}
    opponent_activity_log = {"time": now_gmt8_str, "message": f"與 {player_monster.get('nickname')} 的戰鬥結束。"}
    
    battle_highlights = _extract_battle_highlights(all_raw_log_messages, chosen_style_dict)
    ai_report = generate_battle_report_content(player_monster_data, opponent_monster_data, {"winner_id": winner_id}, all_raw_log_messages)

    final_battle_result: BattleResult = {
        "winner_id": winner_id, "loser_id": loser_id, "raw_full_log": all_raw_log_messages,
        "player_monster_final_hp": player_monster["current_hp"], "player_monster_final_mp": player_monster["current_mp"],
        "player_monster_final_skills": player_monster.get("skills", []), "player_monster_final_resume": player_monster.get("resume", {"wins": 0, "losses": 0}),
        "player_activity_log": player_activity_log, "opponent_activity_log": opponent_activity_log,
        "battle_highlights": battle_highlights,
        "log_entries": [],
        "battle_end": True,
        "ai_battle_report_content": ai_report
    }
    
    return final_battle_result
