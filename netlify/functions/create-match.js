exports.handler = async function(event) {

  const DOMAIN = 'https://dekt.cybozu.com';

  // App171 選手資料庫
  const MEMBER_APP_ID = '171';

  // App170 區域聯賽
  const MATCH_APP_ID = '170';

  // API TOKEN
  const MEMBER_API_TOKEN = 'v3A8Y35TO1M7hh2KPcHHK1s8xUFZjS8tDs1BEIFj';
  const MATCH_API_TOKEN = '26RM9maYPix3AtAHjWe46JZ6bBHCdxqxKzfUOc5x';

  try {

    const body = JSON.parse(event.body);

    // =========================
    // 前端傳入資料
    // =========================

    const {
      matchDate,
      location,
      status,

      scoreA,
      scoreB,

      a1Phone,
      a2Phone,
      b1Phone,
      b2Phone

    } = body;

    // =========================
    // 查會員
    // =========================

    async function getMember(phone){

      const query =
        '參賽者手機 = "' + phone + '"';

      const url =
        DOMAIN +
        '/k/v1/records.json?app=' +
        MEMBER_APP_ID +
        '&query=' +
        encodeURIComponent(query);

      const response = await fetch(url, {
        method:'GET',
        headers:{
          'X-Cybozu-API-Token': MEMBER_API_TOKEN
        }
      });

      const data = await response.json();

      if(
        !data.records ||
        data.records.length === 0
      ){
        return null;
      }

      return data.records[0];
    }

    // =========================
    // 抓四位參賽者
    // =========================

    const a1 = await getMember(a1Phone);
    const a2 = await getMember(a2Phone);
    const b1 = await getMember(b1Phone);
    const b2 = await getMember(b2Phone);

    if(!a1 || !a2 || !b1 || !b2){

      return {
        statusCode:400,
        body:JSON.stringify({
          success:false,
          message:'找不到參賽者資料'
        })
      };

    }

    // =========================
    // 年齡驗證
    // =========================

    const aAge =
      Number(a1['年齡'].value || 0) +
      Number(a2['年齡'].value || 0);

    const bAge =
      Number(b1['年齡'].value || 0) +
      Number(b2['年齡'].value || 0);

    if(aAge < 100){

      return {
        statusCode:400,
        body:JSON.stringify({
          success:false,
          message:'A隊年齡總和不足100'
        })
      };

    }

    if(bAge < 100){

      return {
        statusCode:400,
        body:JSON.stringify({
          success:false,
          message:'B隊年齡總和不足100'
        })
      };

    }

    // =========================
    // 建立 App170 記錄
    // =========================

    const record = {

      '比賽日期時間': {
        value: matchDate
      },

      '比賽場地': {
        value: location
      },

      '積分狀態': {
        value: status || '未開打'
      },

      'A隊比數': {
        value: scoreA || ''
      },

      'B隊比數': {
        value: scoreB || ''
      },

      // =====================
      // A隊
      // =====================

      '手機號碼_驗證用': {
        value: a1Phone
      },

      '參賽者姓名': {
        value: a1['參賽者姓名'].value
      },

      '年齡': {
        value: a1['年齡'].value
      },

      '代表球隊': {
        value: a1['代表球隊'].value
      },

      '手機號碼_驗證用_參賽者2': {
        value: a2Phone
      },

      '參賽者姓名_參賽者2': {
        value: a2['參賽者姓名'].value
      },

      '年齡_參賽者2': {
        value: a2['年齡'].value
      },

      '代表球隊_參賽者2': {
        value: a2['代表球隊'].value
      },

      // =====================
      // B隊
      // =====================

      '手機號碼_驗證用_B隊': {
        value: b1Phone
      },

      '參賽者姓名_B隊': {
        value: b1['參賽者姓名'].value
      },

      '年齡_B隊': {
        value: b1['年齡'].value
      },

      '代表球隊_B隊': {
        value: b1['代表球隊'].value
      },

      '手機號碼_驗證用_B隊2': {
        value: b2Phone
      },

      '參賽者姓名_B隊2': {
        value: b2['參賽者姓名'].value
      },

      '年齡_B隊2': {
        value: b2['年齡'].value
      },

      '代表球隊_B隊2': {
        value: b2['代表球隊'].value
      }

    };

    const createUrl =
      DOMAIN +
      '/k/v1/record.json';

    const createResponse = await fetch(createUrl, {

      method:'POST',

      headers:{
        'Content-Type':'application/json',
        'X-Cybozu-API-Token': MATCH_API_TOKEN
      },

      body:JSON.stringify({

        app: MATCH_APP_ID,

        record: record

      })

    });

    const result =
      await createResponse.json();

    return {

      statusCode:200,

      body:JSON.stringify({

        success:true,

        result

      })

    };

  } catch(e){

    return {

      statusCode:500,

      body:JSON.stringify({

        success:false,

        error:String(e)

      })

    };

  }

};
