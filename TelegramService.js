// TelegramService.js
const TelegramBot = require("node-telegram-bot-api");

class TelegramService {
  constructor(token) {
    const resolvedToken = token || process.env.TELEGRAM_BOT_TOKEN;
    if (!resolvedToken) {
      throw new Error(
        "Telegram token required. Set TELEGRAM_BOT_TOKEN environment variable."
      );
    }
    this.bot = new TelegramBot(resolvedToken, { polling: false }); // polling disabled for webhook
  }

  onText(handler) {
    this.bot.on("text", handler);
  }

  onPhoto(handler) {
    this.bot.on("photo", handler);
  }

  onCommand(command, handler) {
    const escaped = command.replace(/[.*+?^${}()|[]\]/g, "$&");
    const pattern = new RegExp(`^${escaped}(?:\\s|$)`);
    this.bot.onText(pattern, handler);
  }

  setBotCommands(commands) {
    return this.bot.setMyCommands(commands);
  }

  sendMessage(chatId, text, options) {
    return this.bot.sendMessage(chatId, text, options);
  }

  sendPhoto(chatId, fileId, options) {
    return this.bot.sendPhoto(chatId, fileId, options);
  }

  async getFileUrl(fileId) {
    const file = await this.bot.getFile(fileId);
    return `https://api.telegram.org/file/bot${this.bot.token}/${file.file_path}`;
  }
}

module.exports = TelegramService;
