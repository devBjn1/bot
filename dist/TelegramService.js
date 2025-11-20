"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
class TelegramService {
    constructor(token) {
        if (!token)
            throw new Error("Telegram token required");
        this.bot = new node_telegram_bot_api_1.default(token, { polling: true });
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
        // media = [{ type: 'photo', media: fileIdOrUrl, caption?: string, parse_mode?: 'Markdown' }, ...]
        return this.bot.sendMediaGroup(chatId, media, options);
    }
    async sendMessage(chatId, text, options) {
        return this.bot.sendMessage(chatId, text, options);
    }
}
exports.default = TelegramService;
