// index.js
const express = require("express");
const axios = require("axios");
const TelegramService = require("./TelegramService");
const getHelpMessage = require("./command/HelpMessage");
const { createTask } = require("./command/CreateTask");
const onPhotoCommandHandler = require("./command/PhotoCommand");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PUBLIC_URL =
  process.env.SERVICE_DOMAIN ||
  "[https://bot-devbjn15447-an647o9n.apn.leapcell.dev](https://bot-devbjn15447-an647o9n.apn.leapcell.dev)";

if (!TELEGRAM_TOKEN) {
  throw new Error("Set TELEGRAM_BOT_TOKEN environment variable");
}

const telegram = new TelegramService(TELEGRAM_TOKEN);

// Commands
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

// Set bot commands
telegram.setBotCommands(
  slashCommands.map(({ command, description }) => ({
    command: command.replace("/", ""),
    description,
  }))
);

// Register command handlers
slashCommands.forEach(({ command, handler }) =>
  telegram.onCommand(command, handler)
);

// Register photo handler
telegram.onPhoto(onPhotoCommandHandler);

console.log("Bot initialized.");

// Express route to receive Telegram updates
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  telegram.bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Health check
app.get("/", (_req, res) => {
  res.send("Bot is running");
});

// Set webhook on Telegram
const webhookUrl = `${PUBLIC_URL}/bot${TELEGRAM_TOKEN}`;
axios
  .post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
    url: webhookUrl,
  })
  .then((response) => {
    console.log("Webhook set successfully:", response.data);
  })
  .catch((err) => {
    console.error("Failed to set webhook:", err.message);
  });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook URL: ${webhookUrl}`);
});
