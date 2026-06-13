"""画布状态 API 路由"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.canvas_store import canvas_store

router = APIRouter(prefix="/api/canvas", tags=["canvas"])


class CanvasStateRequest(BaseModel):
    """画布状态保存请求"""
    canvas_json: dict


class CanvasStateResponse(BaseModel):
    """画布状态响应"""
    session_id: str
    canvas_json: dict
    updated_at: str


@router.get("/state/{session_id}", response_model=CanvasStateResponse)
async def get_canvas_state(session_id: str):
    """获取画布状态"""
    state = canvas_store.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="画布状态不存在")

    return CanvasStateResponse(
        session_id=session_id,
        canvas_json=state["canvas_json"],
        updated_at=state["updated_at"],
    )


@router.put("/state/{session_id}", response_model=CanvasStateResponse)
async def save_canvas_state(session_id: str, request: CanvasStateRequest):
    """保存画布状态"""
    state = canvas_store.save(session_id, {"canvas_json": request.canvas_json})

    return CanvasStateResponse(
        session_id=session_id,
        canvas_json=state["canvas_json"],
        updated_at=state["updated_at"],
    )


@router.delete("/state/{session_id}")
async def delete_canvas_state(session_id: str):
    """删除画布状态"""
    deleted = canvas_store.delete(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="画布状态不存在")

    return {"message": "已删除", "session_id": session_id}
