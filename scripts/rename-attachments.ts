import dotenv from "dotenv";
import axios from "axios";
import TrelloService from "../src/TrelloService";

dotenv.config();

const TRELLO_KEY = process.env.TRELLO_KEY as string;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN as string;

if (!TRELLO_KEY || !TRELLO_TOKEN) {
  console.error("TRELLO_KEY and TRELLO_TOKEN must be set in .env");
  process.exit(1);
}

async function main() {
  const cardId = process.argv[2];
  const baseName = process.argv[3] || "attachment";

  if (!cardId) {
    console.error(
      "Usage: ts-node scripts/rename-attachments.ts <cardId> [baseName]"
    );
    process.exit(1);
  }

  // fetch attachments
  const url = `https://api.trello.com/1/cards/${cardId}/attachments`;
  const resp = await axios.get(url, {
    params: { key: TRELLO_KEY, token: TRELLO_TOKEN },
  });
  const attachments: any[] = resp.data || [];

  if (!attachments.length) {
    console.log("No attachments found on card", cardId);
    return;
  }

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    const name = `${baseName} - image ${i + 1}`;
    try {
      const updateUrl = `https://api.trello.com/1/cards/${cardId}/attachments/${att.id}`;
      await axios.put(updateUrl, null, {
        params: { key: TRELLO_KEY, token: TRELLO_TOKEN, name },
      });
      console.log(`Renamed attachment ${att.id} -> ${name}`);
    } catch (err: any) {
      console.error(`Failed to rename ${att.id}:`, err?.message || err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
