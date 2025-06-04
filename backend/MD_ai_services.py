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

# --- DeepSeek API 設定 ---
# 重要：強烈建議將 API 金鑰儲存在環境變數中，而不是直接寫在程式碼裡。
# 例如：DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_KEY = "sk-19179bb0c0c94acaa53ca82dc1d28bbf" # 這是你提供的金鑰
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions" # DeepSeek API 端點
DEEPSEEK_MODEL = "deepseek-chat" # 常用的 DeepSeek 模型，如有需要請更改

# 預設的 AI 生成內容，以防 API 呼叫失敗
DEFAULT_AI_RESPONSES = {
    "aiPersonality": "AI 個性描述生成失敗，這隻怪獸的性格如同一個未解之謎，等待著有緣人去探索。它可能時而溫順，時而狂野，需要訓練師細心的觀察與引導。",
    "aiIntroduction": "AI 介紹生成失敗。這隻神秘的怪獸，其基礎數值（HP、MP、攻擊、防禦、速度、爆擊率）和元素屬性都隱藏在迷霧之中，只有真正的強者才能揭開它的全部潛力。",
    "aiEvaluation": "AI 綜合評價生成失敗。由於未能全面評估此怪獸的個性與數值，暫時無法給出具體的培養建議。但請相信，每一隻怪獸都有其獨特之處，用心培養，定能發光發熱。"
}

def generate_monster_ai_details(monster_data: Dict[str, Any]) -> Dict[str, str]:
    """
    使用 DeepSeek API 為指定的怪獸數據生成 AI 描述、個性和評價。

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
            'mp' (int): 魔力值
            'personality_name' (str): 個性名稱
            'personality_description' (str): 個性基礎描述 (此參數目前在 prompt 中未使用，但保留以備將來擴展)


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
    ai_logger.info(f"開始為怪獸 '{monster_nickname}' (使用 DeepSeek) 生成 AI 詳細資訊。")

    if not DEEPSEEK_API_KEY:
        ai_logger.error("DeepSeek API 金鑰未設定。無法呼叫 AI 服務。請檢查程式碼中的 DEEPSEEK_API_KEY 或相關環境變數。")
        return DEFAULT_AI_RESPONSES.copy()

    elements_str = "、".join(monster_data.get('elements', ['無']))
    hp = monster_data.get('hp', 50)
    mp = monster_data.get('mp', 20)
    attack = monster_data.get('attack', 10)
    defense = monster_data.get('defense', 10)
    speed = monster_data.get('speed', 10)
    crit = monster_data.get('crit', 5)
    rarity = monster_data.get('rarity', '普通')
    personality_name = monster_data.get('personality_name', '未知')

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
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": "你是一個樂於助人的AI助手，你會嚴格按照用戶要求的JSON格式進行回應，不添加任何額外的解釋或格式標記。"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7, # 可以根據需要調整
        "max_tokens": 2000, # 根據預期輸出長度設定，確保足夠
        # DeepSeek 可能有 "response_format": {"type": "json_object"} 這樣的參數來強制JSON輸出，請查閱官方文件
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    ai_logger.debug(f"向 DeepSeek API 發送請求: URL='{DEEPSEEK_API_URL}', Model='{DEEPSEEK_MODEL}'")

    max_retries = 3
    retry_delay = 5 # 秒

    for attempt in range(max_retries):
        try:
            response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=90)
            response.raise_for_status() # 如果 HTTP 狀態碼是 4xx 或 5xx，則拋出異常

            response_json = response.json()
            ai_logger.debug(f"DeepSeek API 原始回應 (嘗試 {attempt+1}): {json.dumps(response_json, ensure_ascii=False, indent=2)}")

            if (response_json.get("choices") and
                len(response_json["choices"]) > 0 and
                response_json["choices"][0].get("message") and
                response_json["choices"][0]["message"].get("content")):

                generated_text_json_str = response_json["choices"][0]["message"]["content"]

                # 清理 AI 可能添加的 markdown 標記
                cleaned_json_str = generated_text_json_str.strip()
                if cleaned_json_str.startswith("```json"):
                    cleaned_json_str = cleaned_json_str[7:]
                if cleaned_json_str.endswith("```"):
                    cleaned_json_str = cleaned_json_str[:-3]
                cleaned_json_str = cleaned_json_str.strip()

                try:
                    generated_content = json.loads(cleaned_json_str)
                    ai_details = {
                        "aiPersonality": generated_content.get("personality_text", DEFAULT_AI_RESPONSES["aiPersonality"]),
                        "aiIntroduction": generated_content.get("introduction_text", DEFAULT_AI_RESPONSES["aiIntroduction"]),
                        "aiEvaluation": generated_content.get("evaluation_text", DEFAULT_AI_RESPONSES["aiEvaluation"])
                    }

                    # 檢查長度 (可選)
                    for key, min_len in [("aiPersonality", 100), ("aiIntroduction", 150), ("aiEvaluation", 200)]:
                        if len(ai_details[key]) < min_len and ai_details[key] == DEFAULT_AI_RESPONSES[key]:
                             pass # 如果是預設回應，則不警告長度不足
                        elif len(ai_details[key]) < min_len:
                            ai_logger.warning(f"AI (DeepSeek) 生成的 '{key}' 長度為 {len(ai_details[key])}，未達到要求的 {min_len} 字元。內容: '{ai_details[key][:50]}...'")

                    ai_logger.info(f"成功為怪獸 '{monster_nickname}' (使用 DeepSeek) 生成 AI 詳細資訊。")
                    return ai_details
                except json.JSONDecodeError as json_err:
                    ai_logger.error(f"解析 DeepSeek API 回應中的 JSON 字串失敗: {json_err}。清理後的字串: '{cleaned_json_str}'。原始字串: '{generated_text_json_str}'")
                    # 如果解析失敗，也嘗試記錄一下原始回應的 Choices 部分，以防 content 不是預期的字串
                    if isinstance(generated_text_json_str, dict): # 有時 AI 可能直接返回了物件而非字串
                         ai_logger.error(f"DeepSeek content 似乎已經是物件: {generated_text_json_str}")

                    return DEFAULT_AI_RESPONSES.copy()
            else:
                error_detail = response_json.get("error", {})
                error_message = error_detail.get("message", "DeepSeek API 回應格式不符合預期或包含錯誤。")
                error_code = error_detail.get("code")
                ai_logger.error(f"{error_message} (Code: {error_code}) 完整回應: {json.dumps(response_json, ensure_ascii=False, indent=2)}")
                if attempt < max_retries - 1:
                    ai_logger.info(f"將在 {retry_delay} 秒後重試 (第 {attempt + 2}/{max_retries} 次嘗試)...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                return DEFAULT_AI_RESPONSES.copy()

        except requests.exceptions.HTTPError as http_err:
            error_body = http_err.response.text if http_err.response else "N/A"
            status_code = http_err.response.status_code if http_err.response else 'N/A'
            ai_logger.error(f"DeepSeek API HTTP 錯誤 (嘗試 {attempt+1}): {http_err}. 狀態碼: {status_code}. 回應內容: {error_body}")
            if status_code == 401: # Unauthorized
                ai_logger.error("DeepSeek API 金鑰無效或未授權。請檢查金鑰是否正確。")
                return DEFAULT_AI_RESPONSES.copy() # 金鑰錯誤，無需重試
            if status_code == 429: # Too Many Requests
                 ai_logger.warning("DeepSeek API 請求過於頻繁 (429)。增加重試延遲。")
                 retry_delay *= 2
            if attempt < max_retries - 1:
                ai_logger.info(f"將在 {retry_delay} 秒後重試 (第 {attempt + 2}/{max_retries} 次嘗試)...")
                time.sleep(retry_delay)
                retry_delay *= 1.5
                continue
            return DEFAULT_AI_RESPONSES.copy()
        except requests.exceptions.RequestException as req_err:
            ai_logger.error(f"DeepSeek API 請求錯誤 (嘗試 {attempt+1}): {req_err}")
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

    ai_logger.error(f"所有重試均失敗，無法為 '{monster_nickname}' (使用 DeepSeek) 生成 AI 詳細資訊。")
    return DEFAULT_AI_RESPONSES.copy()

if __name__ == '__main__':
    # 簡單測試
    logging.basicConfig(level=logging.DEBUG) # 設置日誌級別為 DEBUG 以查看詳細輸出
    test_monster = {
        'nickname': '烈焰幼龍',
        'elements': ['火', '龍'], # 假設有龍屬性
        'rarity': '稀有',
        'hp': 120,
        'mp': 60,
        'attack': 25,
        'defense': 18,
        'speed': 22,
        'crit': 8,
        'personality_name': '勇敢的',
        'personality_description': '天生的冒險家，無所畏懼。'
    }
    ai_descriptions = generate_monster_ai_details(test_monster)
    print("\n--- AI 生成的怪獸詳細資訊 (DeepSeek) ---")
    print(f"個性描述: {ai_descriptions['aiPersonality']}")
    print(f"背景介紹: {ai_descriptions['aiIntroduction']}")
    print(f"綜合評價: {ai_descriptions['aiEvaluation']}")

    # 測試 API 金鑰未設定的情況
    original_key = DEEPSEEK_API_KEY
    DEEPSEEK_API_KEY = ""
    print("\n--- 測試 API 金鑰未設定 ---")
    ai_descriptions_no_key = generate_monster_ai_details(test_monster)
    assert ai_descriptions_no_key == DEFAULT_AI_RESPONSES
    print("API 金鑰未設定測試通過，返回預設內容。")
    DEEPSEEK_API_KEY = original_key # 恢復金鑰
