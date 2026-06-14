/**
 * 语音绘图主 Hook
 *
 * 串联完整链路：语音识别 → 后端解析 → 画布执行 → TTS 反馈。
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { parseCompoundCommand, saveCanvasState, getSessionId } from '../lib/api';
import { executeCommand, executeCode, executeShape } from '../lib/canvasExecutor';
import type { DrawCommand } from '../lib/canvasExecutor';
import { CanvasHistory } from '../lib/canvasHistory';

export type ProcessingState = 'idle' | 'listening' | 'parsing' | 'executing';

interface Alternative {
  label: string;
  command: DrawCommand;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'system';
  text: string;
  time: Date;
}

interface VoiceCanvasState {
  state: ProcessingState;
  recognizedText: string;
  lastCommand: DrawCommand | null;
  lastMessage: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  alternatives: Alternative[];
  messages: ChatMessage[];
  startListening: () => void;
  stopListening: () => void;
  selectAlternative: (command: DrawCommand) => void;
  executeAction: (action: string) => Promise<void>;
}

/** 匹配语音选择建议的指令 */
function matchAlternativeSelection(text: string, alternatives: Alternative[]): Alternative | null {
  const t = text.trim();

  // 数字匹配："1", "2", "3" 或 "第一个", "第二个", "第三个"
  const numMap: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  };

  // "第一个", "选项2", "选1", "选第一个"
  const match = t.match(/(?:选|选项|第)?([一二三四五12345])(?:个|号)?/);
  if (match) {
    const idx = numMap[match[1]];
    if (idx && idx <= alternatives.length) {
      return alternatives[idx - 1];
    }
  }

  // "确认", "确定" → 选第一个
  if (/^(确认|确定|好的?|ok|yes)$/i.test(t)) {
    return alternatives[0];
  }

  return null;
}

export function useVoiceCanvas(
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>,
  historyRef: React.MutableRefObject<CanvasHistory | null>,
): VoiceCanvasState {
  const [state, setState] = useState<ProcessingState>('idle');
  const [lastCommand, setLastCommand] = useState<DrawCommand | null>(null);
  const [lastMessage, setLastMessage] = useState('');
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const speech = useSpeechRecognition();
  const processingRef = useRef(false);
  const lastFinalRef = useRef('');
  // 当前是否有待选择的建议
  const pendingAlternativesRef = useRef<Alternative[]>([]);

  // 保存画布状态到后端（防抖）
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const dataUrl = canvas.toDataURL('image/png');
      const sessionId = getSessionId();
      saveCanvasState(sessionId, { dataUrl });
    }, 500);
  }, [canvasRef]);

  // TTS 语音反馈
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  // 处理识别到的文本
  const processText = useCallback(
    async (text: string) => {
      if (!text.trim() || processingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      // 如果有待选建议，先检查是否是选择指令
      if (pendingAlternativesRef.current.length > 0) {
        const selected = matchAlternativeSelection(text, pendingAlternativesRef.current);
        if (selected) {
          pendingAlternativesRef.current = [];
          setAlternatives([]);
          // 添加用户消息
          setMessages((prev) => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            text,
            time: new Date(),
          }]);
          // 直接执行选中的建议
          const canvas = canvasRef.current;
          const ctx = ctxRef.current;
          if (canvas && ctx) {
            processingRef.current = true;
            setState('executing');
            const cmd = selected.command;
            let result: { success: boolean; message: string };
            if (cmd.type === 'draw_shape' && cmd.shape && cmd.params) {
              result = executeShape(ctx, canvas.width, canvas.height, cmd.shape, cmd.params);
            } else if (cmd.type === 'code_execute' && cmd.code) {
              result = executeCode(ctx, canvas.width, canvas.height, cmd.code);
            } else {
              result = executeCommand(canvas, ctx, cmd);
            }
            speak(result.message);
            setLastMessage(result.message);
            processingRef.current = false;
            setState('idle');
            historyRef.current?.save();
            saveCanvas();
          }
          return;
        }
        // 不是选择指令，清空待选状态，继续正常解析
        pendingAlternativesRef.current = [];
        setAlternatives([]);
      }

      processingRef.current = true;
      setState('parsing');

      // 添加用户消息
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text,
        time: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const { commands } = await parseCompoundCommand(text);
        const firstCommand = commands[0];
        setLastCommand(firstCommand);
        setAlternatives(firstCommand.alternatives || []);

        // 低置信度时展示建议列表
        if ((firstCommand.confidence ?? 1) < 0.7 && (firstCommand.alternatives?.length ?? 0) > 0) {
          const alts = firstCommand.alternatives!;
          // 语音播报编号选项
          const optionText = alts.map((a, i) => `${i + 1}、${a.label}`).join('，');
          speak(`您是否想说：${optionText}，请说编号选择`);
          pendingAlternativesRef.current = alts;
          setState('idle');
          processingRef.current = false;
          return;
        }

        // 执行命令
        setState('executing');
        speak(firstCommand.speak || '正在绘制');
        let lastResult: { success: boolean; message: string } | undefined;

        for (const cmd of commands) {
          if (cmd.action === 'undo') {
            const ok = await historyRef.current?.undo();
            lastResult = { success: !!ok, message: ok ? '已撤销' : '没有可撤销的操作' };
          } else if (cmd.action === 'redo') {
            const ok = await historyRef.current?.redo();
            lastResult = { success: !!ok, message: ok ? '已恢复' : '没有可恢复的操作' };
          } else if (cmd.type === 'draw_shape' && cmd.shape && cmd.params) {
            lastResult = executeShape(ctx, canvas.width, canvas.height, cmd.shape, cmd.params);
          } else if (cmd.type === 'code_execute' && cmd.code) {
            lastResult = executeCode(ctx, canvas.width, canvas.height, cmd.code);
          } else {
            lastResult = executeCommand(canvas, ctx, cmd);
          }
        }

        if (lastResult) {
          const msg = commands.length > 1
            ? `已执行 ${commands.length} 个操作`
            : lastResult.message;
          speak(msg);
          setLastMessage(msg);
          setMessages((prev) => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'system',
            text: msg,
            time: new Date(),
          }]);
          if (lastResult.success) {
            historyRef.current?.save();
            saveCanvas();
          }
        }
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error('[VoiceCanvas] 处理失败:', err);
        let msg = '处理失败，请重试';
        if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed')) {
          msg = '网络连接失败，请检查后端服务是否启动';
        } else if (err.message.includes('解析') || err.message.includes('JSON')) {
          msg = '指令理解失败，请换个说法试试';
        } else if (err.message.includes('代码') || err.message.includes('code')) {
          msg = '绘图代码执行失败，请换个说法试试';
        }
        speak(msg);
        setLastMessage(msg);
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'system',
          text: msg,
          time: new Date(),
        }]);
      } finally {
        processingRef.current = false;
        setState('idle');
      }
    },
    [canvasRef, ctxRef, historyRef, speak, saveCanvas],
  );

  // 选择建议指令（鼠标点击）
  const selectAlternative = useCallback(
    (command: DrawCommand) => {
      pendingAlternativesRef.current = [];
      setAlternatives([]);
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      processingRef.current = true;
      setState('executing');

      if (command.type === 'code_execute' && command.code) {
        const result = executeCode(ctx, canvas.width, canvas.height, command.code);
        speak(result.message);
        setLastMessage(result.message);
      } else {
        const result = executeCommand(canvas, ctx, command);
        speak(result.message);
        setLastMessage(result.message);
      }

      processingRef.current = false;
      setState('idle');
      historyRef.current?.save();
      saveCanvas();
    },
    [canvasRef, ctxRef, historyRef, speak, saveCanvas],
  );

  // 直接执行操作（工具栏按钮）
  const executeAction = useCallback(
    async (action: string) => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      const cmd: DrawCommand = { type: 'canvas_action', action: action as DrawCommand['action'] };

      if (action === 'undo') {
        const ok = await historyRef.current?.undo();
        const msg = ok ? '已撤销' : '没有可撤销的操作';
        speak(msg);
        setLastMessage(msg);
      } else if (action === 'redo') {
        const ok = await historyRef.current?.redo();
        const msg = ok ? '已重做' : '没有可重做的操作';
        speak(msg);
        setLastMessage(msg);
      } else {
        const result = executeCommand(canvas, ctx, cmd);
        speak(result.message);
        setLastMessage(result.message);
      }
      historyRef.current?.save();
      saveCanvas();
    },
    [canvasRef, ctxRef, historyRef, speak, saveCanvas],
  );

  // 监听语音识别的 finalText 变化
  useEffect(() => {
    if (speech.finalText && speech.finalText !== lastFinalRef.current) {
      lastFinalRef.current = speech.finalText;
      processText(speech.finalText);
    }
  }, [speech.finalText, processText]);

  // 更新状态
  useEffect(() => {
    if (speech.isListening && state === 'idle' && !processingRef.current) {
      setState('listening');
    }
  }, [speech.isListening, state]);

  return {
    state,
    recognizedText: speech.interimText || speech.finalText,
    lastCommand,
    lastMessage,
    isListening: speech.isListening,
    isSupported: speech.isSupported,
    error: speech.error,
    alternatives,
    messages,
    startListening: speech.start,
    stopListening: speech.stop,
    selectAlternative,
    executeAction,
  };
}
