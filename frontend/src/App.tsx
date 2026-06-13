import { useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import DrawingCanvas from './components/DrawingCanvas';
import VoiceControl from './components/VoiceControl';
import { SuggestionList } from './components/SuggestionList';
import { CanvasHistory } from './lib/canvasHistory';
import { useVoiceCanvas } from './hooks/useVoiceCanvas';
import { loadCanvasState, getSessionId } from './lib/api';
import './App.css';

function App() {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<CanvasHistory | null>(null);

  const voice = useVoiceCanvas(canvasRef, historyRef);

  // 页面加载时恢复画布状态
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sessionId = getSessionId();
    loadCanvasState(sessionId).then((state) => {
      if (state && typeof state === 'object' && Object.keys(state).length > 0) {
        canvas.loadFromJSON(state).then(() => {
          canvas.renderAll();
        });
      }
    });
  }, []);

  return (
    <div className="app">
      {/* 顶部工具栏 */}
      <header className="toolbar">
        <h1 className="toolbar-title">🎤 Voice Canvas</h1>
        <div className="toolbar-info">
          {voice.lastMessage && (
            <span className="toolbar-message">{voice.lastMessage}</span>
          )}
        </div>
      </header>

      {/* 画布区域 */}
      <main className="canvas-area">
        <DrawingCanvas canvasRef={canvasRef} historyRef={historyRef} />
      </main>

      {/* 建议指令列表 */}
      <SuggestionList
        alternatives={voice.alternatives}
        onSelect={voice.selectAlternative}
        visible={voice.alternatives.length > 0}
      />

      {/* 底部语音控制区 */}
      <footer className="voice-footer">
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
        <div className="voice-hint">
          点击 🎤 开始 · 试试说 "画一个红色圆形" "画一只猫" "清空画布"
        </div>
      </footer>
    </div>
  );
}

export default App;
