# Tool Detection Plots - YOLO11n MATWI Experiment

This directory stores all visual diagnosis graphs and prediction outputs for the **Cutting Tool Detection** model.

### Available Visualizations:
- **`results.png`**: Composite graph of 10-epoch training loss, validation loss, precision, recall, and mAP metrics.
- **`confusion_matrix.png` & `confusion_matrix_normalized.png`**: Multi-class and normalized confusion matrix.
- **`BoxPR_curve.png`**: Precision-Recall curve demonstrating mAP@0.5 = 0.995.
- **`BoxF1_curve.png`**: F1-Confidence curve displaying peak F1 = 1.00.
- **`BoxP_curve.png` & `BoxR_curve.png`**: Precision and Recall vs confidence threshold curves.
- **`labels.jpg`**: Visual correlogram of training label spatial distribution.
- **`val_batch*_pred.jpg`**: Visual prediction overlays on held-out validation images.
- **`train_batch*.jpg`**: Training batch visualizations with mosaic data augmentation.

For full interpretation and metrics analysis, see [Plots Documentation](file:///d:/DAX/sih-2026/result/plots/README.md) and [Evaluation Report](file:///d:/DAX/sih-2026/result/reports/MODEL_EVALUATION_REPORT.md).
