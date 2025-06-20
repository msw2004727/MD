# backend/logging_config.py
# 獨立的日誌設定模組

import os
import sys
import logging
# --- 核心修改處 START ---
# 從 logging.handlers 導入 RotatingFileHandler
from logging.handlers import RotatingFileHandler
# --- 核心修改處 END ---
from datetime import datetime, timezone, timedelta

def setup_logging():
    """
    設定全域的日誌系統，包含主控台輸出和 HTML 檔案輸出。
    """
    CST = timezone(timedelta(hours=8))

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

    log_formatter = CstFormatter('%(asctime)s - %(message)s', '%Y-%m-%d %H:%M:%S')

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)

    log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    log_file_path = os.path.join(log_dir, 'game_log.html')

    # --- 核心修改處 START ---
    # 使用 RotatingFileHandler，設定每個檔案最大為 5MB，保留 3 個備份檔
    file_handler = RotatingFileHandler(
        log_file_path, 
        maxBytes=5*1024*1024, # 5 MB
        backupCount=3, 
        encoding='utf-8'
    )
    # --- 核心修改處 END ---

    class HtmlFormatter(CstFormatter):
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
    
    # 檢查檔案是否為空，若是則寫入 HTML 頭部
    # 這個邏輯對於 RotatingFileHandler 創建新檔案時同樣適用
    if not os.path.exists(log_file_path) or os.path.getsize(log_file_path) == 0:
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
        /* --- 核心修改處 START --- */
        .log-entry { margin-bottom: 5px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; border-bottom: 1px solid #333; padding-bottom: 5px; font-size: 0.9em; }
        /* --- 核心修改處 END --- */
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
