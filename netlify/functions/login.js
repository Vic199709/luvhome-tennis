exports.handler = async (event) => {
  const DOMAIN = 'https://dekt.cybozu.com';

  const MEMBER_APP_ID = '178';
  const MATCH_APP_ID = '170';

  const MEMBER_API_TOKEN = 'kRuyhs6vF5Z9cQPzBg2LyDQXhYPdGFs3nVLhaLGH';
  const MATCH_API_TOKEN = '26RM9maYPix3AtAHjWe46JZ6bBHCdxqxKzfUOc5x';

  try {
    const phone = String(event.queryStringParameters?.phone || '')
      .replace(/\D/g, '')
      .trim();

    if (!phone) {
      return json({
        success: false,
        message: '未輸入手機號碼'
      });
    }

    const memberQuery = `手機號碼 = "${phone}" and 是否有效 = "Y"`;

    const memberUrl =
      DOMAIN +
      '/k/v1/records.json?app=' +
      MEMBER_APP_ID +
      '&query=' +
      encodeURIComponent(memberQuery);

    const memberResponse = await fetch(memberUrl, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': MEMBER_API_TOKEN
      }
    });

    const memberData = await memberResponse.json();

    if (!memberResponse.ok) {
      return json({
        success: false,
        message: 'App178 查詢失敗',
        detail: memberData
      }, 500);
    }

    if (!memberData.records || memberData.records.length === 0) {
      return json({
        success: false,
        message: '查無會員'
      });
    }

    const r = memberData.records[0];

    const teamText = String(r['代表球隊']?.value || '');

    const teams = teamText
      .replace(/,/g, '、')
      .replace(/，/g, '、')
      .split('、')
      .map(t => t.trim())
      .filter(Boolean);

    const member = {
      phone: r['手機號碼']?.value || '',
      name: r['參賽者姓名']?.value || '',
      teams: teams,
      valid: r['是否有效']?.value || ''
    };

    const matchUrl =
      DOMAIN +
      '/k/v1/records.json?app=' +
      MATCH_APP_ID +
      '&query=' +
      encodeURIComponent('order by $id desc limit 500');

    const matchResponse = await fetch(matchUrl, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': MATCH_API_TOKEN
      }
    });

    const matchData = await matchResponse.json();

    return json({
      success: true,
      member: member,
      records: memberData.records,
      matches: matchData.records || []
    });

  } catch (error) {
    return json({
      success: false,
      message: 'login function error',
      error: error.message
    }, 500);
  }
};

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}
