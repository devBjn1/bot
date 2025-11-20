# Bug Detection Telegram Bot

Automatically detects and logs app bugs from images posted in Telegram groups using AI vision.

## Features

- 🤖 **AI-Powered Detection**: Uses OpenAI GPT-4 Vision to analyze screenshots
- 📸 **Auto Bug Detection**: Identifies error messages, crashes, UI issues, and more
- 📊 **Smart Filtering**: Only logs images with 60%+ confidence of being bugs
- 🔔 **Automatic Logging**: Sends bug reports to designated group with details

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
BUG_LOG_GROUP_ID=your_group_id_here
```

**How to get these values:**

- **TELEGRAM_BOT_TOKEN**: Get from [@BotFather](https://t.me/botfather) on Telegram
- **OPENAI_API_KEY**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **BUG_LOG_GROUP_ID**:
  1. Add your bot to a group
  2. Send a message to the group
  3. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
  4. Look for `"chat":{"id":-1001234567890}` in the response

### 3. Add Bot to Your Groups

1. Add the bot to the group where users will post bug screenshots
2. Add the bot to the bug logging group
3. Make sure the bot has permission to read messages and send photos

### 4. Run the Bot

```bash
node index.js
```

## How It Works

1. **User sends image** to any group where the bot is present
2. **AI analyzes** the image for bug indicators:
   - Error messages or crash screens
   - UI glitches or broken layouts
   - Console errors or stack traces
   - Network errors
   - Performance issues
3. **If bug detected** (confidence > 60%):
   - Sends detailed report to bug log group
   - Includes screenshot, user info, and bug description
4. **If not a bug** (memes, random photos):
   - Silently skips the image

## Bug Types Detected

- ✅ Error messages
- ✅ Crash screens
- ✅ UI/Layout issues
- ✅ Network errors
- ✅ Performance problems
- ✅ Console errors
- ✅ Stack traces

## Commands

- `/start` or `/help` - Show bot information

## Example Bug Report

```
🐞 BUG DETECTED (Confidence: 95%)

Type: error
From: @username (ID: 123456789)
Chat: QA Team
Time: 11/20/2025, 10:30:00 AM

Description:
The image shows a critical error screen with "Application has stopped"
message, indicating a crash in the app.

User Caption:
App crashes when I click the submit button
```

## Customization

### Adjust Confidence Threshold

In `index.js`, modify the confidence level:

```javascript
if (analysis.isBug && analysis.confidence > 60) {  // Change 60 to your preferred threshold
```

### Enable User Notifications

Uncomment these lines to notify users when bugs are logged:

```javascript
// await bot.sendMessage(chatId, "✅ Bug logged successfully! Thank you for reporting.", {
//   reply_to_message_id: msg.message_id,
// });
```

## Notes

- Requires OpenAI API credits (GPT-4 Vision)
- Bot must be admin or have read permissions in groups
- Processes only photo messages (not documents/files)
- Uses highest resolution version of photos

## Troubleshooting

**Bot not responding:**

- Check if bot token is correct
- Ensure bot is added to the group
- Verify bot has message reading permissions

**Images not being analyzed:**

- Check OpenAI API key is valid
- Ensure you have API credits
- Check console logs for errors

**Bug log group not receiving reports:**

- Verify BUG_LOG_GROUP_ID is correct (should be negative number)
- Ensure bot is member of the log group
- Check bot has permission to send photos

## License

ISC
