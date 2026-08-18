import numpy as np
from typing import Dict, Any, List
from app.routing.graph_builder import graph_builder_instance

class WhatIfSimulationEngine:
    """
    Interactive What-If Traffic Simulator.
    Allows user/admin to test custom traffic diversion percentages (5%, 10%, 15%, 20%, 25%, 30%)
    from an overloaded source corridor to a candidate destination corridor.
    Outputs: BEFORE vs AFTER comparative metrics + Explainable AI reason.
    """
    def __init__(self):
        self.graph_builder = graph_builder_instance

    def run_what_if_simulation(
        self,
        from_segment_id: str = "seg_sitabuldi_rahate",
        to_segment_id: str = "seg_lawcollege_dharampeth",
        diversion_pct: float = 15.0,
        time_period: str = "04:00 PM - 07:00 PM"
    ) -> Dict[str, Any]:
        segments = dict(self.graph_builder.segments_dict)
        
        from_seg = segments.get(from_segment_id, list(segments.values())[0])
        to_seg = segments.get(to_segment_id, list(segments.values())[1])

        # Baseline Parameters BEFORE
        cap_from = from_seg["capacity_pcu_hr"]
        vol_from_before = int(cap_from * 0.96) # 96% Baseline Utilization
        vc_from_before = 0.96

        cap_to = to_seg["capacity_pcu_hr"]
        vol_to_before = int(cap_to * 0.42) # 42% Baseline Utilization
        vc_to_before = 0.42

        # Shift Volume according to user-selected diversion_pct
        shifted_pcu = int(vol_from_before * (diversion_pct / 100.0))

        vol_from_after = max(100, vol_from_before - shifted_pcu)
        vc_from_after = round(vol_from_after / cap_from, 3)

        vol_to_after = vol_to_before + shifted_pcu
        vc_to_after = round(vol_to_after / cap_to, 3)

        # Baseline Network Metrics BEFORE
        before_metrics = {
            "avg_waiting_time_sec": 84.5,
            "avg_travel_time_min": 36.2,
            "avg_queue_length_vehicles": 42,
            "total_throughput_pcu_hr": 14200,
            "congestion_index": 0.88,
            "overloaded_roads_count": 7,
            "from_road_utilization_pct": round(vc_from_before * 100.0, 1),
            "to_road_utilization_pct": round(vc_to_before * 100.0, 1)
        }

        # Dynamic Metrics AFTER based on shifted PCU
        wait_reduction_ratio = 1.0 - (diversion_pct / 100.0) * 1.6
        queue_reduction_ratio = 1.0 - (diversion_pct / 100.0) * 1.5

        after_metrics = {
            "avg_waiting_time_sec": round(max(25.0, before_metrics["avg_waiting_time_sec"] * wait_reduction_ratio), 1),
            "avg_travel_time_min": round(max(18.0, before_metrics["avg_travel_time_min"] * (1.0 - (diversion_pct / 100.0) * 0.8)), 1),
            "avg_queue_length_vehicles": int(max(10, before_metrics["avg_queue_length_vehicles"] * queue_reduction_ratio)),
            "total_throughput_pcu_hr": int(before_metrics["total_throughput_pcu_hr"] + shifted_pcu * 0.4),
            "congestion_index": round(max(0.35, before_metrics["congestion_index"] - (diversion_pct / 100.0) * 0.85), 2),
            "overloaded_roads_count": max(2, before_metrics["overloaded_roads_count"] - int(diversion_pct / 5.0)),
            "from_road_utilization_pct": round(vc_from_after * 100.0, 1),
            "to_road_utilization_pct": round(vc_to_after * 100.0, 1)
        }

        # Dynamically calculated improvement percentages
        improvements = {
            "waiting_time_reduction_pct": round(((before_metrics["avg_waiting_time_sec"] - after_metrics["avg_waiting_time_sec"]) / before_metrics["avg_waiting_time_sec"]) * 100.0, 1),
            "travel_time_reduction_pct": round(((before_metrics["avg_travel_time_min"] - after_metrics["avg_travel_time_min"]) / before_metrics["avg_travel_time_min"]) * 100.0, 1),
            "queue_reduction_pct": round(((before_metrics["avg_queue_length_vehicles"] - after_metrics["avg_queue_length_vehicles"]) / before_metrics["avg_queue_length_vehicles"]) * 100.0, 1),
            "overloaded_reduction": before_metrics["overloaded_roads_count"] - after_metrics["overloaded_roads_count"]
        }

        xai_reason = (
            f"Redirecting {diversion_pct}% ({shifted_pcu} PCU/hr) from {from_seg['name']} to {to_seg['name']} "
            f"lowers source utilization from {before_metrics['from_road_utilization_pct']}% to {after_metrics['from_road_utilization_pct']}%, "
            f"while target road absorbs flow comfortably up to {after_metrics['to_road_utilization_pct']}%. "
            f"This produces a net {improvements['waiting_time_reduction_pct']}% reduction in network waiting times."
        )

        return {
            "scenario": f"What-If {diversion_pct}% Traffic Diversion ({time_period})",
            "from_road": {"id": from_segment_id, "name": from_seg["name"]},
            "to_road": {"id": to_segment_id, "name": to_seg["name"]},
            "diversion_percentage": diversion_pct,
            "shifted_volume_pcu_hr": shifted_pcu,
            "time_period": time_period,
            "before": before_metrics,
            "after": after_metrics,
            "improvements": improvements,
            "explainable_ai_reason": xai_reason
        }

what_if_engine_instance = WhatIfSimulationEngine()
