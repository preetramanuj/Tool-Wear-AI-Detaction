import pytest
import pandas as pd
import numpy as np
from ai.health_prediction.feature_engineering.build_features import load_sensor_csv, extract_sensor_features
import tempfile
from pathlib import Path

def test_load_sensor_csv():
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write("0.1,0.2,0.3,0.4,0.5,2022-09-09 13:30:42.492\n")
        f.write("0.2,invalid,0.4,0.5,0.6,2022-09-09 13:30:42.493\n")
        f.write("0.3,0.4,0.5,0.6,0.7,invalid_date\n")
        f.write("0.4,0.5,0.6,0.7,0.8,2022-09-09 13:30:42.495\n")
        temp_path = f.name
        
    df = load_sensor_csv(temp_path)
    Path(temp_path).unlink()
    
    assert len(df) == 2
    assert list(df.columns) == ["Acc", "Acoustic", "Fx", "Fy", "Fz", "time"]
    assert df.iloc[0]["Acc"] == 0.1
    assert pd.api.types.is_datetime64_any_dtype(df["time"])

def test_extract_sensor_features():
    df = pd.DataFrame({
        "Acc": [1.0, 2.0, 3.0, 4.0, 5.0],
        "Acoustic": [1.0, 1.0, 1.0, 1.0, 1.0],
        "Fx": [0.0, 0.0, 0.0, 0.0, 0.0],
        "Fy": [0.0, 0.0, 0.0, 0.0, 0.0],
        "Fz": [0.0, 0.0, 0.0, 0.0, 0.0],
    })
    
    feats = extract_sensor_features(df)
    
    assert "Acc_mean" in feats
    assert feats["Acc_mean"] == 3.0
    assert feats["Acc_min"] == 1.0
    assert feats["Acc_max"] == 5.0
    assert feats["Acc_ptp"] == 4.0
    assert feats["Acc_rms"] == pytest.approx(3.3166, 0.01)
    
    keys = list(feats.keys())
    assert keys == sorted(keys)

def test_empty_df():
    df = pd.DataFrame(columns=["Acc", "Acoustic", "Fx", "Fy", "Fz", "time"])
    feats = extract_sensor_features(df)
    assert len(feats) == 0
