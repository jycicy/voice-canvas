# Voice Canvas - AI 语音绘图工具

纯语音控制的 AI 绘图应用。通过语音指令完成绘图创作，无需鼠标或键盘操作。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + Vite + TypeScript + Fabric.js |
| 语音采集 | Web Speech API |
| 后端 | FastAPI (Python) |
| 指令解析 | mimo-v2.5-pro |
| AI 绘图 | DALL-E 3 |

## 快速启动

### 后端

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # 填写 API Key
uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
cp .env.example .env  # 默认连接 localhost:8000
npm run dev
```

访问 http://localhost:5173 即可使用。

## 环境变量

**Backend** (`.env`):

```
LLM_API_KEY=你的密钥
LLM_BASE_URL=API地址
LLM_MODEL=mimo-v2.5-pro
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=API地址
```

**Frontend** (`.env`):

```
VITE_API_URL=http://localhost:8000
```
