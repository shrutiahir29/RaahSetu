from fastapi import APIRouter
from app.services.weather_service import fetch_nagpur_weather

router = APIRouter(prefix="/api/weather", tags=["Weather"])

@router.get("/current")
async def get_weather():
    return await fetch_nagpur_weather()
