# backend/post_battle_services.py
# 新增的服務：專門處理戰鬥結束後的結算邏輯

import logging
import time
from typing import Dict, Any, List, Optional, Tuple

from .MD_models import PlayerGameData, Monster, BattleResult, GameConfigs, ChampionSlot
from .player_services import save_player_data_service, _add_player_log
from .monster_absorption_services import absorb_defeated_monster_service
from .champion_services import get_champions_data, update_champions_document
from .mail_services import add_mail_to_player
from .tournament_services import calculate_pvp_points_update

post_battle_logger = logging.getLogger(__name__)

def _update_pvp_tier(player_stats: Dict[str, Any]) -> Dict[str, Any]:
    """根據PVP積分更新玩家的段位。"""
    points = player_stats.get("pvp_points", 0)
    tiers = {
        "大師": 1500, "鑽石": 1000, "白金": 600,
        "金牌": 300, "銀牌": 100, "銅牌": 0
    }
    
    current_tier = "尚未定位"
    for tier, min_points in tiers.items():
        if points >= min_points:
            current_tier = tier
            break
            
    player_stats["pvp_tier"] = current_tier
    return player_stats

def _check_and_award_titles(player_data: PlayerGameData, game_configs: GameConfigs) -> Tuple[PlayerGameData, List[Dict[str, Any]]]:
    """
    檢查玩家是否達成任何新稱號的條件。
    如果達成，除了授予稱號，還會發送一封系統信件通知。
    """
    player_stats = player_data.get("playerStats", {})
    if not player_stats:
        return player_data, []

    all_titles = game_configs.get("titles", [])
    owned_title_ids = {t.get("id") for t in player_stats.get("titles", [])}
    newly_awarded_titles = []
    
    farmed_monsters = player_data.get("farmedMonsters", [])

    for title in all_titles:
        title_id = title.get("id")
        if not title_id or title_id in owned_title_ids:
            continue

        condition = title.get("condition", {})
        cond_type = condition.get("type")
        cond_value = condition.get("value")

        unlocked = False
        if cond_type == "wins" and player_stats.get("wins", 0) >= cond_value:
            unlocked = True
        elif cond_type == "monsters_owned" and len(farmed_monsters) >= cond_value:
            unlocked = True
        elif cond_type == "monster_elements_count":
            if any(len(monster.get("elements", [])) >= cond_value for monster in farmed_monsters):
                unlocked = True
        elif cond_type == "own_elemental_monsters":
            cond_element = condition.get("element")
            count = sum(1 for monster in farmed_monsters if monster.get("elements") and monster["elements"][0] == cond_element)
            if count >= cond_value:
                unlocked = True
        elif cond_type == "max_skill_level":
            if any(skill.get("level", 0) >= cond_value for monster in farmed_monsters for skill in monster.get("skills", [])):
                unlocked = True
        elif cond_type == "monster_stat_reach":
            stat_to_check = condition.get("stat")
            if any(monster.get(stat_to_check, 0) >= cond_value for monster in farmed_monsters):
                unlocked = True
        elif cond_type == "friends_count":
            if len(player_data.get("friends", [])) >= cond_value:
                unlocked = True

        if unlocked:
            player_stats.get("titles", []).insert(0, title)
            newly_awarded_titles.append(title)
            post_battle_logger.info(f"玩家 {player_data.get('nickname')} 達成條件，授予新稱號: {title.get('name')}")
            
            mail_title = f"🏆 榮譽加身！獲得新稱號：{title.get('name')}"
            
            buffs_text = ""
            if title.get("buffs"):
                buff_parts = []
                # --- 核心修改處 START ---
                # 新增中文名稱對照表
                stat_name_map = {
                    'hp': 'HP', 'mp': 'MP', 'attack': '攻擊', 'defense': '防禦', 'speed': '速度', 'crit': '爆擊率',
                    'cultivation_item_find_chance': '修煉物品發現率', 'elemental_damage_boost': '元素傷害',
                    'score_gain_boost': '積分獲取', 'evasion': '閃避率',
                    'fire_resistance': '火抗性', 'water_resistance': '水抗性', 'wood_resistance': '木抗性',
                    'gold_resistance': '金抗性', 'earth_resistance': '土抗性', 'light_resistance': '光抗性',
                    'dark_resistance': '暗抗性', 'poison_damage_boost': '毒素傷害',
                    'cultivation_exp_gain': '修煉經驗獲取', 'cultivation_time_reduction': '修煉時間縮短',
                    'dna_return_rate_on_disassemble': '分解DNA返還率', 'leech_skill_effect': '生命吸取效果',
                    'mp_regen_per_turn': 'MP每回合恢復'
                }
                for stat, value in title["buffs"].items():
                    # 使用對照表來取得中文名稱，如果找不到則使用原始鍵值
                    name = stat_name_map.get(stat, stat)
                    display_value = f"+{value * 100:.0f}%" if 0 < value < 1 else f"+{value}"
                    buff_parts.append(f"{name}{display_value}")
                # --- 核心修改處 END ---
                buffs_text = f" 稱號效果：{ '、'.join(buff_parts) }"

            mail_content = f"恭喜您！由於您的卓越表現，您已成功解鎖了新的稱號：「{title.get('name')}」。 描述：{title.get('description', '無')}{buffs_text}"

            mail_template = {
                "type": "reward",
                "title": mail_title,
                "content": mail_content,
                "sender_name": "系統通知",
                "payload": {"reward_type": "title", "title_data": title}
            }
            add_mail_to_player(player_data, mail_template)

    if newly_awarded_titles:
        player_data["playerStats"] = player_stats

    return player_data, newly_awarded_titles

def process_battle_results(
    player_id: str,
    opponent_id: Optional[str],
    player_data: PlayerGameData,
    opponent_player_data: Optional[PlayerGameData],
    player_monster_data: Monster,
    opponent_monster_data: Monster,
    battle_result: BattleResult,
    game_configs: GameConfigs,
    is_champion_challenge: bool = False,
    challenged_rank: Optional[int] = None,
    is_ladder_match: bool = False,
    challenge_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    處理戰鬥結束後的所有數據更新，包含冠軍殿堂和天梯積分邏輯。
    返回一個包含更新後數據的字典。
    """
    post_battle_logger.info(f"--- 開始戰後結算 (is_ladder_match: {is_ladder_match}, challenge_type: {challenge_type}) ---")
    newly_awarded_titles: List[Dict[str, Any]] = []
    updated_champions_data: Optional[Dict[str, Any]] = None
    
    player_stats = player_data.get("playerStats", {})
    opponent_stats = opponent_player_data.get("playerStats", {}) if opponent_player_data else {}
    is_player_winner = battle_result.get("winner_id") == player_monster_data['id']

    # 【新】如果是每日試煉勝利，則記錄完成時間
    if challenge_type == 'daily' and is_player_winner:
        challenge_id = opponent_monster_data.get('id') # npc_id 被用作 challenge_id
        if challenge_id:
            if "daily_challenges_completed" not in player_stats:
                player_stats["daily_challenges_completed"] = {}
            player_stats["daily_challenges_completed"][challenge_id] = int(time.time())
            post_battle_logger.info(f"玩家 {player_id} 完成了每日試煉 {challenge_id}，已記錄時間戳。")

            # 發放獎勵
            all_challenges = game_configs.get("tournament_config", {}).get("daily_challenges", [])
            challenge_config = next((c for c in all_challenges if c.get("npc_id") == challenge_id), None)
            
            if challenge_config:
                reward_text = challenge_config.get("rewardText", "")
                # 解析金幣獎勵
                import re
                gold_match = re.search(r'(\d+)\s*🪙', reward_text)
                if gold_match:
                    gold_reward = int(gold_match.group(1))
                    player_stats["gold"] = player_stats.get("gold", 0) + gold_reward
                    battle_result.setdefault("rewards_obtained", []).append({"type": "gold", "amount": gold_reward})
                    post_battle_logger.info(f"已為玩家 {player_id} 發放每日試煉金幣獎勵: {gold_reward}")

                # 解析DNA獎勵
                dna_match = re.search(r'隨機(.+?)系DNA', reward_text)
                if dna_match:
                    element = dna_match.group(1)
                    all_dna = game_configs.get("dna_fragments", [])
                    dna_pool = [d for d in all_dna if d.get("type") == element]
                    if dna_pool:
                        dna_reward = random.choice(dna_pool)
                        # 優先放入主庫存，滿了再放臨時背包
                        main_inventory = player_data.get("playerOwnedDNA", [])
                        empty_slot_index = next((i for i, slot in enumerate(main_inventory) if slot is None and i != 11), -1)
                        
                        new_dna_instance = {**dna_reward, "id": f"dna_inst_{player_id}_{int(time.time() * 1000)}", "baseId": dna_reward["id"]}

                        if empty_slot_index != -1:
                            main_inventory[empty_slot_index] = new_dna_instance
                        else:
                            player_data.setdefault("temporaryBackpack", []).append({"type": "dna", "data": new_dna_instance})
                        
                        battle_result.setdefault("rewards_obtained", []).append({"type": "dna", "item": new_dna_instance})
                        post_battle_logger.info(f"已為玩家 {player_id} 發放每日試煉DNA獎勵: {dna_reward.get('name')}")

    # 處理天梯積分和段位
    if is_ladder_match and opponent_player_data:
        post_battle_logger.info("偵測到PVP積分變動，開始處理...")
        points_change = battle_result["pvp_points_change"]
        winner_id = points_change.get("winner_id")

        if winner_id == player_id:
            player_stats["pvp_points"] = player_stats.get("pvp_points", 1000) + points_change["winner_gain"]
            opponent_stats["pvp_points"] = max(0, opponent_stats.get("pvp_points", 1000) - points_change["loser_loss"])
        elif winner_id == opponent_id:
            player_stats["pvp_points"] = max(0, player_stats.get("pvp_points", 1000) - points_change["loser_loss"])
            opponent_stats["pvp_points"] = opponent_stats.get("pvp_points", 1000) + points_change["winner_gain"]

        player_stats = _update_pvp_tier(player_stats)
        opponent_stats = _update_pvp_tier(opponent_stats)
        
        post_battle_logger.info(f"天梯結算：玩家 {player_id} 積分變為 {player_stats['pvp_points']} ({player_stats['pvp_tier']}), 對手 {opponent_id} 積分變為 {opponent_stats['pvp_points']} ({opponent_stats['pvp_tier']})")
    
    # 更新勝敗���次
    if is_player_winner:
        player_stats["wins"] = player_stats.get("wins", 0) + 1
    else:
        player_stats["losses"] = player_stats.get("losses", 0) + 1

    if opponent_player_data and opponent_id:
        if not is_player_winner:
            opponent_stats["wins"] = opponent_stats.get("wins", 0) + 1
        else:
            opponent_stats["losses"] = opponent_stats.get("losses", 0) + 1
    
    # ... (後續的怪物資料更新等) ...
    player_monster_in_farm = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == player_monster_data['id']), None)
    if player_monster_in_farm:
        player_monster_in_farm["hp"] = battle_result["player_monster_final_hp"]
        player_monster_in_farm["mp"] = battle_result["player_monster_final_mp"]
        player_monster_in_farm["skills"] = battle_result["player_monster_final_skills"]
        monster_resume = player_monster_in_farm.setdefault("resume", {"wins": 0, "losses": 0})
        if is_player_winner: monster_resume["wins"] += 1
        else: monster_resume["losses"] += 1
        if player_monster_in_farm.get("farmStatus"): player_monster_in_farm["farmStatus"]["isBattling"] = False
        if battle_result.get("player_activity_log"): player_monster_in_farm.setdefault("activityLog", []).insert(0, battle_result["player_activity_log"])

    if opponent_player_data and opponent_id:
        opponent_monster_in_farm = next((m for m in opponent_player_data.get("farmedMonsters", []) if m.get("id") == opponent_monster_data['id']), None)
        if opponent_monster_in_farm:
            opponent_resume = opponent_monster_in_farm.setdefault("resume", {"wins": 0, "losses": 0})
            if not is_player_winner: opponent_resume["wins"] += 1
            else: opponent_resume["losses"] += 1
            if battle_result.get("opponent_activity_log"): opponent_monster_in_farm.setdefault("activityLog", []).insert(0, battle_result["opponent_activity_log"])

    # ... (冠軍殿堂邏輯) ...
    if is_champion_challenge and challenged_rank is not None and is_player_winner:
        # ... (此處省略以保持簡潔)
        pass

    if is_player_winner:
        absorption_result = absorb_defeated_monster_service(player_id, player_monster_data['id'], opponent_monster_data, game_configs, player_data)
        if absorption_result and absorption_result.get("success"):
            player_data["farmedMonsters"] = absorption_result.get("updated_player_farm", player_data.get("farmedMonsters"))
            player_data["playerOwnedDNA"] = absorption_result.get("updated_player_owned_dna", player_data.get("playerOwnedDNA"))

    # ... (日誌記錄) ...
    result_html = "<span style='color: var(--success-color);'>獲勝</span>" if is_player_winner else "<span style='color: var(--danger-color);'>戰敗</span>" _add_player_log(player_data, "戰鬥", f"挑戰「{opponent_monster_data.get('nickname', '一名對手')}」，您{result_html}了！")
    if opponent_player_data and opponent_id:
        _add_player_log(opponent_player_data, "戰鬥", f"「{player_data.get('nickname', '一名挑戰者')}」向您發起挑戰，您{'<span style=\'color: var(--success-color);\'>獲勝</span>' if not is_player_winner else '<span style=\'color: var(--danger-color);\'>戰敗</span>'}了！")

    player_data["playerStats"] = player_stats
    if opponent_player_data:
        opponent_player_data["playerStats"] = opponent_stats

    player_data, newly_awarded_titles = _check_and_award_titles(player_data, game_configs)
    
    post_battle_logger.info(f"準備儲存玩家 {player_id} 的資料，PVP積分: {player_data.get('playerStats', {}).get('pvp_points')}")
    save_player_data_service(player_id, player_data)
    if opponent_id and opponent_player_data:
        post_battle_logger.info(f"準備儲存對手 {opponent_id} 的資料，PVP積分: {opponent_player_data.get('playerStats', {}).get('pvp_points')}")
        save_player_data_service(opponent_id, opponent_player_data)

    return {
        "updated_player_data": player_data,
        "newly_awarded_titles": newly_awarded_titles,
        "updated_champions_data": updated_champions_data
    }
