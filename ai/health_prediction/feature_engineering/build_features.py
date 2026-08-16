import pandas as pd
import numpy as np
from pathlib import Path
from scipy.stats import skew, kurtosis
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

SENSOR_COLUMNS = ["Acc", "Acoustic", "Fx", "Fy", "Fz", "time"]

def load_sensor_csv(filepath):
    """
    Loads a MATWI sensor CSV.
    The CSV is headerless. It has 6 columns: Acc, Acoustic, Fx, Fy, Fz, time.
    """
    try:
        df = pd.read_csv(filepath, header=None, names=SENSOR_COLUMNS)
        
        # Validate data
        # Handle invalid numeric values by coercing to NaN and dropping
        for col in SENSOR_COLUMNS[:-1]:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
        # Drop rows where sensor data is NaN
        df = df.dropna(subset=SENSOR_COLUMNS[:-1])
        
        # Parse timestamp
        df['time'] = pd.to_datetime(df['time'], errors='coerce')
        df = df.dropna(subset=['time'])
        
        return df
    except Exception as e:
        logging.error(f"Error loading sensor file {filepath}: {e}")
        return None

def extract_sensor_features(df):
    """
    Extracts time-domain features from the sensor dataframe.
    Features: mean, std, RMS, variance, min, max, peak-to-peak, skewness, kurtosis
    Returns a deterministic feature dictionary.
    """
    features = {}
    if df is None or df.empty:
        return features

    channels = ["Acc", "Acoustic", "Fx", "Fy", "Fz"]
    for ch in channels:
        data = df[ch].values
        
        if len(data) == 0:
            continue
            
        features[f"{ch}_mean"] = np.mean(data)
        features[f"{ch}_std"] = np.std(data, ddof=1) if len(data) > 1 else 0.0
        features[f"{ch}_rms"] = np.sqrt(np.mean(data**2))
        features[f"{ch}_variance"] = np.var(data, ddof=1) if len(data) > 1 else 0.0
        features[f"{ch}_min"] = np.min(data)
        features[f"{ch}_max"] = np.max(data)
        features[f"{ch}_ptp"] = features[f"{ch}_max"] - features[f"{ch}_min"]
        
        features[f"{ch}_skewness"] = float(skew(data, nan_policy='omit'))
        features[f"{ch}_kurtosis"] = float(kurtosis(data, nan_policy='omit'))
        
    # Sort keys for deterministic output
    return {k: features[k] for k in sorted(features.keys())}

def process_single_sensor_file(filepath):
    """
    End-to-end function for a single sensor file.
    """
    df = load_sensor_csv(filepath)
    return extract_sensor_features(df)

def build_set_feature_table(set_id, data_dir="data"):
    """
    Builds the Set-level feature table by joining:
    - sensor features
    - labels.csv metadata
    - wear target
    - optional sets.csv cutting parameters
    """
    data_dir = Path(data_dir)
    labels_path = data_dir / "raw" / "MATWI" / "labels.csv"
    sets_path = data_dir / "raw" / "MATWI" / "sets.csv"
    
    labels_df = pd.read_csv(labels_path)
    set_labels = labels_df[labels_df["Set"] == set_id].copy()
    
    sets_df = pd.read_csv(sets_path)
    sets_df.rename(columns={sets_df.columns[0]: "SetName"}, inplace=True)
    cutting_params = sets_df[sets_df["SetName"] == f"Set {set_id}"]
    
    if not cutting_params.empty:
        param_dict = cutting_params.iloc[0].drop("SetName").to_dict()
    else:
        param_dict = {}
        
    features_list = []
    
    # Try different possible extraction paths
    sensor_dir = data_dir / "extracted" / "MATWI" / f"Set{set_id}" / f"Set{set_id}" / "sensordata"
    if not sensor_dir.exists():
        sensor_dir = data_dir / "extracted" / "MATWI" / f"Set{set_id}" / "sensordata"
    
    skipped_sensor_missing = 0
    missing_wear_count = 0
    valid_rows = 0
    
    for _, row in set_labels.iterrows():
        if pd.isna(row["wear"]):
            missing_wear_count += 1
            
        sensor_name = str(row["SensorName"]) if pd.notna(row["SensorName"]) else ""
        if not sensor_name:
            skipped_sensor_missing += 1
            continue
            
        sensor_file = sensor_dir / sensor_name
        if not sensor_file.exists():
            skipped_sensor_missing += 1
            continue
            
        feats = process_single_sensor_file(sensor_file)
        if not feats:
            skipped_sensor_missing += 1
            continue
            
        # Combine
        combined = {
            "ImageName": row.get("ImageName"),
            "SensorName": row.get("SensorName"),
            "Set": row.get("Set"),
            "wear": row.get("wear"),
            "type": row.get("type"),
        }
        
        # Add optional cutting parameters
        for k, v in param_dict.items():
            combined[k] = v
            
        # Add sensor features
        combined.update(feats)
        
        features_list.append(combined)
        valid_rows += 1
        
    final_df = pd.DataFrame(features_list)
    
    base_cols = ["ImageName", "SensorName", "Set", "wear", "type"]
    gen_feats = [c for c in final_df.columns if c not in base_cols and c not in param_dict]
    
    report = {
        "input_measurements": len(set_labels),
        "valid_wear_targets": len(set_labels) - missing_wear_count,
        "missing_wear": missing_wear_count,
        "missing_sensor_files_skipped": skipped_sensor_missing,
        "successfully_processed": valid_rows,
        "generated_features_count": len(gen_feats),
        "feature_names": gen_feats,
        "rows_generated": valid_rows
    }
    
    return final_df, report
