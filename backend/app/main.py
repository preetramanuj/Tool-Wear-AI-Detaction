import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from backend.core.config import settings
from backend.database.crud import init_db
from backend.services.tool_detection_service import tool_detection_service
from backend.services.wear_analysis_service import wear_analysis_service
from backend.services.health_prediction_service import health_prediction_service
from backend.services.face_detection_service import face_detection_service
from backend.services.person_tool_association_service import person_tool_association_service
from backend.services.rul_service import rul_service

# Import API Routers
from backend.api.routes.inspection_routes import router as inspection_router
from backend.api.routes.tool_detection_routes import router as tool_detection_router
from backend.api.routes.wear_analysis_routes import router as wear_analysis_router
from backend.api.routes.health_prediction_routes import router as health_prediction_router
from backend.api.routes.rul_routes import router as rul_router
from backend.api.routes.face_routes import router as face_router
from backend.api.routes.tools_routes import router as tools_router
from backend.api.routes.analytics_routes import router as analytics_router
from backend.api.routes.alerts_routes import router as alerts_router
from backend.api.routes.models_routes import router as models_router
from backend.api.routes.system_routes import router as system_router
from backend.api.routes.webcam_routes import router as webcam_router
from backend.api.routes.insights_routes import router as insights_router
from backend.api.routes.economic_routes import router as economic_router
from backend.api.routes.downtime_routes import router as downtime_router
from backend.api.routes.root_cause_routes import router as root_cause_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite DB and verify singleton models
    print("==================================================")
    print("  Initializing ToolGuard-AI Vision & ML Engine... ")
    print("==================================================")
    init_db()
    
    # Models are instantiated as singletons on service import
    print(f"• Model 1 (Tool Detection): {'ONLINE' if tool_detection_service.is_loaded() else 'OFFLINE'}")
    print(f"• Model 2 (Wear Analysis):  {'ONLINE' if wear_analysis_service.is_loaded() else 'OFFLINE'}")
    print(f"• Model 3 (Health Predict): {'ONLINE' if health_prediction_service.is_loaded() else 'OFFLINE'}")
    print(f"• Model 6 (XGBoost RUL):    {'ONLINE' if rul_service.is_loaded() else 'OFFLINE'}")
    print(f"• Model 4 (Face Engine):    {'ONLINE' if face_detection_service.is_loaded() else 'OFFLINE'}")
    print(f"• Model 5 (Mfg Insights):   ONLINE")
    print(f"• Model 7 (Economic Dash):  ONLINE")
    print(f"• Model 8 (Downtime Avoid): ONLINE")
    print(f"• Model 9 (Root Cause):     ONLINE")
    print(f"• Person-Tool Association:  ONLINE")
    print(f"• SQLite Database:          CONNECTED ({settings.DATABASE_URL})")
    print("==================================================")
    
    yield
    
    print("Shutting down ToolGuard-AI Server...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-Stack Industrial Tool Wear Monitoring & Predictive Machine Vision Control System",
    lifespan=lifespan,
)

# CORS Configuration for local frontend & remote clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Storage Directory for image viewing
if os.path.exists(settings.STORAGE_DIR):
    app.mount("/storage", StaticFiles(directory=settings.STORAGE_DIR), name="storage")

# Register All API Routers
app.include_router(inspection_router, prefix=settings.API_V1_STR)
app.include_router(tool_detection_router, prefix=settings.API_V1_STR)
app.include_router(wear_analysis_router, prefix=settings.API_V1_STR)
app.include_router(health_prediction_router, prefix=settings.API_V1_STR)
app.include_router(rul_router, prefix=settings.API_V1_STR)
app.include_router(rul_router, prefix="/api")  # Direct alias for /api/rul/predict
app.include_router(face_router, prefix=settings.API_V1_STR)
app.include_router(webcam_router, prefix=settings.API_V1_STR)
app.include_router(tools_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(models_router, prefix=settings.API_V1_STR)
app.include_router(system_router, prefix=settings.API_V1_STR)
app.include_router(insights_router, prefix=settings.API_V1_STR)
app.include_router(economic_router, prefix=settings.API_V1_STR)
app.include_router(downtime_router, prefix=settings.API_V1_STR)
app.include_router(root_cause_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "sqlite",
        "models_loaded": {
            "model_1_tool_detection": tool_detection_service.is_loaded(),
            "model_2_wear_analysis": wear_analysis_service.is_loaded(),
            "model_3_health_prediction": health_prediction_service.is_loaded(),
            "model_6_rul_prediction": rul_service.is_loaded(),
            "model_4_face_detection": face_detection_service.is_loaded(),
        }
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "ToolGuard-AI Backend Engine is active.",
        "documentation": "/docs",
        "api_prefix": settings.API_V1_STR
    }
