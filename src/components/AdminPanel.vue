<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { store, showToast, API } from '../scripts/store';

// Settings form — sync from DB values whenever settings finish loading
const settingsForm = ref({ ...store.settings });
watch(
  () => store.settingsLoaded,
  (loaded) => { if (loaded) settingsForm.value = { ...store.settings }; },
  { immediate: true }
);

const isSavingSettings = ref(false);
const saveSettings = async () => {
  isSavingSettings.value = true;
  try {
    const res = await API.updateSettings(settingsForm.value);
    if (res.success) {
      Object.assign(store.settings, settingsForm.value);
      showToast('設定已更新', 'success');
    } else {
      showToast('更新失敗：' + (res.error || '未知錯誤'), 'error');
    }
  } catch (err) {
    showToast('更新異常，請重試', 'error');
  } finally {
    isSavingSettings.value = false;
  }
};

// --- Admin password gate ---
const ADMIN_SESSION_KEY = 'tennis_admin_auth';
const ADMIN_SESSION_TTL = 86400000; // 1 day in ms

function loadAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const { authedAt } = JSON.parse(raw);
    if (Date.now() - authedAt > ADMIN_SESSION_TTL) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    return false;
  }
}

function saveAdminSession() {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ authedAt: Date.now() }));
}

const isAdminAuthed = ref(loadAdminSession());
const adminPassword = ref('');
const authError = ref('');
const isAuthLoading = ref(false);

const submitAdminPassword = async () => {
  if (!adminPassword.value) return;
  isAuthLoading.value = true;
  authError.value = '';
  try {
    const res = await API.adminAuth(adminPassword.value);
    if (res.success) {
      saveAdminSession();
      isAdminAuthed.value = true;
    } else {
      authError.value = res.error || '密碼錯誤，請再試一次。';
    }
  } catch (err) {
    authError.value = '驗證失敗，請稍後再試。';
  } finally {
    isAuthLoading.value = false;
    adminPassword.value = '';
  }
};
const logoutAdmin = () => {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  isAdminAuthed.value = false;
};
// --- End password gate ---

const activeTab = computed({
  get: () => store.adminActiveTab,
  set: (val) => {
    store.adminActiveTab = val;
  }
});

// 1. Lists Filtering
const unverifiedMembers = computed(() => {
  return store.members.filter(m => m.isVerified.value === 'false');
});

const unverifiedMatches = computed(() => {
  return store.matches.filter(m => m.isVerified.value === 'false');
});

// 2. Formatting Helpers
const getPlayersNames = (subtable, playerField) => {
  if (!subtable || !subtable.value) return '-';
  return subtable.value.map(row => {
    const pId = row.value[playerField].value;
    const member = store.members.find(mem => mem.$id.value === pId);
    return member ? member.playerName.value : '未知球員';
  }).join(' / ');
};

const getMatchSidePlayers = (subtable, playerField, teamField) => {
  if (!subtable || !subtable.value) return [];

  return subtable.value.map(row => {
    const pId = row.value?.[playerField]?.value;
    const teamId = row.value?.[teamField]?.value;
    const member = store.members.find(mem => mem.$id?.value === pId);
    const team = store.teams.find(t => t.teamID?.value === teamId || t.$id?.value === teamId);

    return {
      id: pId || `${playerField}-${teamField}`,
      name: member ? member.playerName.value : '未知球員',
      teamName: team ? (team.teamName?.value || '無隊伍') : '無隊伍'
    };
  });
};

const formatMatchDate = (dateStr) => {
  if (!dateStr) return '-';
  const dateObj = new Date(dateStr);
  return `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
};

const loadAdminMembers = async () => {
  try {
    store.isLoading = true;

    if (!store.settingsLoaded) {
      try {
        const settings = await API.getSettings();
        if (settings) {
          store.settings = { ...store.settings, ...settings };
          store.settingsLoaded = true;
          settingsForm.value = { ...store.settings };
        }
      } catch (err) {
        console.error('Failed to load admin settings:', err);
      }
    }

    const mergeMembersById = (currentMembers, incomingMembers) => {
      const mergedById = new Map(currentMembers.map(member => [member.$id?.value, member]));
      incomingMembers.forEach(member => {
        if (member?.$id?.value) {
          mergedById.set(member.$id.value, member);
        }
      });
      return Array.from(mergedById.values());
    };

    // 1. Fetch unverified matches
    const unverifiedMatches = await API.getMatches({ isVerified: 'false' });
    const existingMatchIds = new Set(store.matches.map(m => m.$id?.value));
    const newMatches = (unverifiedMatches || []).filter(m => !existingMatchIds.has(m.$id?.value));
    store.matches = [...store.matches, ...newMatches];

    // 2. Fetch unverified members (raw=true → no phone masking for admin)
    const unverified = await API.getMembers({ isVerified: 'false', raw: 'true' });
    store.members = mergeMembersById(store.members, unverified || []);

    // 3. Fetch members involved in these unverified matches
    const matchPlayerIds = [];
    store.matches.forEach(match => {
      if (match.isVerified?.value === 'false') {
        const teamAPlayers = (match.teamA?.value || []).map(row => row.value?.playerID_A?.value).filter(Boolean);
        const teamBPlayers = (match.teamB?.value || []).map(row => row.value?.playerID_B?.value).filter(Boolean);
        matchPlayerIds.push(...teamAPlayers, ...teamBPlayers);
      }
    });

    const uniqueIds = [...new Set(matchPlayerIds)];
    const missingIds = uniqueIds.filter(id => !store.members.some(m => m.$id?.value === id));

    if (missingIds.length > 0) {
      const matchMembers = await API.getMembers({ ids: missingIds.join(','), raw: 'true' });
      store.members = mergeMembersById(store.members, matchMembers || []);
    }
  } catch (err) {
    console.error('Failed to load admin data:', err);
  } finally {
    store.isLoading = false;
  }
};

onMounted(() => {
  if (isAdminAuthed.value) loadAdminMembers();
});

// Load admin data once the password gate is passed
watch(isAdminAuthed, (val) => {
  if (val) loadAdminMembers();
});

// Re-sync settings form whenever the settings tab is opened
watch(activeTab, (tab) => {
  if (tab === 'settings') settingsForm.value = { ...store.settings };
});

// 3. Admin Actions
const verifyingMemberId = ref(null);
const approveMember = async (id) => {
  verifyingMemberId.value = id;
  try {
    const res = await API.verifyMember(id);
    if (res.id) {
      showToast('會員驗證成功！', 'success');
      store.members = store.members.filter(m => m.$id?.value !== id);
      await loadAdminMembers();
    } else {
      showToast('會員驗證失敗：' + (res.error || '未知伺服器錯誤'), 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('會員驗證異常，請重試。', 'error');
  } finally {
    verifyingMemberId.value = null;
  }
};

const verifyingMatchId = ref(null);
const approveMatch = async (matchID) => {
  verifyingMatchId.value = matchID;
  try {
    const res = await API.verifyMatch(matchID);
    if (res.success) {
      showToast('比賽已驗證，球員積分已更新。', 'success');
      store.matches = store.matches.filter(match => match.$id?.value !== matchID);
      await loadAdminMembers();
    } else {
      showToast('比賽驗證失敗：' + (res.error || '未知伺服器錯誤'), 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('比賽驗證異常，請重試。', 'error');
  } finally {
    verifyingMatchId.value = null;
  }
};
</script>

<template>
  <div class="content-area">

    <!-- Password Gate -->
    <div v-if="!isAdminAuthed" class="login-container">
      <div class="login-logo">🔐</div>
      <h1 class="login-title">管理員登入</h1>
      <p class="login-subtitle">請輸入管理員密碼以進入後台</p>

      <div class="card login-card">
        <form @submit.prevent="submitAdminPassword" novalidate>
          <div class="form-group">
            <label for="admin-password" class="form-label">管理員密碼</label>
            <div class="input-wrapper">
              <input type="password" id="admin-password" v-model="adminPassword"
                :class="['input-control', { 'input-error': authError }]" placeholder="請輸入密碼"
                autocomplete="current-password" :disabled="isAuthLoading" />
              <button v-if="adminPassword" type="button" class="clear-btn" @click="adminPassword = ''; authError = ''"
                aria-label="清除輸入" :disabled="isAuthLoading">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div class="input-error-message" v-if="authError">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ authError }}</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="isAuthLoading || !adminPassword">
            <span>{{ isAuthLoading ? '驗證中...' : '進入後台' }}</span>
            <svg v-if="!isAuthLoading" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </button>
        </form>
      </div>
    </div>

    <!-- Admin Panel (shown after auth) -->
    <template v-else>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <h2 class="section-title" style="margin-bottom: 0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          管理後台
        </h2>
        <button type="button" class="logout-btn" @click="logoutAdmin">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          退出後台
        </button>
      </div>

      <div class="card" style="padding: 16px;">
        <!-- Admin Tabs -->
        <div class="admin-tab-bar">
          <button type="button" @click="activeTab = 'members'"
            :class="['admin-tab-btn', { active: activeTab === 'members' }]">
            待審核會員
          </button>
          <button type="button" @click="activeTab = 'matches'"
            :class="['admin-tab-btn', { active: activeTab === 'matches' }]">
            待審核比賽
          </button>
          <button type="button" @click="activeTab = 'settings'"
            :class="['admin-tab-btn', { active: activeTab === 'settings' }]">
            全站設定
          </button>
        </div>

        <!-- Unverified Members List -->
        <div v-show="activeTab === 'members'" class="admin-list">
          <div v-if="unverifiedMembers.length === 0"
            style="text-align: center; color: var(--color-text-muted); padding: 20px 0; font-size: 14px;">
            目前沒有待審核會員
          </div>

          <div v-else>
            <div v-for="m in unverifiedMembers" :key="m.$id.value" class="card admin-card">
              <div class="admin-card-row">
                <div class="admin-card-info">
                  <div class="admin-card-name">
                    {{ m.playerName.value }}
                    <span class="admin-card-meta">{{ m.gender.value }}</span>
                  </div>
                  <div class="admin-card-sub">
                    {{ m.playerPhone.value }}
                    <span class="admin-card-dot">·</span>
                    <div class="admin-team-badges">
                      <span
                        v-for="team in (m.teams.value || [])"
                        :key="team.value.teamID.value"
                        class="admin-team-badge"
                      >
                        {{ team.value.teamName.value }}
                      </span>
                      <span v-if="!(m.teams.value || []).length" class="admin-team-badge admin-team-badge-empty">
                        無隊伍
                      </span>
                    </div>
                  </div>
                </div>
                <button type="button" class="btn btn-accent btn-sm" style="color: white;"
                  :disabled="verifyingMemberId === m.$id.value" @click="approveMember(m.$id.value)">
                  {{ verifyingMemberId === m.$id.value ? '…' : '驗證' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Unverified Matches List -->
        <div v-show="activeTab === 'matches'" class="admin-list">
          <div v-if="unverifiedMatches.length === 0"
            style="text-align: center; color: var(--color-text-muted); padding: 20px 0; font-size: 14px;">
            目前沒有待審核比賽
          </div>

          <div v-else>
            <div v-for="match in unverifiedMatches" :key="match.$id.value" class="card admin-card">
              <div class="admin-card-row">
                <div class="admin-card-info">
                  <div class="admin-match-teams">
                    <div class="admin-match-side">
                      <div
                        v-for="player in getMatchSidePlayers(match.teamA, 'playerID_A', 'teamID_A')"
                        :key="player.id"
                        class="admin-match-player"
                      >
                        <span class="admin-team-badge admin-match-team-badge">{{ player.teamName }}</span>
                        <span class="admin-match-player-name">{{ player.name }}</span>
                      </div>
                    </div>
                    <span class="admin-match-score">{{ match.teamA_score.value }} : {{ match.teamB_score.value }}</span>
                    <div class="admin-match-side admin-match-side-right">
                      <div
                        v-for="player in getMatchSidePlayers(match.teamB, 'playerID_B', 'teamID_B')"
                        :key="player.id"
                        class="admin-match-player admin-match-player-right"
                      >
                        <span class="admin-team-badge admin-match-team-badge">{{ player.teamName }}</span>
                        <span class="admin-match-player-name">{{ player.name }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="admin-card-sub">
                    {{ formatMatchDate(match.matchDateTime.value) }}
                    <span class="admin-card-dot">·</span>
                    ID {{ match.$id.value }}
                  </div>
                </div>
                <button type="button" class="btn btn-accent btn-sm" style="color: white;"
                  :disabled="verifyingMatchId === match.$id.value" @click="approveMatch(match.$id.value)">
                  {{ verifyingMatchId === match.$id.value ? '…' : '驗證' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- Settings -->
        <div v-show="activeTab === 'settings'" class="settings-panel">

          <div class="settings-group">
            <div class="settings-group-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" class="settings-group-icon">
                <line x1="21" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="21" y1="18" x2="3" y2="18" />
              </svg>
              首頁頂部文字
            </div>
            <div class="settings-row settings-row-full">
              <input type="text" class="settings-input settings-input-full" v-model="settingsForm.top_bar_subtitle"
                placeholder="留空則不顯示" />
            </div>
          </div>

          <div class="settings-group">
            <div class="settings-group-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" class="settings-group-icon">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              平日賽事
            </div>
            <div class="settings-row">
              <label class="settings-label">
                <svg viewBox="0 0 24 24" fill="currentColor" class="settings-score-icon win">
                  <path
                    d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9V19H4v2h16v-2h-3v-4.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z" />
                </svg>
                勝方加分
              </label>
              <div class="settings-input-row">
                <input type="number" min="0" class="settings-input" v-model.number="settingsForm.weekday_win_score" />
                <span class="settings-unit">分</span>
              </div>
            </div>
            <div class="settings-row">
              <label class="settings-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                  stroke-linejoin="round" class="settings-score-icon lose">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                負方加分
              </label>
              <div class="settings-input-row">
                <input type="number" min="0" class="settings-input" v-model.number="settingsForm.weekday_lose_score" />
                <span class="settings-unit">分</span>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <div class="settings-group-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" class="settings-group-icon">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              週六挑戰賽
            </div>
            <div class="settings-row">
              <label class="settings-label">
                <svg viewBox="0 0 24 24" fill="currentColor" class="settings-score-icon win">
                  <path
                    d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9V19H4v2h16v-2h-3v-4.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z" />
                </svg>
                勝方加分
              </label>
              <div class="settings-input-row">
                <input type="number" min="0" class="settings-input" v-model.number="settingsForm.challenge_win_score" />
                <span class="settings-unit">分</span>
              </div>
            </div>
            <div class="settings-row">
              <label class="settings-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                  stroke-linejoin="round" class="settings-score-icon lose">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                負方加分
              </label>
              <div class="settings-input-row">
                <input type="number" min="0" class="settings-input"
                  v-model.number="settingsForm.challenge_lose_score" />
                <span class="settings-unit">分</span>
              </div>
            </div>
          </div>

          <div class="settings-group">
            <div class="settings-group-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" class="settings-group-icon">
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
              </svg>
              季賽／年終賽
            </div>
            <div class="settings-row">
              <label class="settings-label">
                <svg viewBox="0 0 24 24" fill="currentColor" class="settings-score-icon win">
                  <path
                    d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9V19H4v2h16v-2h-3v-4.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z" />
                </svg>
                勝方加分
              </label>
              <div class="settings-input-row">
                <input type="number" min="0" class="settings-input" v-model.number="settingsForm.finals_win_score" />
                <span class="settings-unit">分</span>
              </div>
            </div>
            <div class="settings-row">
              <label class="settings-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
                  stroke-linejoin="round" class="settings-score-icon lose">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                負方加分
              </label>
              <div class="settings-input-row">
                <input type="number" min="0" class="settings-input" v-model.number="settingsForm.finals_lose_score" />
                <span class="settings-unit">分</span>
              </div>
            </div>
          </div>

          <button type="button" class="btn btn-primary" :disabled="isSavingSettings" @click="saveSettings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
              stroke-linejoin="round" style="width:18px;height:18px">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {{ isSavingSettings ? '更新中...' : '更新設定' }}
          </button>

        </div>
      </div>
    </template><!-- end v-else admin panel -->
  </div>
</template>

<style scoped>
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-wrapper .input-control {
  padding-right: 44px;
}

.clear-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 50%;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  z-index: 2;
}

.clear-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--color-text-dark);
}

.clear-btn:focus {
  outline: none;
  background-color: rgba(0, 0, 0, 0.08);
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast), background-color var(--transition-fast);
}

.logout-btn:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
  background-color: rgba(220, 38, 38, 0.05);
}

.admin-list>div {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Admin card — distinct background, compact padding */
:deep(.admin-card) {
  background-color: var(--color-bg-page);
  box-shadow: none;
  padding: 10px 14px;
}

:deep(.admin-card):hover {
  transform: none;
  box-shadow: none;
}

.admin-card-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-card-row>.btn {
  flex-shrink: 0;
  width: auto;
  min-width: 72px;
}

.admin-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.admin-card-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-dark);
  line-height: 1.4;
  word-break: break-word;
}

.admin-card-meta {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-left: 4px;
}

.admin-card-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  line-height: 1.4;
}

.admin-card-dot {
  margin: 0;
  opacity: 0.4;
  flex-shrink: 0;
}

.admin-team-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.admin-team-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(29, 93, 58, 0.08);
  border: 1px solid rgba(29, 93, 58, 0.12);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.admin-team-badge-empty {
  color: var(--color-text-muted);
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
}

.admin-match-teams {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-dark);
  line-height: 1.4;
}

.admin-match-side {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.admin-match-side-right {
  align-items: flex-end;
  text-align: right;
}

.admin-match-player {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.admin-match-player-right {
  justify-content: flex-end;
}

.admin-match-score {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.admin-match-team-badge {
  flex-shrink: 0;
}

/* Settings panel */
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.settings-group {
  background-color: var(--color-bg-page);
  border-radius: var(--border-radius-sm);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-group-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-dark);
  margin-bottom: 2px;
}

.settings-group-icon {
  width: 15px;
  height: 15px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-row-full {
  justify-content: stretch;
}

.settings-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-dark);
}

.settings-score-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.settings-score-icon.win {
  color: var(--color-success);
}

.settings-score-icon.lose {
  color: var(--color-danger);
}

.settings-input-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.settings-input {
  width: 72px;
  height: 36px;
  padding: 0 10px;
  border: 1.5px solid rgba(29, 93, 58, 0.2);
  border-radius: var(--border-radius-sm);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-dark);
  background: var(--color-bg-card);
  text-align: center;
  outline: none;
  transition: border-color var(--transition-fast);
}

.settings-input:focus {
  border-color: var(--color-primary);
}

.settings-input-full {
  width: 100%;
  text-align: left;
  font-weight: 400;
  font-size: 14px;
}

.settings-unit {
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
