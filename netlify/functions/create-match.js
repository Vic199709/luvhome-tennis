exports.handler = async (event) => {

  try{

    const data =
      JSON.parse(event.body || '{}');

    return {

      statusCode:200,

      headers:{
        'Content-Type':'application/json'
      },

      body:JSON.stringify({

        success:true,
        message:'比賽建立成功',
        data

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
        message:error.message

      })

    };

  }

};
