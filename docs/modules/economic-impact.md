# Model 7: Economic Impact & Cost Dashboard

## 1. Module Overview
The **Economic Impact Engine** computes industrial cost metrics, downtime financial losses, and predictive ROI savings derived from avoiding unplanned CNC spindle stoppages. All calculations are governed by user-configurable plant rates stored in SQLite.

---

## 2. Mathematical Formulation & Financial Logic

### A. Estimated Downtime Loss
$$\text{Cost}_{\text{Downtime}} = \sum (\text{Duration}_{\text{hours}}) \times \text{Rate}_{\text{Downtime/hr}}$$
- Calculated over both planned maintenance and emergency stoppages recorded in the database.

### B. Estimated Potential Savings from Avoided Stoppages
$$\text{Savings}_{\text{Avoided}} = \text{Hours}_{\text{Avoided}} \times \text{Rate}_{\text{Downtime/hr}}$$
- Where $\text{Hours}_{\text{Avoided}} = \text{Count}_{\text{Planned Replacements}} \times (\text{Duration}_{\text{Unplanned}} - \text{Duration}_{\text{Planned}})$.

### C. Tool Replenishment Base Value
$$\text{Value}_{\text{Inventory}} = N_{\text{Active Tools}} \times \text{Cost}_{\text{Tool Replacement}}$$

---

## 3. Data Provenance & Metric Integrity
All metrics presented in the UI and API explicitly carry one of three data provenance flags:
- `ACTUAL`: Quantified from completed historical maintenance work orders and logged technician hours.
- `ESTIMATED`: Calculated using configurable plant operating cost parameters and predictive replacement deltas.
- `SIMULATED`: Generated for hypothetical parameter sensitivity testing.

---

## 4. REST API Endpoints
- `GET /api/v1/economics/summary`: Retrieves comprehensive financial summary, tool-level cost allocations, and weekly trends.
- `GET /api/v1/economics/parameters`: Retrieves current plant cost rates.
- `PUT /api/v1/economics/parameters`: Updates plant cost rates in SQLite.
