"""LLM 指令解析服务

调用 LLM 将自然语言语音指令解析为结构化绘图命令。
"""

import json
import os
import re
from pathlib import Path

from openai import AsyncOpenAI

from schemas.commands import DrawCommand, CommandType

# prompt 模板路径
PROMPT_DIR = Path(__file__).parent.parent / "prompts"


def _load_prompt_template() -> str:
    """加载 prompt 模板"""
    prompt_file = PROMPT_DIR / "parse_command.txt"
    return prompt_file.read_text(encoding="utf-8")


def _get_client() -> AsyncOpenAI:
    """创建 LLM 客户端"""
    return AsyncOpenAI(
        api_key=os.getenv("LLM_API_KEY", ""),
        base_url=os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"),
    )


def _extract_json(text: str) -> dict:
    """从 LLM 输出中提取 JSON

    处理各种常见的非标准 JSON 输出情况：
    - 包裹在 ```json ... ``` 中
    - 前后有多余文字
    - 单引号代替双引号
    """
    # 尝试直接解析
    text = text.strip()

    # 去掉 markdown 代码块
    json_block = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if json_block:
        text = json_block.group(1).strip()

    # 尝试找到 JSON 对象
    json_match = re.search(r"\{.*\}", text, re.DOTALL)
    if json_match:
        text = json_match.group(0)

    # 替换单引号为双引号（简单场景）
    text = text.replace("'", '"')

    # 移除尾部逗号（LLM 常见错误）
    text = re.sub(r",\s*([}\]])", r"\1", text)

    return json.loads(text)


def _build_fallback_command(text: str) -> DrawCommand:
    """构建兜底命令（LLM 解析失败时）"""
    # 关键词匹配兜底
    text_lower = text.lower()

    # 清空
    if any(kw in text for kw in ["清空", "清除", "全部删除", "擦除"]):
        return DrawCommand(
            type=CommandType.CANVAS_ACTION,
            action="clear",
            confidence=0.6,
            speak="已清空画布",
        )

    # 撤销
    if any(kw in text for kw in ["撤销", "回退", "上一步", "撤回"]):
        return DrawCommand(
            type=CommandType.CANVAS_ACTION,
            action="undo",
            confidence=0.6,
            speak="已撤销",
        )

    # 重做
    if any(kw in text for kw in ["重做", "恢复"]):
        return DrawCommand(
            type=CommandType.CANVAS_ACTION,
            action="redo",
            confidence=0.6,
            speak="已重做",
        )

    # 保存/导出
    if any(kw in text for kw in ["保存", "导出", "下载"]):
        return DrawCommand(
            type=CommandType.CANVAS_ACTION,
            action="export",
            confidence=0.6,
            speak="正在导出图片",
        )

    # AI 生成：包含"画"但不是基础图形时，走 DALL-E
    basic_shapes = ["圆", "矩形", "方", "直线", "线", "三角", "正方形", "长方形"]
    if "画" in text and not any(shape in text for shape in basic_shapes):
        # 提取"画"后面的内容作为 prompt
        prompt = text.split("画", 1)[-1].strip() or text
        return DrawCommand(
            type=CommandType.AI_GENERATE,
            prompt=prompt,
            confidence=0.5,
            speak=f"正在尝试生成：{prompt}",
        )

    # 无法识别
    return DrawCommand(
        type=CommandType.CANVAS_ACTION,
        action="draw",
        confidence=0.3,
        speak="抱歉，我没有听清，请再说一次",
        alternatives=[],
    )


async def parse_command(text: str) -> DrawCommand:
    """解析语音指令为绘图命令

    Args:
        text: 语音识别后的文本

    Returns:
        DrawCommand: 结构化绘图命令
    """
    if not text.strip():
        return _build_fallback_command("")

    prompt_template = _load_prompt_template()
    full_prompt = f"{prompt_template}\n\n用户指令：{text}"

    client = _get_client()
    model = os.getenv("LLM_MODEL", "mimo-v2.5-pro")

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "你是一个语音绘图指令解析器。只输出 JSON，不要输出其他内容。"},
                {"role": "user", "content": full_prompt},
            ],
            temperature=0.1,
            max_tokens=1000,
        )

        content = response.choices[0].message.content or ""
        data = _extract_json(content)

        # 修正 action 字段为枚举值
        if "action" in data and isinstance(data["action"], str):
            pass  # Pydantic 会自动处理字符串到枚举的转换

        return DrawCommand(**data)

    except Exception as e:
        print(f"[command_parser] LLM 解析失败: {e}")
        return _build_fallback_command(text)
