# Voice Canvas 设计文档

## 项目概述

Voice Canvas 是一个纯语音控制的 AI 绘图工具，用户通过自然语言语音指令控制画布绘图、AI 图像生成、对象操作等。

## 系统架构

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  React + TypeScript + Vite + Fabric.js       │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Voice    │  │  Canvas   │  │ Suggestion│  │
│  │  Control  │  │  Executor │  │   List    │  │
│  └────┬─────┘  └────┬─────┘  └───────────┘  │
│       │              │                        │
│  ┌────┴──────────────┴─────┐                 │
│  │    useVoiceCanvas Hook   │                 │
│  │  语音→解析→执行→TTS反馈   │                 │
│  └────────────┬────────────┘                 │
└───────────────┼──────────────────────────────┘
                │ HTTP / SSE
┌───────────────┼──────────────────────────────┐
│               │         Backend               │
│  ┌────────────┴────────────┐                 │
│  │    FastAPI + Pydantic    │                 │
│  └────┬──────┬──────┬──────┘                 │
│       │      │      │                         │
│  ┌────┴┐ ┌──┴──┐ ┌┴───────┐                 │
│  │ LLM │ │Image│ │ Canvas │                 │
│  │Parse│ │ Gen │ │ Store  │                 │
│  └─────┘ └─────┘ └────────┘                 │
└──────────────────────────────────────────────┘
```

## 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 前端框架 | React + TypeScript | 类型安全，组件化开发 |
| 构建工具 | Vite | 快速热更新，ESM 原生支持 |
| 画布库 | Fabric.js | 成熟的对象模型、事件系统、序列化支持 |
| 语音识别 | Web Speech API | 浏览器原生，零依赖，Chrome 支持良好 |
| 语音合成 | SpeechSynthesis API | 浏览器原生，zh-CN 支持 |
| 后端框架 | FastAPI | 异步支持好，自动 OpenAPI 文档 |
| LLM | mimo-v2.5-pro | 中文理解好，兼容 OpenAI 格式 |
| 图像生成 | Agnes Image 2.1 Flash | 兼容 OpenAI images 格式，通过环境变量切换 |
| 状态管理 | 内存 dict + localStorage | 规则要求无 Redis，双备份方案 |

## 指令体系

### 指令类型

| 类型 | 说明 | 示例 |
|------|------|------|
| canvas_action | 画布操作 | 画圆、清空、撤销 |
| ai_generate | AI 图像生成 | 画一只猫 |

### 画布操作

| action | 功能 | 语音示例 |
|--------|------|----------|
| draw | 绘制图形 | 画一个红色圆形 |
| modify | 修改属性 | 改成蓝色 |
| move | 移动对象 | 向上移动50 |
| scale | 缩放对象 | 放大两倍 |
| rotate | 旋转对象 | 旋转45度 |
| select | 选中对象 | 选中圆形 |
| delete | 删除对象 | 删除选中的 |
| clear | 清空画布 | 清空画布 |
| undo/redo | 撤销/重做 | 撤销 |
| zoomIn/Out | 画布缩放 | 放大画布 |
| export | 导出图片 | 保存图片 |

### 复合指令

支持数量词拆解："画三个红色圆形排成一排" → 3 个 draw 命令

## 核心流程

```
用户语音 → Web Speech API (STT)
    → 文本 → POST /api/parse-compound
    → LLM 解析 → DrawCommand[]
    → canvasExecutor 执行
    → Fabric.js 画布操作
    → TTS 语音反馈
```

## 容错机制

| 场景 | 处理 |
|------|------|
| LLM 返回非标准 JSON | 正则提取 + 尾逗号修复 + markdown 块剥离 |
| LLM 返回空内容 | 3 次重试 + 指数退避 |
| LLM 调用失败 | 关键词匹配兜底（清空/撤销/画XX） |
| 低置信度 (<0.7) | 展示建议指令列表 + TTS 播报 |
| 网络错误 | 区分错误类型 + 语音提示 |
| 图片 CORS | 后端返回 base64 data URL |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/parse-command | 单条指令解析 |
| POST | /api/parse-compound | 复合指令解析 |
| POST | /api/generate-image | AI 图像生成 (SSE) |
| GET | /api/canvas/state/{id} | 获取画布状态 |
| PUT | /api/canvas/state/{id} | 保存画布状态 |
| DELETE | /api/canvas/state/{id} | 删除画布状态 |
| GET | /api/health | 健康检查 |

## 环境变量

### 后端 (.env)

```env
# LLM 指令解析
LLM_API_KEY=your-key
LLM_BASE_URL=your-base-url
LLM_MODEL=mimo-v2.5-pro

# 图像生成（兼容 OpenAI images 格式）
IMAGE_API_URL=https://apihub.agnes-ai.com/v1/images/generations
IMAGE_API_KEY=your-key
IMAGE_MODEL=agnes-image-2.1-flash
IMAGE_SIZE=1024x768
```

### 前端 (.env)

```env
VITE_API_URL=http://localhost:8000
```

## 项目结构

```
voice-canvas/
├── backend/
│   ├── main.py                 # FastAPI 入口
│   ├── prompts/                # LLM prompt 模板
│   ├── routers/                # API 路由
│   │   ├── commands.py         # 指令解析
│   │   ├── generate.py         # 图像生成 SSE
│   │   └── canvas.py           # 画布状态
│   ├── schemas/                # Pydantic 数据模型
│   ├── services/               # 业务逻辑
│   │   ├── command_parser.py   # LLM 解析 + 兜底
│   │   ├── image_generator.py  # 图像生成
│   │   └── canvas_store.py     # 画布状态存储
│   └── tests/                  # 36 个测试
├── frontend/
│   └── src/
│       ├── components/         # UI 组件
│       │   ├── DrawingCanvas.tsx
│       │   ├── VoiceControl.tsx
│       │   └── SuggestionList.tsx
│       ├── hooks/              # React Hooks
│       │   ├── useSpeechRecognition.ts
│       │   └── useVoiceCanvas.ts
│       └── lib/                # 工具库
│           ├── api.ts          # API 客户端
│           ├── canvasExecutor.ts  # 命令执行器
│           └── canvasHistory.ts   # 撤销/重做
└── docs/
    └── design-doc.md           # 本文档
```
