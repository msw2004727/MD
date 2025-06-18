# backend/tests/test_monster_cultivation.py

import pytest
from backend.monster_cultivation_services import complete_cultivation_service
from backend.MD_models import GameConfigs, PlayerGameData, Monster

# 模擬一個用於修煉測試的遊戲設定
mock_cultivation_configs: GameConfigs = {
    "skills": {
        "無": [{"name": "撞擊", "power": 35, "crit": 5, "type": "無", "mp_cost": 5, "skill_category": "物理", "baseLevel": 1, "level": 1, "current_exp": 0, "exp_to_next_level": 100}]
    },
    "cultivation_config": {
        "skill_exp_base_multiplier": 100,
        "new_skill_chance": 0.0, # 測試時先關閉領悟新技能的機率，專注於經驗成長
        "skill_exp_gain_range": (10, 20), # 固定一個較小的隨機範圍，方便測試
        "max_skill_level": 10,
        "stat_growth_duration_divisor": 60, # 每60秒就有一次數值成長機會
        "stat_growth_weights": {"attack": 1, "defense": 1}, # 只成長攻擊或防禦，方便驗證
        "dna_find_chance": 0.0, # 關閉掉落
    },
    "value_settings": {
        "max_cultivation_time_seconds": 3600
    },
    # 其他設定暫時省略
}

# 模擬一隻準備要去修煉的怪獸
mock_monster_before: Monster = {
    "id": "cultivation_test_monster_01",
    "nickname": "修煉者一號",
    "hp": 100, "initial_max_hp": 100,
    "mp": 50, "initial_max_mp": 50,
    "attack": 20, "defense": 20, "speed": 10, "crit": 5,
    "rarity": "普通",
    "elements": ["無"],
    "skills": [
        {
            "name": "撞擊",
            "power": 35,
            "level": 1,
            "current_exp": 0,
            "exp_to_next_level": 100,
            "type": "無",
            "mp_cost": 5,
            "skill_category": "物理",
            "baseLevel": 1
        }
    ],
    "farmStatus": {"isTraining": True},
    "cultivation_gains": {}
}

# 模擬一個包含此怪獸的玩家資料
mock_player_data: PlayerGameData = {
    "farmedMonsters": [mock_monster_before],
    "playerStats": {},
}


def test_cultivation_short_duration_exp_gain():
    """
    測試：短時間修煉 (120秒)
    預期：技能經驗值應有少量增長，但不足以升級。
    """
    duration = 120  # 2分鐘
    
    # 執行修煉服務
    # 注意：這裡我們傳入 monster_id 和 player_id，但服務內部會使用我們提供的 mock_player_data
    result = complete_cultivation_service(
        player_id="test_player",
        monster_id="cultivation_test_monster_01",
        duration_seconds=duration,
        game_configs=mock_cultivation_configs,
        player_data=mock_player_data
    )

    assert result is not None and result.get("success") is True, "修煉應該要成功"
    
    updated_monster = result["updated_monster"]
    updated_skill = updated_monster["skills"][0]
    
    # 根據公式 exp_gained = (10~20) + (120/60) = 12~22
    # 檢查經驗值是否在這個範圍內增長
    assert 12 <= updated_skill["current_exp"] <= 22, "短時間修煉後的經驗值增長不符合預期"
    assert updated_skill["level"] == 1, "短時間修煉後技能不應該升級"

def test_cultivation_long_duration_level_up():
    """
    測試：長時間修煉 (600秒)
    預期：技能經驗值應大幅增長，並成功升級。
    """
    duration = 600  # 10分鐘
    
    # 為了測試，我們先複製一份乾淨的資料，避免被上一個測試影響
    player_data_copy = {
        "farmedMonsters": [{**mock_monster_before, "skills": [{**mock_monster_before["skills"][0]}]}],
        "playerStats": {}
    }

    result = complete_cultivation_service(
        player_id="test_player",
        monster_id="cultivation_test_monster_01",
        duration_seconds=duration,
        game_configs=mock_cultivation_configs,
        player_data=player_data_copy
    )

    assert result is not None and result.get("success") is True
    
    updated_monster = result["updated_monster"]
    updated_skill = updated_monster["skills"][0]

    # 根據公式 exp_gained = (10~20) + (600/60) = 20~30。
    # 這不足以升級，讓我們把修煉時間調得更長一點，例如 6000 秒
    duration = 6000
    player_data_copy_2 = {
        "farmedMonsters": [{**mock_monster_before, "skills": [{**mock_monster_before["skills"][0]}]}],
        "playerStats": {}
    }
    result_long = complete_cultivation_service("test_player", "cultivation_test_monster_01", duration, mock_cultivation_configs, player_data_copy_2)
    updated_monster_long = result_long["updated_monster"]
    updated_skill_long = updated_monster_long["skills"][0]

    # exp_gained = (10~20) + (6000/60) = 110~120
    # 這足以讓 1 級 (需 100 EXP) 的技能升級
    assert updated_skill_long["level"] > 1, "長時間修煉後技能應該要升級"
    assert updated_skill_long["current_exp"] >= 0, "升級後剩餘經驗值應大於等於0"

def test_cultivation_stat_growth():
    """
    測試：數值成長 (潛力點)
    預期：修煉後，cultivation_gains 中應有數值增長。
    """
    # 根據設定，每 60 秒有一次成長機會，修煉 180 秒應有 3 次機會
    duration = 180
    
    player_data_copy = {
        "farmedMonsters": [{**mock_monster_before, "cultivation_gains": {}}], # 確保從空的gains開始
        "playerStats": {}
    }
    
    result = complete_cultivation_service(
        player_id="test_player",
        monster_id="cultivation_test_monster_01",
        duration_seconds=duration,
        game_configs=mock_cultivation_configs,
        player_data=player_data_copy
    )
    
    assert result is not None and result.get("success") is True
    
    updated_monster = result["updated_monster"]
    gains = updated_monster.get("cultivation_gains", {})
    
    assert gains is not None and isinstance(gains, dict), "修煉後應有 cultivation_gains 物件"
    # 總共成長了 3 次，每次 1~2 點，所以總點數應在 3 到 6 之間
    total_gained_points = sum(gains.values())
    assert 3 <= total_gained_points <= 6, "數值成長的總點數不符合預期"
    # 檢查成長的屬性是否只在我們設定的 attack 或 defense 範圍內
    assert all(stat in ["attack", "defense"] for stat in gains.keys()), "成長的屬性不應超出設定的範圍"
