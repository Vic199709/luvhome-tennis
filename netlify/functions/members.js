import { kintoneFetch, responseJson, responseOptions } from './shared.js';

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  try {
    if (event.httpMethod === 'GET') {
      const data = await kintoneFetch('members', `/k/v1/records.json?app=191`);
      return responseJson(data.records);
    } 
    
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const record = body.record;
      if (!record) {
        return responseJson({ error: 'Missing record in request body' }, 400);
      }
      const data = await kintoneFetch('members', '/k/v1/record.json', {
        method: 'POST',
        body: JSON.stringify({
          app: 191,
          record
        })
      });
      return responseJson(data);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, record } = body;
      if (!id || !record) {
        return responseJson({ error: 'Missing id or record in request body' }, 400);
      }
      const data = await kintoneFetch('members', '/k/v1/record.json', {
        method: 'PUT',
        body: JSON.stringify({
          app: 191,
          id,
          record
        })
      });
      return responseJson(data);
    }

    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in members function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
