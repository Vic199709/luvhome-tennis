<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { store, refreshAllData, showToast, isValidTennisScore } from '../scripts/store';

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

// Player selections
const playerA1 = ref(store.currentUser ? store.currentUser.$id.value : '');
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

// Team options per player selection
const playerA1Teams = ref([]);
const playerA2Teams = ref([]);
const playerB1Teams = ref([]);
const playerB2Teams = ref([]);

// Validation state
const fieldErrors = ref({});
const formErrors = ref([]);
const isSubmitting = ref(false);

const mode = computed({
  get: () => store.matchMode,
  set: (val) => {
    store.matchMode = val;
    // Clear errors on mode switch
    fieldErrors.value = {};
    formErrors.value = [];
  }
});

// Watch players and auto-populate representative team dropdowns
const updateTeamsForPlayer = (playerId, targetTeamsRef, targetSelectedValRef) => {
  if (!playerId) {
    targetTeamsRef.value = [];
    targetSelectedValRef.value = '';
    return;
  }
  const member = store.members.find(m => m.$id.value === playerId);
  if (member && member.teams?.value) {
    targetTeamsRef.value = member.teams.value.map(t => ({
      id: t.value.teamID.value,
      name: t.value.teamName.value
    })).sort((a, b) => a.id.localeCompare(b.id));
    if (targetTeamsRef.value.length > 0) {
      targetSelectedValRef.value = targetTeamsRef.value[0].id;
    } else {
      targetSelectedValRef.value = '';
    }
  } else {
    targetTeamsRef.value = [];
    targetSelectedValRef.value = '';
  }
};

watch(playerA1, (val) => updateTeamsForPlayer(val, playerA1Teams, teamA1), { immediate: true });
watch(playerA2, (val) => updateTeamsForPlayer(val, playerA2Teams, teamA2), { immediate: true });
watch(playerB1, (val) => updateTeamsForPlayer(val, playerB1Teams, teamB1), { immediate: true });
watch(playerB2, (val) => updateTeamsForPlayer(val, playerB2Teams, teamB2), { immediate: true });

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
    const res = await store.submitMatch ? store.submitMatch({
      matchDateTime,
      teamA,
      teamB,
      teamA_score: sA,
      teamB_score: sB,
      matchType: matchType.value
    }) : fetch('/.netlify/functions/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchDateTime,
        teamA,
        teamB,
        teamA_score: sA,
        teamB_score: sB,
        matchType: matchType.value
      })
    }).then(r => r.json());

    if (res.success) {
      showToast('比分紀錄已成功提交審核！', 'success');
      await refreshAllData();
      
      // Reset form fields
      playerA1.value = '';
      playerA2.value = '';
      playerB1.value = '';
      playerB2.value = '';
      setDefaultDateTime();
      
      store.currentView = 'view-profile';
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
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
      輸入比賽比分
    </h2>

    <div class="card">
      <form id="match-form" @submit.prevent="handleMatchSubmit" novalidate>
        <!-- Form-Level Error Banner -->
        <div 
          id="match-form-error" 
          class="form-error-banner"
          v-if="formErrors.length > 0"
        >
          <div class="form-error-banner-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
            <button 
              type="button" 
              @click="mode = 'doubles'"
              :class="['form-toggle-btn', { active: mode === 'doubles' }]"
            >
              雙打
            </button>
            <button 
              type="button" 
              @click="mode = 'singles'"
              :class="['form-toggle-btn', { active: mode === 'singles' }]"
            >
              單打
            </button>
          </div>
        </div>

        <!-- Match Date & Type -->
        <div class="player-select-row">
          <div class="form-group" style="margin-bottom: 12px;">
            <label for="match-type" class="form-label">賽制類別</label>
            <select v-model="matchType" id="match-type" class="input-control">
              <option value="weekday">平日 (勝10/負3)</option>
              <option value="saturday">週六挑戰日 (勝15/負5)</option>
              <option value="season">季賽/年終賽 (勝30/負10)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 12px;">
            <label for="match-datetime" class="form-label">比賽時間</label>
            <input 
              type="datetime-local" 
              v-model="matchDateTimeLocal" 
              id="match-datetime" 
              :class="['input-control', { 'input-error': fieldErrors.matchDateTime }]"
              required 
            />
            <div class="input-error-message" v-if="fieldErrors.matchDateTime">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{{ fieldErrors.matchDateTime }}</span>
            </div>
          </div>
        </div>

        <!-- TEAM A -->
        <div style="margin-top: 12px; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;">
          <span class="team-box-header team-box-a">A 隊 (Team A)</span>
          
          <!-- Player A1 -->
          <div class="player-select-row">
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球員 A1</label>
              <select 
                v-model="playerA1" 
                :class="['input-control select-player', { 'input-error': fieldErrors.playerA1 }]"
                required
              >
                <option value="">選擇球員</option>
                <option 
                  v-for="m in store.members" 
                  :key="m.$id.value" 
                  :value="m.$id.value"
                >
                  {{ m.playerName.value }} ({{ m.playerPhone.value.slice(-4) }})
                </option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.playerA1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.playerA1 }}</span>
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球隊 A1</label>
              <select 
                v-model="teamA1" 
                :class="['input-control select-team', { 'input-error': fieldErrors.teamA1 }]"
                required
              >
                <option value="">選擇球隊</option>
                <option 
                  v-for="t in playerA1Teams" 
                  :key="t.id" 
                  :value="t.id"
                >
                  {{ t.name }}
                </option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.teamA1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.teamA1 }}</span>
              </div>
            </div>
          </div>

          <!-- Player A2 (Doubles only) -->
          <div v-show="mode === 'doubles'" class="player-select-row">
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球員 A2</label>
              <select 
                v-model="playerA2" 
                :class="['input-control select-player', { 'input-error': fieldErrors.playerA2 }]"
              >
                <option value="">選擇球員</option>
                <option 
                  v-for="m in store.members" 
                  :key="m.$id.value" 
                  :value="m.$id.value"
                >
                  {{ m.playerName.value }} ({{ m.playerPhone.value.slice(-4) }})
                </option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.playerA2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.playerA2 }}</span>
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球隊 A2</label>
              <select 
                v-model="teamA2" 
                :class="['input-control select-team', { 'input-error': fieldErrors.teamA2 }]"
              >
                <option value="">選擇球隊</option>
                <option 
                  v-for="t in playerA2Teams" 
                  :key="t.id" 
                  :value="t.id"
                >
                  {{ t.name }}
                </option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.teamA2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.teamA2 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- TEAM B -->
        <div style="margin-top: 16px; border-bottom: 1px solid #E5E7EB; padding-bottom: 12px;">
          <span class="team-box-header team-box-b">B 隊 (Team B)</span>
          
          <!-- Player B1 -->
          <div class="player-select-row">
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球員 B1</label>
              <select 
                v-model="playerB1" 
                :class="['input-control select-player', { 'input-error': fieldErrors.playerB1 }]"
                required
              >
                <option value="">選擇球員</option>
                <option 
                  v-for="m in store.members" 
                  :key="m.$id.value" 
                  :value="m.$id.value"
                >
                  {{ m.playerName.value }} ({{ m.playerPhone.value.slice(-4) }})
                </option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.playerB1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.playerB1 }}</span>
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球隊 B1</label>
              <select 
                v-model="teamB1" 
                :class="['input-control select-team', { 'input-error': fieldErrors.teamB1 }]"
                required
              >
                <option value="">選擇球隊</option>
                <option 
                  v-for="t in playerB1Teams" 
                  :key="t.id" 
                  :value="t.id"
                >
                  {{ t.name }}
                </option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.teamB1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.teamB1 }}</span>
              </div>
            </div>
          </div>

          <!-- Player B2 (Doubles only) -->
          <div v-show="mode === 'doubles'" class="player-select-row">
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球員 B2</label>
              <select 
                v-model="playerB2" 
                :class="['input-control select-player', { 'input-error': fieldErrors.playerB2 }]"
              >
                <option value="">選擇球員</option>
                <option 
                  v-for="m in store.members" 
                  :key="m.$id.value" 
                  :value="m.$id.value"
                >
                  {{ m.playerName.value }} ({{ m.playerPhone.value.slice(-4) }})
                </option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.playerB2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.playerB2 }}</span>
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="font-size: 12px;">球隊 B2</label>
              <select 
                v-model="teamB2" 
                :class="['input-control select-team', { 'input-error': fieldErrors.teamB2 }]"
              >
                <option value="">選擇球隊</option>
                <option 
                  v-for="t in playerB2Teams" 
                  :key="t.id" 
                  :value="t.id"
                >
                  {{ t.name }}
                </option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.teamB2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.teamB2 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Scores Input -->
        <div style="margin-top: 16px; margin-bottom: 24px;">
          <label class="form-label">比賽比數</label>
          <div class="player-select-row">
            <div class="form-group" style="margin-bottom: 0;">
              <label for="score-a" class="form-label" style="font-size: 12px; color: var(--color-primary);">A 隊比數</label>
              <select 
                v-model="scoreA" 
                id="score-a" 
                :class="['input-control', { 'input-error': fieldErrors.scoreA }]"
                required
              >
                <option v-for="n in 8" :key="n - 1" :value="String(n - 1)">{{ n - 1 }}</option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.scoreA">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.scoreA }}</span>
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label for="score-b" class="form-label" style="font-size: 12px; color: var(--color-accent-dark);">B 隊比數</label>
              <select 
                v-model="scoreB" 
                id="score-b" 
                :class="['input-control', { 'input-error': fieldErrors.scoreB }]"
                required
              >
                <option v-for="n in 8" :key="n - 1" :value="String(n - 1)">{{ n - 1 }}</option>
              </select>
              <div class="input-error-message" v-if="fieldErrors.scoreB">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ fieldErrors.scoreB }}</span>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          <span>{{ isSubmitting ? '發送中...' : '送出比分紀錄' }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </button>
      </form>
    </div>
  </div>
</template>
