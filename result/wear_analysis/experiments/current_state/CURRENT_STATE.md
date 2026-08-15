# 🏁 ToolGuard-AI Project: Final Checkpoint & Current State

**Checkpoint Date:** 2024-05-22  
**Status:** ✅ Project Frozen | All Assets Persisted

## 🚀 Winning Configuration Summary
- **Architecture:** Late-Fusion (EfficientNet-B0 Visual Branch + Sensor RMS Branch)
- **Input Resolution:** 384 x 384 pixels
- **Preprocessing:** 2000px Center ROI Crop + ImageNet Normalization
- **Modality:** Multimodal (Vision + Vibration)

## 📊 Performance Benchmarks (Test Set)
- **Mean Absolute Error (MAE):** 0.5046
- **Pearson Correlation (R):** 0.938
- **R² Score:** -0.7689 (Scale offset identified as next calibration target)

## 📂 Physical Asset Manifest (Google Drive)
| Asset Category | Physical Path |
| :--- | :--- |
| **Production Weights** | `/wear_analysis/models/final_optimized_384px.pth` |
| **Modular Source Code** | `/wear_analysis/models/toolwear_model_production.py` |
| **Config Parameters** | `/wear_analysis/models/config_params.json` |
| **Dataset Splits** | `/wear_analysis/metadata/splits/` |
| **Multimodal Index** | `/wear_analysis/metadata/aligned_metadata.csv` |
| **Analysis Metrics** | `/wear_analysis/results/metrics/` |
| **Diagnostic Plots** | `/wear_analysis/results/plots/` |

## 🛠️ Reproducibility Note
To restart analysis, load the `toolwear_model_production.py` script and initialize weights from `final_optimized_384px.pth`. Preprocessing constants are hardcoded in `config_params.json`.