<script setup>
import { store } from '../scripts/store';

const navigate = (viewName) => {
  store.currentView = viewName;
};
</script>

<template>
  <nav 
    id="bottom-nav-bar" 
    class="bottom-nav" 
    v-if="store.currentUser && store.currentView !== 'view-login' && store.currentView !== 'view-error'"
  >
    <div 
      @click="navigate('view-profile')"
      :class="['nav-item', { active: store.currentView === 'view-profile' }]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>首頁</span>
    </div>
    <div 
      @click="navigate('view-match')"
      :class="['nav-item', { active: store.currentView === 'view-match' }]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
      <span>輸入比分</span>
    </div>
    <div 
      @click="navigate('view-ranking')"
      :class="['nav-item', { active: store.currentView === 'view-ranking' }]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <span>排名</span>
    </div>
  </nav>
</template>
