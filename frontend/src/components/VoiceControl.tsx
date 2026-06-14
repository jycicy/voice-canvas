/**
 * 语音控制组件
 *
 * 包含麦克风按钮和状态显示。
 */

import type { ProcessingState } from '../hooks/useVoiceCanvas';

interface VoiceControlProps {
  isListening: boolean;
  isSupported: boolean;
  state: ProcessingState;
  recognizedText: string;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

const STATE_LABELS: Record<ProcessingState, string> = {
  idle: '等待指令',
  listening: '正在聆听...',
  parsing: '正在理解...',
  executing: '正在执行...',
};

export function VoiceControl({
  isListening,
  isSupported,
  state,
  recognizedText,
  error,
  onStart,
  onStop,
}: VoiceControlProps) {
  const isActive = isListening;
  const isDisabled = !isSupported;

  const handleClick = () => {
    if (isDisabled) return;
    if (isActive) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div className="voice-control">
      {/* 麦克风按钮 */}
      <button
        className={`voice-btn ${isActive ? 'voice-btn--active' : ''}`}
        onClick={handleClick}
        disabled={isDisabled}
        title={isActive ? '停止聆听' : '开始聆听'}
      >
        {isActive ? (
          <div className="voice-waves">
            <span className="voice-wave"></span>
            <span className="voice-wave"></span>
            <span className="voice-wave"></span>
          </div>
        ) : (
          '🎤'
        )}
      </button>

      {/* 状态信息 */}
      <div className="voice-info">
        <div className="voice-status">
          <span className={`status-dot ${isActive ? 'status-dot--active' : ''}`}></span>
          <span className="status-label">{STATE_LABELS[state]}</span>
        </div>

        {recognizedText && (
          <div className="voice-text voice-text--result">
            {recognizedText}
          </div>
        )}

        {error && (
          <div className="voice-text voice-text--error">
            {error}
          </div>
        )}

        {!isSupported && (
          <div className="voice-text voice-text--unsupported">
            当前浏览器不支持语音识别，请使用 Chrome
          </div>
        )}
      </div>
    </div>
  );
}
