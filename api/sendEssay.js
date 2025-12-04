// api/sendEssay.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      mode,
      question,
      essay,
      wordCount,
      usedMinutes,
      studentName,
    } = req.body || {};

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res
        .status(500)
        .json({ ok: false, error: "Telegram env vars missing" });
    }

    const modeLabel = mode === "task1" ? "Task 1" : "Task 2";

    const header = studentName
      ? `✍️ New IELTS writing from *${escapeMarkdown(studentName)}*\n`
      : "✍️ New IELTS writing submission\n";

    const text =
      header +
      `Mode: *${modeLabel}*\n` +
      `Word count: *${wordCount}*\n` +
      `Time used: *${usedMinutes}* minutes\n\n` +
      `*Question:*\n${escapeMarkdown(question)}\n\n` +
      `*Essay:*\n${escapeMarkdown(essay)}`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const tgRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    const tgJson = await tgRes.json();

    if (!tgRes.ok || !tgJson.ok) {
      return res
        .status(500)
        .json({ ok: false, error: "Telegram error", detail: tgJson });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("sendEssay error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Internal server error" });
  }
}

function escapeMarkdown(text = "") {
  // basic Markdown V1 escaping for Telegram
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
