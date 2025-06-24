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

post_battle_logger = logging.getLogger(__name__)

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
    challenged_rank: Optional[int] = None
) -> Dict[str, Any]:
    """
    處理戰鬥結束後的所有數據更新，包含冠軍殿堂邏輯。
    返回一個包含更新後數據的字典。
    """
    newly_awarded_titles: List[Dict[str, Any]] = []
    updated_champions_data: Optional[Dict[str, Any]] = None
    
    player_stats = player_data.get("playerStats", {})
    is_player_winner = battle_result.get("winner_id") == player_monster_data['id']
    
    if is_player_winner:
        player_stats["wins"] = player_stats.get("wins", 0) + 1
    else:
        player_stats["losses"] = player_stats.get("losses", 0) + 1
    player_data["playerStats"] = player_stats

    if opponent_player_data and opponent_id:
        opponent_stats = opponent_player_data.get("playerStats", {})
        if not is_player_winner:
            opponent_stats["wins"] = opponent_stats.get("wins", 0) + 1
        else:
            opponent_stats["losses"] = opponent_stats.get("losses", 0) + 1
        opponent_player_data["playerStats"] = opponent_stats

    player_monster_in_farm = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == player_monster_data['id']), None)
    if player_monster_in_farm:
        player_monster_in_farm["hp"] = battle_result["player_monster_final_hp"]
        player_monster_in_farm["mp"] = battle_result["player_monster_final_mp"]
        player_monster_in_farm["skills"] = battle_result["player_monster_final_skills"]
        
        monster_resume = player_monster_in_farm.setdefault("resume", {"wins": 0, "losses": 0})
        if is_player_winner:
            monster_resume["wins"] = monster_resume.get("wins", 0) + 1
        else:
            monster_resume["losses"] = monster_resume.get("losses", 0) + 1
        player_monster_in_farm["resume"] = monster_resume

        if player_monster_in_farm.get("farmStatus"):
            player_monster_in_farm["farmStatus"]["isBattling"] = False
            
        player_activity_log = battle_result.get("player_activity_log")
        if player_activity_log:
            player_monster_in_farm.setdefault("activityLog", []).insert(0, player_activity_log)
    
    if opponent_player_data and opponent_id:
        opponent_monster_in_farm = next((m for m in opponent_player_data.get("farmedMonsters", []) if m.get("id") == opponent_monster_data['id']), None)
        if opponent_monster_in_farm:
            opponent_resume = opponent_monster_in_farm.setdefault("resume", {"wins": 0, "losses": 0})
            if not is_player_winner:
                opponent_resume["wins"] = opponent_resume.get("wins", 0) + 1
            else:
                opponent_resume["losses"] = opponent_resume.get("losses", 0) + 1
            opponent_monster_in_farm["resume"] = opponent_resume
            
            opponent_activity_log = battle_result.get("opponent_activity_log")
            if opponent_activity_log:
                opponent_monster_in_farm.setdefault("activityLog", []).insert(0, opponent_activity_log)

    if is_champion_challenge and challenged_rank is not None and is_player_winner:
        post_battle_logger.info(f"偵測到冠軍挑戰勝利！玩家 {player_id} 挑戰第 {challenged_rank} 名成功。開始處理名次變更...")
        
        champions_data = get_champions_data()
        
        new_champion_slot = ChampionSlot(
            monsterId=player_monster_data["id"],
            ownerId=player_id,
            monsterNickname=player_monster_data.get("nickname"),
            ownerNickname=player_data.get("nickname"),
            occupiedTimestamp=int(time.time())
        )

        for i in range(1, 5):
            rank_key = f"rank{i}"
            slot = champions_data.get(rank_key)
            if slot and slot.get("ownerId") == player_id:
                champions_data[rank_key] = None
                post_battle_logger.info(f"唯一席位原則：挑戰者原為第 {i} 名，已將其舊席位清空。")
                break
        
        challenged_rank_key = f"rank{challenged_rank}"
        defeated_champion_slot = champions_data.get(challenged_rank_key)
        
        champions_data[challenged_rank_key] = new_champion_slot

        if defeated_champion_slot:
            if challenged_rank < 4:
                champions_data[f"rank{challenged_rank + 1}"] = defeated_champion_slot
                post_battle_logger.info(f"席位交換：原第 {challenged_rank} 名的冠軍被移至第 {challenged_rank + 1} 名。")
            else:
                post_battle_logger.info(f"原第 4 名的冠軍已被踢出殿堂。")
        
        update_champions_document(champions_data)
        updated_champions_data = champions_data

    if is_player_winner:
        absorption_result = absorb_defeated_monster_service(
            player_id, 
            player_monster_data['id'], 
            opponent_monster_data, 
            game_configs, 
            player_data
        )
        if absorption_result and absorption_result.get("success"):
            player_data["farmedMonsters"] = absorption_result.get("updated_player_farm", player_data.get("farmedMonsters"))
            player_data["playerOwnedDNA"] = absorption_result.get("updated_player_owned_dna", player_data.get("playerOwnedDNA"))

    opponent_name = opponent_monster_data.get('nickname', '一名對手')
    
    win_text = '<span style=\'color: var(--success-color);\'>獲勝</span>'
    loss_text = '<span style=\'color: var(--danger-color);\'>戰敗</span>'
    
    player_result_text = win_text if is_player_winner else loss_text
    player_log_message = f"挑戰「{opponent_name}」，您{player_result_text}了！"
    
    opponent_result_text = loss_text if is_player_winner else win_text
    opponent_log_message = f"「{player_data.get('nickname', '一名挑戰者')}」向您發起挑戰，您{opponent_result_text}了！"
    
    _add_player_log(player_data, "戰鬥", player_log_message)

    if opponent_player_data and opponent_id:
        _add_player_log(opponent_player_data, "戰鬥", opponent_log_message)
        
    player_data, newly_awarded_titles = _check_and_award_titles(player_data, game_configs)
    
    save_player_data_service(player_id, player_data)
    if opponent_id and opponent_player_data:
        save_player_data_service(opponent_id, opponent_player_data)

    return {
        "updated_player_data": player_data,
        "newly_awarded_titles": newly_awarded_titles,
        "updated_champions_data": updated_champions_data
    }
