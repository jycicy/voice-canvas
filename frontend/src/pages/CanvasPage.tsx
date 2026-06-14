/**
 * 绘图页 — 左侧画布 + 右侧聊天面板
 */

import { useRef, useCallback } from 'react';
import { useVoiceCanvas } from '../hooks/useVoiceCanvas';
import { executeCommand } from '../lib/canvasExecutor';
import { CanvasHistory } from '../lib/canvasHistory';
import DrawingCanvas from '../components/DrawingCanvas';
import ChatPanel from '../components/ChatPanel';
import './CanvasPage.css';

export default function CanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const historyRef = useRef<CanvasHistory | null>(null);

  const {
    state,
    recognizedText,
    lastMessage,
    isListening,
    isSupported,
    error,
    alternatives,
    messages,
    startListening,
    stopListening,
    selectAlternative,
    executeAction,
    submitText,
  } = useVoiceCanvas(canvasRef, ctxRef, historyRef);

  // 导出图片
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    executeCommand(canvas, ctx, { type: 'canvas_action', action: 'export' });
  }, []);

  const handleUndo = useCallback(() => executeAction('undo'), [executeAction]);
  const handleRedo = useCallback(() => executeAction('redo'), [executeAction]);

  return (
    <div className="canvas-page">
      {/* 左侧画布 */}
      <div className="canvas-page__canvas-area">
        {/* 画布工具栏 */}
        <div className="canvas-page__toolbar">
          <div className="canvas-page__toolbar-left">
            <span className="canvas-page__logo">Voice Canvas</span>
          </div>
          <div className="canvas-page__toolbar-center">
            <button className="canvas-page__tool-btn" onClick={handleUndo} title="撤销">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
            <button className="canvas-page__tool-btn" onClick={handleRedo} title="重做">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
              </svg>
            </button>
            <div className="canvas-page__toolbar-divider" />
            <button className="canvas-page__tool-btn" onClick={() => executeAction('clear')} title="清空画布">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
          <div className="canvas-page__toolbar-right">
            {lastMessage && (
              <span className="canvas-page__status">{lastMessage}</span>
            )}
          </div>
        </div>

        {/* 画布 */}
        <DrawingCanvas canvasRef={canvasRef} ctxRef={ctxRef} historyRef={historyRef} />
      </div>

      {/* 右侧聊天面板 */}
      <ChatPanel
        messages={messages}
        state={state}
        recognizedText={recognizedText}
        isListening={isListening}
        isSupported={isSupported}
        error={error}
        alternatives={alternatives}
        lastMessage={lastMessage}
        onStartListening={startListening}
        onStopListening={stopListening}
        onSelectAlternative={selectAlternative}
        onSubmitText={submitText}
        onExport={handleExport}
      />
    </div>
  );
}
