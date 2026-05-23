<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { store, playerHasUnverifiedMatches } from '../scripts/store';

const currentTab = ref('individual'); // 'individual' or 'team'
const selectedTeamFilter = ref('all');

let chartInstance = null;

// Reset team filter when tab changes
watch(currentTab, () => {
  selectedTeamFilter.value = 'all';
  triggerChartUpdate();
});

// Watch state or filter changes to update the rankings list and redraw the chart
watch([selectedTeamFilter, () => store.members, () => store.teams], () => {
  triggerChartUpdate();
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    drawChart();
  });
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});

const triggerChartUpdate = () => {
  nextTick(() => {
    drawChart();
  });
};

// 1. Computed Ranking Lists
const filteredRankings = computed(() => {
  if (currentTab.value === 'individual') {
    let list = [...store.members];
    if (selectedTeamFilter.value !== 'all') {
      list = list.filter(m => {
        const teams = m.teams.value || [];
        return teams.some(t => t.value.teamID.value === selectedTeamFilter.value);
      });
    }
    // Sort by currentScore descending
    return list.sort((a, b) => (parseInt(b.currentScore.value, 10) || 0) - (parseInt(a.currentScore.value, 10) || 0));
  } else {
    // Team Rankings
    if (selectedTeamFilter.value !== 'all') {
      // If a specific team is filtered in Team tab, we show that team's players instead!
      let list = store.members.filter(m => {
        const teams = m.teams.value || [];
        return teams.some(t => t.value.teamID.value === selectedTeamFilter.value);
      });
      // Sort by currentScore descending
      return list.sort((a, b) => (parseInt(b.currentScore.value, 10) || 0) - (parseInt(a.currentScore.value, 10) || 0));
    } else {
      // Show list of all teams
      let list = [...store.teams];
      return list.sort((a, b) => (parseInt(b.teamScore.value, 10) || 0) - (parseInt(a.teamScore.value, 10) || 0));
    }
  }
});

const isShowingTeamPlayers = computed(() => {
  return currentTab.value === 'team' && selectedTeamFilter.value !== 'all';
});

const getTeamNameStr = (teamId) => {
  const team = store.teams.find(t => t.$id.value === teamId);
  return team ? team.teamName.value : '該球隊';
};

const getTeamMemberCount = (teamId) => {
  return store.members.filter(m => 
    (m.teams.value || []).some(t => t.value.teamID.value === teamId)
  ).length;
};

// 2. Chart.js Drawing Logic
const drawChart = () => {
  const ctx = document.getElementById('ranking-chart');
  const placeholder = document.getElementById('chart-placeholder');
  
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  // Get top 5 items for chart
  const topItems = filteredRankings.value.slice(0, 5);
  
  if (topItems.length === 0) {
    placeholder.style.display = 'block';
    ctx.style.display = 'none';
    return;
  } else {
    placeholder.style.display = 'none';
    ctx.style.display = 'block';
  }

  let labels = [];
  let dataValues = [];
  let datasetLabel = '';

  if (currentTab.value === 'individual') {
    labels = topItems.map(p => p.playerName.value);
    dataValues = topItems.map(p => parseInt(p.currentScore.value, 10) || 0);
    datasetLabel = '積分';
  } else {
    if (selectedTeamFilter.value !== 'all') {
      const teamName = getTeamNameStr(selectedTeamFilter.value);
      labels = topItems.map(p => p.playerName.value);
      dataValues = topItems.map(p => parseInt(p.currentScore.value, 10) || 0);
      datasetLabel = `${teamName}球員積分`;
    } else {
      labels = topItems.map(t => t.teamName.value);
      dataValues = topItems.map(t => parseInt(t.teamScore.value, 10) || 0);
      datasetLabel = '團隊分數';
    }
  }

  const isTeamDataset = datasetLabel.includes('團隊');
  const chartColor = isTeamDataset ? '#F7941D' : '#1D5D3A';

  if (typeof window.Chart === 'undefined') {
    console.warn('Chart.js is not loaded yet');
    return;
  }

  chartInstance = new window.Chart(ctx, {
    type: 'bar',
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
};
</script>

<template>
  <div class="content-area">
    <h2 class="section-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      聯盟排名榜
    </h2>

    <!-- Individual / Team Toggle -->
    <div class="rankings-toggle">
      <button 
        type="button" 
        @click="currentTab = 'individual'"
        :class="['rankings-toggle-btn', { active: currentTab === 'individual' }]"
      >
        個人排名
      </button>
      <button 
        type="button" 
        @click="currentTab = 'team'"
        :class="['rankings-toggle-btn', { active: currentTab === 'team' }]"
      >
        球隊排名
      </button>
    </div>

    <!-- Chart Card -->
    <div class="card chart-card">
      <canvas id="ranking-chart" style="width: 100%; height: 100%;"></canvas>
      <div id="chart-placeholder" style="position: absolute; display: none; color: var(--color-text-muted); font-size: 14px;">
        無資料可繪製圖表
      </div>
    </div>

    <!-- Team Filter Dropdown -->
    <div class="filter-bar">
      <label for="ranking-team-filter" style="font-size: 14px; font-weight: 600;">篩選球隊：</label>
      <select 
        v-model="selectedTeamFilter" 
        id="ranking-team-filter" 
        class="input-control" 
        style="flex: 1; height: 38px; padding: 6px 12px; font-size: 14px;"
      >
        <option value="all">所有球隊 (個人榜) / 整體球隊榜</option>
        <option 
          v-for="t in store.teams" 
          :key="t.$id.value" 
          :value="t.$id.value"
        >
          {{ t.teamName.value }}
        </option>
      </select>
    </div>

    <!-- Rankings List Container -->
    <div class="ranking-list">
      <!-- Label if viewing team players -->
      <div 
        v-if="isShowingTeamPlayers"
        style="font-weight: 700; margin-bottom: 8px; font-size: 14px; color: var(--color-primary);"
      >
        {{ getTeamNameStr(selectedTeamFilter) }} 成員榜：
      </div>

      <!-- No items check -->
      <div 
        v-if="filteredRankings.length === 0" 
        style="text-align: center; color: var(--color-text-muted); padding: 20px;"
      >
        {{ currentTab === 'individual' ? '無符合條件的球員' : '無球隊數據' }}
      </div>

      <!-- Member/Player row -->
      <template v-else-if="currentTab === 'individual' || isShowingTeamPlayers">
        <div 
          v-for="(player, idx) in filteredRankings" 
          :key="player.$id.value" 
          class="ranking-item"
        >
          <div class="ranking-badge">{{ idx + 1 }}</div>
          <div class="ranking-avatar">{{ player.playerName.value.slice(0, 1) }}</div>
          <div class="ranking-details">
            <div class="ranking-name">
              {{ player.playerName.value }}
              <span 
                v-if="player.isVerified.value === 'false'" 
                class="asterisk-red" 
                title="待驗證會員"
              >*</span>
            </div>
            <div class="ranking-team">
              {{ (player.teams.value || []).map(t => t.value.teamName.value).join(', ') || '無球隊' }}
            </div>
          </div>
          <div class="ranking-score-box">
            <div class="ranking-score">
              {{ parseInt(player.currentScore.value, 10) || 0 }}
              <span 
                v-if="playerHasUnverifiedMatches(player.$id.value)" 
                class="asterisk-red" 
                title="包含待驗證積分"
              >*</span>
            </div>
            <div class="ranking-matches">{{ parseInt(player.totalMatches.value, 10) || 0 }} 場出賽</div>
          </div>
        </div>
      </template>

      <!-- Team row -->
      <template v-else>
        <div 
          v-for="(team, idx) in filteredRankings" 
          :key="team.$id.value" 
          class="ranking-item"
        >
          <div class="ranking-badge">{{ idx + 1 }}</div>
          <div class="ranking-avatar" style="background-color: #FFF2E6; color: var(--color-accent-dark);">🛡️</div>
          <div class="ranking-details">
            <div class="ranking-name">{{ team.teamName.value }}</div>
            <div class="ranking-team">{{ getTeamMemberCount(team.$id.value) }} 位成員</div>
          </div>
          <div class="ranking-score-box">
            <div class="ranking-score">{{ parseInt(team.teamScore.value, 10) || 0 }} 分</div>
            <div class="ranking-matches">團隊總積分</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
