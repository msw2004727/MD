import random
from datetime import datetime, timezone
from flask import jsonify

# 假設這些服務模組已被移動到 services/ 目錄下
from services.player_services import get_player_data, save_player_data, add_monster_to_player, update_player_inventory
from services.utils_services import get_game_configs, load_game_data

def process_post_battle(player_id, battle_result):
    """
    處理戰鬥後的邏輯，包括獎勵、怪物捕獲等。
    """
    player_data = get_player_data(player_id)
    if not player_data:
        return jsonify({"error": "Player not found"}), 404

    monsters = player_data.get("monsters", [])
    inventory = player_data.get("inventory", {})
    
    win = battle_result.get("win", False)
    enemy = battle_result.get("enemy", {})
    
    if not win:
        # 處理戰敗邏輯（如果有的話）
        return jsonify({"message": "Battle lost, no rewards."})

    # 處理戰勝邏輯
    rewards = {
        "exp_gained": 0,
        "items_dropped": [],
        "monster_captured": None
    }
    
    # 1. 計算經驗值
    exp_gained = enemy.get("exp_reward", 10)
    rewards["exp_gained"] = exp_gained
    
    # 將經驗值分配給參戰的怪物 (此處為簡化邏輯)
    for monster in monsters:
        if monster.get("current_hp", 0) > 0: # 假設存活的怪物才獲得經驗
            monster["exp"] = monster.get("exp", 0) + exp_gained

    # 2. 計算物品掉落
    game_configs = get_game_configs()
    drop_rate = game_configs.get("global_drop_rate", 0.1)
    
    if "drops" in enemy and random.random() < drop_rate:
        dropped_item = random.choice(enemy["drops"])
        item_id = dropped_item.get("item_id")
        quantity = dropped_item.get("quantity", 1)
        
        if item_id:
            update_player_inventory(inventory, item_id, quantity)
            rewards["items_dropped"].append({"item_id": item_id, "quantity": quantity})

    # 3. 怪物捕獲邏輯 (假設有)
    capture_chance = enemy.get("capture_rate", 0.05)
    if random.random() < capture_chance:
        # 創建一個新的怪物實例並添加到玩家數據中
        new_monster = add_monster_to_player(player_data, enemy.get("id"))
        if new_monster:
            rewards["monster_captured"] = new_monster

    # 儲存更新後的玩家數據
    player_data["monsters"] = monsters
    player_data["inventory"] = inventory
    save_player_data(player_id, player_data)
    
    return jsonify({
        "message": "Battle won! Rewards have been processed.",
        "rewards": rewards
    })
