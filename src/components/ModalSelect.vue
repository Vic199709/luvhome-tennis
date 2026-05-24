<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, Array],
    default: ''
  },
  multiple: {
    type: Boolean,
    default: false
  },
  options: {
    type: Array,
    required: true // Array of { value, label }
  },
  title: {
    type: String,
    default: '請選擇'
  },
  placeholder: {
    type: String,
    default: '請選擇...'
  },
  required: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);

const hasSelection = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.length > 0;
  }
  return props.modelValue !== undefined && props.modelValue !== null && props.modelValue !== '';
});

const selectedLabel = computed(() => {
  if (props.multiple) {
    const selectedValues = Array.isArray(props.modelValue) ? props.modelValue : [];
    const labels = selectedValues.map(val => {
      const opt = props.options.find(o => String(o.value) === String(val));
      return opt ? opt.label : '';
    }).filter(Boolean);
    return labels.length > 0 ? labels.join(', ') : '';
  }
  const selectedOpt = props.options.find(opt => String(opt.value) === String(props.modelValue));
  return selectedOpt ? selectedOpt.label : '';
});

const isSelected = (val) => {
  if (props.multiple) {
    const selectedValues = Array.isArray(props.modelValue) ? props.modelValue : [];
    return selectedValues.some(v => String(v) === String(val));
  }
  return String(props.modelValue) === String(val);
};

const openModal = () => {
  if (props.disabled) return;
  isOpen.value = true;
  document.body.style.overflow = 'hidden'; // Disable background scrolling
};

const closeModal = () => {
  isOpen.value = false;
  document.body.style.overflow = ''; // Restore background scrolling
};

const selectOption = (val) => {
  if (props.multiple) {
    const currentValues = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
    const index = currentValues.findIndex(v => String(v) === String(val));
    if (index >= 0) {
      currentValues.splice(index, 1);
    } else {
      currentValues.push(val);
    }
    emit('update:modelValue', currentValues);
    emit('change', currentValues);
  } else {
    emit('update:modelValue', val);
    emit('change', val);
    closeModal();
  }
};
</script>

<template>
  <div class="modal-select-wrapper">
    <!-- Selector Trigger Button -->
    <button
      type="button"
      :class="['modal-select-trigger', { 'input-error': error, 'disabled': disabled }]"
      @click="openModal"
      :disabled="disabled"
    >
      <span class="trigger-text" :class="{ 'placeholder-active': !hasSelection }">
        {{ selectedLabel || placeholder }}
      </span>
      <svg class="trigger-arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <!-- Error Message -->
    <div class="input-error-message" v-if="error">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{{ error }}</span>
    </div>

    <!-- Teleported Modal Overlay -->
    <Teleport to="body">
      <Transition name="fade">
        <div class="modal-select-backdrop" v-if="isOpen" @click.self="closeModal">
          <div class="modal-select-sheet">
            <!-- Sheet Handle Bar -->
            <div class="sheet-handle"></div>

            <!-- Sheet Header -->
            <div class="sheet-header">
              <h3 class="sheet-title">{{ title }}</h3>
              <button type="button" class="sheet-close" @click="closeModal">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Sheet Options List -->
            <div class="sheet-body">
              <div class="options-container">
                <div
                  v-for="opt in options"
                  :key="opt.value"
                  :class="['option-row', { 'selected': isSelected(opt.value) }]"
                  @click="selectOption(opt.value)"
                >
                  <span class="option-label">{{ opt.label }}</span>
                  <span class="option-checked-icon" v-if="isSelected(opt.value)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                </div>
                
                <div v-if="options.length === 0" class="no-options-placeholder">
                  無可選選項
                </div>
              </div>
            </div>

            <!-- Sheet Footer -->
            <div class="sheet-footer" style="display: flex; gap: 8px;">
              <button 
                v-if="multiple" 
                type="button" 
                class="btn btn-primary" 
                style="height: 52px; font-size: 18px; flex: 1; margin: 0;"
                @click="closeModal"
              >
                完成
              </button>
              <button 
                type="button" 
                class="btn btn-secondary" 
                style="height: 52px; font-size: 18px; flex: 1; margin: 0;" 
                @click="closeModal"
              >
                {{ multiple ? '取消' : '關閉' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-select-wrapper {
  position: relative;
  width: 100%;
}

.modal-select-trigger {
  width: 100%;
  height: 52px;
  padding: 12px 16px;
  border-radius: var(--border-radius-sm);
  border: 1.5px solid #E5E7EB;
  font-size: 18px;
  font-family: var(--font-family);
  color: var(--color-text-dark);
  background-color: #F9FAFB;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-select-trigger:focus {
  outline: none;
  border-color: var(--color-primary);
  background-color: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(29, 93, 58, 0.1);
}

.modal-select-trigger.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #F3F4F6;
}

.trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.placeholder-active {
  color: var(--color-text-muted);
}

.trigger-arrow {
  color: var(--color-text-muted);
  flex-shrink: 0;
  margin-left: 8px;
}

/* Modal Overlay Styles */
.modal-select-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
}

.modal-select-sheet {
  width: 100%;
  max-width: 480px;
  background-color: #FFFFFF;
  border-top-left-radius: var(--border-radius-md);
  border-top-right-radius: var(--border-radius-md);
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
}

.sheet-handle {
  width: 40px;
  height: 5px;
  background-color: #E5E7EB;
  border-radius: 3px;
  align-self: center;
  margin-bottom: 12px;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.sheet-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-dark);
  margin: 0;
}

.sheet-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast);
}

.sheet-close:hover {
  background-color: #F3F4F6;
}

.sheet-body {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
  padding-right: 4px;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: var(--border-radius-sm);
  border: 1.5px solid #E5E7EB;
  background-color: #F9FAFB;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.option-row:hover {
  background-color: #F3F4F6;
  border-color: #D1D5DB;
}

.option-row.selected {
  background-color: #EBF5EF;
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.option-label {
  font-size: 18px;
  font-weight: 600;
}

.option-checked-icon {
  color: var(--color-primary);
  display: flex;
  align-items: center;
}

.no-options-placeholder {
  text-align: center;
  color: var(--color-text-muted);
  padding: 30px;
  font-size: 16px;
}

.sheet-footer {
  padding-top: 10px;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-active .modal-select-sheet {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-leave-active .modal-select-sheet {
  transition: transform 0.2s ease-in;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-from .modal-select-sheet {
  transform: translateY(100%);
}

.fade-leave-to .modal-select-sheet {
  transform: translateY(100%);
}
</style>
