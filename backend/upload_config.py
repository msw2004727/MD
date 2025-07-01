# backend/upload_config.py
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

def upload_config_to_firestore(config_filename, document_id):
    """
    讀取本地的 JSON 設定檔，並將其上傳到 Firestore 的 MD_GameConfigs 集合中。

    Args:
        config_filename (str): 要上傳的設定檔名稱 (例如 'tournament_config.json')。
        document_id (str): 要在 Firestore 中創建的文件ID (例如 'TournamentConfig')。
    """
    print("--- 開始上傳設定檔到 Firestore ---")

    # 1. 初始化 Firebase Admin SDK
    try:
        # 確保路徑是相對於此腳本的位置
        service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
        
        if not os.path.exists(service_account_path):
            print(f"錯誤：找不到服務帳戶金鑰檔案 '{service_account_path}'。")
            return

        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK 初始化成功。")
        else:
            print("Firebase Admin SDK 已初始化。")

    except Exception as e:
        print(f"Firebase 初始化失敗: {e}")
        return

    # 2. 讀取本地 JSON 檔案
    try:
        json_path = os.path.join(os.path.dirname(__file__), 'game_configs_data', config_filename)
        with open(json_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        print(f"成功讀取本地設定檔: '{json_path}'")
    except Exception as e:
        print(f"讀取 JSON 檔案失敗: {e}")
        return

    # 3. 上傳到 Firestore
    try:
        db = firestore.client()
        doc_ref = db.collection('MD_GameConfigs').document(document_id)
        
        # 【關鍵修正】先刪除舊文件，再寫入新文件，確保完全覆蓋
        doc_ref.delete()
        print(f"  - 已刪除舊文件 (如果存在): {document_id}")
        
        doc_ref.set(config_data)
        print(f"成功將設定檔上傳到 Firestore！")
        print(f"  - 集合: MD_GameConfigs")
        print(f"  - 文件ID: {document_id}")
        print(f"  - 內容: {config_data}")
    except Exception as e:
        print(f"上傳到 Firestore 時發生錯誤: {e}")

def merge_and_upload_skills():
    """專門用來合併並上傳新技能到 Firestore 的函數。"""
    print("\n--- 開始合併並上傳技能設定 ---")
    db = firestore.client()
    
    # 1. 定義新的技能
    new_skills = {
        "毒": [
            {"name": "劇毒牙", "description": "充滿劇毒的利牙，撕咬對手。", "type": "毒", "rarity": "稀有", "skill_category": "近戰", "mp_cost": 8, "effects": [{"type": "damage", "power": 40, "target": "opponent_single"}, {"type": "apply_status", "status_id": "poison", "chance": 0.3, "duration": 3, "target": "opponent_single", "log_success": "{target}中毒了！"}]},
            {"name": "毒性衝擊", "description": "釋放帶有毒素的能量衝擊。", "type": "毒", "rarity": "稀有", "skill_category": "魔法", "mp_cost": 12, "effects": [{"type": "damage", "power": 60, "target": "opponent_single"}]}
        ],
        "風": [
            {"name": "風切", "description": "用銳利的風刃切割對手。", "type": "風", "rarity": "普通", "skill_category": "魔法", "mp_cost": 5, "effects": [{"type": "damage", "power": 35, "target": "opponent_single"}]},
            {"name": "烈風刃", "description": "更為強勁的風刃，帶有撕裂的效果。", "type": "風", "rarity": "稀有", "skill_category": "魔法", "mp_cost": 15, "effects": [{"type": "damage", "power": 70, "target": "opponent_single"}]}
        ]
    }
    print("已定義新的技能數據。")

    try:
        # 2. 讀取 Firestore 上現有的技能文件
        skills_ref = db.collection('MD_GameConfigs').document('Skills')
        skills_doc = skills_ref.get()
        
        if skills_doc.exists:
            existing_skills = skills_doc.to_dict().get("skill_database", {})
            print("成功讀取 Firestore 上的現有技能。")
        else:
            existing_skills = {}
            print("Firestore 上不存在技能文件，將創建新的。")

        # 3. 合併新舊技能
        for element, skill_list in new_skills.items():
            if element not in existing_skills:
                existing_skills[element] = []
            
            # 避免重複添加
            for new_skill in skill_list:
                if not any(s['name'] == new_skill['name'] for s in existing_skills[element]):
                    existing_skills[element].append(new_skill)
        
        print("新舊技能已合併。")

        # 4. 上傳合併後的完整技能數據
        skills_ref.set({"skill_database": existing_skills})
        print("成功將合併後的技能數據上傳到 Firestore！")

    except Exception as e:
        print(f"合併或上傳技能時發生錯誤: {e}")


if __name__ == '__main__':
    # 一個包含所有要上傳的設定檔的列表
    # 格式為: (本地JSON檔案名, 在Firestore中的文件ID)
    configs_to_upload = [
        ('tournament_config.json', 'TournamentConfig'),
        ('npc_monsters.json', 'NpcMonsters'),
        ('champion_guardians.json', 'ChampionGuardians')
    ]
    
    # 初始化 Firebase
    try:
        service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
        if not os.path.exists(service_account_path):
            raise FileNotFoundError(f"錯誤：找不到服務帳戶金鑰檔案 '{service_account_path}'。")
        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK 初始化成功。")
        else:
            print("Firebase Admin SDK 已初始化。")
    except Exception as e:
        print(f"Firebase 初始化失敗: {e}")
        exit()

    # 上傳普通設定檔
    for filename, doc_id in configs_to_upload:
        print(f"\n--- 正在處理: {filename} ---")
        upload_config_to_firestore(filename, doc_id)
        
    # 單獨處理技能合併上傳
    merge_and_upload_skills()


