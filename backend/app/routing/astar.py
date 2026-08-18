import networkx as nx
import numpy as np
import math
from typing import List, Dict, Tuple, Optional
from app.routing.graph_builder import graph_builder_instance, haversine_distance_km
from app.ml.predictor import predictor_instance

class AStarRouteFinder:
    def __init__(self):
        self.builder = graph_builder_instance

    def heuristic(self, u_node: str, target_node: str) -> float:
        """Haversine distance in km as standard admissible A* heuristic"""
        u_data = self.builder.nodes_dict.get(u_node)
        v_data = self.builder.nodes_dict.get(target_node)
        if not u_data or not v_data:
            return 0.0
        return haversine_distance_km(u_data["lat"], u_data["lng"], v_data["lat"], v_data["lng"])

    def calculate_edge_cost(self, u: str, v: str, edge_data: dict, live_traffic_map: dict, incidents_map: dict) -> float:
        seg_id = edge_data["id"]
        dist = edge_data["distance_km"]
        speed_limit = edge_data["speed_limit"]

        # Current traffic metrics (default low if no live report)
        current_traffic = live_traffic_map.get(seg_id, {
            "congestion_index": 0.2,
            "avg_speed_kmh": speed_limit * 0.85
        })
        
        current_congestion = current_traffic.get("congestion_index", 0.2)
        
        # Check active incident on this segment
        incident = incidents_map.get(seg_id)
        incident_penalty = 0.0
        if incident:
            if incident.get("type") in ["Road Closure", "Waterlogging Severe"]:
                return float("inf") # Impassable road segment
            elif incident.get("type") == "Accident":
                incident_penalty = 1.8
            elif incident.get("type") == "Construction":
                incident_penalty = 1.2
            else:
                incident_penalty = 0.8

        # Get ML future prediction
        ml_input = {
            "speed_limit_kmh": speed_limit,
            "capacity_pcu_hr": edge_data["capacity"],
            "volume_pcu_hr": current_traffic.get("volume_pcu_hr", edge_data["capacity"] * 0.6),
            "vc_ratio": current_traffic.get("vc_ratio", 0.6),
            "hour": 18,
            "day_of_week": 1,
            "is_weekend": 0,
            "is_peak_hour": 1,
            "has_incident": 1 if incident else 0,
            "incident_severity": incident.get("severity", 0) if incident else 0
        }
        
        pred = predictor_instance.predict_congestion(ml_input, horizon_minutes=30)
        predicted_congestion = pred.get("predicted_congestion_index", 0.3)

        vc_ratio = current_traffic.get("vc_ratio", current_congestion)
        effective_speed = min(speed_limit, max(5.0, speed_limit * (1.0 - predicted_congestion * 0.75)))
        travel_time_minutes = (dist / effective_speed) * 60.0

        # Multi-factor Traffic-Aware Edge Cost Formula
        # Cost = 0.20 * Distance + 0.30 * TravelTime + 0.25 * Congestion + 0.25 * Utilization + IncidentPenalty
        # Overloaded penalty increases cost when V/C >= 0.75 to divert routes onto underutilized roads
        overload_penalty = 3.5 * (vc_ratio - 0.70) if vc_ratio >= 0.75 else 0.0

        w_dist = 0.20
        w_time = 0.30
        w_traffic = 0.25
        w_capacity = 0.25

        cost = (
            w_dist * dist +
            w_time * travel_time_minutes +
            w_traffic * (current_congestion * 10.0 + predicted_congestion * 10.0) +
            w_capacity * (vc_ratio * 10.0 + overload_penalty * 10.0) +
            incident_penalty * 5.0
        )
        return max(0.1, cost)

    def find_routes(self, start_node_id: str, end_node_id: str, live_traffic_map: dict = None, incidents_map: dict = None) -> dict:
        live_traffic_map = live_traffic_map or {}
        incidents_map = incidents_map or {}

        graph = self.builder.graph
        if start_node_id not in graph or end_node_id not in graph:
            return {"error": "Invalid start or destination node ID"}

        # Custom weight function for NetworkX A* algorithm
        def weight_fn(u, v, d):
            return self.calculate_edge_cost(u, v, d, live_traffic_map, incidents_map)

        # Run primary A* Search
        primary_path = None
        routing_algo_used = "A* Algorithm"
        try:
            primary_path = nx.astar_path(
                graph,
                start_node_id,
                end_node_id,
                heuristic=lambda u, v: self.heuristic(u, end_node_id) / 60.0, # Scaled heuristic
                weight=weight_fn
            )
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            # Fallback to Dijkstra algorithm if A* path obstructed
            routing_algo_used = "Dijkstra Fallback"
            try:
                primary_path = nx.dijkstra_path(graph, start_node_id, end_node_id, weight=weight_fn)
            except Exception:
                primary_path = None

        if not primary_path:
            return {"error": "No viable route found due to severe road closures or disconnected graph"}

        # Construct Alternative Routes by penalizing primary path edges
        alt_graph = graph.copy()
        for i in range(len(primary_path) - 1):
            u, v = primary_path[i], primary_path[i+1]
            if alt_graph.has_edge(u, v):
                alt_graph[u][v]["distance_km"] *= 1.8 # Add penalty to primary route to find alternative corridor

        alt_path = None
        try:
            alt_path = nx.astar_path(
                alt_graph,
                start_node_id,
                end_node_id,
                heuristic=lambda u, v: self.heuristic(u, end_node_id) / 60.0,
                weight=weight_fn
            )
        except Exception:
            alt_path = None

        primary_result = self._format_route_details(primary_path, "Recommended (Best Route)", routing_algo_used, live_traffic_map, incidents_map)
        
        alt_routes = []
        if alt_path and alt_path != primary_path:
            alt_result = self._format_route_details(alt_path, "Alternative Corridor (via Bypass)", "A* Alternative", live_traffic_map, incidents_map)
            alt_routes.append(alt_result)

        return {
            "recommended_route": primary_result,
            "alternative_routes": alt_routes,
            "algorithm_used": routing_algo_used,
            "timestamp": "2026-08-17 20:00:00"
        }

    def _format_route_details(self, path: List[str], label: str, algo: str, live_traffic_map: dict, incidents_map: dict) -> dict:
        nodes_list = []
        polyline_coords = []
        total_distance = 0.0
        total_eta_min = 0.0
        congestion_indices = []
        segment_details = []
        directions = []

        graph = self.builder.graph
        for i in range(len(path)):
            node_id = path[i]
            node_info = self.builder.nodes_dict[node_id]
            nodes_list.append(node_info)

            if i < len(path) - 1:
                next_node_id = path[i+1]
                edge = graph[node_id][next_node_id]
                seg_id = edge["id"]
                dist = edge["distance_km"]
                total_distance += dist

                # Append detailed segment geometry points to route polyline
                edge_geom = edge.get("geometry_points", [])
                if edge_geom:
                    for pt in edge_geom:
                        if not polyline_coords or polyline_coords[-1] != pt:
                            polyline_coords.append(pt)
                else:
                    if not polyline_coords:
                        polyline_coords.append([node_info["lat"], node_info["lng"]])
                    next_node_info = self.builder.nodes_dict[next_node_id]
                    polyline_coords.append([next_node_info["lat"], next_node_info["lng"]])

                traffic = live_traffic_map.get(seg_id, {"congestion_index": 0.25, "avg_speed_kmh": edge["speed_limit"] * 0.8})
                c_idx = traffic.get("congestion_index", 0.25)
                congestion_indices.append(c_idx)

                speed = max(10.0, traffic.get("avg_speed_kmh", 40.0))
                eta_seg = (dist / speed) * 60.0
                total_eta_min += eta_seg

                next_node_name = self.builder.nodes_dict[next_node_id]["name"]
                directions.append(f"Drive {dist:.1f} km along {edge['name']} towards {next_node_name}")
                
                segment_details.append({
                    "segment_id": seg_id,
                    "name": edge["name"],
                    "corridor": edge["corridor"],
                    "distance_km": dist,
                    "speed_kmh": speed,
                    "congestion_index": c_idx,
                    "incident": incidents_map.get(seg_id)
                })

        avg_congestion = float(np.mean(congestion_indices)) if congestion_indices else 0.2
        if avg_congestion < 0.35:
            overall_congestion_level = "LOW"
        elif avg_congestion < 0.60:
            overall_congestion_level = "MODERATE"
        elif avg_congestion < 0.80:
            overall_congestion_level = "HIGH"
        else:
            overall_congestion_level = "SEVERE"

        # Route score (100 = best)
        route_score = int(max(20, round(100 - (avg_congestion * 45) - (total_eta_min * 1.2))))

        reason = f"Fastest traffic-optimized path ({algo}). Avoids high-density bottleneck points."
        if any(s.get("incident") for s in segment_details):
            reason += " Active caution: mild incident along segment."

        return {
            "label": label,
            "distance_km": round(total_distance, 2),
            "eta_minutes": round(total_eta_min, 1),
            "route_score": route_score,
            "overall_congestion": overall_congestion_level,
            "avg_congestion_index": round(avg_congestion, 3),
            "reason": reason,
            "path_nodes": path,
            "nodes_info": nodes_list,
            "polyline": polyline_coords,
            "turn_by_turn": directions,
            "segments": segment_details
        }

astar_router_instance = AStarRouteFinder()
