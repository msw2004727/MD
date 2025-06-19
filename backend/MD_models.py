# MD_models.py
# 定義「怪獸養成」遊戲的資料結構與模型
# 使用 typing.TypedDict 以增強程式碼清晰度並支援潛在的靜態分析

from typing import List, Dict, Optional, TypedDict, NotRequired, Union, Literal, Tuple, Any # 新增 Any

# --- 基本類型定義 ---
ElementTypes = Literal[
    "火", "水", "木", "金", "土", "光", "暗", "毒", "風", "無", "混"
]
RarityNames = Literal["普通", "稀有", "菁英", "傳奇", "神話"]
SkillCategory = Literal["近戰", "遠程", "魔法", "輔助", "物理", "特殊", "變化", "其他"] # 技能類別
BattleLogStyle = Literal["嚴肅", "幽默", "武俠", "科幻", "驚悚", "獵奇"] # 戰鬥日誌風格

# --- 【新增】註記與聊天項目結構 ---
class NoteEntry(TypedDict):
    """單條註記的結構"""
    timestamp: int
    content: str

class ChatHistoryEntry(TypedDict):
    """單條聊天歷史的結構"""
    role: Literal["user", "assistant"]
    content: str

# --- 設定檔模型 (對應 Firestore 中 MD_GameConfigs 集合的結構) ---

class DNAFragment(TypedDict):
    """DNA 碎片模型"""
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
    """稀有度詳情模型"""
    name: RarityNames
    textVarKey: str
    statMultiplier: float
    skillLevelBonus: int
    resistanceBonus: int
    value_factor: NotRequired[int]


class SkillEffectDetails(TypedDict):
    """技能特殊效果詳情模型"""
    effect_type: NotRequired[Literal[
        "buff", "debuff", "dot", "leech", "stun", "heal", "heal_large",
        "accuracy_debuff", "special_defense_buff", "all_stats_debuff",
        "all_stats_buff", "poison", "strong_poison", "aoe_dot",
        "team_speed_buff", "recoil", "self_ko", "confusion", "status_change",
        "stat_change", "damage_modifier"
    ]]
    stat: NotRequired[Union[str, List[str]]]
    amount: NotRequired[Union[int, List[int]]]
    duration: NotRequired[int]
    damage_per_turn: NotRequired[int]
    chance: NotRequired[int]
    target: NotRequired[Literal["self", "enemy_single", "enemy_all", "team_single", "team_all"]]
    recoil_factor: NotRequired[float]
    status_id: NotRequired[str] # for status_change effect


class Skill(TypedDict):
    """技能模型 (用於 GameConfigs 中的技能定義以及 Monster 實例中的技能)"""
    name: str
    power: int
    crit: int
    probability: int
    story: NotRequired[str] # 招式敘述，用於戰鬥履歷
    description: NotRequired[str] # 備用敘述欄位
    type: ElementTypes
    rarity: NotRequired[RarityNames]
    baseLevel: int
    mp_cost: NotRequired[int]
    skill_category: NotRequired[SkillCategory]
    level: NotRequired[int]
    current_exp: NotRequired[int]
    exp_to_next_level: NotRequired[int]
    effect: NotRequired[str] # 效果的簡要標識
    # 以下為更詳細的效果參數，用於實現輔助性、恢復性、同歸於盡性等
    stat: NotRequired[Union[str, List[str]]] # 影響的數值
    amount: NotRequired[Union[int, List[int]]] # 影響的量
    duration: NotRequired[int] # 持續回合
    damage: NotRequired[int] # 額外傷害或治療量 (非 DoT)
    recoilDamage: NotRequired[float] # 反傷比例
    hit_chance: NotRequired[int] # 技能命中率 (0-100)，預設為 100
    effect_target: NotRequired[Literal["self", "opponent"]] # 效果目標，例如提升自身屬性或削弱對方

class Personality(TypedDict):
    """怪獸個性模型"""
    name: str
    description: str
    colorDark: str
    colorLight: str
    skill_preferences: NotRequired[Dict[SkillCategory, float]]


class HealthConditionEffect(TypedDict):
    hp: NotRequired[int]
    mp: NotRequired[int]
    attack: NotRequired[int]
    defense: NotRequired[int]
    speed: NotRequired[int]
    crit: NotRequired[int]
    hp_per_turn: NotRequired[int]

class HealthCondition(TypedDict):
    id: str
    name: str
    description: str
    effects: HealthConditionEffect
    duration: NotRequired[int]
    icon: NotRequired[str]
    chance_to_skip_turn: NotRequired[float] # 觸發跳過回合的機率 (0.0-1.0)
    confusion_chance: NotRequired[float] # 觸發混亂自傷的機率 (0.0-1.0)
    elemental_vulnerability: NotRequired[Dict[ElementTypes, float]] # 對某些元素的易傷倍率


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
    stat_growth_weights: NotRequired[Dict[str, int]] # for default stat growth
    stat_growth_duration_divisor: NotRequired[int]
    dna_find_chance: NotRequired[float]
    dna_find_duration_divisor: NotRequired[int]
    dna_find_loot_table: NotRequired[Dict[RarityNames, Dict[RarityNames, float]]]
    location_biases: NotRequired[Dict[str, Dict[str, Any]]]


class ValueSettings(TypedDict):
    element_value_factors: Dict[ElementTypes, float]
    dna_recharge_conversion_factor: float
    max_farm_slots: NotRequired[int] # 新增農場上限
    max_monster_skills: NotRequired[int] # 新增怪獸最大技能數
    max_battle_turns: NotRequired[int] # 新增戰鬥最大回合數
    max_inventory_slots: NotRequired[int]
    max_temp_backpack_slots: NotRequired[int]
    max_cultivation_time_seconds: NotRequired[int]
    starting_gold: NotRequired[int]
    base_accuracy: NotRequired[int] # 基礎命中率，例如 80 (%)
    base_evasion: NotRequired[int] # 基礎閃避率，例如 5 (%)
    accuracy_per_speed: NotRequired[float] # 速度對命中率的影響，例如每點速度影響 0.1% 命中
    evasion_per_speed: NotRequired[float] # 速度對閃避率的影響，例如每點速度影響 0.05% 閃避
    crit_multiplier: NotRequired[float] # 暴擊傷害倍率，例如 1.5


class NamingConstraints(TypedDict): # 新增：命名限制設定
    max_player_title_len: int
    max_monster_achievement_len: int
    max_element_nickname_len: int
    max_monster_full_nickname_len: int


# --- 玩家及怪獸資料模型 ---

# --- 新增：怪獸互動統計資料模型 ---
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
    type: NotRequired[Optional[str]]
    startTime: NotRequired[Optional[int]]
    endTime: NotRequired[Optional[int]]
    completed: bool
    isBattling: bool
    isTraining: bool
    boosts: NotRequired[Dict[str, int]]
    timerId: NotRequired[Optional[int]]
    trainingLocation: NotRequired[Optional[str]] # 新增訓練地點


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
    """怪獸實例模型"""
    id: str
    nickname: str
    player_title_part: NotRequired[str]      # 新增
    achievement_part: NotRequired[str]       # 新增
    element_nickname_part: NotRequired[str]  # 新增
    elements: List[ElementTypes]
    elementComposition: Dict[ElementTypes, float]
    hp: int
    mp: int
    current_hp: NotRequired[int] # 新增：戰鬥中的當前 HP
    current_mp: NotRequired[int] # 新增：戰鬥中的當前 MP
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
    healthConditions: NotRequired[List[HealthCondition]] # 戰鬥中的即時狀態
    resistances: Dict[ElementTypes, int]
    score: NotRequired[int]
    isNPC: NotRequired[bool]
    baseId: NotRequired[str]
    resume: NotRequired[MonsterResume]
    constituent_dna_ids: NotRequired[List[str]]
    cultivation_gains: NotRequired[Dict[str, int]] # 新增：用於儲存修煉獲得的額外數值
    monsterNotes: NotRequired[List[NoteEntry]] # 【新增】怪獸的專屬註記
    chatHistory: NotRequired[List[ChatHistoryEntry]] # 【新增】怪獸的聊天歷史
    interaction_stats: NotRequired[MonsterInteractionStats] # 【新增】互動統計資料
    # 戰鬥相關動態數值 (非持久化，僅用於戰鬥模擬)
    temp_attack_modifier: NotRequired[int]
    temp_defense_modifier: NotRequired[int]
    temp_speed_modifier: NotRequired[int]
    temp_crit_modifier: NotRequired[int]
    temp_accuracy_modifier: NotRequired[int]
    temp_evasion_modifier: NotRequired[int]


class PlayerStats(TypedDict):
    """玩家統計資料模型"""
    rank: Union[str, int]
    wins: int
    losses: int
    score: int
    titles: List[Dict[str, Any]]
    achievements: List[str]
    medals: int
    nickname: str
    equipped_title_id: NotRequired[Optional[str]]
    
    # 【新增】用於追蹤稱號條件的欄位
    current_win_streak: NotRequired[int]
    current_loss_streak: NotRequired[int]
    highest_win_streak: NotRequired[int]
    completed_cultivations: NotRequired[int]
    disassembled_monsters: NotRequired[int]
    discovered_recipes: NotRequired[List[str]] # 儲存已發現的配方組合鍵
    highest_rarity_created: NotRequired[RarityNames]
    status_applied_counts: NotRequired[Dict[str, int]] # e.g., {"poisoned": 50, "paralyzed": 20}
    leech_skill_uses: NotRequired[int]
    flawless_victories: NotRequired[int]
    special_victories: NotRequired[Dict[str, int]] # e.g., {"win_without_damage_skills": 5}


class PlayerOwnedDNA(DNAFragment):
    pass


class PlayerGameData(TypedDict):
    playerOwnedDNA: List[Optional[PlayerOwnedDNA]]
    farmedMonsters: List[Monster]
    playerStats: PlayerStats
    nickname: NotRequired[str]
    selectedMonsterId: NotRequired[Optional[str]]
    lastSeen: NotRequired[int]
    dnaCombinationSlots: NotRequired[List[Optional[PlayerOwnedDNA]]]
    friends: NotRequired[List[Any]] # 確保 friends 欄位存在
    playerNotes: NotRequired[List[NoteEntry]] # 【新增】玩家的通用註記


# --- 新增的組合配方模型 (MonsterRecipes) ---
class MonsterRecipe(TypedDict):
    """
    用於存儲已發現的 DNA 組合配方及其產生的標準怪獸數據。
    每個文檔的 ID 應為 combinationKey。
    """
    combinationKey: str 
    resultingMonsterData: Monster 
    creationTimestamp: int
    discoveredByPlayerId: NotRequired[str]


# --- 戰鬥系統相關模型 ---
class BattleAction(TypedDict):
    """單一回合中的一個戰鬥行動"""
    performer_id: str
    target_id: str
    skill_name: str
    damage_dealt: NotRequired[int]
    damage_healed: NotRequired[int]
    status_applied: NotRequired[str] # 狀態ID
    status_removed: NotRequired[str]
    stat_changes: NotRequired[Dict[str, int]]
    is_crit: NotRequired[bool]
    is_miss: NotRequired[bool]
    log_message: str # 簡要的文字描述


class BattleLogEntry(TypedDict):
    """單一回合的戰鬥日誌"""
    turn: int
    player_monster_hp: int
    player_monster_mp: int
    opponent_monster_hp: int
    opponent_monster_mp: int
    actions: List[BattleAction]
    raw_log_messages: List[str] # 原始日誌信息，供 AI 判斷和美化
    styled_log_message: str # AI 生成的風格化日誌文本
    winner_id: NotRequired[str] # 如果本回合結束戰鬥，則標記勝利者
    loser_id: NotRequired[str] # 如果本回合結束戰鬥，則標記失敗者
    battle_end: NotRequired[bool] # 標記戰鬥是否結束


class BattleResult(TypedDict):
    """整個戰鬥的最終結果"""
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


# --- 完整的遊戲設定檔模型 ---

class GameConfigs(TypedDict):
    """
    代表由 MD_config_services.load_all_game_configs_from_firestore() 載入的
    完整遊戲設定結構，也是前端所期望的格式。
    """
    dna_fragments: List[DNAFragment]
    rarities: Dict[str, RarityDetail]
    skills: Dict[ElementTypes, List[Skill]] 
    personalities: List[Personality]
    titles: List[Dict[str, Any]] # 之前是 List[str]，現在是完整的物件列表
    monster_achievements_list: NotRequired[List[str]] 
    element_nicknames: NotRequired[Dict[ElementTypes, str]]
    naming_constraints: NotRequired[NamingConstraints] 
    health_conditions: List[HealthCondition]
    newbie_guide: List[NewbieGuideEntry]
    npc_monsters: NotRequired[List[Monster]]
    value_settings: NotRequired[ValueSettings]
    absorption_config: NotRequired[AbsorptionConfig]
    cultivation_config: NotRequired[CultivationConfig]
    elemental_advantage_chart: NotRequired[Dict[ElementTypes, Dict[ElementTypes, float]]] 


if __name__ == '__main__':
    import time
    print("MD_models.py 已執行。TypedDict 定義可用。")
