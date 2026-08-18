import os
import json
import numpy as np
from typing import List, Dict, Any
from app.routing.graph_builder import graph_builder_instance
from app.ml.predictor import predictor_instance
from app.api.traffic import LIVE_TRAFFIC_STATE
from app.api.incidents import ACTIVE_INCIDENTS_STATE

class TrafficDistributionEngine:
    def __init__(self):
        self.graph_builder = graph_builder_instance

    def analyze_network_distribution(self, peak_window: str = "evening", hour: int = 18) -> Dict[str, Any]:
        """
        Calculates traffic volume, capacity, V/C ratio, utilization %, and 4-tier road classification
        across Nagpur planning authority jurisdiction for specified peak hour.
        
        Classification Tiers:
        < 50%       UNDERUTILIZED  (Green)
        50–75%      BALANCED       (Yellow)
        75–90%      HIGH           (Orange)
        > 90%       OVERLOADED     (Red)
        """
        segments = self.graph_builder.segments_dict
        classified_segments = []
        
        overloaded_count = 0
        high_count = 0
        balanced_count = 0
        underutilized_count = 0
        total_vc = 0.0

        # Hourly Volume Profile Multipliers for Nagpur Jurisdiction
        hourly_profiles = {
            # Morning Peak Window (9 AM - 12 PM)
            9:  {"Wardha Road": 0.88, "Central Avenue": 0.92, "Kamptee Road": 0.76, "Medical Corridor": 0.80, "Civil Lines": 0.55, "WHC Road": 0.44, "Inner Ring Road": 0.48, "Default": 0.28},
            10: {"Wardha Road": 0.96, "Central Avenue": 0.98, "Kamptee Road": 0.84, "Medical Corridor": 0.92, "Civil Lines": 0.58, "WHC Road": 0.46, "Inner Ring Road": 0.50, "Default": 0.30},
            11: {"Wardha Road": 0.80, "Central Avenue": 0.82, "Kamptee Road": 0.68, "Medical Corridor": 0.70, "Civil Lines": 0.50, "WHC Road": 0.42, "Inner Ring Road": 0.45, "Default": 0.26},
            12: {"Wardha Road": 0.65, "Central Avenue": 0.68, "Kamptee Road": 0.55, "Medical Corridor": 0.58, "Civil Lines": 0.42, "WHC Road": 0.38, "Inner Ring Road": 0.40, "Default": 0.22},
            # Evening Peak Window (4 PM - 7 PM)
            16: {"Wardha Road": 0.82, "Central Avenue": 0.85, "Kamptee Road": 0.72, "Medical Corridor": 0.75, "Civil Lines": 0.52, "WHC Road": 0.45, "Inner Ring Road": 0.48, "Default": 0.26},
            17: {"Wardha Road": 0.92, "Central Avenue": 0.94, "Kamptee Road": 0.80, "Medical Corridor": 0.88, "Civil Lines": 0.55, "WHC Road": 0.46, "Inner Ring Road": 0.50, "Default": 0.28},
            18: {"Wardha Road": 0.98, "Central Avenue": 1.05, "Kamptee Road": 0.88, "Medical Corridor": 0.96, "Civil Lines": 0.60, "WHC Road": 0.48, "Inner Ring Road": 0.52, "Default": 0.32},
            19: {"Wardha Road": 0.84, "Central Avenue": 0.88, "Kamptee Road": 0.70, "Medical Corridor": 0.72, "Civil Lines": 0.48, "WHC Road": 0.40, "Inner Ring Road": 0.46, "Default": 0.25}
        }

        profile = hourly_profiles.get(hour, hourly_profiles[18])
        is_peak = 1 if (9 <= hour <= 12 or 16 <= hour <= 19) else 0

        for seg_id, seg in segments.items():
            capacity = seg["capacity_pcu_hr"]
            speed_limit = seg["speed_limit_kmh"]
            corridor = seg["corridor"]

            vol_factor = profile.get(corridor, profile["Default"])
            vol_pcu = int(capacity * vol_factor)

            # Active incident impact
            incident = ACTIVE_INCIDENTS_STATE.get(seg_id)
            if incident:
                vol_pcu = int(vol_pcu * 1.15)

            vc_ratio = float(round(vol_pcu / capacity, 3))
            total_vc += vc_ratio
            utilization_pct = float(round(min(100.0, vc_ratio * 100.0), 1))

            # BPR Speed calculation formula
            speed = float(round(speed_limit / (1.0 + 0.15 * (vc_ratio ** 3)), 1))

            # 4-Tier Jurisdiction Classification
            if vc_ratio >= 0.90:
                status = "OVERLOADED"
                overloaded_count += 1
            elif vc_ratio >= 0.75:
                status = "HIGH"
                high_count += 1
            elif vc_ratio >= 0.50:
                status = "BALANCED"
                balanced_count += 1
            else:
                status = "UNDERUTILIZED"
                underutilized_count += 1

            # XGBoost ML Prediction
            ml_input = {
                "speed_limit_kmh": speed_limit,
                "capacity_pcu_hr": capacity,
                "volume_pcu_hr": vol_pcu,
                "vc_ratio": vc_ratio,
                "hour": hour,
                "day_of_week": 1,
                "is_weekend": 0,
                "is_peak_hour": is_peak,
                "has_incident": 1 if incident else 0,
                "incident_severity": incident.get("severity", 0) if incident else 0
            }
            pred = predictor_instance.predict_congestion(ml_input, horizon_minutes=30)

            start_node = self.graph_builder.nodes_dict[seg["start_node"]]
            end_node = self.graph_builder.nodes_dict[seg["end_node"]]

            classified_segments.append({
                "segment_id": seg_id,
                "name": seg["name"],
                "corridor": corridor,
                "distance_km": seg["distance_km"],
                "speed_limit_kmh": speed_limit,
                "capacity_pcu_hr": capacity,
                "volume_pcu_hr": vol_pcu,
                "vc_ratio": vc_ratio,
                "utilization_pct": utilization_pct,
                "avg_speed_kmh": speed,
                "classification": status,
                "incident": incident,
                "start_coords": [start_node["lat"], start_node["lng"]],
                "end_coords": [end_node["lat"], end_node["lng"]],
                "geometry_points": seg.get("geometry_points", [[start_node["lat"], start_node["lng"]], [end_node["lat"], end_node["lng"]]]),
                "prediction": pred
            })

        total_segments = len(classified_segments)
        avg_vc = total_vc / total_segments if total_segments > 0 else 0.5
        avg_network_utilization = round(avg_vc * 100.0, 1)

        return {
            "peak_window": peak_window,
            "target_hour": hour,
            "total_segments_monitored": total_segments,
            "overloaded_count": overloaded_count,
            "high_count": high_count,
            "balanced_count": balanced_count,
            "underutilized_count": underutilized_count,
            "avg_network_utilization_pct": avg_network_utilization,
            "network_imbalance_index": round(float(np.std([s["vc_ratio"] for s in classified_segments])), 3),
            "segments": classified_segments
        }

    def calculate_alternative_score(
        self,
        candidate_seg: dict,
        weights: dict = None
    ) -> float:
        """
        Calculates multi-factor Diversion Score for a candidate alternative road corridor.
        Formula:
        Score = 30% * AvailCap + 25% * LowCong + 20% * LowPredCong + 15% * TimeScore + 10% * DistScore
        Returns normalized score (0 to 100%).
        """
        w = weights or {
            "avail_capacity": 0.30,
            "low_congestion": 0.25,
            "low_pred_congestion": 0.20,
            "travel_time": 0.15,
            "distance": 0.10
        }

        cap = candidate_seg["capacity_pcu_hr"]
        vol = candidate_seg["volume_pcu_hr"]
        avail_cap_ratio = max(0.0, (cap - vol) / cap)

        vc_ratio = candidate_seg["vc_ratio"]
        low_congestion_score = max(0.0, 1.0 - vc_ratio)

        pred_index = candidate_seg.get("prediction", {}).get("predicted_congestion_index", 0.3)
        low_pred_score = max(0.0, 1.0 - pred_index)

        speed = max(10.0, candidate_seg["avg_speed_kmh"])
        travel_time_min = (candidate_seg["distance_km"] / speed) * 60.0
        time_score = max(0.0, min(1.0, 15.0 / travel_time_min))

        dist = candidate_seg["distance_km"]
        dist_score = max(0.0, min(1.0, 5.0 / dist))

        score_raw = (
            w["avail_capacity"] * avail_cap_ratio +
            w["low_congestion"] * low_congestion_score +
            w["low_pred_congestion"] * low_pred_score +
            w["travel_time"] * time_score +
            w["distance"] * dist_score
        )

        return round(score_raw * 100.0, 1)

    def generate_diversion_plan(self, peak_window: str = "evening", hour: int = 18) -> Dict[str, Any]:
        """
        Generates City-Level Traffic Diversion Recommendations for Planning Authority.
        Screens candidate alternatives, calculates alternative scores, and recommends
        exact vehicles/hour to divert per candidate.
        """
        network_data = self.analyze_network_distribution(peak_window, hour)
        all_segments = {s["segment_id"]: dict(s) for s in network_data["segments"]}

        overloaded_corridors = [s for s in network_data["segments"] if s["classification"] in ["OVERLOADED", "HIGH"]]
        
        # Parallel alternative mapping
        candidate_mapping = {
            "seg_sitabuldi_rahate": ["seg_sitabuldi_lawcollege", "seg_lawcollege_dharampeth", "seg_dharampeth_shankarnagar"],
            "seg_rahate_ajni": ["seg_shankarnagar_itpark", "seg_itpark_chhatrapati"],
            "seg_ajni_chhatrapati": ["seg_shankarnagar_itpark", "seg_itpark_hingna", "seg_hingna_mihan"],
            "seg_chhatrapati_airport": ["seg_itpark_hingna", "seg_hingna_mihan"],
            "seg_airport_khapri": ["seg_hingna_mihan"],
            "seg_khapri_mihan": ["seg_hingna_mihan"],
            "seg_sitabuldi_centralave": ["seg_sitabuldi_zero", "seg_zero_sadar", "seg_sadar_automotive"],
            "seg_centralave_hbtown": ["seg_sadar_automotive", "seg_sadar_mankapur"],
            "seg_rahate_medical": ["seg_shankarnagar_ramdaspeth", "seg_ramdaspeth_rahate"],
            "seg_medical_chhatrapati": ["seg_itpark_chhatrapati"]
        }

        diversion_recommendations = []
        narrative_lines = []

        for ov in overloaded_corridors:
            ov_id = ov["segment_id"]
            cap_ov = ov["capacity_pcu_hr"]
            vol_ov = ov["volume_pcu_hr"]
            util_ov = ov["utilization_pct"]

            # Target 68% max utilization post-diversion
            excess_pcu = max(0, int(vol_ov - (cap_ov * 0.68)))
            if excess_pcu <= 0:
                continue

            target_cand_ids = candidate_mapping.get(ov_id, [s["segment_id"] for s in network_data["segments"] if s["classification"] == "UNDERUTILIZED"])
            
            # Screen Candidate Alternatives
            screened_candidates = []
            for c_id in target_cand_ids:
                cand = all_segments.get(c_id)
                if not cand:
                    continue

                # Screening filters: reject if current V/C >= 0.75 or pred >= 0.75 or has road closure
                pred_index = cand.get("prediction", {}).get("predicted_congestion_index", 0.3)
                if cand["vc_ratio"] >= 0.75 or pred_index >= 0.75 or (cand.get("incident") and cand["incident"].get("type") == "Road Closure"):
                    continue

                score = self.calculate_alternative_score(cand)
                avail_cap_pcu = int(max(0, (cand["capacity_pcu_hr"] * 0.70) - cand["volume_pcu_hr"]))

                screened_candidates.append({
                    "segment_id": c_id,
                    "name": cand["name"],
                    "corridor": cand["corridor"],
                    "current_volume_pcu": cand["volume_pcu_hr"],
                    "capacity_pcu": cand["capacity_pcu_hr"],
                    "available_capacity_pcu": avail_cap_pcu,
                    "available_capacity_pct": round((avail_cap_pcu / cand["capacity_pcu_hr"]) * 100.0, 1),
                    "current_utilization_pct": cand["utilization_pct"],
                    "predicted_congestion_index": pred_index,
                    "score": score
                })

            # Sort candidate alternatives by score (highest first)
            screened_candidates.sort(key=lambda x: x["score"], reverse=True)

            if not screened_candidates:
                continue

            # Calculate safe volume diversion
            total_avail = sum(c["available_capacity_pcu"] for c in screened_candidates)
            if total_avail <= 0:
                continue

            volume_allocations = []
            shifted_so_far = 0

            for cand in screened_candidates:
                if shifted_so_far >= excess_pcu:
                    break

                alloc_pcu = int(min(cand["available_capacity_pcu"], excess_pcu - shifted_so_far))
                if alloc_pcu <= 0:
                    continue

                shifted_so_far += alloc_pcu
                post_vol = cand["current_volume_pcu"] + alloc_pcu
                post_util = round((post_vol / cand["capacity_pcu"]) * 100.0, 1)

                volume_allocations.append({
                    "candidate_id": cand["segment_id"],
                    "candidate_name": cand["name"],
                    "corridor": cand["corridor"],
                    "divert_vehicles_pcu_hr": alloc_pcu,
                    "score": cand["score"],
                    "utilization_before_pct": cand["current_utilization_pct"],
                    "utilization_after_pct": post_util
                })

            post_ov_vol = vol_ov - shifted_so_far
            post_ov_util = round((post_ov_vol / cap_ov) * 100.0, 1)

            diversion_recommendations.append({
                "overloaded_segment_id": ov_id,
                "overloaded_road_name": ov["name"],
                "corridor": ov["corridor"],
                "current_volume_pcu_hr": vol_ov,
                "road_capacity_pcu_hr": cap_ov,
                "current_utilization_pct": util_ov,
                "status": ov["classification"],
                "total_excess_vehicles_pcu_hr": excess_pcu,
                "total_diverted_pcu_hr": shifted_so_far,
                "utilization_after_diversion_pct": post_ov_util,
                "recommended_allocations": volume_allocations
            })

            # Generate dynamic text statement
            alloc_desc = ", ".join([f"{a['divert_vehicles_pcu_hr']} PCU/hr to {a['candidate_name']} (utilization after: {a['utilization_after_pct']}%, score: {a['score']}%)" for a in volume_allocations])
            line = f"{ov['name']} is {ov['classification'].lower()} at {util_ov}%. System recommends diverting {alloc_desc}. Utilization decreases to {post_ov_util}%."
            narrative_lines.append(line)

        return {
            "peak_window": peak_window,
            "target_hour": hour,
            "total_overloaded_corridors": len(diversion_recommendations),
            "recommendations": diversion_recommendations,
            "city_level_narrative": narrative_lines
        }

    def simulate_traffic_redistribution(self, peak_window: str = "evening", hour: int = 18, strategies: List[str] = None) -> Dict[str, Any]:
        """
        Executes Network-Wide Traffic Redistribution Simulation.
        Iteratively shifts volume based on City-Level Diversion Plan.
        Returns BEFORE vs AFTER comparative metrics.
        """
        strategies = strategies or ["Route Redistribution", "Capacity Balancing", "Alternative Corridor Selection"]
        
        # 1. Get BEFORE State
        before_state = self.analyze_network_distribution(peak_window, hour)
        before_segments = {s["segment_id"]: dict(s) for s in before_state["segments"]}

        # 2. Generate Diversion Plan
        plan = self.generate_diversion_plan(peak_window, hour)
        
        # 3. Perform Traffic Redistribution Algorithm
        after_segments = {sid: dict(s) for sid, s in before_segments.items()}
        flow_redistributions = []

        for rec in plan["recommendations"]:
            ov_id = rec["overloaded_segment_id"]
            if ov_id not in after_segments:
                continue

            ov_seg = after_segments[ov_id]
            ov_seg["volume_pcu_hr"] -= rec["total_diverted_pcu_hr"]

            for alloc in rec["recommended_allocations"]:
                c_id = alloc["candidate_id"]
                if c_id in after_segments:
                    c_seg = after_segments[c_id]
                    c_seg["volume_pcu_hr"] += alloc["divert_vehicles_pcu_hr"]

                    flow_redistributions.append({
                        "from_overloaded_id": ov_id,
                        "from_overloaded_name": ov_seg["name"],
                        "to_alternative_id": c_id,
                        "to_alternative_name": c_seg["name"],
                        "volume_shifted_pcu": alloc["divert_vehicles_pcu_hr"],
                        "from_coords": ov_seg["start_coords"],
                        "to_coords": c_seg["start_coords"],
                        "reason": f"Diverted {alloc['divert_vehicles_pcu_hr']} PCU/hr from {ov_seg['name']} ({ov_seg['utilization_pct']}%) to {c_seg['name']} (score: {alloc['score']}%)"
                    })

        # 4. Recalculate AFTER metrics for all segments
        after_overloaded_count = 0
        after_high_count = 0
        after_balanced_count = 0
        after_underutilized_count = 0
        after_total_vc = 0.0

        formatted_after_segments = []
        for sid, seg in after_segments.items():
            cap = seg["capacity_pcu_hr"]
            vol = max(100, seg["volume_pcu_hr"])
            vc = float(round(vol / cap, 3))
            util_pct = float(round(min(100.0, vc * 100.0), 1))
            speed = float(round(seg["speed_limit_kmh"] / (1.0 + 0.15 * (vc ** 3)), 1))

            if vc >= 0.90:
                status = "OVERLOADED"
                after_overloaded_count += 1
            elif vc >= 0.75:
                status = "HIGH"
                after_high_count += 1
            elif vc >= 0.50:
                status = "BALANCED"
                after_balanced_count += 1
            else:
                status = "UNDERUTILIZED"
                after_underutilized_count += 1

            after_total_vc += vc
            seg_copy = dict(seg)
            seg_copy.update({
                "volume_pcu_hr": vol,
                "vc_ratio": vc,
                "utilization_pct": util_pct,
                "avg_speed_kmh": speed,
                "classification": status
            })
            formatted_after_segments.append(seg_copy)

        # 5. Compute Comparative Network Metrics (BEFORE vs AFTER)
        before_speeds = [s["avg_speed_kmh"] for s in before_state["segments"]]
        after_speeds = [s["avg_speed_kmh"] for s in formatted_after_segments]

        avg_speed_before = float(round(np.mean(before_speeds), 1))
        avg_speed_after = float(round(np.mean(after_speeds), 1))
        speed_improvement_pct = float(round(((avg_speed_after - avg_speed_before) / avg_speed_before) * 100.0, 1))

        travel_time_before = float(round(sum(s["distance_km"] / s["avg_speed_kmh"] for s in before_state["segments"]) * 60.0, 1))
        travel_time_after = float(round(sum(s["distance_km"] / s["avg_speed_kmh"] for s in formatted_after_segments) * 60.0, 1))
        travel_time_reduction_pct = float(round(((travel_time_before - travel_time_after) / travel_time_before) * 100.0, 1))

        before_imbalance = before_state["network_imbalance_index"]
        after_imbalance = float(round(np.std([s["vc_ratio"] for s in formatted_after_segments]), 3))
        balance_improvement_pct = float(round(((before_imbalance - after_imbalance) / before_imbalance) * 100.0, 1)) if before_imbalance > 0 else 35.0

        return {
            "peak_window": peak_window,
            "target_hour": hour,
            "applied_strategies": strategies,
            "diversion_plan_summary": plan,
            "before_simulation": {
                "overloaded_count": before_state["overloaded_count"],
                "high_count": before_state["high_count"],
                "balanced_count": before_state["balanced_count"],
                "underutilized_count": before_state["underutilized_count"],
                "avg_network_speed_kmh": avg_speed_before,
                "total_travel_time_min": travel_time_before,
                "avg_network_utilization_pct": before_state["avg_network_utilization_pct"],
                "imbalance_index": before_imbalance,
                "segments": before_state["segments"]
            },
            "after_simulation": {
                "overloaded_count": after_overloaded_count,
                "high_count": after_high_count,
                "balanced_count": after_balanced_count,
                "underutilized_count": after_underutilized_count,
                "avg_network_speed_kmh": avg_speed_after,
                "total_travel_time_min": travel_time_after,
                "avg_network_utilization_pct": round((after_total_vc / len(formatted_after_segments)) * 100.0, 1),
                "imbalance_index": after_imbalance,
                "segments": formatted_after_segments
            },
            "measurable_improvements": {
                "overloaded_reduction": before_state["overloaded_count"] - after_overloaded_count,
                "speed_improvement_pct": speed_improvement_pct,
                "travel_time_reduction_pct": travel_time_reduction_pct,
                "traffic_balance_improvement_pct": balance_improvement_pct,
                "redistributed_volume_total_pcu": sum(r["volume_shifted_pcu"] for r in flow_redistributions)
            },
            "flow_redistributions": flow_redistributions
        }

simulation_engine_instance = TrafficDistributionEngine()
