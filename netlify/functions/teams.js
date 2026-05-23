import { kintoneFetch, responseJson, responseOptions } from './shared.js';

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  try {
    if (event.httpMethod === 'GET') {
      const data = await kintoneFetch('teams', `/k/v1/records.json?app=192`);
      return responseJson(data.records);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, record } = body;
      if (!id || !record) {
        return responseJson({ error: 'Missing id or record in request body' }, 400);
      }
      const data = await kintoneFetch('teams', '/k/v1/record.json', {
        method: 'PUT',
        body: JSON.stringify({
          app: 192,
          id,
          record
        })
      });
      return responseJson(data);
    }

    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in teams function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
