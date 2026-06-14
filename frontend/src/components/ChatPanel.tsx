/**
 * 聊天面板 — 右侧对话区
 *
 * 包含：消息列表 + 建议列表 + 输入框 + 语音按钮
 */

import { useRef, useEffect, FormEvent } from 'react';
import type { ProcessingState } from '../hooks/useVoiceCanvas';
import type { DrawCommand } from '../lib/canvasExecutor';

export interface ChatMessage {
  id: string;
  role: 'user' | 'system';
  text: string;
  time: Date;
}

interface Alternative {
  label: string;
  command: DrawCommand;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  state: ProcessingState;
  recognizedText: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  alternatives: Alternative[];
  lastMessage: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onSelectAlternative: (command: DrawCommand) => void;
  onSubmitText: (text: string) => void;
  onExport: () => void;
}

export default function ChatPanel({
  messages,
  state,
  recognizedText,
  isListening,
  isSupported,
  error,
  alternatives,
  lastMessage,
  onStartListening,
  onStopListening,
  onSelectAlternative,
  onSubmitText,
  onExport,
}: ChatPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (input && input.value.trim()) {
      onSubmitText(input.value.trim());
      input.value = '';
    }
  };

  const stateLabel: Record<ProcessingState, string> = {
    idle: '就绪',
    listening: '正在听...',
    parsing: '正在理解...',
    executing: '正在绘制...',
  };

  return (
    <aside className="chat-panel">
      {/* 头部 */}
      <div className="chat-panel__header">
        <div className="chat-panel__header-left">
          <h2 className="chat-panel__title">对话</h2>
          <span className="chat-panel__status">{stateLabel[state]}</span>
        </div>
        <button className="chat-panel__export" onClick={onExport} title="导出图片">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>导出</span>
        </button>
      </div>

      {/* 消息列表 */}
      <div className="chat-panel__messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="chat-panel__empty">
            <div className="chat-panel__empty-icon">💬</div>
            <p>开始对话吧</p>
            <p className="chat-panel__empty-hint">输入文字或点击麦克风说话</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg chat-msg--${msg.role}`}>
            <div className="chat-msg__bubble">{msg.text}</div>
            <div className="chat-msg__time">
              {msg.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}

        {/* 实时语音识别 */}
        {isListening && recognizedText && (
          <div className="chat-msg chat-msg--user chat-msg--interim">
            <div className="chat-msg__bubble">{recognizedText}...</div>
          </div>
        )}

        {/* 建议列表 */}
        {alternatives.length > 0 && (
          <div className="chat-panel__suggestions">
            <div className="chat-panel__suggestions-label">您是否想说：</div>
            <div className="chat-panel__suggestions-list">
              {alternatives.map((alt, i) => (
                <button
                  key={i}
                  className="chat-panel__suggestion-btn"
                  onClick={() => onSelectAlternative(alt.command)}
                >
                  {alt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="chat-panel__error">⚠️ {error}</div>
      )}

      {/* 浏览器不支持提示 */}
      {!isSupported && (
        <div className="chat-panel__warn">
          当前浏览器不支持语音识别，请使用 Chrome
        </div>
      )}

      {/* 输入区域 */}
      <form className="chat-panel__input-area" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="chat-panel__input"
          placeholder="输入绘图指令..."
          disabled={state !== 'idle'}
        />
        <button
          type="submit"
          className="chat-panel__send-btn"
          disabled={state !== 'idle'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
        <button
          type="button"
          className={`chat-panel__mic-btn ${isListening ? 'chat-panel__mic-btn--active' : ''}`}
          onClick={isListening ? onStopListening : onStartListening}
          disabled={state !== 'idle' && !isListening}
        >
          {isListening ? (
            <div className="mic-waves">
              <span /><span /><span />
            </div>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </form>
    </aside>
  );
}
