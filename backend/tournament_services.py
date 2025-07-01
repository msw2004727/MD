# backend/tournament_services.py
import logging
from typing import Dict, Any, Optional

from . import MD_firebase_config

tournament_logger = logging.getLogger(__name__)

def find_ladder_opponent_service(player_id: str, player_pvp_points: int, match_type: str = 'equal') -> Dict[str, Any]:
    """
    為玩家尋找一個天梯對手。

    Args:
        player_id: 發起挑戰的玩家ID。
        player_pvp_points: 發起挑戰的玩家的PVP積分。
        match_type: 匹配類型 ('weak', 'equal', 'strong')。

    Returns:
        一個包含操作結果和對手資料的字典。
    """
    db = MD_firebase_config.db
    if not db:
        return {"success": False, "error": "資料庫服務異常。"}

    try:
        users_ref = db.collection("users")
        all_players_docs = users_ref.stream()

        potential_opponents = []
        for doc in all_players_docs:
            if doc.id == player_id:
                continue

            game_data_ref = doc.reference.collection("gameData").document("main")
            game_data_doc = game_data_ref.get()

            if game_data_doc.exists:
                player_data = game_data_doc.to_dict()
                player_stats = player_data.get("playerStats", {})
                opponent_pvp_points = player_stats.get("pvp_points", 1000)
                
                # 根據匹配類型篩選
                if match_type == 'strong' and opponent_pvp_points <= player_pvp_points:
                    continue
                if match_type == 'weak' and opponent_pvp_points >= player_pvp_points:
                    continue
                
                if player_data.get("selectedMonsterId"):
                    potential_opponents.append({
                        "id": doc.id,
                        "nickname": player_stats.get("nickname", "未知玩家"),
                        "pvp_points": opponent_pvp_points,
                        "selectedMonsterId": player_data.get("selectedMonsterId")
                    })

        if not potential_opponents:
            return {"success": False, "error": f"找不到任何符合條件的對手 (類型: {match_type})。"}

        # 根據不同類型，選擇最佳對手
        best_opponent = None
        if match_type == 'equal':
            # 找積分差最小的
            min_diff = float('inf')
            for opponent in potential_opponents:
                diff = abs(player_pvp_points - opponent["pvp_points"])
                if diff < min_diff:
                    min_diff = diff
                    best_opponent = opponent
        else:
            # 挑戰強者/弱者時，隨機選一個即可
            best_opponent = random.choice(potential_opponents)

        if not best_opponent:
            return {"success": False, "error": "在計算後未能找到最佳對手。"}
        
        tournament_logger.info(f"為玩家 {player_id} (積分: {player_pvp_points}, 類型: {match_type}) 匹配到對手 {best_opponent['id']} (積分: {best_opponent['pvp_points']})")
        
        return {"success": True, "opponent": best_opponent}

    except Exception as e:
        tournament_logger.error(f"尋找天梯對手時發生錯誤: {e}", exc_info=True)
        return {"success": False, "error": "尋找對手時發生未知錯誤。"}

def calculate_pvp_points_update(winner_points: int, loser_points: int) -> (int, int):
    """
    根據雙方積分計算勝負後的積分變動 (簡易版K-factor Elo)。
    
    Args:
        winner_points: 勝者當前積分。
        loser_points: 敗者當前積分。

    Returns:
        一個元組 (勝者獲得的積分, 敗者失去的積分)。
    """
    K = 32  # K因子，決定積分變動的幅度

    # 計算預期���率
    expected_win_winner = 1 / (1 + 10 ** ((loser_points - winner_points) / 400))
    expected_win_loser = 1 / (1 + 10 ** ((winner_points - loser_points) / 400))

    # 計算積分變動
    winner_gain = round(K * (1 - expected_win_winner))
    loser_loss = round(K * (0 - expected_win_loser)) # 結果會是負數

    # 確保最少有1分的變動
    winner_gain = max(1, winner_gain)
    loser_loss = min(-1, loser_loss)

    return winner_gain, abs(loser_loss) # 返回敗者失去的正數值
