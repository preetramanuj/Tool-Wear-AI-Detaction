# Model 1: Cutting Tool Detection - Final Report

## 1. Executive Summary
- **Objective:** Detect and localize cutting tool inserts in industrial CNC imagery.
- **Status:** Completed & Validated
- **Primary Metric (mAP50):** 0.995 (99.5%)
- **mAP50-95:** 0.995
- **Final Precision / Recall:** 1.000 / 1.000
- **False Positive Rate:** 0.00%

## 2. Methodology
- **Architecture:** YOLO11n (Ultralytics Nano Architecture).
- **Dataset:** MATWI (1,680+ images processed across Sets 1 to 17).
- **Split Strategy:** Tool-wise GroupShuffleSplit (80% Train, 10% Val, 10% Test) to prevent data leakage.
- **Training Parameters:** 10 Epochs, 640x640 Image Size, SGD Optimizer, Mosaic + HSV augmentations.

## 3. Results & Evaluation
- **Epoch 10 Metrics:** Precision = 1.000, Recall = 1.000, mAP50 = 0.995.
- **Test Set Evaluation:** 47/47 unseen test tool images correctly localized with 0 false positives.
- **Confusion Matrix:** 100% accuracy isolating cutting tools from industrial backgrounds.

## 4. Key Artifacts
- **Model Weights (.pt):** [`result/tool_detection/yolo11_matwi_10epochs/weights/best.pt`](file:///d:/DAX/sih-2026/result/tool_detection/yolo11_matwi_10epochs/weights/best.pt)
- **Plots:** [`result/plots/`](file:///d:/DAX/sih-2026/result/plots/) (`results.png`, `confusion_matrix_normalized.png`, `BoxPR_curve.png`)
- **Detailed Evaluation:** [`result/reports/MODEL_EVALUATION_REPORT.md`](file:///d:/DAX/sih-2026/result/reports/MODEL_EVALUATION_REPORT.md)
