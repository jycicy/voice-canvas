"""绘图命令数据模型

定义 LLM 解析语音指令后返回的结构化绘图命令格式。
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CommandType(str, Enum):
    """命令类型：画布操作、简单图形、代码绘图"""
    CANVAS_ACTION = "canvas_action"
    DRAW_SHAPE = "draw_shape"
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
    """绘图参数（兼容 draw_shape 和 canvas_action）"""
    # 坐标（支持字符串表达式如 "W/2"）
    x: Optional[str] = Field(None, description="X 坐标，可为表达式如 'W/2'")
    y: Optional[str] = Field(None, description="Y 坐标")
    x1: Optional[str] = Field(None, description="起点 X（直线）")
    y1: Optional[str] = Field(None, description="起点 Y（直线）")
    x2: Optional[str] = Field(None, description="终点 X（直线）")
    y2: Optional[str] = Field(None, description="终点 Y（直线）")
    left: Optional[float] = Field(None, description="X 坐标（旧格式）")
    top: Optional[float] = Field(None, description="Y 坐标（旧格式）")
    # 尺寸
    width: Optional[float] = Field(None, description="宽度")
    height: Optional[float] = Field(None, description="高度")
    radius: Optional[float] = Field(None, description="半径")
    radiusX: Optional[float] = Field(None, description="椭圆 X 半径")
    radiusY: Optional[float] = Field(None, description="椭圆 Y 半径")
    size: Optional[float] = Field(None, description="尺寸（三角形）")
    # 样式
    fill: Optional[str] = Field(None, description="填充颜色")
    stroke: Optional[str] = Field(None, description="描边颜色")
    strokeWidth: Optional[float] = Field(None, description="描边宽度")
    # 文字
    text: Optional[str] = Field(None, description="文字内容")
    fontSize: Optional[int] = Field(None, description="字体大小")
    fontFamily: Optional[str] = Field(None, description="字体")
    # 变换
    angle: Optional[float] = Field(None, description="旋转角度")
    scaleX: Optional[float] = Field(None, description="X 缩放")
    scaleY: Optional[float] = Field(None, description="Y 缩放")
    opacity: Optional[float] = Field(None, description="透明度 0-1")
    dash: Optional[list[float]] = Field(None, description="虚线样式")
    lineHeight: Optional[float] = Field(None, description="行高")

    model_config = {"extra": "allow"}


class Alternative(BaseModel):
    """低置信度时的备选指令"""
    label: str = Field(..., description="展示给用户的指令描述")
    command: "DrawCommand" = Field(..., description="对应的绘图命令")


class ShapeParams(BaseModel):
    """简单图形参数"""
    x: Optional[str] = Field(None, description="X 坐标，可为表达式如 'W/2'")
    y: Optional[str] = Field(None, description="Y 坐标")
    x1: Optional[str] = Field(None, description="起点 X（直线）")
    y1: Optional[str] = Field(None, description="起点 Y（直线）")
    x2: Optional[str] = Field(None, description="终点 X（直线）")
    y2: Optional[str] = Field(None, description="终点 Y（直线）")
    radius: Optional[float] = Field(None, description="半径")
    radiusX: Optional[float] = Field(None, description="椭圆 X 半径")
    radiusY: Optional[float] = Field(None, description="椭圆 Y 半径")
    width: Optional[float] = Field(None, description="宽度")
    height: Optional[float] = Field(None, description="高度")
    size: Optional[float] = Field(None, description="尺寸（三角形）")
    fill: Optional[str] = Field(None, description="填充颜色")
    stroke: Optional[str] = Field(None, description="描边颜色")
    strokeWidth: Optional[float] = Field(None, description="描边宽度")
    text: Optional[str] = Field(None, description="文字内容")
    fontSize: Optional[int] = Field(None, description="字体大小")
    fontFamily: Optional[str] = Field(None, description="字体")

    model_config = {"extra": "allow"}


class DrawCommand(BaseModel):
    """完整的绘图命令"""
    type: CommandType = Field(..., description="命令类型")
    action: Optional[CanvasAction] = Field(None, description="画布操作类型（type=canvas_action 时必填）")
    shape: Optional[str] = Field(None, description="图形类型（type=draw_shape 时必填）：circle/rect/triangle/line/text/ellipse")
    target: Optional[DrawTarget] = Field(None, description="操作目标")
    params: Optional[DrawParams] = Field(None, description="绘图参数")
    code: Optional[str] = Field(None, description="Canvas 2D 代码（type=code_execute 时必填）")
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
