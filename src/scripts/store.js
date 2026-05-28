import { reactive } from 'vue';

// Session management (1-day expiry)
const SESSION_KEY = 'tennis_session';
const SESSION_TTL = 86400000; // 24 hours in ms

export function saveSession(phone) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ phone, loginAt: Date.now() }));
}

export function loadSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { phone, loginAt } = JSON.parse(raw);
    if (Date.now() - loginAt > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return phone;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

// API Endpoint Helpers
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = typeof window !== 'undefined' && isLocal && window.location.port !== '8888'
  ? 'http://localhost:8888/.netlify/functions'
  : '/.netlify/functions';

const handleResponse = (res) => {
  if (!res.ok) {
    return res.json().then(err => {
      throw new Error(err.error || `HTTP error ${res.status}`);
    }).catch(() => {
      throw new Error(`HTTP error ${res.status}`);
    });
  }
  return res.json();
};

export const API = {
  getMembers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/members${query ? `?${query}` : ''}`).then(handleResponse);
  },
  getTeams: () => fetch(`${API_BASE}/teams`).then(handleResponse),
  getMatches: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/matches${query ? `?${query}` : ''}`).then(handleResponse);
  },
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/history${query ? `?${query}` : ''}`).then(handleResponse);
  },
  getSettings: () => fetch(`${API_BASE}/settings`).then(handleResponse),
  login: (phone) => fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  }).then(handleResponse),

  addMember: (record) => fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record })
  }).then(handleResponse),

  verifyMember: (id) => fetch(`${API_BASE}/members`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, record: { isVerified: { value: 'true' } } })
  }).then(handleResponse),

  submitMatch: (data) => fetch(`${API_BASE}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),

  verifyMatch: (matchID) => fetch(`${API_BASE}/matches`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchID })
  }).then(handleResponse),

  updateSettings: (updates) => fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates })
  }).then(handleResponse),

  adminAuth: (password) => fetch(`${API_BASE}/admin-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  }).then(handleResponse)
};

export const store = reactive({
  currentUser: null,
  currentView: 'view-login',
  members: [],
  teams: [],
  matches: [],
  history: [],
  activeTeamId: null,
  allMembersLoaded: false,
  allHistoryLoaded: false,
  matchMode: 'doubles',
  adminActiveTab: 'members',
  toasts: [],
  fullPageError: null,
  isLoading: false,
  settingsLoaded: false,
  teamsLoaded: false,
  settings: {
    weekday_win_score: '10',
    weekday_lose_score: '3',
    challenge_win_score: '15',
    challenge_lose_score: '5',
    finals_win_score: '30',
    finals_lose_score: '10',
    top_bar_subtitle: ''
  }
});

// Show lightweight toast notifications
export function showToast(message, type = 'info', action = null) {
  const id = Date.now() + Math.random().toString(36).substr(2, 9);
  const toastObj = { id, message, type, action };
  store.toasts.push(toastObj);

  setTimeout(() => {
    removeToast(id);
  }, 4500);

  return id;
}

export function removeToast(id) {
  store.toasts = store.toasts.filter(t => t.id !== id);
}

// Show standalone full-page error view
export function showFullPageError(title, description, backCallback = null) {
  store.fullPageError = { title, description, backCallback };
  store.currentView = 'view-error';
}

export function clearFullPageError() {
  store.fullPageError = null;
}

export function resetUserSession() {
  clearSession();
  store.currentUser = null;
  store.members = [];
  store.teams = [];
  store.matches = [];
  store.history = [];
  store.activeTeamId = null;
  store.allMembersLoaded = false;
  store.allHistoryLoaded = false;
  store.settingsLoaded = false;
  store.teamsLoaded = false;
  store.fullPageError = null;
}

export async function refreshAllData(options = {}) {
  try {
    store.isLoading = true;
    // Static tables (teams, settings) are fetched once per session
    const defaultDatasets = ['members', 'matches', 'history'];
    if (!store.teamsLoaded) defaultDatasets.push('teams');
    if (!store.settingsLoaded) defaultDatasets.push('settings');
    const datasets = new Set(options.datasets || defaultDatasets);

    // Determine which team's members to load on login/refresh
    let teamID = options.teamID || store.activeTeamId;
    if (!teamID && store.currentUser) {
      const teams = (store.currentUser.teams?.value || []).filter(teamRow => teamRow && teamRow.value);
      if (teams.length > 0) {
        const sortedUserTeams = [...teams].sort((a, b) => {
          const idA = a.value?.teamID?.value || '';
          const idB = b.value?.teamID?.value || '';
          return idA.localeCompare(idB);
        });
        teamID = sortedUserTeams[0].value?.teamID?.value;
      }
    }

    const membersParams = {};
    if (teamID) {
      membersParams.teamID = teamID;
    }

    const matchesParams = {};
    if (store.currentUser && store.currentUser.$id) {
      matchesParams.playerID = store.currentUser.$id.value;
    }

    const historyParams = {};
    if (teamID) {
      historyParams.teamID = teamID;
    }

    const requests = [];
    if (datasets.has('members')) requests.push(API.getMembers(membersParams).then(data => ({ key: 'members', data })));
    if (datasets.has('teams') && !store.teamsLoaded) requests.push(API.getTeams().then(data => ({ key: 'teams', data })));
    if (datasets.has('matches')) requests.push(API.getMatches(matchesParams).then(data => ({ key: 'matches', data })));
    if (datasets.has('history')) requests.push(API.getHistory(historyParams).then(data => ({ key: 'history', data })));
    if (datasets.has('settings') && !store.settingsLoaded) {
      requests.push(
        API.getSettings()
          .then(data => ({ key: 'settings', data }))
          .catch(err => {
            console.error('Failed to load settings:', err);
            return { key: 'settings', data: null };
          })
      );
    }

    const responses = await Promise.all(requests);
    const loaded = Object.fromEntries(responses.map(item => [item.key, item.data]));

    if (datasets.has('members')) {
      store.members = loaded.members || [];
    }
    if (datasets.has('teams') && loaded.teams) {
      store.teams = loaded.teams.sort((a, b) => {
        const idA = a.teamID?.value || '';
        const idB = b.teamID?.value || '';
        return idA.localeCompare(idB);
      });
      store.teamsLoaded = true;
    }
    if (datasets.has('matches')) {
      store.matches = loaded.matches || [];
    }
    if (datasets.has('history')) {
      store.history = loaded.history || [];
    }
    if (datasets.has('settings') && loaded.settings) {
      store.settings = { ...store.settings, ...loaded.settings };
      store.settingsLoaded = true;
    }

    // Sync current user session with updated records
    if (datasets.has('members') && store.currentUser && store.currentUser.$id) {
      const updatedUser = store.members.find(m => m.$id?.value === store.currentUser.$id?.value);
      if (updatedUser) {
        store.currentUser = updatedUser;
      }
    }

    // Fetch missing members for the latest match (so they display names correctly)
    if (datasets.has('matches') && datasets.has('members') && store.currentUser && store.matches.length > 0) {
      const uId = store.currentUser.$id?.value;
      const userMatches = store.matches.filter(match => {
        const teamAPlayers = (match.teamA?.value || []).map(row => row.value?.playerID_A?.value).filter(Boolean);
        const teamBPlayers = (match.teamB?.value || []).map(row => row.value?.playerID_B?.value).filter(Boolean);
        return teamAPlayers.includes(uId) || teamBPlayers.includes(uId);
      });
      const latestMatch = userMatches.sort((a, b) => {
        const timeA = a.matchDateTime?.value ? new Date(a.matchDateTime.value).getTime() : 0;
        const timeB = b.matchDateTime?.value ? new Date(b.matchDateTime.value).getTime() : 0;
        return timeB - timeA;
      })[0];

      if (latestMatch) {
        const playerIds = [
          ...(latestMatch.teamA?.value || []).map(row => row.value?.playerID_A?.value),
          ...(latestMatch.teamB?.value || []).map(row => row.value?.playerID_B?.value)
        ].filter(Boolean);

        const missingIds = playerIds.filter(id => !store.members.some(m => m.$id?.value === id));
        if (missingIds.length > 0) {
          try {
            const missingMembers = await API.getMembers({ ids: missingIds.join(',') });
            if (missingMembers && missingMembers.length > 0) {
              store.members = [...store.members, ...missingMembers];
            }
          } catch (err) {
            console.error('Failed to fetch missing members for latest match:', err);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to load data:', error);

    if (store.members.length === 0) {
      showFullPageError(
        '資料庫連線失敗！ ⚡',
        '無法與後端伺服器或 Kintone 資料庫取得連線。這可能是您的網路異常或 Astro 開發伺服器離線。',
        () => {
          window.location.reload();
        }
      );
    } else {
      showToast('同步伺服器數據失敗，請檢查網路。', 'error', refreshAllData);
    }
    throw error;
  } finally {
    store.isLoading = false;
  }
}

// Check if a player has any unverified matches in their history
export function playerHasUnverifiedMatches(playerId) {
  return store.matches.some(match => {
    if (match.isVerified?.value === 'true') return false;

    const teamAPlayers = (match.teamA?.value || []).map(row => row.value?.playerID_A?.value).filter(Boolean);
    const teamBPlayers = (match.teamB?.value || []).map(row => row.value?.playerID_B?.value).filter(Boolean);

    return teamAPlayers.includes(playerId) || teamBPlayers.includes(playerId);
  });
}

// Validate tennis score according to standard tennis rules
export function isValidTennisScore(scoreA, scoreB) {
  if (scoreA === scoreB) return false;
  const max = Math.max(scoreA, scoreB);
  const min = Math.min(scoreA, scoreB);

  if (max === 6) {
    return min >= 0 && min <= 4;
  }
  if (max === 7) {
    return min === 5 || min === 6;
  }
  return false;
}
