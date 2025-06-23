# backend/adventure_services.py
# 包含所有「冒險島」的核心邏輯，如開始遠征、地圖生成、移動和事件處理。

import logging
import random
import time
from typing import List, Dict, Optional, Any, Tuple
import os
import json

# --- 核心修改處 START ---
# 將原本混合的導入，拆分為從各自正確的檔案導入
from .MD_models import PlayerGameData, GameConfigs, Monster
from .adventure_models import AdventureProgress, MapData, MapNode
# --- 核心修改處 END ---

# 建立此服務專用的日誌記錄器
adventure_logger = logging.getLogger(__name__)

# --- 新增：讀取世界地圖資料的全域變數 ---
_world_map_data = None

def _load_world_map_data():
    """
    從 JSON 檔案載入預先生成的世界地圖資料到記憶體中。
    """
    global _world_map_data
    if _world_map_data is not None:
        return _world_map_data

    adventure_logger.info("首次載入世界地圖資料 'world_map_data.json'...")
    try:
        data_file_path = os.path.join(os.path.dirname(__file__), 'data', 'world_map_data.json')
        with open(data_file_path, 'r', encoding='utf-8') as f:
            _world_map_data = json.load(f)
        adventure_logger.info("世界地圖資料已成功載入到記憶體。")
        return _world_map_data
    except Exception as e:
        adventure_logger.error(f"載入 'world_map_data.json' 時發生嚴重錯誤: {e}", exc_info=True)
        return None


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
        adventure_routes_logger.error(f"讀取冒險島資料時發生未知錯誤: {e}", exc_info=True)
        return []

# --- 地圖生成服務 (Map Generation Services) ---

def generate_adventure_map_service(facility_id: str, game_configs: GameConfigs) -> Optional[MapData]:
    """
    從預先生成的大地圖中，隨機切割出一塊 30x30 的區域作為本次遠征地圖。
    """
    adventure_logger.info(f"為設施 {facility_id} 從世界地圖中切割新的冒險區域...")
    
    world_data = _load_world_map_data()
    if not world_data or "map" not in world_data:
        return None

    world_map = world_data["map"]
    world_width = world_data["width"]
    world_height = world_data["height"]
    
    region_size = 30 # 定義要切割的區域大小

    # 隨機選擇起始點
    start_x = random.randint(0, world_width - region_size)
    start_y = random.randint(0, world_height - region_size)
    
    # 切割出 30x30 的區域
    region_map = [row[start_x : start_x + region_size] for row in world_map[start_y : start_y + region_size]]
    
    # 將二維陣列轉換為我們需要的節點列表格式
    nodes: List[MapNode] = []
    
    # 尋找一個合適的起始點 (第一個非障礙物的格子)
    player_start_pos = None
    for y, row in enumerate(region_map):
        for x, tile_char in enumerate(row):
            if tile_char not in ["⛰️", "💧", "🌳"]:
                player_start_pos = {"x": x, "y": y}
                break
        if player_start_pos:
            break
    
    # 如果找不到任何可站立的點（極端情況），則隨機選一個
    if not player_start_pos:
        player_start_pos = {"x": random.randint(0, region_size-1), "y": random.randint(0, region_size-1)}


    # 建立節點列表
    for y, row in enumerate(region_map):
        for x, tile_char in enumerate(row):
            node_id = f"node_{x}_{y}"
            
            # --- 核心修改處 START ---
            # 擴充 Emoji 到節點類型的映射表
            emoji_to_type = {
                "👾": "combat", "🎁": "treasure", "💰": "reward", 
                "🗝️": "key", "🏰": "dungeon", "🛖": "village",
                "✨": "portal", "⚔️": "arena", "💎": "rare_mine",
                "🕸️": "trap", "🏛️": "temple", "❓": "unknown_event",
                "⛰️": "obstacle", "💧": "obstacle", "🌳": "obstacle"
            }
            node_type = emoji_to_type.get(tile_char, "empty")
            # --- 核心修改處 END ---
            
            node: MapNode = {
                "id": node_id,
                "type": node_type,
                "display_char": tile_char, # 新增：顯示用的字元
                "position": {"x": x, "y": y},
                "is_cleared": False
            }
            nodes.append(node)

    generated_map: MapData = {
        "nodes": nodes,
        "paths": [],  # 在網格式地圖中，路徑是隱含的，不需要明確定義
        "player_start_pos": player_start_pos # 新增：告訴前端玩家的起始位置
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
        
    player_start_pos = map_data.get("player_start_pos")
    if not player_start_pos:
        return None, "地圖資料錯誤，缺少玩家起始點。"
        
    current_node_id = f"node_{player_start_pos['x']}_{player_start_pos['y']}"

    adventure_progress: AdventureProgress = {
        "is_active": True,
        "island_id": island_id,
        "facility_id": facility_id,
        "expedition_team": team_monster_ids,
        "map_data": map_data,
        "current_node_id": current_node_id,
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
