# backend/config_editor_services.py
# 新增的服務檔案：處理後台編輯遊戲設定檔的相關邏輯

import os
import json
import logging
from flask import current_app
from typing import Optional, Dict, Any, List, Union
import re # 新增：導入正規表示式模組

from firebase_admin import firestore
from . import MD_firebase_config

config_editor_logger = logging.getLogger(__name__)

# --- 核心修改處 START ---
# 在每個設定檔的元組中，新增第三個元素作為中文註解
CONFIG_FILE_FIRESTORE_MAP = {
    # system/
    "system/titles.json": ("Titles", "player_titles", "玩家稱號"),
    "system/champion_guardians.json": ("ChampionGuardians", "guardians", "冠軍殿堂守衛"),
    "system/newbie_guide.json": ("NewbieGuide", "guide_entries", "新手指南"),
    "system/cultivation_stories.json": ("CultivationStories", "story_library", "修煉冒險故事"),
    "system/Rarities.json": ("Rarities", "dna_rarities", "稀有度設定"),
    "system/ValueSettings.json": ("ValueSettings", None, "通用數值設定"),
    "system/CultivationSettings.json": ("CultivationSettings", None, "修煉系統設定"),
    # battle/
    "battle/battle_highlights.json": ("BattleHighlights", None, "戰鬥亮點風格"),
    "battle/status_effects.json": ("StatusEffects", "effects_list", "戰鬥狀態效果"),
    "battle/elemental_advantage_chart.json": ("ElementalAdvantageChart", None, "屬性相剋表"),
    # monster/
    "monster/dna_fragments.json": ("DNAFragments", "all_fragments", "【已整合】全DNA碎片"),
    "monster/element_nicknames.json": ("ElementNicknames", "nicknames", "怪獸屬性暱稱"),
    # monster/skills/
    "monster/skills/dark.json": ("Skills", "skill_database.暗", "【暗】屬性技能"),
    "monster/skills/earth.json": ("Skills", "skill_database.土", "【土】屬性技能"),
    "monster/skills/fire.json": ("Skills", "skill_database.火", "【火】屬性技能"),
    "monster/skills/gold.json": ("Skills", "skill_database.金", "【金】屬性技能"),
    "monster/skills/light.json": ("Skills", "skill_database.光", "【光】屬性技能"),
    "monster/skills/mix.json": ("Skills", "skill_database.混", "【混】屬性技能"),
    "monster/skills/none.json": ("Skills", "skill_database.無", "【無】屬性技能"),
    "monster/skills/poison.json": ("Skills", "skill_database.毒", "【毒】屬性技能"),
    "monster/skills/water.json": ("Skills", "skill_database.水", "【水】屬性技能"),
    "monster/skills/wind.json": ("Skills", "skill_database.風", "【風】屬性技能"),
    "monster/skills/wood.json": ("Skills", "skill_database.木", "【木】屬性技能"),
    # adventure/
    "adventure/adventure_settings.json": ("AdventureSettings", None, "冒險島全域設定"),
    "adventure/adventure_growth_settings.json": ("AdventureGrowthSettings", None, "冒險島隨機成長"),
    "adventure/adventure_islands.json": ("AdventureIslands", "islands", "冒險島主要設定")
}
# --- 核心修改處 END ---


# 本地設定檔的路徑也更新
LOCAL_CONFIG_FILES = (
    "game_mechanics.json",
)

def list_editable_configs() -> list[str]:
    """列出所有可透過後台編輯的設定檔名稱，並附上中文註解。"""
    all_configs = []
    # --- 核心修改處 START ---
    # 修改迴圈以讀取包含註解的元組
    for path, value_tuple in CONFIG_FILE_FIRESTORE_MAP.items():
        comment = value_tuple[2] if len(value_tuple) > 2 else "無註解"
        all_configs.append(f"{os.path.normpath(path)} ({comment})")

    # 為本地檔案也加上註解
    local_comments = {
        "game_mechanics.json": "核心遊戲機制"
    }
    for path in LOCAL_CONFIG_FILES:
        comment = local_comments.get(path, "本地設定檔")
        all_configs.append(f"{os.path.normpath(path)} ({comment})")
    
    return sorted(all_configs)
    # --- 核心修改處 END ---

def get_config_content(filename: str) -> tuple[Optional[Union[Dict, List]], Optional[str]]:
    """
    讀取指定設定檔的內容，支援本地檔案和 Firestore。
    """
    db = MD_firebase_config.db
    if not db:
        return None, "資料庫服務未初始化。"
        
    # --- 核心修改處 START ---
    # 從 "路徑 (註解)" 的格式中解析出實際的檔案路徑
    match = re.match(r"([^ (]+)", filename)
    if not match:
        return None, f"無效的設定檔名格式: {filename}"
    parsed_filename = match.group(1)
    normalized_filename = os.path.normpath(parsed_filename)
    # --- 核心修改處 END ---

    if normalized_filename in LOCAL_CONFIG_FILES:
        try:
            data_dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(data_dir, normalized_filename)
            
            if not os.path.exists(file_path):
                return None, f"本地設定檔 '{normalized_filename}' 不存在。"
                
            with open(file_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
            return content, None
        except Exception as e:
            config_editor_logger.error(f"從本地讀取設定檔 '{normalized_filename}' 時發生錯誤: {e}", exc_info=True)
            return None, f"讀取本地檔案 {normalized_filename} 時發生錯誤。"

    if normalized_filename not in CONFIG_FILE_FIRESTORE_MAP:
        return None, f"不支援的設定檔 '{normalized_filename}'。"

    # --- 核心修改處 START ---
    # 修改元組解包，以適應新的三元素格式
    doc_name, field_path, _ = CONFIG_FILE_FIRESTORE_MAP[normalized_filename]
    # --- 核心修改處 END ---

    try:
        doc_ref = db.collection('MD_GameConfigs').document(doc_name)
        doc = doc_ref.get()

        if not doc.exists:
            return None, f"Firestore 中找不到對應的文件：'{doc_name}'。"

        doc_data = doc.to_dict()
        if not doc_data:
            return {}, f"文件 '{doc_name}' 內容為空。"

        if field_path is None:
            return doc_data, None

        data_to_return = doc_data
        for key in field_path.split('.'):
            if isinstance(data_to_return, dict):
                data_to_return = data_to_return.get(key)
            else:
                return None, f"在文件 '{doc_name}' 中找不到欄位路徑：'{field_path}' (於 '{key}')"
            
            if data_to_return is None:
                return None, f"在文件 '{doc_name}' 中找不到欄位路徑：'{field_path}' (於 '{key}')"
        
        return data_to_return, None

    except Exception as e:
        config_editor_logger.error(f"從 Firestore 讀取設定檔 '{normalized_filename}' 時發生錯誤: {e}", exc_info=True)
        return None, "讀取 Firestore 資料時發生伺服器內部錯誤。"

def save_config_content(filename: str, content_str: str) -> tuple[bool, Optional[str]]:
    db = MD_firebase_config.db
    if not db:
        return False, "資料庫服務未初始化。"
        
    # --- 核心修改處 START ---
    # 從 "路徑 (註解)" 的格式中解析出實際的檔案路徑
    match = re.match(r"([^ (]+)", filename)
    if not match:
        return False, f"無效的設定檔名格式: {filename}"
    parsed_filename = match.group(1)
    normalized_filename = os.path.normpath(parsed_filename)
    # --- 核心修改處 END ---

    if normalized_filename in LOCAL_CONFIG_FILES:
        try:
            parsed_content = json.loads(content_str)
            data_dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(data_dir, normalized_filename)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(parsed_content, f, indent=2, ensure_ascii=False)
            config_editor_logger.info(f"設定檔 '{normalized_filename}' 已成功儲存至本地。")
            reload_main_app_configs()
            return True, None
        except json.JSONDecodeError as e:
            return False, f"儲存失敗：內容不是有效的 JSON 格式。錯誤: {e}"
        except Exception as e:
            config_editor_logger.error(f"儲存設定檔 '{normalized_filename}' 到本地時發生錯誤: {e}", exc_info=True)
            return False, "儲存檔案到本地時發生伺服器內部錯誤。"

    if normalized_filename not in CONFIG_FILE_FIRESTORE_MAP:
        return False, f"不支援的設定檔 '{normalized_filename}'。"

    try:
        parsed_content = json.loads(content_str)
    except json.JSONDecodeError as e:
        error_msg = f"儲存失敗：內容不是有效的 JSON 格式。錯誤: {e}"
        config_editor_logger.error(error_msg)
        return False, error_msg

    # --- 核心修改處 START ---
    # 修改元組解包，以適應新的三元素格式
    doc_name, field_path, _ = CONFIG_FILE_FIRESTORE_MAP[normalized_filename]
    # --- 核心修改處 END ---
    
    try:
        doc_ref = db.collection('MD_GameConfigs').document(doc_name)
        
        if field_path is None:
            doc_ref.set(parsed_content)
        else:
            doc_ref.update({field_path: parsed_content})
            
        config_editor_logger.info(f"設定檔 '{normalized_filename}' 已成功儲存至 Firestore 的 '{doc_name}.{field_path or ''}'。")
        
        reload_main_app_configs()
        return True, None
    except Exception as e:
        config_editor_logger.error(f"儲存設定檔 '{filename}' 到 Firestore 時發生錯誤: {e}", exc_info=True)
        return False, "儲存檔案到 Firestore 時發生伺服器內部錯誤。"

def save_adventure_settings_service(global_settings: Dict, facilities_settings: List) -> tuple[bool, Optional[str]]:
    db = MD_firebase_config.db
    if not db:
        return False, "資料庫服務未初始化。"
    
    try:
        # 儲存全域設定
        db.collection('MD_GameConfigs').document('AdventureSettings').set(global_settings, merge=True)
        config_editor_logger.info(f"已成功合併更新全域冒險設定至 Firestore 的 'AdventureSettings' 文件。")

        # === 新增：讀取、修改、並寫回設施設定 ===
        islands_doc_ref = db.collection('MD_GameConfigs').document('AdventureIslands')
        islands_doc = islands_doc_ref.get()
        if not islands_doc.exists:
            return False, "找不到 AdventureIslands 設定檔，無法更新設施費用。"
        
        islands_data = islands_doc.to_dict().get('islands', [])

        for facility_update in facilities_settings:
            for island in islands_data:
                for facility in island.get('facilities', []):
                    if facility.get('facilityId') == facility_update.get('id'):
                        facility['cost'] = facility_update.get('cost', facility.get('cost', 0))
                        facility['floor_clear_base_gold'] = facility_update.get('floor_clear_base_gold', facility.get('floor_clear_base_gold', 50))
                        facility['floor_clear_bonus_gold_per_floor'] = facility_update.get('floor_clear_bonus_gold_per_floor', facility.get('floor_clear_bonus_gold_per_floor', 10))
                        break
        
        islands_doc_ref.set({'islands': islands_data})
        config_editor_logger.info(f"已成功更新並儲存各地區設施設定至 Firestore 的 'AdventureIslands' 文件。")

        reload_main_app_configs()
        
        return True, None
        
    except Exception as e:
        config_editor_logger.error(f"儲存冒險島設定時發生錯誤: {e}", exc_info=True)
        return False, "儲存冒險島設定時發生伺服器內部錯誤。"

def save_adventure_growth_settings_service(growth_settings: Dict) -> tuple[bool, Optional[str]]:
    """
    將新的冒險島成長設定儲存到 Firestore 的 AdventureGrowthSettings 文件。
    """
    db = MD_firebase_config.db
    if not db:
        return False, "資料庫服務未初始化。"
        
    try:
        if "facilities" not in growth_settings or "stat_weights" not in growth_settings:
            return False, "傳入的資料格式不正確，缺少 'facilities' 或 'stat_weights' 鍵。"

        doc_ref = db.collection('MD_GameConfigs').document('AdventureGrowthSettings')
        doc_ref.set(growth_settings, merge=True)
        
        config_editor_logger.info(f"冒險島成長設定已成功合併更新至 Firestore 的 'AdventureGrowthSettings' 文件。")
        
        reload_main_app_configs()
        
        return True, None

    except Exception as e:
        config_editor_logger.error(f"儲存冒險島成長設定時發生錯誤: {e}", exc_info=True)
        return False, "儲存冒險島成長設定時發生伺服器內部錯誤。"

def save_game_mechanics_service(mechanics_data: Dict) -> tuple[bool, Optional[str]]:
    """
    將新的遊戲機制設定儲存到 game_mechanics.json 檔案。
    """
    try:
        required_keys = ["battle_formulas", "cultivation_rules", "absorption_rules"]
        if not all(key in mechanics_data for key in required_keys):
            return False, "傳入的資料格式不正確，缺少必要的頂層鍵。"

        data_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(data_dir, 'game_mechanics.json')

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(mechanics_data, f, indent=2, ensure_ascii=False)
        
        config_editor_logger.info(f"遊戲機制設定已成功儲存至 '{file_path}'。")
        
        reload_main_app_configs()
        
        return True, None

    except Exception as e:
        config_editor_logger.error(f"儲存遊戲機制設定時發生錯誤: {e}", exc_info=True)
        return False, "儲存遊戲機制設定時發生伺服器內部錯誤。"

def save_elemental_advantage_service(chart_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    將新的屬性克制表儲存到 elemental_advantage_chart.json 檔案。
    """
    try:
        if not isinstance(chart_data, dict):
            return False, "傳入的資料格式不正確，應為一個字典。"

        data_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(data_dir, 'battle', 'elemental_advantage_chart.json')

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chart_data, f, indent=2, ensure_ascii=False)
        
        config_editor_logger.info(f"屬性克制表已成功儲存至 '{file_path}'。")
        
        reload_main_app_configs()
        
        return True, None

    except Exception as e:
        config_editor_logger.error(f"儲存屬性克制表時發生錯誤: {e}", exc_info=True)
        return False, "儲存屬性克制表時發生伺服器內部錯誤。"

def save_champion_guardians_service(guardians_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    將新的冠軍守衛資料儲存到 champion_guardians.json 檔案。
    """
    try:
        doc_name, field_path, _ = CONFIG_FILE_FIRESTORE_MAP["system/champion_guardians.json"]
        
        db = MD_firebase_config.db
        if not db:
            return False, "資料庫服務未初始化。"
            
        doc_ref = db.collection('MD_GameConfigs').document(doc_name)
        doc = doc_ref.get()

        if not doc.exists:
            return False, "找不到原始的冠軍守衛設定檔。"
        
        full_data = doc.to_dict()
        original_guardians = full_data.get(field_path, {}) if field_path else full_data

        for rank, new_stats in guardians_data.items():
            if rank in original_guardians:
                for stat, value in new_stats.items():
                    original_guardians[rank][stat] = value
                    if stat == 'initial_max_hp':
                        original_guardians[rank]['hp'] = value
                    if stat == 'initial_max_mp':
                        original_guardians[rank]['mp'] = value

        if field_path:
            doc_ref.update({field_path: original_guardians})
        else:
            doc_ref.set(original_guardians)

        config_editor_logger.info(f"冠軍守衛資料已成功更新至 Firestore。")
        reload_main_app_configs()
        return True, None

    except Exception as e:
        config_editor_logger.error(f"儲存冠軍守衛資料時發生錯誤: {e}", exc_info=True)
        return False, "儲存冠軍守衛資料時發生伺服器內部錯誤。"

def save_cultivation_settings_service(settings_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    將新的修煉設定儲存到 CultivationSettings 文件。
    """
    try:
        if not isinstance(settings_data, dict):
            return False, "傳入的資料格式不正確，應為一個字典。"

        db = MD_firebase_config.db
        doc_ref = db.collection('MD_GameConfigs').document('CultivationSettings')
        doc_ref.set(settings_data, merge=True)
        
        config_editor_logger.info(f"修煉設定已成功更新至 Firestore。")
        reload_main_app_configs()
        return True, None

    except Exception as e:
        config_editor_logger.error(f"儲存修煉設定時發生錯誤: {e}", exc_info=True)
        return False, "儲存修煉設定時發生伺服器內部錯誤。"

def reload_main_app_configs():
    try:
        from .MD_config_services import load_all_game_configs_from_firestore
        current_app.config['MD_GAME_CONFIGS'] = load_all_game_configs_from_firestore()
        config_editor_logger.info("主應用程式的遊戲設定已從 Firestore 重新載入。")
    except Exception as e:
        config_editor_logger.error(f"重新載入遊戲設定時失敗: {e}", exc_info=True)
