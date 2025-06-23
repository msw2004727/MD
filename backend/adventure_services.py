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
from .adventure_models import AdventureProgress, ExpeditionMemberStatus, AdventureFacility, AdventureIsland

# 建立此服務專用的日誌記錄器
adventure_logger = logging.getLogger(__name__)


def get_all_islands_service() -> List[Dict[str, Any]]:
    """
    從本地 JSON 檔案讀取所有冒險島的設定資料。
    """
    adventure_logger.info("正在從 adventure_islands.json 讀取島嶼資料...")
    try:
        data_file_path = os.path.join(os.path.dirname(__file__), 'data', 'adventure_islands.json')
        
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
    
    if player_data.get("adventure_progress", {}).get("is_active"):
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
    
    # --- 核心修改處 START ---
    # 獲取出戰怪獸的ID
    deployed_monster_id = player_data.get("selectedMonsterId")
    # --- 核心修改處 END ---

    for monster_id in team_monster_ids:
        monster = player_monsters_map.get(monster_id)
        if not monster:
            return None, f"隊伍中包含了無效的怪獸（ID: {monster_id}）。"
            
        # --- 核心修改處 START ---
        # 新增檢查：怪獸是否為出戰怪獸
        if monster_id == deployed_monster_id:
            return None, f"怪獸「{monster.get('nickname')}」正在出戰中，無法參加遠征。"
        # --- 核心修改處 END ---

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
        "story_fragments": [], "adventure_inventory": [], "current_event": None
    }
    player_data["adventure_progress"] = adventure_progress
    
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 的遠征已成功建立。")
    return player_data, None


def _load_boss_pool(boss_pool_id: str) -> List[Dict[str, Any]]:
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'data', boss_pool_id)
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def _load_event_pool(facility_id: str) -> List[Dict[str, Any]]:
    event_file_map = {
        "facility_001": "adventure_events_forest.json",
        "facility_002": "adventure_events_mine.json",
        "facility_003": "adventure_events_cave.json",
        "facility_004": "adventure_events_ruins.json"
    }
    event_file_name = event_file_map.get(facility_id)
    if not event_file_name: return []
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'data', event_file_name)
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def advance_floor_service(player_data: PlayerGameData, game_configs: GameConfigs) -> Dict[str, Any]:
    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        return {"success": False, "error": "沒有正在進行的遠征。"}

    progress["current_step"] += 1
    current_facility_id = progress.get("facility_id")
    event_data = None

    if progress["current_step"] >= progress["total_steps_in_floor"]:
        current_floor = progress.get("current_floor", 1)
        all_islands = game_configs.get("adventure_islands", [])
        facility_data = next((fac for island in all_islands for fac in island.get("facilities", []) if fac.get("facilityId") == current_facility_id), None)
        if facility_data and facility_data.get("boss_pool_id"):
            boss_pool = _load_boss_pool(facility_data["boss_pool_id"])
            if boss_pool:
                base_boss = random.choice(boss_pool).copy()
                if current_floor > 1:
                    growth_factor = 1.1 ** (current_floor - 1)
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
        all_events = _load_event_pool(current_facility_id)
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

def complete_floor_service(player_data: PlayerGameData) -> Dict[str, Any]:
    """
    處理玩家通關一層並晉級的邏輯。
    """
    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        return {"success": False, "error": "沒有正在進行的遠征，無法結算樓層。"}

    current_floor = progress.get("current_floor", 1)
    gold_reward = 50 + (current_floor * 10)
    
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
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 對事件做出了選擇: {choice_id}...")
    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        return {"success": False, "error": "沒有正在進行的遠征。"}
    
    current_event = progress.get("current_event")
    if not current_event:
        return {"success": False, "error": "當前沒有需要回應的事件。"}

    chosen_outcome = None
    for choice in current_event.get("choices", []):
        if choice.get("choice_id") == choice_id:
            outcomes = choice.get("outcomes", [])
            if not outcomes: break
            
            outcome_pool = [o for o in outcomes if o.get("weight", 0) > 0]
            if not outcome_pool: break
            
            weights = [o["weight"] for o in outcome_pool]
            chosen_outcome = random.choices(outcome_pool, weights=weights, k=1)[0]
            break
            
    if not chosen_outcome:
        return {"success": False, "error": "無效的選擇或事件格式錯誤。"}

    outcome_story = chosen_outcome.get("story_fragment", "什麼事都沒發生。")
    for effect in chosen_outcome.get("effects", []):
        effect_type = effect.get("effect")
        target_type = effect.get("target")
        
        if effect_type == "change_resource":
            resource = effect.get("resource")
            amount = effect.get("amount", 0)
            if resource == "gold":
                player_data["playerStats"]["gold"] = player_data["playerStats"].get("gold", 0) + amount
            elif resource in ["hp", "mp"]:
                team = progress.get("expedition_team", [])
                targets_to_affect = []
                if target_type == "team_all":
                    targets_to_affect = team
                elif target_type == "team_random_one" and team:
                    targets_to_affect = [random.choice(team)]

                for member in targets_to_affect:
                    key = f"current_{resource}"
                    full_monster = next((m for m in player_data.get("farmedMonsters",[]) if m["id"] == member["monster_id"]), None)
                    if full_monster:
                        max_value = full_monster.get(f"initial_max_{resource}", member.get(key, 0))
                        member[key] = min(max_value, member.get(key, 0) + amount)
                        member[key] = max(0, member[key])
        
        elif effect_type == "give_item":
            pool_id = effect.get("item_pool_id", "")
            quantity = effect.get("quantity", 1)
            dna_pool = [dna for dna in game_configs.get("dna_fragments", []) if pool_id in dna.get("id")]
            if dna_pool:
                for _ in range(quantity):
                    item = random.choice(dna_pool)
                    progress.get("adventure_inventory", []).append(item)
    
    progress["current_event"] = None

    return {"success": True, "outcome_story": outcome_story, "updated_progress": progress}
