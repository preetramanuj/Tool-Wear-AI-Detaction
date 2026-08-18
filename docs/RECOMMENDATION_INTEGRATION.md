# ToolGuard-AI Recommendation Integration Guide

## Purpose
This guide defines the interface and boundaries for backend integration of the ToolGuard-AI Parameter Recommendation System.

## What the Recommender Does
- Evaluates experimentally observed parameter configurations against current tool state constraints.
- Recommends the safest, highest-scoring *historically observed* parameter combination (`n`, `fz`, `Ap`).
- Fallbacks gracefully when no safe candidates exist.

## What it Does NOT Do
- **It does NOT predict arbitrary or unseen parameters.** It will not generate new fractional spindle speeds or feeds that do not exist in the training data.
- **It does NOT train or run Machine Learning models.** The recommendations are built on exact historical empirical averages.
- **It does NOT claim causal optimization.** It identifies what historically performed well given similar constraints, without proving causality.

## Input Contract
The backend must instantiate `ParameterRecommender` (from `src.recommendation.recommender`) and call `.recommend(current_state, current_material, current_coating)`.

| Argument | Type | Optional | Description |
|---|---|---|---|
| `current_state` | `dict` | No | Tool state metrics, e.g. `{"current_wear_um": 50.5}` |
| `current_material` | `int` | Yes | Target material identifier. None implies no filter. |
| `current_coating` | `int` | Yes | Target coating identifier. None implies no filter. |

## Output Contract
The response is a Python dictionary containing:
- `status`: String, either `"RECOMMENDATION_GENERATED"` or `"NO_RECOMMENDATION"`.
- `recommendation`: Dict containing `n`, `fz`, `Ap` (if generated).
- `expected_wear_rate`: Float (if generated).
- `productivity_metric`: Float (if generated).
- `reason`: String explanation (if no recommendation generated).

## Parameter Units
- **`current_wear_um`**: Micrometers (µm)
- **`n` (Spindle Speed)**: RPM
- **`fz` (Feed per Tooth)**: mm/tooth
- **`Ap` (Depth of Cut)**: mm
- **`expected_wear_rate`**: µm/cycle

## Observed-Configuration Policy
This system is an **OBSERVED_CONFIGURATION_RECOMMENDER**. The configurations checked are strictly bounded to the 14 configurations represented in the validated historical datasets.

## Set 1 Handling
Dataset `Set 1` lacks `n` and `fz` parameters entirely. As a strict policy, no candidates are generated from `Set 1`. It remains explicitly excluded from parameter recommendation logic.

## Safety Rules
1. **Constraint First**: A configuration is disqualified if the predicted end-of-cycle wear exceeds the maximum allowed wear threshold (defined in `recommendation_config.json`).
2. **Score Neutral**: A very high productivity score will *never* override an RUL violation or safety limit.

## Error Handling & No-Recommendation Behavior
If the system cannot find a safe candidate due to constraints or lack of state information, it returns `{"status": "NO_RECOMMENDATION", "reason": "..."}`. The backend **MUST NOT** substitute arbitrary default parameters; it should alert the user that manual parameter tuning is required.

## Artifact Paths
The recommender requires:
- `configs/recommendation_config.json`
- `data/processed/future_wear_rate_h20.csv` (used by `CandidateGenerator`)
- `results/phase9_configuration_performance.csv` (used for empirical averages)

## Known Limitations
- The system cannot adapt to continuous ranges of parameters.
- It covers ~94.0% of historical decision states. The ~6.0% failure rate reflects cases where either tool wear was too high to safely recommend any known configuration, or historical data was insufficient.
- The productivity metric is a heuristic surrogate (MRR proportional) and not a full economic model.
