exports.handler = async function(event) {

  const DOMAIN = 'https://dekt.cybozu.com';
  const APP_ID = '178';
  const API_TOKEN = 'kRuyhs6vF579cQPzBg2LyDQXhYPdGFs3nVLhaLGH';

  const phone = event.queryStringParameters.phone || '';

  if (!phone) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [],
        error: '缺少手機號碼'
      })
    };
  }

  const query =
    '手機號碼 = "' + phone + '" and 是否有效 = "Y"';

  const url =
    DOMAIN +
    '/k/v1/records.json?app=' +
    APP_ID +
    '&query=' +
    encodeURIComponent(query);

  try {

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': API_TOKEN
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [],
          error: data.message || 'Kintone API 錯誤',
          detail: data
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: data.records || []
      })
    };

  } catch (error) {

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [],
        error: error.toString()
      })
    };

  }

};
