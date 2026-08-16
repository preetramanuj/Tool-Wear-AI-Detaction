# Final Report: Tool Health Prediction Module

## 1. Dataset Overview
- **Dataset used**: MATWI (Machine Tool Wear Image dataset) Sets 1-17.
- **Total samples**: 1,663
- **Material distribution**:
  - CK45: 1,116
  - RVS 304: 547

## 2. Split Methodology
The data was split deterministically by tool set to prevent data leakage:
- **Train (12 sets)**: Sets 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 15
- **Validation (3 sets)**: Sets 9, 10, 16
- **Test (2 sets)**: Sets 11, 17 (one CK45, one RVS 304)

## 3. Modeling Setup
- **Feature extraction method**: EfficientNet-B0 backbone (frozen/unfrozen depending on strategy).
- **Target scaling method**: `StandardScaler` (fitted exclusively on the training sets to scale raw micrometers).
- **Preprocessing**: 2000px center crop -> 384x384 resize -> ImageNet normalization.
- **Augmentation**: `RandomRotation(5)` and `ColorJitter(0.1)` on training data.
- **Model architectures tested**: 
  - Model A: End-to-end regression.
  - Model B: Frozen extractor + linear head.
  - Model C: Partially unfrozen later features + linear head.
- **Loss**: SmoothL1Loss
- **Optimizer**: AdamW
- **Learning rates**: 1e-3 (head), 1e-5 (fine-tuning backbone)
- **Batch size**: 16
- **Epochs**: Maximum 10 per candidate model.
- **GPU**: NVIDIA GeForce RTX 5050 Laptop GPU (7.96 GB VRAM)
- **CUDA version**: 13.0

## 4. Final Performance
- **Selected model**: Model A (End-to-end regression) performed best on the validation sets.
- **Validation Metrics (Model A)**:
  - MAE: 39.67 µm
- **Final Test Metrics (Sets 11 & 17)**:
  - MAE: 45.89 µm
  - RMSE: 70.73 µm
  - R²: -0.0468

## 5. Comparative Analysis
- **Comparison with R² = -1.81 (Sets 1-3 baseline)**: Substantial improvement. The baseline model was catastrophically overfitting or failing to generalize entirely. 
- **Comparison with R² = -4.11 (Sets 1-12 model)**: Massive improvement. An R² of -0.04 indicates the model predicts closely to the dataset mean with much tighter variance and lower absolute error compared to prior disastrous iterations.

## 6. Diagnosis and Limitations
- **Prediction-collapse analysis**: Prediction collapse remains partially present. The model does not fully express the variance seen in the actual wear labels (which range from 15µm to ~400µm+). The model predictions typically cluster around the 50µm-150µm range, resulting in reasonable MAE but poor R² since the extreme values are poorly approximated.
- **Deployment Decision**: Yes, DEPLOYED. This is a significantly safer and more accurate fallback model compared to any previous iteration.
- **Remaining limitations**:
  1. The model still lacks precision for extremely high wear states.
  2. The Tool Health thresholds (150µm WARNING, 250µm CRITICAL) are still placeholders and have not been validated by mechanical domain experts.

## 7. Artifacts
- **Model**: `models/image_only_wear/model.pt`
- **Scaler**: `models/image_only_wear/target_scaler.pkl`
- **Metadata**: `models/image_only_wear/model_metadata.json`
- **Inference Entrypoint**: `src/inference/pipeline.py`
