# backend/development_scripts/map_generator.py
# 一個離線腳本，用於生成隨機的世界地圖並儲存為 JSON 檔案。
# 這個腳本不應該被 Flask 伺服器直接呼叫，而是在開發階段手動運行以產生靜態地圖資料。

import json
import random
import os
import sys

# --- 路徑設定，確保可以導入 noise 模組 ---
# 假設 noise 模組會被安裝在專案的虛擬環境中
# 如果您在本地運行，請確保已安裝 `noise` 套件: pip install noise

try:
    import noise
except ImportError:
    print("錯誤：找不到 'noise' 模組。")
    print("請使用 'pip install noise' 來安裝它。")
    sys.exit(1)

# --- 地圖參數設定 ---
MAP_WIDTH = 100  # 地圖寬度
MAP_HEIGHT = 100  # 地圖高度

# 地形生成的雜訊參數
TERRAIN_SCALE = 50.0  # 雜訊縮放比例，數值越大，地形變化越平緩
TERRAIN_OCTAVES = 6  # 雜訊八度，增加細節
TERRAIN_PERSISTENCE = 0.5  # 持續性
TERRAIN_LACUNARITY = 2.0  # 空隙度

# --- 核心修改處 START ---
# 調整地形閾值，讓基礎地形（障礙物）更多樣
WATER_LEVEL = -0.2
MOUNTAIN_LEVEL = 0.35
# --- 核心修改處 END ---


# 地圖物件圖示
EMPTY = " "
TREE = "🌳"
WATER = "💧"
MOUNTAIN = "⛰️"
MONSTER = "👾"
TREASURE = "🎁"
CASTLE = "🏰"
VILLAGE = "🛖"
PORTAL = "✨"
UNKNOWN_EVENT = "❓"
ARENA = "⚔️"
RARE_MINE = "💎"
SPIDER_WEB = "🕸️"
ANCIENT_TEMPLE = "🏛️"

def generate_world_map():
    """
    使用 Perlin Noise 生成一個 100x100 的世界地圖。
    """
    print(f"開始生成 {MAP_WIDTH}x{MAP_HEIGHT} 的世界地圖...")
    
    # 1. 初始化一個空的地圖
    world_map = [[EMPTY for _ in range(MAP_WIDTH)] for _ in range(MAP_HEIGHT)]
    
    # 2. 生成地形 (山脈和水域)
    print("正在生成地形...")
    for y in range(MAP_HEIGHT):
        for x in range(MAP_WIDTH):
            noise_val = noise.pnoise2(x / TERRAIN_SCALE, 
                                      y / TERRAIN_SCALE, 
                                      octaves=TERRAIN_OCTAVES, 
                                      persistence=TERRAIN_PERSISTENCE, 
                                      lacunarity=TERRAIN_LACUNARITY, 
                                      repeatx=MAP_WIDTH, 
                                      repeaty=MAP_HEIGHT, 
                                      base=random.randint(0, 100)) # 使用隨機種子增加多樣性
            
            if noise_val < WATER_LEVEL:
                world_map[y][x] = WATER
            elif noise_val > MOUNTAIN_LEVEL:
                world_map[y][x] = MOUNTAIN
    
    # 3. 放置特殊地點 (城堡、村莊等)，確保它們不會被後續步驟覆蓋
    print("正在建立聚落與特殊地點...")
    placed_structures = []
    for _ in range(3): place_structure(world_map, CASTLE, placed_structures, min_dist=15)
    for _ in range(8): place_structure(world_map, VILLAGE, placed_structures, min_dist=8)
    for _ in range(3): place_structure(world_map, ANCIENT_TEMPLE, placed_structures, min_dist=10)
    for _ in range(2): place_structure(world_map, ARENA, placed_structures, min_dist=12)
    for _ in range(4): place_structure(world_map, PORTAL, placed_structures, min_dist=5)


    # --- 核心修改處 START ---
    # 4. 在剩餘的空地上高密度地填充隨機物件
    print("正在高密度填充隨機事件與植被...")

    # 定義填充物件的類型及其權重（權重越高，出現機率越大）
    fill_objects = [TREE, TREE, TREE, TREE, TREE, # 樹木有較高權重
                    MONSTER, MONSTER, 
                    TREASURE, 
                    RARE_MINE, 
                    SPIDER_WEB, 
                    UNKNOWN_EVENT,
                    EMPTY, EMPTY] # 保留一些空地
    weights =      [20, 20, 20, 20, 20,
                    8, 8,
                    4,
                    1,
                    3,
                    3,
                    10, 10]

    for y in range(MAP_HEIGHT):
        for x in range(MAP_WIDTH):
            # 只在尚未被佔用的空地上進行填充
            if world_map[y][x] == EMPTY:
                # 使用加權隨機選擇來決定這個格子放什麼
                chosen_object = random.choices(fill_objects, weights=weights, k=1)[0]
                world_map[y][x] = chosen_object
    # --- 核心修改處 END ---

    print("地圖生成完畢！")
    return world_map

def place_structure(world_map, structure_char, placed_structures, min_dist):
    """
    在地圖上放置一個建築，並確保周圍是空地且與其他建築保持距離。
    """
    for _ in range(200): # 增加嘗試次數以提高成功率
        x = random.randint(min_dist, MAP_WIDTH - min_dist - 1)
        y = random.randint(min_dist, MAP_HEIGHT - min_dist - 1)
        
        # 檢查與已放置建築的距離
        too_close = False
        for sx, sy in placed_structures:
            distance = math.sqrt((x - sx)**2 + (y - sy)**2)
            if distance < min_dist:
                too_close = True
                break
        if too_close:
            continue

        # 檢查周圍是否為空地
        can_place = True
        for j in range(-1, 2):
            for i in range(-1, 2):
                if world_map[y+j][x+i] != EMPTY:
                    can_place = False
                    break
            if not can_place:
                break
        
        if can_place:
            world_map[y][x] = structure_char
            placed_structures.append((x, y)) # 記錄已放置的位置
            return
    print(f"警告：嘗試多次後仍找不到合適位置來放置 {structure_char}")


def save_map_to_json(world_map, filename="world_map_data.json"):
    """
    將生成的地圖儲存為 JSON 檔案。
    """
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    data_dir = os.path.join(backend
