# backend/MD_ai_services.py
# 負責與 AI 模型互動，為怪獸生成描述性內容

import os
import json
import requests # 用於發送 HTTP 請求 
import logging
import time
from typing import Dict, Any, List, Optional # 用於類型提示
import random 
import re # 匯入正規表達式模組

# 從專案的其他模組導入必要的模型
from .MD_models import Monster, PlayerGameData, ChatHistoryEntry, GameConfigs


# 設定日誌記錄器
ai_logger = logging.getLogger(__name__)

# --- DeepSeek API 設定 ---
DEEPSEEK_API_KEY = None # 初始化為 None
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions" # DeepSeek API 端點
DEEPSEEK_MODEL = "deepseek-chat" # 常用的 DeepSeek 模型，如有需要請更改

# 預設的 AI 生成內容，以防 API 呼叫失敗
DEFAULT_AI_RESPONSES = {
    "aiIntroduction": "關於這隻怪獸的起源眾說紛紜，只知道牠是在一次強烈的元素碰撞中意外誕生的。",
    "aiEvaluation": "AI 綜合評價生成失敗。由於未能全面評估此怪獸，暫時無法給出具體的培養建議。但請相信，每一隻怪獸都有其獨特之處，用心培養，定能發光發熱。"
}

# --- 核心修改處 START ---
# 新增缺少的 DEFAULT_CHAT_REPLY 變數
DEFAULT_CHAT_REPLY = "（...）"
# --- 核心修改處 END ---

DEFAULT_ADVENTURE_STORY = "AI 冒險故事生成失敗。這次的冒險充滿了未知與謎團，許多細節都模糊不清，無法被準確記錄下來。"
DEFAULT_BATTLE_SUMMARY = "AI 戰報總結生成失敗。這場戰鬥的過程太過激烈，快到無法看清細節，只留下了勝利或失敗的結果。"

def initialize_ai_services():
    """從環境變數中初始化 AI 服務所需的 API 金鑰"""
    global DEEPSEEK_API_KEY
    # 只從我們在 Render 設定的環境變數 'AI_API_KEY' 讀取
    DEEPSEEK_API_KEY = os.environ.get('AI_API_KEY')
    
    if DEEPSEEK_API_KEY:
        ai_logger.info("成功從環境變數 AI_API_KEY 載入 API 金鑰。")
    else:
        # 如果環境變數中沒有，則記錄警告，AI 功能將無法使用
        ai_logger.warning("未設定 AI_API_KEY 環境變數，所有 AI 功能將被禁用。")

# 在模組載入時執行初始化
initialize_ai_services()


def _call_deepseek_api(payload: Dict[str, Any], max_retries: int = 2, timeout: int = 60) -> Optional[Dict[str, Any]]:
    """
    內部函數，用於呼叫 DeepSeek API 並處理重試邏輯。

    Args:
        payload: 要發送給 API 的請求體。
        max_retries: 最大重試次數。
        timeout: 請求超時時間（秒）。

    Returns:
        成功時返回 API 的 JSON 響應，失敗時返回 None。
    """
    if not DEEPSEEK_API_KEY:
        ai_logger.warning("未提供 DeepSeek API 金鑰，無法呼叫 API。")
        return None

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }

    for attempt in range(max_retries + 1):
        try:
            response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=timeout)
            response.raise_for_status()  # 如果狀態碼不是 2xx，則拋出 HTTPError
            return response.json()
        except requests.exceptions.RequestException as e:
            ai_logger.error(f"呼叫 DeepSeek API 失敗 (第 {attempt + 1} 次嘗試): {e}")
            if attempt < max_retries:
                time.sleep(2 ** attempt)  # 指數退避
            else:
                return None
    return None

def generate_monster_introduction(monster: Monster) -> str:
    """
    為指定的怪獸生成一段引人入勝的介紹。
    """
    # 提取怪獸的主要元素和性格
    primary_element = monster.get("elements", ["無"])[0]
    personality_name = monster.get("personality", {}).get("name", "未知的")

    prompt = f"""
請你扮演一位知識淵博的「怪獸生態學家」，為一隻新發現的怪獸撰寫一段引人入勝的「圖鑑介紹」。
請嚴格遵守以下規則：
1.  **風格**：請使用繁體中文，文筆要兼具學術感與故事性，像是國家地理頻道的旁白。
2.  **長度**：嚴格限制在 80 到 120 字之間。
3.  **內容**：介紹必須圍繞這隻怪獸的「性格」、「主要元素屬性」和「名稱特徵」來展開。
4.  **禁止事項**：絕對不要在介紹中提及任何關於「數值（HP, MP, ATK, DEF, ...）」或「技能名稱」的字眼。

**怪獸資料如下：**
-   **名稱**: {monster.get('nickname')}
-   **主要元素**: {primary_element}
-   **性格**: {personality_name}
-   **稀有度**: {monster.get('rarity')}

現在，請開始你的創作：
"""
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 250,
        "temperature": 0.8,
    }
    
    response_json = _call_deepseek_api(payload)
    if response_json and response_json.get("choices"):
        return response_json["choices"][0]["message"]["content"].strip()
    
    return DEFAULT_AI_RESPONSES["aiIntroduction"]


def generate_monster_evaluation(monster: Monster, game_configs: GameConfigs) -> str:
    """
    根據怪獸的綜合數據，生成培養建議。
    """
    # 準備技能資訊
    skill_details = []
    for skill_info in monster.get("skills", []):
        skill_name = skill_info.get('name')
        skill_level = skill_info.get('level', 1)
        if skill_name:
            skill_details.append(f"{skill_name} (Lv.{skill_level})")

    prompt = f"""
請你扮演一位資深的「怪獸培育師」，為一位新手玩家的怪獸提供「綜合評價與培養建議」。
請遵循以下指南：
1.  **語氣**：專業、客觀，但帶有鼓勵性。
2.  **格式**：請嚴格按照下面的「評價報告」格式輸出，不要有任何多餘的文字。
3.  **內容**：
    -   **優勢分析**：根據怪獸的「最高屬性」和「性格」來分析其潛在的戰鬥風格和優勢。
    -   **潛力評估**：結合怪獸的「技能組合」和「屬性分佈」，評估其發展潛力（例如，是否適合速攻、防守反擊、後期成長等）。
    -   **培養建議**：基於以上分析，給出 1-2 條具體的培養方向建議。例如，建議優先提升哪個屬性，或者建議與什麼樣的隊友搭配。

**怪獸資料：**
-   **名稱**: {monster.get('nickname')}
-   **主要元素**: {monster.get('elements', ['無'])[0]}
-   **性格**: {monster.get('personality', {}).get('name')}
-   **屬性**:
    -   HP: {monster.get('hp', 0)}
    -   MP: {monster.get('mp', 0)}
    -   ATK: {monster.get('attack', 0)}
    -   DEF: {monster.get('defense', 0)}
    -   SPD: {monster.get('speed', 0)}
    -   CRIT: {monster.get('crit', 0)}%
-   **技能**: {', '.join(skill_details) if skill_details else "無"}

**輸出格式範本（請嚴格遵守）：**

**【評價報告】**

**優勢分析**：
（在這裡填寫你的分析）

**潛力評估**：
（在這裡填寫你的評估）

**培養建議**：
（在這裡填寫你的建議）
"""

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 400,
        "temperature": 0.7,
    }
    
    response_json = _call_deepseek_api(payload)
    if response_json and response_json.get("choices"):
        content = response_json["choices"][0]["message"]["content"].strip()
        if "【評價報告】" in content:
            return content.split("【評價報告】", 1)[1].strip()
        return content

    return DEFAULT_AI_RESPONSES["aiEvaluation"]


def generate_adventure_story(player: PlayerGameData, monster: Monster, adventure_result: Dict[str, Any], island_name: str) -> str:
    """
    根據冒險結果，為怪獸生成一段冒險故事。
    """
    events_summary = []
    for event in adventure_result.get("events", []):
        events_summary.append(event.get("description", "發生了一件未知的事件。"))
    events_text = " ".join(events_summary)

    items_summary = ", ".join(adventure_result.get("items_found", [])) or "空手而歸"

    growth_summary_parts = []
    for stat, gain in adventure_result.get("stat_gains", {}).items():
        growth_summary_parts.append(f"{stat.upper()}提升了{gain}")
    growth_summary = ", ".join(growth_summary_parts) or "沒有明顯成長"

    prompt = f"""
請你扮演一位「吟遊詩人」，將一段怪獸的冒險經歷譜寫成一小段生動的冒險故事。
請遵循以下規則：
1.  **風格**：使用繁體中文，文筆要富有想像力和畫面感，像是在朗讀一篇冒險小說的片段。
2.  **視角**：以怪獸 `{monster.get('nickname')}` 為故事的主角。
3.  **長度**：嚴格控制在 100 到 150 字之間。
4.  **內容**：故事必須巧妙地融合以下所有「冒險日誌」中的元素。

**冒險日誌：**
-   **主角**: 怪獸 `{monster.get('nickname')}` (主人是 `{player.get('nickname')}`)
-   **冒險地點**: {island_name}
-   **經歷事件**: {events_text}
-   **最終收穫**: 找到的物品: {items_summary}
-   **能力成長**: {growth_summary}

現在，請開始你的創作，將這些日誌條目變成一個連貫、精彩的故事：
"""
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 300,
        "temperature": 0.9,
    }

    response_json = _call_deepseek_api(payload)
    if response_json and response_json.get("choices"):
        return response_json["choices"][0]["message"]["content"].strip()

    return DEFAULT_ADVENTURE_STORY


def generate_battle_report_content(battle_result: Dict[str, Any], monster1_name: str, monster2_name: str, player1_name: str, player2_name: str) -> Dict[str, Any]:
    """
    根據戰鬥結果，生成結構化的戰報內容 (總結、戰利品資訊、成長資訊)。
    """
    winner_name = battle_result.get("winner_name", "未知")
    total_rounds = battle_result.get("total_rounds", 0)

    highlights = []
    for log in battle_result.get("log", []):
        # 假設 highlight 資訊被標記在 log 條目中
        if log.get("highlight"):
            highlights.append(log["message"])
    highlights_text = " ".join(highlights) if highlights else "戰鬥過程平淡無奇。"

    prompt = f"""
請你扮演一位激情的「戰地記者」，為一場剛剛結束的怪獸對戰撰寫一篇「戰報總結」。
請嚴格遵守以下規則：
1.  **風格**：使用繁體中文，語氣要熱血沸騰，充滿動感和張力，彷彿在解說一場精彩的比賽。
2.  **長度**：嚴格控制在 100 到 150 字之間。
3.  **內容**：戰報必須清晰地交代「參賽雙方」、「勝負結果」，並生動地描寫「戰鬥中的一兩個亮點時刻」。
4.  **禁止事項**: 絕對不要自己加上 #Hashtag。

**戰鬥情報：**
-   **參賽方 A**: 玩家 `{player1_name}` 的怪獸 `{monster1_name}`
-   **參賽方 B**: 玩家 `{player2_name}` 的怪獸 `{monster2_name}`
-   **戰鬥結果**: `{winner_name}` 獲勝！
-   **總回合數**: {total_rounds}
-   **亮點時刻**: {highlights_text}

現在，請開始你的報導：
"""

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 300,
        "temperature": 0.85,
    }
    
    ai_summary = DEFAULT_BATTLE_SUMMARY
    try:
        response_json = _call_deepseek_api(payload, timeout=45)
        if response_json and response_json.get("choices"):
            ai_summary = response_json["choices"][0]["message"]["content"].strip()
    except Exception as e:
        ai_logger.error(f"呼叫 DeepSeek API 生成戰報總結時發生錯誤: {e}", exc_info=True)

    # 準備戰利品和成長資訊
    absorption_details = battle_result.get("absorption_details", {})
    loot_info_parts = []
    if absorption_details.get("extracted_dna_templates"):
        loot_names = [d.get('name', '未知DNA') for d in absorption_details["extracted_dna_templates"]]
        loot_info_parts.append(f"戰利品：獲得 {len(loot_names)} 個 DNA 碎片（{', '.join(loot_names)}）。")
    
    growth_info_parts = []
    if absorption_details.get("stat_gains"):
        growth_details = [f"**{stat.upper()} +{gain}**" for stat, gain in absorption_details["stat_gains"].items()]
        growth_info_parts.append(f"怪獸成長：吸收了能量，獲得能力提升（{', '.join(growth_details)}）。")

    # --- 核心修改處 START ---
    # 修正函式返回值，確保返回的是一個字典而不是字串
    final_report = {
        "battle_summary": ai_summary,
        "loot_info": " ".join(loot_info_parts),
        "growth_info": " ".join(growth_info_parts),
    }
    return final_report
    # --- 核心修改處 END ---


def generate_chat_response(monster: Monster, chat_history: List[ChatHistoryEntry], player_nickname: str, interaction_type: Optional[str] = None) -> str:
    """
    根據怪獸的性格和對話歷史生成回應。
    """
    
    personality_summary = f"你是 {monster.get('nickname')}，你的性格是：{monster.get('personality', {}).get('name')}。"

    system_prompt = (
        f"你是一隻名為'{monster.get('nickname')}'的怪獸，你的主人是'{player_nickname}'。"
        f"你的性格特質是：{monster.get('personality', {}).get('name')}。"
        "請根據你的性格和以下的對話歷史，用繁體中文、非常簡短且口語化的方式回應。"
        "你的回答嚴格限制在 30 個字以內。不要使用 '*' 或任何 markdown 語法，就像在聊天一樣直接說話。"
    )

    interaction_prompt = ""
    if interaction_type == 'greeting':
        interaction_prompt = "你的主人剛來看你，跟他打個招呼吧。"
    elif interaction_type == 'punch':
        interaction_prompt = "你的主人開玩笑地揍了你一下，請根據你的性格回應。"
    elif interaction_type == 'pat':
        interaction_prompt = "你的主人溫柔地摸了摸你，請根據你的性格回應。"
    elif interaction_type == 'kiss':
        interaction_prompt = "你的主人親了你一下，請根據你的性格回應。"

    messages = [{"role": "system", "content": system_prompt}]
    for entry in chat_history[-6:]:
        role = entry.get('role', 'user') 
        content = entry.get('content', '')
        messages.append({"role": role, "content": content})
    
    if interaction_prompt:
        messages.append({"role": "user", "content": interaction_prompt})

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": messages,
        "max_tokens": 60,
        "temperature": 1.1, 
    }
    
    response_json = _call_deepseek_api(payload, timeout=20)
    if response_json and response_json.get("choices"):
        content = response_json["choices"][0]["message"]["content"].strip()
        return re.sub(r'[\*\'"]', '', content)

    if interaction_type:
        return f"({monster.get('nickname')}好像在想些什麼...)"
    return "（牠好像不想說話...）"

def generate_monster_ai_details(monster: Monster) -> Dict[str, str]:
    """
    一個統一的函式，同時生成介紹和評價。
    """
    from .MD_config_services import load_all_game_configs_from_firestore
    game_configs = load_all_game_configs_from_firestore()

    skill_details = []
    for skill_info in monster.get("skills", []):
        skill_name = skill_info.get('name')
        skill_level = skill_info.get('level', 1)
        if skill_name:
            skill_details.append(f"{skill_name} (Lv.{skill_level})")

    prompt = f"""
請你扮演一位資深的「怪獸培育師」，為一隻新發現的怪獸撰寫「圖鑑介紹」和「綜合評價」。
請嚴格遵守以下規則：
1.  **風格**：使用繁體中文，文筆要兼具學術感與故事性。
2.  **禁止事項**：絕對不要在介紹中提及任何關於「數值（HP, MP, ATK, DEF, ...）」或「技能名稱」的字眼。
3.  **格式**：請嚴格按照下面的「--- 소개 ---」和「--- 평가 ---」分隔格式輸出，不要有任何多餘的文字。

**怪獸資料如下：**
-   **名稱**: {monster.get('nickname')}
-   **主要元素**: {monster.get('elements', ['無'])[0]}
-   **性格**: {monster.get('personality', {}).get('name')}
-   **稀有度**: {monster.get('rarity')}

--- 소개 ---
（請在此處撰寫 80 到 120 字的圖鑑介紹，圍繞怪獸的元素、性格和可能的生態習性展開。）

--- 평가 ---
（請在此處撰寫 80 到 120 字的綜合評價與培養建議，基於怪獸的屬性（HP: {monster.get('hp')}, 攻擊: {monster.get('attack')}, 防禦: {monster.get('defense')}）、技能組合 ({', '.join(skill_details) if skill_details else "無"}) 和性格，提出 1-2 條具體的培養方向。）
"""
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 500,
        "temperature": 0.8,
    }
    
    response_json = _call_deepseek_api(payload)
    
    if response_json and response_json.get("choices"):
        content = response_json["choices"][0]["message"]["content"].strip()
        parts = content.split("--- 평가 ---")
        if len(parts) == 2:
            intro = parts[0].replace("--- 소개 ---", "").strip()
            evaluation = parts[1].strip()
            return {
                "aiIntroduction": intro,
                "aiEvaluation": evaluation
            }
    
    return DEFAULT_AI_RESPONSES.copy()
    
def _get_world_knowledge_context(player_message: str, game_configs: GameConfigs, player_data: PlayerGameData, current_monster_id: str) -> Optional[Dict[str, Any]]:
    """
    根據玩家的提問，從遊戲設定中查找相關知識。
    """
    query = player_message.lower()
    context = ""
    source = None

    all_skills = [skill for skills_by_type in game_configs.get("skills", {}).values() for skill in skills_by_type]
    for skill in all_skills:
        if skill['name'].lower() in query:
            context = f"技能「{skill['name']}」的說明：{skill.get('description', '暫無說明。')} 類型：{skill['type']}屬性，{skill.get('skill_category', '未知')}類。"
            source = f"技能: {skill['name']}"
            return {"source": source, "context": context}

    all_player_monsters = player_data.get("farmedMonsters", [])
    for monster in all_player_monsters:
        monster_name_part = monster.get('element_nickname_part') or monster.get('nickname')
        if monster_name_part and monster_name_part.lower() in query:
            is_self = monster['id'] == current_monster_id
            if is_self:
                context = f"關於我自己的事嗎？我是一隻{monster.get('rarity')}{monster.get('elements', ['無'])[0]}屬性的怪獸，我的個性是{monster.get('personality', {}).get('name')}。"
            else:
                context = f"你問到「{monster_name_part}」嗎？牠是和我一起待在農場的夥伴。牠是一隻{monster.get('rarity')}{monster.get('elements', ['無'])[0]}屬性的怪獸。"
            source = f"怪獸: {monster_name_part}"
            return {"source": source, "context": context}
            
    game_concepts = {
        "屬性克制": "在這個世界，屬性克制很重要！例如火剋木，水剋火。用對了屬性，打起架來會輕鬆很多喔！",
        "合成": "我們可以把5個DNA碎片合在一起，變成一隻新的怪獸夥伴！",
        "修煉": "修煉可以讓我們變強，不只HP、攻擊這些會成長，技能也會升級！",
        "DNA": "DNA碎片是組成我們的基本材料，聽說稀有度越高的DNA，合出來的夥伴就越厲害！"
    }
    for concept, explanation in game_concepts.items():
        if concept.lower() in query:
            context = explanation
            source = f"遊戲概念: {concept}"
            return {"source": source, "context": context}

    return None

def _get_bond_level_tone_instruction(bond_points: int) -> str:
    """根據感情值，決定AI的語氣指示。"""
    if bond_points <= -76:
        return "你和主人的關係極度惡劣，充滿了敵意和不耐煩。你可能會直接拒絕回答問題，或者用簡短、尖銳的詞語來回應。"
    elif bond_points <= -11:
        return "你和主人的關係非常冷淡和疏遠。你會用『喔』、『嗯』、『隨便』這類詞語，字裡行間透露出不感興趣。"
    elif bond_points <= 10:
        return "你和主人的關係很普通，主要根據你的天生個性來回應。"
    elif bond_points <= 75:
        return "你和主人的關係相當不錯，語氣友善且熱心。你會更願意分享資訊，在句末可能會加上一些溫和的表情符號。"
    else:
        return "你和主人的關係非常親密，充滿了信任感和熱情。你會稱呼玩家為『摯友』或『夥伴』，並在回答中充滿依賴感。"
