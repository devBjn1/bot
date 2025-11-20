const TelegramBot = require("node-telegram-bot-api");

class TelegramService {
  constructor(token) {
    if (!token) throw new Error("Telegram token required");
    this.bot = new TelegramBot(token, { polling: true });
  }

  onPhoto(handler) {
    this.bot.on("photo", handler);
  }

  onText(handler) {
    this.bot.on("text", handler);
  }

  onCommand(command, handler) {
    const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escaped}(?:\\s|$)`);
    this.bot.onText(pattern, handler);
  }

  setBotCommands(commands) {
    return this.bot.setMyCommands(commands);
  }

  async getFileUrl(fileId) {
    const file = await this.bot.getFile(fileId);
    return `https://api.telegram.org/file/bot${this.bot.token}/${file.file_path}`;
  }

  async sendPhoto(chatId, fileId, options) {
    return this.bot.sendPhoto(chatId, fileId, options);
  }

  async sendMediaGroup(chatId, media, options) {
    return this.bot.sendMediaGroup(chatId, media, options);
  }

  async sendMessage(chatId, text, options) {
    return this.bot.sendMessage(chatId, text, options);
  }
}

module.exports = TelegramService;
