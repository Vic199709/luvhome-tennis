<script setup>
defineProps({
  type: {
    type: String,
    default: 'generic'
  }
});
</script>

<template>
  <div class="skeleton-wrapper">
    <!-- Profile Page Skeleton -->
    <div v-if="type === 'profile'" class="skeleton-layout skeleton-profile">
      <!-- Profile Card Skeleton -->
      <div class="skeleton-card profile-card-skeleton">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-line title-line"></div>
        <div class="skeleton-line subtitle-line"></div>
        <div class="skeleton-stats-row">
          <div class="skeleton-stat-box"></div>
          <div class="skeleton-stat-box"></div>
          <div class="skeleton-stat-box"></div>
        </div>
      </div>

      <!-- Top 8 Widget Skeleton -->
      <div class="skeleton-card top-eight-skeleton">
        <div class="skeleton-line section-title-line" style="width: 100px;"></div>
        <div class="skeleton-circles-row">
          <div v-for="i in 8" :key="i" class="skeleton-circle-item"></div>
        </div>
      </div>

      <!-- Actions Grid Skeleton -->
      <div class="skeleton-actions-grid">
        <div v-for="i in 3" :key="i" class="skeleton-action-card"></div>
      </div>

      <!-- Recent Matches Skeleton -->
      <div class="skeleton-matches-section">
        <div class="skeleton-line section-title-line" style="width: 150px; margin-bottom: 16px;"></div>
        <div v-for="i in 2" :key="i" class="skeleton-match-card"></div>
      </div>
    </div>

    <!-- Rankings Page Skeleton -->
    <div v-else-if="type === 'ranking'" class="skeleton-layout skeleton-ranking">
      <!-- Tab Buttons Skeleton -->
      <div class="skeleton-tabs">
        <div class="skeleton-tab"></div>
        <div class="skeleton-tab"></div>
      </div>

      <!-- Rankings List Skeleton -->
      <div class="skeleton-card ranking-list-skeleton">
        <div v-for="i in 6" :key="i" class="skeleton-ranking-row">
          <div class="skeleton-rank-num"></div>
          <div class="skeleton-ranking-avatar"></div>
          <div class="skeleton-line ranking-name-line"></div>
          <div class="skeleton-line ranking-score-line"></div>
        </div>
      </div>
    </div>

    <!-- Login Page Skeleton -->
    <div v-else-if="type === 'login'" class="skeleton-layout skeleton-login">
      <div class="skeleton-login-logo"></div>
      <div class="skeleton-line login-title-line"></div>
      <div class="skeleton-line login-subtitle-line"></div>
      
      <div class="skeleton-card login-card-skeleton">
        <div class="skeleton-form-group">
          <div class="skeleton-line form-label-line"></div>
          <div class="skeleton-form-input"></div>
        </div>
        <div class="skeleton-form-button"></div>
        <div class="skeleton-line register-link-line"></div>
      </div>
    </div>

    <!-- Match Scoring Page Skeleton -->
    <div v-else-if="type === 'match'" class="skeleton-layout skeleton-match-input">
      <div class="skeleton-line page-title-line"></div>
      
      <div class="skeleton-card match-card-skeleton">
        <div class="skeleton-form-group">
          <div class="skeleton-line form-label-line"></div>
          <div class="skeleton-toggle-placeholder"></div>
        </div>
        
        <div class="skeleton-row">
          <div class="skeleton-col">
            <div class="skeleton-line form-label-line"></div>
            <div class="skeleton-form-input"></div>
          </div>
          <div class="skeleton-col">
            <div class="skeleton-line form-label-line"></div>
            <div class="skeleton-form-input"></div>
          </div>
        </div>

        <div class="skeleton-team-section">
          <div class="skeleton-line team-header-line"></div>
          <div class="skeleton-row">
            <div class="skeleton-col">
              <div class="skeleton-line form-label-line"></div>
              <div class="skeleton-form-input"></div>
            </div>
            <div class="skeleton-col">
              <div class="skeleton-line form-label-line"></div>
              <div class="skeleton-form-input"></div>
            </div>
          </div>
        </div>

        <div class="skeleton-team-section">
          <div class="skeleton-line team-header-line"></div>
          <div class="skeleton-row">
            <div class="skeleton-col">
              <div class="skeleton-line form-label-line"></div>
              <div class="skeleton-form-input"></div>
            </div>
            <div class="skeleton-col">
              <div class="skeleton-line form-label-line"></div>
              <div class="skeleton-form-input"></div>
            </div>
          </div>
        </div>

        <div class="skeleton-team-section">
          <div class="skeleton-line form-label-line"></div>
          <div class="skeleton-row">
            <div class="skeleton-col">
              <div class="skeleton-form-input"></div>
            </div>
            <div class="skeleton-col">
              <div class="skeleton-form-input"></div>
            </div>
          </div>
        </div>

        <div class="skeleton-form-button"></div>
      </div>
    </div>

    <!-- Add Member Page Skeleton -->
    <div v-else-if="type === 'add-member'" class="skeleton-layout skeleton-add-member">
      <div class="skeleton-line page-title-line"></div>
      
      <div class="skeleton-card add-member-card-skeleton">
        <div class="skeleton-form-group">
          <div class="skeleton-line form-label-line"></div>
          <div class="skeleton-form-input"></div>
        </div>

        <div class="skeleton-form-group">
          <div class="skeleton-line form-label-line"></div>
          <div class="skeleton-form-input"></div>
        </div>

        <div class="skeleton-form-group">
          <div class="skeleton-line form-label-line"></div>
          <div class="skeleton-form-input"></div>
        </div>

        <div class="skeleton-form-group">
          <div class="skeleton-line form-label-line"></div>
          <div class="skeleton-checkbox-group">
            <div v-for="i in 3" :key="i" class="skeleton-checkbox-item"></div>
          </div>
        </div>

        <div class="skeleton-form-group">
          <div class="skeleton-line form-label-line"></div>
          <div class="skeleton-form-input"></div>
        </div>

        <div class="skeleton-form-button"></div>
      </div>
    </div>

    <!-- Admin Panel Page Skeleton -->
    <div v-else-if="type === 'admin'" class="skeleton-layout skeleton-admin">
      <div class="skeleton-line page-title-line"></div>
      
      <div class="skeleton-card admin-card-skeleton">
        <div class="skeleton-tabs">
          <div class="skeleton-tab" style="width: 150px;"></div>
          <div class="skeleton-tab" style="width: 150px;"></div>
        </div>

        <div class="skeleton-admin-list">
          <div v-for="i in 2" :key="i" class="skeleton-admin-item-card">
            <div class="skeleton-admin-item-header">
              <div class="skeleton-line" style="width: 120px; height: 18px;"></div>
              <div class="skeleton-badge-placeholder"></div>
            </div>
            <div class="skeleton-line" style="width: 160px; height: 14px; margin-bottom: 8px;"></div>
            <div class="skeleton-line" style="width: 220px; height: 14px; margin-bottom: 16px;"></div>
            <div class="skeleton-admin-item-btn"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Generic Fallback Skeleton -->
    <div v-else class="skeleton-layout skeleton-generic">
      <div class="skeleton-card generic-card-skeleton">
        <div class="skeleton-line form-title-line"></div>
        <div v-for="i in 4" :key="i" class="skeleton-form-group">
          <div class="skeleton-line form-label-line"></div>
          <div class="skeleton-form-input"></div>
        </div>
        <div class="skeleton-form-button"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-wrapper {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

/* Shimmer Keyframes */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Base Skeleton Styles */
.skeleton-line,
.skeleton-avatar,
.skeleton-stat-box,
.skeleton-circle-item,
.skeleton-action-card,
.skeleton-match-card,
.skeleton-tab,
.skeleton-ranking-avatar,
.skeleton-rank-num,
.skeleton-ranking-row,
.skeleton-form-input,
.skeleton-form-button,
.skeleton-login-logo,
.skeleton-checkbox-item,
.skeleton-badge-placeholder,
.skeleton-admin-item-btn,
.skeleton-toggle-placeholder {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 8px;
}

/* Card Wrapper */
.skeleton-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

/* Profile Layout */
.profile-card-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 20px;
}

.skeleton-avatar {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  margin-bottom: 16px;
}

.title-line {
  width: 140px;
  height: 24px;
  margin-bottom: 8px;
}

.subtitle-line {
  width: 100px;
  height: 16px;
  margin-bottom: 24px;
}

.skeleton-stats-row {
  display: flex;
  width: 100%;
  gap: 12px;
}

.skeleton-stat-box {
  flex: 1;
  height: 72px;
  border-radius: 12px;
}

/* Top 8 Widget */
.section-title-line {
  height: 20px;
  margin-bottom: 16px;
}

.skeleton-circles-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  overflow-x: auto;
  padding-bottom: 4px;
  gap: 8px;
}

.skeleton-circle-item {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Actions Grid */
.skeleton-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 600px) {
  .skeleton-actions-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.skeleton-action-card {
  height: 150px;
  border-radius: 20px;
}

/* Match Section */
.skeleton-match-card {
  height: 90px;
  border-radius: 16px;
  margin-bottom: 12px;
}

/* Rankings Layout */
.skeleton-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  justify-content: center;
}

.skeleton-tab {
  width: 120px;
  height: 38px;
  border-radius: 20px;
}

.ranking-list-skeleton {
  padding: 10px 20px;
}

.skeleton-ranking-row {
  display: flex;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #f3f4f6;
  background: none;
}

.skeleton-ranking-row:last-child {
  border-bottom: none;
}

.skeleton-rank-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 16px;
}

.skeleton-ranking-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 16px;
}

.ranking-name-line {
  width: 110px;
  height: 20px;
}

.ranking-score-line {
  width: 50px;
  height: 20px;
  margin-left: auto;
}

/* Generic Layout */
.form-title-line {
  width: 180px;
  height: 28px;
  margin-bottom: 24px;
}

.skeleton-form-group {
  margin-bottom: 20px;
}

.form-label-line {
  width: 80px;
  height: 16px;
  margin-bottom: 8px;
}

.skeleton-form-input {
  height: 48px;
  border-radius: 12px;
}

.skeleton-form-button {
  height: 50px;
  border-radius: 12px;
  margin-top: 8px;
}

/* Login Layout */
.skeleton-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  text-align: center;
  min-height: calc(100vh - 150px);
}

.skeleton-login-logo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin-bottom: 16px;
}

.login-title-line {
  width: 200px;
  height: 28px;
  margin-bottom: 8px;
  margin-left: auto;
  margin-right: auto;
}

.login-subtitle-line {
  width: 260px;
  height: 16px;
  margin-bottom: 32px;
  margin-left: auto;
  margin-right: auto;
}

.login-card-skeleton {
  width: 100%;
  max-width: 380px;
  box-sizing: border-box;
}

.register-link-line {
  width: 180px;
  height: 14px;
  margin: 20px auto 0 auto;
}

/* Page Title */
.page-title-line {
  width: 160px;
  height: 24px;
  margin-bottom: 20px;
}

/* Match Input Specific */
.skeleton-toggle-placeholder {
  height: 48px;
  border-radius: var(--border-radius-sm, 12px);
}

.skeleton-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.skeleton-col {
  flex: 1;
}

.skeleton-team-section {
  border-top: 1px solid #f3f4f6;
  padding-top: 16px;
  margin-top: 16px;
}

.team-header-line {
  width: 100px;
  height: 18px;
  margin-bottom: 12px;
}

/* Add Member Specific */
.skeleton-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.skeleton-checkbox-item {
  height: 24px;
  width: 140px;
  border-radius: 4px;
}

/* Admin Specific */
.skeleton-admin-item-card {
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.skeleton-admin-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.skeleton-badge-placeholder {
  width: 60px;
  height: 20px;
  border-radius: 10px;
}

.skeleton-admin-item-btn {
  height: 36px;
  width: 90px;
  border-radius: 6px;
}
</style>
