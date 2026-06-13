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

    if not cfg["api_key"]:
        raise ValueError("IMAGE_API_KEY 未配置，请在 .env 文件中设置")

    print(f"[image_generator] 开始生成: prompt={prompt!r}, model={cfg['model']}, size={cfg['size']}")

    try:
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
                },
            )

            print(f"[image_generator] API 响应状态: {response.status_code}")

            if response.status_code != 200:
                error_text = response.text[:500]
                print(f"[image_generator] API 错误: {error_text}")
                raise Exception(f"图像生成 API 返回 {response.status_code}: {error_text}")

            data = response.json()

            # 兼容 OpenAI 格式响应：{"data": [{"b64_json": "..."}]} 或 {"data": [{"url": "..."}]}
            if "data" not in data or not data["data"]:
                raise Exception(f"API 响应格式错误: {str(data)[:200]}")

            item = data["data"][0]
            b64 = item.get("b64_json", "")
            url = item.get("url", "")

            if b64:
                image_url = f"data:image/png;base64,{b64}"
                print(f"[image_generator] 成功: base64 图片 ({len(b64)} 字符)")
            elif url:
                # 下载图片并转为 base64（避免前端 CORS 问题）
                print(f"[image_generator] 下载图片: {url[:100]}")
                img_resp = await client.get(url)
                if img_resp.status_code == 200:
                    import base64
                    b64_data = base64.b64encode(img_resp.content).decode()
                    image_url = f"data:image/png;base64,{b64_data}"
                    print(f"[image_generator] 成功: 下载并转为 base64 ({len(b64_data)} 字符)")
                else:
                    # 下载失败，直接返回 URL（前端可能能访问）
                    image_url = url
                    print(f"[image_generator] 图片下载失败，使用原始 URL")
            else:
                raise Exception(f"API 响应中没有图片数据: {str(item)[:200]}")

            return {
                "url": image_url,
                "revised_prompt": prompt,
            }

    except httpx.TimeoutException:
        print(f"[image_generator] 请求超时")
        raise Exception("图像生成超时，请稍后重试")
    except httpx.ConnectError:
        print(f"[image_generator] 连接失败")
        raise Exception("无法连接到图像生成服务，请检查网络")
