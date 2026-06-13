# Voice Canvas - AI 语音绘图工具

纯语音控制的 AI 绘图应用。通过语音指令完成绘图创作，无需鼠标或键盘操作。

七牛云 XEngineer 暑期实训营 · 题目二

## 功能特性

- 🎤 **语音控制** — 点击麦克风按钮，说出指令即可绘图
- 🎨 **基础绘图** — 圆形、矩形、三角形、直线、文字
- 🖼️ **AI 生图** — 语音描述，AI 自动生成图片
- ✏️ **对象操作** — 选中、移动、缩放、旋转、删除
- 📐 **画布控制** — 缩放、撤销/重做、导出图片
- 💬 **建议指令** — 低置信度时展示候选指令列表
- 💾 **状态恢复** — 刷新页面自动恢复画布内容

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

打开浏览器访问 http://localhost:5173，点击 🎤 按钮开始语音指令。

## 环境变量

### 后端 (`backend/.env`)

```env
# LLM 指令解析（兼容 OpenAI 格式的任意 API）
LLM_API_KEY=your-llm-api-key
LLM_BASE_URL=https://your-llm-base-url/v1
LLM_MODEL=mimo-v2.5-pro

# 图像生成（兼容 OpenAI images 格式的任意 API）
IMAGE_API_URL=https://apihub.agnes-ai.com/v1/images/generations
IMAGE_API_KEY=your-image-api-key
IMAGE_MODEL=agnes-image-2.1-flash
IMAGE_SIZE=1024x768
```

### 前端 (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

## 语音指令示例

| 指令 | 效果 |
|------|------|
| 画一个红色圆形 | 在画布中心绘制红色圆形 |
| 画一只猫 | AI 生成猫咪图片 |
| 选中圆形 | 选中画布上的圆形 |
| 放大两倍 | 将选中对象放大 |
| 旋转45度 | 旋转选中对象 |
| 改成蓝色 | 修改选中对象颜色 |
| 向上移动50 | 移动选中对象 |
| 添加文字你好世界 | 在画布添加文字 |
| 放大画布 / 缩小 | 画布缩放 |
| 撤销 / 重做 | 操作历史 |
| 保存图片 | 导出为 PNG |
| 清空画布 | 删除所有对象 |
| 画三个红色圆形排成一排 | 批量绘制 |

## 测试

```bash
cd backend
python -m pytest tests/ -v
```

36 个单元测试覆盖：指令解析、图像生成、SSE 端点、画布状态存储。

## 项目结构

```
voice-canvas/
├── backend/                # FastAPI 后端
│   ├── main.py             # 入口 + CORS + 路由注册
│   ├── prompts/            # LLM prompt 模板
│   ├── routers/            # API 路由
│   ├── schemas/            # Pydantic 数据模型
│   ├── services/           # 业务逻辑
│   └── tests/              # 测试
├── frontend/               # React 前端
│   └── src/
│       ├── components/     # UI 组件
│       ├── hooks/          # React Hooks
│       └── lib/            # 工具库
└── docs/
    └── design-doc.md       # 设计文档
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + Vite + TypeScript |
| 画布 | Fabric.js |
| 语音 | Web Speech API (STT + TTS) |
| 后端 | FastAPI + Pydantic |
| LLM | mimo-v2.5-pro（兼容 OpenAI 格式） |
| 生图 | Agnes Image 2.1 Flash（兼容 OpenAI images 格式） |
