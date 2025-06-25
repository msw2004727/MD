# MD_populate_gamedata.py
# 用於將遊戲設定資料一次性匯入到 Firestore

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import time
import random
import json
import logging
import csv 

import firebase_admin
from firebase_admin import credentials, firestore

from backend.MD_firebase_config import set_firestore_client


# 設定日誌記錄器
script_logger = logging.getLogger(__name__)
script_logger.setLevel(logging.INFO) 
if not script_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    script_logger.addHandler(handler)


# 輔助用列表
ELEMENT_TYPES = ["火", "水", "木", "金", "土", "光", "暗", "毒", "風", "無", "混"]
RARITY_NAMES = ["普通", "稀有", "菁英", "傳奇", "神話"]
SKILL_CATEGORIES = ["近戰", "遠程", "魔法", "輔助", "物理", "特殊", "變化", "其他"]
SERVICE_ACCOUNT_KEY_PATH = 'serviceAccountKey.json'

def initialize_firebase_for_script():
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
    if not initialize_firebase_for_script():
        script_logger.error("錯誤：Firebase 未成功初始化。無法執行資料填充。")
        return

    from backend.MD_firebase_config import db as firestore_db_instance
    if firestore_db_instance is None:
        script_logger.error("錯誤：Firestore 資料庫未初始化 (在 populate_game_configs 內部)。無法執行資料填充。")
        return

    db_client = firestore_db_instance
    script_logger.info("開始填充/更新遊戲設定資料到 Firestore...")
    
    base_dir = os.path.dirname(__file__)

    # --- 核心修改處 START ---
    # 載入新的 DNA 碎片資料 (從 monster/DNA/ 資料夾)
    try:
        dna_dir = os.path.join(base_dir, 'monster', 'DNA')
        if not os.path.exists(dna_dir):
            script_logger.error(f"錯誤: 找不到新的 DNA 資料夾 {dna_dir}。")
            return

        all_new_dna_data = []
        for filename in os.listdir(dna_dir):
            if filename.startswith('DNA_') and filename.endswith('.json'):
                file_path = os.path.join(dna_dir, filename)
                with open(file_path, 'r', encoding='utf-8') as f:
                    dna_list_in_file = json.load(f)
                    all_new_dna_data.extend(dna_list_in_file)
                    script_logger.info(f"成功從 {filename} 載入 {len(dna_list_in_file)} 種 DNA。")

        # 使用新的 DNA 資料覆蓋舊的 `dna_fragments.json` 內容
        dna_fragments_data = all_new_dna_data
        script_logger.info(f"總共從 monster/DNA/ 資料夾載入 {len(dna_fragments_data)} 種新的 DNA 碎片資料。")
        
        # 將整合後的新 DNA 資料寫入 Firestore
        db_client.collection('MD_GameConfigs').document('DNAFragments').set({'all_fragments': dna_fragments_data})
        script_logger.info("成功寫入 DNAFragments 資料 (使用 monster/DNA/ 來源)。")
    except Exception as e:
        script_logger.error(f"處理 monster/DNA/ 資料夾失敗: {e}")
        return
    # --- 核心修改處 END ---

    # --- 載入技能資料 (從 monster/skills/ 資料夾，邏輯不變) ---
    try:
        skills_dir = os.path.join(base_dir, 'monster', 'skills')
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
                element_en = filename[:-5] 
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
             script_logger.warning("技能資料庫為空，可能是 'monster/skills' 資料夾中沒有有效的 .json 檔案。")

        db_client.collection('MD_GameConfigs').document('Skills').set({'skill_database': skill_database_data})
        script_logger.info("成功將組合後的技能資料寫入 Firestore 的 Skills 文件。")
    except Exception as e:
        script_logger.error(f"處理 monster/skills/ 資料夾失敗: {e}", exc_info=True)
        return

    # ...(後續其他設定檔的載入邏輯保持不變)...
    # ... 省略其他設定檔的載入程式碼，與上一版相同 ...

    # --- 載入個性資料 (從CSV) ---
    personalities_data = []
    try:
        personalities_path = os.path.join(base_dir, 'monster', 'personalities.csv')
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
        script_logger.error(f"錯誤: 找不到個性設定檔 {personalities_path}。")
        return
    except Exception as e:
        script_logger.error(f"處理 Personalities 資料失敗: {e}")
        return

    # --- 載入修煉故事資料 ---
    try:
        stories_path = os.path.join(base_dir, 'system', 'cultivation_stories.json')
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
        guardians_path = os.path.join(base_dir, 'system', 'champion_guardians.json')
        with open(guardians_path, 'r', encoding='utf-8') as f:
            guardians_data = json.load(f)
        script_logger.info(f"成功從 {guardians_path} 載入冠軍守門員資料。")
        db_client.collection('MD_GameConfigs').document('ChampionGuardians').set({'guardians': guardians_data})
        script_logger.info("成功寫入 ChampionGuardians 資料。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到冠軍守門員設定檔 {guardians_path}。")
    except Exception as e:
        script_logger.error(f"處理 ChampionGuardians 資料失敗: {e}")

    # --- 載入狀態效果資料 ---
    try:
        status_effects_path = os.path.join(base_dir, 'battle', 'status_effects.json')
        with open(status_effects_path, 'r', encoding='utf-8') as f:
            status_effects_data = json.load(f)
        script_logger.info(f"成功從 {status_effects_path} 載入 {len(status_effects_data)} 個狀態效果資料。")
        db_client.collection('MD_GameConfigs').document('StatusEffects').set({'effects_list': status_effects_data})
        script_logger.info("成功將 status_effects.json 的內容寫入 Firestore 的 StatusEffects 文件。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到狀態效果設定檔 {status_effects_path}。")
        return
    except Exception as e:
        script_logger.error(f"處理 StatusEffects 資料失敗: {e}")
        return
        
    # --- 載入戰鬥亮點資料 ---
    try:
        highlights_path = os.path.join(base_dir, 'battle', 'battle_highlights.json')
        with open(highlights_path, 'r', encoding='utf-8') as f:
            highlights_data = json.load(f)
        script_logger.info(f"成功從 {highlights_path} 載入戰鬥亮點資料。")
        db_client.collection('MD_GameConfigs').document('BattleHighlights').set(highlights_data)
        script_logger.info("成功將 battle_highlights.json 的內容寫入 Firestore 的 BattleHighlights 文件。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到戰鬥亮點設定檔 {highlights_path}。")
    except Exception as e:
        script_logger.error(f"處理 BattleHighlights 資料失敗: {e}")

    # --- 載入冒險島資料 ---
    try:
        islands_path = os.path.join(base_dir, 'adventure', 'adventure_islands.json')
        with open(islands_path, 'r', encoding='utf-8') as f:
            islands_data = json.load(f)
        script_logger.info(f"成功從 {islands_path} 載入冒險島資料。")
        db_client.collection('MD_GameConfigs').document('AdventureIslands').set({'islands': islands_data})
        script_logger.info("成功寫入 AdventureIslands 資料。")
    except FileNotFoundError:
        script_logger.warning(f"提示: 找不到冒險島設定檔 {islands_path}，將跳過此項。")
    except Exception as e:
        script_logger.error(f"處理 AdventureIslands 資料失敗: {e}")

    # --- 載入並寫入稱號資料 ---
    try:
        titles_path = os.path.join(base_dir, 'system', 'titles.json')
        with open(titles_path, 'r', encoding='utf-8') as f:
            titles_data_from_json = json.load(f)
        script_logger.info(f"成功從 {titles_path} 載入 {len(titles_data_from_json)} 個稱號資料。")
        db_client.collection('MD_GameConfigs').document('Titles').set({'player_titles': titles_data_from_json})
        script_logger.info("成功將 titles.json 的內容寫入 Firestore 的 Titles 文件。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到稱號設定檔 {titles_path}。")
        return
    except Exception as e:
        script_logger.error(f"處理 Titles 資料失敗: {e}")
        return

    # --- 載入並寫入元素預設名 ---
    try:
        nicknames_path = os.path.join(base_dir, 'monster', 'element_nicknames.json')
        with open(nicknames_path, 'r', encoding='utf-8') as f:
            element_nicknames_data = json.load(f)
        script_logger.info(f"成功從 {nicknames_path} 載入元素暱稱資料。")
        db_client.collection('MD_GameConfigs').document('ElementNicknames').set({'nicknames': element_nicknames_data})
        script_logger.info("成功將 element_nicknames.json 的內容寫入 Firestore 的 ElementNicknames 文件。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到元素暱稱設定檔 {nicknames_path}。")
        return
    except Exception as e:
        script_logger.error(f"處理 ElementNicknames 資料失敗: {e}")
        return

    # --- 載入新手指南資料 ---
    try:
        guide_path = os.path.join(base_dir, 'system', 'newbie_guide.json')
        with open(guide_path, 'r', encoding='utf-8') as f:
            newbie_guide_data = json.load(f)
        script_logger.info(f"成功從 {guide_path} 載入新手指南資料。")
        db_client.collection('MD_GameConfigs').document('NewbieGuide').set({'guide_entries': newbie_guide_data})
        script_logger.info("成功寫入 NewbieGuide 資料。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到新手指南設定檔 {guide_path}。")
    except Exception as e:
        script_logger.error(f"處理 NewbieGuide 資料失敗: {e}")


    # ... (其他硬編碼的設定，如 Rarities, NamingConstraints, ValueSettings 等保持不變) ...
    # DNA 稀有度資料 (Rarities)
    dna_rarities_data = {
        "COMMON": { "name": "普通", "textVarKey": "--rarity-common-text", "statMultiplier": 1.0, "skillLevelBonus": 0, "resistanceBonus": 1, "value_factor": 10 },
        "RARE": { "name": "稀有", "textVarKey": "--rarity-rare-text", "statMultiplier": 1.15, "skillLevelBonus": 0, "resistanceBonus": 3, "value_factor": 30 },
        "ELITE": { "name": "菁英", "textVarKey": "--rarity-elite-text", "statMultiplier": 1.3, "skillLevelBonus": 1, "resistanceBonus": 5, "value_factor": 75 },
        "LEGENDARY": { "name": "傳奇", "textVarKey": "--rarity-legendary-text", "statMultiplier": 1.5, "skillLevelBonus": 2, "resistanceBonus": 8, "value_factor": 150 },
        "MYTHICAL": { "name": "神話", "textVarKey": "--rarity-mythical-text", "statMultiplier": 1.75, "skillLevelBonus": 3, "resistanceBonus": 12, "value_factor": 300 },
    }
    db_client.collection('MD_GameConfigs').document('Rarities').set({'dna_rarities': dna_rarities_data})
    # ... 省略其他硬編碼設定的寫入，與上一版相同 ...

    script_logger.info("所有遊戲設定資料填充/更新完畢。")

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    script_logger.info("正在直接執行 MD_populate_gamedata.py 腳本...")
    populate_game_configs()
