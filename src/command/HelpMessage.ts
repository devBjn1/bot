import TelegramBot from "node-telegram-bot-api";
import { telegram } from "../config";

const _helpMessage = "🤖 *Task Logging Bot*\n\n*How to create a task:*\n\n*Option 1:* Send `/create` first, then image\n*Option 2:* Send image first, then `/create`\n\n*Format:*\n`/create {title}. {description}`\n\n*Example:*\n`/create Bug on login page. Cannot click submit button after entering credentials`";

async function getHelpMessage(msg: TelegramBot.Message) {
    await telegram.sendMessage(msg.chat.id, _helpMessage, { parse_mode: "Markdown" });
}

export default getHelpMessage;