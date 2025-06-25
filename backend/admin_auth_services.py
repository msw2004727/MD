# backend/admin_auth_services.py

import jwt
from datetime import datetime, timedelta, timezone

# 這是一個用來加密和解密JWT(JSON Web Token)的密鑰。
# 在正式環境中，這個密鑰絕對不應該直接寫在程式碼裡。
# 更好的做法是將它設定為Render上的環境變數，以提高安全性。
# 為了讓您能先順利啟動，我們暫時使用一個固定的字串。
ADMIN_SECRET_KEY = "your-very-secret-and-secure-key-for-admin-panel"

def create_admin_token(username):
    """
    為指定的管理員使用者名稱建立一個有時效性的JWT權杖。
    """
    try:
        payload = {
            'exp': datetime.now(timezone.utc) + timedelta(hours=8),  # 設定權杖8小時後過期
            'iat': datetime.now(timezone.utc),  # 權杖的發行時間
            'sub': username  # 權杖的主題 (這裡用使用者名稱)
        }
        token = jwt.encode(
            payload,
            ADMIN_SECRET_KEY,
            algorithm='HS256'
        )
        return token
    except Exception as e:
        # 在伺服器日誌中記錄錯誤，但不要將詳細錯誤回傳給使用者
        print(f"Error creating admin token: {e}")
        return None
