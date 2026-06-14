/**
 * API 客户端
 *
 * 封装与后端的通信：指令解析、画布状态。
 */

import type { DrawCommand } from './canvasExecutor';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** 解析响应 */
interface ParseResponse {
  command: DrawCommand;
  raw_text: string;
}

/** 复合指令解析响应 */
interface CompoundParseResponse {
  commands: DrawCommand[];
  raw_text: string;
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
 * 解析复合指令（支持 "画三个圆形" 等批量操作）
 */
export async function parseCompoundCommand(text: string): Promise<CompoundParseResponse> {
  const res = await fetch(`${API_BASE}/api/parse-compound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`复合指令解析失败: ${res.status}`);
  }

  return res.json();
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

// ---- 画布状态管理 ----

/** 生成或获取 session ID（基于浏览器，持久化到 localStorage） */
export function getSessionId(): string {
  let id = localStorage.getItem('voice-canvas-session-id');
  if (!id) {
    id = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('voice-canvas-session-id', id);
  }
  return id;
}

/** 保存画布状态到后端 */
export async function saveCanvasState(sessionId: string, canvasJson: object): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/canvas/state/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas_json: canvasJson }),
    });
  } catch {
    // 静默失败，不影响主流程
  }
}

/** 从后端恢复画布状态 */
export async function loadCanvasState(sessionId: string): Promise<object | null> {
  try {
    const res = await fetch(`${API_BASE}/api/canvas/state/${sessionId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.canvas_json;
  } catch {
    return null;
  }
}
