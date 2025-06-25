import os
import sys
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.MD_config_services import get_game_configs, update_game_configs
from backend.services.player_services import get_player_data, update_player_data, create_player_data
from backend.services.utils_services import get_api_key, get_player_id_from_request

from backend.routes import (
    monster_routes,
    battle_routes,
    leaderboard_routes,
    adventure_routes,
    champion_routes,
    post_battle_routes,
    mail_routes,
    admin_routes,
    config_editor_routes
)

app = FastAPI()

# CORS Middleware
origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://monster-dungeon.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key Dependency
async def verify_api_key(req: Request):
    api_key = get_api_key()
    if req.headers.get("X-API-KEY") != api_key:
        # Allow access for internal Render health checks
        if "render.com" in req.headers.get("host", "") and req.scope['path'] == "/":
            return
        # Allow access to the root path for basic checks
        if req.scope['path'] == "/":
            return
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return

# Include routers
app.include_router(monster_routes.router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(battle_routes.router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(leaderboard_routes.router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(adventure_routes.router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(champion_routes.router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(post_battle_routes.router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(mail_routes.router, prefix="/api", dependencies=[Depends(verify_api_key)])
app.include_router(config_editor_routes.router, prefix="/api/config_editor", dependencies=[Depends(verify_api_key)])
app.include_router(admin_routes.router, prefix="/admin", dependencies=[Depends(verify_api_key)])


# API to get player ID from token
class TokenData(BaseModel):
    id_token: str

@app.post("/api/get_player_id")
async def get_player_id_endpoint(token_data: TokenData):
    try:
        player_id = await get_player_id_from_request(token_data.id_token)
        return {"player_id": player_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "Welcome to the Monster Dungeon API"}

# Mount static files
try:
    # This will be the path when running from the `backend` directory
    static_path = os.path.join(os.path.dirname(__file__), '..')
    if not os.path.exists(os.path.join(static_path, "index.html")):
        # If not found, try a path suitable for Render deployment
        static_path = os.path.join(os.path.dirname(__file__), '..', 'frontend') # Adjust if your structure is different

    if os.path.exists(static_path):
        app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
    else:
        print(f"Warning: Static path '{static_path}' not found. Static files will not be served.")

except Exception as e:
    print(f"Error mounting static files: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
