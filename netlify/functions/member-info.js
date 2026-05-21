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

    const query = `手機號碼 = "${phone}" and 是否有效 in ("Y")`;
    const url = `https://${process.env.KINTONE_DOMAIN}/k/v1/records.json?app=178&query=${encodeURIComponent(query)}`;

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

    const teamsText = record["代表球隊"]?.value || "";

    const teams = teamsText
      .split(/[、,，]/)
      .map(t => t.trim())
      .filter(Boolean);

    const app173Records = await fetchApp173Scores({
      phone,
      name: record["參賽者姓名"].value,
      teams
    });

    const scores = app173Records.filter(score => score.isCurrentMember);

    return response({
      ok: true,
      phone: record["手機號碼"].value,
      name: record["參賽者姓名"].value,
      teams,
      scores,
      app173Records
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

async function fetchApp173Scores(member) {
  const token =
    process.env.KINTONE_API_TOKEN_APP173 ||
    process.env.KINTONE_API_TOKEN ||
    process.env.KINTONE_API_TOKEN_APP178;

  if (!process.env.KINTONE_DOMAIN || !token) {
    return [];
  }

  const url = `https://${process.env.KINTONE_DOMAIN}/k/v1/records.json?app=173&query=${encodeURIComponent("order by $id desc limit 500")}`;

  const kintoneRes = await fetch(url, {
    method: "GET",
    headers: {
      "X-Cybozu-API-Token": token
    }
  });

  const data = await kintoneRes.json();

  if (!kintoneRes.ok || !Array.isArray(data.records)) {
    console.log("App173查詢失敗:", JSON.stringify(data));
    return [];
  }

  return data.records
    .map(record => {
      const score = normalizeScoreRecord(record);
      const samePhone = score.phone && score.phone === member.phone;
      const sameName = score.name && score.name === member.name;

      return {
        ...score,
        isCurrentMember: Boolean(samePhone || sameName)
      };
    })
    .filter(score => score.name && score.team);
}

function normalizeScoreRecord(record) {
  return {
    phone: digits(getValue(record, ["手機號碼", "電話", "手機", "Phone", "phone"])),
    name: String(getValue(record, ["參賽者姓名", "姓名", "會員姓名", "選手姓名", "Name", "name"]) || "").trim(),
    team: String(getValue(record, ["代表球隊", "球隊", "隊伍", "Team", "team"]) || "").trim(),
    totalScore: numberValue(getValue(record, ["總積分", "積分", "總分", "TotalScore", "score"])),
    matches: numberValue(getValue(record, ["出賽場次", "總場次", "場次", "Matches", "matches"]))
  };
}

function getValue(record, fieldCodes) {
  for (const fieldCode of fieldCodes) {
    if (record[fieldCode]?.value !== undefined) {
      return record[fieldCode].value;
    }
  }

  return "";
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function numberValue(value) {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function response(body) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
