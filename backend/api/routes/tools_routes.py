import json
import cv2
import numpy as np
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.core.database import get_db
from backend.database.crud import (
    get_tools,
    get_tool_by_id,
    create_tool,
    update_tool,
    delete_tool,
    get_tool_reference_images,
    delete_tool_reference_image,
    get_tool_embedding_record,
)
from backend.services.tool_matching_service import tool_matching_service

router = APIRouter(prefix="/tools", tags=["Tool Inventory Management & Visual Reference Registry"])

class ToolCreateSchema(BaseModel):
    tool_id: str
    tool_name: Optional[str] = "Standard Turning Insert"
    tool_type: str = "Carbide Turning Insert"
    insert_shape: str = "Rhombic 80°"
    material: str = "Tungsten Carbide (WC-Co)"
    coating: str = "TiCN + Al2O3 + TiN (CVD)"
    manufacturer: Optional[str] = "Sandvik Coromant"
    part_number: Optional[str] = "CNMG 12 04 08-PM"
    workpiece_material: Optional[str] = "CK45 / Alloy Steel"
    initial_condition: Optional[str] = "NEW"
    machine_id: str = "CNC-LATHE-01"
    assigned_operator: Optional[str] = "Operator 01"
    status: str = "HEALTHY"

class ToolUpdateSchema(BaseModel):
    tool_name: Optional[str] = None
    tool_type: Optional[str] = None
    insert_shape: Optional[str] = None
    material: Optional[str] = None
    coating: Optional[str] = None
    manufacturer: Optional[str] = None
    part_number: Optional[str] = None
    workpiece_material: Optional[str] = None
    machine_id: Optional[str] = None
    assigned_operator: Optional[str] = None
    status: Optional[str] = None

def serialize_tool(t) -> dict:
    return {
        "id": t.id,
        "tool_id": t.tool_id,
        "tool_name": t.tool_name,
        "tool_type": t.tool_type,
        "insert_shape": t.insert_shape,
        "material": t.material,
        "coating": t.coating,
        "manufacturer": getattr(t, "manufacturer", "Sandvik Coromant"),
        "part_number": getattr(t, "part_number", "CNMG 12 04 08"),
        "workpiece_material": getattr(t, "workpiece_material", "CK45 / Alloy Steel"),
        "initial_condition": getattr(t, "initial_condition", "NEW"),
        "machine_id": t.machine_id,
        "assigned_operator": t.assigned_operator,
        "status": t.status,
        "current_wear_um": t.current_wear_um,
        "current_wear_vb_mm": t.current_wear_vb_mm,
        "current_rul_cycles": getattr(t, "current_rul_cycles", None),
        "total_inspections": t.total_inspections,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }

@router.get("")
async def list_tools(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """List registered tools from database"""
    tools = get_tools(db, skip=skip, limit=limit)
    return {
        "success": True,
        "count": len(tools),
        "tools": [serialize_tool(t) for t in tools]
    }

@router.post("")
async def add_new_tool(
    payload: ToolCreateSchema,
    db: Session = Depends(get_db)
):
    """Add a new cutting tool to inventory"""
    existing = get_tool_by_id(db, payload.tool_id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Tool ID '{payload.tool_id}' already exists")
    
    new_t = create_tool(db, payload.model_dump())
    return {
        "success": True,
        "tool": serialize_tool(new_t),
        "message": f"Tool '{payload.tool_id}' created successfully"
    }

@router.post("/register")
async def register_tool_with_references(
    tool_id: str = Form(...),
    tool_name: str = Form("Standard CNC Insert"),
    tool_type: str = Form("Carbide Turning Insert"),
    insert_shape: str = Form("Rhombic 80°"),
    material: str = Form("Tungsten Carbide (WC-Co)"),
    coating: str = Form("TiCN + Al2O3 + TiN (CVD)"),
    manufacturer: str = Form("Sandvik Coromant"),
    part_number: str = Form("CNMG 12 04 08-PM"),
    workpiece_material: str = Form("CK45 / Alloy Steel"),
    machine_id: str = Form("CNC-LATHE-01"),
    assigned_operator: str = Form("Operator 01"),
    status: str = Form("HEALTHY"),
    angle_tags: Optional[str] = Form(None),  # JSON array string or comma separated
    reference_photos: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Registers a physical cutting tool in inventory with multiple reference photos (3–10 photos).
    Extracts 576-dim visual feature embeddings for automated zero-retraining visual identification.
    """
    if not reference_photos:
        raise HTTPException(status_code=400, detail="At least 1 reference photo is required for tool registration.")

    # 1. Create or Update Tool Record in SQLite
    existing = get_tool_by_id(db, tool_id)
    tool_data = {
        "tool_id": tool_id,
        "tool_name": tool_name,
        "tool_type": tool_type,
        "insert_shape": insert_shape,
        "material": material,
        "coating": coating,
        "manufacturer": manufacturer,
        "part_number": part_number,
        "workpiece_material": workpiece_material,
        "machine_id": machine_id,
        "assigned_operator": assigned_operator,
        "status": status,
    }
    if not existing:
        tool_record = create_tool(db, tool_data)
    else:
        tool_record = update_tool(db, tool_id, tool_data)

    # 2. Decode uploaded images
    images_bgr = []
    filenames = []
    for f in reference_photos:
        content = await f.read()
        nparr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            images_bgr.append(img)
            filenames.append(f.filename or "reference.jpg")

    if not images_bgr:
        raise HTTPException(status_code=400, detail="Failed to decode reference images. Please provide valid JPG/PNG files.")

    # Parse angle tags
    angles_list = []
    if angle_tags:
        try:
            angles_list = json.loads(angle_tags)
        except Exception:
            angles_list = [a.strip() for a in angle_tags.split(",")]

    # 3. Register Reference Images & Generate Embeddings
    reg_result = tool_matching_service.register_tool_references(
        tool_id=tool_id,
        images_bgr=images_bgr,
        filenames=filenames,
        angle_tags=angles_list,
        db=db
    )

    return {
        "success": reg_result["status"] == "SUCCESS",
        "tool": serialize_tool(tool_record),
        "registration_summary": reg_result,
        "message": f"Tool '{tool_id}' registered successfully with {reg_result['valid_accepted']} reference embeddings.",
    }

@router.get("/{tool_id}/references")
async def get_tool_references(
    tool_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve all reference photos and embedding status for a registered tool"""
    tool = get_tool_by_id(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_id}' not found")

    refs = get_tool_reference_images(db, tool_id)
    emb = get_tool_embedding_record(db, tool_id)

    return {
        "success": True,
        "tool_id": tool_id,
        "total_references": len(refs),
        "embedding_status": "READY" if emb else "NO_EMBEDDINGS",
        "embedding_dim": emb.embedding_dim if emb else 576,
        "references": [
            {
                "id": r.id,
                "file_name": r.file_name,
                "image_path": r.image_path,
                "angle_tag": r.angle_tag,
                "is_valid": r.is_valid,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in refs
        ]
    }

@router.delete("/{tool_id}/references/{image_id}")
async def remove_tool_reference(
    tool_id: str,
    image_id: int,
    db: Session = Depends(get_db)
):
    """Delete a reference photo and recompute tool reference embeddings"""
    success = delete_tool_reference_image(db, image_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Reference image ID {image_id} not found")

    return {
        "success": True,
        "message": f"Reference photo {image_id} deleted successfully for tool '{tool_id}'"
    }

@router.post("/match")
async def match_tool_query(
    image: UploadFile = File(...),
    target_tool_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Directly test visual reference matching against the tool registry"""
    content = await image.read()
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Failed to decode input image")

    match_res = tool_matching_service.match_tool_roi(
        query_crop_bgr=img,
        target_tool_id=target_tool_id,
        db=db
    )
    return {
        "success": True,
        "match_result": match_res
    }

@router.get("/{tool_id}")
async def get_tool_details(
    tool_id: str,
    db: Session = Depends(get_db)
):
    """Get details of a specific tool by ID"""
    tool = get_tool_by_id(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool with ID '{tool_id}' not found")
    return {
        "success": True,
        "tool": serialize_tool(tool)
    }

@router.put("/{tool_id}")
async def update_existing_tool(
    tool_id: str,
    payload: ToolUpdateSchema,
    db: Session = Depends(get_db)
):
    """Update metadata for an existing tool"""
    tool = get_tool_by_id(db, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool with ID '{tool_id}' not found")
    
    updated = update_tool(db, tool_id, payload.model_dump(exclude_unset=True))
    return {
        "success": True,
        "tool": serialize_tool(updated),
        "message": f"Tool '{tool_id}' updated successfully"
    }

@router.delete("/{tool_id}")
async def remove_tool(
    tool_id: str,
    db: Session = Depends(get_db)
):
    """Delete a tool from the inventory database"""
    success = delete_tool(db, tool_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Tool with ID '{tool_id}' not found")
    return {
        "success": True,
        "message": f"Tool '{tool_id}' deleted successfully"
    }
