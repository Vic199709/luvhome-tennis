import { kintoneFetch, responseJson, responseOptions } from './shared.js';

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  if (event.httpMethod !== 'POST') {
    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const phone = body.phone ? body.phone.trim() : '';
    if (!phone) {
      return responseJson({ success: false, error: '請輸入手機號碼' }, 400);
    }

    // Query Kintone members app (App 191) for playerPhone matching the given phone number
    const encodedQuery = encodeURIComponent(`playerPhone = "${phone}"`);
    const data = await kintoneFetch('members', `/k/v1/records.json?app=191&query=${encodedQuery}`);

    if (!data.records || data.records.length === 0) {
      return responseJson({ success: false, error: '會員不存在。' });
    }

    const foundMember = data.records[0];
    return responseJson({ success: true, member: foundMember });
  } catch (error) {
    console.error('Error in login function:', error);
    return responseJson({ success: false, error: error.message }, 500);
  }
}
