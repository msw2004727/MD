# backend/adventure_services.py
# 包含所有「冒險島」的核心邏輯，如開始遠征、地圖生成、移動和事件處理。

import logging
import random
import time
import json
import os
import math 
from typing import List, Dict, Optional, Any, Tuple

# 從各自正確的檔案導入模型
from .MD_models import PlayerGameData, GameConfigs, Monster
from .adventure_models import AdventureProgress, ExpeditionMemberStatus, AdventureFacility, AdventureIsland, ExpeditionStats, ExpeditionGrowthResult

# 建立此服務專用的日誌記錄器
adventure_logger = logging.getLogger(__name__)


def _handle_random_growth_event(player_data: PlayerGameData, progress: AdventureProgress, game_configs: GameConfigs) -> Optional[ExpeditionGrowthResult]:
    """
    處理冒險中的隨機成長事件。
    返回成長結果，如果未觸發則返回 None。
    """
    facility_id = progress.get("facility_id")
    if not facility_id:
        return None

    growth_settings = game_configs.get("adventure_growth_settings", {})
    facility_difficulty = growth_settings.get("facilities", {}).get(facility_id)
    
    if not facility_difficulty:
        adventure_logger.warning(f"在 adventure_growth_settings.json 中找不到設施 {facility_id} 的設定。")
        return None 
    
    chance_to_trigger = facility_difficulty.get("growth_chance", 0)
    
    roll = random.random()
    adventure_logger.info(f"隨機成長檢定：設施 {facility_id} (機率: {chance_to_trigger*100}%)，擲骰結果: {roll:.4f}")

    if roll > chance_to_trigger:
        adventure_logger.info("隨機成長：未觸發。")
        return None
    
    adventure_logger.info("隨機成長：成功觸發！")

    team = progress.get("expedition_team", [])
    if not team:
        return None
        
    member_to_grow = random.choice(team)
    monster_id_to_grow = member_to_grow.get("monster_id")

    monster_in_farm = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == monster_id_to_grow), None)
    if not monster_in_farm:
        adventure_logger.warning(f"隨機成長：在農場中找不到怪獸 {monster_id_to_grow}")
        return None

    points_to_distribute = facility_difficulty.get("growth_points", 0)
    stat_weights_config = growth_settings.get("stat_weights", {})
    if not stat_weights_config:
        adventure_logger.warning("在 adventure_growth_settings.json 中找不到 stat_weights 設定。")
        return None
    
    stat_weights_config.pop('crit', None)
    
    stats_to_grow = list(stat_weights_config.keys())
    weights = list(stat_weights_config.values())
    
    gains_log: Dict[str, int] = {}
    cultivation_gains = monster_in_farm.setdefault("cultivation_gains", {})

    for _ in range(points_to_distribute):
        chosen_stat = random.choices(stats_to_grow, weights=weights, k=1)[0]
        cultivation_gains[chosen_stat] = cultivation_gains.get(chosen_stat, 0) + 1
        gains_log[chosen_stat] = gains_log.get(chosen_stat, 0) + 1

    adventure_logger.info(f"隨機成長觸發！怪獸 {monster_in_farm.get('nickname')} 獲得了成長: {gains_log}")
    
    growth_result: ExpeditionGrowthResult = {
        "monster_id": monster_id_to_grow,
        "monster_nickname": monster_in_farm.get("nickname", "未知怪獸"),
        "stat_gains": gains_log
    }
    
    return growth_result


def get_all_islands_service() -> List[Dict[str, Any]]:
    """
    從本地 JSON 檔案讀取所有冒險島的設定資料。
    """
    adventure_logger.info("正在從 adventure_islands.json 讀取島嶼資料...")
    try:
        data_file_path = os.path.join(os.path.dirname(__file__), 'adventure', 'adventure_islands.json')
        
        with open(data_file_path, 'r', encoding='utf-8') as f:
            islands_data = json.load(f)
        
        if not isinstance(islands_data, list):
            adventure_logger.error("adventure_islands.json 的根層級不是一個列表 (list)。")
            return []
            
        adventure_logger.info(f"成功讀取到 {len(islands_data)} 個島嶼的資料。")
        return islands_data

    except FileNotFoundError:
        adventure_logger.error(f"錯誤：找不到冒險島設定檔 'adventure_islands.json' 於路徑: {data_file_path}")
        return []
    except json.JSONDecodeError as e:
        adventure_logger.error(f"解析 'adventure_islands.json' 時發生錯誤: {e}")
        return []
    except Exception as e:
        adventure_logger.error(f"讀取冒險島資料時發生未知錯誤: {e}", exc_info=True)
        return []

def start_expedition_service(
    player_data: PlayerGameData, 
    island_id: str, 
    facility_id: str, 
    team_monster_ids: List[str], 
    game_configs: GameConfigs
) -> Tuple[Optional[PlayerGameData], Optional[str]]:
    """
    處理玩家開始一次新的遠征，並返回更新後的玩家資料及可能的錯誤訊息。
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 嘗試在島嶼 {island_id} 的設施 {facility_id} 開始遠征。")
    
    progress = player_data.get("adventure_progress")
    if progress and progress.get("is_active"):
        return None, "您已經有一場遠征正在進行中，無法開始新的遠征。"

    all_islands = game_configs.get("adventure_islands", [])
    facility_data: Optional[AdventureFacility] = None
    for island in all_islands:
        if island.get("islandId") == island_id:
            for fac in island.get("facilities", []):
                if fac.get("facilityId") == facility_id:
                    facility_data = fac
                    break
            break
    
    if not facility_data:
        return None, f"找不到指定的設施（ID: {facility_id}）。"

    cost = facility_data.get("cost", 0)
    player_gold = player_data.get("playerStats", {}).get("gold", 0)
    if player_gold < cost:
        return None, f"金幣不足，需要 {cost} 🪙，您目前只有 {player_gold} 🪙。"

    if not 1 <= len(team_monster_ids) <= 3:
        return None, "遠征隊伍的成員數量必須介於 1 到 3 之間。"
    
    expedition_team_status: List[ExpeditionMemberStatus] = []
    player_monsters_map = {m["id"]: m for m in player_data.get("farmedMonsters", [])}
    
    deployed_monster_id = player_data.get("selectedMonsterId")

    for monster_id in team_monster_ids:
        monster = player_monsters_map.get(monster_id)
        if not monster:
            return None, f"隊伍中包含了無效的怪獸（ID: {monster_id}）。"
            
        if monster_id == deployed_monster_id:
            return None, f"怪獸「{monster.get('nickname')}」正在出戰中，無法參加遠征。"

        if monster.get("farmStatus", {}).get("isTraining"):
            return None, f"怪獸「{monster.get('nickname')}」正在修煉中，無法參加遠征。"
        if monster.get("hp", 0) < monster.get("initial_max_hp", 1) * 0.25:
             return None, f"怪獸「{monster.get('nickname')}」處於瀕死狀態，無法參加遠征。"
        
        member_status: ExpeditionMemberStatus = {
            "monster_id": monster["id"], "nickname": monster["nickname"],
            "current_hp": monster["hp"], "current_mp": monster["mp"], "status_effects": []
        }
        expedition_team_status.append(member_status)

    player_data["playerStats"]["gold"] = player_gold - cost

    adventure_progress: AdventureProgress = {
        "is_active": True, "island_id": island_id, "facility_id": facility_id,
        "start_timestamp": int(time.time()), "expedition_team": expedition_team_status,
        "current_floor": 1, "current_step": 0, "total_steps_in_floor": 5,
        "story_fragments": [], "adventure_inventory": [], "current_event": None,
        "expedition_stats": {
            "gold_obtained": 0,
            "hp_consumed": 0,
            "hp_healed": 0,
            "mp_consumed": 0,
            "mp_healed": 0,
            "captain_switches": 0,
            "events_encountered": 0,
            "bosses_fought": 0,
            "buffs_received": 0,
            "debuffs_received": 0,
            "dna_fragments_obtained": 0
        }
    }
    player_data["adventure_progress"] = adventure_progress
    
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 的遠征已成功建立。")
    return player_data, None


def _load_boss_pool(boss_pool_id: str, game_configs: GameConfigs) -> List[Dict[str, Any]]:
    """從預先載入的 game_configs 中獲取 BOSS 資料。"""
    all_bosses_data = game_configs.get("adventure_bosses", {})
    boss_pool = all_bosses_data.get(boss_pool_id, [])
    if not boss_pool:
        adventure_logger.warning(f"在 game_configs 中找不到 BOSS 池: {boss_pool_id}")
    return boss_pool

def _load_event_pool(facility_id: str, game_configs: GameConfigs) -> List[Dict[str, Any]]:
    """從預先載入的 game_configs 中獲取事件資料。"""
    event_file_map = {
        "facility_001": "adventure_events_forest.json",
        "facility_002": "adventure_events_mine.json",
        "facility_003": "adventure_events_cave.json",
        "facility_004": "adventure_events_ruins.json"
    }
    event_file_name = event_file_map.get(facility_id)
    if not event_file_name:
        adventure_logger.warning(f"在 event_file_map 中找不到 facility_id: {facility_id} 的對應檔案。")
        return []
        
    all_events_data = game_configs.get("adventure_events", {})
    event_pool = all_events_data.get(event_file_name, [])
    if not event_pool:
        adventure_logger.warning(f"在 game_configs 中找不到事件池: {event_file_name}")
    return event_pool

def advance_floor_service(player_data: PlayerGameData, game_configs: GameConfigs) -> Dict[str, Any]:
    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        return {"success": False, "error": "沒有正在進行的遠征。"}

    progress["current_step"] += 1
    current_facility_id = progress.get("facility_id")
    event_data = None
    
    stats = progress.get("expedition_stats")
    if stats:
        stats["events_encountered"] = stats.get("events_encountered", 0) + 1

    if progress["current_step"] >= progress["total_steps_in_floor"]:
        if stats:
            stats["bosses_fought"] = stats.get("bosses_fought", 0) + 1
        current_floor = progress.get("current_floor", 1)
        all_islands = game_configs.get("adventure_islands", [])
        facility_data = next((fac for island in all_islands for fac in island.get("facilities", []) if fac.get("facilityId") == current_facility_id), None)
        
        if facility_data and facility_data.get("boss_pool_id"):
            boss_pool = _load_boss_pool(facility_data["boss_pool_id"], game_configs)
            if boss_pool:
                base_boss = random.choice(boss_pool).copy()
                if current_floor > 1:
                    adv_settings = game_configs.get("adventure_settings", {})
                    growth_factor = adv_settings.get("boss_difficulty_multiplier_per_floor", 1.1) ** (current_floor - 1)
                    base_boss['nickname'] = f"第 {current_floor} 層的{base_boss['nickname']}"
                    for stat in ['initial_max_hp', 'hp', 'initial_max_mp', 'mp', 'attack', 'defense', 'speed']:
                        if stat in base_boss: base_boss[stat] = math.ceil(base_boss[stat] * growth_factor)
                    base_boss['score'] = math.ceil(base_boss.get('score', 600) * growth_factor)
                
                event_data = {
                    "event_type": "boss_encounter", "name": f"強大的氣息！遭遇 {base_boss.get('nickname')}！",
                    "description": base_boss.get("description", "一個巨大的身影擋住了去路！"),
                    "choices": [{"choice_id": "FIGHT_BOSS", "text": "迎戰！"}], "boss_data": base_boss
                }
    else:
        all_events = _load_event_pool(current_facility_id, game_configs)
        if all_events:
            chosen_event = random.choice(all_events).copy()
            team_members = progress.get("expedition_team", [])
            if team_members:
                random_monster_name = random.choice(team_members).get("nickname", "你的怪獸")
                chosen_event["description"] = chosen_event.get("description_template", "").format(monster_name=random_monster_name)
            chosen_event.pop("description_template", None)
            event_data = chosen_event

    if not event_data:
        event_data = {
            "event_type": "generic", "name": "前進",
            "description": "你們繼續小心翼翼地前進，但似乎沒有發生任何特別的事。",
            "choices": [{"choice_id": "CONTINUE", "text": "繼續探索"}]
        }

    progress["current_event"] = event_data
    return {"success": True, "event_data": event_data, "updated_progress": progress}

def complete_floor_service(player_data: PlayerGameData, game_configs: GameConfigs) -> Dict[str, Any]:
    """
    處理玩家通關一層並晉級的邏輯。
    """
    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        return {"success": False, "error": "沒有正在進行的遠征，無法結算樓層。"}

    current_floor = progress.get("current_floor", 1)
    
    facility_id = progress.get("facility_id")
    all_islands = game_configs.get("adventure_islands", [])
    facility_data = next((fac for island in all_islands for fac in island.get("facilities", []) if fac.get("facilityId") == facility_id), None)
    
    if facility_data:
        base_gold = facility_data.get("floor_clear_base_gold", 50)
        bonus_per_floor = facility_data.get("floor_clear_bonus_gold_per_floor", 10)
    else:
        adv_settings = game_configs.get("adventure_settings", {})
        base_gold = adv_settings.get("floor_clear_base_gold", 50)
        bonus_per_floor = adv_settings.get("floor_clear_bonus_gold_per_floor", 10)

    gold_reward = base_gold + ((current_floor -1) * bonus_per_floor)
    
    stats = progress.get("expedition_stats")
    if stats:
        stats["gold_obtained"] = stats.get("gold_obtained", 0) + gold_reward
    
    player_stats = player_data.get("playerStats", {})
    player_stats["gold"] = player_stats.get("gold", 0) + gold_reward
    
    progress["current_floor"] += 1
    progress["current_step"] = 0
    progress["current_event"] = None 
    
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 已通關第 {current_floor} 層，獲得 {gold_reward} 金幣，並前進到第 {progress['current_floor']} 層。")
    
    return {
        "success": True,
        "message": f"恭喜通關第 {current_floor} 層！獲得 {gold_reward} 金幣獎勵！",
        "updated_progress": progress
    }

def resolve_event_choice_service(player_data: PlayerGameData, choice_id: str, game_configs: GameConfigs) -> Dict[str, Any]:
    """
    處理玩家對事件做出的選擇，並返回結果。
    """
    cleaned_choice_id = choice_id.strip()
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 對事件做出了選擇: '{cleaned_choice_id}' (原始: '{choice_id}')")
    
    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        return {"success": False, "error": "沒有正在進行的遠征。"}
    
    current_event = progress.get("current_event")
    if not current_event:
        return {"success": False, "error": "當前沒有需要回應的事件。"}

    stats = progress.get("expedition_stats")
    applied_effects = []
    
    if "last_event_growth" in progress:
        del progress["last_event_growth"]

    chosen_outcome = None
    
    adventure_logger.info(f"正在當前事件 '{current_event.get('name')}' 中尋找選項...")
    for choice in current_event.get("choices", []):
        event_choice_id = choice.get("choice_id", "").strip()
        adventure_logger.info(f"  - 正在檢查選項ID: '{event_choice_id}' ...")
        
        if event_choice_id == cleaned_choice_id:
            adventure_logger.info(f"  ✓ 成功匹配選項 '{event_choice_id}'!")
            outcomes = choice.get("outcomes", [])
            if not outcomes:
                adventure_logger.warning("  ! 匹配的選項沒有 'outcomes' 列表。")
                break

            outcome_pool = [o for o in outcomes if o.get("weight", 0) > 0]
            if not outcome_pool:
                adventure_logger.warning("  ! 'outcomes' 列表中沒有任何權重>0的有效結果。")
                break

            weights = [o["weight"] for o in outcome_pool]
            chosen_outcome = random.choices(outcome_pool, weights=weights, k=1)[0]
            adventure_logger.info(f"  - 已根據權重選擇結果。")
            break
            
    team_members = progress.get("expedition_team", [])
    monster_for_story = random.choice(team_members) if team_members else {"nickname": "隊伍"}
    monster_name_for_story = monster_for_story.get("nickname", "隊伍")
            
    if not chosen_outcome:
        adventure_logger.warning(f"事件處理完畢，但 'chosen_outcome' 仍為 None。將返回預設訊息。事件: {current_event.get('name')}, 玩家選擇: {cleaned_choice_id}")
        outcome_story = "你們的選擇似乎沒有引起任何變化。"
    else:
        raw_story_fragment = chosen_outcome.get("story_fragment", "什麼事都沒發生。")
        outcome_story = raw_story_fragment.format(monster_name=monster_name_for_story)

        for effect in chosen_outcome.get("effects", []):
            effect_type = effect.get("effect")
            
            if stats: 
                if effect_type == "change_resource":
                    resource = effect.get("resource")
                    amount = effect.get("amount", 0)
                    
                    if resource == "gold":
                        if amount > 0: stats["gold_obtained"] += amount
                        player_data["playerStats"]["gold"] = player_data["playerStats"].get("gold", 0) + amount

                    elif resource in ["hp", "mp"]:
                        targets_to_affect = []
                        if effect.get("target") == "team_all": targets_to_affect = team_members
                        elif effect.get("target") in ["team_random_one", "member_who_chose", "team_strongest_def", "team_strongest", "team_fastest"] and team_members:
                            targets_to_affect = [random.choice(team_members)]
                        
                        for member in targets_to_affect:
                            key_current = f"current_{resource}"
                            original_value = member.get(key_current, 0)
                            
                            full_monster = next((m for m in player_data.get("farmedMonsters",[]) if m["id"] == member["monster_id"]), None)
                            if full_monster:
                                max_value = full_monster.get(f"initial_max_{resource}", original_value)
                                new_value = min(max_value, original_value + amount)
                                new_value = max(0, new_value)
                                member[key_current] = new_value

                                actual_change = new_value - original_value
                                if actual_change > 0:
                                    stats[f"{resource}_healed"] += actual_change
                                elif actual_change < 0:
                                    stats[f"{resource}_consumed"] += abs(actual_change)

                elif effect_type == "give_item":
                    if effect.get("item_type") == "dna":
                        stats["dna_fragments_obtained"] += effect.get("quantity", 1)
                    
                    pool_id = effect.get("item_pool_id", "")
                    quantity = effect.get("quantity", 1)
                    dna_pool = [dna for dna in game_configs.get("dna_fragments", []) if pool_id in dna.get("id")]
                    if dna_pool:
                        for _ in range(quantity):
                            item = random.choice(dna_pool)
                            progress.get("adventure_inventory", []).append(item)

                elif effect_type == "apply_temp_buff":
                    stats["buffs_received"] += 1
                    applied_effects.append({"type": "buff", "stat": effect.get("stat", "未知")})
                
                elif effect_type == "apply_temp_debuff":
                    stats["debuffs_received"] += 1
                    applied_effects.append({"type": "debuff", "stat": effect.get("stat", "未知")})

    progress["current_event"] = None

    random_growth_result = _handle_random_growth_event(player_data, progress, game_configs)
    
    if random_growth_result:
        progress["last_event_growth"] = random_growth_result

    return {
        "success": True, 
        "outcome_story": outcome_story, 
        "updated_progress": progress,
        "applied_effects": applied_effects
    }

def switch_captain_service(player_data: PlayerGameData, monster_id_to_promote: str) -> Optional[PlayerGameData]:
    """
    更換遠征隊隊長，並記錄更換次數。
    """
    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        adventure_logger.warning("嘗試更換隊長，但沒有正在進行的遠征。")
        return None

    team = progress.get("expedition_team", [])
    
    member_index = -1
    for i, member in enumerate(team):
        if member["monster_id"] == monster_id_to_promote:
            member_index = i
            break
            
    if member_index <= 0:
        adventure_logger.warning(f"更換隊長失敗：怪獸 {monster_id_to_promote} 不在隊伍中或已是隊長。")
        return None

    member_to_promote = team.pop(member_index)
    team.insert(0, member_to_promote)
    
    stats = progress.get("expedition_stats")
    if stats:
        stats["captain_switches"] = stats.get("captain_switches", 0) + 1
        adventure_logger.info(f"隊長已更換為 {monster_id_to_promote}。更換次數: {stats['captain_switches']}.")
        
    progress["expedition_team"] = team
    player_data["adventure_progress"] = progress
    
    return player_data
