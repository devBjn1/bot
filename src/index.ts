import { BUG_LOG_GROUP_ID, telegram, taskService } from "./config";

import TaskManager from "./TaskManager";
// import TelegramService from "./TelegramService";
import getHelpMessage from "./command/HelpMessage";

const taskManager = new TaskManager();
// const telegram = new TelegramService(TELEGRAM_BOT_TOKEN);
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
];

telegram.setBotCommands(
  slashCommands.map(({ command, description }) => ({
    command: command.replace("/", ""),
    description,
  }))
);

slashCommands.forEach(({ command, handler }) => {
  telegram.onCommand(command, handler);
});

console.log("🤖 Bot is running... Waiting for images to create tasks.");
console.log("📊 Tasks will be sent to group:", BUG_LOG_GROUP_ID);

// Photo handler
telegram.onPhoto(async (msg: any) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const photo = msg.photo[msg.photo.length - 1];

  console.log(`📸 Image received from ${msg.from.username || "unknown"}`);

  const pendingTask = taskManager.getPendingTask(userId);
  if (pendingTask) {
    try {
      const card = await taskService.createCard(
        pendingTask.title,
        pendingTask.description
      );
      try {
        const fileUrl = await telegram.getFileUrl(photo.file_id);
        await taskService.addAttachment(card.id, fileUrl);
      } catch (attachErr: any) {
        console.warn(
          "Could not attach image to Trello card:",
          attachErr?.message || attachErr
        );
      }

      const taskMessage = `\n📋 *TASK #${taskManager.nextTaskNumber()}*\n\n*Title:* ${
        pendingTask.title
      }\n\n*From:* @${msg.from.username || "unknown"} (ID: ${
        msg.from.id
      })\n*Chat:* ${msg.chat.title || "Private"}\n*Time:* ${new Date(
        msg.date * 1000
      ).toLocaleString()}\n\n*Description:*\n${
        pendingTask.description
      }\n\n*Status:* 🟡 New Task\n\n*Trello:* ${card.shortUrl || card.url}`;

      await telegram.sendPhoto(BUG_LOG_GROUP_ID as any, photo.file_id, {
        caption: taskMessage,
        parse_mode: "Markdown",
      });
      await telegram.sendMessage(
        chatId,
        `✅ Task created successfully! View on Trello: ${
          card.shortUrl || card.url
        }`,
        { reply_to_message_id: msg.message_id }
      );
      taskManager.removePendingTask(userId);
    } catch (error) {
      console.error("Error processing photo:", error);
      await telegram.sendMessage(
        chatId,
        "❌ Error creating task. Please try again."
      );
    }
  } else {
    taskManager.addPendingImage(userId, photo, msg);
    await telegram.sendMessage(
      chatId,
      "📸 Image received! Now send the `/create` command with title and description.\n\nExample:\n`/create Bug on login page. Cannot click submit button`",
      { parse_mode: "Markdown", reply_to_message_id: msg.message_id }
    );
  }
});

// Text handler
telegram.onText(async (msg: any) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text as string;

  if (!text) return;

  if (text.startsWith("/create")) {
    const content = text.replace("/create", "").trim();
    const periodIndex = content.indexOf(".");
    if (periodIndex === -1) {
      await telegram.sendMessage(
        chatId,
        "❌ *Invalid format!*\n\nPlease use:\n`/create {title}. {description}`\n\nExample:\n`/create Bug on login page. Cannot click submit button`",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const title = content.substring(0, periodIndex).trim();
    const description = content.substring(periodIndex + 1).trim();
    if (!title || !description) {
      await telegram.sendMessage(
        chatId,
        "❌ *Missing title or description!*\n\nPlease use:\n`/create {title}. {description}`\n\nExample:\n`/create Bug on login page. Cannot click submit button`",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const pendingImage = taskManager.getPendingImage(userId);
    if (pendingImage) {
      try {
        const card = await taskService.createCard(title, description);
        try {
          const fileUrl = await telegram.getFileUrl(pendingImage.photo.file_id);
          await taskService.addAttachment(card.id, fileUrl);
        } catch (attachErr: any) {
          console.warn(
            "Could not attach image to Trello card:",
            attachErr?.message || attachErr
          );
        }

        const taskMessage = `\n📋 *TASK #${taskManager.nextTaskNumber()}*\n\n*Title:* ${title}\n\n*From:* @${
          msg.from.username || "unknown"
        } (ID: ${msg.from.id})\n*Chat:* ${
          msg.chat.title || "Private"
        }\n*Time:* ${new Date(
          msg.date * 1000
        ).toLocaleString()}\n\n*Description:*\n${description}\n\n*Status:* 🟡 New Task\n\n*Trello:* ${
          card.shortUrl || card.url
        }`;

        // await telegram.sendPhoto(
        //   BUG_LOG_GROUP_ID as any,
        //   pendingImage.photo.file_id,
        //   { caption: taskMessage, parse_mode: "Markdown" }
        // );
        await telegram.sendMessage(
          chatId,
          `✅ Task created successfully! View on Trello: ${
            card.shortUrl || card.url
          }`,
          { reply_to_message_id: msg.message_id }
        );
        taskManager.removePendingImage(userId);
      } catch (error) {
        console.error("Error creating task:", error);
        await telegram.sendMessage(
          chatId,
          "❌ Error creating task. Please try again."
        );
      }
    } else {
      taskManager.addPendingTask(userId, title, description);
      await telegram.sendMessage(
        chatId,
        `✅ *Task template created!*\n\n*Title:* ${title}\n*Description:* ${description}\n\n📸 Now send an image to complete the task.`,
        { parse_mode: "Markdown" }
      );
    }
    return;
  }

  // if (text === "/chatid") {
  //   await telegram.sendMessage(
  //     chatId,
  //     `📍 *Chat Information*\n\nChat ID: \`${chatId}\`\nChat Title: ${
  //       msg.chat.title || "Private Chat"
  //     }\n\nUse this Chat ID in your .env file as BUG_LOG_GROUP_ID`,
  //     { parse_mode: "Markdown" }
  //   );
  //   return;
  // }
});


// telegram.onText()