"""图像生成 API 端点测试"""

import json
import pytest
from unittest.mock import AsyncMock, patch

from tests.conftest import client as client_fixture


class TestGenerateImageEndpoint:
    """POST /api/generate-image 测试"""

    @pytest.mark.asyncio
    async def test_empty_prompt_returns_400(self, client):
        """空 prompt 返回 400"""
        resp = await client.post("/api/generate-image", json={"prompt": ""})
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_sse_events_order(self, client):
        """SSE 事件流顺序：generating → completed"""
        mock_result = {
            "url": "data:image/png;base64,fake",
            "revised_prompt": "a cat",
        }
        with patch("routers.generate.generate_image", new_callable=AsyncMock, return_value=mock_result):
            resp = await client.post("/api/generate-image", json={"prompt": "画一只猫"})

        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]

        # 解析 SSE 事件
        events = []
        for line in resp.text.split("\n"):
            if line.startswith("event: "):
                events.append(line.split("event: ", 1)[1])

        assert "generating" in events
        assert "completed" in events
        assert events.index("generating") < events.index("completed")

    @pytest.mark.asyncio
    async def test_completed_event_has_url(self, client):
        """completed 事件包含图片 URL"""
        mock_result = {
            "url": "data:image/png;base64,abc123",
            "revised_prompt": "a dog",
        }
        with patch("routers.generate.generate_image", new_callable=AsyncMock, return_value=mock_result):
            resp = await client.post("/api/generate-image", json={"prompt": "画一只狗"})

        # 找到 completed 事件的 data
        for line in resp.text.split("\n"):
            if line.startswith("data: "):
                data = json.loads(line.split("data: ", 1)[1])
                if "url" in data:
                    assert data["url"] == "data:image/png;base64,abc123"
                    break

    @pytest.mark.asyncio
    async def test_generation_error_returns_error_event(self, client):
        """生成失败返回 error 事件"""
        with patch("routers.generate.generate_image", new_callable=AsyncMock, side_effect=Exception("API down")):
            resp = await client.post("/api/generate-image", json={"prompt": "画一座山"})

        assert resp.status_code == 200
        assert "error" in resp.text
        assert "API down" in resp.text
