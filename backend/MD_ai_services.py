# backend/MD_ai_services.py
# 負責與 AI 模型互動，為怪獸生成描述性內容

import os
import json
import requests # 用於發送 HTTP 請求 
import logging
import time
from typing import Dict, Any, List, Optional # 用於類型提示
import random 

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

DEFAULT_ADVENTURE_STORY = "AI 冒險故事生成失敗，請稍後再試或檢查後台日誌。"
DEFAULT_BATTLE_REPORT_CONTENT = {
    "battle_description": "交戰描述生成失敗。",
    "battle_summary": "戰報總結生成失敗。",
    "loot_info": "戰利品資訊待補。",
    "growth_info": "怪獸成長資訊待補。"
}
DEFAULT_CHAT_REPLY = "嗯...（牠似乎在思考要說些什麼，但又不知道怎麼開口。）"

# 新增：用於載入 API 金鑰的函式
def _load_deepseek_api_key():
    """從 api_key.txt 檔案載入 DeepSeek API 金鑰。"""
    global DEEPSEEK_API_KEY
    try:
        # 檔案路徑相對於目前檔案（MD_ai_services.py）
        key_file_path = os.path.join(os.path.dirname(__file__), 'api_key.txt')
        if os.path.exists(key_file_path):
            with open(key_file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if "deepseek api key" in line.lower():
                        parts = line.split()
                        for part in parts:
                            if part.startswith("sk-"):
                                DEEPSEEK_API_KEY = part
                                ai_logger.info("成功從 api_key.txt 載入 DeepSeek API Key。")
                                return # 找到金鑰後就結束函式
            
            # 如果迴圈結束了還沒找到金鑰
            if not DEEPSEEK_API_KEY:
                ai_logger.warning("在 api_key.txt 中未找到符合格式的金鑰 (sk-...)。")
        else:
            ai_logger.warning(f"api_key.txt 檔案不存在於: {key_file_path}。AI 服務將無法運作。")
    except Exception as e:
        ai_logger.error(f"讀取 api_key.txt 時發生錯誤: {e}", exc_info=True)

# 在模組載入時執行一次金鑰載入
_load_deepseek_api_key()


def _get_world_knowledge_context(player_message: str, game_configs: GameConfigs, player_data: PlayerGameData, current_monster_id: str) -> Optional[Dict[str, Any]]:
    """
    分析玩家的訊息，判斷是否在詢問遊戲知識。
    如果是，則從 game_configs 或 player_data 中查找相關資訊並返回。
    """
    # 檢查是否在詢問關於農場裡的其他怪獸
    farmed_monsters = player_data.get("farmedMonsters", [])
    for monster in farmed_monsters:
        # 【修改】使用怪獸的短稱呼（屬性代表名）來進行匹配
        monster_short_name = monster.get("element_nickname_part") or monster.get("nickname")
        if monster_short_name and monster_short_name in player_message and monster.get("id") != current_monster_id:
            skills_str = ', '.join([s.get('name', '未知技能') for s in monster.get('skills', [])]) or '沒有特殊技能'
            context_str = f"關於我的夥伴「{monster_short_name}」的資料：牠是一隻 {monster.get('rarity')} 的 {monster.get('elements', ['未知'])[0]} 屬性怪獸。聽說牠的技能有 {skills_str}。"
            return {"topic_type": "Monster", "topic_name": monster_short_name, "context": context_str}

    # 檢查是否在詢問關於特定 DNA 的資訊
    all_dna = game_configs.get("dna_fragments", [])
    for dna in all_dna:
        if dna['name'] in player_message:
            context_str = f"關於「{dna['name']}」的資料：{dna['description']} 它是 {dna['rarity']} 的 {dna['type']} 屬性 DNA，主要影響HP({dna['hp']})、攻擊({dna['attack']})、防禦({dna['defense']})等能力。"
            return {"topic_type": "DNA", "topic_name": dna['name'], "context": context_str}

    # 檢查是否在詢問關於特定技能的資訊
    all_skills = game_configs.get("skills", {})
    for element_skills in all_skills.values():
        for skill in element_skills:
            if skill['name'] in player_message:
                context_str = f"關於技能「{skill['name']}」的資料：{skill.get('description', '一個神秘的招式')} 這是個 {skill.get('rarity', '普通')} 的 {skill.get('type', '無')} 屬性 {skill.get('skill_category', '技能')}，威力是 {skill.get('power', 0)}，消耗MP是 {skill.get('mp_cost', 0)}。"
                return {"topic_type": "Skill", "topic_name": skill['name'], "context": context_str}

    # 檢查是否在詢問一般性的遊戲指南問題
    guide_keywords = ["怎麼", "如何", "什麼是", "教我", "合成", "修煉", "屬性", "克制"]
    if any(keyword in player_message for keyword in guide_keywords):
        all_guides = game_configs.get("newbie_guide", [])
        for entry in all_guides:
            if any(keyword in entry['title'] for keyword in player_message.split()):
                return {"topic_type": "Guide", "topic_name": entry['title'], "context": f"關於「{entry['title']}」的說明：{entry['content']}"}
        if all_guides:
            return {"topic_type": "Guide", "topic_name": "遊戲目標", "context": f"關於「遊戲目標」的說明：{all_guides[0]['content']}"}

    return None


def get_ai_chat_completion(
    monster_data: Monster,
    player_data: PlayerGameData,
    chat_history: List[ChatHistoryEntry],
    player_message: str
) -> Optional[str]:
    """
    根據怪獸的完整資料、玩家資訊和對話歷史，生成個人化的聊天回應。
    """
    if not DEEPSEEK_API_KEY:
        ai_logger.error("DeepSeek API 金鑰未設定。無法呼叫 AI 聊天服務。")
        return DEFAULT_CHAT_REPLY
    
    monster_short_name = monster_data.get('element_nickname_part') or monster_data.get('nickname', '怪獸')


    try:
        from .MD_config_services import load_all_game_configs_from_firestore
        game_configs = load_all_game_configs_from_firestore()
        knowledge_context = _get_world_knowledge_context(player_message, game_configs, player_data, monster_data.get("id", ""))
    except Exception as e:
        ai_logger.error(f"查找世界知識時出錯: {e}", exc_info=True)
        knowledge_context = None

    if knowledge_context:
        # --- 知識問答模式 ---
        system_prompt = f"""
你現在將扮演一隻名為「{monster_short_name}」的怪獸。
你的核心準則是：完全沉浸在你的角色中，用「我」作為第一人稱來回應。
你的個性是「{monster_data.get('personality', {}).get('name', '未知')}」，這意味著：{monster_data.get('personality', {}).get('description', '你很普通')}。
你的回應中，請根據你的個性和當下情境，自然地加入適當的 emoji 和日式顏文字（如 (´・ω・`) 或 (✧∀✧)），讓你的角色更生動。
你的飼主「{player_data.get('nickname', '訓練師')}」正在向你請教遊戲知識。
你的任務是根據以下提供的「相關資料」，用你自己的個性和口吻，自然地回答玩家的問題。不要只是照本宣科。
"""
        user_content = f"""
--- 相關資料 ---
{knowledge_context.get('context')}
---
玩家的問題是：「{player_message}」

現在，請以「{monster_short_name}」的身份回答。
我:
"""
    else:
        # --- 一般閒聊模式 ---
        system_prompt = f"""
你現在將扮演一隻名為「{monster_short_name}」的怪獸。
你的核心準則是：完全沉浸在你的角色中，用「我」作為第一人稱來回應。
你的個性是「{monster_data.get('personality', {}).get('name', '未知')}」，這意味著：{monster_data.get('personality', {}).get('description', '你很普通')}。
你的回應中，請根據你的個性和當下情境，自然地加入適當的 emoji 和日式顏文字（如 (´・ω・`) 或 (✧∀✧)），讓你的角色更生動。
你的回應必須簡短、口語化，並且絕對符合你被賦予的個性和以下資料。你可以參照你的技能和DNA組成來豐富你的回答，但不要像在讀說明書。
你的飼主，也就是正在與你對話的玩家，名字是「{player_data.get('nickname', '訓練師')}」。
"""
        should_ask_question = False
        if len(chat_history) >= 4 and (len(chat_history) - 4) % 6 == 0 and random.random() < 0.25:
            should_ask_question = True

        skills_with_desc = [f"「{s.get('name')}」" for s in monster_data.get("skills", [])]
        dna_with_desc = [f"「{d.get('name')}」" for d in game_configs.get("dna_fragments", []) if d.get("id") in monster_data.get("constituent_dna_ids", [])]

        # 【修改】修正f-string語法錯誤
        activity_log_entries = monster_data.get("activityLog", [])
        recent_activities_str = ""
        if activity_log_entries:
            recent_logs = activity_log_entries[:3]
            formatted_logs = []
            for log in recent_logs:
                # 先將訊息處理好，再放入f-string
                message = log.get('message', '').replace('\n', ' ')
                formatted_logs.append(f"- {log.get('time', '')}: {message}")
            recent_activities_str = "\n".join(formatted_logs)
        else:
            recent_activities_str = "- 最近沒發生什麼特別的事。"

        stats_str = f"HP: {monster_data.get('hp')}/{monster_data.get('initial_max_hp')}, 攻擊: {monster_data.get('attack')}, 防禦: {monster_data.get('defense')}, 速度: {monster_data.get('speed')}"
        health_conditions = monster_data.get("healthConditions", [])
        conditions_str = "、".join([cond.get('name', '未知狀態') for cond in health_conditions]) if health_conditions else "非常健康"


        monster_profile = f"""
--- 我的資料 ---
- 我的名字：{monster_short_name}
- 我的屬性：{', '.join(monster_data.get('elements', []))}
- 我的稀有度：{monster_data.get('rarity')}
- 我的數值：{stats_str}
- 我的狀態：{conditions_str}
- 我的簡介：{monster_data.get('aiIntroduction', '一個謎。')}
- 我的技能：{', '.join(skills_with_desc) or '無'}
- 我的DNA組成：{', '.join(dna_with_desc) or '謎'}
- 我的最近動態：
{recent_activities_str}
"""
        formatted_history = "\n".join([f"{'玩家' if entry['role'] == 'user' else '我'}: {entry['content']}" for entry in chat_history])
        user_content = f"""
{monster_profile}

--- 最近的對話如下 ---
{formatted_history}
玩家: {player_message}
---
"""
        if should_ask_question:
            user_content += """
**特別指示：** 在你的回應中，除了回覆玩家的話，請自然地向玩家反問一個簡單的問題，像是「你今天過得怎麼樣？」、「你喜歡吃什麼？」或「你覺得我該加強哪個技能？」。
"""
        user_content += f"""
現在，請以「{monster_short_name}」的身份，用符合你個性的方式回應玩家。
我:
"""

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.85, 
        "max_tokens": 150,
    }
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        response_json = response.json()
        if response_json.get("choices") and response_json["choices"][0].get("message"):
            reply = response_json["choices"][0]["message"].get("content", DEFAULT_CHAT_REPLY).strip()
            ai_logger.info(f"成功為怪獸 {monster_data.get('id')} 生成聊天回應。")
            return reply
        else:
            ai_logger.error(f"DeepSeek API 聊天回應格式不符: {response_json}")
            return DEFAULT_CHAT_REPLY
    except requests.exceptions.RequestException as e:
        ai_logger.error(f"呼叫 DeepSeek API 進行聊天時發生網路錯誤: {e}", exc_info=True)
        return "（網路訊號好像不太好，我聽不太清楚...）"
    except Exception as e:
        ai_logger.error(f"生成 AI 聊天回應時發生未知錯誤: {e}", exc_info=True)
        return DEFAULT_CHAT_REPLY


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
) -> Dict[str, Any]:
    """
    根據戰鬥數據，生成完整的戰報內容，包含總結與 Hashtag。
    """
    ai_logger.info(f"開始為戰鬥生成 AI 戰報 (玩家: {player_monster.get('nickname')}, 對手: {opponent_monster.get('nickname')})。")

    battle_description_parts = []
    for raw_line in full_raw_battle_log:
        line = raw_line.strip()
        if line.startswith("- "):
            action_line = line[2:]
            battle_description_parts.append(action_line)
        else:
            battle_description_parts.append(line)

    formatted_description = "\n".join(battle_description_parts)
    if not formatted_description.strip():
        formatted_description = "戰鬥瞬間結束，未能記錄詳細過程。"

    if not DEEPSEEK_API_KEY:
        ai_logger.error("DeepSeek API 金鑰未設定。無法為戰鬥生成 AI 總結。")
        return {
            "battle_description": formatted_description,
            "battle_summary": "戰報總結生成失敗：AI服務未設定。",
            "tags": [],
            "loot_info": "戰利品資訊待補。",
            "growth_info": "怪獸成長資訊待補。"
        }
    
    winner_id = battle_result.get('winner_id')
    winner_name = player_monster.get('nickname') if winner_id == player_monster.get('id') else opponent_monster.get('nickname')
    highlights_str = "、".join(battle_result.get("battle_highlights", []))

    if winner_id != "平手":
        prompt_intro = f"一場激烈的怪獸對戰剛剛結束，最終由「{winner_name}」取得了勝利。"
    else:
        prompt_intro = f"一場激烈的怪獸對戰剛剛以「平手」告終。"

    # ----- BUG 修正邏輯 START -----
    # 新的指令，要求 AI 提供 JSON 格式的回應
    summary_prompt = f"""
{prompt_intro}
請根據這場戰鬥的幾個關鍵亮點：「{highlights_str}」，完成以下任務：
1. 撰寫一段約50-70字的精彩戰報總結。
2. 根據戰鬥亮點和總結，提煉出1到3個有趣的、吸引眼球的中文 Hashtag (例如：#逆轉勝 #一擊必殺 #持久戰大師)。

請嚴格按照以下JSON格式提供回應，不要有任何額外的解釋或開頭文字：
{{
  "summary": "（請在此處填寫戰報總結）",
  "tags": ["#範例標籤一", "#範例標籤二"]
}}
"""
    # ----- BUG 修正邏輯 END -----

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": "你是一位專業的怪獸戰報記者，精通中文，擅長撰寫生動、有張力的戰鬥報告，並且會嚴格遵循用戶指定的JSON格式輸出。"},
            {"role": "user", "content": summary_prompt}
        ],
        "temperature": 0.8,
        "max_tokens": 250, 
    }
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    ai_summary = DEFAULT_BATTLE_REPORT_CONTENT["battle_summary"]
    ai_tags = []
    try:
        response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=25)
        response.raise_for_status()
        response_json = response.json()
        
        if (response_json.get("choices") and response_json["choices"][0].get("message")):
            content_str = response_json["choices"][0]["message"].get("content", "{}").strip()
            
            # 清理可能的 markdown 標記
            if content_str.startswith("```json"):
                content_str = content_str[7:]
            if content_str.endswith("```"):
                content_str = content_str[:-3]
            content_str = content_str.strip()

            try:
                parsed_content = json.loads(content_str)
                ai_summary = parsed_content.get("summary", DEFAULT_BATTLE_REPORT_CONTENT["battle_summary"])
                ai_tags = parsed_content.get("tags", [])
                ai_logger.info(f"成功為戰鬥生成 AI 總結與標籤。")
            except json.JSONDecodeError:
                ai_logger.error(f"解析戰報AI回應的JSON失敗。將整個回應作為總結。原始字串: {content_str}")
                ai_summary = content_str # 如果JSON解析失敗，退回原始行為
                
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
