[
  {
    "name": "火焰拳",
    "description": "凝聚火焰的拳頭進行攻擊。",
    "type": "火",
    "rarity": "普通",
    "skill_category": "近戰",
    "mp_cost": 6,
    "priority": 0,
    "accuracy": 95,
    "effects": [
      {
        "type": "damage",
        "power": 30,
        "target": "opponent_single"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "拳風帶有灼熱氣息，有20%機率使對手陷入「燒傷」狀態。",
        "add_effects": [
          {
            "type": "apply_status",
            "status_id": "burn",
            "chance": 0.2,
            "target": "opponent_single",
            "log_success": "{target}的身上燃起了火焰！"
          }
        ]
      },
      "10": {
        "description": "威力永久提升15點。",
        "add_power": 15
      }
    }
  },
  {
    "name": "火星彈",
    "description": "彈射出帶有火星的能量彈。",
    "type": "火",
    "rarity": "普通",
    "skill_category": "遠程",
    "mp_cost": 5,
    "priority": 0,
    "accuracy": 100,
    "effects": [
      {
        "type": "damage",
        "power": 25,
        "target": "opponent_single"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "變為連續發射2次火星彈，每次威力獨立計算。",
        "add_effects": [
          {
            "type": "damage",
            "power": 25,
            "target": "opponent_single"
          }
        ]
      },
      "10": {
        "description": "每次攻擊的爆擊率額外提升5%。",
        "add_crit": 5
      }
    }
  },
  {
    "name": "燃燒術",
    "description": "用基礎的火焰法術灼燒對手。",
    "type": "火",
    "rarity": "普通",
    "skill_category": "魔法",
    "mp_cost": 7,
    "priority": 0,
    "accuracy": 95,
    "effects": [
      {
        "type": "damage",
        "power": 35,
        "target": "opponent_single"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "施加的「燒傷」狀態每回合傷害增加50%。"
      },
      "10": {
        "description": "技能威力提升10點，並有15%機率使對手魔防下降。"
      }
    }
  },
  {
    "name": "暖身",
    "description": "小幅提升自身的攻擊力。",
    "type": "火",
    "rarity": "普通",
    "skill_category": "輔助",
    "mp_cost": 8,
    "priority": 0,
    "accuracy": "auto",
    "effects": [
      {
        "type": "stat_change",
        "target": "self",
        "stat": "attack",
        "amount": 5,
        "log_success": "{performer}的身體變暖，攻擊力提升了！"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "效果變為「攻擊力與防禦力同時小幅提升」。"
      },
      "10": {
        "description": "效果持續時間延長2回合。"
      }
    }
  },
  {
    "name": "熱砂踢",
    "description": "踢起灼熱的沙土攻擊對手。",
    "type": "火",
    "rarity": "普通",
    "skill_category": "物理",
    "mp_cost": 5,
    "priority": 0,
    "accuracy": 90,
    "effects": [
      {
        "type": "damage",
        "power": 28,
        "target": "opponent_single"
      }
    ],
    "level_milestones": {
      "4": {
        "description": "揚起的沙塵有40%機率降低對手命中率。"
      },
      "8": {
        "description": "威力提升10點，爆擊率提升10%。"
      }
    }
  },
  {
    "name": "點燃",
    "description": "有90%機率使對手陷入「燒傷」狀態。",
    "type": "火",
    "rarity": "普通",
    "skill_category": "特殊",
    "mp_cost": 7,
    "priority": 0,
    "accuracy": 90,
    "effects": [
      {
        "type": "damage",
        "power": 10,
        "target": "opponent_single"
      },
      {
        "type": "apply_status",
        "status_id": "burn",
        "chance": 0.9,
        "target": "opponent_single",
        "log_success": "{target}的身上燃起了火焰！"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "狀態命中率提升至100%。"
      },
      "10": {
        "description": "額外造成20點固定火焰傷害。"
      }
    }
  },
  {
    "name": "威嚇",
    "description": "有85%機率降低對手的攻擊力。",
    "type": "火",
    "rarity": "普通",
    "skill_category": "變化",
    "mp_cost": 6,
    "priority": 0,
    "accuracy": 85,
    "effects": [
      {
        "type": "stat_change",
        "target": "opponent_single",
        "stat": "attack",
        "amount": -5,
        "log_success": "在{performer}的威嚇下，{target}的攻擊力下降了！"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "效果提升為「有90%機率降低對手攻擊力(-8)」。"
      },
      "10": {
        "description": "同時有30%機率讓對手陷入「麻痺」狀態1回合。"
      }
    }
  },
  {
    "name": "靜電火花",
    "description": "有30%機率讓對手陷入「麻痺」狀態。",
    "type": "火",
    "rarity": "普通",
    "skill_category": "其他",
    "mp_cost": 6,
    "priority": 0,
    "accuracy": 100,
    "effects": [
      {
        "type": "damage",
        "power": 20,
        "target": "opponent_single"
      },
      {
        "type": "apply_status",
        "status_id": "paralysis",
        "chance": 0.3,
        "target": "opponent_single",
        "log_success": "{target}被靜電火花麻痺了！"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "「麻痺」機率提升至50%。"
      },
      "10": {
        "description": "威力提升15點。"
      }
    }
  },
  {
    "name": "爆炎衝",
    "description": "身體化為爆炎衝撞對手。",
    "type": "火",
    "rarity": "稀有",
    "skill_category": "近戰",
    "mp_cost": 12,
    "priority": 0,
    "accuracy": 90,
    "effects": [
      {
        "type": "damage",
        "power": 55,
        "target": "opponent_single"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "衝撞時產生爆炸，有30%機率使對手陷入「燒傷」狀態。"
      },
      "10": {
        "description": "威力永久提升20點，無視對手部分防禦。"
      }
    }
  },
  {
    "name": "追蹤火球",
    "description": "投擲會追蹤對手的火球。",
    "type": "火",
    "rarity": "稀有",
    "skill_category": "遠程",
    "mp_cost": 11,
    "priority": 0,
    "accuracy": "auto",
    "effects": [
      {
        "type": "damage",
        "power": 45,
        "target": "opponent_single"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "火球變得更大，威力提升15點。"
      },
      "10": {
        "description": "擊中後有50%機率降低對手的速度。"
      }
    }
  },
  {
    "name": "大字爆",
    "description": "釋放出大字形的巨大火焰。",
    "type": "火",
    "rarity": "稀有",
    "skill_category": "魔法",
    "mp_cost": 15,
    "priority": 0,
    "accuracy": 85,
    "effects": [
      {
        "type": "damage",
        "power": 65,
        "target": "opponent_single"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "爆炸範圍擴大，有20%機率使對手攻擊力下降。"
      },
      "10": {
        "description": "技能威力永久提升25點。"
      }
    }
  },
  {
    "name": "烈日祝福",
    "description": "大幅提升自身的攻擊力與爆擊率。",
    "type": "火",
    "rarity": "稀有",
    "skill_category": "輔助",
    "mp_cost": 14,
    "priority": 0,
    "accuracy": "auto",
    "effects": [
      {
        "type": "stat_change",
        "target": "self",
        "stat": [
          "attack",
          "crit"
        ],
        "amount": [
          10,
          5
        ],
        "log_success": "{performer}沐浴在烈日祝福中，力量湧現！"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "祝福效果結束時，會回復自身少量MP。"
      },
      "10": {
        "description": "祝福期間，自身對「冰凍」狀態免疫。"
      }
    }
  },
  {
    "name": "火山踢",
    "description": "如同火山爆發般的強力踢擊。",
    "type": "火",
    "rarity": "稀有",
    "skill_category": "物理",
    "mp_cost": 11,
    "priority": 0,
    "accuracy": 95,
    "effects": [
      {
        "type": "damage",
        "power": 50,
        "target": "opponent_single"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "30%機率使對手的防禦力下降。"
      },
      "10": {
        "description": "威力永久提升15點，並附加「燒傷」效果。"
      }
    }
  },
  {
    "name": "煉獄之火",
    "description": "用不滅的煉獄之火折磨對手，100%造成強力「燒傷」。",
    "type": "火",
    "rarity": "稀有",
    "skill_category": "特殊",
    "mp_cost": 13,
    "priority": 0,
    "accuracy": 90,
    "effects": [
      {
        "type": "damage",
        "power": 20,
        "target": "opponent_single"
      },
      {
        "type": "apply_status",
        "status_id": "badly_burned",
        "chance": 1,
        "target": "opponent_single",
        "log_success": "{target}被永不熄滅的煉獄之火纏上了！"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "造成的「燒傷」狀態無法被常規方法解除。"
      },
      "10": {
        "description": "對已經處於「燒傷」狀態的敵人造成1.5倍傷害。"
      }
    }
  },
  {
    "name": "熔化",
    "description": "用高溫熔化對手的防具，有90%機率大幅降低防禦力。",
    "type": "火",
    "rarity": "稀有",
    "skill_category": "變化",
    "mp_cost": 12,
    "priority": 0,
    "accuracy": 90,
    "effects": [
      {
        "type": "stat_change",
        "target": "opponent_single",
        "stat": "defense",
        "amount": -10,
        "chance": 0.9,
        "log_success": "{target}的防具被高溫熔化，防禦力大幅下降！"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "效果提升為「100%機率大幅降低防禦力(-12)」。"
      },
      "10": {
        "description": "效果變為持續3回合，每回合降低防禦力。"
      }
    }
  },
  {
    "name": "自爆",
    "description": "犧牲自己，對敵人造成巨大傷害。",
    "type": "火",
    "rarity": "稀有",
    "skill_category": "其他",
    "mp_cost": 20,
    "priority": 0,
    "accuracy": 100,
    "effects": [
      {
        "type": "special",
        "special_logic_id": "self_ko_damage",
        "power": 80,
        "target": "opponent_all",
        "log_success": "{performer}犧牲了自己，引發了驚天動地的大爆炸！"
      }
    ],
    "level_milestones": {
      "5": {
        "description": "爆炸後，有50%機率以1HP的狀態存活下來。"
      },
      "10": {
        "description": "爆炸時，同時對對手造成「燒傷」與「麻痺」狀態。"
      }
    }
  }
]