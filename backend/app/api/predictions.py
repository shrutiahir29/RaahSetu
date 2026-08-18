from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.ml.predictor import predictor_instance
from app.routing.graph_builder import graph_builder_instance

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])

class PredictionRequestSchema(BaseModel):
    segment_id: str
    horizon_minutes: Optional[int] = 30
    hour: Optional[int] = 18
    day_of_week: Optional[int] = 1
    has_incident: Optional[int] = 0

@router.post("/predict")
def predict_segment_traffic(req: PredictionRequestSchema):
    seg = graph_builder_instance.segments_dict.get(req.segment_id)
    if not seg:
        return {"error": f"Segment ID '{req.segment_id}' not found in Nagpur road network"}
        
    feature_payload = {
        "speed_limit_kmh": seg["speed_limit_kmh"],
        "capacity_pcu_hr": seg["capacity_pcu_hr"],
        "volume_pcu_hr": int(seg["capacity_pcu_hr"] * 0.7),
        "vc_ratio": 0.7,
        "hour": req.hour,
        "day_of_week": req.day_of_week,
        "is_weekend": 1 if req.day_of_week >= 5 else 0,
        "is_peak_hour": 1 if 8 <= req.hour <= 11 or 17 <= req.hour <= 20 else 0,
        "temperature_c": 31.0,
        "rainfall_mm": 0.0,
        "visibility_km": 10.0,
        "has_incident": req.has_incident,
        "incident_severity": 2 if req.has_incident else 0,
        "lag_volume_1h": int(seg["capacity_pcu_hr"] * 0.65),
        "lag_speed_1h": seg["speed_limit_kmh"] * 0.75,
        "rolling_avg_speed_3h": seg["speed_limit_kmh"] * 0.8,
        "rolling_avg_volume_3h": int(seg["capacity_pcu_hr"] * 0.68)
    }
    
    result = predictor_instance.predict_congestion(feature_payload, horizon_minutes=req.horizon_minutes)
    return {
        "segment_id": req.segment_id,
        "segment_name": seg["name"],
        "horizon_minutes": req.horizon_minutes,
        **result
    }
