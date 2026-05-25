import { kintoneFetch, responseJson, responseOptions } from './shared.js';

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  try {
    if (event.httpMethod === 'GET') {
      const qParams = event.queryStringParameters || {};
      
      let historyQuery = '';
      if (qParams.teamID) {
        historyQuery = `teamID = "${qParams.teamID}"`;
        if (qParams.playerID) {
          historyQuery += ` and playerID = "${qParams.playerID}"`;
        }
      } else if (qParams.playerID) {
        historyQuery = `playerID = "${qParams.playerID}"`;
      }
      
      const fullHistoryQuery = historyQuery ? `${historyQuery} limit 500` : 'limit 500';
      const historyData = await kintoneFetch('history', `/k/v1/records.json?app=195&query=${encodeURIComponent(fullHistoryQuery)}`);
      const records = historyData.records || [];
      if (records.length === 0) {
        return responseJson([]);
      }

      // Find unique match IDs in these history records
      const matchIds = [...new Set(records.map(h => h.matchID?.value))].filter(Boolean);
      if (matchIds.length === 0) {
        return responseJson([]);
      }

      // Query which of these matches are verified
      const verifiedMatchesData = await kintoneFetch('matches', `/k/v1/records.json?app=194&query=${encodeURIComponent(`$id in (${matchIds.map(id => `"${id}"`).join(',')}) and isVerified in ("true")`)}&fields=$id`);
      const verifiedIds = new Set((verifiedMatchesData.records || []).map(m => m.$id.value));

      // Filter history records for verified matches only
      const filteredHistory = records.filter(h => verifiedIds.has(h.matchID?.value));
      return responseJson(filteredHistory);
    }

    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in history function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
