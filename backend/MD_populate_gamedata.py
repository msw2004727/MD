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

    # 1. DNA 碎片資料 (DNAFragments)
    dna_fragments_data = [
        {'id': 'dna_fire_c01', 'name': '初階火種', 'type': '火', 'rarity': '普通', 'description': '微弱燃燒的火種。', 'hp': 45, 'mp': 22, 'attack': 18, 'defense': 6, 'speed': 9, 'crit': 4, 'resistances': {'火': 2}},
        {'id': 'dna_fire_c02', 'name': '溫熱岩石', 'type': '火', 'rarity': '普通', 'description': '帶有餘溫的普通石頭。', 'hp': 50, 'mp': 18, 'attack': 16, 'defense': 10, 'speed': 6, 'crit': 3, 'resistances': {'火': 1, '土': 1}},
        {'id': 'dna_fire_c03', 'name': '焦黑木炭', 'type': '火', 'rarity': '普通', 'description': '燃燒後留下的木炭。', 'hp': 40, 'mp': 20, 'attack': 20, 'defense': 8, 'speed': 7, 'crit': 5, 'resistances': {'火': 3, '木': -1}},
        {'id': 'dna_fire_c04', 'name': '火花結晶', 'type': '火', 'rarity': '普通', 'description': '迸發的火花凝結成的結晶。', 'hp': 38, 'mp': 25, 'attack': 19, 'defense': 5, 'speed': 11, 'crit': 6, 'resistances': {'火': 2, '風': 1}},
        {'id': 'dna_fire_c05', 'name': '硫磺粉末', 'type': '火', 'rarity': '普通', 'description': '帶有刺鼻氣味的黃色粉末。', 'hp': 42, 'mp': 24, 'attack': 21, 'defense': 7, 'speed': 8, 'crit': 4, 'resistances': {'火': 1, '毒': 2}},
        {'id': 'dna_water_c01', 'name': '純淨水滴', 'type': '水', 'rarity': '普通', 'description': '純淨但普通的水滴。', 'hp': 55, 'mp': 28, 'attack': 12, 'defense': 12, 'speed': 12, 'crit': 3, 'resistances': {'水': 2}},
        {'id': 'dna_water_c02', 'name': '潮濕苔蘚', 'type': '水', 'rarity': '普通', 'description': '生長在水邊的濕滑苔蘚。', 'hp': 60, 'mp': 25, 'attack': 10, 'defense': 14, 'speed': 9, 'crit': 2, 'resistances': {'水': 1, '木': 1}},
        {'id': 'dna_water_c03', 'name': '融化冰晶', 'type': '水', 'rarity': '普通', 'description': '正在融化的細小冰晶。', 'hp': 52, 'mp': 30, 'attack': 14, 'defense': 10, 'speed': 13, 'crit': 4, 'resistances': {'水': 3, '火': -1}},
        {'id': 'dna_water_c04', 'name': '泡沫精華', 'type': '水', 'rarity': '普通', 'description': '輕盈的水泡沫中提取的精華。', 'hp': 48, 'mp': 32, 'attack': 11, 'defense': 11, 'speed': 15, 'crit': 5, 'resistances': {'水': 2, '風': 1}},
        {'id': 'dna_water_c05', 'name': '河底淤泥', 'type': '水', 'rarity': '普通', 'description': '沉積在河底的軟泥。', 'hp': 65, 'mp': 20, 'attack': 9, 'defense': 15, 'speed': 7, 'crit': 1, 'resistances': {'水': 1, '土': 2}},
        {'id': 'dna_wood_c01', 'name': '嫩綠葉芽', 'type': '木', 'rarity': '普通', 'description': '充滿生機的普通葉芽。', 'hp': 60, 'mp': 25, 'attack': 10, 'defense': 15, 'speed': 7, 'crit': 2, 'resistances': {'木': 2}},
        {'id': 'dna_wood_c02', 'name': '乾燥藤蔓', 'type': '木', 'rarity': '普通', 'description': '失去水分的堅韌藤蔓。', 'hp': 55, 'mp': 20, 'attack': 12, 'defense': 13, 'speed': 11, 'crit': 3, 'resistances': {'木': 1, '火': -1}},
        {'id': 'dna_wood_c03', 'name': '普通花粉', 'type': '木', 'rarity': '普通', 'description': '隨處可見的植物花粉。', 'hp': 45, 'mp': 28, 'attack': 9, 'defense': 10, 'speed': 14, 'crit': 4, 'resistances': {'木': 1, '風': 2}},
        {'id': 'dna_wood_c04', 'name': '多汁漿果', 'type': '木', 'rarity': '普通', 'description': '一顆飽滿但味道普通的漿果。', 'hp': 70, 'mp': 30, 'attack': 8, 'defense': 12, 'speed': 5, 'crit': 1, 'resistances': {'木': 2, '水': 1}},
        {'id': 'dna_wood_c05', 'name': '帶刺外殼', 'type': '木', 'rarity': '普通', 'description': '保護果實的普通尖刺外殼。', 'hp': 50, 'mp': 18, 'attack': 15, 'defense': 18, 'speed': 6, 'crit': 2, 'resistances': {'木': 3, '金': -1}},
        {'id': 'dna_gold_c01', 'name': '微光金屬', 'type': '金', 'rarity': '普通', 'description': '帶有微弱光澤的金屬片。', 'hp': 50, 'mp': 18, 'attack': 15, 'defense': 20, 'speed': 8, 'crit': 3, 'resistances': {'金': 2}},
        {'id': 'dna_gold_c02', 'name': '生鏽鐵片', 'type': '金', 'rarity': '普通', 'description': '被氧化的普通鐵片。', 'hp': 48, 'mp': 15, 'attack': 17, 'defense': 18, 'speed': 7, 'crit': 4, 'resistances': {'金': 1, '水': -1}},
        {'id': 'dna_gold_c03', 'name': '導電銀線', 'type': '金', 'rarity': '普通', 'description': '能夠傳導微弱能量的銀線。', 'hp': 45, 'mp': 24, 'attack': 14, 'defense': 16, 'speed': 13, 'crit': 5, 'resistances': {'金': 1, '風': 1}},
        {'id': 'dna_gold_c04', 'name': '鈍化銅塊', 'type': '金', 'rarity': '普通', 'description': '失去光澤的銅塊。', 'hp': 55, 'mp': 16, 'attack': 13, 'defense': 22, 'speed': 6, 'crit': 2, 'resistances': {'金': 3, '火': -2}},
        {'id': 'dna_gold_c05', 'name': '鉛質核心', 'type': '金', 'rarity': '普通', 'description': '沉重但質地柔軟的鉛核心。', 'hp': 60, 'mp': 12, 'attack': 16, 'defense': 25, 'speed': 4, 'crit': 1, 'resistances': {'金': 2, '土': 1}},
        {'id': 'dna_earth_c01', 'name': '鬆軟泥土', 'type': '土', 'rarity': '普通', 'description': '普通的鬆軟泥土塊。', 'hp': 65, 'mp': 20, 'attack': 9, 'defense': 18, 'speed': 5, 'crit': 2, 'resistances': {'土': 2}},
        {'id': 'dna_earth_c02', 'name': '風化砂礫', 'type': '土', 'rarity': '普通', 'description': '被風吹拂的細小砂礫。', 'hp': 58, 'mp': 18, 'attack': 11, 'defense': 16, 'speed': 10, 'crit': 3, 'resistances': {'土': 1, '風': 1}},
        {'id': 'dna_earth_c03', 'name': '黏性黏土', 'type': '土', 'rarity': '普通', 'description': '濕潤且具有黏性的黏土。', 'hp': 70, 'mp': 22, 'attack': 8, 'defense': 19, 'speed': 4, 'crit': 1, 'resistances': {'土': 1, '水': 2}},
        {'id': 'dna_earth_c04', 'name': '普通石塊', 'type': '土', 'rarity': '普通', 'description': '路邊隨處可見的石頭。', 'hp': 62, 'mp': 15, 'attack': 12, 'defense': 22, 'speed': 6, 'crit': 2, 'resistances': {'土': 3, '木': -1}},
        {'id': 'dna_earth_c05', 'name': '礦石殘渣', 'type': '土', 'rarity': '普通', 'description': '提煉後剩下的礦石殘渣。', 'hp': 55, 'mp': 16, 'attack': 14, 'defense': 20, 'speed': 8, 'crit': 3, 'resistances': {'土': 1, '金': 1}},
        {'id': 'dna_light_c01', 'name': '微弱光塵', 'type': '光', 'rarity': '普通', 'description': '幾乎看不見的光粒子。', 'hp': 50, 'mp': 26, 'attack': 14, 'defense': 10, 'speed': 11, 'crit': 5, 'resistances': {'光': 2}},
        {'id': 'dna_light_c02', 'name': '露珠折射', 'type': '光', 'rarity': '普通', 'description': '陽光穿過露珠的微弱光芒。', 'hp': 53, 'mp': 28, 'attack': 13, 'defense': 11, 'speed': 12, 'crit': 6, 'resistances': {'光': 1, '水': 1}},
        {'id': 'dna_light_c03', 'name': '螢火蟲之光', 'type': '光', 'rarity': '普通', 'description': '螢火蟲發出的生物光。', 'hp': 48, 'mp': 25, 'attack': 15, 'defense': 9, 'speed': 14, 'crit': 7, 'resistances': {'光': 1, '木': 1}},
        {'id': 'dna_light_c04', 'name': '月光碎片', 'type': '光', 'rarity': '普通', 'description': '溫和的月光凝結成的碎片。', 'hp': 55, 'mp': 30, 'attack': 12, 'defense': 13, 'speed': 10, 'crit': 4, 'resistances': {'光': 2, '暗': -1}},
        {'id': 'dna_light_c05', 'name': '稜鏡殘角', 'type': '光', 'rarity': '普通', 'description': '能散射光線的普通稜鏡殘角。', 'hp': 46, 'mp': 27, 'attack': 16, 'defense': 12, 'speed': 13, 'crit': 8, 'resistances': {'光': 3}},
        {'id': 'dna_dark_c01', 'name': '稀薄暗影', 'type': '暗', 'rarity': '普通', 'description': '一絲難以察覺的暗影。', 'hp': 48, 'mp': 27, 'attack': 16, 'defense': 8, 'speed': 10, 'crit': 6, 'resistances': {'暗': 2}},
        {'id': 'dna_dark_c02', 'name': '夜幕殘片', 'type': '暗', 'rarity': '普通', 'description': '從深邃夜幕中剝離的碎片。', 'hp': 50, 'mp': 29, 'attack': 15, 'defense': 9, 'speed': 11, 'crit': 7, 'resistances': {'暗': 2, '光': -1}},
        {'id': 'dna_dark_c03', 'name': '洞穴回音', 'type': '暗', 'rarity': '普通', 'description': '在黑暗洞穴中迴盪的無形之音。', 'hp': 45, 'mp': 26, 'attack': 17, 'defense': 7, 'speed': 13, 'crit': 8, 'resistances': {'暗': 1, '風': 1}},
        {'id': 'dna_dark_c04', 'name': '遺忘塵埃', 'type': '暗', 'rarity': '普通', 'description': '被時間遺忘的角落裡的塵埃。', 'hp': 52, 'mp': 24, 'attack': 14, 'defense': 12, 'speed': 9, 'crit': 5, 'resistances': {'暗': 1, '土': 1}},
        {'id': 'dna_dark_c05', 'name': '墨色染料', 'type': '暗', 'rarity': '普通', 'description': '能將一切染黑的普通染料。', 'hp': 47, 'mp': 32, 'attack': 18, 'defense': 6, 'speed': 12, 'crit': 9, 'resistances': {'暗': 3, '水': 1}},
        {'id': 'dna_poison_c01', 'name': '淡綠毒霧', 'type': '毒', 'rarity': '普通', 'description': '幾乎無害的稀薄毒霧。', 'hp': 46, 'mp': 23, 'attack': 17, 'defense': 7, 'speed': 9, 'crit': 4, 'resistances': {'毒': 2}},
        {'id': 'dna_poison_c02', 'name': '腐敗菌絲', 'type': '毒', 'rarity': '普通', 'description': '在腐爛物上生長的菌絲。', 'hp': 50, 'mp': 20, 'attack': 16, 'defense': 9, 'speed': 8, 'crit': 3, 'resistances': {'毒': 1, '木': 1}},
        {'id': 'dna_poison_c03', 'name': '毒草汁液', 'type': '毒', 'rarity': '普通', 'description': '普通毒草中榨取的汁液。', 'hp': 44, 'mp': 26, 'attack': 19, 'defense': 6, 'speed': 10, 'crit': 5, 'resistances': {'毒': 3, '木': 1}},
        {'id': 'dna_poison_c04', 'name': '麻痺花粉', 'type': '毒', 'rarity': '普通', 'description': '能引起輕微麻痺感的花粉。', 'hp': 42, 'mp': 25, 'attack': 15, 'defense': 8, 'speed': 12, 'crit': 6, 'resistances': {'毒': 1, '風': 2}},
        {'id': 'dna_poison_c05', 'name': '污染之水', 'type': '毒', 'rarity': '普通', 'description': '被輕微污染的渾濁水源。', 'hp': 48, 'mp': 22, 'attack': 18, 'defense': 10, 'speed': 7, 'crit': 4, 'resistances': {'毒': 1, '水': 1}},
        {'id': 'dna_wind_c01', 'name': '輕柔微風', 'type': '風', 'rarity': '普通', 'description': '幾乎感覺不到的微風。', 'hp': 47, 'mp': 24, 'attack': 13, 'defense': 9, 'speed': 15, 'crit': 5, 'resistances': {'風': 2}},
        {'id': 'dna_wind_c02', 'name': '飛舞羽毛', 'type': '風', 'rarity': '普通', 'description': '隨風飄蕩的普通羽毛。', 'hp': 45, 'mp': 26, 'attack': 12, 'defense': 8, 'speed': 17, 'crit': 6, 'resistances': {'風': 3}},
        {'id': 'dna_wind_c03', 'name': '氣旋核心', 'type': '風', 'rarity': '普通', 'description': '微小氣旋中心的能量核心。', 'hp': 49, 'mp': 28, 'attack': 14, 'defense': 10, 'speed': 16, 'crit': 7, 'resistances': {'風': 2, '火': -1}},
        {'id': 'dna_wind_c04', 'name': '蒲公英種子', 'type': '風', 'rarity': '普通', 'description': '乘風而行的蒲公英種子。', 'hp': 52, 'mp': 22, 'attack': 10, 'defense': 11, 'speed': 13, 'crit': 4, 'resistances': {'風': 1, '木': 1}},
        {'id': 'dna_wind_c05', 'name': '聲波碎片', 'type': '風', 'rarity': '普通', 'description': '聲音傳播時留下的能量碎片。', 'hp': 46, 'mp': 30, 'attack': 15, 'defense': 7, 'speed': 18, 'crit': 8, 'resistances': {'風': 2, '金': -1}},
        {'id': 'dna_mix_c01', 'name': '混色黏液', 'type': '混', 'rarity': '普通', 'description': '顏色混雜的普通黏液。', 'hp': 55, 'mp': 25, 'attack': 13, 'defense': 13, 'speed': 13, 'crit': 3},
        {'id': 'dna_none_c01', 'name': '中性細胞核', 'type': '無', 'rarity': '普通', 'description': '基礎的生命核心。', 'hp': 50, 'mp': 20, 'attack': 10, 'defense': 10, 'speed': 10, 'crit': 3},
        {'id': 'dna_fire_r01', 'name': '熾熱餘燼', 'type': '火', 'rarity': '稀有', 'description': '尚有餘溫的熾熱灰燼。', 'hp': 60, 'mp': 30, 'attack': 25, 'defense': 12, 'speed': 15, 'crit': 7, 'resistances': {'火': 5, '水': -1}},
        {'id': 'dna_fire_r02', 'name': '熔岩碎塊', 'type': '火', 'rarity': '稀有', 'description': '冷卻的熔岩，內部仍有熱量。', 'hp': 65, 'mp': 25, 'attack': 22, 'defense': 18, 'speed': 10, 'crit': 5, 'resistances': {'火': 4, '土': 2}},
        {'id': 'dna_fire_r03', 'name': '烈焰之息', 'type': '火', 'rarity': '稀有', 'description': '火屬性生物呼出的一口氣。', 'hp': 55, 'mp': 35, 'attack': 28, 'defense': 10, 'speed': 18, 'crit': 9, 'resistances': {'火': 6, '風': -2}},
        {'id': 'dna_fire_r04', 'name': '爆燃核心', 'type': '火', 'rarity': '稀有', 'description': '蘊含著爆炸能量的不穩定核心。', 'hp': 50, 'mp': 32, 'attack': 30, 'defense': 8, 'speed': 20, 'crit': 10, 'resistances': {'火': 7, '金': -3}},
        {'id': 'dna_fire_r05', 'name': '炎魔之血', 'type': '火', 'rarity': '稀有', 'description': '傳說中炎魔流下的灼熱血液。', 'hp': 70, 'mp': 28, 'attack': 24, 'defense': 15, 'speed': 12, 'crit': 6, 'resistances': {'火': 5, '暗': 2}},
        {'id': 'dna_water_r01', 'name': '凝結水珠', 'type': '水', 'rarity': '稀有', 'description': '蘊含純淨能量的凝結水珠。', 'hp': 70, 'mp': 35, 'attack': 18, 'defense': 18, 'speed': 16, 'crit': 6, 'resistances': {'水': 5, '木': -1}},
        {'id': 'dna_water_r02', 'name': '深海氣泡', 'type': '水', 'rarity': '稀有', 'description': '來自深海，蘊含著巨大壓力的氣泡。', 'hp': 65, 'mp': 40, 'attack': 16, 'defense': 16, 'speed': 20, 'crit': 7, 'resistances': {'水': 4, '風': 2}},
        {'id': 'dna_water_r03', 'name': '冰川碎片', 'type': '水', 'rarity': '稀有', 'description': '從萬年冰川上剝落的碎片。', 'hp': 75, 'mp': 30, 'attack': 20, 'defense': 22, 'speed': 10, 'crit': 5, 'resistances': {'水': 6, '火': -2}},
        {'id': 'dna_water_r04', 'name': '聖泉之水', 'type': '水', 'rarity': '稀有', 'description': '具有治癒能力的聖泉泉水。', 'hp': 85, 'mp': 45, 'attack': 12, 'defense': 20, 'speed': 12, 'crit': 4, 'resistances': {'水': 5, '光': 2}},
        {'id': 'dna_water_r05', 'name': '毒性水母觸手', 'type': '水', 'rarity': '稀有', 'description': '帶有麻痺毒素的水母觸手。', 'hp': 60, 'mp': 38, 'attack': 22, 'defense': 15, 'speed': 18, 'crit': 8, 'resistances': {'水': 4, '毒': 3}},
        {'id': 'dna_wood_r01', 'name': '硬化樹皮塊', 'type': '木', 'rarity': '稀有', 'description': '經過硬化的堅韌樹皮。', 'hp': 75, 'mp': 32, 'attack': 15, 'defense': 22, 'speed': 10, 'crit': 4, 'resistances': {'木': 5, '金': -1}},
        {'id': 'dna_wood_r02', 'name': '生命花蜜', 'type': '木', 'rarity': '稀有', 'description': '能激發生命力的神奇花蜜。', 'hp': 80, 'mp': 40, 'attack': 12, 'defense': 18, 'speed': 12, 'crit': 3, 'resistances': {'木': 4, '光': 2}},
        {'id': 'dna_wood_r03', 'name': '食人花瓣', 'type': '木', 'rarity': '稀有', 'description': '巨大食人花的帶毒花瓣。', 'hp': 68, 'mp': 35, 'attack': 20, 'defense': 16, 'speed': 14, 'crit': 7, 'resistances': {'木': 4, '毒': 3}},
        {'id': 'dna_wood_r04', 'name': '千年樹根', 'type': '木', 'rarity': '稀有', 'description': '吸收了大地精華的古老樹根。', 'hp': 90, 'mp': 28, 'attack': 14, 'defense': 25, 'speed': 8, 'crit': 2, 'resistances': {'木': 6, '土': 2}},
        {'id': 'dna_wood_r05', 'name': '風語之葉', 'type': '木', 'rarity': '稀有', 'description': '能夠傳遞風之訊息的葉片。', 'hp': 65, 'mp': 38, 'attack': 16, 'defense': 15, 'speed': 22, 'crit': 8, 'resistances': {'木': 4, '風': 3}},
        {'id': 'dna_gold_r01', 'name': '磁力礦石', 'type': '金', 'rarity': '稀有', 'description': '帶有天然磁力的稀有礦石。', 'hp': 65, 'mp': 22, 'attack': 20, 'defense': 28, 'speed': 12, 'crit': 5, 'resistances': {'金': 5, '土': -1}},
        {'id': 'dna_gold_r02', 'name': '鋒利刀刃碎片', 'type': '金', 'rarity': '稀有', 'description': '從傳說武器上剝落的鋒利碎片。', 'hp': 60, 'mp': 20, 'attack': 28, 'defense': 24, 'speed': 15, 'crit': 8, 'resistances': {'金': 4, '無': 2}},
        {'id': 'dna_gold_r03', 'name': '記憶合金', 'type': '金', 'rarity': '稀有', 'description': '能夠記憶形狀的神奇合金。', 'hp': 70, 'mp': 25, 'attack': 18, 'defense': 30, 'speed': 10, 'crit': 4, 'resistances': {'金': 6, '火': -2}},
        {'id': 'dna_gold_r04', 'name': '秘銀纖維', 'type': '金', 'rarity': '稀有', 'description': '極其輕盈且堅韌的秘銀纖維。', 'hp': 62, 'mp': 28, 'attack': 22, 'defense': 26, 'speed': 20, 'crit': 7, 'resistances': {'金': 5, '風': 2}},
        {'id': 'dna_gold_r05', 'name': '光能水晶', 'type': '金', 'rarity': '稀有', 'description': '能儲存和釋放光能的水晶。', 'hp': 68, 'mp': 35, 'attack': 19, 'defense': 25, 'speed': 14, 'crit': 6, 'resistances': {'金': 4, '光': 3}},
        {'id': 'dna_earth_r01', 'name': '堅硬岩片', 'type': '土', 'rarity': '稀有', 'description': '較為堅固的岩石碎片。', 'hp': 85, 'mp': 15, 'attack': 8, 'defense': 28, 'speed': 6, 'crit': 3, 'resistances': {'土': 5}},
        {'id': 'dna_earth_r02', 'name': '化石龍骨', 'type': '土', 'rarity': '稀有', 'description': '古代龍類的化石骨骼。', 'hp': 80, 'mp': 20, 'attack': 15, 'defense': 25, 'speed': 10, 'crit': 5, 'resistances': {'土': 4, '暗': 2}},
        {'id': 'dna_earth_r03', 'name': '地脈結晶', 'type': '土', 'rarity': '稀有', 'description': '大地能量流動匯聚成的結晶。', 'hp': 90, 'mp': 25, 'attack': 10, 'defense': 30, 'speed': 5, 'crit': 2, 'resistances': {'土': 6, '水': -2}},
        {'id': 'dna_earth_r04', 'name': '流沙核心', 'type': '土', 'rarity': '稀有', 'description': '流沙中心的能量核心。', 'hp': 75, 'mp': 22, 'attack': 12, 'defense': 26, 'speed': 14, 'crit': 4, 'resistances': {'土': 4, '風': 2}},
        {'id': 'dna_earth_r05', 'name': '黑曜石塊', 'type': '土', 'rarity': '稀有', 'description': '火山玻璃形成的堅硬黑曜石。', 'hp': 82, 'mp': 18, 'attack': 18, 'defense': 28, 'speed': 8, 'crit': 6, 'resistances': {'土': 5, '火': 2}},
        {'id': 'dna_light_r01', 'name': '純淨光束', 'type': '光', 'rarity': '稀有', 'description': '被凝聚成實體的純淨光束。', 'hp': 65, 'mp': 38, 'attack': 20, 'defense': 15, 'speed': 18, 'crit': 9, 'resistances': {'光': 5, '暗': -2}},
        {'id': 'dna_light_r02', 'name': '天使羽毛', 'type': '光', 'rarity': '稀有', 'description': '傳說中天使遺落的羽毛。', 'hp': 70, 'mp': 42, 'attack': 18, 'defense': 18, 'speed': 20, 'crit': 7, 'resistances': {'光': 4, '風': 2}},
        {'id': 'dna_light_r03', 'name': '星塵聚集體', 'type': '光', 'rarity': '稀有', 'description': '宇宙星塵的閃耀聚集體。', 'hp': 62, 'mp': 40, 'attack': 22, 'defense': 14, 'speed': 22, 'crit': 10, 'resistances': {'光': 6, '無': 1}},
        {'id': 'dna_light_r04', 'name': '祝福寶石', 'type': '光', 'rarity': '稀有', 'description': '蘊含著祝福力量的寶石。', 'hp': 80, 'mp': 35, 'attack': 15, 'defense': 22, 'speed': 15, 'crit': 5, 'resistances': {'光': 5, '土': 2}},
        {'id': 'dna_light_r05', 'name': '日珥能量', 'type': '光', 'rarity': '稀有', 'description': '從太陽日珥中捕獲的能量。', 'hp': 68, 'mp': 36, 'attack': 25, 'defense': 16, 'speed': 19, 'crit': 8, 'resistances': {'光': 4, '火': 3}},
        {'id': 'dna_dark_r01', 'name': '凝固暗影', 'type': '暗', 'rarity': '稀有', 'description': '被實體化的黑暗陰影。', 'hp': 62, 'mp': 39, 'attack': 24, 'defense': 12, 'speed': 17, 'crit': 9, 'resistances': {'暗': 5, '光': -2}},
        {'id': 'dna_dark_r02', 'name': '惡魔之眼', 'type': '暗', 'rarity': '稀有', 'description': '據說能看穿一切的惡魔眼睛。', 'hp': 58, 'mp': 45, 'attack': 28, 'defense': 10, 'speed': 19, 'crit': 11, 'resistances': {'暗': 6, '混': 1}},
        {'id': 'dna_dark_r03', 'name': '虛空碎片', 'type': '暗', 'rarity': '稀有', 'description': '來自虛空維度的神秘碎片。', 'hp': 60, 'mp': 42, 'attack': 26, 'defense': 11, 'speed': 21, 'crit': 10, 'resistances': {'暗': 7, '金': -2}},
        {'id': 'dna_dark_r04', 'name': '詛咒遺物', 'type': '暗', 'rarity': '稀有', 'description': '帶有古老詛咒的不祥遺物。', 'hp': 68, 'mp': 36, 'attack': 22, 'defense': 18, 'speed': 15, 'crit': 7, 'resistances': {'暗': 5, '毒': 2}},
        {'id': 'dna_dark_r05', 'name': '月蝕精華', 'type': '暗', 'rarity': '稀有', 'description': '在月蝕時收集的黑暗精華。', 'hp': 65, 'mp': 38, 'attack': 25, 'defense': 14, 'speed': 18, 'crit': 8, 'resistances': {'暗': 5, '水': 2}},
        {'id': 'dna_poison_r01', 'name': '弱效毒液', 'type': '毒', 'rarity': '稀有', 'description': '帶有些許毒性的液體。', 'hp': 50, 'mp': 24, 'attack': 20, 'defense': 8, 'speed': 14, 'crit': 6, 'resistances': {'毒': 5}},
        {'id': 'dna_poison_r02', 'name': '劇毒蛇牙', 'type': '毒', 'rarity': '稀有', 'description': '毒蛇脫落的含有劇毒的牙齒。', 'hp': 55, 'mp': 28, 'attack': 28, 'defense': 10, 'speed': 16, 'crit': 8, 'resistances': {'毒': 6, '金': -2}},
        {'id': 'dna_poison_r03', 'name': '毒氣腺體', 'type': '毒', 'rarity': '稀有', 'description': '能分泌毒氣的生物腺體。', 'hp': 60, 'mp': 32, 'attack': 25, 'defense': 12, 'speed': 15, 'crit': 7, 'resistances': {'毒': 7, '風': -2}},
        {'id': 'dna_poison_r04', 'name': '瘟疫孢子', 'type': '毒', 'rarity': '稀有', 'description': '能夠傳播疾病的危險孢子。', 'hp': 65, 'mp': 26, 'attack': 22, 'defense': 14, 'speed': 13, 'crit': 5, 'resistances': {'毒': 5, '木': 2}},
        {'id': 'dna_poison_r05', 'name': '酸性黏液', 'type': '毒', 'rarity': '稀有', 'description': '具有強烈腐蝕性的酸性黏液。', 'hp': 58, 'mp': 30, 'attack': 26, 'defense': 15, 'speed': 14, 'crit': 6, 'resistances': {'毒': 5, '水': 1}},
        {'id': 'dna_wind_r01', 'name': '微風精華', 'type': '風', 'rarity': '稀有', 'description': '蘊含少量風之力的精華。', 'hp': 58, 'mp': 26, 'attack': 16, 'defense': 10, 'speed': 22, 'crit': 8, 'resistances': {'風': 5}},
        {'id': 'dna_wind_r02', 'name': '風暴之眼碎片', 'type': '風', 'rarity': '稀有', 'description': '從風暴中心帶出的穩定能量碎片。', 'hp': 62, 'mp': 35, 'attack': 20, 'defense': 14, 'speed': 28, 'crit': 10, 'resistances': {'風': 6, '土': -2}},
        {'id': 'dna_wind_r03', 'name': '獅鷲之羽', 'type': '風', 'rarity': '稀有', 'description': '傳說生物獅鷲的輕盈羽毛。', 'hp': 60, 'mp': 30, 'attack': 18, 'defense': 12, 'speed': 30, 'crit': 12, 'resistances': {'風': 7}},
        {'id': 'dna_wind_r04', 'name': '壓縮空氣', 'type': '風', 'rarity': '稀有', 'description': '被高度壓縮的空氣團，釋放時威力巨大。', 'hp': 55, 'mp': 28, 'attack': 22, 'defense': 15, 'speed': 25, 'crit': 9, 'resistances': {'風': 5, '金': -2}},
        {'id': 'dna_wind_r05', 'name': '雷雲核心', 'type': '風', 'rarity': '稀有', 'description': '暴風雨中雷雲的能量核心。', 'hp': 65, 'mp': 38, 'attack': 24, 'defense': 16, 'speed': 24, 'crit': 8, 'resistances': {'風': 4, '水': 3}},
        {'id': 'dna_mix_r01', 'name': '不穩定化合物', 'type': '混', 'rarity': '稀有', 'description': '隨時可能發生異變的化合物。', 'hp': 70, 'mp': 35, 'attack': 20, 'defense': 20, 'speed': 20, 'crit': 6},
        {'id': 'dna_none_r01', 'name': '進化細胞簇', 'type': '無', 'rarity': '稀有', 'description': '具有高度適應性的細胞簇。', 'hp': 65, 'mp': 28, 'attack': 18, 'defense': 18, 'speed': 18, 'crit': 5},
        {'id': 'dna_fire_e01', 'name': '烈焰核心', 'type': '火', 'rarity': '菁英', 'description': '燃燒旺盛的火焰核心。', 'hp': 75, 'mp': 40, 'attack': 35, 'defense': 18, 'speed': 25, 'crit': 12, 'resistances': {'火': 8, '水': -3}},
        {'id': 'dna_fire_e02', 'name': '太陽耀斑碎片', 'type': '火', 'rarity': '菁英', 'description': '太陽耀斑爆發時產生的能量碎片。', 'hp': 70, 'mp': 45, 'attack': 40, 'defense': 15, 'speed': 28, 'crit': 14, 'resistances': {'火': 7, '光': 3}},
        {'id': 'dna_fire_e03', 'name': '鳳凰之淚', 'type': '火', 'rarity': '菁英', 'description': '傳說中鳳凰流下的，蘊含重生之力的淚滴。', 'hp': 90, 'mp': 50, 'attack': 30, 'defense': 22, 'speed': 20, 'crit': 8, 'resistances': {'火': 9, '暗': -4}},
        {'id': 'dna_fire_e04', 'name': '地獄火精粹', 'type': '火', 'rarity': '菁英', 'description': '來自地獄深淵的純粹火焰能量。', 'hp': 68, 'mp': 42, 'attack': 42, 'defense': 16, 'speed': 26, 'crit': 15, 'resistances': {'火': 8, '暗': 4}},
        {'id': 'dna_fire_e05', 'name': '鍛造之魂', 'type': '火', 'rarity': '菁英', 'description': '寄宿在神兵利器中的鍛造之火的靈魂。', 'hp': 80, 'mp': 38, 'attack': 38, 'defense': 28, 'speed': 18, 'crit': 10, 'resistances': {'火': 7, '金': 4}},
        {'id': 'dna_water_e01', 'name': '海嘯之心', 'type': '水', 'rarity': '菁英', 'description': '蘊含著海嘯般毀滅力量的能量核心。', 'hp': 85, 'mp': 42, 'attack': 28, 'defense': 25, 'speed': 24, 'crit': 10, 'resistances': {'水': 8, '土': -3}},
        {'id': 'dna_water_e02', 'name': '絕對零度冰核', 'type': '水', 'rarity': '菁英', 'description': '接近絕對零度的極寒冰核。', 'hp': 80, 'mp': 40, 'attack': 25, 'defense': 30, 'speed': 22, 'crit': 8, 'resistances': {'水': 9, '風': -4}},
        {'id': 'dna_water_e03', 'name': '利維坦鱗片', 'type': '水', 'rarity': '菁英', 'description': '傳說海怪利維坦的堅硬鱗片。', 'hp': 100, 'mp': 35, 'attack': 22, 'defense': 35, 'speed': 15, 'crit': 6, 'resistances': {'水': 10, '電': -5}},
        {'id': 'dna_water_e04', 'name': '生命之泉源頭', 'type': '水', 'rarity': '菁英', 'description': '生命之泉的源頭，充滿治癒與活化之力。', 'hp': 110, 'mp': 55, 'attack': 18, 'defense': 28, 'speed': 16, 'crit': 5, 'resistances': {'水': 8, '光': 4}},
        {'id': 'dna_water_e05', 'name': '克拉肯之墨', 'type': '水', 'rarity': '菁英', 'description': '巨大海妖克拉肯噴出的，能迷惑心智的墨汁。', 'hp': 78, 'mp': 48, 'attack': 30, 'defense': 20, 'speed': 26, 'crit': 12, 'resistances': {'水': 7, '暗': 4}},
        {'id': 'dna_wood_e01', 'name': '世界樹嫩芽', 'type': '木', 'rarity': '菁英', 'description': '傳說中世界樹長出的新芽。', 'hp': 105, 'mp': 45, 'attack': 20, 'defense': 30, 'speed': 15, 'crit': 6, 'resistances': {'木': 8, '火': -3}},
        {'id': 'dna_wood_e02', 'name': '自然之心', 'type': '木', 'rarity': '菁英', 'description': '整個森林生命力的匯聚體。', 'hp': 120, 'mp': 50, 'attack': 18, 'defense': 35, 'speed': 12, 'crit': 5, 'resistances': {'木': 9, '毒': -4}},
        {'id': 'dna_wood_e03', 'name': '德魯伊圖騰', 'type': '木', 'rarity': '菁英', 'description': '蘊含著古老德魯伊力量的圖騰。', 'hp': 95, 'mp': 55, 'attack': 22, 'defense': 28, 'speed': 18, 'crit': 8, 'resistances': {'木': 8, '混': 3}},
        {'id': 'dna_wood_e04', 'name': '光合作用結晶', 'type': '木', 'rarity': '菁英', 'description': '極致光合作用下產生的能量結晶。', 'hp': 88, 'mp': 48, 'attack': 25, 'defense': 26, 'speed': 24, 'crit': 10, 'resistances': {'木': 7, '光': 4}},
        {'id': 'dna_wood_e05', 'name': '荊棘王冠', 'type': '木', 'rarity': '菁英', 'description': '由活體荊棘編織而成的王冠，具有反傷能力。', 'hp': 90, 'mp': 40, 'attack': 28, 'defense': 32, 'speed': 16, 'crit': 7, 'resistances': {'木': 8, '金': -3}},
        {'id': 'dna_gold_e01', 'name': '精煉金塊', 'type': '金', 'rarity': '菁英', 'description': '經過提煉的純淨金屬塊。', 'hp': 65, 'mp': 28, 'attack': 22, 'defense': 30, 'speed': 12, 'crit': 6, 'resistances': {'金': 8, '火': -3}},
        {'id': 'dna_gold_e02', 'name': '奧利哈鋼', 'type': '金', 'rarity': '菁英', 'description': '傳說中的金屬奧利哈鋼，能抵抗魔法。', 'hp': 75, 'mp': 32, 'attack': 25, 'defense': 40, 'speed': 10, 'crit': 5, 'resistances': {'金': 9, '魔': 5}},
        {'id': 'dna_gold_e03', 'name': '雷擊之鐵', 'type': '金', 'rarity': '菁英', 'description': '被閃電擊中後產生異變的鐵塊。', 'hp': 70, 'mp': 30, 'attack': 30, 'defense': 32, 'speed': 22, 'crit': 10, 'resistances': {'金': 8, '風': 3}},
        {'id': 'dna_gold_e04', 'name': '機械核心', 'type': '金', 'rarity': '菁英', 'description': '古代機械造物的能量核心。', 'hp': 80, 'mp': 40, 'attack': 28, 'defense': 38, 'speed': 15, 'crit': 7, 'resistances': {'金': 10, '水': -4}},
        {'id': 'dna_gold_e05', 'name': '守護者之盾碎片', 'type': '金', 'rarity': '菁英', 'description': '上古守護者巨盾的碎片，擁有極高的防禦力。', 'hp': 90, 'mp': 25, 'attack': 20, 'defense': 45, 'speed': 8, 'crit': 4, 'resistances': {'金': 12}},
        {'id': 'dna_earth_e01', 'name': '泰坦之心', 'type': '土', 'rarity': '菁英', 'description': '傳說中大地泰坦的心臟化石。', 'hp': 130, 'mp': 20, 'attack': 15, 'defense': 40, 'speed': 5, 'crit': 4, 'resistances': {'土': 10, '風': -4}},
        {'id': 'dna_earth_e02', 'name': '鑽石原石', 'type': '土', 'rarity': '菁英', 'description': '未經打磨的巨大鑽石原石，堅不可摧。', 'hp': 110, 'mp': 25, 'attack': 18, 'defense': 45, 'speed': 8, 'crit': 3, 'resistances': {'土': 9, '金': 3}},
        {'id': 'dna_earth_e03', 'name': '地震之核', 'type': '土', 'rarity': '菁英', 'description': '引發地震的能量根源。', 'hp': 100, 'mp': 30, 'attack': 25, 'defense': 38, 'speed': 10, 'crit': 6, 'resistances': {'土': 8, '無': 2}},
        {'id': 'dna_earth_e04', 'name': '石化之眼', 'type': '土', 'rarity': '菁英', 'description': '能將萬物石化的魔眼。', 'hp': 95, 'mp': 35, 'attack': 20, 'defense': 35, 'speed': 12, 'crit': 5, 'resistances': {'土': 8, '暗': 3}},
        {'id': 'dna_earth_e05', 'name': '活化山脈', 'type': '土', 'rarity': '菁英', 'description': '擁有自我意識的山脈的一部分。', 'hp': 150, 'mp': 15, 'attack': 12, 'defense': 50, 'speed': 4, 'crit': 2, 'resistances': {'土': 12, '木': -5}},
        {'id': 'dna_light_e01', 'name': '光芒碎片', 'type': '光', 'rarity': '菁英', 'description': '閃耀著純淨光芒的結晶碎片。', 'hp': 68, 'mp': 30, 'attack': 20, 'defense': 14, 'speed': 15, 'crit': 7, 'resistances': {'光': 8}},
        {'id': 'dna_light_e02', 'name': '創世之光', 'type': '光', 'rarity': '菁英', 'description': '世界誕生之初的第一道光。', 'hp': 80, 'mp': 50, 'attack': 28, 'defense': 22, 'speed': 25, 'crit': 12, 'resistances': {'光': 10, '暗': -5}},
        {'id': 'dna_light_e03', 'name': '神聖符文', 'type': '光', 'rarity': '菁英', 'description': '刻有神聖文字的古代符文石。', 'hp': 85, 'mp': 55, 'attack': 25, 'defense': 25, 'speed': 22, 'crit': 10, 'resistances': {'光': 9, '混': 2}},
        {'id': 'dna_light_e04', 'name': '靈魂結晶', 'type': '光', 'rarity': '菁英', 'description': '純淨靈魂凝結而成的結晶體。', 'hp': 90, 'mp': 60, 'attack': 20, 'defense': 28, 'speed': 20, 'crit': 8, 'resistances': {'光': 8, '無': 3}},
        {'id': 'dna_light_e05', 'name': '奇蹟之種', 'type': '光', 'rarity': '菁英', 'description': '能引發奇蹟的神秘種子。', 'hp': 100, 'mp': 45, 'attack': 22, 'defense': 30, 'speed': 18, 'crit': 7, 'resistances': {'光': 8, '木': 4}},
        {'id': 'dna_dark_e01', 'name': '暗影殘片', 'type': '暗', 'rarity': '菁英', 'description': '凝聚了部分暗影力量的碎片。', 'hp': 48, 'mp': 38, 'attack': 28, 'defense': 7, 'speed': 12, 'crit': 9, 'resistances': {'暗': 8}},
        {'id': 'dna_dark_e02', 'name': '終焉之影', 'type': '暗', 'rarity': '菁英', 'description': '預示著終結的純粹黑暗。', 'hp': 75, 'mp': 48, 'attack': 40, 'defense': 18, 'speed': 28, 'crit': 14, 'resistances': {'暗': 10, '光': -5}},
        {'id': 'dna_dark_e03', 'name': '深淵魔石', 'type': '暗', 'rarity': '菁英', 'description': '來自深淵，能扭曲現實的魔石。', 'hp': 80, 'mp': 52, 'attack': 38, 'defense': 20, 'speed': 25, 'crit': 12, 'resistances': {'暗': 9, '混': 2}},
        {'id': 'dna_dark_e04', 'name': '恐懼化身', 'type': '暗', 'rarity': '菁英', 'description': '由純粹的恐懼情感匯聚而成。', 'hp': 70, 'mp': 58, 'attack': 35, 'defense': 16, 'speed': 30, 'crit': 15, 'resistances': {'暗': 8, '無': 3}},
        {'id': 'dna_dark_e05', 'name': '噬魂者之牙', 'type': '暗', 'rarity': '菁英', 'description': '傳說中噬魂者的牙齒，能吸取靈魂能量。', 'hp': 82, 'mp': 45, 'attack': 42, 'defense': 22, 'speed': 24, 'crit': 11, 'resistances': {'暗': 8, '毒': 4}},
        {'id': 'dna_poison_e01', 'name': '萬毒之源', 'type': '毒', 'rarity': '菁英', 'description': '世界上所有毒素的源頭。', 'hp': 70, 'mp': 45, 'attack': 38, 'defense': 15, 'speed': 24, 'crit': 10, 'resistances': {'毒': 10, '金': -4}},
        {'id': 'dna_poison_e02', 'name': '石化蛇髮', 'type': '毒', 'rarity': '菁英', 'description': '神話中梅杜莎的頭髮，帶有石化劇毒。', 'hp': 75, 'mp': 42, 'attack': 35, 'defense': 20, 'speed': 22, 'crit': 8, 'resistances': {'毒': 9, '土': 3}},
        {'id': 'dna_poison_e03', 'name': '神經毒素原液', 'type': '毒', 'rarity': '菁英', 'description': '能瞬間麻痺神經的強烈毒素原液。', 'hp': 68, 'mp': 50, 'attack': 40, 'defense': 12, 'speed': 28, 'crit': 12, 'resistances': {'毒': 8, '風': -3}},
        {'id': 'dna_poison_e04', 'name': '放射性核心', 'type': '毒', 'rarity': '菁英', 'description': '不斷釋放出有害射線的能量核心。', 'hp': 80, 'mp': 38, 'attack': 32, 'defense': 25, 'speed': 18, 'crit': 7, 'resistances': {'毒': 12, '光': -5}},
        {'id': 'dna_poison_e05', 'name': '凋零之花', 'type': '毒', 'rarity': '菁英', 'description': '使其周圍一切生命凋零的詭異花朵。', 'hp': 85, 'mp': 40, 'attack': 30, 'defense': 22, 'speed': 20, 'crit': 6, 'resistances': {'毒': 8, '木': 4}},
        {'id': 'dna_wind_e01', 'name': '颶風之眼', 'type': '風', 'rarity': '菁英', 'description': '颶風中心的平靜但充滿力量的風眼。', 'hp': 72, 'mp': 48, 'attack': 28, 'defense': 20, 'speed': 35, 'crit': 14, 'resistances': {'風': 10, '土': -4}},
        {'id': 'dna_wind_e02', 'name': '風精靈女王之息', 'type': '風', 'rarity': '菁英', 'description': '風精靈女王呼出的一口氣，蘊含強大魔力。', 'hp': 80, 'mp': 55, 'attack': 25, 'defense': 22, 'speed': 38, 'crit': 12, 'resistances': {'風': 9, '魔法': 5}},
        {'id': 'dna_wind_e03', 'name': '音爆核心', 'type': '風', 'rarity': '菁英', 'description': '突破音障時產生的能量核心。', 'hp': 70, 'mp': 45, 'attack': 32, 'defense': 18, 'speed': 42, 'crit': 15, 'resistances': {'風': 8, '金': -3}},
        {'id': 'dna_wind_e04', 'name': '以太氣流', 'type': '風', 'rarity': '菁英', 'description': '在魔法空間中流動的神秘以太氣流。', 'hp': 78, 'mp': 58, 'attack': 26, 'defense': 24, 'speed': 36, 'crit': 11, 'resistances': {'風': 8, '混': 3}},
        {'id': 'dna_wind_e05', 'name': '真空刃碎片', 'type': '風', 'rarity': '菁英', 'description': '能切割萬物的真空之刃的碎片。', 'hp': 68, 'mp': 52, 'attack': 38, 'defense': 16, 'speed': 40, 'crit': 18, 'resistances': {'風': 12}},
        {'id': 'dna_mix_e01', 'name': '煉金術師的賢者之石碎片', 'type': '混', 'rarity': '菁英', 'description': '傳說中的賢者之石的微小碎片。', 'hp': 85, 'mp': 55, 'attack': 30, 'defense': 30, 'speed': 30, 'crit': 10},
        {'id': 'dna_none_e01', 'name': '完美細胞樣本', 'type': '無', 'rarity': '菁英', 'description': '具有無限可能性的完美細胞。', 'hp': 80, 'mp': 40, 'attack': 25, 'defense': 25, 'speed': 25, 'crit': 8},
        {'id': 'dna_fire_l01', 'name': '恆星碎片', 'type': '火', 'rarity': '傳奇', 'description': '來自恆星核心的碎片，永恆燃燒。', 'hp': 90, 'mp': 60, 'attack': 50, 'defense': 28, 'speed': 35, 'crit': 18, 'resistances': {'火': 15, '水': -8, '光': 5}},
        {'id': 'dna_fire_l02', 'name': '紅蓮地獄火', 'type': '火', 'rarity': '傳奇', 'description': '足以燃盡一切的紅蓮業火。', 'hp': 85, 'mp': 55, 'attack': 55, 'defense': 25, 'speed': 38, 'crit': 20, 'resistances': {'火': 14, '暗': 6, '冰': -10}},
        {'id': 'dna_fire_l03', 'name': '伊格尼斯的心跳', 'type': '火', 'rarity': '傳奇', 'description': '古代火神伊格尼斯心臟的餘響。', 'hp': 110, 'mp': 50, 'attack': 45, 'defense': 35, 'speed': 30, 'crit': 15, 'resistances': {'火': 16, '土': 4}},
        {'id': 'dna_fire_l04', 'name': '末日火山灰', 'type': '火', 'rarity': '傳奇', 'description': '終結一個時代的火山爆發所留下的灰燼。', 'hp': 100, 'mp': 65, 'attack': 48, 'defense': 30, 'speed': 32, 'crit': 16, 'resistances': {'火': 13, '毒': 7, '風': -7}},
        {'id': 'dna_fire_l05', 'name': '龍息結晶', 'type': '火', 'rarity': '傳奇', 'description': '傳說巨龍的吐息凝結成的結晶。', 'hp': 95, 'mp': 58, 'attack': 52, 'defense': 32, 'speed': 34, 'crit': 17, 'resistances': {'火': 15, '金': 5, '水': -8}},
        {'id': 'dna_water_l01', 'name': '深海之源', 'type': '水', 'rarity': '傳奇', 'description': '來自海洋深處的強大水能結晶。', 'hp': 80, 'mp': 45, 'attack': 22, 'defense': 28, 'speed': 25, 'crit': 8, 'resistances': {'水': 12, '火': -5}},
        {'id': 'dna_water_l02', 'name': '波賽頓的三叉戟碎片', 'type': '水', 'rarity': '傳奇', 'description': '傳說海神波賽頓武器的碎片。', 'hp': 100, 'mp': 65, 'attack': 48, 'defense': 35, 'speed': 32, 'crit': 16, 'resistances': {'水': 15, '金': 5, '木': -8}},
        {'id': 'dna_water_l03', 'name': '永凍之魂', 'type': '水', 'rarity': '傳奇', 'description': '蘊含著永恆凍土靈魂的冰晶。', 'hp': 90, 'mp': 60, 'attack': 45, 'defense': 40, 'speed': 28, 'crit': 14, 'resistances': {'水': 16, '風': -7}},
        {'id': 'dna_water_l04', 'name': '亞特蘭提斯之心', 'type': '水', 'rarity': '傳奇', 'description': '沉沒之城亞特蘭提斯的能量核心。', 'hp': 120, 'mp': 70, 'attack': 40, 'defense': 38, 'speed': 25, 'crit': 12, 'resistances': {'水': 14, '混': 6, '電': -10}},
        {'id': 'dna_water_l05', 'name': '淚之海洋', 'type': '水', 'rarity': '傳奇', 'description': '由神祇的悲傷淚水匯聚成的海洋精華。', 'hp': 105, 'mp': 75, 'attack': 42, 'defense': 32, 'speed': 30, 'crit': 15, 'resistances': {'水': 15, '光': 5, '毒': -8}},
        {'id': 'dna_wood_l01', 'name': '伊格德拉修之葉', 'type': '木', 'rarity': '傳奇', 'description': '生命之樹伊格德拉修的葉片。', 'hp': 125, 'mp': 60, 'attack': 30, 'defense': 45, 'speed': 25, 'crit': 10, 'resistances': {'木': 15, '光': 6, '火': -8}},
        {'id': 'dna_wood_l02', 'name': '蓋亞的祝福', 'type': '木', 'rarity': '傳奇', 'description': '大地母神蓋亞對生命的祝福。', 'hp': 140, 'mp': 55, 'attack': 28, 'defense': 50, 'speed': 20, 'crit': 8, 'resistances': {'木': 16, '土': 5, '金': -8}},
        {'id': 'dna_wood_l03', 'name': '森林賢者之魂', 'type': '木', 'rarity': '傳奇', 'description': '古代森林賢者的靈魂結晶。', 'hp': 110, 'mp': 70, 'attack': 35, 'defense': 40, 'speed': 30, 'crit': 12, 'resistances': {'木': 14, '混': 7}},
        {'id': 'dna_wood_l04', 'name': '阿瓦隆的聖果', 'type': '木', 'rarity': '傳奇', 'description': '來自理想鄉阿瓦隆，能治癒一切的聖果。', 'hp': 150, 'mp': 65, 'attack': 25, 'defense': 42, 'speed': 22, 'crit': 7, 'resistances': {'木': 15, '水': 6, '暗': -8}},
        {'id': 'dna_wood_l05', 'name': '猛毒世界樹根', 'type': '木', 'rarity': '傳奇', 'description': '世界樹根部被污染後產生的劇毒變異體。', 'hp': 115, 'mp': 62, 'attack': 40, 'defense': 38, 'speed': 28, 'crit': 14, 'resistances': {'木': 13, '毒': 8, '火': -7}},
        {'id': 'dna_gold_l01', 'name': '不朽金屬', 'type': '金', 'rarity': '傳奇', 'description': '極其堅硬且帶有神秘力量的金屬。', 'hp': 70, 'mp': 20, 'attack': 25, 'defense': 35, 'speed': 10, 'crit': 5, 'resistances': {'金': 12, '土': 5}},
        {'id': 'dna_gold_l02', 'name': '赫淮斯托斯的鍛錘碎片', 'type': '金', 'rarity': '傳奇', 'description': '工匠之神赫淮斯托斯的神錘碎片。', 'hp': 100, 'mp': 40, 'attack': 50, 'defense': 55, 'speed': 20, 'crit': 12, 'resistances': {'金': 15, '火': 6, '水': -8}},
        {'id': 'dna_gold_l03', 'name': '朗基努斯之槍尖', 'type': '金', 'rarity': '傳奇', 'description': '傳說中刺穿神祇的聖槍之尖。', 'hp': 90, 'mp': 45, 'attack': 60, 'defense': 45, 'speed': 28, 'crit': 20, 'resistances': {'金': 14, '光': 7, '暗': -7}},
        {'id': 'dna_gold_l04', 'name': '絕對防禦力場核心', 'type': '金', 'rarity': '傳奇', 'description': '能產生絕對防禦力場的古代核心。', 'hp': 130, 'mp': 50, 'attack': 30, 'defense': 65, 'speed': 15, 'crit': 8, 'resistances': {'金': 18, '魔': 10, '物': 10}},
        {'id': 'dna_gold_l05', 'name': '變形金剛火種源碎片', 'type': '金', 'rarity': '傳奇', 'description': '賦予機械生命的火種源的微小碎片。', 'hp': 110, 'mp': 60, 'attack': 48, 'defense': 50, 'speed': 25, 'crit': 15, 'resistances': {'金': 16, '電': 8, '混': -8}},
        {'id': 'dna_earth_l01', 'name': '大地龍脈結晶', 'type': '土', 'rarity': '傳奇', 'description': '蘊含大地龍脈力量的稀有結晶。', 'hp': 100, 'mp': 25, 'attack': 18, 'defense': 40, 'speed': 8, 'crit': 4, 'resistances': {'土': 12, '風': -5}},
        {'id': 'dna_earth_l02', 'name': '盤古的脊柱', 'type': '土', 'rarity': '傳奇', 'description': '開天闢地的巨人盤古的脊柱化石。', 'hp': 160, 'mp': 40, 'attack': 45, 'defense': 60, 'speed': 15, 'crit': 10, 'resistances': {'土': 18, '無': 10, '風': -10}},
        {'id': 'dna_earth_l03', 'name': '萬有引力之核', 'type': '土', 'rarity': '傳奇', 'description': '控制萬有引力的神秘核心。', 'hp': 130, 'mp': 50, 'attack': 40, 'defense': 55, 'speed': 18, 'crit': 8, 'resistances': {'土': 16, '混': 8, '光': -8}},
        {'id': 'dna_earth_l04', 'name': '巴別塔基石', 'type': '土', 'rarity': '傳奇', 'description': '通天塔巴別塔的基石，蘊含著古代文明的智慧。', 'hp': 140, 'mp': 60, 'attack': 35, 'defense': 58, 'speed': 12, 'crit': 6, 'resistances': {'土': 17, '魔': 8, '金': -8}},
        {'id': 'dna_earth_l05', 'name': '石中劍劍鞘', 'type': '土', 'rarity': '傳奇', 'description': '保護石中劍的岩石劍鞘，持有者不會受傷。', 'hp': 180, 'mp': 45, 'attack': 30, 'defense': 62, 'speed': 10, 'crit': 5, 'resistances': {'土': 20, '金': 10, '木': -12}},
        {'id': 'dna_light_l01', 'name': '拉之翼', 'type': '光', 'rarity': '傳奇', 'description': '太陽神拉的羽翼，照耀萬物。', 'hp': 100, 'mp': 70, 'attack': 45, 'defense': 35, 'speed': 40, 'crit': 18, 'resistances': {'光': 15, '火': 6, '暗': -10}},
        {'id': 'dna_light_l02', 'name': '天堂之門鑰匙', 'type': '光', 'rarity': '傳奇', 'description': '能開啟天堂之門的神秘鑰匙。', 'hp': 110, 'mp': 80, 'attack': 40, 'defense': 40, 'speed': 35, 'crit': 15, 'resistances': {'光': 16, '無': 8, '魔': -8}},
        {'id': 'dna_light_l03', 'name': '聖杯碎片', 'type': '光', 'rarity': '傳奇', 'description': '傳說中能實現任何願望的聖杯的碎片。', 'hp': 130, 'mp': 75, 'attack': 35, 'defense': 42, 'speed': 30, 'crit': 12, 'resistances': {'光': 18, '水': 7}},
        {'id': 'dna_light_l04', 'name': '拂曉之星', 'type': '光', 'rarity': '傳奇', 'description': '在拂曉時最亮的那顆星的星核。', 'hp': 95, 'mp': 65, 'attack': 50, 'defense': 30, 'speed': 45, 'crit': 20, 'resistances': {'光': 14, '風': 7, '土': -7}},
        {'id': 'dna_light_l05', 'name': '真理之書殘頁', 'type': '光', 'rarity': '傳奇', 'description': '記載著世界所有真理的書的殘頁。', 'hp': 105, 'mp': 85, 'attack': 42, 'defense': 38, 'speed': 32, 'crit': 14, 'resistances': {'光': 17, '混': 8}},
        {'id': 'dna_dark_l01', 'name': '路西法的墮落之羽', 'type': '暗', 'rarity': '傳奇', 'description': '墮天使路西法遺落的黑色羽毛。', 'hp': 95, 'mp': 68, 'attack': 52, 'defense': 30, 'speed': 42, 'crit': 18, 'resistances': {'暗': 15, '火': 6, '光': -10}},
        {'id': 'dna_dark_l02', 'name': '潘朵拉之盒的鎖', 'type': '暗', 'rarity': '傳奇', 'description': '封印著世間所有災厄的潘朵拉之盒的鎖。', 'hp': 115, 'mp': 60, 'attack': 48, 'defense': 40, 'speed': 32, 'crit': 15, 'resistances': {'暗': 16, '混': 8, '無': -8}},
        {'id': 'dna_dark_l03', 'name': '冥河之水', 'type': '暗', 'rarity': '傳奇', 'description': '來自冥界，能洗去一切記憶的河水。', 'hp': 100, 'mp': 75, 'attack': 45, 'defense': 35, 'speed': 38, 'crit': 16, 'resistances': {'暗': 17, '水': 7}},
        {'id': 'dna_dark_l04', 'name': '克蘇魯的觸鬚', 'type': '暗', 'rarity': '傳奇', 'description': '舊日支配者克蘇魯的觸鬚，蘊含瘋狂之力。', 'hp': 120, 'mp': 65, 'attack': 50, 'defense': 38, 'speed': 28, 'crit': 14, 'resistances': {'暗': 18, '毒': 8, '光': -12}},
        {'id': 'dna_dark_l05', 'name': '湮滅奇點', 'type': '暗', 'rarity': '傳奇', 'description': '將一切吞噬並化為虛無的奇點。', 'hp': 80, 'mp': 80, 'attack': 58, 'defense': 25, 'speed': 45, 'crit': 22, 'resistances': {'暗': 20, '金': -10}},
        {'id': 'dna_poison_l01', 'name': '巴蛇之毒', 'type': '毒', 'rarity': '傳奇', 'description': '傳說中能吞象的巨蛇巴蛇的毒液。', 'hp': 90, 'mp': 60, 'attack': 50, 'defense': 28, 'speed': 35, 'crit': 15, 'resistances': {'毒': 15, '木': 6, '金': -8}},
        {'id': 'dna_poison_l02', 'name': '許德拉的再生之血', 'type': '毒', 'rarity': '傳奇', 'description': '九頭蛇許德拉的血液，既是劇毒也能再生。', 'hp': 110, 'mp': 55, 'attack': 48, 'defense': 32, 'speed': 30, 'crit': 12, 'resistances': {'毒': 16, '水': 7}},
        {'id': 'dna_poison_l03', 'name': '寂靜之春的農藥', 'type': '毒', 'rarity': '傳奇', 'description': '讓春天沉寂的禁忌農藥。', 'hp': 85, 'mp': 65, 'attack': 52, 'defense': 25, 'speed': 38, 'crit': 18, 'resistances': {'毒': 17, '土': 5, '光': -10}},
        {'id': 'dna_poison_l04', 'name': '芬里爾的唾液', 'type': '毒', 'rarity': '傳奇', 'description': '諸神黃昏中魔狼芬里爾的腐蝕性唾液。', 'hp': 100, 'mp': 58, 'attack': 55, 'defense': 30, 'speed': 34, 'crit': 16, 'resistances': {'毒': 18, '暗': 8, '金': -10}},
        {'id': 'dna_poison_l05', 'name': '疫病之王的嘆息', 'type': '毒', 'rarity': '傳奇', 'description': '傳播瘟疫的君王的嘆息，化為實體。', 'hp': 95, 'mp': 70, 'attack': 46, 'defense': 28, 'speed': 40, 'crit': 14, 'resistances': {'毒': 20, '風': 7}},
        {'id': 'dna_wind_l01', 'name': '埃俄羅斯的風袋', 'type': '風', 'rarity': '傳奇', 'description': '風神埃俄羅斯用來收納全世界的風的袋子。', 'hp': 90, 'mp': 70, 'attack': 40, 'defense': 30, 'speed': 50, 'crit': 18, 'resistances': {'風': 15, '水': 6, '土': -8}},
        {'id': 'dna_wind_l02', 'name': '天狗的羽扇', 'type': '風', 'rarity': '傳奇', 'description': '日本傳說中天狗的羽扇，能掀起狂風。', 'hp': 95, 'mp': 65, 'attack': 42, 'defense': 32, 'speed': 52, 'crit': 16, 'resistances': {'風': 16, '木': 7}},
        {'id': 'dna_wind_l03', 'name': '風之迦樓羅的啼鳴', 'type': '風', 'rarity': '傳奇', 'description': '神鳥迦樓羅的啼鳴，化為音速的衝擊波。', 'hp': 85, 'mp': 75, 'attack': 48, 'defense': 28, 'speed': 55, 'crit': 20, 'resistances': {'風': 17, '光': 8, '金': -10}},
        {'id': 'dna_wind_l04', 'name': '蝴蝶效應的風暴', 'type': '風', 'rarity': '傳奇', 'description': '由初始的微小扇動最終引發的毀滅性風暴。', 'hp': 110, 'mp': 80, 'attack': 45, 'defense': 35, 'speed': 48, 'crit': 15, 'resistances': {'風': 18, '混': 8, '無': -8}},
        {'id': 'dna_wind_l05', 'name': '女武神的騎行', 'type': '風', 'rarity': '傳奇', 'description': '女武神在天空中騎行時留下的神速軌跡。', 'hp': 100, 'mp': 72, 'attack': 46, 'defense': 38, 'speed': 58, 'crit': 17, 'resistances': {'風': 20, '金': 7}},
        {'id': 'dna_mix_l01', 'name': '阿卡西記錄的殘片', 'type': '混', 'rarity': '傳奇', 'description': '記載著宇宙一切資訊的阿卡西記錄的殘片。', 'hp': 100, 'mp': 80, 'attack': 45, 'defense': 45, 'speed': 45, 'crit': 15},
        {'id': 'dna_none_l01', 'name': '蓋亞的意識', 'type': '無', 'rarity': '傳奇', 'description': '行星地球本身的意識體。', 'hp': 150, 'mp': 50, 'attack': 40, 'defense': 40, 'speed': 40, 'crit': 10},
        {'id': 'dna_fire_m01', 'name': '宇宙大爆炸奇點', 'type': '火', 'rarity': '神話', 'description': '宇宙誕生之初的那個無限熱的奇點。', 'hp': 120, 'mp': 80, 'attack': 70, 'defense': 45, 'speed': 55, 'crit': 25, 'resistances': {'火': 25, '光': 10, '暗': 10, '水': -15}},
        {'id': 'dna_water_m01', 'name': '萬物初始之海', 'type': '水', 'rarity': '神話', 'description': '生命誕生之前的原始海洋。', 'hp': 150, 'mp': 100, 'attack': 50, 'defense': 60, 'speed': 40, 'crit': 20, 'resistances': {'水': 25, '木': 10, '土': 10, '火': -15}},
        {'id': 'dna_wood_m01', 'name': '生命螺旋的頂點', 'type': '木', 'rarity': '神話', 'description': '所有生命基因演化的終極形態。', 'hp': 160, 'mp': 90, 'attack': 45, 'defense': 65, 'speed': 35, 'crit': 18, 'resistances': {'木': 25, '光': 10, '水': 10, '金': -15}},
        {'id': 'dna_gold_m01', 'name': '絕對秩序的法則', 'type': '金', 'rarity': '神話', 'description': '構成世界運轉的絕對物理法則本身。', 'hp': 130, 'mp': 70, 'attack': 60, 'defense': 75, 'speed': 30, 'crit': 15, 'resistances': {'金': 25, '土': 10, '風': 10, '火': -15}},
        {'id': 'dna_earth_m01', 'name': '承載世界之龜的甲殼', 'type': '土', 'rarity': '神話', 'description': '傳說中背負整個世界的巨龜的甲殼。', 'hp': 200, 'mp': 60, 'attack': 40, 'defense': 85, 'speed': 20, 'crit': 10, 'resistances': {'土': 30, '金': 12, '木': 12, '風': -20}},
        {'id': 'dna_light_m01', 'name': '上帝的第一次呼吸', 'type': '光', 'rarity': '神話', 'description': '「要有光」，於是便有了光。', 'hp': 130, 'mp': 110, 'attack': 65, 'defense': 50, 'speed': 60, 'crit': 28, 'resistances': {'光': 30, '火': 12, '風': 12, '暗': -25}},
        {'id': 'dna_dark_m01', 'name': '拉格納羅克的號角', 'type': '暗', 'rarity': '神話', 'description': '吹響諸神黃昏的末日號角。', 'hp': 125, 'mp': 95, 'attack': 75, 'defense': 40, 'speed': 65, 'crit': 30, 'resistances': {'暗': 30, '毒': 12, '火': 12, '光': -25}},
        {'id': 'dna_poison_m01', 'name': '尼德霍格的絕望', 'type': '毒', 'rarity': '神話', 'description': '啃食世界樹根的絕望黑龍尼德霍格的吐息。', 'hp': 110, 'mp': 85, 'attack': 80, 'defense': 42, 'speed': 58, 'crit': 26, 'resistances': {'毒': 30, '暗': 12, '木': 12, '金': -20}},
        {'id': 'dna_wind_m01', 'name': '時間之風', 'type': '風', 'rarity': '神話', 'description': '吹拂於時間長河之上，能加速或減緩一切的風。', 'hp': 115, 'mp': 105, 'attack': 55, 'defense': 48, 'speed': 80, 'crit': 24, 'resistances': {'風': 30, '光': 12, '暗': 12, '土': -20}},
        {'id': 'dna_mix_m01', 'name': '混沌原核', 'type': '混', 'rarity': '神話', 'description': '來自世界誕生之初的混沌能量核心。', 'hp': 110, 'mp': 70, 'attack': 35, 'defense': 35, 'speed': 35, 'crit': 12, 'resistances': {'毒': 10, '風': 10}},
        {'id': 'dna_none_m01', 'name': '薛丁格的貓', 'type': '無', 'rarity': '神話', 'description': '在觀測之前，處於所有可能性的疊加態。', 'hp': 140, 'mp': 90, 'attack': 60, 'defense': 60, 'speed': 60, 'crit': 22, 'resistances': {'混': 20}},
        {'id': 'dna_ancient_m01', 'name': '遠古龍魂', 'type': '無', 'rarity': '神話', 'description': '蘊含遠古巨龍靈魂的神秘DNA。', 'hp': 120, 'mp': 60, 'attack': 40, 'defense': 40, 'speed': 40, 'crit': 15, 'resistances': {'火': 8, '水': 8, '木': 8, '金': 8, '土': 8, '光': 5, '暗': 5}},
    ]
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
    skill_database_data = {
        '火': [
            {'name': '火焰拳', 'rarity': '普通', 'description': '凝聚火焰的拳頭進行攻擊。', 'power': 30, 'crit': 10, 'type': '火', 'mp_cost': 6, 'skill_category': '近戰'},
            {'name': '爆炎衝', 'rarity': '稀有', 'description': '身體化為爆炎衝撞對手。', 'power': 55, 'crit': 15, 'type': '火', 'mp_cost': 12, 'skill_category': '近戰'},
            {'name': '火星彈', 'rarity': '普通', 'description': '彈射出帶有火星的能量彈。', 'power': 25, 'crit': 5, 'type': '火', 'mp_cost': 5, 'skill_category': '遠程'},
            {'name': '追蹤火球', 'rarity': '稀有', 'description': '投擲會追蹤對手的火球。', 'power': 45, 'crit': 10, 'type': '火', 'mp_cost': 11, 'skill_category': '遠程'},
            {'name': '燃燒術', 'rarity': '普通', 'description': '用基礎的火焰法術灼燒對手。', 'power': 35, 'crit': 5, 'type': '火', 'mp_cost': 7, 'skill_category': '魔法'},
            {'name': '大字爆', 'rarity': '稀有', 'description': '釋放出大字形的巨大火焰。', 'power': 65, 'crit': 10, 'type': '火', 'mp_cost': 15, 'skill_category': '魔法'},
            {'name': '暖身', 'rarity': '普通', 'description': '小幅提升自身的攻擊力。', 'power': 0, 'crit': 0, 'type': '火', 'mp_cost': 8, 'skill_category': '輔助'},
            {'name': '烈日祝福', 'rarity': '稀有', 'description': '大幅提升自身的攻擊與爆擊率。', 'power': 0, 'crit': 0, 'type': '火', 'mp_cost': 14, 'skill_category': '輔助'},
            {'name': '熱砂踢', 'rarity': '普通', 'description': '踢起灼熱的沙土攻擊對手。', 'power': 28, 'crit': 10, 'type': '火', 'mp_cost': 5, 'skill_category': '物理'},
            {'name': '火山踢', 'rarity': '稀有', 'description': '如同火山爆發般的強力踢擊。', 'power': 50, 'crit': 15, 'type': '火', 'mp_cost': 11, 'skill_category': '物理'},
            {'name': '點燃', 'rarity': '普通', 'description': '使對手陷入「燒傷」狀態，持續受傷。', 'power': 10, 'crit': 0, 'type': '火', 'mp_cost': 7, 'skill_category': '特殊'},
            {'name': '煉獄之火', 'rarity': '稀有', 'description': '用不滅的煉獄之火折磨對手，造成強力燒傷。', 'power': 20, 'crit': 5, 'type': '火', 'mp_cost': 13, 'skill_category': '特殊'},
            {'name': '威嚇', 'rarity': '普通', 'description': '降低對手的攻擊力。', 'power': 0, 'crit': 0, 'type': '火', 'mp_cost': 6, 'skill_category': '變化'},
            {'name': '熔化', 'rarity': '稀有', 'description': '用高溫熔化對手的防具，大幅降低防禦力。', 'power': 0, 'crit': 0, 'type': '火', 'mp_cost': 12, 'skill_category': '變化'},
            {'name': '靜電火花', 'rarity': '普通', 'description': '帶有靜電的火花，可能讓對手麻痺。', 'power': 20, 'crit': 5, 'type': '火', 'mp_cost': 6, 'skill_category': '其他'},
            {'name': '自爆', 'rarity': '稀有', 'description': '犧牲自己，對敵人造成巨大傷害。', 'power': 80, 'crit': 0, 'type': '火', 'mp_cost': 20, 'skill_category': '其他'},
        ],
        '水': [
            {'name': '潮旋', 'rarity': '普通', 'description': '身體如漩渦般旋轉撞擊對手。', 'power': 28, 'crit': 5, 'type': '水', 'mp_cost': 6, 'skill_category': '近戰'},
            {'name': '深海衝擊', 'rarity': '稀有', 'description': '凝聚深海壓力進行衝撞。', 'power': 52, 'crit': 10, 'type': '水', 'mp_cost': 12, 'skill_category': '近戰'},
            {'name': '水濺躍', 'rarity': '普通', 'description': '濺起水花攻擊對手。', 'power': 22, 'crit': 5, 'type': '水', 'mp_cost': 5, 'skill_category': '遠程'},
            {'name': '高壓水炮', 'rarity': '稀有', 'description': '噴射出高壓水柱進行貫穿攻擊。', 'power': 50, 'crit': 10, 'type': '水', 'mp_cost': 11, 'skill_category': '遠程'},
            {'name': '水之波動', 'rarity': '普通', 'description': '釋放溫和的水之波動進行攻擊。', 'power': 32, 'crit': 5, 'type': '水', 'mp_cost': 7, 'skill_category': '魔法'},
            {'name': '寒冰光束', 'rarity': '稀有', 'description': '射出能使萬物凍結的寒冷光束。', 'power': 60, 'crit': 10, 'type': '水', 'mp_cost': 15, 'skill_category': '魔法'},
            {'name': '濕潤身體', 'rarity': '普通', 'description': '治癒自身的異常狀態。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 8, 'skill_category': '輔助'},
            {'name': '生命水滴', 'rarity': '稀有', 'description': '恢復自身大量生命值。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 16, 'skill_category': '輔助'},
            {'name': '拍擊', 'rarity': '普通', 'description': '用鰭或尾巴拍打對手。', 'power': 25, 'crit': 5, 'type': '水', 'mp_cost': 5, 'skill_category': '物理'},
            {'name': '攀瀑', 'rarity': '稀有', 'description': '如同登上瀑布般，奮力向上衝擊對手。', 'power': 48, 'crit': 10, 'type': '水', 'mp_cost': 11, 'skill_category': '物理'},
            {'name': '冰針', 'rarity': '普通', 'description': '射出冰針，有機會讓對手「冰凍」。', 'power': 15, 'crit': 0, 'type': '水', 'mp_cost': 7, 'skill_category': '特殊'},
            {'name': '鹽水', 'rarity': '稀有', 'description': '對手生命值低於一半時，威力加倍。', 'power': 30, 'crit': 0, 'type': '水', 'mp_cost': 13, 'skill_category': '特殊'},
            {'name': '變圓', 'rarity': '普通', 'description': '縮成一團，提升自身防禦力。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 6, 'skill_category': '變化'},
            {'name': '黑霧', 'rarity': '稀有', 'description': '釋放黑霧，清除場上所有的能力變化。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 12, 'skill_category': '變化'},
            {'name': '潛水', 'rarity': '普通', 'description': '潛入水中一回合，下一回合攻擊。', 'power': 20, 'crit': 0, 'type': '水', 'mp_cost': 6, 'skill_category': '其他'},
            {'name': '鏡面反射', 'rarity': '稀有', 'description': '將受到的特殊攻擊加倍奉還給對手。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 18, 'skill_category': '其他'},
        ],
        '木': [
            {'name': '藤鞭', 'rarity': '普通', 'description': '使用藤蔓像鞭子一樣抽打對手。', 'power': 28, 'crit': 5, 'type': '木', 'mp_cost': 6, 'skill_category': '近戰'},
            {'name': '寄生吸取', 'rarity': '稀有', 'description': '近身攻擊並吸取對手生命。', 'power': 50, 'crit': 10, 'type': '木', 'mp_cost': 12, 'skill_category': '近戰'},
            {'name': '種子機關槍', 'rarity': '普通', 'description': '連續射出2-5顆種子。', 'power': 10, 'crit': 0, 'type': '木', 'mp_cost': 8, 'skill_category': '遠程'},
            {'name': '日光束', 'rarity': '稀有', 'description': '蓄力一回合，下一回合發射強力光束。', 'power': 70, 'crit': 10, 'type': '木', 'mp_cost': 18, 'skill_category': '遠程'},
            {'name': '吸取', 'rarity': '普通', 'description': '吸取對手生命，回復自身。', 'power': 30, 'crit': 0, 'type': '木', 'mp_cost': 7, 'skill_category': '魔法'},
            {'name': '終極吸取', 'rarity': '稀有', 'description': '大量吸取對手生命，回復自身。', 'power': 55, 'crit': 5, 'type': '木', 'mp_cost': 14, 'skill_category': '魔法'},
            {'name': '生長', 'rarity': '普通', 'description': '小幅提升自身的攻擊與特攻。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 8, 'skill_category': '輔助'},
            {'name': '扎根', 'rarity': '稀有', 'description': '扎根於地面，每回合回復生命，但無法交換。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 15, 'skill_category': '輔助'},
            {'name': '滾動', 'rarity': '普通', 'description': '縮成一團滾動攻擊。', 'power': 25, 'crit': 5, 'type': '木', 'mp_cost': 5, 'skill_category': '物理'},
            {'name': '木槌', 'rarity': '稀有', 'description': '用堅硬的木槌重擊對手，自身會受少量傷害。', 'power': 60, 'crit': 10, 'type': '木', 'mp_cost': 13, 'skill_category': '物理'},
            {'name': '催眠粉', 'rarity': '普通', 'description': '灑出粉末，使對手陷入「睡眠」狀態。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 8, 'skill_category': '特殊'},
            {'name': '億萬噸吸收', 'rarity': '稀有', 'description': '強力吸取生命，回復量為造成傷害的一半。', 'power': 70, 'crit': 0, 'type': '木', 'mp_cost': 16, 'skill_category': '特殊'},
            {'name': '煩惱種子', 'rarity': '普通', 'description': '植入種子，使對手的特性變為「不眠」。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 7, 'skill_category': '變化'},
            {'name': '青草場地', 'rarity': '稀有', 'description': '5回合內，地面上的怪獸每回合回復HP，草屬性技能威力提升。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 14, 'skill_category': '變化'},
            {'name': '自然恩惠', 'rarity': '普通', 'description': '根據攜帶的果實，技能屬性與威力會變化。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 10, 'skill_category': '其他'},
            {'name': '森林詛咒', 'rarity': '稀有', 'description': '為對手增加「草」屬性。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 15, 'skill_category': '其他'},
        ],
        '土': [], '金': [], '光': [], '暗': [], '毒': [], '風': [], '無': [], '混': []
    }
    
    # Process the skills CSV data
    skills_csv_data = [
        {'name': '火焰拳', 'rarity': '普通', 'description': '凝聚火焰的拳頭進行攻擊。', 'power': 30, 'crit': 10, 'type': '火', 'mp_cost': 6, 'skill_category': '近戰'},
        {'name': '爆炎衝', 'rarity': '稀有', 'description': '身體化為爆炎衝撞對手。', 'power': 55, 'crit': 15, 'type': '火', 'mp_cost': 12, 'skill_category': '近戰'},
        {'name': '火星彈', 'rarity': '普通', 'description': '彈射出帶有火星的能量彈。', 'power': 25, 'crit': 5, 'type': '火', 'mp_cost': 5, 'skill_category': '遠程'},
        {'name': '追蹤火球', 'rarity': '稀有', 'description': '投擲會追蹤對手的火球。', 'power': 45, 'crit': 10, 'type': '火', 'mp_cost': 11, 'skill_category': '遠程'},
        {'name': '燃燒術', 'rarity': '普通', 'description': '用基礎的火焰法術灼燒對手。', 'power': 35, 'crit': 5, 'type': '火', 'mp_cost': 7, 'skill_category': '魔法'},
        {'name': '大字爆', 'rarity': '稀有', 'description': '釋放出大字形的巨大火焰。', 'power': 65, 'crit': 10, 'type': '火', 'mp_cost': 15, 'skill_category': '魔法'},
        {'name': '暖身', 'rarity': '普通', 'description': '小幅提升自身的攻擊力。', 'power': 0, 'crit': 0, 'type': '火', 'mp_cost': 8, 'skill_category': '輔助'},
        {'name': '烈日祝福', 'rarity': '稀有', 'description': '大幅提升自身的攻擊與爆擊率。', 'power': 0, 'crit': 0, 'type': '火', 'mp_cost': 14, 'skill_category': '輔助'},
        {'name': '熱砂踢', 'rarity': '普通', 'description': '踢起灼熱的沙土攻擊對手。', 'power': 28, 'crit': 10, 'type': '火', 'mp_cost': 5, 'skill_category': '物理'},
        {'name': '火山踢', 'rarity': '稀有', 'description': '如同火山爆發般的強力踢擊。', 'power': 50, 'crit': 15, 'type': '火', 'mp_cost': 11, 'skill_category': '物理'},
        {'name': '點燃', 'rarity': '普通', 'description': '使對手陷入「燒傷」狀態，持續受傷。', 'power': 10, 'crit': 0, 'type': '火', 'mp_cost': 7, 'skill_category': '特殊'},
        {'name': '煉獄之火', 'rarity': '稀有', 'description': '用不滅的煉獄之火折磨對手，造成強力燒傷。', 'power': 20, 'crit': 5, 'type': '火', 'mp_cost': 13, 'skill_category': '特殊'},
        {'name': '威嚇', 'rarity': '普通', 'description': '降低對手的攻擊力。', 'power': 0, 'crit': 0, 'type': '火', 'mp_cost': 6, 'skill_category': '變化'},
        {'name': '熔化', 'rarity': '稀有', 'description': '用高溫熔化對手的防具，大幅降低防禦力。', 'power': 0, 'crit': 0, 'type': '火', 'mp_cost': 12, 'skill_category': '變化'},
        {'name': '靜電火花', 'rarity': '普通', 'description': '帶有靜電的火花，可能讓對手麻痺。', 'power': 20, 'crit': 5, 'type': '火', 'mp_cost': 6, 'skill_category': '其他'},
        {'name': '自爆', 'rarity': '稀有', 'description': '犧牲自己，對敵人造成巨大傷害。', 'power': 80, 'crit': 0, 'type': '火', 'mp_cost': 20, 'skill_category': '其他'},
        {'name': '潮旋', 'rarity': '普通', 'description': '身體如漩渦般旋轉撞擊對手。', 'power': 28, 'crit': 5, 'type': '水', 'mp_cost': 6, 'skill_category': '近戰'},
        {'name': '深海衝擊', 'rarity': '稀有', 'description': '凝聚深海壓力進行衝撞。', 'power': 52, 'crit': 10, 'type': '水', 'mp_cost': 12, 'skill_category': '近戰'},
        {'name': '水濺躍', 'rarity': '普通', 'description': '濺起水花攻擊對手。', 'power': 22, 'crit': 5, 'type': '水', 'mp_cost': 5, 'skill_category': '遠程'},
        {'name': '高壓水炮', 'rarity': '稀有', 'description': '噴射出高壓水柱進行貫穿攻擊。', 'power': 50, 'crit': 10, 'type': '水', 'mp_cost': 11, 'skill_category': '遠程'},
        {'name': '水之波動', 'rarity': '普通', 'description': '釋放溫和的水之波動進行攻擊。', 'power': 32, 'crit': 5, 'type': '水', 'mp_cost': 7, 'skill_category': '魔法'},
        {'name': '寒冰光束', 'rarity': '稀有', 'description': '射出能使萬物凍結的寒冷光束。', 'power': 60, 'crit': 10, 'type': '水', 'mp_cost': 15, 'skill_category': '魔法'},
        {'name': '濕潤身體', 'rarity': '普通', 'description': '治癒自身的異常狀態。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 8, 'skill_category': '輔助'},
        {'name': '生命水滴', 'rarity': '稀有', 'description': '恢復自身大量生命值。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 16, 'skill_category': '輔助'},
        {'name': '拍擊', 'rarity': '普通', 'description': '用鰭或尾巴拍打對手。', 'power': 25, 'crit': 5, 'type': '水', 'mp_cost': 5, 'skill_category': '物理'},
        {'name': '攀瀑', 'rarity': '稀有', 'description': '如同登上瀑布般，奮力向上衝擊對手。', 'power': 48, 'crit': 10, 'type': '水', 'mp_cost': 11, 'skill_category': '物理'},
        {'name': '冰針', 'rarity': '普通', 'description': '射出冰針，有機會讓對手「冰凍」。', 'power': 15, 'crit': 0, 'type': '水', 'mp_cost': 7, 'skill_category': '特殊'},
        {'name': '鹽水', 'rarity': '稀有', 'description': '對手生命值低於一半時，威力加倍。', 'power': 30, 'crit': 0, 'type': '水', 'mp_cost': 13, 'skill_category': '特殊'},
        {'name': '變圓', 'rarity': '普通', 'description': '縮成一團，提升自身防禦力。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 6, 'skill_category': '變化'},
        {'name': '黑霧', 'rarity': '稀有', 'description': '釋放黑霧，清除場上所有的能力變化。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 12, 'skill_category': '變化'},
        {'name': '潛水', 'rarity': '普通', 'description': '潛入水中一回合，下一回合攻擊。', 'power': 20, 'crit': 0, 'type': '水', 'mp_cost': 6, 'skill_category': '其他'},
        {'name': '鏡面反射', 'rarity': '稀有', 'description': '將受到的特殊攻擊加倍奉還給對手。', 'power': 0, 'crit': 0, 'type': '水', 'mp_cost': 18, 'skill_category': '其他'},
        {'name': '藤鞭', 'rarity': '普通', 'description': '使用藤蔓像鞭子一樣抽打對手。', 'power': 28, 'crit': 5, 'type': '木', 'mp_cost': 6, 'skill_category': '近戰'},
        {'name': '寄生吸取', 'rarity': '稀有', 'description': '近身攻擊並吸取對手生命。', 'power': 50, 'crit': 10, 'type': '木', 'mp_cost': 12, 'skill_category': '近戰'},
        {'name': '種子機關槍', 'rarity': '普通', 'description': '連續射出2-5顆種子。', 'power': 10, 'crit': 0, 'type': '木', 'mp_cost': 8, 'skill_category': '遠程'},
        {'name': '日光束', 'rarity': '稀有', 'description': '蓄力一回合，下一回合發射強力光束。', 'power': 70, 'crit': 10, 'type': '木', 'mp_cost': 18, 'skill_category': '遠程'},
        {'name': '吸取', 'rarity': '普通', 'description': '吸取對手生命，回復自身。', 'power': 30, 'crit': 0, 'type': '木', 'mp_cost': 7, 'skill_category': '魔法'},
        {'name': '終極吸取', 'rarity': '稀有', 'description': '大量吸取對手生命，回復自身。', 'power': 55, 'crit': 5, 'type': '木', 'mp_cost': 14, 'skill_category': '魔法'},
        {'name': '生長', 'rarity': '普通', 'description': '小幅提升自身的攻擊與特攻。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 8, 'skill_category': '輔助'},
        {'name': '扎根', 'rarity': '稀有', 'description': '扎根於地面，每回合回復生命，但無法交換。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 15, 'skill_category': '輔助'},
        {'name': '滾動', 'rarity': '普通', 'description': '縮成一團滾動攻擊。', 'power': 25, 'crit': 5, 'type': '木', 'mp_cost': 5, 'skill_category': '物理'},
        {'name': '木槌', 'rarity': '稀有', 'description': '用堅硬的木槌重擊對手，自身會受少量傷害。', 'power': 60, 'crit': 10, 'type': '木', 'mp_cost': 13, 'skill_category': '物理'},
        {'name': '催眠粉', 'rarity': '普通', 'description': '灑出粉末，使對手陷入「睡眠」狀態。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 8, 'skill_category': '特殊'},
        {'name': '億萬噸吸收', 'rarity': '稀有', 'description': '強力吸取生命，回復量為造成傷害的一半。', 'power': 70, 'crit': 0, 'type': '木', 'mp_cost': 16, 'skill_category': '特殊'},
        {'name': '煩惱種子', 'rarity': '普通', 'description': '植入種子，使對手的特性變為「不眠」。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 7, 'skill_category': '變化'},
        {'name': '青草場地', 'rarity': '稀有', 'description': '5回合內，地面上的怪獸每回合回復HP，草屬性技能威力提升。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 14, 'skill_category': '變化'},
        {'name': '自然恩惠', 'rarity': '普通', 'description': '根據攜帶的果實，技能屬性與威力會變化。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 10, 'skill_category': '其他'},
        {'name': '森林詛咒', 'rarity': '稀有', 'description': '為對手增加「草」屬性。', 'power': 0, 'crit': 0, 'type': '木', 'mp_cost': 15, 'skill_category': '其他'},
        {'name': '金屬爪', 'rarity': '普通', 'description': '用金屬化的爪子進行攻擊。', 'power': 32, 'crit': 8, 'type': '金', 'mp_cost': 7, 'skill_category': '近戰'},
        {'name': '鐵頭功', 'rarity': '稀有', 'description': '用鋼鐵般堅硬的頭部撞擊對手。', 'power': 58, 'crit': 12, 'type': '金', 'mp_cost': 13, 'skill_category': '近戰'},
        {'name': '磁力炸彈', 'rarity': '普通', 'description': '投擲帶有磁力的炸彈。', 'power': 28, 'crit': 5, 'type': '金', 'mp_cost': 6, 'skill_category': '遠程'},
        {'name': '加農光炮', 'rarity': '稀有', 'description': '發射出高能量的金屬光炮。', 'power': 60, 'crit': 10, 'type': '金', 'mp_cost': 14, 'skill_category': '遠程'},
        {'name': '金屬音', 'rarity': '普通', 'description': '發出刺耳金屬音，大幅降低對手特防。', 'power': 0, 'crit': 0, 'type': '金', 'mp_cost': 8, 'skill_category': '魔法'},
        {'name': '流星拳', 'rarity': '稀有', 'description': '如流星般快速地連續出拳。', 'power': 20, 'crit': 5, 'type': '金', 'mp_cost': 10, 'skill_category': '魔法'},
        {'name': '鐵壁', 'rarity': '普通', 'description': '大幅提升自身的防禦力。', 'power': 0, 'crit': 0, 'type': '金', 'mp_cost': 9, 'skill_category': '輔助'},
        {'name': '換擋', 'rarity': '稀有', 'description': '提升攻擊力與速度。', 'power': 0, 'crit': 0, 'type': '金', 'mp_cost': 15, 'skill_category': '輔助'},
        {'name': '鋼翼', 'rarity': '普通', 'description': '用鋼鐵化的翅膀進行攻擊。', 'power': 30, 'crit': 5, 'type': '金', 'mp_cost': 6, 'skill_category': '物理'},
        {'name': '重磅衝撞', 'rarity': '稀有', 'description': '用沉重的身體猛烈衝撞，自身也會受傷。', 'power': 65, 'crit': 10, 'type': '金', 'mp_cost': 14, 'skill_category': '物理'},
        {'name': '陀螺球', 'rarity': '普通', 'description': '自身速度越慢，威力越大。', 'power': 25, 'crit': 0, 'type': '金', 'mp_cost': 8, 'skill_category': '特殊'},
        {'name': '金屬爆炸', 'rarity': '稀有', 'description': '自身陷入瀕死時，將受到的最後一次傷害加倍奉還。', 'power': 0, 'crit': 0, 'type': '金', 'mp_cost': 18, 'skill_category': '特殊'},
        {'name': '破甲', 'rarity': '普通', 'description': '降低自身的防禦，但大幅提升攻擊。', 'power': 0, 'crit': 0, 'type': '金', 'mp_cost': 7, 'skill_category': '變化'},
        {'name': '王者之盾', 'rarity': '稀有', 'description': '防禦對手攻擊，並降低接觸到自己的對手的攻擊力。', 'power': 0, 'crit': 0, 'type': '金', 'mp_cost': 16, 'skill_category': '變化'},
        {'name': '重力場', 'rarity': '普通', 'description': '5回合內，所有怪獸無法浮空或飛起。', 'power': 0, 'crit': 0, 'type': '金', 'mp_cost': 10, 'skill_category': '其他'},
        {'name': '鏡面鎧甲', 'rarity': '稀有', 'description': '將對手降低自身能力的招式效果反彈回去。', 'power': 0, 'crit': 0, 'type': '金', 'mp_cost': 17, 'skill_category': '其他'},
        {'name': '落石', 'rarity': '普通', 'description': '投擲小石塊攻擊對手。', 'power': 28, 'crit': 5, 'type': '土', 'mp_cost': 6, 'skill_category': '近戰'},
        {'name': '地震', 'rarity': '稀有', 'description': '引發強烈地震攻擊地面上所有怪獸。', 'power': 65, 'crit': 10, 'type': '土', 'mp_cost': 15, 'skill_category': '近戰'},
        {'name': '泥巴射擊', 'rarity': '普通', 'description': '投擲泥塊攻擊並降低對手速度。', 'power': 25, 'crit': 0, 'type': '土', 'mp_cost': 7, 'skill_category': '遠程'},
        {'name': '大地之力', 'rarity': '稀有', 'description': '從大地引出力量攻擊，有機會提升自身特防。', 'power': 55, 'crit': 5, 'type': '土', 'mp_cost': 13, 'skill_category': '遠程'},
        {'name': '大地波動', 'rarity': '普通', 'description': '釋放穩重的大地波動。', 'power': 30, 'crit': 5, 'type': '土', 'mp_cost': 8, 'skill_category': '魔法'},
        {'name': '沙塵暴', 'rarity': '稀有', 'description': '5回合內，所有非岩石、地面、鋼屬性的怪獸每回合受到傷害。', 'power': 0, 'crit': 0, 'type': '土', 'mp_cost': 12, 'skill_category': '魔法'},
        {'name': '變硬', 'rarity': '普通', 'description': '使身體變硬，提升防禦力。', 'power': 0, 'crit': 0, 'type': '土', 'mp_cost': 7, 'skill_category': '輔助'},
        {'name': '沙地獄', 'rarity': '稀有', 'description': '將對手困在沙地獄中，4-5回合內持續造成傷害。', 'power': 15, 'crit': 0, 'type': '土', 'mp_cost': 14, 'skill_category': '輔助'},
        {'name': '骨棒', 'rarity': '普通', 'description': '用骨棒敲擊對手。', 'power': 30, 'crit': 10, 'type': '土', 'mp_cost': 6, 'skill_category': '物理'},
        {'name': '骨頭迴力鏢', 'rarity': '稀有', 'description': '投擲會飛回來的骨頭迴力鏢，攻擊兩次。', 'power': 25, 'crit': 5, 'type': '土', 'mp_cost': 12, 'skill_category': '物理'},
        {'name': '撒菱', 'rarity': '普通', 'description': '在對手腳下撒下菱角，交換上場的怪獸會受到傷害。', 'power': 0, 'crit': 0, 'type': '土', 'mp_cost': 9, 'skill_category': '特殊'},
        {'name': '隱形岩', 'rarity': '稀有', 'description': '在對手場地設置隱形岩，交換上場的怪獸會受到屬性加成的傷害。', 'power': 0, 'crit': 0, 'type': '土', 'mp_cost': 16, 'skill_category': '特殊'},
        {'name': '玩泥巴', 'rarity': '普通', 'description': '5回合內，電屬性技能的威力減半。', 'power': 0, 'crit': 0, 'type': '土', 'mp_cost': 8, 'skill_category': '變化'},
        {'name': '詛咒', 'rarity': '稀有', 'description': '降低自身速度，提升攻擊和防禦。鬼魂屬性使用時效果不同。', 'power': 0, 'crit': 0, 'type': '土', 'mp_cost': 15, 'skill_category': '變化'},
        {'name': '挖洞', 'rarity': '普通', 'description': '第一回合鑽入地下，第二回合攻擊。', 'power': 35, 'crit': 0, 'type': '土', 'mp_cost': 10, 'skill_category': '其他'},
        {'name': '地裂', 'rarity': '稀有', 'description': '引發地裂，命中則直接擊倒對手。', 'power': 999, 'crit': 0, 'type': '土', 'mp_cost': 20, 'skill_category': '其他'},
        {'name': '閃光', 'rarity': '普通', 'description': '發出強光，降低對手命中率。', 'power': 0, 'crit': 0, 'type': '光', 'mp_cost': 7, 'skill_category': '近戰'},
        {'name': '神聖之劍', 'rarity': '稀有', 'description': '用神聖的劍攻擊，無視對手的防禦和閃避提升。', 'power': 60, 'crit': 15, 'type': '光', 'mp_cost': 14, 'skill_category': '近戰'},
        {'name': '信號光束', 'rarity': '普通', 'description': '發射奇特的信號光束，有機會使對手混亂。', 'power': 35, 'crit': 5, 'type': '光', 'mp_cost': 9, 'skill_category': '遠程'},
        {'name': '月亮之力', 'rarity': '稀有', 'description': '藉助月亮的力量攻擊，有機會降低對手特攻。', 'power': 62, 'crit': 10, 'type': '光', 'mp_cost': 15, 'skill_category': '遠程'},
        {'name': '魔法閃耀', 'rarity': '普通', 'description': '釋放強烈光芒攻擊所有對手。', 'power': 40, 'crit': 0, 'type': '光', 'mp_cost': 10, 'skill_category': '魔法'},
        {'name': '破壞光線', 'rarity': '稀有', 'description': '發射極具破壞力的光線，下一回合無法行動。', 'power': 80, 'crit': 5, 'type': '光', 'mp_cost': 20, 'skill_category': '魔法'},
        {'name': '治癒波動', 'rarity': '普通', 'description': '釋放治癒波動，恢復目標一半的HP。', 'power': 0, 'crit': 0, 'type': '光', 'mp_cost': 12, 'skill_category': '輔助'},
        {'name': '光牆', 'rarity': '稀有', 'description': '5回合內，我方受到的特殊攻擊傷害減半。', 'power': 0, 'crit': 0, 'type': '光', 'mp_cost': 16, 'skill_category': '輔助'},
        {'name': '光子噴湧', 'rarity': '稀有', 'description': '比較攻擊和特攻，用較高的一項造成傷害。', 'power': 65, 'crit': 10, 'type': '光', 'mp_cost': 18, 'skill_category': '物理'},
        {'name': '鏡面屬性', 'rarity': '普通', 'description': '將自身屬性變得和對手一樣。', 'power': 0, 'crit': 0, 'type': '光', 'mp_cost': 9, 'skill_category': '變化'},
        {'name': '力量戲法', 'rarity': '稀有', 'description': '交換自身的攻擊和防禦數值。', 'power': 0, 'crit': 0, 'type': '光', 'mp_cost': 12, 'skill_category': '變化'},
        {'name': '欺詐', 'rarity': '普通', 'description': '用對手的攻擊力來計算對自身的傷害。', 'power': 30, 'crit': 5, 'type': '暗', 'mp_cost': 8, 'skill_category': '近戰'},
        {'name': '地獄突刺', 'rarity': '稀有', 'description': '用尖銳的黑暗能量突刺，使對手2回合內無法使用聲音類招式。', 'power': 55, 'crit': 10, 'type': '暗', 'mp_cost': 14, 'skill_category': '近戰'},
        {'name': '暗影球', 'rarity': '普通', 'description': '投擲出黑色的影子能量球，有機會降低對手特防。', 'power': 40, 'crit': 5, 'type': '暗', 'mp_cost': 10, 'skill_category': '遠程'},
        {'name': '惡之波動', 'rarity': '稀有', 'description': '從身體釋放出充滿惡意的波動，有機會使對手畏縮。', 'power': 60, 'crit': 10, 'type': '暗', 'mp_cost': 15, 'skill_category': '遠程'},
        {'name': '詭計', 'rarity': '普通', 'description': '心懷詭計，大幅提升自身的特攻。', 'power': 0, 'crit': 0, 'type': '暗', 'mp_cost': 12, 'skill_category': '魔法'},
        {'name': '暗黑爆破', 'rarity': '稀有', 'description': '釋放強大的黑暗爆破，攻擊所有對手。', 'power': 70, 'crit': 5, 'type': '暗', 'mp_cost': 18, 'skill_category': '魔法'},
        {'name': '挑釁', 'rarity': '普通', 'description': '挑釁對手，使其在3回合內只能使用攻擊招式。', 'power': 0, 'crit': 0, 'type': '暗', 'mp_cost': 9, 'skill_category': '輔助'},
        {'name': '查封', 'rarity': '稀有', 'description': '查封對手的道具，使其在5回合內無法使用。', 'power': 0, 'crit': 0, 'type': '暗', 'mp_cost': 15, 'skill_category': '輔助'},
        {'name': '偷盜', 'rarity': '普通', 'description': '攻擊對手的同時，偷取其攜帶的道具。', 'power': 25, 'crit': 0, 'type': '暗', 'mp_cost': 7, 'skill_category': '物理'},
        {'name': '拍落', 'rarity': '稀有', 'description': '拍落對手的道具使其無法使用。若對手持有道具，威力加倍。', 'power': 35, 'crit': 5, 'type': '暗', 'mp_cost': 13, 'skill_category': '物理'},
        {'name': '臨別禮物', 'rarity': '普通', 'description': '自身陷入瀕死時，大幅降低對手的攻擊和特攻。', 'power': 0, 'crit': 0, 'type': '暗', 'mp_cost': 10, 'skill_category': '特殊'},
        {'name': '懲罰', 'rarity': '稀有', 'description': '對手能力提升的階段越高，威力越大。', 'power': 30, 'crit': 0, 'type': '暗', 'mp_cost': 12, 'skill_category': '特殊'},
        {'name': '再來一次', 'rarity': '普通', 'description': '強迫對手在3回合內重複使用最後使用的招式。', 'power': 0, 'crit': 0, 'type': '暗', 'mp_cost': 11, 'skill_category': '變化'},
        {'name': '無理取鬧', 'rarity': '稀有', 'description': '強迫對手和自身在3回合內無法交換。', 'power': 0, 'crit': 0, 'type': '暗', 'mp_cost': 14, 'skill_category': '變化'},
        {'name': '大快朵頤', 'rarity': '稀有', 'description': '吃掉攜帶的樹果，回復效果加倍。', 'power': 0, 'crit': 0, 'type': '暗', 'mp_cost': 16, 'skill_category': '其他'},
    ]
    for skill in skills_csv_data:
        element_type = skill.get("type")
        if element_type in skill_database_data:
            skill_database_data[element_type].append(skill)
        else:
            script_logger.warning(f"技能 '{skill.get('name')}' 的屬性 '{element_type}' 無效，已忽略。")

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
        "max_temp_backpack_slots": 9 # 臨時背包格數設定
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
        "skill_exp_base_multiplier": 120,
        "new_skill_chance": 0.08,
        "skill_exp_gain_range": (15, 75),
        "max_skill_level": 7,
        "new_skill_rarity_bias": { "普通": 0.6, "稀有": 0.3, "菁英": 0.1 }
    }
    try:
        db_client.collection('MD_GameConfigs').document('CultivationSettings').set(cultivation_settings_data)
        script_logger.info("成功寫入 CultivationSettings 資料。")
    except Exception as e:
        script_logger.error(f"寫入 CultivationSettings 資料失敗: {e}")

    # 14. 元素克制表 (ElementalAdvantageChart) - 新增
    elemental_advantage_chart_data = {
        # 攻擊方: {防禦方: 倍率}
        "火": {"木": 1.5, "水": 0.5, "金": 1.2, "土": 0.8, "風":1.0, "毒":1.0, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "水": {"火": 1.5, "土": 1.2, "木": 0.5, "金": 0.8, "風":1.0, "毒":1.0, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "木": {"水": 1.5, "土": 0.5, "金": 0.8, "火": 0.8, "風":1.0, "毒":1.2, "光":1.0, "暗":1.0, "無":1.0, "混":1.0}, # 木克水，被土克，被火微弱抵抗，對毒有優勢
        "金": {"木": 1.5, "風": 1.2, "火": 0.5, "土": 1.2, "水": 0.8, "毒":0.8, "光":1.0, "暗":1.0, "無":1.0, "混":1.0}, # 金克木，對風和土有優勢，被火克，對水和毒抵抗
        "土": {"火": 1.2, "金": 0.5, "水": 0.5, "木": 1.5, "風": 0.8, "毒":1.2, "光":1.0, "暗":1.0, "無":1.0, "混":1.0}, # 土對火優勢，被金水克，克木，對風毒有優勢
        "光": {"暗": 1.75, "毒": 0.7, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "木": 1.0, "金": 1.0, "土": 1.0, "風": 1.0},
        "暗": {"光": 1.75, "風": 0.7, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "木": 1.0, "金": 1.0, "土": 1.0, "毒": 1.0},
        "毒": {"木": 1.4, "草": 1.4, "土": 1.2, "光": 0.7, "金": 0.7, "風":0.8, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "暗": 1.0}, # 假設毒也克草(木)
        "風": {"土": 1.4, "草": 1.4, "暗": 0.7, "金": 0.7, "毒":0.8, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "木": 1.0, "光": 1.0}, # 風克土、草(木)
        "無": {el: 1.0 for el in ELEMENT_TYPES},
        "混": {el: 1.0 for el in ELEMENT_TYPES} # 混屬性可以有更複雜的規則，例如根據自身主要構成元素決定克制
    }
    # 確保每個元素對其他所有元素都有定義 (預設為1.0)
    for attacker_el_str in ELEMENT_TYPES:
        attacker_el = attacker_el_str # type: ignore
        if attacker_el not in elemental_advantage_chart_data:
            elemental_advantage_chart_data[attacker_el] = {}
        for defender_el_str in ELEMENT_TYPES:
            defender_el = defender_el_str # type: ignore
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
            "id": "npc_m_001", "nickname": "", # 暱稱將由服務層根據規則生成
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
            "custom_element_nickname": _element_nicknames.get("木", "木靈"), # 主屬性木
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
