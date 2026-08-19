# Model 10: Automatic Process Parameter Optimization

## 1. Model Overview
- **Model Name**: Constrained Process Parameter Recommendation Engine
- **Identifier**: `model-10`
- **Architecture**: Empirical Scoring Engine (`Phase10.6`) with Normalized Pareto Wear-Productivity Tradeoff Heuristics
- **Purpose**: Evaluates and recommends optimal CNC cutting process parameters (Spindle Speed $n$, Feed per tooth $f_z$, Axial Depth of Cut $A_p$) based on current tool wear state, configured manufacturing objective, and strict physical operating constraints.
- **Safety Paradigm**: **Decision-Support Only**. The engine provides authorized recommendations requiring human engineer approval; it does not directly control machine actuators.

---

## 2. Model Location & Artifacts
- **Primary Serialized Artifact**: `models/process_parameter_optimization/constrained_recommender.pkl`
- **PyTorch Serialized Copies**: `models/process_parameter_optimization/constrained_recommender.pt`, `constrained_recommender.pth`
- **Source Module**: `backend/services/process_optimization_service.py`
- **API Endpoint**: `POST /api/v1/process-optimization/optimize`

---

## 3. Supported Process Parameters (Inputs)

| Parameter | Symbol | Unit | Valid Domain / Bounds | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Spindle Speed** | $n$ | $\text{RPM}$ | $2547.0 - 3705.0$ | Rotational spindle velocity |
| **Feed per Tooth** | $f_z$ | $\text{mm/tooth}$ | $0.030 - 0.080$ | Linear tool feed advance per cutter edge |
| **Depth of Cut** | $A_p$ | $\text{mm}$ | $0.5 - 1.0$ | Axial cutting engagement depth |
| **Tool Identifier** | `tool_id` | String | Supported Carbide Inserts | Active cutting tool identifier |
| **Machine Station** | `machine_id` | String | `CNC-LATHE-01`, `CNC-MILL-02`, etc. | Target machine station |
| **Workpiece Material** | `material` | String | `CK45 / Alloy Steel`, `RVS304`, `AISI 1045` | Material being machined |
| **Current Tool Flank Wear**| `wear_um` | $\mu\text{m}$ | $0.0 - 300.0$ | Measured flank wear VB from Model 2 / Model 3 |

---

## 4. Optimization Objectives

The engine supports 3 distinct objective formulations via weighting parameters:

### 1. `MAXIMIZE_TOOL_LIFE` / `MINIMIZE_WEAR`
- **Weighting**: $w_{\text{life}} = 0.90, w_{\text{prod}} = 0.10$
- **Goal**: Minimizes instantaneous empirical flank wear progression rate ($\mu\text{m}/\text{cycle}$) to extend tool life.

### 2. `MAXIMIZE_PRODUCTIVITY`
- **Weighting**: $w_{\text{prod}} = 0.90, w_{\text{life}} = 0.10$
- **Goal**: Maximizes Material Removal Rate ($MRR = n \times f_z \times A_p$) to achieve fastest cycle throughput.

### 3. `BALANCED` (Pareto Tradeoff)
- **Weighting**: $w_{\text{prod}} = 0.50, w_{\text{life}} = 0.50$
- **Goal**: Optimal balanced operation trade-off between wear preservation and throughput.

---

## 5. Scoring & Ranking Algorithm

For all feasible candidate configurations $C_i = (n_i, f_{z,i}, A_{p,i})$:

1. **Productivity Metric (MRR Proxy)**:
   $$\text{MRR}_i = n_i \times f_{z,i} \times A_{p,i}$$

2. **Empirical Wear Metric**:
   $$\text{WearRate}_i = \text{mean\_wear\_rate}(C_i) \quad [\mu\text{m}/\text{cycle}]$$

3. **Min-Max Normalization ($0.0$ to $1.0$)**:
   $$\text{NormProd}_i = \frac{\text{MRR}_i - \text{MRR}_{\min}}{\text{MRR}_{\max} - \text{MRR}_{\min}}$$
   $$\text{NormLife}_i = 1.0 - \left(\frac{\text{WearRate}_i - \text{WearRate}_{\min}}{\text{WearRate}_{\max} - \text{WearRate}_{\min}}\right)$$

4. **Composite Heuristic Score**:
   $$\text{Score}_i = (w_{\text{prod}} \times \text{NormProd}_i) + (w_{\text{life}} \times \text{NormLife}_i)$$

The candidate with the highest composite heuristic score is selected as the primary recommendation.

---

## 6. Constraints & Safety Checks
1. **Physical Parameter Bounds**: Requests outside reasonable engineering ranges ($1000 \le n \le 10000$, $0.01 \le f_z \le 0.5$, $0.1 \le A_p \le 5.0$) are rejected with a descriptive validation error.
2. **Tool Compatibility Filter**: Only supported carbide cutting inserts are processed; unsupported tooling (e.g. non-carbide drills) returns a clear compatibility rejection.
3. **Projected Wear Threshold**: Candidates whose 20-cycle projected wear $(\text{current\_wear} + \text{WearRate}_i \times 20)$ exceeds safety boundaries ($320\,\mu\text{m}$) are pruned from the feasible set.

---

## 7. Expected Impact Calculation
- **Estimated Wear Rate Reduction**:
  $$\Delta \text{Wear Rate} (\%) = \frac{\text{WearRate}_{\text{current}} - \text{WearRate}_{\text{recommended}}}{\text{WearRate}_{\text{current}}} \times 100$$
- **Estimated Throughput Change**:
  $$\Delta \text{MRR} (\%) = \frac{\text{MRR}_{\text{recommended}} - \text{MRR}_{\text{current}}}{\text{MRR}_{\text{current}}} \times 100$$
- **Projected Cycles to EOL ($300\,\mu\text{m}$)**:
  $$\text{RUL}_{\text{cycles}} = \frac{300 - \text{current\_wear\_um}}{\text{WearRate}}$$

---

## 8. API Specification

### `POST /api/v1/process-optimization/optimize`

**Request Body**:
```json
{
  "tool_id": "TL-CNMG-120408",
  "machine_id": "CNC-LATHE-01",
  "material": "CK45 / Alloy Steel",
  "objective": "MAXIMIZE_TOOL_LIFE",
  "parameters": {
    "n": 3184.0,
    "fz": 0.050,
    "Ap": 1.0
  }
}
```

**Response Body**:
```json
{
  "success": true,
  "optimization_id": "OPT-202608191028-A1B2",
  "timestamp": "2026-08-19T10:28:00.000Z",
  "tool_id": "TL-CNMG-120408",
  "machine_id": "CNC-LATHE-01",
  "material": "CK45 / Alloy Steel",
  "objective": "MAXIMIZE_TOOL_LIFE",
  "current_parameters": { "n": 3184.0, "fz": 0.050, "Ap": 1.0 },
  "recommended_parameters": { "n": 3705.0, "fz": 0.045, "Ap": 1.0 },
  "expected_impact": {
    "current_wear_rate_um_per_cycle": 2.5539,
    "recommended_wear_rate_um_per_cycle": 0.1888,
    "estimated_wear_reduction_percent": 92.6,
    "current_mrr": 159.2,
    "recommended_mrr": 166.72,
    "estimated_mrr_change_percent": 4.7,
    "current_projected_rul_cycles": 70,
    "recommended_projected_rul_cycles": 953,
    "estimated_cycle_life_gain": 883,
    "provenance": "EMPIRICAL_PARETO_OPTIMIZATION"
  },
  "optimization_score": 0.9736,
  "ranked_candidates_count": 14,
  "explanation": "To maximize tool life, the empirical optimizer selected regime n=3705.0 RPM, fz=0.045 mm/tooth, Ap=1.0 mm...",
  "status": "RECOMMENDATION_GENERATED",
  "safety_notice": "AI Recommendation — Engineer Approval Required. Does not automatically control CNC hardware."
}
```

---

## 9. SQLite Database Schema

Optimizations are audited in the `process_optimizations` table:
```sql
CREATE TABLE process_optimizations (
    id INTEGER PRIMARY KEY,
    optimization_id VARCHAR(50) UNIQUE NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    tool_id VARCHAR(50) NOT NULL,
    tool_name VARCHAR(100),
    machine_id VARCHAR(50),
    material VARCHAR(100),
    objective VARCHAR(50),
    current_parameters TEXT NOT NULL,
    recommended_parameters TEXT NOT NULL,
    expected_impact TEXT,
    optimization_score FLOAT,
    status VARCHAR(50),
    explanation TEXT,
    approved_by_operator BOOLEAN DEFAULT 0,
    applied BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
