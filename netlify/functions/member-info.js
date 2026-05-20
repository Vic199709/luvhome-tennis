exports.handler = async function (event) {
  try {
    const phone = (event.queryStringParameters.phone || "").replace(/\D/g, "");

    if (!phone) {
      return response({
        ok: false,
        message: "請輸入手機號碼"
      });
    }

    const KINTONE_DOMAIN = process.env.KINTONE_DOMAIN;
    const KINTONE_API_TOKEN = process.env.KINTONE_API_TOKEN_APP178;
    const APP_ID = 178;

    const query = `手機號碼 = "${phone}" and 是否有效 = "Y"`;

    const url =
      `https://${KINTONE_DOMAIN}/k/v1/records.json` +
      `?app=${APP_ID}&query=${encodeURIComponent(query)}`;

    const kintoneRes = await fetch(url, {
      method: "GET",
      headers: {
        "X-Cybozu-API-Token": KINTONE_API_TOKEN
      }
    });

    const data = await kintoneRes.json();

    if (!data.records || data.records.length === 0) {
      return response({
        ok: false,
        message: "查無會員資料，請確認手機號碼"
      });
    }

    const record = data.records[0];

    const teamsText = record["代表球隊"].value || "";

    const teams = teamsText
      .split(/[、,，・\s]+/)
      .map(t => t.trim())
      .filter(Boolean);

    return response({
      ok: true,
      phone: record["手機號碼"].value,
      name: record["參賽者姓名"].value,
      teams
    });

  } catch (error) {
    return response({
      ok: false,
      message: "系統查詢失敗，請稍後再試",
      error: error.message
    });
  }
};

function response(body) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
}
