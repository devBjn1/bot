export interface TaskService {
  createCard(name: string, desc: string): Promise<Task>;
  addAttachment(cardId: string, attachmentUrl: string, name?: string): Promise<any>;
  addAttachmentFromUrl(cardId: string, fileUrl: string, filename?: string, name?: string): Promise<any>;
  updateAttachmentName(cardId: string, attachmentId: string, name: string): Promise<any>;
}


export interface Task {
  id: string;
  title: string;
  userRequest: string;
  description: string;
  cardId: string;
  shortUrl: string; 
  url: string;
}