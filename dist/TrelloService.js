"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
class TrelloService {
    constructor({ key, token, listId, }) {
        if (!key || !token || !listId) {
            throw new Error("Trello key, token and listId are required");
        }
        // Normalize listId if user provided array/json/comma-separated
        let resolvedListId = listId;
        if (Array.isArray(resolvedListId)) {
            const first = resolvedListId[0];
            resolvedListId = (first && (first.id || first)) || "";
        }
        if (typeof resolvedListId === "string") {
            const s = resolvedListId.trim();
            if (s.startsWith("[")) {
                try {
                    const parsed = JSON.parse(s);
                    if (Array.isArray(parsed) && parsed.length) {
                        const first = parsed[0];
                        resolvedListId = (first && (first.id || first)) || "";
                    }
                }
                catch (e) {
                    // ignore
                }
            }
            if (!resolvedListId && s.includes(",")) {
                const parts = s
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean);
                if (parts.length)
                    resolvedListId = parts[0];
            }
            resolvedListId = (resolvedListId || "")
                .toString()
                .replace(/^"|"$/g, "")
                .replace(/,$/, "")
                .trim();
        }
        if (!resolvedListId) {
            throw new Error(`Invalid Trello listId provided: ${JSON.stringify(listId)}`);
        }
        this.key = key;
        this.token = token;
        this.listId = resolvedListId;
        this.base = "https://api.trello.com/1";
    }
    async createCard(name, desc) {
        const url = `${this.base}/cards`;
        const params = {
            key: this.key,
            token: this.token,
            idList: this.listId,
            name,
            desc,
            pos: "top",
        };
        const resp = await axios_1.default.post(url, null, { params });
        return {
            id: resp.data.id,
            title: resp.data.name,
            userRequest: "",
            description: resp.data.desc,
            cardId: resp.data.id,
            shortUrl: resp.data.shortUrl,
            url: resp.data.url,
        };
    }
    async addAttachment(cardId, attachmentUrl, name) {
        const url = `${this.base}/cards/${cardId}/attachments`;
        const params = {
            key: this.key,
            token: this.token,
            url: attachmentUrl,
        };
        if (name)
            params.name = name;
        const resp = await axios_1.default.post(url, null, { params });
        return resp.data;
    }
    // Try uploading file bytes to Trello so the image shows directly on card detail.
    // Downloads the file at `fileUrl` and posts it as multipart/form-data to Trello.
    async addAttachmentFromUrl(cardId, fileUrl, filename, name) {
        const downloadResp = await axios_1.default.get(fileUrl, {
            responseType: "arraybuffer",
        });
        const buffer = Buffer.from(downloadResp.data);
        const contentType = (downloadResp.headers && downloadResp.headers["content-type"]) ||
            "application/octet-stream";
        const form = new form_data_1.default();
        form.append("file", buffer, {
            filename: filename || "attachment",
            contentType,
        });
        if (name) {
            form.append("name", name);
        }
        const url = `${this.base}/cards/${cardId}/attachments`;
        const headers = form.getHeaders();
        const resp = await axios_1.default.post(url, form, {
            params: { key: this.key, token: this.token },
            headers: {
                ...headers,
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });
        return resp.data;
    }
    async updateAttachmentName(cardId, attachmentId, name) {
        const url = `${this.base}/cards/${cardId}/attachments/${attachmentId}`;
        const params = { key: this.key, token: this.token, name };
        const resp = await axios_1.default.put(url, null, { params });
        return resp.data;
    }
}
exports.default = TrelloService;
