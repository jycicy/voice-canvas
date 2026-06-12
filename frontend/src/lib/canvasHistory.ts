/**
 * 画布历史管理
 *
 * 维护撤销/重做状态栈，支持最多 50 步历史。
 */

import * as fabric from 'fabric';

const MAX_HISTORY = 50;

export class CanvasHistory {
  private canvas: fabric.Canvas;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private locked = false;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
    // 保存初始状态
    this.save();
  }

  /** 保存当前画布状态到 undo 栈 */
  save(): void {
    if (this.locked) return;

    const json = JSON.stringify(this.canvas.toJSON());
    this.undoStack.push(json);

    // 限制栈大小
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }

    // 新操作清空 redo 栈
    this.redoStack = [];
  }

  /** 撤销 */
  async undo(): Promise<boolean> {
    if (this.undoStack.length <= 1) return false;

    this.locked = true;

    // 当前状态移到 redo 栈
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    // 恢复上一个状态
    const prev = this.undoStack[this.undoStack.length - 1];
    await this.canvas.loadFromJSON(prev);
    this.canvas.renderAll();

    this.locked = false;
    return true;
  }

  /** 重做 */
  async redo(): Promise<boolean> {
    if (this.redoStack.length === 0) return false;

    this.locked = true;

    // 从 redo 栈恢复状态
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);

    await this.canvas.loadFromJSON(next);
    this.canvas.renderAll();

    this.locked = false;
    return true;
  }

  /** 是否可撤销 */
  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  /** 是否可重做 */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
