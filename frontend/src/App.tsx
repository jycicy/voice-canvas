import { useRef } from 'react';
import * as fabric from 'fabric';
import DrawingCanvas from './components/DrawingCanvas';
import { CanvasHistory } from './lib/canvasHistory';
import { executeCommand, DrawCommand } from './lib/canvasExecutor';
import './App.css';

function App() {
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<CanvasHistory | null>(null);

  const handleTestCommand = () => {
    const cmd: DrawCommand = {
      type: 'canvas_action',
      action: 'draw',
      target: { type: 'circle' },
      params: { fill: '#FF0000', radius: 60 },
    };
    if (canvasRef.current) {
      const result = executeCommand(canvasRef.current, cmd);
      console.log('执行结果:', result);
    }
  };

  const handleUndo = async () => {
    if (historyRef.current) {
      await historyRef.current.undo();
    }
  };

  const handleRedo = async () => {
    if (historyRef.current) {
      await historyRef.current.redo();
    }
  };

  const handleClear = () => {
    if (canvasRef.current) {
      executeCommand(canvasRef.current, { type: 'canvas_action', action: 'clear' });
    }
  };

  return (
    <div className="app">
      <header className="toolbar">
        <h1 className="toolbar-title">🎤 Voice Canvas</h1>
        <div className="toolbar-actions">
          <button onClick={handleTestCommand} className="btn btn-test">
            测试画圆
          </button>
          <button onClick={handleUndo} className="btn">
            撤销
          </button>
          <button onClick={handleRedo} className="btn">
            重做
          </button>
          <button onClick={handleClear} className="btn btn-danger">
            清空
          </button>
        </div>
      </header>

      <main className="canvas-area">
        <DrawingCanvas canvasRef={canvasRef} historyRef={historyRef} />
      </main>

      <footer className="status-bar">
        <span>语音指令待接入</span>
        <span>F12 控制台查看日志</span>
      </footer>
    </div>
  );
}

export default App;
