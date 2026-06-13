"""指令解析 API 路由"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from schemas.commands import DrawCommand, ParseRequest, ParseResponse
from services.command_parser import parse_command, parse_compound_command

router = APIRouter(prefix="/api", tags=["commands"])


class CompoundParseResponse(BaseModel):
    """复合指令解析响应"""
    commands: list[DrawCommand]
    raw_text: str


@router.post("/parse-command", response_model=ParseResponse)
async def parse_command_endpoint(request: ParseRequest):
    """解析语音指令为结构化绘图命令

    接收语音识别后的文本，调用 LLM 解析为绘图命令。
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text 不能为空")

    command = await parse_command(request.text)

    return ParseResponse(
        command=command,
        raw_text=request.text,
    )


@router.post("/parse-compound", response_model=CompoundParseResponse)
async def parse_compound_endpoint(request: ParseRequest):
    """解析复合指令，支持批量操作

    例如 "画三个红色圆形排成一排" → 多个 draw 命令
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text 不能为空")

    commands = await parse_compound_command(request.text)

    return CompoundParseResponse(
        commands=commands,
        raw_text=request.text,
    )
