# Datasets Directory - ToolGuard AI (SIH 2026)

This directory contains datasets used for **Cutting Tool Detection**, **Tool Wear Classification & Measurement**, and **Remaining Useful Life (RUL) Prediction**.

---

## 📌 Primary Dataset: MATWI (Milling Tool Wear Image) Dataset

For the **Tool Detection** module (Model 1), the system utilizes the **MATWI (Milling Tool Wear Image)** benchmark dataset.

### 1. Dataset Overview
- **Name:** MATWI (Milling Tool Wear Image Dataset)
- **Application:** Computer Vision for CNC Milling Cutters & Insert Wear Assessment
- **Total Images:** 1,680+ high-resolution industrial images
- **Tool Sets Included:** 17 Distinct Tool Runs (`Set1` through `Set17`)
- **Machining Conditions:** High-speed dry and wet milling under varying feed rates, spindle speeds, and cutting depths.
- **Visual Spectrum:** Optical microscopy and high-resolution industrial imaging capturing diverse lighting, angles, and tool wear stages.

---

## 📁 Directory Structure

```
datasets/
│
├── README.md                      # This overview documentation
├── MATWI_DATASET_INFO.md          # Comprehensive technical dataset specifications
├── data.yaml                      # YOLO training & validation dataset configuration
│
├── raw/                           # Raw, uncompressed image archives
│   ├── tool_wear/                 # Original MATWI Set1 - Set17 image directories
│   ├── machining/                 # Machining sensor time-series (force, vibration, acoustic)
│   ├── downtime/                  # Operational logs for maintenance analysis
│   └── ppe/                       # Safety compliance imagery
│
├── processed/                     # Preprocessed & partitioned images ready for training
│   └── tool_detection/
│       ├── images/
│       │   ├── train/             # Training images (80%)
│       │   ├── val/               # Validation images (10%)
│       │   └── test/              # Held-out test images (10%)
│       └── labels/
│           ├── train/             # YOLO format bounding box annotations
│           ├── val/
│           └── test/
│
├── annotations/                   # Source ground-truth annotations
│   ├── detection/                 # YOLO bounding boxes for cutting tool ROI
│   │   └── data.yaml              # Detection dataset definition
│   ├── classification/            # Wear severity labels (Initial, Normal, Severe, Failure)
│   └── segmentation/              # Pixel-level masks for flank wear (VB) & crater wear (KT)
│
└── splits/                        # Split definitions preventing data leakage
    ├── train_tools.txt            # Tool set IDs allocated to training
    ├── val_tools.txt              # Tool set IDs allocated to validation
    └── test_tools.txt             # Tool set IDs allocated to test
```

---

## 🎯 Tool Detection Objective & Annotation Format

### Target Class
- **Class ID `0`:** `cutting_tool` (The physical cutting insert / tool tip engaged in the milling spindle).

### Annotation Format (YOLO Bounding Box)
Each image has a corresponding `.txt` label file containing normalized bounding box coordinates:
```
<class_id> <x_center> <y_center> <width> <height>
```
Example (`Set3_frame_0042.txt`):
```
0 0.512340 0.489120 0.354120 0.412890
```
- All spatial values are normalized between `[0.0, 1.0]` relative to image width and height ($640 \times 640$).

---

## 🛡️ Split Strategy & Leakage Prevention

To ensure true generalization to unseen industrial tools in manufacturing shops:
1. **Tool-Wise Group Split (`GroupShuffleSplit`):** Splits are partitioned strictly by **Tool Set ID** (`Set1` to `Set17`).
2. Images from the same physical tool insert at different wear cycles never appear across both training and validation/test partitions.
3. **Partition Ratios:**
   - **Training Set:** ~80% (~1,344 images)
   - **Validation Set:** ~10% (~168 images)
   - **Test Set:** ~10% (~168 images / 47 evaluated in hold-out validation)

---

## 🚀 How to Use the Dataset

### Training with Ultralytics YOLO:
```python
from ultralytics import YOLO

# Load pre-trained nano backbone
model = YOLO('yolo11n.pt')

# Train on MATWI processed tool detection dataset
model.train(
    data='datasets/data.yaml',
    epochs=10,
    imgsz=640,
    batch=16,
    device='cpu',  # or '0' for CUDA GPU
    project='result/tool_detection',
    name='yolo11_matwi_10epochs'
)
```

### Dataset Configuration (`data.yaml`):
```yaml
path: datasets/processed/tool_detection
train: images/train
val: images/val
test: images/test

names:
  0: cutting_tool
```

For complete technical specifications, wear parameters, and sensor correlation details, see [MATWI_DATASET_INFO.md](file:///d:/DAX/sih-2026/datasets/MATWI_DATASET_INFO.md).
