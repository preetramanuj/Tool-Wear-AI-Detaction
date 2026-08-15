# Training & Evaluation Plots - Tool Detection (YOLO11n on MATWI)

This folder contains all visualization plots generated during the training and validation of the **YOLO11n cutting tool detection model** on the **MATWI dataset** (10 epochs).

---

## 📊 Summary of Available Plots

| Plot File | Description | Key Finding / Value |
|---|---|---|
| [`results.png`](file:///d:/DAX/sih-2026/result/plots/results.png) | 10-Epoch Training & Validation Loss and Metric Progression | Smooth convergence; `mAP50` reaches **0.995** by epoch 3 |
| [`confusion_matrix.png`](file:///d:/DAX/sih-2026/result/plots/confusion_matrix.png) | Raw Count Confusion Matrix | 45/45 Tool detections identified correctly, 0 false alarms |
| [`confusion_matrix_normalized.png`](file:///d:/DAX/sih-2026/result/plots/confusion_matrix_normalized.png) | Normalized Confusion Matrix | **1.00 (100%)** True Positive Rate for `cutting_tool` class |
| [`BoxPR_curve.png`](file:///d:/DAX/sih-2026/result/plots/BoxPR_curve.png) | Precision-Recall (PR) Curve | Area Under Curve (AUC) = **0.995** across all confidence thresholds |
| [`BoxF1_curve.png`](file:///d:/DAX/sih-2026/result/plots/BoxF1_curve.png) | F1-Score vs. Confidence Curve | Peak F1 score = **1.00** at confidence threshold $\ge 0.88$ |
| [`BoxP_curve.png`](file:///d:/DAX/sih-2026/result/plots/BoxP_curve.png) | Precision vs. Confidence Curve | Precision stays at **1.00** across all operating thresholds $> 0.20$ |
| [`BoxR_curve.png`](file:///d:/DAX/sih-2026/result/plots/BoxR_curve.png) | Recall vs. Confidence Curve | Recall stays at **1.00** up to high confidence $> 0.85$ |
| [`labels.jpg`](file:///d:/DAX/sih-2026/result/plots/labels.jpg) | Dataset Label Bounding Box Distribution | Shows center $(x, y)$ and width/height aspect ratios |
| [`val_batch0_pred.jpg`](file:///d:/DAX/sih-2026/result/plots/val_batch0_pred.jpg) | Validation Batch 0 Predictions | Visual bounding box predictions with confidence overlays |
| [`val_batch1_pred.jpg`](file:///d:/DAX/sih-2026/result/plots/val_batch1_pred.jpg) | Validation Batch 1 Predictions | Visual verification of accurate tool bounding box localization |
| [`train_batch0.jpg`](file:///d:/DAX/sih-2026/result/plots/train_batch0.jpg) | Training Mosaic Batch 0 | Visual demonstration of mosaic augmentations & bounding boxes |
| [`train_batch1.jpg`](file:///d:/DAX/sih-2026/result/plots/train_batch1.jpg) | Training Mosaic Batch 1 | Color jittering, scaling, and orientation augmentations |

---

## 🔍 Detailed Interpretation Guide

### 1. Training & Validation Curves (`results.png`)
- **Bounding Box Loss (`box_loss`):** Decreased from `0.2577` (Epoch 1) to `0.0369` (Epoch 10) on train, and stabilized at `0.0865` on validation.
- **Classification Loss (`cls_loss`):** Dropped rapidly from `1.414` (Epoch 1) to `0.0700` (Epoch 10) on train and `0.1392` on validation.
- **Distribution Focal Loss (`dfl_loss`):** Tightened from `1.019` down to `0.842` on train and `0.462` on validation, confirming precise bounding box boundaries.
- **Metric Plateau:** Precision, Recall, and mAP@50 stabilized at near-perfect scores ($>0.995$) from early epochs without overfitting.

### 2. Confusion Matrix (`confusion_matrix_normalized.png`)
- The row normalized matrix confirms **100% of cutting tools** in the validation set were detected without false negatives.
- Background misclassification rate is **0.00**, indicating zero hallucinated detections on background CNC machinery or chip debris.

### 3. F1 and PR Curves (`BoxF1_curve.png`, `BoxPR_curve.png`)
- The model exhibits a wide optimal operating range with confidence thresholds between **0.25 and 0.85**, yielding balanced precision and recall.
- In production deployment, setting the default confidence threshold $\text{conf}=0.25$ and $\text{IOU}=0.45$ yields maximum recall with zero background false positives.

For full mathematical metrics and evaluation tables, refer to [MODEL_EVALUATION_REPORT.md](file:///d:/DAX/sih-2026/result/reports/MODEL_EVALUATION_REPORT.md).
