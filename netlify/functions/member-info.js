exports.handler = async (event) => {

  const phone = event.queryStringParameters.phone;

  const DOMAIN = 'dekt.cybozu.com';

  // App171：妝點家盃參賽選手資料庫
  const APP_ID = '171';

  // App171 API TOKEN
  const API_TOKEN = 'v3A8Y35TO1M7hh2KPcHHK1s8xUFZjS8tDs1BEIFj';

  try {

    const response = await fetch(
      `https://${DOMAIN}/k/v1/records.json?app=${APP_ID}&query=` +
      encodeURIComponent(`參賽者手機 = "${phone}"`),
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

          phone:
            record['參賽者手機']?.value || '',

          name:
            record['參賽者姓名']?.value || '',

          age:
            record['驗證年齡']?.value || '',

          teams:
            record['代表球隊']?.value || []

        }

      })
    };

  } catch (error) {

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error.message
      })
    };

  }

};
