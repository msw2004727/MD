import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
import sys

# 將專案根目錄添加到 Python 路徑中
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 【修改】從直接引用 db 物件，而不是不存在的函式
from backend.MD_firebase_config import db

def populate_data_from_list(collection_name, data_list):
    """
    【修改】從一個字典列表讀取資料並上傳到 Firestore。
    - 每個字典會成為一個 Document。
    - 使用字典中的 'id' 欄位作為 Document ID。
    """
    if not isinstance(data_list, list):
        print(f"  -> 錯誤: 資料格式不正確，預期為列表，但收到了 {type(data_list)}。")
        return

    batch = db.batch()
    count = 0
    for item_data in data_list:
        if isinstance(item_data, dict) and 'id' in item_data:
            # 確保 ID 是字串格式
            doc_id = str(item_data['id'])
            doc_ref = db.collection(collection_name).document(doc_id)
            batch.set(doc_ref, item_data)
            count += 1
        else:
            print(f"  -> 警告: 跳過一筆格式不符的資料（缺少 'id' 或不是字典）: {item_data}")
    
    if count > 0:
        batch.commit()
        print(f'  -> 成功上傳 {count} 筆文件到 Collection: {collection_name}')
    else:
        print(f"  -> 在列表中沒有找到可上傳的有效資料。")


def load_and_populate(file_path, collection_name):
    """從 JSON 檔案載入資料並上傳到 Firestore Collection。"""
    try:
        # 修正路徑，確保是從專案根目錄開始找
        full_path = os.path.join(os.path.dirname(__file__), '..', file_path)
        with open(full_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"\n正在處理檔案: {file_path} -> 上傳至 Collection: '{collection_name}'")
        populate_data_from_list(collection_name, data)

    except FileNotFoundError:
        print(f"錯誤: 找不到檔案 {full_path}")
    except json.JSONDecodeError:
        print(f"錯誤: 檔案 {file_path} 不是有效的 JSON 格式。")
    except Exception as e:
        print(f"處理檔案 {file_path} 時發生未知錯誤: {e}")

if __name__ == '__main__':
    # 檢查 db 是否成功初始化
    if not db:
        print("嚴重錯誤: Firestore 資料庫客戶端未初始化，無法上傳資料。")
        sys.exit(1)
        
    print("資料庫客戶端已連接，開始上傳遊戲設定資料...")

    # 定義技能檔案的路徑
    skill_files = {
        'Skills_dark': 'backend/monster/skills/dark.json',
        'Skills_earth': 'backend/monster/skills/earth.json',
        'Skills_fire': 'backend/monster/skills/fire.json',
        'Skills_gold': 'backend/monster/skills/gold.json',
        'Skills_light': 'backend/monster/skills/light.json',
        'Skills_mix': 'backend/monster/skills/mix.json',
        'Skills_none': 'backend/monster/skills/none.json',
        'Skills_poison': 'backend/monster/skills/poison.json',
        'Skills_water': 'backend/monster/skills/water.json',
        'Skills_wind': 'backend/monster/skills/wind.json',
        'Skills_wood': 'backend/monster/skills/wood.json'
    }

    # 定義 DNA 檔案的路徑
    dna_files = {
        'DNA_dark': 'backend/monster/DNA/DNA_dark.json',
        'DNA_earth': 'backend/monster/DNA/DNA_earth.json',
        'DNA_fire': 'backend/monster/DNA/DNA_fire.json',
        'DNA_gold': 'backend/monster/DNA/DNA_gold.json',
        'DNA_light': 'backend/monster/DNA/DNA_light.json',
        'DNA_mix': 'backend/monster/DNA/DNA_mix.json',
        'DNA_none': 'backend/monster/DNA/DNA_none.json',
        'DNA_poison': 'backend/monster/DNA/DNA_poison.json',
        'DNA_water': 'backend/monster/DNA/DNA_water.json',
        'DNA_wind': 'backend/monster/DNA/DNA_wind.json',
        'DNA_wood': 'backend/monster/DNA/DNA_wood.json'
    }
    
    # 【修改】上傳技能資料
    for collection, path in skill_files.items():
        load_and_populate(path, collection)

    # 【修改】上傳 DNA 資料
    for collection, path in dna_files.items():
        load_and_populate(path, collection)
        
    print("\n所有資料上傳任務執行完畢。")
