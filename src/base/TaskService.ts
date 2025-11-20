export interface TaskService {
  createCard(name: string, desc: string): Promise<any>;
  addAttachment(cardId: string, attachmentUrl: string): Promise<any>;
}
