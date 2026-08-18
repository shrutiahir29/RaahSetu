from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas_db import Incident as IncidentDB
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

# Live in-memory active incidents across Nagpur traffic network
ACTIVE_INCIDENTS_STATE = {
    "seg_ajni_chhatrapati": {
        "id": 101,
        "segment_id": "seg_ajni_chhatrapati",
        "title": "Wardha Road Metro Pillar Maintenance",
        "type": "Construction",
        "severity": 3,
        "description": "Right lane closed near Ajni Sq Flyover approach due to Metro pillar inspection.",
        "is_active": True,
        "created_at": "2026-08-18 08:30:00"
    },
    "seg_rahate_medical": {
        "id": 102,
        "segment_id": "seg_rahate_medical",
        "title": "Flyover Expansion Joint Repair",
        "type": "Construction",
        "severity": 2,
        "description": "Lane width reduced on Medical Square approach flyover.",
        "is_active": True,
        "created_at": "2026-08-18 09:15:00"
    },
    "seg_sitabuldi_centralave": {
        "id": 103,
        "segment_id": "seg_sitabuldi_centralave",
        "title": "Waterlogging near Cotton Market Underpass",
        "type": "Waterlogging",
        "severity": 2,
        "description": "Accumulated rainwater slowing down eastbound traffic flow.",
        "is_active": True,
        "created_at": "2026-08-18 10:00:00"
    },
    "seg_sadar_automotive": {
        "id": 104,
        "segment_id": "seg_sadar_automotive",
        "title": "Heavy Truck Breakdown on Kamptee Rd Flyover",
        "type": "Vehicle Breakdown",
        "severity": 3,
        "description": "Stalled container truck blocking northbound lane near Gurudwara Sq.",
        "is_active": True,
        "created_at": "2026-08-18 11:20:00"
    },
    "seg_lawcollege_dharampeth": {
        "id": 105,
        "segment_id": "seg_lawcollege_dharampeth",
        "title": "VIP Convoy Movement & Signal Hold",
        "type": "Event",
        "severity": 2,
        "description": "Intermittent traffic holds near Law College Square for official movement.",
        "is_active": True,
        "created_at": "2026-08-18 12:00:00"
    },
    "seg_shankarnagar_itpark": {
        "id": 106,
        "segment_id": "seg_shankarnagar_itpark",
        "title": "Drainage Pipeline Maintenance",
        "type": "Construction",
        "severity": 1,
        "description": "Minor speed restriction near Subhash Nagar T-Junction.",
        "is_active": True,
        "created_at": "2026-08-18 13:45:00"
    }
}

class IncidentCreateSchema(BaseModel):
    segment_id: str
    title: str
    type: str # Accident, Road Closure, Construction, Waterlogging, Event, Vehicle Breakdown
    severity: int # 1, 2, 3
    description: str

class IncidentUpdateSchema(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    severity: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("")
def list_incidents():
    return list(ACTIVE_INCIDENTS_STATE.values())

@router.post("")
async def create_incident(data: IncidentCreateSchema, db: Session = Depends(get_db)):
    inc_id = len(ACTIVE_INCIDENTS_STATE) + 201
    incident_obj = {
        "id": inc_id,
        "segment_id": data.segment_id,
        "title": data.title,
        "type": data.type,
        "severity": data.severity,
        "description": data.description,
        "is_active": True,
        "created_at": "2026-08-17 20:00:00"
    }
    
    ACTIVE_INCIDENTS_STATE[data.segment_id] = incident_obj
    
    # Broadcast incident update to all connected WebSockets
    await ws_manager.broadcast({
        "type": "INCIDENT_ADDED",
        "incident": incident_obj
    })
    
    return {"message": "Incident reported successfully", "incident": incident_obj}

@router.patch("/{incident_id}")
async def update_incident(incident_id: int, data: IncidentUpdateSchema):
    target_seg = None
    for seg_id, inc in ACTIVE_INCIDENTS_STATE.items():
        if inc["id"] == incident_id:
            target_seg = seg_id
            break
            
    if not target_seg:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    inc = ACTIVE_INCIDENTS_STATE[target_seg]
    if data.title: inc["title"] = data.title
    if data.type: inc["type"] = data.type
    if data.severity is not None: inc["severity"] = data.severity
    if data.description: inc["description"] = data.description
    if data.is_active is not None: inc["is_active"] = data.is_active
    
    if not inc["is_active"]:
        del ACTIVE_INCIDENTS_STATE[target_seg]
        
    await ws_manager.broadcast({
        "type": "INCIDENT_UPDATED",
        "incident": inc
    })
    
    return {"message": "Incident updated", "incident": inc}

@router.delete("/{incident_id}")
async def delete_incident(incident_id: int):
    target_seg = None
    for seg_id, inc in ACTIVE_INCIDENTS_STATE.items():
        if inc["id"] == incident_id:
            target_seg = seg_id
            break
            
    if target_seg:
        deleted = ACTIVE_INCIDENTS_STATE.pop(target_seg)
        await ws_manager.broadcast({"type": "INCIDENT_DELETED", "incident_id": incident_id})
        return {"message": "Incident resolved/removed", "deleted": deleted}
    raise HTTPException(status_code=404, detail="Incident ID not found")
