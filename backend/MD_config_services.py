# backend/MD_config_services.py
# 負責載入所有遊戲設定檔

import json
import os
import csv
from typing import Dict, Any, List

def load_all_game_configs_from_firestore() -> Dict[str, Any]:
    """
    從多個 JSON 和 CSV 檔案載入所有遊戲設定。
    """
    configs: Dict[str, Any] = {}
    data_dir = os.path.join(os.path.dirname(__file__), 'data')

    # --- 核心修改處 START ---
    # 定義要載入的設定檔和對應的鍵名，路徑已更新為新的資料夾結構
    config_files_to_load = [
        # monster 資料夾
        ("dna_fragments", os.path.join("monster", "dna_fragments.json")),
        ("element_nicknames", os.path.join("monster", "element_nicknames.json")),
        # battle 資料夾
        ("status_effects", os.path.join("battle", "status_effects.json")),
        ("battle_highlights", os.path.join("battle", "battle_highlights.json")),
        # system 資料夾
        ("titles", os.path.join("system", "titles.json")),
        ("champion_guardians", os.path.join("system", "champion_guardians.json")),
        ("newbie_guide", os.path.join("system", "newbie_guide.json")),
        # adventure 資料夾
        ("adventure_settings", os.path.join("adventure", "adventure_settings.json")),
        ("adventure_islands", os.path.join("adventure", "adventure_islands.json")),
        ("adventure_growth_settings", os.path.join("adventure", "adventure_growth_settings.json")),
        # adventure/bosses 子資料夾
        ("bosses_novice_forest", os.path.join("adventure", "bosses", "bosses_novice_forest.json")),
        ("bosses_abandoned_mine", os.path.join("adventure", "bosses", "bosses_abandoned_mine.json")),
        ("bosses_tidal_cave", os.path.join("adventure", "bosses", "bosses_tidal_cave.json")),
        ("bosses_ancient_ruins", os.path.join("adventure", "bosses", "bosses_ancient_ruins.json"))
    ]
    
    # 載入 JSON 檔案
    for key, filename in config_files_to_load:
        try:
            with open(os.path.join(data_dir, filename), 'r', encoding='utf-8') as f:
                configs[key] = json.load(f)
        except FileNotFoundError:
            print(f"警告: 找不到設定檔 {filename}")
            configs[key] = [] if 'islands' in key or 'fragments' in key else {}
        except json.JSONDecodeError:
            print(f"警告: 解析設定檔 {filename} 失敗")
            configs[key] = [] if 'islands' in key or 'fragments' in key else {}

    # 載入所有事件檔案 (從 adventure/events/ 子資料夾)
    events_dir = os.path.join(data_dir, "adventure", "events")
    if os.path.exists(events_dir):
        configs["adventure_events"] = {}
        for filename in os.listdir(events_dir):
            if filename.startswith('adventure_events_') and filename.endswith('.json'):
                try:
                    with open(os.path.join(events_dir, filename), 'r', encoding='utf-8') as f:
                        # 使用檔名作為 key
                        configs["adventure_events"][filename] = json.load(f)
                except Exception as e:
                    print(f"警告: 載入事件檔案 {filename} 失敗: {e}")
    else:
        print(f"警告: 找不到事件資料夾 {events_dir}")
        configs["adventure_events"] = {}


    # 載入技能檔案 (從 monster/skills/ 子資料夾)
    skills_dir = os.path.join(data_dir, 'monster', 'skills')
    if os.path.exists(skills_dir):
        configs['skills'] = {}
        for filename in os.listdir(skills_dir):
            if filename.endswith('.json'):
                element = filename.split('.')[0]
                try:
                    with open(os.path.join(skills_dir, filename), 'r', encoding='utf-8') as f:
                        configs['skills'][element] = json.load(f)
                except Exception as e:
                    print(f"警告: 載入技能檔案 {filename} 失敗: {e}")
    else:
        print(f"警告: 找不到技能資料夾 {skills_dir}")
        configs['skills'] = {}


    # 載入 CSV 檔案 (從 monster/ 資料夾)
    try:
        csv_path = os.path.join(data_dir, 'monster', 'personalities.csv')
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            configs['personalities'] = [row for row in reader]
    except FileNotFoundError:
        print(f"警告: 找不到 personalities.csv 於路徑 {csv_path}")
        configs['personalities'] = []
    
    # --- 核心修改處 END ---

    return configs