exports.handler = async (event) => {

  try{

    const phone =
      (event.queryStringParameters.phone || '')
      .replace(/-/g,'')
      .trim();

    const members = [

      {
        phone:'0932028517',
        name:'陳志勇',
        age:61,
        teams:['國防','育友','錦和','綠寶石']
      },

      {
        phone:'0905768683',
        name:'王紹為',
        age:47,
        teams:['錦和']
      },

      {
        phone:'0970516416',
        name:'洪啟峰',
        age:45,
        teams:['育友']
      },

      {
        phone:'0987654321',
        name:'Lina',
        age:66,
        teams:['大墩']
      }

    ];

    const member =
      members.find(
        m => m.phone === phone
      );

    return {

      statusCode:200,

      headers:{
        'Content-Type':'application/json'
      },

      body:JSON.stringify({

        success:!!member,

        member:member || null

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
