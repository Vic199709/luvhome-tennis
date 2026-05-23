import { kintoneFetch, responseJson, responseOptions } from './shared.js';

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  try {
    if (event.httpMethod === 'GET') {
      const data = await kintoneFetch('matches', `/k/v1/records.json?app=194`);
      return responseJson(data.records);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { matchDateTime, teamA, teamB, teamA_score, teamB_score, matchType } = body;

      if (!matchDateTime || !teamA || !teamB || !teamA_score || !teamB_score || !matchType) {
        return responseJson({ error: 'Missing required match details' }, 400);
      }

      // Calculate score changes
      const isTeamAWon = parseInt(teamA_score, 10) > parseInt(teamB_score, 10);
      let winScore = 10;
      let loseScore = 3;

      if (matchType === 'saturday') {
        winScore = 15;
        loseScore = 5;
      } else if (matchType === 'season') {
        winScore = 30;
        loseScore = 10;
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
            loserPoints: { value: String(loseScore) }
          }
        })
      });

      const newMatchID = matchRecordRes.id;

      // 2. Create the Score History Records in App 195
      const scoreHistoryRecords = [];

      // Team A Players
      teamA.forEach(p => {
        scoreHistoryRecords.push({
          playerID: { value: String(p.playerID) },
          teamID: { value: String(p.teamID) },
          matchID: { value: String(newMatchID) },
          pointChange: { value: String(isTeamAWon ? winScore : loseScore) }
        });
      });

      // Team B Players
      teamB.forEach(p => {
        scoreHistoryRecords.push({
          playerID: { value: String(p.playerID) },
          teamID: { value: String(p.teamID) },
          matchID: { value: String(newMatchID) },
          pointChange: { value: String(isTeamAWon ? loseScore : winScore) }
        });
      });

      const scoreHistoryRes = await kintoneFetch('history', '/k/v1/records.json', {
        method: 'POST',
        body: JSON.stringify({
          app: 195,
          records: scoreHistoryRecords
        })
      });

      return responseJson({
        success: true,
        matchID: newMatchID,
        scoreHistoryIds: scoreHistoryRes.ids
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

      // 2. Get Score History records for this match
      const historyQuery = await kintoneFetch('history', `/k/v1/records.json?app=195&query=matchID = "${matchID}"`);
      const scoreHistories = historyQuery.records || [];

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
      for (const history of scoreHistories) {
        const playerID = history.playerID.value;
        const teamID = history.teamID.value;
        const change = parseInt(history.pointChange.value, 10) || 0;

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
      }

      return responseJson({ success: true, message: 'Match and member scores updated successfully' });
    }

    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in matches function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
