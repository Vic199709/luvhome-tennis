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
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { updates } = body; // { key: value, ... }
      if (!updates || typeof updates !== 'object') {
        return responseJson({ error: 'Missing updates object in request body' }, 400);
      }

      // Fetch all records to map Key → $id
      const data = await kintoneFetch('settings', `/k/v1/records.json?app=196`);
      const records = data.records || [];

      const promises = Object.entries(updates).map(([key, value]) => {
        const record = records.find(r => r.Key?.value === key);
        if (!record) return Promise.resolve(); // unknown key — skip
        return kintoneFetch('settings', '/k/v1/record.json', {
          method: 'PUT',
          body: JSON.stringify({
            app: 196,
            id: record.$id.value,
            record: { Value: { value: String(value) } }
          })
        });
      });

      await Promise.all(promises);
      return responseJson({ success: true });
    }

    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in settings function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
