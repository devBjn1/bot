const dotenv = require("dotenv");
const path = require("path");
const TelegramService = require("./TelegramService");
const TrelloService = require("./TrelloService");
const TaskManager = require("./TaskManager");
// const { Telegraf } = require("telegraf");

// Load .env from project root (one level up from src/) so running from src/ still works
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BUG_LOG_GROUP_ID = process.env.BUG_LOG_GROUP_ID;
const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_LIST_ID = process.env.TRELLO_LIST_ID;

const telegram = new TelegramService(TELEGRAM_BOT_TOKEN);

// const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const taskService = new TrelloService({
  key: TRELLO_KEY,
  token: TRELLO_TOKEN,
  listId: TRELLO_LIST_ID,
});

const taskManager = new TaskManager();

module.exports = {
  TELEGRAM_BOT_TOKEN,
  BUG_LOG_GROUP_ID,
  TRELLO_KEY,
  TRELLO_TOKEN,
  TRELLO_LIST_ID,
  telegram,
  taskService,
  taskManager,
  // bot,
};
