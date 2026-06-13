/**
 * 语音绘图主 Hook
 *
 * 串联完整链路：语音识别 → 后端解析 → 画布执行 → TTS 反馈。
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { useSpeechRecognition } from './useSpeechRecognition';
import { parseCommand, generateImage } from '../lib/api';
import { executeCommand } from '../lib/canvasExecutor';
import type { DrawCommand } from '../lib/canvasExecutor';
import { CanvasHistory } from '../lib/canvasHistory';

export type ProcessingState = 'idle' | 'listening' | 'parsing' | 'executing' | 'generating';

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
  /** 控制方法 */
  startListening: () => void;
  stopListening: () => void;
}

export function useVoiceCanvas(
  canvasRef: React.MutableRefObject<fabric.Canvas | null>,
  historyRef: React.MutableRefObject<CanvasHistory | null>,
): VoiceCanvasState {
  const [state, setState] = useState<ProcessingState>('idle');
  const [lastCommand, setLastCommand] = useState<DrawCommand | null>(null);
  const [lastMessage, setLastMessage] = useState('');

  const speech = useSpeechRecognition();
  const processingRef = useRef(false);
  const lastFinalRef = useRef('');

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
        // 1. 调用后端解析
        const { command } = await parseCommand(text);
        setLastCommand(command);

        // 2. 根据命令类型分发
        if (command.type === 'ai_generate' && command.prompt) {
          // AI 图像生成
          setState('generating');
          speak(command.speak || '正在生成图片，请稍等');

          const imageUrl = await generateImage(command.prompt, {
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
            } catch (e) {
              speak('图片加载失败');
              setLastMessage('图片加载失败');
            }
          }
        } else {
          // 画布操作
          setState('executing');
          const result = executeCommand(canvasRef.current, command);

          // 撤销/重做需要调用 history
          if (command.action === 'undo') {
            const ok = await historyRef.current?.undo();
            speak(ok ? '已撤销' : '没有可撤销的操作');
            setLastMessage(ok ? '已撤销' : '没有可撤销的操作');
          } else if (command.action === 'redo') {
            const ok = await historyRef.current?.redo();
            speak(ok ? '已重做' : '没有可重做的操作');
            setLastMessage(ok ? '已重做' : '没有可重做的操作');
          } else {
            speak(result.message);
            setLastMessage(result.message);
          }
        }
      } catch (e: any) {
        console.error('[VoiceCanvas] 处理失败:', e);
        const msg = '处理失败，请重试';
        speak(msg);
        setLastMessage(msg);
      } finally {
        processingRef.current = false;
        setState('idle');
      }
    },
    [canvasRef, historyRef, speak],
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
    startListening: speech.start,
    stopListening: speech.stop,
  };
}
