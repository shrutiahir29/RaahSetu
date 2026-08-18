from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schemas_db import Incident as IncidentDB
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

# Live in-memory active incidents
ACTIVE_INCIDENTS_STATE = {
    "seg_rahate_medical": {
        "id": 101,
        "segment_id": "seg_rahate_medical",
        "title": "Flyover Repair Work",
        "type": "Construction",
        "severity": 2,
        "description": "Lane width reduced on Medical Square approach flyover.",
        "is_active": True,
        "created_at": "2026-08-17 14:30:00"
    },
    "seg_sitabuldi_centralave": {
        "id": 102,
        "segment_id": "seg_sitabuldi_centralave",
        "title": "Waterlogging near Cotton Market Underpass",
        "type": "Waterlogging",
        "severity": 2,
        "description": "Accumulated rainwater slowing down eastbound traffic.",
        "is_active": True,
        "created_at": "2026-08-17 17:15:00"
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
