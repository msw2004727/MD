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
    BattleLogEntry, BattleAction, BattleResult, Personality, ValueSettings, SkillCategory, MonsterActivityLogEntry,
    PlayerGameData # 【新增】導入 PlayerGameData
)
# 從 MD_ai_services 導入實際的 AI 文本生成函數
from .MD_ai_services import generate_battle_report_content # 確保這裡正確導入新的函數


battle_logger = logging.getLogger(__name__)

# --- 新增：定義基礎的普通攻擊 ---
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

def _get_monster_current_stats(monster: Monster, player_data: Optional[PlayerGameData]) -> Dict[str, Any]:
    """獲取怪獸的當前有效戰鬥數值，考慮臨時修正、修煉加成、稱號加成和狀態。"""
    
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

    # 應用健康狀態效果
    if monster.get("healthConditions"):
        for condition in monster["healthConditions"]:
            effects = condition.get("effects", {})
            for stat, value in effects.items():
                if stat in stats:
                    stats[stat] += value
    return stats

def _get_effective_skill_stats(skill: Skill) -> Skill:
    """
    根據技能等級計算其在戰鬥中的有效數值。
    返回一個新的技能物件副本，不修改原始物件。
    """
    effective_skill = copy.deepcopy(skill)
    level = effective_skill.get("level", 1)
    
    # 1. 標準等級加成
    if level > 1:
        # 威力: 每級提升基礎值的 8%
        base_power = skill.get("power", 0)
        if base_power > 0:
            effective_skill["power"] = int(base_power * (1 + (level - 1) * 0.08))

        # 效果機率: 每級提升 3%
        base_probability = skill.get("probability", 100)
        effective_skill["probability"] = min(100, base_probability + (level - 1) * 3)

        # MP消耗: 每 2 級減少 1
        base_mp_cost = skill.get("mp_cost", 0)
        if base_mp_cost > 0:
            effective_skill["mp_cost"] = max(1, base_mp_cost - math.floor((level - 1) / 2))

        # 輔助/恢復量: 每級提升基礎值的 10%
        base_amount = skill.get("amount")
        if isinstance(base_amount, int):
            effective_skill["amount"] = int(base_amount * (1 + (level - 1) * 0.1))
        
        # 效果持續時間: 每 3 級增加 1 回合
        base_duration = skill.get("duration")
        if isinstance(base_duration, int):
            effective_skill["duration"] = base_duration + math.floor((level - 1) / 3)

        # 爆擊率加成 - 每 2 級提升 1%
        base_crit = skill.get("crit", 0)
        if base_crit >= 0: # 允許0爆擊的技能也能成長
            effective_skill["crit"] = base_crit + math.floor((level - 1) / 2)

    # 2. 新增：應用等級里程碑加成
    milestones = skill.get("level_milestones")
    if milestones and isinstance(milestones, dict):
        # 確保按等級數字順序應用里程碑
        for milestone_level_str in sorted(milestones.keys(), key=int):
            if level >= int(milestone_level_str):
                milestone_data = milestones[milestone_level_str]
                
                # 應用威力加成
                if "add_power" in milestone_data:
                    effective_skill["power"] = effective_skill.get("power", 0) + milestone_data["add_power"]
                
                # 應用效果加成/覆蓋
                if "add_effect" in milestone_data and isinstance(milestone_data["add_effect"], dict):
                    for key, value in milestone_data["add_effect"].items():
                        effective_skill[key] = value

    return effective_skill


def _get_active_skills(monster: Monster, current_mp: int) -> List[Skill]:
    """獲取怪獸當前 MP 足夠使用的技能。"""
    active_skills = []
    for skill in monster.get("skills", []):
        # 使用計算後的有效MP消耗來判斷
        effective_skill = _get_effective_skill_stats(skill)
        mp_cost = effective_skill.get("mp_cost", 0)
        if current_mp >= mp_cost:
            active_skills.append(skill) # 注意：這裡仍然是添加原始技能，決策後再計算有效值
    return active_skills


def _choose_action(attacker: Monster, defender: Monster, game_configs: GameConfigs, player_data: Optional[PlayerGameData]) -> Skill:
    """
    修改後的行動決策邏輯。
    怪獸有 75% 機率嘗試使用技能，25% 使用普通攻擊。
    如果嘗試用技能但MP不足，也會退回使用普通攻擊。
    """
    # 75% 機率嘗試使用技能
    if random.random() <= 0.75:
        current_attacker_stats = _get_monster_current_stats(attacker, player_data)
        available_skills = _get_active_skills(attacker, current_attacker_stats["mp"])

        if available_skills:
            personality_prefs = attacker.get("personality", {}).get("skill_preferences", {})
            
            weighted_skills = []
            for skill in available_skills:
                category = skill.get("skill_category", "其他")
                weight = personality_prefs.get(category, 1.0)
                weighted_skills.extend([skill] * int(weight * 10))
            
            if weighted_skills:
                return random.choice(weighted_skills)
            else:
                return random.choice(available_skills)
    
    # 如果機率判定為否，或沒有可用技能，則使用普通攻擊
    return BASIC_ATTACK


def _apply_skill_effect(performer: Monster, target: Monster, skill: Skill, game_configs: GameConfigs, performer_player_data: Optional[PlayerGameData], target_player_data: Optional[PlayerGameData]) -> Dict[str, Any]:
    """應用技能效果，並返回日誌訊息和數值變化。"""
    
    effective_skill = _get_effective_skill_stats(skill)
    
    action_details: Dict[str, Any] = {
        "performer_id": performer["id"],
        "target_id": target["id"],
        "skill_name": effective_skill["name"],
        "log_message": ""
    }
    
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_BATTLE["value_settings"]) # type: ignore
    crit_multiplier = value_settings.get("crit_multiplier", 1.5)

    mp_cost = effective_skill.get("mp_cost", 0)
    performer["current_mp"] = performer.get("current_mp", performer["mp"]) - mp_cost
    if performer["current_mp"] < 0: performer["current_mp"] = 0
    action_details["mp_used"] = mp_cost

    attacker_current_stats = _get_monster_current_stats(performer, performer_player_data)
    defender_current_stats = _get_monster_current_stats(target, target_player_data)

    base_accuracy = value_settings.get("base_accuracy", 80)
    base_evasion = value_settings.get("base_evasion", 5)
    acc_per_speed = value_settings.get("accuracy_per_speed", 0.1)
    eva_per_speed = value_settings.get("evasion_per_speed", 0.05)

    accuracy_modifier = int((attacker_current_stats["speed"] - defender_current_stats["speed"]) * acc_per_speed)
    evasion_modifier = int((defender_current_stats["speed"] - attacker_current_stats["speed"]) * eva_per_speed)
    
    final_accuracy = base_accuracy + attacker_current_stats["accuracy"] + accuracy_modifier + effective_skill.get("hit_chance", 0)
    final_evasion = base_evasion + defender_current_stats["evasion"] + evasion_modifier
    
    hit_roll = random.randint(1, 100)
    
    is_hit = hit_roll <= (final_accuracy - final_evasion)
    
    if not is_hit:
        action_details["is_miss"] = True
        action_details["is_crit"] = False
        action_details["log_message"] = f"- {performer['nickname']} 對 {target['nickname']} 發動了 {effective_skill['name']}，但 {target['nickname']} 靈巧地閃避了！"
        action_details["damage_dealt"] = 0
        return action_details

    total_crit_chance = attacker_current_stats["crit"] + effective_skill.get("crit", 0)
    is_crit = random.randint(1, 100) <= total_crit_chance
    action_details["is_crit"] = is_crit
    action_details["is_miss"] = False

    damage = 0
    if effective_skill.get("power", 0) > 0:
        base_damage = effective_skill["power"]
        
        attacker_attack_stat = attacker_current_stats["attack"]
        defender_defense_stat = defender_current_stats["defense"]

        element_multiplier = _calculate_elemental_advantage(effective_skill["type"], target["elements"], game_configs)

        raw_damage = max(1, (base_damage + (attacker_attack_stat / 2) - (defender_defense_stat / 4)))
        damage = int(raw_damage * element_multiplier)

        log_message = f"- {performer['nickname']} 使用了 {effective_skill['name']} 攻擊 {target['nickname']}"
        
        if is_crit:
            damage = int(damage * crit_multiplier)
            log_message += "，造成**暴擊**！"
        
        if element_multiplier > 1.5:
            log_message += " 效果絕佳！"
        elif element_multiplier > 1.0:
            log_message += " 效果不錯。"
        elif element_multiplier < 1.0 and element_multiplier > 0.6:
            log_message += " 效果不太好..."
        elif element_multiplier <= 0.6:
             log_message += " 幾乎沒有效果。"
            
        target["current_hp"] = target.get("current_hp", target["hp"]) - damage
        action_details["damage_dealt"] = damage
        
        mp_cost_str = f" (消耗MP: {mp_cost})" if mp_cost > 0 else ""
        action_details["log_message"] = log_message + f"造成 <damage>{damage}</damage> 點傷害{mp_cost_str}。"
        
        if target["current_hp"] <= 0:
            action_details["log_message"] += f" {target['nickname']} 被擊倒了！"
            target["current_hp"] = 0

    if effective_skill.get("effect"):
        skill_probability = effective_skill.get("probability", 100)
        if random.randint(1, 100) <= skill_probability:
            if effective_skill["effect"] == "heal" and effective_skill.get("amount"):
                heal_amount = effective_skill["amount"]
                # 【修改】使用計算後的總血量作為上限
                performer_max_hp = attacker_current_stats["initial_max_hp"]
                performer["current_hp"] = min(performer_max_hp, performer.get("current_hp", performer["hp"]) + heal_amount)
                action_details["damage_healed"] = heal_amount
                action_details["log_message"] += f" {performer['nickname']} 恢復了 <heal>{heal_amount}</heal> 點 HP。"
            elif effective_skill["effect"] == "status_change" and effective_skill.get("status_id"):
                status_template = next((s for s in game_configs.get("health_conditions", []) if s["id"] == effective_skill["status_id"]), None)
                if status_template:
                    target_monster_for_status = target if effective_skill.get("effect_target", "opponent") == "opponent" else performer
                    if not any(cond["id"] == status_template["id"] for cond in target_monster_for_status.get("healthConditions", [])):
                        if "healthConditions" not in target_monster_for_status:
                            target_monster_for_status["healthConditions"] = []
                        new_status = copy.deepcopy(status_template)
                        new_status["duration"] = effective_skill.get("duration", status_template.get("duration", 1))
                        target_monster_for_status["healthConditions"].append(new_status)
                        action_details["status_applied"] = status_template["id"]
                        action_details["log_message"] += f" {target_monster_for_status['nickname']} 陷入了**{status_template['name']}**狀態！"
        elif action_details["log_message"]:
             action_details["log_message"] += " 但附加效果沒有發動。"
    
    return action_details

def _process_health_conditions(monster: Monster, current_stats: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """處理怪獸的健康狀態，並使用包含加成的總數值作為上限。"""
    log_messages: List[str] = []
    skip_turn = False
    
    if not monster.get("healthConditions"):
        return skip_turn, log_messages

    new_conditions = []
    for condition in monster["healthConditions"]:
        if "hp_per_turn" in condition.get("effects", {}):
            hp_change = condition["effects"]["hp_per_turn"]
            monster["current_hp"] = monster.get("current_hp", monster["hp"]) + hp_change
            # 【修改】使用傳入的包含加成的總血量作為上限
            monster["current_hp"] = max(0, min(current_stats["initial_max_hp"], monster["current_hp"]))
            log_messages.append(f"- {monster['nickname']} 因**{condition['name']}**狀態{'損失' if hp_change < 0 else '恢復'}了 {abs(hp_change)} 點 HP。")

        if condition.get("chance_to_skip_turn", 0) > 0 and random.random() < condition["chance_to_skip_turn"]:
            skip_turn = True
            log_messages.append(f"- {monster['nickname']} 因**{condition['name']}**狀態無法行動！")
        
        if condition.get("confusion_chance", 0) > 0 and random.random() < condition["confusion_chance"]:
            confusion_damage = int(current_stats["attack"] * 0.1)
            monster["current_hp"] = monster.get("current_hp", monster["hp"]) - confusion_damage
            log_messages.append(f"- {monster['nickname']} 陷入**混亂**，攻擊了自己，造成 {confusion_damage} 點傷害！")

        if condition.get("duration") is not None:
            condition["duration"] -= 1
            if condition["duration"] <= 0:
                log_messages.append(f"- {monster['nickname']} 的**{condition['name']}**狀態解除了！")
                continue
        new_conditions.append(condition)
    
    monster["healthConditions"] = new_conditions
    return skip_turn, log_messages


# --- 戰鬥服務核心 ---
def simulate_battle_full(
    player_monster_data: Monster,
    opponent_monster_data: Monster,
    game_configs: GameConfigs,
    player_data: Optional[PlayerGameData] = None,
    opponent_player_data: Optional[PlayerGameData] = None
) -> BattleResult:
    """
    一次性模擬整個怪獸戰鬥，並返回所有回合的詳細日誌和最終結果。
    【修改】函數簽名以接收玩家資料。
    """
    player_monster = copy.deepcopy(player_monster_data)
    opponent_monster = copy.deepcopy(opponent_monster_data)

    player_battle_stats = {"total_damage_dealt": 0, "crit_hits": 0, "successful_evasions": 0, "highest_single_hit": 0, "skills_used": 0, "total_healing": 0, "damage_tanked": 0, "status_applied": 0}
    opponent_battle_stats = {"total_damage_dealt": 0, "crit_hits": 0, "successful_evasions": 0, "highest_single_hit": 0, "skills_used": 0, "total_healing": 0, "damage_tanked": 0, "status_applied": 0}
    
    # 【修改】使用 _get_monster_current_stats 來初始化，確保所有加成都被計入
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
            pass 
        else:
            player_speed = player_stats_at_turn_start["speed"]
            opponent_speed = opponent_stats_at_turn_start["speed"]

            acting_order: List[Tuple[Monster, Optional[PlayerGameData]]] = []
            if player_speed >= opponent_speed:
                acting_order.append((player_monster, player_data))
                acting_order.append((opponent_monster, opponent_player_data))
            else:
                acting_order.append((opponent_monster, opponent_player_data))
                acting_order.append((player_monster, player_data))
            
            if turn_num == 1:
                first_striker_name = acting_order[0][0]['nickname']

            for i, (current_actor, actor_player_data) in enumerate(acting_order):
                if current_actor["id"] == player_monster["id"]:
                    target_actor, target_player_data = opponent_monster, opponent_player_data
                else:
                    target_actor, target_player_data = player_monster, player_data

                if current_actor["current_hp"] <= 0: continue
                
                if (current_actor["id"] == player_monster["id"] and player_skip) or \
                   (current_actor["id"] == opponent_monster["id"] and opponent_skip):
                    turn_raw_log_messages.append(f"- {current_actor['nickname']} 本回合無法行動。")
                    continue

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

                all_turn_actions.append(BattleAction(
                    performer_id=current_actor["id"], target_id=target_actor["id"], skill_name=chosen_skill["name"],
                    damage_dealt=action_result.get("damage_dealt"), damage_healed=action_result.get("damage_healed"),
                    status_applied=action_result.get("status_applied"), is_crit=action_result.get("is_crit"),
                    is_miss=action_result.get("is_miss"), log_message=action_result["log_message"]
                ))

                if player_monster["current_hp"] <= 0 or opponent_monster["current_hp"] <= 0: break

        all_raw_log_messages.extend(turn_raw_log_messages)

    winner_id: Optional[str] = None; loser_id: Optional[str] = None; battle_end = True

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

    player_activity_log, opponent_activity_log = None, None
    challenger_name = player_data.get("nickname", "玩家") if player_data else "玩家"
    challenger_monster_name = player_monster.get('nickname', '一個挑戰者')
    
    if opponent_monster.get('isNPC'): defender_name = "NPC"
    else: defender_name = opponent_player_data.get("nickname", "另一位玩家") if opponent_player_data else "另一位玩家"
    defender_monster_name = opponent_monster.get('nickname', '一個對手')

    challenger_display = f"「{challenger_name}」的「{challenger_monster_name}」"
    defender_display = f"「{defender_name}」的「{defender_monster_name}」"

    if winner_id == player_monster['id']: player_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"挑戰 {defender_display}，您獲勝了！"}
    elif winner_id == opponent_monster['id']: player_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"挑戰 {defender_display}，您不幸戰敗。"}
    else: player_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"與 {defender_display} 戰成平手。"}

    # 【新增】為被挑戰方（防禦方）產生紀錄
    if winner_id == opponent_monster['id']:
        opponent_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"{challenger_display} 向您發起挑戰，防禦成功！"}
    elif winner_id == player_monster['id']:
        opponent_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"{challenger_display} 向您發起挑戰，防禦失敗！"}
    else: # 平手
        opponent_activity_log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": f"與 {challenger_display} 戰成平手。"}


    final_battle_result: BattleResult = {
        "log_entries": [], "raw_full_log": all_raw_log_messages,
        "winner_id": winner_id, "loser_id": loser_id, "battle_end": battle_end,
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
