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

    # 2. 更新參與戰鬥的怪獸數據 (血量、履歷、活動紀錄)
    for p_data, m_data, m_final_hp, m_final_mp, m_final_skills, m_final_resume, m_activity_log in [
        (player_data, player_monster_data, battle_result["player_monster_final_hp"], battle_result["player_monster_final_mp"], battle_result["player_monster_final_skills"], battle_result["player_monster_final_resume"], battle_result.get("player_activity_log")),
        (opponent_player_data, opponent_monster_data, None, None, None, None, battle_result.get("opponent_activity_log")) # 對手只更新履歷和日誌
    ]:
        if not p_data: continue
        
        farmed_monsters = p_data.get("farmedMonsters", [])
        for monster_in_farm in farmed_monsters:
            if monster_in_farm.get("id") == m_data['id']:
                if m_final_hp is not None: monster_in_farm["hp"] = m_final_hp
                if m_final_mp is not None: monster_in_farm["mp"] = m_final_mp
                if m_final_skills is not None: monster_in_farm["skills"] = m_final_skills
                if m_final_resume is not None: monster_in_farm["resume"] = m_final_resume
                
                if monster_in_farm.get("farmStatus"):
                    monster_in_farm["farmStatus"]["isBattling"] = False
                    
                if m_activity_log:
                    monster_in_farm.setdefault("activityLog", []).insert(0, m_activity_log)
                break
        p_data["farmedMonsters"] = farmed_monsters


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
