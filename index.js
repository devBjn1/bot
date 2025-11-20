const { BUG_LOG_GROUP_ID, telegram } = require("./config");
const express = require("express");
const getHelpMessage = require("./command/HelpMessage");
const { createTask } = require("./command/CreateTask");
const onPhotoCommandHandler = require("./command/PhotoCommand");

const app = express();
const PORT = process.env.PORT || 8080;

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
  {
    command: "/create",
    description: "Create a task",
    handler: createTask,
  },
];

console.log("🤖 Bot is running... Waiting for images to create tasks.");

telegram.setBotCommands(
  slashCommands.map(({ command, description }) => ({
    command: command.replace("/", ""),
    description,
  }))
);

slashCommands.forEach(({ command, handler }) => {
  telegram.onCommand(command, handler);
});

// Photo handler
telegram.onPhoto(onPhotoCommandHandler);

// Optional: a simple web route for health checks
app.get("/", (_req, res) => res.send("Bot is running"));

// Start Express server
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
