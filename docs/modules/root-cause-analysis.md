# Model 9: AI-Based Root Cause & Feature Contribution Diagnostics

## 1. Module Overview
The **AI Root Cause & Feature Contribution Engine** isolates the primary machining parameters and sensor channels associated with abnormal cutting tool wear. It compares real-time process telemetry (cutting zone temperature, spindle vibration, feed velocity, and spindle speed) against nominal baselines to rank the statistical drivers of tool degradation.

---

## 2. Statistical Feature Contribution Ranking
For any inspected tool insert or inspection record, the engine computes:
1. **Parameter Deviation**: Percentage difference from nominal cutting baselines:
   $$\Delta_{\text{param}} = \frac{\text{Observed} - \text{Nominal}}{\text{Nominal}} \times 100\%$$
2. **Feature Importance Weighting**: Combines parameter deviation with gradient-boosted tree importance weights.
3. **Relative Contribution Score**: Normalizes factor importance across active telemetry channels to provide a $100\%$ relative contribution breakdown.

---

## 3. Engineering Transparency & Non-Causal Disclaimers
The engine explicitly adheres to scientific integrity guidelines:
- Outputs reflect statistical model feature importances and operational deviations from nominal baselines.
- The system explicitly avoids asserting guaranteed physical causality without controlled laboratory experiments.

---

## 4. REST API Endpoints
- `GET /api/v1/root-cause/analyze?tool_id=TL-CNMG-120408`: Executes feature contribution ranking for a selected tool or inspection ID.
