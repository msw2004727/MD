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
    "player_monster_intro": "玩家怪獸介紹生成失敗。",
    "opponent_monster_intro": "對手怪獸介紹生成失敗。",
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
    battle_result: Dict[str, Any], # 包含 winner_id, loser_id, stat_gains, extracted_dna_templates 等
    full_raw_battle_log: List[str] # 包含所有回合的原始日誌
) -> Dict[str, str]:
    """
    根據戰鬥數據，使用 DeepSeek AI 生成完整的戰報內容。
    包含雙方怪獸介紹、精彩交戰描述和最終戰報總結。
    返回結構化的 JSON 內容。
    """
    ai_logger.info(f"開始為戰鬥生成 AI 戰報 (玩家: {player_monster.get('nickname')}, 對手: {opponent_monster.get('nickname')})。")

    if not DEEPSEEK_API_KEY:
        ai_logger.error("DeepSeek API 金鑰未設定。無法為戰鬥生成 AI 戰報。")
        return DEFAULT_BATTLE_REPORT_CONTENT.copy()

    # --- 準備怪獸介紹 Prompt ---
    def _get_monster_intro_prompt(monster: Dict[str, Any], role: str) -> str:
        elements_str = "、".join(monster.get('elements', ['無']))
        skills_str = "、".join([s.get('name', '') for s in monster.get('skills', []) if s.get('name')]) or "無"
        personality_name = monster.get('personality', {}).get('name', '未知')
        
        return f"""
請為以下怪獸撰寫一段約50字的簡潔介紹，內容需綜合其創立時間（僅作參考，無需明確寫出）、屬性、基礎數值（HP、攻擊、防禦、速度、爆擊等）、技能和個性。
怪獸角色：{role}，名稱：{monster.get('nickname', '未知怪獸')}
屬性：{elements_str}
基礎數值：HP {monster.get('hp',0)}, 攻擊 {monster.get('attack',0)}, 防禦 {monster.get('defense',0)}, 速度 {monster.get('speed',0)}, 爆擊 {monster.get('crit',0)}%
技能：{skills_str}
個性：{personality_name}
"""

    player_intro_prompt = _get_monster_intro_prompt(player_monster, "玩家怪獸")
    opponent_intro_prompt = _get_monster_intro_prompt(opponent_monster, "對手怪獸")

    # --- 準備精彩交戰描述 Prompt ---
    strength_diff_info = ""
    player_score = player_monster.get('score', 0)
    opponent_score = opponent_monster.get('score', 0)

    if player_score > opponent_score * 1.2:
        strength_diff_info = f"玩家怪獸({player_monster.get('nickname')}, 評價:{player_score})遠超對手({opponent_monster.get('nickname')}, 評價:{opponent_score})。"
    elif opponent_score > player_score * 1.2:
        strength_diff_info = f"對手怪獸({opponent_monster.get('nickname')}, 評價:{opponent_score})遠超玩家({player_monster.get('nickname')}, 評價:{player_score})。"
    else:
        strength_diff_info = "雙方實力接近，勢均力敵。"

    # 將原始日誌轉換為更易於AI理解的格式
    processed_raw_log = []
    for log_entry_str in full_raw_battle_log:
        if log_entry_str.startswith("--- 回合"):
            processed_raw_log.append(log_entry_str) # 保留回合標記
        else:
            # 處理可能存在的顏色標記，移除它們，只保留文字
            clean_log_entry = log_entry_str.replace('**', '').replace('<span style="color: green;">', '').replace('</span>', '')
            processed_raw_log.append(clean_log_entry)
            
    combined_raw_log = "\n".join(processed_raw_log)

    battle_description_prompt = f"""
你是一位身經百戰的戰場解說員，請你根據以下戰鬥的原始日誌和雙方實力對比，
撰寫一段約200字的【精彩交戰描述】。
重點是要有戲劇性、緊張感和高潮，並強調戰鬥中發生的關鍵時刻、致命一擊、技能對決、HP恢復、或狀態變化。
{strength_diff_info}
請將關鍵文字，如怪獸名稱、技能名稱、致命一擊、恢復、擊倒、屬性名稱(火, 水, 木, 金, 土, 光, 暗, 毒, 風, 無, 混)等，用**粗體**標註，並在日誌中加入適當的表情符號 (例如: 🔥💧💪💥✨🛡️)。
原始日誌:
{combined_raw_log}
"""

    # --- 準備最終總結 Prompt ---
    summary_prompt = ""
    winner_name = battle_result.get('winner_id')
    if winner_name == player_monster['id']:
        summary_prompt = f"玩家的怪獸 **{player_monster.get('nickname')}** 贏得了這場戰鬥。分析牠是如何取得勝利的，並簡要總結這場交鋒的關鍵點。約50字。"
    elif winner_name == opponent_monster['id']:
        summary_prompt = f"對手怪獸 **{opponent_monster.get('nickname')}** 贏得了這場戰鬥。分析牠是如何取得勝利的，並簡要總結這場交鋒的關鍵點。約50字。"
    else:
        summary_prompt = f"這場戰鬥以 **平手** 告終。簡要總結雙方為何未能分出勝負的原因。約50字。"

    # --- 組合所有 Prompt 並發送給 AI ---
    full_prompt = f"""
請你扮演一位資深怪獸戰報記者，為一場剛剛結束的怪獸對戰撰寫一份完整的戰報。
請嚴格按照以下JSON格式輸出所有內容，不要有任何額外的解釋或前言後語，也不要包含外部的JSON標記，例如 ```json。

{{
  "player_monster_intro": "{player_intro_prompt}",
  "opponent_monster_intro": "{opponent_intro_prompt}",
  "battle_description": "{battle_description_prompt}",
  "battle_summary": "{summary_prompt}"
}}
"""

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": "你是一位專業的怪獸戰報記者，精通中文，擅長撰寫生動、有張力的戰鬥報告。你會嚴格按照用戶提供的JSON格式輸出內容，不添加任何額外文字或標記。"},
            {"role": "user", "content": full_prompt}
        ],
        "temperature": 0.8,
        "max_tokens": 1000, # 增加生成字數上限以容納整個戰報
    }
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    max_retries = 3
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            ai_logger.debug(f"DEBUG AI: 嘗試 {attempt + 1}/{max_retries} - 發送完整戰報請求...")
            response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=180) # 延長超時時間
            response.raise_for_status() 

            response_json = response.json()
            ai_logger.debug(f"DEBUG AI: 嘗試 {attempt + 1}/{max_retries} - 收到完整戰報原始 JSON 響應: {json.dumps(response_json, ensure_ascii=False, indent=2)}")

            if (response_json.get("choices") and
                len(response_json["choices"]) > 0 and
                response_json["choices"][0].get("message") and
                response_json["choices"][0]["message"].get("content")):

                generated_text_json_str = response_json["choices"][0]["message"]["content"]
                
                # 清理可能的 Markdown 格式
                cleaned_json_str = generated_text_json_str.strip()
                if cleaned_json_str.startswith("```json"):
                    cleaned_json_str = cleaned_json_str[7:]
                if cleaned_json_str.endswith("```"):
                    cleaned_json_str = cleaned_json_str[:-3]
                cleaned_json_str = cleaned_json_str.strip()

                try:
                    generated_report_content = json.loads(cleaned_json_str)
                    ai_logger.debug(f"DEBUG AI: 嘗試 {attempt + 1}/{max_retries} - 成功解析 AI 戰報 JSON 內容。")
                    
                    # 添加預留欄位
                    generated_report_content["loot_info"] = "戰利品：無" # 預設值
                    generated_report_content["growth_info"] = "怪獸成長：無" # 預設值

                    # 將戰利品和成長資訊填充到預留欄位
                    extracted_dna_templates = battle_result.get('extracted_dna_templates', [])
                    if extracted_dna_templates:
                        loot_names = [d.get('name', '未知DNA') for d in extracted_dna_templates]
                        generated_report_content["loot_info"] = f"戰利品：獲得 {len(loot_names)} 個 DNA 碎片（{', '.join(loot_names)}）。"
                    
                    stat_gains = battle_result.get('stat_gains', {})
                    if stat_gains:
                        growth_details = [f"{stat} +{gain}" for stat, gain in stat_gains.items()]
                        generated_report_content["growth_info"] = f"怪獸成長：獲得能力提升（{', '.join(growth_details)}）。"

                    ai_logger.info(f"成功為戰鬥生成完整 AI 戰報。")
                    return generated_report_content
                except json.JSONDecodeError as json_err:
                    ai_logger.error(f"ERROR AI: 解析 DeepSeek API 回應中的 JSON 字串失敗: {json_err}。清理後的字串: '{cleaned_json_str}'。")
                    return DEFAULT_BATTLE_REPORT_CONTENT.copy()
            else:
                error_detail = response_json.get("error", {})
                error_message = error_detail.get("message", "DeepSeek API 回應格式不符合預期或包含錯誤。")
                ai_logger.error(f"ERROR AI: DeepSeek API 回應無效。完整回應: {json.dumps(response_json, ensure_ascii=False, indent=2)}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                return DEFAULT_BATTLE_REPORT_CONTENT.copy()

        except requests.exceptions.HTTPError as http_err:
            status_code = http_err.response.status_code if http_err.response else 'N/A'
            ai_logger.error(f"ERROR AI: DeepSeek API HTTP 錯誤 (嘗試 {attempt+1}): {http_err}. 狀態碼: {status_code}.")
            if status_code == 401:
                ai_logger.error("ERROR AI: DeepSeek API 金鑰無效或未授權。請檢查金鑰是否正確。")
                return DEFAULT_BATTLE_REPORT_CONTENT.copy()
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return DEFAULT_BATTLE_REPORT_CONTENT.copy()
        except requests.exceptions.RequestException as req_err:
            ai_logger.error(f"ERROR AI: DeepSeek API 請求錯誤 (嘗試 {attempt+1}): {req_err}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return DEFAULT_BATTLE_REPORT_CONTENT.copy()
        except Exception as e:
            ai_logger.error(f"ERROR AI: 生成 AI 戰報時發生未知錯誤 (嘗試 {attempt+1}): {e}", exc_info=True)
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                continue
            return DEFAULT_BATTLE_REPORT_CONTENT.copy()

    ai_logger.error(f"ERROR AI: 所有重試均失敗，無法為戰鬥生成完整 AI 戰報。")
    return DEFAULT_BATTLE_REPORT_CONTENT.copy()


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    
    # 模擬測試數據
    test_player_monster = {
        'id': 'player_m_1',
        'nickname': '烈焰幼龍',
        'elements': ['火', '龍'],
        'rarity': '稀有',
        'hp': 120, 'mp': 60, 'attack': 25, 'defense': 18, 'speed': 22, 'crit': 8,
        'score': 500,
        'skills': [
            {"name": "火焰爪", "power": 30, "type": "火", "mp_cost": 6},
            {"name": "龍息術", "power": 40, "type": "火", "mp_cost": 10}
        ],
        "personality": {"name": "勇敢的", "description": "天生的冒險家，字典裡沒有「害怕」。"},
        "creationTime": int(time.time()) - 86400 # 一天前
    }
    test_opponent_monster = {
        'id': 'opponent_m_1',
        'nickname': '冰霜巨魔',
        'elements': ['水', '土'],
        'rarity': '普通',
        'hp': 100, 'mp': 50, 'attack': 20, 'defense': 15, 'speed': 10, 'crit': 5,
        'score': 300,
        'skills': [
            {"name": "冰錐術", "power": 25, "type": "水", "mp_cost": 5},
            {"name": "泥巴投擲", "power": 20, "type": "土", "mp_cost": 4}
        ],
        "personality": {"name": "懶散的", "description": "對任何事都提不起勁。"},
        "isNPC": True,
        "creationTime": int(time.time()) - 172800 # 兩天前
    }
    
    test_battle_result_win = {
        "winner_id": test_player_monster['id'],
        "loser_id": test_opponent_monster['id'],
        "extracted_dna_templates": [{"id": "dna_water_c01", "name": "純淨水滴", "rarity": "普通", "type": "水"}],
        "stat_gains": {"attack": 2, "hp": 5}
    }
    test_battle_result_lose = {
        "winner_id": test_opponent_monster['id'],
        "loser_id": test_player_monster['id'],
        "extracted_dna_templates": [],
        "stat_gains": {}
    }
    test_battle_result_draw = {
        "winner_id": "平手",
        "loser_id": "平手",
        "extracted_dna_templates": [],
        "stat_gains": {}
    }

    test_raw_log_full = [
        "--- 回合 1 開始 ---",
        "烈焰幼龍 對 冰霜巨魔 發動了 火焰爪！造成 45 點傷害。",
        "冰霜巨魔 對 烈焰幼龍 發動了 冰錐術！烈焰幼龍陷入了 冰凍 狀態。",
        "--- 回合 2 開始 ---",
        "烈焰幼龍 因 冰凍 狀態無法行動！",
        "冰霜巨魔 對 烈焰幼龍 發動了 冰錐術！造成 30 點傷害。",
        "--- 回合 3 開始 ---",
        "烈焰幼龍 的 冰凍 狀態解除了！",
        "烈焰幼龍 對 冰霜巨魔 發動了 火焰爪！致命一擊！造成 90 點傷害。冰霜巨魔 被擊倒了！",
        "戰鬥結束！烈焰幼龍 獲勝！"
    ]

    print("\n--- AI 生成的完整戰報內容 (玩家勝利) ---")
    report_win = generate_battle_report_content(test_player_monster, test_opponent_monster, test_battle_result_win, test_raw_log_full)
    for key, value in report_win.items():
        print(f"{key}: {value}\n")

    print("\n--- AI 生成的完整戰報內容 (玩家失敗，模擬數據) ---")
    report_lose = generate_battle_report_content(test_player_monster, test_opponent_monster, test_battle_result_lose, test_raw_log_full)
    for key, value in report_lose.items():
        print(f"{key}: {value}\n")
    
    print("\n--- AI 生成的完整戰報內容 (平手，模擬數據) ---")
    report_draw = generate_battle_report_content(test_player_monster, test_opponent_monster, test_battle_result_draw, test_raw_log_full)
    for key, value in report_draw.items():
        print(f"{key}: {value}\n")
