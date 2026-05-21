exports.handler = async function (event) {
  try {

    const phone = (event.queryStringParameters.phone || "")
      .replace(/\D/g, "");

    if (!phone) {
      return response({
        ok: false,
        message: "請輸入手機號碼"
      });
    }

    const APP_ID = 178;

    const query =
      `手機號碼 = "${phone}" and 是否有效 = "Y"`;

    const url =
      `https://${process.env.KINTONE_DOMAIN}/k/v1/records.json` +
      `?app=${APP_ID}&query=${encodeURIComponent(query)}`;


    console.log("Kintone token:", process.env.KINTONE_API_TOKEN_APP178);
    
    const kintoneRes = await fetch(url, {
      method: "GET",
      headers: {
        "X-Cybozu-API-Token":
          process.env.KINTONE_API_TOKEN_APP178
      }
    });

    const data = await kintoneRes.json();

    console.log("Kintone回傳:", JSON.stringify(data));

    if (!data.records || data.records.length === 0) {
      return response({
        ok: false,
        message: "查無會員資料，請確認手機號碼"
      });
    }

    const record = data.records[0];

    const teamsText =
      record["代表球隊"]?.value || "";

    const teams = teamsText
      .split(/[、,，]/)
      .map(t => t.trim())
      .filter(Boolean);

    return response({
      ok: true,
      phone: record["手機號碼"].value,
      name: record["參賽者姓名"].value,
      teams
    });

  } catch (error) {

    console.error(error);

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
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
