import datetime
from sqlalchemy.orm import Session
from backend.database.models import Tool, InspectionRecord, AlertRecord, OperatorRecord, ToolPersonEvent, Machine, User
from backend.core.database import engine, Base

def init_db():
    """Create all SQLite tables and seed default machines, tools and operators."""
    Base.metadata.create_all(bind=engine)
    
    with Session(engine) as session:
        # Seed default machines
        if not session.query(Machine).first():
            m1 = Machine(machine_id="CNC-LATHE-01", name="CNC Lathe 01", type="Turning Center", status="ONLINE")
            m2 = Machine(machine_id="CNC-MILL-02", name="5-Axis CNC Mill", type="Milling Center", status="ONLINE")
            session.add_all([m1, m2])
            session.commit()
            
        # Seed default tools if none exist
        if not session.query(Tool).first():
            seed_tools = [
                Tool(
                    tool_id="TL-CNMG-120408",
                    tool_name="Turning Insert (CNMG-120408)",
                    tool_type="Carbide Turning Insert",
                    insert_shape="Rhombic 80°",
                    material="Tungsten Carbide (WC-Co)",
                    coating="TiCN + Al2O3 + TiN (CVD)",
                    machine_id="CNC-LATHE-01",
                    assigned_operator="Rahul",
                    status="HEALTHY",
                    current_wear_um=45.2,
                    current_wear_vb_mm=0.045,
                    total_inspections=0,
                ),
                Tool(
                    tool_id="TL-WNMG-080408",
                    tool_name="Roughing Insert (WNMG-080408)",
                    tool_type="Trigon Turning Insert",
                    insert_shape="Trigon 80°",
                    material="Micrograin Carbide",
                    coating="AlTiN (PVD)",
                    machine_id="CNC-LATHE-01",
                    assigned_operator="Operator 02",
                    status="WARNING",
                    current_wear_um=165.0,
                    current_wear_vb_mm=0.165,
                    total_inspections=0,
                ),
                Tool(
                    tool_id="TL-DNMG-150608",
                    tool_name="Finishing Insert (DNMG-150608)",
                    tool_type="Diamond Turning Insert",
                    insert_shape="Rhombic 55°",
                    material="Cermet",
                    coating="TiAlN",
                    machine_id="CNC-MILL-02",
                    assigned_operator="Rahul",
                    status="HEALTHY",
                    current_wear_um=32.1,
                    current_wear_vb_mm=0.032,
                    total_inspections=0,
                ),
            ]
            session.add_all(seed_tools)
            session.commit()

        # Seed default operators if none exist
        if not session.query(OperatorRecord).first():
            op1 = OperatorRecord(operator_id="OP-001", name="Rahul", status="ACTIVE")
            op2 = OperatorRecord(operator_id="OP-002", name="Priya", status="ACTIVE")
            session.add_all([op1, op2])
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

def update_tool_wear(db: Session, tool_id: str, wear_um: float, wear_vb_mm: float, status: str):
    tool = get_tool_by_id(db, tool_id)
    if tool:
        tool.current_wear_um = wear_um
        tool.current_wear_vb_mm = wear_vb_mm
        tool.status = status
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

def get_inspection_records(db: Session, skip: int = 0, limit: int = 50):
    return db.query(InspectionRecord).order_by(InspectionRecord.timestamp.desc()).offset(skip).limit(limit).all()

def get_inspections(db: Session, skip: int = 0, limit: int = 50):
    return get_inspection_records(db, skip, limit)

def get_inspection_by_id(db: Session, inspection_id: str):
    return db.query(InspectionRecord).filter(InspectionRecord.inspection_id == inspection_id).first()

def get_inspection_count(db: Session):
    return db.query(InspectionRecord).count()

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
