# backend/adventure_services.py
# 包含所有「冒險島」的核心邏輯，如開始遠征、地圖生成、移動和事件處理。

import logging
import random
import time
from typing import List, Dict, Optional, Any, Tuple
import os
import json

# 導入遊戲核心及冒險島專用的資料模型
from .MD_models import PlayerGameData, GameConfigs, Monster, AdventureProgress, MapData, MapNode

# 建立此服務專用的日誌記錄器
adventure_logger = logging.getLogger(__name__)

# --- 讀取所有島嶼資料的服務 ---
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

# --- 地圖生成服務 (Map Generation Services) ---

def generate_adventure_map_service(facility_id: str, game_configs: GameConfigs) -> Optional[MapData]:
    """
    根據設施ID，為一次新的遠征生成隨機的地圖資料。
    """
    adventure_logger.info(f"為設施 {facility_id} 生成新的隨機冒險地圖...")
    
    # --- 地圖生成參數 ---
    MAP_DEPTH = 7  # 地圖總層數（包含起點和終點）
    MAX_NODES_PER_LAYER = 3  # 每層最多節點數
    NODE_TYPE_WEIGHTS = {
        "combat": 60,
        "elite": 15,
        "treasure": 15,
        "fountain": 10
    }
    
    nodes: List[MapNode] = []
    paths: List[List[str]] = []
    layers: List[List[MapNode]] = [[] for _ in range(MAP_DEPTH)]

    # 1. 建立起點和終點
    start_node: MapNode = {"id": "node_start", "type": "start", "position": {"x": 0, "y": 1}, "is_cleared": True}
    layers[0].append(start_node)
    nodes.append(start_node)

    boss_node: MapNode = {"id": "node_boss", "type": "boss", "position": {"x": MAP_DEPTH - 1, "y": 1}, "is_cleared": False}
    layers[MAP_DEPTH - 1].append(boss_node)
    nodes.append(boss_node)
    
    # 2. 建立中間層節點
    for layer_index in range(1, MAP_DEPTH - 2):
        num_nodes = random.randint(2, MAX_NODES_PER_LAYER)
        for node_index in range(num_nodes):
            node_type = random.choices(list(NODE_TYPE_WEIGHTS.keys()), weights=list(NODE_TYPE_WEIGHTS.values()), k=1)[0]
            node: MapNode = {
                "id": f"node_{layer_index}_{node_index}",
                "type": node_type,
                "position": {"x": layer_index, "y": node_index},
                "is_cleared": False
            }
            layers[layer_index].append(node)
            nodes.append(node)
            
    # 3. 建立 Boss 前的休息點
    rest_node: MapNode = {"id": "node_rest", "type": "fountain", "position": {"x": MAP_DEPTH - 2, "y": 1}, "is_cleared": False}
    layers[MAP_DEPTH - 2].append(rest_node)
    nodes.append(rest_node)

    # 4. 生成路徑
    for i in range(MAP_DEPTH - 1):
        current_layer_nodes = layers[i]
        next_layer_nodes = layers[i+1]
        
        for node in current_layer_nodes:
            # 確保每個節點至少有一條出路
            num_paths_out = random.randint(1, 2)
            possible_targets = random.sample(next_layer_nodes, min(num_paths_out, len(next_layer_nodes)))
            for target in possible_targets:
                paths.append([node["id"], target["id"]])
        
        for node in next_layer_nodes:
            # 確保每個節點至少有一條入路
            has_incoming_path = any(p[1] == node["id"] for p in paths)
            if not has_incoming_path:
                random_source = random.choice(current_layer_nodes)
                paths.append([random_source["id"], node["id"]])

    generated_map: MapData = {
        "nodes": nodes,
        "paths": paths
    }
    return generated_map

# --- 遠征管理服務 (Expedition Management Services) ---

def start_expedition_service(player_data: PlayerGameData, island_id: str, facility_id: str, team_monster_ids: List[str], game_configs: GameConfigs) -> Tuple[Optional[PlayerGameData], Optional[str]]:
    """
    處理玩家開始一次新的遠征，並返回更新後的玩家資料及可能的錯誤訊息。
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 嘗試在島嶼 {island_id} 的設施 {facility_id} 開始遠征。")
    
    if player_data.get("adventure_progress", {}).get("is_active"):
        return None, "您已經有一場遠征正在進行中，無法開始新的遠征。"

    all_islands = game_configs.get("adventure_islands", [])
    facility_data = None
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
    
    player_monsters_map = {m["id"]: m for m in player_data.get("farmedMonsters", [])}
    for monster_id in team_monster_ids:
        if monster_id not in player_monsters_map:
            return None, f"隊伍中包含了無效的怪獸（ID: {monster_id}）。"
        monster = player_monsters_map[monster_id]
        if monster.get("farmStatus", {}).get("isTraining"):
            return None, f"怪獸「{monster.get('nickname')}」正在修煉中，無法參加遠征。"
        if monster.get("hp", 0) < monster.get("initial_max_hp", 1) * 0.25:
             return None, f"怪獸「{monster.get('nickname')}」處於瀕死狀態，無法參加遠征。"

    player_data["playerStats"]["gold"] = player_gold - cost

    map_data = generate_adventure_map_service(facility_id, game_configs)
    if not map_data:
        return None, "生成遠征地圖失敗。"
        
    start_node = next((n for n in map_data.get("nodes", []) if n.get("type") == "start"), None)
    if not start_node:
        return None, "地圖資料錯誤，缺少起始點。"

    adventure_progress: AdventureProgress = {
        "is_active": True,
        "island_id": island_id,
        "facility_id": facility_id,
        "expedition_team": team_monster_ids,
        "map_data": map_data,
        "current_node_id": start_node.get("id"),
        "exploration_points": 100,
        "start_timestamp": int(time.time())
    }
    player_data["adventure_progress"] = adventure_progress
    
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 的遠征已成功建立。")
    return player_data, None


def end_expedition_service(player_data: PlayerGameData, is_successful: bool) -> Optional[PlayerGameData]:
    """
    處理玩家結束一次遠征（無論成功或失敗）。
    (目前為預留函式)
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 結束了遠征。成功狀態: {is_successful}")
    pass
    return player_data

# --- 地圖互動服務 (Map Interaction Services) ---

def move_on_adventure_map_service(player_data: PlayerGameData, target_node_id: str) -> Optional[PlayerGameData]:
    """
    處理玩家在地圖上的移動。
    (目前為預留函式)
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 嘗試移動到節點 {target_node_id}。")
    pass
    return player_data


def handle_node_event_service(player_data: PlayerGameData) -> Optional[Dict[str, Any]]:
    """
    根據玩家所在的當前節點，處理觸發的事件。
    (目前為預留函式)
    """
    progress = player_data.get("adventure_progress")
    if not progress or not progress.get("is_active"):
        return None

    current_node_id = progress.get("current_node_id")
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 在節點 {current_node_id} 觸發事件。")
    
    event_result = {
        "event_type": "placeholder",
        "description": "你抵達了一個神秘的節點，但什麼也沒發生...",
        "updated_player_data": player_data
    }
    return event_result
