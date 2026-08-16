# RUL Prediction

## Model Architecture
The RUL model uses an XGBoost regressor predicting the causal wear rate (robust causal slope).
The physics logic determines the Remaining Useful Life (RUL) using the formula:
RUL = (300 - current_wear) / predicted_wear_rate

## Final Model Status
The model is frozen and verified on 17 sets (Phase 17 output). Do not retrain or overwrite the final model weights.

## Artifact Locations
- models/rul/final/xgb_rul_final.pkl: Authoritative PKL containing XGBoost model, schema, preprocessing logic, and physical calculations.
- models/rul/final/xgb_rul_final.json: Native model weights.
- models/rul/final/feature_schema.json: Input feature requirements.

## PKL vs JSON Explanation
The joblib PKL encapsulates the exact Python class RULModelPackage containing the XGBoost estimator and the exact pre-processing workflow. The JSON contains purely the XGBoost regression tree weights. Both yield exact consistent predictions.

## Feature Schema
Expects an 89-feature schema matching exactly models/rul/final/feature_schema.json.

## Preprocessing & Target Transformation
Categoricals are encoded natively (e.g. RVS 304 -> RVS304).
The target obust_causal_slope uses a Log1p_Positive transformation, reversed using an expm1 inverse transform within the model class.

## Physics RUL Equation
RUL = max(0.0, (300.0 - current_wear) / predicted_wear_rate)

## Safety States
1. VALID: Valid RUL prediction.
2. UNAVAILABLE_MISSING_WEAR: Missing wear baseline.
3. EOL_REACHED: Wear exceeds 300 um.
4. UNRELIABLE_NON_POSITIVE_WEAR_RATE: Negative or zero wear rate.
5. UNRELIABLE_NEAR_ZERO_WEAR_RATE: Wear rate less than 0.1 um/cycle.

## Model Limitations
- Strict causal limitation. Cannot look at future labels.
- Needs minimum reliable wear rate of 0.1 um/cycle to avoid division by near-zero.
- The 66.98-cycle MAE benchmark is a historical test benchmark (Phase 14), not the final performance metrics on the 17-set retrained model.

## Exact Inference Contract
The joblib.load() resolves src.rul_prediction.inference.predict_rul.RULModelPackage.

## Current Integration Limitation
Runtime integration requires a future RUL data/API contract providing the complete 89-feature input schema.
