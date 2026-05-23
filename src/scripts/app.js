// Web App State
const state = {
  currentUser: null,
  currentView: 'view-login',
  members: [],
  teams: [],
  matches: [],
  history: [],
  activeTeamId: null, // Active team selected by user on profile view
  matchMode: 'singles', // 'singles' or 'doubles'
  adminActiveTab: 'members' // 'members' or 'matches'
};

// API Endpoint Helpers
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocal && window.location.port !== '8888'
  ? 'http://localhost:8888/.netlify/functions'
  : '/.netlify/functions';

const API = {
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
    body: JSON.stringify({ id, record: { isVerified: { value: 'true' } } })
  }).then(res => res.json()),

  submitMatch: (matchData) => fetch(`${API_BASE}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(matchData)
  }).then(res => res.json()),

  verifyMatch: (matchID) => fetch(`${API_BASE}/matches`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchID })
  }).then(res => res.json())
};

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none; border:none; color:inherit; font-size:16px; cursor:pointer; font-weight:700;">×</button>
  `;

  toast.querySelector('button').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);
  // Trigger transition
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// Fetch all database records and cache them
async function refreshAllData() {
  try {
    const [members, teams, matches, history] = await Promise.all([
      API.getMembers(),
      API.getTeams(),
      API.getMatches(),
      API.getHistory()
    ]);
    
    state.members = members || [];
    state.teams = teams || [];
    state.matches = matches || [];
    state.history = history || [];
    
    // Sync current user with updated records
    if (state.currentUser) {
      const updatedUser = state.members.find(m => m.$id.value === state.currentUser.$id.value);
      if (updatedUser) {
        state.currentUser = updatedUser;
      }
    }
  } catch (error) {
    console.error('Failed to load data:', error);
    showToast('無法從資料庫同步數據，請檢查網路連線', 'error');
  }
}

// Check if a player has any unverified matches in their history
function playerHasUnverifiedMatches(playerId) {
  return state.matches.some(match => {
    if (match.isVerified.value === 'true') return false;
    
    const teamAPlayers = match.teamA.value.map(row => row.value.playerID_A.value);
    const teamBPlayers = match.teamB.value.map(row => row.value.playerID_B.value);
    
    return teamAPlayers.includes(playerId) || teamBPlayers.includes(playerId);
  });
}

// Navigation / View Router
function navigateTo(viewId) {
  // Hide all views
  document.querySelectorAll('.content-area, .login-container').forEach(view => {
    view.classList.add('hidden');
  });

  // Show target view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
    state.currentView = viewId;
  }

  // Update navbar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-target') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Render view-specific data
  if (viewId === 'view-profile') {
    renderProfile();
  } else if (viewId === 'view-match') {
    renderMatchInput();
  } else if (viewId === 'view-ranking') {
    renderRankings();
  } else if (viewId === 'view-add-member') {
    renderAddMember();
  } else if (viewId === 'view-admin') {
    renderAdminPanel();
  }
}

// 1. LOGIN CONTROLLER
function initLogin() {
  const loginForm = document.getElementById('login-form');
  const loginPhoneInput = document.getElementById('login-phone');
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = loginPhoneInput.value.trim();
    
    if (!/^09[0-9]{8}$/.test(phone)) {
      showToast('手機格式不正確，應為 09 開頭的 10 碼數字', 'error');
      return;
    }
    
    const submitBtn = document.getElementById('btn-login-submit');
    submitBtn.disabled = true;
    submitBtn.querySelector('span').innerText = '驗證中...';
    
    try {
      await refreshAllData();
      
      const foundUser = state.members.find(m => m.playerPhone.value === phone);
      
      if (!foundUser) {
        showToast('找不到此手機號碼的會員，請至「新增會員」註冊', 'error');
        submitBtn.disabled = false;
        submitBtn.querySelector('span').innerText = '驗證並登入';
        return;
      }
      
      // Store user session
      state.currentUser = foundUser;
      localStorage.setItem('tennis_player_phone', phone);
      
      // Setup UI for logged in state
      document.getElementById('btn-logout').classList.remove('hidden');
      document.getElementById('bottom-nav-bar').classList.remove('hidden');
      
      showToast(`歡迎回來，${foundUser.playerName.value}！`, 'success');
      
      // Navigate to Home (Profile Page)
      navigateTo('view-profile');
    } catch (err) {
      showToast('登入失敗: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').innerText = '驗證並登入';
    }
  });
}

// LOGOUT
function performLogout() {
  state.currentUser = null;
  localStorage.removeItem('tennis_player_phone');
  document.getElementById('btn-logout').classList.add('hidden');
  document.getElementById('bottom-nav-bar').classList.add('hidden');
  document.getElementById('login-phone').value = '';
  showToast('您已成功登出', 'info');
  navigateTo('view-login');
}

// 2. PROFILE CONTROLLER
function renderProfile() {
  if (!state.currentUser) return;

  const user = state.currentUser;
  
  // Set name and verification badge
  document.getElementById('profile-name').innerText = user.playerName.value;
  
  const verifiedBadge = document.getElementById('profile-verified-badge');
  if (user.isVerified.value === 'true') {
    verifiedBadge.className = 'badge badge-verified';
    verifiedBadge.innerText = '已驗證';
  } else {
    verifiedBadge.className = 'badge badge-unverified';
    verifiedBadge.innerText = '未驗證';
  }

  // Populate Teams Select dropdown
  const teamSelect = document.getElementById('profile-team-select');
  teamSelect.innerHTML = '';
  
  const userTeams = user.teams.value || [];
  if (userTeams.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.innerText = '無球隊資訊';
    teamSelect.appendChild(opt);
    state.activeTeamId = null;
  } else {
    userTeams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.value.teamID.value;
      opt.innerText = t.value.teamName.value;
      teamSelect.appendChild(opt);
    });
    
    // Set default team
    if (!state.activeTeamId || !userTeams.some(t => t.value.teamID.value === state.activeTeamId)) {
      state.activeTeamId = userTeams[0].value.teamID.value;
    }
    teamSelect.value = state.activeTeamId;
  }

  // Render stats based on selected team
  updateProfileStats();

  // Render Recent Match Card
  const recentMatchPlaceholder = document.getElementById('recent-match-placeholder');
  const recentMatchContent = document.getElementById('recent-match-content');
  
  const currentUserId = user.$id.value;
  
  // Find matches involving this user
  const userMatches = state.matches.filter(match => {
    const teamAPlayers = match.teamA.value.map(row => row.value.playerID_A.value);
    const teamBPlayers = match.teamB.value.map(row => row.value.playerID_B.value);
    return teamAPlayers.includes(currentUserId) || teamBPlayers.includes(currentUserId);
  });

  if (userMatches.length === 0) {
    recentMatchPlaceholder.classList.remove('hidden');
    recentMatchContent.classList.add('hidden');
  } else {
    recentMatchPlaceholder.classList.add('hidden');
    recentMatchContent.classList.remove('hidden');
    
    // Sort matches by datetime descending to get the latest
    userMatches.sort((a, b) => new Date(b.matchDateTime.value) - new Date(a.matchDateTime.value));
    const latestMatch = userMatches[0];

    // Format match date
    const dateObj = new Date(latestMatch.matchDateTime.value);
    const formattedDate = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    document.getElementById('match-date').innerText = formattedDate;

    // Fetch players names
    const getPlayersNames = (subtable, playerField) => {
      return subtable.value.map(row => {
        const pId = row.value[playerField].value;
        const member = state.members.find(m => m.$id.value === pId);
        return member ? member.playerName.value : '未知球員';
      }).join(' / ');
    };

    document.getElementById('match-players-a').innerText = getPlayersNames(latestMatch.teamA, 'playerID_A');
    document.getElementById('match-players-b').innerText = getPlayersNames(latestMatch.teamB, 'playerID_B');
    document.getElementById('match-score').innerText = `${latestMatch.teamA_score.value} : ${latestMatch.teamB_score.value}`;

    // Show unverified asterisk if the latest match is unverified
    if (latestMatch.isVerified.value === 'false') {
      document.getElementById('match-score').innerHTML = `${latestMatch.teamA_score.value} : ${latestMatch.teamB_score.value}<span class="asterisk-red" title="比分審核中">*</span>`;
    }

    // Determine points change from history app
    const userHistories = state.history.filter(h => h.matchID.value === latestMatch.$id.value && h.playerID.value === currentUserId);
    if (userHistories.length > 0) {
      const changeVal = userHistories[0].scoreChange.value;
      const isA = latestMatch.teamA.value.map(row => row.value.playerID_A.value).includes(currentUserId);
      const scoreA = parseInt(latestMatch.teamA_score.value, 10);
      const scoreB = parseInt(latestMatch.teamB_score.value, 10);
      
      const won = (isA && scoreA > scoreB) || (!isA && scoreB > scoreA);
      
      if (won) {
        document.getElementById('match-win-points').innerText = `+${changeVal}`;
        document.getElementById('match-win-points').parentElement.style.fontWeight = 'bold';
        document.getElementById('match-lose-points').innerText = '--';
        document.getElementById('match-lose-points').parentElement.style.fontWeight = 'normal';
      } else {
        document.getElementById('match-win-points').innerText = '--';
        document.getElementById('match-win-points').parentElement.style.fontWeight = 'normal';
        document.getElementById('match-lose-points').innerText = `+${changeVal}`;
        document.getElementById('match-lose-points').parentElement.style.fontWeight = 'bold';
      }
    } else {
      document.getElementById('match-win-points').innerText = '--';
      document.getElementById('match-lose-points').innerText = '--';
    }
  }
}

function updateProfileStats() {
  if (!state.currentUser) return;
  const user = state.currentUser;
  
  // 1. Current Score (including unverified if applicable)
  const currentScore = parseInt(user.currentScore.value, 10) || 0;
  
  // Calculate if player score contains unverified matches
  const hasPending = playerHasUnverifiedMatches(user.$id.value);
  document.getElementById('profile-score').innerHTML = currentScore + (hasPending ? '<span class="asterisk-red" title="包含未審核比賽">*</span>' : '');

  // 2. Personal Ranking (Global ranking among verified players or all players)
  // Sort members by score descending
  const sortedMembers = [...state.members].sort((a, b) => (parseInt(b.currentScore.value, 10) || 0) - (parseInt(a.currentScore.value, 10) || 0));
  const userRankIndex = sortedMembers.findIndex(m => m.$id.value === user.$id.value);
  document.getElementById('profile-rank').innerText = userRankIndex !== -1 ? `# ${userRankIndex + 1}` : '# -';

  // 3. Team Ranking & Total Teams
  if (state.activeTeamId) {
    const sortedTeams = [...state.teams].sort((a, b) => (parseInt(b.teamScore.value, 10) || 0) - (parseInt(a.teamScore.value, 10) || 0));
    const teamRankIndex = sortedTeams.findIndex(t => t.$id.value === state.activeTeamId);
    
    if (teamRankIndex !== -1) {
      document.getElementById('profile-team-rank').innerText = `${teamRankIndex + 1} / ${sortedTeams.length} 隊`;
    } else {
      document.getElementById('profile-team-rank').innerText = `- / ${sortedTeams.length} 隊`;
    }
  } else {
    document.getElementById('profile-team-rank').innerText = '- / - 隊';
  }
}

// 3. MATCH SCORE INPUT CONTROLLER
function renderMatchInput() {
  // Reset select elements
  const selectPlayerA1 = document.getElementById('select-player-a1');
  const selectPlayerA2 = document.getElementById('select-player-a2');
  const selectPlayerB1 = document.getElementById('select-player-b1');
  const selectPlayerB2 = document.getElementById('select-player-b2');
  
  const selectTeamA1 = document.getElementById('select-team-a1');
  const selectTeamA2 = document.getElementById('select-team-a2');
  const selectTeamB1 = document.getElementById('select-team-b1');
  const selectTeamB2 = document.getElementById('select-team-b2');

  // Populate players lists
  const populatePlayersDropdown = (selectEl) => {
    selectEl.innerHTML = '<option value="">選擇球員</option>';
    state.members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.$id.value;
      opt.innerText = `${m.playerName.value} (${m.playerPhone.value.slice(-4)})`;
      selectEl.appendChild(opt);
    });
  };

  populatePlayersDropdown(selectPlayerA1);
  populatePlayersDropdown(selectPlayerA2);
  populatePlayersDropdown(selectPlayerB1);
  populatePlayersDropdown(selectPlayerB2);

  // Clear teams dropdown
  selectTeamA1.innerHTML = '<option value="">選擇球隊</option>';
  selectTeamA2.innerHTML = '<option value="">選擇球隊</option>';
  selectTeamB1.innerHTML = '<option value="">選擇球隊</option>';
  selectTeamB2.innerHTML = '<option value="">選擇球隊</option>';

  // Setup change event listeners to auto populate teams
  const setupAutoTeamLink = (playerSelect, teamSelect) => {
    playerSelect.addEventListener('change', () => {
      const playerId = playerSelect.value;
      teamSelect.innerHTML = '<option value="">選擇球隊</option>';
      
      if (!playerId) return;
      
      const member = state.members.find(m => m.$id.value === playerId);
      if (member && member.teams.value) {
        member.teams.value.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.value.teamID.value;
          opt.innerText = t.value.teamName.value;
          teamSelect.appendChild(opt);
        });
        
        // Auto select the first team
        if (member.teams.value.length > 0) {
          teamSelect.value = member.teams.value[0].value.teamID.value;
        }
      }
    });
  };

  setupAutoTeamLink(selectPlayerA1, selectTeamA1);
  setupAutoTeamLink(selectPlayerA2, selectTeamA2);
  setupAutoTeamLink(selectPlayerB1, selectTeamB1);
  setupAutoTeamLink(selectPlayerB2, selectTeamB2);

  // Set default datetime to now
  const now = new Date();
  // Format to YYYY-MM-DDThh:mm
  const formatDateTimeLocal = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };
  document.getElementById('match-datetime').value = formatDateTimeLocal(now);
}

// Validate tennis score
function isValidTennisScore(scoreA, scoreB) {
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

function initMatchForm() {
  const btnSingles = document.getElementById('btn-match-singles');
  const btnDoubles = document.getElementById('btn-match-doubles');
  const rowA2 = document.getElementById('row-player-a2');
  const rowB2 = document.getElementById('row-player-b2');
  
  const selectPlayerA2 = document.getElementById('select-player-a2');
  const selectTeamA2 = document.getElementById('select-team-a2');
  const selectPlayerB2 = document.getElementById('select-player-b2');
  const selectTeamB2 = document.getElementById('select-team-b2');

  // Toggle Singles / Doubles UI
  btnSingles.addEventListener('click', () => {
    state.matchMode = 'singles';
    btnSingles.classList.add('active');
    btnDoubles.classList.remove('active');
    rowA2.classList.add('hidden');
    rowB2.classList.add('hidden');
    
    selectPlayerA2.required = false;
    selectTeamA2.required = false;
    selectPlayerB2.required = false;
    selectTeamB2.required = false;
  });

  btnDoubles.addEventListener('click', () => {
    state.matchMode = 'doubles';
    btnDoubles.classList.add('active');
    btnSingles.classList.remove('active');
    rowA2.classList.remove('hidden');
    rowB2.classList.remove('hidden');
    
    selectPlayerA2.required = true;
    selectTeamA2.required = true;
    selectPlayerB2.required = true;
    selectTeamB2.required = true;
  });

  // Submit Match Form
  const matchForm = document.getElementById('match-form');
  matchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const matchType = document.getElementById('match-type').value;
    const matchDateTimeLocal = document.getElementById('match-datetime').value;
    // Convert local datetime to ISO UTC format
    const matchDateTime = new Date(matchDateTimeLocal).toISOString();

    const playerA1 = document.getElementById('select-player-a1').value;
    const teamA1 = document.getElementById('select-team-a1').value;
    const playerB1 = document.getElementById('select-player-b1').value;
    const teamB1 = document.getElementById('select-team-b1').value;

    const scoreA = parseInt(document.getElementById('score-a').value, 10);
    const scoreB = parseInt(document.getElementById('score-b').value, 10);

    // Collect all players involved
    const playersList = [playerA1, playerB1];
    
    const teamA = [{ playerID: playerA1, teamID: teamA1 }];
    const teamB = [{ playerID: playerB1, teamID: teamB1 }];

    if (state.matchMode === 'doubles') {
      const playerA2 = selectPlayerA2.value;
      const teamA2 = selectTeamA2.value;
      const playerB2 = selectPlayerB2.value;
      const teamB2 = selectTeamB2.value;

      playersList.push(playerA2, playerB2);
      teamA.push({ playerID: playerA2, teamID: teamA2 });
      teamB.push({ playerID: playerB2, teamID: teamB2 });
    }

    // 1. Validation - Duplicate players
    const uniquePlayers = new Set(playersList);
    if (uniquePlayers.size !== playersList.length) {
      showToast('同一個球員不能重複出現在不同的對戰位置！', 'error');
      return;
    }

    // 2. Validation - Score
    if (!isValidTennisScore(scoreA, scoreB)) {
      showToast('比數不符合網球規則！(需為 6-0~6-4, 7-5, 或 7-6 搶七)', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-match');
    submitBtn.disabled = true;
    submitBtn.querySelector('span').innerText = '發送中...';

    try {
      const res = await API.submitMatch({
        matchDateTime,
        teamA,
        teamB,
        teamA_score: scoreA,
        teamB_score: scoreB,
        matchType
      });

      if (res.success) {
        showToast('比分紀錄已成功提交審核！', 'success');
        
        // Refresh local data cache
        await refreshAllData();
        
        // Return to Home (Profile Page)
        navigateTo('view-profile');
      } else {
        showToast('提交比分失敗: ' + (res.error || '未知錯誤'), 'error');
      }
    } catch (err) {
      showToast('網路錯誤，提交失敗: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').innerText = '送出比分紀錄';
    }
  });
}

// 4. RANKINGS CONTROLLER
let currentRankingsTab = 'individual'; // 'individual' or 'team'
let chartInstance = null;

function renderRankings() {
  const filter = document.getElementById('ranking-team-filter');
  
  // Populate filter dropdown with teams
  // Keep the 'all' option
  filter.innerHTML = '<option value="all">所有球隊 / 整體排行</option>';
  state.teams.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.$id.value;
    opt.innerText = t.teamName.value;
    filter.appendChild(opt);
  });

  updateRankingsList();
}

function updateRankingsList() {
  const container = document.getElementById('ranking-items-container');
  container.innerHTML = '';

  const filterTeamId = document.getElementById('ranking-team-filter').value;
  
  if (currentRankingsTab === 'individual') {
    // Filter players by team if selected
    let filteredPlayers = [...state.members];
    if (filterTeamId !== 'all') {
      filteredPlayers = filteredPlayers.filter(m => {
        const teams = m.teams.value || [];
        return teams.some(t => t.value.teamID.value === filterTeamId);
      });
    }

    // Sort by currentScore descending
    filteredPlayers.sort((a, b) => (parseInt(b.currentScore.value, 10) || 0) - (parseInt(a.currentScore.value, 10) || 0));

    // Render list
    filteredPlayers.forEach((player, idx) => {
      const score = parseInt(player.currentScore.value, 10) || 0;
      const matchesCount = parseInt(player.totalMatches.value, 10) || 0;
      
      const unverifiedPlayer = player.isVerified.value === 'false';
      const unverifiedScore = playerHasUnverifiedMatches(player.$id.value);

      const item = document.createElement('div');
      item.className = 'ranking-item';
      
      // Avatar text (first letter of name)
      const avatarText = player.playerName.value.slice(0, 1);

      // Get player teams names
      const teamNames = (player.teams.value || []).map(t => t.value.teamName.value).join(', ') || '無球隊';

      item.innerHTML = `
        <div class="ranking-badge">${idx + 1}</div>
        <div class="ranking-avatar">${avatarText}</div>
        <div class="ranking-details">
          <div class="ranking-name">
            ${player.playerName.value}
            ${unverifiedPlayer ? '<span class="asterisk-red" title="待驗證會員">*</span>' : ''}
          </div>
          <div class="ranking-team">${teamNames}</div>
        </div>
        <div class="ranking-score-box">
          <div class="ranking-score">
            ${score}
            ${unverifiedScore ? '<span class="asterisk-red" title="包含待驗證積分">*</span>' : ''}
          </div>
          <div class="ranking-matches">${matchesCount} 場出賽</div>
        </div>
      `;
      container.appendChild(item);
    });

    if (filteredPlayers.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:var(--color-text-muted); padding:20px;">無符合條件的球員</div>';
    }

    // Render Chart (Top 5)
    const topPlayers = filteredPlayers.slice(0, 5);
    const labels = topPlayers.map(p => p.playerName.value);
    const scores = topPlayers.map(p => parseInt(p.currentScore.value, 10) || 0);
    drawRankingsChart(labels, scores, '積分');

  } else {
    // Team Rankings
    let filteredTeams = [...state.teams];
    
    // Sort teams by teamScore descending
    filteredTeams.sort((a, b) => (parseInt(b.teamScore.value, 10) || 0) - (parseInt(a.teamScore.value, 10) || 0));

    // If filter is specific, we show that team's players instead!
    // This perfectly matches "球隊排名需增加切換球隊的下拉選單，讓使用者可以查看不同球隊的排名"
    if (filterTeamId !== 'all') {
      const selectedTeam = state.teams.find(t => t.$id.value === filterTeamId);
      const teamNameStr = selectedTeam ? selectedTeam.teamName.value : '該球隊';
      
      container.innerHTML = `<div style="font-weight:700; margin-bottom: 8px; font-size:14px; color:var(--color-primary);">${teamNameStr} 成員榜：</div>`;

      // Filter members belonging to this team
      let teamPlayers = state.members.filter(m => {
        const teams = m.teams.value || [];
        return teams.some(t => t.value.teamID.value === filterTeamId);
      });

      // Sort by score descending
      teamPlayers.sort((a, b) => (parseInt(b.currentScore.value, 10) || 0) - (parseInt(a.currentScore.value, 10) || 0));

      teamPlayers.forEach((player, idx) => {
        const score = parseInt(player.currentScore.value, 10) || 0;
        const matchesCount = parseInt(player.totalMatches.value, 10) || 0;
        
        const unverifiedPlayer = player.isVerified.value === 'false';
        const unverifiedScore = playerHasUnverifiedMatches(player.$id.value);

        const item = document.createElement('div');
        item.className = 'ranking-item';
        
        item.innerHTML = `
          <div class="ranking-badge">${idx + 1}</div>
          <div class="ranking-avatar">${player.playerName.value.slice(0,1)}</div>
          <div class="ranking-details">
            <div class="ranking-name">
              ${player.playerName.value}
              ${unverifiedPlayer ? '<span class="asterisk-red" title="待驗證會員">*</span>' : ''}
            </div>
            <div class="ranking-team">${teamNameStr}</div>
          </div>
          <div class="ranking-score-box">
            <div class="ranking-score">
              ${score}
              ${unverifiedScore ? '<span class="asterisk-red" title="包含待驗證積分">*</span>' : ''}
            </div>
            <div class="ranking-matches">${matchesCount} 場出賽</div>
          </div>
        `;
        container.appendChild(item);
      });

      if (teamPlayers.length === 0) {
        container.innerHTML += '<div style="text-align:center; color:var(--color-text-muted); padding:20px;">此球隊目前無球員</div>';
      }

      // Draw chart of players in the selected team
      const topTeamPlayers = teamPlayers.slice(0, 5);
      drawRankingsChart(topTeamPlayers.map(p => p.playerName.value), topTeamPlayers.map(p => parseInt(p.currentScore.value, 10) || 0), `${teamNameStr}球員積分`);

    } else {
      // Show list of all teams and their scores
      filteredTeams.forEach((team, idx) => {
        const score = parseInt(team.teamScore.value, 10) || 0;
        
        // Count number of verified members in this team
        const membersCount = state.members.filter(m => 
          (m.teams.value || []).some(t => t.value.teamID.value === team.$id.value)
        ).length;

        const item = document.createElement('div');
        item.className = 'ranking-item';

        item.innerHTML = `
          <div class="ranking-badge">${idx + 1}</div>
          <div class="ranking-avatar" style="background-color:#FFF2E6; color:var(--color-accent-dark);">🛡️</div>
          <div class="ranking-details">
            <div class="ranking-name">${team.teamName.value}</div>
            <div class="ranking-team">${membersCount} 位成員</div>
          </div>
          <div class="ranking-score-box">
            <div class="ranking-score">${score} 分</div>
            <div class="ranking-matches">團隊總積分</div>
          </div>
        `;
        container.appendChild(item);
      });

      if (filteredTeams.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--color-text-muted); padding:20px;">無球隊數據</div>';
      }

      // Draw chart of all teams
      const topTeams = filteredTeams.slice(0, 5);
      drawRankingsChart(topTeams.map(t => t.teamName.value), topTeams.map(t => parseInt(t.teamScore.value, 10) || 0), '團隊分數', 'bar');
    }
  }
}

function drawRankingsChart(labels, dataValues, datasetLabel, type = 'bar') {
  const ctx = document.getElementById('ranking-chart');
  const placeholder = document.getElementById('chart-placeholder');
  
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  if (labels.length === 0) {
    placeholder.style.display = 'block';
    ctx.style.display = 'none';
    return;
  } else {
    placeholder.style.display = 'none';
    ctx.style.display = 'block';
  }

  // Use Accent Orange or Forest Green based on dataset label
  const isTeam = datasetLabel.includes('團隊');
  const chartColor = isTeam ? '#F7941D' : '#1D5D3A';

  // Make sure Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded yet');
    return;
  }

  chartInstance = new Chart(ctx, {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: datasetLabel,
        data: dataValues,
        backgroundColor: chartColor,
        borderColor: chartColor,
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 20
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          titleFont: { family: 'Outfit', weight: 'bold' },
          bodyFont: { family: 'Outfit' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { family: 'Outfit', size: 10 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Outfit', size: 10 } }
        }
      }
    }
  });
}

function initRankings() {
  const btnIndividual = document.getElementById('btn-rank-individual');
  const btnTeam = document.getElementById('btn-rank-team');
  const filter = document.getElementById('ranking-team-filter');

  btnIndividual.addEventListener('click', () => {
    currentRankingsTab = 'individual';
    btnIndividual.classList.add('active');
    btnTeam.classList.remove('active');
    updateRankingsList();
  });

  btnTeam.addEventListener('click', () => {
    currentRankingsTab = 'team';
    btnTeam.classList.add('active');
    btnIndividual.classList.remove('active');
    updateRankingsList();
  });

  filter.addEventListener('change', () => {
    updateRankingsList();
  });
}

// 5. ADD MEMBER CONTROLLER
function renderAddMember() {
  const checkboxContainer = document.getElementById('member-teams-checkboxes');
  checkboxContainer.innerHTML = '';
  
  if (state.teams.length === 0) {
    checkboxContainer.innerHTML = '<div style="color:var(--color-text-muted); font-size:14px; padding:4px 0;">目前無可選球隊</div>';
    return;
  }

  // Populate checkboxes
  state.teams.forEach(t => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    label.innerHTML = `
      <input type="checkbox" name="reg-teams" value="${t.$id.value}" data-name="${t.teamName.value}" />
      <span>${t.teamName.value}</span>
    `;
    checkboxContainer.appendChild(label);
  });
}

function initAddMember() {
  const addForm = document.getElementById('add-member-form');
  
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('member-name').value.trim();
    const phone = document.getElementById('member-phone').value.trim();
    const gender = document.querySelector('input[name="member-gender"]:checked').value;
    
    // Collect selected teams
    const checkboxes = document.querySelectorAll('input[name="reg-teams"]:checked');
    const selectedTeams = Array.from(checkboxes).map(cb => ({
      value: {
        teamID: { type: 'NUMBER', value: cb.value },
        teamName: { type: 'SINGLE_LINE_TEXT', value: cb.getAttribute('data-name') }
      }
    }));

    if (selectedTeams.length === 0) {
      showToast('請至少選擇一個代表球隊！', 'error');
      return;
    }

    if (!/^09[0-9]{8}$/.test(phone)) {
      showToast('手機格式不正確，應為 09 開頭的 10 碼數字', 'error');
      return;
    }

    // Check if phone number is already registered in members cache
    const duplicate = state.members.some(m => m.playerPhone.value === phone);
    if (duplicate) {
      showToast('該手機號碼已經註冊，請直接登入！', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-member');
    submitBtn.disabled = true;
    submitBtn.querySelector('span').innerText = '發送中...';

    // Format new member record for Kintone
    const record = {
      playerName: { value: name },
      playerPhone: { value: phone },
      gender: { value: gender },
      currentScore: { value: '0' },
      totalMatches: { value: '0' },
      isVerified: { value: 'false' }, // Requires admin verification
      teams: { value: selectedTeams }
    };

    try {
      const res = await API.addMember(record);
      if (res.id) {
        showToast('註冊成功！帳號目前為【未驗證】狀態，請聯絡管理員核准。', 'success');
        
        // Reset form
        addForm.reset();
        
        // Refresh local cache
        await refreshAllData();
        
        // Route to login or profile
        if (!state.currentUser) {
          navigateTo('view-login');
        } else {
          navigateTo('view-profile');
        }
      } else {
        showToast('註冊失敗: ' + (res.error || '未知錯誤'), 'error');
      }
    } catch (err) {
      showToast('註冊失敗: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').innerText = '新增並提交審核';
    }
  });
}

// 6. ADMIN PANEL CONTROLLER
function renderAdminPanel() {
  const membersPlaceholder = document.getElementById('admin-members-placeholder');
  const membersList = document.getElementById('admin-members-list');
  const matchesPlaceholder = document.getElementById('admin-matches-placeholder');
  const matchesList = document.getElementById('admin-matches-list');

  // Clear lists
  membersList.innerHTML = '';
  matchesList.innerHTML = '';

  // 1. Render Unverified Members
  const unverifiedMembers = state.members.filter(m => m.isVerified.value === 'false');
  
  if (unverifiedMembers.length === 0) {
    membersPlaceholder.classList.remove('hidden');
    membersPlaceholder.innerText = '目前沒有待審核的會員';
    membersList.classList.add('hidden');
  } else {
    membersPlaceholder.classList.add('hidden');
    membersList.classList.remove('hidden');

    unverifiedMembers.forEach(m => {
      const teamNames = (m.teams.value || []).map(t => t.value.teamName.value).join(', ');
      
      const card = document.createElement('div');
      card.className = 'card admin-card';
      card.innerHTML = `
        <div class="admin-card-header">
          <span class="admin-card-title">${m.playerName.value} (${m.gender.value})</span>
          <span class="badge badge-unverified">待驗證</span>
        </div>
        <div class="admin-card-detail">手機：${m.playerPhone.value}</div>
        <div class="admin-card-detail">代表隊伍：${teamNames}</div>
        <button type="button" class="btn btn-primary btn-sm btn-verify-member" data-id="${m.$id.value}">
          核准驗證
        </button>
      `;
      membersList.appendChild(card);
    });

    // Wire up events
    document.querySelectorAll('.btn-verify-member').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.innerText = '處理中...';
        
        try {
          const res = await API.verifyMember(id);
          showToast('會員驗證成功！', 'success');
          await refreshAllData();
          renderAdminPanel();
        } catch (err) {
          showToast('驗證失敗: ' + err.message, 'error');
          btn.disabled = false;
          btn.innerText = '核准驗證';
        }
      });
    });
  }

  // 2. Render Unverified Matches
  const unverifiedMatches = state.matches.filter(m => m.isVerified.value === 'false');

  if (unverifiedMatches.length === 0) {
    matchesPlaceholder.classList.remove('hidden');
    matchesPlaceholder.innerText = '目前沒有待審核的比賽比分';
    matchesList.classList.add('hidden');
  } else {
    matchesPlaceholder.classList.add('hidden');
    matchesList.classList.remove('hidden');

    unverifiedMatches.forEach(match => {
      const getPlayersNames = (subtable, playerField) => {
        return subtable.value.map(row => {
          const pId = row.value[playerField].value;
          const member = state.members.find(mem => mem.$id.value === pId);
          return member ? member.playerName.value : '未知球員';
        }).join(' / ');
      };

      const dateObj = new Date(match.matchDateTime.value);
      const formattedDate = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

      const playersA = getPlayersNames(match.teamA, 'playerID_A');
      const playersB = getPlayersNames(match.teamB, 'playerID_B');

      const card = document.createElement('div');
      card.className = 'card admin-card';
      card.innerHTML = `
        <div class="admin-card-header">
          <span class="admin-card-title">比賽比分審核 (ID: ${match.$id.value})</span>
          <span class="badge badge-unverified">未入帳</span>
        </div>
        <div class="admin-card-detail">時間：${formattedDate}</div>
        <div class="admin-card-detail" style="font-weight:700; color:var(--color-primary); font-size:14px; margin: 4px 0;">
          ${playersA} (${match.teamA_score.value})  VS  (${match.teamB_score.value}) ${playersB}
        </div>
        <button type="button" class="btn btn-accent btn-sm btn-verify-match" data-id="${match.$id.value}" style="color:white;">
          核准過帳 (計算積分)
        </button>
      `;
      matchesList.appendChild(card);
    });

    // Wire up events
    document.querySelectorAll('.btn-verify-match').forEach(btn => {
      btn.addEventListener('click', async () => {
        const matchID = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.innerText = '處理中...';
        
        try {
          const res = await API.verifyMatch(matchID);
          if (res.success) {
            showToast('比分已成功驗證並過帳！球員與球隊積分已更新。', 'success');
            await refreshAllData();
            renderAdminPanel();
          } else {
            showToast('核准過帳失敗: ' + (res.error || '未知錯誤'), 'error');
            btn.disabled = false;
            btn.innerText = '核准過帳 (計算積分)';
          }
        } catch (err) {
          showToast('網路錯誤，核准失敗: ' + err.message, 'error');
          btn.disabled = false;
          btn.innerText = '核准過帳 (計算積分)';
        }
      });
    });
  }
}

function initAdminPanel() {
  const btnTabMembers = document.getElementById('btn-admin-tab-members');
  const btnTabMatches = document.getElementById('btn-admin-tab-matches');
  const sectionMembers = document.getElementById('admin-members-section');
  const sectionMatches = document.getElementById('admin-matches-section');
  const btnBack = document.getElementById('btn-admin-back');

  btnTabMembers.addEventListener('click', () => {
    state.adminActiveTab = 'members';
    btnTabMembers.classList.add('active');
    btnTabMatches.classList.remove('active');
    sectionMembers.classList.remove('hidden');
    sectionMatches.classList.add('hidden');
    renderAdminPanel();
  });

  btnTabMatches.addEventListener('click', () => {
    state.adminActiveTab = 'matches';
    btnTabMatches.classList.add('active');
    btnTabMembers.classList.remove('active');
    sectionMatches.classList.remove('hidden');
    sectionMembers.classList.add('hidden');
    renderAdminPanel();
  });

  btnBack.addEventListener('click', () => {
    navigateTo('view-profile');
  });

  // Wire up profile shortcut
  document.getElementById('admin-shortcut').addEventListener('click', () => {
    navigateTo('view-admin');
  });
}

// BOTTOM NAVIGATION CONTROLLER
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-target');
      navigateTo(targetView);
    });
  });

  // Logout Button
  document.getElementById('btn-logout').addEventListener('click', () => {
    performLogout();
  });

  // Profile Team Select change
  document.getElementById('profile-team-select').addEventListener('change', (e) => {
    state.activeTeamId = e.target.value;
    updateProfileStats();
  });
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Controllers
  initNavigation();
  initLogin();
  initMatchForm();
  initRankings();
  initAddMember();
  initAdminPanel();

  // Try auto login from local storage
  const savedPhone = localStorage.getItem('tennis_player_phone');
  
  if (savedPhone) {
    try {
      await refreshAllData();
      const foundUser = state.members.find(m => m.playerPhone.value === savedPhone);
      
      if (foundUser) {
        state.currentUser = foundUser;
        document.getElementById('btn-logout').classList.remove('hidden');
        document.getElementById('bottom-nav-bar').classList.remove('hidden');
        navigateTo('view-profile');
        showToast(`歡迎回來，${foundUser.playerName.value}！`, 'success');
        return;
      }
    } catch (err) {
      console.warn('Auto login failed:', err);
    }
  }

  // Default view
  navigateTo('view-login');
});
