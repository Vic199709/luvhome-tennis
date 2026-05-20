exports.handler = async (event) => {
  const DOMAIN = 'https://dekt.cybozu.com';
  const APP_ID = '178';
  const API_TOKEN = 'kRuyhs6vF5Z9cQPzBg2LyDQXhYPdGFs3nVLhaLGH';

  try {
    const phone = String(event.queryStringParameters?.phone || '')
      .replace(/\D/g, '')
      .trim();

    if (!phone) {
      return json({
        success: false,
        message: '未輸入手機號碼'
      });
    }

    const url =
      DOMAIN +
      '/k/v1/records.json?app=' +
      APP_ID +
      '&query=' +
      encodeURIComponent('order by $id desc limit 500');

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

    const records = data.records || [];

    const record = records.find(r => {
      const recordPhone = String(r['手機號碼']?.value || '')
        .replace(/\D/g, '')
        .trim();

      return recordPhone === phone;
    });

    if (!record) {
      return json({
        success: false,
        message: '查無會員',
        inputPhone: phone,
        totalRecords: records.length
      });
    }

    const isValid = String(record['是否有效']?.value || '').trim();

    if (isValid && isValid !== 'Y') {
      return json({
        success: false,
        message: '會員尚未啟用'
      });
    }

    const teamText = String(record['代表球隊']?.value || '');

    const teams = teamText
      .replace(/,/g, '、')
      .replace(/，/g, '、')
      .split('、')
      .map(t => t.trim())
      .filter(Boolean);

    const member = {
      phone: record['手機號碼']?.value || '',
      name: record['參賽者姓名']?.value || '',
      teams: teams,
      valid: isValid
    };

    return json({
      success: true,
      member: member,
      records: [record],
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
