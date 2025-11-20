class TaskManager {
  constructor() {
    this.taskCounter = 1;
    this.pendingTasks = new Map();
    this.pendingImages = new Map();
  }

  addPendingTask(userId, title, description, cardId) {
    this.pendingTasks.set(userId, { title, description, cardId });
  }

  getPendingTask(userId) {
    return this.pendingTasks.get(userId);
  }

  removePendingTask(userId) {
    this.pendingTasks.delete(userId);
  }

  addPendingImage(userId, photo, msg) {
    const existing = this.pendingImages.get(userId);
    if (existing) {
      existing.photos.push(photo);
      existing.msgs.push(msg);
      this.pendingImages.set(userId, existing);
    } else {
      this.pendingImages.set(userId, { photos: [photo], msgs: [msg] });
    }
  }

  getPendingImage(userId) {
    return this.pendingImages.get(userId);
  }

  removePendingImage(userId) {
    this.pendingImages.delete(userId);
  }

  nextTaskNumber() {
    return this.taskCounter++;
  }
}

module.exports = TaskManager;
