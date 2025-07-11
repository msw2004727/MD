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
# --- 核心修改處 START ---
# 新增：定義冠軍守衛設定檔在 Firestore 中的位置
GUARDIANS_CONFIG_COLLECTION = "MD_GameConfigs"
GUARDIANS_CONFIG_DOCUMENT = "ChampionGuardians"
# --- 核心修改處 END ---

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
    獲取四個冠軍席位的完整資料。
    如果席位被玩家佔領，則返回玩家怪獸資料。
    如果席位為空，則從 Firestore 讀取對應的 NPC 守衛資料。
    """
    champions_info = get_champions_data()
    
    db = MD_firebase_config.db
    if not db:
        champion_logger.error("Firestore 資料庫未初始化，無法獲取怪獸詳細資料。")
        return [None, None, None, None]

    full_details: List[Optional[Dict[str, Any]]] = [None] * 4
    
    try:
        dna_templates_doc = db.collection('MD_GameConfigs').document('DNAFragments').get()
        all_dna_templates = dna_templates_doc.to_dict().get('all_fragments', []) if dna_templates_doc.exists else []
    except Exception as e:
        champion_logger.error(f"無法從 Firestore 載入 DNA 範本: {e}")
        all_dna_templates = []

    # --- 核心修改處 START ---
    # 預先載入守衛資料
    try:
        guardians_doc = db.collection(GUARDIANS_CONFIG_COLLECTION).document(GUARDIANS_CONFIG_DOCUMENT).get()
        guardians_data = guardians_doc.to_dict().get("guardians", {}) if guardians_doc.exists else {}
        champion_logger.info("成功預先載入冠軍守衛資料。")
    except Exception as e:
        champion_logger.error(f"無法從 Firestore 載入冠軍守衛資料: {e}")
        guardians_data = {}
    # --- 核心修改處 END ---
    
    owners_to_fetch: Dict[str, List[Dict[str, Any]]] = {}
    for i in range(1, 5):
        rank_key = f"rank{i}"
        slot_info: Optional[ChampionSlot] = champions_info.get(rank_key)

        # 如果席位被玩家佔領
        if slot_info and slot_info.get("ownerId"):
            owner_id = slot_info["ownerId"]
            if owner_id not in owners_to_fetch:
                owners_to_fetch[owner_id] = []
            owners_to_fetch[owner_id].append({
                "rank": i, 
                "monster_id": slot_info["monsterId"],
                "occupied_timestamp": slot_info.get("occupiedTimestamp")
            })
        # --- 核心修改處 START ---
        # 如果席位為空，則填入對應的守衛資料
        else:
            guardian_monster = guardians_data.get(rank_key)
            if guardian_monster:
                guardian_monster_copy = guardian_monster.copy()
                guardian_monster_copy['owner_nickname'] = "殿堂守護者" # 附加顯示資訊
                full_details[i - 1] = guardian_monster_copy
                champion_logger.info(f"席位 {rank_key} 為空，已填入守衛 '{guardian_monster_copy.get('nickname')}'。")
        # --- 核心修改處 END ---

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
                            found_monster["owner_id"] = owner_id
                            found_monster["owner_nickname"] = player_game_data.get("nickname", "未知玩家")
                            found_monster["occupiedTimestamp"] = item.get("occupied_timestamp")
                            
                            head_dna_info = { "type": "無", "rarity": "普通" } 
                            constituent_ids = found_monster.get("constituent_dna_ids", [])
                            if constituent_ids:
                                head_dna_id = constituent_ids[0]
                                head_dna_template = next((dna for dna in all_dna_templates if dna.get("id") == head_dna_id), None)
                                if head_dna_template:
                                    head_dna_info["type"] = head_dna_template.get("type", "無")
                                    head_dna_info["rarity"] = head_dna_template.get("rarity", "普通")
                            found_monster["head_dna_info"] = head_dna_info
                            
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
