# backend/player_services.py
# 處理玩家遊戲資料的初始化、獲取、保存功能

import time
import logging
from typing import List, Dict, Optional, Any, Tuple
import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore_v1.field_path import FieldPath
import random 

# --- 核心修改處 START ---
# 導入 math 模組和相關服務
import math
from .mail_services import add_mail_to_player
# --- 核心修改處 END ---

from .MD_models import PlayerGameData, PlayerStats, PlayerOwnedDNA, GameConfigs, NamingConstraints, ValueSettings, DNAFragment, Monster, ElementTypes, NoteEntry
from .utils_services import generate_monster_full_nickname
from .champion_services import get_champions_data, update_champions_document

player_services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式或測試，避免循環導入) ---
DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER: GameConfigs = {
    "dna_fragments": [], 
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {}, 
    "personalities": [],
    "titles": [{"id": "title_001", "name": "新手", "description": "", "condition": {}, "buffs": {}}], # type: ignore
    "monster_achievements_list": ["新秀"],
    "element_nicknames": {"火": "炎獸"},
    "naming_constraints": {
        "max_player_title_len": 5, "max_monster_achievement_len": 5,
        "max_element_nickname_len": 5, "max_monster_full_nickname_len": 15
    },
    "health_conditions": [],
    "newbie_guide": [],
    "npc_monsters": [],
    "value_settings": {
        "element_value_factors": {},
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10,
        "max_monster_skills": 3,
        "max_battle_turns": 30,
        "max_inventory_slots": 12,
        "max_temp_backpack_slots": 9
    },
    "absorption_config": {},
    "cultivation_config": {},
    "elemental_advantage_chart": {},
}


def initialize_new_player_data(player_id: str, nickname: str, game_configs: GameConfigs) -> PlayerGameData:
    """為新玩家初始化遊戲資料。"""
    player_services_logger.info(f"為新玩家 {nickname} (ID: {player_id}) 初始化遊戲資料。")
    
    all_titles_data = game_configs.get("titles", [])
    default_title_object = next((t for t in all_titles_data if t.get("id") == "title_001"), None)

    if not default_title_object:
        default_title_object = {
            "id": "title_001", "name": "新手", "description": "踏入怪獸異世界的第一步。",
            "condition": {"type": "default", "value": 0}, "buffs": {}
        }

    player_stats: PlayerStats = {
        "rank": "N/A", "wins": 0, "losses": 0, "score": 0,
        "titles": [default_title_object], 
        "achievements": ["首次登入異世界"],
        "medals": 0,
        "nickname": nickname,
        "equipped_title_id": default_title_object["id"],
        "gold": game_configs.get("value_settings", {}).get("starting_gold", 500),
        "current_win_streak": 0,
        "current_loss_streak": 0,
        "highest_win_streak": 0,
        "completed_cultivations": 0,
        "disassembled_monsters": 0,
        "discovered_recipes": [],
        "highest_rarity_created": "普通",
        "status_applied_counts": {},
        "leech_skill_uses": 0,
        "flawless_victories": 0,
        "special_victories": {},
        "last_champion_reward_timestamp": 0 # 新增：初始化獎勵時間戳
    }

    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["value_settings"]) # type: ignore
    max_inventory_slots = value_settings.get("max_inventory_slots", 12)
    initial_dna_owned: List[Optional[PlayerOwnedDNA]] = [None] * max_inventory_slots

    dna_fragments_templates: List[DNAFragment] = game_configs.get("dna_fragments", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["dna_fragments"]) # type: ignore
    num_initial_dna = 6

    if dna_fragments_templates:
        eligible_dna_templates = [dna for dna in dna_fragments_templates if dna.get("rarity") in ["普通", "稀有"]]
        if not eligible_dna_templates:
            eligible_dna_templates = list(dna_fragments_templates) 

        for i in range(min(num_initial_dna, len(eligible_dna_templates), max_inventory_slots)):
            if not eligible_dna_templates: break
            template = random.choice(eligible_dna_templates)
            instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{i}"
            owned_dna_item: PlayerOwnedDNA = {**template, "id": instance_id, "baseId": template["id"]} # type: ignore
            initial_dna_owned[i] = owned_dna_item
            pass

    new_player_data: PlayerGameData = {
        "playerOwnedDNA": initial_dna_owned,
        "farmedMonsters": [],
        "playerStats": player_stats,
        "nickname": nickname,
        "lastSave": int(time.time()),
        "lastSeen": int(time.time()),
        "selectedMonsterId": None,
        "friends": [],
        "dnaCombinationSlots": [None] * 5,
        "mailbox": [], 
        "playerNotes": [] 
    }
    player_services_logger.info(f"新玩家 {nickname} 資料初始化完畢，獲得 {num_initial_dna} 個初始 DNA。")
    return new_player_data

def get_player_data_service(player_id: str, nickname_from_auth: Optional[str], game_configs: GameConfigs) -> Tuple[Optional[PlayerGameData], bool]:
    """獲取玩家遊戲資料，如果不存在則初始化並儲存。返回 (玩家資料, 是否為新玩家) 的元組。"""
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        player_services_logger.error("Firestore 資料庫未初始化 (get_player_data_service 內部)。")
        return None, False

    db = firestore_db_instance

    try:
        user_profile_ref = db.collection('users').document(player_id)
        user_profile_doc = user_profile_ref.get()

        authoritative_nickname = nickname_from_auth
        if not authoritative_nickname:
            if user_profile_doc.exists:
                profile_data = user_profile_doc.to_dict()
                if profile_data and profile_data.get("nickname"):
                    authoritative_nickname = profile_data["nickname"]
            if not authoritative_nickname:
                authoritative_nickname = "未知玩家"

        if user_profile_doc.exists:
            profile_data = user_profile_doc.to_dict()
            update_fields = {"lastLogin": firestore.SERVER_TIMESTAMP, "lastSeen": firestore.SERVER_TIMESTAMP}
            if not profile_data or profile_data.get("nickname") != authoritative_nickname:
                update_fields["nickname"] = authoritative_nickname
                player_services_logger.info(f"已更新玩家 {player_id} 在 Firestore users 集合中的暱稱為: {authoritative_nickname}")
            try:
                user_profile_ref.update(update_fields)
            except Exception as e:
                player_services_logger.error(f"更新玩家 {player_id} 的 profile 失敗: {e}", exc_info=True)
        else:
            player_services_logger.info(f"Firestore 中找不到玩家 {player_id} 的 users 集合 profile。嘗試建立。")
            try:
                user_profile_ref.set({"uid": player_id, "nickname": authoritative_nickname, "createdAt": firestore.SERVER_TIMESTAMP, "lastLogin": firestore.SERVER_TIMESTAMP, "lastSeen": firestore.SERVER_TIMESTAMP}) # type: ignore
                player_services_logger.info(f"成功為玩家 {player_id} 創建 Firestore users 集合中的 profile，暱稱: {authoritative_nickname}")
            except Exception as e:
                player_services_logger.error(f"建立玩家 {player_id} 的 Firestore users 集合 profile 失敗: {e}", exc_info=True)
                return None, False

        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_doc = game_data_ref.get()

        if game_data_doc.exists:
            player_game_data_dict = game_data_doc.to_dict()
            if player_game_data_dict is None: player_game_data_dict = {}
            
            player_services_logger.info(f"成功從 Firestore 獲取玩家遊戲資料：{player_id}")
            
            # --- 核心修改處 START：新增冠軍每日獎勵結算邏輯 ---
            is_self_request = nickname_from_auth is not None
            if is_self_request:
                player_stats = player_game_data_dict.setdefault("playerStats", {})
                
                champions_data = get_champions_data()
                player_rank = 0
                champion_slot_info = None
                for i in range(1, 5):
                    slot_key = f"rank{i}"
                    slot = champions_data.get(slot_key)
                    if slot and slot.get("ownerId") == player_id:
                        player_rank = i
                        champion_slot_info = slot
                        break
                
                if player_rank > 0 and champion_slot_info:
                    last_reward_timestamp = player_stats.get("last_champion_reward_timestamp", 0)
                    
                    # 使用佔領時間戳作為獎勵計算的起始點
                    occupied_timestamp = champion_slot_info.get("occupiedTimestamp", 0)
                    start_time = max(last_reward_timestamp, occupied_timestamp)
                    current_time = int(time.time())
                    
                    seconds_per_day = 86400
                    days_to_reward = math.floor((current_time - start_time) / seconds_per_day)

                    if days_to_reward > 0:
                        reward_map = {1: 100, 2: 30, 3: 20, 4: 10}
                        daily_reward = reward_map.get(player_rank, 0)
                        total_gold_reward = days_to_reward * daily_reward
                        
                        if total_gold_reward > 0:
                            player_stats["gold"] = player_stats.get("gold", 0) + total_gold_reward
                            player_stats["last_champion_reward_timestamp"] = current_time
                            
                            mail_title = f"🏆 冠軍殿堂每日俸祿"
                            mail_content = f"恭喜您！作為冠軍殿堂第 {player_rank} 名的榮譽成員，系統已為您發放過去 {days_to_reward} 天的俸祿，共計 {total_gold_reward} 🪙。已自動存入您的錢包。"
                            mail_template = { "type": "reward", "title": mail_title, "content": mail_content }
                            add_mail_to_player(player_game_data_dict, mail_template)
                            
                            player_services_logger.info(f"已為冠軍玩家 {player_id} (第{player_rank}名) 發放 {days_to_reward} 天的獎勵，共 {total_gold_reward} 金幣。")
                            save_player_data_service(player_id, player_game_data_dict)
            # --- 核心修改處 END ---

            # 資料遷移邏輯...
            needs_migration_save = False
            player_stats = player_game_data_dict.get("playerStats", {})
            if "gold" not in player_stats:
                player_stats["gold"] = game_configs.get("value_settings", {}).get("starting_gold", 500)
                needs_migration_save = True
            current_titles = player_stats.get("titles", [])
            if current_titles and isinstance(current_titles[0], str):
                all_titles_config = game_configs.get("titles", [])
                new_titles_list = [t for t in all_titles_config if t.get("name") in current_titles]
                player_stats["titles"] = new_titles_list
                needs_migration_save = True
            if "equipped_title_id" not in player_stats:
                current_titles_obj = player_stats.get("titles", [])
                default_equip_id = None
                if current_titles_obj and isinstance(current_titles_obj[0], dict) and "id" in current_titles_obj[0]:
                    default_equip_id = current_titles_obj[0]["id"]
                else:
                    all_titles_config = game_configs.get("titles", [])
                    default_title_obj = next((t for t in all_titles_config if t.get("id") == "title_001"), None)
                    if default_title_obj:
                        player_stats["titles"] = [default_title_obj]
                        default_equip_id = default_title_obj["id"]
                if default_equip_id:
                    player_stats["equipped_title_id"] = default_equip_id
                    needs_migration_save = True
            farmed_monsters = player_game_data_dict.get("farmedMonsters", [])
            if farmed_monsters:
                element_nicknames_map = game_configs.get("element_nicknames", {})
                naming_constraints = game_configs.get("naming_constraints", {})
                player_current_title_name = "新手"
                equipped_id = player_stats.get("equipped_title_id")
                owned_titles = player_stats.get("titles", [])
                if equipped_id:
                    equipped_title_obj = next((t for t in owned_titles if t.get("id") == equipped_id), None)
                    if equipped_title_obj: player_current_title_name = equipped_title_obj.get("name", "新手")
                elif owned_titles and isinstance(owned_titles[0], dict):
                    player_current_title_name = owned_titles[0].get("name", "新手")
                
                for monster in farmed_monsters:
                    if "player_title_part" not in monster:
                        needs_migration_save = True
                        monster["player_title_part"] = player_current_title_name
                        monster["achievement_part"] = monster.get("title", "新秀")
                        if monster.get("custom_element_nickname"):
                            monster["element_nickname_part"] = monster["custom_element_nickname"]
                        else:
                            primary_element: ElementTypes = monster.get("elements", ["無"])[0] # type: ignore
                            monster_rarity = monster.get("rarity", "普通")
                            rarity_specific_nicknames = element_nicknames_map.get(primary_element, {})
                            possible_nicknames = rarity_specific_nicknames.get(monster_rarity, [primary_element])
                            monster["element_nickname_part"] = possible_nicknames[0] if possible_nicknames else primary_element
                        monster["nickname"] = generate_monster_full_nickname(monster["player_title_part"], monster["achievement_part"], monster["element_nickname_part"], naming_constraints)
            
            for dna_list_key in ["playerOwnedDNA", "dnaCombinationSlots"]:
                dna_list = player_game_data_dict.get(dna_list_key, [])
                for i, dna_item in enumerate(dna_list):
                    if dna_item and isinstance(dna_item, dict) and "baseId" not in dna_item:
                        needs_migration_save = True
                        player_services_logger.info(f"為玩家 {player_id} 的 DNA (ID: {dna_item.get('id', '')}) 進行 'baseId' 遷移。")
                        dna_item["baseId"] = dna_item.get("id", "")
                        dna_item["id"] = f"dna_inst_{player_id}_{int(time.time() * 1000)}_{i}"

            if needs_migration_save:
                try:
                    save_player_data_service(player_id, player_game_data_dict)
                except Exception as e:
                    player_services_logger.error(f"為玩家 {player_id} 執行資料遷移時儲存失敗: {e}", exc_info=True)
            
            loaded_dna = player_game_data_dict.get("playerOwnedDNA", [])
            max_inventory_slots = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS_PLAYER["value_settings"]).get("max_inventory_slots", 12)
            if len(loaded_dna) < max_inventory_slots: loaded_dna.extend([None] * (max_inventory_slots - len(loaded_dna)))
            elif len(loaded_dna) > max_inventory_slots: loaded_dna = loaded_dna[:max_inventory_slots]

            player_game_data: PlayerGameData = {
                "playerOwnedDNA": loaded_dna,
                "farmedMonsters": player_game_data_dict.get("farmedMonsters", []),
                "playerStats": player_game_data_dict.get("playerStats", {}),
                "nickname": authoritative_nickname,
                "lastSave": player_game_data_dict.get("lastSave", int(time.time())),
                "lastSeen": player_game_data_dict.get("lastSeen", int(time.time())),
                "selectedMonsterId": player_game_data_dict.get("selectedMonsterId", None),
                "friends": player_game_data_dict.get("friends", []),
                "dnaCombinationSlots": player_game_data_dict.get("dnaCombinationSlots", [None] * 5),
                "mailbox": player_game_data_dict.get("mailbox", []),
                "playerNotes": player_game_data_dict.get("playerNotes", [])
            }
            if "nickname" not in player_game_data["playerStats"] or player_game_data["playerStats"]["nickname"] != authoritative_nickname:
                player_game_data["playerStats"]["nickname"] = authoritative_nickname
            return player_game_data, False
        
        player_services_logger.info(f"在 Firestore 中找不到玩家 {player_id} 的遊戲資料，將初始化新玩家資料。")
        new_player_data = initialize_new_player_data(player_id, authoritative_nickname, game_configs)
        
        if save_player_data_service(player_id, new_player_data):
            return new_player_data, True
        else:
            player_services_logger.error(f"為新玩家 {player_id} 初始化資料後，首次儲存失敗！")
            return new_player_data, True

    except Exception as e:
        player_services_logger.error(f"獲取玩家資料時發生錯誤 ({player_id}): {e}", exc_info=True)
        return None, False

def save_player_data_service(player_id: str, game_data: PlayerGameData) -> bool:
    """儲存玩家遊戲資料到 Firestore，並同步更新頂層的 lastSeen。"""
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        player_services_logger.error("Firestore 資料庫未初始化 (save_player_data_service 內部)。")
        return False
    
    db = firestore_db_instance
    
    try:
        current_data_doc = db.collection('users').document(player_id).collection('gameData').document('main').get()
        if current_data_doc.exists:
            current_data = current_data_doc.to_dict()
            old_selected_id = current_data.get("selectedMonsterId")
            new_selected_id = game_data.get("selectedMonsterId")

            if old_selected_id and old_selected_id != new_selected_id:
                player_services_logger.info(f"玩家 {player_id} 更換出戰怪獸：從 {old_selected_id} 更換為 {new_selected_id}。檢查冠軍席位...")
                champions_data = get_champions_data()
                was_champion = False
                for i in range(1, 5):
                    rank_key = f"rank{i}"
                    slot = champions_data.get(rank_key)
                    if slot and slot.get("monsterId") == old_selected_id:
                        champions_data[rank_key] = None 
                        was_champion = True
                        player_services_logger.info(f"玩家 {player_id} 的舊出戰怪獸 {old_selected_id} 為第 {i} 名冠軍，已將其席位移除。")
                        break
                
                if was_champion:
                    update_champions_document(champions_data) 

    except Exception as e:
        player_services_logger.error(f"儲存前檢查冠軍席位時發生錯誤: {e}", exc_info=True)
    
    current_time_unix = int(time.time())

    try:
        data_to_save: Dict[str, Any] = {
            "playerOwnedDNA": game_data.get("playerOwnedDNA", []),
            "farmedMonsters": game_data.get("farmedMonsters", []),
            "playerStats": game_data.get("playerStats", {}),
            "nickname": game_data.get("nickname", "未知玩家"),
            "lastSave": current_time_unix,
            "lastSeen": current_time_unix,
            "selectedMonsterId": game_data.get("selectedMonsterId"),
            "friends": game_data.get("friends", []),
            "dnaCombinationSlots": game_data.get("dnaCombinationSlots", [None] * 5),
            "playerNotes": game_data.get("playerNotes", []),
            "mailbox": game_data.get("mailbox", []),
            "adventure_progress": game_data.get("adventure_progress")
        }

        if isinstance(data_to_save["playerStats"], dict) and \
           data_to_save["playerStats"].get("nickname") != data_to_save["nickname"]:
            data_to_save["playerStats"]["nickname"] = data_to_save["nickname"]

        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_ref.set(data_to_save) 
        
        try:
            user_profile_ref = db.collection('users').document(player_id)
            user_profile_ref.update({"lastSeen": firestore.SERVER_TIMESTAMP})
            player_services_logger.info(f"已同步更新玩家 {player_id} 的頂層 lastSeen 時間戳。")
        except Exception as e:
            player_services_logger.error(f"同步更新玩家 {player_id} 的頂層 lastSeen 時間戳失敗: {e}", exc_info=True)
            
        player_services_logger.info(f"玩家 {player_id} 的遊戲資料已成功儲存到 Firestore。")
        return True
    except Exception as e:
        player_services_logger.error(f"儲存玩家遊戲資料到 Firestore 時發生錯誤 ({player_id}): {e}", exc_info=True)
        return False

def draw_free_dna() -> Optional[List[Dict[str, Any]]]:
    """
    執行免費的 DNA 抽取。
    """
    player_services_logger.info("正在執行免費 DNA 抽取...")
    try:
        from .MD_config_services import load_all_game_configs_from_firestore
        game_configs = load_all_game_configs_from_firestore()

        if not game_configs or 'dna_fragments' not in game_configs:
            player_services_logger.error("無法載入 DNA 碎片設定，抽取失敗。")
            return None

        all_dna_fragments = game_configs['dna_fragments']
        
        allowed_rarities = {"普通", "稀有"}
        filtered_pool = [
            dna for dna in all_dna_fragments 
            if dna.get('rarity') in allowed_rarities
        ]

        if not filtered_pool:
            player_services_logger.error("篩選後的 DNA 卡池為空，無法抽取。")
            return []
            
        num_to_draw = 3
        
        drawn_dna_templates = random.choices(filtered_pool, k=num_to_draw)
        
        player_services_logger.info(f"成功抽取了 {num_to_draw} 個 DNA。")
        
        return drawn_dna_templates

    except Exception as e:
        player_services_logger.error(f"執行免費 DNA 抽取時發生錯誤: {e}", exc_info=True)
        return None

def get_friends_statuses_service(friend_ids: List[str]) -> Dict[str, Optional[int]]:
    """
    一次性獲取多個好友的 `lastSeen` 時間戳。
    """
    from .MD_firebase_config import db as firestore_db_instance
    if not firestore_db_instance:
        player_services_logger.error("Firestore 資料庫未初始化 (get_friends_statuses_service 內部)。")
        return {friend_id: None for friend_id in friend_ids}
    
    db = firestore_db_instance
    statuses: Dict[str, Optional[int]] = {friend_id: None for friend_id in friend_ids}

    if not friend_ids:
        return statuses

    friend_id_chunks = [friend_ids[i:i + 30] for i in range(0, len(friend_ids), 30)]

    for chunk in friend_id_chunks:
        try:
            docs = db.collection('users').where(FieldPath.document_id(), 'in', chunk).stream()
            for doc in docs:
                user_data = doc.to_dict()
                if user_data and 'lastSeen' in user_data:
                    last_seen_timestamp = user_data['lastSeen']
                    if hasattr(last_seen_timestamp, 'timestamp'):
                        statuses[doc.id] = int(last_seen_timestamp.timestamp())
                    elif isinstance(last_seen_timestamp, (int, float)):
                        statuses[doc.id] = int(last_seen_timestamp)
        except Exception as e:
            player_services_logger.error(f"查詢好友狀態時發生錯誤 (chunk: {chunk}): {e}", exc_info=True)

    return statuses

def add_note_service(player_data: PlayerGameData, target_type: str, note_content: str, monster_id: Optional[str] = None) -> Optional[PlayerGameData]:
    """
    新增一條註記到玩家或指定的怪獸。
    """
    if not note_content.strip():
        player_services_logger.warning("嘗試新增一條空的註記，操作已取消。")
        return player_data
        
    if len(note_content) > 100:
        player_services_logger.warning(f"註記內容長度超過100字元上限 (長度: {len(note_content)})，操作已取消。")
        return None 

    new_note: NoteEntry = {
        "timestamp": int(time.time()),
        "content": note_content
    }

    if target_type == "player":
        if "playerNotes" not in player_data or not isinstance(player_data.get("playerNotes"), list):
            player_data["playerNotes"] = []
        player_data["playerNotes"].append(new_note)
        player_services_logger.info(f"已為玩家新增一條通用註記。")
        return player_data

    elif target_type == "monster":
        if not monster_id:
            player_services_logger.error("新增怪獸註記失敗：未提供怪獸 ID。")
            return None 

        monster_to_update = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)

        if not monster_to_update:
            player_services_logger.error(f"新增怪獸註記失敗：找不到 ID 為 {monster_id} 的怪獸。")
            return None 
        
        if "monsterNotes" not in monster_to_update or not isinstance(monster_to_update.get("monsterNotes"), list):
            monster_to_update["monsterNotes"] = []
        
        monster_to_update["monsterNotes"].append(new_note)
        player_services_logger.info(f"已為怪獸 {monster_id} 新增一條註記。")
        return player_data

    else:
        player_services_logger.error(f"新增註記失敗：未知的目標類型 '{target_type}'。")
        return None
