const { telegram } = require("../config");

const _helpMessage =
  "🤖 *Task Logging Bot*\n\n*How to create a task:*\n\n*Option 1:* Send `/create` contain image\n*Option 2:* `Send /create without image`\n\n*Format:*\n`/create {title}. {description}`\n\n*Example:*\n`/create Bug on login page. Cannot click submit button after entering credentials`";

async function getHelpMessage(msg) {
  await telegram.sendMessage(msg.chat.id, _helpMessage, {
    parse_mode: "Markdown",
  });
}

module.exports = getHelpMessage;
