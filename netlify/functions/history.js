import { kintoneFetch, responseJson, responseOptions } from './shared.js';

function getSeasonInfo(matchDateTime) {
  const date = new Date(matchDateTime);
  if (Number.isNaN(date.getTime())) return { seasonYear: '', seasonQuarter: '' };
  const seasonYear = String(date.getFullYear());
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return { seasonYear, seasonQuarter: `Q${quarter}` };
}

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return responseOptions();
  }

  try {
    if (event.httpMethod === 'GET') {
      const qParams = event.queryStringParameters || {};

      // Build query against app194 (matches) — only verified matches
      const queryParts = ['isVerified in ("true")'];

      if (qParams.playerID) {
        queryParts.push(`(playerID_A in ("${qParams.playerID}") or playerID_B in ("${qParams.playerID}"))`);
      }
      if (qParams.teamID) {
        queryParts.push(`(teamID_A in ("${qParams.teamID}") or teamID_B in ("${qParams.teamID}"))`);
      }

      const query = queryParts.join(' and ') + ' limit 500';
      const matchesData = await kintoneFetch('matches', `/k/v1/records.json?app=194&query=${encodeURIComponent(query)}`);
      const matches = matchesData.records || [];

      if (matches.length === 0) {
        return responseJson([]);
      }

      // Flatten each match into per-player history records (same shape the frontend expects)
      const historyRecords = [];
      matches.forEach(match => {
        const matchID = match.$id?.value;
        const winnerPoints = parseInt(match.winnerPoints?.value, 10) || 0;
        const loserPoints  = parseInt(match.loserPoints?.value,  10) || 0;
        const teamAScore   = parseInt(match.teamA_score?.value,  10) || 0;
        const teamBScore   = parseInt(match.teamB_score?.value,  10) || 0;
        const teamAWon     = teamAScore > teamBScore;
        let seasonYear    = match.seasonYear?.value    || '';
        let seasonQuarter = match.seasonQuarter?.value || '';
        // Older records may not have these fields — derive from matchDateTime
        if (!seasonYear || !seasonQuarter) {
          const derived = getSeasonInfo(match.matchDateTime?.value);
          if (!seasonYear)    seasonYear    = derived.seasonYear;
          if (!seasonQuarter) seasonQuarter = derived.seasonQuarter;
        }

        // Team A
        (match.teamA?.value || []).forEach(row => {
          const playerID = row.value?.playerID_A?.value;
          const teamID   = row.value?.teamID_A?.value;
          if (!playerID || !teamID) return;
          if (qParams.playerID && playerID !== qParams.playerID) return;
          if (qParams.teamID   && teamID   !== qParams.teamID)   return;

          historyRecords.push({
            $id:          { value: `${matchID}-A-${playerID}` },
            playerID:     { value: playerID },
            teamID:       { value: teamID },
            matchID:      { value: matchID },
            pointChange:  { value: String(teamAWon ? winnerPoints : loserPoints) },
            seasonYear:   { value: seasonYear },
            seasonQuarter:{ value: seasonQuarter }
          });
        });

        // Team B
        (match.teamB?.value || []).forEach(row => {
          const playerID = row.value?.playerID_B?.value;
          const teamID   = row.value?.teamID_B?.value;
          if (!playerID || !teamID) return;
          if (qParams.playerID && playerID !== qParams.playerID) return;
          if (qParams.teamID   && teamID   !== qParams.teamID)   return;

          historyRecords.push({
            $id:          { value: `${matchID}-B-${playerID}` },
            playerID:     { value: playerID },
            teamID:       { value: teamID },
            matchID:      { value: matchID },
            pointChange:  { value: String(teamAWon ? loserPoints : winnerPoints) },
            seasonYear:   { value: seasonYear },
            seasonQuarter:{ value: seasonQuarter }
          });
        });
      });

      return responseJson(historyRecords);
    }

    return responseJson({ error: `Method ${event.httpMethod} not allowed` }, 405);
  } catch (error) {
    console.error('Error in history function:', error);
    return responseJson({ error: error.message }, 500);
  }
}
