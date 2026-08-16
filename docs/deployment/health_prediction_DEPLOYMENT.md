# Tool Health Prediction - Deployment Guide

This document provides a complete deployment handoff for the Tool Health Prediction module.

## System Requirements
- **Python version**: 3.10+
- **GPU requirements**: NVIDIA GPU strongly recommended for real-time inference latency.
- **CUDA requirements**: CUDA 11.8+ or 12.1+ compatible with the installed PyTorch version.
- **RAM recommendation**: Minimum 8GB CPU RAM.
- **Disk requirements**: ~100MB for model weights and scaler.

## Installation

1. **Create and activate environment:**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. **Install dependencies:**
   Install required packages from `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

## Model Files
Ensure the following files are available before starting inference:
- `models/image_only_wear/model.pt`: The trained PyTorch model weights.
- `models/image_only_wear/target_scaler.pkl`: The StandardScaler object for inverse-transforming predictions.
- `models/image_only_wear/model_metadata.json`: The metadata containing configurations and performance characteristics.

## Inference Example
Here is a minimal Python example for end-to-end inference:

```python
from pathlib import Path
from src.inference.pipeline import UnifiedWearPipeline

# Initialize the pipeline (automatically loads model and scaler)
pipeline = UnifiedWearPipeline(image_model_path="models/image_only_wear/model.pt")

# Predict on an image
image_path = Path("data/extracted/Set17/images/sample.jpg")
result = pipeline.predict(image_input=image_path)

print(f"Predicted wear (um): {result['wear_um']}")
print(f"Health Status: {result['health']}")
print(f"Mode: {result['mode']}")
```

## API Contract
The inference output adheres to the following JSON schema:
```json
{
    "wear_um": 120.5,
    "health": "HEALTHY",
    "mode": "image_only",
    "warnings": [
        "IMAGE_ONLY_FALLBACK: Using the image-only fallback model..."
    ],
    "tool_health_metadata": {
        "wear_um": 120.5,
        "health_status": "HEALTHY",
        "recommended_action": "None",
        "note": "Thresholds are unvalidated placeholders."
    }
}
```

## Error Handling
- **Missing Image**: A `FileNotFoundError` or PIL exception will be raised if the image path is invalid.
- **Invalid Image**: `ValueError` will be raised if the input type is unsupported.
- **Missing Model**: The pipeline expects `model.pt` at the given path; an exception will be raised otherwise.
- **Missing Scaler**: If `target_scaler.pkl` is missing, the code gracefully returns the raw prediction but this will drastically reduce accuracy (unscaled values). Ensure the scaler is deployed alongside the model.
- **CUDA Unavailable**: The inference code automatically falls back to CPU if CUDA is unavailable, but latency will be significantly higher.

## Multimodal Integration
If real sensor data is available, it can be passed via:
`pipeline.predict(image_input=img, sensor_data=sensor_data)`
*Note*: Multimodal integration is currently a placeholder. When fully implemented, it will route through Path A. **DO NOT generate fake sensor data.** If real sensor data is not available, leave it as `None` to use the image-only fallback.
