# Final Deployment Handoff

**To: Deployment & Integration Team**
**From: ML Modeling Team**
**Subject: Tool Health Prediction Module Handoff (Final)**

This document answers the critical deployment questions for the newly finalized Tool Health Prediction module (Sets 1-17).

### What files should we deploy?
- `src/models/image_only_model.py` (Model Architecture)
- `src/inference/image_inference.py` (Inference logic)
- `src/inference/pipeline.py` (Main integration API)
- `src/models/tool_health_predictor.py` (Health business logic)
- `models/image_only_wear/model.pt` (Trained weights)
- `models/image_only_wear/target_scaler.pkl` (StandardScaler for predictions)
- `models/image_only_wear/model_metadata.json` (Configuration parameters)
- `requirements.txt` (Python dependencies)

### What file starts inference?
`src/inference/pipeline.py` contains the `UnifiedWearPipeline` class which is the primary integration contract.

### What model should we load?
The `models/image_only_wear/model.pt` file. This is an EfficientNet-B0 regression model trained across MATWI Sets 1-17.

### What preprocessing should be applied?
The pipeline automatically applies the required preprocessing. The expected steps are:
1. Center crop: 2000x2000
2. Resize: 384x384
3. Normalize: ImageNet means/stds `mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`

### What input does the model expect?
An image filepath (`str` or `Path`), raw image bytes (`bytes`), or a PIL `Image.Image` object.

### What does it return?
A JSON dictionary:
```json
{
    "wear_um": 120.5,
    "health": "HEALTHY",
    "mode": "image_only",
    "warnings": [],
    "tool_health_metadata": {}
}
```

### How is wear converted to health?
The `ToolHealthPredictor` takes the predicted wear in micrometers (`wear_um`) and uses **placeholder** thresholds (150.0µm for WARNING, 250.0µm for CRITICAL) to map it to a health status. **These thresholds are NOT scientifically validated for this dataset and must be updated by the domain experts.**

### How does multimodal input work?
If real sensor data is available, pass it to the pipeline via `sensor_data=...`. The pipeline is designed to route this to the multimodal model (currently a placeholder). **DO NOT generate fake sensor data.** If no real sensor data is present, omit the argument to use the image-only fallback model.

### What dependencies are required?
Refer to `requirements.txt`. Key dependencies include `torch`, `torchvision`, `Pillow`, `scikit-learn`, and `joblib`.

### Does GPU need to be available?
**GPU is strongly recommended.** The model uses an EfficientNet backbone which takes significantly longer to run on CPU.

### What happens if GPU is unavailable?
The inference code gracefully falls back to CPU. The `UnifiedWearPipeline` will run without errors, but latency will increase.

### What are the known limitations?
1. **Prediction range / collapse:** The model may struggle with extreme wear values if prediction collapse still exists. (Refer to `model_metadata.json` for validation constraints).
2. **Health Thresholds:** Unvalidated placeholder values.

### What tests passed?
Pytest passed all core module tests covering dataset loaders, model architectures, inference pipeline, ToolHealthPredictor, and preprocessing.

### Which model version is the final model?
The model saved inside `models/image_only_wear/` based on MATWI Sets 1-17 (trained up to 10 epochs).
