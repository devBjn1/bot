// Buffer for incoming media groups (Telegram albums)
const mediaGroupBuffers = new Map();

function scheduleProcessMediaGroup(id, delay = 1200) {
  const entry = mediaGroupBuffers.get(id);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  console.log(`Schedule album ${id} processing in ${delay}ms`);
  entry.timer = setTimeout(async () => {
    console.log(`Timer fired for album ${id}`);
    mediaGroupBuffers.delete(id);
    await processPhotoSet(
      entry.userId,
      entry.photos,
      entry.msgs,
      entry.createCaption
    );
  }, delay);
  mediaGroupBuffers.set(id, entry);
}

async function processPhotoSet(userId, photos, msgs, createCaption) {
  const chatId = msgs[0]?.chat?.id;
  if (!chatId) return;
  console.log(
    `processPhotoSet called for user=${userId} chat=${chatId} photos=${
      photos.length
    } caption='${createCaption || ""}'`
  );

  // Only process if at least one message had /create
  if (!createCaption || !createCaption.startsWith("/create")) {
    console.warn(`Album ignored: no /create caption found`);
    return;
  }

  try {
    await createTaskService(createCaption || "", chatId, userId, photos);
    console.log(`processPhotoSet completed for album (user=${userId})`);
  } catch (e) {
    console.error(
      `createTaskService failed for album: ${e && e.stack ? e.stack : e}`
    );
    await sendTelegram(chatId, "Failed to create task from album. Try again.");
  }
}

addEventListener("fetch", (event) => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  if (request.method !== "POST") return new Response("OK");

  let update;
  try {
    const text = await request.text();
    update = JSON.parse(text);
  } catch (e) {
    return new Response("OK");
  }

  const message = update?.message;
  if (!message) return new Response("OK");

  const chatId = message.chat?.id;
  const userId = message.from?.id || 0;
  const caption = (message.caption || message.text || "").trim();
  const mediaGroupId = message.media_group_id;

  // ———————————————————————————————
  // ALBUM HANDLING — FIXED & ROBUST
  // ———————————————————————————————
  if (mediaGroupId) {
    const photoArray = message.photo || [];
    const bestPhoto = photoArray.length
      ? photoArray[photoArray.length - 1]
      : null;

    let entry = mediaGroupBuffers.get(mediaGroupId);

    // First time seeing this album
    if (!entry) {
      entry = {
        userId,
        photos: [],
        msgs: [],
        createCaption: null,
        timer: null,
        seenIds: new Set(), // Prevent duplicate processing
      };
      mediaGroupBuffers.set(mediaGroupId, entry);
      console.log(`Album started: ${mediaGroupId}`);
    }

    // Prevent processing the same message twice
    if (entry.seenIds.has(message.message_id)) {
      return new Response("OK");
    }
    entry.seenIds.add(message.message_id);

    // Add photo (deduplicated by file_id)
    let newPhotoAdded = false;
    if (bestPhoto) {
      if (!entry.photos.some((p) => p.file_id === bestPhoto.file_id)) {
        entry.photos.push(bestPhoto);
        newPhotoAdded = true;
      }
    }

    entry.msgs.push(message);

    // Always prefer the message that has /create and longest caption
    if (
      caption.startsWith("/create") &&
      caption.length > (entry.createCaption?.length || 0)
    ) {
      entry.createCaption = caption;
    }

    mediaGroupBuffers.set(mediaGroupId, entry);
    console.log(
      `Album ${mediaGroupId}: ${entry.photos.length} photos, caption: "${(
        entry.createCaption || ""
      ).substring(0, 60)}"`
    );

    // Cloudflare Workers do not reliably support setTimeout; instead:
    // - If a /create caption is present on any message in the album, create the Trello card immediately
    //   and attach any photos currently buffered.
    // - If the card already exists (caption came earlier), attach newly arrived photos immediately.
    if (entry.createCaption && !entry.card) {
      try {
        console.log(
          `Album ${mediaGroupId}: caption present → creating card now`
        );
        const card = await createTaskService(
          entry.createCaption || "",
          chatId,
          entry.userId,
          entry.photos
        );
        if (card && card.id) {
          entry.card = card;
          mediaGroupBuffers.set(mediaGroupId, entry);
          console.log(`Album ${mediaGroupId}: Trello card created ${card.id}`);
        }
      } catch (err) {
        console.error(
          `Album ${mediaGroupId}: createTaskService error: ${
            err && err.stack ? err.stack : err
          }`
        );
      }
    } else if (entry.card && newPhotoAdded) {
      // Attach newly added photo to the already-created card (silent attach)
      try {
        console.log(
          `Album ${mediaGroupId}: attaching new photo to existing card ${entry.card.id}`
        );
        // attach the last pushed photo
        const lastPhoto = entry.photos[entry.photos.length - 1];
        if (lastPhoto)
          await attachSinglePhotoToCard(entry.card, lastPhoto, chatId);
      } catch (err) {
        console.error(
          `Album ${mediaGroupId}: attachSinglePhotoToCard error: ${
            err && err.stack ? err.stack : err
          }`
        );
      }
    }

    return new Response("OK");
  }

  // ———————————————————————————————
  // SINGLE /create (text or single photo)
  // ———————————————————————————————
  if (caption.startsWith("/create")) {
    let photos = [];
    if (message.photo?.length) {
      photos = [message.photo[message.photo.length - 1]];
    }

    await createTaskService(caption, chatId, userId, photos);
    return new Response("OK");
  }

  // ———————————————————————————————
  // Help & Start
  // ———————————————————————————————
  if (caption === "/start" && chatId) {
    await sendTelegram(chatId, "Welcome! Send /help");
  }
  if (caption === "/talk" && chatId) {
    await sendTelegram(chatId, "Anh duong ngao'");
  }

  if (caption === "/help" && chatId) {
    await sendTelegram(
      chatId,
      `*Task Bot*

• \`/create Fix login\`
• \`/create Bug. Can't sign in\`
• Send album with /create caption → all images attached!`
    );
  }

  return new Response("OK");
}

// ===========================================================
// Helper functions
// ===========================================================

async function sendTelegram(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const payload = JSON.stringify({ chat_id: chatId, text });

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}

// ===========================================================
// Self-contained /create task helper (no external imports)
// ===========================================================

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
  let content = text.replace(/^\/create\s+/i, "").trim();
  if (!content) return null;
  const dotIndex = content.indexOf(".");
  if (dotIndex === -1) {
    return {
      title: content.trim(),
      description: "",
    };
  }
  const afterDot = content.substring(dotIndex + 1).trim();
  if (afterDot === "" || afterDot.length <= 1) {
    return {
      title: content.trim(),
      description: "",
    };
  }

  const title = content.substring(0, dotIndex).trim();
  const description = afterDot;

  if (!title) return null;

  return { title, description };
}

async function createTrelloCardWithDesc(title, description) {
  console.log(
    `createTrelloCardWithDesc -> ${JSON.stringify({ title, description })}`
  );
  const url =
    `https://api.trello.com/1/cards` +
    `?key=${TRELLO_KEY}` +
    `&token=${TRELLO_TOKEN}`;
  const body = new URLSearchParams({
    idList: TRELLO_LIST_ID,
    name: title,
    desc: description || "",
    pos: "top",
  });
  const res = await fetch(url, { method: "POST", body });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    console.log(
      `Trello create card response: ${JSON.stringify({
        status: res.status,
        body: json,
      })}`
    );
    return json;
  } catch (e) {
    console.warn(
      `Trello create card returned non-JSON: ${JSON.stringify({
        status: res.status,
        body: text,
      })}`
    );
    return { ok: res.ok, status: res.status, body: text };
  }
}

// Upload a list of Telegram photos to a Trello card (multipart upload with fallback)
async function uploadListPhotoToTask(chatId, task, photos) {
  for (let idx = 0; idx < photos.length; idx++) {
    const p = photos[idx];
    const baseName = _sanitizeName(
      (task && (task.name || task.title)) || "attachment"
    );
    const name = `${baseName} - image ${idx + 1}`;
    try {
      const fileUrl = await getTelegramFileUrl(p.file_id);
      try {
        await addTrelloAttachmentFromUrl(task.id, fileUrl, name);
      } catch (e) {
        console.warn(
          `Multipart upload failed, falling back to URL attach: ${
            e && e.stack ? e.stack : e
          }`
        );
        // Fallback: attach by URL directly
        try {
          const params = new URLSearchParams({
            key: TRELLO_KEY,
            token: TRELLO_TOKEN,
            url: fileUrl,
          });
          if (name) params.append("name", name);
          const resp = await fetch(
            `https://api.trello.com/1/cards/${
              task.id
            }/attachments?${params.toString()}`,
            {
              method: "POST",
            }
          );
          const text = await resp.text();
          try {
            const _parsedAttach = JSON.parse(text);
            console.log(
              `Trello URL-attach response: ${JSON.stringify(_parsedAttach)}`
            );
          } catch (err) {
            console.log(`Trello URL-attach response non-JSON: ${text}`);
          }
        } catch (inner) {
          console.warn(
            `URL attach fallback failed: ${
              inner && inner.stack ? inner.stack : inner
            }`
          );
        }
      }
    } catch (attachErr) {
      console.warn(
        `Could not attach image to Trello card: ${
          attachErr && attachErr.message ? attachErr.message : attachErr
        }`
      );
    }
  }
  await sendTelegram(
    chatId,
    `✅ Task created! View on Trello: ${task.shortUrl || task.url}\n\n`
  );
}

async function getTelegramFileUrl(fileId) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`;
  const resp = await fetch(url);
  const dataText = await resp.text();
  let data;
  try {
    data = JSON.parse(dataText);
  } catch (e) {
    console.warn(`getTelegramFileUrl: non-JSON response ${dataText}`);
    throw new Error("Telegram getFile returned non-JSON");
  }
  console.log(`getTelegramFileUrl response: ${JSON.stringify(data)}`);
  if (!data || !data.ok)
    throw new Error("Telegram getFile failed: " + JSON.stringify(data));
  const path = data.result && data.result.file_path;
  if (!path) throw new Error("Telegram getFile returned no path");
  return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${path}`;
}

async function addTrelloAttachmentFromUrl(cardId, fileUrl, name) {
  const url = `https://api.trello.com/1/cards/${cardId}/attachments`;

  // Try multipart upload (download file and upload bytes) so Trello can store and
  // render the image inline. Fall back to URL-based attach if multipart fails.
  try {
    const downloadResp = await fetch(fileUrl);
    if (!downloadResp.ok)
      throw new Error(`Download failed: ${downloadResp.status}`);

    const arrayBuffer = await downloadResp.arrayBuffer();
    const contentType =
      downloadResp.headers.get("content-type") || "application/octet-stream";
    const filename = name || "attachment";

    // Build multipart/form-data body
    const boundary = "----atok_boundary_" + Date.now();
    const enc = new TextEncoder();

    const partHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
    // name field (so Trello displays a label) and closing boundary
    const namePart = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n`;
    const partFooter = `--${boundary}--\r\n`;

    const headerBuf = enc.encode(partHeader);
    const nameBuf = enc.encode(namePart);
    const footerBuf = enc.encode(partFooter);

    const fileBuf = new Uint8Array(arrayBuffer);

    // Concatenate buffers: header + file + namePart + footer
    const bodyBuf = new Uint8Array(
      headerBuf.length + fileBuf.length + nameBuf.length + footerBuf.length
    );
    let offset = 0;
    bodyBuf.set(headerBuf, offset);
    offset += headerBuf.length;
    bodyBuf.set(fileBuf, offset);
    offset += fileBuf.length;
    bodyBuf.set(nameBuf, offset);
    offset += nameBuf.length;
    bodyBuf.set(footerBuf, offset);

    const query = `?key=${encodeURIComponent(
      TRELLO_KEY
    )}&token=${encodeURIComponent(TRELLO_TOKEN)}`;
    const resp = await fetch(url + query, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuf,
    });
    const respText = await resp.text();
    try {
      const respJson = JSON.parse(respText);
      console.log(
        `Trello multipart upload response: ${JSON.stringify(respJson)}`
      );
      if (!resp.ok)
        throw new Error(
          `Trello upload failed: ${resp.status} ${JSON.stringify(respJson)}`
        );
      return respJson;
    } catch (e) {
      console.warn(
        `Trello multipart upload returned non-JSON: ${JSON.stringify({
          status: resp.status,
          body: respText,
        })}`
      );
      if (!resp.ok)
        throw new Error(`Trello upload failed: ${resp.status} ${respText}`);
      return { ok: resp.ok, status: resp.status, body: respText };
    }
  } catch (err) {
    console.warn(
      `Multipart upload failed, falling back to URL attach: ${
        err && err.stack ? err.stack : err
      }`
    );
    const params = new URLSearchParams({
      key: TRELLO_KEY,
      token: TRELLO_TOKEN,
      url: fileUrl,
    });
    if (name) params.append("name", name);
    const resp2 = await fetch(`${url}?${params.toString()}`, {
      method: "POST",
    });
    const text2 = await resp2.text();
    try {
      const json2 = JSON.parse(text2);
      console.log(
        `Trello URL-attach response: ${JSON.stringify({
          status: resp2.status,
          body: json2,
        })}`
      );
      return json2;
    } catch (e2) {
      console.warn(`Trello URL-attach returned non-JSON: ${text2}`);
      return { ok: resp2.ok, status: resp2.status, body: text2 };
    }
  }
}

// Attach a single Telegram photo object to an existing Trello card (no confirmation message)
async function attachSinglePhotoToCard(card, photo, chatId) {
  if (!card || !card.id) throw new Error("No card provided");
  if (!photo || !photo.file_id) throw new Error("No photo provided");
  try {
    const fileUrl = await getTelegramFileUrl(photo.file_id);
    await addTrelloAttachmentFromUrl(
      card.id,
      fileUrl,
      _sanitizeName(card.name || card.title || "attachment")
    );
    console.log(
      `attachSinglePhotoToCard: attached file ${photo.file_id} to card ${card.id}`
    );
  } catch (err) {
    console.error(
      `attachSinglePhotoToCard failed: ${err && err.stack ? err.stack : err}`
    );
    // do not throw to avoid blocking further processing
  }
}

/**
 * Self-contained task creator that mirrors the `/create` command logic.
 * - `content`: the raw text after `/create`, e.g. "Title. Description"
 * - `chatId`, `userId`: identifiers used for replies and pending storage
 * - `photos`: array of Telegram photo objects (each should contain `file_id`)
 *
 * This function does not import project modules and uses only fetch + globals.
 */

async function createTaskService(content, chatId, userId, photos = []) {
  const hasPhotos = photos.length > 0;

  console.log(
    `createTaskService called ${JSON.stringify({
      content,
      chatId,
      userId,
      photos: photos.map((p) => (p && p.file_id) || null),
    })}`
  );

  const parsed = _parseCreateCommand(content);
  if (!parsed) {
    console.warn(
      `createTaskService: invalid /create content ${JSON.stringify({
        content,
      })}`
    );
    await sendTelegram(
      chatId,
      "❌ Invalid /create format. Use: `/create Title. Description`"
    );
    return null;
  }

  const title = parsed.title;
  const desc = parsed.description;

  const card = await createTrelloCardWithDesc(title, desc);
  console.log(`createTaskService: Trello card result: ${JSON.stringify(card)}`);
  if (!card || !card.id) {
    console.error(
      `createTaskService: Trello card missing id ${JSON.stringify(card)}`
    );
    await sendTelegram(
      chatId,
      "❌ Could not create Trello card. Try again later."
    );
    return;
  }

  if (hasPhotos) {
    // Delegate to centralized upload helper which handles multipart upload
    // and fallbacks; it will send confirmation after attachments.
    await uploadListPhotoToTask(chatId, card, photos);
    console.log(
      `createTaskService: attachments processed for card ${JSON.stringify({
        cardId: card.id,
      })}`
    );
    // Return the created card so callers can attach later images
    return card;
  } else {
    // No photos: just create the card and send confirmation.
    await sendTelegram(
      chatId,
      `✅ Task created! View on Trello: ${card.shortUrl || card.url}`
    );
    return card;
  }
}
