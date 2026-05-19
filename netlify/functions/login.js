exports.handler = async function(event) {
  const DOMAIN = 'https://dekt.cybozu.com';

  const MEMBER_APP_ID = '178';
  const MATCH_APP_ID = '170';

  const APP178_API_TOKEN = '貼上App178的API_TOKEN';
  const APP170_API_TOKEN = '貼上App170的API_TOKEN';

  const phone = event.queryStringParameters.phone || '';

  async function getRecords(appId, token, query) {
    const url =
      DOMAIN +
      '/k/v1/records.json?app=' +
      appId +
      '&query=' +
      encodeURIComponent(query);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': token
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Kintone API error');
    }

    return data.records || [];
  }

  try {
    const memberRecords = await getRecords(
      MEMBER_APP_ID,
      APP178_API_TOKEN,
      '手機號碼 = "' + phone + '"'
    );

    if (memberRecords.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          records: [],
          matches: []
        })
      };
    }

    const matchRecords = await getRecords(
      MATCH_APP_ID,
      APP170_API_TOKEN,
      'limit 500'
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        records: memberRecords,
        matches: matchRecords
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        records: [],
        matches: []
      })
    };
  }
};
