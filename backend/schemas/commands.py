"""绘图命令数据模型

定义 LLM 解析语音指令后返回的结构化绘图命令格式。
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CommandType(str, Enum):
    """命令类型：画布操作 or 代码绘图"""
    CANVAS_ACTION = "canvas_action"
    CODE_EXECUTE = "code_execute"


class CanvasAction(str, Enum):
    """画布操作类型"""
    DRAW = "draw"
    MODIFY = "modify"
    MOVE = "move"
    SCALE = "scale"
    ROTATE = "rotate"
    DELETE = "delete"
    SELECT = "select"
    CLEAR = "clear"
    UNDO = "undo"
    REDO = "redo"
    EXPORT = "export"
    ZOOM_IN = "zoomIn"
    ZOOM_OUT = "zoomOut"
    RESET_VIEW = "resetView"


class ShapeType(str, Enum):
    """图形类型"""
    CIRCLE = "circle"
    RECT = "rect"
    LINE = "line"
    TRIANGLE = "triangle"
    TEXT = "text"
    POLYGON = "polygon"
    IMAGE = "image"
    SELECTED = "selected"
    LAST = "last"
    ALL = "all"


class TargetFilter(BaseModel):
    """对象筛选条件"""
    color: Optional[str] = Field(None, description="颜色筛选，如 'red', '#FF0000'")
    shape: Optional[str] = Field(None, description="形状筛选，如 'circle', 'rect'")


class DrawTarget(BaseModel):
    """操作目标"""
    type: ShapeType = Field(..., description="目标图形类型")
    filter: Optional[TargetFilter] = Field(None, description="筛选条件")


class DrawParams(BaseModel):
    """绘图参数"""
    left: Optional[float] = Field(None, description="X 坐标")
    top: Optional[float] = Field(None, description="Y 坐标")
    width: Optional[float] = Field(None, description="宽度")
    height: Optional[float] = Field(None, description="高度")
    radius: Optional[float] = Field(None, description="半径（圆形）")
    fill: Optional[str] = Field(None, description="填充颜色，如 '#FF0000'")
    stroke: Optional[str] = Field(None, description="描边颜色")
    stroke_width: Optional[float] = Field(None, alias="strokeWidth", description="描边宽度")
    text: Optional[str] = Field(None, description="文字内容")
    font_size: Optional[int] = Field(None, alias="fontSize", description="字体大小")
    angle: Optional[float] = Field(None, description="旋转角度")
    scale_x: Optional[float] = Field(None, alias="scaleX", description="X 缩放")
    scale_y: Optional[float] = Field(None, alias="scaleY", description="Y 缩放")
    opacity: Optional[float] = Field(None, description="透明度 0-1")
    dash: Optional[list[float]] = Field(None, description="虚线样式 [线长, 间距]")
    line_height: Optional[float] = Field(None, alias="lineHeight", description="行高")

    model_config = {"populate_by_name": True}


class Alternative(BaseModel):
    """低置信度时的备选指令"""
    label: str = Field(..., description="展示给用户的指令描述")
    command: "DrawCommand" = Field(..., description="对应的绘图命令")


class DrawCommand(BaseModel):
    """完整的绘图命令"""
    type: CommandType = Field(..., description="命令类型")
    action: Optional[CanvasAction] = Field(None, description="画布操作类型（type=canvas_action 时必填）")
    target: Optional[DrawTarget] = Field(None, description="操作目标")
    params: Optional[DrawParams] = Field(None, description="绘图参数")
    code: Optional[str] = Field(None, description="Fabric.js 绘图代码（type=code_execute 时必填）")
    confidence: float = Field(1.0, ge=0, le=1, description="解析置信度 0-1")
    speak: str = Field("", description="TTS 语音反馈文本")
    alternatives: list[Alternative] = Field(default_factory=list, description="备选指令列表（低置信度时）")


# 解决 Alternative 的前向引用
Alternative.model_rebuild()


class ParseRequest(BaseModel):
    """解析请求"""
    text: str = Field(..., description="语音识别后的文本指令")


class ParseResponse(BaseModel):
    """解析响应"""
    command: DrawCommand = Field(..., description="解析后的绘图命令")
    raw_text: str = Field(..., description="原始语音文本")
