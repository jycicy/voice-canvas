/**
 * 语音识别 Hook
 *
 * 封装 Web Speech API，支持持续监听、自动重启、错误恢复。
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionResult {
  /** 当前识别的文本（可能还在变化） */
  interimText: string;
  /** 已确认的文本 */
  finalText: string;
  /** 是否正在录音 */
  isListening: boolean;
  /** 是否受浏览器支持 */
  isSupported: boolean;
  /** 最近的错误 */
  error: string | null;
  /** 开始监听 */
  start: () => void;
  /** 停止监听 */
  stop: () => void;
}

// Web Speech API 类型声明
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export function useSpeechRecognition(): SpeechRecognitionResult {
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // 检查浏览器支持
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;

  // 初始化 recognition 实例
  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) setInterimText(interim);
      if (final) {
        setFinalText(final);
        setInterimText('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[SpeechRecognition] error:', event.error);
      setError(event.error);

      // no-speech 和 aborted 不需要提示用户
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      // 自动重启（除非用户主动停止）
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // 忽略重复启动错误
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      try {
        recognition.stop();
      } catch (e) {
        // 忽略
      }
    };
  }, [isSupported]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setInterimText('');
    setFinalText('');
    isListeningRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (e) {
      // 忽略重复启动错误
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    isListeningRef.current = false;
    setIsListening(false);
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // 忽略
    }
  }, []);

  return {
    interimText,
    finalText,
    isListening,
    isSupported,
    error,
    start,
    stop,
  };
}
