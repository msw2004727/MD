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
    
    # 1. 驗證玩家是否已在遠征中
    if player_data.get("adventure_progress", {}).get("is_active"):
        return None, "您已經有一場遠征正在進行中，無法開始新的遠征。"

    # 2. 獲取設施資料並驗證費用
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

    # 3. 驗證隊伍成員
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
        
        # 建立隊員在本次冒險中的狀態快照
        member_status: ExpeditionMemberStatus = {
            "monster_id": monster["id"],
            "nickname": monster["nickname"],
            "current_hp": monster["hp"],
            "current_mp": monster["mp"],
            "status_effects": []
        }
        expedition_team_status.append(member_status)

    # 4. 扣除費用並建立新的冒險進度
    player_data["playerStats"]["gold"] = player_gold - cost

    adventure_progress: AdventureProgress = {
        "is_active": True,
        "island_id": island_id,
        "facility_id": facility_id,
        "start_timestamp": int(time.time()),
        "expedition_team": expedition_team_status,
        "current_floor": 1,
        "current_step": 0,
        "total_steps_in_floor": 5,
        "story_fragments": [],
        "adventure_inventory": []
    }
    player_data["adventure_progress"] = adventure_progress
    
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 的遠征已成功建立。")
    return player_data, None


def advance_floor_service(player_data: PlayerGameData, game_configs: GameConfigs) -> Dict[str, Any]:
    """
    處理玩家在地圖上推進一個進度的邏輯。
    (此為後續步驟的核心函式，目前為預留)
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 請求推進樓層進度...")
    # 待辦事項：
    # 1. 增加 current_step。
    # 2. 檢查是否到達樓層終點，若是則觸發BOSS戰。
    # 3. 若否，則從 adventure_events.json 中隨機抽選一個事件。
    # 4. 返回事件資料給前端。
    
    # 預留的回應
    return {"status": "pending_implementation", "message": "推進功能開發中。"}

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
