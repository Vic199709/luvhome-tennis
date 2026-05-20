exports.handler = async (event) => {

  const DOMAIN =
    'https://dekt.cybozu.com';

  const APP_ID =
    '171';

  const API_TOKEN =
    '26RM9maYPix3AtAHjWe46JZ6bBHCdxqxKzfUOc5x';

  try{

    const phone =
      String(
        event.queryStringParameters?.phone || ''
      )
      .replace(/\D/g,'')
      .trim();

    if(!phone){

      return json({
        success:false,
        message:'未輸入手機號碼'
      });

    }

    const url =
      DOMAIN +
      '/k/v1/records.json?app=' +
      APP_ID +
      '&query=' +
      encodeURIComponent(
        `手機號碼 = "${phone}"`
      );

    const response =
      await fetch(url,{

        method:'GET',

        headers:{
          'X-Cybozu-API-Token':API_TOKEN
        }

      });

    const data =
      await response.json();

    if(!response.ok){

      return json({

        success:false,
        message:'App171查詢失敗',
        detail:data

      });

    }

    const records =
      data.records || [];

    if(records.length === 0){

      return json({

        success:false,
        message:'查無選手'

      });

    }

    const r =
      records[0];

    const teamText =
      String(
        r['代表球隊']?.value || ''
      );

    const teams =
      teamText
      .replace(/,/g,'、')
      .replace(/，/g,'、')
      .split('、')
      .map(t => t.trim())
      .filter(Boolean);

    const age =

      r['年齡']?.value ||

      r['驗證年齡']?.value ||

      r['年齡_數值']?.value ||

      '';

    const member = {

      phone:
        r['手機號碼']?.value || '',

      name:
        r['參賽者姓名']?.value || '',

      age:
        age,

      teams:
        teams

    };

    return json({

      success:true,
      member

    });

  }catch(error){

    return json({

      success:false,
      message:'member-info function error',
      error:error.message

    });

  }

};

function json(body){

  return {

    statusCode:200,

    headers:{
      'Content-Type':'application/json'
    },

    body:JSON.stringify(body)

  };

}
