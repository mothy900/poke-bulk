const fetch = global.fetch;

const BOT_TOKEN = process.env.NETLIFY_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.NETLIFY_TELEGRAM_CHAT_ID;

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!BOT_TOKEN || !CHAT_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error:
          "NETLIFY_TELEGRAM_BOT_TOKEN 및 NETLIFY_TELEGRAM_CHAT_ID 환경변수가 필요합니다.",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body ?? "{}");
    const title = (body.title ?? "").toString().trim();
    const content = (body.content ?? "").toString().trim();
    const nickname = (body.nickname ?? "").toString().trim();

    const lines = [
      "📌 새 피드백 도착",
      `• 제목: ${title || "(제목 없음)"}`,
      "",
      content || "(내용 없음)",
      "",
      `• 작성자: ${nickname || "익명"}`,
    ];

    const text = lines.join("\n");

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
        }),
      }
    );

    if (!telegramRes.ok) {
      const errText = await telegramRes.text();
      throw new Error(`Telegram API 실패: ${telegramRes.status} / ${errText}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
};
