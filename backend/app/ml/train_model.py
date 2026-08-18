import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def train_and_evaluate_models():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "..", "..", "data", "nagpur_traffic_processed.csv")
    models_dir = os.path.join(base_dir, "..", "..", "models_saved")
    os.makedirs(models_dir, exist_ok=True)
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Run prepare_data.py first.")
        
    df = pd.read_csv(data_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df.sort_values(by="timestamp", inplace=True)
    
    # Feature columns
    feature_cols = [
        "speed_limit_kmh", "capacity_pcu_hr", "volume_pcu_hr", 
        "vc_ratio", "hour", "day_of_week", "is_weekend", "is_peak_hour",
        "temperature_c", "rainfall_mm", "visibility_km",
        "has_incident", "incident_severity",
        "lag_volume_1h", "lag_speed_1h", "rolling_avg_speed_3h", "rolling_avg_volume_3h"
    ]
    
    target_col = "congestion_index" # Predict future congestion index (0.0 to 1.0)
    
    X = df[feature_cols].fillna(0)
    y = df[target_col].fillna(0)
    
    # ----------------------------------------------------
    # Chronological Splitting (70% Train, 15% Val, 15% Test)
    # ----------------------------------------------------
    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)
    
    X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
    X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
    X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]
    
    print(f"Data shapes -> Train: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")
    
    # Model 1: Linear Regression Baseline
    print("\n--- Training Linear Regression Baseline ---")
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    y_pred_lr = lr.predict(X_test)
    
    lr_mae = float(mean_absolute_error(y_test, y_pred_lr))
    lr_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_lr)))
    lr_r2 = float(r2_score(y_test, y_pred_lr))
    print(f"Linear Regression -> MAE: {lr_mae:.4f}, RMSE: {lr_rmse:.4f}, R²: {lr_r2:.4f}")
    
    # Model 2: Random Forest
    print("\n--- Training Random Forest Regressor ---")
    rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    
    rf_mae = float(mean_absolute_error(y_test, y_pred_rf))
    rf_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_rf)))
    rf_r2 = float(r2_score(y_test, y_pred_rf))
    print(f"Random Forest -> MAE: {rf_mae:.4f}, RMSE: {rf_rmse:.4f}, R²: {rf_r2:.4f}")
    
    # Model 3: XGBoost Regressor (Primary)
    print("\n--- Training XGBoost Regressor (Primary) ---")
    xgb = XGBRegressor(
        n_estimators=150,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    xgb.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    y_pred_xgb = xgb.predict(X_test)
    
    xgb_mae = float(mean_absolute_error(y_test, y_pred_xgb))
    xgb_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_xgb)))
    xgb_r2 = float(r2_score(y_test, y_pred_xgb))
    print(f"XGBoost -> MAE: {xgb_mae:.4f}, RMSE: {xgb_rmse:.4f}, R²: {xgb_r2:.4f}")
    
    # Comparison & Model Selection
    models_metrics = {
        "Linear Regression": {"mae": round(lr_mae, 4), "rmse": round(lr_rmse, 4), "r2": round(lr_r2, 4)},
        "Random Forest": {"mae": round(rf_mae, 4), "rmse": round(rf_rmse, 4), "r2": round(rf_r2, 4)},
        "XGBoost": {"mae": round(xgb_mae, 4), "rmse": round(xgb_rmse, 4), "r2": round(xgb_r2, 4)}
    }
    
    best_model_name = "XGBoost"
    best_model = xgb
    best_metrics = models_metrics["XGBoost"]
    
    # Feature Importances for XGBoost
    importances = xgb.feature_importances_
    feat_imp = {col: round(float(imp), 4) for col, imp in zip(feature_cols, importances)}
    sorted_feat_imp = dict(sorted(feat_imp.items(), key=lambda x: x[1], reverse=True))
    
    # Save Model Artifact & Metadata
    model_save_path = os.path.join(models_dir, "xgboost_nagpur.joblib")
    joblib.dump({
        "model": best_model,
        "feature_cols": feature_cols,
        "target_col": target_col
    }, model_save_path)
    
    metrics_metadata = {
        "selected_model": best_model_name,
        "best_metrics": best_metrics,
        "all_models_comparison": models_metrics,
        "feature_importances": sorted_feat_imp,
        "training_samples": train_end,
        "test_samples": len(X_test),
        "last_trained_at": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    metrics_save_path = os.path.join(models_dir, "model_metrics.json")
    with open(metrics_save_path, "w") as f:
        json.dump(metrics_metadata, f, indent=2)
        
    print(f"\nSaved best model ({best_model_name}) to {model_save_path}")
    print(f"Saved metrics comparison to {metrics_save_path}")
    return metrics_metadata

if __name__ == "__main__":
    train_and_evaluate_models()
