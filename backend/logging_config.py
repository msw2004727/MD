# backend/logging_config.py
# 獨立的日誌設定模組

import os
import sys
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    """
    設定全域的日誌系統，包含主控台輸出和 HTML 檔案輸出。
    """
    log_formatter = logging.Formatter('%(asctime)s - %(message)s', '%Y-%m-%d %H:%M:%S')

    # 1. 設定根日誌記錄器 (用於輸出到主控台)
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)

    # 2. 設定專門寫入 HTML 檔案的日誌記錄器
    log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    log_file_path = os.path.join(log_dir, 'game_log.html')
    
    # ----- BUG 修正邏輯 START -----
    # 移除 RotatingFileHandler，改為每次啟動時讀取、排序、重寫
    # 這樣可以實現日誌順序的反轉，但會失去日誌輪替功能。
    # 這是一個權衡，根據您的需求，顯示順序比防止檔案過大更重要。
    file_handler = logging.FileHandler(log_file_path, mode='a', encoding='utf-8') # 'a' for append
    # ----- BUG 修正邏輯 END -----

    class HtmlFormatter(logging.Formatter):
        def format(self, record):
            level_to_ch = {
                'DEBUG': ('除錯', '#888'),
                'INFO': ('資訊', '#3498db'),
                'WARNING': ('警告', '#f39c12'),
                'ERROR': ('錯誤', '#e74c3c'),
                'CRITICAL': ('嚴重錯誤', '#c0392b')
            }
            level_name_ch, level_color = level_to_ch.get(record.levelname, (record.levelname, '#000'))
            
            timestamp = self.formatTime(record, self.datefmt)
            log_message = record.getMessage().replace('&', '&amp;').replace('<', '&lt;')
            
            return (
                f'<div class="log-entry" style="color: {level_color};">'
                f'<span class="timestamp">[{timestamp}]</span> '
                f'<span class="levelname" style="font-weight: bold;">【{level_name_ch}】</span> '
                f'<span class="message">{log_message}</span>'
                f'</div>\n'
            )

    html_formatter = HtmlFormatter(datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(html_formatter)
    root_logger.addHandler(file_handler)
    
    if not os.path.exists(log_file_path) or os.path.getsize(log_file_path) < 100:
        with open(log_file_path, 'w', encoding='utf-8') as f:
            f.write("""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>遊戲後端日誌</title>
    <meta http-equiv="refresh" content="5">
    <style>
        body { font-family: 'Courier New', Courier, monospace; background-color: #1a1a1a; color: #f0f0f0; margin: 0; padding: 10px; }
        /* ----- BUG 修正邏輯 START ----- */
        /* 使用 flexbox 讓日誌項目由下往上排列 */
        body { display: flex; flex-direction: column-reverse; }
        /* ----- BUG 修正邏輯 END ----- */
        .log-entry { margin-bottom: 5px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; border-bottom: 1px solid #333; padding-bottom: 5px; }
        .timestamp { color: #666; }
        .levelname { font-weight: bold; }
        h1 { color: #3498db; border-bottom: 1px solid #3498db; padding-bottom: 5px; }
    </style>
</head>
<body>
    </body>
</html>
""")
    root_logger.info("日誌系統設定完成，已切換為中文格式。")
