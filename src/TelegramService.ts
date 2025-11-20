import TelegramBot, { Message } from "node-telegram-bot-api";

export default class TelegramService {
  bot: TelegramBot;

  constructor(token: string | undefined) {
    if (!token) throw new Error("Telegram token required");
    this.bot = new TelegramBot(token, { polling: true });
  }

  onPhoto(handler: (msg: Message) => void) {
    this.bot.on("photo", handler as any);
  }

  onText(handler: (msg: Message) => void) {
    this.bot.on("text", handler as any);
  }

  onCommand(
    command: string,
    handler: (
      msg: TelegramBot.Message,
      match?: RegExpMatchArray | null
    ) => void
  ) {
    const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escaped}(?:\\s|$)`);
    this.bot.onText(pattern, handler as any);
  }

  setBotCommands(commands: TelegramBot.BotCommand[]) {
    return this.bot.setMyCommands(commands);
  }

  async getFileUrl(fileId: string) {
    const file = await this.bot.getFile(fileId);
    return `https://api.telegram.org/file/bot${(this.bot as any).token}/${
      (file as any).file_path
    }`;
  }

  async sendPhoto(chatId: number | string, fileId: string, options?: any) {
    return this.bot.sendPhoto(chatId as any, fileId, options);
  }

  async sendMessage(chatId: number | string, text: string, options?: any) {
    return this.bot.sendMessage(chatId as any, text, options);
  }
}
