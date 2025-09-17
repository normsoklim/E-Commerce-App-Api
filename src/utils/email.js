// utils/email.js
import nodemailer from "nodemailer";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

export async function sendEmail(userId, subject, text) {
  const user = await User.findById(userId);
  if (!user || !user.email) return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject,
    text,
  });

  console.log("Email sent to", user.email);
}
