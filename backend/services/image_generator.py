"""DALL-E 3 图像生成服务

调用 DALL-E 3 API 生成图像，返回图片 URL。
"""

import os

from openai import AsyncOpenAI


def _get_client() -> AsyncOpenAI:
    """创建 OpenAI 客户端"""
    return AsyncOpenAI(
        api_key=os.getenv("OPENAI_API_KEY", ""),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    )


async def generate_image(prompt: str) -> dict:
    """调用 DALL-E 3 生成图像

    Args:
        prompt: 图像描述提示词

    Returns:
        dict: {"url": 图片URL, "revised_prompt": 修订后的提示词}

    Raises:
        Exception: API 调用失败时抛出异常
    """
    client = _get_client()

    # 优化中文 prompt（DALL-E 3 对英文效果更好）
    enhanced_prompt = prompt

    response = await client.images.generate(
        model="dall-e-3",
        prompt=enhanced_prompt,
        size="1024x1024",
        quality="standard",
        n=1,
    )

    image_data = response.data[0]

    return {
        "url": image_data.url,
        "revised_prompt": image_data.revised_prompt or prompt,
    }
