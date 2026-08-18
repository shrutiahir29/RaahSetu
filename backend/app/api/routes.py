from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.routing.graph_builder import graph_builder_instance
from app.routing.astar import astar_router_instance
from app.api.traffic import LIVE_TRAFFIC_STATE
from app.api.incidents import ACTIVE_INCIDENTS_STATE
from app.models.schemas_db import SearchHistory, Route, RouteResult

router = APIRouter(prefix="/api/routes", tags=["Routes"])

class RouteFindRequest(BaseModel):
    from_location: str # e.g. "Sitabuldi", "node_sitabuldi", or "21.1458,79.0882"
    to_location: str   # e.g. "MIHAN", "node_mihan", or "21.0500,79.0300"
    start_coords: Optional[list] = None # [lat, lng]
    end_coords: Optional[list] = None   # [lat, lng]

def resolve_location_to_node_id(loc_str: str, coords: Optional[list] = None) -> str:
    loc_clean = loc_str.strip().lower()
    
    # Direct node matching
    if loc_clean in graph_builder_instance.nodes_dict:
        return loc_clean

    # Exact Landmark mapping table matching nagpurLocations frontend array
    exact_landmarks = {
        "sitabuldi interchange": "node_sitabuldi",
        "mihan it & sez hub": "node_mihan",
        "zero mile freedom park": "node_zero_mile",
        "sadar residency road sq": "node_sadar",
        "mankapur square": "node_mankapur",
        "automotive square (kamptee rd)": "node_automotive",
        "central avenue (cotton market)": "node_central_ave",
        "hb town square (bhandara rd)": "node_hb_town",
        "medical college square": "node_medical_sq",
        "ramdaspeth sq": "node_ramdaspeth",
        "rahate colony square": "node_rahate_colony",
        "ajni square (wardha rd)": "node_ajni_sq",
        "chhatrapati square (wardha rd)": "node_chhatrapati",
        "airport square (pride hotel sq)": "node_airport_sq",
        "nagpur airport terminal": "node_airport_term",
        "khapri metro station sq": "node_khapri",
        "dharampeth zenda chowk": "node_dharampeth",
        "law college square": "node_law_college",
        "shankarnagar square": "node_shankarnagar",
        "nagpur it park (parsodi)": "node_it_park",
        "hingna naka / midc": "node_hingna_naka"
    }

    if loc_clean in exact_landmarks:
        return exact_landmarks[loc_clean]

    # Flexible keyword mapping table for Nagpur
    landmarks = [
        ("sitabuldi", "node_sitabuldi"),
        ("mihan", "node_mihan"),
        ("zero mile", "node_zero_mile"),
        ("sadar", "node_sadar"),
        ("mankapur", "node_mankapur"),
        ("automotive", "node_automotive"),
        ("central ave", "node_central_ave"),
        ("cotton market", "node_central_ave"),
        ("hb town", "node_hb_town"),
        ("medical", "node_medical_sq"),
        ("ramdaspeth", "node_ramdaspeth"),
        ("rahate", "node_rahate_colony"),
        ("ajni", "node_ajni_sq"),
        ("chhatrapati", "node_chhatrapati"),
        ("terminal", "node_airport_term"),
        ("airport sq", "node_airport_sq"),
        ("airport", "node_airport_term"),
        ("khapri", "node_khapri"),
        ("dharampeth", "node_dharampeth"),
        ("law college", "node_law_college"),
        ("shankarnagar", "node_shankarnagar"),
        ("it park", "node_it_park"),
        ("hingna", "node_hingna_naka")
    ]
    
    for key, val in landmarks:
        if key in loc_clean:
            return val
            
    if coords and len(coords) == 2:
        return graph_builder_instance.find_nearest_node(coords[0], coords[1])
        
    return "node_sitabuldi"

@router.post("/find")
def find_route(req: RouteFindRequest, db: Session = Depends(get_db)):
    start_node = resolve_location_to_node_id(req.from_location, req.start_coords)
    end_node = resolve_location_to_node_id(req.to_location, req.end_coords)
    
    if start_node == end_node:
        raise HTTPException(status_code=400, detail="Start and Destination locations must be different")
        
    route_result = astar_router_instance.find_routes(
        start_node_id=start_node,
        end_node_id=end_node,
        live_traffic_map=LIVE_TRAFFIC_STATE,
        incidents_map=ACTIVE_INCIDENTS_STATE
    )
    
    if "error" in route_result:
        raise HTTPException(status_code=400, detail=route_result["error"])
        
    # Log search history into database
    rec = route_result.get("recommended_route", {})
    history_entry = SearchHistory(
        from_location=req.from_location,
        to_location=req.to_location,
        distance_km=rec.get("distance_km", 0.0),
        eta_minutes=rec.get("eta_minutes", 0.0)
    )
    db.add(history_entry)
    db.commit()
    
    return {
        "from_location": req.from_location,
        "to_location": req.to_location,
        "start_node_id": start_node,
        "end_node_id": end_node,
        **route_result
    }

@router.get("/{route_id}")
def get_saved_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    result = db.query(RouteResult).filter(RouteResult.route_id == route_id).first()
    return {"route": route, "result": result}
