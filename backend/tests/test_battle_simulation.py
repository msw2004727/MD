# backend/tests/test_battle_simulation.py
import pytest
from backend.battle_services import simulate_battle
from backend.MD_models import Monster, GameConfigs

# 模擬一個用於戰鬥測試的遊戲設定
mock_battle_configs: GameConfigs = {
    "elemental_advantage_chart": {
        "火": {"木": 1.5, "水": 0.5}, # 火剋木 (1.5倍傷害), 被水剋 (0.5倍傷害)
        "水": {"火": 1.5, "木": 0.5},
        "木": {"水": 1.5, "火": 0.5},
        "光": {"暗": 1.5},
        "暗": {"光": 1.5},
    },
    "value_settings": {
        "max_battle_turns": 30, # 最大回合數
    }
    # 其他設定暫時省略
}

# 模擬一隻攻擊方的火屬性怪獸
mock_attacker_monster: Monster = {
    "id": "player_monster_01",
    "nickname": "噴火龍",
    "hp": 100,
    "initial_max_hp": 100,
    "mp": 50,
    "initial_max_mp": 50,
    "attack": 50,
    "defense": 30,
    "speed": 40,
    "crit": 10,
    "rarity": "稀有",
    "elements": ["火"],
    "skills": [
        {
            "name": "火焰拳",
            "power": 40, # 技能基礎威力
            "mp_cost": 10,
            "type": "火",
            "skill_category": "物理",
            "level": 1,
            "current_exp": 0,
            "exp_to_next_level": 100
        }
    ],
    "owner_nickname": "玩家"
}

# 模擬一隻防禦方的木屬性怪獸 (會被火剋)
mock_defender_wood: Monster = {
    "id": "opponent_monster_01",
    "nickname": "妙蛙草",
    "hp": 120,
    "initial_max_hp": 120,
    "mp": 50,
    "initial_max_mp": 50,
    "attack": 40,
    "defense": 40, # 防禦力
    "speed": 30,
    "crit": 5,
    "rarity": "稀有",
    "elements": ["木"],
    "skills": [{"name": "藤鞭", "power": 35, "mp_cost": 10, "type": "木", "level": 1, "skill_category": "物理"}],
    "owner_nickname": "對手"
}

# 模擬一隻防禦方的水屬性怪獸 (會剋火)
mock_defender_water: Monster = {
    "id": "opponent_monster_02",
    "nickname": "傑尼龜",
    "hp": 110,
    "initial_max_hp": 110,
    "mp": 50,
    "initial_max_mp": 50,
    "attack": 40,
    "defense": 45, # 防禦力
    "speed": 35,
    "crit": 5,
    "rarity": "稀有",
    "elements": ["水"],
    "skills": [{"name": "水槍", "power": 35, "mp_cost": 10, "type": "水", "level": 1, "skill_category": "魔法"}],
    "owner_nickname": "對手"
}


def test_battle_fire_vs_wood_advantage():
    """
    測試：火屬性攻擊木屬性 (屬性優勢)
    預期：攻擊方獲勝，因為屬性克制造成了更高的傷害。
    """
    # 執行戰鬥模擬
    result = simulate_battle(mock_attacker_monster, mock_defender_wood, mock_battle_configs)
    
    # 斷言 (Assert)：檢查結果是否符合預期
    assert result is not None, "戰鬥結果不應為 None"
    assert "winner_id" in result, "戰鬥結果應包含 'winner_id'"
    
    # 由於速度較快且有屬性優勢，攻擊方應該獲勝
    assert result["winner_id"] == mock_attacker_monster["id"], "贏家應為攻擊方 (噴火龍)"
    
    # 檢查戰鬥日誌中是否體現了屬性克制
    log_found = any("效果絕佳" in log for log in result.get("raw_full_log", []))
    assert log_found, "戰鬥日誌中應包含 '效果絕佳' 的訊息"

def test_battle_fire_vs_water_disadvantage():
    """
    測試：火屬性攻擊水屬性 (屬性劣勢)
    預期：防禦方獲勝，因為屬性抗性抵銷了大量傷害。
    """
    # 執行戰鬥模擬
    result = simulate_battle(mock_attacker_monster, mock_defender_water, mock_battle_configs)
    
    # 斷言 (Assert)：檢查結果是否符合預期
    assert result is not None, "戰鬥結果不應為 None"
    assert "winner_id" in result, "戰鬥結果應包含 'winner_id'"
    
    # 由於屬性被克制，即使攻擊力較高，攻擊方也可能落敗
    assert result["winner_id"] == mock_defender_water["id"], "贏家應為防禦方 (傑尼龜)"

    # 檢查戰鬥日誌中是否體現了屬性被抵抗
    log_found = any("效果不太好" in log for log in result.get("raw_full_log", []))
    assert log_found, "戰鬥日誌中應包含 '效果不太好' 的訊息"

def test_battle_speed_determines_first_move():
    """
    測試：速度較快的一方先攻
    預期：戰鬥日誌的第一個行動應由速度較快的怪獸發起。
    """
    # 噴火龍速度 (40) > 妙蛙草速度 (30)
    result = simulate_battle(mock_attacker_monster, mock_defender_wood, mock_battle_configs)
    
    raw_log = result.get("raw_full_log", [])
    
    # 在日誌中尋找第一個攻擊行動
    first_action_log = None
    for log in raw_log:
        if "使用了" in log:
            first_action_log = log
            break
            
    assert first_action_log is not None, "日誌中應包含攻擊行動"
    # 斷言第一個攻擊的是速度較快的噴火龍
    assert mock_attacker_monster["nickname"] in first_action_log, "速度較快的一方 (噴火龍) 應該先攻"
