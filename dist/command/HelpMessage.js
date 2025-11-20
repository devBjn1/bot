"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const _helpMessage = "🤖 *Task Logging Bot*\n\n*How to create a task:*\n\n*Option 1:* Send `/create` first, then image\n*Option 2:* Send image first, then `/create`\n\n*Format:*\n`/create {title}. {description}`\n\n*Example:*\n`/create Bug on login page. Cannot click submit button after entering credentials`";
async function getHelpMessage(msg) {
    await config_1.telegram.sendMessage(msg.chat.id, _helpMessage, { parse_mode: "Markdown" });
}
exports.default = getHelpMessage;
