# ToolGuard-AI Constrained Process Parameter Recommendation

## Purpose
This package provides a deterministic, rules-based parameter recommendation engine to optimize machine tool performance while strictly respecting safety limits and Remaining Useful Life (RUL).

## Recommendation Architecture
**This is a Constrained Process Parameter Recommendation system.**
**It does not perform automatic unseen-parameter optimization.**

- **Observed Configuration Policy**: Only experimentally observed and validated configurations (n, fz, Ap) are returned.
- **Constraints**: Enforces static boundaries and rejects inputs that fall outside expected domains.
- **Scoring**: Ranks candidates using a balanced tradeoff between predicted current wear and historical productivity.

## Backend Handoff
Backend integration should utilize the recommender.py entry point. The system expects telemetry inputs that fulfill the required features defined in the recommendation contract. Fabricated configurations will be safely rejected.
