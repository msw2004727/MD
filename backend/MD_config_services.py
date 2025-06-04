# MD_config_services.py
# 負責從 Firestore 載入遊戲核心設定資料

# 移除頂層的 from MD_firebase_config import db
# 讓 db 的獲取在函數內部進行，確保它在 main.py 設置後才被使用

import logging
from firebase_admin import firestore # 僅用於類型提示或直接訪問 firestore 服務

# 設定日誌記錄器
config_logger = logging.getLogger(__name__)

# 定義預期的遊戲設定文件名稱和其在返回字典中的鍵名
CONFIG_DOCUMENTS_MAP = {
    "DNAFragments": "dna_fragments",
    "Rarities": "rarities",
    "Skills": "skills",
    "Personalities": "personalities",
    "Titles": "titles",
    "MonsterAchievementsList": "monster_achievements_list",
    "ElementNicknames": "element_nicknames",
    "NamingConstraints": "naming_constraints",
    "HealthConditions": "health_conditions",
    "NewbieGuide": "newbie_guide",
    "ValueSettings": "value_settings",
    "NPCMonsters": "npc_monsters",
    "AbsorptionSettings": "absorption_config",
    "CultivationSettings": "cultivation_config",
    "ElementalAdvantageChart": "elemental_advantage_chart" # 新增：元素克制表
}

# 為每個設定項定義預設值，以防資料庫中缺少對應文件
DEFAULT_GAME_CONFIGS = {
    "dna_fragments": [],
    "rarities": {
        "COMMON": {"name": "普通", "textVarKey": "--rarity-common-text", "statMultiplier": 1.0, "skillLevelBonus": 0, "resistanceBonus": 1, "value_factor": 10},
    },
    "skills": {
        "無": [{"name": "猛撞", "power": 20, "crit": 5, "probability": 70, "story": "用身體猛烈撞擊。", "type": "無", "baseLevel": 1, "mp_cost": 3, "skill_category": "近戰"}]
    },
    "personalities": [
        {"name": "標準", "description": "一個標準的怪獸個性。", "colorDark": "#888888", "colorLight":"#AAAAAA", "skill_preferences": {"近戰": 1.0}}
    ],
    "titles": ["新手"],
    "monster_achievements_list": ["新秀"],
    "element_nicknames": {
        "火": "炎獸", "水": "水靈", "木": "木精", "金": "金剛", "土": "岩怪",
        "光": "光使", "暗": "暗裔", "毒": "毒物", "風": "風靈", "無": "元氣", "混": "奇體"
    },
    "naming_constraints": {
        "max_player_title_len": 5, "max_monster_achievement_len": 5,
        "max_element_nickname_len": 5, "max_monster_full_nickname_len": 15
    },
    "health_conditions": [
        {"id": "healthy", "name": "健康", "description": "狀態良好。", "effects": {}, "duration": 0, "icon": "😊"}
    ],
    "newbie_guide": [
        {"title": "歡迎", "content": "歡迎來到怪獸異世界！"}
    ],
    "value_settings": {
        "element_value_factors": {"火": 1.2, "水": 1.1, "無": 0.7, "混": 0.6},
        "dna_recharge_conversion_factor": 0.15
    },
    "npc_monsters": [],
    "absorption_config": {
        "base_stat_gain_factor": 0.03, "score_diff_exponent": 0.3,
        "max_stat_gain_percentage": 0.015, "min_stat_gain": 1,
        "dna_extraction_chance_base": 0.75,
        "dna_extraction_rarity_modifier": {"普通": 1.0, "稀有": 0.9}
    },
    "cultivation_config": {
        "skill_exp_base_multiplier": 120, "new_skill_chance": 0.08,
        "skill_exp_gain_range": (15, 75), "max_skill_level": 7,
        "new_skill_rarity_bias": {"普通": 0.6, "稀有": 0.3}
    },
    "elemental_advantage_chart": { # 新增：元素克制表的預設值 (簡化)
        "火": {"木": 1.5, "水": 0.5}, "水": {"火": 1.5, "木": 0.5},
        "木": {"水": 1.5, "火": 0.5}, "光": {"暗": 1.5}, "暗": {"光": 1.5},
        # 其他元素對其他元素預設為 1.0 (無克制或被克)
    }
}

def load_all_game_configs_from_firestore() -> dict: # 實際返回類型應為 GameConfigs
    """
    從 Firestore 的 'MD_GameConfigs' 集合中載入所有遊戲設定。
    如果特定設定文件不存在或讀取失敗，將使用預設值。
    """
    # **修正：在函數內部重新獲取 db 實例，確保它已經被 main.py 設置**
    # 這是為了避免在模組加載時 db 還是 None 的情況
    from .MD_firebase_config import db as firestore_db_instance # 重新導入並賦予別名

    if not firestore_db_instance:
        config_logger.error("Firestore 資料庫未初始化 (load_all_game_configs_from_firestore)。將返回所有預設設定。")
        return DEFAULT_GAME_CONFIGS.copy()

    loaded_configs = {}
    config_logger.info("開始從 Firestore 載入遊戲設定...")

    for doc_name, config_key in CONFIG_DOCUMENTS_MAP.items():
        try:
            doc_ref = firestore_db_instance.collection('MD_GameConfigs').document(doc_name)
            doc = doc_ref.get()
            if doc.exists:
                doc_data = doc.to_dict()
                if doc_data:
                    if doc_name == "DNAFragments" and 'all_fragments' in doc_data:
                        loaded_configs[config_key] = doc_data['all_fragments']
                    elif doc_name == "Rarities" and 'dna_rarities' in doc_data:
                        loaded_configs[config_key] = doc_data['dna_rarities']
                    elif doc_name == "Skills" and 'skill_database' in doc_data:
                        loaded_configs[config_key] = doc_data['skill_database']
                    elif doc_name == "Personalities" and 'types' in doc_data:
                        loaded_configs[config_key] = doc_data['types']
                    elif doc_name == "Titles" and 'player_titles' in doc_data:
                        loaded_configs[config_key] = doc_data['player_titles']
                    elif doc_name == "MonsterAchievementsList" and 'achievements' in doc_data:
                        loaded_configs[config_key] = doc_data['achievements']
                    elif doc_name == "ElementNicknames" and 'nicknames' in doc_data:
                        loaded_configs[config_key] = doc_data['nicknames']
                    elif doc_name == "HealthConditions" and 'conditions_list' in doc_data:
                        loaded_configs[config_key] = doc_data['conditions_list']
                    elif doc_name == "NewbieGuide" and 'guide_entries' in doc_data:
                        loaded_configs[config_key] = doc_data['guide_entries']
                    elif doc_name == "NPCMonsters" and 'monsters' in doc_data:
                        loaded_configs[config_key] = doc_data['monsters']
                    elif doc_name in ["ValueSettings", "AbsorptionSettings", "CultivationSettings", "NamingConstraints", "ElementalAdvantageChart"]:
                        # 這些設定文件直接將字典作為文件內容儲存
                        loaded_configs[config_key] = doc_data
                    else:
                        config_logger.warning(f"文件 '{doc_name}' 存在，但資料結構未被特定處理，直接使用整個文件內容作為 '{config_key}'。")
                        loaded_configs[config_key] = doc_data
                    config_logger.info(f"成功從 Firestore 載入 '{doc_name}' 設定到鍵 '{config_key}'。")
                else:
                    config_logger.warning(f"Firestore 文件 '{doc_name}' 存在但為空。將使用預設 '{config_key}' 設定。")
                    loaded_configs[config_key] = DEFAULT_GAME_CONFIGS.get(config_key, {})
            else:
                config_logger.warning(f"在 Firestore 中找不到設定文件 '{doc_name}'。將使用預設 '{config_key}' 設定。")
                loaded_configs[config_key] = DEFAULT_GAME_CONFIGS.get(config_key, {})
        except Exception as e:
            config_logger.error(f"從 Firestore 載入 '{doc_name}' 設定時發生錯誤: {e}", exc_info=True)
            loaded_configs[config_key] = DEFAULT_GAME_CONFIGS.get(config_key, {})

    for default_key, default_value in DEFAULT_GAME_CONFIGS.items():
        if default_key not in loaded_configs:
            config_logger.info(f"設定 '{default_key}' 未從 Firestore 載入，將從預設值補充。")
            loaded_configs[default_key] = default_value

    config_logger.info("所有遊戲設定載入完成。")
    return loaded_configs

# --- 單個設定獲取函式 (可選) ---
# 這些函數也需要修改，以確保它們在調用 load_all_game_configs_from_firestore 時 db 已經設置
def get_dna_fragments() -> list:
    return load_all_game_configs_from_firestore().get("dna_fragments", DEFAULT_GAME_CONFIGS["dna_fragments"])

def get_rarities() -> dict:
    return load_all_game_configs_from_firestore().get("rarities", DEFAULT_GAME_CONFIGS["rarities"])

def get_skills_database() -> dict:
    return load_all_game_configs_from_firestore().get("skills", DEFAULT_GAME_CONFIGS["skills"])

def get_personalities() -> list:
    return load_all_game_configs_from_firestore().get("personalities", DEFAULT_GAME_CONFIGS["personalities"])

def get_player_titles() -> list:
    return load_all_game_configs_from_firestore().get("titles", DEFAULT_GAME_CONFIGS["titles"])

def get_monster_achievements_list() -> list:
    return load_all_game_configs_from_firestore().get("monster_achievements_list", DEFAULT_GAME_CONFIGS["monster_achievements_list"])

def get_element_nicknames() -> dict:
    return load_all_game_configs_from_firestore().get("element_nicknames", DEFAULT_GAME_CONFIGS["element_nicknames"])

def get_naming_constraints() -> dict:
    return load_all_game_configs_from_firestore().get("naming_constraints", DEFAULT_GAME_CONFIGS["naming_constraints"])

def get_value_settings() -> dict:
    return load_all_game_configs_from_firestore().get("value_settings", DEFAULT_GAME_CONFIGS["value_settings"])

def get_npc_monsters() -> list:
    return load_all_game_configs_from_firestore().get("npc_monsters", DEFAULT_GAME_CONFIGS["npc_monsters"])

def get_absorption_config() -> dict:
    return load_all_game_configs_from_firestore().get("absorption_config", DEFAULT_GAME_CONFIGS["absorption_config"])

def get_cultivation_config() -> dict:
    return load_all_game_configs_from_firestore().get("cultivation_config", DEFAULT_GAME_CONFIGS["cultivation_config"])

def get_elemental_advantage_chart() -> dict: # 新增
    return load_all_game_configs_from_firestore().get("elemental_advantage_chart", DEFAULT_GAME_CONFIGS["elemental_advantage_chart"])


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    config_logger.info("正在測試 MD_config_services.py...")

    # 為了在獨立運行時測試，需要模擬 db 的設置
    try:
        # 這裡假設在測試環境下可以這樣初始化
        import firebase_admin
        from firebase_admin import credentials
        # 這裡需要一個有效的服務帳戶金鑰路徑或環境變數
        # 為了測試方便，如果沒有實際憑證，可能會失敗
        # 或者使用 Mock 對象
        if not firebase_admin._apps: # 避免重複初始化
            # 嘗試從環境變數獲取，或者使用一個測試用的憑證
            test_firebase_credentials_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
            if test_firebase_credentials_json:
                cred = credentials.Certificate(json.loads(test_firebase_credentials_json))
                firebase_admin.initialize_app(cred)
            else:
                config_logger.warning("測試環境下未找到 FIREBASE_SERVICE_ACCOUNT_KEY，可能無法連接 Firestore。")
                # 如果沒有憑證，這裡的測試會失敗，因為無法連接 Firestore
                # 實際運行時由 main.py 負責初始化
                # 為了讓測試不報錯，可以考慮 mock firestore_db_instance
        
        from MD_firebase_config import set_firestore_client, db as current_db_instance
        if not current_db_instance: # 如果還沒設置，則設置
            set_firestore_client(firestore.client())
            config_logger.info("測試模式下 Firestore client 已設定。")

    except Exception as e:
        config_logger.error(f"測試模式下 Firebase 初始化失敗: {e}", exc_info=True)


    game_configurations = load_all_game_configs_from_firestore()

    if game_configurations:
        print("\n成功載入的遊戲設定 (部分預覽):")
        for key in game_configurations.keys():
            value = game_configurations[key]
            if isinstance(value, list):
                print(f"  {key}: (共 {len(value)} 項)")
                if value: print(f"    示例第一項: {value[0]}")
            elif isinstance(value, dict):
                print(f"  {key}: (共 {len(value)} 鍵)")
                if value:
                    first_item_key = next(iter(value), None)
                    if first_item_key: print(f"    示例第一項/鍵 [{first_item_key}]: {value[first_item_key]}")
            else:
                print(f"  {key}: {value}")
        
        print("\n--- 單獨獲取 ElementalAdvantageChart 測試 ---")
        elemental_chart_cfg = get_elemental_advantage_chart()
        if elemental_chart_cfg and isinstance(elemental_chart_cfg.get("火"), dict):
            print(f"  火對木的克制倍率: {elemental_chart_cfg['火'].get('木')}")
            print(f"  水對火的克制倍率: {elemental_chart_cfg.get('水', {}).get('火')}")
        else:
            print("未能正確獲取到 ElementalAdvantageChart 或其結構不符。")
    else:
        print("載入遊戲設定失敗 (返回為 None 或空)。")

