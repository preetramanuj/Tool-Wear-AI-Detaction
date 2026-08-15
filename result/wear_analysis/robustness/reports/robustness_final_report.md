# ToolGuard-AI — Final Wear Analysis Robustness Study

## 1. Study Scope

This robustness study evaluates the finalized **Wear Analysis module only**.

The robustness experiment does not retrain or modify the finalized Wear Analysis model.

Tool Detection, Face Detection and YOLO are outside the scope of this study.

## 2. Final Model Configuration

| Component | Configuration |
|---|---|
| Architecture | Late Fusion |
| Image branch | EfficientNet-B0 |
| Sensor branch | Sensor RMS features + MLP |
| ROI | 2000 px center crop |
| Resolution | 384 × 384 |
| Calibration | Positive-Slope Linear Calibration |
| Test samples | 14 |

## 3. Calibration

The selected calibration method was Positive-Slope Linear Calibration.

Calibration was fitted using validation predictions only and frozen before TEST evaluation.

The TEST set was not used to fit calibration parameters.

## 4. Final Calibrated TEST Baseline

| Metric | Value |
|---|---:|
| MAE | 0.348194 |
| RMSE | 0.374971 |
| R² | 0.076608 |
| Pearson R | 0.937935 |
| Spearman R | 0.459341 |

## 5. Image Robustness

Tested image conditions:

- Original
- Brightness −10%
- Brightness +10%
- Contrast −10%
- Contrast +10%

Worst image condition:

```text
brightness_plus_10
```

Mean calibrated prediction change:

```text
0.092107
```

The strongest image sensitivity was observed for increased brightness.

## 6. Sensor Robustness

Tested sensor perturbations:

- ±1%
- ±3%
- ±5%
- ±10%

Worst sensor condition:

```text
noise_plus_minus_10pct
```

At the worst sensor perturbation:

| Measurement | Value |
|---|---:|
| Mean absolute change | 0.042066 |
| Maximum absolute change | 0.094737 |

## 7. Combined Image + Sensor Robustness

Combined conditions tested image perturbations together with ±5% sensor noise.

Worst combined condition:

```text
brightness_plus_10_sensor_5pct
```

| Measurement | Value |
|---|---:|
| Mean absolute change | 0.111226 |
| Maximum absolute change | 0.257380 |
| Pearson R | 0.874725 |
| Spearman R | 0.516484 |

## 8. Trend Preservation

No tested perturbation produced a negative Pearson correlation with the original predictions.

No tested perturbation produced a negative Spearman correlation with the original predictions.

Therefore, the robustness experiments did not demonstrate a reversal of the prediction trend.

## 9. Overall Robustness Decision

### PASS WITH SENSITIVITY

The finalized Wear Analysis pipeline passes the controlled robustness study with measurable sensitivity.

The dominant measured sensitivity was increased image brightness, particularly when combined with sensor noise.

Sensor perturbations produced comparatively smaller prediction changes.

## 10. Worst-Case Condition

| Measurement | Value |
|---|---|
| Type | COMBINED |
| Condition | brightness_plus_10_sensor_5pct |
| Mean absolute change | 0.111226 |
| Maximum absolute change | 0.257380 |
| Pearson R | 0.874725 |
| Spearman R | 0.516484 |

## 11. Limitations

- The TEST set contains only 14 samples.
- Only controlled mild image and sensor perturbations were evaluated.
- The experiment does not cover every real-world camera or sensor failure condition.
- Tool-wise robustness analysis was unavailable because Tool IDs were recorded as Unknown.
- The study does not establish production readiness.

## 12. Research Interpretation

The finalized model demonstrates positive prediction relationships under all tested perturbations and relatively stable behavior under sensor noise.

However, the model shows measurable sensitivity to image brightness, with the strongest effect occurring when brightness variation is combined with sensor noise.

The appropriate research conclusion is:

**PASS WITH SENSITIVITY**

## 13. Generated Artifacts

The robustness study generated:

```text
results/wear_analysis/robustness/
├── metrics/
│   ├── untouched_baseline_predictions.csv
│   ├── image_robustness_predictions.csv
│   ├── image_robustness_summary.csv
│   ├── sensor_robustness_predictions.csv
│   ├── sensor_robustness_summary.csv
│   ├── combined_robustness_predictions.csv
│   ├── combined_robustness_summary.csv
│   ├── robustness_statistical_analysis.csv
│   └── robustness_final_decision.csv
│
└── reports/
    └── robustness_final_report.md
```

## 14. Final Status

| Item | Status |
|---|---|
| Final Wear Model | Frozen |
| Calibration | Positive-Slope Linear |
| Robustness | PASS WITH SENSITIVITY |
| Production readiness | Not established |
