<script setup>
import { ref, nextTick, computed } from 'vue';
import { store, refreshAllData, showToast, API } from '../scripts/store';
import ModalSelect from './ModalSelect.vue';

const memberName = ref('');
const memberPhone = ref('');
const memberGender = ref('不公開');
const genderOptions = [
  { value: '不公開', label: '不公開' },
  { value: '男', label: '男' },
  { value: '女', label: '女' }
];
const checkedTeams = ref([]);
const memberBirthday = ref('');

const fieldErrors = ref({});
const formErrors = ref([]);
const isSubmitting = ref(false);

const teamOptions = computed(() => {
  return store.teams.map(t => ({ value: t.teamID.value, label: t.teamName.value }));
});

const handleRegisterSubmit = async () => {
  fieldErrors.value = {};
  formErrors.value = [];

  await nextTick();

  let errors = [];

  // 1. Name verification
  const trimName = memberName.value.trim();
  if (!trimName) {
    errors.push('請輸入會員姓名。');
    fieldErrors.value.name = '請輸入姓名。';
  }

  // 2. Phone verification
  const trimPhone = memberPhone.value.trim();
  if (!trimPhone) {
    errors.push('請輸入手機號碼。');
    fieldErrors.value.phone = '請輸入手機號碼。';
  } else if (!/^09[0-9]{8}$/.test(trimPhone)) {
    errors.push('手機號碼格式不正確，請輸入 09 開頭的 10 碼數字。');
    fieldErrors.value.phone = '請輸入 09 開頭的 10 碼數字。';
  }

  if (errors.length > 0) {
    formErrors.value = errors;
    nextTick(() => {
      const banner = document.getElementById('add-member-form-error');
      if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return;
  }

  isSubmitting.value = true;

  // Format teams for payload
  const teamRecords = checkedTeams.value.map(tId => {
    const t = store.teams.find(teamObj => teamObj.teamID.value === tId || teamObj.$id.value === tId);
    return {
      value: {
        teamID: { value: tId },
        teamName: { value: t ? t.teamName.value : '' }
      }
    };
  });

  const record = {
    playerName: { value: trimName },
    playerPhone: { value: trimPhone },
    gender: { value: memberGender.value },
    teams: { value: teamRecords },
    isVerified: { value: 'false' },
    isAdmin: { value: 'false' },
    currentScore: { value: '0' },
    totalMatches: { value: '0' },
    birthday: { value: memberBirthday.value }
  };

  try {
    const res = await API.addMember(record);

    if (res.id) {
      showToast('會員已送出審核，帳號目前為【未驗證】狀態。', 'success');

      // Reset form
      memberName.value = '';
      memberPhone.value = '';
      memberGender.value = '不透漏';
      memberBirthday.value = '';
      checkedTeams.value = [];

      await refreshAllData();

      if (!store.currentUser) {
        store.currentView = 'view-login';
      } else {
        store.currentView = 'view-profile';
      }
    } else {
      showToast('新增會員失敗：' + (res.error || '未知伺服器錯誤'), 'error', handleRegisterSubmit);
    }
  } catch (err) {
    console.error('Registration failed:', err);
    showToast('網路或系統異常，請稍後再試。', 'error', handleRegisterSubmit);
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
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
      新增會員
    </h2>

    <div class="card">
      <form id="add-member-form" @submit.prevent="handleRegisterSubmit" novalidate>
        <!-- Form-Level Error Banner -->
        <div id="add-member-form-error" class="form-error-banner" v-if="formErrors.length > 0">
          <div class="form-error-banner-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>請先修正以下欄位：</span>
          </div>
          <ul class="form-error-banner-list">
            <li v-for="err in formErrors" :key="err">{{ err }}</li>
          </ul>
        </div>

        <!-- Player Name -->
        <div class="form-group">
          <label for="member-name" class="form-label">會員姓名</label>
          <input type="text" v-model="memberName" id="member-name"
            :class="['input-control', { 'input-error': fieldErrors.name }]" placeholder="請輸入姓名" required
            :disabled="isSubmitting" />
          <div class="input-error-message" v-if="fieldErrors.name">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ fieldErrors.name }}</span>
          </div>
        </div>

        <!-- Player Phone -->
        <div class="form-group">
          <label for="member-phone" class="form-label">手機號碼</label>
          <input type="tel" v-model="memberPhone" id="member-phone"
            :class="['input-control', { 'input-error': fieldErrors.phone }]" placeholder="請輸入手機號碼"
            pattern="^09[0-9]{8}$" inputmode="numeric" required :disabled="isSubmitting" />
          <div class="input-error-message" v-if="fieldErrors.phone">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ fieldErrors.phone }}</span>
          </div>
          <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 4px;">
            手機格式：09 開頭共 10 碼數字
          </div>
        </div>

        <!-- Gender -->
        <div class="form-group">
          <label class="form-label">性別</label>
          <ModalSelect v-model="memberGender" :options="genderOptions" title="選擇性別" placeholder="請選擇性別"
            :disabled="isSubmitting" />
        </div>

        <!-- Birthday -->
        <div class="form-group">
          <label for="member-birthday" class="form-label">生日</label>
          <input type="date" v-model="memberBirthday" id="member-birthday" class="input-control"
            :disabled="isSubmitting" />
        </div>

        <!-- Multi-select Representative Teams -->
        <div class="form-group">
          <label class="form-label">代表球隊（可複選）</label>
          <ModalSelect v-model="checkedTeams" :options="teamOptions" :multiple="true" title="選擇代表球隊（可複選）"
            placeholder="請選擇代表球隊" :disabled="isSubmitting" />
        </div>

        <button type="submit" class="btn btn-primary" style="margin-top: 10px;" :disabled="isSubmitting">
          <span>{{ isSubmitting ? '送出中...' : '送出審核' }}</span>
          <svg v-if="!isSubmitting" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>
