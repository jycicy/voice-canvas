# Voice Canvas - AI 语音绘图工具

纯语音控制的 AI 绘图应用。通过语音指令完成绘图创作，无需鼠标或键盘操作。

七牛云 XEngineer 暑期实训营 · 题目二

# 视频演示

- 🎬 *[演示地址](https://github.com/jycicy)<br>*

## 功能特性

- 🎤 **纯语音控制** — 点击麦克风按钮，说出指令即可绘图，无需键盘鼠标
- 🎨 **双路径绘图** — 简单图形直接参数绘制，复杂图形由 LLM 生成 Canvas 2D 代码执行
- ✏️ **丰富图形** — 圆形、矩形、三角形、直线、文字、椭圆，以及渐变、粒子、星空等复杂效果
- 📐 **画布控制** — 撤销/恢复、清空画布、导出 PNG
- 💬 **智能建议** — 低置信度时展示编号候选指令，语音说编号即可选择
- 💾 **状态恢复** — 刷新页面自动恢复画布内容
- 🔔 **Toast 提示** — 撤销/恢复等操作在画布上方弹出轻量提示

## 快速启动

### 后端

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # 编辑 .env 填写 API Key
uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev                    # 默认 http://localhost:5173
```

打开浏览器访问 http://localhost:5173，点击 **Try it** 进入绘图页，点击 🎤 按钮开始语音指令。

## 环境变量

### 后端 (`backend/.env`)

```env
# LLM 指令解析（兼容 OpenAI 格式的任意 API）
LLM_API_KEY=your-llm-api-key
LLM_BASE_URL=https://your-llm-base-url/v1
LLM_MODEL=mimo-v2.5-pro
```

### 前端 (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

## 绘图架构

Voice Canvas 采用**双路径绘图**策略，平衡速度与灵活性：

```
用户语音 → STT → LLM 解析 → 命令路由
                                ├─ draw_shape  → 前端直接绘制（快，~0ms）
                                ├─ code_execute → 沙箱执行 JS 代码（灵活）
                                └─ canvas_action → 撤销/清空/导出等操作
```

### 路径一：draw_shape（简单图形）

LLM 返回结构化 JSON 参数，前端直接调用 Canvas 2D API 绘制：

```json
{"type":"draw_shape","shape":"circle","params":{"x":"W/2","y":"H/2","radius":80,"fill":"#FF6B6B"},"speak":"画了一个红色圆形"}
```

支持：`circle` / `rect` / `triangle` / `line` / `text` / `ellipse`

### 路径二：code_execute（复杂图形）

LLM 生成 Canvas 2D JavaScript 代码，通过 `new Function()` 沙箱执行：

```json
{"type":"code_execute","code":"ctx.fillStyle='#0a0a2e'; ctx.fillRect(0,0,W,H); for(let i=0;i<200;i++){...}","speak":"画了一片星空"}
```

适用于：渐变、粒子、星空、彩虹、房子、树等复杂图案。

## 语音指令示例

| 指令 | 效果 | 路径 |
|------|------|------|
| 画一个红色圆形 | 在画布中心绘制红色圆形 | draw_shape |
| 画一个蓝色矩形 | 绘制蓝色矩形 | draw_shape |
| 写文字你好世界 | 在画布添加文字 | draw_shape |
| 画一片星空 | LLM 生成星空代码执行 | code_execute |
| 画一道彩虹 | LLM 生成彩虹渐变代码 | code_execute |
| 画一座房子 | LLM 生成组合图形代码 | code_execute |
| 撤销 | 撤销上一步操作 | canvas_action |
| 恢复 | 恢复撤销的操作 | canvas_action |
| 清空画布 | 删除所有内容 | canvas_action |
| 导出图片 | 下载为 PNG | canvas_action |

## 测试

```bash
cd backend
python -m pytest tests/ -v
```

28 个单元测试覆盖：指令解析、画布状态存储、API 路由。

## 项目结构

```
voice-canvas/
├── backend/                    # FastAPI 后端
│   ├── main.py                 # 入口 + CORS + 路由注册
│   ├── prompts/                # LLM prompt 模板
│   │   └── parse_command.txt   # 绘图指令解析 prompt
│   ├── routers/                # API 路由
│   ├── schemas/                # Pydantic 数据模型
│   ├── services/               # 业务逻辑
│   └── tests/                  # 单元测试
├── frontend/                   # React 前端
│   └── src/
│       ├── components/         # UI 组件
│       │   ├── ChatPanel.tsx   # 聊天面板（消息 + 语音按钮）
│       │   └── DrawingCanvas.tsx # 画布组件
│       ├── hooks/              # React Hooks
│       │   └── useVoiceCanvas.ts # 语音绘图主 Hook
│       ├── lib/                # 工具库
│       │   ├── canvasExecutor.ts # 命令执行器（draw_shape + code_execute）
│       │   └── canvasHistory.ts  # 快照式撤销/恢复
│       └── pages/
│           ├── LandingPage.tsx # 落地页（Try it 按钮）
│           └── CanvasPage.tsx  # 绘图页（画布 + 聊天面板）
└── docs/
    └── design-doc.md           # 设计文档
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + Vite + TypeScript |
| 画布 | 原生 Canvas 2D API |
| 语音 | Web Speech API (STT + TTS) |
| 后端 | FastAPI + Pydantic |
| LLM | mimo-v2.5-pro（兼容 OpenAI 格式） |
