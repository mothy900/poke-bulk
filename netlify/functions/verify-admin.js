const ADMIN_SECRET = process.env.VITE_ADMIN_SECRET ?? "";

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Method Not Allowed" }),
    };
  }

  if (!ADMIN_SECRET) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, protected: false }),
    };
  }

  let providedSecret = "";

  try {
    const parsed = JSON.parse(event.body ?? "{}");
    providedSecret = (parsed.secret ?? "").toString();
  } catch (error) {
    console.error("관리자 비밀 키 파싱 오류", error);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
    };
  }

  if (providedSecret && providedSecret === ADMIN_SECRET) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, protected: true }),
    };
  }

  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: false, protected: true, error: "Unauthorized" }),
  };
};
