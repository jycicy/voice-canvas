import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';

interface DrawingCanvasProps {
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
}

export default function DrawingCanvas({ canvasRef }: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const htmlCanvasRef = useRef<HTMLCanvasElement>(null);

  // 初始化 Fabric.js 画布
  useEffect(() => {
    if (!htmlCanvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const canvas = new fabric.Canvas(htmlCanvasRef.current, {
      width,
      height,
      backgroundColor: '#1a1a2e',
      selection: true,
    });

    canvasRef.current = canvas;

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
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [canvasRef]);

  // 获取画布上所有对象
  const getObjects = useCallback(() => {
    return canvasRef.current?.getObjects() ?? [];
  }, [canvasRef]);

  // 暴露方法到 window 供调试
  useEffect(() => {
    (window as any).__canvas = canvasRef;
    (window as any).__getObjects = getObjects;
  }, [canvasRef, getObjects]);

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
