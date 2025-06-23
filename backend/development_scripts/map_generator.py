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

# 地形閾值
WATER_LEVEL = -0.2
MOUNTAIN_LEVEL = 0.5
FOREST_DENSITY = 0.4 # 森林密度

# 事件點 Emoji
EMPTY = " "
TREE = "🌳"
WATER = "💧"
MOUNTAIN = "⛰️"
MONSTER = "👾"
TREASURE = "🎁"
CASTLE = "🏰"
VILLAGE = "🛖"

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
            # 使用 pnoise2 生成柏林雜訊值
            noise_val = noise.pnoise2(x / TERRAIN_SCALE, 
                                      y / TERRAIN_SCALE, 
                                      octaves=TERRAIN_OCTAVES, 
                                      persistence=TERRAIN_PERSISTENCE, 
                                      lacunarity=TERRAIN_LACUNARITY, 
                                      repeatx=MAP_WIDTH, 
                                      repeaty=MAP_HEIGHT, 
                                      base=0)
            
            if noise_val < WATER_LEVEL:
                world_map[y][x] = WATER
            elif noise_val > MOUNTAIN_LEVEL:
                world_map[y][x] = MOUNTAIN
    
    # 3. 生成森林 (使用元胞自動機使其群聚)
    print("正在種植森林...")
    # 隨機撒下種子
    for y in range(MAP_HEIGHT):
        for x in range(MAP_WIDTH):
            if world_map[y][x] == EMPTY and random.random() < FOREST_DENSITY / 3:
                 world_map[y][x] = TREE
    
    # 迭代生長
    for _ in range(3): # 迭代次數越多，森林越茂密
        new_map = [row[:] for row in world_map]
        for y in range(1, MAP_HEIGHT - 1):
            for x in range(1, MAP_WIDTH - 1):
                if new_map[y][x] == EMPTY:
                    # 計算周圍的樹木數量
                    tree_neighbors = 0
                    for j in range(-1, 2):
                        for i in range(-1, 2):
                            if new_map[y+j][x+i] == TREE:
                                tree_neighbors += 1
                    if tree_neighbors >= 3: # 如果周圍樹多，自己也長成樹
                         new_map[y][x] = TREE
        world_map = new_map

    # 4. 放置特殊地點 (城堡和村莊)
    print("正在建立聚落...")
    for _ in range(5): # 放置 5 個城堡
        place_structure(world_map, CASTLE, min_dist=10)
        
    for _ in range(10): # 放置 10 個村莊
        place_structure(world_map, VILLAGE, min_dist=5)

    # 5. 放置怪物和寶物
    print("正在散佈怪物與寶藏...")
    for y in range(MAP_HEIGHT):
        for x in range(MAP_WIDTH):
            if world_map[y][x] == EMPTY:
                if random.random() < 0.05: # 5% 的機率是怪物
                    world_map[y][x] = MONSTER
                elif random.random() < 0.02: # 2% 的機率是寶箱
                    world_map[y][x] = TREASURE

    print("地圖生成完畢！")
    return world_map

def place_structure(world_map, structure_char, min_dist):
    """
    在地圖上放置一個建築，並確保周圍是空地。
    """
    while True:
        x = random.randint(min_dist, MAP_WIDTH - min_dist - 1)
        y = random.randint(min_dist, MAP_HEIGHT - min_dist - 1)
        
        # 檢查目標點及周圍是否為空地
        can_place = True
        for j in range(-2, 3):
            for i in range(-2, 3):
                if world_map[y+j][x+i] != EMPTY:
                    can_place = False
                    break
            if not can_place:
                break
        
        if can_place:
            world_map[y][x] = structure_char
            break

def save_map_to_json(world_map, filename="world_map_data.json"):
    """
    將生成的地圖儲存為 JSON 檔案。
    """
    # 找到 backend/data 資料夾的路徑
    backend_dir = os.path.dirname(os.path.dirname(__file__)) # 退兩層到 backend
    data_dir = os.path.join(backend_dir, 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        
    filepath = os.path.join(data_dir, filename)
    
    map_data = {
        "width": MAP_WIDTH,
        "height": MAP_HEIGHT,
        "map": world_map
    }
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(map_data, f, ensure_ascii=False, indent=2)
        
    print(f"地圖已成功儲存至：{filepath}")


if __name__ == '__main__':
    # 這段程式碼只有在直接運行此腳本時才會執行
    
    # 修正路徑，確保能找到 backend 資料夾
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    sys.path.insert(0, project_root)

    generated_map = generate_world_map()
    save_map_to_json(generated_map)