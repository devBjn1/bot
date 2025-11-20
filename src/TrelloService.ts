import axios from "axios";
import { TaskService } from "./base/TaskService";
import FormData from "form-data";

export default class TrelloService implements TaskService {
  key: string;
  token: string;
  listId: string;
  base: string;

  constructor({
    key,
    token,
    listId,
  }: {
    key: string;
    token: string;
    listId: string;
  }) {
    if (!key || !token || !listId) {
      throw new Error("Trello key, token and listId are required");
    }

    // Normalize listId if user provided array/json/comma-separated
    let resolvedListId: any = listId as any;
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
        } catch (e) {
          // ignore
        }
      }
      if (!resolvedListId && s.includes(",")) {
        const parts = s
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length) resolvedListId = parts[0];
      }
      resolvedListId = (resolvedListId || "")
        .toString()
        .replace(/^"|"$/g, "")
        .replace(/,$/, "")
        .trim();
    }

    if (!resolvedListId) {
      throw new Error(
        `Invalid Trello listId provided: ${JSON.stringify(listId)}`
      );
    }

    this.key = key;
    this.token = token;
    this.listId = resolvedListId;
    this.base = "https://api.trello.com/1";
  }

  async createCard(name: string, desc: string) {
    const url = `${this.base}/cards`;
    const params = {
      key: this.key,
      token: this.token,
      idList: this.listId,
      name,
      desc,
      pos: "top",
    } as any;

    const resp = await axios.post(url, null, { params });
    return resp.data;
  }

  async addAttachment(cardId: string, attachmentUrl: string, name?: string) {
    const url = `${this.base}/cards/${cardId}/attachments`;
    const params = {
      key: this.key,
      token: this.token,
      url: attachmentUrl,
    } as any;
    if (name) params.name = name;
    const resp = await axios.post(url, null, { params });
    return resp.data;
  }

  // Try uploading file bytes to Trello so the image shows directly on card detail.
  // Downloads the file at `fileUrl` and posts it as multipart/form-data to Trello.
  async addAttachmentFromUrl(
    cardId: string,
    fileUrl: string,
    filename?: string,
    name?: string
  ) {
    const downloadResp = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(downloadResp.data);
    const contentType =
      (downloadResp.headers && downloadResp.headers["content-type"]) ||
      "application/octet-stream";

    const form = new FormData();
    form.append("file", buffer, {
      filename: filename || "attachment",
      contentType,
    } as any);
    if (name) {
      form.append("name", name);
    }

    const url = `${this.base}/cards/${cardId}/attachments`;

    const headers = form.getHeaders();

    const resp = await axios.post(url, form as any, {
      params: { key: this.key, token: this.token },
      headers: {
        ...headers,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return resp.data;
  }

  async updateAttachmentName(
    cardId: string,
    attachmentId: string,
    name: string
  ) {
    const url = `${this.base}/cards/${cardId}/attachments/${attachmentId}`;
    const params = { key: this.key, token: this.token, name } as any;
    const resp = await axios.put(url, null, { params });
    return resp.data;
  }
}
