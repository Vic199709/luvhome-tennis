import { kintoneFetch, responseJson, responseOptions } from './shared.js';

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  try {
    if (event.httpMethod === 'GET') {
      const data = await kintoneFetch('settings', `/k/v1/records.json?app=196`);
      const settings = {};
      (data.records || []).forEach(record => {
        const key = record.Key?.value;
        const val = record.Value?.value;
        if (key) {
          settings[key] = val;
        }
      });
      return responseJson(settings);
    }
    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in settings function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
