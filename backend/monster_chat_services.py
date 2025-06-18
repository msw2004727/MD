# backend/monster_chat_services.py
# 處理怪獸 AI 聊天的核心服務邏輯

import logging
from typing import Dict, Any, List, Optional
import requests
import random
import time
import math

# 從專案的其他模組導入必要的模型
from .MD_models import PlayerGameData, Monster, GameConfigs, ChatHistoryEntry
from .player_services import get_player_data_service
# --- 核心修改處 START ---
# 從共用函式庫導入感情值計算工具
from .utils_services import update_bond_with_diminishing_returns
# --- 核心修改處 END ---

# --- 【新增】從 MD_ai_services 導入必要的變數與函式 ---
from .MD_ai_services import (
    DEEPSEEK_API_KEY, DEEPSEEK_MODEL, DEEPSEEK_API_URL, 
    DEFAULT_CHAT_REPLY, _get_world_knowledge_context, ai_logger
)

# 設定日誌記錄器
chat_logger = logging.getLogger(__name__)

# 定義短期記憶的長度 (儲存的對話數量)
CHAT_HISTORY_LIMIT = 20

def _get_bond_level_tone_instruction(bond_points: int) -> str:
    """根據感情值，決定AI的語氣指示。"""
    if bond_points <= -76:
        return "你的語氣必須充滿敵意和不耐煩。你可能會直接拒絕回答問題，或者用簡短、尖銳的詞語來回應。"
    elif bond_points <= -11:
        return "你的語氣必須非常冷淡和疏遠。你會用『喔』、『嗯』、『隨便』這類詞語，字裡行間透露出不感興趣。"
    elif bond_points <= 10:
        return "你的語氣是中立的，主要根據你的天生個性來回應。"
    elif bond_points <= 75:
        return "你的語氣必須是友善且熱心的。你會更願意分享資訊，在句末可能會加上一些溫和的表情符號。"
    else:  # bond_points >= 76
        return "你的語氣必須非常親密和熱情。你會稱呼玩家為『摯友』或『夥伴』，並在回答中充滿信任感和依賴感。"

def generate_monster_interaction_response_service(
    player_id: str,
    monster_id: str,
    action_type: str,
    game_configs: GameConfigs
) -> Optional[Dict[str, Any]]:
    """
    生成怪獸對玩家物理互動的反應。
    """
    player_data, _ = get_player_data_service(player_id, None, game_configs)
    if not player_data:
        chat_logger.error(f"無法獲取玩家 {player_id} 的資料。")
        return None

    monster_to_react = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
    if not monster_to_react:
        chat_logger.error(f"在玩家 {player_id} 的農場中找不到怪獸 {monster_id}。")
        return None

    interaction_stats = monster_to_react.setdefault("interaction_stats", {})
    interaction_stats["touch_count"] = interaction_stats.get("touch_count", 0) + 1

    if action_type in ['pat', 'kiss']:
        # --- 核心修改處 START ---
        # 改為呼叫共用的函式
        update_bond_with_diminishing_returns(interaction_stats, "touch", 5)
        # --- 核心修改處 END ---
    elif action_type == 'punch':
        current_bond = interaction_stats.get("bond_points", 0)
        interaction_stats["bond_points"] = max(-100, current_bond - 10)

    action_map = {
        "punch": "揍了你一拳",
        "pat": "摸了摸你的頭",
        "kiss": "親了你一下"
    }
    action_desc = action_map.get(action_type, "對你做了一個奇怪的動作")

    bond_points = interaction_stats.get("bond_points", 0)
    bond_tone_instruction = _get_bond_level_tone_instruction(bond_points)

    system_prompt = f"""
你現在將扮演一隻名為「{monster_to_react.get('element_nickname_part') or monster_to_react.get('nickname', '怪獸')}」的怪獸。
你的核心準則是：完全沉浸在你的角色中，用「我」作為第一人稱來回應。
你的個性是「{monster_to_react.get('personality', {}).get('name', '未知')}」，這意味著：{monster_to_react.get('personality', {}).get('description', '你很普通')}。
你的回應必須簡短、口語化、並且絕對符合你的個性。
{bond_tone_instruction}
"""
    
    user_prompt = f"""
你的飼主「{player_data.get('nickname', '訓練師')}」剛剛對你做了這個動作：**{action_desc}**。

請根據你的個性和感情狀態，對這個動作做出一個自然且符合情境的反應。
我:
"""

    try:
        from .MD_ai_services import DEEPSEEK_API_KEY, DEEPSEEK_MODEL, DEEPSEEK_API_URL, DEFAULT_CHAT_REPLY
        if not DEEPSEEK_API_KEY:
            chat_logger.error("DeepSeek API 金鑰未設定。")
            return None

        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.9,
            "max_tokens": 80,
        }
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        response_json = response.json()

        if response_json.get("choices") and response_json["choices"][0].get("message"):
            reply = response_json["choices"][0]["message"].get("content", DEFAULT_CHAT_REPLY).strip()
            
            interaction_log = f"（你{action_desc}）"
            monster_to_react.setdefault("chatHistory", []).append({"role": "user", "content": interaction_log})
            monster_to_react["chatHistory"].append({"role": "assistant", "content": reply})
            
            monster_to_react["chatHistory"] = monster_to_react["chatHistory"][-CHAT_HISTORY_LIMIT:]

            return {
                "ai_reply": reply,
                "updated_player_data": player_data
            }
        else:
            return None

    except Exception as e:
        chat_logger.error(f"生成互動回應時發生錯誤: {e}", exc_info=True)
        return None


def generate_monster_chat_response_service(
    player_id: str,
    monster_id: str,
    player_message: str,
    game_configs: GameConfigs
) -> Optional[Dict[str, Any]]:
    """
    生成怪獸的聊天回應，並管理其對話歷史。
    """
    player_data, _ = get_player_data_service(player_id, None, game_configs)
    if not player_data:
        chat_logger.error(f"無法獲取玩家 {player_id} 的資料。")
        return None

    monster_to_chat = next((m for m in player_data.get("farmedMonsters", []) if m.get("id") == monster_id), None)
    if not monster_to_chat:
        chat_logger.error(f"在玩家 {player_id} 的農場中找不到怪獸 {monster_id}。")
        return None

    interaction_stats = monster_to_chat.setdefault("interaction_stats", {})
    interaction_stats["chat_count"] = interaction_stats.get("chat_count", 0) + 1
    
    # --- 核心修改處 START ---
    # 改為呼叫共用的函式
    update_bond_with_diminishing_returns(interaction_stats, "chat", 2)
    # --- 核心修改處 END ---

    chat_history: List[ChatHistoryEntry] = monster_to_chat.get("chatHistory", [])

    ai_reply_text = get_ai_chat_completion(
        monster_data=monster_to_chat,
        player_data=player_data,
        chat_history=chat_history,
        player_message=player_message
    )

    if not ai_reply_text:
        chat_logger.error(f"AI 服務未能為怪獸 {monster_id} 生成回應。")
        return None

    chat_history.append({"role": "user", "content": player_message})
    chat_history.append({"role": "assistant", "content": ai_reply_text})

    if len(chat_history) > CHAT_HISTORY_LIMIT:
        chat_history = chat_history[-CHAT_HISTORY_LIMIT:]

    monster_to_chat["chatHistory"] = chat_history

    result = {
        "ai_reply": ai_reply_text,
        "updated_player_data": player_data
    }
    
    chat_logger.info(f"成功為怪獸 {monster_id} 生成聊天回應。")
    return result


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

    interaction_stats = monster_data.get("interaction_stats", {})
    bond_points = interaction_stats.get("bond_points", 0)
    bond_tone_instruction = _get_bond_level_tone_instruction(bond_points)

    try:
        from .MD_config_services import load_all_game_configs_from_firestore
        game_configs = load_all_game_configs_from_firestore()
        knowledge_context = _get_world_knowledge_context(player_message, game_configs, player_data, monster_data.get("id", ""))
    except Exception as e:
        ai_logger.error(f"查找世界知識時出錯: {e}", exc_info=True)
        knowledge_context = None

    if knowledge_context:
        system_prompt = f"""
你現在將扮演一隻名為「{monster_short_name}」的怪獸。
你的核心準則是：完全沉浸在你的角色中，用「我」作為第一人稱來回應。
你的個性是「{monster_data.get('personality', {}).get('name', '未知')}」，這意味著：{monster_data.get('personality', {}).get('description', '你很普通')}。
你的回應中，請根據你的個性和當下情境，自然地加入適當的 emoji 和日式顏文字（如 (´・ω・`) 或 (✧∀✧)），讓你的角色更生動。
你的飼主「{player_data.get('nickname', '訓練師')}」正在向你請教遊戲知識。
{bond_tone_instruction}
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
        system_prompt = f"""
你現在將扮演一隻名為「{monster_short_name}」的怪獸。
你的核心準則是：完全沉浸在你的角色中，用「我」作為第一人稱來回應。
你的個性是「{monster_data.get('personality', {}).get('name', '未知')}」，這意味著：{monster_data.get('personality', {}).get('description', '你很普通')}。
{bond_tone_instruction}
你的回應中，請根據你的個性和當下情境，自然地加入適當的 emoji 和日式顏文字（如 (´・ω・`) 或 (✧∀✧)），讓你的角色更生動。
你的回應必須簡短、口語化，並且絕對符合你被賦予的個性和以下資料。你可以參照你的技能和DNA組成來豐富你的回答，但不要像在讀說明書。
你的飼主，也就是正在與你對話的玩家，名字是「{player_data.get('nickname', '訓練師')}」。
"""
        should_ask_question = False
        if len(chat_history) >= 4 and (len(chat_history) - 4) % 6 == 0 and random.random() < 0.25:
            should_ask_question = True

        skills_with_desc = [f"「{s.get('name')}」" for s in monster_data.get("skills", [])]
        dna_with_desc = [f"「{d.get('name')}」" for d in game_configs.get("dna_fragments", []) if d.get("id") in monster_data.get("constituent_dna_ids", [])]

        activity_log_entries = monster_data.get("activityLog", [])
        recent_activities_str = ""
        if activity_log_entries:
            recent_logs = activity_log_entries[:3]
            formatted_logs = []
            for log in recent_logs:
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
