export interface TaskService {
  createCard(name: string, desc: string): Promise<any>;
  addAttachment(cardId: string, attachmentUrl: string, name?: string): Promise<any>;
  addAttachmentFromUrl(cardId: string, fileUrl: string, filename?: string, name?: string): Promise<any>;
  updateAttachmentName(cardId: string, attachmentId: string, name: string): Promise<any>;
}
