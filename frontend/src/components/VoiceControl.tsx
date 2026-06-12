/**
 * 语音控制面板
 *
 * 提供语音按钮、实时识别文字展示、状态指示。
 */

import type { ProcessingState } from '../hooks/useVoiceCanvas';

interface VoiceControlProps {
  isListening: boolean;
  isSupported: boolean;
  state: ProcessingState;
  recognizedText: string;
  lastMessage: string;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

/** 状态对应的中文文案 */
const STATE_LABELS: Record<ProcessingState, string> = {
  idle: '空闲',
  listening: '正在聆听...',
  parsing: '正在理解...',
  executing: '正在执行...',
  generating: 'AI 正在作画...',
};

export default function VoiceControl({
  isListening,
  isSupported,
  state,
  recognizedText,
  lastMessage,
  error,
  onStart,
  onStop,
}: VoiceControlProps) {
  const handleClick = () => {
    if (isListening) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div className="voice-control">
      {/* 语音按钮 */}
      <button
        className={`voice-btn ${isListening ? 'voice-btn--active' : ''} ${
          state === 'generating' ? 'voice-btn--generating' : ''
        }`}
        onClick={handleClick}
        disabled={!isSupported || state === 'generating'}
        title={isSupported ? '点击开始/停止语音' : '浏览器不支持语音识别'}
      >
        {isListening ? '🔴' : '🎤'}
      </button>

      {/* 状态与识别文字 */}
      <div className="voice-info">
        <div className="voice-status">
          <span className={`status-dot ${isListening ? 'status-dot--active' : ''}`} />
          <span>{STATE_LABELS[state]}</span>
        </div>

        {recognizedText && (
          <div className="voice-text">
            {state === 'listening' ? '🗣️ ' : '✅ '}
            {recognizedText}
          </div>
        )}

        {lastMessage && !recognizedText && (
          <div className="voice-message">💬 {lastMessage}</div>
        )}

        {error && (
          <div className="voice-error">⚠️ {error}</div>
        )}
      </div>
    </div>
  );
}
