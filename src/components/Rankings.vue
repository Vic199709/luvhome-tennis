<script setup>
import { ref, computed, watch } from 'vue';
import { store, playerHasUnverifiedMatches, getWinningTeamIdsForHistory, API } from '../scripts/store';
import multiavatar from '@multiavatar/multiavatar';

const currentTab = ref('individual'); // 'individual' or 'team'
const selectedTeamFilter = ref('all');
const selectedYearFilter = ref(String(new Date().getFullYear()));
const selectedQuarterFilter = ref(`Q${Math.floor(new Date().getMonth() / 3) + 1}`);

import ModalSelect from './ModalSelect.vue';

const showLegendHint = ref(false);
const toggleLegendHint = () => {
  showLegendHint.value = !showLegendHint.value;
  document.body.style.overflow = showLegendHint.value ? 'hidden' : '';
};

const rankingTeamOptions = computed(() => {
  const options = [{ value: 'all', label: '全部球隊' }];
  store.teams.forEach(t => {
    options.push({ value: t.teamID?.value || '', label: t.teamName?.value || '' });
  });
  return options;
});

const START_YEAR = 2025;

const rankingYearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const options = [{ value: 'all', label: '全部年度' }];
  for (let y = currentYear; y >= START_YEAR; y--) {
    options.push({ value: String(y), label: `${y} 年` });
  }
  return options;
});

const rankingQuarterOptions = computed(() => {
  const options = [{ value: 'all', label: '全年度' }];
  if (selectedYearFilter.value === 'all') return options;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based
  const maxQuarter = String(selectedYearFilter.value) === String(currentYear)
    ? Math.floor(currentMonth / 3) + 1
    : 4;
  for (let q = 1; q <= maxQuarter; q++) {
    options.push({ value: `Q${q}`, label: `Q${q}` });
  }
  return options;
});

// Reset team filter when tab changes
watch(currentTab, () => {
  selectedTeamFilter.value = 'all';
});

// Reset quarter and fetch year-specific history when year changes
watch(selectedYearFilter, async (newYear) => {
  if (newYear === 'all') {
    selectedQuarterFilter.value = 'all';
    await loadAllDataIfNeeded();
    return;
  }

  // Default to current quarter when a specific year is selected
  const currentQ = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
  selectedQuarterFilter.value = currentQ;

  // Skip if we already have data for this year
  const alreadyHave = store.history.some(h => h.seasonYear?.value === newYear);
  if (alreadyHave) return;

  try {
    store.isLoading = true;
    const promises = [];

    if (!store.allMembersLoaded) {
      promises.push(API.getMembers().then(res => {
        store.members = res || [];
        store.allMembersLoaded = true;
      }));
    }

    promises.push(API.getHistory({ seasonYear: newYear }).then(res => {
      const otherYears = store.history.filter(h => h.seasonYear?.value !== newYear);
      store.history = [...otherYears, ...(res || [])];
    }));

    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to load history for year', newYear, err);
  } finally {
    store.isLoading = false;
  }
});

// 1. Compute scores grouped by player + team combinations
const playerTeamRankings = computed(() => {
  const list = [];
  store.members.forEach(member => {
    const memberTeams = member.teams?.value || [];
    memberTeams.forEach(t => {
      const teamId = t.value?.teamID?.value;
      const teamName = t.value?.teamName?.value;
      if (!teamId) return;

      const playerTeamHistories = store.history.filter(h => {
        return h.playerID?.value === member.$id?.value && h.teamID?.value === teamId;
      });

      list.push({
        playerID: member.$id?.value || '',
        playerName: member.playerName?.value || '',
        isVerified: member.isVerified?.value || 'false',
        playerPhone: member.playerPhone?.value || '',
        teamID: teamId,
        teamName: teamName || '',
        histories: playerTeamHistories
      });
    });
  });
  return list;
});

const filteredRankings = computed(() => {
  const periodFilteredRankings = playerTeamRankings.value.map(item => {
    const histories = item.histories.filter(h => {
      if (selectedYearFilter.value === 'all') return true;
      if (h.seasonYear?.value !== selectedYearFilter.value) return false;
      if (selectedQuarterFilter.value === 'all') return true;
      return h.seasonQuarter?.value === selectedQuarterFilter.value;
    });
    const score = histories.reduce((sum, h) => sum + (parseInt(h.pointChange?.value, 10) || 0), 0);
    const winCount = histories.filter(h => getWinningTeamIdsForHistory(h).includes(item.teamID)).length;
    return {
      ...item,
      score,
      matchCount: histories.length,
      winCount
    };
  });

  if (currentTab.value === 'individual') {
    let list = periodFilteredRankings.filter(item => item.matchCount > 0);
    if (selectedTeamFilter.value !== 'all') {
      list = list.filter(item => item.teamID === selectedTeamFilter.value);
    }
    return list.sort((a, b) => b.score - a.score);
  } else {
    // Team Rankings
    if (selectedTeamFilter.value !== 'all') {
      // If a specific team is filtered in Team tab, we show that team's players instead!
      let list = periodFilteredRankings.filter(item => item.teamID === selectedTeamFilter.value && item.matchCount > 0);
      return list.sort((a, b) => b.score - a.score);
    } else {
      const teamScores = new Map();
      periodFilteredRankings.forEach(item => {
        const current = teamScores.get(item.teamID) || {
          $id: { value: item.teamID },
          teamName: { value: item.teamName },
          teamScore: { value: '0' }
        };
        const score = (parseInt(current.teamScore.value, 10) || 0) + item.score;
        current.teamScore.value = String(score);
        teamScores.set(item.teamID, current);
      });
      let list = [...teamScores.values()];
      return list.sort((a, b) => (parseInt(b.teamScore?.value, 10) || 0) - (parseInt(a.teamScore?.value, 10) || 0));
    }
  }
});

const isShowingTeamPlayers = computed(() => {
  return currentTab.value === 'team' && selectedTeamFilter.value !== 'all';
});

const getTeamNameStr = (teamId) => {
  const team = store.teams.find(t => t.teamID?.value === teamId || t.$id?.value === teamId);
  return team ? (team.teamName?.value || '未知球隊') : '未知球隊';
};

const getTeamMemberCount = (teamId) => {
  const teamRecord = store.teams.find(t => t.teamID?.value === teamId || t.$id?.value === teamId);
  const targetId = teamRecord ? teamRecord.teamID?.value : teamId;
  return store.members.filter(m =>
    (m.teams?.value || []).some(t => t.value?.teamID?.value === targetId)
  ).length;
};

const loadAllDataIfNeeded = async () => {
  if (currentTab.value === 'individual' && selectedTeamFilter.value === 'all') {
    try {
      store.isLoading = true;
      const promises = [];

      if (!store.allMembersLoaded) {
        promises.push(API.getMembers().then(res => {
          store.members = res || [];
          store.allMembersLoaded = true;
        }));
      }
      if (!store.allHistoryLoaded) {
        promises.push(API.getHistory().then(res => {
          store.history = res || [];
          store.allHistoryLoaded = true;
        }));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (err) {
      console.error('Failed to load rankings all data:', err);
    } finally {
      store.isLoading = false;
    }
  }
};

watch(selectedTeamFilter, async (newTeamId) => {
  if (newTeamId && newTeamId !== 'all') {
    try {
      store.isLoading = true;
      const promises = [];

      // Check members
      const hasMembers = store.members.some(m =>
        (m.teams?.value || []).some(t => t.value?.teamID?.value === newTeamId)
      );
      if (!hasMembers && !store.allMembersLoaded) {
        promises.push(API.getMembers({ teamID: newTeamId }).then(teamMembers => {
          const existingIds = new Set(store.members.map(m => m.$id?.value));
          const newMembers = (teamMembers || []).filter(m => !existingIds.has(m.$id?.value));
          store.members = [...store.members, ...newMembers];
        }));
      }

      // Check history
      const hasHistory = store.history.some(h => h.teamID?.value === newTeamId);
      if (!hasHistory && !store.allHistoryLoaded) {
        promises.push(API.getHistory({ teamID: newTeamId }).then(teamHistory => {
          const existingIds = new Set(store.history.map(h => h.$id?.value));
          const newHistory = (teamHistory || []).filter(h => !existingIds.has(h.$id?.value));
          store.history = [...store.history, ...newHistory];
        }));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (err) {
      console.error('Failed to fetch team data for rankings:', err);
    } finally {
      store.isLoading = false;
    }
  }
});

watch([currentTab, selectedTeamFilter], loadAllDataIfNeeded, { immediate: true });
</script>

<template>
  <div class="content-area">
    <h2 class="section-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
      聯盟排名榜
      <button type="button" class="rules-help-btn" @click="toggleLegendHint" aria-label="排名符號說明" style="margin-left: auto;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="help-icon">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
    </h2>

    <!-- Legend Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div class="modal-select-backdrop" v-if="showLegendHint" @click.self="toggleLegendHint">
          <div class="modal-select-sheet">
            <div class="sheet-handle"></div>
            <div class="sheet-header">
              <h3 class="sheet-title">排名符號說明</h3>
              <button type="button" class="sheet-close" @click="toggleLegendHint">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="sheet-body">
              <div style="display: flex; flex-direction: column; gap: 12px; padding: 8px 0;">
                <div class="legend-row">
                  <span class="legend-example">王小明 <span class="asterisk-red">*</span></span>
                  <span class="legend-desc">球員名稱旁的 <span class="asterisk-red">*</span> 表示該球員帳號<strong>尚未完成驗證</strong>，積分僅供參考。</span>
                </div>
                <div class="legend-row">
                  <span class="legend-example">42 <span class="asterisk-red">*</span></span>
                  <span class="legend-desc">積分旁的 <span class="asterisk-red">*</span> 表示該球員有<strong>尚未核准的比賽</strong>，積分可能異動。</span>
                </div>
              </div>
            </div>
            <div class="sheet-footer">
              <button type="button" class="btn btn-secondary"
                style="height: 52px; font-size: 18px; width: 100%; margin: 0;" @click="toggleLegendHint">
                關閉
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Individual / Team Toggle -->
    <div class="rankings-toggle">
      <button type="button" @click="currentTab = 'individual'"
        :class="['rankings-toggle-btn', { active: currentTab === 'individual' }]">
        個人排名
      </button>
      <button type="button" @click="currentTab = 'team'"
        :class="['rankings-toggle-btn', { active: currentTab === 'team' }]">
        球隊排名
      </button>
    </div>



    <!-- Filters -->
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div class="filter-bar">
        <label style="font-size: 14px; font-weight: 600; min-width: 72px; color: var(--color-text-muted);">球隊</label>
        <ModalSelect v-model="selectedTeamFilter" :options="rankingTeamOptions" title="篩選球隊" placeholder="選擇球隊"
          style="flex: 1;" />
      </div>
      <div class="filter-bar">
        <label style="font-size: 14px; font-weight: 600; min-width: 72px; color: var(--color-text-muted);">期間</label>
        <div style="display: flex; gap: 8px; flex: 1;">
          <ModalSelect v-model="selectedYearFilter" :options="rankingYearOptions" title="選擇年度" placeholder="年度"
            style="flex: 1;" />
          <ModalSelect v-model="selectedQuarterFilter" :options="rankingQuarterOptions" title="選擇季度" placeholder="季度"
            :disabled="selectedYearFilter === 'all'" style="flex: 1;" />
        </div>
      </div>
    </div>

    <div class="ranking-list">
      <!-- Label if viewing team players -->
      <div v-if="isShowingTeamPlayers"
        style="font-weight: 700; margin-bottom: 8px; font-size: 14px; color: var(--color-primary);">
        {{ getTeamNameStr(selectedTeamFilter) }} 成員榜：
      </div>

      <!-- No items check -->
      <div v-if="filteredRankings.length === 0"
        style="text-align: center; color: var(--color-text-muted); padding: 20px;">
        {{ currentTab === 'individual' ? '目前沒有可顯示的個人排名' : '目前沒有可顯示的球隊排名' }}
      </div>

      <!-- Member/Player row -->
      <template v-else-if="currentTab === 'individual' || isShowingTeamPlayers">
        <div v-for="(player, idx) in filteredRankings" :key="player.playerID + '-' + player.teamID"
          class="ranking-item">
          <div class="ranking-badge">{{ idx + 1 }}</div>
          <div class="ranking-avatar" style="overflow: hidden;" v-html="multiavatar(player.playerName)"></div>
          <div class="ranking-details">
            <div class="ranking-name">
              {{ player.playerName }}
              <span v-if="player.isVerified === 'false'" class="asterisk-red" title="球員尚未完成驗證">*</span>
            </div>
            <div class="ranking-team">
              {{ player.teamName }}
            </div>
          </div>
          <div class="ranking-score-box">
            <div class="ranking-score">
              {{ player.score }}
              <span v-if="playerHasUnverifiedMatches(player.playerID)" class="asterisk-red" title="含有未驗證比賽">*</span>
            </div>
            <div class="ranking-matches"> 勝場 {{ player.winCount }} </div>
          </div>
        </div>
      </template>

      <!-- Team row -->
      <template v-else>
        <div v-for="(team, idx) in filteredRankings" :key="team.$id.value" class="ranking-item">
          <div class="ranking-badge">{{ idx + 1 }}</div>
          <div class="ranking-avatar" style="background-color: #FFF2E6; color: var(--color-accent-dark);">隊伍</div>
          <div class="ranking-details">
            <div class="ranking-name">{{ team.teamName.value }}</div>
            <div class="ranking-team">{{ getTeamMemberCount(team.$id.value) }} 位成員</div>
          </div>
          <div class="ranking-score-box">
            <div class="ranking-score">{{ parseInt(team.teamScore.value, 10) || 0 }} 分</div>
            <div class="ranking-matches">球隊總積分</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
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

/* Legend modal reuses global sheet styles; only local overrides needed */
.legend-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: var(--border-radius-sm);
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
}
.legend-example {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-dark);
}
.legend-desc {
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

/* Modal overlay (mirrors Profile.vue scoped styles) */
.modal-select-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
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
  box-shadow: 0 -8px 32px rgba(0,0,0,0.15);
}
.sheet-handle {
  width: 40px; height: 5px;
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
  background: none; border: none;
  color: var(--color-text-muted);
  cursor: pointer; padding: 4px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: background-color var(--transition-fast);
}
.sheet-close:hover { background-color: #F3F4F6; }
.sheet-body { flex: 1; overflow-y: auto; margin-bottom: 16px; padding-right: 4px; }
.sheet-footer { padding-top: 10px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-active .modal-select-sheet { transition: transform 0.3s cubic-bezier(0.16,1,0.3,1); }
.fade-leave-active .modal-select-sheet { transition: transform 0.2s ease-in; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-from .modal-select-sheet, .fade-leave-to .modal-select-sheet { transform: translateY(100%); }
</style>
