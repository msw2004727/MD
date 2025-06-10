# backend/MD_ai_services.py
# 負責與 AI 模型互動，為怪獸生成描述性內容

import os
import json
import requests # 用於發送 HTTP 請求 
import logging
import time
from typing import Dict, Any, List, Optional # 用於類型提示

# 設定日誌記錄器
ai_logger = logging.getLogger(__name__)

# --- DeepSeek API 設定 ---
DEEPSEEK_API_KEY = "sk-19179bb0c0c94acaa53ca82dc1d28bbf" # 這是你提供的金鑰
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions" # DeepSeek API 端點
DEEPSEEK_MODEL = "deepseek-chat" # 常用的 DeepSeek 模型，如有需要請更改

# 預設的 AI 生成內容，以防 API 呼叫失敗
DEFAULT_AI_RESPONSES = {
    "aiIntroduction": "關於這隻怪獸的起源眾說紛紜，只知道牠是在一次強烈的元素碰撞中意外誕生的。",
    "aiEvaluation": "AI 綜合評價生成失敗。由於未能全面評估此怪獸，暫時無法給出具體的培養建議。但請相信，每一隻怪獸都有其獨特之處，用心培養，定能發光發熱。"
}

DEFAULT_ADVENTURE_STORY = "AI 冒險故事生成失敗，請稍後再試或檢查後台日誌。"
DEFAULT_BATTLE_REPORT_CONTENT = {
    "battle_description": "交戰描述生成失敗。",
    "battle_summary": "戰報總結生成失敗。",
    "loot_info": "戰利品資訊待補。",
    "growth_info": "怪獸成長資訊待補。"
}


def generate_monster_ai_details(monster_data: Dict[str, Any]) -> Dict[str, str]:
    """
    使用 DeepSeek API 為指定的怪獸數據生成獨特的背景介紹和專屬的綜合評價。
    （已移除個性描述的生成）
    """
    monster_nickname = monster_data.get('nickname', '一隻神秘怪獸')
    ai_logger.info(f"開始為怪獸 '{monster_nickname}' (使用 DeepSeek) 生成 AI 詳細資訊。")

    if not DEEPSEEK_API_KEY:
        ai_logger.error("DeepSeek API 金鑰未設定。無法呼叫 AI 服務。請檢查程式碼中的 DEEPSEEK_API_KEY 或相關環境變數。")
        return DEFAULT_AI_RESPONSES.copy()

    # 準備給 AI 的資料
    elements_str = "、".join(monster_data.get('elements', ['無']))
    rarity = monster_data.get('rarity', '普通')
    stats_str = f"HP: {monster_data.get('hp', 0)}, 攻擊: {monster_data.get('attack', 0)}, 防禦: {monster_data.get('defense', 0)}, 速度: {monster_data.get('speed', 0)}, 爆擊: {monster_data.get('crit', 0)}%"
    skills_list = monster_data.get('skills', [])
    skills_str = "、".join([f"{s.get('name', '未知技能')} (威力:{s.get('power', 0)})" for s in skills_list]) if skills_list else "無"
    base_personality = monster_data.get('personality', {}).get('name', '未知')

    prompt = f"""
請你扮演一位頂級的怪獸世界觀設定師與戰術分析家。你的任務是為一隻新誕生的怪獸賦予生命與深度。

怪獸資料：
- 稱號：{monster_nickname}
- 屬性：{elements_str}
- 稀有度：{rarity}
- 數值：{stats_str}
- 技能：{skills_str}
- 基礎個性：{base_personality}

請根據以上所有資訊，嚴格按照以下JSON格式提供回應，不要有任何額外的解釋或開頭文字：

{{
  "aiIntroduction": "（為這隻怪獸創造一段約80-120字的【背景故事或介紹】，說明牠的來歷、棲息地或與世界相關的傳說。）",
  "aiEvaluation": "（綜合怪獸的所有數據，撰寫一段約100-150字的【綜合評價與培養建議】，分析牠的戰術定位、優缺點，並給出具體的培養方向。）"
}}
"""

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": "你是一位頂級的怪獸世界觀設定師與戰術分析家，精通中文，並且會嚴格按照用戶要求的JSON格式進行回應，不添加任何額外的解釋或格式標記。"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.9,
        "max_tokens": 500,
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

def generate_cultivation_story(monster_name: str, duration_percentage: float, skill_updates_log: List[str], items_obtained: List[Dict]) -> str:
    """
    使用 DeepSeek API 為修煉過程生成一個冒險故事。
    """
    ai_logger.info(f"為怪獸 '{monster_name}' 的修煉過程生成AI冒險故事。")

    if not DEEPSEEK_API_KEY:
        ai_logger.error("DeepSeek API 金鑰未設定，無法生成修煉故事。")
        return DEFAULT_ADVENTURE_STORY

    story_prompt = ""
    has_gains = bool(skill_updates_log) or bool(items_obtained)

    if not has_gains:
        story_prompt = f"我的怪獸 '{monster_name}' 剛剛完成了一次修煉，但過程相當平順，沒有任何特別的戰鬥或發現。請你根據這個「一路順遂但無功而返」的主題，為牠撰寫一段約50字左右的冒險故事，描述牠在修煉地安靜度過時光的様子。"
    else:
        trained_skills_str = "、".join([log.split("'")[1] for log in skill_updates_log if "技能" in log]) or "現有技能"
        found_items_str = "、".join([item.get('name', '神秘碎片') for item in items_obtained]) if items_obtained else "任何物品"
        
        story_prompt = f"我的怪獸 '{monster_name}' 剛剛完成了一次修煉。請你為牠撰寫一段生動的冒險故事。\n"
        story_prompt += f"- 在這次修煉中，牠主要鍛鍊了 {trained_skills_str}。\n"
        if items_obtained:
            story_prompt += f"- 牠還幸運地拾獲了 {found_items_str}。\n"
        story_prompt += "- 請將以上元素巧妙地融入故事中。\n"
        story_prompt += "- 你的描述必須嚴格基於我提供的素材，不要杜撰不存在的成果。\n"

        if duration_percentage <= 0.25:
            story_prompt += "故事風格：初步冒險。總字數約50字。"
        elif duration_percentage <= 0.5:
            story_prompt += "故事風格：深入歷險。總字數約100字，前後連貫。"
        elif duration_percentage <= 0.75:
            story_prompt += "故事風格：遇上危機。總字數約150字，情節要有起伏。"
        else:
            story_prompt += "故事風格：歷劫歸來。總字數約200字，故事要有完整的開頭、危機、高潮和結局。"

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": "你是一位才華洋溢的奇幻故事作家，擅長用生動的中文描寫怪獸的冒險經歷。你會嚴格根據用戶提供的素材進行創作。"},
            {"role": "user", "content": story_prompt}
        ],
        "temperature": 0.8,
    }
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=120)
        response.raise_for_status()
        response_json = response.json()
        
        if (response_json.get("choices") and response_json["choices"][0].get("message")):
            story = response_json["choices"][0]["message"].get("content", DEFAULT_ADVENTURE_STORY)
            ai_logger.info(f"成功為 '{monster_name}' 生成修煉故事。")
            return story.strip()
        else:
            ai_logger.error(f"DeepSeek API 回應格式不符，使用預設故事。回應: {response_json}")
            return DEFAULT_ADVENTURE_STORY
            
    except Exception as e:
        ai_logger.error(f"呼叫 DeepSeek API 生成修煉故事時發生錯誤: {e}", exc_info=True)
        return DEFAULT_ADVENTURE_STORY


def generate_battle_report_content(
    player_monster: Dict[str, Any],
    opponent_monster: Dict[str, Any],
    battle_result: Dict[str, Any],
    full_raw_battle_log: List[str] 
) -> Dict[str, str]:
    """
    根據戰鬥數據，生成完整的戰報內容。
    修改：交戰描述將由此函式根據原始日誌重新格式化，以符合用戶需求。
    """
    ai_logger.info(f"開始為戰鬥生成 AI 戰報 (玩家: {player_monster.get('nickname')}, 對手: {opponent_monster.get('nickname')})。")

    # --- 1. 全新的日誌解析與格式化邏輯 ---
    battle_description_parts = []
    # 遍歷原始日誌，只提取並格式化需要的行動訊息
    for raw_line in full_raw_battle_log:
        line = raw_line.strip()
        # 處理行動日誌 (以 "- " 開頭)
        if line.startswith("- "):
            # 移除開頭的 "- "
            action_line = line[2:]
            # 將內部的 <damage> 和 <heal> 標籤保留，以便前端處理
            # action_line = action_line.replace("<damage>", "-").replace("</damage>", "")
            # action_line = action_line.replace("<heal>", "+").replace("</heal>", "")
            battle_description_parts.append(action_line)
        # 對於非行動日誌（如回合分隔線、HP/MP狀態），直接保留
        else:
            battle_description_parts.append(line)


    formatted_description = "\n".join(battle_description_parts)
    if not formatted_description.strip():
        formatted_description = "戰鬥瞬間結束，未能記錄詳細過程。"

    # --- 2. 準備給 AI 的 prompt (僅用於生成總結) ---
    if not DEEPSEEK_API_KEY:
        ai_logger.error("DeepSeek API 金鑰未設定。無法為戰鬥生成 AI 總結。")
        return {
            "battle_description": formatted_description,
            "battle_summary": "戰報總結生成失敗：AI服務未設定。",
            "loot_info": "戰利品資訊待補。",
            "growth_info": "怪獸成長資訊待補。"
        }
    
    winner_id = battle_result.get('winner_id')
    winner_name = player_monster.get('nickname') if winner_id == player_monster.get('id') else opponent_monster.get('nickname')
    highlights_str = "、".join(battle_result.get("battle_highlights", []))

    if winner_id != "平手":
        summary_prompt = f"一場激烈的怪獸對戰剛剛結束，最終由「{winner_name}」取得了勝利。請你根據這場戰鬥的幾個關鍵亮點：「{highlights_str}」，為這場戰鬥撰寫一段約50-70字的精彩戰報總結。"
    else:
        summary_prompt = f"一場激烈的怪獸對戰剛剛以「平手」告終。請你根據這場戰鬥的幾個關鍵亮點：「{highlights_str}」，為這場戰鬥撰寫一段約50-70字的戰報總結，描述雙方勢均力敵的膠著戰況。"

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": "你是一位專業的怪獸戰報記者，精通中文，擅長撰寫生動、有張力的戰鬥報告。"},
            {"role": "user", "content": summary_prompt}
        ],
        "temperature": 0.8,
        "max_tokens": 150, 
    }
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    ai_summary = DEFAULT_BATTLE_REPORT_CONTENT["battle_summary"]
    try:
        response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=25) # 將超時設為25秒，小於Gunicorn的30秒
        response.raise_for_status()
        response_json = response.json()
        
        if (response_json.get("choices") and response_json["choices"][0].get("message")):
            ai_summary = response_json["choices"][0]["message"].get("content", ai_summary).strip()
            ai_logger.info(f"成功為戰鬥生成 AI 總結。")
    except Exception as e:
        ai_logger.error(f"呼叫 DeepSeek API 生成戰報總結時發生錯誤: {e}", exc_info=True)

    # --- 3. 組合最終結果 ---
    absorption_details = battle_result.get("absorption_details", {})
    loot_info_parts = []
    if absorption_details.get("extracted_dna_templates"):
        loot_names = [d.get('name', '未知DNA') for d in absorption_details["extracted_dna_templates"]]
        loot_info_parts.append(f"戰利品：獲得 {len(loot_names)} 個 DNA 碎片（{', '.join(loot_names)}）。")
    
    growth_info_parts = []
    if absorption_details.get("stat_gains"):
        growth_details = [f"{stat.upper()} +{gain}" for stat, gain in absorption_details["stat_gains"].items()]
        growth_info_parts.append(f"怪獸成長：吸收了能量，獲得能力提升（{', '.join(growth_details)}）。")

    final_report = {
        "battle_description": formatted_description,
        "battle_summary": ai_summary,
        "loot_info": " ".join(loot_info_parts) or "戰利品：無",
        "growth_info": " ".join(growth_info_parts) or "怪獸成長：無"
    }

    return final_report


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    
    # 此處的 main 區塊主要用於獨立測試，實際運行時不會執行
    print("MD_ai_services.py is being run directly.")
