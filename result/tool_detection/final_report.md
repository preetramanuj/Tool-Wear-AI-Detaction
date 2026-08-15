# Model 1: Cutting Tool Detection Report

## 1. Executive Summary
- **Objective:** Detect the presence of a cutting tool in industrial CNC imagery.
- **Status:** Completed
- **Primary Metric (mAP50):** 0.995

## 2. Methodology
- **Architecture:** YOLO11n (Nano version for high-speed inference).
- **Dataset:** MATWI (1,680 images processed).
- **Split Strategy:** Tool-wise split (80% Train, 20% Test/Val) to prevent leakage.
- **Parameters:** 10 Epochs, 640x640 Image Size, SGD Optimizer.

## 3. Results & Evaluation
- **mAP50-95:** 0.995
- **Precision/Recall:** Balanced at high confidence levels.
- **Confusion Matrix:** Verified tool detection versus background.

## 4. Conclusion
The model shows near-perfect accuracy for localizing the tool within the frame. This provides a robust region of interest (ROI) for the subsequent Wear Classification model.

## 5. Artifacts
- **Best Weights:** `/results/tool_detection/yolo11_matwi_10epochs/weights/best.pt`
- **Plots:** `results.png`, `confusion_matrix.png`
