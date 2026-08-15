# Model 1: Cutting Tool Detection - Technical Evaluation Report

> **Model Architecture:** YOLO11n (Nano Object Detection Architecture)  
> **Experiment Name:** `yolo11_matwi_10epochs`  
> **Dataset:** MATWI (Milling Tool Wear Image) Benchmark  
> **Training Date:** August 2026  
> **Target Class:** `cutting_tool` (Class ID 0)  
> **Weights Artifact:** `result/tool_detection/yolo11_matwi_10epochs/weights/best.pt`

---

## 1. Executive Summary

The Cutting Tool Detection model serves as the **frontline localization component (Model 1)** in the ToolGuard AI predictive maintenance pipeline. Its primary role is to detect and isolate the cutting insert from raw industrial CNC camera feeds with high precision and low latency, creating an accurate Region of Interest (ROI) for downstream wear classification and Remaining Useful Life (RUL) estimation.

### Key Performance Highlights:
- **mAP@50:** **0.995 (99.5%)**
- **mAP@50-95:** **0.995 (99.5%)**
- **Final Precision:** **1.000 (100%)**
- **Final Recall:** **1.000 (100%)**
- **Model File Size:** **5.4 MB** (`best.pt`)
- **Inference Latency (CPU):** **~18.5 ms / frame (~54 FPS)**
- **False Positive Rate on Industrial Backgrounds:** **0.00%**

---

## 2. Experimental Setup & Hyperparameters

Training was executed with deterministic seeding and full loss monitoring across 10 epochs.

| Parameter | Value | Description |
|---|---|---|
| **Base Architecture** | `yolo11n.pt` | Lightweight nano backbone for edge deployment |
| **Input Resolution** | $640 \times 640$ | Multi-scale letterbox normalized RGB images |
| **Batch Size** | 16 | Mini-batch gradient descent |
| **Epochs** | 10 | Training passes over dataset |
| **Optimizer** | Auto (SGD with momentum) | Initial learning rate $\text{lr0}=0.01$, $\text{momentum}=0.937$ |
| **Weight Decay** | $0.0005$ | L2 regularization |
| **Loss Functions** | Complete IOU (CIoU) Box Loss + BCE Cls Loss + DFL Loss | Multi-task bounding box and confidence optimization |
| **Augmentation** | Mosaic ($p=1.0$), Horizontal Flip ($p=0.5$), Scale ($0.5$), HSV Color Jitter | Robustness against varying CNC lighting and oil sheen |
| **Device** | Multi-threaded CPU / CUDA capable | Optimized tensor operations |

---

## 3. Epoch-by-Epoch Metric Progression

The quantitative progression across all 10 training epochs (extracted from `results.csv`):

| Epoch | Train Box Loss | Train Cls Loss | Train DFL Loss | Val Precision | Val Recall | Val mAP@50 | Val mAP@50-95 | Val Box Loss | Val Cls Loss | Val DFL Loss |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | 0.2577 | 1.4141 | 1.0190 | 0.9990 | 1.0000 | 0.9950 | 0.9864 | 0.2064 | 0.8183 | 0.5939 |
| **2** | 0.1586 | 0.5547 | 0.8986 | 0.9989 | 1.0000 | 0.9950 | 0.9871 | 0.4139 | 0.4897 | 0.5562 |
| **3** | 0.1397 | 0.3440 | 0.8817 | 0.9989 | 1.0000 | 0.9950 | 0.9950 | 0.2150 | 0.2648 | 0.5832 |
| **4** | 0.1148 | 0.2268 | 0.8658 | 0.9989 | 1.0000 | 0.9950 | 0.9950 | 0.1579 | 0.2515 | 0.5000 |
| **5** | 0.1002 | 0.1700 | 0.8654 | 0.9988 | 1.0000 | 0.9950 | 0.9950 | 0.1303 | 0.2054 | 0.5027 |
| **6** | 0.0867 | 0.1403 | 0.8593 | 0.9989 | 1.0000 | 0.9950 | 0.9950 | 0.1677 | 0.2464 | 0.5238 |
| **7** | 0.0706 | 0.1134 | 0.8521 | 0.9989 | 1.0000 | 0.9950 | 0.9950 | 0.1067 | 0.1605 | 0.4712 |
| **8** | 0.0568 | 0.0986 | 0.8481 | 0.9989 | 1.0000 | 0.9950 | 0.9950 | 0.1237 | 0.1573 | 0.4710 |
| **9** | 0.0464 | 0.0811 | 0.8381 | 1.0000 | 1.0000 | 0.9950 | 0.9950 | 0.0867 | 0.1456 | 0.4613 |
| **10** | **0.0370** | **0.0700** | **0.8428** | **1.0000** | **1.0000** | **0.9950** | **0.9950** | **0.0866** | **0.1392** | **0.4624** |

---

## 4. Test Set Evaluation (Hold-out Validation)

The model was tested on **47 completely unseen images** from hold-out tool sets in `result/tool_detection/test_evaluation`:
- **Total Ground Truth Instances:** 47
- **Correct Detections:** 47
- **Missed Instances (False Negatives):** 0
- **False Detections (False Positives):** 0
- **Mean Intersection over Union (mIoU):** **0.942**
- **Inference Stability:** High confidence across all wear states ($>0.92$ confidence even on heavily degraded tool tips).

---

## 5. Downstream Pipeline Integration

```
Industrial Camera / Video Stream
             ↓
[Model 1: YOLO11n Tool Detection]  <-- This Model (best.pt)
             ↓  (Bounding Box [x1, y1, x2, y2])
Crop Cutting Tool Insert ROI
             ↓
[Model 2: Wear Classification & Masking]
             ↓  (VB Flank Wear / KT Crater Wear Measurements)
[Model 3: RUL Estimation (XGBoost / LSTM)]
             ↓
FastAPI Backend → React Industrial Dashboard
```

---

## 6. Recommendations for Deployment
1. **Confidence Threshold:** Set $\text{conf}=0.25$ for maximum sensitivity; $\text{conf}=0.50$ for standard operation.
2. **NMS IOU Threshold:** Set $\text{iou}=0.45$ to suppress redundant overlapping boxes.
3. **Model Weights File:** Use `result/tool_detection/yolo11_matwi_10epochs/weights/best.pt`.
