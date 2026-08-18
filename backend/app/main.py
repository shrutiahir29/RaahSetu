import os
import sys
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add app directory to path
app_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(app_dir)
root_dir = os.path.dirname(backend_dir)
for p in [root_dir, backend_dir, app_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.database import Base, engine
from app.services.websocket_manager import ws_manager
from app.api import auth, traffic, predictions, routes, incidents, weather, alerts, analytics, simulation

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RAAHSETU - Nagpur AI Smart Traffic Management & Simulation Engine",
    description="Backend API engine supporting Nagpur peak-hour traffic distribution analysis, XGBoost predictions, and A* network balancing.",
    version="2.0.0"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(traffic.router)
app.include_router(predictions.router)
app.include_router(routes.router)
app.include_router(incidents.router)
app.include_router(weather.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(simulation.router)

@app.get("/")
def root():
    return {
        "app": "RAAHSETU",
        "city": "Nagpur, Maharashtra",
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.websocket("/ws/traffic")
async def websocket_traffic_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive & listen for client messages
            data = await websocket.receive_text()
            await websocket.send_json({"type": "PONG", "message": "Live connection active"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
