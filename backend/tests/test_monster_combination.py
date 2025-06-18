# backend/tests/test_monster_combination.py
import pytest
from backend.monster_combination_services import combine_dna_service
from backend.MD_models import GameConfigs, PlayerGameData, DNAFragment

# 模擬一個基礎的遊戲設定，用於測試
# 在真實的測試中，這可以從一個固定的測試設定檔中載入
mock_game_configs: GameConfigs = {
    "dna_fragments": [
        {"id": "dna_fire_c01", "name": "初階火種", "type": "火", "rarity": "普通", "hp": 45, "mp": 22, "attack": 18, "defense": 6, "speed": 9, "crit": 4, "description": ""},
        {"id": "dna_water_c01", "name": "純淨水滴", "type": "水", "rarity": "普通", "hp": 55, "mp": 28, "attack": 12, "defense": 12, "speed": 12, "crit": 3, "description": ""},
        {"id": "dna_wood_r01", "name": "硬化樹皮", "type": "木", "rarity": "稀有", "hp": 75, "mp": 32, "attack": 15, "defense": 22, "speed": 10, "crit": 4, "description": ""}
    ],
    "rarities": {
        "COMMON": {"name": "普通", "statMultiplier": 1.0, "skillLevelBonus": 0, "resistanceBonus": 1},
        "RARE": {"name": "稀有", "statMultiplier": 1.15, "skillLevelBonus": 0, "resistanceBonus": 3}
    },
    "skills": {
        "火": [{"name": "火焰拳", "power": 30, "crit": 10, "type": "火", "mp_cost": 6, "skill_category": "近戰", "baseLevel": 1}],
        "水": [{"name": "水濺躍", "power": 22, "crit": 5, "type": "水", "mp_cost": 5, "skill_category": "遠程", "baseLevel": 1}],
        "木": [{"name": "藤鞭", "power": 28, "crit": 5, "type": "木", "mp_cost": 6, "skill_category": "近戰", "baseLevel": 1}],
        "無": [{"name": "撞擊", "power": 35, "crit": 5, "type": "無", "mp_cost": 5, "skill_category": "物理", "baseLevel": 1}]
    },
    "personalities": [{"name": "標準", "description": "標準個性", "colorDark": "#888", "colorLight": "#AAA", "skill_preferences": {}}],
    "titles": [{"id": "title_001", "name": "新手", "buffs": {}}],
    "monster_achievements_list": ["新秀"],
    "element_nicknames": {"火": {"普通": ["炎魂獸"]}, "水": {"普通": ["水靈"]}},
    "naming_constraints": {"max_player_title_len": 5, "max_monster_achievement_len": 5, "max_element_nickname_len": 5, "max_monster_full_nickname_len": 20},
    "value_settings": {"max_monster_skills": 3},
    "cultivation_config": {"skill_exp_base_multiplier": 100, "max_skill_level": 10},
    # 其他設定暫時省略
}

# 模擬一個基礎的玩家資料
mock_player_data: PlayerGameData = {
    "playerStats": {
        "titles": [{"id": "title_001", "name": "新手", "buffs": {}}],
        "equipped_title_id": "title_001"
    }
}

def test_combine_two_dna_fragments():
    """
    測試：組合兩個不同的普通 DNA 碎片
    預期：產生一隻怪獸，其數值為兩者總和，屬性為兩者混合，稀有度為普通。
    """
    dna_to_combine = [
        {"id": "dna_fire_c01", "baseId": "dna_fire_c01"},
        {"id": "dna_water_c01", "baseId": "dna_water_c01"}
    ]
    
    result = combine_dna_service(dna_to_combine, mock_game_configs, mock_player_data, "test_player_01")
    
    # 斷言 (Assert)：檢查結果是否符合預期
    assert result is not None, "組合結果不應為 None"
    assert "monster" in result, "組合結果應包含 'monster'鍵"
    
    monster = result["monster"]
    assert monster["rarity"] == "普通", "稀有度應為普通"
    assert set(monster["elements"]) == {"火", "水"}, "屬性應包含火和水"
    
    # 檢查數值是否為兩者總和 (考慮到稀有度乘數)
    expected_hp = 45 + 55 # 100
    expected_attack = 18 + 12 # 30
    assert monster["initial_max_hp"] == expected_hp, f"HP 應為 {expected_hp}"
    assert monster["attack"] == expected_attack, f"攻擊力應為 {expected_attack}"
    assert len(monster["skills"]) > 0, "怪獸應至少有一個技能"

def test_combine_with_rare_dna():
    """
    測試：組合包含稀有 DNA 的碎片
    預期：產生的怪獸稀有度應為稀有，且數值有稀有度加成。
    """
    dna_to_combine = [
        {"id": "dna_fire_c01", "baseId": "dna_fire_c01"},
        {"id": "dna_wood_r01", "baseId": "dna_wood_r01"} # 這是稀有DNA
    ]
    
    result = combine_dna_service(dna_to_combine, mock_game_configs, mock_player_data, "test_player_01")
    
    assert result is not None and "monster" in result
    monster = result["monster"]
    
    assert monster["rarity"] == "稀有", "稀有度應為稀有"
    
    # 基礎數值總和
    base_hp = 45 + 75 # 120
    base_attack = 18 + 15 # 33
    
    # 稀有度乘數
    rare_multiplier = mock_game_configs["rarities"]["RARE"]["statMultiplier"] # 1.15
    
    # 預期數值
    expected_hp = int(base_hp * rare_multiplier)
    expected_attack = int(base_attack * rare_multiplier)
    
    assert monster["initial_max_hp"] == expected_hp, f"稀有怪獸的 HP 應有加成"
    assert monster["attack"] == expected_attack, f"稀有怪獸的攻擊力應有加成"

def test_combine_insufficient_dna():
    """
    測試：只用一個 DNA 碎片進行組合
    預期：組合失敗，返回包含錯誤訊息的結果。
    """
    dna_to_combine = [
        {"id": "dna_fire_c01", "baseId": "dna_fire_c01"}
    ]
    
    result = combine_dna_service(dna_to_combine, mock_game_configs, mock_player_data, "test_player_01")
    
    assert result is not None
    assert result.get("success") is False, "組合應標記為不成功"
    assert "error" in result, "結果應包含錯誤訊息"