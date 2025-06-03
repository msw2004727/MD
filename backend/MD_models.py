# MD_models.py
# 定義「怪獸養成」遊戲的資料結構與模型
# 使用 typing.TypedDict 以增強程式碼清晰度並支援潛在的靜態分析

from typing import List, Dict, Optional, TypedDict, NotRequired, Union, Literal, Tuple

# --- 基本類型定義 ---
ElementTypes = Literal[
    "火", "水", "木", "金", "土", "光", "暗", "毒", "風", "無", "混"
]
RarityNames = Literal["普通", "稀有", "菁英", "傳奇", "神話"]
SkillCategory = Literal["近戰", "遠程", "魔法", "輔助", "物理", "特殊", "變化", "其他"] # 技能類別

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
        "team_speed_buff", "recoil", "self_ko", "confusion"
    ]]
    stat: NotRequired[Union[str, List[str]]]
    amount: NotRequired[Union[int, List[int]]]
    duration: NotRequired[int]
    damage_per_turn: NotRequired[int]
    chance: NotRequired[int]
    target: NotRequired[Literal["self", "enemy_single", "enemy_all", "team_single", "team_all"]]
    recoil_factor: NotRequired[float]


class Skill(TypedDict):
    """技能模型 (用於 GameConfigs 中的技能定義以及 Monster 實例中的技能)"""
    name: str
    power: int
    crit: int
    probability: int
    story: NotRequired[str] # 招式敘述，用於戰鬥履歷
    description: NotRequired[str] # 備用敘述欄位
    type: ElementTypes
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


class ValueSettings(TypedDict):
    element_value_factors: Dict[ElementTypes, float]
    dna_recharge_conversion_factor: float

class NamingConstraints(TypedDict): # 新增：命名限制設定
    max_player_title_len: int         # 玩家稱號最大長度 (需求3)
    max_monster_achievement_len: int  # 怪物成就最大長度 (需求4)
    max_element_nickname_len: int     # (怪物)屬性名字最大長度 (需求5 & 6)
    max_monster_full_nickname_len: int # 怪物完整暱稱最大長度 (需求2)


# --- 玩家及怪獸資料模型 ---

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
    nickname: str # 由 玩家稱號+怪物成就+屬性名 組成，總長不超過15字
    elements: List[ElementTypes]
    elementComposition: Dict[ElementTypes, float]
    hp: int
    mp: int
    initial_max_hp: int
    initial_max_mp: int
    attack: int
    defense: int
    speed: int
    crit: int
    skills: List[Skill]
    rarity: RarityNames
    title: NotRequired[str] # 這是怪獸本身可能有的稱號/頭銜，用於命名中的「怪物成就」部分
    custom_element_nickname: NotRequired[str] # 新增：玩家自定義的屬性名字 (<=5字)
    description: str
    personality: Personality
    aiPersonality: NotRequired[str]
    aiIntroduction: NotRequired[str]
    aiEvaluation: NotRequired[str]
    creationTime: int
    monsterTitles: NotRequired[List[str]] # 與上面的 title 欄位用途相似，選擇一個使用或整合
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


class PlayerStats(TypedDict):
    rank: Union[str, int]
    wins: int
    losses: int
    score: int
    titles: List[str] # 玩家稱號列表，每個稱號應 <= 5字
    achievements: List[str]
    medals: int
    nickname: str


class PlayerOwnedDNA(DNAFragment):
    pass


class PlayerGameData(TypedDict):
    playerOwnedDNA: List[PlayerOwnedDNA]
    farmedMonsters: List[Monster]
    playerStats: PlayerStats
    lastSave: NotRequired[int]
    nickname: NotRequired[str]


# --- 完整的遊戲設定檔模型 ---

class GameConfigs(TypedDict):
    """
    代表由 MD_config_services.load_all_game_configs_from_firestore() 載入的
    完整遊戲設定結構，也是前端所期望的格式。
    """
    dna_fragments: List[DNAFragment]
    rarities: Dict[str, RarityDetail]
    skills: Dict[ElementTypes, List[Skill]] # 技能定義列表
    personalities: List[Personality]
    titles: List[str] # 玩家可獲得的稱號列表 (每個應 <= 5字)
    monster_achievements_list: NotRequired[List[str]] # 新增：怪物可獲得的成就/稱號列表 (每個應 <= 5字)
    element_nicknames: NotRequired[Dict[ElementTypes, str]] # 新增：元素對應的預設屬性名字 (每個應 <= 5字)
    naming_constraints: NotRequired[NamingConstraints] # 新增：命名相關的長度限制
    health_conditions: List[HealthCondition]
    newbie_guide: List[NewbieGuideEntry]
    npc_monsters: NotRequired[List[Monster]]
    value_settings: NotRequired[ValueSettings]
    absorption_config: NotRequired[AbsorptionConfig]
    cultivation_config: NotRequired[CultivationConfig]


if __name__ == '__main__':
    print("MD_models.py 已執行。TypedDict 定義可用。")

    # 範例 (僅供說明，非實際測試)
    test_naming_constraints: NamingConstraints = {
        "max_player_title_len": 5,
        "max_monster_achievement_len": 5,
        "max_element_nickname_len": 5,
        "max_monster_full_nickname_len": 15
    }
    print(f"\n命名限制範例 (玩家稱號最大長度): {test_naming_constraints['max_player_title_len']}")

    test_monster_with_custom_name: Monster = {
        "id": "m_test_002", "nickname": "炎龍[新晉]赤炎魂", # 假設這是組合後的
        "elements": ["火"], "elementComposition": {"火": 100.0},
        "hp": 100, "mp": 50, "initial_max_hp": 100, "initial_max_mp": 50,
        "attack": 20, "defense": 15, "speed": 10, "crit": 5, "skills": [],
        "rarity": "稀有", "title": "新晉炎王", # 假設這是「怪物成就」部分
        "custom_element_nickname": "赤炎魂", # 玩家自定義的屬性名
        "description": "...", "personality": {"name":"勇敢的", "description":"...", "colorDark":"...", "colorLight":"..."},
        "creationTime": int(time.time()),
        "farmStatus": {"active": False, "isBattling": False, "isTraining": False, "completed": False},
        "resistances": {"火": 5}
    }
    print(f"\n帶自定義屬性名的怪獸範例: {test_monster_with_custom_name['nickname']}")
    print(f"  其自定義屬性名: {test_monster_with_custom_name.get('custom_element_nickname')}")
    print(f"  其怪物成就/稱號: {test_monster_with_custom_name.get('title')}")

