const { taskService, telegram } = require("../config");
const { createTaskService } = require("./CreateTask");

function sanitizeName(s) {
  if (!s) return "attachment";
  return s
    .replace(/[^a-zA-Z0-9 _\-\.]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 80);
}

const mediaGroupBuffers = new Map();

function scheduleProcessMediaGroup(id, delay = 1200) {
  const entry = mediaGroupBuffers.get(id);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(async () => {
    mediaGroupBuffers.delete(id);
    await processPhotoSet(entry.userId, entry.photos, entry.msgs);
  }, delay);
  mediaGroupBuffers.set(id, entry);
}

async function processPhotoSet(userId, photos, msgs) {
  const firstMsg = msgs && msgs.length ? msgs[0] : undefined;
  const chatId = firstMsg && firstMsg.chat ? firstMsg.chat.id : undefined;

  try {
    await createTaskService(
      (firstMsg && (firstMsg.caption || "")) || "",
      chatId,
      userId,
      photos
    );
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

async function onPhotoCommandHandler(msg) {
  const userId = (msg.from && msg.from.id) || 0;
  const photos = msg.photo || [];
  const best = photos[photos.length - 1];
  const text = msg.caption || msg.text;

  if ((!text || !text.startsWith("/create")) && mediaGroupBuffers.size === 0) {
    console.log("Not a create command");
    return;
  }

  console.log(
    `📸 Image received from ${
      msg.from && msg.from.username ? msg.from.username : "unknown"
    }`
  );

  const mediaGroupId = msg.media_group_id;
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

  await processPhotoSet(userId, [best], [msg]);
}

module.exports = onPhotoCommandHandler;
