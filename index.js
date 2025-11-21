const { BUG_LOG_GROUP_ID, telegram, bot } = require("./config");
const express = require("express");
const getHelpMessage = require("./command/HelpMessage");
const { createTask } = require("./command/CreateTask");
const onPhotoCommandHandler = require("./command/PhotoCommand");

const app = express();

// CRITICAL: Parse JSON body from Telegram
app.use(express.json());

const PORT = process.env.PORT || 8080;
const LEAPCELL_URL =
  process.env.SERVICE_DOMAIN ||
  "https://bot-devbjn15447-an647o9n.apn.leapcell.dev"; // put your real Leapcell URL here

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

console.log("Bot is running... Waiting for images to create tasks.");

// Set bot commands
telegram.setBotCommands(
  slashCommands.map(({ command, description }) => ({
    command: command.replace("/", ""),
    description,
  }))
);

// Register command handlers
slashCommands.forEach(({ command, handler }) => {
  telegram.onCommand(command, handler);
});

// Photo handler
telegram.onPhoto(onPhotoCommandHandler);

app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, bot.webhookCallback);

// Health check
app.get("/", (_req, res) => res.send("Bot is running"));

// Fixed /set-webhook route
app.get("/set-webhook", async (req, res) => {
  const url = `${LEAPCELL_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  try {
    const result = await bot.telegram.setWebhook(url);
    res.send({
      ok: result,
      url,
      message: result ? "Webhook set successfully!" : "Failed",
    });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Start server + auto set webhook
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Your bot URL: ${LEAPCELL_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`
  );

  try {
    const webhookUrl = `${LEAPCELL_URL}/bot${process.env.TELEGRAM_BOT_TOKEN}`;
    await bot.telegram.setWebhook(webhookUrl);
    console.log("Webhook set to:", webhookUrl);
  } catch (err) {
    console.error("Failed to set webhook:", err.message);
  }
});
