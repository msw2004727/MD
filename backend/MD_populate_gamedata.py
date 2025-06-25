import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
import sys

# 將專案根目錄添加到 Python 路徑中，確保可以正確引用 backend 模組
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 【修改】從直接引用 db 物件，而不是不存在的函式
from backend.MD_firebase_config import db

def upload_game_configs():
    """
    【修改】讀取所有技能和DNA的JSON檔案，將它們合併並上傳到Firestore的
    'MD_GameConfigs' 集合中，符合主程式的讀取邏輯。
    """
    if not db:
        print("嚴重錯誤: Firestore 資料庫客戶端未初始化，無法上傳資料。")
        return

    # --- 上傳技能資料 ---
    try:
        # 定義技能檔案所在的資料夾路徑
        skills_path = os.path.normpath(os.path.join(os.path.dirname(__file__), 'monster/skills'))
        all_skills_data = {}
        print("\n開始處理技能檔案...")

        # 遍歷技能資料夾下的所有 json 檔案
        for filename in os.listdir(skills_path):
            if filename.endswith('.json'):
                # 檔名 (不含.json) 作為元素的鍵，例如 'fire', 'water'
                element_name = filename.replace('.json', '')
                with open(os.path.join(skills_path, filename), 'r', encoding='utf-8') as f:
                    # 將讀取的列表內容存入字典
                    all_skills_data[element_name] = json.load(f)
                print(f"  -> 已讀取技能檔案: {filename}")
        
        # 將整合好的技能字典寫入 Firestore 的特定文件
        db.collection('MD_GameConfigs').document('Skills').set({"skill_database": all_skills_data})
        print(">>> 成功將所有技能資料合併並上傳至 MD_GameConfigs/Skills 文件。")

    except Exception as e:
        print(f"\n上傳技能資料時發生錯誤: {e}")

    # --- 上傳DNA資料 ---
    try:
        # 定義DNA檔案所在的資料夾路徑
        dna_path = os.path.normpath(os.path.join(os.path.dirname(__file__), 'monster/DNA'))
        all_dna_data = []
        print("\n開始處理DNA檔案...")

        # 遍歷DNA資料夾下的所有 json 檔案
        for filename in os.listdir(dna_path):
            if filename.endswith('.json'):
                with open(os.path.join(dna_path, filename), 'r', encoding='utf-8') as f:
                    # 將每個檔案的列表內容合併到一個大列表中
                    all_dna_data.extend(json.load(f))
                print(f"  -> 已讀取DNA檔案: {filename}")
        
        # 將整合好的DNA列表寫入 Firestore 的特定文件
        db.collection('MD_GameConfigs').document('DNAFragments').set({"all_fragments": all_dna_data})
        print(">>> 成功將所有DNA資料合併並上傳至 MD_GameConfigs/DNAFragments 文件。")

    except Exception as e:
        print(f"上傳DNA資料時發生錯誤: {e}")


if __name__ == '__main__':
    print("資料庫客戶端已連接，開始上傳遊戲設定資料...")
    upload_game_configs()
    print("\n所有資料上傳任務執行完畢。")
