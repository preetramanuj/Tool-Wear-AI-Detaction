import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from backend.core.database import Base

class Tool(Base):
    __tablename__ = "tools"
    
    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(String(50), unique=True, index=True, nullable=False)
    tool_name = Column(String(100), default="Standard CNC Insert")
    tool_type = Column(String(100), default="Carbide Insert (CNMG)")
    insert_shape = Column(String(50), default="Rhombic 80°")
    material = Column(String(100), default="Tungsten Carbide (WC-Co)")
    coating = Column(String(100), default="TiCN + Al2O3 + TiN (CVD)")
    machine_id = Column(String(50), default="CNC-LATHE-01")
    assigned_operator = Column(String(100), default="Operator 01")
    status = Column(String(20), default="HEALTHY")  # HEALTHY, WARNING, CRITICAL, RETIRED
    current_wear_um = Column(Float, default=0.0)
    current_wear_vb_mm = Column(Float, default=0.0)
    current_rul_cycles = Column(Float, nullable=True)
    current_wear_rate = Column(Float, nullable=True)
    total_inspections = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class InspectionRecord(Base):
    __tablename__ = "inspections"
    
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(String(50), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    tool_id = Column(String(50), index=True)
    tool_name = Column(String(100), default="Cutting Tool")
    tool_type = Column(String(100), default="Tool type unavailable")
    machine_id = Column(String(50), default="CNC-01")
    operator_id = Column(String(50), default="OP-DEFAULT")
    
    # Model 1 Detection
    tool_detected = Column(Boolean, default=False)
    detection_confidence = Column(Float, default=0.0)
    detection_bbox = Column(String(100))  # JSON array string [x1, y1, x2, y2]
    
    # Model 2 Wear Analysis
    wear_value = Column(Float, default=0.0)  # Flank Wear VB in mm
    wear_area = Column(Float, default=0.0)   # Wear area in mm^2
    wear_status = Column(String(20), default="UNKNOWN")
    
    # Model 3 Health Prediction
    wear_um = Column(Float, default=0.0)     # Wear in micrometers
    health_score = Column(Float, default=0.0) # 0.0 to 1.0
    health_status = Column(String(20), default="UNKNOWN") # HEALTHY, WARNING, CRITICAL
    recommended_action = Column(String(200), default="None")
    
    # Model 6 RUL Prediction (XGBoost)
    rul_cycles = Column(Float, nullable=True)      # Remaining useful life in cycles
    rul_wear_rate = Column(Float, nullable=True)   # Predicted wear rate in um/cycle
    rul_status = Column(String(50), default="UNAVAILABLE") # VALID, EOL_REACHED, UNAVAILABLE
    rul_unit = Column(String(20), default="cycles")
    rul_model = Column(String(50), default="xgb_rul_final")
    
    # Image references
    original_image = Column(String(255))
    annotated_image = Column(String(255))
    cropped_roi = Column(String(255))
    
    # Performance telemetry
    latency_ms = Column(Float, default=0.0)
    device = Column(String(50), default="CPU")


class ToolPersonEvent(Base):
    __tablename__ = "tool_person_events"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    operator_id = Column(String(50), default="UNKNOWN")
    person_label = Column(String(100), default="Unknown Person")
    tool_id = Column(String(50), default="UNKNOWN")
    tool_name = Column(String(100), default="Cutting Tool")
    relationship = Column(String(50), default="NOT_ASSOCIATED")  # HOLDING, NEAR, CARRYING, USING, NOT_ASSOCIATED
    confidence = Column(Float, default=0.0)
    frame_url = Column(String(255), nullable=True)


class Machine(Base):
    __tablename__ = "machines"
    
    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), default="CNC Lathe 01")
    type = Column(String(50), default="Lathe / Turning Center")
    status = Column(String(20), default="ONLINE")  # ONLINE, IDLE, MAINTENANCE


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), default="Maintenance Engineer")
    role = Column(String(20), default="OPERATOR")  # OPERATOR, SUPERVISOR, ADMIN
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AlertRecord(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False)
    alert_type = Column(String(50), default="WEAR_LIMIT")
    severity = Column(String(20), default="WARNING")  # INFO, WARNING, CRITICAL
    tool_id = Column(String(50), nullable=True)
    machine_id = Column(String(50), default="CNC-01")
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    is_acknowledged = Column(Boolean, default=False)


class OperatorRecord(Base):
    __tablename__ = "operators"
    
    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    photo_path = Column(String(255), nullable=True)
    status = Column(String(20), default="ACTIVE")
    registered_at = Column(DateTime, default=datetime.datetime.utcnow)
