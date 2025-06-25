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
    # --- 核心修改處 START ---
    # 將基礎目錄從 'backend/data' 改為 'backend/'，以符合您目前的檔案結構
    data_dir = os.path.dirname(__file__)
    # --- 核心修改處 END ---

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
        ("cultivation_stories", os.path.join("system", "cultivation_stories.json")),
        # adventure 資料夾
        ("adventure_settings", os.path.join("adventure", "adventure_settings.json")),
        ("adventure_islands", os.path.join("adventure", "adventure_islands.json")),
        ("adventure_growth_settings", os.path.join("adventure", "adventure_growth_settings.json")),
        ("game_mechanics", "game_mechanics.json"), # 新增讀取遊戲機制檔案
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
            # 如果是 game_mechanics.json 找不到，則提供一份預設結構
            if key == 'game_mechanics':
                configs[key] = {
                    "battle_formulas": {"crit_multiplier": 1.5, "damage_formula_base_multiplier": 0.5, "damage_formula_attack_scaling": 0.1},
                    "cultivation_rules": {"diminishing_returns_base": 0.75, "diminishing_returns_time_window_seconds": 3600, "base_bond_gain_on_completion": 3, "exp_gain_duration_divisor": 60, "stat_growth_points_per_chance": [1, 2], "elemental_bias_multiplier": 1.2},
                    "absorption_rules": {"score_ratio_min_cap": 0.5, "score_ratio_max_cap": 2.0, "stat_gain_variance": [0.8, 1.2], "max_gain_multiplier_for_non_hpmp": 2.0, "max_hpmp_stat_growth_on_absorb": 1.05, "bonus_hpmp_stat_growth_on_absorb": 0.5}
                }
            else:
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
                element_en_name = filename.split('.')[0]
                element_map = {
                    "fire": "火", "water": "水", "wood": "木", "gold": "金", "earth": "土",
                    "light": "光", "dark": "暗", "poison": "毒", "wind": "風", "none": "無", "mix": "混"
                }
                # 我們只處理有對應中文的檔案
                if element_en_name in element_map:
                    element_zh_name = element_map[element_en_name]
                    try:
                        with open(os.path.join(skills_dir, filename), 'r', encoding='utf-8') as f:
                            configs['skills'][element_zh_name] = json.load(f)
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
    
    return configs
