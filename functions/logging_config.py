# backend/logging_config.py
# 獨立的日誌設定模組

import os
import sys
import logging
from logging.handlers import RotatingFileHandler
# ----- BUG 修正邏輯 START -----
# 導入 datetime 和 timezone 模組來處理時區轉換
from datetime import datetime, timezone, timedelta
# ----- BUG 修正邏輯 END -----

def setup_logging():
    """
    設定全域的日誌系統，包含主控台輸出和 HTML 檔案輸出。
    """
    # ----- BUG 修正邏輯 START -----
    # 建立一個代表 UTC+8 (台灣/亞洲/台北) 的時區物件
    CST = timezone(timedelta(hours=8))

    # 自定義 Formatter，讓時間轉換為 UTC+8
    class CstFormatter(logging.Formatter):
        def converter(self, timestamp):
            dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
            return dt.astimezone(CST)

        def formatTime(self, record, datefmt=None):
            dt = self.converter(record.created)
            if datefmt:
                s = dt.strftime(datefmt)
            else:
                s = dt.isoformat(timespec='milliseconds')
            return s

    # 使用新的 Formatter 來設定日誌格式
    log_formatter = CstFormatter('%(asctime)s - %(message)s', '%Y-%m-%d %H:%M:%S')
    # ----- BUG 修正邏輯 END -----

    # 1. 設定根日誌記錄器
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
    file_handler = logging.FileHandler(log_file_path, mode='a', encoding='utf-8')

    # 自定義 HTML 格式化器
    class HtmlFormatter(CstFormatter): # 繼承我們新的 CstFormatter
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
            log_message = record.getMessage().replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            
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
        body { display: flex; flex-direction: column-reverse; }
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
