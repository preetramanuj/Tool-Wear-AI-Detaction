import joblib
pkg = joblib.load('models/rul/final/xgb_rul_final.pkl')
print(pkg.cat_mapping)
