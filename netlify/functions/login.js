exports.handler = async function(event) {

  const DOMAIN = 'https://dekt.cybozu.com';

  const API_TOKEN = 'kRuyhs6vF5Z9cQPzBg2LyDQXhYPdGFs3nVLhaLGH';

  const APP_ID = 178;

  const phone = event.queryStringParameters.phone || '';

  const query =
    encodeURIComponent(
      `手機號碼 = "${phone}" and 是否有效 = "Y"`
    );

  const url =
    `${DOMAIN}/k/v1/records.json?app=${APP_ID}&query=${query}`;

  try{

    const resp = await fetch(url,{
      headers:{
        'X-Cybozu-API-Token':API_TOKEN
      }
    });

    const data = await resp.json();

    return {
      statusCode:200,
      headers:{
        'Access-Control-Allow-Origin':'*'
      },
      body:JSON.stringify(data)
    };

  }catch(e){

    return {
      statusCode:500,
      body:JSON.stringify({
        error:e.toString()
      })
    };
  }
};