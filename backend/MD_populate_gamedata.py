# backend/MD_populate_gamedata.py

import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
import sys

# 將專案根目錄添加到 Python 的路徑中，這樣才能正確引用 backend 模組
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 【已修正】從直接引用已初始化的 db 物件，而不是不存在的函式
from backend.MD_firebase_config import db

def upload_game_configs():
    """
    【功能完整】讀取所有技能和DNA的JSON檔案，將它們合併，
    並上傳到 Firestore 的 'MD_GameConfigs' 集合中，符合遊戲主程式的讀取邏輯。
    """
    # 檢查資料庫連線是否存在
    if not db:
        print("【嚴重錯誤】Firestore 資料庫客戶端未初始化，無法上傳資料。腳本已停止。")
        return

    # --- 步驟 1: 上傳技能資料 ---
    try:
        # 定義技能檔案所在的資料夾路徑
        skills_path = os.path.normpath(os.path.join(os.path.dirname(__file__), 'monster/skills'))
        # 準備一個空字典來存放所有技能資料
        all_skills_data = {}
        print("\n===== 開始處理技能檔案 =====")

        # 遍歷技能資料夾下的所有 json 檔案
        for filename in sorted(os.listdir(skills_path)): # 使用 sorted 確保順序一致
            if filename.endswith('.json'):
                # 檔名 (不含.json) 作為元素的鍵，例如 'fire', 'water'
                element_name = filename.replace('.json', '')
                file_full_path = os.path.join(skills_path, filename)
                with open(file_full_path, 'r', encoding='utf-8') as f:
                    # 將讀取的列表內容存入字典
                    all_skills_data[element_name] = json.load(f)
                print(f"  [讀取成功] -> {filename}")
        
        if not all_skills_data:
             print("  [警告] -> 在 skills 資料夾中未找到任何 .json 檔案。")
        else:
            # 將整合好的技能字典寫入 Firestore 的特定文件
            target_collection = 'MD_GameConfigs'
            target_document = 'Skills'
            db.collection(target_collection).document(target_document).set({"skill_database": all_skills_data})
            print(f">>> 【上傳成功】所有技能資料已合併並上傳至 {target_collection}/{target_document}")

    except Exception as e:
        print(f"\n【上傳技能資料時發生錯誤】: {e}")

    # --- 步驟 2: 上傳DNA資料 ---
    try:
        # 定義DNA檔案所在的資料夾路徑
        dna_path = os.path.normpath(os.path.join(os.path.dirname(__file__), 'monster/DNA'))
        # 準備一個空列表來存放所有DNA資料
        all_dna_data = []
        print("\n===== 開始處理DNA檔案 =====")

        # 遍歷DNA資料夾下的所有 json 檔案
        for filename in sorted(os.listdir(dna_path)): # 使用 sorted 確保順序一致
            if filename.endswith('.json'):
                file_full_path = os.path.join(dna_path, filename)
                with open(file_full_path, 'r', encoding='utf-8') as f:
                    # 將每個檔案的列表內容合併到一個大列表中
                    all_dna_data.extend(json.load(f))
                print(f"  [讀取成功] -> {filename}")
        
        if not all_dna_data:
            print("  [警告] -> 在 DNA 資料夾中未找到任何 .json 檔案。")
        else:
            # 將整合好的DNA列表寫入 Firestore 的特定文件
            target_collection = 'MD_GameConfigs'
            target_document = 'DNAFragments'
            db.collection(target_collection).document(target_document).set({"all_fragments": all_dna_data})
            print(f">>> 【上傳成功】所有DNA資料已合併並上傳至 {target_collection}/{target_document}")

    except Exception as e:
        print(f"【上傳DNA資料時發生錯誤】: {e}")


if __name__ == '__main__':
    print("腳本啟動：準備初始化資料庫並匯入資料...")
    upload_game_configs()
    print("\n===== 所有任務執行完畢 =====")
