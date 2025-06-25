import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
import sys

# 將專案根目錄添加到 Python 路徑中
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 【修改】從直接引用 db 物件，而不是不存在的函式
from backend.MD_firebase_config import db

def populate_data(collection_name, data_list):
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
        # 確保 item_data 是字典並且有 'id' 鍵
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
        full_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', file_path))
        
        with open(full_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"\n正在處理檔案: {file_path} -> 上傳至 Collection: '{collection_name}'")
        populate_data(collection_name, data)

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

    # 定義技能檔案的路徑 (Collection 名稱改為與 Firestore 一致)
    skill_files = {
        'Skills': 'backend/monster/skills/all_skills_combined.json', # 假設有一個合併的檔案
    }

    # 定義 DNA 檔案的路徑
    dna_files = {
        'DNAFragments': 'backend/monster/DNA/all_dna_fragments_combined.json', # 假設有一個合併的檔案
    }
    
    # 這裡的邏輯需要調整，因為 Firestore 的結構是將所有技能/DNA存在單一文件內
    # 以下為一個更符合您目前 Firestore 設計的上傳邏輯範例
    
    # 上傳合併後的技能資料
    try:
        skills_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'backend/monster/skills'))
        all_skills_data = {}
        for filename in os.listdir(skills_path):
            if filename.endswith('.json'):
                element_name = filename.replace('.json', '')
                with open(os.path.join(skills_path, filename), 'r', encoding='utf-8') as f:
                    all_skills_data[element_name] = json.load(f)
        
        db.collection('MD_GameConfigs').document('Skills').set({"skill_database": all_skills_data})
        print("\n成功將所有技能資料合併並上傳至 MD_GameConfigs/Skills 文件。")
    except Exception as e:
        print(f"\n上傳技能資料時發生錯誤: {e}")

    # 上傳合併後的DNA資料
    try:
        dna_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'backend/monster/DNA'))
        all_dna_data = []
        for filename in os.listdir(dna_path):
            if filename.endswith('.json'):
                with open(os.path.join(dna_path, filename), 'r', encoding='utf-8') as f:
                    all_dna_data.extend(json.load(f))
        
        db.collection('MD_GameConfigs').document('DNAFragments').set({"all_fragments": all_dna_data})
        print("成功將所有DNA資料合併並上傳至 MD_GameConfigs/DNAFragments 文件。")
    except Exception as e:
        print(f"上傳DNA資料時發生錯誤: {e}")
        
    print("\n所有資料上傳任務執行完畢。")
