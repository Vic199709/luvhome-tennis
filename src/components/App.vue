<script setup>
import { ref, onMounted, watch } from 'vue';
import { store, refreshAllData, resetUserSession, showToast, removeToast, API, loadSession } from '../scripts/store';

// Import child views
import Header from './Header.vue';
import Login from './Login.vue';
import Profile from './Profile.vue';
import MatchInput from './MatchInput.vue';
import Rankings from './Rankings.vue';
import AddMember from './AddMember.vue';
import AdminPanel from './AdminPanel.vue';
import Navbar from './Navbar.vue';
import SkeletonScreen from './SkeletonScreen.vue';

const isInitializing = ref(true);
const skeletonType = ref('login');

const viewToSkeleton = {
  'view-profile': 'profile',
  'view-match': 'match',
  'view-ranking': 'ranking',
  'view-add-member': 'add-member',
  'view-admin': 'admin',
  'view-login': 'login',
};

// Toast formatting helper
const getToastClass = (type) => {
  return `toast toast-${type} show`;
};

const handleToastAction = (toast) => {
  if (typeof toast.action === 'function') {
    toast.action();
  }
  removeToast(toast.id);
};

// Error Page Escape actions
const handleErrBack = () => {
  if (store.fullPageError && store.fullPageError.backCallback) {
    store.fullPageError.backCallback();
  } else {
    resetUserSession();
    store.currentView = 'view-login';
  }
};

const handleErrHome = () => {
  resetUserSession();
  store.currentView = 'view-login';
};


// Hash routing configuration
const viewToHash = {
  'view-login': '#/login',
  'view-profile': '#/profile',
  'view-match': '#/match',
  'view-ranking': '#/ranking',
  'view-add-member': '#/add-member',
  'view-admin': '#/admin',
  'view-error': '#/error'
};

const hashToView = {
  '#/login': 'view-login',
  '#/profile': 'view-profile',
  '#/match': 'view-match',
  '#/ranking': 'view-ranking',
  '#/add-member': 'view-add-member',
  '#/admin': 'view-admin',
  '#/error': 'view-error'
};

const ensureViewData = async (targetView) => {
  if (targetView === 'view-add-member') {
    if (store.teams.length === 0) {
      await refreshAllData({ datasets: ['teams'] });
    }
    return;
  }

  if (targetView === 'view-profile') {
    if (store.members.length === 0 || store.teams.length === 0 || store.matches.length === 0 || store.history.length === 0) {
      await refreshAllData();
    }
    return;
  }

  if (targetView === 'view-match') {
    if (store.teams.length === 0 || store.members.length === 0) {
      await refreshAllData({ datasets: ['members', 'teams', 'settings'] });
    }
    return;
  }

  if (targetView === 'view-ranking') {
    if (store.teams.length === 0) {
      await refreshAllData({ datasets: ['teams'] });
    }
    return;
  }

  if (targetView === 'view-admin') {
    if (store.members.length === 0 || store.matches.length === 0 || store.teams.length === 0) {
      await refreshAllData({ datasets: ['members', 'matches', 'teams'] });
    }
  }
};

// Route synchronization with auth checking
const syncRoute = async () => {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const targetView = hashToView[hash];
  
  if (!targetView) {
    // If no route matches or is empty, redirect
    if (store.currentUser) {
      window.location.hash = '#/profile';
    } else {
      window.location.hash = '#/login';
    }
    return;
  }
  
  // Guard check: unauthorized routes redirect to login
  if (!store.currentUser && targetView !== 'view-login' && targetView !== 'view-add-member' && targetView !== 'view-error') {
    window.location.hash = '#/login';
    return;
  }
  
  // Guard check: authorized users cannot view the login form
  if (store.currentUser && targetView === 'view-login') {
    window.location.hash = '#/profile';
    return;
  }
  
  // Load only the minimum required data for each view
  if (targetView !== 'view-login' && targetView !== 'view-error') {
    skeletonType.value = viewToSkeleton[targetView] || 'generic';
    isInitializing.value = true;
    try {
      await ensureViewData(targetView);
    } catch (err) {
      console.error('Failed to load required data:', err);
      return;
    } finally {
      isInitializing.value = false;
    }
  }
  
  if (store.currentView !== targetView) {
    store.currentView = targetView;
  }
};

// Sync store view changes to address bar
watch(() => store.currentView, (newView) => {
  const targetHash = viewToHash[newView];
  if (targetHash && window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
});

// Watch address bar hash changes
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', syncRoute);
}

// Lifecycle: startup data synchronization and auto login
onMounted(async () => {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const initialView = hashToView[hash];
  if (initialView) {
    skeletonType.value = viewToSkeleton[initialView] || 'generic';
  } else {
    skeletonType.value = loadSession() ? 'profile' : 'login';
  }

  // Auto-login check (session expires after 1 day)
  const savedPhone = typeof window !== 'undefined' ? loadSession() : null;
  if (savedPhone) {
    isInitializing.value = true;
    try {
      const res = await API.login(savedPhone);
      if (res.success) {
        store.currentUser = res.member;
      } else {
        localStorage.removeItem('tennis_player_phone');
      }
    } catch (err) {
      console.error('Startup auto-login failed:', err);
    }
  }

  // Initialize route sync
  await syncRoute();
  
  isInitializing.value = false;
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
        <button v-if="toast.action" type="button" class="toast-btn-retry" @click="handleToastAction(toast)">
          重試
        </button>
      </div>
    </div>

    <!-- Top Bar / Header -->
    <Header v-if="store.currentView !== 'view-login'" />

    <!-- Main View Switcher -->
    <main class="main-content">
      <SkeletonScreen v-if="isInitializing" :type="skeletonType" />
      
      <template v-else>
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
      </template>
    </main>

    <!-- Fixed Bottom Navigation Bar -->
    <Navbar v-if="!isInitializing && store.currentUser" />
  </div>
</template>
