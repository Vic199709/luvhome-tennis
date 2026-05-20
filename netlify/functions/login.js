exports.handler = async (event) => {

  try{

    const phone =
      (event.queryStringParameters.phone || '')
      .replace(/-/g,'')
      .trim();

    // ===== Kintone設定 =====

    const DOMAIN =
      'dekt.cybozu.com';

    const APP_ID =
      '178';

    const API_TOKEN =
      '你的App178_API_TOKEN';

    // =====================

    const query =
      encodeURIComponent(
        `手機號碼 = "${phone}"`
      );

    const response =
      await fetch(

        `https://${DOMAIN}/k/v1/records.json?app=${APP_ID}&query=${query}`,

        {

          method:'GET',

          headers:{
            'X-Cybozu-API-Token':API_TOKEN
          }

        }

      );

    const data =
      await response.json();

    if(
      !data.records ||
      data.records.length === 0
    ){

      return {

        statusCode:200,

        headers:{
          'Content-Type':'application/json'
        },

        body:JSON.stringify({

          success:false

        })

      };

    }

    const r =
      data.records[0];

    const member = {

      phone:
        r['手機號碼']?.value || '',

      name:
        r['參賽者姓名']?.value || '',

      teams:
        (r['代表球隊']?.value || '')
        .replace(/,/g,'、')
        .replace(/，/g,'、')
        .split('、')
        .map(t => t.trim())
        .filter(Boolean),

      valid:
        r['是否有效']?.value || ''

    };

    return {

      statusCode:200,

      headers:{
        'Content-Type':'application/json'
      },

      body:JSON.stringify({

        success:true,
        member

      })

    };

  }catch(error){

    return {

      statusCode:500,

      headers:{
        'Content-Type':'application/json'
      },

      body:JSON.stringify({

        success:false,
        error:error.message

      })

    };

  }

};
