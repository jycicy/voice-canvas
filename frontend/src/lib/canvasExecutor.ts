/**
 * 绘图命令执行器
 *
 * 将结构化绘图命令转换为 Fabric.js 操作。
 */

import * as fabric from 'fabric';

/** 绘图命令参数（与后端 DrawParams 对应） */
export interface DrawParams {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  dash?: number[];
  lineHeight?: number;
}

/** 绘图目标 */
export interface DrawTarget {
  type: string;
  filter?: { color?: string; shape?: string };
}

/** 完整绘图命令 */
export interface DrawCommand {
  type: 'canvas_action' | 'ai_generate';
  action?: 'draw' | 'modify' | 'move' | 'scale' | 'rotate' | 'delete' | 'select' | 'clear' | 'undo' | 'redo' | 'export' | 'zoomIn' | 'zoomOut' | 'resetView';
  target?: DrawTarget;
  params?: DrawParams;
  prompt?: string;
  confidence?: number;
  speak?: string;
}

/** 命令执行结果 */
export interface ExecuteResult {
  success: boolean;
  message: string;
  object?: fabric.Object;
}

/**
 * 在画布中心位置创建对象
 */
function getCanvasCenter(canvas: fabric.Canvas): { left: number; top: number } {
  return {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
  };
}

/**
 * 执行 draw 操作
 */
function executeDraw(
  canvas: fabric.Canvas,
  target?: { type?: string },
  params?: DrawParams,
): ExecuteResult {
  const center = getCanvasCenter(canvas);
  const left = params?.left ?? center.left;
  const top = params?.top ?? center.top;
  const fill = params?.fill ?? '#FFFFFF';
  const stroke = params?.stroke ?? 'transparent';
  const strokeWidth = params?.strokeWidth ?? 2;

  let obj: fabric.Object | null = null;
  let shapeName = '';

  const shapeType = target?.type ?? 'circle';

  switch (shapeType) {
    case 'circle':
      obj = new fabric.Circle({
        left,
        top,
        radius: params?.radius ?? 50,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
      });
      shapeName = '圆形';
      break;

    case 'rect':
      obj = new fabric.Rect({
        left,
        top,
        width: params?.width ?? 100,
        height: params?.height ?? 100,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
      });
      shapeName = '矩形';
      break;

    case 'triangle':
      obj = new fabric.Triangle({
        left,
        top,
        width: params?.width ?? 100,
        height: params?.height ?? 100,
        fill,
        stroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
      });
      shapeName = '三角形';
      break;

    case 'line': {
      const lineWidth = params?.width ?? 200;
      obj = new fabric.Line(
        [left - lineWidth / 2, top, left + lineWidth / 2, top],
        {
          stroke: params?.stroke ?? fill,
          strokeWidth: strokeWidth || 3,
        },
      );
      shapeName = '直线';
      break;
    }

    case 'text':
      obj = new fabric.Textbox(params?.text ?? '文字', {
        left,
        top,
        fontSize: params?.fontSize ?? 24,
        fill,
        originX: 'center',
        originY: 'center',
      });
      shapeName = '文字';
      break;

    default:
      return { success: false, message: `不支持的图形类型: ${shapeType}` };
  }

  if (obj) {
    if (params?.angle) obj.rotate(params.angle);
    if (params?.scaleX) obj.scaleX = params.scaleX;
    if (params?.scaleY) obj.scaleY = params.scaleY;
    if (params?.opacity !== undefined) obj.opacity = params.opacity;

    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    return { success: true, message: `已绘制${shapeName}`, object: obj };
  }

  return { success: false, message: '绘制失败' };
}

/**
 * 执行 modify 操作（修改选中对象的属性）
 */
function executeModify(
  canvas: fabric.Canvas,
  params?: DrawParams,
): ExecuteResult {
  const active = canvas.getActiveObject();
  if (!active) {
    return { success: false, message: '没有选中的对象' };
  }

  if (params?.fill) active.set('fill', params.fill);
  if (params?.stroke) active.set('stroke', params.stroke);
  if (params?.strokeWidth) active.set('strokeWidth', params.strokeWidth);
  if (params?.opacity !== undefined) active.set('opacity', params.opacity);
  if (params?.angle !== undefined) active.rotate(params.angle);
  if (params?.scaleX) active.set('scaleX', params.scaleX);
  if (params?.scaleY) active.set('scaleY', params.scaleY);
  if (params?.dash) active.set('strokeDashArray', params.dash);
  if (params?.lineHeight) active.set('lineHeight', params.lineHeight);

  // 文字对象支持修改内容
  if (params?.text && active instanceof fabric.Textbox) {
    active.set('text', params.text);
  }

  canvas.renderAll();
  return { success: true, message: '已修改对象属性' };
}

/**
 * 执行 delete 操作
 */
function executeDelete(
  canvas: fabric.Canvas,
  target?: DrawTarget,
): ExecuteResult {
  if (target?.type === 'all') {
    canvas.clear();
    canvas.backgroundColor = '#1a1a2e';
    canvas.renderAll();
    return { success: true, message: '已删除所有对象' };
  }

  const active = canvas.getActiveObject();
  if (active) {
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
    return { success: true, message: '已删除选中对象' };
  }

  return { success: false, message: '没有选中的对象' };
}

/**
 * 执行 select 操作
 */
function executeSelect(
  canvas: fabric.Canvas,
  target?: DrawTarget,
): ExecuteResult {
  const objects = canvas.getObjects();
  if (objects.length === 0) {
    return { success: false, message: '画布上没有对象' };
  }

  // 选中最后绘制的对象
  if (target?.type === 'last') {
    const last = objects[objects.length - 1];
    canvas.setActiveObject(last);
    canvas.renderAll();
    return { success: true, message: '已选中最后绘制的对象' };
  }

  // 选中所有对象
  if (target?.type === 'all') {
    const sel = new fabric.ActiveSelection(objects, { canvas });
    canvas.setActiveObject(sel);
    canvas.renderAll();
    return { success: true, message: '已选中所有对象' };
  }

  // 按类型或颜色筛选
  const filtered = objects.filter((obj) => {
    if (target?.filter?.shape && obj.type !== target.filter.shape) return false;
    if (target?.filter?.color) {
      const fill = (obj.fill as string) ?? '';
      if (!fill.toLowerCase().includes(target.filter.color.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    return { success: false, message: '未找到匹配的对象' };
  }

  // 选中最后一个匹配对象（最新的）
  canvas.setActiveObject(filtered[filtered.length - 1]);
  canvas.renderAll();
  return { success: true, message: `已选中 ${filtered.length} 个匹配对象` };
}

/**
 * 执行 move 操作（移动选中对象）
 */
function executeMove(
  canvas: fabric.Canvas,
  params?: DrawParams,
): ExecuteResult {
  const active = canvas.getActiveObject();
  if (!active) {
    return { success: false, message: '没有选中的对象，请先选中一个对象' };
  }

  const dx = params?.left ?? 0;
  const dy = params?.top ?? 0;
  active.set({
    left: (active.left ?? 0) + dx,
    top: (active.top ?? 0) + dy,
  });
  active.setCoords();
  canvas.renderAll();
  return { success: true, message: '已移动对象' };
}

/**
 * 执行 scale 操作（缩放选中对象）
 */
function executeScale(
  canvas: fabric.Canvas,
  params?: DrawParams,
): ExecuteResult {
  const active = canvas.getActiveObject();
  if (!active) {
    return { success: false, message: '没有选中的对象，请先选中一个对象' };
  }

  const scaleX = params?.scaleX ?? 1;
  const scaleY = params?.scaleY ?? scaleX;
  active.set({
    scaleX: (active.scaleX ?? 1) * scaleX,
    scaleY: (active.scaleY ?? 1) * scaleY,
  });
  canvas.renderAll();

  const pct = Math.round(scaleX * 100);
  return { success: true, message: `已缩放对象至 ${pct}%` };
}

/**
 * 执行 rotate 操作（旋转选中对象）
 */
function executeRotate(
  canvas: fabric.Canvas,
  params?: DrawParams,
): ExecuteResult {
  const active = canvas.getActiveObject();
  if (!active) {
    return { success: false, message: '没有选中的对象，请先选中一个对象' };
  }

  const angle = params?.angle ?? 0;
  active.set('angle', (active.angle ?? 0) + angle);
  canvas.renderAll();
  return { success: true, message: `已旋转 ${angle} 度` };
}

/**
 * 执行画布缩放
 */
function executeZoom(
  canvas: fabric.Canvas,
  action: string,
): ExecuteResult {
  let zoom = canvas.getZoom();
  const step = 0.2;

  switch (action) {
    case 'zoomIn':
      zoom = Math.min(zoom + step, 5);
      break;
    case 'zoomOut':
      zoom = Math.max(zoom - step, 0.2);
      break;
    case 'resetView':
      zoom = 1;
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      canvas.renderAll();
      return { success: true, message: '已重置视图' };
  }

  canvas.zoomToPoint(
    new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
    zoom,
  );
  canvas.renderAll();
  const pct = Math.round(zoom * 100);
  return { success: true, message: `画布缩放至 ${pct}%` };
}

/**
 * 主执行函数：根据命令类型分发到对应处理函数
 */
export function executeCommand(
  canvas: fabric.Canvas,
  command: DrawCommand,
): ExecuteResult {
  const { action, target, params } = command;

  switch (action) {
    case 'draw':
      return executeDraw(canvas, target, params);

    case 'modify':
      return executeModify(canvas, params);

    case 'delete':
      return executeDelete(canvas, target);

    case 'select':
      return executeSelect(canvas, target);

    case 'move':
      return executeMove(canvas, params);

    case 'scale':
      return executeScale(canvas, params);

    case 'rotate':
      return executeRotate(canvas, params);

    case 'clear':
      canvas.clear();
      canvas.backgroundColor = '#1a1a2e';
      canvas.renderAll();
      return { success: true, message: '已清空画布' };

    case 'undo':
    case 'redo':
      // 由 canvasHistory 处理，这里返回占位
      return { success: true, message: action === 'undo' ? '已撤销' : '已重做' };

    case 'zoomIn':
    case 'zoomOut':
    case 'resetView':
      return executeZoom(canvas, action!);

    case 'export': {
      const dataUrl = canvas.toDataURL({ format: 'png', quality: 1 });
      const link = document.createElement('a');
      link.download = 'voice-canvas.png';
      link.href = dataUrl;
      link.click();
      return { success: true, message: '已导出图片' };
    }

    default:
      return { success: false, message: `未知操作: ${action}` };
  }
}
