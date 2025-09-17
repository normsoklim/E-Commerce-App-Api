import TelegramBot from "node-telegram-bot-api";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ------------------- TELEGRAM -------------------
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

export const sendTelegramNotification = async (message) => {
  try {
    if (!process.env.TELEGRAM_CHAT_ID) throw new Error("TELEGRAM_CHAT_ID not set");
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Telegram send error:", err);
  }
};

// ------------------- EMAIL -------------------
const transporter = nodemailer.createTransport({
  service: "gmail", // or another email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmailNotification = async ({ to, subject, text, html }) => {
  try {
    await transporter.sendMail({
      from: `"Your Shop" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("Email send error:", err);
  }
};

// ------------------- IN-APP -------------------
let inAppNotifications = {}; // in-memory store, for demo

export const sendInAppNotification = async ({ userId, title, message }) => {
  if (!inAppNotifications[userId]) inAppNotifications[userId] = [];
  inAppNotifications[userId].push({ title, message, read: false, createdAt: new Date() });
  console.log(`In-app notification sent to user ${userId}`);
};

// ------------------- UNIVERSAL HELPER -------------------
export const sendNotification = async ({ userId, channel, title, message, email }) => {
  switch (channel) {
    case "telegram":
      await sendTelegramNotification(message);
      break;
    case "email":
      if (!email) {
        console.error("Email not provided for email notification");
        break;
      }
      await sendEmailNotification({ to: email, subject: title, text: message });
      break;
    case "in-app":
      await sendInAppNotification({ userId, title, message });
      break;
    default:
      console.error("Unknown notification channel:", channel);
  }
};
