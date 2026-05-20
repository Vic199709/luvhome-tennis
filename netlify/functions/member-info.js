exports.handler = async (event) => {

  const phone = event.queryStringParameters.phone;

  const APP_ID = '171';

  const API_TOKEN = '你的API_TOKEN';

  const SUBDOMAIN = 'dekt';

  try {

    const query = encodeURIComponent(`參賽者手機 = "${phone}"`);

    const response = await fetch(
      `https://${SUBDOMAIN}.cybozu.com/k/v1/records.json?app=${APP_ID}&query=${query}`,
      {
        method: 'GET',
        headers: {
          'X-Cybozu-API-Token': API_TOKEN
        }
      }
    );

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: '查無會員'
        })
      };
    }

    const record = data.records[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        member: {
          phone: record['參賽者手機']?.value || '',
          name: record['參賽者姓名']?.value || '',
          age: record['驗證年齡']?.value || '',
          team: Array.isArray(record['代表球隊']?.value)
            ? record['代表球隊'].value.join('、')
            : record['代表球隊']?.value || ''
        }
      })
    };

  } catch (error) {

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };

  }

};
