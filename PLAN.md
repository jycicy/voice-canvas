# Voice Canvas - 开发计划

## 背景

七牛云 XEngineer 暑期实训营，题目二：AI 语音绘图工具。

- 72h 开发（6/10 - 6/12）
- 用户不能使用鼠标或键盘，仅通过语音指令完成绘图创作
- 需要综合考虑指令理解的准确性与容错性、语音到绘图操作的响应延迟、复杂指令的拆解与执行能力
- 额外提交设计文档：计划支持哪些指令能力、最终实现了哪些、未完成部分的原因说明
- 评审标准：完整度与创新性 40% / 开发过程与质量 40% / 演示与表达 20%
- 每个 PR 只做一件事，粒度尽可能细

---

## 技术架构

```
voice-canvas/
├── frontend/          # React + Fabric.js + Web Speech API
├── backend/           # FastAPI + mimo-v2.5-pro + DALL-E 3
└── docs/              # 设计文档
```

**核心数据流：**

```
语音输入 → Web Speech API (STT) → 文本指令 → FastAPI 接收
                                                    ↓
                                    mimo-v2.5-pro 解析意图
                                     ↙              ↘
                            canvas_action        ai_generate
                                ↓                    ↓
                          Fabric.js 执行       DALL-E 3 生成
                                ↓               (SSE 进度推送)
                                ↓                    ↓
                          画布更新 ←──────── 图片加载到画布
                                ↓
                        TTS 语音反馈结果
```

**LLM 策略：** 使用 mimo-v2.5-pro 将自然语言解析为结构化命令（`canvas_action` 或 `ai_generate`），DALL-E 3 用于 AI 图像生成，通过 SSE 推送生成进度。

---

## 指令能力设计

### 计划支持的指令分类

| 分类 | 指令示例 | 命令类型 | 优先级 |
|------|---------|---------|--------|
| AI 生成 | "画一只猫"、"生成一幅山水画" | `ai_generate` | P0 |
| 基础图形 | "画一个圆"、"画一个红色矩形"、"画一条直线" | `canvas_action` | P0 |
| 画布操作 | "清空画布"、"撤销"、"重做" | `canvas_action` | P0 |
| 颜色设置 | "设置颜色为蓝色"、"填充黄色"、"描边红色" | `canvas_action` | P0 |
| 对象选择 | "选中这个圆形"、"选择所有图形" | `canvas_action` | P1 |
| 对象变换 | "放大这个图形"、"向右移动50像素"、"旋转45度" | `canvas_action` | P1 |
| 对象删除 | "删除这个"、"删除所有圆形" | `canvas_action` | P1 |
| 文字添加 | "添加文字 你好世界"、"写一行字" | `canvas_action` | P1 |
| 样式修改 | "线条加粗"、"设置透明度50%"、"虚线样式" | `canvas_action` | P2 |
| 画布控制 | "放大画布"、"缩小画布"、"重置视图" | `canvas_action` | P2 |
| 导出操作 | "保存图片"、"导出画布" | `canvas_action` | P2 |
| 复合指令 | "画三个红色圆形排成一排" | 多命令拆解 | P2 |

### 容错设计

1. **LLM 语义兜底**：Web Speech API 识别结果可能有错别字，通过 LLM 语义理解纠正
2. **建议指令列表**：LLM 置信度 < 0.7 时，返回候选指令列表，前端展示供用户确认（语音+点击双通道）
3. **执行失败回退**：绘图操作失败时 TTS 播报错误原因，提示重新输入
4. **超时处理**：语音识别无输入 3 秒后自动停止，需重新唤醒
5. **JSON 修复**：LLM 输出非标准 JSON 时自动修复 + 重试

---

## API Endpoints

| Endpoint | Method | 功能 |
|----------|--------|------|
| `/api/parse-command` | POST | LLM 解析语音指令为结构化绘图命令 |
| `/api/generate-image` | POST | DALL-E 3 AI 图像生成（SSE 流式返回进度） |
| `/api/canvas/state` | GET | 获取当前画布状态（JSON） |
| `/api/canvas/state` | PUT | 保存画布状态 |
| `/api/canvas/export` | POST | 导出画布为图片 |
| `/api/health` | GET | 健康检查 |

---

## 结构化绘图命令格式

```json
{
  "type": "canvas_action" | "ai_generate",
  "action": "draw" | "modify" | "delete" | "select" | "clear" | "undo" | "redo" | "export",
  "target": {
    "type": "circle" | "rect" | "line" | "triangle" | "text" | "polygon" | "image" | "selected" | "all",
    "filter": { "color": "red", "shape": "circle" }
  },
  "params": {
    "left": 100, "top": 100,
    "width": 200, "height": 150,
    "radius": 50,
    "fill": "#FF0000",
    "stroke": "#000000",
    "strokeWidth": 2,
    "text": "Hello",
    "fontSize": 24,
    "angle": 45,
    "scaleX": 1.5, "scaleY": 1.5,
    "opacity": 0.5
  },
  "prompt": "一只可爱的猫",
  "confidence": 0.95,
  "speak": "正在画一个红色的圆形",
  "alternatives": [
    { "label": "画一个红色圆形", "command": { "...": "..." } },
    { "label": "画一个蓝色圆形", "command": { "...": "..." } }
  ]
}
```

> `alternatives` 字段：当 confidence < 0.7 时，LLM 返回备选指令列表，前端展示供用户选择。

---

## PR 计划（共 11 个 PR）

> 采用"尽早集成"策略：PR #5 完成前后端全链路打通，后续 PR 逐步扩展指令能力。
> 每天约 3-4 个 PR，保持持续交付节奏。

---

### PR #1：项目初始化（6/10 上午）

**分支：** `feat/project-init`

**做什么：** 初始化前后端项目，配置基础依赖，确保项目可运行

**Commits：**
1. `feat: 初始化 React 前端项目` — `frontend/`（Vite + React + TypeScript + Fabric.js）
2. `feat: 初始化 FastAPI 后端项目` — `backend/`（FastAPI + pydantic + openai + httpx）
3. `feat: 添加项目配置文件` — `.gitignore`, `README.md`, 前后端 `.env.example`
4. `feat: 添加健康检查端点` — `backend/main.py`（GET /api/health）

**测试：** `npm run dev` 前端可访问，`uvicorn main:app` 后端 `/api/health` 返回 200

---

### PR #2：后端 LLM 指令解析服务（6/10 上午）

**分支：** `feat/llm-parser`

**做什么：** 定义绘图命令数据模型，实现 LLM 语音指令解析核心服务

**Commits：**
1. `feat: 定义绘图命令 Pydantic 模型` — `backend/schemas/commands.py`（DrawCommand, DrawParams, Target, Alternative）
2. `feat: 添加 LLM 解析 prompt 模板` — `backend/prompts/parse_command.txt`（含指令分类、输出格式、置信度要求）
3. `feat: 实现 LLM 指令解析服务` — `backend/services/command_parser.py`（调用 mimo-v2.5-pro，返回结构化命令 + alternatives）
4. `feat: 添加解析 API 端点` — `backend/routers/commands.py`（POST /api/parse-command）

**测试：** curl POST `{"text": "画一个红色圆形"}`，返回 action=draw, type=circle, fill=red, confidence>0.8

---

### PR #3：DALL-E 3 图像生成服务 + SSE 进度（6/10 下午）

**分支：** `feat/image-gen`

**做什么：** 集成 DALL-E 3 API，实现 AI 图像生成，SSE 推送生成进度

**Commits：**
1. `feat: 实现图像生成服务` — `backend/services/image_generator.py`（DALL-E 3 API 调用）
2. `feat: 实现 SSE 进度推送` — `backend/routers/generate.py`（POST /api/generate-image，SSE 流式返回：generating → completed + image_url）
3. `feat: 实现 LLM 意图判断` — 更新 `command_parser.py`（区分 `canvas_action` 和 `ai_generate` 两种类型）

**测试：** curl POST "画一只猫"，SSE 流收到 `event: generating` → `event: completed` + 图片 URL

---

### PR #4：Fabric.js 画布核心 + 命令执行器（6/10 下午）

**分支：** `feat/fabric-canvas`

**做什么：** 实现 Fabric.js 画布组件和命令执行器，画布可独立运行

**Commits：**
1. `feat: 实现 Canvas 画布组件` — `frontend/src/components/DrawingCanvas.tsx`（Fabric.js 初始化 + 对象操作）
2. `feat: 实现绘图命令执行器` — `frontend/src/lib/canvasExecutor.ts`（结构化命令 → Fabric.js 操作：draw/modify/delete/select/clear）
3. `feat: 实现画布历史管理` — `frontend/src/lib/canvasHistory.ts`（撤销/重做状态栈）
4. `feat: 更新首页集成画布` — `frontend/src/App.tsx`

**测试：** 浏览器控制台调用 `canvasExecutor.execute({action:"draw", target:{type:"circle"}, params:{fill:"red", radius:50}})`，画布出现红色圆形

---

### PR #5：语音识别 + 前后端全链路集成（6/10 晚上）⭐

**分支：** `feat/voice-integration`

**做什么：** 实现语音识别，串联 语音→后端解析→画布执行 的完整链路，这是项目的里程碑 PR

**Commits：**
1. `feat: 实现语音识别 hook` — `frontend/src/hooks/useSpeechRecognition.ts`（Web Speech API 封装，zh-CN，中断重试）
2. `feat: 实现 API 客户端` — `frontend/src/lib/api.ts`（parseCommand, generateImageSSE, canvasState）
3. `feat: 实现语音处理主 hook` — `frontend/src/hooks/useVoiceCanvas.ts`（识别 → 解析 → 路由：canvas_action 直接执行 / ai_generate 进入 SSE 等待）
4. `feat: 实现语音控制面板` — `frontend/src/components/VoiceControl.tsx`（开始/停止录音 + 实时识别文字展示）
5. `feat: 实现 TTS 语音反馈` — 更新 `useVoiceCanvas.ts`（SpeechSynthesis 播报执行结果）
6. `feat: 集成语音控制到画布` — 更新 `App.tsx`（语音指令实时驱动画布）

**测试：** 说"清空画布" → 画布清空 + 语音播报；说"画一个红色圆形" → 画布出现红色圆形 + 语音播报"已绘制红色圆形"

> **里程碑意义：** 此 PR 完成后，项目的核心流程已跑通，后续 PR 是能力扩展和体验优化。

---

### PR #6：DALL-E 图片渲染到画布 + SSE 进度体验（6/11 上午）

**分支：** `feat/ai-image-render`

**做什么：** 前端接入 SSE 进度推送，AI 生成的图片渲染到 Fabric.js 画布

**Commits：**
1. `feat: 前端实现 SSE 客户端` — 更新 `api.ts`（EventSource / fetch + ReadableStream 接收生成进度）
2. `feat: AI 图片加载到画布` — 更新 `canvasExecutor.ts`（Fabric.js Image.fromURL 加载 DALL-E 返回的图片）
3. `feat: 实现生成进度 UI` — `frontend/src/components/GenerationProgress.tsx`（进度动画 + "AI 正在作画中..." + TTS "正在生成图片，请稍等"）

**测试：** 说"画一只猫" → 显示进度动画 → 10-20 秒后画布出现猫的图片 + TTS "图片已生成"

---

### PR #7：对象操作与变换指令（6/11 中午）

**分支：** `feat/object-manipulation`

**做什么：** 实现对象选择、移动、缩放、旋转、删除等高级操作

**Commits：**
1. `feat: 扩展命令执行器支持对象操作` — 更新 `canvasExecutor.ts`（select, move, scale, rotate, delete）
2. `feat: 实现对象选择逻辑` — 更新 `DrawingCanvas.tsx`（按类型/颜色筛选、选中高亮、"最后绘制"选中）
3. `feat: 优化 LLM prompt 支持复合指令` — 更新 `parse_command.txt`（"选中红色圆形放大两倍" → select + modify）

**测试：** 说"画一个圆" → "画一个矩形" → "选中圆形" → "放大两倍" → 只有圆形放大

---

### PR #8：文字、样式与画布控制指令（6/11 下午）

**分支：** `feat/text-style`

**做什么：** 支持文字添加、样式修改、画布缩放、导出等扩展指令

**Commits：**
1. `feat: 扩展执行器支持文字` — 更新 `canvasExecutor.ts`（Fabric.js IText，支持语音指定内容）
2. `feat: 扩展样式修改命令` — 更新 `canvasExecutor.ts`（fill, stroke, strokeWidth, opacity, 虚线等）
3. `feat: 添加画布控制与导出` — 更新 `canvasExecutor.ts`（zoomIn/zoomOut/resetView + canvas export toDataURL）
4. `feat: 添加复合指令拆解` — 更新 `command_parser.py`（"画三个红色圆形排成一排" → 3 个 draw 命令）

**测试：** 说"添加文字 你好世界" → 画布显示文字 → "改成蓝色" → 文字变蓝 → "保存图片" → 触发下载

---

### PR #9：建议指令列表 + 容错优化（6/11 晚上）

**分支：** `feat/fallback-suggestions`

**做什么：** 实现低置信度时的建议指令列表，完善各类容错机制

**Commits：**
1. `feat: 前端实现建议指令组件` — `frontend/src/components/SuggestionList.tsx`（展示候选指令列表，支持点击选择）
2. `feat: 集成建议列表到语音流程` — 更新 `useVoiceCanvas.ts`（confidence < 0.7 时展示 alternatives，TTS 播报"您是否想说..."）
3. `feat: LLM 解析服务添加重试逻辑` — 更新 `command_parser.py`（3 次重试 + 指数退避 + JSON 修复）
4. `feat: 前端错误处理与语音提示` — 更新 `useVoiceCanvas.ts`（网络错误、解析失败、执行失败的 TTS 提示）

**测试：** 说一句模糊指令 → TTS "您是否想说..." + 界面显示候选列表 → 点击/语音选择 → 执行

---

### PR #10：画布状态管理（6/12 上午）

**分支：** `feat/canvas-state`

**做什么：** 用内存 dict 管理画布状态，支持状态持久化和恢复

**Commits：**
1. `feat: 实现画布状态存储服务` — `backend/services/canvas_store.py`（内存 dict，按 session_id 隔离）
2. `feat: 添加画布状态 API 端点` — `backend/routers/canvas.py`（GET/PUT /api/canvas/state）
3. `feat: 前端自动保存画布状态` — 更新 `useVoiceCanvas.ts`（每次操作后自动 PUT 到后端 + localStorage 双备份）
4. `feat: 页面加载时恢复画布` — 更新 `App.tsx`（GET /api/canvas/state → canvasExecutor 恢复）

**测试：** 画几个图形 → 刷新页面 → 画布恢复之前的内容

---

### PR #11：设计文档 + 最终打磨（6/12 下午）

**分支：** `feat/final-docs`

**做什么：** 编写设计文档，UI 视觉优化，README 完善，确保一键可演示

**Commits：**
1. `docs: 添加设计文档` — `docs/design-doc.md`（计划指令 vs 实现指令对比表、未完成原因分析、技术选型理由、系统架构图）
2. `docs: 完善 README` — `README.md`（功能截图、环境变量表、快速启动指南、依赖列表）
3. `style: 语音按钮 UI 优化` — 更新 `VoiceControl.tsx`（脉冲动画、状态颜色、录音波形）
4. `style: 画布主题与整体视觉` — 更新 `DrawingCanvas.tsx` + `App.tsx`（深色主题、响应式布局、引导提示）

**测试：** 全新 clone → 配置 `.env` → `npm run dev` + `uvicorn` → 端到端 Demo 流程顺畅

---

## Git 分支策略

```
main
├── feat/project-init         (PR #1)
├── feat/llm-parser           (PR #2)
├── feat/image-gen            (PR #3)
├── feat/fabric-canvas        (PR #4)
├── feat/voice-integration    (PR #5)  ⭐ 里程碑：全链路打通
├── feat/ai-image-render      (PR #6)
├── feat/object-manipulation  (PR #7)
├── feat/text-style           (PR #8)
├── feat/fallback-suggestions (PR #9)
├── feat/canvas-state         (PR #10)
└── feat/final-docs           (PR #11)
```

每个 PR 从 main 创建，合并后下一个 PR 再从 main 拉取。

---

## 每日节奏

| 日期 | PR | 核心内容 | 里程碑 |
|------|-----|---------|--------|
| 6/10 上 | #1, #2 | 项目初始化 + LLM 指令解析 | |
| 6/10 下 | #3, #4 | DALL-E SSE + Fabric.js 画布 | |
| 6/10 晚 | #5 | **语音→绘图全链路集成** | ⭐ 核心流程跑通 |
| 6/11 上 | #6 | AI 图片渲染 + SSE 进度体验 | |
| 6/11 中 | #7 | 对象操作与变换 | |
| 6/11 下 | #8 | 文字、样式、画布控制 | |
| 6/11 晚 | #9 | 建议指令 + 容错优化 | |
| 6/12 上 | #10 | 画布状态管理 | |
| 6/12 下 | #11 | 设计文档 + 最终打磨 | 🎬 可演示 |

---

## PR 描述模板

每个 PR 合并时使用以下格式：

```
## 标题
一句话说明本 PR 新增/修改了什么

## 功能描述
说明该功能的作用与使用方式

## 实现思路
简要说明技术选型或核心实现逻辑

## 测试方式
如何验证该功能正常运行

## 变更文件
- file1: 说明
- file2: 说明
```

---

## 环境变量

**Frontend** (`.env`):

```
VITE_API_URL=http://localhost:8000
```

**Backend** (`.env`):

```
LLM_API_KEY=你的密钥
LLM_BASE_URL=API地址
LLM_MODEL=mimo-v2.5-pro
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=API地址
```

---

## 关键技术决策

1. **Vite + React** — 轻量快速，纯前端 SPA 场景比 Next.js 更合适
2. **Fabric.js** — 成熟的 Canvas 库，内置对象模型、事件系统、序列化/反序列化
3. **Web Speech API** — 浏览器原生 API，零依赖，Chrome 支持良好
4. **LLM 解析而非正则** — 自然语言指令变化多端，LLM 语义理解比正则匹配更鲁棒
5. **SSE 推送 DALL-E 进度** — 10-20 秒生成时间需要实时进度反馈，比轮询更高效
6. **内存 dict** — 规则要求无 Redis，内存存储 + localStorage 双备份
7. **TTS 语音反馈** — 纯语音交互必须有语音反馈，使用 SpeechSynthesis API
8. **建议指令列表** — 低置信度时的降级方案，比纯语音确认更可靠

---

## 风险与对策

| 风险 | 对策 |
|------|------|
| Web Speech API 浏览器兼容性 | 降级方案：显示文字输入框，但默认隐藏 |
| LLM 解析延迟 > 2s | 加载动画 + TTS "正在理解..."，异步处理 |
| LLM 输出非标准 JSON | JSON 修复 + 重试 + 兜底关键词匹配 |
| DALL-E 3 生成耗时长 (10-20s) | SSE 实时进度推送 + TTS "正在生成图片，请稍等" + 进度动画 |
| 复杂指令拆解失败 | 降级为单步执行，建议指令列表辅助 |
| 语音识别准确率低 | LLM 语义兜底 + 建议指令列表 + 文字输入降级 |
| 纯语音模式限制 | MVP 以"点击录音+说话"为主，不强制完全无接触（时间约束） |
