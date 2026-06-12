"""指令解析 API 路由"""

from fastapi import APIRouter, HTTPException

from schemas.commands import ParseRequest, ParseResponse
from services.command_parser import parse_command

router = APIRouter(prefix="/api", tags=["commands"])


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
