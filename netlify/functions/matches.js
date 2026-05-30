import { kintoneFetch, responseJson, responseOptions } from './shared.js';

// Upsert helper shared by both POST (submission) and PUT (verification)
// Returns null on success, or an error descriptor object on failure.
async function upsertStats(appKey, appId, queryStr, deltaFields, createRecord) {
  const label = `[upsert:${appKey}(${appId})]`;
  try {
    console.log(`${label} GET query: ${queryStr}`);
    const res = await kintoneFetch(appKey, `/k/v1/records.json?app=${appId}&query=${encodeURIComponent(queryStr)}`);
    if (res.records && res.records.length > 0) {
      const existing = res.records[0];
      const updateRecord = {};
      for (const [field, delta] of Object.entries(deltaFields)) {
        const current = parseInt(existing[field]?.value || '0', 10);
        updateRecord[field] = { value: String(current + delta) };
      }
      console.log(`${label} PUT id=${existing.$id.value}`, JSON.stringify(updateRecord));
      await kintoneFetch(appKey, '/k/v1/record.json', {
        method: 'PUT',
        body: JSON.stringify({ app: appId, id: existing.$id.value, record: updateRecord })
      });
    } else {
      console.log(`${label} POST (new record)`, JSON.stringify(createRecord));
      await kintoneFetch(appKey, '/k/v1/record.json', {
        method: 'POST',
        body: JSON.stringify({ app: appId, record: createRecord })
      });
    }
    return null;
  } catch (err) {
    const detail = { app: appKey, appId, query: queryStr, error: err.message };
    console.error(`${label} FAILED:`, err.message);
    return detail;
  }
}

// Build and run all stat upserts for a set of player/team entries
async function runStatsUpserts({ playerEntries, teamOutcomes, seasonYear, seasonQuarter }) {
  const statsUpdates = [];

  for (const { playerID, teamID, points, won } of playerEntries) {
    const w = won ? 1 : 0;
    const l = won ? 0 : 1;

    // App 200: player_quarter_stats (NUMBER fields → no quotes; DROP_DOWN → in)
    statsUpdates.push(upsertStats(
      'playerQuarterStats', 200,
      `playerID = ${playerID} and teamID = ${teamID} and seasonYear = "${seasonYear}" and seasonQuarter in ("${seasonQuarter}")`,
      { periodPoints: points, wins: w, losses: l },
      {
        playerID: { value: playerID },
        teamID: { value: teamID },
        seasonYear: { value: seasonYear },
        seasonQuarter: { value: seasonQuarter },
        periodPoints: { value: String(points) },
        wins: { value: String(w) },
        losses: { value: String(l) }
      }
    ));

    // App 201: player_year_stats
    statsUpdates.push(upsertStats(
      'playerYearStats', 201,
      `playerID = ${playerID} and teamID = ${teamID} and seasonYear = "${seasonYear}"`,
      { periodPoints: points, wins: w, losses: l },
      {
        playerID: { value: playerID },
        teamID: { value: teamID },
        seasonYear: { value: seasonYear },
        periodPoints: { value: String(points) },
        wins: { value: String(w) },
        losses: { value: String(l) }
      }
    ));
  }

  for (const [teamID, { won, points }] of teamOutcomes) {
    const w = won ? 1 : 0;
    const l = won ? 0 : 1;

    // App 202: team_period_stats — quarterly row
    statsUpdates.push(upsertStats(
      'teamPeriodStats', 202,
      `teamID = ${teamID} and seasonYear = "${seasonYear}" and periodType in ("${seasonQuarter}")`,
      { periodPoints: points, wins: w, losses: l },
      {
        teamID: { value: teamID },
        seasonYear: { value: seasonYear },
        periodType: { value: seasonQuarter },
        periodPoints: { value: String(points) },
        wins: { value: String(w) },
        losses: { value: String(l) }
      }
    ));

    // App 202: team_period_stats — yearly row
    statsUpdates.push(upsertStats(
      'teamPeriodStats', 202,
      `teamID = ${teamID} and seasonYear = "${seasonYear}" and periodType in ("year")`,
      { periodPoints: points, wins: w, losses: l },
      {
        teamID: { value: teamID },
        seasonYear: { value: seasonYear },
        periodType: { value: 'year' },
        periodPoints: { value: String(points) },
        wins: { value: String(w) },
        losses: { value: String(l) }
      }
    ));
  }

  const results = await Promise.all(statsUpdates);
  return results.filter(r => r !== null);
}

function getSeasonInfo(matchDateTime) {
  const date = new Date(matchDateTime);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid matchDateTime');
  }
  const seasonYear = String(date.getFullYear());
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return {
    seasonYear,
    seasonQuarter: `Q${quarter}`
  };
}

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  try {
    if (event.httpMethod === 'GET') {
      const qParams = event.queryStringParameters || {};

      let query = '';
      if (qParams.playerID) {
        query = `(playerID_A in ("${qParams.playerID}") or playerID_B in ("${qParams.playerID}"))`;
        if (qParams.isVerified) {
          query += ` and isVerified in ("${qParams.isVerified}")`;
        }
        query += ` order by matchDateTime desc`;
        const LIMIT = 500;
        const allRecords = [];
        let offset = 0;
        while (true) {
          const data = await kintoneFetch('matches', `/k/v1/records.json?app=194&query=${encodeURIComponent(query + ` limit ${LIMIT} offset ${offset}`)}`);
          const records = data.records || [];
          allRecords.push(...records);
          if (records.length < LIMIT) break;
          offset += LIMIT;
        }
        return responseJson(allRecords);
      } else if (qParams.isVerified) {
        query = `isVerified in ("${qParams.isVerified}")`;
        if (qParams.isVerified === 'true') {
          query += ` order by matchDateTime desc limit 50`;
        }
        const data = await kintoneFetch('matches', `/k/v1/records.json?app=194&query=${encodeURIComponent(query)}`);
        return responseJson(data.records || []);
      } else {
        const unverifiedData = await kintoneFetch('matches', `/k/v1/records.json?app=194&query=${encodeURIComponent('isVerified in ("false")')}`);
        const verifiedData = await kintoneFetch('matches', `/k/v1/records.json?app=194&query=${encodeURIComponent('isVerified in ("true") order by matchDateTime desc limit 20')}`);
        const combinedRecords = [...(unverifiedData.records || []), ...(verifiedData.records || [])];
        return responseJson(combinedRecords);
      }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { matchDateTime, teamA, teamB, teamA_score, teamB_score, matchType } = body;

      if (!matchDateTime || !teamA || !teamB || !teamA_score || !teamB_score || !matchType) {
        return responseJson({ error: 'Missing required match details' }, 400);
      }

      // Fetch settings from App 196
      let settings = {};
      try {
        const settingsData = await kintoneFetch('settings', `/k/v1/records.json?app=196`);
        (settingsData.records || []).forEach(record => {
          const key = record.Key?.value;
          const val = record.Value?.value;
          if (key) {
            settings[key] = val;
          }
        });
      } catch (err) {
        console.error('Failed to fetch settings from Kintone:', err);
      }

      const { seasonYear, seasonQuarter } = getSeasonInfo(matchDateTime);

      // Load scores from settings with hardcoded fallbacks
      let winScore = parseInt(settings.weekday_win_score || '10', 10);
      let loseScore = parseInt(settings.weekday_lose_score || '3', 10);

      if (matchType === 'saturday') {
        winScore = parseInt(settings.challenge_win_score || '15', 10);
        loseScore = parseInt(settings.challenge_lose_score || '5', 10);
      } else if (matchType === 'season') {
        winScore = parseInt(settings.finals_win_score || '30', 10);
        loseScore = parseInt(settings.finals_lose_score || '10', 10);
      }

      // Prepare subtable formats for Kintone
      const kintoneTeamA = teamA.map(p => ({
        value: {
          playerID_A: { type: 'NUMBER', value: String(p.playerID) },
          teamID_A: { type: 'NUMBER', value: String(p.teamID) }
        }
      }));

      const kintoneTeamB = teamB.map(p => ({
        value: {
          playerID_B: { type: 'NUMBER', value: String(p.playerID) },
          teamID_B: { type: 'NUMBER', value: String(p.teamID) }
        }
      }));

      // 1. Create the Match Record in App 194
      const matchRecordRes = await kintoneFetch('matches', '/k/v1/record.json', {
        method: 'POST',
        body: JSON.stringify({
          app: 194,
          record: {
            matchDateTime: { value: matchDateTime },
            teamA: { value: kintoneTeamA },
            teamB: { value: kintoneTeamB },
            teamA_score: { value: String(teamA_score) },
            teamB_score: { value: String(teamB_score) },
            isVerified: { value: 'false' },
            winnerPoints: { value: String(winScore) },
            loserPoints: { value: String(loseScore) },
            seasonYear: { value: seasonYear },
            seasonQuarter: { value: seasonQuarter }
          }
        })
      });

      const newMatchID = matchRecordRes.id;

      // 2. Upsert stats to apps 200, 201, 202
      const teamAWin = parseInt(teamA_score, 10) > parseInt(teamB_score, 10);

      const playerEntries = [];
      teamA.forEach(p => {
        if (p.playerID && p.teamID) {
          playerEntries.push({
            playerID: String(p.playerID),
            teamID: String(p.teamID),
            points: teamAWin ? winScore : loseScore,
            won: teamAWin
          });
        }
      });
      teamB.forEach(p => {
        if (p.playerID && p.teamID) {
          playerEntries.push({
            playerID: String(p.playerID),
            teamID: String(p.teamID),
            points: teamAWin ? loseScore : winScore,
            won: !teamAWin
          });
        }
      });

      const teamOutcomes = new Map();
      teamA.forEach(p => {
        const tid = String(p.teamID);
        if (tid && !teamOutcomes.has(tid)) {
          teamOutcomes.set(tid, { won: teamAWin, points: teamAWin ? winScore : loseScore });
        }
      });
      teamB.forEach(p => {
        const tid = String(p.teamID);
        if (tid && !teamOutcomes.has(tid)) {
          teamOutcomes.set(tid, { won: !teamAWin, points: teamAWin ? loseScore : winScore });
        }
      });

      const upsertErrors = await runStatsUpserts({ playerEntries, teamOutcomes, seasonYear, seasonQuarter });

      if (upsertErrors.length > 0) {
        console.error('Stats upsert failures (POST):', JSON.stringify(upsertErrors));
        return responseJson({
          success: false,
          matchID: newMatchID,
          error: `Match created (id=${newMatchID}) but stats update failed (${upsertErrors.length} error(s))`,
          details: upsertErrors
        }, 500);
      }

      return responseJson({
        success: true,
        matchID: newMatchID
      });
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { matchID } = body;

      if (!matchID) {
        return responseJson({ error: 'Missing matchID in body' }, 400);
      }

      // 1. Fetch match record
      const matchQuery = await kintoneFetch('matches', `/k/v1/records.json?app=194&query=${encodeURIComponent(`$id = "${matchID}"`)}`);
      if (!matchQuery.records || matchQuery.records.length === 0) {
        return responseJson({ error: 'Match record not found' }, 404);
      }

      const matchRecord = matchQuery.records[0];
      if (matchRecord.isVerified.value === 'true') {
        return responseJson({ message: 'Match already verified', success: true });
      }

      const seasonYear = matchRecord.seasonYear?.value || getSeasonInfo(matchRecord.matchDateTime?.value).seasonYear;
      const seasonQuarter = matchRecord.seasonQuarter?.value || getSeasonInfo(matchRecord.matchDateTime?.value).seasonQuarter;
      const teamAScore = parseInt(matchRecord.teamA_score?.value, 10) || 0;
      const teamBScore = parseInt(matchRecord.teamB_score?.value, 10) || 0;
      const teamAWin = teamAScore > teamBScore;
      const winnerPoints = parseInt(matchRecord.winnerPoints?.value, 10) || 0;
      const loserPoints = parseInt(matchRecord.loserPoints?.value, 10) || 0;

      // 2. Collect per-player entries { playerID, teamID, points, won }
      const playerEntries = [];
      (matchRecord.teamA?.value || []).forEach(row => {
        const playerID = row.value?.playerID_A?.value;
        const teamID = row.value?.teamID_A?.value;
        if (playerID && teamID) {
          playerEntries.push({ playerID, teamID, points: teamAWin ? winnerPoints : loserPoints, won: teamAWin });
        }
      });
      (matchRecord.teamB?.value || []).forEach(row => {
        const playerID = row.value?.playerID_B?.value;
        const teamID = row.value?.teamID_B?.value;
        if (playerID && teamID) {
          playerEntries.push({ playerID, teamID, points: teamAWin ? loserPoints : winnerPoints, won: !teamAWin });
        }
      });

      // 3. Collect unique team outcomes (first occurrence per teamID wins in case of cross-team doubles)
      const teamOutcomes = new Map();
      (matchRecord.teamA?.value || []).forEach(row => {
        const teamID = row.value?.teamID_A?.value;
        if (teamID && !teamOutcomes.has(teamID)) {
          teamOutcomes.set(teamID, { won: teamAWin, points: teamAWin ? winnerPoints : loserPoints });
        }
      });
      (matchRecord.teamB?.value || []).forEach(row => {
        const teamID = row.value?.teamID_B?.value;
        if (teamID && !teamOutcomes.has(teamID)) {
          teamOutcomes.set(teamID, { won: !teamAWin, points: teamAWin ? loserPoints : winnerPoints });
        }
      });

      // 4. Run all stat upserts concurrently (shared helper)
      const upsertErrors = await runStatsUpserts({ playerEntries, teamOutcomes, seasonYear, seasonQuarter });

      if (upsertErrors.length > 0) {
        console.error('Stats upsert failures:', JSON.stringify(upsertErrors));
        return responseJson({
          success: false,
          error: `Stats update failed (${upsertErrors.length} error(s))`,
          details: upsertErrors
        }, 500);
      }

      // 5. Mark match as verified (only after all stats succeed)
      await kintoneFetch('matches', '/k/v1/record.json', {
        method: 'PUT',
        body: JSON.stringify({
          app: 194,
          id: matchID,
          record: {
            isVerified: { value: 'true' },
            seasonYear: { value: seasonYear },
            seasonQuarter: { value: seasonQuarter }
          }
        })
      });

      return responseJson({ success: true, message: 'Match verified and stats updated' });
    }

    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in matches function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
