<script setup>
import { ref, computed } from 'vue';
import { store, refreshAllData, showToast, API } from '../scripts/store';

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

const goBackToProfile = () => {
  store.currentView = 'view-profile';
};
</script>

<template>
  <div class="content-area">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <h2 class="section-title" style="margin-bottom: 0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        管理員審核主控台
      </h2>
      <button 
        type="button" 
        @click="goBackToProfile" 
        class="btn btn-secondary btn-sm" 
        style="width: auto; height: 32px; padding: 0 12px;"
      >
        返回個人頁
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
  </div>
</template>
