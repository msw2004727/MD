# backend/adventure_models.py
# 專門定義「冒險島」相關的所有資料結構
from typing import List, Dict, TypedDict

class AdventureFacility(TypedDict):
    """定義單一冒險設施的資料結構"""
    id: str
    name: str
    description: str
    cost: int
    min_exploration_level: int
    boss_id: str
    loot_table_id: str

class AdventureIsland(TypedDict):
    """定義單一冒險島嶼的資料結構"""
    id: str
    name: str
    background_image_url: str
    facilities: List[AdventureFacility]

class MapNode(TypedDict):
    """定義探索地圖上一個節點的資料結構"""
    id: str
    type: str  # 'start', 'combat', 'elite', 'treasure', 'fountain', 'merchant', 'boss'
    position: Dict[str, int]  # { "x": 1, "y": 2 }
    is_cleared: bool

class MapData(TypedDict):
    """定義一次遠征的地圖資料"""
    nodes: List[MapNode]
    paths: List[List[str]]  # e.g., [["node_1", "node_2"], ["node_2", "node_3"]]

class AdventureProgress(TypedDict):
    """定義玩家當前的冒險進度"""
    is_active: bool
    island_id: str
    facility_id: str
    expedition_team: List[str]  # 儲存怪獸的 ID
    map_data: MapData
    current_node_id: str
    exploration_points: int
    start_timestamp: int
