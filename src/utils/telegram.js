// utils/telegram.js
import TelegramBot from "node-telegram-bot-api";
import nodemailer from "nodemailer";

let bot = null;

export function initTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("⚠️ Telegram Bot Token not provided!");
    return;
  }
  bot = new TelegramBot(token, { polling: false });
  console.log("✅ Telegram bot initialized");
}

export async function sendNotification({ channel, userId, email, title, message }) {
  if (!message || message.trim() === "") return;

  if (channel === "telegram") {
    if (!bot) {
      console.error("⚠️ Telegram bot not initialized");
      return;
    }
    const chatId = process.env.TELEGRAM_CHAT_ID;
    try {
      await bot.sendMessage(chatId, message.trim(), { parse_mode: "HTML" });
      console.log("✅ Telegram message sent");
    } catch (err) {
      console.error("Telegram send error:", err.response?.body || err.message);
    }
  }

  if (channel === "email") {
    if (!email) return;
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: title,
        html: `<pre>${message}</pre>`,
      });
      console.log("✅ Email sent to", email);
    } catch (err) {
      console.error("Email send error:", err.message);
    }
  }

  if (channel === "in-app") {
    console.log(`📢 In-App Notification to ${userId}: ${title} - ${message}`);
  }
}
