from fastapi import APIRouter
from app.api.incidents import ACTIVE_INCIDENTS_STATE

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("")
def get_alerts():
    alerts_list = [
        {
            "id": 1,
            "title": "Wardha Road Peak Hour Heavy Congestion",
            "message": "High traffic density detected between Sitabuldi and Ajni Square. Recommended route: Use WHC Road or Subhash Nagar Ring Road.",
            "alert_type": "Warning",
            "segment_id": "seg_sitabuldi_rahate",
            "timestamp": "10 mins ago"
        },
        {
            "id": 2,
            "title": "Waterlogging Alert on Central Avenue",
            "message": "Waterlogging near Cotton Market underpass. Drive with caution or divert via Residency Road.",
            "alert_type": "Emergency",
            "segment_id": "seg_sitabuldi_centralave",
            "timestamp": "25 mins ago"
        },
        {
            "id": 3,
            "title": "Green Wave Active on Kamptee Road Flyover",
            "message": "Signal timing optimized for continuous 50 km/h traffic flow towards Automotive Square.",
            "alert_type": "Info",
            "segment_id": "seg_sadar_automotive",
            "timestamp": "1 hour ago"
        }
    ]
    
    # Add alerts for active incidents
    for seg_id, inc in ACTIVE_INCIDENTS_STATE.items():
        alerts_list.append({
            "id": len(alerts_list) + 10,
            "title": f"Incident: {inc['title']}",
            "message": inc["description"],
            "alert_type": "Emergency" if inc["severity"] == 3 else "Warning",
            "segment_id": seg_id,
            "timestamp": "Just now"
        })
        
    return alerts_list
