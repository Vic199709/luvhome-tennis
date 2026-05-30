<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { store, refreshAllData, showToast, isValidTennisScore, API } from '../scripts/store';
import SuccessDialog from './SuccessDialog.vue';

const matchType = ref('weekday');
const matchDateTimeLocal = ref('');

// Set default datetime to now
const setDefaultDateTime = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  matchDateTimeLocal.value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};
setDefaultDateTime();

// Watch date changes to set default match type (Saturday -> saturday, other days -> weekday)
watch(matchDateTimeLocal, (newVal) => {
  if (newVal) {
    const date = new Date(newVal);
    const day = date.getDay();
    if (day === 6) {
      matchType.value = 'saturday';
    } else {
      matchType.value = 'weekday';
    }
  }
}, { immediate: true });

// Player selections
const playerA1 = ref('');
const teamA1 = ref('');
const playerA2 = ref('');
const teamA2 = ref('');
const playerB1 = ref('');
const teamB1 = ref('');
const playerB2 = ref('');
const teamB2 = ref('');

// Score selections
const scoreA = ref('6');
const scoreB = ref('4');

// Validation state
const fieldErrors = ref({});
const formErrors = ref([]);
const isSubmitting = ref(false);
const showSuccessDialog = ref(false);
const successDialogMessage = ref('');
const successDialogDetails = ref([]);
const postSuccessAction = ref(null);

const mode = computed({
  get: () => store.matchMode,
  set: (val) => {
    store.matchMode = val;
    // Clear errors on mode switch
    fieldErrors.value = {};
    formErrors.value = [];
  }
});

// Filter players by team ID
const getPlayersForTeam = (teamId) => {
  if (!teamId) return [];
  return store.members.filter(m => {
    const mTeams = m.teams?.value || [];
    return mTeams.some(t => t.value.teamID.value === teamId);
  });
};

const playersForTeamA1 = computed(() => getPlayersForTeam(teamA1.value));
const playersForTeamA2 = computed(() => getPlayersForTeam(teamA2.value));
const playersForTeamB1 = computed(() => getPlayersForTeam(teamB1.value));
const playersForTeamB2 = computed(() => getPlayersForTeam(teamB2.value));

import ModalSelect from './ModalSelect.vue';

const teamOptions = computed(() => {
  return store.teams.map(t => ({ value: t.teamID.value, label: t.teamName.value }));
});

const playerA1Options = computed(() => {
  return playersForTeamA1.value.map(m => ({
    value: m.$id.value,
    label: `${m.playerName.value} (${m.playerPhone.value.slice(-4)})`
  }));
});

const playerA2Options = computed(() => {
  return playersForTeamA2.value.map(m => ({
    value: m.$id.value,
    label: `${m.playerName.value} (${m.playerPhone.value.slice(-4)})`
  }));
});

const playerB1Options = computed(() => {
  return playersForTeamB1.value.map(m => ({
    value: m.$id.value,
    label: `${m.playerName.value} (${m.playerPhone.value.slice(-4)})`
  }));
});

const playerB2Options = computed(() => {
  return playersForTeamB2.value.map(m => ({
    value: m.$id.value,
    label: `${m.playerName.value} (${m.playerPhone.value.slice(-4)})`
  }));
});

const scoreOptions = computed(() => {
  return Array.from({ length: 8 }, (_, i) => ({ value: String(i), label: String(i) }));
});

const getMemberNameById = (memberId) => {
  const member = store.members.find(m => m.$id?.value === memberId);
  return member ? member.playerName.value : '未知球員';
};

const getTeamNameById = (teamId) => {
  const team = store.teams.find(t => t.teamID?.value === teamId || t.$id?.value === teamId);
  return team ? team.teamName.value : '未知球隊';
};

const closeSuccessDialog = () => {
  showSuccessDialog.value = false;
  if (typeof postSuccessAction.value === 'function') {
    postSuccessAction.value();
  }
  postSuccessAction.value = null;
};


// Set initial default for player A1 to current user and auto-select their first team
const initDefaultA1 = () => {
  if (store.currentUser) {
    const teams = store.currentUser.teams?.value || [];
    if (teams.length > 0) {
      const sortedUserTeams = [...teams].sort((a, b) => a.value.teamID.value.localeCompare(b.value.teamID.value));
      teamA1.value = sortedUserTeams[0].value.teamID.value;
      playerA1.value = store.currentUser.$id.value;
    }
  }
};
initDefaultA1();

const loadTeamMembers = async (teamId) => {
  if (!teamId) return;
  const hasMembers = store.members.some(m =>
    (m.teams?.value || []).some(t => t.value?.teamID?.value === teamId)
  );
  if (hasMembers || store.allMembersLoaded) return;

  try {
    store.isLoading = true;
    const teamMembers = await API.getMembers({ teamID: teamId });
    const existingIds = new Set(store.members.map(m => m.$id?.value));
    const newMembers = (teamMembers || []).filter(m => !existingIds.has(m.$id?.value));
    store.members = [...store.members, ...newMembers];
  } catch (err) {
    console.error('Failed to load team members:', err);
  } finally {
    store.isLoading = false;
  }
};

// Watch teams to reset player if no longer valid under the selected team
watch(teamA1, async (newTeam) => {
  await loadTeamMembers(newTeam);
  const players = getPlayersForTeam(newTeam);
  if (!players.some(p => p.$id?.value === playerA1.value)) {
    playerA1.value = '';
  }
});
watch(teamA2, async (newTeam) => {
  await loadTeamMembers(newTeam);
  const players = getPlayersForTeam(newTeam);
  if (!players.some(p => p.$id?.value === playerA2.value)) {
    playerA2.value = '';
  }
});
watch(teamB1, async (newTeam) => {
  await loadTeamMembers(newTeam);
  const players = getPlayersForTeam(newTeam);
  if (!players.some(p => p.$id?.value === playerB1.value)) {
    playerB1.value = '';
  }
});
watch(teamB2, async (newTeam) => {
  await loadTeamMembers(newTeam);
  const players = getPlayersForTeam(newTeam);
  if (!players.some(p => p.$id?.value === playerB2.value)) {
    playerB2.value = '';
  }
});

const handleMatchSubmit = async () => {
  fieldErrors.value = {};
  formErrors.value = [];

  await nextTick();

  let errors = [];

  // 1. Check DateTime
  if (!matchDateTimeLocal.value) {
    errors.push('比賽時間為必填欄位。');
    fieldErrors.value.matchDateTime = '請選擇時間。';
  }

  // 2. Check Team A Player 1
  if (!playerA1.value) {
    errors.push('球員 A1 為必選欄位。');
    fieldErrors.value.playerA1 = '請選擇球員。';
  }
  if (!teamA1.value) {
    errors.push('球員 A1 的代表球隊為必選欄位。');
    fieldErrors.value.teamA1 = '請選擇球隊。';
  }

  // 3. Check Team B Player 1
  if (!playerB1.value) {
    errors.push('球員 B1 為必選欄位。');
    fieldErrors.value.playerB1 = '請選擇球員。';
  }
  if (!teamB1.value) {
    errors.push('球員 B1 的代表球隊為必選欄位。');
    fieldErrors.value.teamB1 = '請選擇球隊。';
  }

  // 4. Doubles Mode checks
  if (mode.value === 'doubles') {
    if (!playerA2.value) {
      errors.push('雙打模式下，球員 A2 為必選欄位。');
      fieldErrors.value.playerA2 = '請選擇球員。';
    }
    if (!teamA2.value) {
      errors.push('雙打模式下，球員 A2 的代表球隊為必選欄位。');
      fieldErrors.value.teamA2 = '請選擇球隊。';
    }
    if (!playerB2.value) {
      errors.push('雙打模式下，球員 B2 為必選欄位。');
      fieldErrors.value.playerB2 = '請選擇球員。';
    }
    if (!teamB2.value) {
      errors.push('雙打模式下，球員 B2 的代表球隊為必選欄位。');
      fieldErrors.value.teamB2 = '請選擇球隊。';
    }
  }

  // 5. Unique Players Validation
  const playersList = [];
  if (playerA1.value) playersList.push(playerA1.value);
  if (playerB1.value) playersList.push(playerB1.value);
  if (mode.value === 'doubles') {
    if (playerA2.value) playersList.push(playerA2.value);
    if (playerB2.value) playersList.push(playerB2.value);
  }

  if (playersList.length > 1) {
    const duplicates = playersList.filter((item, index) => playersList.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.push('同一個球員不能重複出現在不同的對戰位置！');
      if (duplicates.includes(playerA1.value)) fieldErrors.value.playerA1 = '球員名單重複。';
      if (duplicates.includes(playerB1.value)) fieldErrors.value.playerB1 = '球員名單重複。';
      if (mode.value === 'doubles') {
        if (duplicates.includes(playerA2.value)) fieldErrors.value.playerA2 = '球員名單重複。';
        if (duplicates.includes(playerB2.value)) fieldErrors.value.playerB2 = '球員名單重複。';
      }
    }
  }

  // 6. Tennis Score Rules Validation
  const sA = parseInt(scoreA.value, 10);
  const sB = parseInt(scoreB.value, 10);
  if (!isNaN(sA) && !isNaN(sB)) {
    if (!isValidTennisScore(sA, sB)) {
      errors.push('比數不符合網球規則！(需為 6:0 ~ 6:4, 7:5 或 7:6 搶七，且不能平手。)');
      fieldErrors.value.scoreA = '比數不合規。';
      fieldErrors.value.scoreB = '比數不合規。';
    }
  }

  if (errors.length > 0) {
    formErrors.value = errors;
    nextTick(() => {
      const banner = document.getElementById('match-form-error');
      if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return;
  }

  isSubmitting.value = true;
  const matchDateTime = new Date(matchDateTimeLocal.value).toISOString();

  // Format teams parameters
  const teamA = [{ playerID: playerA1.value, teamID: teamA1.value }];
  const teamB = [{ playerID: playerB1.value, teamID: teamB1.value }];
  if (mode.value === 'doubles') {
    teamA.push({ playerID: playerA2.value, teamID: teamA2.value });
    teamB.push({ playerID: playerB2.value, teamID: teamB2.value });
  }

  try {
    const res = await API.submitMatch({
      matchDateTime,
      teamA,
      teamB,
      teamA_score: sA,
      teamB_score: sB,
      matchType: matchType.value
    });

    if (res.success) {
      const submittedDateTime = matchDateTimeLocal.value;
      const submittedMatchType = matchType.value;
      const teamASummary = [
        `${getMemberNameById(playerA1.value)} / ${getTeamNameById(teamA1.value)}`
      ];
      if (mode.value === 'doubles') {
        teamASummary.push(`${getMemberNameById(playerA2.value)} / ${getTeamNameById(teamA2.value)}`);
      }

      const teamBSummary = [
        `${getMemberNameById(playerB1.value)} / ${getTeamNameById(teamB1.value)}`
      ];
      if (mode.value === 'doubles') {
        teamBSummary.push(`${getMemberNameById(playerB2.value)} / ${getTeamNameById(teamB2.value)}`);
      }

      await refreshAllData();

      // Reset form fields
      playerA1.value = '';
      playerA2.value = '';
      playerB1.value = '';
      playerB2.value = '';
      setDefaultDateTime();

      successDialogMessage.value = '已成功提交比賽紀錄，等待管理員審核。';
      successDialogDetails.value = [
        `提交時間：${submittedDateTime.replace('T', ' ')}`,
        `比賽型態：${submittedMatchType === 'weekday' ? '平日賽' : submittedMatchType === 'saturday' ? '週六挑戰賽' : '季賽 / 決賽'}`,
        `A 隊：${teamASummary.join('、')}`,
        `B 隊：${teamBSummary.join('、')}`,
        `比分：${sA} : ${sB}`
      ];
      postSuccessAction.value = () => {
        store.currentView = 'view-profile';
      };
      showSuccessDialog.value = true;
    } else {
      showToast('提交比分失敗: ' + (res.error || '未知伺服器錯誤'), 'error', handleMatchSubmit);
    }
  } catch (err) {
    console.error('Submit match failed:', err);
    showToast('網路或系統操作異常，提交失敗，請重試。', 'error', handleMatchSubmit);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="content-area">
    <h2 class="section-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
      輸入比賽比分
    </h2>

    <div class="card">
      <form id="match-form" @submit.prevent="handleMatchSubmit" novalidate>
        <!-- Form-Level Error Banner -->
        <div id="match-form-error" class="form-error-banner" v-if="formErrors.length > 0">
          <div class="form-error-banner-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>請修正以下表單錯誤：</span>
          </div>
          <ul class="form-error-banner-list">
            <li v-for="err in formErrors" :key="err">{{ err }}</li>
          </ul>
        </div>

        <!-- Singles / Doubles Toggle -->
        <div class="form-group">
          <label class="form-label">比賽種類</label>
          <div class="form-toggle">
            <button type="button" @click="mode = 'doubles'"
              :class="['form-toggle-btn', { active: mode === 'doubles' }]">
              雙打
            </button>
            <button type="button" @click="mode = 'singles'"
              :class="['form-toggle-btn', { active: mode === 'singles' }]">
              單打
            </button>
          </div>
        </div>

        <!-- Match Date & Type -->
        <div class="player-select-row">
          <div class="form-group" style="margin-bottom: 12px;">
            <label for="match-datetime" class="form-label">比賽時間</label>
            <input type="datetime-local" v-model="matchDateTimeLocal" id="match-datetime"
              :class="['input-control', { 'input-error': fieldErrors.matchDateTime }]" required />
            <div class="input-error-message" v-if="fieldErrors.matchDateTime">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ fieldErrors.matchDateTime }}</span>
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 12px;">
            <label for="match-type" class="form-label">賽制類別</label>
            <select v-model="matchType" id="match-type" class="input-control">
              <option value="weekday">平日 (勝{{ store.settings.weekday_win_score }}/負{{ store.settings.weekday_lose_score
                }})</option>
              <option value="saturday">週六挑戰日 (勝{{ store.settings.challenge_win_score }}/負{{
                store.settings.challenge_lose_score }})</option>
              <option value="season">季賽/年終賽 (勝{{ store.settings.finals_win_score }}/負{{ store.settings.finals_lose_score
                }})</option>
            </select>
          </div>
        </div>

        <!-- TEAM A -->
        <div style="margin-top: 12px; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;">
          <span class="team-box-header team-box-a">A 隊 (Team A)</span>

          <!-- Player A1 -->
          <div class="player-select-row">
            <!-- Team select (Left) -->
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球隊 A1</label>
              <ModalSelect v-model="teamA1" :options="teamOptions" title="選擇球隊 A1" placeholder="選擇球隊"
                :error="fieldErrors.teamA1" />
            </div>

            <!-- Player select (Right) -->
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球員 A1</label>
              <ModalSelect v-model="playerA1" :options="playerA1Options" title="選擇球員 A1" placeholder="選擇球員"
                :error="fieldErrors.playerA1" :disabled="!teamA1" />
            </div>
          </div>

          <!-- Player A2 (Doubles only) -->
          <div v-show="mode === 'doubles'" class="player-select-row">
            <!-- Team select (Left) -->
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球隊 A2</label>
              <ModalSelect v-model="teamA2" :options="teamOptions" title="選擇球隊 A2" placeholder="選擇球隊"
                :error="fieldErrors.teamA2" />
            </div>

            <!-- Player select (Right) -->
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球員 A2</label>
              <ModalSelect v-model="playerA2" :options="playerA2Options" title="選擇球員 A2" placeholder="選擇球員"
                :error="fieldErrors.playerA2" :disabled="!teamA2" />
            </div>
          </div>
        </div>

        <!-- TEAM B -->
        <div style="margin-top: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;">
          <span class="team-box-header team-box-b">B 隊 (Team B)</span>

          <!-- Player B1 -->
          <div class="player-select-row">
            <!-- Team select (Left) -->
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球隊 B1</label>
              <ModalSelect v-model="teamB1" :options="teamOptions" title="選擇球隊 B1" placeholder="選擇球隊"
                :error="fieldErrors.teamB1" />
            </div>

            <!-- Player select (Right) -->
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球員 B1</label>
              <ModalSelect v-model="playerB1" :options="playerB1Options" title="選擇球員 B1" placeholder="選擇球員"
                :error="fieldErrors.playerB1" :disabled="!teamB1" />
            </div>
          </div>

          <!-- Player B2 (Doubles only) -->
          <div v-show="mode === 'doubles'" class="player-select-row">
            <!-- Team select (Left) -->
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球隊 B2</label>
              <ModalSelect v-model="teamB2" :options="teamOptions" title="選擇球隊 B2" placeholder="選擇球隊"
                :error="fieldErrors.teamB2" />
            </div>

            <!-- Player select (Right) -->
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球員 B2</label>
              <ModalSelect v-model="playerB2" :options="playerB2Options" title="選擇球員 B2" placeholder="選擇球員"
                :error="fieldErrors.playerB2" :disabled="!teamB2" />
            </div>
          </div>
        </div>

        <!-- Scores Input -->
        <div style="margin-top: 16px; margin-bottom: 24px;">
          <label class="form-label">比賽比數</label>
          <div class="player-select-row">
            <div class="form-group" style="margin-bottom: 0;">
              <label for="score-a" class="form-label" style="font-size: 12px; color: var(--color-primary);">A
                隊比數</label>
              <ModalSelect v-model="scoreA" :options="scoreOptions" title="選擇 A 隊比數" placeholder="A 隊比數"
                :error="fieldErrors.scoreA" />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label for="score-b" class="form-label" style="font-size: 12px; color: var(--color-accent-dark);">B
                隊比數</label>
              <ModalSelect v-model="scoreB" :options="scoreOptions" title="選擇 B 隊比數" placeholder="B 隊比數"
                :error="fieldErrors.scoreB" />
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          <span>{{ isSubmitting ? '發送中...' : '送出比分紀錄' }}</span>
          <svg v-if="!isSubmitting" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </button>
      </form>
    </div>
  </div>
  <SuccessDialog
    v-model:open="showSuccessDialog"
    title="比分提交成功"
    :message="successDialogMessage"
    :details="successDialogDetails"
    confirm-text="確認"
    @confirm="closeSuccessDialog"
  />
</template>
