exports.handler = async (event) => {
  const APP_ID = '171';
  const API_TOKEN = 'v3A8Y35TO1M7hh2KPcHHK1s8xUFZjS8tDs1BEIFj';
  const DOMAIN = 'https://dekt.cybozu.com';

  try {
    const phone = String(event.queryStringParameters?.phone || '')
      .replace(/\D/g, '')
      .trim();

    const response = await fetch(
      DOMAIN + '/k/v1/records.json?app=' + APP_ID + '&query=' + encodeURIComponent('order by $id desc limit 500'),
      {
        method: 'GET',
        headers: {
          'X-Cybozu-API-Token': API_TOKEN
        }
      }
    );

    const data = await response.json();
    const records = data.records || [];

    const record = records.find(r => {
      const p = String(r['參賽者手機']?.value || '')
        .replace(/\D/g, '')
        .trim();

      return p === phone;
    });

    if (!record) {
      return json({
        success: false,
        message: '查無會員',
        inputPhone: phone,
        totalRecords: records.length
      });
    }

    const teams = Array.isArray(record['代表球隊']?.value)
      ? record['代表球隊'].value
      : [];

    return json({
      success: true,
      member: {
        phone: record['參賽者手機']?.value || '',
        name: record['參賽者姓名']?.value || '',
        age: record['驗證年齡']?.value || '',
        teams: teams,
        team: teams.join('、')
      }
    });

  } catch (error) {
    return json({
      success: false,
      message: 'member-info error',
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
