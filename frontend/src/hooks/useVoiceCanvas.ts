/**
 * 语音绘图主 Hook
 *
 * 串联完整链路：语音识别 → 后端解析 → 画布执行 → TTS 反馈。
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { useSpeechRecognition } from './useSpeechRecognition';
import { parseCompoundCommand, generateImage, saveCanvasState, getSessionId } from '../lib/api';
import { executeCommand } from '../lib/canvasExecutor';
import type { DrawCommand } from '../lib/canvasExecutor';
import { CanvasHistory } from '../lib/canvasHistory';

export type ProcessingState = 'idle' | 'listening' | 'parsing' | 'executing' | 'generating';

interface Alternative {
  label: string;
  command: DrawCommand;
}

interface VoiceCanvasState {
  /** 当前处理状态 */
  state: ProcessingState;
  /** 最近识别的文本 */
  recognizedText: string;
  /** 最近执行的命令 */
  lastCommand: DrawCommand | null;
  /** 最近的反馈消息 */
  lastMessage: string;
  /** 语音识别结果 */
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  /** 建议指令列表 */
  alternatives: Alternative[];
  /** 控制方法 */
  startListening: () => void;
  stopListening: () => void;
  selectAlternative: (command: DrawCommand) => void;
}

export function useVoiceCanvas(
  canvasRef: React.MutableRefObject<fabric.Canvas | null>,
  historyRef: React.MutableRefObject<CanvasHistory | null>,
): VoiceCanvasState {
  const [state, setState] = useState<ProcessingState>('idle');
  const [lastCommand, setLastCommand] = useState<DrawCommand | null>(null);
  const [lastMessage, setLastMessage] = useState('');
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);

  const speech = useSpeechRecognition();
  const processingRef = useRef(false);
  const lastFinalRef = useRef('');

  // 保存画布状态到后端（防抖）
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const saveCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const json = canvasRef.current!.toJSON();
      const sessionId = getSessionId();
      saveCanvasState(sessionId, json);
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
      if (!canvasRef.current) return;

      processingRef.current = true;
      setState('parsing');
      speak('正在理解...');

      try {
        // 1. 调用后端解析（支持复合指令）
        const { commands } = await parseCompoundCommand(text);
        const firstCommand = commands[0];
        setLastCommand(firstCommand);
        setAlternatives(firstCommand.alternatives || []);

        // 低置信度时展示建议列表
        if ((firstCommand.confidence ?? 1) < 0.7 && (firstCommand.alternatives?.length ?? 0) > 0) {
          speak('您是否想说' + (firstCommand.alternatives![0]?.label || ''));
          setState('idle');
          processingRef.current = false;
          return;
        }

        // 2. 根据命令类型分发
        if (firstCommand.type === 'ai_generate' && firstCommand.prompt) {
          // AI 图像生成
          setState('generating');
          speak(firstCommand.speak || '正在生成图片，请稍等');

          const imageUrl = await generateImage(firstCommand.prompt, {
            onCompleted: (data) => {
              setLastMessage(data.message);
            },
            onError: (data) => {
              setLastMessage(data.message);
              speak(data.message);
            },
          });

          // 将图片加载到画布
          if (imageUrl && canvasRef.current) {
            try {
              const img = await fabric.FabricImage.fromURL(imageUrl);
              const canvas = canvasRef.current;
              const scale = Math.min(
                (canvas.getWidth() * 0.6) / img.width!,
                (canvas.getHeight() * 0.6) / img.height!,
                1,
              );
              img.scale(scale);
              img.set({
                left: canvas.getWidth() / 2,
                top: canvas.getHeight() / 2,
                originX: 'center',
                originY: 'center',
              });
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.renderAll();
              speak('图片已生成');
              setLastMessage('图片已添加到画布');
              saveCanvas();
            } catch (e) {
              speak('图片加载失败');
              setLastMessage('图片加载失败');
            }
          }
        } else {
          // 画布操作（支持复合指令批量执行）
          setState('executing');
          let lastResult;

          for (const cmd of commands) {
            // 撤销/重做需要调用 history
            if (cmd.action === 'undo') {
              const ok = await historyRef.current?.undo();
              lastResult = { success: !!ok, message: ok ? '已撤销' : '没有可撤销的操作' };
            } else if (cmd.action === 'redo') {
              const ok = await historyRef.current?.redo();
              lastResult = { success: !!ok, message: ok ? '已重做' : '没有可重做的操作' };
            } else {
              lastResult = executeCommand(canvasRef.current!, cmd);
            }
          }

          if (lastResult) {
            const msg = commands.length > 1
              ? `已执行 ${commands.length} 个操作`
              : lastResult.message;
            speak(msg);
            setLastMessage(msg);
            saveCanvas();
          }
        }
      } catch (e: any) {
        console.error('[VoiceCanvas] 处理失败:', e);
        let msg = '处理失败，请重试';
        if (e.message?.includes('fetch') || e.message?.includes('network') || e.message?.includes('Failed')) {
          msg = '网络连接失败，请检查后端服务';
        } else if (e.message?.includes('解析') || e.message?.includes('JSON')) {
          msg = '指令理解失败，请换个说法试试';
        } else if (e.message?.includes('生成') || e.message?.includes('image')) {
          msg = '图片生成失败，请稍后重试';
        }
        speak(msg);
        setLastMessage(msg);
      } finally {
        processingRef.current = false;
        setState('idle');
      }
    },
    [canvasRef, historyRef, speak],
  );

  // 选择建议指令
  const selectAlternative = useCallback(
    (command: DrawCommand) => {
      setAlternatives([]);
      if (canvasRef.current) {
        processingRef.current = true;
        setState('executing');
        const result = executeCommand(canvasRef.current, command);
        speak(result.message);
        setLastMessage(result.message);
        processingRef.current = false;
        setState('idle');
        saveCanvas();
      }
    },
    [canvasRef, speak, saveCanvas],
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
    startListening: speech.start,
    stopListening: speech.stop,
    selectAlternative,
  };
}
