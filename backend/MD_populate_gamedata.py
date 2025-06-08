# MD_populate_gamedata.py
# 用於將遊戲設定資料一次性匯入到 Firestore

# 導入必要的模組
import time
import random
import os 
import json
import logging
import sys

# 導入 Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, firestore

# --- 關鍵修正：將相對導入改為絕對導入 ---
# 這樣此腳本就可以被獨立執行
from MD_firebase_config import set_firestore_client
# --- 修正結束 ---


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
            if os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
                try:
                    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
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
        from MD_firebase_config import db as current_db_check
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

    from MD_firebase_config import db as firestore_db_instance
    if firestore_db_instance is None:
        script_logger.error("錯誤：Firestore 資料庫未初始化 (在 populate_game_configs 內部)。無法執行資料填充。")
        return

    db_client = firestore_db_instance
    script_logger.info("開始填充/更新遊戲設定資料到 Firestore...")
    
    # --- 新增：從外部 JSON 檔案載入資料 ---
    # 建立 data 資料夾的路徑
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    
    # 確保 data 資料夾存在
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        script_logger.info(f"已建立 'data' 資料夾於: {data_dir}")

    # 載入 DNA 碎片資料
    try:
        dna_fragments_path = os.path.join(data_dir, 'dna_fragments.json')
        with open(dna_fragments_path, 'r', encoding='utf-8') as f:
            dna_fragments_data = json.load(f)
        script_logger.info(f"成功從 {dna_fragments_path} 載入 {len(dna_fragments_data)} 種 DNA 碎片資料。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到 DNA 資料檔 {dna_fragments_path}。請先建立此檔案。")
        return
    except Exception as e:
        script_logger.error(f"從 {dna_fragments_path} 載入資料失敗: {e}")
        return

    # 載入技能資料
    try:
        skills_path = os.path.join(data_dir, 'skills.json')
        with open(skills_path, 'r', encoding='utf-8') as f:
            skill_database_data = json.load(f)
        script_logger.info(f"成功從 {skills_path} 載入技能資料。")
    except FileNotFoundError:
        script_logger.error(f"錯誤: 找不到技能資料檔 {skills_path}。請先建立此檔案。")
        return
    except Exception as e:
        script_logger.error(f"從 {skills_path} 載入資料失敗: {e}")
        return
    # --- 修改結束 ---

    # 1. DNA 碎片資料 (DNAFragments)
    try:
        db_client.collection('MD_GameConfigs').document('DNAFragments').set({'all_fragments': dna_fragments_data})
        script_logger.info(f"成功寫入 DNAFragments 資料 (共 {len(dna_fragments_data)} 種)。")
    except Exception as e:
        script_logger.error(f"寫入 DNAFragments 資料失敗: {e}")

    # 2. DNA 稀有度資料 (Rarities)
    dna_rarities_data = {
        "COMMON": { "name": "普通", "textVarKey": "--rarity-common-text", "statMultiplier": 1.0, "skillLevelBonus": 0, "resistanceBonus": 1, "value_factor": 10 },
        "RARE": { "name": "稀有", "textVarKey": "--rarity-rare-text", "statMultiplier": 1.15, "skillLevelBonus": 0, "resistanceBonus": 3, "value_factor": 30 },
        "ELITE": { "name": "菁英", "textVarKey": "--rarity-elite-text", "statMultiplier": 1.3, "skillLevelBonus": 1, "resistanceBonus": 5, "value_factor": 75 },
        "LEGENDARY": { "name": "傳奇", "textVarKey": "--rarity-legendary-text", "statMultiplier": 1.5, "skillLevelBonus": 2, "resistanceBonus": 8, "value_factor": 150 },
        "MYTHICAL": { "name": "神話", "textVarKey": "--rarity-mythical-text", "statMultiplier": 1.75, "skillLevelBonus": 3, "resistanceBonus": 12, "value_factor": 300 },
    }
    try:
        db_client.collection('MD_GameConfigs').document('Rarities').set({'dna_rarities': dna_rarities_data})
        script_logger.info("成功寫入 Rarities 資料。")
    except Exception as e:
        script_logger.error(f"寫入 Rarities 資料失敗: {e}")

    # 3. 招式資料 (Skills)
    try:
        db_client.collection('MD_GameConfigs').document('Skills').set({'skill_database': skill_database_data})
        script_logger.info("成功寫入 Skills 資料。")
    except Exception as e:
        script_logger.error(f"寫入 Skills 資料失敗: {e}")

    # 4. 個性資料 (Personalities)
    personalities_data = [
        {"name": "勇敢的", "description": "天生的冒險家，字典裡沒有「害怕」。無論對手多強，總是第一個咆哮著衝鋒陷陣，享受近距離肉搏的快感。", "colorDark": "#e74c3c", "colorLight": "#c0392b", "skill_preferences": {"近戰": 1.6, "物理": 1.5, "魔法": 0.8, "遠程": 0.7, "輔助": 0.4, "變化": 0.6, "特殊": 0.9}},
        {"name": "膽小的", "description": "有著玻璃般易碎的心，任何風吹草動都可能讓它嚇得魂飛魄散。極度厭惡近身戰鬥，傾向於在遠距離進行騷擾或施放保護技能。", "colorDark": "#3498db", "colorLight": "#2980b9", "skill_preferences": {"遠程": 1.5, "輔助": 1.4, "變化": 1.3, "魔法": 1.0, "近戰": 0.3, "物理": 0.4, "特殊": 0.7}},
        {"name": "冷静的", "description": "宛如深思熟慮的棋手，眼神深邃銳利，能洞察戰場變化。每一次出手都經過精密計算，偏好用魔法和特殊效果控制戰局。", "colorDark": "#2ecc71", "colorLight": "#27ae60", "skill_preferences": {"魔法": 1.4, "特殊": 1.5, "輔助": 1.3, "變化": 1.2, "遠程": 1.1, "近戰": 0.6, "物理": 0.7}},
        {"name": "急躁的", "description": "如同上緊發條的火山，行動總比思考快半拍。渴望速戰速決，會不計後果地釋放自己最強大的物理或魔法技能。", "colorDark": "#f39c12", "colorLight": "#e67e22", "skill_preferences": {"物理": 1.4, "魔法": 1.4, "近戰": 1.3, "遠程": 1.3, "特殊": 1.0, "輔助": 0.5, "變化": 0.7}},
        {"name": "樂天的", "description": "永遠掛著微笑，彷彿沒有任何事能讓它沮喪。戰鬥中也充滿活力，喜歡使用華麗且正面的輔助技能來鼓舞隊友。", "colorDark": "#f1c40f", "colorLight": "#f39c12", "skill_preferences": {"輔助": 1.6, "變化": 1.3, "魔法": 1.2, "物理": 0.9, "近戰": 0.8, "遠程": 1.1, "特殊": 1.0}},
        {"name": "懶散的", "description": "對任何事都提不起勁，大部分時間都在打盹。戰鬥時只會選擇最不費力的方式攻擊，偏好遠程和持續傷害技能。", "colorDark": "#8D6E63", "colorLight": "#A1887F", "skill_preferences": {"遠程": 1.4, "特殊": 1.4, "輔助": 1.3, "變化": 1.2, "魔法": 0.8, "近戰": 0.4, "物理": 0.5}},
        {"name": "頑固的", "description": "一旦做出決定就絕不改變，擁有極高的意志力。戰鬥中偏好防禦和提升自身能力的技能，擅長打持久戰。", "colorDark": "#795548", "colorLight": "#8D6E63", "skill_preferences": {"輔助": 1.5, "變化": 1.4, "物理": 1.0, "魔法": 1.0, "近戰": 0.8, "遠程": 0.8, "特殊": 0.9}},
        {"name": "狡猾的", "description": "眼神中總是閃爍著算計的光芒，精通戰場上的詭計。喜歡使用各種變化和特殊類技能來削弱或控制對手。", "colorDark": "#9b59b6", "colorLight": "#8e44ad", "skill_preferences": {"變化": 1.6, "特殊": 1.5, "魔法": 1.2, "遠程": 1.1, "近戰": 0.6, "物理": 0.7, "輔助": 0.8}},
        {"name": "傲慢的", "description": "認為自己是天選之子，對所有事物都表現出不屑。戰鬥中只願意使用威力強大的攻擊性魔法，對輔助他人毫無興趣。", "colorDark": "#e91e63", "colorLight": "#c2185b", "skill_preferences": {"魔法": 1.7, "遠程": 1.4, "物理": 1.2, "特殊": 1.1, "輔助": 0.3, "變化": 0.5, "近戰": 0.9}},
        {"name": "溫和的", "description": "散發著親切的氣息，不喜歡爭鬥。在戰鬥中，它會優先治療隊友，是隊伍中最可靠的後盾。", "colorDark": "#a5d6a7", "colorLight": "#81c784", "skill_preferences": {"輔助": 1.8, "變化": 1.2, "魔法": 0.9, "物理": 0.6, "近戰": 0.5, "遠程": 0.7, "特殊": 0.8}},
        {"name": "忠誠的", "description": "對訓練師有著絕對的信賴，願意為保護夥伴付出一切。戰鬥中會優先使用保護隊友的技能，並勇於承受傷害。", "colorDark": "#42a5f5", "colorLight": "#1e88e5", "skill_preferences": {"輔助": 1.6, "物理": 1.3, "近戰": 1.2, "魔法": 0.9, "遠程": 0.9, "變化": 0.8, "特殊": 1.0}},
        {"name": "孤僻的", "description": "喜歡獨處，對外界保持警惕。它不擅長團隊合作，但其單體攻擊技能卻異常強大且致命。", "colorDark": "#607d8b", "colorLight": "#546e7a", "skill_preferences": {"近戰": 1.5, "特殊": 1.4, "魔法": 1.3, "物理": 1.2, "遠程": 1.0, "輔助": 0.4, "變化": 0.7}},
        {"name": "勤奮的", "description": "信奉天道酬勤，通過不懈的努力來彌補天賦的不足。能力平均，但會頻繁使用技能來壓制對手。", "colorDark": "#ff7043", "colorLight": "#f4511e", "skill_preferences": {"物理": 1.3, "魔法": 1.3, "近戰": 1.3, "遠程": 1.3, "輔助": 1.0, "變化": 1.0, "特殊": 1.0}},
        {"name": "優雅的", "description": "動作如行雲流水，充滿藝術感。戰鬥風格華麗，偏好使用速度快且帶有特殊效果的技能。", "colorDark": "#ab47bc", "colorLight": "#8e24aa", "skill_preferences": {"變化": 1.5, "遠程": 1.4, "魔法": 1.3, "特殊": 1.2, "物理": 0.8, "近戰": 0.7, "輔助": 0.9}},
        {"name": "貪吃的", "description": "腦中除了吃還是吃，為了美食可以爆發出驚人的力量。特別喜歡使用能吸取對手生命或能量的技能。", "colorDark": "#ffee58", "colorLight": "#fdd835", "skill_preferences": {"特殊": 1.6, "物理": 1.4, "近戰": 1.3, "魔法": 0.9, "遠程": 0.8, "輔助": 0.6, "變化": 0.7}},
        {"name": "暴躁的", "description": "一點小事就能將其激怒，憤怒是它的力量來源。受傷後攻擊力會大幅提升，偏好捨身攻擊。", "colorDark": "#d32f2f", "colorLight": "#c62828", "skill_preferences": {"物理": 1.6, "近戰": 1.5, "魔法": 1.0, "遠程": 0.9, "輔助": 0.5, "變化": 0.7, "特殊": 0.8}},
        {"name": "淘氣的", "description": "喜歡惡作劇，讓對手頭痛不已。擅長使用各種降低對手命中或使其混亂的變化類技能。", "colorDark": "#ec407a", "colorLight": "#d81b60", "skill_preferences": {"變化": 1.7, "特殊": 1.4, "遠程": 1.2, "魔法": 1.0, "物理": 0.6, "近戰": 0.5, "輔助": 0.8}},
        {"name": "可靠的", "description": "沉穩如山，是隊伍中最值得信賴的夥伴。能力均衡，攻守兼備，沒有明顯弱點。", "colorDark": "#5c6bc0", "colorLight": "#3949ab", "skill_preferences": {"物理": 1.2, "魔法": 1.2, "輔助": 1.2, "近戰": 1.1, "遠程": 1.1, "變化": 1.1, "特殊": 1.1}},
        {"name": "善變的", "description": "心情和戰術都像天氣一樣難以預測。它會隨機使用各種技能，讓對手和隊友都捉摸不透。", "colorDark": "#7e57c2", "colorLight": "#5e35b1", "skill_preferences": {"近戰": 1.0, "遠程": 1.0, "魔法": 1.0, "輔助": 1.0, "物理": 1.0, "特殊": 1.0, "變化": 1.0}},
        {"name": "沉默的", "description": "不言不語，但眼中藏著深邃的智慧。擅長後發制人，在關鍵時刻用強力的特殊魔法給予致命一擊。", "colorDark": "#424242", "colorLight": "#212121", "skill_preferences": {"特殊": 1.6, "魔法": 1.5, "遠程": 1.2, "變化": 1.1, "近戰": 0.7, "物理": 0.8, "輔助": 0.9}},
        {"name": "活潑的", "description": "精力旺盛，一刻也停不下來。在戰場上高速穿梭，使用連續攻擊的技能讓對手應接不暇。", "colorDark": "#4dd0e1", "colorLight": "#26c6da", "skill_preferences": {"近戰": 1.6, "物理": 1.4, "遠程": 1.2, "魔法": 0.8, "輔助": 0.7, "變化": 0.9, "特殊": 1.0}},
        {"name": "謹慎的", "description": "行事小心翼翼，從不輕易冒險。戰鬥開始時會先用防禦和輔助技能強化自己，確保萬無一失後再進攻。", "colorDark": "#8d6e63", "colorLight": "#6d4c41", "skill_preferences": {"輔助": 1.6, "變化": 1.5, "魔法": 1.1, "物理": 0.9, "近戰": 0.7, "遠程": 0.8, "特殊": 1.0}},
        {"name": "誠實的", "description": "表裡如一，從不耍小聰明。它的攻擊方式直接而有力，偏好使用高命中率的物理攻擊技能。", "colorDark": "#66bb6a", "colorLight": "#43a047", "skill_preferences": {"物理": 1.5, "近戰": 1.4, "遠程": 1.1, "魔法": 0.8, "輔助": 0.7, "變化": 0.5, "特殊": 0.9}},
        {"name": "自卑的", "description": "總覺得自己不夠好，缺乏自信。但當夥伴遇到危險時，會爆發出意想不到的潛力，特別是在輔助和防禦上。", "colorDark": "#90a4ae", "colorLight": "#607d8b", "skill_preferences": {"輔助": 1.7, "變化": 1.4, "遠程": 0.8, "魔法": 0.7, "近戰": 0.6, "物理": 0.5, "特殊": 0.9}},
        {"name": "浪漫的", "description": "對世界充滿美好的幻想，戰鬥也像是在譜寫詩篇。喜歡使用光、風等屬性的華麗魔法技能。", "colorDark": "#ff8a80", "colorLight": "#ff5252", "skill_preferences": {"魔法": 1.5, "遠程": 1.3, "變化": 1.2, "特殊": 1.1, "物理": 0.7, "近戰": 0.6, "輔助": 0.9}},
        {"name": "現實的", "description": "極度務實，只追求最高效率的勝利。會精準計算傷害，用最少的消耗換取最大的戰果，技能選擇非常功利。", "colorDark": "#78909c", "colorLight": "#546e7a", "skill_preferences": {"物理": 1.4, "遠程": 1.4, "魔法": 1.4, "近戰": 1.0, "輔助": 0.8, "變化": 0.8, "特殊": 1.1}},
        {"name": "嫉妒的", "description": "無法容忍比自己更出色的存在。當對手使用強力技能或能力提升時，它會變得更具攻擊性。", "colorDark": "#cddc39", "colorLight": "#c0ca33", "skill_preferences": {"物理": 1.5, "近戰": 1.4, "魔法": 1.3, "遠程": 1.2, "特殊": 1.1, "輔助": 0.5, "變化": 0.6}},
        {"name": "無私的", "description": "總是先為他人著想，把團隊的勝利置於首位。擅長犧牲自己部分HP來為隊友提供強大的增益或治療。", "colorDark": "#b39ddb", "colorLight": "#9575cd", "skill_preferences": {"輔助": 1.9, "變化": 1.2, "遠程": 0.8, "魔法": 0.7, "物理": 0.5, "近戰": 0.4, "特殊": 0.9}},
        {"name": "好奇的", "description": "對未知事物充滿強烈興趣，喜歡嘗試各種可能性。戰鬥中會隨機嘗試不同的技能組合，有時會產生奇效。", "colorDark": "#4db6ac", "colorLight": "#26a69a", "skill_preferences": {"變化": 1.5, "特殊": 1.5, "魔法": 1.2, "遠程": 1.1, "物理": 1.0, "近戰": 0.9, "輔助": 0.8}},
        {"name": "隨和的", "description": "沒有特定的偏好，能很好地適應各種戰況。訓練師的任何指令都能忠實執行，是一個萬能的隊員。", "colorDark": "#eeeeee", "colorLight": "#e0e0e0", "skill_preferences": {"近戰": 1.0, "遠程": 1.0, "魔法": 1.0, "輔助": 1.0, "物理": 1.0, "特殊": 1.0, "變化": 1.0}}
    ]
    try:
        db_client.collection('MD_GameConfigs').document('Personalities').set({'types': personalities_data})
        script_logger.info("成功寫入 Personalities 資料。")
    except Exception as e:
        script_logger.error(f"寫入 Personalities 資料失敗: {e}")

    # 5. 稱號資料 (Titles)
    titles_data = ["新手", "見習士", "收藏家", "戰新星", "元素使", "傳奇者", "神締者", "吸星者", "技宗師", "勇者魂", "智多星", "守護者"]
    try:
        db_client.collection('MD_GameConfigs').document('Titles').set({'player_titles': titles_data})
        script_logger.info("成功寫入 Titles 資料。")
    except Exception as e:
        script_logger.error(f"寫入 Titles 資料失敗: {e}")

    # 6. 怪物成就列表 (MonsterAchievementsList)
    monster_achievements_data = [
        "初戰星", "百戰將", "常勝軍", "不死鳥", "速攻手", "重炮手", "守護神", "控場師", "元素核", "進化者",
        "稀有種", "菁英級", "傳奇級", "神話級", "無名者", "幸運星", "破壞王", "戰術家", "治癒者", "潛力股"
    ]
    try:
        db_client.collection('MD_GameConfigs').document('MonsterAchievementsList').set({'achievements': monster_achievements_data})
        script_logger.info("成功寫入 MonsterAchievementsList 資料。")
    except Exception as e:
        script_logger.error(f"寫入 MonsterAchievementsList 資料失敗: {e}")

    # 7. 元素預設名 (ElementNicknames)
    element_nicknames_data = {
        "火": "炎魂獸", "水": "碧波精", "木": "森之裔", "金": "鐵甲衛", "土": "岩心怪",
        "光": "聖輝使", "暗": "影匿者", "毒": "毒牙獸", "風": "疾風行", "無": "元氣寶", "混": "混沌體"
    }
    try:
        db_client.collection('MD_GameConfigs').document('ElementNicknames').set({'nicknames': element_nicknames_data})
        script_logger.info("成功寫入 ElementNicknames 資料。")
    except Exception as e:
        script_logger.error(f"寫入 ElementNicknames 資料失敗: {e}")

    # 8. 命名限制設定 (NamingConstraints)
    naming_constraints_data = {
        "max_player_title_len": 5,
        "max_monster_achievement_len": 5,
        "max_element_nickname_len": 5,
        "max_monster_full_nickname_len": 15
    }
    try:
        db_client.collection('MD_GameConfigs').document('NamingConstraints').set(naming_constraints_data)
        script_logger.info("成功寫入 NamingConstraints 資料。")
    except Exception as e:
        script_logger.error(f"寫入 NamingConstraints 資料失敗: {e}")

    # 9. 健康狀況資料 (HealthConditions)
    health_conditions_data = [
        {"id": "poisoned", "name": "中毒", "description": "持續受到毒素傷害，每回合損失HP。", "effects": {"hp_per_turn": -8}, "duration": 3, "icon": "🤢"},
        {"id": "paralyzed", "name": "麻痺", "description": "速度大幅下降，有較高機率無法行動。", "effects": {"speed": -20}, "duration": 2, "icon": "⚡", "chance_to_skip_turn": 0.3 },
        {"id": "burned", "name": "燒傷", "description": "持續受到灼燒傷害，攻擊力顯著下降。", "effects": {"hp_per_turn": -5, "attack": -10}, "duration": 3, "icon": "🔥"},
        {"id": "confused", "name": "混亂", "description": "行動時有50%機率攻擊自己或隨機目標。", "effects": {}, "duration": 2, "icon": "😵", "confusion_chance": 0.5},
        {"id": "energized", "name": "精力充沛", "description": "狀態絕佳！所有能力微幅提升。", "effects": {"attack": 5, "defense": 5, "speed": 5, "crit": 3}, "duration": 3, "icon": "💪"},
        {"id": "weakened", "name": "虛弱", "description": "所有主要戰鬥數值大幅下降。", "effects": {"attack": -12, "defense": -12, "speed": -8, "crit": -5}, "duration": 2, "icon": "😩"},
        {"id": "frozen", "name": "冰凍", "description": "完全無法行動，但受到火系攻擊傷害加倍。", "effects": {}, "duration": 1, "icon": "🧊", "elemental_vulnerability": {"火": 2.0} }
    ]
    try:
        db_client.collection('MD_GameConfigs').document('HealthConditions').set({'conditions_list': health_conditions_data})
        script_logger.info("成功寫入 HealthConditions 資料。")
    except Exception as e:
        script_logger.error(f"寫入 HealthConditions 資料失敗: {e}")

    # 10. 新手指南資料 (NewbieGuide)
    newbie_guide_data = [
        {"title": "遊戲目標", "content": "歡迎來到怪獸異世界！您的目標是透過組合不同的DNA碎片，創造出獨一無二的強大怪獸，並透過養成提升它們的能力，最終在排行榜上名列前茅。"},
        {"title": "怪獸命名規則", "content": "怪獸的完整名稱將由「您的當前稱號」+「怪獸獲得的成就」+「怪獸的屬性代表名」自動組成，總長度不超過15個字。您可以在怪獸詳細資料中修改其「屬性代表名」(最多5個字)。"},
        {"title": "DNA組合與怪獸農場", "content": "在「DNA管理」頁籤的「DNA組合」区塊，您可以將擁有的「DNA碎片」拖曳到上方的組合槽中。合成的怪獸會出現在「怪物農場」。農場是您培育、出戰、放生怪獸的地方。"},
        {"title": "戰鬥與吸收", "content": "您可以指派怪獸出戰並挑戰其他怪獸。勝利後，您有機會吸收敗方怪獸的精華，這可能會讓您的怪獸獲得數值成長，並獲得敗方怪獸的DNA碎片作為戰利品！"},
        {"title": "醫療站", "content": "「醫療站」是您照護怪獸的地方。您可以為受傷的怪獸恢復HP、MP，或治療不良的健康狀態。此外，您還可以將不需要的怪獸分解成DNA碎片，或使用特定的DNA為同屬性怪獸進行充能恢復HP。"},
        {"title": "修煉與技能成長", "content": "透過「養成」功能，您的怪獸可以進行修煉。修煉不僅能提升基礎數值、獲得物品，還有機會讓怪獸的技能獲得經驗值。技能經驗值滿了就能升級，變得更強！修煉中還有可能領悟全新的技能(等級1)！您將有機會決定是否讓怪獸學習新技能或替換現有技能。"},
        {"title": "屬性克制與技能類別", "content": "遊戲中存在屬性克制關係（詳見元素克制表）。此外，技能分為近戰、遠程、魔法、輔助等不同類別，怪獸的個性會影響它們使用不同類別技能的傾向。"},
    ]
    try:
        db_client.collection('MD_GameConfigs').document('NewbieGuide').set({'guide_entries': newbie_guide_data})
        script_logger.info("成功寫入 NewbieGuide 資料。")
    except Exception as e:
        script_logger.error(f"寫入 NewbieGuide 資料失敗: {e}")

    # 11. 價值設定資料 (ValueSettings)
    value_settings_data = {
        "element_value_factors": {
            "火": 1.2, "水": 1.1, "木": 1.0, "金": 1.3, "土": 0.9,
            "光": 1.5, "暗": 1.4, "毒": 0.8, "風": 1.0, "無": 0.7, "混": 0.6
        },
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10, # 農場上限
        "max_monster_skills": 3, # 怪獸最大技能數
        "max_battle_turns": 30, # 戰鬥最大回合數
        # 修改點：增加 DNA 庫存和臨時背包的最大槽位數設定
        "max_inventory_slots": 12, # DNA 庫存格數設定
        "max_temp_backpack_slots": 9, # 臨時背包格數設定
        "starting_gold": 500 # 新增：新玩家的初始金幣
    }
    try:
        db_client.collection('MD_GameConfigs').document('ValueSettings').set(value_settings_data)
        script_logger.info("成功寫入 ValueSettings 資料。")
    except Exception as e:
        script_logger.error(f"寫入 ValueSettings 資料失敗: {e}")

    # 12. 吸收效果設定 (AbsorptionSettings)
    absorption_settings_data = {
        "base_stat_gain_factor": 0.03,
        "score_diff_exponent": 0.3,
        "max_stat_gain_percentage": 0.015,
        "min_stat_gain": 1,
        "dna_extraction_chance_base": 0.75,
        "dna_extraction_rarity_modifier": {
            "普通": 1.0, "稀有": 0.9, "菁英":0.75, "傳奇":0.6, "神話":0.45
        }
    }
    try:
        db_client.collection('MD_GameConfigs').document('AbsorptionSettings').set(absorption_settings_data)
        script_logger.info("成功寫入 AbsorptionSettings 資料。")
    except Exception as e:
        script_logger.error(f"寫入 AbsorptionSettings 資料失敗: {e}")

    # 13. 修煉系統設定 (CultivationSettings)
    cultivation_settings_data = {
        "skill_exp_base_multiplier": 100,
        "new_skill_chance": 0.1,
        "skill_exp_gain_range": (15, 75),
        "max_skill_level": 10,
        "new_skill_rarity_bias": { "普通": 0.6, "稀有": 0.3, "菁英": 0.1 },
        "stat_growth_weights": {
            "hp": 30, "mp": 25, "attack": 20, "defense": 20, "speed": 15, "crit": 10
        },
        "stat_growth_duration_divisor": 900,
        "dna_find_chance": 0.5,
        "dna_find_duration_divisor": 1200,
        "dna_find_loot_table": {
            "普通": {"普通": 0.8, "稀有": 0.2},
            "稀有": {"普通": 0.5, "稀有": 0.4, "菁英": 0.1},
            "菁英": {"普通": 0.2, "稀有": 0.5, "菁英": 0.25, "傳奇": 0.05},
            "傳奇": {"稀有": 0.4, "菁英": 0.4, "傳奇": 0.15, "神話": 0.05},
            "神話": {"菁英": 0.5, "傳奇": 0.4, "神話": 0.1}
        }
    }
    try:
        db_client.collection('MD_GameConfigs').document('CultivationSettings').set(cultivation_settings_data)
        script_logger.info("成功寫入 CultivationSettings 資料。")
    except Exception as e:
        script_logger.error(f"寫入 CultivationSettings 資料失敗: {e}")

    # 14. 元素克制表 (ElementalAdvantageChart)
    elemental_advantage_chart_data = {
        # 攻擊方: {防禦方: 倍率}
        "火": {"木": 1.5, "水": 0.5, "金": 1.2, "土": 0.8, "風":1.0, "毒":1.0, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "水": {"火": 1.5, "土": 1.2, "木": 0.5, "金": 0.8, "風":1.0, "毒":1.0, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "木": {"水": 1.5, "土": 0.5, "金": 0.8, "火": 0.8, "風":1.0, "毒":1.2, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "金": {"木": 1.5, "風": 1.2, "火": 0.5, "土": 1.2, "水": 0.8, "毒":0.8, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "土": {"火": 1.2, "金": 0.5, "水": 0.5, "木": 1.5, "風": 0.8, "毒":1.2, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "光": {"暗": 1.75, "毒": 0.7, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "木": 1.0, "金": 1.0, "土": 1.0, "風": 1.0},
        "暗": {"光": 1.75, "風": 0.7, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "木": 1.0, "金": 1.0, "土": 1.0, "毒": 1.0},
        "毒": {"木": 1.4, "草": 1.4, "土": 1.2, "光": 0.7, "金": 0.7, "風":0.8, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "暗": 1.0},
        "風": {"土": 1.4, "草": 1.4, "暗": 0.7, "金": 0.7, "毒":0.8, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "木": 1.0, "光": 1.0},
        "無": {el: 1.0 for el in ELEMENT_TYPES},
        "混": {el: 1.0 for el in ELEMENT_TYPES}
    }
    for attacker_el_str in ELEMENT_TYPES:
        attacker_el = attacker_el_str 
        if attacker_el not in elemental_advantage_chart_data:
            elemental_advantage_chart_data[attacker_el] = {}
        for defender_el_str in ELEMENT_TYPES:
            defender_el = defender_el_str 
            if defender_el not in elemental_advantage_chart_data[attacker_el]:
                elemental_advantage_chart_data[attacker_el][defender_el] = 1.0
    try:
        db_client.collection('MD_GameConfigs').document('ElementalAdvantageChart').set(elemental_advantage_chart_data)
        script_logger.info("成功寫入 ElementalAdvantageChart 資料。")
    except Exception as e:
        script_logger.error(f"寫入 ElementalAdvantageChart 資料失敗: {e}")


    # 15. NPC 怪獸資料 (NPCMonsters)
    _personalities = personalities_data
    _monster_achievements = monster_achievements_data
    _element_nicknames = element_nicknames_data

    npc_monsters_data = [
        {
            "id": "npc_m_001", "nickname": "",
            "elements": ["火"], "elementComposition": {"火": 100.0},
            "hp": 80, "mp": 30, "initial_max_hp": 80, "initial_max_mp": 30,
            "attack": 15, "defense": 10, "speed": 12, "crit": 5,
            "skills": random.sample(skill_database_data["火"], min(len(skill_database_data["火"]), random.randint(1,2))) if skill_database_data.get("火") else [],
            "rarity": "普通", "title": random.choice(_monster_achievements),
            "custom_element_nickname": _element_nicknames.get("火", "火獸"),
            "description": "一隻活潑的火焰小蜥蜴，喜歡追逐火花。",
            "personality": random.choice(_personalities),
            "creationTime": int(time.time()),
            "farmStatus": {"active": False, "isBattling": False, "isTraining": False, "completed": False, "boosts": {}},
            "resistances": {"火": 3, "水": -2}, "score": random.randint(100, 150), "isNPC": True,
            "resume": {"wins": 0, "losses": 0},
            "constituent_dna_ids": [random.choice([d['id'] for d in dna_fragments_data if d['type'] == '火' and d['rarity'] == '普通'])]
        },
        {
            "id": "npc_m_002", "nickname": "",
            "elements": ["木", "土"], "elementComposition": {"木": 70.0, "土": 30.0},
            "hp": 120, "mp": 25, "initial_max_hp": 120, "initial_max_mp": 25,
            "attack": 10, "defense": 20, "speed": 8, "crit": 3,
            "skills": random.sample(skill_database_data["木"] + skill_database_data["土"] + skill_database_data["無"], min(len(skill_database_data["木"] + skill_database_data["土"] + skill_database_data["無"]), random.randint(2,3))) if skill_database_data.get("木") or skill_database_data.get("土") or skill_database_data.get("無") else [],
            "rarity": "稀有", "title": random.choice(_monster_achievements),
            "custom_element_nickname": _element_nicknames.get("木", "木靈"),
            "description": "堅毅的森林守衛者幼苗，擁有大地與森林的祝福。",
            "personality": random.choice(_personalities),
            "creationTime": int(time.time()),
            "farmStatus": {"active": False, "isBattling": False, "isTraining": False, "completed": False, "boosts": {}},
            "resistances": {"木": 5, "土": 5, "火": -3}, "score": random.randint(160, 220), "isNPC": True,
            "resume": {"wins": 0, "losses": 0},
            "constituent_dna_ids": [
                random.choice([d['id'] for d in dna_fragments_data if d['type'] == '木' and d['rarity'] == '稀有']),
                random.choice([d['id'] for d in dna_fragments_data if d['type'] == '土' and d['rarity'] == '普通'])
            ]
        }
    ]
    try:
        db_client.collection('MD_GameConfigs').document('NPCMonsters').set({'monsters': npc_monsters_data})
        script_logger.info("成功寫入 NPCMonsters 資料。")
    except Exception as e:
        script_logger.error(f"寫入 NPCMonsters 資料失敗: {e}")

    script_logger.info("遊戲設定資料填充/更新完畢。")

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    script_logger.info("正在直接執行 MD_populate_gamedata.py 腳本...")

    populate_game_configs()
