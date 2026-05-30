// Temporary diagnostic endpoint — delete after debugging
// Usage:
//   GET  /.netlify/functions/debug-stats?playerID=22&teamID=1&year=2026&quarter=Q2
//   POST /.netlify/functions/debug-stats   → write test record then delete it
import { kintoneFetch, responseJson, responseOptions } from './shared.js';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return responseOptions();

  const q = event.queryStringParameters || {};
  const results = {};

  // POST: write a test record to app 200/201/202, then delete it → confirms tokens work
  if (event.httpMethod === 'POST') {
    const log = [];
    try {
      // --- App 200 test ---
      const post200 = await kintoneFetch('playerQuarterStats', '/k/v1/record.json', {
        method: 'POST',
        body: JSON.stringify({
          app: 200,
          record: {
            playerID: { value: '1' }, teamID: { value: '1' },
            seasonYear: { value: 'TEST' }, seasonQuarter: { value: 'Q1' },
            periodPoints: { value: '0' }, wins: { value: '0' }, losses: { value: '0' }
          }
        })
      });
      log.push({ app: 200, action: 'POST', result: post200 });
      // delete it
      await kintoneFetch('playerQuarterStats', '/k/v1/record.json', {
        method: 'DELETE',
        body: JSON.stringify({ app: 200, id: post200.id })
      }).catch(e => log.push({ app: 200, action: 'DELETE failed', error: e.message }));

      // --- App 201 test ---
      const post201 = await kintoneFetch('playerYearStats', '/k/v1/record.json', {
        method: 'POST',
        body: JSON.stringify({
          app: 201,
          record: {
            playerID: { value: '1' }, teamID: { value: '1' },
            seasonYear: { value: 'TEST' },
            periodPoints: { value: '0' }, wins: { value: '0' }, losses: { value: '0' }
          }
        })
      });
      log.push({ app: 201, action: 'POST', result: post201 });
      await kintoneFetch('playerYearStats', '/k/v1/record.json', {
        method: 'DELETE',
        body: JSON.stringify({ app: 201, id: post201.id })
      }).catch(e => log.push({ app: 201, action: 'DELETE failed', error: e.message }));

      // --- App 202 test ---
      const post202 = await kintoneFetch('teamPeriodStats', '/k/v1/record.json', {
        method: 'POST',
        body: JSON.stringify({
          app: 202,
          record: {
            teamID: { value: '1' }, seasonYear: { value: 'TEST' },
            periodType: { value: 'Q1' },
            periodPoints: { value: '0' }, wins: { value: '0' }, losses: { value: '0' }
          }
        })
      });
      log.push({ app: 202, action: 'POST', result: post202 });
      await kintoneFetch('teamPeriodStats', '/k/v1/record.json', {
        method: 'DELETE',
        body: JSON.stringify({ app: 202, id: post202.id })
      }).catch(e => log.push({ app: 202, action: 'DELETE failed', error: e.message }));

      return responseJson({ success: true, log });
    } catch (err) {
      return responseJson({ success: false, error: err.message, log }, 500);
    }
  }

  try {
    // App 200: player_quarter_stats
    const q200 = [];
    if (q.playerID) q200.push(`playerID = ${q.playerID}`);
    if (q.teamID)   q200.push(`teamID = ${q.teamID}`);
    if (q.year)     q200.push(`seasonYear = "${q.year}"`);
    if (q.quarter)  q200.push(`seasonQuarter in ("${q.quarter}")`);
    const r200 = await kintoneFetch('playerQuarterStats',
      `/k/v1/records.json?app=200${q200.length ? '&query=' + encodeURIComponent(q200.join(' and ')) : ''}`
    );
    results.app200_playerQuarterStats = (r200.records || []).map(r => ({
      id: r.$id?.value,
      playerID: r.playerID?.value,
      teamID: r.teamID?.value,
      seasonYear: r.seasonYear?.value,
      seasonQuarter: r.seasonQuarter?.value,
      periodPoints: r.periodPoints?.value,
      wins: r.wins?.value,
      losses: r.losses?.value
    }));

    // App 201: player_year_stats
    const q201 = [];
    if (q.playerID) q201.push(`playerID = ${q.playerID}`);
    if (q.teamID)   q201.push(`teamID = ${q.teamID}`);
    if (q.year)     q201.push(`seasonYear = "${q.year}"`);
    const r201 = await kintoneFetch('playerYearStats',
      `/k/v1/records.json?app=201${q201.length ? '&query=' + encodeURIComponent(q201.join(' and ')) : ''}`
    );
    results.app201_playerYearStats = (r201.records || []).map(r => ({
      id: r.$id?.value,
      playerID: r.playerID?.value,
      teamID: r.teamID?.value,
      seasonYear: r.seasonYear?.value,
      periodPoints: r.periodPoints?.value,
      wins: r.wins?.value,
      losses: r.losses?.value
    }));

    // App 202: team_period_stats
    const q202 = [];
    if (q.teamID) q202.push(`teamID = ${q.teamID}`);
    if (q.year)   q202.push(`seasonYear = "${q.year}"`);
    const r202 = await kintoneFetch('teamPeriodStats',
      `/k/v1/records.json?app=202${q202.length ? '&query=' + encodeURIComponent(q202.join(' and ')) : ''}`
    );
    results.app202_teamPeriodStats = (r202.records || []).map(r => ({
      id: r.$id?.value,
      teamID: r.teamID?.value,
      seasonYear: r.seasonYear?.value,
      periodType: r.periodType?.value,
      periodPoints: r.periodPoints?.value,
      wins: r.wins?.value,
      losses: r.losses?.value
    }));

    return responseJson(results);
  } catch (err) {
    return responseJson({ error: err.message, partial: results }, 500);
  }
}
