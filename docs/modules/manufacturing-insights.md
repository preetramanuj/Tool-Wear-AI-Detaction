# Model 5: Manufacturing Insights Engine

## 1. Module Overview
The **Manufacturing Insights Engine** performs automated data-driven analysis across the entire fleet of CNC machine cells and active cutting tool inserts recorded in SQLite. It evaluates wear rates, detects degradation acceleration, highlights cross-machine wear variances, and automatically ranks candidate tools requiring immediate maintenance attention.

---

## 2. Analytical Capabilities
1. **Wear Acceleration Detection ($\Delta\text{wear}/\Delta\text{cycles}$)**:
   - Tracks the progression slope across consecutive tool inspection cycles.
   - If $\Delta\text{wear}_{\text{recent}} > 1.3 \times \Delta\text{wear}_{\text{previous}}$ and $\Delta\text{wear} > 15\,\mu\text{m}$, triggers a `WEAR_ACCELERATION` warning.
2. **Maintenance Candidate Prioritization**:
   - Aggregates tools with $VB \ge 0.22\,\text{mm}$ or $\text{RUL} \le 45\text{ cycles}$.
   - Sorts candidates with critical wear or imminent EOL to the top of the queue.
3. **Cross-Machine Comparative Variance**:
   - Compares the mean tool wear and inspection frequency between machine cells (e.g. `CNC-LATHE-01` vs `CNC-MILL-02`).
   - Identifies machine cells experiencing disproportionate thermal or mechanical stress.
4. **Data Sufficiency Handling**:
   - Returns a structured `has_sufficient_data: false` message with zero fallback hallucinations when no inspection history exists.

---

## 3. REST API Endpoints
- `GET /api/v1/insights/summary`: Full facility overview report including KPIs, active insights, maintenance candidates, and machine comparisons.
- `GET /api/v1/insights/candidates`: Filtered list of tools exceeding maintenance trigger thresholds.
