"""图像生成服务测试"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from services.image_generator import generate_image, _get_config


class TestGetConfig:
    """环境变量配置测试"""

    def test_default_config(self):
        """无环境变量时使用默认值"""
        with patch.dict("os.environ", {}, clear=True):
            cfg = _get_config()
            assert cfg["api_url"] == "https://apihub.agnes-ai.com/v1/images/generations"
            assert cfg["model"] == "agnes-image-2.1-flash"
            assert cfg["size"] == "1024x768"

    def test_custom_config(self):
        """环境变量覆盖默认值"""
        env = {
            "IMAGE_API_URL": "https://custom.api/v1/images/generations",
            "IMAGE_API_KEY": "test-key",
            "IMAGE_MODEL": "dall-e-3",
            "IMAGE_SIZE": "1024x1024",
        }
        with patch.dict("os.environ", env, clear=True):
            cfg = _get_config()
            assert cfg["api_url"] == "https://custom.api/v1/images/generations"
            assert cfg["api_key"] == "test-key"
            assert cfg["model"] == "dall-e-3"
            assert cfg["size"] == "1024x1024"


class TestGenerateImage:
    """图像生成 API 调用测试"""

    @pytest.mark.asyncio
    async def test_b64_json_response(self):
        """API 返回 b64_json 格式"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{"b64_json": "iVBORw0KGgo="}]
        }
        mock_response.raise_for_status = MagicMock()

        with patch("services.image_generator._get_config") as mock_cfg:
            mock_cfg.return_value = {
                "api_url": "https://test.api/v1/images/generations",
                "api_key": "test-key",
                "model": "test-model",
                "size": "1024x768",
            }
            with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
                result = await generate_image("a cute cat")

        assert result["url"].startswith("data:image/png;base64,")
        assert "iVBORw0KGgo=" in result["url"]
        assert result["revised_prompt"] == "a cute cat"

    @pytest.mark.asyncio
    async def test_url_response(self):
        """API 返回 URL 格式（下载并转 base64）"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{"url": "https://cdn.example.com/image.png"}]
        }
        mock_response.raise_for_status = MagicMock()

        # 模拟图片下载响应
        mock_img_response = MagicMock()
        mock_img_response.status_code = 200
        mock_img_response.content = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100  # 模拟 PNG 数据

        with patch("services.image_generator._get_config") as mock_cfg:
            mock_cfg.return_value = {
                "api_url": "https://test.api/v1/images/generations",
                "api_key": "test-key",
                "model": "test-model",
                "size": "1024x768",
            }
            with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
                with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_img_response):
                    result = await generate_image("a dog")

        assert result["url"].startswith("data:image/png;base64,")

    @pytest.mark.asyncio
    async def test_api_error(self):
        """API 调用失败抛异常"""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        with patch("services.image_generator._get_config") as mock_cfg:
            mock_cfg.return_value = {
                "api_url": "https://test.api/v1/images/generations",
                "api_key": "test-key",
                "model": "test-model",
                "size": "1024x768",
            }
            with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
                with pytest.raises(Exception, match="图像生成 API 返回 500"):
                    await generate_image("fail")
