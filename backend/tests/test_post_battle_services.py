# backend/tests/test_post_battle_services.py
import pytest
from backend.post_battle_services import process_battle_results
from backend.MD_models import PlayerGameData, Monster, BattleResult, GameConfigs
import copy

# 模擬一個基礎的遊戲設定
mock_game_configs: GameConfigs = {
    "titles": [
        {"id": "title_001", "name": "新手", "buffs": {}},
        {"id": "title_031", "name": "初試啼聲", "condition": {"type": "wins", "value": 5}, "buffs": {}}
    ],
    "absorption_config": {
        "base_stat_gain_factor": 0, # 測試時關閉數值吸收，專注於履歷
        "dna_extraction_chance_base": 0.0 # 測試時關閉DNA吸收
    }
    # 其他設定暫時省略
}

# 模擬玩家和對手的初始資料
@pytest.fixture
def mock_player_data() -> PlayerGameData:
    return {
        "playerStats": {"wins": 0, "losses": 0, "titles": [{"id": "title_001", "name": "新手"}]},
        "farmedMonsters": [
            {
                "id": "player_monster_01",
                "nickname": "玩家怪獸",
                "resume": {"wins": 10, "losses": 5},
                "farmStatus": {"isBattling": True}
            }
        ]
    }

@pytest.fixture
def mock_opponent_data() -> PlayerGameData:
    return {
        "playerStats": {"wins": 2, "losses": 2, "titles": [{"id": "title_001", "name": "新手"}]},
        "farmedMonsters": [
            {
                "id": "opponent_monster_01",
                "nickname": "對手怪獸",
                "resume": {"wins": 3, "losses": 3},
                "farmStatus": {"isBattling": True}
            }
        ]
    }


def test_process_player_win_result(mock_player_data, mock_opponent_data):
    """
    測試：處理玩家勝利的戰鬥結果
    預期：玩家總勝場+1，怪獸勝場+1，雙方的 isBattling 狀態被重設。
    """
    player_monster = mock_player_data["farmedMonsters"][0]
    opponent_monster = mock_opponent_data["farmedMonsters"][0]

    battle_result: BattleResult = {
        "winner_id": player_monster["id"],
        "loser_id": opponent_monster["id"],
        "player_monster_final_hp": 50,
        "player_monster_final_mp": 20,
        "player_monster_final_skills": [],
        "player_activity_log": {"time": "some_time", "message": "You won"},
        "opponent_activity_log": {"time": "some_time", "message": "You lost"}
    }

    # 執行戰後處理服務
    updated_player_data, _ = process_battle_results(
        player_id="player1",
        opponent_id="player2",
        player_data=copy.deepcopy(mock_player_data),
        opponent_player_data=copy.deepcopy(mock_opponent_data),
        player_monster_data=player_monster,
        opponent_monster_data=opponent_monster,
        battle_result=battle_result,
        game_configs=mock_game_configs
    )

    # 斷言 (Assert)：檢查結果是否符合預期
    # 1. 玩家總戰績
    assert updated_player_data["playerStats"]["wins"] == 1, "玩家總勝場應為 1"
    # 2. 怪獸個別戰績
    updated_monster = updated_player_data["farmedMonsters"][0]
    assert updated_monster["resume"]["wins"] == 11, "怪獸勝場應為 11"
    assert updated_monster["resume"]["losses"] == 5, "怪獸敗場應維持 5"
    # 3. 戰鬥狀態
    assert updated_monster["farmStatus"]["isBattling"] is False, "怪獸戰鬥狀態應被重設為 False"

def test_process_player_loss_result(mock_player_data, mock_opponent_data):
    """
    測試：處理玩家戰敗的戰鬥結果
    預期：玩家總敗場+1，怪獸敗場+1。
    """
    player_monster = mock_player_data["farmedMonsters"][0]
    opponent_monster = mock_opponent_data["farmedMonsters"][0]

    battle_result: BattleResult = {
        "winner_id": opponent_monster["id"],
        "loser_id": player_monster["id"],
        "player_monster_final_hp": 0,
        "player_monster_final_mp": 10,
        "player_monster_final_skills": [],
        "player_activity_log": {"time": "some_time", "message": "You lost"},
        "opponent_activity_log": {"time": "some_time", "message": "You won"}
    }

    updated_player_data, _ = process_battle_results(
        player_id="player1",
        opponent_id="player2",
        player_data=copy.deepcopy(mock_player_data),
        opponent_player_data=copy.deepcopy(mock_opponent_data),
        player_monster_data=player_monster,
        opponent_monster_data=opponent_monster,
        battle_result=battle_result,
        game_configs=mock_game_configs
    )

    # 斷言 (Assert)
    assert updated_player_data["playerStats"]["losses"] == 1, "玩家總敗場應為 1"
    updated_monster = updated_player_data["farmedMonsters"][0]
    assert updated_monster["resume"]["wins"] == 10, "怪獸勝場應維持 10"
    assert updated_monster["resume"]["losses"] == 6, "怪獸敗場應為 6"

def test_title_award_after_battle(mock_player_data, mock_opponent_data):
    """
    測試：戰鬥勝利後達成稱號條件
    預期：玩家獲得新稱號。
    """
    # 將玩家勝場設為 4，下一場勝利剛好達成 "初試啼聲" (5勝) 的條件
    player_data_pre_win = copy.deepcopy(mock_player_data)
    player_data_pre_win["playerStats"]["wins"] = 4
    
    player_monster = player_data_pre_win["farmedMonsters"][0]
    opponent_monster = mock_opponent_data["farmedMonsters"][0]

    battle_result: BattleResult = {
        "winner_id": player_monster["id"],
        "loser_id": opponent_monster["id"],
        "player_monster_final_hp": 50,
        "player_monster_final_mp": 20,
        "player_monster_final_skills": [],
        "player_activity_log": {"time": "some_time", "message": "You won"},
        "opponent_activity_log": {"time": "some_time", "message": "You lost"}
    }
    
    _, newly_awarded_titles = process_battle_results(
        player_id="player1",
        opponent_id="player2",
        player_data=player_data_pre_win,
        opponent_player_data=mock_opponent_data,
        player_monster_data=player_monster,
        opponent_monster_data=opponent_monster,
        battle_result=battle_result,
        game_configs=mock_game_configs
    )

    # 斷言 (Assert)
    assert newly_awarded_titles is not None, "新稱號列表不應為 None"
    assert len(newly_awarded_titles) > 0, "應至少獲得一個新稱號"
    assert newly_awarded_titles[0]["name"] == "初試啼聲", "應獲得 '初試啼聲' 稱號"
