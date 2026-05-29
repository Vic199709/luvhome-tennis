<script setup>
import { computed, ref, watch } from 'vue';
import { store, playerHasUnverifiedMatches, getWinningTeamIdsForHistory } from '../scripts/store';
import multiavatar from '@multiavatar/multiavatar';

const user = computed(() => store.currentUser);

const userTeams = computed(() => {
  if (!user.value) return [];
  const teams = (user.value.teams?.value || []).filter(teamRow => teamRow && teamRow.value);
  return [...teams].sort((a, b) => {
    const idA = a.value?.teamID?.value || '';
    const idB = b.value?.teamID?.value || '';
    return idA.localeCompare(idB);
  });
});

import ModalSelect from './ModalSelect.vue';

const profileTeamOptions = computed(() => {
  return userTeams.value.map(t => ({
    value: t.value?.teamID?.value || '',
    label: t.value?.teamName?.value || ''
  }));
});

// Watch and automatically set activeTeamId if not set
const activeTeamId = computed({
  get() {
    return store.activeTeamId;
  },
  set(val) {
    store.activeTeamId = val;
  }
});

watch(userTeams, (newTeams) => {
  if (!store.activeTeamId && newTeams.length > 0) {
    store.activeTeamId = newTeams[0].value?.teamID?.value;
  }
}, { immediate: true });

// 1. Stats Calculations
const personalRank = computed(() => {
  if (!user.value || !activeTeamId.value) return '-';
  const uId = user.value.$id?.value;
  const tId = activeTeamId.value;

  const list = [];
  store.members.forEach(member => {
    const memberTeams = member.teams?.value || [];
    memberTeams.forEach(t => {
      const teamId = t.value?.teamID?.value;
      if (!teamId) return;
      const playerTeamHistories = store.history.filter(h => {
        return h.playerID?.value === member.$id?.value && h.teamID?.value === teamId;
      });
      const score = playerTeamHistories.reduce((sum, h) => {
        return sum + (parseInt(h.pointChange?.value, 10) || 0);
      }, 0);
      list.push({
        playerID: member.$id?.value,
        teamID: teamId,
        score: score
      });
    });
  });

  list.sort((a, b) => b.score - a.score);
  const rankIndex = list.findIndex(item => item.playerID === uId && item.teamID === tId);
  return rankIndex !== -1 ? `${rankIndex + 1}` : '-';
});

const teamRank = computed(() => {
  if (!activeTeamId.value) return '- / - 隊';
  const sortedTeams = [...store.teams].sort(
    (a, b) => (parseInt(b.teamScore?.value, 10) || 0) - (parseInt(a.teamScore?.value, 10) || 0)
  );
  const rankIndex = sortedTeams.findIndex(t => t.teamID?.value === activeTeamId.value);
  return rankIndex !== -1 ? `${rankIndex + 1} / ${sortedTeams.length} 隊` : `- / ${sortedTeams.length} 隊`;
});

const hasPending = computed(() => {
  if (!user.value || !user.value.$id) return false;
  return playerHasUnverifiedMatches(user.value.$id.value);
});

const showVerificationHint = ref(false);
const toggleVerificationHint = () => {
  showVerificationHint.value = !showVerificationHint.value;
  if (showVerificationHint.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

const showRulesHint = ref(false);
const toggleRulesHint = () => {
  showRulesHint.value = !showRulesHint.value;
  if (showRulesHint.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

const displayScore = computed(() => {
  if (!user.value || !activeTeamId.value) return 0;
  const uId = user.value.$id?.value;
  const tId = activeTeamId.value;
  const playerTeamHistories = store.history.filter(h => {
    return h.playerID?.value === uId && h.teamID?.value === tId;
  });
  return playerTeamHistories.reduce((sum, h) => {
    return sum + (parseInt(h.pointChange?.value, 10) || 0);
  }, 0);
});

// 2. Latest Match Calculations
const userMatches = computed(() => {
  if (!user.value || !user.value.$id) return [];
  const uId = user.value.$id.value;
  return store.matches.filter(match => {
    const teamAPlayers = (match.teamA?.value || []).map(row => row.value?.playerID_A?.value).filter(Boolean);
    const teamBPlayers = (match.teamB?.value || []).map(row => row.value?.playerID_B?.value).filter(Boolean);
    return teamAPlayers.includes(uId) || teamBPlayers.includes(uId);
  });
});

const latestMatch = computed(() => {
  if (userMatches.value.length === 0) return null;
  return [...userMatches.value].sort((a, b) => {
    const timeA = a.matchDateTime?.value ? new Date(a.matchDateTime.value).getTime() : 0;
    const timeB = b.matchDateTime?.value ? new Date(b.matchDateTime.value).getTime() : 0;
    return timeB - timeA;
  })[0];
});

const latestMatchDate = computed(() => {
  if (!latestMatch.value || !latestMatch.value.matchDateTime?.value) return '-';
  const dateObj = new Date(latestMatch.value.matchDateTime.value);
  return `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
});

const getPlayersNames = (subtable, playerField) => {
  if (!subtable || !subtable.value) return '-';
  return subtable.value.map(row => {
    const pId = row.value?.[playerField]?.value;
    if (!pId) return '未知球員';
    const member = store.members.find(m => m.$id?.value === pId);
    return member ? member.playerName?.value || '未知球員' : '未知球員';
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
  return `${latestMatch.value.teamA_score?.value || '-'} : ${latestMatch.value.teamB_score?.value || '-'}`;
});

const latestMatchIsUnverified = computed(() => {
  return latestMatch.value && latestMatch.value.isVerified?.value === 'false';
});

const latestMatchPointsChange = computed(() => {
  if (!latestMatch.value || !user.value || !user.value.$id) return { winPoints: '--', losePoints: '--', isWinBold: false, isLoseBold: false };

  const currentUserId = user.value.$id.value;
  const match = latestMatch.value;

  const teamAPlayers = (match.teamA?.value || []).map(row => row.value?.playerID_A?.value).filter(Boolean);
  const isA = teamAPlayers.includes(currentUserId);
  const scoreA = parseInt(match.teamA_score?.value, 10) || 0;
  const scoreB = parseInt(match.teamB_score?.value, 10) || 0;
  const won = (isA && scoreA > scoreB) || (!isA && scoreB > scoreA);

  const winVal = match.winnerPoints?.value || '10';
  const loseVal = match.loserPoints?.value || '3';

  return { winPoints: winVal, losePoints: loseVal, isWinBold: won, isLoseBold: !won };
});

// 4. Season & Annual Match Stats
const currentYear = new Date().getFullYear();
const currentQuarterStr = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;

// 取得本球隊本季 / 本年度的 history 記錄（每筆 = 一場比賽積分異動）
const seasonTeamHistories = computed(() => {
  if (!user.value || !activeTeamId.value) return [];
  const uId = user.value.$id?.value;
  return store.history.filter(h =>
    h.playerID?.value === uId &&
    h.teamID?.value === activeTeamId.value &&
    h.seasonYear?.value === String(currentYear) &&
    h.seasonQuarter?.value === currentQuarterStr
  );
});

const yearTeamHistories = computed(() => {
  if (!user.value || !activeTeamId.value) return [];
  const uId = user.value.$id?.value;
  return store.history.filter(h =>
    h.playerID?.value === uId &&
    h.teamID?.value === activeTeamId.value &&
    h.seasonYear?.value === String(currentYear)
  );
});

// 從 history 推算場數與勝場，再回查 userMatches 補充雙/單打分類
const getTeamMatchStats = (histories, allUserSeasonMatches) => {
  if (!histories.length) {
    return { doublesWins: 0, singlesWins: 0, totalWins: 0, totalMatches: 0, winRate: '0.0' };
  }

  let totalWins = 0;
  histories.forEach(h => {
    if (getWinningTeamIdsForHistory(h).includes(h.teamID?.value)) totalWins++;
  });
  const totalMatches = histories.length;
  const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0.0';

  // 用場次數量截取比賽清單（依時間排序取最近 N 場）推算雙/單打
  const uId = user.value?.$id?.value;
  const sortedMatches = [...allUserSeasonMatches].sort((a, b) => {
    const tA = a.matchDateTime?.value ? new Date(a.matchDateTime.value).getTime() : 0;
    const tB = b.matchDateTime?.value ? new Date(b.matchDateTime.value).getTime() : 0;
    return tB - tA;
  }).slice(0, totalMatches);

  let doublesWins = 0, singlesWins = 0;
  sortedMatches.forEach(match => {
    const teamAPlayers = (match.teamA?.value || []).map(r => r.value?.playerID_A?.value).filter(Boolean);
    const isA = teamAPlayers.includes(uId);
    const scoreA = parseInt(match.teamA_score?.value, 10) || 0;
    const scoreB = parseInt(match.teamB_score?.value, 10) || 0;
    const won = (isA && scoreA > scoreB) || (!isA && scoreB > scoreA);
    if (won) {
      const doubles = (match.teamA?.value || []).length >= 2;
      if (doubles) doublesWins++;
      else singlesWins++;
    }
  });

  return { doublesWins, singlesWins, totalWins, totalMatches, winRate };
};

const seasonUserMatches = computed(() => {
  return userMatches.value.filter(match => {
    const dt = match.matchDateTime?.value;
    if (!dt) return false;
    const d = new Date(dt);
    return d.getFullYear() === currentYear &&
      `Q${Math.floor(d.getMonth() / 3) + 1}` === currentQuarterStr;
  });
});

const yearUserMatches = computed(() => {
  return userMatches.value.filter(match => {
    const dt = match.matchDateTime?.value;
    if (!dt) return false;
    return new Date(dt).getFullYear() === currentYear;
  });
});

const seasonStats = computed(() => getTeamMatchStats(seasonTeamHistories.value, seasonUserMatches.value));
const yearStats = computed(() => getTeamMatchStats(yearTeamHistories.value, yearUserMatches.value));

const seasonPoints = computed(() => {
  if (!user.value || !activeTeamId.value) return 0;
  const uId = user.value.$id?.value;
  return store.history
    .filter(h => h.playerID?.value === uId && h.teamID?.value === activeTeamId.value &&
      h.seasonYear?.value === String(currentYear) && h.seasonQuarter?.value === currentQuarterStr)
    .reduce((sum, h) => sum + (parseInt(h.pointChange?.value, 10) || 0), 0);
});

const yearPoints = computed(() => {
  if (!user.value || !activeTeamId.value) return 0;
  const uId = user.value.$id?.value;
  return store.history
    .filter(h => h.playerID?.value === uId && h.teamID?.value === activeTeamId.value &&
      h.seasonYear?.value === String(currentYear))
    .reduce((sum, h) => sum + (parseInt(h.pointChange?.value, 10) || 0), 0);
});

// 3. Top 8 Progress Calculations
const activeTeamRankings = computed(() => {
  if (!activeTeamId.value) return [];

  const list = [];
  store.members.forEach(member => {
    const memberTeams = member.teams?.value || [];
    const hasTeam = memberTeams.some(t => t.value?.teamID?.value === activeTeamId.value);
    if (!hasTeam) return;

    const playerTeamHistories = store.history.filter(h => {
      return h.playerID?.value === member.$id?.value &&
        h.teamID?.value === activeTeamId.value &&
        h.seasonYear?.value === String(currentYear) &&
        h.seasonQuarter?.value === currentQuarterStr;
    });

    const score = playerTeamHistories.reduce((sum, h) => {
      return sum + (parseInt(h.pointChange?.value, 10) || 0);
    }, 0);

    list.push({
      playerID: member.$id?.value,
      playerName: member.playerName?.value || '',
      score: score
    });
  });

  return list.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const idA = a.playerID || '';
    const idB = b.playerID || '';
    return idA.localeCompare(idB);
  });
});

const isUserAtRank = (rank) => {
  if (!user.value || !user.value.$id) return false;
  const playerAtRank = activeTeamRankings.value[rank - 1];
  return playerAtRank && playerAtRank.playerID === user.value.$id.value;
};

const getPlayerNameAtRank = (rank) => {
  const playerAtRank = activeTeamRankings.value[rank - 1];
  return playerAtRank ? playerAtRank.playerName : '';
};
</script>

<template>
  <div class="content-area">
    <!-- Profile Card -->
    <div class="profile-card" v-if="user">
      <div class="profile-card-top">
        <div class="profile-avatar-container">
          <div class="profile-avatar" style="overflow: hidden;" v-html="multiavatar(user.playerName?.value || '')">
          </div>
          <button type="button"
            :class="['badge', user.isVerified?.value === 'true' ? 'badge-verified' : 'badge-unverified']"
            @click="toggleVerificationHint" :aria-expanded="showVerificationHint"
            aria-controls="verification-hint-dialog">
            <svg v-if="user.isVerified?.value === 'true'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="badge-icon">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12l2.5 2.5L16 9" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
              stroke-linejoin="round" class="badge-icon">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v6" />
              <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">{{ user.playerName?.value }}</h2>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; opacity: 0.8;">所屬球隊</label>
            <ModalSelect v-model="activeTeamId" :options="profileTeamOptions" title="切換所屬球隊" placeholder="無球隊資訊"
              class="profile-team-select-wrapper" :disabled="userTeams.length === 0" />
          </div>
        </div>
      </div>
      <!-- Teleported Verification Hint Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div class="modal-select-backdrop" v-if="showVerificationHint" @click.self="toggleVerificationHint">
            <div class="modal-select-sheet">
              <!-- Sheet Handle Bar -->
              <div class="sheet-handle"></div>

              <!-- Sheet Header -->
              <div class="sheet-header">
                <h3 class="sheet-title">帳號驗證狀態說明</h3>
                <button type="button" class="sheet-close" @click="toggleVerificationHint">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <!-- Sheet Content -->
              <div class="sheet-body">
                <div class="badge-explanation-container">
                  <!-- Verified Badge Block -->
                  <div class="badge-explanation-row">
                    <div class="badge-exp-icon-col">
                      <span class="badge badge-verified">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                          stroke-linecap="round" stroke-linejoin="round" class="badge-icon">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M8 12l2.5 2.5L16 9" />
                        </svg>
                      </span>
                    </div>
                    <div class="badge-exp-content-col">
                      <div class="badge-exp-title">已驗證帳號</div>
                      <div class="badge-exp-desc">此帳號已通過聯盟的管理員認證，其比賽積分與排名皆為有效狀態。</div>
                    </div>
                  </div>

                  <!-- Unverified Badge Block -->
                  <div class="badge-explanation-row">
                    <div class="badge-exp-icon-col">
                      <span class="badge badge-unverified">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                          stroke-linecap="round" stroke-linejoin="round" class="badge-icon">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v6" />
                          <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
                        </svg>
                      </span>
                    </div>
                    <div class="badge-exp-content-col">
                      <div class="badge-exp-title">未驗證帳號</div>
                      <div class="badge-exp-desc">此帳號尚未完成驗證。若為新加入球員，請聯絡管理員以完成驗證流程。</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sheet Footer -->
              <div class="sheet-footer">
                <button type="button" class="btn btn-secondary"
                  style="height: 52px; font-size: 18px; width: 100%; margin: 0;" @click="toggleVerificationHint">
                  關閉
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <div class="profile-stats-grid">
        <div class="profile-stat-box">
          <span class="profile-stat-label">球隊個人排名</span>
          <span class="profile-stat-value">{{ personalRank }}</span>
        </div>
        <div class="profile-stat-box">
          <span class="profile-stat-label">全聯盟球隊排名</span>
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

      <!-- Season & Annual Stats -->
      <div class="profile-period-stats">

        <!-- 當季 -->
        <div class="period-block">
          <span class="profile-stat-label">{{ currentYear }}-{{ currentQuarterStr }}</span>

          <!-- Wins / Total -->
          <div class="period-wins-row">
            <svg class="period-icon-trophy" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9V19H4v2h16v-2h-3v-4.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z" />
            </svg>
            <span class="period-wins-num">{{ seasonStats.totalWins }} 勝</span>
            <span class="period-slash">/</span>
            <span class="period-total-num">{{ seasonStats.totalMatches }}</span>
          </div>

          <!-- Doubles | Singles -->
          <div class="period-type-row">
            <svg class="period-icon-sm" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            <span class="period-type-num">{{ seasonStats.doublesWins }}</span>
            <svg class="period-icon-sm" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span class="period-type-num">{{ seasonStats.singlesWins }}</span>
          </div>

          <!-- Win rate + Points -->
          <div class="period-meta-row">
            <svg class="period-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <span class="period-rate">{{ seasonStats.winRate }}%</span>
            <svg class="period-icon-star" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span class="period-pts-val">{{ seasonPoints }}</span>
          </div>
        </div>

        <div class="period-col-divider"></div>

        <!-- 年度 -->
        <div class="period-block">
          <span class="profile-stat-label">{{ currentYear }}</span>

          <div class="period-wins-row">
            <svg class="period-icon-trophy" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9V19H4v2h16v-2h-3v-4.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z" />
            </svg>
            <span class="period-wins-num">{{ yearStats.totalWins }} 勝</span>
            <span class="period-slash">/</span>
            <span class="period-total-num">{{ yearStats.totalMatches }}</span>
          </div>

          <div class="period-type-row">
            <svg class="period-icon-sm" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            <span class="period-type-num">{{ yearStats.doublesWins }}</span>
            <svg class="period-icon-sm" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span class="period-type-num">{{ yearStats.singlesWins }}</span>
          </div>

          <div class="period-meta-row">
            <svg class="period-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <span class="period-rate">{{ yearStats.winRate }}%</span>
            <svg class="period-icon-star" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span class="period-pts-val">{{ yearPoints }}</span>
          </div>
        </div>

      </div>
    </div>

    <!-- Top 8 Progress Card -->
    <div class="top-eight-card" v-if="user && activeTeamId">
      <div class="top-eight-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          class="top-eight-header-icon">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <span class="top-eight-title">本季 TOP 8</span>
      </div>

      <div class="top-eight-list">
        <div v-for="rank in 8" :key="rank" class="top-eight-item">
          <!-- Avatar Container -->
          <div :class="[
            'top-eight-avatar-container',
            { 'active': isUserAtRank(rank) }
          ]">
            <div class="top-eight-avatar">
              <div v-if="getPlayerNameAtRank(rank)" v-html="multiavatar(getPlayerNameAtRank(rank))"
                style="width: 100%; height: 100%;"></div>
              <!-- Silhouette SVG -->
              <svg v-else viewBox="0 0 24 24" fill="currentColor" class="silhouette-icon">
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>

          <!-- Rank Number -->
          <span :class="['top-eight-rank-num', { 'active': isUserAtRank(rank) }]">
            {{ rank }}
          </span>

          <!-- Player Name -->
          <span :class="['top-eight-player-name', { 'active': isUserAtRank(rank) }]">
            {{ getPlayerNameAtRank(rank) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Three Rich Action Buttons -->
    <div class="profile-actions-grid">
      <!-- Card 1: Match Score -->
      <div @click="store.currentView = 'view-match'" class="action-card action-card-match">
        <div class="action-card-title">對戰 & 輸入比分</div>
        <div class="action-card-desc">
          <span>快速配對、開打後記錄比分</span>
        </div>
        <div class="action-card-icon">
          <!-- Racket and Ball SVG -->
          <svg class="icon-racket" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4">
            <!-- Racket oval -->
            <ellipse cx="60" cy="40" rx="20" ry="28" transform="rotate(30 60 40)" stroke-width="6" />
            <!-- Racket string grid -->
            <path
              d="M 47 25 L 67 61 M 52 22 L 72 58 M 42 28 L 62 64 M 37 32 L 57 68 M 53 17 L 33 53 M 58 20 L 38 56 M 63 23 L 43 59 M 68 26 L 48 62"
              stroke-width="2" opacity="0.6" />
            <!-- Racket throat/handle -->
            <path d="M 46 62 L 20 88" stroke-width="8" stroke-linecap="round" />
            <!-- Handle grip -->
            <path d="M 28 80 L 15 93" stroke-width="10" stroke="white" stroke-linecap="round" />
            <!-- Tennis ball -->
            <circle cx="75" cy="80" r="12" fill="#E4F028" stroke="#1D5D3A" stroke-width="3" />
            <!-- Ball seam -->
            <path d="M 67 74 A 12 12 0 0 1 83 90" stroke="#1D5D3A" stroke-width="2" fill="none" />
          </svg>
        </div>
      </div>

      <!-- Card 2: Rankings -->
      <div @click="store.currentView = 'view-ranking'" class="action-card action-card-ranking">
        <div class="action-card-title">查看排名</div>
        <div class="action-card-desc">
          <span>個人與球隊排名</span>
          <span>掌握最新名次</span>
        </div>
        <div class="action-card-icon">
          <!-- Trophy SVG -->
          <svg class="icon-trophy" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9V19H4v2h16v-2h-3v-4.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z" />
          </svg>
        </div>
      </div>

      <!-- Card 3: Add Member -->
      <div @click="store.currentView = 'view-add-member'" class="action-card action-card-member">
        <div class="action-card-title">新增球員</div>
        <div class="action-card-desc">
          <span>新增球員資料</span>
          <span>加入聯盟名單</span>
        </div>
        <div class="action-card-icon">
          <svg class="icon-user-add" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Recent Match Section -->
    <div>
      <h3 class="section-title">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        最近比賽結果
      </h3>

      <div class="recent-match-card">
        <div v-if="!latestMatch"
          style="text-align: center; color: var(--color-text-muted); padding: 12px 0; font-size: 14px;">
          尚無對戰紀錄
        </div>

        <div v-else>
          <div class="match-item-wrapper">
            <div class="match-item-left">
              <div class="match-date-row">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
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
                <span class="match-points-badge match-points-win"
                  :style="{ fontWeight: latestMatchPointsChange.isWinBold ? 'bold' : 'normal' }">
                  🏆 勝方 <span>{{ latestMatchPointsChange.winPoints }}</span> 分
                </span>
                <span class="match-points-badge match-points-lose"
                  :style="{ fontWeight: latestMatchPointsChange.isLoseBold ? 'bold' : 'normal' }">
                  🔥 負方 <span>{{ latestMatchPointsChange.losePoints }}</span> 分
                </span>
                <button type="button" class="rules-help-btn" @click="toggleRulesHint" aria-label="查看積分規則">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="help-icon">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Teleported Rules Hint Modal -->
        <Teleport to="body">
          <Transition name="fade">
            <div class="modal-select-backdrop" v-if="showRulesHint" @click.self="toggleRulesHint">
              <div class="modal-select-sheet">
                <!-- Sheet Handle Bar -->
                <div class="sheet-handle"></div>

                <!-- Sheet Header -->
                <div class="sheet-header">
                  <h3 class="sheet-title">聯盟積分計算規則</h3>
                  <button type="button" class="sheet-close" @click="toggleRulesHint">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <!-- Sheet Content -->
                <div class="sheet-body">
                  <div class="rules-explanation-container">
                    <div class="rules-explanation-row">
                      <div class="rules-exp-label">平日積分</div>
                      <div class="rules-exp-detail">
                        勝方 <span class="rule-score-win">+{{ store.settings.weekday_win_score }}</span> 分 /
                        負方 <span class="rule-score-lose">+{{ store.settings.weekday_lose_score }}</span> 分
                      </div>
                    </div>
                    <div class="rules-explanation-row">
                      <div class="rules-exp-label">週六 (挑戰日)</div>
                      <div class="rules-exp-detail">
                        勝方 <span class="rule-score-win">+{{ store.settings.challenge_win_score }}</span> 分 /
                        負方 <span class="rule-score-lose">+{{ store.settings.challenge_lose_score }}</span> 分
                      </div>
                    </div>
                    <div class="rules-explanation-row">
                      <div class="rules-exp-label">季賽、年終賽</div>
                      <div class="rules-exp-detail">
                        勝方 <span class="rule-score-win">+{{ store.settings.finals_win_score }}</span> 分 /
                        負方 <span class="rule-score-lose">+{{ store.settings.finals_lose_score }}</span> 分
                      </div>
                    </div>
                    <div class="rules-explanation-row">
                      <div class="rules-exp-label">其他規定</div>
                      <div class="rules-exp-detail text-muted">
                        其餘賽制積分另行公告。
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Sheet Footer -->
                <div class="sheet-footer">
                  <button type="button" class="btn btn-secondary"
                    style="height: 52px; font-size: 18px; width: 100%; margin: 0;" @click="toggleRulesHint">
                    關閉
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </div>
    </div>
  </div>
</template>

<style scoped>
.badge {
  appearance: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  padding: 0;
}

.badge-verified {
  background-color: #1d9bf0;
  color: #ffffff;
}

.badge-unverified {
  background-color: #ef4444;
  color: #ffffff;
}

.badge-icon {
  width: 16px;
  height: 16px;
}

/* Verification Hint Modal Styles */
.modal-select-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
}

.modal-select-sheet {
  width: 100%;
  max-width: 480px;
  background-color: #FFFFFF;
  border-top-left-radius: var(--border-radius-md);
  border-top-right-radius: var(--border-radius-md);
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
}

.sheet-handle {
  width: 40px;
  height: 5px;
  background-color: #E5E7EB;
  border-radius: 3px;
  align-self: center;
  margin-bottom: 12px;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.sheet-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-dark);
  margin: 0;
}

.sheet-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast);
}

.sheet-close:hover {
  background-color: #F3F4F6;
}

.sheet-body {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
  padding-right: 4px;
}

.sheet-footer {
  padding-top: 10px;
}

.badge-explanation-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.badge-explanation-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 12px;
  border-radius: var(--border-radius-sm);
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
}

.badge-exp-icon-col {
  flex-shrink: 0;
  padding-top: 2px;
}

.badge-exp-content-col {
  flex: 1;
}

.badge-exp-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-dark);
  margin-bottom: 4px;
}

.badge-exp-desc {
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-active .modal-select-sheet {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-leave-active .modal-select-sheet {
  transition: transform 0.2s ease-in;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-from .modal-select-sheet {
  transform: translateY(100%);
}

.fade-leave-to .modal-select-sheet {
  transform: translateY(100%);
}

.top-eight-card {
  background-color: var(--color-bg-card);
  border-radius: var(--border-radius-md);
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-sm);
}

.top-eight-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-eight-header-icon {
  color: var(--color-text-dark);
}

.top-eight-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-dark);
}

.top-eight-list {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  overflow-x: auto;
  gap: 4px;
  padding-bottom: 4px;
}

.top-eight-list::-webkit-scrollbar {
  height: 4px;
}

.top-eight-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 2px;
}

.top-eight-list::-webkit-scrollbar-thumb {
  background: var(--color-primary);
  border-radius: 2px;
  opacity: 0.6;
}

.top-eight-list {
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary) rgba(0, 0, 0, 0.05);
}

.top-eight-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 44px;
  text-align: center;
}

.top-eight-avatar-container {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  margin-bottom: 6px;
  overflow: hidden;
}

.top-eight-avatar-container.active {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  box-shadow: 0 0 8px rgba(29, 93, 58, 0.35);
}

.top-eight-avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-eight-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.silhouette-icon {
  width: 20px;
  height: 20px;
  color: #FFFFFF;
}

.top-eight-rank-num {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-muted);
  line-height: 1.2;
  transition: all var(--transition-fast);
}

.top-eight-rank-num.active {
  color: var(--color-primary);
  font-weight: 700;
  border-bottom: 2px solid var(--color-primary);
  padding-bottom: 1px;
}

.top-eight-player-name {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  font-weight: 500;
  min-height: 16px;
  transition: all var(--transition-fast);
}

.top-eight-player-name.active {
  color: var(--color-primary);
  font-weight: 700;
}

/* Rules Hint Modal & Button Styles */
.rules-help-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.rules-help-btn:hover {
  background-color: #F3F4F6;
  color: var(--color-primary);
}

.help-icon {
  width: 18px;
  height: 18px;
}

.rules-explanation-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.rules-explanation-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-radius: var(--border-radius-sm);
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
}

.rules-exp-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-dark);
}

.rules-exp-detail {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-dark);
}

.rule-score-win {
  color: var(--color-success);
  font-weight: 800;
}

.rule-score-lose {
  color: var(--color-danger);
  font-weight: 800;
}

.text-muted {
  color: var(--color-text-muted);
  font-weight: normal;
}

/* Season & Annual Stats */
.profile-period-stats {
  display: flex;
  flex-direction: row;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  padding-top: 14px;
}

.period-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.period-col-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.15);
  align-self: stretch;
  margin: 0 4px;
}

/* Wins / Total row */
.period-wins-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.period-icon-trophy {
  width: 14px;
  height: 14px;
  color: var(--color-accent);
  flex-shrink: 0;
}

.period-wins-num {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-accent);
  line-height: 1;
}

.period-slash {
  font-size: 16px;
  font-weight: 300;
  opacity: 0.45;
  line-height: 1;
}

.period-total-num {
  font-size: 15px;
  font-weight: 600;
  opacity: 0.7;
  line-height: 1;
}

/* Doubles | Singles row */
.period-type-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.period-icon-sm {
  width: 13px;
  height: 13px;
  opacity: 0.75;
  flex-shrink: 0;
}

.period-type-num {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.85;
}

/* Win rate + Points row */
.period-meta-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.period-rate {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.9;
}

.period-icon-star {
  width: 12px;
  height: 12px;
  color: var(--color-accent);
  flex-shrink: 0;
  margin-left: 4px;
}

.period-pts-val {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-accent);
}
</style>
