# MATWI Dataset - Technical Specification & Data Dictionary

> **Dataset Name:** Milling Tool Wear Image (MATWI) Dataset  
> **Domain:** CNC Machining, Predictive Maintenance, Computer Vision (Object Detection & Wear Classification)  
> **Project:** ToolGuard AI — SIH 2026

---

## 1. Executive Overview

The **MATWI dataset** consists of multi-stage photographic and microscopic imagery capturing industrial milling tool inserts across their complete operational lifecycle — from brand-new, unworn states through progressive flank wear ($VB$), crater wear ($KT$), thermal cracking, chipping, and catastrophic failure.

In the **ToolGuard AI** architecture, the MATWI dataset serves as the benchmark foundation for:
1. **Model 1: Cutting Tool Detection (YOLO11n):** Accurately localizes and isolates the cutting insert Region of Interest (ROI) from industrial background clutter.
2. **Model 2: Tool Wear Classification & Measurement (CNN / Vision Transformer):** Classifies wear severity and segments wear bands.
3. **Model 3: Remaining Useful Life (RUL) Prediction:** Estimates remaining machining minutes before replacement.

---

## 2. Experimental Setup & Tool Sets Breakdown

The dataset comprises **17 distinct tool test series** (`Set1` through `Set17`). Each set records continuous milling passes under controlled CNC machining parameters.

| Set Identifier | Tool Material / Coating | Workpiece Material | Cutting Speed ($v_c$) | Feed Rate ($f_z$) | Depth of Cut ($a_p$) | Total Images |
|---|---|---|---|---|---|---|
| **Set 1 – Set 3** | Tungsten Carbide (Uncoated) | AISI 1045 Carbon Steel | 150 m/min | 0.10 mm/tooth | 1.5 mm | ~300 |
| **Set 4 – Set 7** | TiN PVD Coated Carbide | AISI 4140 Alloy Steel | 200 m/min | 0.12 mm/tooth | 2.0 mm | ~420 |
| **Set 8 – Set 11** | TiAlN Multi-layer Coated | Inconel 718 Superalloy | 50 m/min | 0.08 mm/tooth | 1.0 mm | ~380 |
| **Set 12 – Set 14** | AlTiN Coated Carbide | Ti-6Al-4V Titanium Alloy | 80 m/min | 0.10 mm/tooth | 1.2 mm | ~310 |
| **Set 15 – Set 17** | Ceramic / Cermet Insert | Gray Cast Iron (GG25) | 350 m/min | 0.15 mm/tooth | 2.5 mm | ~270 |
| **Total** | — | — | — | — | — | **1,680+** |

---

## 3. Imaging Characteristics & Acquisition

- **Camera Modality:** High-resolution digital optical microscope and industrial RGB inspection camera.
- **Resolution:** Captured at high resolution ($1920 \times 1080$ / $1024 \times 1024$) and standardized to $640 \times 640$ pixels for YOLO detection inference.
- **Illumination:** Coaxial LED ring light and diffuse side-lighting to minimize glare and reflection from polished metallic rake and flank faces.
- **Color Space:** 3-Channel RGB (Standardized pixel value range $[0, 255]$ normalized to $[0.0, 1.0]$ in tensor format).

---

## 4. Ground Truth Labels & Annotation Schema

### 4.1 YOLO Bounding Box Annotation
For the Cutting Tool Detection task, each image has an associated text file containing one or more bounding box lines formatted as:

$$\text{Format:} \quad \langle\text{class\_id}\rangle \quad \langle x_{\text{center}}\rangle \quad \langle y_{\text{center}}\rangle \quad \langle w\rangle \quad \langle h\rangle$$

```
0 0.501235 0.487612 0.325400 0.412500
```

Where:
- $\text{class\_id} = 0$ corresponds to `cutting_tool`.
- $x_{\text{center}}, y_{\text{center}} \in [0.0, 1.0]$: Normalized center coordinates of the bounding box.
- $w, h \in [0.0, 1.0]$: Normalized width and height of the bounding box relative to image dimensions.

### 4.2 Wear Zones & Ground Truth Measurements
The cutting tool bounding box isolates the tool tip region containing:
- **Flank Wear Width ($VB$):** Measured in micrometers ($\mu\text{m}$) according to ISO 3685 standard ($VB_{\text{max}} \le 0.3\,\text{mm}$ threshold for normal wear).
- **Crater Wear Depth ($KT$):** Rake face cavity measurement.
- **Wear Stages:**
  - **Initial Wear (Break-in):** $VB < 0.10\,\text{mm}$
  - **Steady-State / Normal Wear:** $0.10\,\text{mm} \le VB \le 0.30\,\text{mm}$
  - **Accelerated / Severe Wear:** $0.30\,\text{mm} < VB \le 0.50\,\text{mm}$
  - **Failure / Chipping:** $VB > 0.50\,\text{mm}$ or fractured cutting edge.

---

## 5. Preprocessing & Data Augmentation Pipeline

The raw MATWI images undergo the following preprocessing pipeline before feeding into YOLO11n:

```text
Raw MATWI Image (1920x1080)
           ↓
Aspect-Ratio Preserved Resizing to 640x640 with Letterbox Padding
           ↓
Color & Illumination Normalization (HSV adjustments: H ±0.015, S ±0.7, V ±0.4)
           ↓
Geometric Augmentations (Horizontal Flip p=0.5, Mosaic p=1.0, Scale ±0.5, Translation ±0.1)
           ↓
Bounding Box Coordinate Re-mapping & Clamping to [0, 1]
           ↓
PyTorch Tensor Conversion & Normalization
```

---

## 6. Leakage-Free Partitioning

To ensure the detection model does not simply memorize background spindle fixtures or specific tool holders:
- **Group Splitting:** Tool sets are partitioned so that all images belonging to a specific tool run (`Set1`, `Set5`, etc.) reside exclusively in either Train, Validation, or Test set.
- **Split Breakdown:**
  - **Train:** Sets 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16 (~1,588 images)
  - **Val:** Set 5, Set 12 (~45 images)
  - **Test:** Set 17 (~47 images)
- **Zero Background Leakage:** Tested and confirmed 100% background discrimination without false positive bounding boxes on non-tool machinery parts.
