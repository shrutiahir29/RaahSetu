from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.simulation.engine import simulation_engine_instance
from app.models.schemas_db import TrafficSimulation, SimulationResult

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

class RunSimulationRequest(BaseModel):
    peak_window: str = "evening" # "morning" (9 AM - 12 PM) or "evening" (4 PM - 7 PM)
    target_hour: int = 18       # 9, 10, 11, 12 or 16, 17, 18, 19
    strategies: Optional[List[str]] = ["Route Redistribution", "Capacity Balancing", "Alternative Corridor Selection"]

@router.get("/distribution")
def get_traffic_distribution(
    peak_window: str = Query("evening", description="morning (9 AM - 12 PM) or evening (4 PM - 7 PM)"),
    hour: int = Query(18, description="Target simulation hour")
):
    return simulation_engine_instance.analyze_network_distribution(peak_window=peak_window, hour=hour)

@router.get("/diversion-plan")
def get_traffic_diversion_plan(
    peak_window: str = Query("evening", description="morning (9 AM - 12 PM) or evening (4 PM - 7 PM)"),
    hour: int = Query(18, description="Target simulation hour")
):
    return simulation_engine_instance.generate_diversion_plan(peak_window=peak_window, hour=hour)

@router.get("/signal-recommendations")
def get_adaptive_signal_recommendations(
    intersection_id: Optional[str] = Query(None, description="Specific intersection ID or None for all")
):
    from app.simulation.signal_optimizer import signal_optimizer_instance
    if intersection_id:
        return signal_optimizer_instance.optimize_intersection(intersection_id)
    return signal_optimizer_instance.get_all_intersection_optimizations()

class WhatIfRequest(BaseModel):
    from_segment_id: str = "seg_sitabuldi_rahate"
    to_segment_id: str = "seg_lawcollege_dharampeth"
    diversion_pct: float = 15.0
    time_period: str = "04:00 PM - 07:00 PM"

@router.post("/what-if")
def run_what_if_simulation(req: WhatIfRequest):
    from app.simulation.what_if_engine import what_if_engine_instance
    return what_if_engine_instance.run_what_if_simulation(
        from_segment_id=req.from_segment_id,
        to_segment_id=req.to_segment_id,
        diversion_pct=req.diversion_pct,
        time_period=req.time_period
    )

@router.get("/sumo-compare")
def run_sumo_comparison(
    diversion_pct: float = Query(15.0, description="Percentage of traffic redirected from arterial to bypass")
):
    from app.simulation.sumo_adapter import sumo_adapter_instance
    return sumo_adapter_instance.run_scenario_comparison(diversion_pct=diversion_pct)

@router.post("/run")
def run_simulation(data: RunSimulationRequest, db: Session = Depends(get_db)):
    res = simulation_engine_instance.simulate_traffic_redistribution(
        peak_window=data.peak_window,
        hour=data.target_hour,
        strategies=data.strategies
    )

    # Persist simulation log to database
    sim_log = TrafficSimulation(
        peak_window=data.peak_window,
        target_hour=data.target_hour,
        strategy_used=", ".join(data.strategies or [])
    )
    db.add(sim_log)
    db.commit()
    db.refresh(sim_log)

    before = res["before_simulation"]
    after = res["after_simulation"]
    improvements = res["measurable_improvements"]

    sim_res = SimulationResult(
        simulation_id=sim_log.id,
        overloaded_before=before["overloaded_count"],
        overloaded_after=after["overloaded_count"],
        underutilized_before=before["underutilized_count"],
        underutilized_after=after["underutilized_count"],
        avg_speed_before_kmh=before["avg_network_speed_kmh"],
        avg_speed_after_kmh=after["avg_network_speed_kmh"],
        travel_time_reduction_pct=improvements["travel_time_reduction_pct"],
        balance_improvement_pct=improvements["traffic_balance_improvement_pct"]
    )
    db.add(sim_res)
    db.commit()

    return {
        "simulation_id": sim_log.id,
        "created_at": sim_log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        **res
    }

@router.get("/history")
def get_simulation_history(db: Session = Depends(get_db)):
    logs = db.query(TrafficSimulation).order_by(TrafficSimulation.id.desc()).limit(15).all()
    results = []
    for l in logs:
        res_db = db.query(SimulationResult).filter(SimulationResult.simulation_id == l.id).first()
        results.append({
            "id": l.id,
            "peak_window": l.peak_window,
            "target_hour": l.target_hour,
            "strategy_used": l.strategy_used,
            "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "result": res_db
        })
    return results
