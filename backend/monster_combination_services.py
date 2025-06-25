# backend/monster_combination_services.py
# 處理 DNA 合成怪獸的核心邏輯

from typing import List, Dict, Tuple, Optional, Any
import random
import time
import logging
from collections import defaultdict
from itertools import combinations

# --- 核心修改處 START ---
# 導入我們新的事件紀錄服務
from .analytics.analytics_services import log_event
# --- 核心修改處 END ---

from .MD_models import PlayerGameData, Monster, DNAFragment, Rarity, GameConfigs, PlayerStats, ElementTypes, Recipe
from .utils_services import (
    calculate_combined_stats, determine_monster_rarity, 
    determine_monster_elements, select_monster_skills, 
    generate_monster_full_nickname, 
    get_player_title_and_achievement
)

combination_logger = logging.getLogger(__name__)

def combine_dna(
    player_id: str,
    player_data: PlayerGameData,
    dna_fragments: List[DNAFragment],
    game_configs: GameConfigs
) -> Tuple[Optional[Monster], Optional[str]]:
    """
    根據提供的 DNA 碎片合成一隻新的怪獸。

    Args:
        player_id: 玩家的唯一ID。
        player_data: 玩家的完整遊戲資料。
        dna_fragments: 用於合成的 DNA 碎片列表。
        game_configs: 包含所有遊戲設定的字典。

    Returns:
        一個元組 (新怪獸物件, 錯誤訊息)。成功時錯誤訊息為 None。
    """
    combination_logger.info(f"玩家 {player_id} 開始 DNA 合成，使用 {len(dna_fragments)} 個碎片。")

    if len(dna_fragments) < 2:
        combination_logger.warning(f"玩家 {player_id} 嘗試合成，但 DNA 碎片少於2個。")
        return None, "至少需要2個DNA才能合成。"

    if len(player_data.get("farmedMonsters", [])) >= game_configs.get("value_settings", {}).get("max_farm_slots", 10):
        combination_logger.warning(f"玩家 {player_id} 的怪獸欄位已滿，無法合成。")
        return None, "你的怪獸欄位已滿，無法再增加新的怪獸。"

    rarities_config: Dict[str, Rarity] = game_configs.get("rarities", {})
    if not rarities_config:
        combination_logger.error("遊戲設定中缺少 'rarities' 的設定。")
        return None, "遊戲設定錯誤，無法合成怪獸。"

    try:
        total_quality = sum(dna.get("quality", 0) for dna in dna_fragments)
        monster_rarity_name = determine_monster_rarity(total_quality, rarities_config)
        rarity_info = rarities_config.get(monster_rarity_name, {})

        monster_elements = determine_monster_elements(dna_fragments, rarity_info)
        
        personalities_config = game_configs.get("personalities", [])
        if not personalities_config:
            combination_logger.warning("遊戲設定中缺少 'personalities' 的設定，將使用預設個性。")
            selected_personality = {"name": "未知", "description": "充滿謎團的個性"}
        else:
            selected_personality = random.choice(personalities_config)

        combined_stats = calculate_combined_stats(dna_fragments, rarity_info)
        
        skills_config = game_configs.get("skills", {})
        selected_skills = select_monster_skills(monster_elements, monster_rarity_name, skills_config, rarity_info)

        monster_id = f"m_{player_id}_{int(time.time() * 1000)}"
        
        player_stats: PlayerStats = player_data.get("playerStats", {})
        naming_constraints = game_configs.get("naming_constraints", {})
        element_nicknames_map = game_configs.get("element_nicknames", {})
        
        current_title, current_achievement = get_player_title_and_achievement(player_stats)

        primary_element: ElementTypes = monster_elements[0] if monster_elements else "無"
        rarity_specific_nicknames = element_nicknames_map.get(primary_element, {})
        possible_nicknames = rarity_specific_nicknames.get(monster_rarity_name, [primary_element])
        element_nickname = random.choice(possible_nicknames) if possible_nicknames else primary_element

        full_nickname = generate_monster_full_nickname(current_title, current_achievement, element_nickname, naming_constraints)

        new_monster: Monster = {
            "id": monster_id,
            "nickname": full_nickname,
            "level": 1,
            "exp": 0,
            "rarity": monster_rarity_name,
            "stats": combined_stats,
            "skills": selected_skills,
            "elements": monster_elements,
            "personality": selected_personality,
            "status": "idle",
            "last_fed": int(time.time()),
            "owner_id": player_id,
            "base_stats": combined_stats.copy(),
            "dna_sources": [dna["baseId"] for dna in dna_fragments],
            "title": "新秀",
            "monsterNotes": [],
            "player_title_part": current_title,
            "achievement_part": current_achievement,
            "element_nickname_part": element_nickname,
            "custom_element_nickname": None,
            "is_locked": False
        }

        # --- 核心修改處 START ---
        # 在成功創建新怪獸後，紀錄此事件
        log_event('monster_synthesized', {
            'uid': player_id,
            'monster_id': new_monster['id'],
            'rarity': new_monster['rarity'],
            'elements': new_monster['elements'],
            'dna_sources': new_monster.get('dna_sources', []),
            'total_quality': total_quality
        })
        # --- 核心修改處 END ---

        combination_logger.info(f"玩家 {player_id} 成功合成了新的怪獸 (ID: {monster_id}, 稀有度: {monster_rarity_name}, 屬性: {monster_elements})。")
        
        # 檢查是否解鎖了新圖鑑
        recipe_key = tuple(sorted(dna.get('baseId', '') for dna in dna_fragments))
        if "discovered_recipes" not in player_stats:
            player_stats["discovered_recipes"] = []

        is_new_discovery = True
        for discovered_recipe in player_stats["discovered_recipes"]:
            if set(discovered_recipe.get("dna_base_ids", [])) == set(recipe_key):
                is_new_discovery = False
                break
        
        if is_new_discovery:
            new_recipe_entry: Recipe = {
                "dna_base_ids": list(recipe_key),
                "timestamp": int(time.time()),
                "result_monster_info": {
                    "rarity": new_monster["rarity"],
                    "elements": new_monster["elements"],
                    "primary_element": new_monster["elements"][0] if new_monster["elements"] else "無"
                }
            }
            player_stats["discovered_recipes"].append(new_recipe_entry)
            combination_logger.info(f"玩家 {player_id} 解鎖了新的合成圖鑑: {recipe_key}")


        return new_monster, None

    except Exception as e:
        combination_logger.error(f"為玩家 {player_id} 合成怪獸時發生未預期的錯誤: {e}", exc_info=True)
        return None, f"合成過程中發生內部錯誤: {e}"


def calculate_outcome_probabilities(
    dna_fragments: List[DNAFragment],
    rarities_config: Dict[str, Rarity]
) -> Dict[str, float]:
    """
    計算給定 DNA 碎片的可能稀有度結果及其概率。
    """
    total_quality = sum(dna.get("quality", 0) for dna in dna_fragments)
    
    # 這裡的邏輯需要和 determine_monster_rarity 保持一致
    # 假設 determine_monster_rarity 內部是基於一個固定的閾值表
    
    probabilities = defaultdict(float)
    
    # 這是一個簡化的概率模型。真實情況可能更複雜。
    # 假設我們模擬1000次合成，來看稀有度的分佈。
    num_simulations = 1000
    for _ in range(num_simulations):
        # 可以在這裡加入隨機性，例如 quality 有一個小的波動範圍
        simulated_quality = total_quality * random.uniform(0.9, 1.1)
        rarity_name = determine_monster_rarity(simulated_quality, rarities_config)
        probabilities[rarity_name] += 1

    for rarity in probabilities:
        probabilities[rarity] /= num_simulations

    return dict(probabilities)


def get_possible_outcomes_service(
    dna_slots: List[Optional[DNAFragment]], 
    game_configs: GameConfigs
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    預測使用當前放置在合成槽中的 DNA 可能產生的結果。
    """
    dna_fragments = [dna for dna in dna_slots if dna]
    if len(dna_fragments) < 2:
        return {"outcomes": {}}, None

    rarities_config = game_configs.get("rarities", {})
    if not rarities_config:
        return None, "遊戲設定檔中缺少稀有度設定。"

    total_quality = sum(dna.get("quality", 0) for dna in dna_fragments)
    
    # 預測主要稀有度
    predicted_rarity_name = determine_monster_rarity(total_quality, rarities_config)
    rarity_info = rarities_config.get(predicted_rarity_name, {})
    
    # 預測屬性
    predicted_elements = determine_monster_elements(dna_fragments, rarity_info)
    
    # 預測概率
    probabilities = calculate_outcome_probabilities(dna_fragments, rarities_config)

    # 建立一個包含所有可能稀有度結果的列表
    possible_outcomes = []
    
    # 主要預測結果
    possible_outcomes.append({
        "rarity": predicted_rarity_name,
        "elements": predicted_elements,
        "probability": probabilities.get(predicted_rarity_name, 0.8) # 主結果給予較高概率
    })

    # 其他可能的低概率結果
    other_rarities = [r for r in rarities_config.keys() if r != predicted_rarity_name]
    remaining_prob = 1.0 - probabilities.get(predicted_rarity_name, 0.8)
    
    if other_rarities and remaining_prob > 0:
        # 簡化模型：將剩餘概率平均分配給其他可能性
        prob_per_other = remaining_prob / len(other_rarities)
        for r_name in other_rarities:
            r_info = rarities_config[r_name]
            elements = determine_monster_elements(dna_fragments, r_info)
            possible_outcomes.append({
                "rarity": r_name,
                "elements": elements,
                "probability": prob_per_other
            })

    # 按概率排序
    possible_outcomes.sort(key=lambda x: x['probability'], reverse=True)
    
    return {"outcomes": possible_outcomes}, None

def get_recipe_details(
    game_configs: GameConfigs, 
    recipe_dna_ids: List[str]
) -> Optional[Dict[str, Any]]:
    """
    根據一組 DNA base IDs 獲取詳細的圖鑑資訊。
    """
    all_dna_fragments: List[DNAFragment] = game_configs.get("dna_fragments", [])
    if not all_dna_fragments:
        return None
    
    dna_map = {dna["id"]: dna for dna in all_dna_fragments}
    
    fragments_in_recipe: List[DNAFragment] = []
    for dna_id in recipe_dna_ids:
        if dna_id in dna_map:
            fragments_in_recipe.append(dna_map[dna_id])
        else:
            combination_logger.warning(f"圖鑑請求中包含未知的 DNA ID: {dna_id}")
            # Even if one DNA is missing, we might still proceed or return error
            # For now, let's just skip the missing one
            pass
            
    if len(fragments_in_recipe) != len(recipe_dna_ids):
        combination_logger.error(f"無法找到圖鑑所需的所有 DNA。需要 {recipe_dna_ids}，只找到 {[f['id'] for f in fragments_in_recipe]}")
        return None

    # Re-use the prediction logic to get the likely outcome
    rarities_config = game_configs.get("rarities", {})
    if not rarities_config:
        return None

    total_quality = sum(dna.get("quality", 0) for dna in fragments_in_recipe)
    predicted_rarity_name = determine_monster_rarity(total_quality, rarities_config)
    rarity_info = rarities_config.get(predicted_rarity_name, {})
    predicted_elements = determine_monster_elements(fragments_in_recipe, rarity_info)
    predicted_stats = calculate_combined_stats(fragments_in_recipe, rarity_info)
    
    skills_config = game_configs.get("skills", {})
    predicted_skills = select_monster_skills(predicted_elements, predicted_rarity_name, skills_config, rarity_info)

    return {
        "dna_fragments": fragments_in_recipe,
        "result_monster_info": {
            "rarity": predicted_rarity_name,
            "elements": predicted_elements,
            "stats": predicted_stats,
            "skills": predicted_skills
        }
    }

def get_all_unlocked_recipes_service(player_data: PlayerGameData, game_configs: GameConfigs) -> List[Dict[str, Any]]:
    """
    獲取玩家所有已解鎖的圖鑑，並附上每個圖鑑的詳細資訊。
    """
    unlocked_recipes_summary = player_data.get("playerStats", {}).get("discovered_recipes", [])
    detailed_recipes = []

    all_dna_fragments: List[DNAFragment] = game_configs.get("dna_fragments", [])
    if not all_dna_fragments:
        return unlocked_recipes_summary # Return summary if details can't be fetched

    dna_map = {dna["id"]: dna for dna in all_dna_fragments}

    for recipe_summary in unlocked_recipes_summary:
        dna_base_ids = recipe_summary.get("dna_base_ids", [])
        
        # 獲取構成此圖鑑的 DNA 碎片的詳細資訊
        fragments_details = [dna_map[base_id] for base_id in dna_base_ids if base_id in dna_map]
        
        # 確保所有 DNA ID 都有效
        if len(fragments_details) == len(dna_base_ids):
            recipe_details = recipe_summary.copy()
            recipe_details["dna_fragments"] = fragments_details
            detailed_recipes.append(recipe_details)
        else:
            combination_logger.warning(f"已解鎖的圖鑑 {dna_base_ids} 中包含一個或多個在當前遊戲設定中找不到的 DNA ID。")

    # 按時間戳降序排序，最新的在前面
    detailed_recipes.sort(key=lambda r: r.get('timestamp', 0), reverse=True)
    
    return detailed_recipes
