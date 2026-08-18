import json
import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_and_preprocess_nagpur_dataset():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    
    road_network_path = os.path.join(data_dir, "nagpur_road_network.json")
    with open(road_network_path, "r") as f:
        road_network = json.load(f)
        
    segments = road_network["segments"]
    
    # 30 days of hourly traffic data for Nagpur segments
    start_date = datetime(2026, 7, 1, 0, 0)
    num_days = 45
    hours_per_day = 24
    
    rows = []
    random.seed(42)
    np.random.seed(42)
    
    weather_conditions = ["Clear", "Cloudy", "Light Rain", "Heavy Rain", "Haze/Fog"]
    weather_weights = [0.65, 0.20, 0.08, 0.04, 0.03]
    
    for day in range(num_days):
        current_day = start_date + timedelta(days=day)
        day_of_week = current_day.weekday() # 0 = Mon, 6 = Sun
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Weather per day / hour
        daily_temp = random.uniform(26.0, 38.0)
        daily_weather = random.choices(weather_conditions, weights=weather_weights)[0]
        rainfall_mm = 0.0
        if daily_weather == "Light Rain":
            rainfall_mm = random.uniform(1.0, 10.0)
        elif daily_weather == "Heavy Rain":
            rainfall_mm = random.uniform(15.0, 50.0)
            
        visibility_km = 10.0 if daily_weather not in ["Heavy Rain", "Haze/Fog"] else random.uniform(2.0, 5.0)
        
        for hour in range(hours_per_day):
            timestamp = current_day + timedelta(hours=hour)
            is_peak_hour = 1 if (8 <= hour <= 11 or 17 <= hour <= 20) and not is_weekend else 0
            
            for seg in segments:
                seg_id = seg["id"]
                capacity = seg["capacity_pcu_hr"]
                speed_limit = seg["speed_limit_kmh"]
                
                # Base volume profile depending on corridor & peak hours
                base_ratio = 0.25 # Off-peak base
                
                if 8 <= hour <= 11: # Morning rush
                    base_ratio = 0.82 if not is_weekend else 0.45
                elif 17 <= hour <= 20: # Evening rush
                    base_ratio = 0.90 if not is_weekend else 0.55
                elif 12 <= hour <= 16: # Midday
                    base_ratio = 0.50 if not is_weekend else 0.60
                elif 21 <= hour <= 23: # Late evening
                    base_ratio = 0.35
                else: # Night
                    base_ratio = 0.12
                    
                # Corridor multiplier
                if seg["corridor"] == "Wardha Road":
                    corridor_mult = 1.15
                elif seg["corridor"] == "Central Avenue":
                    corridor_mult = 1.10
                elif seg["corridor"] == "Kamptee Road":
                    corridor_mult = 1.05
                else:
                    corridor_mult = 0.95
                    
                # Incident probability
                has_incident = 1 if random.random() < 0.03 else 0
                incident_severity = 0
                if has_incident:
                    incident_severity = random.choice([1, 2, 3]) # 1: low, 2: med, 3: severe road blockage
                    
                # Volume PCU (Passenger Car Unit) per hour
                noise = random.uniform(-0.08, 0.08)
                v_ratio = min(1.35, max(0.05, base_ratio * corridor_mult + noise + (0.15 if has_incident else 0)))
                
                volume_pcu = int(capacity * v_ratio)
                
                # Speed modeling based on Volume/Capacity ratio & incidents
                vc_ratio = volume_pcu / capacity
                weather_speed_penalty = 0.0
                if daily_weather == "Heavy Rain":
                    weather_speed_penalty = 0.25
                elif daily_weather == "Light Rain":
                    weather_speed_penalty = 0.10
                    
                incident_speed_penalty = incident_severity * 0.20
                
                # BPR (Bureau of Public Roads) speed equation adaptation
                speed_factor = 1.0 / (1.0 + 0.15 * (vc_ratio ** 3))
                speed_factor = max(0.12, speed_factor - weather_speed_penalty - incident_speed_penalty)
                
                avg_speed = float(round(speed_limit * speed_factor, 1))
                
                # Congestion level index (0 to 1)
                congestion_index = float(round(min(1.0, max(0.0, 1.0 - (avg_speed / speed_limit) + 0.1 * vc_ratio)), 3))
                
                rows.append({
                    "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    "segment_id": seg_id,
                    "segment_name": seg["name"],
                    "corridor": seg["corridor"],
                    "distance_km": seg["distance_km"],
                    "speed_limit_kmh": speed_limit,
                    "capacity_pcu_hr": capacity,
                    "volume_pcu_hr": volume_pcu,
                    "avg_speed_kmh": avg_speed,
                    "vc_ratio": round(vc_ratio, 3),
                    "congestion_index": congestion_index,
                    "hour": hour,
                    "day_of_week": day_of_week,
                    "is_weekend": is_weekend,
                    "is_peak_hour": is_peak_hour,
                    "temperature_c": round(daily_temp, 1),
                    "rainfall_mm": round(rainfall_mm, 1),
                    "visibility_km": round(visibility_km, 1),
                    "weather_condition": daily_weather,
                    "has_incident": has_incident,
                    "incident_severity": incident_severity
                })
                
    df = pd.DataFrame(rows)
    
    # ----------------------------------------------------
    # PREPROCESSING & FEATURE ENGINEERING
    # ----------------------------------------------------
    print(f"Initial raw records generated: {len(df)}")
    
    # 1. Missing Value Handling
    df.fillna({
        "volume_pcu_hr": df["volume_pcu_hr"].median(),
        "avg_speed_kmh": df["avg_speed_kmh"].median(),
        "rainfall_mm": 0.0,
        "temperature_c": 30.0,
        "visibility_km": 10.0,
        "has_incident": 0,
        "incident_severity": 0
    }, inplace=True)
    
    # 2. Duplicate Removal
    df.drop_duplicates(subset=["timestamp", "segment_id"], inplace=True)
    
    # 3. Outlier Handling (Speed cannot exceed 1.2 * speed_limit or be < 2 km/h)
    df["avg_speed_kmh"] = df.apply(lambda row: min(row["speed_limit_kmh"] * 1.15, max(2.0, row["avg_speed_kmh"])), axis=1)
    df["volume_pcu_hr"] = df["volume_pcu_hr"].clip(lower=10, upper=df["capacity_pcu_hr"] * 1.5)
    
    # 4. Feature Engineering
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df.sort_values(by=["segment_id", "timestamp"], inplace=True)
    
    # Historical rolling traffic features (lag 1 hour, lag 2 hours, 3-hour rolling mean)
    df["lag_volume_1h"] = df.groupby("segment_id")["volume_pcu_hr"].shift(1)
    df["lag_speed_1h"] = df.groupby("segment_id")["avg_speed_kmh"].shift(1)
    df["rolling_avg_speed_3h"] = df.groupby("segment_id")["avg_speed_kmh"].transform(lambda x: x.rolling(3, min_periods=1).mean())
    df["rolling_avg_volume_3h"] = df.groupby("segment_id")["volume_pcu_hr"].transform(lambda x: x.rolling(3, min_periods=1).mean())
    
    # Fill remaining initial NaNs from lag features
    df["lag_volume_1h"] = df["lag_volume_1h"].fillna(df["volume_pcu_hr"])
    df["lag_speed_1h"] = df["lag_speed_1h"].fillna(df["avg_speed_kmh"])
    df["rolling_avg_speed_3h"] = df["rolling_avg_speed_3h"].fillna(df["avg_speed_kmh"])
    df["rolling_avg_volume_3h"] = df["rolling_avg_volume_3h"].fillna(df["volume_pcu_hr"])
    df = df.fillna(0)
    
    # Target Congestion Category: 0: LOW, 1: MODERATE, 2: HIGH, 3: SEVERE
    def classify_congestion(index):
        if index < 0.35:
            return "LOW"
        elif index < 0.60:
            return "MODERATE"
        elif index < 0.80:
            return "HIGH"
        else:
            return "SEVERE"
            
    df["congestion_level"] = df["congestion_index"].apply(classify_congestion)
    
    output_path = os.path.join(data_dir, "nagpur_traffic_processed.csv")
    df.to_csv(output_path, index=False)
    print(f"Processed dataset saved to {output_path} with {len(df)} rows.")
    return output_path

if __name__ == "__main__":
    generate_and_preprocess_nagpur_dataset()
