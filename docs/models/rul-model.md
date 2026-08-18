# ToolGuard-AI RUL Model

## 1. Model Overview
- **Model Filename**: `xgb_rul_final.pkl` (and native booster JSON `xgb_rul_final.json`)
- **Model Type**: Gradient Boosted Decision Trees Regression (`XGBRegressor`) with Physical Degradation Transform
- **Purpose**: Predicts instantaneous cutting tool wear progression rate ($\mu\text{m}/\text{cycle}$) and calculates Remaining Useful Life (RUL) in remaining cutting passes/cycles until the end-of-life (EOL) limit of $300\,\mu\text{m}$.
- **Training Source**: MATWI Milling Dataset across all 17 experimental runs (1,537 training records).
- **Prediction Target**: $\log(1 + \text{robust\_causal\_slope})$ where slope is the wear rate ($\mu\text{m}/\text{cycle}$).

---

## 2. Model Location
- **Primary Serialized Artifact**: `models/rul/final/xgb_rul_final.pkl`
- **Native XGBoost JSON**: `models/rul/final/xgb_rul_final.json`
- **Feature Schema Specification**: `models/rul/final/feature_schema.json`
- **Training & Audit Metadata**: `models/rul/final/xgb_rul_final_metadata.json`

---

## 3. Expected Inputs (89 Features)

| Feature | Type | Required | Description | Unit |
| :--- | :--- | :--- | :--- | :--- |
| `cycle_index` | Float | Yes | Current machining cut/cycle index | Index |
| `wear` | Float | Yes | Current measured insert flank wear | $\mu\text{m}$ |
| `prev_wear` | Float | Optional | Previous cycle wear measurement | $\mu\text{m}$ |
| `wear_delta` | Float | Optional | Wear increase from previous cycle ($\Delta \text{wear}$) | $\mu\text{m}$ |
| `rolling_mean_3` | Float | Optional | 3-cycle rolling average wear | $\mu\text{m}$ |
| `rolling_std_3` | Float | Optional | 3-cycle rolling standard deviation | $\mu\text{m}$ |
| `rolling_mean_5` | Float | Optional | 5-cycle rolling average wear | $\mu\text{m}$ |
| `rolling_std_5` | Float | Optional | 5-cycle rolling standard deviation | $\mu\text{m}$ |
| `recent_wear_rate`| Float | Optional | Short-term wear slope ($\Delta \text{wear} / \Delta \text{cycle}$) | $\mu\text{m}/\text{cycle}$ |
| `Vc` | Float | Optional | Cutting speed | $\text{m/min}$ |
| `n` | Float | Optional | Spindle rotational speed | $\text{RPM}$ |
| `fz` | Float | Optional | Feed per tooth | $\text{mm/tooth}$ |
| `Vf` | Float | Optional | Table feed rate | $\text{mm/min}$ |
| `Ae` | Float | Optional | Radial depth of cut / engagement | $\text{mm}$ |
| `Ap` | Float | Optional | Axial depth of cut | $\text{mm}$ |
| `z` | Float | Optional | Number of cutter teeth/flutes | Count |
| `Acc_*` (14 features) | Float | Optional | Vibration acceleration statistics (mean, median, std, var, rms, min, max, ptp, range, skew, kurtosis, crest, shape, energy) | $\text{m/s}^2$ / g |
| `Acoustic_*` (14 features) | Float | Optional | Acoustic Emission telemetry statistics (mean, median, std, var, rms, min, max, ptp, range, skew, kurtosis, crest, shape, energy) | $\text{V} / \text{dB}$ |
| `Fx_*` (14 features) | Float | Optional | Dynamic cutting force along X-axis statistics | $\text{N}$ |
| `Fy_*` (14 features) | Float | Optional | Dynamic cutting force along Y-axis statistics | $\text{N}$ |
| `Fz_*` (14 features) | Float | Optional | Dynamic cutting force along Z-axis statistics | $\text{N}$ |
| `material` | Categorical | Optional | Workpiece material (`'CK45'`, `'RVS304'`) | Category |
| `crop` | Categorical | Optional | Tool visual bounding coordinate cluster | Category |
| `Coating` | Categorical | Optional | Insert surface coating category (`'other'`, `'MISSING_CATEGORY'`) | Category |

---

## 4. Feature Order (Strict 89-Feature Order)

The model expects the exact following ordered list of features:

```text
 1. cycle_index           2. wear                  3. prev_wear             4. wear_delta
 5. rolling_mean_3        6. rolling_std_3         7. rolling_mean_5        8. rolling_std_5
 9. recent_wear_rate     10. Vc                   11. n                    12. fz
13. Vf                   14. Ae                   15. Ap                   16. z
17. Acc_mean             18. Acc_median           19. Acc_std              20. Acc_var
21. Acc_rms              22. Acc_min              23. Acc_max              24. Acc_ptp
25. Acc_range            26. Acc_skew             27. Acc_kurtosis         28. Acc_crest_factor
29. Acc_shape_factor     30. Acc_energy           31. Acoustic_mean        32. Acoustic_median
33. Acoustic_std         34. Acoustic_var         35. Acoustic_rms         36. Acoustic_min
37. Acoustic_max         38. Acoustic_ptp         39. Acoustic_range       40. Acoustic_skew
41. Acoustic_kurtosis    42. Acoustic_crest_factor 43. Acoustic_shape_factor 44. Acoustic_energy
45. Fx_mean              46. Fx_median            47. Fx_std               48. Fx_var
49. Fx_rms               50. Fx_min               51. Fx_max               52. Fx_ptp
53. Fx_range             54. Fx_skew              55. Fx_kurtosis          56. Fx_crest_factor
57. Fx_shape_factor      58. Fx_energy            59. Fy_mean              60. Fy_median
61. Fy_std               62. Fy_var               63. Fy_rms               64. Fy_min
65. Fy_max               66. Fy_ptp               67. Fy_range             68. Fy_skew
69. Fy_kurtosis          70. Fy_crest_factor      71. Fy_shape_factor      72. Fy_energy
73. Fz_mean              74. Fz_median            75. Fz_std               76. Fz_var
77. Fz_rms               78. Fz_min               79. Fz_max               80. Fz_ptp
81. Fz_range             82. Fz_skew              83. Fz_kurtosis          84. Fz_crest_factor
85. Fz_shape_factor      86. Fz_energy            87. material             88. crop
89. Coating
```

---

## 5. Preprocessing & Data Transformations

1. **Categorical Normalization**:
   - `material`: Any occurrences of `'RVS 304'` are normalized to `'RVS304'`.
2. **Categorical Encoding**:
   - Categories are mapped to 0-based integer indices using `cat_mapping`:
     - `material`: `{'CK45': 0, 'RVS304': 1}` (unknown $\to -1$)
     - `crop`: mapped to index $0 \dots 3$ (unknown $\to -1$)
     - `Coating`: `{'MISSING_CATEGORY': 0, 'other': 1}` (unknown $\to -1$)
3. **Missing Value Handling**:
   - XGBoost handles missing numerical inputs natively (`missing=np.nan`). Missing numerical sensor or machining columns are passed as `np.nan`.
4. **Numerical Scaling**:
   - No external scaler (e.g. StandardScaler / MinMaxScaler) is required.
5. **Inverse Target Transformation**:
   - The tree regressor predicts $\hat{y} = \log(1 + \text{rate})$.
   - The wear rate is recovered via:
     $$\text{wear\_rate} = \text{expm1}(\hat{y}) = \exp(\hat{y}) - 1 \quad (\mu\text{m}/\text{cycle})$$

---

## 6. Prediction Usage

```python
import joblib
import pandas as pd
import numpy as np

# Load authoritative package once
package = joblib.load("models/rul/final/xgb_rul_final.pkl")

# Prepare DataFrame with available features
input_df = pd.DataFrame([{
    "wear": 82.5,
    "cycle_index": 14.0,
    "prev_wear": 78.0,
    "wear_delta": 4.5,
    "material": "CK45",
    "Vc": 180.0,
    "fz": 0.15,
}])

# Execute prediction
results = package.predict(input_df)
print(results)
# Output:
# [{'predicted_rul_cycles': 48.3, 'predicted_wear_rate_um_per_cycle': 4.5021, 'current_wear_um': 82.5, 'rul_status': 'VALID'}]
```

---

## 7. Output Interpretation & Unit

- **Output Meaning**: Approximate number of cutting cycles/passes remaining before flank wear reaches $300\,\mu\text{m}$.
- **Output Unit**: **`cycles`** (confirmed from MATWI machining dataset).
- **Physical Formula**:
  $$\text{RUL (cycles)} = \frac{300.0 - \text{current\_wear\_um}}{\text{predicted\_wear\_rate\_um\_per\_cycle}}$$
- **Operational Thresholds**:
  - $\text{RUL} > 50\text{ cycles} \implies$ **HEALTHY / NORMAL**
  - $15 < \text{RUL} \le 50\text{ cycles} \implies$ **WARNING** (Schedule insert index)
  - $\text{RUL} \le 15\text{ cycles} \text{ or } \text{EOL\_REACHED} \implies$ **CRITICAL** (Replace cutting insert)

---

## 8. Realistic Example

**Input**:
- Measured Tool Wear from Model 3: $120.0\,\mu\text{m}$
- Machining Cycle: 25
- Previous Wear: $114.2\,\mu\text{m}$ ($\Delta \text{wear} = 5.8\,\mu\text{m}$)
- Workpiece Material: `CK45`

**Pipeline Execution**:
1. Preprocessor encodes `material = 0`, fills missing sensor channels with `np.nan`.
2. XGBoost outputs $\hat{y} = 1.6864$.
3. Inverse transform: $\text{wear\_rate} = \text{expm1}(1.6864) = 4.40\,\mu\text{m}/\text{cycle}$.
4. Physics RUL:
   $$\text{RUL} = \frac{300.0 - 120.0}{4.40} = 40.9\text{ cycles}$$
5. Interpretation: Approximately **41 cutting cycles** remain before insert replacement is required.

---

## 9. Integration with ToolGuard-AI Pipeline

```text
1. IMAGE CAPTURE
      ↓
2. MODEL 1 (YOLO11n): Localize Cutting Tool Insert Bounding Box
      ↓
3. CROP ROI (384x384 px)
      ↓
4. MODEL 2 (EfficientNet Late Fusion): Measure Flank Wear VB (mm) & Wear Area (mm²)
      ↓
5. MODEL 3 (EfficientNet Image-Only): Predict Continuous Wear (µm) & Health State
      ↓
6. MODEL 6 (XGBoost RUL Engine):
   - Ingests current wear (µm) from Model 3
   - Retrieves historical wear progression for Tool ID from SQLite
   - Predicts wear rate (µm/cycle) and RUL in cycles
      ↓
7. PERSISTENCE & DASHBOARD: Log to SQLite, render live KPI & degradation trajectory
```

---

## 10. Missing Data & Safety Fallbacks

When required RUL features are unavailable during a single-image inspection:
- If `wear` measurement is missing: Returns `predicted_rul_cycles: null` with `rul_status: "UNAVAILABLE_MISSING_WEAR"`.
- If historical wear delta is missing: Derives previous wear and rolling statistics from SQLite database inspection history for that `tool_id`.
- If sensor features are missing: Filled with `np.nan` (handled natively by tree splits in XGBoost).

---

## 11. Limitations

1. Valid for cutting wear up to $300\,\mu\text{m}$. Tools with wear $\ge 300\,\mu\text{m}$ report `0.0 cycles` (`EOL_REACHED`).
2. Calibrated on turning and face milling operations (CK45 steel and RVS304 stainless steel).
3. Assumes standard machining parameters unless overridden by CNC controller telemetry.

---

## 12. Troubleshooting

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| `AttributeError: RULModelPackage` | Package module path mismatch | Ensure `backend/services/rul_service.py` is used as authoritative loader |
| `RUL returns None` | `wear` feature is NaN or not passed | Verify Model 3 successfully predicted `wear_um` |
| `Status: EOL_REACHED` | Wear $\ge 300\,\mu\text{m}$ | Tool has reached physical retirement threshold |
| `Feature schema mismatch` | Column order altered | RULService automatically enforces 89-feature ordering |

---

## 13. Model Version

- **Model Version**: `1.0-FROZEN_FINAL_CANDIDATE`
- **Feature Schema Version**: `1.0`
- **Checksum / Verification**: All 17 MATWI sets verified
