# backend/config_editor_services.py
# 新增的服務檔案：處理後台編輯遊戲設定檔的相關邏輯

import os
import json
import logging
from flask import current_app
from typing import Optional, Dict, Any, List, Union

from firebase_admin import firestore
from . import MD_firebase_config

config_editor_logger = logging.getLogger(__name__)

# Firestore 的檔案路徑映射，已更新為新的資料夾結構
CONFIG_FILE_FIRESTORE_MAP = {
    # system/
    "system/titles.json": ("Titles", "player_titles"),
    "system/champion_guardians.json": ("ChampionGuardians", "guardians"),
    "system/newbie_guide.json": ("NewbieGuide", "guide_entries"),
    "system/cultivation_stories.json": ("CultivationStories", "story_library"), # 新增
    # battle/
    "battle/battle_highlights.json": ("BattleHighlights", None),
    "battle/status_effects.json": ("StatusEffects", "effects_list"),
    "battle/elemental_advantage_chart.json": ("ElementalAdvantageChart", None),
    # monster/
    "monster/dna_fragments.json": ("DNAFragments", "all_fragments"),
    "monster/element_nicknames.json": ("ElementNicknames", "nicknames"),
    # monster/skills/
    "monster/skills/dark.json": ("Skills", "skill_database.暗"),
    "monster/skills/earth.json": ("Skills", "skill_database.土"),
    "monster/skills/fire.json": ("Skills", "skill_database.火"),
    "monster/skills/gold.json": ("Skills", "skill_database.金"),
    "monster/skills/light.json": ("Skills", "skill_database.光"),
    "monster/skills/mix.json": ("Skills", "skill_database.混"),
    "monster/skills/none.json": ("Skills", "skill_database.無"),
    "monster/skills/poison.json": ("Skills", "skill_database.毒"),
    "monster/skills/water.json": ("Skills", "skill_database.水"),
    "monster/skills/wind.json": ("Skills", "skill_database.風"),
    "monster/skills/wood.json": ("Skills", "skill_database.木"),
    # settings/
    "settings/Rarities.json": ("Rarities", "dna_rarities"), # 新增
    "settings/ValueSettings.json": ("ValueSettings", None), # 新增
    "settings/CultivationSettings.json": ("CultivationSettings", None) # 新增
}

# 本地設定檔的路徑也更新
LOCAL_CONFIG_FILES = (
    os.path.join("adventure", "adventure_settings.json"),
    os.path.join("adventure", "adventure_islands.json"),
    os.path.join("adventure", "adventure_growth_settings.json"),
    "game_mechanics.json"
)

def list_editable_configs() -> list[str]:
    """列出所有可透過後台編輯的設定檔名稱。"""
    all_configs = list(CONFIG_FILE_FIRESTORE_MAP.keys()) + list(LOCAL_CONFIG_FILES)
    return sorted(list(set([os.path.normpath(p) for p in all_configs])))

def get_config_content(filename: str) -> tuple[Optional[Union[Dict, List]], Optional[str]]:
    """
    讀取指定設定檔的內容，支援本地檔案和 Firestore。
    """
    db = MD_firebase_config.db
    if not db:
        return None, "資料庫服務未初始化。"
        
    normalized_filename = os.path.normpath(filename)

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

    doc_name, field_path = CONFIG_FILE_FIRESTORE_MAP[normalized_filename]

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
        
    normalized_filename = os.path.normpath(filename)

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

    doc_name, field_path = CONFIG_FILE_FIRESTORE_MAP[normalized_filename]
    
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
    data_dir = os.path.dirname(__file__)
    
    try:
        adv_settings_path = os.path.join(data_dir, 'adventure', 'adventure_settings.json')
        with open(adv_settings_path, 'w', encoding='utf-8') as f:
            json.dump(global_settings, f, indent=2, ensure_ascii=False)
        config_editor_logger.info(f"已成功儲存全域冒險設定至 '{adv_settings_path}'。")

        islands_path = os.path.join(data_dir, 'adventure', 'adventure_islands.json')
        
        with open(islands_path, 'r', encoding='utf-8') as f:
            islands_data = json.load(f)

        for facility_update in facilities_settings:
            for island in islands_data:
                for facility in island.get('facilities', []):
                    if facility.get('facilityId') == facility_update.get('id'):
                        facility['cost'] = facility_update.get('cost', facility['cost'])
                        break
        
        with open(islands_path, 'w', encoding='utf-8') as f:
            json.dump(islands_data, f, indent=2, ensure_ascii=False)
        config_editor_logger.info(f"已成功更新並儲存各地區設施設定至 '{islands_path}'。")

        reload_main_app_configs()
        
        return True, None
        
    except Exception as e:
        config_editor_logger.error(f"儲存冒險島設定時發生錯誤: {e}", exc_info=True)
        return False, "儲存冒險島設定時發生伺服器內部錯誤。"

def save_adventure_growth_settings_service(growth_settings: Dict) -> tuple[bool, Optional[str]]:
    """
    將新的冒險島成長設定儲存到 adventure_growth_settings.json 檔案。
    """
    try:
        if "facilities" not in growth_settings or "stat_weights" not in growth_settings:
            return False, "傳入的資料格式不正確，缺少 'facilities' 或 'stat_weights' 鍵。"

        data_dir = os.path.dirname(__file__)
        file_path = os.path.join(data_dir, 'adventure', 'adventure_growth_settings.json')

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(growth_settings, f, indent=2, ensure_ascii=False)
        
        config_editor_logger.info(f"冒險島成長設定已成功儲存至 '{file_path}'。")
        
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

        data_dir = os.path.dirname(__file__)
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
        # 基本的格式驗證
        if not isinstance(chart_data, dict):
            return False, "傳入的資料格式不正確，應為一個字典。"

        data_dir = os.path.dirname(__file__)
        file_path = os.path.join(data_dir, 'battle', 'elemental_advantage_chart.json')

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chart_data, f, indent=2, ensure_ascii=False)
        
        config_editor_logger.info(f"屬性克制表已成功儲存至 '{file_path}'。")
        
        reload_main_app_configs() # 通知主程式重新載入設定
        
        return True, None

    except Exception as e:
        config_editor_logger.error(f"儲存屬性克制表時發生錯誤: {e}", exc_info=True)
        return False, "儲存屬性克制表時發生伺服器內部錯誤。"

def save_champion_guardians_service(guardians_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    將新的冠軍守衛資料儲存到 champion_guardians.json 檔案。
    """
    try:
        # 從 Firestore 讀取原始檔案以保留不變的欄位
        doc_name, field_path = CONFIG_FILE_FIRESTORE_MAP["system/champion_guardians.json"]
        
        db = MD_firebase_config.db
        if not db:
            return False, "資料庫服務未初始化。"
            
        doc_ref = db.collection('MD_GameConfigs').document(doc_name)
        doc = doc_ref.get()

        if not doc.exists:
            return False, "找不到原始的冠軍守衛設定檔。"
        
        full_data = doc.to_dict()
        original_guardians = full_data.get(field_path, {}) if field_path else full_data

        # 用傳入的新數值更新資料
        for rank, new_stats in guardians_data.items():
            if rank in original_guardians:
                for stat, value in new_stats.items():
                    original_guardians[rank][stat] = value
                    # 如果是HP或MP，同時更新 hp 和 initial_max_hp
                    if stat == 'initial_max_hp':
                        original_guardians[rank]['hp'] = value
                    if stat == 'initial_max_mp':
                        original_guardians[rank]['mp'] = value

        # 更新回 Firestore
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

# --- 新增 START ---
def save_cultivation_settings_service(settings_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    將新的修煉設定儲存到 CultivationSettings 文件。
    """
    try:
        if not isinstance(settings_data, dict):
            return False, "傳入的資料格式不正確，應為一個字典。"

        db = MD_firebase_config.db
        doc_ref = db.collection('MD_GameConfigs').document('CultivationSettings')
        doc_ref.set(settings_data, merge=True) # 使用 merge=True 以只更新傳入的欄位
        
        config_editor_logger.info(f"修煉設定已成功更新至 Firestore。")
        reload_main_app_configs()
        return True, None

    except Exception as e:
        config_editor_logger.error(f"儲存修煉設定時發生錯誤: {e}", exc_info=True)
        return False, "儲存修煉設定時發生伺服器內部錯誤。"
# --- 新增 END ---

def reload_main_app_configs():
    try:
        from .MD_config_services import load_all_game_configs_from_firestore
        current_app.config['MD_GAME_CONFIGS'] = load_all_game_configs_from_firestore()
        config_editor_logger.info("主應用程式的遊戲設定已從 Firestore 重新載入。")
    except Exception as e:
        config_editor_logger.error(f"重新載入遊戲設定時失敗: {e}", exc_info=True)
