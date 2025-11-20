"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskManager = exports.taskService = exports.telegram = exports.TRELLO_LIST_ID = exports.TRELLO_TOKEN = exports.TRELLO_KEY = exports.BUG_LOG_GROUP_ID = exports.TELEGRAM_BOT_TOKEN = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const TelegramService_1 = __importDefault(require("./TelegramService"));
const TrelloService_1 = __importDefault(require("./TrelloService"));
const TaskManager_1 = __importDefault(require("./TaskManager"));
dotenv_1.default.config();
exports.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
exports.BUG_LOG_GROUP_ID = process.env.BUG_LOG_GROUP_ID;
exports.TRELLO_KEY = process.env.TRELLO_KEY;
exports.TRELLO_TOKEN = process.env.TRELLO_TOKEN;
exports.TRELLO_LIST_ID = process.env.TRELLO_LIST_ID;
exports.telegram = new TelegramService_1.default(exports.TELEGRAM_BOT_TOKEN);
exports.taskService = new TrelloService_1.default({
    key: exports.TRELLO_KEY,
    token: exports.TRELLO_TOKEN,
    listId: exports.TRELLO_LIST_ID,
});
exports.taskManager = new TaskManager_1.default();
