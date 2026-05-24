<script setup>
import { ref, computed, watch } from 'vue';
import { store, playerHasUnverifiedMatches } from '../scripts/store';
import multiavatar from '@multiavatar/multiavatar';

const currentTab = ref('individual'); // 'individual' or 'team'
const selectedTeamFilter = ref('all');

import ModalSelect from './ModalSelect.vue';

const rankingTeamOptions = computed(() => {
  const options = [{ value: 'all', label: '所有球隊 (個人榜) / 整體球隊榜' }];
  store.teams.forEach(t => {
    options.push({ value: t.teamID.value, label: t.teamName.value });
  });
  return options;
});

// Reset team filter when tab changes
watch(currentTab, () => {
  selectedTeamFilter.value = 'all';
});

// 1. Compute scores grouped by player + team combinations
const playerTeamRankings = computed(() => {
  const list = [];
  store.members.forEach(member => {
    const memberTeams = member.teams?.value || [];
    memberTeams.forEach(t => {
      const teamId = t.value.teamID.value;
      const teamName = t.value.teamName.value;
      
      const playerTeamHistories = store.history.filter(h => {
        if (h.playerID.value !== member.$id.value || h.teamID.value !== teamId) return false;
        const match = store.matches.find(m => m.$id.value === h.matchID.value);
        return match && match.isVerified.value === 'true';
      });
      
      const score = playerTeamHistories.reduce((sum, h) => {
        return sum + (parseInt(h.pointChange.value, 10) || 0);
      }, 0);
      
      const matchCount = playerTeamHistories.length;
      
      list.push({
        playerID: member.$id.value,
        playerName: member.playerName.value,
        isVerified: member.isVerified.value,
        playerPhone: member.playerPhone.value,
        teamID: teamId,
        teamName: teamName,
        score: score,
        matchCount: matchCount
      });
    });
  });
  return list;
});

const filteredRankings = computed(() => {
  if (currentTab.value === 'individual') {
    let list = [...playerTeamRankings.value];
    if (selectedTeamFilter.value !== 'all') {
      list = list.filter(item => item.teamID === selectedTeamFilter.value);
    }
    return list.sort((a, b) => b.score - a.score);
  } else {
    // Team Rankings
    if (selectedTeamFilter.value !== 'all') {
      // If a specific team is filtered in Team tab, we show that team's players instead!
      let list = playerTeamRankings.value.filter(item => item.teamID === selectedTeamFilter.value);
      return list.sort((a, b) => b.score - a.score);
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
  const team = store.teams.find(t => t.teamID?.value === teamId || t.$id.value === teamId);
  return team ? team.teamName.value : '該球隊';
};

const getTeamMemberCount = (teamId) => {
  const teamRecord = store.teams.find(t => t.teamID?.value === teamId || t.$id.value === teamId);
  const targetId = teamRecord ? teamRecord.teamID.value : teamId;
  return store.members.filter(m => 
    (m.teams.value || []).some(t => t.value.teamID.value === targetId)
  ).length;
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



      <!-- Team Filter Dropdown -->
      <div class="filter-bar" style="margin-bottom: 16px;">
        <label for="ranking-team-filter" style="font-size: 15px; font-weight: 600; min-width: 80px;">篩選球隊：</label>
        <ModalSelect
          v-model="selectedTeamFilter"
          :options="rankingTeamOptions"
          title="篩選球隊"
          placeholder="選擇球隊"
          style="flex: 1;"
        />
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
            :key="player.playerID + '-' + player.teamID" 
            class="ranking-item"
          >
            <div class="ranking-badge">{{ idx + 1 }}</div>
            <div class="ranking-avatar" style="overflow: hidden;" v-html="multiavatar(player.playerName)"></div>
            <div class="ranking-details">
              <div class="ranking-name">
                {{ player.playerName }}
                <span 
                  v-if="player.isVerified === 'false'" 
                  class="asterisk-red" 
                  title="待驗證會員"
                >*</span>
              </div>
              <div class="ranking-team">
                {{ player.teamName }}
              </div>
            </div>
            <div class="ranking-score-box">
              <div class="ranking-score">
                {{ player.score }}
                <span 
                  v-if="playerHasUnverifiedMatches(player.playerID)" 
                  class="asterisk-red" 
                  title="包含待驗證積分"
                >*</span>
              </div>
              <div class="ranking-matches">{{ player.matchCount }} 場出賽</div>
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
