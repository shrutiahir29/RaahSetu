from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # Admin, Citizen, TrafficPolice

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"), default=2)
    created_at = Column(DateTime, default=datetime.utcnow)

class Road(Base):
    __tablename__ = "roads"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    corridor = Column(String)
    city = Column(String, default="Nagpur")

class RoadSegment(Base):
    __tablename__ = "road_segments"
    id = Column(String, primary_key=True, index=True)
    road_id = Column(String, ForeignKey("roads.id"), nullable=True)
    name = Column(String)
    start_node = Column(String)
    end_node = Column(String)
    distance_km = Column(Float)
    speed_limit_kmh = Column(Float)
    capacity_pcu_hr = Column(Integer)

class TrafficData(Base):
    __tablename__ = "traffic_data"
    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(String, ForeignKey("road_segments.id"), index=True)
    volume_pcu_hr = Column(Integer)
    avg_speed_kmh = Column(Float)
    congestion_index = Column(Float)
    recorded_at = Column(DateTime, default=datetime.utcnow)

class WeatherData(Base):
    __tablename__ = "weather_data"
    id = Column(Integer, primary_key=True, index=True)
    city = Column(String, default="Nagpur")
    temperature_c = Column(Float)
    humidity_pct = Column(Float)
    rainfall_mm = Column(Float)
    visibility_km = Column(Float)
    condition = Column(String)
    wind_speed_kmh = Column(Float)
    recorded_at = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(String, ForeignKey("road_segments.id"), index=True)
    title = Column(String)
    type = Column(String) # Accident, Road Closure, Construction, Waterlogging, Event, Vehicle Breakdown
    severity = Column(Integer) # 1: Low, 2: Moderate, 3: Severe
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TrafficPrediction(Base):
    __tablename__ = "traffic_predictions"
    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(String, ForeignKey("road_segments.id"), index=True)
    horizon_minutes = Column(Integer)
    predicted_congestion_index = Column(Float)
    predicted_level = Column(String)
    predicted_speed_kmh = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class Route(Base):
    __tablename__ = "routes"
    id = Column(Integer, primary_key=True, index=True)
    from_name = Column(String)
    to_name = Column(String)
    start_lat = Column(Float)
    start_lng = Column(Float)
    end_lat = Column(Float)
    end_lng = Column(Float)

class RouteResult(Base):
    __tablename__ = "route_results"
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"))
    total_distance_km = Column(Float)
    eta_minutes = Column(Float)
    congestion_level = Column(String)
    route_score = Column(Integer)
    algorithm_used = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    message = Column(Text)
    alert_type = Column(String) # Warning, Info, Emergency
    segment_id = Column(String, ForeignKey("road_segments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserAlert(Base):
    __tablename__ = "user_alerts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    is_read = Column(Boolean, default=False)

class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String)
    category = Column(String) # Route Accuracy, Traffic Alert, UI Experience
    comment = Column(Text)
    rating = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class SearchHistory(Base):
    __tablename__ = "search_history"
    id = Column(Integer, primary_key=True, index=True)
    from_location = Column(String)
    to_location = Column(String)
    distance_km = Column(Float)
    eta_minutes = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String)
    version = Column(String)
    mae = Column(Float)
    rmse = Column(Float)
    r2_score = Column(Float)
    trained_at = Column(DateTime, default=datetime.utcnow)

class TrafficSimulation(Base):
    __tablename__ = "traffic_simulations"
    id = Column(Integer, primary_key=True, index=True)
    peak_window = Column(String) # Morning (9 AM - 12 PM), Evening (4 PM - 7 PM)
    target_hour = Column(Integer)
    strategy_used = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class SimulationResult(Base):
    __tablename__ = "simulation_results"
    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("traffic_simulations.id"))
    overloaded_before = Column(Integer)
    overloaded_after = Column(Integer)
    underutilized_before = Column(Integer)
    underutilized_after = Column(Integer)
    avg_speed_before_kmh = Column(Float)
    avg_speed_after_kmh = Column(Float)
    travel_time_reduction_pct = Column(Float)
    balance_improvement_pct = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
