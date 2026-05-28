<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { store, resetUserSession } from '../scripts/store';

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
  resetUserSession();
  store.currentView = 'view-login';
};

const handleGoHome = () => {
  if (store.currentUser) {
    store.currentView = 'view-profile';
  }
};

// 跑馬燈
const SCROLL_SPEED = 80; // px/s
const GAP_S = 0.5;       // 空白秒數

const subtitleText = ref(null);
const isOverflow = ref(false);
const marqueeStep = ref('0px');
const marqueeDuration = ref('8s');
const marqueeGap = ref('40px');

function checkOverflow() {
  const el = subtitleText.value;
  if (!el) return;
  const wrapper = el.closest('.top-bar-subtitle');
  if (!wrapper) return;
  const textWidth = el.offsetWidth;
  const containerWidth = wrapper.clientWidth;
  const overflowing = textWidth > containerWidth;
  isOverflow.value = overflowing;
  if (overflowing) {
    const gapPx = SCROLL_SPEED * GAP_S;
    const stepPx = textWidth + gapPx;
    marqueeStep.value = `${-stepPx}px`;
    marqueeDuration.value = `${stepPx / SCROLL_SPEED}s`;
    marqueeGap.value = `${gapPx}px`;
  }
}

watch(() => store.settings.top_bar_subtitle, () => {
  isOverflow.value = false; // 先重置，等 DOM 更新後重新量
  nextTick(checkOverflow);
});

onMounted(() => {
  nextTick(checkOverflow);
  window.addEventListener('resize', checkOverflow);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkOverflow);
});
</script>

<template>
  <header :class="['top-bar', { 'scrolled': isScrolled }]">
    <div class="top-bar-left" :class="{ 'clickable': store.currentUser }" @click="handleGoHome">
      <span class="top-bar-logo">🎾</span>
      <div class="top-bar-titles">
        <span class="top-bar-title">妝點家網球聯盟</span>
        <span class="top-bar-subtitle">
          <span
            class="marquee-track"
            :class="{ 'is-looping': isOverflow }"
            :style="isOverflow ? {
              '--marquee-step': marqueeStep,
              '--marquee-duration': marqueeDuration,
              '--marquee-gap': marqueeGap
            } : {}"
          >
            <span ref="subtitleText" class="marquee-item">{{ store.settings.top_bar_subtitle }}</span>
            <span v-if="isOverflow" class="marquee-sep" aria-hidden="true"></span>
            <span v-if="isOverflow" class="marquee-item" aria-hidden="true">{{ store.settings.top_bar_subtitle }}</span>
          </span>
        </span>
      </div>
    </div>
    <div class="top-bar-right">
      <button
        type="button"
        v-if="store.currentUser && !isScrolled"
        @click="handleLogout"
        class="btn-logout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-bar-left.clickable {
  cursor: pointer;
}

.top-bar-subtitle {
  display: block;
  overflow: hidden;
  white-space: nowrap;
}

/* 外層 track：靜止時只是 inline，動畫時變成連續滾動帶 */
.marquee-track {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  will-change: transform;
}

.marquee-item {
  display: inline-block;
  flex-shrink: 0;
}

/* 兩份文字之間的空白（寬度 = 速度 × 0.5s） */
.marquee-sep {
  display: inline-block;
  width: var(--marquee-gap, 40px);
  flex-shrink: 0;
}

@keyframes marquee-loop {
  from { transform: translateX(0); }
  to   { transform: translateX(var(--marquee-step)); }
}

.marquee-track.is-looping {
  animation: marquee-loop var(--marquee-duration, 8s) linear infinite;
}
</style>
