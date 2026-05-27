<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { store, refreshAllData, showToast, API } from '../scripts/store';

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
      authError.value = res.error || '密碼錯誤';
    }
  } catch (err) {
    authError.value = '驗證失敗，請重試。';
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

const formatMatchDate = (dateStr) => {
  if (!dateStr) return '-';
  const dateObj = new Date(dateStr);
  return `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
};

const loadAdminMembers = async () => {
  try {
    store.isLoading = true;
    
    // 1. Fetch unverified matches
    const unverifiedMatches = await API.getMatches({ isVerified: 'false' });
    const existingMatchIds = new Set(store.matches.map(m => m.$id?.value));
    const newMatches = (unverifiedMatches || []).filter(m => !existingMatchIds.has(m.$id?.value));
    store.matches = [...store.matches, ...newMatches];

    // 2. Fetch unverified members
    const unverified = await API.getMembers({ isVerified: 'false' });
    const existingIds = new Set(store.members.map(m => m.$id?.value));
    const newMembers = (unverified || []).filter(m => !existingIds.has(m.$id?.value));
    store.members = [...store.members, ...newMembers];
    
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
      const matchMembers = await API.getMembers({ ids: missingIds.join(',') });
      const currentIds = new Set(store.members.map(m => m.$id?.value));
      const filteredMatchMembers = (matchMembers || []).filter(m => !currentIds.has(m.$id?.value));
      store.members = [...store.members, ...filteredMatchMembers];
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

// 3. Admin Actions
const verifyingMemberId = ref(null);
const approveMember = async (id) => {
  verifyingMemberId.value = id;
  try {
    const res = await API.verifyMember(id);
    if (res.id) {
      showToast('會員驗證成功！', 'success');
      await refreshAllData();
    } else {
      showToast('驗證失敗: ' + (res.error || '未知伺服器錯誤'), 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('驗證處理異常，請重試。', 'error');
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
      showToast('比分已成功驗證並過帳！球員與球隊積分已更新。', 'success');
      await refreshAllData();
    } else {
      showToast('審核過帳失敗: ' + (res.error || '未知伺服器錯誤'), 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('過帳處理異常，請重試。', 'error');
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
      <p class="login-subtitle">請輸入管理員密碼以進入審核主控台</p>

      <div class="card login-card">
        <form @submit.prevent="submitAdminPassword" novalidate>
          <div class="form-group">
            <label for="admin-password" class="form-label">管理員密碼</label>
            <div class="input-wrapper">
              <input
                type="password"
                id="admin-password"
                v-model="adminPassword"
                :class="['input-control', { 'input-error': authError }]"
                placeholder="請輸入管理員密碼"
                autocomplete="current-password"
                :disabled="isAuthLoading"
              />
              <button
                v-if="adminPassword"
                type="button"
                class="clear-btn"
                @click="adminPassword = ''; authError = ''"
                aria-label="清除輸入"
                :disabled="isAuthLoading"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div class="input-error-message" v-if="authError">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{{ authError }}</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="isAuthLoading || !adminPassword">
            <span>{{ isAuthLoading ? '驗證中...' : '進入管理主控台' }}</span>
            <svg v-if="!isAuthLoading" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          </button>
        </form>
      </div>
    </div>

    <!-- Admin Panel (shown after auth) -->
    <template v-else>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <h2 class="section-title" style="margin-bottom: 0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        管理員審核主控台
      </h2>
      <button type="button" class="logout-btn" @click="logoutAdmin">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        登出
      </button>
    </div>

    <div class="card" style="padding: 16px;">
      <!-- Admin Tabs -->
      <div class="admin-tab-bar">
        <button 
          type="button" 
          @click="activeTab = 'members'"
          :class="['admin-tab-btn', { active: activeTab === 'members' }]"
        >
          待驗證會員
        </button>
        <button 
          type="button" 
          @click="activeTab = 'matches'"
          :class="['admin-tab-btn', { active: activeTab === 'matches' }]"
        >
          待驗證比賽
        </button>
      </div>

      <!-- Unverified Members List -->
      <div v-show="activeTab === 'members'" class="admin-list">
        <div 
          v-if="unverifiedMembers.length === 0" 
          style="text-align: center; color: var(--color-text-muted); padding: 20px 0; font-size: 14px;"
        >
          目前沒有待審核的會員
        </div>
        
        <div v-else>
          <div 
            v-for="m in unverifiedMembers" 
            :key="m.$id.value" 
            class="card admin-card"
          >
            <div class="admin-card-header">
              <span class="admin-card-title">{{ m.playerName.value }} ({{ m.gender.value }})</span>
              <span class="badge badge-unverified">待驗證</span>
            </div>
            <div class="admin-card-detail">手機：{{ m.playerPhone.value }}</div>
            <div class="admin-card-detail">
              代表隊伍：{{ (m.teams.value || []).map(t => t.value.teamName.value).join(', ') || '無' }}
            </div>
            <button 
              type="button" 
              class="btn btn-primary btn-sm" 
              :disabled="verifyingMemberId === m.$id.value"
              @click="approveMember(m.$id.value)"
            >
              {{ verifyingMemberId === m.$id.value ? '處理中...' : '核准驗證' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Unverified Matches List -->
      <div v-show="activeTab === 'matches'" class="admin-list">
        <div 
          v-if="unverifiedMatches.length === 0" 
          style="text-align: center; color: var(--color-text-muted); padding: 20px 0; font-size: 14px;"
        >
          目前沒有待審核的比賽比分
        </div>
        
        <div v-else>
          <div 
            v-for="match in unverifiedMatches" 
            :key="match.$id.value" 
            class="card admin-card"
          >
            <div class="admin-card-header">
              <span class="admin-card-title">比賽比分審核 (ID: {{ match.$id.value }})</span>
              <span class="badge badge-unverified">未入帳</span>
            </div>
            <div class="admin-card-detail">時間：{{ formatMatchDate(match.matchDateTime.value) }}</div>
            <div class="admin-card-detail" style="font-weight: 700; color: var(--color-primary); font-size: 14px; margin: 8px 0;">
              {{ getPlayersNames(match.teamA, 'playerID_A') }} ({{ match.teamA_score.value }}) VS ({{ match.teamB_score.value }}) {{ getPlayersNames(match.teamB, 'playerID_B') }}
            </div>
            <button 
              type="button" 
              class="btn btn-accent btn-sm" 
              style="color: white;"
              :disabled="verifyingMatchId === match.$id.value"
              @click="approveMatch(match.$id.value)"
            >
              {{ verifyingMatchId === match.$id.value ? '處理中...' : '核准過帳 (計算積分)' }}
            </button>
          </div>
        </div>
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
</style>
