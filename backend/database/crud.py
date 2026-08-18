import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database.models import (
    Tool,
    InspectionRecord,
    AlertRecord,
    OperatorRecord,
    ToolPersonEvent,
    Machine,
    User,
    MaintenanceEvent,
    DowntimeEvent,
    EconomicParameters,
)
from backend.core.database import engine, Base

def init_db():
    """Create all SQLite tables and seed default machines, tools, operators, and economic parameters."""
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate SQLite columns if table was created in an earlier session
    from sqlalchemy import text
    with engine.connect() as conn:
        # Check tools table columns
        for col, ctype in [
            ("current_rul_cycles", "FLOAT"),
            ("current_wear_rate", "FLOAT"),
            ("manufacturer", "VARCHAR(100)"),
            ("part_number", "VARCHAR(100)"),
            ("workpiece_material", "VARCHAR(100)"),
            ("initial_condition", "VARCHAR(50)"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE tools ADD COLUMN {col} {ctype}"))
            except Exception:
                pass

        # Check inspections table columns
        for col_name, col_type in [
            ("rul_cycles", "FLOAT"),
            ("rul_wear_rate", "FLOAT"),
            ("rul_status", "VARCHAR(50)"),
            ("rul_unit", "VARCHAR(20)"),
            ("rul_model", "VARCHAR(50)"),
            ("tool_eligibility", "VARCHAR(50)"),
            ("wear_model_version", "VARCHAR(100)"),
            ("rpm", "FLOAT"),
            ("feed_rate", "FLOAT"),
            ("depth_of_cut", "FLOAT"),
            ("temperature", "FLOAT"),
            ("vibration", "FLOAT"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE inspections ADD COLUMN {col_name} {col_type}"))
            except Exception:
                pass
        conn.commit()
    
    with Session(engine) as session:
        # 1. Seed Economic Parameters
        if not session.query(EconomicParameters).first():
            econ = EconomicParameters(
                tool_replacement_cost=1200.0,
                machine_operating_cost_per_hour=1500.0,
                downtime_cost_per_hour=4500.0,
                maintenance_labor_cost_per_hour=600.0,
                average_unplanned_downtime_hours=3.0,
                planned_replacement_hours=0.5,
                production_value_per_hour=8000.0,
                currency_symbol="₹",
            )
            session.add(econ)
            session.commit()

        # 2. Seed default machines
        if not session.query(Machine).first():
            m1 = Machine(machine_id="CNC-LATHE-01", name="CNC Lathe 01 (Monarch)", type="Turning Center", status="ONLINE", location="Bay A - Precision Turning", operating_hours=1420.5)
            m2 = Machine(machine_id="CNC-MILL-02", name="5-Axis CNC Mill (DMG MORI)", type="Milling Center", status="ONLINE", location="Bay B - Multi-Axis Milling", operating_hours=980.0)
            m3 = Machine(machine_id="CNC-LATHE-03", name="Heavy Duty Lathe (Okuma)", type="Heavy Turning", status="IDLE", location="Bay A - Heavy Turning", operating_hours=2150.0)
            session.add_all([m1, m2, m3])
            session.commit()
            
        # 3. Seed default tools if none exist
        if not session.query(Tool).first():
            seed_tools = [
                Tool(
                    tool_id="TL-CNMG-120408",
                    tool_name="Turning Insert (CNMG-120408)",
                    tool_type="Carbide Turning Insert",
                    insert_shape="Rhombic 80°",
                    material="Tungsten Carbide (WC-Co)",
                    coating="TiCN + Al2O3 + TiN (CVD)",
                    manufacturer="Sandvik Coromant",
                    part_number="CNMG 12 04 08-PM",
                    workpiece_material="CK45 / Alloy Steel",
                    initial_condition="NEW",
                    machine_id="CNC-LATHE-01",
                    assigned_operator="Rahul",
                    status="HEALTHY",
                    current_wear_um=45.2,
                    current_wear_vb_mm=0.045,
                    current_rul_cycles=180.0,
                    current_wear_rate=0.45,
                    total_inspections=6,
                ),
                Tool(
                    tool_id="TL-WNMG-080408",
                    tool_name="Roughing Insert (WNMG-080408)",
                    tool_type="Trigon Turning Insert",
                    insert_shape="Trigon 80°",
                    material="Micrograin Carbide",
                    coating="AlTiN (PVD)",
                    manufacturer="Kennametal",
                    part_number="WNMG 08 04 08-RP",
                    workpiece_material="RVS304 / Stainless Steel",
                    initial_condition="NEW",
                    machine_id="CNC-LATHE-01",
                    assigned_operator="Operator 02",
                    status="WARNING",
                    current_wear_um=182.0,
                    current_wear_vb_mm=0.182,
                    current_rul_cycles=42.0,
                    current_wear_rate=0.82,
                    total_inspections=8,
                ),
                Tool(
                    tool_id="TL-DNMG-150608",
                    tool_name="Finishing Insert (DNMG-150608)",
                    tool_type="Diamond Turning Insert",
                    insert_shape="Rhombic 55°",
                    material="Cermet",
                    coating="TiAlN",
                    manufacturer="Iscar",
                    part_number="DNMG 15 06 08-NF",
                    workpiece_material="CK45 / Alloy Steel",
                    initial_condition="NEW",
                    machine_id="CNC-MILL-02",
                    assigned_operator="Rahul",
                    status="HEALTHY",
                    current_wear_um=32.1,
                    current_wear_vb_mm=0.032,
                    current_rul_cycles=240.0,
                    current_wear_rate=0.28,
                    total_inspections=4,
                ),
                Tool(
                    tool_id="TL-VBMT-160404",
                    tool_name="Profiling Insert (VBMT-160404)",
                    tool_type="Profiling Carbide Insert",
                    insert_shape="Rhombic 35°",
                    material="Tungsten Carbide (WC-Co)",
                    coating="TiAlN + TiN (PVD)",
                    manufacturer="Seco Tools",
                    part_number="VBMT 16 04 04-F1",
                    workpiece_material="Titanium Ti-6Al-4V",
                    initial_condition="NEW",
                    machine_id="CNC-LATHE-03",
                    assigned_operator="Priya",
                    status="CRITICAL",
                    current_wear_um=268.5,
                    current_wear_vb_mm=0.268,
                    current_rul_cycles=12.0,
                    current_wear_rate=1.15,
                    total_inspections=10,
                ),
            ]
            session.add_all(seed_tools)
            session.commit()

        # 4. Seed default operators if none exist
        if not session.query(OperatorRecord).first():
            op1 = OperatorRecord(operator_id="OP-001", name="Rahul", status="ACTIVE")
            op2 = OperatorRecord(operator_id="OP-002", name="Priya", status="ACTIVE")
            session.add_all([op1, op2])
            session.commit()

        # 5. Seed default maintenance and downtime events if none exist
        if not session.query(MaintenanceEvent).first():
            now = datetime.datetime.utcnow()
            m_events = [
                MaintenanceEvent(
                    event_id="MAINT-001",
                    machine_id="CNC-LATHE-01",
                    tool_id="TL-CNMG-120408",
                    maintenance_type="PREVENTIVE",
                    start_time=now - datetime.timedelta(days=7),
                    end_time=now - datetime.timedelta(days=7, hours=-1),
                    duration_hours=0.5,
                    cost=1500.0,
                    performed_by="Rahul",
                    notes="Scheduled visual inspection and holder clamping calibration."
                ),
                MaintenanceEvent(
                    event_id="MAINT-002",
                    machine_id="CNC-MILL-02",
                    tool_id="TL-DNMG-150608",
                    maintenance_type="TOOL_REPLACEMENT",
                    start_time=now - datetime.timedelta(days=3),
                    end_time=now - datetime.timedelta(days=3, hours=-1),
                    duration_hours=0.4,
                    cost=1800.0,
                    performed_by="Priya",
                    notes="Scheduled tool insert index rotation."
                ),
            ]
            session.add_all(m_events)
            session.commit()

        if not session.query(DowntimeEvent).first():
            now = datetime.datetime.utcnow()
            d_events = [
                DowntimeEvent(
                    downtime_id="DT-001",
                    machine_id="CNC-LATHE-01",
                    tool_id="TL-WNMG-080408",
                    cause="Planned Tool Replacement (RUL Warning Pre-empted)",
                    is_unplanned=False,
                    start_time=now - datetime.timedelta(days=5),
                    end_time=now - datetime.timedelta(days=5, hours=-0.5),
                    duration_hours=0.5,
                    cost_per_hour=4500.0,
                    total_loss=2250.0,
                    estimated_avoided_hours=2.5,
                ),
                DowntimeEvent(
                    downtime_id="DT-002",
                    machine_id="CNC-LATHE-03",
                    tool_id="TL-VBMT-160404",
                    cause="Unplanned Tool Chipping / Chatter",
                    is_unplanned=True,
                    start_time=now - datetime.timedelta(days=2),
                    end_time=now - datetime.timedelta(days=2, hours=-2.2),
                    duration_hours=2.2,
                    cost_per_hour=4500.0,
                    total_loss=9900.0,
                    estimated_avoided_hours=0.0,
                ),
            ]
            session.add_all(d_events)
            session.commit()

# --- Tool CRUD ---
def get_tools(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Tool).offset(skip).limit(limit).all()

def get_tool_by_id(db: Session, tool_id: str):
    return db.query(Tool).filter(Tool.tool_id == tool_id).first()

def create_tool(db: Session, tool_data: dict):
    tool = Tool(**tool_data)
    db.add(tool)
    db.commit()
    db.refresh(tool)
    return tool

def update_tool(db: Session, tool_id: str, tool_data: dict):
    tool = get_tool_by_id(db, tool_id)
    if tool:
        for k, v in tool_data.items():
            if hasattr(tool, k) and v is not None:
                setattr(tool, k, v)
        tool.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(tool)
    return tool

def update_tool_wear(
    db: Session,
    tool_id: str,
    wear_um: float,
    wear_vb_mm: float,
    status: str,
    rul_cycles: Optional[float] = None,
    wear_rate: Optional[float] = None
):
    tool = get_tool_by_id(db, tool_id)
    if tool:
        tool.current_wear_um = wear_um
        tool.current_wear_vb_mm = wear_vb_mm
        tool.status = status
        if rul_cycles is not None:
            tool.current_rul_cycles = rul_cycles
        if wear_rate is not None:
            tool.current_wear_rate = wear_rate
        tool.total_inspections += 1
        tool.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(tool)
    return tool

def delete_tool(db: Session, tool_id: str):
    tool = get_tool_by_id(db, tool_id)
    if tool:
        db.delete(tool)
        db.commit()
        return True
    return False

# --- Inspection CRUD ---
def create_inspection_record(db: Session, inspection_data: dict):
    rec = InspectionRecord(**inspection_data)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec

def get_inspection_records(db: Session, skip: int = 0, limit: int = 50, tool_id: Optional[str] = None):
    q = db.query(InspectionRecord)
    if tool_id:
        q = q.filter(InspectionRecord.tool_id == tool_id)
    return q.order_by(InspectionRecord.timestamp.desc()).offset(skip).limit(limit).all()

def get_inspections(db: Session, skip: int = 0, limit: int = 50):
    return get_inspection_records(db, skip, limit)

def get_inspection_by_id(db: Session, inspection_id: str):
    return db.query(InspectionRecord).filter(InspectionRecord.inspection_id == inspection_id).first()

def get_inspection_count(db: Session, tool_id: Optional[str] = None):
    q = db.query(InspectionRecord)
    if tool_id:
        q = q.filter(InspectionRecord.tool_id == tool_id)
    return q.count()

# --- Tool Person Event CRUD ---
def create_tool_person_event(db: Session, event_data: dict):
    event = ToolPersonEvent(**event_data)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def get_recent_tool_person_events(db: Session, limit: int = 20):
    return db.query(ToolPersonEvent).order_by(ToolPersonEvent.timestamp.desc()).limit(limit).all()

# --- Alert CRUD ---
def create_alert(db: Session, alert_data: dict):
    alert = AlertRecord(**alert_data)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

def get_alerts(db: Session, acknowledged: bool = None, limit: int = 50):
    query = db.query(AlertRecord).order_by(AlertRecord.timestamp.desc())
    if acknowledged is not None:
        query = query.filter(AlertRecord.is_acknowledged == acknowledged)
    return query.limit(limit).all()

def acknowledge_alert(db: Session, alert_id: str):
    alert = db.query(AlertRecord).filter(AlertRecord.alert_id == alert_id).first()
    if alert:
        alert.is_acknowledged = True
        db.commit()
        db.refresh(alert)
    return alert

# --- Operator CRUD ---
def get_operators(db: Session):
    return db.query(OperatorRecord).all()

def get_operator_by_id(db: Session, operator_id: str):
    return db.query(OperatorRecord).filter(OperatorRecord.operator_id == operator_id).first()

def create_operator(db: Session, operator_id: str, name: str, photo_path: str = None):
    op = OperatorRecord(operator_id=operator_id, name=name, photo_path=photo_path)
    db.add(op)
    db.commit()
    db.refresh(op)
    return op

# --- Machine CRUD ---
def get_machines(db: Session):
    return db.query(Machine).all()

def get_machine_by_id(db: Session, machine_id: str):
    return db.query(Machine).filter(Machine.machine_id == machine_id).first()

# --- Maintenance CRUD ---
def get_maintenance_events(db: Session, limit: int = 50):
    return db.query(MaintenanceEvent).order_by(MaintenanceEvent.start_time.desc()).limit(limit).all()

def create_maintenance_event(db: Session, event_data: dict):
    m = MaintenanceEvent(**event_data)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

# --- Downtime CRUD ---
def get_downtime_events(db: Session, limit: int = 50):
    return db.query(DowntimeEvent).order_by(DowntimeEvent.start_time.desc()).limit(limit).all()

def create_downtime_event(db: Session, event_data: dict):
    d = DowntimeEvent(**event_data)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d

# --- Economic Parameters CRUD ---
def get_economic_parameters(db: Session) -> EconomicParameters:
    param = db.query(EconomicParameters).first()
    if not param:
        param = EconomicParameters()
        db.add(param)
        db.commit()
        db.refresh(param)
    return param

def update_economic_parameters(db: Session, param_data: dict) -> EconomicParameters:
    param = get_economic_parameters(db)
    for k, v in param_data.items():
        if hasattr(param, k) and v is not None:
            setattr(param, k, v)
    param.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(param)
    return param

