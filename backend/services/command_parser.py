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
    api_key = os.getenv("LLM_API_KEY", "")
    base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    print(f"[command_parser] LLM 配置: base_url={base_url}, api_key={'*' * 8 if api_key else '未设置'}")
    return AsyncOpenAI(
        api_key=api_key,
        base_url=base_url,
    )


def _extract_json(text: str) -> dict:
    """从 LLM 输出中提取 JSON

    处理各种常见的非标准 JSON 输出情况：
    - 包裹在 ```json ... ``` 中
    - 前后有多余文字
    """
    text = text.strip()

    # 去掉 markdown 代码块
    json_block = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if json_block:
        text = json_block.group(1).strip()

    # 移除尾部逗号（LLM 常见错误）
    text = re.sub(r",\s*([}\]])", r"\1", text)

    # 优先尝试直接解析（LLM 通常返回标准 JSON，code 字段可能包含单引号）
    # 先用栈匹配找到顶层 JSON 对象，避免贪婪匹配破坏 code 字符串
    start = text.find('{')
    if start == -1:
        raise ValueError("未找到 JSON 对象")

    depth = 0
    in_string = False
    escape_next = False
    end = -1

    for i in range(start, len(text)):
        c = text[i]
        if escape_next:
            escape_next = False
            continue
        if c == '\\' and in_string:
            escape_next = True
            continue
        if c == '"' and not escape_next:
            in_string = not in_string
            continue
        if in_string:
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i
                break

    if end == -1:
        # 括号不匹配，尝试修复
        text = text[start:]
        if '"speak"' not in text:
            text += ', "speak": "正在执行"'
        if '"confidence"' not in text:
            text += ', "confidence": 0.8'
        text += '}'
    else:
        text = text[start:end + 1]

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

    # 代码绘图：包含"画"时走代码生成
    if "画" in text:
        description = text.split("画", 1)[-1].strip() or text
        return DrawCommand(
            type=CommandType.CODE_EXECUTE,
            code=f"// {description}\n// 需要 LLM 生成具体代码",
            confidence=0.5,
            speak=f"正在绘制：{description}",
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
    print(f"[command_parser] 使用模型: {model}")

    # 重试逻辑：最多 3 次，指数退避
    last_error = None
    for attempt in range(3):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "你是一个语音绘图指令解析器。只输出 JSON，不要输出其他内容。不要思考，直接输出 JSON。"},
                    {"role": "user", "content": full_prompt},
                ],
                temperature=0.1,
                max_tokens=4096,
            )

            # 详细日志
            msg = response.choices[0].message
            finish_reason = response.choices[0].finish_reason
            content = msg.content or ""
            reasoning = getattr(msg, 'reasoning_content', None) or ""

            print(f"[command_parser] finish_reason: {finish_reason}")
            print(f"[command_parser] content: {content!r}")
            print(f"[command_parser] reasoning: {reasoning[:200]!r}...")

            # 如果 content 为空但 reasoning 有内容，尝试从 reasoning 提取 JSON
            if not content.strip() and reasoning:
                print(f"[command_parser] content 为空，尝试从 reasoning 提取")
                content = reasoning

            if not content.strip():
                raise ValueError("LLM 返回空内容")

            # 检查 finish_reason
            if finish_reason == "length":
                print(f"[command_parser] 警告: 响应被截断 (finish_reason=length)")

            # 尝试提取 JSON
            if content.strip():
                try:
                    data = _extract_json(content)
                    return DrawCommand(**data)
                except Exception as json_err:
                    print(f"[command_parser] JSON 解析失败: {json_err}")
                    # 尝试修复截断的 JSON
                    fixed = content.strip()
                    if not fixed.endswith('}'):
                        if '"speak"' not in fixed:
                            fixed += ', "speak": "正在执行"'
                        if '"confidence"' not in fixed:
                            fixed += ', "confidence": 0.8'
                        fixed += '}'
                    try:
                        data = _extract_json(fixed)
                        return DrawCommand(**data)
                    except:
                        raise ValueError(f"无法解析 JSON: {content!r}")
            else:
                raise ValueError("LLM 返回空内容")

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

    # 如果不是 code_execute 类型，直接返回单个命令
    if cmd.type != CommandType.CODE_EXECUTE:
        return [cmd]

    # code_execute 类型：将数量信息附加到 code 注释中，让 LLM 在下次调用时生成多个对象
    # 直接返回单个命令（LLM 代码中可以画多个对象）
    return [cmd]
