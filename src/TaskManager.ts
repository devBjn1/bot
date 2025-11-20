export type PendingTask = {
  title: string;
  description: string;
  cardId?: string;
};
export type PendingImage = { photos: any[]; msgs: any[] };

export default class TaskManager {
  private taskCounter: number;
  private pendingTasks: Map<number, PendingTask>;
  private pendingImages: Map<number, PendingImage>;

  constructor() {
    this.taskCounter = 1;
    this.pendingTasks = new Map();
    this.pendingImages = new Map();
  }

  addPendingTask(
    userId: number,
    title: string,
    description: string,
    cardId?: string
  ) {
    this.pendingTasks.set(userId, { title, description, cardId });
  }

  getPendingTask(userId: number): PendingTask | undefined {
    return this.pendingTasks.get(userId);
  }

  removePendingTask(userId: number) {
    this.pendingTasks.delete(userId);
  }

  addPendingImage(userId: number, photo: any, msg: any) {
    const existing = this.pendingImages.get(userId);
    if (existing) {
      existing.photos.push(photo);
      existing.msgs.push(msg);
      this.pendingImages.set(userId, existing);
    } else {
      this.pendingImages.set(userId, { photos: [photo], msgs: [msg] });
    }
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
