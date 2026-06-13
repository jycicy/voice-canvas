"""图像生成服务

通过环境变量配置 API 地址、模型、Key，切换模型无需改代码。
兼容 OpenAI images 格式的 API（OpenAI、Agnes、小米等）。
"""

import os

import httpx


def _get_config() -> dict:
    """从环境变量读取图像生成配置"""
    return {
        "api_url": os.getenv("IMAGE_API_URL", "https://apihub.agnes-ai.com/v1/images/generations"),
        "api_key": os.getenv("IMAGE_API_KEY", ""),
        "model": os.getenv("IMAGE_MODEL", "agnes-image-2.1-flash"),
        "size": os.getenv("IMAGE_SIZE", "1024x768"),
    }


async def generate_image(prompt: str) -> dict:
    """调用图像生成 API

    Args:
        prompt: 图像描述提示词

    Returns:
        dict: {"url": 图片 data URL 或 http URL, "revised_prompt": 修订后的提示词}

    Raises:
        Exception: API 调用失败时抛出异常
    """
    cfg = _get_config()

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            cfg["api_url"],
            headers={
                "Authorization": f"Bearer {cfg['api_key']}",
                "Content-Type": "application/json",
            },
            json={
                "model": cfg["model"],
                "prompt": prompt,
                "size": cfg["size"],
                "response_format": "b64_json",
            },
        )

        response.raise_for_status()
        data = response.json()

        # 兼容 OpenAI 格式响应：{"data": [{"b64_json": "..."}]} 或 {"data": [{"url": "..."}]}
        item = data["data"][0]
        b64 = item.get("b64_json", "")
        url = item.get("url", "")

        if b64:
            image_url = f"data:image/png;base64,{b64}"
        else:
            image_url = url

        return {
            "url": image_url,
            "revised_prompt": prompt,
        }
