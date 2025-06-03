# MD_firebase_config.py
# 這個檔案現在只提供一個 db 變數，它將由主應用程式 (main.py) 來設定。
# 不再進行獨立的 Firebase 初始化。

# 引入 firestore 只是為了類型提示，如果您的環境支援
try:
    from firebase_admin import firestore # type: ignore
except ImportError:
    pass # 在沒有 firebase_admin 的環境中，這會失敗，但 db 仍然可以被設定為 None 或客戶端實例

db = None # 初始化為 None

def set_firestore_client(firestore_client):
    """
    由主應用程式 (main.py) 呼叫，以設定全域 Firestore 客戶端。
    """
    global db
    db = firestore_client
    if db:
        print("MD_firebase_config: Firestore client 已成功設定。")
    else:
        print("MD_firebase_config: 嘗試設定 Firestore client，但提供的是 None 或設定失敗。")

# 移除 initialize_firebase() 函式和底部的 db = initialize_firebase()
# 確保沒有其他程式碼會嘗試在這裡初始化 Firebase

if __name__ == '__main__':
    # 這個區塊現在僅用於說明，因為初始化已移至 main.py
    print("MD_firebase_config.py 被直接執行。")
    if db:
        print("db 變數已被設定 (可能由外部設定)。")
    else:
        print("db 變數目前為 None。它需要由主應用程式設定。")

