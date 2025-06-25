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

    # 定義要載入的設定檔和對應的鍵名
    config_files_to_load = [
        ("dna_fragments", "dna_fragments.json"),
        ("status_effects", "status_effects.json"),
        ("cultivation_stories", "cultivation_stories.json"),
        ("element_nicknames", "element_nicknames.json"),
        ("battle_highlights", "battle_highlights.json"),
        ("champion_guardians", "champion_guardians.json"),
        ("adventure_settings", "adventure_settings.json"),
        ("adventure_islands", "adventure_islands.json"),
        # --- 核心修改處 START ---
        ("adventure_growth_settings", "adventure_growth_settings.json"),
        # --- 核心修改處 END ---
        ("bosses_novice_forest", "bosses_novice_forest.json"),
        ("bosses_abandoned_mine", "bosses_abandoned_mine.json"),
        ("bosses_tidal_cave", "bosses_tidal_cave.json"),
        ("bosses_ancient_ruins", "bosses_ancient_ruins.json")
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

    # 載入所有事件檔案
    event_files = [f for f in os.listdir(data_dir) if f.startswith('adventure_events_') and f.endswith('.json')]
    configs["adventure_events"] = {}
    for filename in event_files:
        try:
            with open(os.path.join(data_dir, filename), 'r', encoding='utf-8') as f:
                configs["adventure_events"][filename] = json.load(f)
        except Exception as e:
            print(f"警告: 載入事件檔案 {filename} 失敗: {e}")

    # 載入技能檔案
    skills_dir = os.path.join(data_dir, 'skills')
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

    # 載入 CSV 檔案
    try:
        with open(os.path.join(data_dir, 'personalities.csv'), 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            configs['personalities'] = [row for row in reader]
    except FileNotFoundError:
        print("警告: 找不到 personalities.csv")
        configs['personalities'] = []

    return configs
