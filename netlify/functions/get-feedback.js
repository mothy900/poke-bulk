const fetch = global.fetch;

const SITE_ID = process.env.NETLIFY_SITE_ID;
const ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
const FORM_NAME = process.env.NETLIFY_FORM_NAME || "feedback";


function safeJSONParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, body: "" };
  }

  if (!SITE_ID || !ACCESS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "NETLIFY_SITE_ID 및 NETLIFY_ACCESS_TOKEN 환경 변수가 필요합니다.",
      }),
    };
  }

  try {
    const headers = {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    };

    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/forms`,
      { headers }
    );
    if (!formsRes.ok) {
      throw new Error(`Forms API 호출 실패: ${formsRes.status}`);
    }
    const forms = await formsRes.json();
    const targetForm = forms.find((form) => form.name === FORM_NAME);
    if (!targetForm) {
      return {
        statusCode: 404,
        body: JSON.stringify({ ok: false, error: `폼 ${FORM_NAME} 을 찾을 수 없습니다.` }),
      };
    }

    const submissionsRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${targetForm.id}/submissions`,
      { headers }
    );
    if (!submissionsRes.ok) {
      throw new Error(`Submissions API 호출 실패: ${submissionsRes.status}`);
    }
    const submissions = await submissionsRes.json();

    const payload = submissions.map((submission) => {
      const data = submission.data || {};
      return {
        id: submission.id,
        title: submission.title || data.title || "(제목 없음)",
        content: submission.content || data.content || "",
        nickname: submission.nickname || data.nickname || "익명",
        createdAt: submission.created_at,
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: error.message }),
    };
  }
};
