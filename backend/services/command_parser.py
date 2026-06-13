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

    # 重试逻辑：最多 3 次，指数退避
    last_error = None
    for attempt in range(3):
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
            print(f"[command_parser] LLM 原始返回 (attempt {attempt + 1}): {content!r}")

            if not content.strip():
                raise ValueError("LLM 返回空内容")

            data = _extract_json(content)
            return DrawCommand(**data)

        except Exception as e:
            last_error = e
            print(f"[command_parser] 第 {attempt + 1} 次解析失败: {e}")
            if attempt < 2:
                import asyncio
                await asyncio.sleep(0.5 * (2 ** attempt))  # 指数退避: 0.5s, 1s

    print(f"[command_parser] 3 次重试均失败，使用兜底: {last_error}")
    return _build_fallback_command(text)


async def parse_compound_command(text: str) -> list[DrawCommand]:
    """解析复合指令，返回多个命令

    例如 "画三个红色圆形排成一排" → 3 个 draw 命令
    """
    # 检测是否包含数量关键词
    count_match = re.search(r"([一二三四五六七八九十\d]+)\s*个", text)
    if not count_match:
        # 非复合指令，返回单个命令
        cmd = await parse_command(text)
        return [cmd]

    # 中文数字映射
    cn_num = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}
    count_str = count_match.group(1)
    count = cn_num.get(count_str, int(count_str) if count_str.isdigit() else 1)

    # 限制最多 10 个，避免语音误识别
    count = min(count, 10)

    # 解析单个命令的语义
    single_text = re.sub(r"[一二三四五六七八九十\d]+\s*个", "一个", text)
    cmd = await parse_command(single_text)

    # 如果解析失败或不是 draw 类型，直接返回单个命令
    if cmd.type != CommandType.CANVAS_ACTION or cmd.action != "draw":
        return [cmd]

    # 根据数量生成多个命令，水平排列
    commands = []
    spacing = 150  # 对象间距
    total_width = (count - 1) * spacing
    start_x = -total_width / 2

    for i in range(count):
        import copy
        new_cmd = copy.deepcopy(cmd)
        if new_cmd.params:
            new_cmd.params.left = start_x + i * spacing
        new_cmd.speak = f"正在绘制第 {i + 1} 个"
        commands.append(new_cmd)

    return commands
