# backend/adventure_services.py
# 包含所有「冒險島」的核心邏輯，如開始遠征、地圖生成、移動和事件處理。

import logging
import random
import time
import json
import os
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
    
    for monster_id in team_monster_ids:
        monster = player_monsters_map.get(monster_id)
        if not monster:
            return None, f"隊伍中包含了無效的怪獸（ID: {monster_id}）。"
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
        "story_fragments": [], "adventure_inventory": []
    }
    player_data["adventure_progress"] = adventure_progress
    
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 的遠征已成功建立。")
    return player_data, None


# --- 核心修改處 START ---
def _load_boss_pool(boss_pool_id: str) -> List[Dict[str, Any]]:
    """從指定的JSON檔案載入BOSS資料池。"""
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'data', boss_pool_id)
        with open(file_path, 'r', encoding='utf-8') as f:
            boss_data = json.load(f)
        if isinstance(boss_data, list):
            return boss_data
        adventure_logger.error(f"BOSS檔案 {boss_pool_id} 格式錯誤，根層級不是列表。")
        return []
    except FileNotFoundError:
        adventure_logger.error(f"找不到指定的BOSS檔案：{boss_pool_id}")
        return []
    except json.JSONDecodeError:
        adventure_logger.error(f"解析BOSS檔案 {boss_pool_id} 時發生錯誤。")
        return []

def advance_floor_service(player_data: PlayerGameData, game_configs: GameConfigs) -> Dict[str, Any]:
    """
    處理玩家在地圖上推進一個進度的邏輯。
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 請求推進樓層進度...")
    
    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        return {"success": False, "error": "沒有正在進行的遠征。"}

    progress["current_step"] += 1

    if progress["current_step"] >= progress["total_steps_in_floor"]:
        adventure_logger.info(f"玩家已到達樓層終點 (第 {progress['current_floor']} 層)，觸發 BOSS 戰。")
        
        current_facility_id = progress.get("facility_id")
        all_islands = game_configs.get("adventure_islands", [])
        facility_data = None
        for island in all_islands:
            facility_data = next((fac for fac in island.get("facilities", []) if fac.get("facilityId") == current_facility_id), None)
            if facility_data:
                break
        
        if not facility_data or not facility_data.get("boss_pool_id"):
            return {"success": False, "error": "無法確定當前設施的BOSS。"}
            
        boss_pool = _load_boss_pool(facility_data["boss_pool_id"])
        if not boss_pool:
            return {"success": False, "error": "無法載入BOSS資料。"}
            
        chosen_boss = random.choice(boss_pool)
        
        boss_event = {
            "event_type": "boss_encounter",
            "name": f"強大的氣息！遭遇 {chosen_boss.get('nickname')}！",
            "description": chosen_boss.get("description", "一個巨大的身影擋住了去路！一場惡戰在所難免！"),
            "choices": [{"choice_id": "FIGHT_BOSS", "text": "迎戰！"}],
            "boss_data": chosen_boss
        }
        return {"success": True, "event_data": boss_event, "updated_progress": progress}

    all_events = game_configs.get("adventure_events", [])
    if not all_events:
        adventure_logger.warning("在遊戲設定中找不到任何冒險事件 (adventure_events.json)，返回一個預設事件。")
        default_event = {
            "event_type": "generic", "name": "前進",
            "description": "你們繼續小心翼翼地前進，但似乎沒有發生任何特別的事。",
            "choices": [{"choice_id": "CONTINUE", "text": "繼續探索"}]
        }
        return {"success": True, "event_data": default_event, "updated_progress": progress}

    chosen_event = random.choice(all_events).copy()
    team_members = progress.get("expedition_team", [])
    if team_members:
        random_monster_name = random.choice(team_members).get("nickname", "你的怪獸")
        chosen_event["description"] = chosen_event.get("description_template", "").format(monster_name=random_monster_name)
    
    chosen_event.pop("description_template", None)
    adventure_logger.info(f"為玩家抽選到事件：{chosen_event.get('name')}")
    
    return {"success": True, "event_data": chosen_event, "updated_progress": progress}
# --- 核心修改處 END ---

def resolve_event_choice_service(player_data: PlayerGameData, choice_id: str, game_configs: GameConfigs) -> Dict[str, Any]:
    """
    處理玩家對事件做出的選擇，並返回結果。
    (此為後續步驟的核心函式，目前為預留)
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 對事件做出了選擇: {choice_id}...")
    # 待辦事項：
    # 1. 根據 choice_id 找到對應事件和選項。
    # 2. 根據權重隨機一個結果 (正面/負面/中立)。
    # 3. 呼叫 AI 服務生成對應的故事片段。
    # 4. 將故事片段存入 adventure_progress['story_fragments']。
    # 5. 根據結果的 effects 更新 adventure_progress 中的數據 (HP, 物品等)。
    # 6. 返回結果給前端。

    # 預留的回應
    return {"status": "pending_implementation", "message": "事件處理功能開發中。"}
