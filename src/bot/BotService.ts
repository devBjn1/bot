import TelegramBot from "node-telegram-bot-api";

export type BotMessage = TelegramBot.Message;
export type MessageHandler = (msg: BotMessage) => void | Promise<void>;
export type CommandHandler = (
  msg: BotMessage,
  match?: RegExpMatchArray | null
) => void | Promise<void>;

export interface CommandDefinition {
  command: string;
  description: string;
  handler: CommandHandler;
}

export interface BotService {
  onPhoto(handler: MessageHandler): void;
  onText(handler: MessageHandler): void;
  onCommand(command: string, handler: CommandHandler): void;
  setBotCommands(
    commands: { command: string; description: string }[]
  ): Promise<boolean>;
  getFileUrl(fileId: string): Promise<string>;
  sendPhoto(
    chatId: number | string,
    fileId: string,
    options?: TelegramBot.SendPhotoOptions
  ): Promise<TelegramBot.Message>;
  sendMessage(
    chatId: number | string,
    text: string,
    options?: TelegramBot.SendMessageOptions
  ): Promise<TelegramBot.Message>;
}

