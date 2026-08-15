# ToolGuard-AI — Final Wear Magnitude Calibration Study

**Module:** Wear Analysis only

**Status:** Calibration study completed

**Generated:** 2026-08-15 07:48:52

---

## 1. Scope

This study covers ONLY the Wear Analysis module of ToolGuard-AI.

The following were NOT trained or modified:

- Tool Detection
- Face Detection
- YOLO

The objective was to determine whether post-hoc calibration can improve absolute wear estimation while preserving the strong wear trend of the finalized model.

## 2. Final Wear Analysis Architecture

| Component | Configuration |
|---|---|
| Architecture | Late Fusion |
| Image branch | EfficientNet-B0 |
| Sensor branch | Sensor RMS features + MLP |
| ROI | 2000 px center crop |
| Input resolution | 384 × 384 |
| Sensor normalization | StandardScaler fitted on TRAIN only |
| Target | S2 RMS |

## 3. Dataset

| Split | Samples |
|---|---:|
| Train | 64 |
| Validation | 14 |
| Test | 14 |
| **Total** | **92** |

The TEST split was not used to fit calibration parameters.

## 4. Pre-Calibration Model Verification

The finalized 384 × 384 model was loaded using the verified preprocessing pipeline.

### TEST Performance

| Metric | Raw Model |
|---|---:|
| MAE | 0.504549 |
| RMSE | 0.518973 |
| R² | -0.768805 |
| Pearson R | 0.937935 |
| Spearman R | 0.459341 |

## 5. Negative R² Diagnosis

The raw model showed strong wear correlation but poor absolute magnitude agreement.

| Statistic | TEST |
|---|---:|
| Actual mean | 3.371562 |
| Prediction mean | 2.943188 |
| Actual STD | 0.404946 |
| Prediction STD | 0.110169 |
| STD ratio | 0.272059 |

Identified causes:

- Prediction scale compression
- Systematic bias / intercept shift
- Prediction slope mismatch

Trend inversion was not observed.

## 6. Calibration Protocol

Two controlled calibration methods were evaluated:

1. Isotonic Regression
2. Positive-Slope Linear Calibration

Calibration was fitted using VALIDATION predictions and VALIDATION targets only.

The TEST targets were never used to fit calibration.

### Positive-Slope Linear Calibration

```text
calibrated_prediction = m × prediction + b
```

**Slope:** 1.255438792

**Intercept:** -0.584450713

## 7. Calibration Performance

### Untouched TEST Set

| Method | MAE | RMSE | R² | Pearson R | STD Ratio |
|---|---:|---:|---:|---:|---:|
| Raw | 0.504549 | 0.518973 | -0.768806 | 0.937935 | 0.272059 |
| Positive Linear | 0.348194 | 0.374971 | 0.076608 | 0.937935 | 0.341553 |
| Isotonic | 0.365020 | 0.434336 | -0.238916 | 0.376481 | 0.087620 |

## 8. Variance Analysis

- Raw STD ratio: **0.272059**
- Positive Linear STD ratio: **0.341553**
- Isotonic STD ratio: **0.087620**

Positive-slope linear calibration improves prediction spread relative to the raw model, but prediction variance remains below target variance.

Therefore, calibration improves the absolute scale but does not completely eliminate prediction compression.

## 9. Low-Wear Analysis

The existing dataset-defined Low wear stratum was used. No new industrial threshold was introduced.

The Low stratum contains 5 TEST samples.

| Method | MAE | RMSE | R² | Pearson R |
|---|---:|---:|---:|---:|
| Raw | 0.380929 | 0.388795 | 0.393245 | 0.981767 |
| Positive Linear | 0.260641 | 0.313956 | 0.604351 | 0.981767 |
| Isotonic | 0.325348 | 0.494622 | 0.017984 | 0.514561 |

## 10. Tool-Wise Analysis

Tool-wise calibration analysis could not be reliably performed because all 14 TEST samples contain:

```text
tool_id = Unknown
```

No Tool ID was inferred from filenames, timestamps, wear level, or indirect assumptions.

This limitation should be addressed in a future dataset revision if per-tool analysis is required.

## 11. Final Calibration Decision

# POSITIVE-SLOPE LINEAR CALIBRATION

The method was selected because it:

- Reduced TEST MAE from 0.504549 to 0.348194.
- Reduced TEST RMSE from 0.518973 to 0.374971.
- Improved TEST R² from -0.768806 to +0.076608.
- Preserved Pearson R at 0.937935.
- Preserved the positive wear trend.
- Improved prediction spread relative to the raw model.
- Improved low-wear performance.
- Used validation data only for calibration fitting.

### Why Isotonic Regression Was Rejected

Although isotonic regression performed strongly on validation, its untouched TEST behavior was not reliable.

TEST Pearson R decreased from 0.937935 to 0.376481.

Its TEST STD ratio was only 0.087620.

TEST R² also remained negative.

Therefore isotonic regression was rejected because it did not generalize reliably to the untouched TEST set.

## 12. Ground Truth vs Predictions

### Measured Ground Truth

Measured wear target from the dataset.

### Raw Model Prediction

Direct output produced by the trained Wear Analysis model.

### Calibrated Prediction

Output after applying the selected positive-slope linear calibration to the raw model prediction.

The calibrated prediction is not a newly trained neural network. It is a post-hoc calibration layer.

## 13. Limitations

- Prediction variance remains compressed.
- TEST R² is positive but relatively low.
- The dataset is small.
- Validation and TEST each contain only 14 samples.
- Tool IDs are unavailable in the current TEST metadata.
- Calibration was evaluated on a single held-out TEST split.
- Additional independent validation is required.
- Calibration improves absolute estimation but does not completely solve the underlying scale limitation.

**This remains a hackathon research model and is not production-ready.**

## 14. Generated Artifacts

### Metrics

```text
results/wear_analysis/metrics/final_precalibration_metrics.csv
results/wear_analysis/metrics/calibration_variance_analysis.csv
results/wear_analysis/metrics/low_wear_calibration_metrics.csv
results/wear_analysis/metrics/final_calibration_decision.csv
```

### Calibration

```text
results/wear_analysis/calibration/calibration_parameters_validation_only.json
results/wear_analysis/calibration/calibrated_predictions.csv
```

### Plots

```text
results/wear_analysis/plots/raw_vs_actual.png
results/wear_analysis/plots/isotonic_vs_actual.png
results/wear_analysis/plots/constrained_linear_vs_actual.png
```

## 15. Exactly One Recommended Next Experiment

### Robustness Testing

The next experiment should be robustness testing of the existing finalized 384 × 384 ROI Late-Fusion plus positive-slope calibration pipeline.

The current study demonstrates that calibration improves absolute wear estimation, but prediction variance remains compressed and the dataset is small.

Therefore, before changing the architecture, the next useful question is whether the finalized pipeline remains stable under controlled variations in visual and sensor inputs.

This experiment should be designed separately and should NOT be automatically run as part of this calibration study.

## 16. Final Status

**Calibration Study: COMPLETE**

**Selected calibration: Positive-Slope Linear Calibration**

The selected calibration improves absolute wear estimation on the held-out TEST set while preserving the strong positive wear trend.

**The system is still a hackathon research model and is not yet production-ready.**

---

*End of ToolGuard-AI Wear Analysis Calibration Study.*