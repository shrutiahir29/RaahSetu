import random
from fastapi import APIRouter
from app.routing.graph_builder import graph_builder_instance
from app.ml.predictor import predictor_instance

router = APIRouter(prefix="/api/traffic", tags=["Traffic"])

# In-memory live state for active segment traffic
LIVE_TRAFFIC_STATE = {}

def init_live_traffic():
    segments = graph_builder_instance.segments_dict
    random.seed(101)
    for seg_id, seg in segments.items():
        speed_limit = seg["speed_limit_kmh"]
        cap = seg["capacity_pcu_hr"]
        
        # Wardha road / Central ave default moderate, rest low
        if "sitabuldi" in seg_id or "ajni" in seg_id or "chhatrapati" in seg_id:
            c_idx = random.uniform(0.65, 0.85) # High/Severe
        elif "centralave" in seg_id or "sadar" in seg_id:
            c_idx = random.uniform(0.45, 0.65) # Moderate
        else:
            c_idx = random.uniform(0.15, 0.40) # Low
            
        speed = max(8.0, round(speed_limit * (1.0 - c_idx * 0.7), 1))
        volume = int(cap * (c_idx * 0.9 + 0.1))
        
        if c_idx < 0.35:
            level = "LOW"
        elif c_idx < 0.60:
            level = "MODERATE"
        elif c_idx < 0.80:
            level = "HIGH"
        else:
            level = "SEVERE"
            
        LIVE_TRAFFIC_STATE[seg_id] = {
            "segment_id": seg_id,
            "name": seg["name"],
            "corridor": seg["corridor"],
            "speed_limit_kmh": speed_limit,
            "avg_speed_kmh": speed,
            "volume_pcu_hr": volume,
            "capacity_pcu_hr": cap,
            "vc_ratio": round(volume / cap, 2),
            "congestion_index": round(c_idx, 3),
            "congestion_level": level,
            "last_updated": "Just now"
        }

init_live_traffic()

@router.get("/current")
def get_current_traffic():
    seg_list = list(LIVE_TRAFFIC_STATE.values())
    avg_speed = round(sum(s["avg_speed_kmh"] for s in seg_list) / len(seg_list), 1)
    total_volume = sum(s["volume_pcu_hr"] for s in seg_list)
    severe_count = sum(1 for s in seg_list if s["congestion_level"] in ["HIGH", "SEVERE"])
    
    return {
        "city": "Nagpur, Maharashtra",
        "overall_status": "Heavy Rush on Wardha Road & Central Avenue" if severe_count > 2 else "Moderate Flow",
        "average_speed_kmh": avg_speed,
        "total_active_volume_pcu": total_volume,
        "congested_segments_count": severe_count,
        "total_segments_monitored": len(seg_list),
        "last_updated": "2026-08-17 20:00:00"
    }

@router.get("/segments")
def get_traffic_segments():
    # Enrich segments with coordinates and ML predictions
    response_segments = []
    graph = graph_builder_instance.graph
    
    for seg_id, seg in graph_builder_instance.segments_dict.items():
        live_data = LIVE_TRAFFIC_STATE.get(seg_id, {})
        start_node = graph_builder_instance.nodes_dict[seg["start_node"]]
        end_node = graph_builder_instance.nodes_dict[seg["end_node"]]
        
        # XGBoost ML Prediction for +30m horizon
        ml_input = {
            "speed_limit_kmh": seg["speed_limit_kmh"],
            "capacity_pcu_hr": seg["capacity_pcu_hr"],
            "volume_pcu_hr": live_data.get("volume_pcu_hr", 2000),
            "vc_ratio": live_data.get("vc_ratio", 0.6),
            "hour": 18,
            "day_of_week": 1,
            "is_weekend": 0,
            "is_peak_hour": 1,
            "has_incident": 0,
            "incident_severity": 0
        }
        pred = predictor_instance.predict_congestion(ml_input, horizon_minutes=30)
        
        response_segments.append({
            **seg,
            "start_coords": [start_node["lat"], start_node["lng"]],
            "end_coords": [end_node["lat"], end_node["lng"]],
            "current_traffic": live_data,
            "prediction": pred
        })
        
    return response_segments

@router.get("/hotspots")
def get_traffic_hotspots():
    hotspots = []
    for seg_id, seg in LIVE_TRAFFIC_STATE.items():
        if seg["congestion_level"] in ["HIGH", "SEVERE"]:
            node_id = graph_builder_instance.segments_dict[seg_id]["start_node"]
            node_info = graph_builder_instance.nodes_dict[node_id]
            hotspots.append({
                "segment_id": seg_id,
                "location_name": seg["name"],
                "lat": node_info["lat"],
                "lng": node_info["lng"],
                "congestion_level": seg["congestion_level"],
                "congestion_index": seg["congestion_index"],
                "speed_kmh": seg["avg_speed_kmh"],
                "cause": "Peak Evening Commute & Narrow Flyover Bottleneck"
            })
    return hotspots
