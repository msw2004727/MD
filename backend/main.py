import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

# 將 'backend' 目錄添加到 Python 路徑中
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 使用相對路徑導入模組
import MD_firebase_config
from auth_middleware import FirebaseAuthMiddleware  # 保持這行
from admin_routes import router as admin_router
from MD_routes import router as md_router
from adventure_routes import router as adventure_router
from champion_routes import router as champion_router
from tournament_routes import router as tournament_router
from config_editor_routes import router as config_editor_router
from mail_routes import router as mail_router
from exchange_routes import router as exchange_router
from logging_config import setup_logging

# 設定日誌
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("伺服器啟動...")
    MD_firebase_config.initialize_firebase()
    yield
    print("伺服器關閉...")

app = FastAPI(lifespan=lifespan)

# 設定 CORS 中介軟體
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1:5500",
    "https://monster-dungeon.onrender.com",
    "https://monsters-dungeon.netlify.app",
    "https://msw2004727.github.io"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ！！！掛載 FirebaseAuthMiddleware！！！
# 我們把這一行的註解拿掉，來正式啟用它
app.add_middleware(FirebaseAuthMiddleware)

# 掛載 API 路由
app.include_router(md_router, prefix="/api")
app.include_router(admin_router, prefix="/admin/api")
app.include_router(adventure_router, prefix="/api/adventure")
app.include_router(champion_router, prefix="/api/champion")
app.include_router(tournament_router, prefix="/api/tournament")
app.include_router(config_editor_router, prefix="/api/config")
app.include_router(mail_router, prefix="/api/mail")
app.include_router(exchange_router, prefix="/api/exchange")

# 根路由
@app.get("/")
async def root(request: Request):
    return {"message": "歡迎來到怪獸地下城 API"}

# 掛載靜態文件目錄
static_files_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
if os.path.exists(static_files_path):
    app.mount("/", StaticFiles(directory=static_files_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
