const TelegramBot = require("node-telegram-bot-api");

class TelegramService {
  constructor(token) {
    // allow token to be passed or read from environment (helps in Docker/deploy)
    const resolvedToken = token || process.env.TELEGRAM_BOT_TOKEN;
    if (!resolvedToken) {
      throw new Error(
        "Telegram token required. Set the TELEGRAM_BOT_TOKEN environment variable or add it to a .env file in the project root."
      );
    }
    this.bot = new TelegramBot(resolvedToken, { polling: true });
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
