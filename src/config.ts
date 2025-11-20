import dotenv from "dotenv";
import TelegramService from "./TelegramService";
import TrelloService from "./TrelloService";
import { TaskService } from "./base/TaskService";
dotenv.config();

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const BUG_LOG_GROUP_ID = process.env.BUG_LOG_GROUP_ID;
export const TRELLO_KEY = process.env.TRELLO_KEY;
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
export const TRELLO_LIST_ID = process.env.TRELLO_LIST_ID;

export const telegram = new TelegramService(TELEGRAM_BOT_TOKEN);
export const taskService: TaskService = new TrelloService({
  key: TRELLO_KEY as string,
  token: TRELLO_TOKEN as string,
  listId: TRELLO_LIST_ID as string,
});