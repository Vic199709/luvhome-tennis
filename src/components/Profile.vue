<script setup>
import { computed } from 'vue';
import { store, playerHasUnverifiedMatches } from '../scripts/store';

const user = computed(() => store.currentUser);

const userTeams = computed(() => {
  if (!user.value) return [];
  return user.value.teams?.value || [];
});

// Watch and automatically set activeTeamId if not set
const activeTeamId = computed({
  get() {
    if (!store.activeTeamId && userTeams.value.length > 0) {
      store.activeTeamId = userTeams.value[0].value.teamID.value;
    }
    return store.activeTeamId;
  },
  set(val) {
    store.activeTeamId = val;
  }
});

// 1. Stats Calculations
const personalRank = computed(() => {
  if (!user.value) return '-';
  const sortedMembers = [...store.members].sort(
    (a, b) => (parseInt(b.currentScore.value, 10) || 0) - (parseInt(a.currentScore.value, 10) || 0)
  );
  const rankIndex = sortedMembers.findIndex(m => m.$id.value === user.value.$id.value);
  return rankIndex !== -1 ? `# ${rankIndex + 1}` : '# -';
});

const teamRank = computed(() => {
  if (!activeTeamId.value) return '- / - 隊';
  const sortedTeams = [...store.teams].sort(
    (a, b) => (parseInt(b.teamScore.value, 10) || 0) - (parseInt(a.teamScore.value, 10) || 0)
  );
  const rankIndex = sortedTeams.findIndex(t => t.$id.value === activeTeamId.value);
  return rankIndex !== -1 ? `${rankIndex + 1} / ${sortedTeams.length} 隊` : `- / ${sortedTeams.length} 隊`;
});

const hasPending = computed(() => {
  if (!user.value) return false;
  return playerHasUnverifiedMatches(user.value.$id.value);
});

const displayScore = computed(() => {
  if (!user.value) return '-';
  return parseInt(user.value.currentScore.value, 10) || 0;
});

// 2. Latest Match Calculations
const userMatches = computed(() => {
  if (!user.value) return [];
  const uId = user.value.$id.value;
  return store.matches.filter(match => {
    const teamAPlayers = match.teamA.value.map(row => row.value.playerID_A.value);
    const teamBPlayers = match.teamB.value.map(row => row.value.playerID_B.value);
    return teamAPlayers.includes(uId) || teamBPlayers.includes(uId);
  });
});

const latestMatch = computed(() => {
  if (userMatches.value.length === 0) return null;
  return [...userMatches.value].sort((a, b) => new Date(b.matchDateTime.value) - new Date(a.matchDateTime.value))[0];
});

const latestMatchDate = computed(() => {
  if (!latestMatch.value) return '-';
  const dateObj = new Date(latestMatch.value.matchDateTime.value);
  return `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
});

const getPlayersNames = (subtable, playerField) => {
  if (!subtable || !subtable.value) return '-';
  return subtable.value.map(row => {
    const pId = row.value[playerField].value;
    const member = store.members.find(m => m.$id.value === pId);
    return member ? member.playerName.value : '未知球員';
  }).join(' / ');
};

const playersAName = computed(() => {
  if (!latestMatch.value) return '-';
  return getPlayersNames(latestMatch.value.teamA, 'playerID_A');
});

const playersBName = computed(() => {
  if (!latestMatch.value) return '-';
  return getPlayersNames(latestMatch.value.teamB, 'playerID_B');
});

const latestMatchScoreStr = computed(() => {
  if (!latestMatch.value) return '- : -';
  return `${latestMatch.value.teamA_score.value} : ${latestMatch.value.teamB_score.value}`;
});

const latestMatchIsUnverified = computed(() => {
  return latestMatch.value && latestMatch.value.isVerified.value === 'false';
});

const latestMatchPointsChange = computed(() => {
  if (!latestMatch.value || !user.value) return { winPoints: '--', losePoints: '--', isWinBold: false, isLoseBold: false };
  
  const currentUserId = user.value.$id.value;
  const userHistories = store.history.filter(
    h => h.matchID.value === latestMatch.value.$id.value && h.playerID.value === currentUserId
  );
  
  if (userHistories.length > 0) {
    const changeVal = userHistories[0].scoreChange.value;
    const isA = latestMatch.value.teamA.value.map(row => row.value.playerID_A.value).includes(currentUserId);
    const scoreA = parseInt(latestMatch.value.teamA_score.value, 10);
    const scoreB = parseInt(latestMatch.value.teamB_score.value, 10);
    const won = (isA && scoreA > scoreB) || (!isA && scoreB > scoreA);
    
    if (won) {
      return { winPoints: `+${changeVal}`, losePoints: '--', isWinBold: true, isLoseBold: false };
    } else {
      return { winPoints: '--', losePoints: `+${changeVal}`, isWinBold: false, isLoseBold: true };
    }
  }
  
  return { winPoints: '--', losePoints: '--', isWinBold: false, isLoseBold: false };
});

const enterAdmin = () => {
  store.currentView = 'view-admin';
};
</script>

<template>
  <div class="content-area">
    <!-- Profile Card -->
    <div class="profile-card" v-if="user">
      <div class="profile-card-top">
        <div class="profile-avatar-container">
          <div class="profile-avatar">👤</div>
          <span 
            :class="['badge', user.isVerified.value === 'true' ? 'badge-verified' : 'badge-unverified']"
          >
            {{ user.isVerified.value === 'true' ? '已驗證' : '未驗證' }}
          </span>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">{{ user.playerName.value }}</h2>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; opacity: 0.8;">所屬球隊</label>
            <select v-model="activeTeamId" class="profile-team-select">
              <option value="" v-if="userTeams.length === 0">無球隊資訊</option>
              <option 
                v-for="t in userTeams" 
                :key="t.value.teamID.value" 
                :value="t.value.teamID.value"
              >
                {{ t.value.teamName.value }}
              </option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="profile-stats-grid">
        <div class="profile-stat-box">
          <span class="profile-stat-label">個人排名</span>
          <span class="profile-stat-value">{{ personalRank }}</span>
        </div>
        <div class="profile-stat-box">
          <span class="profile-stat-label">球隊排名</span>
          <span class="profile-stat-value">{{ teamRank }}</span>
        </div>
        <div class="profile-stat-box">
          <span class="profile-stat-label">目前積分</span>
          <span class="profile-stat-value">
            {{ displayScore }}
            <span v-if="hasPending" class="asterisk-red" title="包含未審核比賽">*</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Admin Shortcut -->
    <div @click="enterAdmin" class="card admin-shortcut-card">
      <div class="admin-shortcut-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>管理員主控台</span>
      </div>
      <button class="btn btn-sm btn-accent" style="width: auto;">進入審核</button>
    </div>

    <!-- Recent Match Section -->
    <div>
      <h3 class="section-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        最近比賽結果
      </h3>
      
      <div class="recent-match-card">
        <div v-if="!latestMatch" style="text-align: center; color: var(--color-text-muted); padding: 12px 0; font-size: 14px;">
          尚無對戰紀錄
        </div>
        
        <div v-else>
          <div class="match-item-wrapper">
            <div class="match-item-left">
              <div class="match-date-row">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>{{ latestMatchDate }}</span>
              </div>
              <div class="match-versus-row">
                <span>{{ playersAName }}</span>
                <span class="match-score-bold">
                  {{ latestMatchScoreStr }}
                  <span v-if="latestMatchIsUnverified" class="asterisk-red" title="比分審核中">*</span>
                </span>
                <span>{{ playersBName }}</span>
              </div>
              <div class="match-points-row">
                <span class="match-points-badge match-points-win" :style="{ fontWeight: latestMatchPointsChange.isWinBold ? 'bold' : 'normal' }">
                  🏆 勝方 <span>{{ latestMatchPointsChange.winPoints }}</span> 分
                </span>
                <span class="match-points-badge match-points-lose" :style="{ fontWeight: latestMatchPointsChange.isLoseBold ? 'bold' : 'normal' }">
                  🔥 負方 <span>{{ latestMatchPointsChange.losePoints }}</span> 分
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Rules block -->
        <div class="rules-container">
          <div class="rules-title">聯盟積分計算規則</div>
          <ul class="rules-list">
            <li>平日積分：勝方 10 分，負方 3 分</li>
            <li>週六 (挑戰日)：勝方 15 分，負方 5 分</li>
            <li>季賽、年終賽：勝方 30 分，負方 10 分</li>
            <li>其餘賽制積分另行公告</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
