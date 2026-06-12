import { useRef } from 'react';
import * as fabric from 'fabric';
import DrawingCanvas from './components/DrawingCanvas';
import VoiceControl from './components/VoiceControl';
import { CanvasHistory } from './lib/canvasHistory';
import { useVoiceCanvas } from './hooks/useVoiceCanvas';
import './App.css';

function App() {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<CanvasHistory | null>(null);

  const voice = useVoiceCanvas(canvasRef, historyRef);

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
          点击 🎤 按钮开始语音指令 · 试试说"画一个红色圆形"
        </div>
      </footer>
    </div>
  );
}

export default App;
