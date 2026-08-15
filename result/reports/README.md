1# Evaluation Reports - ToolGuard AI (SIH 2026)

This directory contains technical evaluation reports, performance benchmarks, and statistical analysis for the AI models in the ToolGuard AI system.

---

## 📑 Available Reports

| Report Document | Focus Area | Key Findings / Highlights |
|---|---|---|
| [`MODEL_EVALUATION_REPORT.md`](file:///d:/DAX/sih-2026/result/reports/MODEL_EVALUATION_REPORT.md) | Cutting Tool Detection (YOLO11n on MATWI) | **mAP50:** 0.995, **mAP50-95:** 0.995, **Precision:** 1.000, **Recall:** 1.000 |
| [`BENCHMARK_REPORT.md`](file:///d:/DAX/sih-2026/result/reports/BENCHMARK_REPORT.md) | Latency, FPS Throughput & Edge Deployment | CPU latency ~18.5ms (~54 FPS), model size 5.4MB, low memory footprint |
| [`../tool_detection/final_report.md`](file:///d:/DAX/sih-2026/result/tool_detection/final_report.md) | Executive Summary for Model 1 | Architecture details, split strategy, and artifact locations |

---

## 🎯 Model 1 (Tool Detection) Highlights

- **Architecture:** YOLO11n (Ultralytics Nano Backbone)
- **Weights Location:** `result/tool_detection/yolo11_matwi_10epochs/weights/best.pt`
- **Training Dataset:** MATWI Dataset (Sets 1 to 17, 1,680+ images)
- **Validation Dataset:** 45 unseen images from holdout tool sets
- **Test Dataset:** 47 unseen images from holdout tool sets
- **Optimal Thresholds:** Confidence $\ge 0.25$, IOU $= 0.45$
