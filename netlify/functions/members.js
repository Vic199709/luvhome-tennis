import { kintoneFetch, responseJson, responseOptions } from './shared.js';

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  try {
    if (event.httpMethod === 'GET') {
      const qParams = event.queryStringParameters || {};
      let query = '';
      if (qParams.teamID) {
        query = `teamID in ("${qParams.teamID}")`;
      } else if (qParams.id) {
        query = `$id = "${qParams.id}"`;
      } else if (qParams.ids) {
        const idList = qParams.ids.split(',').map(id => `"${id.trim()}"`).join(',');
        query = `$id in (${idList})`;
      } else if (qParams.isVerified) {
        query = `isVerified in ("${qParams.isVerified}")`;
      }

      let url = `/k/v1/records.json?app=191`;
      if (query) {
        url += `&query=${encodeURIComponent(query)}`;
      }

      const data = await kintoneFetch('members', url);
      const sanitizedRecords = (data.records || []).map(record => {
        const sanitized = { ...record };
        if (sanitized.playerPhone) {
          const rawPhone = sanitized.playerPhone.value || '';
          sanitized.playerPhone = {
            ...sanitized.playerPhone,
            value: rawPhone ? `******${rawPhone.slice(-4)}` : ''
          };
        }
        if (sanitized.birthday) {
          sanitized.birthday = {
            ...sanitized.birthday,
            value: ''
          };
        }
        return sanitized;
      });
      return responseJson(sanitizedRecords);
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
