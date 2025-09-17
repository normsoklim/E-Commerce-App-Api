// src/routes/chatbot.js
import express from "express";
import OpenAI from "openai";

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { messages } = req.body;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    res.json(completion.choices[0].message);
  } catch (error) {
    console.error("Chatbot error:", error);

    if (error.status === 429) {
      return res.status(429).json({ error: "OpenAI quota exceeded. Please check your billing." });
    }

    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router; // ✅ FIXED
