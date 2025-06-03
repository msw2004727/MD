# MD_services.py
# 包含「怪獸養成」遊戲的核心業務邏輯和與資料庫的互動

import random
import time
import logging
from typing import List, Dict, Optional, Union, Tuple, Literal, Any
from collections import Counter
import copy # 用於深拷貝戰鬥狀態

from firebase_admin import firestore # 引入 firestore 以便使用 FieldFilter 等
from MD_firebase_config import db
from MD_models import (
    PlayerGameData, PlayerStats, PlayerOwnedDNA,
    Monster, Skill, DNAFragment, RarityDetail, Personality,
    GameConfigs, ElementTypes, MonsterFarmStatus, MonsterAIDetails, MonsterResume,
    HealthCondition, AbsorptionConfig, CultivationConfig, SkillCategory, NamingConstraints,
    ValueSettings, RarityNames # 確保 RarityNames 也被引入
)
from MD_ai_services import generate_monster_ai_details

services_logger = logging.getLogger(__name__)

# --- 預設遊戲設定 (用於輔助函式或測試，避免循環導入) ---
# 這些預設值應該只在 game_configs 完全無法獲取時作為最後的備案
DEFAULT_GAME_CONFIGS_FOR_UTILS: GameConfigs = {
    "dna_fragments": [],
    "rarities": {"COMMON": {"name": "普通", "textVarKey":"c", "statMultiplier":1.0, "skillLevelBonus":0, "resistanceBonus":1, "value_factor":10}}, # type: ignore
    "skills": {"無": [{"name":"撞擊", "power":10, "crit":5, "probability":100, "type":"無", "baseLevel":1, "mp_cost":0, "skill_category":"物理"}]}, # type: ignore
    "personalities": [{"name": "標準", "description": "一個標準的怪獸個性。", "colorDark": "#888888", "colorLight":"#AAAAAA", "skill_preferences": {"近戰":1.0}}], # type: ignore
    "titles": ["新手"],
    "monster_achievements_list": ["新秀"],
    "element_nicknames": {"火": "炎獸"},
    "naming_constraints": {
        "max_player_title_len": 5, "max_monster_achievement_len": 5,
        "max_element_nickname_len": 5, "max_monster_full_nickname_len": 15
    },
    "health_conditions": [],
    "newbie_guide": [],
    "npc_monsters": [],
    "value_settings": {
        "element_value_factors": {"火": 1.2, "水": 1.1, "無": 0.7, "混": 0.6},
        "dna_recharge_conversion_factor": 0.15,
        "max_farm_slots": 10, # 新增農場上限的預設值
        "max_monster_skills": 3, # 新增怪獸最大技能數的預設值
        "max_battle_turns": 30 # 新增戰鬥最大回合數
    },
    "absorption_config": {
        "base_stat_gain_factor": 0.03, "score_diff_exponent": 0.3,
        "max_stat_gain_percentage": 0.015, "min_stat_gain": 1,
        "dna_extraction_chance_base": 0.75,
        "dna_extraction_rarity_modifier": {"普通": 1.0, "稀有": 0.9} # type: ignore
    },
    "cultivation_config": {
        "skill_exp_base_multiplier": 100, "new_skill_chance": 0.1,
        "skill_exp_gain_range": (10,30), "max_skill_level": 5,
        "new_skill_rarity_bias": {"普通": 0.6, "稀有": 0.3, "菁英": 0.1} # type: ignore
    },
    "elemental_advantage_chart": { # type: ignore
        "火": {"木": 1.5, "水": 0.5, "金": 1.0, "土": 1.0, "風":1.0, "毒":1.0, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "水": {"火": 1.5, "土": 1.0, "木": 0.5, "金": 1.0},
    }
}


# --- 輔助函式 ---
def _calculate_exp_to_next_level(level: int, base_multiplier: int) -> int:
    """計算升到下一級所需的經驗值。"""
    if level <= 0: level = 1
    return level * base_multiplier

def _get_skill_from_template(skill_template: Skill, game_configs: GameConfigs, monster_rarity_data: RarityDetail, target_level: Optional[int] = None) -> Skill:
    """根據技能模板、遊戲設定和怪獸稀有度來實例化一個技能。"""
    cultivation_cfg = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_UTILS["cultivation_config"])

    if target_level is not None:
        skill_level = max(1, min(target_level, cultivation_cfg.get("max_skill_level", 7)))
    else:
        skill_level = skill_template.get("baseLevel", 1) + monster_rarity_data.get("skillLevelBonus", 0)
        skill_level = max(1, min(skill_level, cultivation_cfg.get("max_skill_level", 7))) # type: ignore

    new_skill_instance: Skill = {
        "name": skill_template.get("name", "未知技能"),
        "power": skill_template.get("power", 10),
        "crit": skill_template.get("crit", 5),
        "probability": skill_template.get("probability", 50),
        "story": skill_template.get("story", skill_template.get("description", "一個神秘的招式")),
        "type": skill_template.get("type", "無"), # type: ignore
        "baseLevel": skill_template.get("baseLevel", 1),
        "level": skill_level,
        "mp_cost": skill_template.get("mp_cost", 0),
        "skill_category": skill_template.get("skill_category", "其他"), # type: ignore
        "current_exp": 0,
        "exp_to_next_level": _calculate_exp_to_next_level(skill_level, cultivation_cfg.get("skill_exp_base_multiplier", 100)), # type: ignore
        "effect": skill_template.get("effect"), # 簡要效果標識
        "stat": skill_template.get("stat"),     # 影響的數值
        "amount": skill_template.get("amount"),   # 影響的量
        "duration": skill_template.get("duration"), # 持續回合
        "damage": skill_template.get("damage"),   # 額外傷害或治療量
        "recoilDamage": skill_template.get("recoilDamage") # 反傷比例
    }
    return new_skill_instance

def _generate_monster_full_nickname(player_title: str, monster_achievement: str, element_nickname_part: str, naming_constraints: NamingConstraints) -> str:
    """根據玩家稱號、怪獸成就和元素暱稱部分生成怪獸的完整暱稱。"""
    pt = player_title[:naming_constraints.get("max_player_title_len", 5)]
    ma = monster_achievement[:naming_constraints.get("max_monster_achievement_len", 5)]
    en = element_nickname_part[:naming_constraints.get("max_element_nickname_len", 5)]
    full_name = f"{pt}{ma}{en}"
    return full_name[:naming_constraints.get("max_monster_full_nickname_len", 15)]

# --- 玩家相關服務 ---
def initialize_new_player_data(player_id: str, nickname: str, game_configs: GameConfigs) -> PlayerGameData:
    """為新玩家初始化遊戲資料。"""
    services_logger.info(f"為新玩家 {nickname} (ID: {player_id}) 初始化遊戲資料。")
    player_titles_list = game_configs.get("titles", ["新手"])
    default_player_title = player_titles_list[0] if player_titles_list else "新手" # type: ignore

    player_stats: PlayerStats = {
        "rank": "N/A", "wins": 0, "losses": 0, "score": 0,
        "titles": [default_player_title],
        "achievements": ["首次登入異世界"], "medals": 0, "nickname": nickname
    }

    initial_dna_owned: List[PlayerOwnedDNA] = []
    dna_fragments_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore
    num_initial_dna = 6 # 可以考慮也放入 game_configs

    if dna_fragments_templates:
        eligible_dna_templates = [dna for dna in dna_fragments_templates if dna.get("rarity") in ["普通", "稀有"]]
        if not eligible_dna_templates:
            eligible_dna_templates = list(dna_fragments_templates) # 如果沒有普通/稀有，則從所有DNA中選

        for i in range(min(num_initial_dna, len(eligible_dna_templates))):
            if not eligible_dna_templates: break # 避免在空列表上 random.choice
            template = random.choice(eligible_dna_templates)
            instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{i}"
            # 確保 PlayerOwnedDNA 包含 DNAFragment 的所有欄位，並加上實例特定的 id 和 baseId
            owned_dna_item: PlayerOwnedDNA = {**template, "id": instance_id, "baseId": template["id"]} # type: ignore
            initial_dna_owned.append(owned_dna_item)
            if template in eligible_dna_templates: # 檢查 template 是否仍在列表中
                eligible_dna_templates.remove(template) # 避免重複選取

    new_player_data: PlayerGameData = {
        "playerOwnedDNA": initial_dna_owned,
        "farmedMonsters": [],
        "playerStats": player_stats,
        "nickname": nickname, # 頂層 nickname
        "lastSave": int(time.time())
    }
    services_logger.info(f"新玩家 {nickname} 資料初始化完畢，獲得 {len(initial_dna_owned)} 個初始 DNA。")
    return new_player_data

def get_player_data_service(player_id: str, nickname_from_auth: Optional[str], game_configs: GameConfigs) -> Optional[PlayerGameData]:
    """獲取玩家遊戲資料，如果不存在則初始化。"""
    if not db:
        services_logger.error("Firestore 資料庫未初始化 (get_player_data_service)。")
        return None
    try:
        user_profile_ref = db.collection('users').document(player_id)
        user_profile_doc = user_profile_ref.get()

        authoritative_nickname = nickname_from_auth
        if not authoritative_nickname:
            if user_profile_doc.exists:
                profile_data = user_profile_doc.to_dict()
                if profile_data and profile_data.get("nickname"):
                    authoritative_nickname = profile_data["nickname"]
            if not authoritative_nickname:
                authoritative_nickname = "未知玩家"

        if user_profile_doc.exists:
            profile_data = user_profile_doc.to_dict()
            if profile_data and profile_data.get("nickname") != authoritative_nickname:
                user_profile_ref.update({"nickname": authoritative_nickname, "lastLogin": firestore.SERVER_TIMESTAMP}) # type: ignore
                services_logger.info(f"已更新玩家 {player_id} 在 Firestore users 集合中的暱稱為: {authoritative_nickname}")
            else: # 即使暱稱相同，也更新 lastLogin
                user_profile_ref.update({"lastLogin": firestore.SERVER_TIMESTAMP}) # type: ignore
        else:
             user_profile_ref.set({"uid": player_id, "nickname": authoritative_nickname, "createdAt": firestore.SERVER_TIMESTAMP, "lastLogin": firestore.SERVER_TIMESTAMP}) # type: ignore
             services_logger.info(f"已為玩家 {player_id} 創建 Firestore users 集合中的 profile，暱稱: {authoritative_nickname}")


        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_doc = game_data_ref.get()

        if game_data_doc.exists:
            player_game_data_dict = game_data_doc.to_dict()
            if player_game_data_dict:
                services_logger.info(f"成功從 Firestore 獲取玩家遊戲資料：{player_id}")
                player_game_data: PlayerGameData = {
                    "playerOwnedDNA": player_game_data_dict.get("playerOwnedDNA", []),
                    "farmedMonsters": player_game_data_dict.get("farmedMonsters", []),
                    "playerStats": player_game_data_dict.get("playerStats", {}), # type: ignore
                    "nickname": authoritative_nickname,
                    "lastSave": player_game_data_dict.get("lastSave", int(time.time()))
                }
                if "nickname" not in player_game_data["playerStats"] or player_game_data["playerStats"]["nickname"] != authoritative_nickname: # type: ignore
                    player_game_data["playerStats"]["nickname"] = authoritative_nickname # type: ignore
                return player_game_data

        services_logger.info(f"在 Firestore 中找不到玩家 {player_id} 的遊戲資料，或資料為空。將初始化新玩家資料，使用暱稱: {authoritative_nickname}。")
        new_player_data = initialize_new_player_data(player_id, authoritative_nickname, game_configs)
        if save_player_data_service(player_id, new_player_data):
            services_logger.info(f"新玩家 {authoritative_nickname} 的初始資料已成功儲存。")
        else:
            services_logger.error(f"儲存新玩家 {authoritative_nickname} 的初始資料失敗。")
        return new_player_data

    except Exception as e:
        services_logger.error(f"獲取玩家資料時發生錯誤 ({player_id}): {e}", exc_info=True)
        return None

def save_player_data_service(player_id: str, game_data: PlayerGameData) -> bool:
    """儲存玩家遊戲資料到 Firestore。"""
    if not db:
        services_logger.error("Firestore 資料庫未初始化 (save_player_data_service)。")
        return False
    try:
        data_to_save: Dict[str, Any] = {
            "playerOwnedDNA": game_data.get("playerOwnedDNA", []),
            "farmedMonsters": game_data.get("farmedMonsters", []),
            "playerStats": game_data.get("playerStats", {}),
            "nickname": game_data.get("nickname", "未知玩家"),
            "lastSave": int(time.time())
        }
        if isinstance(data_to_save["playerStats"], dict) and \
           data_to_save["playerStats"].get("nickname") != data_to_save["nickname"]:
            data_to_save["playerStats"]["nickname"] = data_to_save["nickname"]

        game_data_ref = db.collection('users').document(player_id).collection('gameData').document('main')
        game_data_ref.set(data_to_save, merge=True)
        services_logger.info(f"玩家 {player_id} 的遊戲資料已成功儲存到 Firestore。")
        return True
    except Exception as e:
        services_logger.error(f"儲存玩家遊戲資料到 Firestore 時發生錯誤 ({player_id}): {e}", exc_info=True)
        return False

# --- DNA 組合與怪獸生成服務 ---
def combine_dna_service(dna_ids_from_request: List[str], game_configs: GameConfigs, player_data: PlayerGameData) -> Optional[Monster]:
    """
    根據提供的 DNA ID 列表、遊戲設定和玩家資料來組合生成新的怪獸。
    此函式不再負責儲存玩家資料。
    """
    if not dna_ids_from_request:
        services_logger.warning("DNA 組合請求中的 DNA ID 列表為空。")
        return None

    all_dna_fragments_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore
    all_skills_db: Dict[ElementTypes, List[Skill]] = game_configs.get("skills", {}) # type: ignore
    all_personalities_db: List[Personality] = game_configs.get("personalities", []) # type: ignore
    all_rarities_db: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    naming_constraints: NamingConstraints = game_configs.get("naming_constraints", DEFAULT_GAME_CONFIGS_FOR_UTILS["naming_constraints"]) # type: ignore
    element_nicknames_map: Dict[ElementTypes, str] = game_configs.get("element_nicknames", DEFAULT_GAME_CONFIGS_FOR_UTILS["element_nicknames"]) # type: ignore
    monster_achievements_list: List[str] = game_configs.get("monster_achievements_list", DEFAULT_GAME_CONFIGS_FOR_UTILS["monster_achievements_list"]) # type: ignore

    combined_dnas_data: List[DNAFragment] = []
    constituent_dna_template_ids: List[str] = []

    for req_dna_id in dna_ids_from_request:
        found_dna_template = next((f for f in all_dna_fragments_templates if f.get("id") == req_dna_id), None)
        if found_dna_template:
            combined_dnas_data.append(found_dna_template)
            constituent_dna_template_ids.append(found_dna_template["id"])
        else:
            services_logger.warning(f"在遊戲設定中找不到 ID 為 {req_dna_id} 的 DNA 片段模板。")

    if not combined_dnas_data:
        services_logger.error("提供的 DNA IDs 無效或在設定中均未找到。")
        return None

    base_stats: Dict[str, int] = {"attack": 0, "defense": 0, "speed": 0, "hp": 0, "mp": 0, "crit": 0}
    for dna_frag in combined_dnas_data:
        for stat_name_key in base_stats.keys():
            stat_name = stat_name_key # type: ignore
            base_stats[stat_name] += dna_frag.get(stat_name, 0) # type: ignore

    for stat_name_key in base_stats.keys():
        stat_name = stat_name_key # type: ignore
        if base_stats[stat_name] <= 0: # type: ignore
            base_stats[stat_name] = random.randint(1, 5) # type: ignore

    element_counts = Counter(dna.get("type", "無") for dna in combined_dnas_data) # type: ignore
    total_dna_pieces = len(combined_dnas_data)
    element_composition: Dict[ElementTypes, float] = {el: round((cnt / total_dna_pieces) * 100, 1) for el, cnt in element_counts.items()} if total_dna_pieces > 0 else {"無": 100.0} # type: ignore
    sorted_elements_by_comp = sorted(element_composition.items(), key=lambda item: item[1], reverse=True)
    elements_present: List[ElementTypes] = [el_comp[0] for el_comp in sorted_elements_by_comp] if sorted_elements_by_comp else ["無"] # type: ignore
    primary_element: ElementTypes = elements_present[0]

    rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
    highest_rarity_index = 0
    for dna_frag in combined_dnas_data:
        try:
            current_rarity_index = rarity_order.index(dna_frag.get("rarity", "普通")) # type: ignore
            highest_rarity_index = max(highest_rarity_index, current_rarity_index)
        except ValueError:
            services_logger.warning(f"未知的稀有度名稱 '{dna_frag.get('rarity')}' 在 DNA 片段 {dna_frag.get('id')} 中。")
    monster_rarity_name: RarityNames = rarity_order[highest_rarity_index]

    rarity_key_lookup = {data["name"]: key for key, data in all_rarities_db.items()} # type: ignore
    monster_rarity_key = rarity_key_lookup.get(monster_rarity_name, "COMMON")
    monster_rarity_data: RarityDetail = all_rarities_db.get(monster_rarity_key, DEFAULT_GAME_CONFIGS_FOR_UTILS["rarities"]["COMMON"]) # type: ignore

    generated_skills: List[Skill] = []
    potential_skills_for_elements: List[Skill] = [] # type: ignore
    for el_str_skill in elements_present:
        el_skill: ElementTypes = el_str_skill # type: ignore
        if el_skill in all_skills_db and isinstance(all_skills_db.get(el_skill), list):
            potential_skills_for_elements.extend(all_skills_db[el_skill]) # type: ignore
    if "無" in all_skills_db and isinstance(all_skills_db.get("無"), list) and "無" not in elements_present:
        potential_skills_for_elements.extend(all_skills_db["無"]) # type: ignore

    if potential_skills_for_elements:
        num_skills_to_select = random.randint(1, min(game_configs.get("value_settings", {}).get("max_monster_skills", 3), len(potential_skills_for_elements)))
        selected_skill_names_set = set()
        random.shuffle(potential_skills_for_elements)

        for skill_template in potential_skills_for_elements:
            if len(generated_skills) >= num_skills_to_select: break
            if skill_template and skill_template.get("name") not in selected_skill_names_set:
                new_skill_instance = _get_skill_from_template(skill_template, game_configs, monster_rarity_data)
                generated_skills.append(new_skill_instance)
                selected_skill_names_set.add(new_skill_instance["name"])

    if not generated_skills:
        default_skill_template = all_skills_db.get("無", [{}])[0] if all_skills_db.get("無") else {} # type: ignore
        generated_skills.append(_get_skill_from_template(default_skill_template, game_configs, monster_rarity_data))

    selected_personality_template: Personality = random.choice(all_personalities_db) if all_personalities_db else DEFAULT_GAME_CONFIGS_FOR_UTILS["personalities"][0] # type: ignore

    player_current_title = player_data.get("playerStats", {}).get("titles", ["新手"])[0] # type: ignore
    monster_initial_achievement = random.choice(monster_achievements_list) if monster_achievements_list else "新秀" # type: ignore
    default_element_nickname = element_nicknames_map.get(primary_element, primary_element) # type: ignore
    monster_full_nickname = _generate_monster_full_nickname(
        player_current_title, monster_initial_achievement, default_element_nickname, naming_constraints # type: ignore
    )

    monster_id = f"m_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
    stat_multiplier = monster_rarity_data.get("statMultiplier", 1.0)
    initial_max_hp = int(base_stats["hp"] * stat_multiplier)
    initial_max_mp = int(base_stats["mp"] * stat_multiplier)

    new_monster_base: Monster = {
        "id": monster_id,
        "nickname": monster_full_nickname,
        "elements": elements_present,
        "elementComposition": element_composition,
        "hp": initial_max_hp, "mp": initial_max_mp,
        "initial_max_hp": initial_max_hp, "initial_max_mp": initial_max_mp,
        "attack": int(base_stats["attack"] * stat_multiplier),
        "defense": int(base_stats["defense"] * stat_multiplier),
        "speed": int(base_stats["speed"] * stat_multiplier),
        "crit": int(base_stats["crit"] * stat_multiplier),
        "skills": generated_skills,
        "rarity": monster_rarity_name,
        "title": monster_initial_achievement,
        "custom_element_nickname": None,
        "description": f"由 {', '.join(dna.get('name', '未知DNA') for dna in combined_dnas_data)} 的力量組合而成。",
        "personality": selected_personality_template,
        "creationTime": int(time.time()),
        "monsterTitles": [monster_initial_achievement],
        "monsterMedals": 0,
        "farmStatus": {"active": False, "completed": False, "isBattling": False, "isTraining": False, "boosts": {}},
        "activityLog": [{"time": time.strftime("%Y-%m-%d %H:%M:%S"), "message": "誕生於神秘的 DNA 組合。"}],
        "healthConditions": [],
        "resistances": {},
        "resume": {"wins": 0, "losses": 0},
        "constituent_dna_ids": constituent_dna_template_ids
    }

    base_resistances: Dict[ElementTypes, int] = {} # type: ignore
    for dna_frag in combined_dnas_data:
        frag_res = dna_frag.get("resistances")
        if frag_res and isinstance(frag_res, dict):
            for el_str_res, val_res in frag_res.items():
                el_key_res: ElementTypes = el_str_res # type: ignore
                base_resistances[el_key_res] = base_resistances.get(el_key_res, 0) + val_res

    resistance_bonus_from_rarity = monster_rarity_data.get("resistanceBonus", 0)
    for el_str_present in elements_present:
        el_key_present: ElementTypes = el_str_present # type: ignore
        base_resistances[el_key_present] = base_resistances.get(el_key_present, 0) + resistance_bonus_from_rarity
    new_monster_base["resistances"] = base_resistances

    services_logger.info(f"為新怪獸 '{new_monster_base['nickname']}' 調用 AI 生成詳細描述。")
    ai_input_data_for_generation = {
        "nickname": new_monster_base["nickname"],
        "elements": new_monster_base["elements"],
        "rarity": new_monster_base["rarity"],
        "hp": new_monster_base["hp"], "mp": new_monster_base["mp"],
        "attack": new_monster_base["attack"], "defense": new_monster_base["defense"],
        "speed": new_monster_base["speed"], "crit": new_monster_base["crit"],
        "personality_name": new_monster_base["personality"]["name"], # type: ignore
        "personality_description": new_monster_base["personality"]["description"] # type: ignore
    }
    ai_details: MonsterAIDetails = generate_monster_ai_details(ai_input_data_for_generation) # type: ignore
    new_monster_base["aiPersonality"] = ai_details.get("aiPersonality")
    new_monster_base["aiIntroduction"] = ai_details.get("aiIntroduction")
    new_monster_base["aiEvaluation"] = ai_details.get("aiEvaluation")

    score = (new_monster_base["initial_max_hp"] // 10) + \
            new_monster_base["attack"] + new_monster_base["defense"] + \
            (new_monster_base["speed"] // 2) + (new_monster_base["crit"] * 2) + \
            (len(new_monster_base["skills"]) * 15) + \
            (rarity_order.index(new_monster_base["rarity"]) * 30)
    new_monster_base["score"] = score

    services_logger.info(f"服務層：怪獸 '{new_monster_base['nickname']}' 組合完成。評分: {score}")
    return new_monster_base


# --- 更新怪獸自定義屬性名服務 ---
def update_monster_custom_element_nickname_service(
    player_id: str,
    monster_id: str,
    new_custom_element_nickname: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """更新怪獸的自定義屬性名，並重新計算完整暱稱。"""
    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"更新屬性名失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_update: Optional[Monster] = None
    monster_idx = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_update = m
            monster_idx = idx
            break

    if not monster_to_update or monster_idx == -1:
        services_logger.error(f"更新屬性名失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    naming_constraints: NamingConstraints = game_configs.get("naming_constraints", DEFAULT_GAME_CONFIGS_FOR_UTILS["naming_constraints"]) # type: ignore
    max_len = naming_constraints.get("max_element_nickname_len", 5)

    element_nicknames_map: Dict[ElementTypes, str] = game_configs.get("element_nicknames", DEFAULT_GAME_CONFIGS_FOR_UTILS["element_nicknames"]) # type: ignore
    primary_element: ElementTypes = monster_to_update.get("elements", ["無"])[0] # type: ignore

    if not new_custom_element_nickname:
        monster_to_update["custom_element_nickname"] = None
        element_nickname_part_for_full_name = element_nicknames_map.get(primary_element, primary_element) # type: ignore
    else:
        processed_nickname = new_custom_element_nickname.strip()[:max_len]
        monster_to_update["custom_element_nickname"] = processed_nickname
        element_nickname_part_for_full_name = processed_nickname

    player_current_title = player_data.get("playerStats", {}).get("titles", ["新手"])[0] # type: ignore
    monster_achievement = monster_to_update.get("title", "新秀") # type: ignore

    monster_to_update["nickname"] = _generate_monster_full_nickname(
        player_current_title, monster_achievement, element_nickname_part_for_full_name, naming_constraints # type: ignore
    )

    player_data["farmedMonsters"][monster_idx] = monster_to_update # type: ignore
    services_logger.info(f"怪獸 {monster_id} 的自定義屬性名已在服務層更新為 '{monster_to_update['custom_element_nickname']}'，完整暱稱更新為 '{monster_to_update['nickname']}'。等待路由層儲存。")
    return player_data


# --- 戰鬥後吸收服務 ---
def absorb_defeated_monster_service(
    player_id: str,
    winning_monster_id: str,
    defeated_monster_snapshot: Monster,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, Any]]:
    """處理勝利怪獸吸收被擊敗怪獸的邏輯。"""
    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    winning_monster: Optional[Monster] = None
    winning_monster_idx = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == winning_monster_id:
            winning_monster = m
            winning_monster_idx = idx
            break

    if not winning_monster or winning_monster_idx == -1:
        return {"success": False, "error": f"找不到ID為 {winning_monster_id} 的勝利怪獸。"}

    services_logger.info(f"玩家 {player_id} 的怪獸 {winning_monster.get('nickname')} 開始吸收 {defeated_monster_snapshot.get('nickname')}。")

    absorption_cfg: AbsorptionConfig = game_configs.get("absorption_config", DEFAULT_GAME_CONFIGS_FOR_UTILS["absorption_config"]) # type: ignore
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore
    extracted_dna_templates: List[DNAFragment] = []

    defeated_constituent_ids = defeated_monster_snapshot.get("constituent_dna_ids", [])
    if defeated_constituent_ids:
        for dna_template_id in defeated_constituent_ids:
            dna_template = next((t for t in all_dna_templates if t.get("id") == dna_template_id), None)
            if dna_template:
                extraction_chance = absorption_cfg.get("dna_extraction_chance_base", 0.75)
                rarity_modifier = absorption_cfg.get("dna_extraction_rarity_modifier", {}).get(dna_template.get("rarity", "普通"), 1.0) # type: ignore
                if random.random() < (extraction_chance * rarity_modifier): # type: ignore
                    extracted_dna_templates.append(dna_template)
                    services_logger.info(f"成功提取DNA模板: {dna_template.get('name')}") # type: ignore

    stat_gains: Dict[str, int] = {}
    defeated_score = defeated_monster_snapshot.get("score", 100)
    winning_score = winning_monster.get("score", 100)
    if winning_score <= 0: winning_score = 100

    base_gain_factor = absorption_cfg.get("base_stat_gain_factor", 0.03)
    score_diff_exp = absorption_cfg.get("score_diff_exponent", 0.3)
    score_ratio_effect = min(2.0, max(0.5, (defeated_score / winning_score) ** score_diff_exp))

    stats_to_grow = ["hp", "mp", "attack", "defense", "speed", "crit"]
    for stat_key in stats_to_grow:
        defeated_stat_value = defeated_monster_snapshot.get(stat_key, 10 if stat_key not in ["hp", "mp"] else 50) # type: ignore
        gain = int(defeated_stat_value * base_gain_factor * score_ratio_effect * random.uniform(0.8, 1.2)) # type: ignore
        gain = max(absorption_cfg.get("min_stat_gain", 1) if gain > 0 else 0, gain) # type: ignore

        max_gain_for_stat = 0
        if stat_key in ["hp", "mp"]:
            max_gain_for_stat = int(winning_monster.get(f"initial_max_{stat_key}", 1000) * absorption_cfg.get("max_stat_gain_percentage", 0.015)) # type: ignore
        else:
            max_gain_for_stat = int(winning_monster.get(stat_key, 100) * absorption_cfg.get("max_stat_gain_percentage", 0.015) * 2) # type: ignore

        gain = min(gain, max(absorption_cfg.get("min_stat_gain", 1), max_gain_for_stat)) # type: ignore

        if gain > 0:
            current_stat_val = winning_monster.get(stat_key, 0) # type: ignore
            target_max_stat_val_key = f"initial_max_{stat_key}" if stat_key in ["hp", "mp"] else None

            if target_max_stat_val_key:
                max_val = winning_monster.get(target_max_stat_val_key, current_stat_val + gain) # type: ignore
                winning_monster[stat_key] = min(max_val, current_stat_val + gain) # type: ignore
                winning_monster[target_max_stat_val_key] = min(int(max_val * 1.05), max_val + int(gain * 0.5)) # type: ignore
            else:
                winning_monster[stat_key] = current_stat_val + gain # type: ignore
            stat_gains[stat_key] = gain
            services_logger.info(f"怪獸 {winning_monster_id} 的 {stat_key} 成長了 {gain}點。")

    player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore

    current_owned_dna = player_data.get("playerOwnedDNA", [])
    for dna_template in extracted_dna_templates:
        instance_id = f"dna_{player_id}_{int(time.time() * 1000)}_{len(current_owned_dna)}"
        owned_dna_item: PlayerOwnedDNA = {**dna_template, "id": instance_id, "baseId": dna_template["id"]} # type: ignore
        current_owned_dna.append(owned_dna_item)
    player_data["playerOwnedDNA"] = current_owned_dna

    if winning_monster:
        rarity_order: List[RarityNames] = ["普通", "稀有", "菁英", "傳奇", "神話"] # type: ignore
        winning_monster["score"] = (winning_monster.get("initial_max_hp",0) // 10) + \
                                   winning_monster.get("attack",0) + winning_monster.get("defense",0) + \
                                   (winning_monster.get("speed",0) // 2) + (winning_monster.get("crit",0) * 2) + \
                                   (len(winning_monster.get("skills",[])) * 15) + \
                                   (rarity_order.index(winning_monster.get("rarity","普通")) * 30) # type: ignore
        player_data["farmedMonsters"][winning_monster_idx] = winning_monster # type: ignore


    # 注意：此服務現在不直接儲存 player_data，儲存操作已移至路由層
    # 因此，返回的 updated_winning_monster 和 updated_player_owned_dna 是基於傳入的 player_data 修改後的版本
    return {
        "success": True,
        "message": f"{winning_monster.get('nickname')} 成功吸收了 {defeated_monster_snapshot.get('nickname')} 的力量！",
        "extracted_dna_templates": extracted_dna_templates,
        "stat_gains": stat_gains,
        "updated_winning_monster": winning_monster, # 這是修改後的怪獸物件
        "updated_player_owned_dna": player_data.get("playerOwnedDNA") # 這是修改後的玩家DNA列表
    }


# --- 醫療站相關服務 ---
def calculate_dna_value(dna_instance: PlayerOwnedDNA, game_configs: GameConfigs) -> int:
    """計算 DNA 碎片的價值，用於充能等。"""
    if not dna_instance: return 0
    base_rarity_value = 0
    rarities_config: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    dna_rarity_name = dna_instance.get("rarity", "普通")

    rarity_key_found = next((r_key for r_key, r_detail in rarities_config.items() if r_detail.get("name") == dna_rarity_name), None)
    if rarity_key_found:
        base_rarity_value = rarities_config[rarity_key_found].get("value_factor", 10) # type: ignore
    else:
        base_rarity_value = rarities_config.get("COMMON", {}).get("value_factor", 10) # type: ignore

    element_factor = 1.0
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    element_value_factors: Dict[ElementTypes, float] = value_settings.get("element_value_factors", {}) # type: ignore
    dna_element: ElementTypes = dna_instance.get("type", "無") # type: ignore

    if dna_element in element_value_factors:
        element_factor = element_value_factors[dna_element] # type: ignore

    calculated_value = int(base_rarity_value * element_factor)
    services_logger.debug(f"計算DNA '{dna_instance.get('name')}' 價值: {calculated_value}")
    return max(1, calculated_value)

def heal_monster_service(
    player_id: str,
    monster_id: str,
    heal_type: Literal["full_hp", "full_mp", "cure_conditions", "full_restore"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """治療怪獸。"""
    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"治療失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_heal: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_heal = m
            monster_index = idx
            break

    if not monster_to_heal or monster_index == -1:
        services_logger.error(f"治療失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    services_logger.info(f"開始治療玩家 {player_id} 的怪獸 {monster_to_heal.get('nickname')} (ID: {monster_id})，治療類型: {heal_type}")
    healed = False
    if heal_type == "full_hp" or heal_type == "full_restore":
        monster_to_heal["hp"] = monster_to_heal.get("initial_max_hp", 100)
        healed = True
    if heal_type == "full_mp" or heal_type == "full_restore":
        monster_to_heal["mp"] = monster_to_heal.get("initial_max_mp", 50)
        healed = True
    if heal_type == "cure_conditions" or heal_type == "full_restore":
        if monster_to_heal.get("healthConditions"):
            monster_to_heal["healthConditions"] = []
            healed = True
            services_logger.info(f"怪獸 {monster_id} 的健康狀況已清除。")

    if healed:
        player_data["farmedMonsters"][monster_index] = monster_to_heal # type: ignore
        services_logger.info(f"怪獸 {monster_id} 治療成功（等待路由層儲存）。")
        return player_data
    else:
        services_logger.info(f"怪獸 {monster_id} 無需治療或治療類型無效。")
        return player_data

def disassemble_monster_service(
    player_id: str,
    monster_id: str,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[Dict[str, any]]:
    """分解怪獸，返回分解出的 DNA 模板列表。"""
    if not player_data or not player_data.get("farmedMonsters"):
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。"}

    monster_to_disassemble: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_disassemble = m
            monster_index = idx
            break

    if not monster_to_disassemble or monster_index == -1:
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。"}

    services_logger.info(f"開始分解玩家 {player_id} 的怪獸 {monster_to_disassemble.get('nickname')} (ID: {monster_id})")

    returned_dna_templates: List[DNAFragment] = []
    constituent_ids = monster_to_disassemble.get("constituent_dna_ids", [])
    all_dna_templates: List[DNAFragment] = game_configs.get("dna_fragments", []) # type: ignore

    if constituent_ids:
        for template_id in constituent_ids:
            found_template = next((t for t in all_dna_templates if t.get("id") == template_id), None)
            if found_template:
                returned_dna_templates.append(found_template)
    else:
        num_to_return = random.randint(1, 3)
        monster_rarity = monster_to_disassemble.get("rarity", "普通")
        monster_elements: List[ElementTypes] = monster_to_disassemble.get("elements", ["無"]) # type: ignore

        eligible_templates = [
            t for t in all_dna_templates
            if t.get("rarity") == monster_rarity and any(el == t.get("type") for el in monster_elements) # type: ignore
        ]
        if not eligible_templates:
            eligible_templates = [t for t in all_dna_templates if t.get("rarity") == monster_rarity]
        if not eligible_templates:
            eligible_templates = all_dna_templates

        for _ in range(min(num_to_return, len(eligible_templates))):
            if not eligible_templates: break
            returned_dna_templates.append(random.choice(eligible_templates))

    player_data["farmedMonsters"].pop(monster_index) # type: ignore
    services_logger.info(f"怪獸 {monster_to_disassemble.get('nickname')} 已在服務層標記分解，返回 {len(returned_dna_templates)} 個DNA模板。等待路由層處理。")
    return {
        "success": True,
        "message": f"怪獸 {monster_to_disassemble.get('nickname')} 已準備分解！",
        "returned_dna_templates": returned_dna_templates,
        "updated_farmed_monsters": player_data["farmedMonsters"]
    }


def recharge_monster_with_dna_service(
    player_id: str,
    monster_id: str,
    dna_instance_id_to_consume: str,
    recharge_target: Literal["hp", "mp"],
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """使用指定的 DNA 碎片為怪獸充能 HP 或 MP。"""
    if not player_data or not player_data.get("farmedMonsters") or not player_data.get("playerOwnedDNA"):
        services_logger.error(f"充能失敗：找不到玩家 {player_id} 或其無怪獸/DNA庫。")
        return None

    monster_to_recharge: Optional[Monster] = None
    monster_index = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_recharge = m
            monster_index = idx
            break

    dna_to_consume: Optional[PlayerOwnedDNA] = None
    dna_index = -1
    for idx, dna in enumerate(player_data["playerOwnedDNA"]):
        if dna.get("id") == dna_instance_id_to_consume:
            dna_to_consume = dna
            dna_index = idx
            break

    if not monster_to_recharge or not dna_to_consume:
        services_logger.error(f"充能失敗：找不到怪獸 {monster_id} 或 DNA {dna_instance_id_to_consume}。")
        return None

    dna_element: ElementTypes = dna_to_consume.get("type", "無") # type: ignore
    monster_elements: List[ElementTypes] = monster_to_recharge.get("elements", ["無"]) # type: ignore

    if dna_element not in monster_elements:
        services_logger.warning(f"充能失敗：DNA屬性 ({dna_element}) 與怪獸屬性 ({monster_elements}) 不符。")
        return player_data

    dna_value = calculate_dna_value(dna_to_consume, game_configs)
    value_settings: ValueSettings = game_configs.get("value_settings", DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"]) # type: ignore
    conversion_factor = value_settings.get("dna_recharge_conversion_factor", 0.1)
    amount_to_restore = int(dna_value * conversion_factor)

    if amount_to_restore <= 0:
        services_logger.info(f"DNA {dna_to_consume.get('name')} 價值不足以充能。")
        return player_data

    target_stat_current_key: Literal["hp", "mp"] = recharge_target
    target_stat_max_key: Literal["initial_max_hp", "initial_max_mp"] = f"initial_max_{recharge_target}" # type: ignore

    current_val = monster_to_recharge.get(target_stat_current_key, 0) # type: ignore
    max_val = monster_to_recharge.get(target_stat_max_key, current_val + amount_to_restore) # type: ignore

    new_val = min(max_val, current_val + amount_to_restore) # type: ignore

    if new_val > current_val: # type: ignore
        monster_to_recharge[target_stat_current_key] = new_val # type: ignore
        services_logger.info(f"怪獸 {monster_id} 的 {recharge_target} 已恢復至 {new_val}。")
    else:
        services_logger.info(f"怪獸 {monster_id} 的 {recharge_target} 已滿或無變化。")
        return player_data

    player_data["playerOwnedDNA"].pop(dna_index) # type: ignore
    player_data["farmedMonsters"][monster_index] = monster_to_recharge # type: ignore

    services_logger.info(f"怪獸 {monster_id} 已使用DNA {dna_to_consume.get('name')} 充能 {recharge_target}（等待路由層儲存）。")
    return player_data


# --- 修煉與技能成長服務 ---
def complete_cultivation_service(
    player_id: str,
    monster_id: str,
    duration_seconds: int,
    game_configs: GameConfigs
) -> Optional[Dict[str, Any]]:
    """完成怪獸修煉，計算經驗、潛在新技能等。"""
    player_data = get_player_data_service(player_id, None, game_configs)
    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"完成修煉失敗：找不到玩家 {player_id} 或其無怪獸。")
        return {"success": False, "error": "找不到玩家資料或農場無怪獸。", "status_code": 404}

    monster_to_update: Optional[Monster] = None
    monster_idx = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_update = m
            monster_idx = idx
            break

    if not monster_to_update or monster_idx == -1:
        services_logger.error(f"完成修煉失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return {"success": False, "error": f"找不到ID為 {monster_id} 的怪獸。", "status_code": 404}

    if not monster_to_update.get("farmStatus"):
        monster_to_update["farmStatus"] = {"active": False, "completed": False, "isBattling": False, "isTraining": False, "boosts": {}} # type: ignore

    monster_to_update["farmStatus"]["isTraining"] = False # type: ignore
    monster_to_update["farmStatus"]["trainingStartTime"] = None # type: ignore

    cultivation_cfg: CultivationConfig = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_UTILS["cultivation_config"]) # type: ignore
    services_logger.info(f"開始為怪獸 {monster_to_update.get('nickname')} (ID: {monster_id}) 結算修煉成果。時長: {duration_seconds}秒。")

    skill_updates_log: List[str] = []
    current_skills: List[Skill] = monster_to_update.get("skills", []) # type: ignore

    exp_gain_min, exp_gain_max = cultivation_cfg.get("skill_exp_gain_range", (10,50)) # type: ignore
    max_skill_lvl = cultivation_cfg.get("max_skill_level", 7) # type: ignore
    exp_multiplier = cultivation_cfg.get("skill_exp_base_multiplier", 100) # type: ignore

    for skill in current_skills:
        if skill.get("level", 1) >= max_skill_lvl: # type: ignore
            skill_updates_log.append(f"技能 '{skill.get('name')}' 已達最高等級。")
            continue

        exp_gained = random.randint(exp_gain_min, exp_gain_max) + int(duration_seconds / 10)
        skill["current_exp"] = skill.get("current_exp", 0) + exp_gained # type: ignore
        skill_updates_log.append(f"技能 '{skill.get('name')}' 獲得 {exp_gained} 經驗值。")

        while skill.get("level", 1) < max_skill_lvl and \
              skill.get("current_exp", 0) >= skill.get("exp_to_next_level", _calculate_exp_to_next_level(skill.get("level",1), exp_multiplier)): # type: ignore

            current_level = skill.get("level", 1) # type: ignore
            exp_needed = skill.get("exp_to_next_level", _calculate_exp_to_next_level(current_level, exp_multiplier)) # type: ignore

            skill["current_exp"] = skill.get("current_exp", 0) - exp_needed # type: ignore
            skill["level"] = current_level + 1 # type: ignore
            skill["exp_to_next_level"] = _calculate_exp_to_next_level(skill["level"], exp_multiplier) # type: ignore
            skill_updates_log.append(f"🎉 技能 '{skill.get('name')}' 等級提升至 {skill.get('level')}！")

    monster_to_update["skills"] = current_skills # type: ignore

    learned_new_skill_template: Optional[Skill] = None
    if random.random() < cultivation_cfg.get("new_skill_chance", 0.08): # type: ignore
        monster_elements: List[ElementTypes] = monster_to_update.get("elements", ["無"]) # type: ignore
        all_skills_db: Dict[ElementTypes, List[Skill]] = game_configs.get("skills", {}) # type: ignore

        potential_new_skills: List[Skill] = [] # type: ignore
        current_skill_names = {s.get("name") for s in current_skills}

        for el_str_learn in monster_elements:
            el_learn: ElementTypes = el_str_learn # type: ignore
            potential_new_skills.extend(all_skills_db.get(el_learn, [])) # type: ignore
        if "無" not in monster_elements:
            potential_new_skills.extend(all_skills_db.get("無", [])) # type: ignore

        learnable_skills = [s_template for s_template in potential_new_skills if s_template.get("name") not in current_skill_names]

        if learnable_skills:
            new_skill_rarity_bias = cultivation_cfg.get("new_skill_rarity_bias") # type: ignore
            learned_new_skill_template = random.choice(learnable_skills)
            skill_updates_log.append(f"🌟 怪獸領悟了新技能：'{learned_new_skill_template.get('name')}' (等級1)！") # type: ignore

    player_data["farmedMonsters"][monster_idx] = monster_to_update # type: ignore

    if save_player_data_service(player_id, player_data): # type: ignore
        return {
            "success": True,
            "monster_id": monster_id,
            "updated_monster_skills": monster_to_update.get("skills"),
            "learned_new_skill_template": learned_new_skill_template,
            "skill_updates_log": skill_updates_log,
            "message": "修煉完成！查看成果。"
        }
    else:
        services_logger.error(f"完成修煉後儲存玩家 {player_id} 資料失敗。")
        return {"success": False, "error": "完成修煉後儲存資料失敗。", "status_code": 500}


def replace_monster_skill_service(
    player_id: str,
    monster_id: str,
    slot_to_replace_index: Optional[int],
    new_skill_template_data: Skill,
    game_configs: GameConfigs,
    player_data: PlayerGameData
) -> Optional[PlayerGameData]:
    """替換或學習怪獸的技能。"""
    if not player_data or not player_data.get("farmedMonsters"):
        services_logger.error(f"替換技能失敗：找不到玩家 {player_id} 或其無怪獸。")
        return None

    monster_to_update: Optional[Monster] = None
    monster_idx = -1
    for idx, m in enumerate(player_data["farmedMonsters"]):
        if m.get("id") == monster_id:
            monster_to_update = m
            monster_idx = idx
            break

    if not monster_to_update or monster_idx == -1:
        services_logger.error(f"替換技能失敗：玩家 {player_id} 沒有 ID 為 {monster_id} 的怪獸。")
        return None

    current_skills: List[Skill] = monster_to_update.get("skills", []) # type: ignore
    max_monster_skills = game_configs.get("value_settings", {}).get("max_monster_skills", 3)

    monster_rarity_name: RarityNames = monster_to_update.get("rarity", "普通") # type: ignore
    all_rarities_db: Dict[str, RarityDetail] = game_configs.get("rarities", {}) # type: ignore
    rarity_key_lookup = {data["name"]: key for key, data in all_rarities_db.items()} # type: ignore
    monster_rarity_key = rarity_key_lookup.get(monster_rarity_name, "COMMON")
    monster_rarity_data: RarityDetail = all_rarities_db.get(monster_rarity_key, DEFAULT_GAME_CONFIGS_FOR_UTILS["rarities"]["COMMON"]) # type: ignore

    new_skill_instance = _get_skill_from_template(new_skill_template_data, game_configs, monster_rarity_data, target_level=1)

    if slot_to_replace_index is not None and 0 <= slot_to_replace_index < len(current_skills):
        services_logger.info(f"怪獸 {monster_id} 的技能槽 {slot_to_replace_index} 將被替換為 '{new_skill_instance['name']}'。")
        current_skills[slot_to_replace_index] = new_skill_instance
    elif len(current_skills) < max_monster_skills:
        services_logger.info(f"怪獸 {monster_id} 學習了新技能 '{new_skill_instance['name']}' 到新槽位。")
        current_skills.append(new_skill_instance)
    else:
        services_logger.warning(f"怪獸 {monster_id} 技能槽已滿 ({len(current_skills)}/{max_monster_skills})，無法學習新技能 '{new_skill_instance['name']}'。")
        return player_data

    monster_to_update["skills"] = current_skills # type: ignore
    player_data["farmedMonsters"][monster_idx] = monster_to_update # type: ignore

    services_logger.info(f"怪獸 {monster_id} 的技能已在服務層更新（等待路由層儲存）。")
    return player_data


# --- 戰鬥模擬服務 (核心邏輯深化) ---
def simulate_battle_service(monster1_data: Monster, monster2_data: Monster, game_configs: GameConfigs) -> Dict:
    """模擬兩隻怪獸之間的戰鬥，包含詳細技能效果和元素克制。"""
    log: List[str] = []

    m1_battle_state = copy.deepcopy(monster1_data)
    m2_battle_state = copy.deepcopy(monster2_data)

    for state in [m1_battle_state, m2_battle_state]:
        state["current_hp"] = state.get('hp', 1)
        state["current_mp"] = state.get('mp', 0)
        state["battle_statuses"] = []
        state["battle_stat_modifiers"] = {"attack":0, "defense":0, "speed":0, "crit":0, "accuracy":0, "evasion":0}

    m1_name = m1_battle_state.get('nickname', '怪獸1')
    m2_name = m2_battle_state.get('nickname', '怪獸2')

    cultivation_cfg: CultivationConfig = game_configs.get("cultivation_config", DEFAULT_GAME_CONFIGS_FOR_UTILS["cultivation_config"]) # type: ignore
    skill_exp_multiplier = cultivation_cfg.get("skill_exp_base_multiplier", 100) # type: ignore
    max_skill_level = cultivation_cfg.get("max_skill_level", 7) # type: ignore
    elemental_chart: Dict[ElementTypes, Dict[ElementTypes, float]] = game_configs.get("elemental_advantage_chart", DEFAULT_GAME_CONFIGS_FOR_UTILS["elemental_advantage_chart"]) # type: ignore

    log.append(f"⚔️ 戰鬥開始！ {m1_name} (HP: {m1_battle_state['current_hp']}/{m1_battle_state.get('initial_max_hp',100)}, MP: {m1_battle_state['current_mp']}/{m1_battle_state.get('initial_max_mp',50)}) vs {m2_name} (HP: {m2_battle_state['current_hp']}/{m2_battle_state.get('initial_max_hp',100)}, MP: {m2_battle_state['current_mp']}/{m2_battle_state.get('initial_max_mp',50)}) ⚔️")
    turn = 0
    max_turns = game_configs.get("value_settings", {}).get("max_battle_turns", 30)

    current_attacker_state: Dict[str, Any] = {}
    current_defender_state: Dict[str, Any] = {}

    m1_eff_speed = m1_battle_state.get('speed', 0) + m1_battle_state["battle_stat_modifiers"]["speed"]
    m2_eff_speed = m2_battle_state.get('speed', 0) + m2_battle_state["battle_stat_modifiers"]["speed"]

    if m1_eff_speed >= m2_eff_speed:
        current_attacker_state, current_defender_state = m1_battle_state, m2_battle_state
    else:
        current_attacker_state, current_defender_state = m2_battle_state, m1_battle_state
    log.append(f"{current_attacker_state.get('nickname')} 速度較快 ({m1_eff_speed if current_attacker_state.get('id') == m1_battle_state.get('id') else m2_eff_speed} vs {m2_eff_speed if current_attacker_state.get('id') == m1_battle_state.get('id') else m1_eff_speed})，先攻！")

    m1_skill_exp_gains: Dict[str, int] = {}
    m2_skill_exp_gains: Dict[str, int] = {}

    while current_attacker_state["current_hp"] > 0 and current_defender_state["current_hp"] > 0 and turn < max_turns:
        turn += 1
        attacker_nickname = current_attacker_state.get('nickname', '攻擊方')
        defender_nickname = current_defender_state.get('nickname', '防禦方')
        log.append(f"--- 回合 {turn}: {attacker_nickname} 的回合 (HP:{current_attacker_state['current_hp']}, MP:{current_attacker_state['current_mp']}) ---")

        active_statuses_next_turn_attacker = []
        for status in list(current_attacker_state.get("battle_statuses", [])):
            status_log_msg = ""
            if status.get("type") == "dot":
                dot_damage = status.get("damage_per_turn", 0)
                current_attacker_state["current_hp"] = max(0, current_attacker_state["current_hp"] - dot_damage)
                status_log_msg = f"{attacker_nickname} 因 {status.get('effect_id', '持續傷害')} 受到了 {dot_damage} 點傷害。"
            elif status.get("type") == "heal_over_time":
                hot_heal = status.get("amount_per_turn", 0)
                max_hp = current_attacker_state.get("initial_max_hp", current_attacker_state["current_hp"] + hot_heal)
                current_attacker_state["current_hp"] = min(max_hp, current_attacker_state["current_hp"] + hot_heal)
                status_log_msg = f"{attacker_nickname} 因 {status.get('effect_id', '持續治療')} 恢復了 {hot_heal} 點HP。"

            if status_log_msg: log.append(status_log_msg)
            if current_attacker_state["current_hp"] <= 0: break

            status["duration"] = status.get("duration", 1) - 1
            if status["duration"] > 0:
                active_statuses_next_turn_attacker.append(status)
            else:
                log.append(f"{attacker_nickname} 的 {status.get('effect_id', '某效果')} 結束了。")
                if status.get("effect_type") in ["buff", "debuff", "stat_modifier"]:
                    stat_affected = status.get("stat")
                    amount_changed = status.get("amount", 0)
                    if isinstance(stat_affected, str) and isinstance(amount_changed, int) and stat_affected in current_attacker_state["battle_stat_modifiers"]:
                         current_attacker_state["battle_stat_modifiers"][stat_affected] -= amount_changed
        current_attacker_state["battle_statuses"] = active_statuses_next_turn_attacker
        if current_attacker_state["current_hp"] <= 0:
            log.append(f"倒下了！ {attacker_nickname} 被狀態擊倒！")
            break

        can_act = True
        for status in current_attacker_state.get("battle_statuses", []):
            if status.get("type") == "stun":
                log.append(f"{attacker_nickname} 處於 {status.get('effect_id', '暈眩')} 狀態，無法行動！")
                can_act = False; break
            if status.get("type") == "confusion":
                if random.random() < status.get("chance_to_self_harm", 0.5):
                    confusion_damage = int(current_attacker_state.get("attack", 10) * 0.5)
                    current_attacker_state["current_hp"] = max(0, current_attacker_state["current_hp"] - confusion_damage)
                    log.append(f"{attacker_nickname} 陷入混亂，攻擊了自己，受到了 {confusion_damage} 點傷害！")
                    can_act = False; break

        if not can_act and current_attacker_state["current_hp"] <= 0:
            log.append(f"倒下了！ {attacker_nickname} 因混亂攻擊自己而倒下！")
            break
        if not can_act:
            current_attacker_state, current_defender_state = current_defender_state, current_attacker_state
            continue

        attacker_skills: List[Skill] = current_attacker_state.get('skills', []) # type: ignore
        chosen_skill: Optional[Skill] = None

        if attacker_skills:
            personality: Optional[Personality] = current_attacker_state.get("personality") # type: ignore
            skill_preferences: Dict[SkillCategory, float] = personality.get("skill_preferences", {}) if personality else {} # type: ignore

            available_skills_for_mp = [s for s in attacker_skills if current_attacker_state["current_mp"] >= s.get("mp_cost", 0)]

            if available_skills_for_mp:
                weighted_skills: List[Tuple[Skill, float]] = []
                for s in available_skills_for_mp:
                    weight = s.get("probability", 50) / 100.0
                    s_category: Optional[SkillCategory] = s.get("skill_category") # type: ignore
                    if s_category and skill_preferences and s_category in skill_preferences:
                        weight *= skill_preferences[s_category] # type: ignore
                    weighted_skills.append((s, max(0.01, weight)))

                if weighted_skills:
                    total_weight = sum(w for _, w in weighted_skills)
                    if total_weight > 0:
                        r_select = random.uniform(0, total_weight)
                        upto = 0
                        for s_choice, w_choice in weighted_skills:
                            if upto + w_choice >= r_select:
                                chosen_skill = s_choice
                                break
                            upto += w_choice
                    if not chosen_skill:
                        chosen_skill = random.choice(available_skills_for_mp)
            else:
                log.append(f"{attacker_nickname} MP不足！")
                chosen_skill = {"name": "掙扎", "power": 5, "crit": 0, "type": "無", "probability": 100, "baseLevel": 1, "mp_cost": 0, "skill_category":"物理", "story":"它因MP耗盡而無力地掙扎了一下。"} # type: ignore

        if not chosen_skill:
            chosen_skill = {"name": "普通攻擊", "power": 10, "crit": 5, "type": "無", "probability": 100, "baseLevel": 1, "mp_cost": 0, "skill_category":"物理", "story":"發動了一次樸實無華的普通攻擊。"} # type: ignore

        skill_name = chosen_skill.get('name', '普通攻擊')
        skill_power = chosen_skill.get('power', 0)
        skill_crit_chance = chosen_skill.get('crit', 5)
        skill_type: ElementTypes = chosen_skill.get('type', '無') # type: ignore
        mp_cost = chosen_skill.get('mp_cost', 0)
        skill_story_template = chosen_skill.get('story', f"{attacker_nickname} 使用了 [{skill_name}]！")
        skill_effect_data = chosen_skill

        if current_attacker_state["current_mp"] >= mp_cost:
            current_attacker_state["current_mp"] -= mp_cost
            if mp_cost > 0: log.append(f"{attacker_nickname} 消耗了 {mp_cost} MP。")

            log_message_action = skill_story_template.replace("{attacker_name}", attacker_nickname).replace("{target_name}", defender_nickname)

            is_hit = True
            if skill_effect_data.get("effect") != "always_hit":
                eff_accuracy_attacker = 100 + current_attacker_state["battle_stat_modifiers"]["accuracy"]
                eff_evasion_defender = current_defender_state.get("battle_stat_modifiers", {}).get("evasion", 0)
                hit_roll_chance = max(5, min(95, eff_accuracy_attacker - eff_evasion_defender))
                if random.random() * 100 > hit_roll_chance:
                    is_hit = False
                    log.append(f"{log_message_action} ...但是攻擊沒有命中！")

            if is_hit:
                log.append(log_message_action)
                damage = 0
                if skill_power > 0:
                    eff_attack = current_attacker_state.get('attack', 0) + current_attacker_state["battle_stat_modifiers"]["attack"]
                    eff_defense = current_defender_state.get('defense', 0) + current_defender_state["battle_stat_modifiers"]["defense"]

                    base_damage = skill_power + eff_attack
                    damage_multiplier = 1.0

                    defender_elements: List[ElementTypes] = current_defender_state.get("elements", ["無"]) # type: ignore
                    attacker_skill_el: ElementTypes = skill_type

                    if attacker_skill_el in elemental_chart:
                        for def_el in defender_elements:
                            damage_multiplier *= elemental_chart[attacker_skill_el].get(def_el, 1.0) # type: ignore

                    defender_resistances: Dict[ElementTypes, int] = current_defender_state.get("resistances", {}) # type: ignore
                    resistance_val = defender_resistances.get(attacker_skill_el, 0)
                    if resistance_val > 0: damage_multiplier *= (1 - (resistance_val / 100.0))
                    elif resistance_val < 0: damage_multiplier *= (1 + (abs(resistance_val) / 100.0))

                    if damage_multiplier > 1.3: log.append("效果絕佳！")
                    elif damage_multiplier < 0.7 and damage_multiplier > 0: log.append("效果不太好...")
                    elif damage_multiplier <= 0.1: log.append("幾乎沒有效果！"); damage_multiplier = 0.1

                    damage = (base_damage - eff_defense) * damage_multiplier

                    eff_crit_attacker = current_attacker_state.get('crit', 5) + current_attacker_state["battle_stat_modifiers"]["crit"]
                    is_crit = random.random() * 100 < (eff_crit_attacker + skill_crit_chance)
                    if is_crit:
                        damage = int(damage * 1.5)
                        log.append(f"致命一擊！💥")

                    damage = max(1 if skill_power > 0 else 0, int(damage))

                    defender_hp_before_attack = current_defender_state["current_hp"]
                    current_defender_state["current_hp"] = max(0, current_defender_state["current_hp"] - damage)
                    log.append(f"{defender_nickname} 受到了 {damage} 點傷害。HP: {defender_hp_before_attack} -> {current_defender_state['current_hp']}")

                effect_type = skill_effect_data.get("effect")
                effect_chance = skill_effect_data.get("chance", 100)

                if effect_type and (random.random() * 100 < effect_chance):
                    target_state = current_defender_state
                    effect_target_name = defender_nickname
                    if skill_effect_data.get("target") == "self":
                        target_state = current_attacker_state
                        effect_target_name = attacker_nickname

                    stat_to_mod = skill_effect_data.get("stat")
                    amount = skill_effect_data.get("amount")
                    duration = skill_effect_data.get("duration", 1)
                    effect_id_base = f"{skill_name}_{effect_type}_{turn}_{int(time.time()*1000%10000)}"

                    if effect_type in ["buff", "debuff", "stat_modifier"]:
                        stats_to_change: List[str] = []
                        amounts_to_change: List[int] = []
                        if effect_type == "all_stats_buff" or effect_type == "all_stats_debuff":
                            stats_to_change = ["attack", "defense", "speed", "crit", "accuracy", "evasion"]
                            amounts_to_change = [amount] * len(stats_to_change) if isinstance(amount, int) else amount or [] # type: ignore
                        elif isinstance(stat_to_mod, str) and isinstance(amount, int):
                            stats_to_change, amounts_to_change = [stat_to_mod], [amount]
                        elif isinstance(stat_to_mod, list) and isinstance(amount, list) and len(stat_to_mod) == len(amount):
                            stats_to_change, amounts_to_change = stat_to_mod, amount # type: ignore

                        for i, stat_name_eff in enumerate(stats_to_change):
                            if stat_name_eff in target_state["battle_stat_modifiers"]:
                                actual_amount_eff = amounts_to_change[i]
                                target_state["battle_stat_modifiers"][stat_name_eff] += actual_amount_eff
                                log.append(f"{effect_target_name} 的 {stat_name_eff} {'提升' if actual_amount_eff > 0 else '降低'}了 {abs(actual_amount_eff)}點！(持續{duration}回合)")
                                target_state["battle_statuses"].append({
                                    "id":f"{effect_id_base}_{stat_name_eff}", "effect_id": skill_name,
                                    "type": "stat_modifier", "effect_type": effect_type,
                                    "stat": stat_name_eff, "amount": actual_amount_eff,
                                    "duration": duration, "source_skill": skill_name
                                })

                    elif effect_type in ["dot", "poison", "strong_poison", "burned"]:
                        dot_dmg = skill_effect_data.get("damage", skill_effect_data.get("damage_per_turn", 5)) # type: ignore
                        target_state["battle_statuses"].append({
                            "id":effect_id_base, "effect_id": skill_name, "type": "dot",
                            "damage_per_turn": dot_dmg, "duration": duration, "source_skill": skill_name
                        })
                        log.append(f"{effect_target_name} 陷入了 {skill_name} 的 {effect_type} 狀態！")

                    elif effect_type in ["heal", "heal_large"]:
                        heal_val = skill_effect_data.get("amount", 30) # type: ignore
                        max_hp_t = target_state.get("initial_max_hp", target_state["current_hp"] + heal_val)
                        healed_amount = min(max_hp_t - target_state["current_hp"], heal_val) # type: ignore
                        target_state["current_hp"] = min(max_hp_t, target_state["current_hp"] + heal_val) # type: ignore
                        log.append(f"{effect_target_name} 恢復了 {healed_amount} 點HP！")

                    elif effect_type in ["stun", "paralyzed", "frozen"]:
                        target_state["battle_statuses"].append({
                            "id":effect_id_base, "effect_id": skill_name, "type": "stun",
                            "duration": duration, "source_skill": skill_name
                        })
                        log.append(f"{effect_target_name} 陷入了 {skill_name} 的 {effect_type} 狀態！")

                    elif effect_type == "confusion":
                        target_state["battle_statuses"].append({
                            "id":effect_id_base, "effect_id": skill_name, "type": "confusion",
                            "duration": duration, "chance_to_self_harm": skill_effect_data.get("confusion_chance", 0.5),
                            "source_skill": skill_name
                        })
                        log.append(f"{effect_target_name} 陷入了 {skill_name} 的混亂狀態！")

                    elif effect_type == "leech":
                        leech_amount = int(damage * skill_effect_data.get("amount", 0.5)) # type: ignore
                        if leech_amount > 0:
                            max_hp_attacker = current_attacker_state.get("initial_max_hp", current_attacker_state["current_hp"] + leech_amount)
                            current_attacker_state["current_hp"] = min(max_hp_attacker, current_attacker_state["current_hp"] + leech_amount)
                            log.append(f"{attacker_nickname} 從 {defender_nickname} 身上吸取了 {leech_amount} 點生命！")

                    elif effect_type == "recoil":
                        recoil_dmg = int(damage * skill_effect_data.get("recoilDamage", 0.25)) # type: ignore
                        if recoil_dmg > 0:
                            current_attacker_state["current_hp"] = max(0, current_attacker_state["current_hp"] - recoil_dmg)
                            log.append(f"{attacker_nickname} 因使用 {skill_name} 的反作用力受到了 {recoil_dmg} 點傷害！")

                    elif effect_type == "self_ko_enemy_ko":
                        log.append(f"{attacker_nickname} 使用了禁忌的 {skill_name}！與 {defender_nickname} 同歸於盡！")
                        current_attacker_state["current_hp"] = 0
                        current_defender_state["current_hp"] = 0

                exp_gained_for_skill = random.randint(10, 30)
                if current_attacker_state.get("id") == m1_battle_state.get("id"):
                    m1_skill_exp_gains[skill_name] = m1_skill_exp_gains.get(skill_name, 0) + exp_gained_for_skill
                else:
                    m2_skill_exp_gains[skill_name] = m2_skill_exp_gains.get(skill_name, 0) + exp_gained_for_skill
        else:
            log.append(f"{attacker_nickname} 嘗試使用 [{skill_name}] 但MP不足！只能進行普通攻擊。")
            damage = max(1, int(current_attacker_state.get('attack',5) / 2 - current_defender_state.get('defense',5)))
            defender_hp_before_attack = current_defender_state["current_hp"]
            current_defender_state["current_hp"] = max(0, current_defender_state["current_hp"] - damage)
            log.append(f"{attacker_nickname} 無力地攻擊，對 {defender_nickname} 造成了 {damage} 點傷害。HP: {defender_hp_before_attack} -> {current_defender_state['current_hp']}")

        if current_defender_state["current_hp"] <= 0:
            log.append(f"倒下了！ {defender_nickname} 被擊倒了！")
            break
        if current_attacker_state["current_hp"] <= 0:
            log.append(f"倒下了！ {attacker_nickname} 因反傷或自身效果倒下！")
            break

        current_attacker_state, current_defender_state = current_defender_state, current_attacker_state

    m1_final_hp = m1_battle_state["current_hp"]
    m1_final_mp = m1_battle_state["current_mp"]
    m2_final_hp = m2_battle_state["current_hp"]
    m2_final_mp = m2_battle_state["current_mp"]

    winner_id: Optional[str] = None
    loser_id: Optional[str] = None

    if m1_final_hp <= 0 and m2_final_hp > 0:
        log.append(f"� {m2_name} 獲勝！")
        winner_id = monster2_data.get('id')
        loser_id = monster1_data.get('id')
    elif m2_final_hp <= 0 and m1_final_hp > 0:
        log.append(f"🏆 {m1_name} 獲勝！")
        winner_id = monster1_data.get('id')
        loser_id = monster2_data.get('id')
    else:
        log.append(f"🤝 戰鬥結束，平手或回合耗盡！")

    battle_monster1_updated_skills = copy.deepcopy(monster1_data.get("skills", []))
    battle_monster2_updated_skills = copy.deepcopy(monster2_data.get("skills", []))

    for skill_list, exp_gains, owner_name_log in [
        (battle_monster1_updated_skills, m1_skill_exp_gains, m1_name),
        (battle_monster2_updated_skills, m2_skill_exp_gains, m2_name)
    ]:
        for skill_name_exp, exp_val in exp_gains.items():
            for skill_obj in skill_list: # type: ignore
                if skill_obj.get("name") == skill_name_exp:
                    current_lvl = skill_obj.get("level", 1)
                    if current_lvl < max_skill_level: # type: ignore
                        skill_obj["current_exp"] = skill_obj.get("current_exp", 0) + exp_val
                        while skill_obj.get("level",1) < max_skill_level and \
                              skill_obj.get("current_exp",0) >= skill_obj.get("exp_to_next_level", _calculate_exp_to_next_level(skill_obj.get("level",1), skill_exp_multiplier)): # type: ignore

                            needed_exp = skill_obj.get("exp_to_next_level",9999) # type: ignore
                            skill_obj["current_exp"] -= needed_exp # type: ignore
                            skill_obj["level"] = skill_obj.get("level",1) + 1 # type: ignore
                            skill_obj["exp_to_next_level"] = _calculate_exp_to_next_level(skill_obj["level"], skill_exp_multiplier) # type: ignore
                            log.append(f"戰後技能升級: {owner_name_log} 的 [{skill_name_exp}] 升至 {skill_obj['level']}級！")
                    break

    return {
        "log": log,
        "winner_id": winner_id,
        "loser_id": loser_id,
        "monster1_final_hp": m1_final_hp,
        "monster1_final_mp": m1_final_mp,
        "monster1_updated_skills": battle_monster1_updated_skills,
        "monster2_final_hp": m2_final_hp,
        "monster2_final_mp": m2_final_mp,
        "monster2_updated_skills": battle_monster2_updated_skills,
        "turns_taken": turn
    }

# --- 排行榜與玩家搜尋服務 ---
def get_monster_leaderboard_service(game_configs: GameConfigs, top_n: int = 10) -> List[Monster]:
    """獲取怪獸排行榜。"""
    if not db:
        services_logger.error("Firestore未初始化 (get_monster_leaderboard_service)。")
        return []

    all_monsters: List[Monster] = []
    try:
        users_ref = db.collection('users')
        for user_doc in users_ref.stream(): # 注意：這會讀取所有用戶，效能問題
            game_data_doc_ref = user_doc.reference.collection('gameData').document('main')
            game_data_doc = game_data_doc_ref.get()
            if game_data_doc.exists:
                player_game_data = game_data_doc.to_dict()
                if player_game_data and player_game_data.get("farmedMonsters"):
                    for monster_dict in player_game_data["farmedMonsters"]:
                        monster_dict["owner_nickname"] = player_game_data.get("nickname", user_doc.id) # type: ignore
                        monster_dict["owner_id"] = user_doc.id # type: ignore
                        all_monsters.append(monster_dict) # type: ignore

        npc_monsters_templates: List[Monster] = game_configs.get("npc_monsters", []) # type: ignore
        if npc_monsters_templates:
            all_monsters.extend(copy.deepcopy(npc_monsters_templates))

        all_monsters.sort(key=lambda m: m.get("score", 0), reverse=True)
        return all_monsters[:top_n]
    except Exception as e:
        services_logger.error(f"獲取怪獸排行榜時發生錯誤: {e}", exc_info=True)
        return []

def get_player_leaderboard_service(game_configs: GameConfigs, top_n: int = 10) -> List[PlayerStats]:
    """獲取玩家排行榜。"""
    if not db:
        services_logger.error("Firestore未初始化 (get_player_leaderboard_service)。")
        return []

    all_player_stats: List[PlayerStats] = []
    try:
        users_ref = db.collection('users')
        for user_doc in users_ref.stream(): # 注意：效能問題
            game_data_doc_ref = user_doc.reference.collection('gameData').document('main')
            game_data_doc = game_data_doc_ref.get()
            if game_data_doc.exists:
                player_game_data = game_data_doc.to_dict()
                if player_game_data and player_game_data.get("playerStats"):
                    stats: PlayerStats = player_game_data["playerStats"] # type: ignore
                    if "nickname" not in stats or not stats["nickname"]:
                        stats["nickname"] = player_game_data.get("nickname", user_doc.id) # type: ignore
                    all_player_stats.append(stats)

        all_player_stats.sort(key=lambda ps: ps.get("score", 0), reverse=True)
        return all_player_stats[:top_n]
    except Exception as e:
        services_logger.error(f"獲取玩家排行榜時發生錯誤: {e}", exc_info=True)
        return []

def search_players_service(nickname_query: str, limit: int = 10) -> List[Dict[str, str]]:
    """根據暱稱搜尋玩家。"""
    if not db:
        services_logger.error("Firestore未初始化 (search_players_service)。")
        return []
    if not nickname_query:
        return []

    results: List[Dict[str, str]] = []
    try:
        # 修正：使用正確的 firestore.FieldFilter
        query_ref = db.collection('users').where(
            filter=firestore.FieldFilter('nickname', '>=', nickname_query)
        ).where(
            filter=firestore.FieldFilter('nickname', '<=', nickname_query + '\uf8ff')
        ).limit(limit)

        docs = query_ref.stream()
        for doc in docs:
            user_data = doc.to_dict()
            if user_data and user_data.get("nickname"):
                results.append({"uid": doc.id, "nickname": user_data["nickname"]})
        return results
    except Exception as e:
        services_logger.error(f"搜尋玩家時發生錯誤 (query: '{nickname_query}'): {e}", exc_info=True)
        # 檢查是否為索引錯誤
        error_str = str(e).lower()
        if "index" in error_str and ("ensure" in error_str or "required" in error_str or "missing" in error_str):
            services_logger.error(
                "Firestore 搜尋玩家缺少必要的索引。請檢查 Firestore 控制台的索引建議，"
                "通常需要為 'users' 集合的 'nickname' 欄位建立升序索引。"
            )
        return []


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    services_logger.info("正在測試 MD_services.py 中的函式...")

    mock_game_configs_for_battle: GameConfigs = {
        "dna_fragments": [],
        "rarities": DEFAULT_GAME_CONFIGS_FOR_UTILS["rarities"], # type: ignore
        "skills": { # type: ignore
            "火": [
                {"name": "烈焰衝擊", "power": 40, "crit": 10, "probability":70, "type": "火", "baseLevel": 2, "mp_cost": 10, "skill_category":"魔法", "story":"一道強勁的火焰衝向{target_name}！"},
                {"name": "火焰護盾", "power": 0, "crit": 0, "probability":30, "type": "火", "baseLevel": 2, "mp_cost": 15, "skill_category":"輔助", "effect":"buff", "stat":"defense", "amount":20, "duration":3, "target":"self", "story":"{attacker_name}周身燃起火焰護盾！"}
            ],
            "水": [ # type: ignore
                {"name": "水療術", "power": 0, "crit": 0, "probability":50, "type": "水", "baseLevel": 2, "mp_cost": 12, "skill_category":"輔助", "effect":"heal", "amount":50, "target":"self", "story":"{attacker_name}被溫和的水流治癒了。"},
                {"name": "毒液噴射", "power": 10, "crit": 0, "probability":50, "type": "毒", "baseLevel": 1, "mp_cost": 8, "skill_category":"特殊", "effect":"dot", "damage_per_turn":8, "duration":3, "chance":80, "story":"{attacker_name}向{target_name}噴出毒液！"}
            ],
            "無": DEFAULT_GAME_CONFIGS_FOR_UTILS["skills"]["無"] # type: ignore
        },
        "personalities": DEFAULT_GAME_CONFIGS_FOR_UTILS["personalities"], # type: ignore
        "titles": DEFAULT_GAME_CONFIGS_FOR_UTILS["titles"], # type: ignore
        "health_conditions": [], "newbie_guide": [], "npc_monsters": [],
        "value_settings": DEFAULT_GAME_CONFIGS_FOR_UTILS["value_settings"], # type: ignore
        "absorption_config": DEFAULT_GAME_CONFIGS_FOR_UTILS["absorption_config"], # type: ignore
        "cultivation_config": DEFAULT_GAME_CONFIGS_FOR_UTILS["cultivation_config"], # type: ignore
        "elemental_advantage_chart": DEFAULT_GAME_CONFIGS_FOR_UTILS["elemental_advantage_chart"], # type: ignore
        "naming_constraints": DEFAULT_GAME_CONFIGS_FOR_UTILS["naming_constraints"], # type: ignore
        "monster_achievements_list": DEFAULT_GAME_CONFIGS_FOR_UTILS["monster_achievements_list"], # type: ignore
        "element_nicknames": DEFAULT_GAME_CONFIGS_FOR_UTILS["element_nicknames"] # type: ignore
    }

    test_monster_A_skills: List[Skill] = copy.deepcopy(mock_game_configs_for_battle["skills"]["火"]) # type: ignore
    test_monster_A: Monster = {
        "id": "m_A_test", "nickname": "烈焰測試者", "elements": ["火"], "elementComposition": {"火":100},
        "hp": 150, "mp": 70, "initial_max_hp":150, "initial_max_mp":70,
        "attack":30, "defense":20, "speed":25, "crit":10,
        "skills":test_monster_A_skills, "rarity":"稀有", "description":"測試用火系怪獸A",
        "personality":mock_game_configs_for_battle["personalities"][0], # type: ignore
        "creationTime":int(time.time()),
        "farmStatus":{"active":False,"isBattling":True,"isTraining":False,"completed":False, "boosts": {}},
        "resistances":{"水":-10, "木": 20}, "score": 200, "resume": {"wins":0, "losses":0}
    }

    test_monster_B_skills: List[Skill] = copy.deepcopy(mock_game_configs_for_battle["skills"]["水"]) # type: ignore
    test_monster_B: Monster = {
        "id": "m_B_test", "nickname": "深水測試員", "elements": ["水"], "elementComposition": {"水":100},
        "hp": 180, "mp": 60, "initial_max_hp":180, "initial_max_mp":60,
        "attack":20, "defense":35, "speed":15, "crit":5,
        "skills":test_monster_B_skills, "rarity":"稀有", "description":"測試用水系怪獸B",
        "personality":mock_game_configs_for_battle["personalities"][0], # type: ignore
        "creationTime":int(time.time()),
        "farmStatus":{"active":False,"isBattling":False,"isTraining":False,"completed":False, "boosts": {}},
        "resistances":{"火":-10, "木": -20}, "score": 210, "resume": {"wins":0, "losses":0}
    }

    services_logger.info("\n--- 測試深化後的戰鬥模擬服務 ---")
    battle_outcome = simulate_battle_service(test_monster_A, test_monster_B, mock_game_configs_for_battle)

    print("\n詳細戰鬥日誌:")
    for entry in battle_outcome.get("log", []):
        print(entry)
    print(f"\n戰鬥結果: 勝者ID - {battle_outcome.get('winner_id')}")
    print(f"  {test_monster_A['nickname']} 最終HP: {battle_outcome.get('monster1_final_hp')}, 最終MP: {battle_outcome.get('monster1_final_mp')}")
    print(f"  {test_monster_B['nickname']} 最終HP: {battle_outcome.get('monster2_final_hp')}, 最終MP: {battle_outcome.get('monster2_final_mp')}")
    print(f"  {test_monster_A['nickname']} 更新後技能狀態: {battle_outcome.get('monster1_updated_skills')}")
    print(f"  {test_monster_B['nickname']} 更新後技能狀態: {battle_outcome.get('monster2_updated_skills')}")

    services_logger.info("MD_services.py 測試完畢（部分功能需要通過API路由進行集成測試）。")