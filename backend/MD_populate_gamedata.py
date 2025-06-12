# MD_populate_gamedata.py
# 用於將遊戲設定資料一次性匯入到 Firestore

# --- 新增：路徑修正 ---
import os
import sys
# 將專案根目錄（backend資料夾的上一層）添加到 Python 的模組搜索路徑
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
# --- 路徑修正結束 ---

import time
import random
import json
import logging
import csv 

# 導入 Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, firestore

# 將原本的相對導入改成從 backend 開始的絕對導入
from backend.MD_firebase_config import set_firestore_client


# 設定日誌記錄器
# --- 修改：使用 basicConfig 進行一次性設定，避免重複 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
script_logger = logging.getLogger(__name__)
# --- 修改結束 ---


# 輔助用列表 (與 MD_models.py 中的 Literal 一致)
ELEMENT_TYPES = ["火", "水", "木", "金", "土", "光", "暗", "毒", "風", "無", "混"]
RARITY_NAMES = ["普通", "稀有", "菁英", "傳奇", "神話"]
SKILL_CATEGORIES = ["近戰", "遠程", "魔法", "輔助", "物理", "特殊", "變化", "其他"]

# 服務帳戶金鑰檔案的路徑 (作為本地開發的備用)
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json'

def initialize_firebase_for_script():
    """
    為此腳本初始化 Firebase Admin SDK。
    優先從環境變數 'FIREBASE_SERVICE_ACCOUNT_KEY' 載入憑證。
    如果環境變數不存在，則嘗試從本地檔案 'serviceAccountKey.json' 載入。
    """
    if not firebase_admin._apps: 
        cred = None
        firebase_credentials_json_env = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
        script_logger.info(f"環境變數 FIREBASE_SERVICE_ACCOUNT_KEY: {'已設定' if firebase_credentials_json_env else '未設定'}")

        if firebase_credentials_json_env:
            script_logger.info("嘗試從環境變數載入 Firebase 憑證...")
            try:
                cred_obj = json.loads(firebase_credentials_json_env)
                cred = credentials.Certificate(cred_obj)
                script_logger.info("成功從環境變數解析憑證物件。")
            except Exception as e:
                script_logger.error(f"從環境變數解析 Firebase 憑證失敗: {e}", exc_info=True)
                cred = None
        else:
            script_logger.info(f"未設定環境變數憑證，嘗試從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 載入 (適用於本地開發)。")
            # 修正路徑檢查
            if os.path.exists(os.path.join(os.path.dirname(__file__), SERVICE_ACCOUNT_KEY_PATH)):
                try:
                    cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), SERVICE_ACCOUNT_KEY_PATH))
                    script_logger.info(f"成功從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 創建憑證物件。")
                except Exception as e:
                    script_logger.error(f"從本地檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 創建 Firebase 憑證物件失敗: {e}", exc_info=True)
                    cred = None
            else:
                script_logger.warning(f"本地金鑰檔案 '{SERVICE_ACCOUNT_KEY_PATH}' 不存在。")

        if cred:
            script_logger.info("獲得有效憑證物件，嘗試初始化 Firebase Admin SDK...")
            try:
                firebase_admin.initialize_app(cred)
                script_logger.info("Firebase Admin SDK 已使用提供的憑證成功初始化。")
                set_firestore_client(firestore.client())
                return True 
            except Exception as e:
                script_logger.error(f"使用提供的憑證初始化 Firebase Admin SDK 失敗: {e}", exc_info=True)
                return False
        else:
            script_logger.critical("未能獲取有效的 Firebase 憑證，Firebase Admin SDK 未初始化。")
            return False
    else:
        from backend.MD_firebase_config import db as current_db_check
        if current_db_check is None:
             set_firestore_client(firestore.client())
        script_logger.info("Firebase Admin SDK 已初始化，跳過重複初始化。")
    return True


def populate_game_configs():
    """
    將遊戲設定資料寫入 Firestore 的 MD_GameConfigs 集合。
    """
    if not initialize_firebase_for_script():
        script_logger.error("錯誤：Firebase 未成功初始化。無法執行資料填充。")
        return

    from backend.MD_firebase_config import db as firestore_db_instance
    if firestore_db_instance is None:
        script_logger.error("錯誤：Firestore 資料庫未初始化 (在 populate_game_configs 內部)。無法執行資料填充。")
        return

    db_client = firestore_db_instance
    script_logger.info("開始填充/更新遊戲設定資料到 Firestore...")
    
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        script_logger.info(f"已建立 'data' 資料夾於: {data_dir}")

    # --- 載入 DNA 碎片資料 ---
    try:
        dna_fragments_path = os.path.join(data_dir, 'dna_fragments.json')
        with open(dna_fragments_path, 'r', encoding='utf-8') as f:
            dna_fragments_data = json.load(f)
        script_logger.info(f"成功從 {dna_fragments_path} 載入 {len(dna_fragments_data)} 種 DNA 碎片資料。")
        db_client.collection('MD_GameConfigs').document('DNAFragments').set({'all_fragments': dna_fragments_data})
        script_logger.info("成功寫入 DNAFragments 資料。")
    except Exception as e:
        script_logger.error(f"處理 DNAFragments 資料失敗: {e}")
        return

    # --- 載入技能資料 ---
    try:
        skills_path = os.path.join(data_dir, 'skills.json')
        with open(skills_path, 'r', encoding='utf-8') as f:
            skill_database_data = json.load(f)
        script_logger.info(f"成功從 {skills_path} 載入技能資料。")
        db_client.collection('MD_GameConfigs').document('Skills').set({'skill_database': skill_database_data})
        script_logger.info("成功寫入 Skills 資料。")
    except Exception as e:
        script_logger.error(f"處理 Skills 資料失敗: {e}")
        return

    # --- 載入個性資料 (從CSV) ---
    personalities_data = []
    try:
        personalities_path = os.path.join(data_dir, 'personalities.csv')
        with open(personalities_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            skill_preference_keys = SKILL_CATEGORIES
            for row in reader:
                skill_prefs = {}
                for key in skill_preference_keys:
                    try:
                        skill_prefs[key] = float(row.get(key, 1.0))
                    except (ValueError, TypeError):
                        skill_prefs[key] = 1.0
                
                personality = {
                    "name": row.get("name", "未知"),
                    "description": row.get("description", ""),
                    "colorDark": row.get("colorDark", "#FFFFFF"),
                    "colorLight": row.get("colorLight", "#000000"),
                    "skill_preferences": skill_prefs
                }
                personalities_data.append(personality)
        script_logger.info(f"成功從 {personalities_path} 載入 {len(personalities_data)} 種個性資料。")
        db_client.collection('MD_GameConfigs').document('Personalities').set({'types': personalities_data})
        script_logger.info("成功寫入 Personalities 資料。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到個性設定檔 {personalities_path}。請確認檔案已放置在 'backend/data/' 資料夾中並命名為 'personalities.csv'。")
        return
    except Exception as e:
        script_logger.error(f"處理 Personalities 資料失敗: {e}")
        return

    # --- 載入修煉故事資料 ---
    try:
        stories_path = os.path.join(data_dir, 'cultivation_stories.json')
        with open(stories_path, 'r', encoding='utf-8') as f:
            stories_data = json.load(f)
        script_logger.info(f"成功從 {stories_path} 載入 {len(stories_data)} 個地點的修煉故事資料。")
        db_client.collection('MD_GameConfigs').document('CultivationStories').set({'story_library': stories_data})
        script_logger.info("成功寫入 CultivationStories 資料。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到修煉故事設定檔 {stories_path}。")
    except Exception as e:
        script_logger.error(f"處理 CultivationStories 資料失敗: {e}")


    # --- 寫入其他設定 ---
    
    # DNA 稀有度資料 (Rarities)
    dna_rarities_data = {
        "COMMON": { "name": "普通", "textVarKey": "--rarity-common-text", "statMultiplier": 1.0, "skillLevelBonus": 0, "resistanceBonus": 1, "value_factor": 10 },
        "RARE": { "name": "稀有", "textVarKey": "--rarity-rare-text", "statMultiplier": 1.15, "skillLevelBonus": 0, "resistanceBonus": 3, "value_factor": 30 },
        "ELITE": { "name": "菁英", "textVarKey": "--rarity-elite-text", "statMultiplier": 1.3, "skillLevelBonus": 1, "resistanceBonus": 5, "value_factor": 75 },
        "LEGENDARY": { "name": "傳奇", "textVarKey": "--rarity-legendary-text", "statMultiplier": 1.5, "skillLevelBonus": 2, "resistanceBonus": 8, "value_factor": 150 },
        "MYTHICAL": { "name": "神話", "textVarKey": "--rarity-mythical-text", "statMultiplier": 1.75, "skillLevelBonus": 3, "resistanceBonus": 12, "value_factor": 300 },
    }
    db_client.collection('MD_GameConfigs').document('Rarities').set({'dna_rarities': dna_rarities_data})

    # --- 載入並寫入稱號資料 (從 titles.json) ---
    try:
        titles_path = os.path.join(data_dir, 'titles.json')
        with open(titles_path, 'r', encoding='utf-8') as f:
            titles_data_from_json = json.load(f)
        script_logger.info(f"成功從 {titles_path} 載入 {len(titles_data_from_json)} 個稱號資料。")
        # 注意：這裡的欄位名稱 'player_titles' 是為了與 config_services 中的 doc_map 保持一致
        db_client.collection('MD_GameConfigs').document('Titles').set({'player_titles': titles_data_from_json})
        script_logger.info("成功將 titles.json 的內容寫入 Firestore 的 Titles 文件。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到稱號設定檔 {titles_path}。請確認檔案已建立。")
        return
    except Exception as e:
        script_logger.error(f"處理 Titles 資料失敗: {e}")
        return

    # 怪物成就列表 (MonsterAchievementsList)
    monster_achievements_data = [
        "初戰星", "百戰將", "常勝軍", "不死鳥", "速攻手", "重炮手", "守護神", "控場師", "元素核", "進化者",
        "稀有種", "菁英級", "傳奇級", "神話級", "無名者", "幸運星", "破壞王", "戰術家", "治癒者", "潛力股"
    ]
    db_client.collection('MD_GameConfigs').document('MonsterAchievementsList').set({'achievements': monster_achievements_data})

    # 元素預設名 (ElementNicknames)
    element_nicknames_data = {
        "火": "炎魂獸", "水": "碧波精", "木": "森之裔", "金": "鐵甲衛", "土": "岩心怪",
        "光": "聖輝使", "暗": "影匿者", "毒": "毒牙獸", "風": "疾風行", "無": "元氣寶", "混": "混沌體"
    }
    db_client.collection('MD_GameConfigs').document('ElementNicknames').set({'nicknames': element_nicknames_data})

    # 命名限制設定 (NamingConstraints)
    naming_constraints_data = {
        "max_player_title_len": 5, "max_monster_achievement_len": 5,
        "max_element_nickname_len": 5, "max_monster_full_nickname_len": 15
    }
    db_client.collection('MD_GameConfigs').document('NamingConstraints').set(naming_constraints_data)

    # 健康狀況資料 (HealthConditions)
    health_conditions_data = [
        {"id": "poisoned", "name": "中毒", "description": "持續受到毒素傷害，每回合損失HP。", "effects": {"hp_per_turn": -8}, "duration": 3, "icon": "🤢"},
        {"id": "paralyzed", "name": "麻痺", "description": "速度大幅下降，有較高機率無法行動。", "effects": {"speed": -20}, "duration": 2, "icon": "⚡", "chance_to_skip_turn": 0.3 },
        {"id": "burned", "name": "燒傷", "description": "持續受到灼燒傷害，攻擊力顯著下降。", "effects": {"hp_per_turn": -5, "attack": -10}, "duration": 3, "icon": "🔥"},
        {"id": "confused", "name": "混亂", "description": "行動時有50%機率攻擊自己或隨機目標。", "effects": {}, "duration": 2, "icon": "😵", "confusion_chance": 0.5},
        {"id": "energized", "name": "精力充沛", "description": "狀態絕佳！所有能力微幅提升。", "effects": {"attack": 5, "defense": 5, "speed": 5, "crit": 3}, "duration": 3, "icon": "💪"},
        {"id": "weakened", "name": "虛弱", "description": "所有主要戰鬥數值大幅下降。", "effects": {"attack": -12, "defense": -12, "speed": -8, "crit": -5}, "duration": 2, "icon": "😩"},
        {"id": "frozen", "name": "冰凍", "description": "完全無法行動，但受到火系攻擊傷害加倍。", "effects": {}, "duration": 1, "icon": "🧊", "elemental_vulnerability": {"火": 2.0} }
    ]
    db_client.collection('MD_GameConfigs').document('HealthConditions').set({'conditions_list': health_conditions_data})

    # 新手指南資料 (NewbieGuide)
    newbie_guide_data = [
        {"title": "遊戲目標", "content": "歡迎來到怪獸異世界！您的目標是透過組合不同的DNA碎片，創造出獨一無二的強大怪獸，並透過養成提升它們的能力，最終在排行榜上名列前茅。"},
        {"title": "怪獸命名規則", "content": "怪獸的完整名稱將由「您的當前稱號」+「怪獸獲得的成就」+「怪獸的屬性代表名」自動組成，總長度不超過15個字。您可以在怪獸詳細資料中修改其「屬性代表名」(最多5個字)。"},
        {"title": "DNA組合與怪獸農場", "content": "在「DNA管理」頁籤的「DNA組合」区塊，您可以將擁有的「DNA碎片」拖曳到上方的組合槽中。合成的怪獸會出現在「怪物農場」。農場是您培育、出戰、放生怪獸的地方。"},
        {"title": "戰鬥與吸收", "content": "您可以指派怪獸出戰並挑戰其他怪獸。勝利後，您有機會吸收敗方怪獸的精華，這可能會讓您的怪獸獲得數值成長，並獲得敗方怪獸的DNA碎片作為戰利品！"},
        {"title": "醫療站", "content": "「醫療站」是您照護怪獸的地方。您可以為受傷的怪獸恢復HP、MP，或治療不良的健康狀態。此外，您還可以將不需要的怪獸分解成DNA碎片，或使用特定的DNA為同屬性怪獸進行充能恢復HP。"},
        {"title": "修煉與技能成長", "content": "透過「養成」功能，您的怪獸可以進行修煉。修煉不僅能提升基礎數值、獲得物品，還有機會讓怪獸的技能獲得經驗值。技能經驗值滿了就能升級，變得更強！修煉中還有可能領悟全新的技能(等級1)！您將有機會決定是否讓怪獸學習新技能或替換現有技能。"},
        {"title": "屬性克制與技能類別", "content": "遊戲中存在屬性克制關係（詳見元素克制表）。此外，技能分為近戰、遠程、魔法、輔助等不同類別，怪獸的個性會影響它們使用不同類別技能的傾向。"},
    ]
    db_client.collection('MD_GameConfigs').document('NewbieGuide').set({'guide_entries': newbie_guide_data})

    # 價值設定資料 (ValueSettings)
    value_settings_data = {
        "element_value_factors": {
            "火": 1.2, "水": 1.1, "木": 1.0, "金": 1.3, "土": 0.9,
            "光": 1.5, "暗": 1.4, "毒": 0.8, "風": 1.0, "無": 0.7, "混": 0.6
        },
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10, 
        "max_monster_skills": 3,
        "max_battle_turns": 30,
        "max_inventory_slots": 12,
        "max_temp_backpack_slots": 9,
        "max_cultivation_time_seconds": 3600,
        "starting_gold": 500
    }
    db_client.collection('MD_GameConfigs').document('ValueSettings').set(value_settings_data)

    # 吸收效果設定 (AbsorptionSettings)
    absorption_settings_data = {
        "base_stat_gain_factor": 0.03, "score_diff_exponent": 0.3,
        "max_stat_gain_percentage": 0.015, "min_stat_gain": 1,
        "dna_extraction_chance_base": 0.75,
        "dna_extraction_rarity_modifier": {
            "普通": 1.0, "稀有": 0.9, "菁英":0.75, "傳奇":0.6, "神話":0.45
        }
    }
    db_client.collection('MD_GameConfigs').document('AbsorptionSettings').set(absorption_settings_data)

    # 修煉系統設定 (CultivationSettings)
    default_stat_weights = { "hp": 30, "mp": 25, "attack": 20, "defense": 20, "speed": 15, "crit": 10 }
    cultivation_settings_data = {
        "skill_exp_base_multiplier": 100, "new_skill_chance": 0.1,
        "skill_exp_gain_range": (15, 75), "max_skill_level": 10,
        "new_skill_rarity_bias": { "普通": 0.6, "稀有": 0.3, "菁英": 0.1 },
        "stat_growth_weights": default_stat_weights,
        "stat_growth_duration_divisor": 900, "dna_find_chance": 0.5,
        "dna_find_duration_divisor": 1200,
        "dna_find_loot_table": {
            "普通": {"普通": 0.8, "稀有": 0.2},
            "稀有": {"普通": 0.5, "稀有": 0.4, "菁英": 0.1},
            "菁英": {"普通": 0.2, "稀有": 0.5, "菁英": 0.25, "傳奇": 0.05},
            "傳奇": {"稀有": 0.4, "菁英": 0.4, "傳奇": 0.15, "神話": 0.05},
            "神話": {"菁英": 0.5, "傳奇": 0.4, "神話": 0.1}
        },
        "location_biases": {
            "gaia": {
                "name": "蓋亞的搖籃",
                "stat_growth_weights": default_stat_weights,
                "element_bias": ["木", "水", "土", "毒"]
            },
            "sky": {
                "name": "天空的怒火",
                "stat_growth_weights": default_stat_weights,
                "element_bias": ["火", "風", "光"]
            },
            "crystal": {
                "name": "人智的結晶",
                "stat_growth_weights": default_stat_weights,
                "element_bias": ["金", "暗", "混"]
            }
        }
    }
    db_client.collection('MD_GameConfigs').document('CultivationSettings').set(cultivation_settings_data)

    # 元素克制表 (ElementalAdvantageChart)
    elemental_advantage_chart_data = {
        "火": {"木": 1.5, "水": 0.5, "金": 1.2, "土": 0.8},
        "水": {"火": 1.5, "土": 1.2, "木": 0.5, "金": 0.8},
        "木": {"水": 1.5, "土": 0.5, "金": 0.8, "火": 0.8, "毒": 1.2},
        "金": {"木": 1.5, "風": 1.2, "火": 0.5, "土": 1.2, "水": 0.8, "毒": 0.8},
        "土": {"火": 1.2, "金": 0.5, "水": 0.5, "木": 1.5, "風": 0.8, "毒": 1.2},
        "光": {"暗": 1.75, "毒": 0.7},
        "暗": {"光": 1.75, "風": 0.7},
        "毒": {"木": 1.4, "土": 1.2, "光": 0.7, "金": 0.7, "風": 0.8},
        "風": {"土": 1.4, "木": 1.4, "暗": 0.7, "金": 0.7, "毒": 0.8},
    }
    for el in ELEMENT_TYPES:
        if el not in elemental_advantage_chart_data: elemental_advantage_chart_data[el] = {}
        for defender_el in ELEMENT_TYPES:
            if defender_el not in elemental_advantage_chart_data[el]: elemental_advantage_chart_data[el][defender_el] = 1.0
    db_client.collection('MD_GameConfigs').document('ElementalAdvantageChart').set(elemental_advantage_chart_data)

    # NPC 怪獸資料 (NPCMonsters)
    _monster_achievements = monster_achievements_data
    _element_nicknames = element_nicknames_data

    npc_monsters_data = [
        {
            "id": "npc_m_001", "nickname": "", "elements": ["火"], "elementComposition": {"火": 100.0},
            "hp": 80, "mp": 30, "initial_max_hp": 80, "initial_max_mp": 30, "attack": 15, "defense": 10, "speed": 12, "crit": 5,
            "skills": random.sample(skill_database_data["火"], min(len(skill_database_data["火"]), random.randint(1,2))) if skill_database_data.get("火") else [],
            "rarity": "普通", "title": random.choice(_monster_achievements),
            "custom_element_nickname": _element_nicknames.get("火", "火獸"), "description": "一隻活潑的火焰小蜥蜴，喜歡追逐火花。",
            "personality": random.choice(personalities_data), "creationTime": int(time.time()),
            "farmStatus": {}, "resistances": {"火": 3, "水": -2}, "score": random.randint(100, 150), "isNPC": True,
            "resume": {"wins": 0, "losses": 0},
            "constituent_dna_ids": [random.choice([d['id'] for d in dna_fragments_data if d['type'] == '火' and d['rarity'] == '普通'])]
        },
        {
            "id": "npc_m_002", "nickname": "", "elements": ["木", "土"], "elementComposition": {"木": 70.0, "土": 30.0},
            "hp": 120, "mp": 25, "initial_max_hp": 120, "initial_max_mp": 25, "attack": 10, "defense": 20, "speed": 8, "crit": 3,
            "skills": random.sample(skill_database_data.get("木", []) + skill_database_data.get("土", []) + skill_database_data.get("無", []), min(len(skill_database_data.get("木", []) + skill_database_data.get("土", []) + skill_database_data.get("無", [])), random.randint(2,3))),
            "rarity": "稀有", "title": random.choice(_monster_achievements),
            "custom_element_nickname": _element_nicknames.get("木", "木靈"), "description": "堅毅的森林守衛者幼苗，擁有大地與森林的祝福。",
            "personality": random.choice(personalities_data), "creationTime": int(time.time()),
            "farmStatus": {}, "resistances": {"木": 5, "土": 5, "火": -3}, "score": random.randint(160, 220), "isNPC": True,
            "resume": {"wins": 0, "losses": 0},
            "constituent_dna_ids": [
                random.choice([d['id'] for d in dna_fragments_data if d['type'] == '木' and d['rarity'] == '稀有']),
                random.choice([d['id'] for d in dna_fragments_data if d['type'] == '土' and d['rarity'] == '普通'])
            ]
        }
    ]
    db_client.collection('MD_GameConfigs').document('NPCMonsters').set({'monsters': npc_monsters_data})

    script_logger.info("所有遊戲設定資料填充/更新完畢。")

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    script_logger.info("正在直接執行 MD_populate_gamedata.py 腳本...")

    populate_game_configs()
