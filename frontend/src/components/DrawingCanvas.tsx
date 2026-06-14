import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { CanvasHistory } from '../lib/canvasHistory';

interface DrawingCanvasProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
  historyRef: React.MutableRefObject<CanvasHistory | null>;
}

export default function DrawingCanvas({ canvasRef, historyRef }: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const htmlCanvasRef = useRef<HTMLCanvasElement>(null);

  // 初始化 Fabric.js 画布 + 历史管理
  useEffect(() => {
    if (!htmlCanvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const canvas = new fabric.Canvas(htmlCanvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
    });

    canvasRef.current = canvas;
    historyRef.current = new CanvasHistory(canvas);

    // 对象变化时自动保存历史
    const saveHistory = () => historyRef.current?.save();
    canvas.on('object:added', saveHistory);
    canvas.on('object:modified', saveHistory);
    canvas.on('object:removed', saveHistory);

    // 响应窗口大小变化
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.setDimensions({ width: w, height: h });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.off('object:added', saveHistory);
      canvas.off('object:modified', saveHistory);
      canvas.off('object:removed', saveHistory);
      canvas.dispose();
      canvasRef.current = null;
      historyRef.current = null;
    };
  }, [canvasRef, historyRef]);

  // 暴露到 window 供调试
  useEffect(() => {
    (window as any).__canvas = canvasRef;
    (window as any).__history = historyRef;
  }, [canvasRef, historyRef]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas ref={htmlCanvasRef} />
    </div>
  );
}
