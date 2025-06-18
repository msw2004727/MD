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
    log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s', '%Y-%m-%d %H:%M:%S')

    # 1. 設定根日誌記錄器 (用於輸出到主控台)
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # 清除可能由其他模組（如 gunicorn）預先設定的 handlers
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
        
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)

    # 2. 設定專門寫入 HTML 檔案的日誌記錄器
    # 確保 logs 目錄存在
    log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    log_file_path = os.path.join(log_dir, 'game_log.html')

    # 使用 RotatingFileHandler，防止日誌檔無限增大
    # 每個檔案最大 1MB，保留 3 個備份檔案
    file_handler = RotatingFileHandler(log_file_path, maxBytes=1024 * 1024, backupCount=3, encoding='utf-8')

    # 自定義 HTML 格式化器
    class HtmlFormatter(logging.Formatter):
        def format(self, record):
            level_colors = {
                'DEBUG': '#888',
                'INFO': '#3498db',
                'WARNING': '#f39c12',
                'ERROR': '#e74c3c',
                'CRITICAL': '#c0392b'
            }
            timestamp = self.formatTime(record, self.datefmt)
            # 對訊息進行 HTML 轉義，防止 XSS 攻擊或排版錯亂
            log_message = record.getMessage().replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            
            return (
                f'<div class="log-entry" style="color: {level_colors.get(record.levelname, "#000")};">'
                f'<span class="timestamp">[{timestamp}]</span> '
                f'<span class="levelname">[{record.levelname}]</span> '
                f'<span class="message">{log_message}</span>'
                f'</div>\n'
            )

    html_formatter = HtmlFormatter(datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(html_formatter)

    # 將 file_handler 加到根日誌記錄器，這樣所有模組的日誌都會被寫入
    root_logger.addHandler(file_handler)
    
    # 寫入一個初始的 HTML 頭部到日誌檔案中（如果檔案是空的）
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
        .log-entry { margin-bottom: 5px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word; border-bottom: 1px solid #333; padding-bottom: 5px; }
        .timestamp { color: #666; }
        .levelname { font-weight: bold; }
        h1 { color: #3498db; border-bottom: 1px solid #3498db; padding-bottom: 5px; }
    </style>
</head>
<body>
    <h1>遊戲後端即時日誌</h1>
</body>
</html>
""")
    root_logger.info("日誌系統設定完成。")
