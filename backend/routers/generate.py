"""AI 图像生成 API 路由（SSE 流式进度推送）"""

import asyncio
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.image_generator import generate_image

router = APIRouter(prefix="/api", tags=["generate"])


class GenerateRequest(BaseModel):
    """图像生成请求"""
    prompt: str


@router.post("/generate-image")
async def generate_image_endpoint(request: GenerateRequest):
    """SSE 流式返回图像生成进度

    事件流：
    - event: generating  — 正在生成
    - event: completed   — 生成完成，data 包含图片 URL
    - event: error       — 生成失败
    """
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt 不能为空")

    async def event_stream():
        # 发送"正在生成"状态
        yield f"event: generating\ndata: {json.dumps({'message': 'AI 正在作画中...', 'prompt': request.prompt})}\n\n"

        try:
            # 调用 DALL-E 3 生成图片（耗时 10-20 秒）
            result = await generate_image(request.prompt)

            # 发送完成事件
            yield f"event: completed\ndata: {json.dumps({'message': '图片已生成', 'url': result['url'], 'revised_prompt': result['revised_prompt']})}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': f'生成失败: {str(e)}'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
