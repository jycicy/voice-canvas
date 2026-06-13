"""指令解析服务测试"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from services.command_parser import _extract_json, _build_fallback_command, parse_command
from schemas.commands import CommandType


class TestExtractJson:
    """JSON 提取测试"""

    def test_plain_json(self):
        """纯 JSON 直接解析"""
        text = '{"type": "canvas_action", "action": "draw"}'
        result = _extract_json(text)
        assert result["type"] == "canvas_action"

    def test_markdown_json_block(self):
        """```json 代码块"""
        text = '```json\n{"type": "ai_generate", "prompt": "cat"}\n```'
        result = _extract_json(text)
        assert result["type"] == "ai_generate"

    def test_json_with_extra_text(self):
        """JSON 前后有多余文字"""
        text = '好的，这是解析结果：\n{"type": "canvas_action", "action": "clear"}\n希望有帮助。'
        result = _extract_json(text)
        assert result["action"] == "clear"

    def test_trailing_comma(self):
        """尾部逗号"""
        text = '{"type": "canvas_action", "action": "draw",}'
        result = _extract_json(text)
        assert result["action"] == "draw"


class TestBuildFallbackCommand:
    """兜底命令测试"""

    def test_clear(self):
        cmd = _build_fallback_command("清空画布")
        assert cmd.type == CommandType.CANVAS_ACTION
        assert cmd.action == "clear"

    def test_undo(self):
        cmd = _build_fallback_command("撤销")
        assert cmd.action == "undo"

    def test_redo(self):
        cmd = _build_fallback_command("重做")
        assert cmd.action == "redo"

    def test_export(self):
        cmd = _build_fallback_command("保存图片")
        assert cmd.action == "export"

    def test_ai_generate(self):
        cmd = _build_fallback_command("画一只猫")
        assert cmd.type == CommandType.AI_GENERATE
        assert cmd.prompt == "一只猫"

    def test_unrecognized(self):
        cmd = _build_fallback_command("你好啊")
        assert cmd.confidence < 0.5


class TestParseCommand:
    """LLM 解析集成测试（mock LLM）"""

    @pytest.mark.asyncio
    async def test_successful_parse(self):
        """LLM 返回正确 JSON"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"type": "canvas_action", "action": "draw", "params": {"fill": "#FF0000", "radius": 100}, "confidence": 0.95, "speak": "正在画红色圆形"}'

        with patch("services.command_parser._get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            mock_get_client.return_value = mock_client

            cmd = await parse_command("画一个红色圆形")

        assert cmd.type == CommandType.CANVAS_ACTION
        assert cmd.action == "draw"
        assert cmd.confidence == 0.95

    @pytest.mark.asyncio
    async def test_llm_failure_fallback(self):
        """LLM 调用失败，走兜底逻辑"""
        with patch("services.command_parser._get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.chat.completions.create = AsyncMock(side_effect=Exception("API Error"))
            mock_get_client.return_value = mock_client

            cmd = await parse_command("清空画布")

        assert cmd.action == "clear"

    @pytest.mark.asyncio
    async def test_empty_response_fallback(self):
        """LLM 返回空内容，走兜底逻辑"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = ""

        with patch("services.command_parser._get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            mock_get_client.return_value = mock_client

            cmd = await parse_command("画一只猫")

        assert cmd.type == CommandType.AI_GENERATE

    @pytest.mark.asyncio
    async def test_parse_scale_command(self):
        """解析放大命令"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"type": "canvas_action", "action": "scale", "params": {"scaleX": 2, "scaleY": 2}, "confidence": 0.9, "speak": "已放大两倍"}'

        with patch("services.command_parser._get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            mock_get_client.return_value = mock_client

            cmd = await parse_command("放大两倍")

        assert cmd.action == "scale"
        assert cmd.params.scale_x == 2

    @pytest.mark.asyncio
    async def test_parse_rotate_command(self):
        """解析旋转命令"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"type": "canvas_action", "action": "rotate", "params": {"angle": 45}, "confidence": 0.9, "speak": "已旋转45度"}'

        with patch("services.command_parser._get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            mock_get_client.return_value = mock_client

            cmd = await parse_command("旋转45度")

        assert cmd.action == "rotate"
        assert cmd.params.angle == 45

    @pytest.mark.asyncio
    async def test_parse_select_last_command(self):
        """解析选中最后绘制对象命令"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"type": "canvas_action", "action": "select", "target": {"type": "last"}, "confidence": 0.9, "speak": "已选中最后绘制的对象"}'

        with patch("services.command_parser._get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            mock_get_client.return_value = mock_client

            cmd = await parse_command("选中刚才画的")

        assert cmd.action == "select"
        assert cmd.target.type == "last"
