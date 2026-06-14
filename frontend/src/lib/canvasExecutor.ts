/**
 * 绘图命令执行器
 *
 * code_execute: 沙箱执行 LLM 生成的 Canvas 2D 代码
 * canvas_action: 撤销/重做/清空/导出等操作
 */

/** 绘图命令 */
export interface DrawCommand {
  type: 'canvas_action' | 'code_execute';
  action?: 'clear' | 'undo' | 'redo' | 'export' | 'zoomIn' | 'zoomOut' | 'resetView';
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
 * 沙箱执行 LLM 生成的 Canvas 2D 绘图代码
 *
 * 暴露变量：
 *   ctx — CanvasRenderingContext2D
 *   W   — 画布宽度
 *   H   — 画布高度
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
      // 由 CanvasHistory 处理
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
      // CSS transform 缩放由 CanvasPage 处理
      return { success: true, message: '缩放操作' };

    default:
      return { success: false, message: `未知操作: ${action}` };
  }
}
