// api/sendEssay.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const eventType = body.eventType || "submission";

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res
        .status(500)
        .json({ ok: false, error: "Telegram env vars missing" });
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    let text;

    if (eventType === "violation") {
      const {
        studentName,
        studentGroup,
        elapsedMinutes,
        violation = {},
      } = body;

      const name = studentName ? escapeMarkdown(studentName) : "Unknown";
      const group = studentGroup ? escapeMarkdown(studentGroup) : "Unknown";

      text =
        `⚠️ *IELTS Writing Test – Violation*\n` +
        `Student: *${name}*\n` +
        `Group: *${group}*\n` +
        `Elapsed time: *${elapsedMinutes ?? 0}* minute(s)\n\n` +
        `Type: *${escapeMarkdown(violation.type || "unknown")}*\n` +
        `Message: ${escapeMarkdown(violation.message || "")}\n` +
        (violation.timestamp
          ? `Time: ${escapeMarkdown(violation.timestamp)}\n`
          : "") +
        (violation.totalViolationsNow !== undefined
          ? `Total violations now: *${violation.totalViolationsNow}*`
          : "");
    } else {
      // SUBMISSION
      const {
        studentName,
        studentGroup,
        task1,
        task2,
        usedMinutes,
        remainingMinutes,
        totalViolations,
        violationsLog,
      } = body;

      const name = studentName ? escapeMarkdown(studentName) : "Unknown";
      const group = studentGroup ? escapeMarkdown(studentGroup) : "Unknown";

      const t1Question = task1?.question || "";
      const t1Answer = task1?.answer || "";
      const t1Words = task1?.wordCount ?? 0;

      const t2Question = task2?.question || "";
      const t2Answer = task2?.answer || "";
      const t2Words = task2?.wordCount ?? 0;

      let violationsPart = "";
      if (Array.isArray(violationsLog) && violationsLog.length > 0) {
        const mapped = violationsLog
          .slice(0, 10) // avoid too long messages
          .map((v, i) => {
            const t = v.timestamp ? ` [${v.timestamp}]` : "";
            return `${i + 1}. ${v.type || "unknown"}${t} – ${
              v.message || ""
            }`;
          })
          .join("\n");
        violationsPart =
          `\n\n*Violations (${totalViolations ?? 0}):*\n` +
          escapeMarkdown(mapped);
      }

      text =
        `✍️ *IELTS Writing Submission*\n` +
        `Student: *${name}*\n` +
        `Group: *${group}*\n` +
        `Time used: *${usedMinutes ?? 0}* minute(s)\n` +
        `Time left: *${remainingMinutes ?? 0}* minute(s)\n` +
        `Total violations: *${totalViolations ?? 0}*` +
        `\n\n*Task 1 Question:*\n${escapeMarkdown(t1Question)}\n\n` +
        `*Task 1 Answer* (words: ${t1Words}):\n${escapeMarkdown(t1Answer)}\n\n` +
        `*Task 2 Question:*\n${escapeMarkdown(t2Question)}\n\n` +
        `*Task 2 Answer* (words: ${t2Words}):\n${escapeMarkdown(
          t2Answer
        )}${violationsPart}`;
    }

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
