exports.handler = async (event) => {
  const DOMAIN = 'https://dekt.cybozu.com';
  const APP_ID = '178';
  const API_TOKEN = 'kRuyhs6vF5Z9cQPzBg2LyDQXhYPdGFs3nVLhaLGH';

  try {
    const phone = String(event.queryStringParameters?.phone || '')
      .replace(/\D/g, '')
      .trim();

    const query = `手機號碼 = "${phone}" and 是否有效 = "Y"`;

    const url =
      DOMAIN +
      '/k/v1/records.json?app=' +
      APP_ID +
      '&query=' +
      encodeURIComponent(query);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': API_TOKEN
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return json({
        success: false,
        message: 'App178查詢失敗',
        detail: data
      });
    }

    if (!data.records || data.records.length === 0) {
      return json({
        success: false,
        message: '查無會員',
        records: []
      });
    }

    const r = data.records[0];

    const teamText = String(r['代表球隊']?.value || '');

    const teams = teamText
      .replace(/,/g, '、')
      .replace(/，/g, '、')
      .split('、')
      .map(t => t.trim())
      .filter(Boolean);

    const member = {
      phone: r['手機號碼']?.value || '',
      name: r['參賽者姓名']?.value || '',
      teams: teams,
      valid: r['是否有效']?.value || ''
    };

    return json({
      success: true,
      member: member,
      records: data.records,
      matches: []
    });

  } catch (error) {
    return json({
      success: false,
      message: 'login function error',
      error: error.message
    });
  }
};

function json(body) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}
