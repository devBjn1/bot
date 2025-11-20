import TelegramBot from "node-telegram-bot-api";
import { taskService, telegram } from "../config";
import { createTaskService } from "./CreateTask";

function sanitizeName(s: string) {
    if (!s) return "attachment";
    return s
        .replace(/[^a-zA-Z0-9 _\-\.]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 80);
}

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
        await createTaskService(firstMsg?.caption || "", chatId, userId, photos);
        // First, check if any of the incoming messages contain a `/create` caption.
        // If so, treat this as a create-with-image action: parse title/description from caption
        // and create the Trello card immediately using these images.
        // let captionCreate: boolean = false;
        // ca[]
        // for (const m of msgs) {
        //     const caption = (m && (m.caption || m.text)) as string | undefined;
        //     if (!caption) continue;
        //     if (caption.trim().startsWith("/create")) {
        //         // const parsed = parseCreateCommand(caption);
        //         // if (parsed) {
        //         //   captionCreate = parsed;
        //         //   break;
        //         // }
        //         break;
        //     }
        // }
        // console.log("is create command", captionCreate);
        // if (captionCreate) {
            // Create card from caption and attach provided photos
            // const card = await taskService.createCard(
            //     captionCreate.title,
            //     captionCreate.description
            // );
            // for (let idx = 0; idx < photos.length; idx++) {
            //     const p = photos[idx];
            //     const baseName = sanitizeName(captionCreate.title || "attachment");
            //     const name = `${baseName} - image ${idx + 1}`;
            //     try {
            //         const fileUrl = await telegram.getFileUrl(p.file_id);
            //         try {
            //             await taskService.addAttachmentFromUrl(
            //                 card.id,
            //                 fileUrl,
            //                 p.file_id,
            //                 name
            //             );
            //         } catch (e) {
            //             console.warn(
            //                 "Multipart upload failed, falling back to URL attach:",
            //                 e
            //             );
            //             await taskService.addAttachment(card.id, fileUrl, name);
            //         }
            //     } catch (attachErr: any) {
            //         console.warn(
            //             "Could not attach image to Trello card:",
            //             attachErr?.message || attachErr
            //         );
            //     }
            // }

            // const taskNum = taskManager.nextTaskNumber();
            // const taskMessage = `\n📋 *TASK #${taskNum}*\n\n*Title:* ${captionCreate.title
            //     }\n\n*From:* @${firstMsg?.from?.username || "unknown"} (ID: ${firstMsg?.from?.id
            //     })\n*Chat:* ${firstMsg?.chat?.title || "Private"}\n*Time:* ${new Date(
            //         firstMsg?.date * 1000
            //     ).toLocaleString()}\n\n*Description:*\n${captionCreate.description
            //     }\n\n*Status:* 🟡 New Task\n\n*Trello:* ${card.shortUrl || card.url}`;

            // // send images and task in one media group
            // if (photos.length > 0) {
            //     const media = photos.map((p: any, idx: number) => {
            //         const item: any = { type: "photo", media: p.file_id };
            //         if (idx === 0) {
            //             item.caption = taskMessage;
            //             item.parse_mode = "Markdown";
            //         }
            //         return item;
            //     });
            //     try {
            //         await telegram.sendMediaGroup(BUG_LOG_GROUP_ID as any, media);
            //     } catch (e) {
            //         // fallback
            //         await telegram.sendPhoto(BUG_LOG_GROUP_ID as any, photos[0].file_id, {
            //             caption: taskMessage,
            //             parse_mode: "Markdown",
            //         });
            //         for (let i = 1; i < photos.length; i++)
            //             await telegram.sendPhoto(
            //                 BUG_LOG_GROUP_ID as any,
            //                 photos[i].file_id
            //             );
            //     }
            // } else {
            //     await telegram.sendMessage(BUG_LOG_GROUP_ID as any, taskMessage, {
            //         parse_mode: "Markdown",
            //     });
            // }

            // if (chatId)
            //     await telegram.sendMessage(
            //         chatId,
            //         `✅ Task created successfully! View on Trello: ${card.shortUrl || card.url
            //         }`
            //     );
            // return;
        // }

        // const pendingTask = taskManager.getPendingTask(userId);
        // if (!pendingTask) {
        //     // No template present; silently ignore images per new requirement
        //     return;
        // }

        // // Use existing cardId if the task was already created on /create; otherwise create one now
        // let card: any;
        // if (pendingTask.cardId) {
        //     card = {
        //         id: pendingTask.cardId,
        //         shortUrl: undefined,
        //         url: undefined,
        //     } as any;
        // } else {
        //     card = await taskService.createCard(
        //         pendingTask.title,
        //         pendingTask.description
        //     );
        //     // store cardId so future images will attach to same card
        //     taskManager.addPendingTask(
        //         userId,
        //         pendingTask.title,
        //         pendingTask.description,
        //         card.id
        //     );
        // }

        // // Attach all photos (name them based on task title)
        // for (let idx = 0; idx < photos.length; idx++) {
        //     const p = photos[idx];
        //     const baseName = sanitizeName(pendingTask.title || "attachment");
        //     const name = `${baseName} - image ${idx + 1}`;
        //     try {
        //         const fileUrl = await telegram.getFileUrl(p.file_id);
        //         try {
        //             await taskService.addAttachmentFromUrl(card.id, fileUrl, p.file_id, name);
        //         } catch (e) {
        //             console.warn(
        //                 "Multipart upload failed, falling back to URL attach:",
        //                 e
        //             );
        //             await taskService.addAttachment(card.id, fileUrl, name);
        //         }
        //     } catch (attachErr: any) {
        //         console.warn(
        //             "Could not attach image to Trello card:",
        //             attachErr?.message || attachErr
        //         );
        //     }
        // }

        // const taskNum = taskManager.nextTaskNumber();
        // const taskMessage = `\n📋 *TASK #${taskNum}*\n\n*Title:* ${pendingTask.title
        //     }\n\n*From:* @${firstMsg?.from?.username || "unknown"} (ID: ${firstMsg?.from?.id
        //     })\n*Chat:* ${firstMsg?.chat?.title || "Private"}\n*Time:* ${new Date(
        //         firstMsg?.date * 1000
        //     ).toLocaleString()}\n\n*Description:*\n${pendingTask.description
        //     }\n\n*Status:* 🟡 New Task\n\n*Trello:* ${card.shortUrl || card.url}`;

        // // Send all photos as a single media group (album) so they appear in one message
        // if (photos.length > 0) {
        //     const media = photos.map((p: any, idx: number) => {
        //         const item: any = { type: "photo", media: p.file_id };
        //         if (idx === 0) {
        //             item.caption = taskMessage;
        //             item.parse_mode = "Markdown";
        //         }
        //         return item;
        //     });
        //     try {
        //         await telegram.sendMediaGroup(BUG_LOG_GROUP_ID as any, media);
        //     } catch (e) {
        //         // fallback to individual messages if media group fails
        //         await telegram.sendPhoto(BUG_LOG_GROUP_ID as any, photos[0].file_id, {
        //             caption: taskMessage,
        //             parse_mode: "Markdown",
        //         });
        //         for (let i = 1; i < photos.length; i++) {
        //             await telegram.sendPhoto(BUG_LOG_GROUP_ID as any, photos[i].file_id);
        //         }
        //     }
        // } else {
        //     // fallback: just send message
        //     await telegram.sendMessage(BUG_LOG_GROUP_ID as any, taskMessage, {
        //         parse_mode: "Markdown",
        //     });
        // }

        // if (chatId) {
        //     await telegram.sendMessage(
        //         chatId,
        //         `✅ Task created successfully! View on Trello: ${card.shortUrl || card.url
        //         }`
        //     );
        // }
        // taskManager.removePendingTask(userId);
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

async function onPhotoCommandHandler(msg: TelegramBot.Message): Promise<void> {
    const userId = msg.from?.id ?? 0;
    const photos = msg.photo || [];
    const best = photos[photos.length - 1];
    const text = msg.caption || msg.text;
    console.log("text", text);

    if ((!text?.startsWith("/create") || text.length === 0) && mediaGroupBuffers.size === 0) {
        console.log("Not a create command");
        return;
    }

    console.log(`📸 Image received from ${msg.from?.username || "unknown"}`);

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
}

export default onPhotoCommandHandler;