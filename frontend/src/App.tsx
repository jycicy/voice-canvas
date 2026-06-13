import { useRef, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { DrawingCanvas } from './components/DrawingCanvas';
import { VoiceControl } from './components/VoiceControl';
import { SuggestionList } from './components/SuggestionList';
import { useVoiceCanvas } from './hooks/useVoiceCanvas';
import { CanvasHistory } from './lib/canvasHistory';
import { loadCanvasState, getSessionId } from './lib/api';
import './App.css';

function App() {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<CanvasHistory | null>(null);
  const voice = useVoiceCanvas(canvasRef, historyRef);
  const [textInput, setTextInput] = useState('');

  // 恢复画布状态
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sessionId = getSessionId();
    loadCanvasState(sessionId).then((state) => {
      if (state && Object.keys(state).length > 0) {
        canvas.loadFromJSON(state).then(() => canvas.renderAll());
      }
    });
  }, []);

  // 文字输入提交
  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      voice.submitText(textInput);
      setTextInput('');
    }
  };

  // 工具栏按钮
  const toolbarButtons = [
    { action: 'undo', icon: '↩️', label: '撤销' },
    { action: 'redo', icon: '↪️', label: '重做' },
    { action: 'clear', icon: '🗑️', label: '清空' },
    { action: 'export', icon: '💾', label: '导出' },
    { action: 'zoomIn', icon: '🔍+', label: '放大' },
    { action: 'zoomOut', icon: '🔍-', label: '缩小' },
    { action: 'resetView', icon: '🔄', label: '重置视图' },
  ];

  return (
    <div className="app">
      {/* 顶部工具栏 */}
      <header className="toolbar">
        <div className="toolbar-left">
          <h1 className="app-title">🎨 Voice Canvas</h1>
        </div>
        <div className="toolbar-center">
          {toolbarButtons.map((btn) => (
            <button
              key={btn.action}
              className="toolbar-btn"
              onClick={() => voice.executeAction(btn.action)}
              title={btn.label}
            >
              {btn.icon}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <span className={`status-msg ${voice.state === 'generating' ? 'status-msg--generating' : ''} ${voice.state === 'parsing' ? 'status-msg--parsing' : ''}`}>
            {voice.state === 'generating' && '⏳ '}
            {voice.state === 'parsing' && '🤔 '}
            {voice.state === 'executing' && '⚡ '}
            {voice.lastMessage || (voice.state === 'idle' ? '就绪' : '')}
          </span>
        </div>
      </header>

      {/* 画布区域 */}
      <main className="canvas-area">
        <DrawingCanvas canvasRef={canvasRef} historyRef={historyRef} />
      </main>

      {/* 建议列表 */}
      <SuggestionList
        alternatives={voice.alternatives}
        onSelect={voice.selectAlternative}
        visible={voice.alternatives.length > 0}
      />

      {/* 底部语音控制区 */}
      <footer className="voice-footer">
        {/* 文字输入框 */}
        <form className="text-input-form" onSubmit={handleSubmitText}>
          <input
            type="text"
            className="text-input"
            placeholder="输入指令，如：画一个红色圆形、撤销、清空画布..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <button type="submit" className="text-submit-btn" disabled={!textInput.trim()}>
            发送
          </button>
        </form>

        {/* 语音控制 */}
        <VoiceControl
          isListening={voice.isListening}
          isSupported={voice.isSupported}
          state={voice.state}
          recognizedText={voice.recognizedText}
          lastMessage={voice.lastMessage}
          error={voice.error}
          onStart={voice.startListening}
          onStop={voice.stopListening}
        />

        <p className="voice-hint">
          🎤 点击麦克风开始语音，或在上方输入框键入指令
        </p>
      </footer>
    </div>
  );
}

export default App;
