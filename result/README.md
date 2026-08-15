# Results Directory - ToolGuard AI (SIH 2026)

This directory stores all training artifacts, evaluated model weights, diagnostic plots, statistical metrics, and comprehensive evaluation reports for the **ToolGuard AI** predictive maintenance system.

---

## 📁 Directory Structure

```
result/
│
├── README.md                      # This directory index and overview
│
├── plots/                         # Diagnostic and training visual plots
│   ├── README.md                  # Plot interpretation guide
│   ├── results.png                # 10-epoch training and validation loss curves
│   ├── confusion_matrix.png       # Bounding box classification counts
│   ├── confusion_matrix_normalized.png # Normalized true positive rates (1.00)
│   ├── BoxPR_curve.png            # Precision-Recall curve (mAP50 = 0.995)
│   ├── BoxF1_curve.png            # F1-Score vs Confidence curve
│   ├── BoxP_curve.png             # Precision curve
│   ├── BoxR_curve.png             # Recall curve
│   ├── labels.jpg                 # Dataset label spatial distribution
│   └── val_batch*_pred.jpg        # Validation visual prediction overlays
│
├── reports/                       # Comprehensive evaluation reports & benchmarks
│   ├── README.md                  # Index of evaluation reports
│   ├── MODEL_EVALUATION_REPORT.md # In-depth statistical analysis across 10 epochs
│   └── BENCHMARK_REPORT.md        # Latency, FPS, edge hardware benchmarks
│
├── predictions/                   # Output visualization images generated during testing
│
└── tool_detection/                # Specific artifacts for Model 1 (Cutting Tool Detection)
    ├── final_report.md            # Executive summary of detection model
    ├── plots/                     # Mirrored plots for tool detection
    ├── reports/                   # Mirrored reports for tool detection
    ├── test_evaluation/           # Hold-out test batch evaluations
    └── yolo11_matwi_10epochs/     # Full training experiment run
        ├── weights/
        │   ├── best.pt            # Optimal checkpoint weights (mAP50 = 0.995)
        │   └── last.pt            # Final epoch checkpoint weights
        ├── args.yaml              # Hyperparameters and training arguments
        └── results.csv            # Epoch-by-epoch loss and metrics data
```

---

## 🌟 Model 1 Key Performance Metrics

- **Best Weights File:** [`result/tool_detection/yolo11_matwi_10epochs/weights/best.pt`](file:///d:/DAX/sih-2026/result/tool_detection/yolo11_matwi_10epochs/weights/best.pt)
- **Validation mAP@50:** **0.995 (99.5%)**
- **Validation mAP@50-95:** **0.995 (99.5%)**
- **Precision:** **1.000 (100%)**
- **Recall:** **1.000 (100%)**
- **Inference Speed:** **~18.5 ms (CPU)** / **~4.2 ms (CUDA GPU)**
- **Model Size:** **5.44 MB**

---

## 🛠️ Testing the Model

You can test the trained `.pt` model anytime using the backend CLI tester:
```powershell
python backend/test_model.py
```
Or run full test suite:
```powershell
python -m pytest backend/tests/test_tool_detection_model.py -v
```
