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
    manufacturer = Column(String(100), default="Sandvik Coromant")
    part_number = Column(String(100), default="CNMG 12 04 08-PM")
    workpiece_material = Column(String(100), default="CK45 / Alloy Steel")
    initial_condition = Column(String(50), default="NEW")
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
    
    # Model 1 Detection & Eligibility
    tool_detected = Column(Boolean, default=False)
    tool_eligibility = Column(String(50), default="ELIGIBLE") # ELIGIBLE, UNSUPPORTED, NO_TOOL
    detection_confidence = Column(Float, default=0.0)
    detection_bbox = Column(String(100))  # JSON array string [x1, y1, x2, y2]
    
    # Model 2 Wear Analysis (Phase3B Multimodal Gated Model)
    wear_value = Column(Float, default=0.0)  # Flank Wear VB in mm
    wear_area = Column(Float, default=0.0)   # Wear area in mm^2
    wear_status = Column(String(20), default="UNKNOWN")
    wear_model_version = Column(String(100), default="Phase3B_Gated_v1.0")
    
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
    
    # Machining telemetry (if recorded)
    rpm = Column(Float, nullable=True)
    feed_rate = Column(Float, nullable=True)
    depth_of_cut = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    vibration = Column(Float, nullable=True)
    
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
    location = Column(String(100), default="Shop Floor Bay A")
    operating_hours = Column(Float, default=0.0)


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

    def to_dict(self):
        return {
            "id": self.id,
            "alert_id": self.alert_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "tool_id": self.tool_id,
            "machine_id": self.machine_id,
            "title": self.title,
            "message": self.message,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "is_acknowledged": self.is_acknowledged,
        }


class OperatorRecord(Base):
    __tablename__ = "operators"
    
    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    photo_path = Column(String(255), nullable=True)
    status = Column(String(20), default="ACTIVE")
    registered_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "operator_id": self.operator_id,
            "name": self.name,
            "photo_path": self.photo_path,
            "status": self.status,
            "registered_at": self.registered_at.isoformat() if self.registered_at else None,
        }


class MaintenanceEvent(Base):
    __tablename__ = "maintenance_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), unique=True, index=True, nullable=False)
    machine_id = Column(String(50), index=True, nullable=False)
    tool_id = Column(String(50), index=True, nullable=True)
    maintenance_type = Column(String(50), default="PLANNED") # PLANNED, UNPLANNED, TOOL_REPLACEMENT, PREVENTIVE
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_hours = Column(Float, default=0.5)
    cost = Column(Float, default=0.0)
    performed_by = Column(String(100), default="Maintenance Team")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "machine_id": self.machine_id,
            "tool_id": self.tool_id,
            "maintenance_type": self.maintenance_type,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_hours": self.duration_hours,
            "cost": self.cost,
            "performed_by": self.performed_by,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DowntimeEvent(Base):
    __tablename__ = "downtime_events"
    
    id = Column(Integer, primary_key=True, index=True)
    downtime_id = Column(String(50), unique=True, index=True, nullable=False)
    machine_id = Column(String(50), index=True, nullable=False)
    tool_id = Column(String(50), index=True, nullable=True)
    cause = Column(String(100), default="Excessive Tool Wear")
    is_unplanned = Column(Boolean, default=False)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_hours = Column(Float, default=1.0)
    cost_per_hour = Column(Float, default=2500.0) # Currency unit
    total_loss = Column(Float, default=2500.0)
    estimated_avoided_hours = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "downtime_id": self.downtime_id,
            "machine_id": self.machine_id,
            "tool_id": self.tool_id,
            "cause": self.cause,
            "is_unplanned": self.is_unplanned,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_hours": self.duration_hours,
            "cost_per_hour": self.cost_per_hour,
            "total_loss": self.total_loss,
            "estimated_avoided_hours": self.estimated_avoided_hours,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class EconomicParameters(Base):
    __tablename__ = "economic_parameters"
    
    id = Column(Integer, primary_key=True, index=True)
    tool_replacement_cost = Column(Float, default=1200.0)             # Cost per insert/tool in INR/USD
    machine_operating_cost_per_hour = Column(Float, default=1500.0)   # Operational machine rate
    downtime_cost_per_hour = Column(Float, default=4500.0)            # Production stoppage loss/hr
    maintenance_labor_cost_per_hour = Column(Float, default=600.0)    # Technician wage/hr
    average_unplanned_downtime_hours = Column(Float, default=3.0)     # Unplanned breakdown avg duration
    planned_replacement_hours = Column(Float, default=0.5)            # Scheduled changeout duration
    production_value_per_hour = Column(Float, default=8000.0)         # Manufactured parts output value/hr
    currency_symbol = Column(String(10), default="₹")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "tool_replacement_cost": self.tool_replacement_cost,
            "machine_operating_cost_per_hour": self.machine_operating_cost_per_hour,
            "downtime_cost_per_hour": self.downtime_cost_per_hour,
            "maintenance_labor_cost_per_hour": self.maintenance_labor_cost_per_hour,
            "average_unplanned_downtime_hours": self.average_unplanned_downtime_hours,
            "planned_replacement_hours": self.planned_replacement_hours,
            "production_value_per_hour": self.production_value_per_hour,
            "currency_symbol": self.currency_symbol,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
