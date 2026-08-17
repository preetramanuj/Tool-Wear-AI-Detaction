from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.core.database import get_db
from backend.database.crud import get_tools, get_tool_by_id, create_tool, update_tool, delete_tool

router = APIRouter(prefix="/tools", tags=["Tool Inventory Management"])

class ToolCreateSchema(BaseModel):
    tool_id: str
    tool_name: Optional[str] = "Standard Turning Insert"
    tool_type: str = "Carbide Turning Insert"
    insert_shape: str = "Rhombic 80°"
    material: str = "Tungsten Carbide (WC-Co)"
    coating: str = "TiCN + Al2O3 + TiN (CVD)"
    machine_id: str = "CNC-LATHE-01"
    assigned_operator: Optional[str] = "Operator 01"
    status: str = "HEALTHY"

class ToolUpdateSchema(BaseModel):
    tool_name: Optional[str] = None
    tool_type: Optional[str] = None
    insert_shape: Optional[str] = None
    material: Optional[str] = None
    coating: Optional[str] = None
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
        "machine_id": t.machine_id,
        "assigned_operator": t.assigned_operator,
        "status": t.status,
        "current_wear_um": t.current_wear_um,
        "current_wear_vb_mm": t.current_wear_vb_mm,
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
