# MD_ai_services.py
# 負責與 AI 模型互動，為怪獸生成描述性內容

import os
import json
import requests # 用於發送 HTTP 請求
import logging
import time
from typing import Dict, Any # 用於類型提示

# 設定日誌記錄器
ai_logger = logging.getLogger(__name__)

# Gemini API 設定
GEMINI_API_KEY = "" # 將由 Canvas 環境提供或留空
GEMINI_API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
DEFAULT_MODEL = "gemini-2.0-flash"

# 預設的 AI 生成內容，以防 API 呼叫失敗
DEFAULT_AI_RESPONSES = {
    "aiPersonality": "AI 個性描述生成失敗，這隻怪獸的性格如同一個未解之謎，等待著有緣人去探索。它可能時而溫順，時而狂野，需要訓練師細心的觀察與引導。",
    "aiIntroduction": "AI 介紹生成失敗。這隻神秘的怪獸，其基礎數值（HP、MP、攻擊、防禦、速度、爆擊率）和元素屬性都隱藏在迷霧之中，只有真正的強者才能揭開它的全部潛力。",
    "aiEvaluation": "AI 綜合評價生成失敗。由於未能全面評估此怪獸的個性與數值，暫時無法給出具體的培養建議。但請相信，每一隻怪獸都有其獨特之處，用心培養，定能發光發熱。"
}

def generate_monster_ai_details(monster_data: Dict[str, Any]) -> Dict[str, str]:
    """
    使用 Gemini API 為指定的怪獸數據生成 AI 描述、個性和評價。

    Args:
        monster_data (Dict[str, Any]): 包含怪獸資訊的字典，應包含:
            'nickname' (str): 怪獸暱稱
            'elements' (List[str]): 元素列表
            'rarity' (str): 稀有度名稱
            'hp' (int): 生命值
            'attack' (int): 攻擊力
            'defense' (int): 防禦力
            'speed' (int): 速度
            'crit' (int): 爆擊率
            'mp' (int): 魔力值 (新增)
            'personality_name' (str): 個性名稱 (新增)
            'personality_description' (str): 個性基礎描述 (新增)


    Returns:
        Dict[str, str]: 包含 AI 生成的內容的字典:
            {
                "aiPersonality": "生成的個性描述 (至少100字)",
                "aiIntroduction": "生成的介紹 (至少150字，包含各項數值)",
                "aiEvaluation": "生成的評價 (至少200字，結合個性與數值)"
            }
            如果 API 呼叫失敗或發生錯誤，則返回 DEFAULT_AI_RESPONSES。
    """
    monster_nickname = monster_data.get('nickname', '一隻神秘怪獸')
    ai_logger.info(f"開始為怪獸 '{monster_nickname}' 生成 AI 詳細資訊。")

    if not GEMINI_API_KEY and "GOOGLE_API_KEY" not in os.environ and not os.getenv("API_KEY"):
        ai_logger.warning("Gemini API 金鑰未在程式碼中設定，亦未找到 GOOGLE_API_KEY 或 API_KEY 環境變數。依賴 Canvas 環境注入或外部設定。")

    elements_str = "、".join(monster_data.get('elements', ['無']))
    hp = monster_data.get('hp', 50)
    mp = monster_data.get('mp', 20) # 新增獲取 MP
    attack = monster_data.get('attack', 10)
    defense = monster_data.get('defense', 10)
    speed = monster_data.get('speed', 10)
    crit = monster_data.get('crit', 5)
    rarity = monster_data.get('rarity', '普通')
    personality_name = monster_data.get('personality_name', '未知')
    # personality_description_base = monster_data.get('personality_description', '其個性尚不明朗。') # 基礎個性描述

    # 更新 Prompt 以符合新的需求
    prompt = f"""
請為一隻名為「{monster_nickname}」的怪獸，生成詳細的中文描述性文字。它的基本資料如下：
- 屬性：{elements_str}
- 稀有度：{rarity}
- 生命值(HP)：約 {hp}
- 魔力值(MP)：約 {mp}
- 攻擊力：約 {attack}
- 防禦力：約 {defense}
- 速度：約 {speed}
- 爆擊率：約 {crit}%
- 個性名稱：{personality_name}

請嚴格按照以下JSON格式提供回應，不要添加任何額外的解釋或開頭/結尾文字，並確保每個欄位的文本長度符合要求：

{{
  "personality_text": "一段關於「{monster_nickname}」個性的詳細描述。這段描述應基於其個性名稱「{personality_name}」，進行生動、形象的闡述，深入挖掘其性格特點、行為傾向以及與訓練師可能的互動方式。請確保文本長度至少100個中文字元。",
  "introduction_text": "一段關於「{monster_nickname}」的背景故事或趣味介紹。這段介紹應至少150個中文字元，並巧妙地將其所有基礎數值（HP: {hp}, MP: {mp}, 攻擊力: {attack}, 防禦力: {defense}, 速度: {speed}, 爆擊率: {crit}%, 屬性: {elements_str}, 稀有度: {rarity}）自然地融入到敘述中，讓讀者對它的能力有一個全面的初步印象。例如，可以描述它的體型、外貌特徵如何反映其HP和防禦，它的敏捷程度如何體現其速度，它的攻擊方式如何展現其攻擊力和元素特性等。",
  "evaluation_text": "一段針對「{monster_nickname}」的綜合評價與培養建議。此評價應至少200個中文字元，必須結合其「{personality_name}」的個性特點，以及其全部數值（HP: {hp}, MP: {mp}, 攻擊力: {attack}, 防禦力: {defense}, 速度: {speed}, 爆擊率: {crit}%, 屬性: {elements_str}, 稀有度: {rarity}）進行全面分析。請指出它的優勢與劣勢，並給出具體的培養方向建議或在隊伍中的戰術定位。"
}}
"""

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "personality_text": {"type": "STRING"},
                    "introduction_text": {"type": "STRING"},
                    "evaluation_text": {"type": "STRING"}
                },
                "required": ["personality_text", "introduction_text", "evaluation_text"]
            },
            "temperature": 0.75, # 略微調高，增加創意性
            "topP": 0.95,
            "topK": 40
        }
    }

    api_url = f"{GEMINI_API_URL_BASE}{DEFAULT_MODEL}:generateContent?key={GEMINI_API_KEY}"
    ai_logger.debug(f"向 Gemini API 發送請求: URL='{GEMINI_API_URL_BASE}{DEFAULT_MODEL}:generateContent?key=***API_KEY_HIDDEN***', Payload 結構已更新。")


    max_retries = 3
    retry_delay = 5 # 秒

    for attempt in range(max_retries):
        try:
            response = requests.post(api_url, json=payload, timeout=90) # 增加超時時間以應對可能更長的生成
            response.raise_for_status()

            response_json = response.json()
            ai_logger.debug(f"Gemini API 原始回應 (嘗試 {attempt+1}): {json.dumps(response_json, ensure_ascii=False, indent=2)}")


            if (response_json.get("candidates") and
                    response_json["candidates"][0].get("content") and
                    response_json["candidates"][0]["content"].get("parts") and
                    response_json["candidates"][0]["content"]["parts"][0].get("text")):

                generated_text_json_str = response_json["candidates"][0]["content"]["parts"][0]["text"]
                try:
                    generated_content = json.loads(generated_text_json_str)
                    ai_details = {
                        "aiPersonality": generated_content.get("personality_text", DEFAULT_AI_RESPONSES["aiPersonality"]),
                        "aiIntroduction": generated_content.get("introduction_text", DEFAULT_AI_RESPONSES["aiIntroduction"]),
                        "aiEvaluation": generated_content.get("evaluation_text", DEFAULT_AI_RESPONSES["aiEvaluation"])
                    }
                    # 檢查長度 (可選，但有助於調試prompt)
                    for key, min_len in [("aiPersonality", 100), ("aiIntroduction", 150), ("aiEvaluation", 200)]:
                        if len(ai_details[key]) < min_len and ai_details[key] == DEFAULT_AI_RESPONSES[key]:
                             pass # 如果是預設回應，則不警告長度不足
                        elif len(ai_details[key]) < min_len:
                            ai_logger.warning(f"AI 生成的 '{key}' 長度為 {len(ai_details[key])}，未達到要求的 {min_len} 字元。內容: '{ai_details[key][:50]}...'")

                    ai_logger.info(f"成功為怪獸 '{monster_nickname}' 生成 AI 詳細資訊。")
                    return ai_details
                except json.JSONDecodeError as json_err:
                    ai_logger.error(f"解析 Gemini API 回應中的 JSON 字串失敗: {json_err}。回應字串: '{generated_text_json_str}'")
                    return DEFAULT_AI_RESPONSES.copy()

            else:
                error_message = "Gemini API 回應格式不符合預期。"
                prompt_feedback = response_json.get("promptFeedback")
                if prompt_feedback:
                    block_reason = prompt_feedback.get("blockReason")
                    safety_ratings = prompt_feedback.get("safetyRatings")
                    error_message += f" Prompt Feedback: BlockReason='{block_reason}', SafetyRatings='{safety_ratings}'."
                ai_logger.error(f"{error_message} 完整回應: {json.dumps(response_json, ensure_ascii=False, indent=2)}")
                if attempt < max_retries - 1:
                    ai_logger.info(f"將在 {retry_delay} 秒後重試 (第 {attempt + 2}/{max_retries} 次嘗試)...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                return DEFAULT_AI_RESPONSES.copy()

        except requests.exceptions.HTTPError as http_err:
            error_body = http_err.response.text if http_err.response else "N/A"
            ai_logger.error(f"Gemini API HTTP 錯誤 (嘗試 {attempt+1}): {http_err}. 回應狀態碼: {http_err.response.status_code if http_err.response else 'N/A'}. 回應內容: {error_body}")
            if http_err.response is not None and http_err.response.status_code == 429: # Too Many Requests
                 ai_logger.warning("請求過於頻繁 (429)。增加重試延遲。")
                 retry_delay *= 2 # 遇到429時，大幅增加延遲
            if attempt < max_retries - 1:
                ai_logger.info(f"將在 {retry_delay} 秒後重試 (第 {attempt + 2}/{max_retries} 次嘗試)...")
                time.sleep(retry_delay)
                retry_delay *= 1.5 # 每次重試增加延遲
                continue
            return DEFAULT_AI_RESPONSES.copy()
        except requests.exceptions.RequestException as req_err:
            ai_logger.error(f"Gemini API 請求錯誤 (嘗試 {attempt+1}): {req_err}")
            if attempt < max_retries - 1:
                ai_logger.info(f"將在 {retry_delay} 秒後重試 (第 {attempt + 2}/{max_retries} 次嘗試)...")
                time.sleep(retry_delay)
                retry_delay *= 1.5
                continue
            return DEFAULT_AI_RESPONSES.copy()
        except Exception as e:
            ai_logger.error(f"生成 AI 怪獸詳細資訊時發生未知錯誤 (嘗試 {attempt+1}): {e}", exc_info=True)
            if attempt < max_retries - 1:
                ai_logger.info(f"將在 {retry_delay} 秒後重試 (第 {attempt + 2}/{max_retries} 次嘗試)...")
                time.sleep(retry_delay)
                retry_delay *= 1.5
                continue
            return DEFAULT_AI_RESPONSES.copy()

    ai_logger.error(f"所有重試均失敗，無法為 '{monster_nickname}' 生成 AI 詳細資訊。")
    return DEFAULT_AI_RESPONSES.copy()


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ai_logger.info("正在測試 MD_ai_services.py...")

    mock_monster_1 = {
        "nickname": "烈焰幼龍", "elements": ["火", "龍"], "rarity": "稀有",
        "hp": 120, "mp": 60, "attack": 25, "defense": 18, "speed": 22, "crit": 8,
        "personality_name": "勇敢的",
        "personality_description": "天生的戰士，無所畏懼。" # 基礎描述，AI會擴寫
    }
    mock_monster_2 = {
        "nickname": "深海巨龜", "elements": ["水", "土"], "rarity": "菁英",
        "hp": 200, "mp": 40, "attack": 15, "defense": 40, "speed": 5, "crit": 3,
        "personality_name": "冷静的",
        "personality_description": "頭腦清晰，臨危不亂。"
    }

    if not GEMINI_API_KEY and "GOOGLE_API_KEY" not in os.environ and not os.getenv("API_KEY"):
        ai_logger.warning("警告：未偵測到 Gemini API 金鑰。測試將依賴 Canvas 環境或可能失敗。")
        ai_logger.warning("若在本地測試，請設定 GOOGLE_API_KEY 環境變數或臨時在程式碼中提供金鑰。")

    print(f"\n--- 測試怪獸 1: {mock_monster_1['nickname']} ---")
    ai_details_1 = generate_monster_ai_details(mock_monster_1)
    print(f"個性 (長度 {len(ai_details_1.get('aiPersonality', ''))}):\n{ai_details_1.get('aiPersonality')}\n")
    print(f"介紹 (長度 {len(ai_details_1.get('aiIntroduction', ''))}):\n{ai_details_1.get('aiIntroduction')}\n")
    print(f"評價 (長度 {len(ai_details_1.get('aiEvaluation', ''))}):\n{ai_details_1.get('aiEvaluation')}\n")

    time.sleep(10) # 增加API請求間隔

    print(f"\n--- 測試怪獸 2: {mock_monster_2['nickname']} ---")
    ai_details_2 = generate_monster_ai_details(mock_monster_2)
    print(f"個性 (長度 {len(ai_details_2.get('aiPersonality', ''))}):\n{ai_details_2.get('aiPersonality')}\n")
    print(f"介紹 (長度 {len(ai_details_2.get('aiIntroduction', ''))}):\n{ai_details_2.get('aiIntroduction')}\n")
    print(f"評價 (長度 {len(ai_details_2.get('aiEvaluation', ''))}):\n{ai_details_2.get('aiEvaluation')}\n")

    ai_logger.info("MD_ai_services.py 測試完畢。")

