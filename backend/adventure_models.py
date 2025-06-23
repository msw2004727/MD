# backend/adventure_models.py
# 專門定義「冒險島」相關的所有資料結構

from typing import List, Dict, TypedDict, Optional, Any

# --- 【新增】用來記錄遠征隊中，每個成員在當次冒險中的狀態 ---
class ExpeditionMemberStatus(TypedDict):
    """定義遠征隊成員在冒險中的即時狀態"""
    monster_id: str  # 對應的怪獸ID
    nickname: str    # 怪獸的暱稱
    current_hp: int
    current_mp: int
    status_effects: List[Any] # 存放異常狀態

# --- 【修改】重新定義 AdventureProgress 以符合樓層式玩法 ---
class AdventureProgress(TypedDict):
    """定義玩家當前的冒險進度（樓層式）"""
    is_active: bool
    island_id: str
    facility_id: str
    
    start_timestamp: int
    expedition_team: List[ExpeditionMemberStatus] # 從儲存ID列表，改為儲存包含即時狀態的物件列表

    current_floor: int  # 當前所在的樓層
    current_step: int   # 在當前樓層的進度 (0-4)
    total_steps_in_floor: int # 當前樓層的總步數 (通常是5)
    
    story_fragments: List[Dict[str, str]] # 存放AI生成的故事片段，例如: [{"choice": "text", "outcome": "story"}]
    adventure_inventory: List[Any] # 冒險中獲得的臨時物品
    
# --- 【移除】舊的網格地圖相關定義 ---
# MapNode 與 MapData 已被移除

# --- 【新增】用於定義設施與島嶼的結構，以便服務層使用 ---
class AdventureFacility(TypedDict):
    """定義單一冒險設施的資料結構"""
    facilityId: str
    name: str
    description: str
    cost: int
    level_range: List[int]
    loot_table_id: str

class AdventureIsland(TypedDict):
    """定義單一冒險島嶼的資料結構"""
    islandId: str
    islandName: str
    description: str
    backgrounds: Dict[str, str]
    facilities: List[AdventureFacility]
