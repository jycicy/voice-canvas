/**
 * API 客户端
 *
 * 封装与后端的通信：指令解析、图像生成（SSE）、画布状态。
 */

import type { DrawCommand } from './canvasExecutor';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** 解析响应 */
interface ParseResponse {
  command: DrawCommand;
  raw_text: string;
}

/** SSE 事件回调 */
interface GenerateCallbacks {
  onGenerating?: (data: { message: string; prompt: string }) => void;
  onCompleted?: (data: { message: string; url: string; revised_prompt: string }) => void;
  onError?: (data: { message: string }) => void;
}

/**
 * 发送语音文本到后端解析为绘图命令
 */
export async function parseCommand(text: string): Promise<ParseResponse> {
  const res = await fetch(`${API_BASE}/api/parse-command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`解析请求失败: ${res.status}`);
  }

  return res.json();
}

/**
 * 调用 DALL-E 3 生成图像（SSE 流式）
 */
export async function generateImage(
  prompt: string,
  callbacks: GenerateCallbacks,
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error(`图像生成请求失败: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();
  let buffer = '';
  let imageUrl = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // 按 SSE 事件分割
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event.trim().split('\n');
      let eventType = '';
      let eventData = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7);
        } else if (line.startsWith('data: ')) {
          eventData = line.slice(6);
        }
      }

      if (!eventType || !eventData) continue;

      try {
        const data = JSON.parse(eventData);

        switch (eventType) {
          case 'generating':
            callbacks.onGenerating?.(data);
            break;
          case 'completed':
            imageUrl = data.url;
            callbacks.onCompleted?.(data);
            break;
          case 'error':
            callbacks.onError?.(data);
            throw new Error(data.message);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // JSON 解析错误跳过
        throw e;
      }
    }
  }

  return imageUrl;
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
