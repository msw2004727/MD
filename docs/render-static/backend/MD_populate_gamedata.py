# MD_populate_gamedata.py
# 用於將遊戲設定資料一次性匯入到 Firestore

from MD_firebase_config import db
import time
import random

# 輔助用列表 (與 MD_models.py 中的 Literal 一致)
ELEMENT_TYPES = ["火", "水", "木", "金", "土", "光", "暗", "毒", "風", "無", "混"]
RARITY_NAMES = ["普通", "稀有", "菁英", "傳奇", "神話"]
SKILL_CATEGORIES = ["近戰", "遠程", "魔法", "輔助", "物理", "特殊", "變化", "其他"]

def populate_game_configs():
    """
    將遊戲設定資料寫入 Firestore 的 MD_GameConfigs 集合。
    """
    if not db:
        print("錯誤：Firestore 資料庫未初始化。無法執行資料填充。")
        return

    print("開始填充/更新遊戲設定資料到 Firestore...")

    # 1. DNA 碎片資料 (DNAFragments) - 沿用 v5 的擴充範例
    dna_fragments_data = [
        { "id": 'dna_fire_c01', "name": '初階火種', "type": '火', "attack": 18, "defense": 6, "speed": 9, "hp": 45, "mp": 22, "crit": 4, "description": '微弱燃燒的火種。', "rarity": "普通", "resistances": {'火': 2} },
        { "id": 'dna_water_c01', "name": '純淨水滴', "type": '水', "attack": 12, "defense": 12, "speed": 12, "hp": 55, "mp": 28, "crit": 3, "description": '純淨但普通的水滴。', "rarity": "普通", "resistances": {'水': 2} },
        { "id": 'dna_wood_c01', "name": '嫩綠葉芽', "type": '木', "attack": 10, "defense": 15, "speed": 7,  "hp": 60, "mp": 25, "crit": 2, "description": '充滿生機的普通葉芽。', "rarity": "普通", "resistances": {'木': 2} },
        { "id": 'dna_gold_c01', "name": '微光金屬', "type": '金', "attack": 15, "defense": 20, "speed": 8,  "hp": 50, "mp": 18, "crit": 3, "description": '帶有微弱光澤的金屬片。', "rarity": "普通", "resistances": {'金': 2} },
        { "id": 'dna_earth_c01', "name": '鬆軟泥土', "type": '土', "attack": 9, "defense": 18, "speed": 5,  "hp": 65, "mp": 20, "crit": 2, "description": '普通的鬆軟泥土塊。', "rarity": "普通", "resistances": {'土': 2} },
        { "id": 'dna_light_c01', "name": '微弱光塵', "type": '光', "attack": 14, "defense": 10, "speed": 11, "hp": 50, "mp": 26, "crit": 5, "description": '幾乎看不見的光粒子。', "rarity": "普通", "resistances": {'光': 2} },
        { "id": 'dna_dark_c01', "name": '稀薄暗影', "type": '暗', "attack": 16, "defense": 8, "speed": 10,  "hp": 48, "mp": 27, "crit": 6, "description": '一絲難以察覺的暗影。', "rarity": "普通", "resistances": {'暗': 2} },
        { "id": 'dna_poison_c01', "name": '淡綠毒霧', "type": '毒', "attack": 17, "defense": 7, "speed": 9,  "hp": 46, "mp": 23, "crit": 4, "description": '幾乎無害的稀薄毒霧。', "rarity": "普通", "resistances": {'毒': 2} },
        { "id": 'dna_wind_c01', "name": '輕柔微風', "type": '風', "attack": 13, "defense": 9, "speed": 15,  "hp": 47, "mp": 24, "crit": 5, "description": '幾乎感覺不到的微風。', "rarity": "普通", "resistances": {'風': 2} },
        { "id": 'dna_none_c01', "name": '中性細胞核', "type": '無', "attack": 10, "defense": 10, "speed": 10, "hp": 50, "mp": 20, "crit": 3, "description": '基礎的生命核心。', "rarity": "普通" },
        { "id": 'dna_earth_r01', "name": '堅硬岩片', "type": '土', "attack": 8, "defense": 28, "speed": 6,  "hp": 85, "mp": 15, "crit": 3, "description": '較為堅固的岩石碎片。', "rarity": "稀有", "resistances": {'土': 5} },
        { "id": 'dna_wind_r01', "name": '微風精華', "type": '風', "attack": 16, "defense": 10, "speed": 22, "hp": 58, "mp": 26, "crit": 8, "description": '蘊含少量風之力的精華。', "rarity": "稀有", "resistances": {'風': 5} },
        { "id": 'dna_poison_r01', "name": '弱效毒液', "type": '毒', "attack": 20, "defense": 8, "speed": 14, "hp": 50, "mp": 24, "crit": 6, "description": '帶有些許毒性的液體。', "rarity": "稀有", "resistances": {'毒': 5} },
        { "id": 'dna_fire_r01', "name": '熾熱餘燼', "type": '火', "attack": 25, "defense": 12, "speed": 15, "hp": 60, "mp": 30, "crit": 7, "description": '尚有餘溫的熾熱灰燼。', "rarity": "稀有", "resistances": {'火': 5, '水': -1} },
        { "id": 'dna_water_r01', "name": '凝結水珠', "type": '水', "attack": 18, "defense": 18, "speed": 16, "hp": 70, "mp": 35, "crit": 6, "description": '蘊含純淨能量的凝結水珠。', "rarity": "稀有", "resistances": {'水': 5, '木': -1} },
        { "id": 'dna_wood_r01', "name": '硬化樹皮塊', "type": '木', "attack": 15, "defense": 22, "speed": 10, "hp": 75, "mp": 32, "crit": 4, "description": '經過硬化的堅韌樹皮。', "rarity": "稀有", "resistances": {'木': 5, '金': -1} },
        { "id": 'dna_dark_e01', "name": '暗影殘片', "type": '暗', "attack": 28, "defense": 7, "speed": 12,  "hp": 48, "mp": 38, "crit": 9, "description": '凝聚了部分暗影力量的碎片。', "rarity": "菁英", "resistances": {'暗': 8} },
        { "id": 'dna_light_e01', "name": '光芒碎片', "type": '光', "attack": 20, "defense": 14, "speed": 15, "hp": 68, "mp": 30, "crit": 7, "description": '閃耀著純淨光芒的結晶碎片。', "rarity": "菁英", "resistances": {'光': 8} },
        { "id": 'dna_fire_e01', "name": '烈焰核心', "type": '火', "attack": 30, "defense": 10, "speed": 18, "hp": 60, "mp": 35, "crit": 10, "description": '燃燒旺盛的火焰核心。', "rarity": "菁英", "resistances": {'火': 8, '水': -3} },
        { "id": 'dna_gold_e01', "name": '精煉金塊', "type": '金', "attack": 22, "defense": 30, "speed": 12, "hp": 65, "mp": 28, "crit": 6, "description": '經過提煉的純淨金屬塊。', "rarity": "菁英", "resistances": {'金': 8, '火': -3} },
        { "id": 'dna_gold_l01', "name": '不朽金屬', "type": '金', "attack": 25, "defense": 35, "speed": 10,  "hp": 70, "mp": 20, "crit": 5, "description": '極其堅硬且帶有神秘力量的金屬。', "rarity": "傳奇", "resistances": {'金': 12, '土': 5} },
        { "id": 'dna_water_l01', "name": '深海之源', "type": '水', "attack": 22, "defense": 28, "speed": 25, "hp": 80, "mp": 45, "crit": 8, "description": '來自海洋深處的強大水能結晶。', "rarity": "傳奇", "resistances": {'水': 12, '火': -5} },
        { "id": 'dna_earth_l01', "name": '大地龍脈結晶', "type": '土', "attack": 18, "defense": 40, "speed": 8, "hp": 100, "mp": 25, "crit": 4, "description": '蘊含大地龍脈力量的稀有結晶。', "rarity": "傳奇", "resistances": {'土': 12, '風': -5} },
        { "id": 'dna_ancient_m01', "name": '遠古龍魂', "type": '無', "attack": 40, "defense": 40, "speed": 40, "hp": 120, "mp": 60, "crit": 15, "description": '蘊含遠古巨龍靈魂的神秘DNA。', "rarity": "神話", "resistances": {'火':8, '水':8, '木':8, '金':8, '土':8, '光': 5, '暗': 5} },
        { "id": 'dna_chaos_m01', "name": '混沌原核', "type": '混', "attack": 35, "defense": 35, "speed": 35, "hp": 110, "mp": 70, "crit": 12, "description": '來自世界誕生之初的混沌能量核心。', "rarity": "神話", "resistances": {'毒':10, '風':10} }
    ]
    try:
        db.collection('MD_GameConfigs').document('DNAFragments').set({'all_fragments': dna_fragments_data})
        print(f"成功寫入 DNAFragments 資料 (共 {len(dna_fragments_data)} 種)。")
    except Exception as e:
        print(f"寫入 DNAFragments 資料失敗: {e}")

    # 2. DNA 稀有度資料 (Rarities)
    dna_rarities_data = {
        "COMMON": { "name": "普通", "textVarKey": "--rarity-common-text", "statMultiplier": 1.0, "skillLevelBonus": 0, "resistanceBonus": 1, "value_factor": 10 },
        "RARE": { "name": "稀有", "textVarKey": "--rarity-rare-text", "statMultiplier": 1.15, "skillLevelBonus": 0, "resistanceBonus": 3, "value_factor": 30 },
        "ELITE": { "name": "菁英", "textVarKey": "--rarity-elite-text", "statMultiplier": 1.3, "skillLevelBonus": 1, "resistanceBonus": 5, "value_factor": 75 },
        "LEGENDARY": { "name": "傳奇", "textVarKey": "--rarity-legendary-text", "statMultiplier": 1.5, "skillLevelBonus": 2, "resistanceBonus": 8, "value_factor": 150 },
        "MYTHICAL": { "name": "神話", "textVarKey": "--rarity-mythical-text", "statMultiplier": 1.75, "skillLevelBonus": 3, "resistanceBonus": 12, "value_factor": 300 },
    }
    try:
        db.collection('MD_GameConfigs').document('Rarities').set({'dna_rarities': dna_rarities_data})
        print("成功寫入 Rarities 資料。")
    except Exception as e:
        print(f"寫入 Rarities 資料失敗: {e}")

    # 3. 招式資料 (Skills) - 大幅擴充
    skill_database_data = {
        '火': [
            { "name": "火花", "power": 25, "crit": 5, "probability": 80, "story": "{attacker_name}從口中噴出一團小小的火花，試探性地燒灼{target_name}。", "type": "火", "baseLevel": 1, "mp_cost": 5, "skill_category": "魔法" },
            { "name": "火焰爪", "power": 30, "crit": 10, "probability": 75, "story": "{attacker_name}的爪子燃起熾熱的火焰，兇猛地抓向{target_name}！", "type": "火", "baseLevel": 1, "mp_cost": 6, "skill_category": "近戰" },
            { "name": "小火球", "power": 35, "crit": 7, "probability": 70, "story": "{attacker_name}凝聚出一顆跳動的小火球，擲向{target_name}。", "type": "火", "baseLevel": 1, "mp_cost": 7, "skill_category": "魔法" },
            { "name": "火之舞", "power": 0, "crit": 0, "probability": 65, "story": "{attacker_name}跳起神秘的火焰之舞，提升了自身的攻擊力和速度。", "type": "火", "effect": "buff", "stat": ["attack", "speed"], "amount": [10, 8], "duration": 3, "baseLevel": 2, "mp_cost": 9, "skill_category": "輔助", "target":"self"},
            { "name": "烈焰之鞭", "power": 40, "crit": 8, "probability": 70, "story": "{attacker_name}將火焰凝聚成長鞭，靈活地抽打遠處的{target_name}。", "type": "火", "baseLevel": 2, "mp_cost": 8, "skill_category": "遠程" },
            { "name": "燃燒之魂", "power": 0, "crit": 0, "probability": 60, "story": "{attacker_name}激發體內的火焰能量，戰意高昂，攻擊力和爆擊率短時間內大幅提升！", "type": "火", "effect": "buff", "stat": ["attack", "crit"], "amount": [15, 10], "duration": 3, "baseLevel": 2, "mp_cost": 10, "skill_category": "輔助", "target":"self" },
            { "name": "炎爆術", "power": 50, "crit": 10, "probability": 65, "story": "{attacker_name}吟唱咒文，引爆一團壓縮的火焰能量，對{target_name}造成巨大傷害！", "type": "火", "baseLevel": 3, "mp_cost": 12, "skill_category": "魔法" },
            { "name": "鬼火縈繞", "power": 15, "crit": 0, "probability": 70, "story": "{attacker_name}召喚數團幽藍的鬼火，它們纏上了{target_name}，使其陷入燒傷狀態，持續受到折磨。", "type": "火", "effect": "dot", "damage_per_turn": 8, "duration": 3, "chance": 85, "baseLevel": 2, "mp_cost": 7, "skill_category": "特殊" },
            { "name": "火焰噴射", "power": 60, "crit": 8, "probability": 60, "story": "{attacker_name}深吸一口氣，猛地噴射出柱狀的烈焰，席捲{target_name}！", "type": "火", "baseLevel": 3, "mp_cost": 14, "skill_category": "魔法" },
            { "name": "煉獄火海", "power": 70, "crit": 5, "probability": 50, "story": "{attacker_name}怒吼一聲，釋放毀滅性的火焰席捲整個戰場！", "type": "火", "baseLevel": 4, "mp_cost": 20, "skill_category": "魔法", "target": "enemy_all" },
            { "name": "陽炎", "power": 0, "crit": 0, "probability": 60, "story": "{attacker_name}周圍的空氣因高熱而扭曲，降低了{target_name}的攻擊命中率。", "type": "火", "effect": "debuff", "stat": "accuracy", "amount": -15, "duration": 2, "baseLevel": 3, "mp_cost": 9, "skill_category": "變化" },
            { "name": "灰燼風暴", "power": 45, "crit": 5, "probability": 55, "story": "{attacker_name}掀起夾雜著滾燙灰燼的熱風，對所有敵人造成傷害並可能使其燒傷。", "type": "火", "baseLevel": 3, "mp_cost": 16, "skill_category": "魔法", "target": "enemy_all", "effect": "dot", "damage_per_turn": 4, "duration": 2, "chance": 30},
            { "name": "浴火重生", "power": 0, "crit": 0, "probability": 25, "story": "在瀕臨倒下之際，{attacker_name}的身體被火焰包裹，奇蹟般地從灰燼中重生，恢復了部分生命！", "type": "火", "effect": "revive_self_heal", "amount": 0.35, "chance": 25, "baseLevel": 5, "mp_cost": 30, "skill_category": "輔助", "target":"self" },
            { "name": "過熱", "power": 85, "crit": 0, "probability": 40, "story": "{attacker_name}釋放出極度高溫的能量，對{target_name}造成巨大傷害，但自身特攻會大幅下降。", "type": "火", "baseLevel": 5, "mp_cost": 22, "skill_category": "魔法", "effect": "self_debuff", "stat":"attack", "amount": -20, "duration":0}, # duration 0 表示立即生效且不隨回合消失
        ],
        '水': [
            { "name": "水槍", "power": 28, "crit": 5, "probability": 80, "story": "{attacker_name}從口中噴射出強勁的水柱，衝擊{target_name}！", "type": "水", "baseLevel": 1, "mp_cost": 5, "skill_category": "遠程" },
            { "name": "泡沫光線", "power": 32, "crit": 7, "probability": 70, "story": "{attacker_name}發射大量黏稠的泡沫形成光線，{target_name}的行動似乎變得遲緩了。", "type": "水", "baseLevel": 1, "mp_cost": 7, "skill_category": "魔法", "effect": "debuff", "stat": "speed", "amount": -12, "chance": 50, "duration": 2 },
            { "name": "水流環", "power": 0, "crit": 0, "probability": 65, "story": "{attacker_name}周身環繞著流動的水環，巧妙地提升了閃避能力。", "type": "水", "effect": "buff", "stat": "evasion", "amount": 15, "duration": 3, "baseLevel": 2, "mp_cost": 9, "skill_category": "輔助", "target":"self" },
            { "name": "治癒漣漪", "power": 0, "crit": 0, "probability": 65, "story": "{attacker_name}散發出溫和的水波，輕柔地治癒了{target_name}的傷口。", "type": "水", "effect": "heal", "amount": 45, "baseLevel": 2, "mp_cost": 10, "skill_category": "輔助", "target": "team_single" },
            { "name": "冰凍之觸", "power": 30, "crit": 5, "probability": 60, "story": "{attacker_name}釋放出刺骨的寒氣觸碰{target_name}，試圖將其冰封！", "type": "水", "effect": "stun", "chance": 30, "duration": 1, "baseLevel": 3, "mp_cost": 12, "skill_category": "特殊" }, # stun 改為 frozen 效果
            { "name": "潮汐之力", "power": 0, "crit": 0, "probability": 55, "story": "{attacker_name}引動潮汐的力量，短時間內強化了水系技能的威力！", "type": "水", "effect": "buff", "stat": "water_power", "amount": 10, "duration": 3, "baseLevel": 3, "mp_cost": 11, "skill_category": "輔助", "target":"self" },
            { "name": "濁流", "power": 45, "crit": 0, "probability": 60, "story": "{attacker_name}掀起渾濁的水流攻擊所有敵人，並可能降低他們的命中率。", "type": "水", "baseLevel": 3, "mp_cost": 13, "skill_category": "魔法", "target":"enemy_all", "effect":"debuff", "stat":"accuracy", "amount":-10, "chance":30, "duration":2},
            { "name": "巨浪滔天", "power": 65, "crit": 5, "probability": 55, "story": "{attacker_name}召喚出滔天巨浪，無情地吞噬了所有敵人！", "type": "水", "baseLevel": 4, "mp_cost": 18, "skill_category": "魔法", "target": "enemy_all" },
            { "name": "生命甘露", "power": 0, "crit": 0, "probability": 40, "story": "{attacker_name}祈禱降下充滿生命能量的甘露，為我方全體帶來持續的治癒。", "type": "水", "effect": "team_heal_over_time", "amount_per_turn": 20, "duration": 3, "baseLevel": 5, "mp_cost": 25, "skill_category": "輔助" },
            { "name": "絕對零度", "power": 0, "crit": 0, "probability": 15, "story": "{attacker_name}釋放出極致的寒意，試圖將{target_name}瞬間冰封，造成一擊必殺！但命中率極低。", "type": "水", "effect": "one_hit_ko", "chance": 15, "baseLevel": 5, "mp_cost": 35, "skill_category": "特殊"}
        ],
        # ... (為其他元素 木, 金, 土, 光, 暗, 毒, 風, 無, 混 各自擴充大量技能) ...
        # 以下僅為少量範例，你需要大幅擴充
        '木': [
            { "name": "飛葉快刀", "power": 25, "crit": 15, "probability": 85, "story": "{attacker_name}雙手一揮，無數鋒利的葉片如飛刀般射向{target_name}！", "type": "木", "baseLevel": 1, "mp_cost": 6, "skill_category": "遠程" },
            { "name": "寄生種子", "power": 15, "crit": 0, "probability": 70, "story": "一顆奇異的種子從{attacker_name}手中飛出，鑽入{target_name}體內，不斷吸取其生命力反哺自身。", "type": "木", "effect": "leech", "damage_per_turn": 10, "heal_per_turn": 7, "duration": 3, "baseLevel": 1, "mp_cost": 8, "skill_category": "特殊" },
            { "name": "光合作用", "power": 0, "crit": 0, "probability": 60, "story": "{attacker_name}靜靜地沐浴在能量之中，將自然之力轉化為生命力，緩慢恢復HP。", "type": "木", "effect": "heal_self_over_time", "amount_per_turn": 25, "duration": 3, "baseLevel": 2, "mp_cost": 10, "skill_category": "輔助", "target":"self" },
            { "name": "森林的憤怒", "power": 70, "crit": 8, "probability": 50, "story": "{attacker_name}引導大自然的磅礴力量，召喚無數巨大的藤蔓和樹木猛擊所有敵人！", "type": "木", "baseLevel": 4, "mp_cost": 19, "skill_category": "魔法", "target": "enemy_all" },
        ],
        '無': [
            { "name": "猛撞", "power": 35, "crit": 5, "probability": 80, "story": "{attacker_name}集中全身力量，奮力撞向{target_name}。", "type": "無", "baseLevel": 1, "mp_cost": 4, "skill_category": "近戰"},
            { "name": "嚎叫", "power": 0, "crit": 0, "probability": 70, "story": "{attacker_name}發出威嚇的嚎叫，試圖降低周圍所有敵人的攻擊力。", "type": "無", "effect": "debuff", "stat": "attack", "amount": -10, "duration": 2, "baseLevel": 1, "mp_cost": 6, "skill_category": "變化", "target": "enemy_all"},
            { "name": "高速星星", "power": 20, "crit": 0, "probability": 75, "story": "{attacker_name}快速射出多枚閃爍的能量星星，它們追蹤著{target_name}，幾乎無法閃避！", "type": "無", "baseLevel": 2, "mp_cost": 8, "skill_category": "特殊", "effect":"always_hit", "hits": random.randint(2,5)}, # 2-5次攻擊
            { "name": "捨身衝撞", "power": 75, "crit": 10, "probability": 50, "story": "{attacker_name}不顧一切地發起猛烈撞擊，對{target_name}造成巨大傷害，但自身也因巨大的衝擊力受到了不小的反噬！", "type": "無", "baseLevel": 4, "mp_cost": 15, "skill_category": "物理", "recoilDamage": 0.33 },
            { "name": "最終的咆哮", "power": 0, "crit": 0, "probability": 20, "story": "{attacker_name}發出生命最後的咆哮，釋放出所有能量，試圖與{target_name}同歸於盡！", "type": "無", "baseLevel": 5, "mp_cost": 50, "skill_category": "特殊", "effect": "self_ko_enemy_ko", "chance": 40}
        ]
    }
    try:
        db.collection('MD_GameConfigs').document('Skills').set({'skill_database': skill_database_data})
        print("成功寫入 Skills 資料 (已大幅擴充)。")
    except Exception as e:
        print(f"寫入 Skills 資料失敗: {e}")

    # 4. 個性資料 (Personalities)
    personalities_data = [
        { "name": "勇敢的", "description": "這隻怪獸天生就是個不折不扣的冒險家，字典裡從來沒有「害怕」兩個字。無論對手多麼強大，它總是第一個咆哮著衝鋒陷陣，用燃燒的戰意鼓舞著同伴。它享受近距離肉搏的快感，每一次揮爪、每一次衝撞都充滿了力量與決心。訓練師若能引導好它的勇氣，它將成為戰場上最可靠的尖兵，但有時也需提防它因過於魯莽而陷入不必要的險境。它特別偏好使用高威力的近戰物理攻擊技能，對於需要精巧控制的魔法或變化類技能則不太感興趣。", "colorDark": "#e74c3c", "colorLight": "#c0392b", "skill_preferences": {"近戰": 1.6, "物理": 1.5, "魔法": 0.8, "遠程": 0.7, "輔助": 0.4, "變化": 0.6, "特殊": 0.9, "其他": 1.0} },
        { "name": "膽小的", "description": "它有著一顆玻璃般易碎的心，任何風吹草動都可能讓它嚇得魂飛魄散，發出細微的悲鳴。戰鬥中，它總是試圖躲在隊友身後，用它那雙水汪汪的大眼睛警惕地觀察著四周。它極度厭惡近身戰鬥，一旦敵人靠近就會慌不擇路地後退。它更傾向於在安全的遠距離釋放一些騷擾性的小魔法，或者乾脆施放輔助技能為自己和隊友加上一層又一層的保護。訓練師需要給予它無比的耐心和溫柔，用鼓勵代替苛責，或許它能在感受到絕對安全時，發揮出意想不到的遠程支援潛力。", "colorDark": "#3498db", "colorLight": "#2980b9", "skill_preferences": {"遠程": 1.5, "輔助": 1.4, "變化": 1.3, "魔法": 1.0, "近戰": 0.3, "物理": 0.4, "特殊": 0.7, "其他": 1.0}},
        { "name": "冷静的", "description": "宛如一位深思熟慮的棋手，它的眼神總是深邃而銳利，彷彿能洞察戰場上每一個細微的變化。無論戰況多麼混亂，它總能保持異乎尋常的冷静，不疾不徐地分析局勢，找出克敵制勝的最佳策略。它不輕易出手，但每一次攻擊或輔助都經過精密計算，力求效果最大化。它偏好運用多樣的魔法和特殊效果類技能來控制戰局，或為隊友創造決定性的優勢。訓練師若能理解它的戰術意圖並加以配合，它將成為隊伍中運籌帷幄的軍師，用智慧引導隊伍走向勝利。", "colorDark": "#2ecc71", "colorLight": "#27ae60", "skill_preferences": {"魔法": 1.4, "特殊": 1.5, "輔助": 1.3, "變化": 1.2, "遠程": 1.1, "近戰": 0.6, "物理": 0.7, "其他": 1.0} },
        { "name": "急躁的", "description": "如同上緊了發條的火山，一刻也停不下來，隨時都可能爆發出驚人的能量。它的行動總是比思考快上半拍，充滿了不確定性和破壞的衝動。戰鬥中，它極度渴望速戰速決，會不計後果地釋放自己所掌握的最強大、最具視覺衝擊力的技能，無論是近戰肉搏的物理重擊還是遠程施放的毀滅性魔法，只要能快速打倒對手就行。訓練師需要有足夠的技巧去引導和控制它這股狂暴的力量，避免因為急於求成而導致戰術失誤或誤傷友軍。", "colorDark": "#f39c12", "colorLight": "#e67e22", "skill_preferences": {"物理": 1.4, "魔法": 1.4, "近戰": 1.3, "遠程": 1.3, "特殊": 1.0, "輔助": 0.5, "變化": 0.7, "其他": 1.0}},
    ]
    try:
        db.collection('MD_GameConfigs').document('Personalities').set({'types': personalities_data})
        print("成功寫入 Personalities 資料。")
    except Exception as e:
        print(f"寫入 Personalities 資料失敗: {e}")

    # 5. 稱號資料 (Titles)
    titles_data = ["新手", "見習士", "收藏家", "戰新星", "元素使", "傳奇者", "神締者", "吸星者", "技宗師", "勇者魂", "智多星", "守護者"]
    try:
        db.collection('MD_GameConfigs').document('Titles').set({'player_titles': titles_data})
        print("成功寫入 Titles 資料。")
    except Exception as e:
        print(f"寫入 Titles 資料失敗: {e}")

    # 6. 怪物成就列表 (MonsterAchievementsList)
    monster_achievements_data = [
        "初戰星", "百戰將", "常勝軍", "不死鳥", "速攻手", "重炮手", "守護神", "控場師", "元素核", "進化者",
        "稀有種", "菁英級", "傳奇級", "神話級", "無名者", "幸運星", "破壞王", "戰術家", "治癒者", "潛力股"
    ]
    try:
        db.collection('MD_GameConfigs').document('MonsterAchievementsList').set({'achievements': monster_achievements_data})
        print("成功寫入 MonsterAchievementsList 資料。")
    except Exception as e:
        print(f"寫入 MonsterAchievementsList 資料失敗: {e}")

    # 7. 元素預設名 (ElementNicknames)
    element_nicknames_data = {
        "火": "炎魂獸", "水": "碧波精", "木": "森之裔", "金": "鐵甲衛", "土": "岩心怪",
        "光": "聖輝使", "暗": "影匿者", "毒": "毒牙獸", "風": "疾風行", "無": "元氣寶", "混": "混沌體"
    }
    try:
        db.collection('MD_GameConfigs').document('ElementNicknames').set({'nicknames': element_nicknames_data})
        print("成功寫入 ElementNicknames 資料。")
    except Exception as e:
        print(f"寫入 ElementNicknames 資料失敗: {e}")

    # 8. 命名限制設定 (NamingConstraints)
    naming_constraints_data = {
        "max_player_title_len": 5,
        "max_monster_achievement_len": 5,
        "max_element_nickname_len": 5,
        "max_monster_full_nickname_len": 15
    }
    try:
        db.collection('MD_GameConfigs').document('NamingConstraints').set(naming_constraints_data)
        print("成功寫入 NamingConstraints 資料。")
    except Exception as e:
        print(f"寫入 NamingConstraints 資料失敗: {e}")

    # 9. 健康狀況資料 (HealthConditions)
    health_conditions_data = [
        {"id": "poisoned", "name": "中毒", "description": "持續受到毒素傷害，每回合損失HP。", "effects": {"hp_per_turn": -8}, "duration": 3, "icon": "🤢"},
        {"id": "paralyzed", "name": "麻痺", "description": "速度大幅下降，有較高機率無法行動。", "effects": {"speed": -20}, "duration": 2, "icon": "⚡", "chance_to_skip_turn": 0.3 },
        {"id": "burned", "name": "燒傷", "description": "持續受到灼燒傷害，攻擊力顯著下降。", "effects": {"hp_per_turn": -5, "attack": -10}, "duration": 3, "icon": "🔥"},
        {"id": "confused", "name": "混亂", "description": "行動時有50%機率攻擊自己或隨機目標。", "effects": {}, "duration": 2, "icon": "😵", "confusion_chance": 0.5},
        {"id": "energized", "name": "精力充沛", "description": "狀態絕佳！所有能力微幅提升。", "effects": {"attack": 5, "defense": 5, "speed": 5, "crit": 3}, "duration": 3, "icon": "💪"},
        {"id": "weakened", "name": "虛弱", "description": "所有主要戰鬥數值大幅下降。", "effects": {"attack": -12, "defense": -12, "speed": -8, "crit": -5}, "duration": 2, "icon": "😩"},
        {"id": "frozen", "name": "冰凍", "description": "完全無法行動，但受到火系攻擊傷害加倍。", "effects": {}, "duration": 1, "icon": "🥶", "elemental_vulnerability": {"火": 2.0} }
    ]
    try:
        db.collection('MD_GameConfigs').document('HealthConditions').set({'conditions_list': health_conditions_data})
        print("成功寫入 HealthConditions 資料。")
    except Exception as e:
        print(f"寫入 HealthConditions 資料失敗: {e}")

    # 10. 新手指南資料 (NewbieGuide)
    newbie_guide_data = [
        {"title": "遊戲目標", "content": "歡迎來到怪獸異世界！您的目標是透過組合不同的DNA碎片，創造出獨一無二的強大怪獸，並透過養成提升它們的能力，最終在排行榜上名列前茅。"},
        {"title": "怪獸命名規則", "content": "怪獸的完整名稱將由「您的當前稱號」+「怪獸獲得的成就」+「怪獸的屬性代表名」自動組成，總長度不超過15個字。您可以在怪獸詳細資料中修改其「屬性代表名」(最多5個字)。"},
        {"title": "DNA組合與怪獸農場", "content": "在「DNA管理」頁籤的「DNA組合」區塊，您可以將擁有的「DNA碎片」拖曳到上方的組合槽中。合成的怪獸會出現在「怪物農場」。農場是您培育、出戰、放生怪獸的地方。"},
        {"title": "戰鬥與吸收", "content": "您可以指派怪獸出戰並挑戰其他怪獸。勝利後，您有機會吸收敗方怪獸的精華，這可能會讓您的怪獸獲得數值成長，並獲得敗方怪獸的DNA碎片作為戰利品！"},
        {"title": "醫療站", "content": "「醫療站」是您照護怪獸的地方。您可以為受傷的怪獸恢復HP、MP，或治療不良的健康狀態。此外，您還可以將不需要的怪獸分解成DNA碎片，或使用特定的DNA為同屬性怪獸進行充能恢復HP。"},
        {"title": "修煉與技能成長", "content": "透過「養成」功能，您的怪獸可以進行修煉。修煉不僅能提升基礎數值、獲得物品，還有機會讓怪獸的技能獲得經驗值。技能經驗值滿了就能升級，變得更強！修煉中還有可能領悟全新的技能(等級1)！您將有機會決定是否讓怪獸學習新技能或替換現有技能。"},
        {"title": "屬性克制與技能類別", "content": "遊戲中存在屬性克制關係（詳見元素克制表）。此外，技能分為近戰、遠程、魔法、輔助等不同類別，怪獸的個性會影響它們使用不同類別技能的傾向。"},
    ]
    try:
        db.collection('MD_GameConfigs').document('NewbieGuide').set({'guide_entries': newbie_guide_data})
        print("成功寫入 NewbieGuide 資料。")
    except Exception as e:
        print(f"寫入 NewbieGuide 資料失敗: {e}")

    # 11. 價值設定資料 (ValueSettings)
    value_settings_data = {
        "element_value_factors": {
            "火": 1.2, "水": 1.1, "木": 1.0, "金": 1.3, "土": 0.9,
            "光": 1.5, "暗": 1.4, "毒": 0.8, "風": 1.0, "無": 0.7, "混": 0.6
        },
        "dna_recharge_conversion_factor": 0.15
    }
    try:
        db.collection('MD_GameConfigs').document('ValueSettings').set(value_settings_data)
        print("成功寫入 ValueSettings 資料。")
    except Exception as e:
        print(f"寫入 ValueSettings 資料失敗: {e}")

    # 12. 吸收效果設定 (AbsorptionSettings)
    absorption_settings_data = {
        "base_stat_gain_factor": 0.03,
        "score_diff_exponent": 0.3,
        "max_stat_gain_percentage": 0.015,
        "min_stat_gain": 1,
        "dna_extraction_chance_base": 0.75,
        "dna_extraction_rarity_modifier": {
            "普通": 1.0, "稀有": 0.9, "菁英":0.75, "傳奇":0.6, "神話":0.45
        }
    }
    try:
        db.collection('MD_GameConfigs').document('AbsorptionSettings').set(absorption_settings_data)
        print("成功寫入 AbsorptionSettings 資料。")
    except Exception as e:
        print(f"寫入 AbsorptionSettings 資料失敗: {e}")

    # 13. 修煉系統設定 (CultivationSettings)
    cultivation_settings_data = {
        "skill_exp_base_multiplier": 120,
        "new_skill_chance": 0.08,
        "skill_exp_gain_range": (15, 75),
        "max_skill_level": 7,
        "new_skill_rarity_bias": { "普通": 0.6, "稀有": 0.3, "菁英": 0.1 }
    }
    try:
        db.collection('MD_GameConfigs').document('CultivationSettings').set(cultivation_settings_data)
        print("成功寫入 CultivationSettings 資料。")
    except Exception as e:
        print(f"寫入 CultivationSettings 資料失敗: {e}")

    # 14. 元素克制表 (ElementalAdvantageChart) - 新增
    elemental_advantage_chart_data = {
        # 攻擊方: {防禦方: 倍率}
        "火": {"木": 1.5, "水": 0.5, "金": 1.2, "土": 0.8, "風":1.0, "毒":1.0, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "水": {"火": 1.5, "土": 1.2, "木": 0.5, "金": 0.8, "風":1.0, "毒":1.0, "光":1.0, "暗":1.0, "無":1.0, "混":1.0},
        "木": {"水": 1.5, "土": 0.5, "金": 0.8, "火": 0.8, "風":1.0, "毒":1.2, "光":1.0, "暗":1.0, "無":1.0, "混":1.0}, # 木克水，被土克，被火微弱抵抗，對毒有優勢
        "金": {"木": 1.5, "風": 1.2, "火": 0.5, "土": 1.2, "水": 0.8, "毒":0.8, "光":1.0, "暗":1.0, "無":1.0, "混":1.0}, # 金克木，對風和土有優勢，被火克，對水和毒抵抗
        "土": {"火": 1.2, "金": 0.5, "水": 0.5, "木": 1.5, "風": 0.8, "毒":1.2, "光":1.0, "暗":1.0, "無":1.0, "混":1.0}, # 土對火優勢，被金水克，克木，對風毒有優勢
        "光": {"暗": 1.75, "毒": 0.7, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "木": 1.0, "金": 1.0, "土": 1.0, "風": 1.0},
        "暗": {"光": 1.75, "風": 0.7, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "木": 1.0, "金": 1.0, "土": 1.0, "毒": 1.0},
        "毒": {"木": 1.4, "草": 1.4, "土": 1.2, "光": 0.7, "金": 0.7, "風":0.8, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "暗": 1.0}, # 假設毒也克草(木)
        "風": {"土": 1.4, "草": 1.4, "暗": 0.7, "金": 0.7, "毒":0.8, "無": 1.0, "混": 1.0, "火": 1.0, "水": 1.0, "木": 1.0, "光": 1.0}, # 風克土、草(木)
        "無": {el: 1.0 for el in ELEMENT_TYPES},
        "混": {el: 1.0 for el in ELEMENT_TYPES} # 混屬性可以有更複雜的規則，例如根據自身主要構成元素決定克制
    }
    # 確保每個元素對其他所有元素都有定義 (預設為1.0)
    for attacker_el_str in ELEMENT_TYPES:
        attacker_el: ElementTypes = attacker_el_str # type: ignore
        if attacker_el not in elemental_advantage_chart_data:
            elemental_advantage_chart_data[attacker_el] = {}
        for defender_el_str in ELEMENT_TYPES:
            defender_el: ElementTypes = defender_el_str # type: ignore
            if defender_el not in elemental_advantage_chart_data[attacker_el]:
                elemental_advantage_chart_data[attacker_el][defender_el] = 1.0
    try:
        db.collection('MD_GameConfigs').document('ElementalAdvantageChart').set(elemental_advantage_chart_data)
        print("成功寫入 ElementalAdvantageChart 資料。")
    except Exception as e:
        print(f"寫入 ElementalAdvantageChart 資料失敗: {e}")


    # 15. NPC 怪獸資料 (NPCMonsters)
    _personalities = personalities_data
    _monster_achievements = monster_achievements_data
    _element_nicknames = element_nicknames_data

    npc_monsters_data = [
        {
            "id": "npc_m_001", "nickname": "", # 暱稱將由服務層根據規則生成
            "elements": ["火"], "elementComposition": {"火": 100.0},
            "hp": 80, "mp": 30, "initial_max_hp": 80, "initial_max_mp": 30,
            "attack": 15, "defense": 10, "speed": 12, "crit": 5,
            "skills": random.sample(skill_database_data["火"], min(len(skill_database_data["火"]), random.randint(1,2))) if skill_database_data.get("火") else [],
            "rarity": "普通", "title": random.choice(_monster_achievements),
            "custom_element_nickname": _element_nicknames.get("火", "火獸"),
            "description": "一隻活潑的火焰小蜥蜴，喜歡追逐火花。",
            "personality": random.choice(_personalities),
            "creationTime": int(time.time()),
            "farmStatus": {"active": False, "isBattling": False, "isTraining": False, "completed": False, "boosts": {}},
            "resistances": {"火": 3, "水": -2}, "score": random.randint(100, 150), "isNPC": True,
            "resume": {"wins": 0, "losses": 0},
            "constituent_dna_ids": [random.choice([d['id'] for d in dna_fragments_data if d['type'] == '火' and d['rarity'] == '普通'])]
        },
        {
            "id": "npc_m_002", "nickname": "",
            "elements": ["木", "土"], "elementComposition": {"木": 70.0, "土": 30.0},
            "hp": 120, "mp": 25, "initial_max_hp": 120, "initial_max_mp": 25,
            "attack": 10, "defense": 20, "speed": 8, "crit": 3,
            "skills": random.sample(skill_database_data["木"] + skill_database_data["土"] + skill_database_data["無"], min(len(skill_database_data["木"] + skill_database_data["土"] + skill_database_data["無"]), random.randint(2,3))) if skill_database_data.get("木") or skill_database_data.get("土") or skill_database_data.get("無") else [],
            "rarity": "稀有", "title": random.choice(_monster_achievements),
            "custom_element_nickname": _element_nicknames.get("木", "木靈"), # 主屬性木
            "description": "堅毅的森林守衛者幼苗，擁有大地與森林的祝福。",
            "personality": random.choice(_personalities),
            "creationTime": int(time.time()),
            "farmStatus": {"active": False, "isBattling": False, "isTraining": False, "completed": False, "boosts": {}},
            "resistances": {"木": 5, "土": 5, "火": -3}, "score": random.randint(160, 220), "isNPC": True,
            "resume": {"wins": 0, "losses": 0},
            "constituent_dna_ids": [
                random.choice([d['id'] for d in dna_fragments_data if d['type'] == '木' and d['rarity'] == '稀有']),
                random.choice([d['id'] for d in dna_fragments_data if d['type'] == '土' and d['rarity'] == '普通'])
            ]
        }
    ]
    try:
        db.collection('MD_GameConfigs').document('NPCMonsters').set({'monsters': npc_monsters_data})
        print("成功寫入 NPCMonsters 資料。")
    except Exception as e:
        print(f"寫入 NPCMonsters 資料失敗: {e}")

    print("遊戲設定資料填充/更新完畢。")

if __name__ == '__main__':
    confirmation = input("您確定要執行此腳本並將遊戲設定資料填充/更新到 Firestore 嗎？此操作可能會覆蓋現有設定。(yes/no): ")
    if confirmation.lower() == 'yes':
        populate_game_configs()
    else:
        print("操作已取消。")

