/**
 * 画布组件 — 原生 Canvas 2D
 */

import { useEffect, useRef } from 'react';
import { CanvasHistory } from '../lib/canvasHistory';

interface DrawingCanvasProps {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
  historyRef: React.MutableRefObject<CanvasHistory | null>;
}

export default function DrawingCanvas({ canvasRef, ctxRef, historyRef }: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    // 设置画布尺寸
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      // 保存当前内容
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = w;
      canvas.height = h;
      // 恢复内容
      ctx.putImageData(imageData, 0, 0);
    };

    resize();

    // 初始化白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 初始化历史管理
    historyRef.current = new CanvasHistory(canvas, ctx);

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      ctxRef.current = null;
      historyRef.current = null;
    };
  }, [canvasRef, ctxRef, historyRef]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#f5f5f5',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
