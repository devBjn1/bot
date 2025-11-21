// index.js – PHIÊN BẢN HOÀN HẢO CHO LEAPCELL SERVERLESS
const express = require("express");
const TelegramService = require("./TelegramService");
const getHelpMessage = require("./command/HelpMessage");
const { createTask } = require("./command/CreateTask");
const onPhotoCommandHandler = require("./command/PhotoCommand");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

const telegram = new TelegramService(TELEGRAM_TOKEN);

// === Commands ===
const slashCommands = [
  {
    command: "/help",
    description: "See usage instructions",
    handler: getHelpMessage,
  },
  {
    command: "/start",
    description: "See usage instructions",
    handler: getHelpMessage,
  },
  { command: "/create", description: "Create a task", handler: createTask },
];

telegram.setBotCommands(
  slashCommands.map((c) => ({
    command: c.command.replace("/", ""),
    description: c.description,
  }))
);

slashCommands.forEach(({ command, handler }) =>
  telegram.onCommand(command, handler)
);
telegram.onPhoto(onPhotoCommandHandler);

// === USE POLLING – REMOVE WEBHOOK ===
app.get("/", (req, res) => res.send("Bot is alive – Polling mode active"));

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
