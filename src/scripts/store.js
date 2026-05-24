import { reactive } from 'vue';

// API Endpoint Helpers
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = typeof window !== 'undefined' && isLocal && window.location.port !== '8888'
  ? 'http://localhost:8888/.netlify/functions'
  : '/.netlify/functions';

export const API = {
  getMembers: () => fetch(`${API_BASE}/members`).then(res => res.json()),
  getTeams: () => fetch(`${API_BASE}/teams`).then(res => res.json()),
  getMatches: () => fetch(`${API_BASE}/matches`).then(res => res.json()),
  getHistory: () => fetch(`${API_BASE}/history`).then(res => res.json()),
  
  addMember: (record) => fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record })
  }).then(res => res.json()),

  verifyMember: (id) => fetch(`${API_BASE}/members`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  }).then(res => res.json()),

  submitMatch: (data) => fetch(`${API_BASE}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),

  verifyMatch: (matchID) => fetch(`${API_BASE}/matches`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchID })
  }).then(res => res.json())
};

export const store = reactive({
  currentUser: null,
  currentView: 'view-login',
  members: [],
  teams: [],
  matches: [],
  history: [],
  activeTeamId: null,
  matchMode: 'doubles',
  adminActiveTab: 'members',
  toasts: [],
  fullPageError: null,
  isLoading: false
});

// Show lightweight toast notifications
export function showToast(message, type = 'info') {
  const id = Date.now() + Math.random().toString(36).substr(2, 9);
  const toastObj = { id, message, type };
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

// Fetch all database records and cache them in store
export async function refreshAllData() {
  try {
    store.isLoading = true;
    const [members, teams, matches, history] = await Promise.all([
      API.getMembers(),
      API.getTeams(),
      API.getMatches(),
      API.getHistory()
    ]);
    
    store.members = members || [];
    store.teams = (teams || []).sort((a, b) => {
      const idA = a.teamID?.value || '';
      const idB = b.teamID?.value || '';
      return idA.localeCompare(idB);
    });
    store.matches = matches || [];
    store.history = history || [];
    
    // Sync current user session with updated records
    if (store.currentUser) {
      const updatedUser = store.members.find(m => m.$id.value === store.currentUser.$id.value);
      if (updatedUser) {
        store.currentUser = updatedUser;
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
    if (match.isVerified.value === 'true') return false;
    
    const teamAPlayers = match.teamA.value.map(row => row.value.playerID_A.value);
    const teamBPlayers = match.teamB.value.map(row => row.value.playerID_B.value);
    
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
