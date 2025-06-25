# backend/config_editor_services.py

import os
import json
from typing import Dict, Any, List, Optional, Tuple, Union
from google.cloud.firestore_v1.client import Client

from .MD_firebase_config import db

# 這個字典映射了設定檔名稱和它在 Firestore 中的位置
# 格式: "檔名": ("集合名稱", "文件名稱")
# 如果文件名稱是 None, 表示檔名就是文件ID
CONFIG_FILE_FIRESTORE_MAP = {
    "battle_highlights.json": ("battle_highlights", "highlight_styles"),
    "status_effects.json": ("status_effects", None),
    # ... 其他需要從 Firestore 讀寫的設定檔
}

# 這個元組定義了直接從後端本地文件系統讀寫的設定檔
# 路徑是相對於 backend 資料夾的
LOCAL_CONFIG_FILES = (
    os.path.join("adventure", "adventure_settings.json"),
    os.path.join("adventure", "adventure_islands.json"),
    os.path.join("adventure", "adventure_growth_settings.json"),
    "game_mechanics.json",
    
    # --- 新增的檔案 ---
    # 範例：添加怪獸暱稱設定檔
    os.path.join("monster", "element_nicknames.json"),
    
    # 範例：添加幾個技能設定檔
    os.path.join("monster", "skills", "fire.json"),
    os.path.join("monster", "skills", "water.json"),
    os.path.join("monster", "skills", "wind.json"),
    os.path.join("monster", "skills", "earth.json"),
    
    # 您可以按照這個格式繼續添加其他需要的 monster/skills 或 monster/DNA 下的 .json 檔案
    # 例如: os.path.join("monster", "skills", "gold.json"),
)

def list_editable_configs() -> list[str]:
    """返回所有可編輯的設定檔名稱列表"""
    all_configs = list(CONFIG_FILE_FIRESTORE_MAP.keys()) + list(LOCAL_CONFIG_FILES)
    # 正規化路徑並移除重複項
    return sorted(list(set([os.path.normpath(p) for p in all_configs])))

def get_config_content(filename: str) -> tuple[Optional[Union[Dict, List]], Optional[str]]:
    """
    獲取指定設定檔的內容。
    先檢查本地文件，再檢查 Firestore。
    """
    if not filename:
        return None, "未提供檔案名稱。"
    
    # 將傳入的路徑（可能包含 / 或 \）正規化，以匹配 LOCAL_CONFIG_FILES 中的格式
    normalized_filename = os.path.normpath(filename)

    # 檢查是否為本地文件
    if normalized_filename in LOCAL_CONFIG_FILES:
        try:
            # 確保路徑是相對於 backend 資料夾
            full_path = os.path.join(os.path.dirname(__file__), '..', normalized_filename)
            with open(full_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
            return content, None
        except FileNotFoundError:
            return None, f"本地文件 '{normalized_filename}' 不存在。"
        except json.JSONDecodeError:
            return None, f"本地文件 '{normalized_filename}' 格式錯誤，無法解析。"
        except Exception as e:
            return None, f"讀取本地文件時發生未知錯誤: {e}"

    # 檢查是否為 Firestore 文件
    if normalized_filename not in CONFIG_FILE_FIRESTORE_MAP:
        return None, f"不支援的設定檔 '{normalized_filename}'。"

    collection_name, doc_name = CONFIG_FILE_FIRESTORE_MAP[normalized_filename]
    
    try:
        if doc_name:  # 文檔結構是: collection -> document -> field
            doc_ref = db.collection(collection_name).document(doc_name)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict(), None
            else:
                return None, f"Firestore 中找不到文件: {collection_name}/{doc_name}"
        else:  # 文檔結構是: collection -> (多個以檔名為ID的文件)
            doc_ref = db.collection(collection_name).document(os.path.splitext(normalized_filename)[0])
            doc = doc_ref.get()
            if doc.exists:
                 return doc.to_dict(), None
            
            # 如果是複數形式，嘗試獲取整個集合
            docs = db.collection(collection_name).stream()
            data = {d.id: d.to_dict() for d in docs}
            if data:
                return data, None
            else:
                return None, f"Firestore 集合 '{collection_name}' 中無數據。"

    except Exception as e:
        return None, f"讀取 Firestore 時發生錯誤: {e}"

def save_config_content(filename: str, content: Union[Dict, List]) -> tuple[bool, Optional[str]]:
    """
    保存指定設定檔的內容。
    """
    if not filename:
        return False, "未提供檔案名稱。"
    
    normalized_filename = os.path.normpath(filename)

    # 檢查是否為本地文件
    if normalized_filename in LOCAL_CONFIG_FILES:
        try:
            full_path = os.path.join(os.path.dirname(__file__), '..', normalized_filename)
            with open(full_path, 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False, indent=4)
            return True, f"成功儲存本地文件 '{normalized_filename}'。"
        except Exception as e:
            return False, f"寫入本地文件時發生錯誤: {e}"

    # 檢查是否為 Firestore 文件
    if normalized_filename not in CONFIG_FILE_FIRESTORE_MAP:
        return False, f"不支援的設定檔 '{normalized_filename}'。"

    collection_name, doc_name = CONFIG_FILE_FIRESTORE_MAP[normalized_filename]

    try:
        if doc_name:
            doc_ref = db.collection(collection_name).document(doc_name)
            doc_ref.set(content, merge=True)
        else:
            # 如果是更新整個集合，需要遍歷字典的鍵值對
            if isinstance(content, dict):
                batch = db.batch()
                for key, value in content.items():
                    doc_ref = db.collection(collection_name).document(key)
                    batch.set(doc_ref, value)
                batch.commit()
            else:
                 return False, "儲存到集合的資料格式必須是字典。"

        return True, f"成功更新 Firestore 設定: {collection_name}"
    except Exception as e:
        return False, f"更新 Firestore 時發生錯誤: {e}"

def save_adventure_settings(global_settings: Dict[str, Any], facilities_settings: List[Dict[str, Any]]) -> Tuple[bool, str]:
    """專門用於儲存冒險島嶼的全域和設施設定"""
    try:
        # 儲存全域設定
        adv_settings_path = os.path.join(os.path.dirname(__file__), '..', 'adventure', 'adventure_settings.json')
        with open(adv_settings_path, 'w', encoding='utf-8') as f:
            json.dump(global_settings, f, ensure_ascii=False, indent=4)

        # 讀取並更新島嶼設施設定
        islands_path = os.path.join(os.path.dirname(__file__), '..', 'adventure', 'adventure_islands.json')
        with open(islands_path, 'r', encoding='utf-8') as f:
            islands_data = json.load(f)

        # 建立一個設施ID到新費用的映射
        cost_map = {item['id']: item['cost'] for item in facilities_settings}
        
        # 遍歷島嶼資料並更新費用
        for island in islands_data:
            for facility in island.get('facilities', []):
                facility_id = facility.get('facilityId')
                if facility_id in cost_map:
                    facility['cost'] = cost_map[facility_id]

        # 寫回更新後的島嶼資料
        with open(islands_path, 'w', encoding='utf-8') as f:
            json.dump(islands_data, f, ensure_ascii=False, indent=4)
            
        return True, "成功儲存冒險島全域及設施設定。"

    except FileNotFoundError as e:
        return False, f"找不到設定檔：{e.filename}"
    except Exception as e:
        return False, f"儲存冒險島設定時發生錯誤：{e}"

def save_adventure_growth_settings(growth_settings: Dict[str, Any]) -> Tuple[bool, str]:
    """專門用於儲存冒險島的隨機成長設定"""
    try:
        growth_settings_path = os.path.join(os.path.dirname(__file__), '..', 'adventure', 'adventure_growth_settings.json')
        with open(growth_settings_path, 'w', encoding='utf-8') as f:
            json.dump(growth_settings, f, ensure_ascii=False, indent=4)
        return True, "成功儲存冒險島隨機成長設定。"
    except Exception as e:
        return False, f"儲存冒.py' 時發生錯誤：{e}"
