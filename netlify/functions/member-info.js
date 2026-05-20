exports.handler = async (event) => {
  const DOMAIN = 'https://dekt.cybozu.com';
  const APP_ID = '171';
  const API_TOKEN = 'v3A8Y35TO1M7hh2KPcHHK1s8xUFZjS8tDs1BEIFj';

  try {
    const phone = String(event.queryStringParameters?.phone || '')
      .replace(/\D/g, '')
      .trim();

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
        message: 'App171查詢失敗',
        detail: data
      });
    }

    const records = data.records || [];

    const record = records.find(r => {
      const phones = [
        r['參賽者手機']?.value,
        r['手機號碼']?.value,
        r['手機']?.value,
        r['聯絡電話']?.value
      ].map(v => String(v || '').replace(/\D/g, ''));

      return phones.includes(phone);
    });

    if (!record) {
      return json({
        success: false,
        message: '查無會員',
        inputPhone: phone,
        totalRecords: records.length,
        samplePhones: records.slice(0, 10).map(r => ({
          name: r['參賽者姓名']?.value || '',
          參賽者手機: r['參賽者手機']?.value || '',
          手機號碼: r['手機號碼']?.value || '',
          手機: r['手機']?.value || '',
          fields: Object.keys(r)
        }))
      });
    }

    const teamText = String(record['代表球隊']?.value || '');

    const teams = teamText
      .replace(/,/g, '、')
      .replace(/，/g, '、')
      .split('、')
      .map(t => t.trim())
      .filter(Boolean);

    return json({
      success: true,
      member: {
        phone:
          record['參賽者手機']?.value ||
          record['手機號碼']?.value ||
          record['手機']?.value ||
          '',
        name: record['參賽者姓名']?.value || '',
        age:
          record['年齡']?.value ||
          record['驗證年齡']?.value ||
          record['年齡_數值']?.value ||
          '',
        teams
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
