import TelegramBot from "node-telegram-bot-api";
import { telegram } from "../config";
import { taskService, taskManager } from "../config";
import { Task } from "../base/TaskService";

const _formatCommand = "`/create {title} \n{description}`\n\nExample:\n`/create Bug on login page \nCannot click submit button`";

function _sanitizeName(s: string) {
    if (!s) return "attachment";
    return s
        .replace(/[^a-zA-Z0-9 _\-\.]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 80);
}

function _parseCreateCommand(text?: string) {
    if (!text) return null;
    const t = text.replace("/create", "").trim();
    const periodIndex = t.indexOf(".");
    if (periodIndex === -1) return null;
    const title = t.substring(0, periodIndex).trim();
    const description = t.substring(periodIndex + 1).trim();
    if (!title || !description) return null;
    return { title: title.trim(), description: description.trim() };
}

async function createTask(msg: TelegramBot.Message) {
    const text = msg.text as string;
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? 0;

    const content = text.replace("/create", "").trim();
    // const periodIndex = content.indexOf("\n");
    // if (periodIndex === -1) {
    //     await telegram.sendMessage(
    //         chatId,
    //         "❌ *Invalid format!*\n\nPlease use:\n" + _formatCommand,
    //         { parse_mode: "Markdown" }
    //     );
    //     return;
    // }

    // const title = content.substring(0, periodIndex).trim();
    // const description = content.substring(periodIndex + 1).trim();
    // if (title.length === 0) {
    //     await telegram.sendMessage(
    //         chatId,
    //         "❌ *Missing title!*\n\nPlease use:\n" + _formatCommand,
    //         { parse_mode: "Markdown" }
    //     );
    //     return;
    // }

    // Create Trello card immediately so `/create` does not require an image
    await createTaskService(content, chatId, userId, []);
    // try {
    //   const card = await taskService.createCard(title, description);
    //   console.log("Trello card created:", card);

    //   // store pending task with cardId so images sent afterwards are attached to this card
    //   taskManager.addPendingTask(userId, title, description, card.id);
    //   await telegram.sendMessage(
    //     chatId,
    //     `✅ Task created! View on Trello: ${
    //       card.shortUrl || card.url
    //     }\n\n📸 If you want to attach images to this task, send them now and they'll be added to the card.`,
    //     { parse_mode: "Markdown" }
    //   );
    // } catch (err: any) {
    //   console.error("Error creating Trello card:", err?.message || err);
    //   // fallback: create a pending template without a card
    //   taskManager.addPendingTask(userId, title, description);
    //   await telegram.sendMessage(
    //     chatId,
    //     `✅ Task template created! (Trello create failed)\n\n*Title:* ${title}\n*Description:* ${description}\n\n📸 You can send images later and I'll try to attach them when Trello is reachable.`,
    //     { parse_mode: "Markdown" }
    //   );
    // }
}

async function createTaskService(content: string, chatId: number, userId: number, photos: any[]): Promise<void> {
    const { title, description } = _parseCreateCommand(content) ?? { title: "", description: "" };

    try {
        const card = await taskService.createCard(title, description);
        console.log("Trello card created:", card);

        // store pending task with cardId so images sent afterwards are attached to this card
        taskManager.addPendingTask(userId, title, description, card.id);
        if(photos.length > 0) {
            await uploadListPhotoToTask(chatId, card, photos);
        } else {
            await telegram.sendMessage(
                chatId,
                `✅ Task created! View on Trello: ${card.shortUrl || card.url
                }\n\n📸 If you want to attach images to this task, send them now and they'll be added to the card.`,
                { parse_mode: "Markdown" }
            );
        }
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
}


async function uploadListPhotoToTask(chatId: number, task: Task, photos: any[]): Promise<void> {
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
                console.warn(
                    "Multipart upload failed, falling back to URL attach:",
                    e
                );
                await taskService.addAttachment(task.id, fileUrl, name);
            }
        } catch (attachErr: any) {
            console.warn(
                "Could not attach image to Trello card:",
                attachErr?.message || attachErr
            );
        }
    }
    await telegram.sendMessage(
        chatId,
        `✅ Task created! View on Trello: ${task.shortUrl || task.url
        }\n\n📸 If you want to attach images to this task, send them now and they'll be added to the card.`,
        { parse_mode: "Markdown" }
    );
    // const taskNum = taskManager.nextTaskNumber();
    // const taskMessage = `\n📋 *TASK #${taskNum}*\n\n*Title:* ${task.title
    //     }\n\n*From:* @${msg.from?.username || "unknown"} (ID: ${msg.from?.id
        // })\n*Chat:* ${firstMsg?.chat?.title || "Private"}\n*Time:* ${new Date(
        //     firstMsg?.date * 1000
        // ).toLocaleString()}\n\n*Description:*\n${captionCreate.description
        // }\n\n*Status:* 🟡 New Task\n\n*Trello:* ${card.shortUrl || card.url}`;

    // send images and task in one media group
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
}

export { createTaskService, createTask };