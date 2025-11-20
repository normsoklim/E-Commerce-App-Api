// utils/email.js
import nodemailer from "nodemailer";
import { google } from "googleapis";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

export async function sendEmail(email, subject, text) {
  // Add debug logs for email sending
  console.log("=== EMAIL DEBUG ===");
  console.log("Email recipient:", email);
  console.log("Subject:", subject);
  console.log("Text content:", text);
  let transporter;

  // For Gmail OAuth2 authentication
  if (process.env.EMAIL_SERVICE === 'gmail' && process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    console.log("Using Gmail OAuth2 for email delivery...");
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
    
    try {
      const accessToken = await oauth2Client.getAccessToken();
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL_USER || process.env.EMAIL_FROM,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN,
          accessToken: accessToken.token
        }
      });
    } catch (error) {
      console.error("OAuth2 authentication error:", error);
      throw new Error("Failed to authenticate with Gmail OAuth2");
    }
  }

  // Check if production email environment variables are set
  if (process.env.EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY) {
    // Use SendGrid SMTP
    console.log("Using SendGrid for email delivery...");
    transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  } else if (process.env.EMAIL_SERVICE === 'outlook' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Use Outlook/Hotmail SMTP
    console.log("Using Outlook for email delivery...");
    transporter = nodemailer.createTransport({
      host: "smtp-mail.outlook.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else if (process.env.EMAIL_SERVICE === 'yahoo' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Use Yahoo SMTP
    console.log("Using Yahoo for email delivery...");
    transporter = nodemailer.createTransport({
      host: "smtp.mail.yahoo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else if (process.env.EMAIL_SERVICE === 'gmail' && process.env.EMAIL_USER) {
    // Use Gmail SMTP with App Password (simpler approach)
    console.log("Using Gmail with App Password for email delivery...");
    
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use app password for Gmail
      },
    });
  } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.SMTP_HOST) {
    // Use custom SMTP configuration
    console.log(`Using custom SMTP for email delivery (${process.env.SMTP_HOST})...`);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // Convert string to boolean
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else if (process.env.MAIL_HOST && process.env.MAIL_PORT && process.env.MAIL_USER && process.env.MAIL_PASS) {
    // Use Mailtrap for testing
    console.log("Using Mailtrap for email delivery testing...");
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  } else {
    // For development/testing, use Ethereal.email
    console.log("Using Ethereal.email for testing...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  // Define mail options
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "Ethereal Test Account",
    to: email,
    subject: subject,
    text: text,
  };

  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent to", email);
    if (transporter.options.host === "smtp.ethereal.email") {
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
}
