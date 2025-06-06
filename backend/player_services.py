# backend/player_services.py
# 處理與玩家數據相關的核心服務，如讀取、儲存、更新等

from .MD_firebase_config import db
from .MD_models import PlayerData
from .MD_config_services import load_game_configs
import logging
import random # 引入 random 模組

# 設定日誌記錄器
player_logger = logging.getLogger(__name__)

# --- Firestore 資料庫集合參考 ---
players_collection = db.collection('players')
users_collection = db.collection('users')

async def get_player_data(player_id: str) -> dict:
    """
    從 Firestore 根據 player_id 獲取玩家數據。
    """
    player_logger.info(f"正在為 player_id: {player_id} 獲取玩家數據...")
    try:
        player_doc_ref = players_collection.document(player_id)
        player_doc = await player_doc_ref.get()
        if player_doc.exists:
            player_logger.info(f"成功為 player_id: {player_id} 獲取到玩家數據。")
            return player_doc.to_dict()
        else:
            player_logger.warning(f"找不到 player_id: {player_id} 的玩家數據。")
            return None
    except Exception as e:
        player_logger.error(f"為 player_id: {player_id} 獲取玩家數據時出錯: {e}", exc_info=True)
        return None

async def save_player_data(player_id: str, player_data: dict) -> bool:
    """
    將玩家數據儲存到 Firestore。
    """
    player_logger.info(f"正在儲存 player_id: {player_id} 的玩家數據...")
    try:
        player_doc_ref = players_collection.document(player_id)
        # 在儲存前更新 lastSave 時間戳
        import time
        player_data['lastSave'] = int(time.time())
        await player_doc_ref.set(player_data)
        player_logger.info(f"成功儲存 player_id: {player_id} 的玩家數據。")
        return True
    except Exception as e:
        player_logger.error(f"為 player_id: {player_id} 儲存玩家數據時出錯: {e}", exc_info=True)
        return False

async def create_new_player(player_id: str, nickname: str) -> dict:
    """
    為新玩家創建一個初始的玩家數據結構。
    """
    player_logger.info(f"正在為 player_id: {player_id} (暱稱: {nickname}) 創建新玩家數據...")
    try:
        # 載入遊戲基本設定
        game_configs = await load_game_configs()
        if not game_configs:
            raise Exception("無法載入遊戲基本設定，無法創建新玩家。")

        initial_inventory_size = game_configs.get('value_settings', {}).get('initial_inventory_size', 12)

        # 創建一個 PlayerData 實例以利用 Pydantic 的預設值和結構
        new_player = PlayerData(
            id=player_id,
            nickname=nickname,
            playerOwnedDNA=[None] * initial_inventory_size,
            farmedMonsters=[],
            playerStats={
                "nickname": nickname,
                "rank": "新手訓練師",
                "score": 0,
                "wins": 0,
                "losses": 0,
                "medals": 0,
                "titles": ["初出茅廬"],
                "achievements": []
            }
        )
        
        # 將 Pydantic 模型轉換為字典以便存儲
        player_data_dict = new_player.dict()
        
        # 儲存到 Firestore
        await save_player_data(player_id, player_data_dict)
        
        player_logger.info(f"成功為 player_id: {player_id} 創建並儲存新玩家數據。")
        return player_data_dict
    except Exception as e:
        player_logger.error(f"為 player_id: {player_id} 創建新玩家時出錯: {e}", exc_info=True)
        return None

def find_player_by_nickname(nickname: str):
    """
    通過暱稱查找玩家的 UID (同步版本)。
    注意：在異步環境中，應使用異步版本。
    """
    player_logger.info(f"正在通過暱稱 '{nickname}' 同步查找玩家...")
    try:
        # Firestore 的 `where` 方法需要一個流式查詢
        users_stream = users_collection.where('nickname', '==', nickname).limit(1).stream()
        for user in users_stream:
            player_logger.info(f"成功找到暱稱為 '{nickname}' 的玩家，UID: {user.id}")
            return user.id
        player_logger.warning(f"找不到暱稱為 '{nickname}' 的玩家。")
        return None
    except Exception as e:
        player_logger.error(f"通過暱稱 '{nickname}' 查找玩家時出錯: {e}", exc_info=True)
        return None

async def find_player_by_nickname_async(nickname: str) -> str:
    """
    通過暱稱查找玩家的 UID (異步版本)。
    """
    player_logger.info(f"正在通過暱稱 '{nickname}' 異步查找玩家...")
    try:
        users_stream = users_collection.where('nickname', '==', nickname).limit(1).stream()
        async for user in users_stream:
            player_logger.info(f"成功找到暱稱為 '{nickname}' 的玩家，UID: {user.id}")
            return user.id
        player_logger.warning(f"找不到暱稱為 '{nickname}' 的玩家。")
        return None
    except Exception as e:
        player_logger.error(f"通過暱稱 '{nickname}' 查找玩家時出錯: {e}", exc_info=True)
        return None

async def draw_free_dna() -> list:
    """
    執行免費的 DNA 抽取。
    規則：
    1. 隨機抽取 3 到 5 個 DNA。
    2. 卡池中只包含“普通”和“稀有”等級的 DNA。
    """
    player_logger.info("正在執行免費 DNA 抽取...")
    try:
        game_configs = await load_game_configs()
        if not game_configs or 'dna_fragments' not in game_configs:
            player_logger.error("無法載入 DNA 碎片設定，抽取失敗。")
            return []

        all_dna_fragments = game_configs['dna_fragments']
        
        # 1. 篩選卡池，只保留 '普通' 和 '稀有'
        allowed_rarities = {"普通", "稀有"}
        filtered_pool = [
            dna for dna in all_dna_fragments 
            if dna.get('rarity') in allowed_rarities
        ]

        if not filtered_pool:
            player_logger.error("篩選後的 DNA 卡池為空，無法抽取。")
            return []
            
        # 2. 決定本次抽取的數量 (3 到 5 個)
        num_to_draw = random.randint(3, 5)
        
        # 3. 從篩選後的卡池中隨機抽取 DNA
        # random.choices 允許重複選取，適合模擬抽卡
        drawn_dna_templates = random.choices(filtered_pool, k=num_to_draw)
        
        player_logger.info(f"成功抽取了 {num_to_draw} 個 DNA。")
        
        # 返回的是 DNA 的模板，前端可以用來顯示，後續再生成實例
        return drawn_dna_templates

    except Exception as e:
        player_logger.error(f"執行免費 DNA 抽取時發生錯誤: {e}", exc_info=True)
        return []

