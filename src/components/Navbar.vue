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
    <div 
      @click="navigate('view-add-member')"
      :class="['nav-item', { active: store.currentView === 'view-add-member' }]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
      <span>新增會員</span>
    </div>
    <div 
      v-if="store.currentUser && (store.currentUser.isAdmin?.value === 'true' || store.currentUser.isAdmin?.value === true)"
      @click="navigate('view-admin')"
      :class="['nav-item', { active: store.currentView === 'view-admin' }]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span>管理員</span>
    </div>
  </nav>
</template>
