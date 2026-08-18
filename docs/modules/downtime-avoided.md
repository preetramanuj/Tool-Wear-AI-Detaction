# Model 8: Machine Downtime Avoidance Engine

## 1. Module Overview
The **Machine Downtime Avoidance Engine** tracks CNC machine availability, distinguishes between planned preventive tool changeouts and unscheduled catastrophic tool breakage stoppages, and calculates the total production downtime saved through predictive tool intervention.

---

## 2. Core Metrics & Avoidance Accounting
- **Total Plant Downtime**: Sum of all planned servicing windows and unplanned stoppage hours across CNC cells.
- **Estimated Downtime Avoided**: Hours of production stoppage prevented by replacing cutting inserts during scheduled setup intervals rather than allowing emergency in-cut failure ($3.0\,\text{hr}$ emergency clearing vs $0.5\,\text{hr}$ planned insert swap $= 2.5\,\text{hr}$ avoided per intervention).
- **Machine Cell Breakdown**: Downtime hours, incident count, and financial losses attributed to each physical CNC station (`CNC-LATHE-01`, `CNC-MILL-02`, etc.).

---

## 3. REST API Endpoints
- `GET /api/v1/downtime/summary`: Retrieves plant-level downtime hours, machine breakdown, avoided hours, and historical stoppage events.
- `POST /api/v1/downtime/events`: Records a new planned maintenance or unplanned stoppage event into SQLite.
