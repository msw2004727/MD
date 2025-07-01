import firebase_admin
from firebase_admin import auth
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 取得請求標頭中的 Authorization
        auth_header = request.headers.get('Authorization')

        # 如果是公開路徑，例如 API 文件或根目錄，則直接放行
        public_paths = ["/docs", "/openapi.json", "/", "/api/version"]
        if request.url.path in public_paths or request.url.path.startswith('/admin'):
            response = await call_next(request)
            return response

        # 如果沒有 Authorization 標頭，則回傳錯誤
        if not auth_header:
            return JSONResponse(
                status_code=401,
                content={'error': '缺少 Authorization 驗證標頭'}
            )

        try:
            # 分割 "Bearer <token>"
            token = auth_header.split(' ')[1]
            # 驗證 Firebase token
            decoded_token = auth.verify_id_token(token)
            # 將解碼後的使用者資訊存放在 request.state 中，方便後續的 API 函式使用
            request.state.user = decoded_token
        except Exception as e:
            # 任何驗證失敗都回傳錯誤
            return JSONResponse(
                status_code=401,
                content={'error': '無效或過期的 Token', 'details': str(e)}
            )

        # 驗證通過，繼續執行後續的 API
        response = await call_next(request)
        return response
