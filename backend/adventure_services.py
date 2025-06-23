# backend/adventure_services.py
# 包含所有「冒險島」的核心邏輯，如開始遠征、地圖生成、移動和事件處理。

import logging
import random
import time
from typing import List, Dict, Optional, Any
import os
import json

# 導入遊戲核心及冒險島專用的資料模型
from .MD_models import PlayerGameData, GameConfigs, Monster
from .adventure_models import AdventureProgress, MapData, MapNode

# 建立此服務專用的日誌記錄器
adventure_logger = logging.getLogger(__name__)

# --- 新增：讀取所有島嶼資料的服務 ---
def get_all_islands_service() -> List[Dict[str, Any]]:
    """
    從本地 JSON 檔案讀取所有冒險島的設定資料。
    """
    adventure_logger.info("正在從 adventure_islands.json 讀取島嶼資料...")
    try:
        # 建立相對於目前檔案位置的路徑
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
    (目前為預留函式，未來將實作詳細的隨機地圖生成演算法)
    """
    adventure_logger.info(f"為設施 {facility_id} 生成新的冒險地圖...")
    # TODO: 根據 facility_id 讀取設定，生成節點和路徑
    
    # 暫時返回一個固定的範例地圖結構
    placeholder_map: MapData = {
        "nodes": [
            {"id": "node_start", "type": "start", "position": {"x": 0, "y": 2}, "is_cleared": True},
            {"id": "node_combat_1", "type": "combat", "position": {"x": 1, "y": 1}, "is_cleared": False},
            {"id": "node_treasure_1", "type": "treasure", "position": {"x": 1, "y": 3}, "is_cleared": False},
            {"id": "node_boss", "type": "boss", "position": {"x": 2, "y": 2}, "is_cleared": False}
        ],
        "paths": [
            ["node_start", "node_combat_1"],
            ["node_start", "node_treasure_1"],
            ["node_combat_1", "node_boss"],
            ["node_treasure_1", "node_boss"]
        ]
    }
    return placeholder_map

# --- 遠征管理服務 (Expedition Management Services) ---

def start_expedition_service(player_data: PlayerGameData, island_id: str, facility_id: str, team_monster_ids: List[str], game_configs: GameConfigs) -> Optional[PlayerGameData]:
    """
    處理玩家開始一次新的遠征。
    (目前為預留函式)
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 嘗試在島嶼 {island_id} 的設施 {facility_id} 開始遠征。")
    # 1. 驗證玩家金幣、等級等是否滿足設施要求
    # 2. 驗證選擇的怪獸是否有效且處於可遠征狀態
    # 3. 扣除費用
    # 4. 呼叫 generate_adventure_map_service 生成地圖
    # 5. 建立 AdventureProgress 物件並存入玩家資料
    # 6. 返回更新後的玩家資料
    
    # Placeholder logic
    pass
    return player_data


def end_expedition_service(player_data: PlayerGameData, is_successful: bool) -> Optional[PlayerGameData]:
    """
    處理玩家結束一次遠征（無論成功或失敗）。
    (目前為預留函式)
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 結束了遠征。成功狀態: {is_successful}")
    # 1. 根據 is_successful 結算最終獎勵
    # 2. 將 adventure_progress 標記為非活動狀態或將其移除
    # 3. 返回更新後的玩家資料
    
    # Placeholder logic
    pass
    return player_data

# --- 地圖互動服務 (Map Interaction Services) ---

def move_on_adventure_map_service(player_data: PlayerGameData, target_node_id: str) -> Optional[PlayerGameData]:
    """
    處理玩家在地圖上的移動。
    (目前為預留函式)
    """
    adventure_logger.info(f"玩家 {player_data.get('nickname')} 嘗試移動到節點 {target_node_id}。")
    # 1. 驗證目標節點是否與當前節點相連
    # 2. 驗證玩家是否有足夠的探索點數
    # 3. 扣除探索點數
    # 4. 更新玩家的 current_node_id
    # 5. 返回更新後的玩家資料
    
    # Placeholder logic
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
    
    # 1. 根據節點類型（戰鬥、寶箱、泉水等）生成事件結果
    # 2. 可能會觸發戰鬥、給予物品、恢復狀態等
    # 3. 更新 AdventureProgress 中的地圖狀態（如 is_cleared）
    # 4. 返回事件結果與更新後的玩家資料
    
    # Placeholder logic
    event_result = {
        "event_type": "placeholder",
        "description": "你抵達了一個神秘的節點，但什麼也沒發生...",
        "updated_player_data": player_data
    }
    return event_result
