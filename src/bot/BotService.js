const TelegramBot = require("node-telegram-bot-api");

/**
 * Lightweight JS implementation of the BotService interface used by the app.
 * This factory returns an object with the same methods previously declared
 * in the TypeScript interface so you can use it from JS code.
 *
 * Usage:
 * const createBotService = require('./bot/BotService');
 * const botService = createBotService(process.env.TELEGRAM_BOT_TOKEN);
 */
function createBotService(token, options = { polling: true }) {
  if (!token) throw new Error("Telegram token required");
  const bot = new TelegramBot(token, options);

  return {
    onPhoto(handler) {
      bot.on("photo", handler);
    },

    onText(handler) {
      bot.on("text", handler);
    },

    onCommand(command, handler) {
      // match commands like `/command` or `/command args...`
      const re = new RegExp(`^/${command}(?:\s+(.*))?`);
      bot.onText(re, (msg, match) => handler(msg, match));
    },

    async setBotCommands(commands) {
      // commands: [{ command, description }]
      try {
        await bot.setMyCommands(
          commands.map((c) => ({
            command: c.command,
            description: c.description,
          }))
        );
        return true;
      } catch (e) {
        console.warn("Failed to set bot commands:", e?.message || e);
        return false;
      }
    },

    async getFileUrl(fileId) {
      const file = await bot.getFile(fileId);
      return `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    },

    sendPhoto(chatId, fileId, options) {
      return bot.sendPhoto(chatId, fileId, options);
    },

    sendMessage(chatId, text, options) {
      return bot.sendMessage(chatId, text, options);
    },
  };
}

module.exports = createBotService;
