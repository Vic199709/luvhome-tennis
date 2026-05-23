<script setup>
import { onMounted } from 'vue';
import { store, refreshAllData, showToast, removeToast } from '../scripts/store';

// Import child views
import Header from './Header.vue';
import Login from './Login.vue';
import Profile from './Profile.vue';
import MatchInput from './MatchInput.vue';
import Rankings from './Rankings.vue';
import AddMember from './AddMember.vue';
import AdminPanel from './AdminPanel.vue';
import Navbar from './Navbar.vue';

// Toast formatting helper
const getToastClass = (type) => {
  return `toast toast-${type} show`;
};

// Error Page Escape actions
const handleErrBack = () => {
  if (store.fullPageError && store.fullPageError.backCallback) {
    store.fullPageError.backCallback();
  } else {
    store.fullPageError = null;
    store.currentUser = null;
    store.currentView = 'view-login';
  }
};

const handleErrHome = () => {
  store.fullPageError = null;
  store.currentUser = null;
  localStorage.removeItem('tennis_player_phone');
  store.currentView = 'view-login';
};

const handleToastRetry = (toast) => {
  if (toast.retryCallback) {
    toast.retryCallback();
  }
  removeToast(toast.id);
};

// Lifecycle: startup data synchronization and auto login
onMounted(async () => {
  try {
    await refreshAllData();
  } catch (err) {
    console.error('Startup data sync failed:', err);
    // Note: refreshAllData will show full page error if members is empty
    return;
  }

  // Auto-login check
  const savedPhone = localStorage.getItem('tennis_player_phone');
  if (savedPhone) {
    const foundUser = store.members.find(m => m.playerPhone.value === savedPhone);
    if (foundUser) {
      store.currentUser = foundUser;
      store.currentView = 'view-profile';
      showToast(`歡迎回來，${foundUser.playerName.value}！`, 'success');
      return;
    }
  }

  // Fallback to login
  store.currentView = 'view-login';
});
</script>

<template>
  <div>
    <!-- Toast Notification Container -->
    <div class="toast-container">
      <div 
        v-for="toast in store.toasts" 
        :key="toast.id" 
        :class="getToastClass(toast.type)"
      >
        <!-- Toast icon based on type -->
        <span class="toast-icon">
          <template v-if="toast.type === 'success'">✔️</template>
          <template v-else-if="toast.type === 'error'">❌</template>
          <template v-else-if="toast.type === 'warning'">⚠️</template>
          <template v-else>ℹ️</template>
        </span>
        <span style="flex: 1;">{{ toast.message }}</span>
        
        <!-- Retry button for severe/error toasts -->
        <button 
          v-if="toast.retryCallback" 
          @click="handleToastRetry(toast)" 
          class="toast-btn-retry"
        >
          重試
        </button>
      </div>
    </div>

    <!-- Top Bar / Header -->
    <Header />

    <!-- Main View Switcher -->
    <main class="main-content">
      <!-- Login Page -->
      <Login v-if="store.currentView === 'view-login'" />

      <!-- Profile Page (Home) -->
      <Profile v-else-if="store.currentView === 'view-profile'" />

      <!-- Match Score Entry Page -->
      <MatchInput v-else-if="store.currentView === 'view-match'" />

      <!-- Rankings and Charts Page -->
      <Rankings v-else-if="store.currentView === 'view-ranking'" />

      <!-- Register/Add Member Page -->
      <AddMember v-else-if="store.currentView === 'view-add-member'" />

      <!-- Admin Verification Panel -->
      <AdminPanel v-else-if="store.currentView === 'view-admin'" />

      <!-- Full Page Error Screen -->
      <div v-else-if="store.currentView === 'view-error'" class="error-page-container">
        <div class="error-illustration">
          <svg viewBox="0 0 200 200" width="100%" height="100%">
            <circle cx="100" cy="100" r="80" fill="#FEE2E2" />
            <!-- Crying tennis ball -->
            <circle cx="100" cy="100" r="50" fill="#EBF5EF" stroke="#1D5D3A" stroke-width="6" />
            <!-- Tennis seams -->
            <path d="M 65 65 A 50 50 0 0 1 135 135" fill="none" stroke="#1D5D3A" stroke-width="4" stroke-dasharray="4,4" />
            <path d="M 135 65 A 50 50 0 0 0 65 135" fill="none" stroke="#1D5D3A" stroke-width="4" stroke-dasharray="4,4" />
            <!-- Sad eyes -->
            <circle cx="85" cy="90" r="6" fill="#1D5D3A" />
            <circle cx="115" cy="90" r="6" fill="#1D5D3A" />
            <!-- Sad mouth -->
            <path d="M 85 120 Q 100 105 115 120" fill="none" stroke="#1D5D3A" stroke-width="5" stroke-linecap="round" />
            <!-- Tears -->
            <path d="M 85 96 C 85 106 81 110 81 110 C 81 110 77 106 77 96 C 77 91 81 91 85 96 Z" fill="#3B82F6" />
          </svg>
        </div>
        <h1 class="error-page-title">
          {{ store.fullPageError ? store.fullPageError.title : '噢，系統漏接了！ 🎾' }}
        </h1>
        <p class="error-page-desc">
          {{ store.fullPageError ? store.fullPageError.description : '糟糕！系統似乎打出了一記界外球。伺服器發生異常或找不到此頁面，別擔心，您可以透過以下安全路徑返回。' }}
        </p>
        <div class="error-escape-routes">
          <button @click="handleErrBack" class="btn btn-secondary">返回上一頁</button>
          <button @click="handleErrHome" class="btn btn-primary">回到登入首頁</button>
        </div>
      </div>
    </main>

    <!-- Fixed Bottom Navigation Bar -->
    <Navbar />
  </div>
</template>
