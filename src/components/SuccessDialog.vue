<script setup>
import { watch, onBeforeUnmount } from 'vue';

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '提交成功'
  },
  message: {
    type: String,
    default: ''
  },
  details: {
    type: Array,
    default: () => []
  },
  confirmText: {
    type: String,
    default: '確認'
  }
});

const emit = defineEmits(['update:open', 'confirm']);

const close = () => {
  emit('update:open', false);
  emit('confirm');
};

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
);

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="success-dialog">
      <div v-if="open" class="success-dialog-backdrop" role="presentation">
        <div
          class="success-dialog-card"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="'success-dialog-title'"
        >
          <div class="success-dialog-hero" aria-hidden="true">
            <svg class="success-dialog-hero-bg" viewBox="0 0 420 188" preserveAspectRatio="none">
              <path class="success-dialog-bg-arc" d="M 0 0 L 420 0 L 420 148 Q 210 196 0 148 Z" />
            </svg>
            <div class="success-dialog-icon">
              <svg viewBox="0 0 72 72" fill="none">
                <circle class="success-dialog-ring" cx="36" cy="36" r="28" />
                <path class="success-dialog-check" d="M22 37.5L31 46.5L50.5 26.5" />
              </svg>
            </div>
          </div>

          <div class="success-dialog-content">
            <h3 :id="'success-dialog-title'" class="success-dialog-title">{{ title }}</h3>
            <p v-if="message" class="success-dialog-message">{{ message }}</p>
            <ul v-if="details.length > 0" class="success-dialog-details">
              <li v-for="(item, index) in details" :key="`${index}-${item}`">{{ item }}</li>
            </ul>
          </div>

          <button type="button" class="btn btn-primary success-dialog-confirm" @click="close">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.success-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.46);
  backdrop-filter: blur(6px);
}

.success-dialog-card {
  position: relative;
  width: min(92vw, 420px);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 250, 245, 0.98));
  box-shadow: 0 30px 80px rgba(10, 35, 22, 0.28);
  border: 1px solid rgba(29, 93, 58, 0.14);
  padding: 0 24px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  overflow: hidden;
}

.success-dialog-hero {
  position: relative;
  width: calc(100% + 48px);
  height: 188px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 -24px 6px;
}

.success-dialog-hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.success-dialog-bg-arc {
  fill: rgba(196, 240, 216, 0.65);
}

.success-dialog-icon {
  position: relative;
  z-index: 1;
  width: 92px;
  height: 92px;
  filter: drop-shadow(0 10px 18px rgba(29, 93, 58, 0.16));
}

.success-dialog-icon svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.success-dialog-ring {
  stroke: #1d5d3a;
  stroke-width: 4.5;
  stroke-linecap: round;
  fill: white;
  stroke-dasharray: 176;
  stroke-dashoffset: 176;
  animation: success-ring-draw 650ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.success-dialog-check {
  stroke: #1d5d3a;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  /* starts only after the ring finishes (650ms) */
  animation: success-check-draw 420ms 700ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.success-dialog-content {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.success-dialog-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-dark);
}

.success-dialog-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.success-dialog-details {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.success-dialog-details li {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(29, 93, 58, 0.06);
  border: 1px solid rgba(29, 93, 58, 0.1);
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-dark);
}

.success-dialog-confirm {
  width: 100%;
  margin-top: 2px;
}

.success-dialog-enter-active,
.success-dialog-leave-active {
  transition: opacity 180ms ease;
}

.success-dialog-enter-active .success-dialog-card,
.success-dialog-leave-active .success-dialog-card {
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease;
}

.success-dialog-enter-from,
.success-dialog-leave-to {
  opacity: 0;
}

.success-dialog-enter-from .success-dialog-card,
.success-dialog-leave-to .success-dialog-card {
  transform: translateY(16px) scale(0.96);
  opacity: 0;
}

@keyframes success-ring-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes success-check-draw {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
