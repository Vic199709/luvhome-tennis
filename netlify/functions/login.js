exports.handler = async function(event) {

  const DOMAIN = 'https://dekt.cybozu.com';
  const APP_ID = '178';

  const API_TOKEN = 'kRuyhs6vF579cQPzBg2LyDQXhYPdGFs3nVLhaLGH';

  const phone = event.queryStringParameters.phone;

  try {

    const query =
      '手機號碼 = "' + phone + '" and 是否有效 = "Y"';

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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: data.records.length > 0,
        data: data.records
      })
    };

  } catch (error) {

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.toString()
      })
    };

  }

};
