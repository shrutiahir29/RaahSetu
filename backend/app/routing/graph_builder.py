import json
import os
import math
import networkx as nx

def haversine_distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0 # Radius of earth in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class NagpurGraphBuilder:
    def __init__(self):
        base_dir = os.path.dirname(__file__)
        self.network_file = os.path.join(base_dir, "..", "..", "data", "nagpur_road_network.json")
        self.nodes_dict = {}
        self.segments_dict = {}
        self.graph = nx.DiGraph()
        self.load_network()

    def load_network(self):
        with open(self.network_file, "r") as f:
            data = json.load(f)

        for n in data["nodes"]:
            self.nodes_dict[n["id"]] = n
            self.graph.add_node(n["id"], name=n["name"], lat=n["lat"], lng=n["lng"], type=n["type"])

        for seg in data["segments"]:
            self.segments_dict[seg["id"]] = seg
            # Bidirectional graph edges for Nagpur roads
            self._add_edge(seg, seg["start_node"], seg["end_node"])
            self._add_edge(seg, seg["end_node"], seg["start_node"])

    def _add_edge(self, seg, start, end):
        # Reverse geometry points if edge is added in reverse direction
        geom = seg.get("geometry_points", [])
        if start != seg["start_node"]:
            geom = list(reversed(geom))

        self.graph.add_edge(
            start, end,
            id=seg["id"],
            name=seg["name"],
            corridor=seg["corridor"],
            distance_km=seg["distance_km"],
            speed_limit=seg["speed_limit_kmh"],
            capacity=seg["capacity_pcu_hr"],
            geometry_points=geom
        )

    def find_nearest_node(self, lat: float, lng: float) -> str:
        best_node = None
        min_dist = float("inf")
        for node_id, n in self.nodes_dict.items():
            dist = haversine_distance_km(lat, lng, n["lat"], n["lng"])
            if dist < min_dist:
                min_dist = dist
                best_node = node_id
        return best_node or "node_sitabuldi"

graph_builder_instance = NagpurGraphBuilder()
