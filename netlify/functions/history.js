import { kintoneFetch, responseJson, responseOptions } from './shared.js';

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  try {
    if (event.httpMethod === 'GET') {
      const data = await kintoneFetch('history', `/k/v1/records.json?app=195`);
      return responseJson(data.records);
    }

    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in history function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
