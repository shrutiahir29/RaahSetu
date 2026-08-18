import httpx
import logging

NAGPUR_LAT = 21.1458
NAGPUR_LON = 79.0882

async def fetch_nagpur_weather() -> dict:
    url = f"https://api.open-meteo.com/v1/forecast?latitude={NAGPUR_LAT}&longitude={NAGPUR_LON}&current=temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m,visibility"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                w_code = current.get("weather_code", 0)
                
                # Interpret weather code
                condition = "Clear Sky"
                if w_code in [1, 2, 3]:
                    condition = "Partly Cloudy"
                elif w_code in [51, 53, 61, 63]:
                    condition = "Light Rain"
                elif w_code in [65, 80, 81, 82]:
                    condition = "Heavy Rain"
                elif w_code in [45, 48]:
                    condition = "Haze / Fog"

                return {
                    "city": "Nagpur, Maharashtra",
                    "temperature_c": current.get("temperature_2m", 31.5),
                    "humidity_pct": current.get("relative_humidity_2m", 68.0),
                    "rainfall_mm": current.get("rain", 0.0),
                    "visibility_km": round(current.get("visibility", 10000) / 1000.0, 1),
                    "wind_speed_kmh": current.get("wind_speed_10m", 12.4),
                    "condition": condition
                }
    except Exception as e:
        logging.warning(f"Live Weather API fetch failed: {e}. Returning Nagpur monsoon baseline.")

    return {
        "city": "Nagpur, Maharashtra",
        "temperature_c": 31.2,
        "humidity_pct": 74.0,
        "rainfall_mm": 1.2,
        "visibility_km": 8.5,
        "wind_speed_kmh": 14.0,
        "condition": "Partly Cloudy"
    }
