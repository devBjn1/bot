const { telegram, taskService, taskManager } = require("../config");

const _formatCommand =
  "`/create {title} \n{description}`\n\nExample:\n`/create Bug on login page \nCannot click submit button`";

function _sanitizeName(s) {
  if (!s) return "attachment";
  return s
    .replace(/[^a-zA-Z0-9 _\-\.]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 80);
}

function _parseCreateCommand(text) {
  if (!text) return null;
  const t = text.replace("/create", "").trim();
  const periodIndex = t.indexOf(".");
  if (periodIndex === -1) return null;
  const title = t.substring(0, periodIndex).trim();
  const description = t.substring(periodIndex + 1).trim();
  if (!title || !description) return null;
  return { title: title.trim(), description: description.trim() };
}

async function createTask(msg) {
  const text = msg.text || "";
  const chatId = msg.chat.id;
  const userId = (msg.from && msg.from.id) || 0;

  const content = text.replace("/create", "").trim();
  await createTaskService(content, chatId, userId, []);
}

async function createTaskService(content, chatId, userId, photos) {
  const parsed = _parseCreateCommand(content) || { title: "", description: "" };
  const title = parsed.title;
  const description = parsed.description;

  try {
    const card = await taskService.createCard(title, description);
    console.log("Trello card created:", card);

    taskManager.addPendingTask(userId, title, description, card.id);
    if (photos.length > 0) {
      await uploadListPhotoToTask(chatId, card, photos);
    } else {
      await telegram.sendMessage(
        chatId,
        `✅ Task created! View on Trello: ${
          card.shortUrl || card.url
        }\n\n📸 If you want to attach images to this task, send them now and they'll be added to the card.`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (err) {
    console.error(
      "Error creating Trello card:",
      err && err.message ? err.message : err
    );
    taskManager.addPendingTask(userId, title, description);
    await telegram.sendMessage(
      chatId,
      `✅ Task template created! (Trello create failed)\n\n*Title:* ${title}\n*Description:* ${description}\n\n📸 You can send images later and I'll try to attach them when Trello is reachable.`,
      { parse_mode: "Markdown" }
    );
  }
}

async function uploadListPhotoToTask(chatId, task, photos) {
  for (let idx = 0; idx < photos.length; idx++) {
    const p = photos[idx];
    const baseName = _sanitizeName(task.title || "attachment");
    const name = `${baseName} - image ${idx + 1}`;
    try {
      const fileUrl = await telegram.getFileUrl(p.file_id);
      try {
        await taskService.addAttachmentFromUrl(
          task.id,
          fileUrl,
          p.file_id,
          name
        );
      } catch (e) {
        console.warn("Multipart upload failed, falling back to URL attach:", e);
        await taskService.addAttachment(task.id, fileUrl, name);
      }
    } catch (attachErr) {
      console.warn(
        "Could not attach image to Trello card:",
        attachErr && attachErr.message ? attachErr.message : attachErr
      );
    }
  }
  await telegram.sendMessage(
    chatId,
    `✅ Task created! View on Trello: ${
      task.shortUrl || task.url
    }\n\n📸 If you want to attach images to this task, send them now and they'll be added to the card.`,
    { parse_mode: "Markdown" }
  );
}

module.exports = { createTaskService, createTask };
