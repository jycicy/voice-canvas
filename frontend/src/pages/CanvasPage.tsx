/**
 * 绘图页 — 左侧画布 + 右侧聊天面板
 */

import { useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useVoiceCanvas } from '../hooks/useVoiceCanvas';
import { executeCommand } from '../lib/canvasExecutor';
import { CanvasHistory } from '../lib/canvasHistory';
import DrawingCanvas from '../components/DrawingCanvas';
import ChatPanel from '../components/ChatPanel';
import './CanvasPage.css';

export default function CanvasPage() {
  const canvasRef = useRef<fabric.Canvas | null>(null);
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
  } = useVoiceCanvas(canvasRef, historyRef);

  // 导出图片
  const handleExport = useCallback(() => {
    if (!canvasRef.current) return;
    const cmd = { type: 'canvas_action' as const, action: 'export' as const };
    executeCommand(canvasRef.current, cmd);
  }, []);

  // 撤销/重做快捷键
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
            <button className="canvas-page__tool-btn" onClick={() => executeAction('zoomIn')} title="放大">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button className="canvas-page__tool-btn" onClick={() => executeAction('zoomOut')} title="缩小">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </button>
            <button className="canvas-page__tool-btn" onClick={() => executeAction('resetView')} title="重置视图">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
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
        <DrawingCanvas canvasRef={canvasRef} historyRef={historyRef} />
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
