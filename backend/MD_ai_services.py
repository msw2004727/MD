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
    prompt = f"""
請你扮演一位知識淵博的「怪獸生態學家」，為一隻新發現的怪獸撰寫一段引人入勝的「圖鑑介紹」。
請嚴格遵守以下規則：
1.  **風格**：請使用繁體中文，文筆要兼具學術感與故事性，像是國家地理頻道的旁白。
2.  **長度**：嚴格限制在 80 到 120 字之間。
3.  **內容**：介紹必須圍繞這隻怪獸的「性格」、「主要元素屬性」和「身體部位特徵」來展開。
4.  **禁止事項**：絕對不要在介紹中提及任何關於「數值（HP, MP, ATK, DEF, ...）」或「技能名稱」的字眼。

**怪獸資料如下：**
-   **名稱**: {monster.nickname}
-   **主要元素**: {monster.main_element}
-   **性格**: {', '.join(monster.personality)}
-   **身體部位**:
    -   頭部: {monster.parts.head.name} ({monster.parts.head.element}屬性)
    -   左臂: {monster.parts.left_arm.name} ({monster.parts.left_arm.element}屬性)
    -   右臂: {monster.parts.right_arm.name} ({monster.parts.right_arm.element}屬性)
    -   左腿: {monster.parts.left_leg.name} ({monster.parts.left_leg.element}屬性)
    -   右腿: {monster.parts.right_leg.name} ({monster.parts.right_leg.element}屬性)

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
    for skill_info in monster.skills:
        skill_id = skill_info.get('id')
        skill_level = skill_info.get('level', 1)
        if skill_id:
            skill_data = game_configs.get_skill_data(skill_id)
            if skill_data:
                skill_details.append(f"{skill_data.get('name', skill_id)} (Lv.{skill_level})")

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
-   **名稱**: {monster.nickname}
-   **主要元素**: {monster.main_element}
-   **性格**: {', '.join(monster.personality)}
-   **屬性**:
    -   HP: {monster.stats.hp}
    -   MP: {monster.stats.mp}
    -   ATK: {monster.stats.atk}
    -   DEF: {monster.stats.def}
    -   SPD: {monster.stats.spd}
    -   EVD: {monster.stats.evd}
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
        # 移除可能出現的 "好的，這是一份為您準備的評價報告：" 等前導語
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
2.  **視角**：以怪獸 `{monster.nickname}` 為故事的主角。
3.  **長度**：嚴格控制在 100 到 150 字之間。
4.  **內容**：故事必須巧妙地融合以下所有「冒險日誌」中的元素。

**冒險日誌：**
-   **主角**: 怪獸 `{monster.nickname}` (主人是 `{player.nickname}`)
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


def generate_battle_summary(battle_result: Dict[str, Any], monster1_name: str, monster2_name: str, player1_name: str, player2_name: str) -> str:
    """
    根據戰鬥結果，生成戰報總結。
    """
    winner_name = battle_result.get("winner_name", "未知")
    loser_name = battle_result.get("loser_name", "未知")
    total_rounds = battle_result.get("total_rounds", 0)

    # 提取戰鬥亮點
    highlights = []
    for log in battle_result.get("log", []):
        if log.get("highlight"):
            highlights.append(log["message"])
    highlights_text = " ".join(highlights) if highlights else "戰鬥過程平淡無奇。"

    prompt = f"""
請你扮演一位激情的「戰地記者」，為一場剛剛結束的怪獸對戰撰寫一篇「戰報總結」。
請嚴格遵守以下規則：
1.  **風格**：使用繁體中文，語氣要熱血沸騰，充滿動感和張力，彷彿在解說一場精彩的比賽。
2.  **長度**：嚴格控制在 100 到 150 字之間。
3.  **內容**：戰報必須清晰地交代「參賽雙方」、「勝負結果」，並生動地描寫「戰鬥中的一兩個亮點時刻」。
4.  **附加任務**：在總結的最後，請加上一個獨特的 Hashtag 標籤，格式為 `#<四字成語或熱血詞彙>之戰`。

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
    ai_tags = []
    
    try:
        response_json = _call_deepseek_api(payload, timeout=45)
        if response_json and response_json.get("choices"):
            content = response_json["choices"][0]["message"]["content"].strip()
            
            # --- 核心修改處 START ---
            # 尋找 Hashtag
            tag_match = re.search(r'(#\S+之戰)', content)
            if tag_match:
                tag = tag_match.group(1)
                # 從正文中移除標籤
                ai_summary = content.replace(tag, '').strip()
                ai_tags.append(tag)
                ai_logger.info(f"成功提取標籤: {tag}")
            else:
                ai_summary = content
                ai_logger.warning("AI 生成的內容中未找到預期格式的標籤。")
                # 新增備用方案：如果 AI 忘記加標籤，我們手動從標籤池裡隨機選一個
                try:
                    with open('backend/data/battle_highlights.json', 'r', encoding='utf-8') as f:
                        highlights_data = json.load(f)
                        if highlights_data.get("tags"):
                           random_tag = random.choice(highlights_data["tags"])
                           ai_tags.append(f"#{random_tag}之戰")
                           ai_logger.info(f"AI 未生成標籤，已隨機選取備用標籤: {ai_tags[-1]}")
                except Exception as file_e:
                    ai_logger.error(f"讀取備用標籤檔案 battle_highlights.json 時出錯: {file_e}")

            # 增加一個檢查，如果 summary 意外地變得很短，可能是AI只返回了標籤
            if len(ai_summary) < 20 and len(content) > 20:
                 ai_summary = content.strip() # 如果發生這種情況，還原成原始輸出
                 ai_logger.warning("偵測到 summary 過短，已還原。")
            # --- 核心修改處 END ---
        
    except Exception as e:
        ai_logger.error(f"呼叫 DeepSeek API 生成戰報總結時發生錯誤: {e}", exc_info=True)

    # 將標籤附加到總結後面
    if ai_tags:
        tags_str = " ".join(ai_tags)
        ai_summary += f"\n\n{tags_str}"

    absorption_details = battle_result.get("absorption_details", {})
    loot_info_parts = []
    if absorption_details.get("extracted_dna_templates"):
        loot_names = [d.get('name', '未知DNA') for d in absorption_details["extracted_dna_templates"]]
        loot_info_parts.append(f"戰利品：獲得 {len(loot_names)} 個 DNA 碎片（{', '.join(loot_names)}）。")
    
    growth_info_parts = []
    if absorption_details.get("stat_gains"):
        growth_details = [f\"{stat.upper()} +{gain}\" for stat, gain in absorption_details["stat_gains"].items()]
        growth_info_parts.append(f"怪獸成長：吸收了能量，獲得能力提升（{', '.join(growth_details)}）。")

    final_report = {
        "ai_summary": ai_summary,
        "loot_info": " ".join(loot_info_parts),
        "growth_info": " ".join(growth_info_parts),
    }

    # 組合最終的完整報告字串
    full_report_str = final_report["ai_summary"]
    if final_report["loot_info"]:
        full_report_str += f'\n\n{final_report["loot_info"]}'
    if final_report["growth_info"]:
        full_report_str += f'\n{final_report["growth_info"]}'
        
    return full_report_str.strip()


def generate_chat_response(monster: Monster, chat_history: List[ChatHistoryEntry], player_nickname: str, interaction_type: Optional[str] = None) -> str:
    """
    根據怪獸的性格和對話歷史生成回應。
    """
    
    # 建立一個簡潔的性格描述
    personality_summary = f"你是 {monster.nickname}，你的性格是：{','.join(monster.personality)}。"

    # 建立系統提示
    system_prompt = (
        f"你是一隻名為'{monster.nickname}'的怪獸，你的主人是'{player_nickname}'。"
        f"你的性格特質是：{', '.join(monster.personality)}。"
        "請根據你的性格和以下的對話歷史，用繁體中文、非常簡短且口語化的方式回應。"
        "你的回答嚴格限制在 30 個字以內。不要使用 '*' 或任何 markdown 語法，就像在聊天一樣直接說話。"
    )

    # 處理特定的互動類型
    interaction_prompt = ""
    if interaction_type == 'greeting':
        interaction_prompt = "你的主人剛來看你，跟他打個招呼吧。"
    elif interaction_type == 'punch':
        interaction_prompt = "你的主人開玩笑地揍了你一下，請根據你的性格回應。"
    elif interaction_type == 'pat':
        interaction_prompt = "你的主人溫柔地摸了摸你，請根據你的性格回應。"
    elif interaction_type == 'kiss':
        interaction_prompt = "你的主人親了你一下，請根據你的性格回應。"

    # 組合對話歷史
    messages = [{"role": "system", "content": system_prompt}]
    for entry in chat_history[-6:]:  # 取最近的6條對話
        # DeepSeek 的角色是 'user' 和 'assistant'
        role = 'assistant' if entry.role == 'model' else 'user'
        messages.append({"role": role, "content": entry.parts[0]})
    
    # 如果有互動，將其作為最後一條用戶訊息加入
    if interaction_prompt:
        messages.append({"role": "user", "content": interaction_prompt})

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": messages,
        "max_tokens": 60,
        "temperature": 1.1, # 稍高的溫度讓對話更多樣化
    }
    
    response_json = _call_deepseek_api(payload, timeout=20)
    if response_json and response_json.get("choices"):
        content = response_json["choices"][0]["message"]["content"].strip()
        # 再次清理，確保沒有多餘的符號
        return re.sub(r'[\*\'"]', '', content)

    # 互動類型的預設回應
    if interaction_type:
        return f"({monster.nickname}好像在想些什麼...)"
    # 一般對話的預設回應
    return "（牠好像不想說話...）"
