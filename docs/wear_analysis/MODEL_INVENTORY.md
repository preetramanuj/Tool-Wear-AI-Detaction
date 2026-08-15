# 🛠️ ToolGuard-AI Model Inventory

| Model Filename | Architecture | Resolution | MAE (Test) | Pearson R | Status |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `final_optimized_384px.pth` | Late-Fusion (EffNet-B0 + RMS) | 384x384 | 0.5046 | 0.938 | **Winner** |
| `exp_b_roi_focused.pth` | Late-Fusion (EffNet-B0 + RMS) | 224x224 | 0.4672 | 0.751 | Experiment |
| `baseline_multimodal.pth` | Intermediate Fusion | 224x224 | 0.6410 | 0.867 | Baseline |
| `exp_a_baseline.pth` | Full Image Late-Fusion | 224x224 | 0.5783 | - | Experiment |
