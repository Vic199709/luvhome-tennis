import { kintoneFetch, responseJson, responseOptions } from './shared.js';

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

async function upsertPlayerQuarterStat({ seasonYear, seasonQuarter, playerID, teamID, pointChange, isWin }) {
  const query = `seasonYear = "${seasonYear}" and seasonQuarter in ("${seasonQuarter}") and playerID = "${playerID}" and teamID = "${teamID}" limit 1`;
  const existing = await kintoneFetch('playerQuarterStats', `/k/v1/records.json?app=200&query=${encodeURIComponent(query)}`);
  const current = existing.records?.[0];
  const currentPoints = parseInt(current?.periodPoints?.value, 10) || 0;
  const currentWins = parseInt(current?.wins?.value, 10) || 0;
  const currentLosses = parseInt(current?.losses?.value, 10) || 0;
  const nextRecord = {
    seasonYear: { value: seasonYear },
    seasonQuarter: { value: seasonQuarter },
    playerID: { value: String(playerID) },
    teamID: { value: String(teamID) },
    periodPoints: { value: String(currentPoints + pointChange) },
    wins: { value: String(currentWins + (isWin ? 1 : 0)) },
    losses: { value: String(currentLosses + (isWin ? 0 : 1)) }
  };

  if (current?.$id?.value) {
    await kintoneFetch('playerQuarterStats', '/k/v1/record.json', {
      method: 'PUT',
      body: JSON.stringify({
        app: 200,
        id: current.$id.value,
        record: nextRecord
      })
    });
    return;
  }

  await kintoneFetch('playerQuarterStats', '/k/v1/record.json', {
    method: 'POST',
    body: JSON.stringify({
      app: 200,
      record: nextRecord
    })
  });
}

async function upsertPlayerYearStat({ seasonYear, playerID, teamID, pointChange, isWin }) {
  const query = `seasonYear = "${seasonYear}" and playerID = "${playerID}" and teamID = "${teamID}" limit 1`;
  const existing = await kintoneFetch('playerYearStats', `/k/v1/records.json?app=201&query=${encodeURIComponent(query)}`);
  const current = existing.records?.[0];
  const currentPoints = parseInt(current?.periodPoints?.value, 10) || 0;
  const currentWins = parseInt(current?.wins?.value, 10) || 0;
  const currentLosses = parseInt(current?.losses?.value, 10) || 0;
  const nextRecord = {
    seasonYear: { value: seasonYear },
    playerID: { value: String(playerID) },
    teamID: { value: String(teamID) },
    periodPoints: { value: String(currentPoints + pointChange) },
    wins: { value: String(currentWins + (isWin ? 1 : 0)) },
    losses: { value: String(currentLosses + (isWin ? 0 : 1)) }
  };

  if (current?.$id?.value) {
    await kintoneFetch('playerYearStats', '/k/v1/record.json', {
      method: 'PUT',
      body: JSON.stringify({
        app: 201,
        id: current.$id.value,
        record: nextRecord
      })
    });
    return;
  }

  await kintoneFetch('playerYearStats', '/k/v1/record.json', {
    method: 'POST',
    body: JSON.stringify({
      app: 201,
      record: nextRecord
    })
  });
}

async function upsertTeamPeriodStat({ seasonYear, periodType, teamID, pointChange, isWin }) {
  const query = `seasonYear = "${seasonYear}" and period_type in ("${periodType}") and teamID = "${teamID}" limit 1`;
  const existing = await kintoneFetch('teamPeriodStats', `/k/v1/records.json?app=202&query=${encodeURIComponent(query)}`);
  const current = existing.records?.[0];
  const currentPoints = parseInt(current?.periodPoints?.value, 10) || 0;
  const currentWins = parseInt(current?.wins?.value, 10) || 0;
  const currentLosses = parseInt(current?.losses?.value, 10) || 0;
  const nextRecord = {
    seasonYear: { value: seasonYear },
    period_type: { value: periodType },
    teamID: { value: String(teamID) },
    periodPoints: { value: String(currentPoints + pointChange) },
    wins: { value: String(currentWins + (isWin ? 1 : 0)) },
    losses: { value: String(currentLosses + (isWin ? 0 : 1)) }
  };

  if (current?.$id?.value) {
    await kintoneFetch('teamPeriodStats', '/k/v1/record.json', {
      method: 'PUT',
      body: JSON.stringify({
        app: 202,
        id: current.$id.value,
        record: nextRecord
      })
    });
    return;
  }

  await kintoneFetch('teamPeriodStats', '/k/v1/record.json', {
    method: 'POST',
    body: JSON.stringify({
      app: 202,
      record: nextRecord
    })
  });
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
        query += ` order by matchDateTime desc limit 50`;
        const data = await kintoneFetch('matches', `/k/v1/records.json?app=194&query=${encodeURIComponent(query)}`);
        return responseJson(data.records || []);
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

      // Calculate score changes
      const isTeamAWon = parseInt(teamA_score, 10) > parseInt(teamB_score, 10);
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

      return responseJson({
        success: true,
        matchID: newMatchID
      });
    }

    if (event.httpMethod === 'PUT') {
      // Verification endpoint
      const body = JSON.parse(event.body || '{}');
      const { matchID } = body;

      if (!matchID) {
        return responseJson({ error: 'Missing matchID in body' }, 400);
      }

      // 1. Get Match record to check if it's already verified and retrieve details
      const matchQuery = await kintoneFetch('matches', `/k/v1/records.json?app=194&query=$id = "${matchID}"`);
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
      const teamAPlayerIds = new Set((matchRecord.teamA?.value || []).map(row => row.value?.playerID_A?.value).filter(Boolean));
      const winnerPoints = parseInt(matchRecord.winnerPoints?.value, 10) || 0;
      const loserPoints  = parseInt(matchRecord.loserPoints?.value,  10) || 0;

      // 2. Build score history from the match record itself (no separate app195 needed)
      const scoreHistories = [];
      (matchRecord.teamA?.value || []).forEach(row => {
        const playerID = row.value?.playerID_A?.value;
        const teamID   = row.value?.teamID_A?.value;
        if (playerID && teamID) {
          scoreHistories.push({
            playerID:    { value: playerID },
            teamID:      { value: teamID },
            pointChange: { value: String(teamAWin ? winnerPoints : loserPoints) }
          });
        }
      });
      (matchRecord.teamB?.value || []).forEach(row => {
        const playerID = row.value?.playerID_B?.value;
        const teamID   = row.value?.teamID_B?.value;
        if (playerID && teamID) {
          scoreHistories.push({
            playerID:    { value: playerID },
            teamID:      { value: teamID },
            pointChange: { value: String(teamAWin ? loserPoints : winnerPoints) }
          });
        }
      });

      // 3. Mark match as verified in app 194
      await kintoneFetch('matches', '/k/v1/record.json', {
        method: 'PUT',
        body: JSON.stringify({
          app: 194,
          id: matchID,
          record: {
            isVerified: { value: 'true' }
          }
        })
      });

      // 4. Update each player's score and matches in app 191
      // We will perform updates sequentially to ensure accuracy
      const teamTotals = new Map();
      for (const history of scoreHistories) {
        const playerID = history.playerID.value;
        const teamID = history.teamID.value;
        const change = parseInt(history.pointChange.value, 10) || 0;
        const isTeamAPlayer = teamAPlayerIds.has(playerID);
        const isWin = isTeamAPlayer ? teamAWin : !teamAWin;
        const teamAggregate = teamTotals.get(teamID) || { points: 0, isWin };
        teamAggregate.points += change;
        teamAggregate.isWin = isWin;
        teamTotals.set(teamID, teamAggregate);

        // Fetch current member record
        const memberQuery = await kintoneFetch('members', `/k/v1/records.json?app=191&query=$id = "${playerID}"`);
        if (memberQuery.records && memberQuery.records.length > 0) {
          const member = memberQuery.records[0];
          const currentScore = parseInt(member.currentScore.value, 10) || 0;
          const currentMatches = parseInt(member.totalMatches.value, 10) || 0;

          await kintoneFetch('members', '/k/v1/record.json', {
            method: 'PUT',
            body: JSON.stringify({
              app: 191,
              id: playerID,
              record: {
                currentScore: { value: String(currentScore + change) },
                totalMatches: { value: String(currentMatches + 1) }
              }
            })
          });
        }

        // Fetch and update current team score in app 192
        const teamQuery = await kintoneFetch('teams', `/k/v1/records.json?app=192&query=$id = "${teamID}"`);
        if (teamQuery.records && teamQuery.records.length > 0) {
          const team = teamQuery.records[0];
          const currentTeamScore = parseInt(team.teamScore.value, 10) || 0;

          await kintoneFetch('teams', '/k/v1/record.json', {
            method: 'PUT',
            body: JSON.stringify({
              app: 192,
              id: teamID,
              record: {
                teamScore: { value: String(currentTeamScore + change) }
              }
            })
          });
        }

        await upsertPlayerQuarterStat({
          seasonYear,
          seasonQuarter,
          playerID,
          teamID,
          pointChange: change,
          isWin
        });
        await upsertPlayerYearStat({
          seasonYear,
          playerID,
          teamID,
          pointChange: change,
          isWin
        });
      }

      for (const [teamID, aggregate] of teamTotals.entries()) {
        await upsertTeamPeriodStat({
          seasonYear,
          periodType: seasonQuarter,
          teamID,
          pointChange: aggregate.points,
          isWin: aggregate.isWin
        });
        await upsertTeamPeriodStat({
          seasonYear,
          periodType: 'year',
          teamID,
          pointChange: aggregate.points,
          isWin: aggregate.isWin
        });
      }

      return responseJson({ success: true, message: 'Match and member scores updated successfully' });
    }

    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in matches function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
