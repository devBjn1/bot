import { BUG_LOG_GROUP_ID, telegram, taskService } from "./config";

import TaskManager from "./TaskManager";
import getHelpMessage from "./command/HelpMessage";

const taskManager = new TaskManager();
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

function sanitizeName(s: string) {
  if (!s) return "attachment";
  return s
    .replace(/[^a-zA-Z0-9 _\-\.]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 80);
}

function parseCreateCommand(text?: string) {
  if (!text) return null;
  const t = text.replace("/create", "").trim();
  const periodIndex = t.indexOf(".");
  if (periodIndex === -1) return null;
  const title = t.substring(0, periodIndex).trim();
  const description = t.substring(periodIndex + 1).trim();
  if (!title || !description) return null;
  return { title, description };
}

// Buffer for media groups (albums) so multiple images can create one task
const mediaGroupBuffers: Map<
  string,
  { userId: number; photos: any[]; msgs: any[]; timer?: NodeJS.Timeout }
> = new Map();

function scheduleProcessMediaGroup(id: string, delay = 1200) {
  const entry = mediaGroupBuffers.get(id);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(async () => {
    mediaGroupBuffers.delete(id);
    await processPhotoSet(entry.userId, entry.photos, entry.msgs);
  }, delay) as unknown as NodeJS.Timeout;
  mediaGroupBuffers.set(id, entry);
}

async function processPhotoSet(userId: number, photos: any[], msgs: any[]) {
  const firstMsg = msgs && msgs.length ? msgs[0] : undefined;
  const chatId = firstMsg?.chat?.id;
  try {
    // First, check if any of the incoming messages contain a `/create` caption.
    // If so, treat this as a create-with-image action: parse title/description from caption
    // and create the Trello card immediately using these images.
    let captionCreate: { title: string; description: string } | null = null;
    for (const m of msgs) {
      const caption = (m && (m.caption || m.text)) as string | undefined;
      if (!caption) continue;
      if (caption.trim().startsWith("/create")) {
        const parsed = parseCreateCommand(caption);
        if (parsed) {
          captionCreate = parsed;
          break;
        }
      }
    }

    if (captionCreate) {
      // Create card from caption and attach provided photos
      const card = await taskService.createCard(
        captionCreate.title,
        captionCreate.description
      );
      for (let idx = 0; idx < photos.length; idx++) {
        const p = photos[idx];
        const baseName = sanitizeName(captionCreate.title || "attachment");
        const name = `${baseName} - image ${idx + 1}`;
        try {
          const fileUrl = await telegram.getFileUrl(p.file_id);
          try {
            await taskService.addAttachmentFromUrl(
              card.id,
              fileUrl,
              p.file_id,
              name
            );
          } catch (e) {
            console.warn(
              "Multipart upload failed, falling back to URL attach:",
              e
            );
            await taskService.addAttachment(card.id, fileUrl, name);
          }
        } catch (attachErr: any) {
          console.warn(
            "Could not attach image to Trello card:",
            attachErr?.message || attachErr
          );
        }
      }

      const taskNum = taskManager.nextTaskNumber();
      const taskMessage = `\n📋 *TASK #${taskNum}*\n\n*Title:* ${
        captionCreate.title
      }\n\n*From:* @${firstMsg?.from?.username || "unknown"} (ID: ${
        firstMsg?.from?.id
      })\n*Chat:* ${firstMsg?.chat?.title || "Private"}\n*Time:* ${new Date(
        firstMsg?.date * 1000
      ).toLocaleString()}\n\n*Description:*\n${
        captionCreate.description
      }\n\n*Status:* 🟡 New Task\n\n*Trello:* ${card.shortUrl || card.url}`;

      // send images and task in one media group
      if (photos.length > 0) {
        const media = photos.map((p: any, idx: number) => {
          const item: any = { type: "photo", media: p.file_id };
          if (idx === 0) {
            item.caption = taskMessage;
            item.parse_mode = "Markdown";
          }
          return item;
        });
        try {
          await telegram.sendMediaGroup(BUG_LOG_GROUP_ID as any, media);
        } catch (e) {
          // fallback
          await telegram.sendPhoto(BUG_LOG_GROUP_ID as any, photos[0].file_id, {
            caption: taskMessage,
            parse_mode: "Markdown",
          });
          for (let i = 1; i < photos.length; i++)
            await telegram.sendPhoto(
              BUG_LOG_GROUP_ID as any,
              photos[i].file_id
            );
        }
      } else {
        await telegram.sendMessage(BUG_LOG_GROUP_ID as any, taskMessage, {
          parse_mode: "Markdown",
        });
      }

      if (chatId)
        await telegram.sendMessage(
          chatId,
          `✅ Task created successfully! View on Trello: ${
            card.shortUrl || card.url
          }`
        );
      return;
    }

    const pendingTask = taskManager.getPendingTask(userId);
    if (!pendingTask) {
      // No template present; silently ignore images per new requirement
      return;
    }

    // Use existing cardId if the task was already created on /create; otherwise create one now
    let card: any;
    if (pendingTask.cardId) {
      card = {
        id: pendingTask.cardId,
        shortUrl: undefined,
        url: undefined,
      } as any;
    } else {
      card = await taskService.createCard(
        pendingTask.title,
        pendingTask.description
      );
      // store cardId so future images will attach to same card
      taskManager.addPendingTask(
        userId,
        pendingTask.title,
        pendingTask.description,
        card.id
      );
    }

    // Attach all photos (name them based on task title)
    for (let idx = 0; idx < photos.length; idx++) {
      const p = photos[idx];
      const baseName = sanitizeName(pendingTask.title || "attachment");
      const name = `${baseName} - image ${idx + 1}`;
      try {
        const fileUrl = await telegram.getFileUrl(p.file_id);
        try {
          await taskService.addAttachmentFromUrl(card.id, fileUrl, p.file_id, name);
        } catch (e) {
          console.warn(
            "Multipart upload failed, falling back to URL attach:",
            e
          );
          await taskService.addAttachment(card.id, fileUrl, name);
        }
      } catch (attachErr: any) {
        console.warn(
          "Could not attach image to Trello card:",
          attachErr?.message || attachErr
        );
      }
    }

    const taskNum = taskManager.nextTaskNumber();
    const taskMessage = `\n📋 *TASK #${taskNum}*\n\n*Title:* ${
      pendingTask.title
    }\n\n*From:* @${firstMsg?.from?.username || "unknown"} (ID: ${
      firstMsg?.from?.id
    })\n*Chat:* ${firstMsg?.chat?.title || "Private"}\n*Time:* ${new Date(
      firstMsg?.date * 1000
    ).toLocaleString()}\n\n*Description:*\n${
      pendingTask.description
    }\n\n*Status:* 🟡 New Task\n\n*Trello:* ${card.shortUrl || card.url}`;

    // Send all photos as a single media group (album) so they appear in one message
    if (photos.length > 0) {
      const media = photos.map((p: any, idx: number) => {
        const item: any = { type: "photo", media: p.file_id };
        if (idx === 0) {
          item.caption = taskMessage;
          item.parse_mode = "Markdown";
        }
        return item;
      });
      try {
        await telegram.sendMediaGroup(BUG_LOG_GROUP_ID as any, media);
      } catch (e) {
        // fallback to individual messages if media group fails
        await telegram.sendPhoto(BUG_LOG_GROUP_ID as any, photos[0].file_id, {
          caption: taskMessage,
          parse_mode: "Markdown",
        });
        for (let i = 1; i < photos.length; i++) {
          await telegram.sendPhoto(BUG_LOG_GROUP_ID as any, photos[i].file_id);
        }
      }
    } else {
      // fallback: just send message
      await telegram.sendMessage(BUG_LOG_GROUP_ID as any, taskMessage, {
        parse_mode: "Markdown",
      });
    }

    if (chatId) {
      await telegram.sendMessage(
        chatId,
        `✅ Task created successfully! View on Trello: ${
          card.shortUrl || card.url
        }`
      );
    }
    taskManager.removePendingTask(userId);
  } catch (error) {
    console.error("Error processing photo set:", error);
    if (chatId) {
      await telegram.sendMessage(
        chatId,
        "❌ Error creating task. Please try again."
      );
    }
  }
}

// Photo handler
telegram.onPhoto(async (msg: any) => {
  const userId = msg.from.id;
  const photos = msg.photo || [];
  const best = photos[photos.length - 1];

  console.log(`📸 Image received from ${msg.from.username || "unknown"}`);

  const mediaGroupId = (msg as any).media_group_id;
  if (mediaGroupId) {
    const existing = mediaGroupBuffers.get(mediaGroupId);
    if (existing) {
      existing.photos.push(best);
      existing.msgs.push(msg);
      mediaGroupBuffers.set(mediaGroupId, existing);
    } else {
      mediaGroupBuffers.set(mediaGroupId, {
        userId,
        photos: [best],
        msgs: [msg],
      });
    }
    scheduleProcessMediaGroup(mediaGroupId);
    return;
  }

  // single photo, process immediately
  await processPhotoSet(userId, [best], [msg]);
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

    // Create Trello card immediately so `/create` does not require an image
    try {
      const card = await taskService.createCard(title, description);
      // store pending task with cardId so images sent afterwards are attached to this card
      taskManager.addPendingTask(userId, title, description, card.id);
      await telegram.sendMessage(
        chatId,
        `✅ Task created! View on Trello: ${
          card.shortUrl || card.url
        }\n\n📸 If you want to attach images to this task, send them now and they'll be added to the card.`,
        { parse_mode: "Markdown" }
      );
    } catch (err: any) {
      console.error("Error creating Trello card:", err?.message || err);
      // fallback: create a pending template without a card
      taskManager.addPendingTask(userId, title, description);
      await telegram.sendMessage(
        chatId,
        `✅ Task template created! (Trello create failed)\n\n*Title:* ${title}\n*Description:* ${description}\n\n📸 You can send images later and I'll try to attach them when Trello is reachable.`,
        { parse_mode: "Markdown" }
      );
    }
    return;
  }
});
