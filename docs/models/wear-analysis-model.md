# Model 2: Tool Wear Analysis (Phase3B Gated Multimodal Model)

## 1. Model Overview
Model 2 is the primary flank wear ($VB$) regression engine for CNC cutting tool inserts. It operates on $384 \times 384$ cropped tool insert regions of interest (ROI) alongside optional sensor telemetry (cutting forces, temperatures, and vibrations).

- **Artifact Checkpoint**: `ai/wear_analysis/artifacts/final/wear_analysis_multimodal_final.pth`
- **Target Scaler**: `ai/wear_analysis/artifacts/final/target_scaler.pkl` (StandardScaler, Mean: $109.50\,\mu\text{m}$, Scale: $77.994\,\mu\text{m}$)
- **Architecture Class**: `Phase3BGatedModel` (inherits from `Phase3AUnifiedModel` and `UnifiedMultimodalWearModel`)
- **Input Resolution**: $384 \times 384 \times 3$ BGR Image Tensor + Optional 12-Dimensional Sensor Feature Vector
- **Primary Target**: Flank Wear Land Width ($VB$) in $\mu\text{m}$ (continuous regression transformed to $\text{mm}$)

---

## 2. Neural Architecture

```
[Tool ROI Crop 384x384] ───> [EfficientNet-B0 Backbone] ───> [Vision Projector] ───> [Vision Embed (256-D)] ──┐
                                                                                                                ├──> [Concat (514-D)] ───> [Regressor MLP] ───> Flank Wear (µm)
[Sensor Features (12-D)] ───> [Sensor MLP (256-D)] ───────* [Sigmoid Gate Net] ───> [Sensor Embed (256-D)] ──┤                                                     │
                                                                                                                └──> [Mask Indicators (2-D)]                          └──> Inverse target_scaler.pkl
```

### Key Network Components:
1. **Vision Encoder**: Pretrained `EfficientNet-B0` feature extractor with adaptive average pooling yielding a 1280-dimensional embedding.
2. **Vision Projector**: `Linear(1280, 256) -> BatchNorm1d -> ReLU -> Dropout(0.2)`
3. **Sensor MLP**: `Linear(12, 128) -> ReLU -> Linear(128, 256) -> BatchNorm1d -> ReLU`
4. **Adaptive Gating Network**: `Linear(256, 256) -> Sigmoid`, which gates the sensor embedding:
   $$\text{sens\_gated} = \text{sens\_emb} \odot \sigma(\text{gate}(\text{sens\_emb}))$$
   When sensor modalities are absent (image-only inference), the gating network automatically zeros out noise, and modality mask `[1.0, 0.0]` directs the network to prioritize visual features.
5. **Multimodal Fusion Layer**: Concatenates vision embedding (256), gated sensor embedding (256), and modality indicator flags (2) into a 514-dimensional representation.
6. **Regression Head**: `Linear(514, 128) -> ReLU -> Dropout(0.2) -> Linear(128, 1)`

---

## 3. Physical Wear Mapping & Status Bands
Predicted raw standard-scaled outputs are converted to physical units using `target_scaler.inverse_transform()`:
- **Flank Wear Width ($VB$ in mm)**: $\text{wear\_um} / 1000.0$
- **Wear Degradation Area ($\text{mm}^2$)**: Calibrated optical wear zone footprint ($VB \times \text{contact length}$)
- **Industrial Condition Status**:
  - `HEALTHY`: $VB < 0.15\,\text{mm}$ ($< 150\,\mu\text{m}$)
  - `MODERATE`: $0.15\,\text{mm} \le VB < 0.22\,\text{mm}$ ($150 - 220\,\mu\text{m}$)
  - `WARNING`: $0.22\,\text{mm} \le VB < 0.28\,\text{mm}$ ($220 - 280\,\mu\text{m}$)
  - `CRITICAL`: $VB \ge 0.28\,\text{mm}$ ($\ge 280\,\mu\text{m}$) (Approaching ISO $300\,\mu\text{m}$ EOL limit)

---

## 4. Python Inference Integration Example
```python
from backend.services.wear_analysis_service import wear_analysis_service
import cv2

# Load cropped insert ROI
crop_roi = cv2.imread("storage/processed_images/INSP-001_crop.jpg")

# Perform inference (image-only or multimodal)
result = wear_analysis_service.predict(crop_roi, sensor_features=[65.0, 1.8, 1200.0, 360.0])

print(f"Flank Wear: {result['wear_um']:.1f} µm (VB: {result['wear_value']:.3f} mm)")
print(f"Condition: {result['wear_status']}, Latency: {result['inference_latency_ms']} ms")
```
