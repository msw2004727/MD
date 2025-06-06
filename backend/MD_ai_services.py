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
    """
    monster_nickname = monster_data.get('nickname', '一隻神秘怪獸')
    ai_logger.info(f"開始為怪獸 '{monster_nickname}' (使用 DeepSeek) 生成 AI 詳細資訊。")

    if not DEEPSEEK_API_KEY:
        ai_logger.error("DeepSeek API 金鑰未設定。無法呼叫 AI 服務。請檢查程式碼中的 DEEPSEEK_API_KEY 或相關環境變數。")
        return DEFAULT_AI_RESPONSES.copy()

    elements_str = "、".join(monster_data.get('elements', ['無']))
    rarity = monster_data.get('rarity', '普通')
    personality_name = monster_data.get('personality_name', '未知')

    # ====== MODIFICATION START: New witty and concise prompt ======
    prompt = f"""
請你扮演一位風趣又毒舌的怪獸專家，為一隻名為「{monster_nickname}」的怪獸，生成極度精簡且一針見血的中文描述。

怪獸資料：
- 屬性：{elements_str}
- 稀有度：{rarity}
- 個性：{personality_name}

請嚴格按照以下JSON格式提供回應，不要有任何額外的解釋或開頭文字。內容必須風趣、簡短、講重點：

{{
  "aiPersonality": "（針對「{personality_name}」個性，寫一句話的風趣吐槽或點評，約15-20字）",
  "aiIntroduction": "（寫一句話的簡短介紹，點出它的屬性和稀有度，可以帶點玩笑或比喻，約20-25字）",
  "aiEvaluation": "（用一句話總結它的優缺點，並給出一句簡短的培養建議或戰術定位，約20-25字）"
}}
"""
    # ====== MODIFICATION END ======

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": "你是一位風趣、毒舌的怪獸專家，你的評論總是非常精簡且一針見血。你將嚴格按照用戶要求的JSON格式進行回應，不添加任何額外的解釋或格式標記。"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.8, # 稍微提高溫度以增加創意
        "max_tokens": 300, # 限制最大 token 數量
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    ai_logger.debug(f"DEBUG AI: 請求 DeepSeek URL: {DEEPSEEK_API_URL}, 模型: {DEEPSEEK_MODEL}")
    ai_logger.debug(f"DEBUG AI: 請求 Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}")

    max_retries = 3
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            ai_logger.debug(f"DEBUG AI: 嘗試 {attempt + 1}/{max_retries} - 發送請求...")
            response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=90)
            response.raise_for_status() 

            response_json = response.json()
            ai_logger.debug(f"DEBUG AI: 嘗試 {attempt + 1}/{max_retries} - 收到原始 JSON 響應: {json.dumps(response_json, ensure_ascii=False, indent=2)}")

            if (response_json.get("choices") and
                len(response_json["choices"]) > 0 and
                response_json["choices"][0].get("message") and
                response_json["choices"][0]["message"].get("content")):

                generated_text_json_str = response_json["choices"][0]["message"]["content"]
                
                cleaned_json_str = generated_text_json_str.strip()
                if cleaned_json_str.startswith("```json"):
                    cleaned_json_str = cleaned_json_str[7:]
                if cleaned_json_str.endswith("```"):
                    cleaned_json_str = cleaned_json_str[:-3]
                cleaned_json_str = cleaned_json_str.strip()

                try:
                    generated_content = json.loads(cleaned_json_str)
                    ai_logger.debug(f"DEBUG AI: 嘗試 {attempt + 1}/{max_retries} - 成功解析 AI JSON 內容。")
                    ai_details = {
                        "aiPersonality": generated_content.get("aiPersonality", DEFAULT_AI_RESPONSES["aiPersonality"]),
                        "aiIntroduction": generated_content.get("aiIntroduction", DEFAULT_AI_RESPONSES["aiIntroduction"]),
                        "aiEvaluation": generated_content.get("aiEvaluation", DEFAULT_AI_RESPONSES["aiEvaluation"])
                    }
                    ai_logger.info(f"成功為怪獸 '{monster_nickname}' (使用 DeepSeek) 生成 AI 詳細資訊。")
                    return ai_details
                except json.JSONDecodeError as json_err:
                    ai_logger.error(f"ERROR AI: 解析 DeepSeek API 回應中的 JSON 字串失敗: {json_err}。清理後的字串: '{cleaned_json_str}'。")
                    return DEFAULT_AI_RESPONSES.copy()
            else:
                error_detail = response_json.get("error", {})
                error_message = error_detail.get("message", "DeepSeek API 回應格式不符合預期或包含錯誤。")
                ai_logger.error(f"ERROR AI: DeepSeek API 回應無效。完整回應: {json.dumps(response_json, ensure_ascii=False, indent=2)}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                return DEFAULT_AI_RESPONSES.copy()

        except requests.exceptions.HTTPError as http_err:
            status_code = http_err.response.status_code if http_err.response else 'N/A'
            ai_logger.error(f"ERROR AI: DeepSeek API HTTP 錯誤 (嘗試 {attempt+1}): {http_err}. 狀態碼: {status_code}.")
            if status_code == 401:
                ai_logger.error("ERROR AI: DeepSeek API 金鑰無效或未授權。請檢查金鑰是否正確。")
                return DEFAULT_AI_RESPONSES.copy()
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return DEFAULT_AI_RESPONSES.copy()
        except requests.exceptions.RequestException as req_err:
            ai_logger.error(f"ERROR AI: DeepSeek API 請求錯誤 (嘗試 {attempt+1}): {req_err}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return DEFAULT_AI_RESPONSES.copy()
        except Exception as e:
            ai_logger.error(f"ERROR AI: 生成 AI 怪獸詳細資訊時發生未知錯誤 (嘗試 {attempt+1}): {e}", exc_info=True)
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return DEFAULT_AI_RESPONSES.copy()

    ai_logger.error(f"ERROR AI: 所有重試均失敗，無法為 '{monster_nickname}' (使用 DeepSeek) 生成 AI 詳細資訊。")
    return DEFAULT_AI_RESPONSES.copy()

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    test_monster = {
        'nickname': '烈焰幼龍',
        'elements': ['火', '龍'],
        'rarity': '稀有',
        'hp': 120, 'mp': 60, 'attack': 25, 'defense': 18, 'speed': 22, 'crit': 8,
        'personality_name': '勇敢的',
        'personality_description': '天生的冒險家，無所畏懼。'
    }
    ai_descriptions = generate_monster_ai_details(test_monster)
    print("\n--- AI 生成的怪獸詳細資訊 (DeepSeek) ---")
    print(f"個性描述: {ai_descriptions['aiPersonality']}")
    print(f"背景介紹: {ai_descriptions['aiIntroduction']}")
    print(f"綜合評價: {ai_descriptions['aiEvaluation']}")
