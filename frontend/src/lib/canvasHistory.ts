/**
 * 画布历史管理 — 快照式撤销/重做
 *
 * 用 canvas.toDataURL() 保存快照，支持原生 Canvas 2D 绘图。
 */

const MAX_HISTORY = 30;

export class CanvasHistory {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private locked = false;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    // 保存初始状态
    this.save();
  }

  /** 保存当前画布快照 */
  save(): void {
    if (this.locked) return;
    const dataUrl = this.canvas.toDataURL('image/png');
    this.undoStack.push(dataUrl);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  /** 撤销 */
  async undo(): Promise<boolean> {
    if (this.undoStack.length <= 1) return false;
    this.locked = true;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    await this.restoreSnapshot(prev);
    this.locked = false;
    return true;
  }

  /** 重做 */
  async redo(): Promise<boolean> {
    if (this.redoStack.length === 0) return false;
    this.locked = true;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    await this.restoreSnapshot(next);
    this.locked = false;
    return true;
  }

  /** 从 dataUrl 恢复画布 */
  private restoreSnapshot(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
        resolve();
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
