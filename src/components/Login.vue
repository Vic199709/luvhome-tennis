<script setup>
import { ref, nextTick } from 'vue';
import { store, refreshAllData, showToast, API, saveSession } from '../scripts/store';

const phone = ref('');
const phoneError = ref('');
const formErrors = ref([]);
const isSubmitting = ref(false);

const clearPhone = () => {
  phone.value = '';
  phoneError.value = '';
};

const handleLogin = async () => {
  // Clear errors first to allow re-triggering of animations
  phoneError.value = '';
  formErrors.value = [];
  
  await nextTick();
  
  const trimPhone = phone.value.trim();
  let errors = [];
  
  if (!/^09[0-9]{8}$/.test(trimPhone)) {
    errors.push('手機號碼格式不正確，應為 09 開頭的 10 碼數字。');
    phoneError.value = '格式不合規：09開頭共10碼數字。';
  }
  
  if (errors.length > 0) {
    formErrors.value = errors;
    nextTick(() => {
      const banner = document.getElementById('login-form-error');
      if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return;
  }
  
  isSubmitting.value = true;
  try {
    const res = await API.login(trimPhone);
    if (!res.success) {
      phoneError.value = res.error || '會員不存在。';
      formErrors.value = [res.error || '找不到此手機號碼的會員，請先於下方「新增會員」註冊。'];
      nextTick(() => {
        const banner = document.getElementById('login-form-error');
        if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      return;
    }
    
    // Store user session (expires in 1 day)
    store.currentUser = res.member;
    saveSession(trimPhone);
    
    // Fetch all other required data
    await refreshAllData();
    
    store.currentView = 'view-profile';
  } catch (err) {
    console.error('Login failed:', err);
    showToast('登入時伺服器發生異常，請重試或聯繫管理員。', 'error', handleLogin);
  } finally {
    isSubmitting.value = false;
  }
};

const goToRegister = (e) => {
  e.preventDefault();
  store.currentView = 'view-add-member';
};
</script>

<template>
  <div class="login-container">
    <div class="login-logo">🎾</div>
    <h1 class="login-title">妝點家網球聯盟</h1>
    <p class="login-subtitle">請輸入您的手機號碼以驗證會員身份</p>
    
    <div class="card login-card">
      <form id="login-form" @submit.prevent="handleLogin" novalidate>
        <!-- Phone Field -->
        <div class="form-group">
          <label for="login-phone" class="form-label">手機號碼</label>
          <div class="input-wrapper">
            <input 
              type="tel" 
              id="login-phone" 
              v-model="phone"
              :class="['input-control', { 'input-error': phoneError }]"
              placeholder="請輸入手機號碼" 
              pattern="^09[0-9]{8}$" 
              inputmode="numeric" 
              required 
              :disabled="isSubmitting"
            />
            <button 
              v-if="phone" 
              type="button" 
              class="clear-btn" 
              @click="clearPhone"
              aria-label="清除輸入"
              :disabled="isSubmitting"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <!-- Field-Level Inline Error Message -->
          <div class="input-error-message" v-if="phoneError">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{{ phoneError }}</span>
          </div>

          <div style="font-size: 11px; color: var(--color-text-muted); margin-top: 6px; text-align: left;">
            格式限制：09 開頭共 10 碼數字
          </div>
        </div>
        
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          <span>{{ isSubmitting ? '登入中...' : '登入' }}</span>
          <svg v-if="!isSubmitting" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        </button>

        <!-- Registration Link for Non-Members -->
        <div style="margin-top: 20px; font-size: 14px; color: var(--color-text-muted);">
          還不是網球聯盟會員？
          <a href="#" @click="goToRegister" style="color: var(--color-primary); font-weight: 700; text-decoration: none; margin-left: 4px;">立即註冊會員</a>
        </div>
      </form>
    </div>
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
</style>
