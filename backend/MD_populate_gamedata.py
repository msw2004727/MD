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
script_logger = logging.getLogger(__name__)
script_logger.setLevel(logging.INFO) 
if not script_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    script_logger.addHandler(handler)


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

    # --- 載入技能資料 (從拆分檔案) ---
    try:
        skills_dir = os.path.join(data_dir, 'skills')
        if not os.path.exists(skills_dir):
            os.makedirs(skills_dir)
            script_logger.warning(f"技能資料夾 'skills' 不存在，已自動建立於: {skills_dir}。請將技能檔案放入此處。")

        skill_database_data = {}
        element_map = {
            "fire": "火", "water": "水", "wood": "木", "gold": "金", "earth": "土",
            "light": "光", "dark": "暗", "poison": "毒", "wind": "風", "none": "無", "mix": "混"
        }

        for filename in os.listdir(skills_dir):
            if filename.endswith('.json'):
                element_en = filename[:-5] # 移除 .json
                element_zh = element_map.get(element_en)
                if not element_zh:
                    script_logger.warning(f"跳過未知的技能檔名: {filename}")
                    continue
                
                file_path = os.path.join(skills_dir, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    skills = json.load(f)
                    skill_database_data[element_zh] = skills
                    script_logger.info(f"成功載入 {element_zh} 屬性技能 ({len(skills)}個) 從 {filename}")

        if not skill_database_data:
             script_logger.warning("技能資料庫為空，可能是 'skills' 資料夾中沒有有效的 .json 檔案。")

        db_client.collection('MD_GameConfigs').document('Skills').set({'skill_database': skill_database_data})
        script_logger.info("成功將組合後的技能資料寫入 Firestore 的 Skills 文件。")
    except Exception as e:
        script_logger.error(f"處理 Skills 資料夾失敗: {e}", exc_info=True)
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

    # --- 載入冠軍守門員資料 ---
    try:
        guardians_path = os.path.join(data_dir, 'champion_guardians.json')
        with open(guardians_path, 'r', encoding='utf-8') as f:
            guardians_data = json.load(f)
        script_logger.info(f"成功從 {guardians_path} 載入冠軍守門員資料。")
        db_client.collection('MD_GameConfigs').document('ChampionGuardians').set({'guardians': guardians_data})
        script_logger.info("成功寫入 ChampionGuardians 資料。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到冠軍守門員設定檔 {guardians_path}。")
    except Exception as e:
        script_logger.error(f"處理 ChampionGuardians 資料失敗: {e}")

    # --- 載入狀態效果資料 (從 status_effects.json) ---
    try:
        status_effects_path = os.path.join(data_dir, 'status_effects.json')
        with open(status_effects_path, 'r', encoding='utf-8') as f:
            status_effects_data = json.load(f)
        script_logger.info(f"成功從 {status_effects_path} 載入 {len(status_effects_data)} 個狀態效果資料。")
        db_client.collection('MD_GameConfigs').document('StatusEffects').set({'effects_list': status_effects_data})
        script_logger.info("成功將 status_effects.json 的內容寫入 Firestore 的 StatusEffects 文件。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到狀態效果設定檔 {status_effects_path}。請確認檔案已建立。")
        return
    except Exception as e:
        script_logger.error(f"處理 StatusEffects 資料失敗: {e}")
        return
        
    # --- 新增：載入戰鬥亮點資料 (從 battle_highlights.json) ---
    try:
        highlights_path = os.path.join(data_dir, 'battle_highlights.json')
        with open(highlights_path, 'r', encoding='utf-8') as f:
            highlights_data = json.load(f)
        script_logger.info(f"成功從 {highlights_path} 載入戰鬥亮點資料。")
        # 直接將整個 JSON 物件存入，包含 'highlights_map' 和 'default_highlight'
        db_client.collection('MD_GameConfigs').document('BattleHighlights').set(highlights_data)
        script_logger.info("成功將 battle_highlights.json 的內容寫入 Firestore 的 BattleHighlights 文件。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到戰鬥亮點設定檔 {highlights_path}。")
    except Exception as e:
        script_logger.error(f"處理 BattleHighlights 資料失敗: {e}")

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

    # --- 載入並寫入元素預設名 (從 element_nicknames.json) ---
    try:
        nicknames_path = os.path.join(data_dir, 'element_nicknames.json')
        with open(nicknames_path, 'r', encoding='utf-8') as f:
            element_nicknames_data = json.load(f)
        script_logger.info(f"成功從 {nicknames_path} 載入元素暱稱資料。")
        db_client.collection('MD_GameConfigs').document('ElementNicknames').set({'nicknames': element_nicknames_data})
        script_logger.info("成功將 element_nicknames.json 的內容寫入 Firestore 的 ElementNicknames 文件。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到元素暱稱設定檔 {nicknames_path}。請確認檔案已建立。")
        return
    except Exception as e:
        script_logger.error(f"處理 ElementNicknames 資料失敗: {e}")
        return

    # 命名限制設定 (NamingConstraints)
    naming_constraints_data = {
        "max_player_title_len": 5, "max_monster_achievement_len": 5,
        "max_element_nickname_len": 5, "max_monster_full_nickname_len": 15
    }
    db_client.collection('MD_GameConfigs').document('NamingConstraints').set(naming_constraints_data)

    # 新手指南資料 (NewbieGuide)
    try:
        guide_path = os.path.join(data_dir, 'newbie_guide.json')
        with open(guide_path, 'r', encoding='utf-8') as f:
            newbie_guide_data = json.load(f)
        script_logger.info(f"成功從 {guide_path} 載入新手指南資料。")
        db_client.collection('MD_GameConfigs').document('NewbieGuide').set({'guide_entries': newbie_guide_data})
        script_logger.info("成功寫入 NewbieGuide 資料。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到新手指南設定檔 {guide_path}。")
    except Exception as e:
        script_logger.error(f"處理 NewbieGuide 資料失敗: {e}")

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
        "starting_gold": 500,
        "cultivation_diminishing_return_window_seconds": 3600
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

    # 檢查 skill_database_data 是否為空，避免在空的字典上操作
    if not skill_database_data:
        script_logger.error("技能資料庫為空，無法為 NPC 生成技能。")
        npc_monsters_data = [] # 如果沒有技能資料，則不創建 NPC
    else:
        npc_monsters_data = [
            {
                "id": "npc_m_001", "nickname": "", "elements": ["火"], "elementComposition": {"火": 100.0},
                "hp": 80, "mp": 30, "initial_max_hp": 80, "initial_max_mp": 30, "attack": 15, "defense": 10, "speed": 12, "crit": 5,
                "skills": random.sample(skill_database_data.get("火", []), min(len(skill_database_data.get("火", [])), random.randint(1,2))),
                "rarity": "普通", "title": random.choice(_monster_achievements),
                "custom_element_nickname": _element_nicknames.get("火", {}).get("普通", ["火獸"])[0], "description": "一隻活潑的火焰小蜥蜴，喜歡追逐火花。",
                "personality": random.choice(personalities_data), "creationTime": int(time.time()),
                "farmStatus": {}, "resistances": {"火": 3, "水": -2}, "score": random.randint(100, 150), "isNPC": True,
                "resume": {"wins": 0, "losses": 0},
                "constituent_dna_ids": [random.choice([d['id'] for d in dna_fragments_data if d['type'] == '火' and d['rarity'] == '普通'])] if any(d['type'] == '火' and d['rarity'] == '普通' for d in dna_fragments_data) else []
            },
            {
                "id": "npc_m_002", "nickname": "", "elements": ["木", "土"], "elementComposition": {"木": 70.0, "土": 30.0},
                "hp": 120, "mp": 25, "initial_max_hp": 120, "initial_max_mp": 25, "attack": 10, "defense": 20, "speed": 8, "crit": 3,
                "skills": random.sample(
                    skill_database_data.get("木", []) + skill_database_data.get("土", []) + skill_database_data.get("無", []),
                    min(len(skill_database_data.get("木", []) + skill_database_data.get("土", []) + skill_database_data.get("無", [])), random.randint(2,3))
                ),
                "rarity": "稀有", "title": random.choice(_monster_achievements),
                "custom_element_nickname": _element_nicknames.get("木", {}).get("稀有", ["木靈"])[0], "description": "堅毅的森林守衛者幼苗，擁有大地與森林的祝福。",
                "personality": random.choice(personalities_data), "creationTime": int(time.time()),
                "farmStatus": {}, "resistances": {"木": 5, "土": 5, "火": -3}, "score": random.randint(160, 220), "isNPC": True,
                "resume": {"wins": 0, "losses": 0},
                "constituent_dna_ids": [
                    random.choice([d['id'] for d in dna_fragments_data if d['type'] == '木' and d['rarity'] == '稀有']),
                    random.choice([d['id'] for d in dna_fragments_data if d['type'] == '土' and d['rarity'] == '普通'])
                ] if any(d['type'] == '木' and d['rarity'] == '稀有' for d in dna_fragments_data) and any(d['type'] == '土' and d['rarity'] == '普通' for d in dna_fragments_data) else []
            }
        ]

    db_client.collection('MD_GameConfigs').document('NPCMonsters').set({'monsters': npc_monsters_data})

    script_logger.info("所有遊戲設定資料填充/更新完畢。")

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    script_logger.info("正在直接執行 MD_populate_gamedata.py 腳本...")

    populate_game_configs()
