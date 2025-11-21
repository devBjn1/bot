// index.js – GIẢI PHÁP #1 TỐT NHẤT CHO LEAPCELL 2025 (Telegraf + Webhook + Keep-alive)
require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");

const getHelpMessage = require("./command/HelpMessage");
const { createTask } = require("./command/CreateTask");
const onPhotoCommandHandler = require("./command/PhotoCommand");

// =================== KHỞI TẠO BOT ===================
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// =================== ĐĂNG KÝ LỆNH ===================
const slashCommands = [
  {
    command: "/help",
    description: "Xem hướng dẫn sử dụng",
    handler: getHelpMessage,
  },
  {
    command: "/start",
    description: "Bắt đầu sử dụng bot",
    handler: getHelpMessage,
  },
  { command: "/create", description: "Tạo task thủ công", handler: createTask },
];

// Đặt danh sách lệnh cho bot (hiện trong menu Telegram)
bot.telegram.setMyCommands(
  slashCommands.map((c) => ({
    command: c.command.replace("/", ""),
    description: c.description,
  }))
);

// Đăng ký handler cho từng lệnh
slashCommands.forEach(({ command, handler }) => {
  bot.command(command.replace("/", ""), handler);
});

// Xử lý khi người dùng gửi ảnh → tự động tạo task Trello
bot.on("photo", onPhotoCommandHandler);

// Lệnh test nhanh (tùy chọn)
bot.start((ctx) => ctx.reply("Bot đã sẵn sàng! Gửi ảnh để tạo task Trello"));
bot.help((ctx) =>
  ctx.reply("Gửi ảnh → tự động tạo card Trello\nDùng /create để tạo thủ công")
);

// =================== EXPRESS SERVER ===================
const app = express();
app.use(express.json());

// Webhook route – CHỈ 1 DÒNG DUY NHẤT (siêu gọn, siêu mạnh!)
// app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
//   bot.handleUpdate(req.body, res); // hoặc dùng: bot.webhookCallback(req, res)
// });

app.use(bot.webhookCallback(`/bot${process.env.TELEGRAM_BOT_TOKEN}`));

// Health check + để UptimeRobot ping
app.get("/", (req, res) => {
  res.send(`Bot đang chạy mượt mà – ${new Date().toLocaleString("vi-VN")}`);
});

// =================== KHỞI ĐỘNG ===================
const PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
  const url = `${process.env.SERVICE_DOMAIN}/bot${process.env.TELEGRAM_BOT_TOKEN}`;

  console.log(`Server chạy trên port ${PORT}`);
  console.log(`Webhook URL: ${url}`);

  // Tự động set webhook sau mỗi lần deploy
  try {
    await bot.telegram.setWebhook(url);
    console.log("Webhook đã được set thành công!");
  } catch (err) {
    console.error("Lỗi set webhook:", err.message);
  }
});
