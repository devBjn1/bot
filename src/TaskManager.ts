export type PendingTask = { title: string; description: string };
export type PendingImage = { photo: any; msg: any };

export default class TaskManager {
  private taskCounter: number;
  private pendingTasks: Map<number, PendingTask>;
  private pendingImages: Map<number, PendingImage>;

  constructor() {
    this.taskCounter = 1;
    this.pendingTasks = new Map();
    this.pendingImages = new Map();
  }

  addPendingTask(userId: number, title: string, description: string) {
    this.pendingTasks.set(userId, { title, description });
  }

  getPendingTask(userId: number): PendingTask | undefined {
    return this.pendingTasks.get(userId);
  }

  removePendingTask(userId: number) {
    this.pendingTasks.delete(userId);
  }

  addPendingImage(userId: number, photo: any, msg: any) {
    this.pendingImages.set(userId, { photo, msg });
  }

  getPendingImage(userId: number): PendingImage | undefined {
    return this.pendingImages.get(userId);
  }

  removePendingImage(userId: number) {
    this.pendingImages.delete(userId);
  }

  nextTaskNumber(): number {
    return this.taskCounter++;
  }
}
