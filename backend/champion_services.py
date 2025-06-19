# backend/champion_services.py
# 新增的服務：專門處理冠軍殿堂的資料庫讀寫與邏輯

import logging
import time
from typing import Optional, Dict, List, Any

# 從專案的其他模組導入
from . import MD_firebase_config
from .MD_models import ChampionsData, ChampionSlot, Monster

champion_logger = logging.getLogger(__name__)

# Firestore 中的集合與文件名稱
CHAMPIONS_COLLECTION = "MD_SystemData"
CHAMPIONS_DOCUMENT = "Champions"

def get_champions_data() -> ChampionsData:
    """
    從 Firestore 獲取冠軍殿堂的資料。
    如果文件不存在，會初始化一個空的結構並返回。
    """
    db = MD_firebase_config.db
    # 建立一個預設的空結構
    default_data: ChampionsData = { "rank1": None, "rank2": None, "rank3": None, "rank4": None }
    
    if not db:
        champion_logger.error("Firestore 資料庫未初始化，無法獲取冠軍資料。")
        return default_data

    try:
        doc_ref = db.collection(CHAMPIONS_COLLECTION).document(CHAMPIONS_DOCUMENT)
        doc = doc_ref.get()

        if doc.exists:
            champion_logger.info("成功從 Firestore 獲取冠軍殿堂資料。")
            data = doc.to_dict()
            # 確保所有 rank 鍵都存在，避免前端出錯
            for i in range(1, 5):
                if f"rank{i}" not in data:
                    data[f"rank{i}"] = None
            return data
        else:
            champion_logger.warning("Firestore 中找不到冠軍殿堂文件，將返回一個空的預設結構。")
            # 第一次運行時，建立這個文件
            doc_ref.set(default_data)
            return default_data
    except Exception as e:
        champion_logger.error(f"獲取冠軍殿堂資料時發生錯誤: {e}", exc_info=True)
        return default_data

def get_full_champion_details_service() -> List[Optional[Dict[str, Any]]]:
    """
    獲取四個冠軍席位的完整怪獸資料，並附加擁有者與在位時間戳資訊。
    這是一個高階服務，會整合冠軍資料和玩家怪獸資料。
    """
    champions_info = get_champions_data()
    
    db = MD_firebase_config.db
    if not db:
        champion_logger.error("Firestore 資料庫未初始化，無法獲取怪獸詳細資料。")
        return [None, None, None, None]

    full_details: List[Optional[Dict[str, Any]]] = [None] * 4
    
    # 建立一個需要查詢的玩家ID列表，以優化資料庫讀取
    owners_to_fetch: Dict[str, List[Dict[str, Any]]] = {}
    for i in range(1, 5):
        slot_info: Optional[ChampionSlot] = champions_info.get(f"rank{i}")
        if slot_info and slot_info.get("ownerId"):
            owner_id = slot_info["ownerId"]
            if owner_id not in owners_to_fetch:
                owners_to_fetch[owner_id] = []
            # 儲存需要查找的完整資訊
            owners_to_fetch[owner_id].append({
                "rank": i, 
                "monster_id": slot_info["monsterId"],
                "occupied_timestamp": slot_info.get("occupiedTimestamp")
            })

    # 一次性獲取所有相關玩家的遊戲資料
    if owners_to_fetch:
        for owner_id, monsters_to_find in owners_to_fetch.items():
            try:
                player_data_doc = db.collection('users').document(owner_id).collection('gameData').document('main').get()
                if player_data_doc.exists:
                    player_game_data = player_data_doc.to_dict()
                    farmed_monsters = player_game_data.get("farmedMonsters", [])
                    
                    for item in monsters_to_find:
                        rank = item["rank"]
                        monster_id = item["monster_id"]
                        found_monster = next((m for m in farmed_monsters if m.get("id") == monster_id), None)
                        
                        if found_monster:
                            # 附加擁有者與時間戳資訊
                            found_monster["owner_id"] = owner_id
                            found_monster["owner_nickname"] = player_game_data.get("nickname", "未知玩家")
                            found_monster["occupiedTimestamp"] = item.get("occupied_timestamp")
                            full_details[rank - 1] = found_monster
                        else:
                            champion_logger.warning(f"在玩家 {owner_id} 的農場中找不到冠軍怪獸 {monster_id}。該席位將顯示為空。")
                else:
                    champion_logger.warning(f"找不到冠軍怪獸擁有者 {owner_id} 的遊戲資料。")
            except Exception as e:
                champion_logger.error(f"處理玩家 {owner_id} 的冠軍資料時發生錯誤: {e}", exc_info=True)

    champion_logger.info("已組合完整的冠軍詳細資料列表。")
    return full_details

def update_champions_document(new_champions_data: ChampionsData) -> bool:
    """
    用新的冠軍資料完整覆蓋 Firestore 中的文件。
    這是一個底層函式，由更高階的服務（如戰鬥結算服務）呼叫。
    """
    db = MD_firebase_config.db
    if not db:
        champion_logger.error("Firestore 資料庫未初始化，無法更新冠軍名單。")
        return False
        
    try:
        doc_ref = db.collection(CHAMPIONS_COLLECTION).document(CHAMPIONS_DOCUMENT)
        doc_ref.set(new_champions_data)
        champion_logger.info("冠軍殿堂文件已成功更新。")
        return True
    except Exception as e:
        champion_logger.error(f"更新冠軍殿堂文件到 Firestore 時發生錯誤: {e}", exc_info=True)
        return False