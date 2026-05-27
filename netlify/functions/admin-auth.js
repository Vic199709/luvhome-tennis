import { responseJson, responseOptions } from './shared.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '89451386'; // 德克統編

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return responseOptions();
  if (event.httpMethod !== 'POST') return responseJson({ error: 'Method not allowed' }, 405);

  try {
    const body = JSON.parse(event.body || '{}');
    const { password } = body;

    if (!password) {
      return responseJson({ success: false, error: '請輸入密碼' }, 400);
    }

    if (password !== ADMIN_PASSWORD) {
      return responseJson({ success: false, error: '密碼錯誤' }, 401);
    }

    return responseJson({ success: true });
  } catch (err) {
    return responseJson({ success: false, error: err.message }, 500);
  }
}
