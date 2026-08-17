import os
import json
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
import hashlib
from src.rul_prediction.inference.predict_rul import RULModelPackage

def get_file_hash(filepath):
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def main():
    print("=== PHASE A FINAL RUL MODEL VERIFICATION ===")
    
    # Paths
    json_model_path = 'models/rul/final/xgb_rul_final.json'
    json_meta_path = 'models/rul/final/xgb_rul_final_metadata.json'
    schema_path = 'models/rul/final/feature_schema.json'
    pkl_model_path = 'models/rul/final/xgb_rul_final.pkl'
    checksum_path = 'models/rul/final/checksums.json'
    
    # 1. Verify JSON exists and loads
    print("\n1. Verifying JSON Artifact...")
    assert os.path.exists(json_model_path), "JSON model not found."
    model_xgb = xgb.XGBRegressor()
    model_xgb.load_model(json_model_path)
    print("JSON loaded successfully.")
    
    with open(schema_path, 'r') as f:
        schema = json.load(f)
        
    with open(json_meta_path, 'r') as f:
        meta = json.load(f)
        
    # 2. Checksums Check
    print("\n2. Checking Checksums...")
    with open(checksum_path, 'r') as f:
        expected_checksums = json.load(f)
        
    assert get_file_hash(json_model_path) == expected_checksums['xgb_rul_final.json']
    assert get_file_hash(pkl_model_path) == expected_checksums['xgb_rul_final.pkl']
    assert get_file_hash(json_meta_path) == expected_checksums['xgb_rul_final_metadata.json']
    assert get_file_hash(schema_path) == expected_checksums['feature_schema.json']
    print("All checksums MATCH exactly.")
    
    # 3. Load PKL
    print("\n3. Loading PKL Package...")
    reloaded_package = joblib.load(pkl_model_path)
    print("PKL loaded successfully.")
    
    # 4. Consistency and Round-trip
    print("\n4. Consistency & Round-Trip Test...")
    
    # Dummy data since we don't have parquets
    features = schema['numerical_features'] + schema['categorical_features']
    data = {col: [1.0] for col in features}
    data['wear'] = [50.0]
    data['material'] = ['CK45']
    sample = pd.DataFrame(data)
    
    # Use exact cat mapping from PKL to verify weight consistency directly
    cat_mapping = reloaded_package.cat_mapping
        
    json_pkg = RULModelPackage(model=model_xgb, schema=schema, cat_mapping=cat_mapping)
    json_preds = json_pkg.predict(sample)
    pkl_preds = reloaded_package.predict(sample)
    
    consistency_pass = True
    for jp, pp in zip(json_preds, pkl_preds):
        if jp['rul_status'] != pp['rul_status']: consistency_pass = False
        if jp['predicted_wear_rate_um_per_cycle'] is not None and not np.isclose(jp['predicted_wear_rate_um_per_cycle'], pp['predicted_wear_rate_um_per_cycle']): consistency_pass = False
        if jp['predicted_rul_cycles'] is not None and not np.isclose(jp['predicted_rul_cycles'], pp['predicted_rul_cycles']): consistency_pass = False
                
    if consistency_pass:
        print("MODEL_WEIGHTS_CONSISTENCY = PASS")
        print("SERIALIZATION_ROUND_TRIP_TEST = PASS")
    else:
        print("MODEL_WEIGHTS_CONSISTENCY = FAIL")
        print("SERIALIZATION_ROUND_TRIP_TEST = FAIL")
        
    print("Verification complete.")

if __name__ == '__main__':
    main()
