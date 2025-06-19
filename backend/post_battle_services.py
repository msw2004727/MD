# backend/post_battle_services.py
# 新增的服務：專門處理戰鬥結束後的結算邏輯

import logging
from typing import Dict, Any, List, Optional, Tuple

from .MD_models import PlayerGameData, Monster, BattleResult, GameConfigs
from .player_services import save_player_data_service
from .monster_absorption_services import absorb_defeated_monster_service

post_battle_logger = logging.getLogger(__name__)

def _check_and_award_titles(player_data: PlayerGameData, game_configs: GameConfigs) -> Tuple[PlayerGameData, List[Dict[str, Any]]]:
    """
    檢查玩家是否達成任何新稱號的條件。
    (此函式從 MD_routes.py 移至此處)
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
            # 裝備新稱號的邏輯可以視需求調整，這裡預設不自動裝備
            # player_stats["equipped_title_id"] = title_id 
            newly_awarded_titles.append(title)
            post_battle_logger.info(f"玩家 {player_data.get('nickname')} 達成條件，授予新稱號: {title.get('name')}")
    
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
    game_configs: GameConfigs
) -> Tuple[PlayerGameData, List[Dict[str, Any]]]:
    """
    處理戰鬥結束後的所有數據更新。
    返回更新後的玩家數據和新獲得的稱號列表。
    """
    newly_awarded_titles: List[Dict[str, Any]] = []
    
    # 1. 更新勝利方和失敗方的玩家統計數據 (PlayerStats)
    player_stats = player_data.get("playerStats")
    if player_stats:
        if battle_result.get("winner_id") == player_monster_data['id']:
            player_stats["wins"] = player_stats.get("wins", 0) + 1
        elif battle_result.get("loser_id") == player_monster_data['id']:
            player_stats["losses"] = player_stats.get("losses", 0) + 1
        player_data["playerStats"] = player_stats

    if opponent_player_data and opponent_id:
        opponent_stats = opponent_player_data.get("playerStats")
        if opponent_stats:
            if battle_result.get("winner_id") == opponent_monster_data['id']:
                opponent_stats["wins"] = opponent_stats.get("wins", 0) + 1
            elif battle_result.get("loser_id") == opponent_monster_data['id']:
                opponent_stats["losses"] = opponent_stats.get("losses", 0) + 1
            opponent_player_data["playerStats"] = opponent_stats

    # 2. 更新參與戰鬥的怪獸數據
    # 2.1 更新玩家怪獸的資料
    player_monster_in_farm = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == player_monster_data['id']), None)
    if player_monster_in_farm:
        player_monster_in_farm["hp"] = battle_result["player_monster_final_hp"]
        player_monster_in_farm["mp"] = battle_result["player_monster_final_mp"]
        player_monster_in_farm["skills"] = battle_result["player_monster_final_skills"]
        
        # ----- BUG 修正邏輯 START -----
        # 直接根據戰鬥結果更新怪獸的 resume (履歷)
        monster_resume = player_monster_in_farm.setdefault("resume", {"wins": 0, "losses": 0})
        if battle_result.get("winner_id") == player_monster_data['id']:
            monster_resume["wins"] = monster_resume.get("wins", 0) + 1
            post_battle_logger.info(f"玩家怪獸 {player_monster_in_farm.get('nickname')} 勝利，勝場 +1")
        elif battle_result.get("loser_id") == player_monster_data['id']:
            monster_resume["losses"] = monster_resume.get("losses", 0) + 1
            post_battle_logger.info(f"玩家怪獸 {player_monster_in_farm.get('nickname')} 戰敗，敗場 +1")
        player_monster_in_farm["resume"] = monster_resume
        # ----- BUG 修正邏輯 END -----

        if player_monster_in_farm.get("farmStatus"):
            player_monster_in_farm["farmStatus"]["isBattling"] = False
            
        player_activity_log = battle_result.get("player_activity_log")
        if player_activity_log:
            player_monster_in_farm.setdefault("activityLog", []).insert(0, player_activity_log)
    
    # 2.2 更新對手怪獸的資料 (如果不是NPC)
    if opponent_player_data and opponent_id:
        opponent_monster_in_farm = next((m for m in opponent_player_data.get("farmedMonsters", []) if m.get("id") == opponent_monster_data['id']), None)
        if opponent_monster_in_farm:
            # 只更新對手的履歷和活動日誌
            opponent_resume = opponent_monster_in_farm.setdefault("resume", {"wins": 0, "losses": 0})
            if battle_result.get("winner_id") == opponent_monster_data['id']:
                opponent_resume["wins"] = opponent_resume.get("wins", 0) + 1
            elif battle_result.get("loser_id") == opponent_monster_data['id']:
                opponent_resume["losses"] = opponent_resume.get("losses", 0) + 1
            opponent_monster_in_farm["resume"] = opponent_resume
            
            opponent_activity_log = battle_result.get("opponent_activity_log")
            if opponent_activity_log:
                opponent_monster_in_farm.setdefault("activityLog", []).insert(0, opponent_activity_log)

    # 3. 執行勝利吸收邏輯 (如果勝利)
    if battle_result.get("winner_id") == player_monster_data['id']:
        absorption_result = absorb_defeated_monster_service(
            player_id, 
            player_monster_data['id'], 
            opponent_monster_data, 
            game_configs, 
            player_data
        )
        if absorption_result and absorption_result.get("success"):
            # 將吸收結果更新回 player_data
            player_data["farmedMonsters"] = absorption_result.get("updated_player_farm", player_data.get("farmedMonsters"))
            player_data["playerOwnedDNA"] = absorption_result.get("updated_player_owned_dna", player_data.get("playerOwnedDNA"))

    # 4. 檢查是否有新稱號達成
    player_data, newly_awarded_titles = _check_and_award_titles(player_data, game_configs)
    
    # 5. 儲存雙方玩家的數據
    save_player_data_service(player_id, player_data)
    if opponent_id and opponent_player_data:
        save_player_data_service(opponent_id, opponent_player_data)

    return player_data, newly_awarded_titles
