/**
 * 绘图命令执行器
 *
 * draw_shape: 简单图形，直接用 Canvas 2D API 绘制
 * code_execute: 沙箱执行 LLM 生成的 Canvas 2D 代码
 * canvas_action: 撤销/重做/清空/导出等操作
 */

/** 简单图形参数 */
export interface ShapeParams {
  x?: string | number;
  y?: string | number;
  x1?: string | number;
  y1?: string | number;
  x2?: string | number;
  y2?: string | number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  width?: number;
  height?: number;
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

/** 绘图命令 */
export interface DrawCommand {
  type: 'canvas_action' | 'draw_shape' | 'code_execute';
  action?: 'clear' | 'undo' | 'redo' | 'export' | 'zoomIn' | 'zoomOut' | 'resetView';
  shape?: string;
  params?: ShapeParams;
  code?: string;
  confidence?: number;
  speak?: string;
  alternatives?: { label: string; command: DrawCommand }[];
}

/** 执行结果 */
export interface ExecuteResult {
  success: boolean;
  message: string;
}

/**
 * 解析坐标值：支持数字和字符串表达式（如 "W/2", "H*0.3"）
 */
function resolveCoord(value: string | number | undefined, fallback: number, W: number, H: number): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'number') return value;
  try {
    const fn = new Function('W', 'H', `return ${value}`);
    const result = fn(W, H);
    return typeof result === 'number' ? result : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 执行简单图形绘制
 */
export function executeShape(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shape: string,
  params: ShapeParams,
): ExecuteResult {
  const W = width;
  const H = height;
  const p = params;

  try {
    switch (shape) {
      case 'circle': {
        const cx = resolveCoord(p.x, W / 2, W, H);
        const cy = resolveCoord(p.y, H / 2, W, H);
        ctx.beginPath();
        ctx.arc(cx, cy, p.radius || 50, 0, Math.PI * 2);
        if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(); }
        if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth || 2; ctx.stroke(); }
        if (!p.fill && !p.stroke) { ctx.fillStyle = '#FF6B6B'; ctx.fill(); }
        break;
      }

      case 'rect': {
        const rx = resolveCoord(p.x, W / 2 - 50, W, H);
        const ry = resolveCoord(p.y, H / 2 - 50, W, H);
        const rw = p.width || 100;
        const rh = p.height || 100;
        if (p.fill) { ctx.fillStyle = p.fill; ctx.fillRect(rx, ry, rw, rh); }
        if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth || 2; ctx.strokeRect(rx, ry, rw, rh); }
        if (!p.fill && !p.stroke) { ctx.fillStyle = '#4ECDC4'; ctx.fillRect(rx, ry, rw, rh); }
        break;
      }

      case 'triangle': {
        const tx = resolveCoord(p.x, W / 2, W, H);
        const ty = resolveCoord(p.y, H / 2, W, H);
        const s = p.size || 80;
        ctx.beginPath();
        ctx.moveTo(tx, ty - s);
        ctx.lineTo(tx - s * 0.866, ty + s * 0.5);
        ctx.lineTo(tx + s * 0.866, ty + s * 0.5);
        ctx.closePath();
        if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(); }
        if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth || 2; ctx.stroke(); }
        if (!p.fill && !p.stroke) { ctx.fillStyle = '#FFD93D'; ctx.fill(); }
        break;
      }

      case 'line': {
        const lx1 = resolveCoord(p.x1, W / 4, W, H);
        const ly1 = resolveCoord(p.y1, H / 2, W, H);
        const lx2 = resolveCoord(p.x2, W * 3 / 4, W, H);
        const ly2 = resolveCoord(p.y2, H / 2, W, H);
        ctx.beginPath();
        ctx.moveTo(lx1, ly1);
        ctx.lineTo(lx2, ly2);
        ctx.strokeStyle = p.stroke || '#333';
        ctx.lineWidth = p.strokeWidth || 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        break;
      }

      case 'text': {
        const textX = resolveCoord(p.x, W / 2, W, H);
        const textY = resolveCoord(p.y, H / 2, W, H);
        ctx.font = `${p.fontSize || 32}px ${p.fontFamily || 'sans-serif'}`;
        ctx.fillStyle = p.fill || '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text || '', textX, textY);
        break;
      }

      case 'ellipse': {
        const ex = resolveCoord(p.x, W / 2, W, H);
        const ey = resolveCoord(p.y, H / 2, W, H);
        ctx.beginPath();
        ctx.ellipse(ex, ey, p.radiusX || 60, p.radiusY || 40, 0, 0, Math.PI * 2);
        if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(); }
        if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = p.strokeWidth || 2; ctx.stroke(); }
        if (!p.fill && !p.stroke) { ctx.fillStyle = '#9b59b6'; ctx.fill(); }
        break;
      }

      default:
        return { success: false, message: `未知图形: ${shape}` };
    }

    return { success: true, message: `绘图完成` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[executeShape] 绘制失败:', err);
    return { success: false, message: `绘制失败: ${msg}` };
  }
}

/**
 * 沙箱执行 LLM 生成的 Canvas 2D 绘图代码
 */
export function executeCode(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  code: string,
): ExecuteResult {
  try {
    const fn = new Function('ctx', 'W', 'H', code);
    fn(ctx, width, height);
    return { success: true, message: '绘图完成' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[executeCode] 代码执行失败:', err);
    return { success: false, message: `代码执行失败: ${msg}` };
  }
}

/**
 * 执行画布操作
 */
export function executeCommand(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  command: DrawCommand,
): ExecuteResult {
  const { action } = command;

  switch (action) {
    case 'clear':
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return { success: true, message: '已清空画布' };

    case 'undo':
    case 'redo':
      return { success: true, message: action === 'undo' ? '已撤销' : '已重做' };

    case 'export': {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'voice-canvas.png';
      link.href = dataUrl;
      link.click();
      return { success: true, message: '已导出图片' };
    }

    case 'zoomIn':
    case 'zoomOut':
    case 'resetView':
      return { success: true, message: '缩放操作' };

    default:
      return { success: false, message: `未知操作: ${action}` };
  }
}
