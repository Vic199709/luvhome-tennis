<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { store } from '../scripts/store';

const isScrolled = ref(false);

const handleScroll = () => {
  isScrolled.value = window.scrollY > 0;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

const handleLogout = () => {
  store.currentUser = null;
  localStorage.removeItem('tennis_player_phone');
  store.currentView = 'view-login';
};
</script>

<template>
  <header :class="['top-bar', { 'scrolled': isScrolled }]">
    <div class="top-bar-left">
      <span class="top-bar-logo">🎾</span>
      <div class="top-bar-titles">
        <span class="top-bar-title">妝點家網球聯盟</span>
        <span class="top-bar-subtitle">{{ store.settings.top_bar_subtitle }}</span>
      </div>
    </div>
    <div class="top-bar-right">
      <button 
        type="button" 
        v-if="store.currentUser && !isScrolled" 
        @click="handleLogout" 
        class="btn-logout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>登出</span>
      </button>
    </div>
  </header>
</template>
