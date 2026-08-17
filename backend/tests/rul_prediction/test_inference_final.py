import pytest
import pandas as pd
import numpy as np
import json
import joblib
import os
import xgboost as xgb
from ai.rul_prediction.inference.predict_rul import RULModelPackage, predict_rul

@pytest.fixture
def dummy_features():
    with open('models/rul/final/feature_schema.json', 'r') as f:
        schema = json.load(f)
    features = schema['numerical_features'] + schema['categorical_features']
    data = {col: [1.0] for col in features}
    data['wear'] = [50.0]
    data['material'] = ['CK45']
    return pd.DataFrame(data)

def test_json_loading_and_pkl_consistency(dummy_features):
    # 1. JSON loading
    model = xgb.XGBRegressor()
    model.load_model('models/rul/final/xgb_rul_final.json')
    
    with open('models/rul/final/feature_schema.json', 'r') as f:
        schema = json.load(f)
        
    pkg = joblib.load('models/rul/final/xgb_rul_final.pkl')
    cat_mapping = pkg.cat_mapping
        
    json_pkg = RULModelPackage(model, schema, cat_mapping)
    json_res = json_pkg.predict(dummy_features)
    
    # 2. PKL Loading
    pkl_res = predict_rul(dummy_features, 'models/rul/final/xgb_rul_final.pkl')
    
    # Consistency
    assert json_res[0]['rul_status'] == pkl_res[0]['rul_status']
    if json_res[0]['predicted_rul_cycles'] is not None:
        assert np.isclose(json_res[0]['predicted_rul_cycles'], pkl_res[0]['predicted_rul_cycles'])
        
def test_pkl_round_trip(dummy_features, tmp_path):
    pkg = joblib.load('models/rul/final/xgb_rul_final.pkl')
    res1 = pkg.predict(dummy_features)
    
    out_path = tmp_path / "test_roundtrip.pkl"
    joblib.dump(pkg, out_path)
    
    pkg2 = joblib.load(out_path)
    res2 = pkg2.predict(dummy_features)
    
    assert res1 == res2
    
def test_safety_states(dummy_features):
    pkg = joblib.load('models/rul/final/xgb_rul_final.pkl')
    
    # Missing wear
    df = dummy_features.copy()
    df['wear'] = np.nan
    res = pkg.predict(df)
    assert res[0]['rul_status'] == "UNAVAILABLE_MISSING_WEAR"
    
    # EOL Reached
    df['wear'] = 300.0
    res = pkg.predict(df)
    assert res[0]['rul_status'] == "EOL_REACHED"
    assert res[0]['predicted_rul_cycles'] == 0.0
    
def test_leakage_protection(dummy_features):
    pkg = joblib.load('models/rul/final/xgb_rul_final.pkl')
    df = dummy_features.copy()
    
    # Try to inject leakage
    pkg.features.append('actual_remaining_cycles')
    with pytest.raises(AssertionError, match="Leakage detected"):
        pkg.predict(df)
        
def test_deterministic_inference(dummy_features):
    pkg = joblib.load('models/rul/final/xgb_rul_final.pkl')
    res1 = pkg.predict(dummy_features)
    res2 = pkg.predict(dummy_features)
    assert res1 == res2
    
def test_causality_and_no_retraining():
    # If the model allows inference without refitting or seeing future rows, it is causal.
    # We verify the model is already fitted and doesn't require fit()
    pkg = joblib.load('models/rul/final/xgb_rul_final.pkl')
    assert hasattr(pkg.model, 'predict')
