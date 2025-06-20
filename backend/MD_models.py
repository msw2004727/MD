# MD_models.py
# 定義「怪獸養成」遊戲的資料結構與模型
# 使用 typing.TypedDict 以增強程式碼清晰度並支援潛在的靜態分析

from typing import List, Dict, Optional, TypedDict, NotRequired, Union, Literal, Tuple, Any

# --- 基本類型定義 ---
ElementTypes = Literal[
    "火", "水", "木", "金", "土", "光", "暗", "毒", "風", "無", "混"
]
RarityNames = Literal["普通", "稀有", "菁英", "傳奇", "神話"]
SkillCategory = Literal["近戰", "遠程", "魔法", "輔助", "物理", "特殊", "變化", "其他"]
BattleLogStyle = Literal["嚴肅", "幽默", "武俠", "科幻", "驚悚", "獵奇"]

# --- 註記與聊天項目結構 ---
class NoteEntry(TypedDict):
    timestamp: int
    content: str

class ChatHistoryEntry(TypedDict):
    role: Literal["user", "assistant"]
    content: str

# --- 設定檔模型 ---

class DNAFragment(TypedDict):
    id: str
    name: str
    type: ElementTypes
    attack: int
    defense: int
    speed: int
    hp: int
    mp: int
    crit: int
    description: str
    rarity: RarityNames
    resistances: NotRequired[Dict[ElementTypes, int]]
    baseId: NotRequired[str]

class RarityDetail(TypedDict):
    name: RarityNames
    textVarKey: str
    statMultiplier: float
    skillLevelBonus: int
    resistanceBonus: int
    value_factor: NotRequired[int]

# --- 【修改】修正命名與定義順序 ---
class SkillEffect(TypedDict):
    """技能效果的統一模型"""
    type: NotRequired[Literal["damage", "leech", "apply_status", "stat_change", "special", "heal"]]
    power: NotRequired[int]
    target: NotRequired[Literal["self", "opponent_single", "opponent_all", "team_allies", "team_single", "all", "random"]]
    stat: NotRequired[Union[str, List[str]]]
    amount: NotRequired[Union[int, float, List[Union[int, float]]]]
    is_multiplier: NotRequired[Union[bool, List[bool]]]
    chance: NotRequired[float]
    duration: NotRequired[int]
    status_id: NotRequired[str]
    special_logic_id: NotRequired[str]
    log_success: NotRequired[str]
    leech_percentage: NotRequired[int]
    heal_amount: NotRequired[int]
    heal_percentage: NotRequired[float]
    crit_chance_modifier: NotRequired[int]
    recoil_factor: NotRequired[float]

class SkillPhase(TypedDict):
    """多回合技能的階段模型"""
    turn: int
    effects: List[SkillEffect]
    log: str

class Skill(TypedDict):
    """技能模型"""
    name: str
    description: NotRequired[str]
    type: ElementTypes
    rarity: NotRequired[RarityNames]
    skill_category: NotRequired[SkillCategory]
    mp_cost: NotRequired[int]
    priority: NotRequired[int]
    accuracy: NotRequired[Union[int, Literal["auto"]]]
    effects: NotRequired[List[SkillEffect]]
    phases: NotRequired[List[SkillPhase]]
    level_milestones: NotRequired[Dict[str, Any]]
    baseLevel: NotRequired[int]
    level: NotRequired[int]
    current_exp: NotRequired[int]
    exp_to_next_level: NotRequired[int]
    is_active: NotRequired[bool] # 新增：技能開關狀態
    # 舊版相容性欄位
    story: NotRequired[str]
    power: NotRequired[int]
    crit: NotRequired[int]
    probability: NotRequired[int]
    stat: NotRequired[Union[str, List[str]]]
    amount: NotRequired[Union[int, List[int]]]
    damage: NotRequired[int]
    recoilDamage: NotRequired[float]
    effect: NotRequired[str]
    effect_target: NotRequired[Literal["self", "opponent"]]

class Personality(TypedDict):
    name: str
    description: str
    colorDark: str
    colorLight: str
    skill_preferences: NotRequired[Dict[SkillCategory, float]]

class HealthConditionEffect(TypedDict):
    hp_per_turn: NotRequired[int]
    attack: NotRequired[int]
    speed: NotRequired[int]
    accuracy: NotRequired[int]

class HealthCondition(TypedDict):
    id: str
    name: str
    description: str
    icon: NotRequired[str]
    duration_turns: NotRequired[Union[int, str]]
    real_time_effect: NotRequired[str]
    effects: HealthConditionEffect
    chance_to_skip_turn: NotRequired[float]
    confusion_chance: NotRequired[float]
    elemental_vulnerability: NotRequired[Dict[ElementTypes, float]]
    blocks_skill_category: NotRequired[SkillCategory]
    blocks_all_actions: NotRequired[bool]
    immunities: NotRequired[List[str]]

class NewbieGuideEntry(TypedDict):
    title: str
    content: str

# --- 遊戲核心設定子模型 ---
class AbsorptionConfig(TypedDict):
    base_stat_gain_factor: float
    score_diff_exponent: float
    max_stat_gain_percentage: float
    min_stat_gain: int
    dna_extraction_chance_base: float
    dna_extraction_rarity_modifier: Dict[RarityNames, float]

class CultivationConfig(TypedDict):
    skill_exp_base_multiplier: int
    new_skill_chance: float
    skill_exp_gain_range: Tuple[int, int]
    max_skill_level: int
    new_skill_rarity_bias: NotRequired[Dict[RarityNames, float]]
    stat_growth_weights: NotRequired[Dict[str, int]]
    stat_growth_duration_divisor: NotRequired[int]
    dna_find_chance: NotRequired[float]
    dna_find_duration_divisor: NotRequired[int]
    dna_find_loot_table: NotRequired[Dict[RarityNames, Dict[RarityNames, float]]]
    location_biases: NotRequired[Dict[str, Dict[str, Any]]]

class ValueSettings(TypedDict):
    element_value_factors: Dict[ElementTypes, float]
    dna_recharge_conversion_factor: float
    max_farm_slots: NotRequired[int]
    max_monster_skills: NotRequired[int]
    max_battle_turns: NotRequired[int]
    max_inventory_slots: NotRequired[int]
    max_temp_backpack_slots: NotRequired[int]
    max_cultivation_time_seconds: NotRequired[int]
    starting_gold: NotRequired[int]
    crit_multiplier: NotRequired[float]

class NamingConstraints(TypedDict):
    max_player_title_len: int
    max_monster_achievement_len: int
    max_element_nickname_len: int
    max_monster_full_nickname_len: int

# --- 玩家及怪獸資料模型 ---
class MonsterInteractionStats(TypedDict):
    chat_count: NotRequired[int]
    cultivation_count: NotRequired[int]
    touch_count: NotRequired[int]
    heal_count: NotRequired[int]
    near_death_count: NotRequired[int]
    feed_count: NotRequired[int]
    gift_count: NotRequired[int]
    bond_level: NotRequired[int]
    bond_points: NotRequired[int]
    last_touch_timestamp: NotRequired[int]
    touch_count_in_window: NotRequired[int]
    last_chat_timestamp: NotRequired[int]
    chat_count_in_window: NotRequired[int]
    last_heal_timestamp: NotRequired[int]
    heal_count_in_window: NotRequired[int]
    last_cultivation_timestamp: NotRequired[int]
    cultivation_count_in_window: NotRequired[int]

class MonsterFarmStatus(TypedDict):
    active: bool
    completed: bool
    isBattling: bool
    isTraining: bool
    trainingLocation: NotRequired[Optional[str]]
    trainingStartTime: NotRequired[Optional[int]]
    trainingDuration: NotRequired[Optional[int]]
    boosts: NotRequired[Dict[str, int]]

class MonsterActivityLogEntry(TypedDict):
    time: str
    message: str

class MonsterAIDetails(TypedDict):
    aiPersonality: str
    aiIntroduction: str
    aiEvaluation: str

class MonsterResume(TypedDict):
    wins: int
    losses: int

class Monster(TypedDict):
    id: str
    nickname: str
    player_title_part: NotRequired[str]
    achievement_part: NotRequired[str]
    element_nickname_part: NotRequired[str]
    elements: List[ElementTypes]
    elementComposition: Dict[ElementTypes, float]
    hp: int
    mp: int
    current_hp: NotRequired[int]
    current_mp: NotRequired[int]
    initial_max_hp: int
    initial_max_mp: int
    attack: int
    defense: int
    speed: int
    crit: int
    skills: List[Skill]
    rarity: RarityNames
    title: NotRequired[str]
    custom_element_nickname: NotRequired[str]
    description: str
    personality: Personality
    aiPersonality: NotRequired[str]
    aiIntroduction: NotRequired[str]
    aiEvaluation: NotRequired[str]
    creationTime: int
    monsterTitles: NotRequired[List[str]]
    monsterMedals: NotRequired[int]
    farmStatus: MonsterFarmStatus
    activityLog: NotRequired[List[MonsterActivityLogEntry]]
    healthConditions: NotRequired[List[HealthCondition]]
    resistances: Dict[ElementTypes, int]
    score: NotRequired[int]
    isNPC: NotRequired[bool]
    baseId: NotRequired[str]
    resume: NotRequired[MonsterResume]
    constituent_dna_ids: NotRequired[List[str]]
    cultivation_gains: NotRequired[Dict[str, int]]
    monsterNotes: NotRequired[List[NoteEntry]]
    chatHistory: NotRequired[List[ChatHistoryEntry]]
    interaction_stats: NotRequired[MonsterInteractionStats]
    temp_attack_modifier: NotRequired[int]
    temp_defense_modifier: NotRequired[int]
    temp_speed_modifier: NotRequired[int]
    temp_crit_modifier: NotRequired[int]
    temp_accuracy_modifier: NotRequired[int]
    temp_evasion_modifier: NotRequired[int]
    temp_attack_multiplier: NotRequired[float]
    temp_defense_multiplier: NotRequired[float]
    temp_speed_multiplier: NotRequired[float]


class PlayerStats(TypedDict):
    rank: Union[str, int]
    wins: int
    losses: int
    score: int
    titles: List[Dict[str, Any]]
    achievements: List[str]
    medals: int
    nickname: str
    equipped_title_id: NotRequired[Optional[str]]
    gold: NotRequired[int]
    current_win_streak: NotRequired[int]
    current_loss_streak: NotRequired[int]
    highest_win_streak: NotRequired[int]
    completed_cultivations: NotRequired[int]
    disassembled_monsters: NotRequired[int]
    discovered_recipes: NotRequired[List[str]]
    highest_rarity_created: NotRequired[RarityNames]
    status_applied_counts: NotRequired[Dict[str, int]]
    leech_skill_uses: NotRequired[int]
    flawless_victories: NotRequired[int]
    special_victories: NotRequired[Dict[str, int]]

class PlayerOwnedDNA(DNAFragment):
    pass

class PlayerGameData(TypedDict):
    playerOwnedDNA: List[Optional[PlayerOwnedDNA]]
    farmedMonsters: List[Monster]
    playerStats: PlayerStats
    nickname: NotRequired[str]
    selectedMonsterId: NotRequired[Optional[str]]
    lastSeen: NotRequired[int]
    lastSave: NotRequired[int]
    dnaCombinationSlots: NotRequired[List[Optional[PlayerOwnedDNA]]]
    friends: NotRequired[List[Any]]
    playerNotes: NotRequired[List[NoteEntry]]

class MonsterRecipe(TypedDict):
    combinationKey: str 
    resultingMonsterData: Monster 
    creationTimestamp: int
    discoveredByPlayerId: NotRequired[str]

# --- 戰鬥系統相關模型 ---
class BattleAction(TypedDict):
    performer_id: str
    target_id: str
    skill_name: str
    log_message: str
    damage_dealt: NotRequired[int]
    is_crit: NotRequired[bool]
    is_miss: NotRequired[bool]

class BattleLogEntry(TypedDict):
    turn: int
    raw_log_messages: List[str]
    styled_log_message: str

class BattleResult(TypedDict):
    log_entries: List[BattleLogEntry]
    winner_id: str
    loser_id: str
    battle_end: bool
    raw_full_log: List[str]
    player_monster_final_hp: int
    player_monster_final_mp: int
    player_monster_final_skills: List[Skill]
    player_monster_final_resume: MonsterResume
    player_activity_log: Optional[MonsterActivityLogEntry]
    opponent_activity_log: Optional[MonsterActivityLogEntry]
    battle_highlights: List[str]
    ai_battle_report_content: Dict[str, Any]
    absorption_details: NotRequired[Dict[str, Any]]

# --- 冠軍殿堂相關模型 ---
class ChampionSlot(TypedDict):
    monsterId: str
    ownerId: str
    monsterNickname: NotRequired[str]
    ownerNickname: NotRequired[str]
    occupiedTimestamp: int

class ChampionsData(TypedDict):
    rank1: Optional[ChampionSlot]
    rank2: Optional[ChampionSlot]
    rank3: Optional[ChampionSlot]
    rank4: Optional[ChampionSlot]

# --- 完整的遊戲設定檔模型 ---
class GameConfigs(TypedDict):
    dna_fragments: List[DNAFragment]
    rarities: Dict[str, RarityDetail]
    skills: Dict[ElementTypes, List[Skill]] 
    personalities: List[Personality]
    titles: List[Dict[str, Any]]
    monster_achievements_list: NotRequired[List[str]] 
    element_nicknames: NotRequired[Dict[ElementTypes, Any]]
    naming_constraints: NotRequired[NamingConstraints] 
    health_conditions: List[HealthCondition]
    newbie_guide: List[NewbieGuideEntry]
    npc_monsters: NotRequired[List[Monster]]
    value_settings: NotRequired[ValueSettings]
    absorption_config: NotRequired[AbsorptionConfig]
    cultivation_config: NotRequired[CultivationConfig]
    elemental_advantage_chart: NotRequired[Dict[ElementTypes, Dict[ElementTypes, float]]] 
    cultivation_stories: NotRequired[Dict[str, Any]]
    champion_guardians: NotRequired[Dict[str, Any]]
    battle_highlights: NotRequired[Dict[str, Any]]

if __name__ == '__main__':
    print("MD_models.py 已執行。TypedDict 定義可用。")
